import type { CastMember } from '@living-stage/shared';
import { expect, test } from 'vitest';
import { castMemberColor } from './cast-color.ts';

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
