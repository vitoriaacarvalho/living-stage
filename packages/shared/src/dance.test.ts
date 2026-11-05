import { describe, expect, test } from 'vitest';
import {
  DANCE_TITLE_MAX_LENGTH,
  copyTitle,
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

describe('copyTitle', () => {
  test('adds (copy) to the title', () => {
    expect(copyTitle('Kitri variation')).toBe('Kitri variation (copy)');
  });

  test('adds another (copy) to the title of a copy', () => {
    expect(copyTitle('Kitri variation (copy)')).toBe('Kitri variation (copy) (copy)');
  });

  test('keeps a title that just fits whole', () => {
    const title = 'a'.repeat(DANCE_TITLE_MAX_LENGTH - ' (copy)'.length);
    expect(copyTitle(title)).toBe(`${title} (copy)`);
  });

  test('cuts a long title so the copy fits the maximum length', () => {
    expect(copyTitle('a'.repeat(DANCE_TITLE_MAX_LENGTH))).toHaveLength(DANCE_TITLE_MAX_LENGTH);
  });

  test('drops the spaces left at the cut', () => {
    const title = `${'a'.repeat(DANCE_TITLE_MAX_LENGTH - ' (copy)'.length - 1)} b`;
    expect(copyTitle(title)).toBe(`${'a'.repeat(DANCE_TITLE_MAX_LENGTH - 8)} (copy)`);
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

  test('accepts a label mode', () => {
    expect(parseDanceUpdate({ labelMode: 'both' })).toEqual({ labelMode: 'both' });
  });

  test('rejects an unknown label mode', () => {
    expect(parseDanceUpdate({ labelMode: 'none' })).toBeNull();
  });

  test('accepts a color mode', () => {
    expect(parseDanceUpdate({ colorMode: 'role' })).toEqual({ colorMode: 'role' });
  });

  test('rejects an unknown color mode', () => {
    expect(parseDanceUpdate({ colorMode: 'costume' })).toBeNull();
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
