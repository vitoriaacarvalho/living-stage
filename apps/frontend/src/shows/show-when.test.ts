import { expect, test } from 'vitest';
import { localDay, showCounts, showWhen } from './show-when.ts';

test('writes the day of a show', () => {
  expect(showWhen({ date: '2026-12-12', time: null })).toBe('12 Dec 2026');
});

test('adds the time when there is one', () => {
  expect(showWhen({ date: '2026-12-12', time: '19:00' })).toBe('12 Dec 2026, 19:00');
});

test('keeps the first of the month whatever the time zone', () => {
  expect(showWhen({ date: '2027-01-01', time: null })).toBe('1 Jan 2027');
});

test("writes the teacher's own day", () => {
  expect(localDay(new Date(2026, 10, 5, 23, 30))).toBe('2026-11-05');
});

test('pads single-digit months and days', () => {
  expect(localDay(new Date(2027, 0, 9, 8))).toBe('2027-01-09');
});

test('counts acts and dances', () => {
  expect(showCounts({ actCount: 2, danceCount: 10 })).toBe('2 acts · 10 dances');
});

test('counts one act and one dance', () => {
  expect(showCounts({ actCount: 1, danceCount: 1 })).toBe('1 act · 1 dance');
});

test('counts a show with no dances', () => {
  expect(showCounts({ actCount: 1, danceCount: 0 })).toBe('1 act · 0 dances');
});
