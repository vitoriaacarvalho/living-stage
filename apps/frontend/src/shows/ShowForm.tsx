import {
  SHOW_TITLE_MAX_LENGTH,
  SHOW_VENUE_MAX_LENGTH,
  parseIntervalMs,
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
const intervalError = 'Type the interval in whole minutes, from 0 to 60.';

// Whole minutes; blank means no interval. Anything else fails the shared check.
function intervalFrom(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  return /^\d+$/.test(trimmed) ? Number(trimmed) * 60_000 : null;
}

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
    const form = new FormData(event.currentTarget);
    const intervalMs = intervalFrom(String(form.get('interval')));
    if (parseIntervalMs(intervalMs) === undefined) {
      setError(intervalError);
      return;
    }
    const input = parseShowInput({ ...Object.fromEntries(form), intervalMs });
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
        label="Interval between acts"
        name="interval"
        inputMode="numeric"
        defaultValue={show && show.intervalMs > 0 ? String(show.intervalMs / 60_000) : ''}
        help="Minutes, from 0 to 60. Leave blank for none."
        autoComplete="off"
      />
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
