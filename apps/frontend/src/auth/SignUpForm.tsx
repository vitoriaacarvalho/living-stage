import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button.tsx';
import { PasswordField } from '../ui/PasswordField.tsx';
import { TextField } from '../ui/TextField.tsx';
import styles from '../ui/Form.module.css';
import { authClient } from './client.ts';

type SignUpFields = { name: string; email: string; password: string };

const errorMessages: Record<string, string> = {
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'An account with this email already exists.',
  PASSWORD_TOO_SHORT: 'The password needs at least 8 characters.',
  PASSWORD_TOO_LONG: 'The password can have at most 128 characters.',
  INVALID_EMAIL: 'Check the email address.',
};
const fallbackError = 'Could not create the account. Try again.';

// A plain onSubmit instead of a React 19 form action: actions reset the form when they finish,
// which would wipe what the user typed whenever sign-up fails.
export function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setPending(true);
    setError(
      await signUp({
        name: String(form.get('name')),
        email: String(form.get('email')),
        password: String(form.get('password')),
      }),
    );
    setPending(false);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.formTitle}>Create your account</h2>
      <TextField label="Name" name="name" autoComplete="name" required />
      <TextField label="Email" name="email" type="email" autoComplete="email" required />
      <PasswordField
        label="Password"
        name="password"
        autoComplete="new-password"
        help="At least 8 characters."
        required
      />
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <Button variant="primary" type="submit" width="full" disabled={pending}>
        Create account
      </Button>
    </form>
  );
}

async function signUp(fields: SignUpFields): Promise<string | null> {
  try {
    const { error } = await authClient.signUp.email(fields);
    return error ? describeError(error.code) : null;
  } catch {
    return fallbackError;
  }
}

function describeError(code: string | undefined): string {
  return (code && errorMessages[code]) || fallbackError;
}
