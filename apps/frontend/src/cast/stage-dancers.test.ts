import type { CastMember, ColorMode, LabelMode } from '@living-stage/shared';
import { expect, test } from 'vitest';
import { stageDancers, type StageView } from './stage-dancers.ts';

const clara: CastMember = {
  id: 'cast-1',
  dancer: { id: 'dancer-1', name: 'Clara', color: 3 },
  role: 'Kitri',
};
const atCenter = { castMemberId: 'cast-1', x: 0.5, y: 0.5 };
const byName: StageView = { labelMode: 'name', colorMode: 'dancer' };

function labelsOf(changes: Partial<CastMember>, labelMode: LabelMode) {
  const dancers = stageDancers([{ ...clara, ...changes }], [atCenter], { ...byName, labelMode });
  return dancers.map(({ label, role }) => ({ label, role }));
}

test('puts each cast member at her position', () => {
  expect(stageDancers([clara], [atCenter], byName)).toEqual([
    {
      id: 'cast-1',
      dancerId: 'dancer-1',
      label: 'Clara',
      role: null,
      color: 3,
      x: 0.5,
      y: 0.5,
      open: false,
    },
  ]);
});

test('shows a removed dancer as an open spot', () => {
  expect(stageDancers([{ ...clara, dancer: null }], [atCenter], byName)).toEqual([
    {
      id: 'cast-1',
      dancerId: null,
      label: 'Open spot',
      role: null,
      color: null,
      x: 0.5,
      y: 0.5,
      open: true,
    },
  ]);
});

test('leaves out a cast member with no position', () => {
  expect(stageDancers([clara], [], byName)).toEqual([]);
});

test('labels a dancer with her role in role mode', () => {
  expect(labelsOf({}, 'role')).toEqual([{ label: 'Kitri', role: null }]);
});

test('labels a dancer with no role by her name in role mode', () => {
  expect(labelsOf({ role: null }, 'role')).toEqual([{ label: 'Clara', role: null }]);
});

test('labels an open spot with its role in role mode', () => {
  expect(labelsOf({ dancer: null }, 'role')).toEqual([{ label: 'Kitri', role: null }]);
});

test('puts the role under the name in both mode', () => {
  expect(labelsOf({}, 'both')).toEqual([{ label: 'Clara', role: 'Kitri' }]);
});

test('shows only the name in both mode when there is no role', () => {
  expect(labelsOf({ role: null }, 'both')).toEqual([{ label: 'Clara', role: null }]);
});

function colorsOf(cast: CastMember[], colorMode: ColorMode) {
  const positions = cast.map(({ id }) => ({ ...atCenter, castMemberId: id }));
  return stageDancers(cast, positions, { ...byName, colorMode }).map(({ color }) => color);
}

test('colors each dancer by her own color in dancer mode', () => {
  expect(colorsOf([clara], 'dancer')).toEqual([3]);
});

test('colors dancers by role in role mode', () => {
  const bia = { id: 'cast-2', dancer: { id: 'dancer-2', name: 'Bia', color: 5 }, role: 'Basilio' };
  expect(colorsOf([clara, bia], 'role')).toEqual([1, 2]);
});
