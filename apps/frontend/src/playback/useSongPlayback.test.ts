import type { Figure } from '@living-stage/shared';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useSongPlayback } from './useSongPlayback.ts';

const figure = (id: string, timeMs: number): Figure => ({
  id,
  order: 0,
  name: null,
  transitionMs: 4000,
  timeMs,
  positions: [],
  paths: [],
});

const figures = [figure('f1', 2000), figure('f2', 10_000), figure('f3', 20_000)];
const SONG = 30_000;

// What the hook touches of an audio element; time moves only when a test says so.
function fakeAudio() {
  return {
    currentTime: 0,
    playbackRate: 1,
    preservesPitch: false,
    preload: '',
    src: '',
    ended: false,
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    removeAttribute: vi.fn(),
  };
}

let audio: ReturnType<typeof fakeAudio>;
let onFinish: ReturnType<typeof vi.fn<(figureId: string) => void>>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
  audio = fakeAudio();
  onFinish = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(selectedIndex = 0, url: string | null = 'https://storage.test/song') {
  return renderHook(() =>
    useSongPlayback(
      audio as unknown as HTMLAudioElement,
      { figures, selectedIndex, songMs: SONG, url },
      onFinish,
    ),
  ).result;
}

// The song plays on to that moment, and a frame reads it.
function hear(ms: number) {
  audio.currentTime = ms / 1000;
  act(() => vi.advanceTimersByTime(16));
}

describe('stopped', () => {
  test('is at the moment of the selected figure', () => {
    expect(setup(1).current.timeMs).toBe(10_000);
  });

  test('lasts as long as the song', () => {
    expect(setup().current.lengthMs).toBe(SONG);
  });

  test('loads the song', () => {
    setup();
    expect(audio.src).toBe('https://storage.test/song');
  });
});

describe('playing', () => {
  test('starts the song at the selected figure', () => {
    const playback = setup(1);
    act(() => playback.current.play());
    expect(audio.currentTime).toBe(10);
  });

  test('plays the audio', () => {
    const playback = setup();
    act(() => playback.current.play());
    expect(audio.play).toHaveBeenCalled();
  });

  test('follows the song time', () => {
    const playback = setup();
    act(() => playback.current.play());
    hear(5500);
    expect(playback.current.timeMs).toBe(5500);
  });

  test('starts over from the last figure when it sits at the song end', () => {
    const atEnd = [figure('f1', 0), figure('f2', SONG)];
    const playback = renderHook(() =>
      useSongPlayback(
        audio as unknown as HTMLAudioElement,
        { figures: atEnd, selectedIndex: 1, songMs: SONG, url: 'u' },
        onFinish,
      ),
    ).result;
    act(() => playback.current.play());
    expect(audio.currentTime).toBe(0);
  });

  test('stops at the song end on the last figure', () => {
    const playback = setup();
    act(() => playback.current.play());
    hear(SONG);
    expect(onFinish).toHaveBeenCalledWith('f3');
  });

  test('is stopped once the song ends', () => {
    const playback = setup();
    act(() => playback.current.play());
    hear(SONG);
    expect(playback.current.status).toBe('stopped');
  });

  test('says it is paused when the browser will not play', async () => {
    audio.play.mockRejectedValue(new Error('not allowed'));
    const playback = setup();
    await act(async () => playback.current.play());
    expect(playback.current.status).toBe('paused');
  });
});

describe('playing to a figure', () => {
  test('stops on that figure', () => {
    const playback = setup();
    act(() => playback.current.playTo(1));
    hear(10_000);
    expect(onFinish).toHaveBeenCalledWith('f2');
  });

  test('keeps playing before that figure', () => {
    const playback = setup();
    act(() => playback.current.playTo(1));
    hear(9_900);
    expect(playback.current.status).toBe('playing');
  });

  test('moves the stop while playing', () => {
    const playback = setup();
    act(() => playback.current.playTo(1));
    act(() => playback.current.playTo(2));
    hear(10_000);
    expect(playback.current.status).toBe('playing');
  });
});

describe('pausing', () => {
  test('holds the song time', () => {
    const playback = setup();
    act(() => playback.current.play());
    hear(4200);
    act(() => playback.current.pause());
    expect(playback.current.timeMs).toBe(4200);
  });

  test('plays on from where it paused', () => {
    const playback = setup();
    act(() => playback.current.play());
    hear(4200);
    act(() => playback.current.pause());
    act(() => playback.current.play());
    expect(audio.currentTime).toBe(4.2);
  });
});

describe('scrubbing', () => {
  test('moves the song to that moment', () => {
    const playback = setup();
    act(() => playback.current.seek(12_345));
    expect(audio.currentTime).toBe(12.345);
  });

  test('pauses on that moment when stopped', () => {
    const playback = setup();
    act(() => playback.current.seek(12_345));
    expect(playback.current.status).toBe('paused');
  });

  test('shows that moment', () => {
    const playback = setup();
    act(() => playback.current.seek(12_345));
    expect(playback.current.timeMs).toBe(12_345);
  });

  test('keeps inside the song', () => {
    const playback = setup();
    act(() => playback.current.seek(99_000));
    expect(playback.current.timeMs).toBe(SONG);
  });
});

describe('speed', () => {
  test('plays slower', () => {
    const playback = setup();
    act(() => playback.current.setSpeed(0.5));
    expect(audio.playbackRate).toBe(0.5);
  });

  test('keeps the pitch', () => {
    const playback = setup();
    act(() => playback.current.setSpeed(0.75));
    expect(audio.preservesPitch).toBe(true);
  });

  test('says its speed', () => {
    const playback = setup();
    act(() => playback.current.setSpeed(0.75));
    expect(playback.current.speed).toBe(0.75);
  });
});
