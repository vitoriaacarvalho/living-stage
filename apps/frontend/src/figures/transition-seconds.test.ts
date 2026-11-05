import { expect, test } from 'vitest';
import { parseTransitionSeconds, transitionSeconds } from './transition-seconds.ts';

test('shows whole seconds without a decimal', () => {
  expect(transitionSeconds(4000)).toBe('4');
});

test('shows a half second', () => {
  expect(transitionSeconds(4500)).toBe('4.5');
});

test('reads whole seconds', () => {
  expect(parseTransitionSeconds('6')).toBe(6000);
});

test('reads a half second', () => {
  expect(parseTransitionSeconds('6.5')).toBe(6500);
});

test('reads a half second written with a comma', () => {
  expect(parseTransitionSeconds('6,5')).toBe(6500);
});

test('ignores spaces around the number', () => {
  expect(parseTransitionSeconds(' 6 ')).toBe(6000);
});

test('reads the shortest time', () => {
  expect(parseTransitionSeconds('1')).toBe(1000);
});

test('reads the longest time', () => {
  expect(parseTransitionSeconds('30')).toBe(30_000);
});

test('rejects a time under one second', () => {
  expect(parseTransitionSeconds('0.5')).toBeNull();
});

test('rejects a time over thirty seconds', () => {
  expect(parseTransitionSeconds('30.5')).toBeNull();
});

test('rejects a time between half seconds', () => {
  expect(parseTransitionSeconds('4.2')).toBeNull();
});

test('rejects an empty field', () => {
  expect(parseTransitionSeconds('')).toBeNull();
});

test('rejects words', () => {
  expect(parseTransitionSeconds('four')).toBeNull();
});

test('rejects a negative time', () => {
  expect(parseTransitionSeconds('-4')).toBeNull();
});
