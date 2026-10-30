import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { FigureStrip } from './FigureStrip.tsx';

const figures = [
  { id: 'figure-1', order: 0, name: null, positions: [] },
  { id: 'figure-2', order: 1, name: 'Entrance', positions: [] },
];

function chips() {
  return within(screen.getByRole('list', { name: 'Figures' })).getAllByRole('button');
}

test('shows the figures in order', () => {
  render(<FigureStrip figures={figures} selectedId="figure-1" onSelect={() => {}} />);
  expect(chips().map((chip) => chip.textContent)).toEqual(['Figure 1', 'Entrance']);
});

test('marks the selected figure', () => {
  render(<FigureStrip figures={figures} selectedId="figure-2" onSelect={() => {}} />);
  expect(screen.getByRole('button', { name: 'Entrance' })).toHaveAttribute('aria-current', 'true');
});

test('selects a figure when tapped', async () => {
  const onSelect = vi.fn();
  render(<FigureStrip figures={figures} selectedId="figure-1" onSelect={onSelect} />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Entrance' }));
  expect(onSelect).toHaveBeenCalledWith('figure-2');
});
