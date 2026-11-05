import type { ShowSummary } from '@living-stage/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createShow, fetchShows } from '../api/shows.ts';
import { ShowList } from './ShowList.tsx';

vi.mock('../api/shows.ts', () => ({ fetchShows: vi.fn(), createShow: vi.fn() }));

const gala: ShowSummary = {
  id: 'show-1',
  title: 'Winter gala',
  date: '2026-12-12',
  time: '19:00',
  venue: 'City theatre',
  intervalMs: 0,
  createdAt: '2026-11-05T12:00:00.000Z',
  actCount: 2,
  danceCount: 10,
  totalMs: 57 * 60_000,
  preview: [],
};
const festival: ShowSummary = {
  ...gala,
  id: 'show-2',
  title: 'Summer festival',
  date: '2026-07-20',
  time: null,
  venue: null,
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 5, 15) });
  vi.mocked(fetchShows).mockReset().mockResolvedValue([festival, gala]);
  vi.mocked(createShow).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

function renderList(onOpen = vi.fn()) {
  render(<ShowList schoolId="school-1" onOpen={onOpen} />);
  return { onOpen, user: userEvent.setup() };
}

async function titles() {
  const list = await screen.findByRole('list', { name: 'Shows' });
  return within(list)
    .getAllByRole('heading')
    .map((heading) => heading.textContent);
}

async function card(title: string) {
  return (await screen.findByRole('button', { name: title })).closest('article')!;
}

test('puts upcoming shows before past ones', async () => {
  renderList();
  expect(await titles()).toEqual(['Winter gala', 'Summer festival']);
});

test('shows the day, time and venue', async () => {
  renderList();
  expect(await card('Winter gala')).toHaveTextContent('12 Dec 2026, 19:00City theatre');
});

test('counts the acts and dances', async () => {
  renderList();
  expect(await card('Winter gala')).toHaveTextContent('2 acts · 10 dances · 57min');
});

test('marks a past show as performed', async () => {
  renderList();
  expect(await card('Summer festival')).toHaveTextContent('Performed');
});

test('does not mark an upcoming show as performed', async () => {
  renderList();
  expect(await card('Winter gala')).not.toHaveTextContent('Performed');
});

test('opens a show from its card', async () => {
  const { onOpen, user } = renderList();
  await user.click(await screen.findByRole('button', { name: 'Winter gala' }));
  expect(onOpen).toHaveBeenCalledWith(gala);
});

test('says when there are no shows yet', async () => {
  vi.mocked(fetchShows).mockResolvedValue([]);
  renderList();
  expect(await screen.findByText(/No shows yet/)).toBeInTheDocument();
});

test('says when the shows cannot be loaded', async () => {
  vi.mocked(fetchShows).mockRejectedValue(new Error('GET shows answered 500'));
  renderList();
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the shows');
});

async function fillNewShow(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'New show' }));
  await user.type(screen.getByLabelText('Title'), 'Spring show');
  await user.type(screen.getByLabelText('Day'), '2027-04-10');
}

test('creates a show with its title and day', async () => {
  vi.mocked(createShow).mockResolvedValue({ ...gala, id: 'show-3', title: 'Spring show' });
  const { user } = renderList();
  await fillNewShow(user);
  await user.click(screen.getByRole('button', { name: 'Create show' }));
  expect(createShow).toHaveBeenCalledWith('school-1', {
    title: 'Spring show',
    date: '2027-04-10',
    time: null,
    venue: null,
    intervalMs: 0,
  });
});

test('lists the new show once created', async () => {
  vi.mocked(createShow).mockResolvedValue({
    ...gala,
    id: 'show-3',
    title: 'Spring show',
    date: '2027-04-10',
  });
  const { user } = renderList();
  await fillNewShow(user);
  await user.click(screen.getByRole('button', { name: 'Create show' }));
  expect(await titles()).toEqual(['Winter gala', 'Spring show', 'Summer festival']);
});

test('asks for a day before creating a show', async () => {
  const { user } = renderList();
  await user.click(await screen.findByRole('button', { name: 'New show' }));
  await user.type(screen.getByLabelText('Title'), 'Spring show');
  await user.click(screen.getByRole('button', { name: 'Create show' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Give the show a title and a day.');
});

test('says when a show cannot be created', async () => {
  vi.mocked(createShow).mockRejectedValue(new Error('POST show answered 500'));
  const { user } = renderList();
  await fillNewShow(user);
  await user.click(screen.getByRole('button', { name: 'Create show' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not create the show');
});
