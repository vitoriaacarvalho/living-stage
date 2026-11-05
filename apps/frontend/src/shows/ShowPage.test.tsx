import type { ShowDetail } from '@living-stage/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { addAct, deleteAct, deleteShow, fetchShow, updateAct, updateShow } from '../api/shows.ts';
import { ShowPage } from './ShowPage.tsx';

vi.mock('../api/shows.ts', () => ({
  fetchShow: vi.fn(),
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
  createdAt: '2026-11-05T12:00:00.000Z',
  acts: [
    {
      id: 'act-1',
      order: 0,
      name: null,
      dances: [{ id: 'item-1', danceId: 'dance-1', title: 'Kitri variation', castCount: 16 }],
    },
    { id: 'act-2', order: 1, name: 'Classics', dances: [] },
  ],
};

beforeEach(() => {
  vi.mocked(fetchShow).mockReset().mockResolvedValue(gala);
  for (const call of [updateShow, deleteShow, addAct, updateAct, deleteAct]) {
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
