import type { ShowDetail } from '@living-stage/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { fetchShow } from '../api/shows.ts';
import { ShowPage } from './ShowPage.tsx';

vi.mock('../api/shows.ts', () => ({ fetchShow: vi.fn() }));

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
