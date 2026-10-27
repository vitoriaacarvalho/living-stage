import { describe, expect, test } from 'vitest';
import {
  DANCER_COLOR_COUNT,
  DANCER_NAME_MAX_LENGTH,
  isDancerColor,
  parseDancerInput,
  parseDancerName,
} from './dancer.ts';

describe('parseDancerName', () => {
  test('accepts a name', () => {
    expect(parseDancerName('Júlia Castro')).toBe('Júlia Castro');
  });

  test('trims surrounding spaces', () => {
    expect(parseDancerName('  Júlia  ')).toBe('Júlia');
  });

  test('rejects a name of only spaces', () => {
    expect(parseDancerName('   ')).toBeNull();
  });

  test('accepts a name at the maximum length', () => {
    const name = 'a'.repeat(DANCER_NAME_MAX_LENGTH);
    expect(parseDancerName(name)).toBe(name);
  });

  test('rejects a name over the maximum length', () => {
    expect(parseDancerName('a'.repeat(DANCER_NAME_MAX_LENGTH + 1))).toBeNull();
  });

  test('rejects a value that is not a string', () => {
    expect(parseDancerName(42)).toBeNull();
  });
});

describe('isDancerColor', () => {
  test('accepts the first color', () => {
    expect(isDancerColor(1)).toBe(true);
  });

  test('accepts the last color', () => {
    expect(isDancerColor(DANCER_COLOR_COUNT)).toBe(true);
  });

  test('rejects zero', () => {
    expect(isDancerColor(0)).toBe(false);
  });

  test('rejects a number past the palette', () => {
    expect(isDancerColor(DANCER_COLOR_COUNT + 1)).toBe(false);
  });

  test('rejects a fraction', () => {
    expect(isDancerColor(1.5)).toBe(false);
  });

  test('rejects a number written as a string', () => {
    expect(isDancerColor('3')).toBe(false);
  });
});

describe('parseDancerInput', () => {
  test('accepts a name and a color', () => {
    expect(parseDancerInput({ name: ' Júlia ', color: 8 })).toEqual({ name: 'Júlia', color: 8 });
  });

  test('accepts a null color', () => {
    expect(parseDancerInput({ name: 'Júlia', color: null })).toEqual({
      name: 'Júlia',
      color: null,
    });
  });

  test('treats a missing color as none', () => {
    expect(parseDancerInput({ name: 'Júlia' })).toEqual({ name: 'Júlia', color: null });
  });

  test('rejects a blank name', () => {
    expect(parseDancerInput({ name: '', color: 1 })).toBeNull();
  });

  test('rejects a color outside the palette', () => {
    expect(parseDancerInput({ name: 'Júlia', color: 13 })).toBeNull();
  });

  test('rejects a body that is not an object', () => {
    expect(parseDancerInput(undefined)).toBeNull();
  });
});
