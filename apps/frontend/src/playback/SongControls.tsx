import { Icon } from '../ui/Icon.tsx';
import { SegmentedControl } from '../ui/SegmentedControl.tsx';
import styles from './SongControls.module.css';
import type { SongPlayback } from './useSongPlayback.ts';

const speeds = [
  { value: '0.5', label: '0.5×' },
  { value: '0.75', label: '0.75×' },
  { value: '1', label: '1×' },
] as const;

type Speed = (typeof speeds)[number]['value'];

// Speed and Repeat figure, for a dance played to its song.
export function SongControls({ playback }: { playback: SongPlayback }) {
  return (
    <div className={styles.controls}>
      <SegmentedControl
        label="Speed"
        options={speeds}
        value={String(playback.speed) as Speed}
        onChange={(speed) => playback.setSpeed(Number(speed))}
      />
      <button
        type="button"
        className={styles.repeat}
        aria-label="Repeat figure"
        aria-pressed={playback.repeat}
        onClick={() => playback.setRepeat(!playback.repeat)}
      >
        <Icon name="loop" />
        <span className={styles.repeatText} aria-hidden="true">
          Repeat figure
        </span>
      </button>
    </div>
  );
}
