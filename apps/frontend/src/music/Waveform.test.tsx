import type { AudioTrackDetail, Figure } from '@living-stage/shared';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import WaveSurfer from 'wavesurfer.js';
import { Waveform } from './Waveform.tsx';

const hoistedListeners = vi.hoisted(() => ({}) as Record<string, (...args: never[]) => void>);

vi.mock('wavesurfer.js', () => ({ default: { create: vi.fn() } }));
vi.mock('wavesurfer.js/dist/plugins/minimap.esm.js', () => ({
  default: { create: vi.fn(() => 'minimap') },
}));
vi.mock('wavesurfer.js/dist/plugins/regions.esm.js', () => ({
  default: { create: vi.fn(() => regions) },
}));

// The waveform's and the markers' listeners, so tests can play the user's part.
const listeners: Record<string, (...args: never[]) => void> = {};
const regions = vi.hoisted(() => ({
  on: (event: string, listener: (...args: never[]) => void) => {
    hoistedListeners[event] = listener;
  },
  addRegion: vi.fn(),
  clearRegions: vi.fn(),
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
    .mockReturnValue({
      destroy,
      on: (event: string, listener: (...args: never[]) => void) => {
        listeners[event] = listener;
      },
    } as never);
  destroy.mockReset();
  regions.addRegion.mockReset();
  regions.clearRegions.mockReset();
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
  expect(options().plugins).toEqual([regions, 'minimap']);
});

test('leaves the whole-song strip out on an iPhone', () => {
  onPhone();
  render(<Waveform song={swan} />);
  expect(options().plugins).toEqual([regions]);
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

const media = {} as HTMLAudioElement;

const pinned = (id: string, timeMs: number, name: string | null = null): Figure => ({
  id,
  order: 0,
  name,
  transitionMs: 4000,
  timeMs,
  positions: [],
  paths: [],
});

const figures = [pinned('f1', 0, 'Entrance'), pinned('f2', 58_000)];

function renderOnSong(move: ((figureId: string, timeMs: number) => void) | null = vi.fn()) {
  const seek = vi.fn();
  render(
    <Waveform song={swan} clock={{ media, seek }} markers={{ figures, activeId: 'f2', move }} />,
  );
  return { seek, move };
}

const added = () => regions.addRegion.mock.calls.map(([region]) => region);

test('follows the song through its audio', () => {
  renderOnSong();
  expect(options().media).toBe(media);
});

test('lets the song be scrubbed once it drives the stage', () => {
  renderOnSong();
  expect(options().interact).toBe(true);
});

test('cannot be scrubbed without the song clock', () => {
  render(<Waveform song={swan} />);
  expect(options().interact).toBe(false);
});

test('scrubs to the tapped moment', () => {
  const { seek } = renderOnSong();
  listeners.interaction!(12.5 as never);
  expect(seek).toHaveBeenCalledWith(12_500);
});

test('marks each figure at its moment', () => {
  renderOnSong();
  expect(added().map(({ id, start }) => [id, start])).toEqual([
    ['f1', 0],
    ['f2', 58],
  ]);
});

test('names the markers like the figures', () => {
  renderOnSong();
  expect(added().map(({ content }) => content.textContent)).toEqual(['Entrance', 'Figure 2']);
});

test('lets the markers be dragged while editing', () => {
  renderOnSong();
  expect(added().every(({ drag }) => drag)).toBe(true);
});

test('holds the markers still while playing', () => {
  renderOnSong(null);
  expect(added().some(({ drag }) => drag)).toBe(false);
});

test('moves a figure to where its marker is let go', () => {
  const { move } = renderOnSong();
  hoistedListeners['region-updated']!({ id: 'f2', start: 61.25 } as never);
  expect(move).toHaveBeenCalledWith('f2', 61_250);
});
