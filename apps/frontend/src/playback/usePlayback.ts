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
  const origin = useRef({ atMs: 0, since: 0, endIndex: 0 });
  const lengthMs = playbackLengthMs(figures);
  const lastIndex = figures.length - 1;
  const playing = clock.status === 'playing';

  const advance = useEffectEvent((): boolean => {
    const { atMs, since, endIndex } = origin.current;
    const time = atMs + performance.now() - since;
    if (time < figureTimeMs(figures, endIndex)) {
      setClock({ status: 'playing', atMs: time });
      return true;
    }
    setClock({ status: 'stopped' });
    const end = figures[endIndex];
    if (end) onFinish(end.id);
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
    if (clock.status === 'stopped' && selectedIndex >= lastIndex) playFromStart();
    else playTo(lastIndex);
  }

  // Plays on from where the clock is and stops at that figure; while playing, only the end moves.
  function playTo(endIndex: number) {
    if (playing) {
      origin.current.endIndex = endIndex;
      return;
    }
    const atMs = clock.status === 'paused' ? clock.atMs : figureTimeMs(figures, selectedIndex);
    if (atMs >= figureTimeMs(figures, endIndex)) return;
    origin.current = { atMs, since: performance.now(), endIndex };
    setClock({ status: 'playing', atMs });
  }

  function playFromStart() {
    if (lengthMs === 0) return;
    origin.current = { atMs: 0, since: performance.now(), endIndex: lastIndex };
    setClock({ status: 'playing', atMs: 0 });
  }

  function pause() {
    if (clock.status === 'playing') setClock({ status: 'paused', atMs: clock.atMs });
  }

  function stop() {
    setClock({ status: 'stopped' });
  }

  return {
    status: clock.status,
    timeMs: clock.status === 'stopped' ? figureTimeMs(figures, selectedIndex) : clock.atMs,
    lengthMs,
    play,
    playTo,
    pause,
    stop,
  };
}
