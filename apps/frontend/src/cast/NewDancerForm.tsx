import {
  DANCER_NAME_MAX_LENGTH,
  parseDancerName,
  type DancerColor,
  type DancerInput,
} from '@living-stage/shared';
import { useState, type FormEvent } from 'react';
import { ColorPicker } from '../dancers/DancerForm.tsx';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import { TextField } from '../ui/TextField.tsx';
import styles from './CastMemberForm.module.css';

const blankNameError = 'Give the dancer a name.';
const saveError = 'Could not save the dancer. Try again.';

type NewDancerFormProps = {
  onSave: (input: DancerInput) => Promise<void>;
  onCancel: () => void;
};

export function NewDancerForm({ onSave, onCancel }: NewDancerFormProps) {
  const [color, setColor] = useState<DancerColor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = parseDancerName(new FormData(event.currentTarget).get('name'));
    if (!name) {
      setError(blankNameError);
      return;
    }
    setError(null);
    setPending(true);
    try {
      await onSave({ name, color });
    } catch {
      setError(saveError);
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.title}>New dancer</h2>
      <TextField
        label="Name"
        name="name"
        help="Also added to the roster."
        maxLength={DANCER_NAME_MAX_LENGTH}
        autoComplete="off"
        autoFocus
        required
      />
      <ColorPicker color={color} onPick={setColor} />
      {error && (
        <p role="alert" className={formStyles.error}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <span className={styles.spacer} />
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={pending}>
          Save
        </Button>
      </div>
    </form>
  );
}
