import type { ShowDetail } from '@living-stage/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fetchDances, updateDance } from '../api/dances.ts';
import {
  addAct,
  addActDance,
  deleteAct,
  deleteShow,
  fetchShow,
  removeActDance,
  updateAct,
  updateShow,
} from '../api/shows.ts';
import { ShowPage } from './ShowPage.tsx';

vi.mock('../api/dances.ts', () => ({ fetchDances: vi.fn(), updateDance: vi.fn() }));
vi.mock('../api/shows.ts', () => ({
  fetchShow: vi.fn(),
  addActDance: vi.fn(),
  removeActDance: vi.fn(),
  updateShow: vi.fn(),
  deleteShow: vi.fn(),
  addAct: vi.fn(),
  updateAct: vi.fn(),
  deleteAct: vi.fn(),
}));

const gala: ShowDetail = {
  id: 'show-1',
  title: 'Winter gala',
  date: '2026-12-12',
  time: '19:00',
  venue: 'City theatre',
  intervalMs: 0,
  createdAt: '2026-11-05T12:00:00.000Z',
  acts: [
    {
      id: 'act-1',
      order: 0,
      name: null,
      dances: [
        {
          id: 'item-1',
          danceId: 'dance-1',
          title: 'Kitri variation',
          castCount: 16,
          durationMs: null,
          cast: [],
        },
      ],
    },
    { id: 'act-2', order: 1, name: 'Classics', dances: [] },
  ],
};

function summary(id: string, title: string, castCount = 16) {
  return {
    id,
    title,
    showGuides: true,
    labelMode: 'name' as const,
    colorMode: 'dancer' as const,
    createdAt: '2026-10-20T12:00:00.000Z',
    castCount,
    preview: [],
    showTitles: [],
  };
}

beforeEach(() => {
  vi.mocked(fetchShow).mockReset().mockResolvedValue(gala);
  vi.mocked(fetchDances)
    .mockReset()
    .mockResolvedValue([summary('dance-1', 'Kitri variation'), summary('dance-2', 'Waltz', 22)]);
  vi.mocked(updateDance).mockReset();
  for (const call of [
    updateShow,
    deleteShow,
    addAct,
    updateAct,
    deleteAct,
    addActDance,
    removeActDance,
  ]) {
    vi.mocked(call).mockReset();
  }
});

function renderPage(onBack = vi.fn()) {
  render(<ShowPage schoolId="school-1" showId="show-1" onBack={onBack} />);
  return { onBack, user: userEvent.setup() };
}

test('shows the title', async () => {
  renderPage();
  expect(await screen.findByRole('heading', { name: 'Winter gala', level: 1 })).toBeInTheDocument();
});

test('shows the day, time and venue', async () => {
  renderPage();
  expect(await screen.findByText('12 Dec 2026, 19:00')).toBeInTheDocument();
});

test('lists the acts in order', async () => {
  renderPage();
  const acts = await screen.findByRole('list', { name: 'Acts' });
  expect(
    within(acts)
      .getAllByRole('heading')
      .map((h) => h.textContent),
  ).toEqual(['Act 1', 'Act 2 · Classics']);
});

test('lists the dances of an act with their dancer count', async () => {
  renderPage();
  const act = await screen.findByRole('region', { name: 'Act 1' });
  expect(act).toHaveTextContent('01Kitri variation16 dancers');
});

test('says when an act has no dances yet', async () => {
  renderPage();
  const act = await screen.findByRole('region', { name: 'Act 2 · Classics' });
  expect(act).toHaveTextContent('No dances in this act yet.');
});

test('goes back home', async () => {
  const { onBack, user } = renderPage();
  await user.click(screen.getByRole('button', { name: 'Home' }));
  expect(onBack).toHaveBeenCalled();
});

test('says when the show cannot be loaded', async () => {
  vi.mocked(fetchShow).mockRejectedValue(new Error('GET show answered 404'));
  renderPage();
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the show');
});

async function actTitles() {
  const acts = await screen.findByRole('list', { name: 'Acts' });
  return within(acts)
    .getAllByRole('heading')
    .map((h) => h.textContent);
}

