import { TRANSITION_MS, type Dance } from '@living-stage/shared';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { addCastMember, fetchCast, removeCastMember } from '../api/cast.ts';
import { fetchDancers } from '../api/dancers.ts';
import { updateDance } from '../api/dances.ts';
import {
  copyFigure,
  deleteFigure,
  fetchFigures,
  moveFigurePositions,
  updateFigure,
} from '../api/figures.ts';
import { DanceEditor } from './DanceEditor.tsx';

vi.mock('../api/dances.ts', () => ({ updateDance: vi.fn() }));
vi.mock('../api/cast.ts', () => ({
  fetchCast: vi.fn(),
  addCastMember: vi.fn(),
  removeCastMember: vi.fn(),
}));
vi.mock('../api/dancers.ts', () => ({ fetchDancers: vi.fn() }));
vi.mock('../api/figures.ts', () => ({
  fetchFigures: vi.fn(),
  copyFigure: vi.fn(),
  updateFigure: vi.fn(),
  deleteFigure: vi.fn(),
  moveFigurePositions: vi.fn(),
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
        transitionMs: 4000,
        positions: [{ castMemberId: 'cast-1', x: 0.5, y: 0.5 }],
      },
    ]);
  vi.mocked(updateDance)
    .mockReset()
    .mockImplementation(async (_schoolId, _danceId, update) => ({ ...kitri, ...update }));
});

async function openKitri(dance = kitri) {
  render(<DanceEditor schoolId="school-1" dance={dance} onBack={() => {}} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled());
}

function labelsButton(name: string) {
  return within(screen.getByRole('group', { name: 'Labels' })).getByRole('button', { name });
}

function guidesToggle() {
  return screen.getByRole('button', { name: 'Guides' });
}

test('shows the dance title', async () => {
  await openKitri();
  expect(screen.getByRole('heading', { name: 'Kitri variation' })).toBeInTheDocument();
});

test('shows the stage', async () => {
  await openKitri();
  expect(screen.getByRole('group', { name: /^Stage seen from/ })).toBeInTheDocument();
});

test('shows the guide lines when the dance has them on', async () => {
  await openKitri();
  expect(screen.getByTestId('guides')).toBeInTheDocument();
});

test('hides the guide lines when the dance has them off', async () => {
  await openKitri({ ...kitri, showGuides: false });
  expect(screen.queryByTestId('guides')).not.toBeInTheDocument();
});

test('marks the guides toggle as pressed when the guide lines are on', async () => {
  await openKitri();
  expect(guidesToggle()).toHaveAttribute('aria-pressed', 'true');
});

test('hides the guide lines when the toggle is tapped', async () => {
  await openKitri();
  await userEvent.setup().click(guidesToggle());
  expect(screen.queryByTestId('guides')).not.toBeInTheDocument();
});

test('shows the guide lines again when the toggle is tapped twice', async () => {
  await openKitri();
  const user = userEvent.setup();
  await user.click(guidesToggle());
  await user.click(guidesToggle());
  expect(screen.getByTestId('guides')).toBeInTheDocument();
});

test('saves the guide lines choice on the dance', async () => {
  await openKitri();
  await userEvent.setup().click(guidesToggle());
  expect(updateDance).toHaveBeenCalledWith('school-1', 'dance-1', { showGuides: false });
});

test('puts the guide lines back when saving fails', async () => {
  vi.mocked(updateDance).mockRejectedValue(new Error('PATCH dance answered 500'));
  await openKitri();
  await userEvent.setup().click(guidesToggle());
  expect(await screen.findByTestId('guides')).toBeInTheDocument();
});

describe('snap toggle', () => {
  function snapToggle() {
    return screen.getByRole('button', { name: 'Snap' });
  }

  test('starts with snapping off', async () => {
    await openKitri();
    expect(snapToggle()).toHaveAttribute('aria-pressed', 'false');
  });

  test('turns snapping on when tapped', async () => {
    await openKitri();
    await userEvent.setup().click(snapToggle());
    expect(snapToggle()).toHaveAttribute('aria-pressed', 'true');
  });

  test('does not save snapping on the dance', async () => {
    await openKitri();
    await userEvent.setup().click(snapToggle());
    expect(updateDance).not.toHaveBeenCalled();
  });

  test('is disabled while the guides are hidden', async () => {
    await openKitri({ ...kitri, showGuides: false });
    expect(snapToggle()).toBeDisabled();
  });

  test('shows snapping off once the guides are hidden', async () => {
    await openKitri();
    const user = userEvent.setup();
    await user.click(snapToggle());
    await user.click(guidesToggle());
    expect(snapToggle()).toHaveAttribute('aria-pressed', 'false');
  });
});

