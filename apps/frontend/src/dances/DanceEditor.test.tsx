import type { Dance } from '@living-stage/shared';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { addCastMember, fetchCast } from '../api/cast.ts';
import { fetchDancers } from '../api/dancers.ts';
import { updateDance } from '../api/dances.ts';
import { copyFigure, deleteFigure, fetchFigures, updateFigure } from '../api/figures.ts';
import { DanceEditor } from './DanceEditor.tsx';

vi.mock('../api/dances.ts', () => ({ updateDance: vi.fn() }));
vi.mock('../api/cast.ts', () => ({ fetchCast: vi.fn(), addCastMember: vi.fn() }));
vi.mock('../api/dancers.ts', () => ({ fetchDancers: vi.fn() }));
vi.mock('../api/figures.ts', () => ({
  fetchFigures: vi.fn(),
  copyFigure: vi.fn(),
  updateFigure: vi.fn(),
  deleteFigure: vi.fn(),
}));

const kitri: Dance = {
  id: 'dance-1',
  title: 'Kitri variation',
  showGuides: true,
  labelMode: 'name',
  colorMode: 'dancer',
  createdAt: '2026-10-20T12:00:00.000Z',
};

beforeEach(() => {
  vi.mocked(fetchCast)
    .mockReset()
    .mockResolvedValue([
      { id: 'cast-1', dancer: { id: 'dancer-1', name: 'Clara', color: 3 }, role: null },
    ]);
  vi.mocked(fetchFigures)
    .mockReset()
    .mockResolvedValue([
      {
        id: 'figure-1',
        order: 0,
        name: null,
        positions: [{ castMemberId: 'cast-1', x: 0.5, y: 0.5 }],
      },
    ]);
  vi.mocked(updateDance)
    .mockReset()
    .mockImplementation(async (_schoolId, _danceId, update) => ({ ...kitri, ...update }));
});

function openKitri(dance = kitri) {
  render(<DanceEditor schoolId="school-1" dance={dance} onBack={() => {}} />);
}

function labelsButton(name: string) {
  return within(screen.getByRole('group', { name: 'Labels' })).getByRole('button', { name });
}

function guidesToggle() {
  return screen.getByRole('button', { name: 'Guides' });
}

test('shows the dance title', () => {
  openKitri();
  expect(screen.getByRole('heading', { name: 'Kitri variation' })).toBeInTheDocument();
});

test('shows the stage', () => {
  openKitri();
  expect(screen.getByRole('img', { name: /^Stage seen from above/ })).toBeInTheDocument();
});

test('shows the guide lines when the dance has them on', () => {
  openKitri();
  expect(screen.getByTestId('guides')).toBeInTheDocument();
});

test('hides the guide lines when the dance has them off', () => {
  openKitri({ ...kitri, showGuides: false });
  expect(screen.queryByTestId('guides')).not.toBeInTheDocument();
});

test('marks the guides toggle as pressed when the guide lines are on', () => {
  openKitri();
  expect(guidesToggle()).toHaveAttribute('aria-pressed', 'true');
});

test('hides the guide lines when the toggle is tapped', async () => {
  openKitri();
  await userEvent.setup().click(guidesToggle());
  expect(screen.queryByTestId('guides')).not.toBeInTheDocument();
});

test('shows the guide lines again when the toggle is tapped twice', async () => {
  openKitri();
  const user = userEvent.setup();
  await user.click(guidesToggle());
  await user.click(guidesToggle());
  expect(screen.getByTestId('guides')).toBeInTheDocument();
});

test('saves the guide lines choice on the dance', async () => {
  openKitri();
  await userEvent.setup().click(guidesToggle());
  expect(updateDance).toHaveBeenCalledWith('school-1', 'dance-1', { showGuides: false });
});

test('puts the guide lines back when saving fails', async () => {
  vi.mocked(updateDance).mockRejectedValue(new Error('PATCH dance answered 500'));
  openKitri();
  await userEvent.setup().click(guidesToggle());
  expect(await screen.findByTestId('guides')).toBeInTheDocument();
});

test("marks the dance's label mode as chosen", () => {
  openKitri({ ...kitri, labelMode: 'both' });
  expect(labelsButton('Both')).toHaveAttribute('aria-pressed', 'true');
});

test('saves the label mode on the dance', async () => {
  openKitri();
  await userEvent.setup().click(labelsButton('Role'));
  expect(updateDance).toHaveBeenCalledWith('school-1', 'dance-1', { labelMode: 'role' });
});

test('puts the label mode back when saving fails', async () => {
  vi.mocked(updateDance).mockRejectedValue(new Error('PATCH dance answered 500'));
  openKitri();
  await userEvent.setup().click(labelsButton('Role'));
  await waitFor(() => expect(labelsButton('Name')).toHaveAttribute('aria-pressed', 'true'));
});

