import { useState, type FormEvent } from 'react';
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
    <form onSubmit={handleSubmit}>
      <h1>Sign in to your account</h1>
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={pending}>
        Sign in
      </button>
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