describe('editing the show', () => {
  async function edit() {
    const panel = renderPage();
    await panel.user.click(await screen.findByRole('button', { name: 'Edit' }));
    return panel;
  }

  test('starts the form with the show as it is', async () => {
    await edit();
    expect(screen.getByLabelText('Venue')).toHaveValue('City theatre');
  });

  test('saves the changes', async () => {
    vi.mocked(updateShow).mockResolvedValue({ ...gala, venue: 'Old mill' });
    const { user } = await edit();
    await user.clear(screen.getByLabelText('Venue'));
    await user.type(screen.getByLabelText('Venue'), 'Old mill');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(updateShow).toHaveBeenCalledWith('school-1', 'show-1', {
      title: 'Winter gala',
      date: '2026-12-12',
      time: '19:00',
      venue: 'Old mill',
      intervalMs: 0,
    });
  });

  test('shows the saved changes', async () => {
    vi.mocked(updateShow).mockResolvedValue({ ...gala, venue: 'Old mill' });
    const { user } = await edit();
    await user.clear(screen.getByLabelText('Venue'));
    await user.type(screen.getByLabelText('Venue'), 'Old mill');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Old mill')).toBeInTheDocument();
  });

  test('sets the interval between acts in minutes', async () => {
    vi.mocked(updateShow).mockResolvedValue({ ...gala, intervalMs: 15 * 60_000 });
    const { user } = await edit();
    await user.type(screen.getByLabelText('Interval between acts'), '15');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(updateShow).toHaveBeenCalledWith(
      'school-1',
      'show-1',
      expect.objectContaining({ intervalMs: 15 * 60_000 }),
    );
  });

  test('refuses an interval over an hour', async () => {
    const { user } = await edit();
    await user.type(screen.getByLabelText('Interval between acts'), '90');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('from 0 to 60');
  });

  test('asks before deleting the show', async () => {
    const { user } = await edit();
    await user.click(screen.getByRole('button', { name: 'Delete show' }));
    expect(screen.getByText(/the dances stay in the school/)).toBeInTheDocument();
  });

  test('deletes the show and goes back home once confirmed', async () => {
    vi.mocked(deleteShow).mockResolvedValue();
    const { onBack, user } = await edit();
    await user.click(screen.getByRole('button', { name: 'Delete show' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onBack).toHaveBeenCalled();
  });

  test('stays when the show cannot be deleted', async () => {
    vi.mocked(deleteShow).mockRejectedValue(new Error('DELETE show answered 500'));
    const { user } = await edit();
    await user.click(screen.getByRole('button', { name: 'Delete show' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not delete the show');
  });
});

describe('acts', () => {
  test('adds an act at the end', async () => {
    vi.mocked(addAct).mockResolvedValue({ id: 'act-3', order: 2, name: null, dances: [] });
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: 'New act' }));
    expect(await actTitles()).toEqual(['Act 1', 'Act 2 · Classics', 'Act 3']);
  });

  test('says when an act cannot be added', async () => {
    vi.mocked(addAct).mockRejectedValue(new Error('POST act answered 500'));
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: 'New act' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not add the act');
  });

  test('names an act', async () => {
    vi.mocked(updateAct).mockResolvedValue({ ...gala.acts[0]!, name: 'Opening' });
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: 'Rename Act 1' }));
    await user.type(screen.getByLabelText('Name'), 'Opening');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await actTitles()).toEqual(['Act 1 · Opening', 'Act 2 · Classics']);
  });

  test('sends the new name', async () => {
    vi.mocked(updateAct).mockResolvedValue({ ...gala.acts[0]!, name: 'Opening' });
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: 'Rename Act 1' }));
    await user.type(screen.getByLabelText('Name'), 'Opening');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(updateAct).toHaveBeenCalledWith(
      { schoolId: 'school-1', showId: 'show-1', actId: 'act-1' },
      { name: 'Opening' },
    );
  });

  test('warns that the dances of a deleted act leave the show', async () => {
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: 'Rename Act 1' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Delete Act 1? Its dance leaves the show.')).toBeInTheDocument();
  });

  test('deletes an act once confirmed', async () => {
    vi.mocked(deleteAct).mockResolvedValue();
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: 'Rename Act 2 · Classics' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await actTitles()).toEqual(['Act 1']);
  });

  test('offers no delete for the only act', async () => {
    vi.mocked(fetchShow).mockResolvedValue({ ...gala, acts: [gala.acts[0]!] });
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: 'Rename Act 1' }));
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });
});