test('saves the color mode on the dance', async () => {
  openKitri();
  const colorBy = screen.getByRole('group', { name: 'Color by' });
  await userEvent.setup().click(within(colorBy).getByRole('button', { name: 'Role' }));
  expect(updateDance).toHaveBeenCalledWith('school-1', 'dance-1', { colorMode: 'role' });
});

test('labels the stage circles by role in role mode', async () => {
  vi.mocked(fetchCast).mockResolvedValue([
    { id: 'cast-1', dancer: { id: 'dancer-1', name: 'Clara', color: 3 }, role: 'Kitri' },
  ]);
  openKitri({ ...kitri, labelMode: 'role' });
  const stage = screen.getByRole('img', { name: /^Stage seen from above/ });
  expect(await within(stage).findByText('Kitri')).toBeInTheDocument();
});

test('puts the cast on the stage', async () => {
  openKitri();
  const stage = screen.getByRole('img', { name: /^Stage seen from above/ });
  expect(await within(stage).findByText('Clara')).toBeInTheDocument();
});

test('puts a newly cast dancer in the wing on the stage', async () => {
  const bia = { id: 'dancer-2', name: 'Bia', color: null };
  vi.mocked(fetchDancers).mockResolvedValue([bia]);
  vi.mocked(addCastMember).mockResolvedValue({
    castMember: { id: 'cast-2', dancer: bia, role: null },
    positions: [{ figureId: 'figure-1', castMemberId: 'cast-2', x: -0.0625, y: 0.05 }],
  });
  openKitri();
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Add' }));
  await user.click(await screen.findByRole('button', { name: /Bia/ }));
  const stage = screen.getByRole('img', { name: /^Stage seen from above/ });
  expect(await within(stage).findByText('Bia')).toBeInTheDocument();
});

