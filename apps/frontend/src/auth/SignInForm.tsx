import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button.tsx';
import { PasswordField } from '../ui/PasswordField.tsx';
import { TextField } from '../ui/TextField.tsx';
import styles from './AuthForm.module.css';
import { authClient } from './client.ts';

type SignInFields = { email: string; password: string };

const errorMessages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Wrong email or password.',
  INVALID_EMAIL: 'Check the email address.',
};
const fallbackError = 'Could not sign in. Try again.';

// A plain onSubmit for the same reason as SignUpForm: a form action would clear the fields on failure.
export function SignInForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setPending(true);
    setError(
      await signIn({
        email: String(form.get('email')),
        password: String(form.get('password')),
      }),
    );
    setPending(false);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <header className={styles.header}>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.lead}>Plan figures, music and shows for your school.</p>
      </header>
      <TextField label="Email" name="email" type="email" autoComplete="email" required />
      <PasswordField label="Password" name="password" autoComplete="current-password" required />
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <Button variant="primary" type="submit" width="full" disabled={pending}>
        Sign in
      </Button>
    </form>
  );
}

async function signIn(fields: SignInFields): Promise<string | null> {
  try {
    const { error } = await authClient.signIn.email(fields);
    return error ? describeError(error.code) : null;
  } catch {
    return fallbackError;
  }
}

function describeError(code: string | undefined): string {
  return (code && errorMessages[code]) || fallbackError;
}
