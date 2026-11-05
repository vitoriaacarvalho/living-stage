import {
  SHOW_TITLE_MAX_LENGTH,
  SHOW_VENUE_MAX_LENGTH,
  parseShowInput,
  type Show,
  type ShowInput,
} from '@living-stage/shared';
import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import { TextField } from '../ui/TextField.tsx';
import listStyles from '../dances/DanceList.module.css';
import styles from './Shows.module.css';

const invalidError = 'Give the show a title and a day.';

type ShowFormProps = {
  show: Show | null;
  onSave: (input: ShowInput) => Promise<void>;
  onClose: () => void;
};

export function ShowForm({ show, onSave, onClose }: ShowFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = parseShowInput(Object.fromEntries(new FormData(event.currentTarget)));
    if (!input) {
      setError(invalidError);
      return;
    }
    setError(null);
    setPending(true);
    try {
      await onSave(input);
      onClose();
    } catch {
      setError(
        show ? 'Could not save the show. Try again.' : 'Could not create the show. Try again.',
      );
      setPending(false);
    }
  }

  return (
    <form
      className={listStyles.form}
      onSubmit={handleSubmit}
      aria-label={show ? `Edit ${show.title}` : 'New show'}
      noValidate
    >
      <TextField
        label="Title"
        name="title"
        defaultValue={show?.title}
        maxLength={SHOW_TITLE_MAX_LENGTH}
        autoComplete="off"
        autoFocus
        required
      />
      <div className={styles.when}>
        <TextField label="Day" name="date" type="date" defaultValue={show?.date} required />
        <TextField
          label="Time"
          name="time"
          type="time"
          defaultValue={show?.time ?? ''}
          help="Optional"
        />
      </div>
      <TextField
        label="Venue"
        name="venue"
        defaultValue={show?.venue ?? ''}
        maxLength={SHOW_VENUE_MAX_LENGTH}
        help="Optional"
        autoComplete="off"
      />
      {error && (
        <p role="alert" className={formStyles.error}>
          {error}
        </p>
      )}
      <div className={listStyles.actions}>
        <span className={listStyles.spacer} />
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={pending}>
          {show ? 'Save' : 'Create show'}
        </Button>
      </div>
    </form>
  );
}
