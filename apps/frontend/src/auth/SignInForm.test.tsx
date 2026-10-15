import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { authClient } from './client.ts';
import { SignInForm } from './SignInForm.tsx';

vi.mock('./client.ts', () => ({
  authClient: { signIn: { email: vi.fn() } },
}));

const signInEmail = vi.mocked(authClient.signIn.email);

function respondWithError(code: string) {
  signInEmail.mockResolvedValue({ data: null, error: { code, status: 401 } } as never);
}

async function fillAndSubmit() {
  const user = userEvent.setup();
  render(<SignInForm />);
  await user.type(screen.getByLabelText('E-mail'), 'ana@example.com');
  await user.type(screen.getByLabelText('Senha'), 'pas-de-deux');
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

beforeEach(() => {
  signInEmail.mockReset();
  signInEmail.mockResolvedValue({ data: {}, error: null } as never);
});

test('sends email and password to Better Auth', async () => {
  await fillAndSubmit();
  expect(signInEmail).toHaveBeenCalledWith({
    email: 'ana@example.com',
    password: 'pas-de-deux',
  });
});

test('shows no error when sign-in succeeds', async () => {
  await fillAndSubmit();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('disables the button while the request runs', async () => {
  signInEmail.mockReturnValue(new Promise(() => {}) as never);
  await fillAndSubmit();
  expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled();
});

describe('error messages', () => {
  test.each([
    ['INVALID_EMAIL_OR_PASSWORD', 'E-mail ou senha incorretos.'],
    ['INVALID_EMAIL', 'Confira o e-mail digitado.'],
    ['SOMETHING_NEW', 'Não foi possível entrar. Tente de novo.'],
  ])('%s', async (code, message) => {
    respondWithError(code);
    await fillAndSubmit();
    expect(screen.getByRole('alert')).toHaveTextContent(message);
  });

  test('network failure shows the generic message', async () => {
    signInEmail.mockRejectedValue(new TypeError('Failed to fetch'));
    await fillAndSubmit();
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível entrar. Tente de novo.');
  });

  test('keeps what the user typed', async () => {
    respondWithError('INVALID_EMAIL_OR_PASSWORD');
    await fillAndSubmit();
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@example.com');
  });
});
