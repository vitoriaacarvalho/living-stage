import { DANCE_TITLE_MAX_LENGTH, parseDanceTitle, type DanceSummary } from '@living-stage/shared';
import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import { TextField } from '../ui/TextField.tsx';
import styles from './DanceList.module.css';
import type { DanceActions } from './useDances.ts';

const blankTitleError = 'Give the dance a title.';
const createError = 'Could not create the dance. Try again.';
const renameError = 'Could not rename the dance. Try again.';
const deleteError = 'Could not delete the dance. Try again.';

const titles = new Intl.ListFormat('en-GB', { type: 'conjunction' });

export function deleteWarning({ title, showTitles }: DanceSummary): string {
  const them = showTitles.length === 1 ? 'it' : 'them';
  const shows =
    showTitles.length === 0 ? '' : ` It is in ${titles.format(showTitles)} and will leave ${them}.`;
  return `Delete ${title}?${shows} This can't be undone.`;
}

type DanceFormProps = { dance: DanceSummary | null; actions: DanceActions; onClose: () => void };

export function DanceForm({ dance, actions, onClose }: DanceFormProps) {
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
    const title = parseDanceTitle(new FormData(event.currentTarget).get('title'));
    if (!title) {
      setError(blankTitleError);
      return;
    }
    if (dance) run(() => actions.rename({ ...dance, title }), renameError);
    else run(() => actions.add({ title }), createError);
  }

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
      aria-label={dance ? `Rename ${dance.title}` : 'New dance'}
    >
      <TextField
        label="Title"
        name="title"
        defaultValue={dance?.title}
        maxLength={DANCE_TITLE_MAX_LENGTH}
        autoComplete="off"
        autoFocus
        required
      />
      {error && (
        <p role="alert" className={formStyles.error}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        {confirming && dance ? (
          <>
            <p className={styles.confirm}>{deleteWarning(dance)}</p>
            <span className={styles.spacer} />
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
              Keep
            </Button>
            <Button
              variant="primary"
              onClick={() => run(() => actions.remove(dance.id), deleteError)}
              disabled={pending}
            >
              Delete
            </Button>
          </>
        ) : (
          <>
            {dance && (
              <Button variant="ghost" className={styles.delete} onClick={() => setConfirming(true)}>
                Delete
              </Button>
            )}
            <span className={styles.spacer} />
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={pending}>
              {dance ? 'Save' : 'Create dance'}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
