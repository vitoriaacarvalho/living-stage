import { describe, expect, test } from 'vitest';
import {
  CAST_ROLE_MAX_LENGTH,
  parseCastMemberInput,
  parseCastMemberUpdate,
  parseCastRole,
} from './cast.ts';

describe('parseCastRole', () => {
  test('accepts a role', () => {
    expect(parseCastRole('Kitri')).toBe('Kitri');
  });

  test('trims surrounding spaces', () => {
    expect(parseCastRole('  Kitri  ')).toBe('Kitri');
  });

  test('turns a blank role into no role', () => {
    expect(parseCastRole('   ')).toBeNull();
  });

  test('accepts no role', () => {
    expect(parseCastRole(null)).toBeNull();
  });

  test('accepts a role at the maximum length', () => {
    const role = 'a'.repeat(CAST_ROLE_MAX_LENGTH);
    expect(parseCastRole(role)).toBe(role);
  });

  test('rejects a role over the maximum length', () => {
    expect(parseCastRole('a'.repeat(CAST_ROLE_MAX_LENGTH + 1))).toBeUndefined();
  });

  test('rejects a role that is not text', () => {
    expect(parseCastRole(3)).toBeUndefined();
  });
});

describe('parseCastMemberInput', () => {
  test('accepts a dancer with a role', () => {
    expect(parseCastMemberInput({ dancerId: 'dancer-1', role: 'Kitri' })).toEqual({
      dancerId: 'dancer-1',
      role: 'Kitri',
    });
  });

  test('defaults to no role', () => {
    expect(parseCastMemberInput({ dancerId: 'dancer-1' })).toEqual({
      dancerId: 'dancer-1',
      role: null,
    });
  });

  test('rejects a missing dancer', () => {
    expect(parseCastMemberInput({ role: 'Kitri' })).toBeNull();
  });

  test('rejects an empty dancer id', () => {
    expect(parseCastMemberInput({ dancerId: '' })).toBeNull();
  });

  test('rejects an invalid role', () => {
    expect(parseCastMemberInput({ dancerId: 'dancer-1', role: 3 })).toBeNull();
  });

  test('rejects a body that is not an object', () => {
    expect(parseCastMemberInput('dancer-1')).toBeNull();
  });
});

describe('parseCastMemberUpdate', () => {
  test('accepts a new role', () => {
    expect(parseCastMemberUpdate({ role: 'Dulcinea' })).toEqual({ role: 'Dulcinea' });
  });

  test('accepts clearing the role', () => {
    expect(parseCastMemberUpdate({ role: '' })).toEqual({ role: null });
  });

  test('rejects a missing role', () => {
    expect(parseCastMemberUpdate({})).toBeNull();
  });

  test('rejects a body that is not an object', () => {
    expect(parseCastMemberUpdate(null)).toBeNull();
  });
});
