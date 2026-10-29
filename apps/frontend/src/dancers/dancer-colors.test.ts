import { expect, test } from 'vitest';
import { initialsInk } from './dancer-colors.ts';

test('writes initials in ink on a light dancer color', () => {
  expect(initialsInk(1)).toBe('var(--ink)');
});

test.each([5, 6, 8])('writes initials in white on dark dancer color %i', (color) => {
  expect(initialsInk(color)).toBe('var(--on-primary)');
});

test('writes initials in ink when the dancer has no color', () => {
  expect(initialsInk(null)).toBe('var(--ink)');
});
