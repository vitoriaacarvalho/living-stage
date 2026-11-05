import { expect, test } from 'vitest';
import type { CastMember } from './cast.ts';
import { dancePreview } from './dance-preview.ts';

const clara: CastMember = {
  id: 'cast-1',
  dancer: { id: 'dancer-1', name: 'Clara', color: 3 },
  role: 'Kitri',
};
const bia: CastMember = {
  id: 'cast-2',
  dancer: { id: 'dancer-2', name: 'Bia', color: 5 },
  role: null,
};
const open: CastMember = { id: 'cast-3', dancer: null, role: 'Kitri' };

const spots = [
  { castMemberId: 'cast-1', x: 0.25, y: 0.5 },
  { castMemberId: 'cast-2', x: 0.75, y: 0.5 },
];

test('gives no spots for an empty figure', () => {
  expect(dancePreview([clara], [], 'dancer')).toEqual([]);
});

test('keeps each spot where the dancer stands', () => {
  expect(dancePreview([clara, bia], spots, 'dancer').map(({ x, y }) => [x, y])).toEqual([
    [0.25, 0.5],
    [0.75, 0.5],
  ]);
});

test('colors each spot by the dancer when coloring by dancer', () => {
  expect(dancePreview([clara, bia], spots, 'dancer').map(({ color }) => color)).toEqual([3, 5]);
});

test('colors each spot by the role when coloring by role', () => {
  expect(dancePreview([clara, bia], spots, 'role').map(({ color }) => color)).toEqual([1, 12]);
});

test('marks an open spot', () => {
  const [spot] = dancePreview([open], [{ castMemberId: 'cast-3', x: 0.5, y: 0.5 }], 'dancer');
  expect(spot).toEqual({ x: 0.5, y: 0.5, color: null, open: true });
});

test('marks a cast dancer as not open', () => {
  expect(dancePreview([clara], spots, 'dancer')[0]!.open).toBe(false);
});

test('leaves out a spot of someone no longer cast', () => {
  expect(dancePreview([clara], spots, 'dancer')).toHaveLength(1);
});
