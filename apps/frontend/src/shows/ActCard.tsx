import { ACT_NAME_MAX_LENGTH, parseActUpdate, type Act } from '@living-stage/shared';
import { useState, type FormEvent } from 'react';
import { dancerCount } from '../cast/dancer-count.ts';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import { Icon } from '../ui/Icon.tsx';
import { TextField } from '../ui/TextField.tsx';
import styles from './ShowPage.module.css';
import type { ShowActions } from './useShow.ts';

type ActCardProps = {
  act: Act;
  label: string;
  // Null for the only act, which can't be deleted.
  actions: Pick<ShowActions, 'saveAct'> & { remove: (() => Promise<void>) | null };
};

export function ActCard({ act, label, actions }: ActCardProps) {
  const [renaming, setRenaming] = useState(false);
  return (
    <section className={styles.act} aria-label={label}>
      {renaming ? (
        <ActForm act={act} label={label} actions={actions} onClose={() => setRenaming(false)} />
      ) : (
        <div className={styles.actHead}>
          <h2 className={styles.actTitle}>{label}</h2>
          <Button
            variant="ghost"
            icon="pencil"
            aria-label={`Rename ${label}`}
            onClick={() => setRenaming(true)}
          />
        </div>
      )}
      {act.dances.length === 0 ? (
        <p className={styles.empty}>No dances in this act yet.</p>
      ) : (
        <ol className={styles.rows}>
          {act.dances.map((dance, index) => (
            <li key={dance.id} className={styles.row}>
              <span className={styles.order}>{String(index + 1).padStart(2, '0')}</span>
              <span className={styles.danceTitle}>{dance.title}</span>
              <span className={styles.cast}>
                <Icon name="users" />
                {dancerCount(dance.castCount)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

type ActFormProps = ActCardProps & { onClose: () => void };

function ActForm({ act, label, actions, onClose }: ActFormProps) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<void>, failure: string) {
    setError(null);
    setPending(true);
    try {
      await action();
      onClose();
    } catch {
      setError(failure);
      setPending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const update = parseActUpdate({ name: new FormData(event.currentTarget).get('name') });
    if (update) run(() => actions.saveAct(act.id, update), 'Could not save the act. Try again.');
  }

  const leaving =
    act.dances.length === 1 ? 'Its dance leaves' : `Its ${act.dances.length} dances leave`;
  const remove = actions.remove;

  return (
    <form className={styles.actForm} onSubmit={handleSubmit} aria-label={`Rename ${label}`}>
      <TextField
        label="Name"
        name="name"
        defaultValue={act.name ?? ''}
        help="Optional. An act with no name is numbered."
        maxLength={ACT_NAME_MAX_LENGTH}
        autoComplete="off"
        autoFocus
      />
      {error && (
        <p role="alert" className={formStyles.error}>
          {error}
        </p>
      )}
      <div className={styles.formActions}>
        {confirming && remove ? (
          <>
            <p className={styles.confirm}>
              Delete {label}?{act.dances.length > 0 && ` ${leaving} the show.`}
            </p>
            <span className={styles.spacer} />
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
              Keep
            </Button>
            <Button
              variant="primary"
              onClick={() => run(remove, 'Could not delete the act. Try again.')}
              disabled={pending}
            >
              Delete
            </Button>
          </>
        ) : (
          <>
            {remove && (
              <Button variant="ghost" className={styles.delete} onClick={() => setConfirming(true)}>
                Delete
              </Button>
            )}
            <span className={styles.spacer} />
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={pending}>
              Save
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
