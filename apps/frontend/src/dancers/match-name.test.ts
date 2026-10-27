import { describe, expect, test } from 'vitest';
import { byName, matchesName } from './match-name.ts';

describe('matchesName', () => {
  test('matches part of the name', () => {
    expect(matchesName('Júlia Castro', 'cas')).toBe(true);
  });

  test('ignores case', () => {
    expect(matchesName('Júlia Castro', 'CASTRO')).toBe(true);
  });

  test('ignores accents in the query', () => {
    expect(matchesName('Julia', 'Júlia')).toBe(true);
  });

  test('ignores accents in the name', () => {
    expect(matchesName('Júlia', 'julia')).toBe(true);
  });

  test('ignores spaces around the query', () => {
    expect(matchesName('Bia', ' bia ')).toBe(true);
  });

  test('matches every name when the query is blank', () => {
    expect(matchesName('Bia', '  ')).toBe(true);
  });

  test('does not match a different name', () => {
    expect(matchesName('Bia', 'Carla')).toBe(false);
  });
});

describe('byName', () => {
  test('puts an accented name with its plain letter', () => {
    const names = ['Lara', 'Ágata', 'Bia'].map((name) => ({ name }));
    expect(names.sort(byName).map(({ name }) => name)).toEqual(['Ágata', 'Bia', 'Lara']);
  });

  test('ignores case', () => {
    const names = ['bia', 'Ana', 'Carla'].map((name) => ({ name }));
    expect(names.sort(byName).map(({ name }) => name)).toEqual(['Ana', 'bia', 'Carla']);
  });
});
