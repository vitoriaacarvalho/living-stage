import { Icon } from '../ui/Icon.tsx';
import { clockTime } from './clock-time.ts';
import styles from './Transport.module.css';
import type { Playback } from './usePlayback.ts';

export function Transport({ playback }: { playback: Playback }) {
  const { status, timeMs, lengthMs, play, pause } = playback;
  const playing = status === 'playing';
  return (
    <div className={styles.transport}>
      <button
        type="button"
        className={styles.play}
        aria-label={playing ? 'Pause' : 'Play'}
        disabled={lengthMs === 0}
        onClick={playing ? pause : play}
      >
        <Icon name={playing ? 'pause' : 'play'} />
      </button>
      <p className={styles.time}>
        {clockTime(timeMs)} <span className={styles.length}>/ {clockTime(lengthMs)}</span>
      </p>
    </div>
  );
}
