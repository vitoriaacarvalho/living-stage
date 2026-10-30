import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { FigureToolbar } from './FigureToolbar.tsx';

function renderToolbar(onCopy = vi.fn().mockResolvedValue(undefined)) {
  render(<FigureToolbar disabled={false} onCopy={onCopy} />);
  return { onCopy, user: userEvent.setup() };
}

test('adds a new figure at the end', async () => {
  const { onCopy, user } = renderToolbar();
  await user.click(screen.getByRole('button', { name: 'New figure' }));
  expect(onCopy).toHaveBeenCalledWith('end');
});

test('duplicates the figure right after it', async () => {
  const { onCopy, user } = renderToolbar();
  await user.click(screen.getByRole('button', { name: 'Duplicate' }));
  expect(onCopy).toHaveBeenCalledWith('after');
});

test('says when the figure cannot be added', async () => {
  const { user } = renderToolbar(vi.fn().mockRejectedValue(new Error('POST figure answered 500')));
  await user.click(screen.getByRole('button', { name: 'New figure' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not add the figure');
});

test('turns the tools off while the dance is loading', () => {
  render(<FigureToolbar disabled onCopy={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Duplicate' })).toBeDisabled();
});
