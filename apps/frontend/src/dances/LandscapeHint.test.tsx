import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { LandscapeHint } from './LandscapeHint.tsx';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

test('suggests turning the phone sideways', () => {
  render(<LandscapeHint />);
  expect(screen.getByRole('note')).toHaveTextContent('Turn sideways for more room to edit');
});

test('hides on dismiss', async () => {
  render(<LandscapeHint />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Hide this tip' }));
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
});

test('stays hidden once dismissed', async () => {
  const { unmount } = render(<LandscapeHint />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Hide this tip' }));
  unmount();
  render(<LandscapeHint />);
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
});

test('still shows when storage is blocked', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  render(<LandscapeHint />);
  expect(screen.getByRole('note')).toBeInTheDocument();
});

test('still hides when storage is blocked', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  render(<LandscapeHint />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Hide this tip' }));
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
});
