import { describe, expect, test } from 'vitest';
import { parseMoment } from './moment-text.ts';

describe('parseMoment', () => {
  test('reads minutes and seconds', () => {
    expect(parseMoment('3:40')).toBe(220_000);
  });

  test('reads the start of the song', () => {
    expect(parseMoment('0:00')).toBe(0);
  });

  test('ignores spaces around it', () => {
    expect(parseMoment(' 0:58 ')).toBe(58_000);
  });

  test('takes no seconds past 59', () => {
    expect(parseMoment('1:60')).toBeNull();
  });

  test('takes no plain number', () => {
    expect(parseMoment('58')).toBeNull();
  });

  test('takes nothing blank', () => {
    expect(parseMoment('')).toBeNull();
  });
});
