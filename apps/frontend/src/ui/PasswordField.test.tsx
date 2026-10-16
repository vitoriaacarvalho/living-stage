import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { PasswordField } from './PasswordField.tsx';

test('hides the password at first', () => {
  render(<PasswordField label="Password" name="password" />);
  expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
});

test('shows the password when asked', async () => {
  render(<PasswordField label="Password" name="password" />);
  await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
  expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
});

test('offers to hide the password once shown', async () => {
  render(<PasswordField label="Password" name="password" />);
  await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
  expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
});

test('hides the password again', async () => {
  render(<PasswordField label="Password" name="password" />);
  await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
  await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));
  expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
});

test('keeps what the user typed when toggled', async () => {
  render(<PasswordField label="Password" name="password" />);
  await userEvent.type(screen.getByLabelText('Password'), 'pas-de-deux');
  await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
  expect(screen.getByLabelText('Password')).toHaveValue('pas-de-deux');
});
