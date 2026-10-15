import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { authClient } from './client.ts';
import { SignOutButton } from './SignOutButton.tsx';

vi.mock('./client.ts', () => ({
  authClient: { signOut: vi.fn() },
}));

const signOut = vi.mocked(authClient.signOut);

async function clickSignOut() {
  const user = userEvent.setup();
  render(<SignOutButton />);
  await user.click(screen.getByRole('button', { name: 'Sign out' }));
}

beforeEach(() => {
  signOut.mockReset();
  signOut.mockResolvedValue({ data: { success: true }, error: null } as never);
});

test('signs out through Better Auth', async () => {
  await clickSignOut();
  expect(signOut).toHaveBeenCalledOnce();
});

test('shows no error when sign-out succeeds', async () => {
  await clickSignOut();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('disables the button while the request runs', async () => {
  signOut.mockReturnValue(new Promise(() => {}) as never);
  await clickSignOut();
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeDisabled();
});

test('shows a message when Better Auth returns an error', async () => {
  signOut.mockResolvedValue({ data: null, error: { status: 500 } } as never);
  await clickSignOut();
  expect(screen.getByRole('alert')).toHaveTextContent('Could not sign out. Try again.');
});

test('shows a message on network failure', async () => {
  signOut.mockRejectedValue(new TypeError('Failed to fetch'));
  await clickSignOut();
  expect(screen.getByRole('alert')).toHaveTextContent('Could not sign out. Try again.');
});
