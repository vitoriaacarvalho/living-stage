import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { Access } from './Access.tsx';

vi.mock('./client.ts', () => ({
  authClient: { signIn: { email: vi.fn() }, signUp: { email: vi.fn() } },
}));

test('opens on sign-in', () => {
  render(<Access />);
  expect(screen.getByRole('heading', { name: 'Sign in to your account' })).toBeInTheDocument();
});

test('switches to sign-up', async () => {
  const user = userEvent.setup();
  render(<Access />);
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
});

test('switches back to sign-in', async () => {
  const user = userEvent.setup();
  render(<Access />);
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(screen.getByRole('heading', { name: 'Sign in to your account' })).toBeInTheDocument();
});
