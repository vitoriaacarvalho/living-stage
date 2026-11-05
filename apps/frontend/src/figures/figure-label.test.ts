import { expect, test } from 'vitest';
import { figureLabel } from './figure-label.ts';

const figure = { id: 'figure-1', order: 0, name: null, transitionMs: 4000, positions: [] };

test('numbers an unnamed figure by its place', () => {
  expect(figureLabel(figure, 2)).toBe('Figure 3');
});

test('shows a named figure by its name', () => {
  expect(figureLabel({ ...figure, name: 'Entrance' }, 2)).toBe('Entrance');
});