test('goes back to the dances', async () => {
  const onBack = vi.fn();
  render(<DanceEditor schoolId="school-1" dance={kitri} onBack={onBack} />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Back to dances' }));
  expect(onBack).toHaveBeenCalled();
});

describe('figures', () => {
  beforeEach(() => {
    vi.mocked(fetchFigures).mockResolvedValue([
      {
        id: 'figure-1',
        order: 0,
        name: null,
        positions: [{ castMemberId: 'cast-1', x: 0.5, y: 0.5 }],
      },
      { id: 'figure-2', order: 1, name: 'Entrance', positions: [] },
    ]);
  });

  async function figureChips() {
    const strip = await screen.findByRole('list', { name: 'Figures' });
    return within(strip).getAllByRole('button');
  }

  function stage() {
    return screen.getByRole('img', { name: /^Stage seen from above/ });
  }

  test('lists the figures of the dance', async () => {
    openKitri();
    expect((await figureChips()).map((chip) => chip.textContent)).toEqual(['Figure 1', 'Entrance']);
  });

  test('starts on the first figure', async () => {
    openKitri();
    const [first] = await figureChips();
    expect(first).toHaveAttribute('aria-current', 'true');
  });

  test("shows the selected figure's positions on the stage", async () => {
    openKitri();
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Entrance' }));
    expect(within(stage()).queryByText('Clara')).not.toBeInTheDocument();
  });

  test('puts a newly cast dancer in the wing of every figure', async () => {
    const bia = { id: 'dancer-2', name: 'Bia', color: null };
    vi.mocked(fetchDancers).mockResolvedValue([bia]);
    vi.mocked(addCastMember).mockResolvedValue({
      castMember: { id: 'cast-2', dancer: bia, role: null },
      positions: [
        { figureId: 'figure-1', castMemberId: 'cast-2', x: -0.0625, y: 0.15 },
        { figureId: 'figure-2', castMemberId: 'cast-2', x: -0.0625, y: 0.05 },
      ],
    });
    openKitri();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Add' }));
    await user.click(await screen.findByRole('button', { name: /Bia/ }));
    await user.click(screen.getByRole('button', { name: 'Entrance' }));
    expect(within(stage()).getByText('Bia')).toBeInTheDocument();
  });

  test('shows the first figure again when it is selected', async () => {
    openKitri();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Entrance' }));
    await user.click(screen.getByRole('button', { name: 'Figure 1' }));
    expect(within(stage()).getByText('Clara')).toBeInTheDocument();
  });
});

describe('figure tools', () => {
  const copied = {
    id: 'figure-2',
    order: 1,
    name: null,
    positions: [{ castMemberId: 'cast-1', x: 0.5, y: 0.5 }],
  };

  beforeEach(() => {
    vi.mocked(copyFigure).mockReset().mockResolvedValue(copied);
  });

  async function tap(name: string) {
    const user = userEvent.setup();
    await screen.findByRole('list', { name: 'Figures' });
    await user.click(screen.getByRole('button', { name }));
  }

  async function chipNames() {
    const strip = screen.getByRole('list', { name: 'Figures' });
    return within(strip)
      .getAllByRole('button')
      .map((chip) => chip.textContent);
  }

  test('copies the selected figure to the end as a new figure', async () => {
    openKitri();
    await tap('New figure');
    expect(copyFigure).toHaveBeenCalledWith('school-1', 'dance-1', {
      copyOf: 'figure-1',
      placement: 'end',
    });
  });

  test('duplicates the selected figure right after it', async () => {
    openKitri();
    await tap('Duplicate');
    expect(copyFigure).toHaveBeenCalledWith('school-1', 'dance-1', {
      copyOf: 'figure-1',
      placement: 'after',
    });
  });

  test('lists the new figure', async () => {
    openKitri();
    await tap('New figure');
    await waitFor(async () => expect(await chipNames()).toEqual(['Figure 1', 'Figure 2']));
  });

  test('selects the new figure', async () => {
    openKitri();
    await tap('New figure');
    expect(await screen.findByRole('button', { name: 'Figure 2' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  test('puts a duplicate between the figure and the ones after it', async () => {
    vi.mocked(fetchFigures).mockResolvedValue([
      { id: 'figure-1', order: 0, name: null, positions: [] },
      { id: 'figure-3', order: 1, name: 'Finale', positions: [] },
    ]);
    openKitri();
    await tap('Duplicate');
    await waitFor(async () =>
      expect(await chipNames()).toEqual(['Figure 1', 'Figure 2', 'Finale']),
    );
  });
});

describe('figure panel', () => {
  beforeEach(() => {
    vi.mocked(updateFigure)
      .mockReset()
      .mockResolvedValue({ id: 'figure-1', order: 0, name: 'Entrance', positions: [] });
  });

  async function openFigurePanel() {
    openKitri();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Figure 1' }));
    return user;
  }

  test('opens when the selected figure is tapped', async () => {
    await openFigurePanel();
    expect(screen.getByRole('complementary', { name: 'Figure' })).toBeInTheDocument();
  });

  test('takes the place of the cast list', async () => {
    await openFigurePanel();
    expect(screen.queryByRole('complementary', { name: 'Cast' })).not.toBeInTheDocument();
  });

  test('saves the new name', async () => {
    const user = await openFigurePanel();
    await user.type(screen.getByLabelText('Name'), 'Entrance');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(updateFigure).toHaveBeenCalledWith('school-1', 'dance-1', 'figure-1', {
      name: 'Entrance',
    });
  });

  test('shows the new name on the figure once saved', async () => {
    const user = await openFigurePanel();
    await user.type(screen.getByLabelText('Name'), 'Entrance');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const strip = screen.getByRole('list', { name: 'Figures' });
    expect(await within(strip).findByRole('button', { name: 'Entrance' })).toBeInTheDocument();
  });

  test('goes back to the cast list once closed', async () => {
    const user = await openFigurePanel();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('complementary', { name: 'Cast' })).toBeInTheDocument();
  });
});

describe('deleting figures', () => {
  const entrance = { id: 'figure-1', order: 0, name: 'Entrance', positions: [] };
  const middle = { id: 'figure-2', order: 1, name: 'Middle', positions: [] };
  const finale = { id: 'figure-3', order: 2, name: 'Finale', positions: [] };

  beforeEach(() => {
    vi.mocked(fetchFigures).mockResolvedValue([entrance, middle, finale]);
    vi.mocked(deleteFigure).mockReset().mockResolvedValue();
  });

  async function deleteFigureNamed(name: string) {
    openKitri();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name }));
    if (name !== 'Entrance') await user.click(screen.getByRole('button', { name }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
  }

  async function chipNames() {
    const strip = screen.getByRole('list', { name: 'Figures' });
    return within(strip)
      .getAllByRole('button')
      .map((chip) => chip.textContent);
  }

  test('deletes the figure', async () => {
    await deleteFigureNamed('Middle');
    expect(deleteFigure).toHaveBeenCalledWith('school-1', 'dance-1', 'figure-2');
  });

  test('takes the figure off the list', async () => {
    await deleteFigureNamed('Middle');
    await waitFor(async () => expect(await chipNames()).toEqual(['Entrance', 'Finale']));
  });

  test('selects the figure before the deleted one', async () => {
    await deleteFigureNamed('Finale');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Middle' })).toHaveAttribute(
        'aria-current',
        'true',
      ),
    );
  });

  test('selects the new first figure when the first one is deleted', async () => {
    await deleteFigureNamed('Entrance');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Middle' })).toHaveAttribute(
        'aria-current',
        'true',
      ),
    );
  });

  test('goes back to the cast list once the figure is deleted', async () => {
    await deleteFigureNamed('Middle');
    expect(await screen.findByRole('complementary', { name: 'Cast' })).toBeInTheDocument();
  });
});
