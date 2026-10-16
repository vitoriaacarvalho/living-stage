import { formatInviteCode, type Invite } from '@living-stage/shared';
import { useState } from 'react';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import { Icon } from '../ui/Icon.tsx';
import styles from './InviteTeachers.module.css';
import { inviteLink } from './join-link.ts';
import { useSchoolInvite } from './useSchoolInvite.ts';

const loadError = 'Could not load the invitation code. Go back and try again.';
const newCodeError = 'Could not make a new code. Try again.';
const copyError = 'Could not copy. Select the code and copy it by hand.';

const expiryFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });

type InviteTeachersProps = { schoolId: string; onDone: () => void };

export function InviteTeachers({ schoolId, onDone }: InviteTeachersProps) {
  const { state, makeNewCode } = useSchoolInvite(schoolId);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleNewCode() {
    setError(null);
    setPending(true);
    try {
      await makeNewCode();
    } catch {
      setError(newCodeError);
    }
    setPending(false);
  }

  return (
    <div className={formStyles.form}>
      <header className={formStyles.header}>
        <h1 className={formStyles.title}>Invite your team</h1>
        <p className={formStyles.lead}>
          Teachers who join plan dances and shows with you, with the same rights.
        </p>
      </header>
      {state.status === 'failed' && (
        <p role="alert" className={formStyles.error}>
          {loadError}
        </p>
      )}
      {state.status === 'ready' &&
        (state.invite ? (
          <ActiveInvite invite={state.invite} onNewCode={handleNewCode} pending={pending} />
        ) : (
          <Button variant="primary" width="full" onClick={handleNewCode} disabled={pending}>
            Make an invitation code
          </Button>
        ))}
      {error && (
        <p role="alert" className={formStyles.error}>
          {error}
        </p>
      )}
      <p className={styles.note}>
        <Icon name="lock" />
        <span>One person edits each dance at a time. The others watch the changes live.</span>
      </p>
      <Button variant="secondary" width="full" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}

type ActiveInviteProps = { invite: Invite; onNewCode: () => void; pending: boolean };

function ActiveInvite({ invite, onNewCode, pending }: ActiveInviteProps) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  async function copy(text: string, done: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(done);
    } catch {
      setCopyStatus(copyError);
    }
  }

  const formattedCode = formatInviteCode(invite.code);
  const link = inviteLink(window.location.origin, invite.code);

  return (
    <>
      <div className={styles.code}>
        <span className={styles.codeLabel}>Invitation code</span>
        <span className={styles.codeValue}>{formattedCode}</span>
        <span className={styles.expiry}>
          Valid until {expiryFormat.format(new Date(invite.expiresAt))}
        </span>
      </div>
      <div className={styles.actions}>
        <Button variant="primary" icon="copy" onClick={() => copy(link, 'Link copied.')}>
          Copy link
        </Button>
        <Button variant="secondary" onClick={() => copy(formattedCode, 'Code copied.')}>
          Copy code
        </Button>
      </div>
      <p role="status" className={styles.status}>
        {copyStatus}
      </p>
      <div className={styles.replace}>
        <Button variant="ghost" onClick={onNewCode} disabled={pending}>
          New code
        </Button>
        <span>A new code replaces this one and its link.</span>
      </div>
    </>
  );
}
