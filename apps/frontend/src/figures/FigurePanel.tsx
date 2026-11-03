import { FIGURE_NAME_MAX_LENGTH, parseFigureName, type Figure } from '@living-stage/shared';
import { useState, type FormEvent } from 'react';
import panelStyles from '../cast/CastList.module.css';
import styles from '../cast/CastMemberForm.module.css';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import { TextField } from '../ui/TextField.tsx';
import { figureLabel } from './figure-label.ts';

export type FigureActions = {
  rename: (name: string | null) => Promise<void>;
  remove: () => Promise<void>;
};

type FigurePanelProps = {
  figure: Figure;
  figures: Figure[];
  actions: FigureActions;
  onClose: () => void;
};

export function FigurePanel({ figure, figures, actions, onClose }: FigurePanelProps) {
  const label = figureLabel(figure, figures.indexOf(figure));
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<void>, failure: string) {
    setError(null);
    setPending(true);
    try {
      await action();
    } catch {
      setError(failure);
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = parseFigureName(new FormData(event.currentTarget).get('name')) ?? null;
    run(async () => {
      await actions.rename(name);
      onClose();
    }, 'Could not save the name. Try again.');
  }

  return (
    <aside className={panelStyles.panel} aria-label="Figure">
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.head}>
          <h2 className={styles.title}>{label}</h2>
          <Button variant="ghost" icon="x" aria-label="Close" onClick={onClose} />
        </div>
        <TextField
          label="Name"
          name="name"
          defaultValue={figure.name ?? ''}
          help="Optional. A figure with no name is numbered."
          maxLength={FIGURE_NAME_MAX_LENGTH}
          autoComplete="off"
        />
        {error && (
          <p role="alert" className={formStyles.error}>
            {error}
          </p>
        )}
        <div className={styles.actions}>
          {confirming ? (
            <>
              <p className={styles.confirm}>Delete {label} and its positions?</p>
              <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
                Keep
              </Button>
              <Button
                variant="primary"
                onClick={() => run(actions.remove, 'Could not delete the figure. Try again.')}
                disabled={pending}
              >
                Delete
              </Button>
            </>
          ) : (
            <>
              {figures.length > 1 && (
                <Button
                  variant="ghost"
                  className={styles.remove}
                  onClick={() => setConfirming(true)}
                >
                  Delete
                </Button>
              )}
              <span className={styles.spacer} />
              <Button variant="primary" type="submit" disabled={pending}>
                Save
              </Button>
            </>
          )}
        </div>
      </form>
    </aside>
  );
}
