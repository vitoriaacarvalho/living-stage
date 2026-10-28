import { describe, expect, test } from 'vitest';
import {
  DANCE_TITLE_MAX_LENGTH,
  parseDanceInput,
  parseDanceTitle,
  parseDanceUpdate,
} from './dance.ts';

describe('parseDanceTitle', () => {
  test('accepts a title', () => {
    expect(parseDanceTitle('Kitri variation')).toBe('Kitri variation');
  });

  test('trims surrounding spaces', () => {
    expect(parseDanceTitle('  Kitri variation  ')).toBe('Kitri variation');
  });

  test('rejects a title of only spaces', () => {
    expect(parseDanceTitle('   ')).toBeNull();
  });

  test('accepts a title at the maximum length', () => {
    const title = 'a'.repeat(DANCE_TITLE_MAX_LENGTH);
    expect(parseDanceTitle(title)).toBe(title);
  });

  test('rejects a title over the maximum length', () => {
    expect(parseDanceTitle('a'.repeat(DANCE_TITLE_MAX_LENGTH + 1))).toBeNull();
  });

  test('rejects a value that is not a string', () => {
    expect(parseDanceTitle(42)).toBeNull();
  });
});

describe('parseDanceInput', () => {
  test('accepts a title', () => {
    expect(parseDanceInput({ title: ' Kitri variation ' })).toEqual({ title: 'Kitri variation' });
  });

  test('rejects a missing title', () => {
    expect(parseDanceInput({})).toBeNull();
  });

  test('rejects a body that is not an object', () => {
    expect(parseDanceInput(undefined)).toBeNull();
  });
});

describe('parseDanceUpdate', () => {
  test('accepts a title alone', () => {
    expect(parseDanceUpdate({ title: ' Kitri variation ' })).toEqual({ title: 'Kitri variation' });
  });

  test('accepts showGuides alone', () => {
    expect(parseDanceUpdate({ showGuides: false })).toEqual({ showGuides: false });
  });

  test('accepts a title and showGuides together', () => {
    expect(parseDanceUpdate({ title: 'Kitri', showGuides: true })).toEqual({
      title: 'Kitri',
      showGuides: true,
    });
  });

  test('rejects a blank title', () => {
    expect(parseDanceUpdate({ title: ' ', showGuides: true })).toBeNull();
  });

  test('rejects a showGuides that is not a boolean', () => {
    expect(parseDanceUpdate({ showGuides: 'false' })).toBeNull();
  });

  test('rejects a body with no field to change', () => {
    expect(parseDanceUpdate({})).toBeNull();
  });

  test('ignores unknown fields', () => {
    expect(parseDanceUpdate({ showGuides: true, schoolId: 'school-2' })).toEqual({
      showGuides: true,
    });
  });

  test('rejects a body that is not an object', () => {
    expect(parseDanceUpdate(null)).toBeNull();
  });
});