test("marks the dance's label mode as chosen", async () => {
  await openKitri({ ...kitri, labelMode: 'both' });
  expect(labelsButton('Both')).toHaveAttribute('aria-pressed', 'true');
});

test('saves the label mode on the dance', async () => {
  await openKitri();
  await userEvent.setup().click(labelsButton('Role'));
  expect(updateDance).toHaveBeenCalledWith('school-1', 'dance-1', { labelMode: 'role' });
});

test('puts the label mode back when saving fails', async () => {
  vi.mocked(updateDance).mockRejectedValue(new Error('PATCH dance answered 500'));
  await openKitri();
  await userEvent.setup().click(labelsButton('Role'));
  await waitFor(() => expect(labelsButton('Name')).toHaveAttribute('aria-pressed', 'true'));
});

test('saves the color mode on the dance', async () => {
  await openKitri();
  const colorBy = screen.getByRole('group', { name: 'Color by' });
  await userEvent.setup().click(within(colorBy).getByRole('button', { name: 'Role' }));
  expect(updateDance).toHaveBeenCalledWith('school-1', 'dance-1', { colorMode: 'role' });
});

test('labels the stage circles by role in role mode', async () => {
  vi.mocked(fetchCast).mockResolvedValue([
    { id: 'cast-1', dancer: { id: 'dancer-1', name: 'Clara', color: 3 }, role: 'Kitri' },
  ]);
  await openKitri({ ...kitri, labelMode: 'role' });
  const stage = screen.getByRole('group', { name: /^Stage seen from/ });
  expect(await within(stage).findByText('Kitri')).toBeInTheDocument();
});

test('puts the cast on the stage', async () => {
  await openKitri();
  const stage = screen.getByRole('group', { name: /^Stage seen from/ });
  expect(await within(stage).findByText('Clara')).toBeInTheDocument();
});

