import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { FigureStrip } from './FigureStrip.tsx';

const figures = [
  { id: 'figure-1', order: 0, name: null, transitionMs: 4000, positions: [], paths: [] },
  { id: 'figure-2', order: 1, name: 'Entrance', transitionMs: 4000, positions: [], paths: [] },
  { id: 'figure-3', order: 2, name: 'Finale', transitionMs: 4000, positions: [], paths: [] },
];

// jsdom lays nothing out, so each chip gets a place in a row for the keyboard drag.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const item = this.closest('li');
    const index = item ? [...item.parentElement!.children].indexOf(item) : 0;
    const left = index * 120;
    return {
      left,
      right: left + 100,
      top: 0,
      bottom: 44,
      width: 100,
      height: 44,
      x: left,
      y: 0,
    } as DOMRect;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const selected = { id: 'figure-1', editable: true };

function renderStrip(onReorder = vi.fn().mockResolvedValue(undefined), onSelect = vi.fn()) {
  render(
    <FigureStrip figures={figures} active={selected} onSelect={onSelect} onReorder={onReorder} />,
  );
  return { onReorder, onSelect, user: userEvent.setup() };
}

function chips() {
  return within(screen.getByRole('list', { name: 'Figures' })).getAllByRole('button');
}

test('shows the figures in order', () => {
  renderStrip();
  expect(chips().map((chip) => chip.textContent)).toEqual(['Figure 1', 'Entrance', 'Finale']);
});

test('marks the selected figure', () => {
  renderStrip();
  expect(chips()[0]).toHaveAttribute('aria-current', 'true');
});

test('shows the pencil on the selected figure', () => {
  renderStrip();
  expect(chips()[0]!.querySelector('svg')).not.toBeNull();
});

test('marks the figure being reached without the pencil', () => {
  render(
    <FigureStrip
      figures={figures}
      active={{ id: 'figure-2', editable: false }}
      onSelect={vi.fn()}
      onReorder={vi.fn()}
    />,
  );
  expect(chips()[1]!.querySelector('svg')).toBeNull();
});

test('selects a figure when tapped', async () => {
  const { onSelect, user } = renderStrip();
  await user.click(screen.getByRole('button', { name: 'Entrance' }));
  expect(onSelect).toHaveBeenCalledWith('figure-2');
});

test('selects a figure with Enter', async () => {
  const { onSelect, user } = renderStrip();
  screen.getByRole('button', { name: 'Entrance' }).focus();
  await user.keyboard('{Enter}');
  expect(onSelect).toHaveBeenCalledWith('figure-2');
});

test('moves a figure to a later place by keyboard', async () => {
  const { onReorder, user } = renderStrip();
  screen.getByRole('button', { name: /Figure 1/ }).focus();
  await user.keyboard(' {ArrowRight} ');
  expect(onReorder).toHaveBeenCalledWith(['figure-2', 'figure-1', 'figure-3']);
});

test('leaves the order alone when the move is cancelled', async () => {
  const { onReorder, user } = renderStrip();
  screen.getByRole('button', { name: /Figure 1/ }).focus();
  await user.keyboard(' {ArrowRight}{Escape}');
  expect(onReorder).not.toHaveBeenCalled();
});

test('says when the new order cannot be saved', async () => {
  const { user } = renderStrip(
    vi.fn().mockRejectedValue(new Error('PUT figure order answered 500')),
  );
  screen.getByRole('button', { name: /Figure 1/ }).focus();
  await user.keyboard(' {ArrowRight} ');
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not move the figure');
});