describe('dances in an act', () => {
  async function openPicker(actName = 'Act 2 · Classics') {
    const panel = renderPage();
    await panel.user.click(await screen.findByRole('button', { name: `Add dance to ${actName}` }));
    return panel;
  }

  const waltz = {
    id: 'item-2',
    danceId: 'dance-2',
    title: 'Waltz',
    castCount: 22,
    durationMs: null,
    cast: [],
  };

  test('offers only the dances not yet in the show', async () => {
    await openPicker();
    const picker = screen.getByRole('group', { name: 'Add to Act 2 · Classics' });
    expect(await within(picker).findAllByRole('button', { name: /Add$/ })).toHaveLength(1);
  });

  test('offers a dance with its dancer count', async () => {
    await openPicker();
    expect(await screen.findByRole('button', { name: /Waltz/ })).toHaveTextContent(
      'Waltz22 dancersAdd',
    );
  });

  test('adds the picked dance to the act', async () => {
    vi.mocked(addActDance).mockResolvedValue(waltz);
    const { user } = await openPicker();
    await user.click(await screen.findByRole('button', { name: /Waltz/ }));
    expect(screen.getByRole('region', { name: 'Act 2 · Classics' })).toHaveTextContent(
      '01Waltz22 dancers',
    );
  });

  test('sends the picked dance', async () => {
    vi.mocked(addActDance).mockResolvedValue(waltz);
    const { user } = await openPicker();
    await user.click(await screen.findByRole('button', { name: /Waltz/ }));
    expect(addActDance).toHaveBeenCalledWith(
      { schoolId: 'school-1', showId: 'show-1', actId: 'act-2' },
      { danceId: 'dance-2' },
    );
  });

  test('stops offering a dance once it is in the show', async () => {
    vi.mocked(addActDance).mockResolvedValue(waltz);
    const { user } = await openPicker();
    await user.click(await screen.findByRole('button', { name: /Waltz/ }));
    expect(
      await screen.findByText('Every dance of the school is in this show.'),
    ).toBeInTheDocument();
  });

  test('says when a dance cannot be added', async () => {
    vi.mocked(addActDance).mockRejectedValue(new Error('POST act dance answered 500'));
    const { user } = await openPicker();
    await user.click(await screen.findByRole('button', { name: /Waltz/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not add Waltz');
  });

  test('closes the picker', async () => {
    const { user } = await openPicker();
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(
      screen.queryByRole('group', { name: 'Add to Act 2 · Classics' }),
    ).not.toBeInTheDocument();
  });

  test('takes a dance out of the act', async () => {
    vi.mocked(removeActDance).mockResolvedValue();
    const { user } = renderPage();
    await user.click(
      await screen.findByRole('button', { name: 'Take Kitri variation out of Act 1' }),
    );
    expect(screen.getByRole('region', { name: 'Act 1' })).toHaveTextContent(
      'No dances in this act yet.',
    );
  });

  test('says when a dance cannot be taken out', async () => {
    vi.mocked(removeActDance).mockRejectedValue(new Error('DELETE act dance answered 500'));
    const { user } = renderPage();
    await user.click(
      await screen.findByRole('button', { name: 'Take Kitri variation out of Act 1' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not take Kitri variation out',
    );
  });
});

describe('running time', () => {
  const timed: ShowDetail = {
    ...gala,
    intervalMs: 15 * 60_000,
    acts: [
      {
        ...gala.acts[0]!,
        dances: [{ ...gala.acts[0]!.dances[0]!, durationMs: 220_000 }],
      },
      {
        ...gala.acts[1]!,
        dances: [
          {
            id: 'item-2',
            danceId: 'dance-2',
            title: 'Waltz',
            castCount: 22,
            durationMs: null,
            cast: [],
          },
        ],
      },
    ],
  };

  function total() {
    return screen.findByRole('region', { name: 'Total running time' });
  }

  test('adds the dances and the interval into the total', async () => {
    vi.mocked(fetchShow).mockResolvedValue(timed);
    renderPage();
    expect(await total()).toHaveTextContent('18min 40s');
  });

  test('lists each act and the interval in the legend', async () => {
    vi.mocked(fetchShow).mockResolvedValue(timed);
    renderPage();
    expect(await total()).toHaveTextContent('Act 1 3:40Act 2 · Classics 0:00Interval 15:00');
  });

  test('says how many dances have no time yet', async () => {
    vi.mocked(fetchShow).mockResolvedValue(timed);
    renderPage();
    expect(await total()).toHaveTextContent('1 dance has no time yet.');
  });

  test("shows each act's own total", async () => {
    vi.mocked(fetchShow).mockResolvedValue(timed);
    renderPage();
    expect(await screen.findByLabelText('Act 1 runs 3:40')).toBeInTheDocument();
  });

  test('puts the interval between the acts', async () => {
    vi.mocked(fetchShow).mockResolvedValue(timed);
    renderPage();
    const acts = await screen.findByRole('list', { name: 'Acts' });
    const interval = within(acts).getByText('Interval').closest('li')!;
    expect(interval.previousElementSibling).toHaveTextContent(/^Act 1/);
  });

  test('shows no interval row when the show has none', async () => {
    renderPage();
    const acts = await screen.findByRole('list', { name: 'Acts' });
    expect(within(acts).queryByText('Interval')).not.toBeInTheDocument();
  });
});

describe('durations', () => {
  async function openTime() {
    const panel = renderPage();
    await panel.user.click(
      await screen.findByRole('button', { name: 'Add a time for Kitri variation' }),
    );
    return panel;
  }

  test('shows a dash for a dance with no time', async () => {
    renderPage();
    expect(
      await screen.findByRole('button', { name: 'Add a time for Kitri variation' }),
    ).toHaveTextContent('–:––');
  });

  test('saves the typed time on the dance', async () => {
    vi.mocked(updateDance).mockResolvedValue({} as never);
    const { user } = await openTime();
    await user.type(screen.getByLabelText('Time of Kitri variation'), '3:40{Enter}');
    expect(updateDance).toHaveBeenCalledWith('school-1', 'dance-1', { durationMs: 220_000 });
  });

  test('shows the saved time on the row', async () => {
    vi.mocked(updateDance).mockResolvedValue({} as never);
    const { user } = await openTime();
    await user.type(screen.getByLabelText('Time of Kitri variation'), '3:40{Enter}');
    expect(
      await screen.findByRole('button', { name: 'Time of Kitri variation, 3:40' }),
    ).toBeInTheDocument();
  });

  test('says how to write a time it cannot read', async () => {
    const { user } = await openTime();
    await user.type(screen.getByLabelText('Time of Kitri variation'), '3.40{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('Type the time as m:ss');
  });

  test('saves nothing it cannot read', async () => {
    const { user } = await openTime();
    await user.type(screen.getByLabelText('Time of Kitri variation'), '3.40{Enter}');
    expect(updateDance).not.toHaveBeenCalled();
  });

  test('closes the field with Escape', async () => {
    const { user } = await openTime();
    await user.type(screen.getByLabelText('Time of Kitri variation'), '3{Escape}');
    expect(
      screen.getByRole('button', { name: 'Add a time for Kitri variation' }),
    ).toBeInTheDocument();
  });

  test('says when the time cannot be saved', async () => {
    vi.mocked(updateDance).mockRejectedValue(new Error('PATCH dance answered 500'));
    const { user } = await openTime();
    await user.type(screen.getByLabelText('Time of Kitri variation'), '3:40{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the time');
  });
});
