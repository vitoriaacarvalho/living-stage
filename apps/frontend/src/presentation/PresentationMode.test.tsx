import type { CastMember, Dance, Figure } from '@living-stage/shared';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { PresentationMode } from './PresentationMode.tsx';

const swans: Dance = {
  id: 'dance-1',
  title: 'Swans',
  showGuides: false,
  labelMode: 'both',
  colorMode: 'dancer',
  createdAt: '2026-10-20T12:00:00.000Z',
};

const cast: CastMember[] = [
  { id: 'cast-1', dancer: { id: 'dancer-1', name: 'Clara', color: 3 }, role: 'Odette' },
];

const figure = (order: number, name: string | null, x: number): Figure => ({
  id: `figure-${order + 1}`,
  order,
  name,
  transitionMs: 4000,
  paths: [],
  positions: [{ castMemberId: 'cast-1', x, y: 0.5 }],
});

const figures = [figure(0, null, 0.5), figure(1, 'Diagonal', 0.25), figure(2, 'Finale', 0.75)];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
});

afterEach(() => {
  vi.useRealTimers();
});

function present(startFigureId = 'figure-1', shown = figures) {
  const onLeave = vi.fn();
  render(
    <PresentationMode
      presented={{ dance: swans, cast, figures: shown }}
      startFigureId={startFigureId}
      onLeave={onLeave}
    />,
  );
  return { onLeave, user: userEvent.setup({ advanceTimers: vi.advanceTimersByTime }) };
}

function advance(ms: number) {
  act(() => vi.advanceTimersByTime(ms));
}

const dancerLeft = () => screen.getByTestId('dancer').style.left;

test('names the dance and where the figure stands among the others', () => {
  present('figure-2');
  expect(screen.getByText('Swans · Figure 2 of 3')).toBeInTheDocument();
});

test("shows the figure's name as the title", () => {
  present('figure-2');
  expect(screen.getByRole('heading', { name: 'Diagonal' })).toBeInTheDocument();
});

test('numbers a figure with no name', () => {
  present();
  expect(screen.getByRole('heading', { name: 'Figure 1' })).toBeInTheDocument();
});

test('shows the dancers with the dance labels', () => {
  present();
  expect(screen.getByText('Odette')).toBeInTheDocument();
});

test('shows the stage only, with nothing to edit', () => {
  present();
  expect(screen.queryByTestId('dancer-hit')).not.toBeInTheDocument();
});

test('shows the time over the length', () => {
  present('figure-2');
  expect(screen.getByText('00:04')).toBeInTheDocument();
});

test('plays', async () => {
  const { user } = present();
  await user.click(screen.getByRole('button', { name: 'Play' }));
  expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
});

test('moves the dancers while playing', async () => {
  const { user } = present();
  const before = dancerLeft();
  await user.click(screen.getByRole('button', { name: 'Play' }));
  advance(2000);
  expect(dancerLeft()).not.toBe(before);
});

test('keeps the figure being left as the title while moving', async () => {
  const { user } = present();
  await user.click(screen.getByRole('button', { name: 'Play' }));
  advance(2000);
  expect(screen.getByRole('heading', { name: 'Figure 1' })).toBeInTheDocument();
});

test('shows a figure as the title once it is reached', async () => {
  const { user } = present();
  await user.click(screen.getByRole('button', { name: 'Play' }));
  advance(5000);
  expect(screen.getByRole('heading', { name: 'Diagonal' })).toBeInTheDocument();
});

test('stops on the last figure at the end', async () => {
  const { user } = present();
  await user.click(screen.getByRole('button', { name: 'Play' }));
  advance(8100);
  expect(screen.getByRole('heading', { name: 'Finale' })).toBeInTheDocument();
});

test('pauses', async () => {
  const { user } = present();
  await user.click(screen.getByRole('button', { name: 'Play' }));
  await user.click(screen.getByRole('button', { name: 'Pause' }));
  expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
});

test('cannot play a single figure', () => {
  present('figure-1', [figures[0]!]);
  expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
});

test('leaves on the figure shown', async () => {
  const { onLeave, user } = present('figure-2');
  await user.click(screen.getByRole('button', { name: 'Leave presentation' }));
  expect(onLeave).toHaveBeenCalledWith('figure-2');
});

test('leaves on the figure last reached while moving', async () => {
  const { onLeave, user } = present();
  await user.click(screen.getByRole('button', { name: 'Play' }));
  advance(5000);
  await user.click(screen.getByRole('button', { name: 'Leave presentation' }));
  expect(onLeave).toHaveBeenCalledWith('figure-2');
});

test('leaves on Escape', () => {
  const { onLeave } = present();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onLeave).toHaveBeenCalledWith('figure-1');
});

test('leaves when the browser leaves full screen', () => {
  const { onLeave } = present();
  fireEvent(document, new Event('fullscreenchange'));
  expect(onLeave).toHaveBeenCalledWith('figure-1');
});
