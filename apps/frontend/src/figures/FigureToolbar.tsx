import type { FigureCopy } from '@living-stage/shared';
import { useState } from 'react';
import type { CircleTool } from '../paths/useCircling.ts';
import formStyles from '../ui/Form.module.css';
import { Icon, type IconName } from '../ui/Icon.tsx';
import styles from './FigureToolbar.module.css';

type Placement = FigureCopy['placement'];

const tools: { placement: Placement; icon: IconName; label: string }[] = [
  { placement: 'end', icon: 'plus', label: 'New figure' },
  { placement: 'after', icon: 'copy', label: 'Duplicate' },
];

type FigureToolbarProps = {
  disabled: boolean;
  onCopy: (placement: Placement) => Promise<void>;
  circle: CircleTool;
};

export function FigureToolbar({ disabled, onCopy, circle }: FigureToolbarProps) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy(placement: Placement) {
    setFailed(false);
    setPending(true);
    try {
      await onCopy(placement);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className={styles.toolbar} role="toolbar" aria-label="Figure tools">
        {tools.map(({ placement, icon, label }) => (
          <button
            key={placement}
            type="button"
            className={styles.tool}
            aria-label={label}
            disabled={disabled || pending}
            onClick={() => copy(placement)}
          >
            <Icon name={icon} />
            <span className={styles.label} aria-hidden="true">
              {label}
            </span>
          </button>
        ))}
        <span className={styles.divider} aria-hidden="true" />
        <button
          type="button"
          className={styles.tool}
          aria-label="Circle around"
          aria-pressed={circle.picking}
          disabled={!circle.available}
          onClick={circle.onToggle}
        >
          <Icon name="path" />
          <span className={styles.label} aria-hidden="true">
            Circle around
          </span>
        </button>
      </div>
      {failed && (
        <p role="alert" className={formStyles.error}>
          Could not add the figure. Try again.
        </p>
      )}
    </>
  );
}
