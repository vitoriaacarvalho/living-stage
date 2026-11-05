import { type Figure, figureTimeMs, playbackLengthMs } from '@living-stage/shared';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

export type Playback = ReturnType<typeof usePlayback>;

type Clock = { status: 'stopped' } | { status: 'playing' | 'paused'; atMs: number };

type PlaybackSetup = {
  figures: Figure[];
  selectedIndex: number;
  onFinish: (figureId: string) => void;
};

export function usePlayback({ figures, selectedIndex, onFinish }: PlaybackSetup) {
  const [clock, setClock] = useState<Clock>({ status: 'stopped' });
  const origin = useRef({ atMs: 0, since: 0 });
  const lengthMs = playbackLengthMs(figures);
  const lastIndex = figures.length - 1;
  const playing = clock.status === 'playing';

  const advance = useEffectEvent((): boolean => {
    const { atMs, since } = origin.current;
    const time = atMs + performance.now() - since;
    if (time < lengthMs) {
      setClock({ status: 'playing', atMs: time });
      return true;
    }
    setClock({ status: 'stopped' });
    const last = figures[lastIndex];
    if (last) onFinish(last.id);
    return false;
  });

  useEffect(() => {
    if (!playing) return;
    let frame = requestAnimationFrame(function tick() {
      if (advance()) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  // From the last figure there is nothing ahead, so Play goes back to the first.
  function play() {
    if (playing || lengthMs === 0) return;
    const atMs =
      clock.status === 'paused'
        ? clock.atMs
        : figureTimeMs(selectedIndex >= lastIndex ? 0 : selectedIndex);
    origin.current = { atMs, since: performance.now() };
    setClock({ status: 'playing', atMs });
  }

  function pause() {
    if (clock.status === 'playing') setClock({ status: 'paused', atMs: clock.atMs });
  }

  function stop() {
    setClock({ status: 'stopped' });
  }

  return {
    status: clock.status,
    timeMs: clock.status === 'stopped' ? figureTimeMs(selectedIndex) : clock.atMs,
    lengthMs,
    play,
    pause,
    stop,
  };
}