test('puts a newly cast dancer in the wing on the stage', async () => {
  const bia = { id: 'dancer-2', name: 'Bia', color: null };
  vi.mocked(fetchDancers).mockResolvedValue([bia]);
  vi.mocked(addCastMember).mockResolvedValue({
    castMember: { id: 'cast-2', dancer: bia, role: null },
    positions: [{ figureId: 'figure-1', castMemberId: 'cast-2', x: -0.0625, y: 0.05 }],
  });
  await openKitri();
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Add' }));
  await user.click(await screen.findByRole('button', { name: /Bia/ }));
  const stage = screen.getByRole('group', { name: /^Stage seen from/ });
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
        transitionMs: 4000,
        positions: [{ castMemberId: 'cast-1', x: 0.5, y: 0.5 }],
      },
      { id: 'figure-2', order: 1, name: 'Entrance', transitionMs: 4000, positions: [] },
    ]);
  });

  async function figureChips() {
    const strip = await screen.findByRole('list', { name: 'Figures' });
    return within(strip).getAllByRole('button');
  }

  function stage() {
    return screen.getByRole('group', { name: /^Stage seen from/ });
  }

  test('lists the figures of the dance', async () => {
    await openKitri();
    expect((await figureChips()).map((chip) => chip.textContent)).toEqual(['Figure 1', 'Entrance']);
  });

  test('starts on the first figure', async () => {
    await openKitri();
    const [first] = await figureChips();
    expect(first).toHaveAttribute('aria-current', 'true');
  });

  test("shows the selected figure's positions on the stage", async () => {
    await openKitri();
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
    await openKitri();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Add' }));
    await user.click(await screen.findByRole('button', { name: /Bia/ }));
    await user.click(screen.getByRole('button', { name: 'Entrance' }));
    expect(within(stage()).getByText('Bia')).toBeInTheDocument();
  });

  test('shows the first figure again when it is selected', async () => {
    await openKitri();
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
    transitionMs: 4000,
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
    await openKitri();
    await tap('New figure');
    expect(copyFigure).toHaveBeenCalledWith('school-1', 'dance-1', {
      copyOf: 'figure-1',
      placement: 'end',
    });
  });

  test('duplicates the selected figure right after it', async () => {
    await openKitri();
    await tap('Duplicate');
    expect(copyFigure).toHaveBeenCalledWith('school-1', 'dance-1', {
      copyOf: 'figure-1',
      placement: 'after',
    });
  });

  test('lists the new figure', async () => {
    await openKitri();
    await tap('New figure');
    await waitFor(async () => expect(await chipNames()).toEqual(['Figure 1', 'Figure 2']));
  });

  test('selects the new figure', async () => {
    await openKitri();
    await tap('New figure');
    expect(await screen.findByRole('button', { name: 'Figure 2' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  test('puts a duplicate between the figure and the ones after it', async () => {
    vi.mocked(fetchFigures).mockResolvedValue([
      { id: 'figure-1', order: 0, name: null, transitionMs: 4000, positions: [] },
      { id: 'figure-3', order: 1, name: 'Finale', transitionMs: 4000, positions: [] },
    ]);
    await openKitri();
    await tap('Duplicate');
    await waitFor(async () =>
      expect(await chipNames()).toEqual(['Figure 1', 'Figure 2', 'Finale']),
    );
  });
});

describe('figure panel', () => {
  beforeEach(() => {
    vi.mocked(updateFigure).mockReset().mockResolvedValue({
      id: 'figure-1',
      order: 0,
      name: 'Entrance',
      transitionMs: 4000,
      positions: [],
    });
  });

  async function openFigurePanel() {
    await openKitri();
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

  test('plays a move at its saved time to arrive', async () => {
    vi.mocked(fetchFigures).mockResolvedValue([
      { id: 'figure-1', order: 0, name: null, transitionMs: 4000, positions: [] },
      { id: 'figure-2', order: 1, name: 'Finale', transitionMs: 4000, positions: [] },
    ]);
    vi.mocked(updateFigure).mockResolvedValue({
      id: 'figure-2',
      order: 1,
      name: 'Finale',
      transitionMs: 9500,
      positions: [],
    });
    await openKitri();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Finale' }));
    await user.click(screen.getByRole('button', { name: /Finale/ }));
    await user.clear(screen.getByLabelText('Time to arrive'));
    await user.type(screen.getByLabelText('Time to arrive'), '9.5');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('/ 00:09')).toBeInTheDocument();
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
  const entrance = {
    id: 'figure-1',
    order: 0,
    name: 'Entrance',
    transitionMs: 4000,
    positions: [],
  };
  const middle = { id: 'figure-2', order: 1, name: 'Middle', transitionMs: 4000, positions: [] };
  const finale = { id: 'figure-3', order: 2, name: 'Finale', transitionMs: 4000, positions: [] };

  beforeEach(() => {
    vi.mocked(fetchFigures).mockResolvedValue([entrance, middle, finale]);
    vi.mocked(deleteFigure).mockReset().mockResolvedValue();
  });

  async function deleteFigureNamed(name: string) {
    await openKitri();
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

describe('dragging on the 2D plan', () => {
  beforeEach(() => {
    Element.prototype.setPointerCapture = vi.fn();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ width: 1500, height: 900 }),
    );
    vi.mocked(moveFigurePositions)
      .mockReset()
      .mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchFigures).mockResolvedValue([
      {
        id: 'figure-1',
        order: 0,
        name: null,
        transitionMs: 4000,
        positions: [{ castMemberId: 'cast-1', x: 0.5, y: 0.5 }],
      },
      {
        id: 'figure-2',
        order: 1,
        name: 'Entrance',
        transitionMs: 4000,
        positions: [{ castMemberId: 'cast-1', x: 0.25, y: 0.25 }],
      },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function openPlan() {
    await openKitri();
    return userEvent.setup();
  }

  function claraDot() {
    return screen.getByTestId('dancer');
  }

  function tapClara() {
    const hit = screen.getByTestId('dancer-hit');
    fireEvent.pointerDown(hit, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(hit, { pointerId: 1, clientX: 100, clientY: 100 });
  }

  test('saves a dropped dancer in the figure shown', async () => {
    await openPlan();
    const hit = screen.getByTestId('dancer-hit');
    fireEvent.pointerDown(hit, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(hit, { pointerId: 1, clientX: 220, clientY: 100 });
    fireEvent.pointerUp(hit, { pointerId: 1, clientX: 220, clientY: 100 });
    expect(moveFigurePositions).toHaveBeenCalledWith('school-1', 'dance-1', 'figure-1', {
      positions: [{ castMemberId: 'cast-1', x: expect.closeTo(0.6), y: 0.5 }],
    });
  });

  test('snaps a dropped dancer onto a guide when Snap is on', async () => {
    const user = await openPlan();
    await user.click(screen.getByRole('button', { name: 'Snap' }));
    const hit = screen.getByTestId('dancer-hit');
    fireEvent.pointerDown(hit, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(hit, { pointerId: 1, clientX: 376, clientY: 100 });
    fireEvent.pointerUp(hit, { pointerId: 1, clientX: 376, clientY: 100 });
    expect(moveFigurePositions).toHaveBeenCalledWith('school-1', 'dance-1', 'figure-1', {
      positions: [{ castMemberId: 'cast-1', x: 0.75, y: 0.5 }],
    });
  });

  test('saves a dancer moved with an arrow key in the figure shown', async () => {
    await openPlan();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Clara' }), { key: 'ArrowRight' });
    expect(moveFigurePositions).toHaveBeenCalledWith('school-1', 'dance-1', 'figure-1', {
      positions: [{ castMemberId: 'cast-1', x: expect.closeTo(0.5 + 0.25 / 12), y: 0.5 }],
    });
  });

  test('clears the selection on Escape', async () => {
    const user = await openPlan();
    tapClara();
    await user.keyboard('{Escape}');
    expect(claraDot()).not.toHaveClass(/selected/);
  });

  test('keeps the selection on another figure', async () => {
    const user = await openPlan();
    tapClara();
    await user.click(screen.getByRole('button', { name: 'Entrance' }));
    expect(claraDot()).toHaveClass(/selected/);
  });

  test('keeps the selection when another dancer leaves the cast', async () => {
    vi.mocked(removeCastMember).mockResolvedValue();
    vi.mocked(fetchCast).mockResolvedValue([
      { id: 'cast-1', dancer: { id: 'dancer-1', name: 'Clara', color: 3 }, role: null },
      { id: 'cast-2', dancer: { id: 'dancer-2', name: 'Odile', color: 5 }, role: null },
    ]);
    vi.mocked(fetchFigures).mockResolvedValue([
      {
        id: 'figure-1',
        order: 0,
        name: null,
        transitionMs: 4000,
        positions: [
          { castMemberId: 'cast-1', x: 0.5, y: 0.5 },
          { castMemberId: 'cast-2', x: 0.25, y: 0.5 },
        ],
      },
    ]);
    const user = await openPlan();
    const [clara] = screen.getAllByTestId('dancer-hit');
    fireEvent.pointerDown(clara!, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(clara!, { pointerId: 1, clientX: 100, clientY: 100 });
    await user.click(screen.getByRole('button', { name: 'Edit Odile' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.getAllByTestId('dancer')).toHaveLength(1));
    expect(screen.getByTestId('dancer')).toHaveClass(/selected/);
  });

  test('clears the whole selection when a selected dancer leaves the cast', async () => {
    vi.mocked(removeCastMember).mockResolvedValue();
    vi.mocked(fetchCast).mockResolvedValue([
      { id: 'cast-1', dancer: { id: 'dancer-1', name: 'Clara', color: 3 }, role: null },
      { id: 'cast-2', dancer: { id: 'dancer-2', name: 'Odile', color: 5 }, role: null },
    ]);
    vi.mocked(fetchFigures).mockResolvedValue([
      {
        id: 'figure-1',
        order: 0,
        name: null,
        transitionMs: 4000,
        positions: [
          { castMemberId: 'cast-1', x: 0.5, y: 0.5 },
          { castMemberId: 'cast-2', x: 0.25, y: 0.5 },
        ],
      },
    ]);
    const user = await openPlan();
    const [clara] = screen.getAllByTestId('dancer-hit');
    fireEvent.pointerDown(clara!, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(clara!, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(screen.getAllByTestId('dancer-hit')[1]!, {
      pointerId: 1,
      shiftKey: true,
    });
    await user.click(screen.getByRole('button', { name: 'Edit Odile' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.getAllByTestId('dancer')).toHaveLength(1));
    expect(screen.getByTestId('dancer')).not.toHaveClass(/selected/);
  });
});

describe('playback', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    vi.mocked(fetchFigures).mockResolvedValue([
      {
        id: 'figure-1',
        order: 0,
        name: null,
        transitionMs: 4000,
        positions: [{ castMemberId: 'cast-1', x: 0.5, y: 0.5 }],
      },
      {
        id: 'figure-2',
        order: 1,
        name: 'Entrance',
        transitionMs: 4000,
        positions: [{ castMemberId: 'cast-1', x: 0.25, y: 0.5 }],
      },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function play() {
    await openKitri();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Play' }));
    return user;
  }

  function chip(name: string | RegExp) {
    return within(screen.getByRole('list', { name: 'Figures' })).getByRole('button', { name });
  }

  test('shows the playback time over the length', async () => {
    await openKitri();
    expect(screen.getByText('/ 00:04')).toBeInTheDocument();
  });

  test('turns Play into Pause while playing', async () => {
    await play();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  test('turns dragging off while playing', async () => {
    await play();
    expect(screen.queryByTestId('dancer-hit')).not.toBeInTheDocument();
  });

  test('keeps dragging off while paused between figures', async () => {
    const user = await play();
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.queryByTestId('dancer-hit')).not.toBeInTheDocument();
  });

  test('marks the figure being reached', async () => {
    await play();
    expect(chip('Entrance')).toHaveAttribute('aria-current', 'true');
  });

  test('stops when a figure is tapped', async () => {
    const user = await play();
    await user.click(chip('Figure 1'));
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  test('turns dragging back on once a figure is tapped', async () => {
    const user = await play();
    await user.click(chip('Entrance'));
    expect(screen.getByTestId('dancer-hit')).toBeInTheDocument();
  });

  test('jumps to the tapped figure', async () => {
    const user = await play();
    await user.click(chip('Entrance'));
    expect(chip('Entrance')).toHaveAttribute('aria-current', 'true');
  });

  test('does not open the figure panel when a tap stops playback', async () => {
    const user = await play();
    await user.click(chip('Entrance'));
    expect(screen.queryByRole('complementary', { name: 'Figure' })).not.toBeInTheDocument();
  });

  test('stops when a figure is added', async () => {
    vi.mocked(copyFigure).mockResolvedValue({
      id: 'figure-3',
      order: 2,
      name: null,
      transitionMs: 4000,
      positions: [{ castMemberId: 'cast-1', x: 0.25, y: 0.5 }],
    });
    const user = await play();
    await user.click(screen.getByRole('button', { name: 'New figure' }));
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  function claraLeft() {
    return screen.getByTestId('dancer').style.left;
  }

  test('moves the dancers halfway at half the transition', async () => {
    await play();
    act(() => vi.advanceTimersByTime(TRANSITION_MS / 2));
    expect(parseFloat(claraLeft())).toBeCloseTo(40, 0);
  });

  test('holds the in-between pose while paused', async () => {
    const user = await play();
    act(() => vi.advanceTimersByTime(TRANSITION_MS / 2));
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    const paused = claraLeft();
    act(() => vi.advanceTimersByTime(TRANSITION_MS));
    expect(claraLeft()).toBe(paused);
  });

  test('stops on the last figure at the end', async () => {
    await play();
    act(() => vi.advanceTimersByTime(TRANSITION_MS + 100));
    expect(screen.getByTestId('dancer-hit')).toBeInTheDocument();
  });

  test('shows the last figure at the end', async () => {
    await play();
    act(() => vi.advanceTimersByTime(TRANSITION_MS + 100));
    expect(parseFloat(claraLeft())).toBeCloseTo(30);
  });

  test('selects the last figure at the end', async () => {
    await play();
    act(() => vi.advanceTimersByTime(TRANSITION_MS + 100));
    expect(chip(/Entrance/)).toHaveAttribute('aria-current', 'true');
  });

  test('cannot play a dance with a single figure', async () => {
    vi.mocked(fetchFigures).mockResolvedValue([
      { id: 'figure-1', order: 0, name: null, transitionMs: 4000, positions: [] },
    ]);
    await openKitri();
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
  });
});
