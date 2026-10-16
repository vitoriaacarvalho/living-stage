import { describe, expect, test } from 'vitest';
import { formatInviteCode, parseInviteCode } from './invite.ts';

describe('parseInviteCode', () => {
  test('accepts a code', () => {
    expect(parseInviteCode('ABCD2345')).toBe('ABCD2345');
  });

  test('accepts a code in lower case', () => {
    expect(parseInviteCode('abcd2345')).toBe('ABCD2345');
  });

  test('accepts a code as it is displayed, with a dash', () => {
    expect(parseInviteCode('ABCD-2345')).toBe('ABCD2345');
  });

  test('ignores spaces', () => {
    expect(parseInviteCode(' ABCD 2345 ')).toBe('ABCD2345');
  });

  test('rejects a code one character short', () => {
    expect(parseInviteCode('ABCD234')).toBeNull();
  });

  test('rejects a code one character long', () => {
    expect(parseInviteCode('ABCD23456')).toBeNull();
  });

  test('rejects characters that look alike', () => {
    expect(parseInviteCode('ABCD2O45')).toBeNull();
  });

  test('rejects an empty value', () => {
    expect(parseInviteCode('')).toBeNull();
  });

  test('rejects a value that is not a string', () => {
    expect(parseInviteCode(12345678)).toBeNull();
  });
});

describe('formatInviteCode', () => {
  test('splits the code in two halves', () => {
    expect(formatInviteCode('ABCD2345')).toBe('ABCD-2345');
  });
});
