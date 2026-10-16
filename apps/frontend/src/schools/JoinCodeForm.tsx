import { parseInviteCode } from '@living-stage/shared';
import { useState, type FormEvent } from 'react';
import { previewInvite } from '../api/invites.ts';
import { Button } from '../ui/Button.tsx';
import styles from '../ui/Form.module.css';
import { TextField } from '../ui/TextField.tsx';

export type FoundInvite = { code: string; schoolName: string };

const malformedError = 'Check the code. It has 8 letters and numbers.';
const notFoundError = "That code doesn't match a school, or it has expired. Ask for a new one.";
const fallbackError = 'Could not check the code. Try again.';

export function JoinCodeForm({ onFound }: { onFound: (invite: FoundInvite) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = parseInviteCode(new FormData(event.currentTarget).get('code'));
    if (!code) {
      setError(malformedError);
      return;
    }
    setError(null);
    setPending(true);
    try {
      const schoolName = await previewInvite(code);
      if (schoolName) {
        onFound({ code, schoolName });
        return;
      }
      setError(notFoundError);
    } catch {
      setError(fallbackError);
    }
    setPending(false);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <header className={styles.header}>
        <h1 className={styles.title}>Join a school</h1>
        <p className={styles.lead}>Type the invitation code a teacher at your school shared.</p>
      </header>
      <TextField
        label="Invitation code"
        name="code"
        placeholder="ABCD-2345"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        required
      />
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <Button variant="primary" type="submit" width="full" disabled={pending}>
        Continue
      </Button>
    </form>
  );
}
