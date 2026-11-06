import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { FigureToolbar } from './FigureToolbar.tsx';

const noCircle = { available: false, picking: false, onToggle: vi.fn() };

function renderToolbar(onCopy = vi.fn().mockResolvedValue(undefined)) {
  render(<FigureToolbar disabled={false} onCopy={onCopy} circle={noCircle} />);
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
  render(<FigureToolbar disabled onCopy={vi.fn()} circle={noCircle} />);
  expect(screen.getByRole('button', { name: 'Duplicate' })).toBeDisabled();
});

test('offers Circle around only when a dancer can circle', () => {
  renderToolbar();
  expect(screen.getByRole('button', { name: 'Circle around' })).toBeDisabled();
});

test('starts picking the dancer to circle around', async () => {
  const circle = { available: true, picking: false, onToggle: vi.fn() };
  render(<FigureToolbar disabled={false} onCopy={vi.fn()} circle={circle} />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Circle around' }));
  expect(circle.onToggle).toHaveBeenCalled();
});

test('shows Circle around pressed while picking', () => {
  const circle = { available: true, picking: true, onToggle: vi.fn() };
  render(<FigureToolbar disabled={false} onCopy={vi.fn()} circle={circle} />);
  expect(screen.getByRole('button', { name: 'Circle around' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
