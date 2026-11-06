import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { Transport } from './Transport.tsx';
import type { Playback } from './usePlayback.ts';

function renderTransport(playback: Partial<Playback> = {}) {
  const full: Playback = {
    status: 'stopped',
    timeMs: 4000,
    lengthMs: 12_000,
    play: vi.fn(),
    playTo: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    ...playback,
  };
  render(<Transport playback={full} />);
  return full;
}

test('shows the time', () => {
  renderTransport();
  expect(screen.getByText(/^00:04/)).toBeInTheDocument();
});

test('shows the length', () => {
  renderTransport();
  expect(screen.getByText('/ 00:12')).toBeInTheDocument();
});

test('plays when stopped', async () => {
  const { play } = renderTransport();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Play' }));
  expect(play).toHaveBeenCalled();
});

test('plays on from a pause', async () => {
  const { play } = renderTransport({ status: 'paused' });
  await userEvent.setup().click(screen.getByRole('button', { name: 'Play' }));
  expect(play).toHaveBeenCalled();
});

test('pauses while playing', async () => {
  const { pause } = renderTransport({ status: 'playing' });
  await userEvent.setup().click(screen.getByRole('button', { name: 'Pause' }));
  expect(pause).toHaveBeenCalled();
});

test('cannot play when there is nothing to play', () => {
  renderTransport({ lengthMs: 0 });
  expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
});
