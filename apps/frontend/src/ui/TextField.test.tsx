import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { TextField } from './TextField.tsx';

test('names the input with its label', () => {
  render(<TextField label="Email" name="email" />);
  expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
});

test('passes input attributes through', () => {
  render(<TextField label="Email" name="email" type="email" required />);
  expect(screen.getByLabelText('Email')).toBeRequired();
});

test('takes what the user types', async () => {
  render(<TextField label="Email" name="email" />);
  await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com');
  expect(screen.getByLabelText('Email')).toHaveValue('ana@example.com');
});

test('describes the input with its help text', () => {
  render(<TextField label="Password" type="password" help="At least 8 characters" />);
  expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('At least 8 characters');
});

test('has no description without help text', () => {
  render(<TextField label="Email" name="email" />);
  expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-describedby');
});
