import { describe, expect, test } from 'vitest';
import type { CastMember } from './cast.ts';
import { NO_ROLE_COLOR, castMemberColor, roleColor, roleColors } from './role-color.ts';

function castWithRoles(...roles: (string | null)[]): CastMember[] {
  return roles.map((role, index) => ({ id: `cast-${index}`, dancer: null, role }));
}

describe('roleColors', () => {
  test('gives each role the next color in the order roles first appear', () => {
    expect(roleColors(castWithRoles('Kitri', 'Basilio', 'Kitri'))).toEqual([
      { role: 'Kitri', color: 1 },
      { role: 'Basilio', color: 2 },
    ]);
  });

  test('treats roles that differ only in case as one, keeping the first spelling', () => {
    expect(roleColors(castWithRoles('Swan', 'swan'))).toEqual([{ role: 'Swan', color: 1 }]);
  });

  test('leaves out dancers with no role', () => {
    expect(roleColors(castWithRoles(null, 'Kitri'))).toEqual([{ role: 'Kitri', color: 1 }]);
  });

  test('gives the eleventh role the last color before stone', () => {
    const roles = Array.from({ length: 11 }, (_, index) => `Role ${index + 1}`);
    expect(roleColors(castWithRoles(...roles)).at(-1)).toEqual({ role: 'Role 11', color: 11 });
  });

  test('starts over at the first color for the twelfth role', () => {
    const roles = Array.from({ length: 12 }, (_, index) => `Role ${index + 1}`);
    expect(roleColors(castWithRoles(...roles)).at(-1)).toEqual({ role: 'Role 12', color: 1 });
  });

  test('has no colors for an empty cast', () => {
    expect(roleColors([])).toEqual([]);
  });
});

describe('roleColor', () => {
  const colors = [{ role: 'Kitri', color: 1 }];

  test('finds the color of a role', () => {
    expect(roleColor(colors, 'Kitri')).toBe(1);
  });

  test('finds the color of a role written in another case', () => {
    expect(roleColor(colors, 'KITRI')).toBe(1);
  });

  test('gives stone to a dancer with no role', () => {
    expect(roleColor(colors, null)).toBe(NO_ROLE_COLOR);
  });

  test('gives stone to a role it does not know', () => {
    expect(roleColor(colors, 'Basilio')).toBe(NO_ROLE_COLOR);
  });
});

describe('castMemberColor', () => {
  const clara: CastMember = {
    id: 'cast-1',
    dancer: { id: 'dancer-1', name: 'Clara', color: 3 },
    role: 'Kitri',
  };
  const colors = [{ role: 'Kitri', color: 1 }];

  test('gives a dancer her own color when coloring by dancer', () => {
    expect(castMemberColor(clara, 'dancer', colors)).toBe(3);
  });

  test('gives a dancer her role color when coloring by role', () => {
    expect(castMemberColor(clara, 'role', colors)).toBe(1);
  });

  test('gives a dancer with no role stone when coloring by role', () => {
    expect(castMemberColor({ ...clara, role: null }, 'role', colors)).toBe(12);
  });

  test('gives an open spot no color when coloring by role', () => {
    expect(castMemberColor({ ...clara, dancer: null }, 'role', colors)).toBeNull();
  });
});
