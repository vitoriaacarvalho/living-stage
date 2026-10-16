import type { School } from '@living-stage/shared';
import { useState } from 'react';
import { joinSchool } from '../api/invites.ts';
import { Button } from '../ui/Button.tsx';
import styles from '../ui/Form.module.css';
import type { FoundInvite } from './JoinCodeForm.tsx';

const joinError = 'Could not join the school. Try again, or ask for a new code.';

type JoinConfirmProps = {
  invite: FoundInvite;
  onJoined: (school: School) => void;
  cancel: { label: string; onClick: () => void };
};

export function JoinConfirm({ invite, onJoined, cancel }: JoinConfirmProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleJoin() {
    setError(null);
    setPending(true);
    try {
      onJoined(await joinSchool(invite.code));
    } catch {
      setError(joinError);
      setPending(false);
    }
  }

  return (
    <div className={styles.form}>
      <header className={styles.header}>
        <h1 className={styles.title}>Join {invite.schoolName}</h1>
        <p className={styles.lead}>You'll plan dances and shows with its teachers.</p>
      </header>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <Button variant="primary" width="full" onClick={handleJoin} disabled={pending}>
        Join school
      </Button>
      <Button variant="secondary" width="full" onClick={cancel.onClick} disabled={pending}>
        {cancel.label}
      </Button>
    </div>
  );
}
