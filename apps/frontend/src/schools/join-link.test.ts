import { describe, expect, test } from 'vitest';
import { inviteLink, readJoinCode } from './join-link.ts';

describe('inviteLink', () => {
  test('puts the code in a join path on the given origin', () => {
    expect(inviteLink('https://livingstage.app', 'ABCD2345')).toBe(
      'https://livingstage.app/join/ABCD2345',
    );
  });
});

describe('readJoinCode', () => {
  test('reads the code from a join path', () => {
    expect(readJoinCode('/join/ABCD2345')).toBe('ABCD2345');
  });

  test('accepts a trailing slash', () => {
    expect(readJoinCode('/join/ABCD2345/')).toBe('ABCD2345');
  });

  test('returns null on another path', () => {
    expect(readJoinCode('/')).toBeNull();
  });

  test('returns null for a join path without a code', () => {
    expect(readJoinCode('/join/')).toBeNull();
  });
});
