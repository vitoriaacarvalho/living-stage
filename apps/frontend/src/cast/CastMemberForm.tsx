import { CAST_ROLE_MAX_LENGTH, parseCastRole, type CastMember } from '@living-stage/shared';
import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import { TextField } from '../ui/TextField.tsx';
import styles from './CastMemberForm.module.css';
import type { CastActions } from './useCast.ts';

const saveError = 'Could not save the role. Try again.';
const removeError = 'Could not remove the dancer from the cast. Try again.';

type CastMemberFormProps = {
  castMember: CastMember;
  actions: Pick<CastActions, 'save' | 'remove'>;
  onClose: () => void;
  onGive: () => void;
};

export function CastMemberForm({ castMember, actions, onClose, onGive }: CastMemberFormProps) {
  const name = castMember.dancer?.name ?? 'Open spot';
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
    const role = parseCastRole(new FormData(event.currentTarget).get('role')) ?? null;
    run(() => actions.save({ ...castMember, role }), saveError);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.head}>
        <h2 className={styles.title}>{name}</h2>
        <Button variant="ghost" icon="x" aria-label="Close" onClick={onClose} />
      </div>
      <TextField
        label="Role"
        name="role"
        defaultValue={castMember.role ?? ''}
        help="Optional. Shown on stage when labels show the role."
        maxLength={CAST_ROLE_MAX_LENGTH}
        autoComplete="off"
      />
      {!castMember.dancer && (
        <Button variant="secondary" onClick={onGive}>
          Give to a dancer
        </Button>
      )}
      {error && (
        <p role="alert" className={formStyles.error}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        {confirming ? (
          <>
            <p className={styles.confirm}>Remove {name} from this dance?</p>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
              Keep
            </Button>
            <Button
              variant="primary"
              onClick={() => run(() => actions.remove(castMember.id), removeError)}
              disabled={pending}
            >
              Remove
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" className={styles.remove} onClick={() => setConfirming(true)}>
              Remove
            </Button>
            <span className={styles.spacer} />
            <Button variant="primary" type="submit" disabled={pending}>
              Save
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
