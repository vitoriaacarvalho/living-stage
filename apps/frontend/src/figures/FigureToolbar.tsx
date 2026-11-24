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

type FigureActions = {
  copy: (placement: Placement) => Promise<void>;
  // Left out on iPhone, where Present sits in the title bar.
  present?: () => void;
  // Null while there is nothing to undo or redo.
  undo: (() => void) | null;
  redo: (() => void) | null;
};

const historyTools = [
  { key: 'undo', icon: 'undo', label: 'Undo' },
  { key: 'redo', icon: 'redo', label: 'Redo' },
] as const;

type FigureToolbarProps = {
  disabled: boolean;
  actions: FigureActions;
  circle: CircleTool;
};

export function FigureToolbar({ disabled, actions, circle }: FigureToolbarProps) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy(placement: Placement) {
    setFailed(false);
    setPending(true);
    try {
      await actions.copy(placement);
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
        {historyTools.map(({ key, icon, label }) => (
          <button
            key={key}
            type="button"
            className={styles.tool}
            aria-label={label}
            disabled={!actions[key]}
            onClick={() => actions[key]?.()}
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
        {actions.present && (
          <>
            <span className={styles.divider} aria-hidden="true" />
            <button
              type="button"
              className={`${styles.tool} ${styles.present}`}
              aria-label="Present"
              disabled={disabled}
              onClick={actions.present}
            >
              <Icon name="present" />
              <span className={styles.label} aria-hidden="true">
                Present
              </span>
            </button>
          </>
        )}
      </div>
      {failed && (
        <p role="alert" className={formStyles.error}>
          Could not add the figure. Try again.
        </p>
      )}
    </>
  );
}
