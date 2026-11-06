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

const button = (name: string) => screen.getByRole('button', { name });

test('says when the next figure comes', () => {
  present();
  expect(screen.getByText(/^Next in 00:04/)).toBeInTheDocument();
});

test('names the next figure', () => {
  present();
  expect(screen.getByText('Figure 2 · Diagonal')).toBeInTheDocument();
});

test('numbers a next figure with no name', () => {
  present('figure-1', [figure(0, 'Start', 0.5), figure(1, null, 0.25)]);
  expect(screen.getByText('Figure 2')).toBeInTheDocument();
});

test('counts down to the next figure while moving', async () => {
  const { user } = present();
  await user.click(button('Play'));
  advance(1500);
  expect(screen.getByText(/^Next in 00:03/)).toBeInTheDocument();
});

test('says nothing comes after the last figure', () => {
  present('figure-3');
  expect(screen.queryByText(/^Next in/)).not.toBeInTheDocument();
});

test('plays the move into the next figure', async () => {
  const { user } = present();
  await user.click(button('Next figure'));
  advance(2000);
  expect(button('Pause')).toBeInTheDocument();
});

test('stops at the next figure', async () => {
  const { user } = present();
  await user.click(button('Next figure'));
  advance(4100);
  expect(screen.getByRole('heading', { name: 'Diagonal' })).toBeInTheDocument();
});

test('stops playing once the next figure is reached', async () => {
  const { user } = present();
  await user.click(button('Next figure'));
  advance(4100);
  expect(button('Play')).toBeInTheDocument();
});

test('stops at the figure being reached when Next is pressed while playing', async () => {
  const { user } = present();
  await user.click(button('Play'));
  advance(1000);
  await user.click(button('Next figure'));
  advance(3100);
  expect(button('Play')).toBeInTheDocument();
});

test('cannot go on from the last figure', () => {
  present('figure-3');
  expect(button('Next figure')).toBeDisabled();
});

test('goes back to the figure before', async () => {
  const { user } = present('figure-3');
  await user.click(button('Previous figure'));
  expect(screen.getByRole('heading', { name: 'Diagonal' })).toBeInTheDocument();
});

test('goes back at once, without playing', async () => {
  const { user } = present('figure-3');
  await user.click(button('Previous figure'));
  expect(button('Play')).toBeInTheDocument();
});

test('goes back to where the move started when part way through it', async () => {
  const { user } = present('figure-2');
  await user.click(button('Play'));
  advance(1500);
  await user.click(button('Previous figure'));
  expect(screen.getByText('00:04')).toBeInTheDocument();
});

test('cannot go back from the first figure', () => {
  present();
  expect(button('Previous figure')).toBeDisabled();
});

test('can go back to the first figure while moving out of it', async () => {
  const { user } = present();
  await user.click(button('Play'));
  advance(1000);
  expect(button('Previous figure')).toBeEnabled();
});

test('steps on with the right arrow', () => {
  present();
  fireEvent.keyDown(document, { key: 'ArrowRight' });
  advance(4100);
  expect(screen.getByRole('heading', { name: 'Diagonal' })).toBeInTheDocument();
});

test('steps back with the left arrow', () => {
  present('figure-2');
  fireEvent.keyDown(document, { key: 'ArrowLeft' });
  expect(screen.getByRole('heading', { name: 'Figure 1' })).toBeInTheDocument();
});

test('does nothing on the left arrow at the first figure', () => {
  present();
  fireEvent.keyDown(document, { key: 'ArrowLeft' });
  expect(screen.getByRole('heading', { name: 'Figure 1' })).toBeInTheDocument();
});

test('plays with Space', () => {
  present();
  fireEvent.keyDown(document, { key: ' ' });
  expect(button('Pause')).toBeInTheDocument();
});

test('pauses with Space', () => {
  present();
  fireEvent.keyDown(document, { key: ' ' });
  fireEvent.keyDown(document, { key: ' ' });
  expect(button('Play')).toBeInTheDocument();
});

test('leaves Space on a focused button to the button', () => {
  present();
  fireEvent.keyDown(button('Next figure'), { key: ' ' });
  expect(button('Play')).toBeInTheDocument();
});
