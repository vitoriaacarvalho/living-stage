import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { Button } from './Button.tsx';

test('shows its label', () => {
  render(<Button variant="primary">Sign in</Button>);
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
});

test('does not submit a form by default', () => {
  render(<Button variant="primary">Sign in</Button>);
  expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
});

test('can submit a form', () => {
  render(
    <Button variant="primary" type="submit">
      Sign in
    </Button>,
  );
  expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
});

test('calls onClick when pressed', async () => {
  const onClick = vi.fn();
  render(
    <Button variant="secondary" onClick={onClick}>
      Sign out
    </Button>,
  );
  await userEvent.click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalledOnce();
});

test('does not call onClick while disabled', async () => {
  const onClick = vi.fn();
  render(
    <Button variant="secondary" onClick={onClick} disabled>
      Sign out
    </Button>,
  );
  await userEvent.click(screen.getByRole('button'));
  expect(onClick).not.toHaveBeenCalled();
});

test('draws its icon before the label', () => {
  render(
    <Button variant="soft" icon="eye">
      Preview
    </Button>,
  );
  expect(screen.getByRole('button').firstElementChild?.tagName).toBe('svg');
});

test('an icon-only button is named by its aria-label', () => {
  render(<Button variant="ghost" icon="eye" aria-label="Show password" />);
  expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
});
