import type { Figure } from '@living-stage/shared';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

export type SongTiming = {
  // Every figure pinned, in dance order.
  figures: Figure[];
  selectedIndex: number;
  songMs: number;
  url: string | null;
};

type Status = 'stopped' | 'playing' | 'paused';

// Where playing stops: a figure's moment (Next in presentation mode) or the song's end.
type Stop = { atMs: number; figureId: string | null };

export type SongPlayback = ReturnType<typeof useSongPlayback>;

// The song's own clock: the audio element plays, and the time is read from it every frame,
// so the stage can never drift from what is heard, at any speed.
export function useSongPlayback(
  audio: HTMLAudioElement,
  timing: SongTiming,
  onFinish: (figureId: string) => void,
) {
  const { figures, selectedIndex, songMs, url } = timing;
  const [status, setStatus] = useState<Status>('stopped');
  const [atMs, setAtMs] = useState(0);
  const [speed, setSpeedState] = useState(1);
  const stop = useRef<Stop>({ atMs: songMs, figureId: null });
  const pinOf = (index: number) => figures[index]?.timeMs ?? 0;
  const lastFigure = figures.at(-1);
  const playing = status === 'playing';

  useEffect(() => {
    if (url === null) return;
    audio.src = url;
    audio.preload = 'auto';
    return () => {
      audio.pause();
      audio.removeAttribute('src');
    };
  }, [audio, url]);

  // Stopped on a figure, the song waits at its moment, so the playhead shows where the stage is.
  const selectedPin = pinOf(selectedIndex);
  useEffect(() => {
    if (status === 'stopped') audio.currentTime = selectedPin / 1000;
  }, [audio, status, selectedPin]);

  const advance = useEffectEvent((): boolean => {
    const now = audio.currentTime * 1000;
    const { atMs: end, figureId } = stop.current;
    if (now < end && !audio.ended) {
      setAtMs(now);
      return true;
    }
    audio.pause();
    setStatus('stopped');
    const reached = figureId ?? lastFigure?.id;
    if (reached) onFinish(reached);
    return false;
  });

  useEffect(() => {
    if (!playing) return;
    let frame = requestAnimationFrame(function tick() {
      if (advance()) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  function start(fromMs: number, until: Stop) {
    stop.current = until;
    audio.currentTime = fromMs / 1000;
    setAtMs(fromMs);
    setStatus('playing');
    // The browser may refuse to play (or, in tests, have no player), so it is paused then.
    try {
      Promise.resolve(audio.play()).catch(() => setStatus('paused'));
    } catch {
      setStatus('paused');
    }
  }

  // Stopped on a figure, the song plays from its moment; from the end it starts over.
  function from(): number {
    if (status === 'paused') return atMs;
    const pin = pinOf(selectedIndex);
    return pin >= songMs ? 0 : pin;
  }

  function play() {
    start(from(), { atMs: songMs, figureId: null });
  }

  // Plays on and stops on that figure; while playing, only where it stops changes.
  function playTo(endIndex: number) {
    const target = { atMs: pinOf(endIndex), figureId: figures[endIndex]?.id ?? null };
    if (playing) {
      stop.current = target;
      return;
    }
    if (from() >= target.atMs) return;
    start(from(), target);
  }

  function pause() {
    if (!playing) return;
    audio.pause();
    setAtMs(audio.currentTime * 1000);
    setStatus('paused');
  }

  function halt() {
    audio.pause();
    setStatus('stopped');
  }

  // Scrubbing: the stage shows that moment, paused unless the song is playing.
  function seek(ms: number) {
    const time = Math.min(songMs, Math.max(0, ms));
    audio.currentTime = time / 1000;
    setAtMs(time);
    if (status === 'stopped') setStatus('paused');
  }

  function setSpeed(rate: number) {
    audio.playbackRate = rate;
    audio.preservesPitch = true;
    setSpeedState(rate);
  }

  return {
    status,
    timeMs: status === 'stopped' ? pinOf(selectedIndex) : atMs,
    lengthMs: songMs,
    speed,
    play,
    playTo,
    pause,
    stop: halt,
    seek,
    setSpeed,
  };
}
