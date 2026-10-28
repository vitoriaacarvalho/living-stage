import { DANCE_TITLE_MAX_LENGTH, parseDanceTitle, type Dance } from '@living-stage/shared';
import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import { TextField } from '../ui/TextField.tsx';
import styles from './DanceList.module.css';

const blankTitleError = 'Give the dance a title.';
const createError = 'Could not create the dance. Try again.';
const renameError = 'Could not rename the dance. Try again.';

type DanceFormProps = {
  dance: Dance | null;
  onSubmit: (title: string) => Promise<void>;
  onClose: () => void;
};

export function DanceForm({ dance, onSubmit, onClose }: DanceFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = parseDanceTitle(new FormData(event.currentTarget).get('title'));
    if (!title) {
      setError(blankTitleError);
      return;
    }
    setError(null);
    setPending(true);
    try {
      await onSubmit(title);
      onClose();
    } catch {
      setError(dance ? renameError : createError);
      setPending(false);
    }
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
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={pending}>
          {dance ? 'Save' : 'Create dance'}
        </Button>
      </div>
    </form>
  );
}
