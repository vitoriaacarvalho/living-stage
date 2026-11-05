import { expect, test } from 'vitest';
import { greeting, todayLine } from './greeting.ts';

const at = (hour: number, minute = 0) => new Date(2026, 10, 5, hour, minute);

test('writes the weekday, day and month', () => {
  expect(todayLine(at(10))).toBe('Thursday, 5 November');
});

test('says good morning before noon', () => {
  expect(greeting(at(11, 59), 'Marina')).toBe('Good morning, Marina');
});

test('says good afternoon from noon', () => {
  expect(greeting(at(12), 'Marina')).toBe('Good afternoon, Marina');
});

test('says good evening from six', () => {
  expect(greeting(at(18), 'Marina')).toBe('Good evening, Marina');
});

test('says good morning just after midnight', () => {
  expect(greeting(at(0, 5), 'Marina')).toBe('Good morning, Marina');
});

test('greets by the first name only', () => {
  expect(greeting(at(10), 'Marina Souto')).toBe('Good morning, Marina');
});

test('greets without a name when there is none', () => {
  expect(greeting(at(10), '  ')).toBe('Good morning');
});
