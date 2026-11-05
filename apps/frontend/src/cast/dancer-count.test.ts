import { expect, test } from 'vitest';
import { dancerCount } from './dancer-count.ts';

test('counts no dancers', () => {
  expect(dancerCount(0)).toBe('0 dancers');
});

test('counts one dancer', () => {
  expect(dancerCount(1)).toBe('1 dancer');
});

test('counts several dancers', () => {
  expect(dancerCount(40)).toBe('40 dancers');
});
