import { expect, test } from 'vitest';
import { actLabel } from './act-label.ts';

test('numbers an unnamed act by its place', () => {
  expect(actLabel({ name: null }, 0)).toBe('Act 1');
});

test('adds the name after the number', () => {
  expect(actLabel({ name: 'Classics' }, 1)).toBe('Act 2 · Classics');
});
