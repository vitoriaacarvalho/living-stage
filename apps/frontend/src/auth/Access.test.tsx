import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { Access } from './Access.tsx';

vi.mock('./client.ts', () => ({
  authClient: { signIn: { email: vi.fn() }, signUp: { email: vi.fn() } },
}));

test('opens on sign-in', () => {
  render(<Access />);
  expect(screen.getByRole('heading', { name: 'Entre na sua conta' })).toBeInTheDocument();
});

test('switches to sign-up', async () => {
  const user = userEvent.setup();
  render(<Access />);
  await user.click(screen.getByRole('button', { name: 'Criar conta' }));
  expect(screen.getByRole('heading', { name: 'Crie sua conta' })).toBeInTheDocument();
});

test('switches back to sign-in', async () => {
  const user = userEvent.setup();
  render(<Access />);
  await user.click(screen.getByRole('button', { name: 'Criar conta' }));
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(screen.getByRole('heading', { name: 'Entre na sua conta' })).toBeInTheDocument();
});
