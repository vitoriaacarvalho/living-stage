import { expect, test } from 'vitest';
import { clockTime } from './clock-time.ts';

test('shows the start as zero', () => {
  expect(clockTime(0)).toBe('00:00');
});

test('pads seconds to two digits', () => {
  expect(clockTime(4000)).toBe('00:04');
});

test('rounds a part second down', () => {
  expect(clockTime(3999)).toBe('00:03');
});

test('turns sixty seconds into a minute', () => {
  expect(clockTime(60_000)).toBe('01:00');
});

test('keeps the seconds past a minute', () => {
  expect(clockTime(220_000)).toBe('03:40');
});

test('shows a negative time as zero', () => {
  expect(clockTime(-500)).toBe('00:00');
});
