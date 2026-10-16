import { parseInviteCode, type School } from '@living-stage/shared';
import { useEffect, useState } from 'react';
import { previewInvite } from '../api/invites.ts';
import { Button } from '../ui/Button.tsx';
import { CardPage } from '../ui/CardPage.tsx';
import styles from '../ui/Form.module.css';
import { JoinConfirm } from './JoinConfirm.tsx';

type LinkState =
  | { status: 'loading' }
  | { status: 'invalid' }
  | { status: 'failed' }
  | { status: 'found'; code: string; schoolName: string };

const problems = {
  invalid: "This link doesn't match a school, or it has expired. Ask for a new one.",
  failed: 'Could not check the invitation. Reload the page to try again.',
};

type JoinFromLinkProps = {
  code: string;
  onJoined: (school: School) => void;
  onDismiss: () => void;
};

export function JoinFromLink({ code, onJoined, onDismiss }: JoinFromLinkProps) {
  const state = useLinkInvite(code);

  if (state.status === 'loading') return null;
  return (
    <CardPage>
      {state.status === 'found' ? (
        <JoinConfirm
          invite={state}
          onJoined={onJoined}
          cancel={{ label: 'Not now', onClick: onDismiss }}
        />
      ) : (
        <LinkProblem message={problems[state.status]} onDismiss={onDismiss} />
      )}
    </CardPage>
  );
}

function LinkProblem({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className={styles.form}>
      <header className={styles.header}>
        <h1 className={styles.title}>Invitation</h1>
      </header>
      <p role="alert" className={styles.error}>
        {message}
      </p>
      <Button variant="primary" width="full" onClick={onDismiss}>
        Continue
      </Button>
    </div>
  );
}

function useLinkInvite(rawCode: string): LinkState {
  const code = parseInviteCode(rawCode);
  const [state, setState] = useState<LinkState>({ status: 'loading' });

  useEffect(() => {
    if (!code) return;
    const controller = new AbortController();
    previewInvite(code, controller.signal)
      .then((schoolName) =>
        setState(schoolName ? { status: 'found', code, schoolName } : { status: 'invalid' }),
      )
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'failed' });
      });
    return () => controller.abort();
  }, [code]);

  return code ? state : { status: 'invalid' };
}
