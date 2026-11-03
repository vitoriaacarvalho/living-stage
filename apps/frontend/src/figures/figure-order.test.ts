import { expect, test } from 'vitest';
import { droppedOrder } from './figure-order.ts';

const ids = ['figure-1', 'figure-2', 'figure-3'];

test('moves a figure dropped on an earlier one into its place', () => {
  expect(droppedOrder(ids, 'figure-3', 'figure-1')).toEqual(['figure-3', 'figure-1', 'figure-2']);
});

test('moves a figure dropped on a later one into its place', () => {
  expect(droppedOrder(ids, 'figure-1', 'figure-3')).toEqual(['figure-2', 'figure-3', 'figure-1']);
});

test('changes nothing when a figure is dropped on its own place', () => {
  expect(droppedOrder(ids, 'figure-2', 'figure-2')).toBeNull();
});

test('changes nothing when a figure is dropped outside the strip', () => {
  expect(droppedOrder(ids, 'figure-2', null)).toBeNull();
});
