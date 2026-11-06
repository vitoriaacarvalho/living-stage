import { clockTime } from '../playback/clock-time.ts';
import type { Playback } from '../playback/usePlayback.ts';
import { Icon } from '../ui/Icon.tsx';
import styles from './PresentationMode.module.css';

// A missing step is one with nowhere to go, so its button is off.
export type Steps = { previous?: () => void; next?: () => void };

type PresentationControlsProps = { playback: Playback; steps: Steps };

export function PresentationControls({ playback, steps }: PresentationControlsProps) {
  const playing = playback.status === 'playing';
  return (
    <div className={styles.controls}>
      <button
        type="button"
        className={styles.round}
        aria-label="Previous figure"
        disabled={!steps.previous}
        onClick={steps.previous}
      >
        <Icon name="previous" />
      </button>
      <button
        type="button"
        className={styles.play}
        aria-label={playing ? 'Pause' : 'Play'}
        disabled={playback.lengthMs === 0}
        onClick={playing ? playback.pause : playback.play}
      >
        <Icon name={playing ? 'pause' : 'play'} />
      </button>
      <button
        type="button"
        className={styles.round}
        aria-label="Next figure"
        disabled={!steps.next}
        onClick={steps.next}
      >
        <Icon name="next" />
      </button>
      <p className={styles.time}>
        {clockTime(playback.timeMs)}{' '}
        <span className={styles.length}>/ {clockTime(playback.lengthMs)}</span>
      </p>
    </div>
  );
}
