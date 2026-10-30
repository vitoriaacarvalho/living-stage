import { expect, test } from 'vitest';
import { canMove, movedOrder } from './figure-order.ts';

const figures = ['figure-1', 'figure-2', 'figure-3'].map((id, order) => ({
  id,
  order,
  name: null,
  positions: [],
}));

test('moves a figure one place earlier', () => {
  expect(movedOrder(figures, 'figure-2', -1)).toEqual(['figure-2', 'figure-1', 'figure-3']);
});

test('moves a figure one place later', () => {
  expect(movedOrder(figures, 'figure-2', 1)).toEqual(['figure-1', 'figure-3', 'figure-2']);
});

test('keeps the order when the first figure cannot move earlier', () => {
  expect(movedOrder(figures, 'figure-1', -1)).toEqual(['figure-1', 'figure-2', 'figure-3']);
});

test('lets the first figure move later', () => {
  expect(canMove(figures, 'figure-1', 1)).toBe(true);
});

test('keeps the first figure from moving earlier', () => {
  expect(canMove(figures, 'figure-1', -1)).toBe(false);
});

test('keeps the last figure from moving later', () => {
  expect(canMove(figures, 'figure-3', 1)).toBe(false);
});
