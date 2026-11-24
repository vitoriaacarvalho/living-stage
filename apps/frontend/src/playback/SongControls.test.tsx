import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { SongControls } from './SongControls.tsx';
import type { SongPlayback } from './useSongPlayback.ts';

function renderControls(changes: Partial<SongPlayback> = {}) {
  const playback = {
    speed: 1,
    repeat: false,
    setSpeed: vi.fn(),
    setRepeat: vi.fn(),
    ...changes,
  } as unknown as SongPlayback;
  render(<SongControls playback={playback} />);
  return playback;
}

function speed(name: string) {
  return within(screen.getByRole('group', { name: 'Speed' })).getByRole('button', { name });
}

test('plays at full speed to begin with', () => {
  renderControls();
  expect(speed('1×')).toHaveAttribute('aria-pressed', 'true');
});

test('slows the song to half speed', async () => {
  const playback = renderControls();
  await userEvent.setup().click(speed('0.5×'));
  expect(playback.setSpeed).toHaveBeenCalledWith(0.5);
});

test('shows the speed chosen', () => {
  renderControls({ speed: 0.75 });
  expect(speed('0.75×')).toHaveAttribute('aria-pressed', 'true');
});

test('turns Repeat figure on', async () => {
  const playback = renderControls();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Repeat figure' }));
  expect(playback.setRepeat).toHaveBeenCalledWith(true);
});

test('shows Repeat figure on', () => {
  renderControls({ repeat: true });
  expect(screen.getByRole('button', { name: 'Repeat figure' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
