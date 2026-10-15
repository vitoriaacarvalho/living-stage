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
  await user.type(screen.getByLabelText('Email'), 'ana@example.com');
  await user.type(screen.getByLabelText('Password'), 'pas-de-deux');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
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
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
});

describe('error messages', () => {
  test.each([
    ['INVALID_EMAIL_OR_PASSWORD', 'Wrong email or password.'],
    ['INVALID_EMAIL', 'Check the email address.'],
    ['SOMETHING_NEW', 'Could not sign in. Try again.'],
  ])('%s', async (code, message) => {
    respondWithError(code);
    await fillAndSubmit();
    expect(screen.getByRole('alert')).toHaveTextContent(message);
  });

  test('network failure shows the generic message', async () => {
    signInEmail.mockRejectedValue(new TypeError('Failed to fetch'));
    await fillAndSubmit();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not sign in. Try again.');
  });

  test('keeps what the user typed', async () => {
    respondWithError('INVALID_EMAIL_OR_PASSWORD');
    await fillAndSubmit();
    expect(screen.getByLabelText('Email')).toHaveValue('ana@example.com');
  });
});
