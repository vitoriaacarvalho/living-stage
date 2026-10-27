import {
  DANCER_NAME_MAX_LENGTH,
  parseDancerName,
  type Dancer,
  type DancerColor,
} from '@living-stage/shared';
import { useState, type CSSProperties, type FormEvent } from 'react';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import { TextField } from '../ui/TextField.tsx';
import { dancerColorName, dancerColors, dancerColorVar } from './dancer-colors.ts';
import styles from './DancerForm.module.css';
import type { DancerActions } from './useDancers.ts';

const blankNameError = 'Give the dancer a name.';
const saveError = 'Could not save the dancer. Try again.';
const removeError = 'Could not remove the dancer. Try again.';

type DancerFormProps = { dancer: Dancer | null; actions: DancerActions; onClose: () => void };

export function DancerForm({ dancer, actions, onClose }: DancerFormProps) {
  const [color, setColor] = useState<DancerColor | null>(dancer?.color ?? null);
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
    const name = parseDancerName(new FormData(event.currentTarget).get('name'));
    if (!name) {
      setError(blankNameError);
      return;
    }
    run(
      () => (dancer ? actions.save({ id: dancer.id, name, color }) : actions.add({ name, color })),
      saveError,
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.head}>
        <h2 className={styles.title}>{dancer ? 'Edit dancer' : 'New dancer'}</h2>
        <Button variant="ghost" icon="x" aria-label="Close" onClick={onClose} />
      </div>
      <TextField
        label="Name"
        name="name"
        defaultValue={dancer?.name}
        help="Shown in the dancer's circle on stage. Short works best."
        maxLength={DANCER_NAME_MAX_LENGTH}
        autoComplete="off"
        required
      />
      <ColorPicker color={color} onPick={setColor} />
      {error && (
        <p role="alert" className={formStyles.error}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        {confirming && dancer ? (
          <>
            <p className={styles.confirm}>Remove {dancer.name} from the roster?</p>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
              Keep
            </Button>
            <Button
              variant="primary"
              onClick={() => run(() => actions.remove(dancer.id), removeError)}
              disabled={pending}
            >
              Remove
            </Button>
          </>
        ) : (
          <>
            {dancer && (
              <Button variant="ghost" className={styles.remove} onClick={() => setConfirming(true)}>
                Remove
              </Button>
            )}
            <span className={styles.spacer} />
            <Button variant="secondary" onClick={onClose}>
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

type ColorPickerProps = { color: DancerColor | null; onPick: (color: DancerColor | null) => void };

function ColorPicker({ color, onPick }: ColorPickerProps) {
  return (
    <fieldset className={styles.colors}>
      <legend className={styles.legend}>Default color</legend>
      <div className={styles.swatches}>
        {[null, ...dancerColors].map((each) => (
          <button
            key={each ?? 'none'}
            type="button"
            className={each === null ? `${styles.swatch} ${styles.none}` : styles.swatch}
            style={{ '--swatch': dancerColorVar(each) } as CSSProperties}
            aria-label={dancerColorName(each)}
            aria-pressed={each === color}
            onClick={() => onPick(each)}
          />
        ))}
      </div>
    </fieldset>
  );
}
