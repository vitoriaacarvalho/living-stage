import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { authClient } from './client.ts';
import { SignUpForm } from './SignUpForm.tsx';

vi.mock('./client.ts', () => ({
  authClient: { signUp: { email: vi.fn() } },
}));

const signUpEmail = vi.mocked(authClient.signUp.email);

function respondWithError(code: string) {
  signUpEmail.mockResolvedValue({ data: null, error: { code, status: 400 } } as never);
}

async function fillAndSubmit() {
  const user = userEvent.setup();
  render(<SignUpForm />);
  await user.type(screen.getByLabelText('Nome'), 'Ana');
  await user.type(screen.getByLabelText('E-mail'), 'ana@example.com');
  await user.type(screen.getByLabelText('Senha'), 'pas-de-deux');
  await user.click(screen.getByRole('button', { name: 'Criar conta' }));
}

beforeEach(() => {
  signUpEmail.mockReset();
  signUpEmail.mockResolvedValue({ data: {}, error: null } as never);
});

test('sends name, email and password to Better Auth', async () => {
  await fillAndSubmit();
  expect(signUpEmail).toHaveBeenCalledWith({
    name: 'Ana',
    email: 'ana@example.com',
    password: 'pas-de-deux',
  });
});

test('shows no error when sign-up succeeds', async () => {
  await fillAndSubmit();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('disables the button while the request runs', async () => {
  signUpEmail.mockReturnValue(new Promise(() => {}) as never);
  await fillAndSubmit();
  expect(screen.getByRole('button', { name: 'Criar conta' })).toBeDisabled();
});

describe('error messages', () => {
  test.each([
    ['USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', 'Já existe uma conta com esse e-mail.'],
    ['PASSWORD_TOO_SHORT', 'A senha precisa ter pelo menos 8 caracteres.'],
    ['PASSWORD_TOO_LONG', 'A senha pode ter no máximo 128 caracteres.'],
    ['INVALID_EMAIL', 'Confira o e-mail digitado.'],
    ['SOMETHING_NEW', 'Não foi possível criar a conta. Tente de novo.'],
  ])('%s', async (code, message) => {
    respondWithError(code);
    await fillAndSubmit();
    expect(screen.getByRole('alert')).toHaveTextContent(message);
  });

  test('network failure shows the generic message', async () => {
    signUpEmail.mockRejectedValue(new TypeError('Failed to fetch'));
    await fillAndSubmit();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível criar a conta. Tente de novo.',
    );
  });

  test('keeps what the user typed', async () => {
    respondWithError('PASSWORD_TOO_SHORT');
    await fillAndSubmit();
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@example.com');
  });
});
