import { PATH_TURNS_MAX } from '@living-stage/shared';
import { Button } from '../ui/Button.tsx';
import { SegmentedControl } from '../ui/SegmentedControl.tsx';
import styles from './CirclingRow.module.css';
import type { CirclingRowProps } from './useCircling.ts';

const directions = [
  { value: 'clockwise', label: 'Clockwise' },
  { value: 'counterclockwise', label: 'Counterclockwise' },
] as const;

export function CirclingRow({ centreName, around, onChange }: CirclingRowProps) {
  const { turns } = around;
  return (
    <section className={styles.row} aria-label="Circling">
      <p className={styles.around}>
        Around <strong>{centreName}</strong>
      </p>
      <SegmentedControl
        label="Direction"
        options={directions}
        value={around.clockwise ? 'clockwise' : 'counterclockwise'}
        onChange={(direction) => onChange({ ...around, clockwise: direction === 'clockwise' })}
      />
      <div className={styles.turns} role="group" aria-label="Extra turns">
        <span className={styles.label} aria-hidden="true">
          Extra turns
        </span>
        <Button
          variant="secondary"
          icon="minus"
          aria-label="One turn fewer"
          disabled={turns === 0}
          onClick={() => onChange({ ...around, turns: turns - 1 })}
        />
        <output className={styles.count} aria-live="polite">
          {turns}
        </output>
        <Button
          variant="secondary"
          icon="plus"
          aria-label="One turn more"
          disabled={turns === PATH_TURNS_MAX}
          onClick={() => onChange({ ...around, turns: turns + 1 })}
        />
      </div>
      <Button variant="secondary" onClick={() => onChange(null)}>
        Stop circling
      </Button>
    </section>
  );
}
