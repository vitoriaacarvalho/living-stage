import { describe, expect, test } from 'vitest';
import { SCHOOL_NAME_MAX_LENGTH, parseSchoolName } from './school.ts';

describe('parseSchoolName', () => {
  test('accepts a name', () => {
    expect(parseSchoolName('Escola de Ballet Ana')).toBe('Escola de Ballet Ana');
  });

  test('trims surrounding spaces', () => {
    expect(parseSchoolName('  Escola  ')).toBe('Escola');
  });

  test('rejects an empty name', () => {
    expect(parseSchoolName('')).toBeNull();
  });

  test('rejects a name of only spaces', () => {
    expect(parseSchoolName('   ')).toBeNull();
  });

  test('accepts a name at the maximum length', () => {
    const name = 'a'.repeat(SCHOOL_NAME_MAX_LENGTH);
    expect(parseSchoolName(name)).toBe(name);
  });

  test('rejects a name over the maximum length', () => {
    expect(parseSchoolName('a'.repeat(SCHOOL_NAME_MAX_LENGTH + 1))).toBeNull();
  });

  test('measures the length after trimming', () => {
    const name = 'a'.repeat(SCHOOL_NAME_MAX_LENGTH);
    expect(parseSchoolName(` ${name} `)).toBe(name);
  });

  test('rejects a value that is not a string', () => {
    expect(parseSchoolName(42)).toBeNull();
  });

  test('rejects a missing value', () => {
    expect(parseSchoolName(undefined)).toBeNull();
  });
});
