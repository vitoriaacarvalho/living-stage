import type { AudioTrackDetail } from '@living-stage/shared';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import WaveSurfer from 'wavesurfer.js';
import { Waveform } from './Waveform.tsx';

vi.mock('wavesurfer.js', () => ({ default: { create: vi.fn() } }));
vi.mock('wavesurfer.js/dist/plugins/minimap.esm.js', () => ({
  default: { create: vi.fn(() => 'minimap') },
}));

const swan: AudioTrackDetail = {
  id: 'song-1',
  name: 'Swan theme',
  durationMs: 220_000,
  url: 'https://storage.test/a',
  peaks: [0, 0.4, 0.9],
};

const destroy = vi.fn();

beforeEach(() => {
  vi.mocked(WaveSurfer.create)
    .mockReset()
    .mockReturnValue({ destroy } as never);
  destroy.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function options() {
  return vi.mocked(WaveSurfer.create).mock.calls[0]![0];
}

function onPhone() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(max-width: 599px)',
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

test('names the song and its length', () => {
  render(<Waveform song={swan} />);
  expect(screen.getByRole('img', { name: 'Waveform of Swan theme, 3:40' })).toBeInTheDocument();
});

test('draws from the stored waveform', () => {
  render(<Waveform song={swan} />);
  expect(options().peaks).toEqual([[0, 0.4, 0.9]]);
});

test('gives the song length in seconds, so nothing is downloaded', () => {
  render(<Waveform song={swan} />);
  expect(options()).toMatchObject({ duration: 220 });
});

test('loads no audio', () => {
  render(<Waveform song={swan} />);
  expect(options()).not.toHaveProperty('url');
});

test('draws the design bars', () => {
  render(<Waveform song={swan} />);
  expect(options()).toMatchObject({ barWidth: 2, barGap: 1, barRadius: 1, cursorWidth: 2 });
});

test('is 56 px tall on an iPad', () => {
  render(<Waveform song={swan} />);
  expect(options().height).toBe(56);
});

test('is 40 px tall on an iPhone', () => {
  onPhone();
  render(<Waveform song={swan} />);
  expect(options().height).toBe(40);
});

test('shows the whole-song strip on an iPad', () => {
  render(<Waveform song={swan} />);
  expect(options().plugins).toEqual(['minimap']);
});

test('leaves the whole-song strip out on an iPhone', () => {
  onPhone();
  render(<Waveform song={swan} />);
  expect(options().plugins).toEqual([]);
});

test('lets go of the drawing when it leaves', () => {
  const { unmount } = render(<Waveform song={swan} />);
  unmount();
  expect(destroy).toHaveBeenCalled();
});

test('says when a song has no waveform', () => {
  render(<Waveform song={{ ...swan, peaks: [] }} />);
  expect(
    screen.getByText('Swan theme has no waveform yet. Upload it again to see one.'),
  ).toBeInTheDocument();
});

test('draws nothing for a song with no waveform', () => {
  render(<Waveform song={{ ...swan, peaks: [] }} />);
  expect(WaveSurfer.create).not.toHaveBeenCalled();
});
