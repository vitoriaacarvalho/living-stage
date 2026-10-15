import { useState, type FormEvent } from 'react';
import { authClient } from './client.ts';

type SignUpFields = { name: string; email: string; password: string };

const errorMessages: Record<string, string> = {
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Já existe uma conta com esse e-mail.',
  PASSWORD_TOO_SHORT: 'A senha precisa ter pelo menos 8 caracteres.',
  PASSWORD_TOO_LONG: 'A senha pode ter no máximo 128 caracteres.',
  INVALID_EMAIL: 'Confira o e-mail digitado.',
};
const fallbackError = 'Não foi possível criar a conta. Tente de novo.';

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
    <form onSubmit={handleSubmit}>
      <h1>Crie sua conta</h1>
      <label>
        Nome
        <input name="name" autoComplete="name" required />
      </label>
      <label>
        E-mail
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Senha
        <input name="password" type="password" autoComplete="new-password" required />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={pending}>
        Criar conta
      </button>
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
