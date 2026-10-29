import { expect, test } from 'vitest';
import { stageDancers } from './stage-dancers.ts';

const clara = { id: 'cast-1', dancer: { id: 'dancer-1', name: 'Clara', color: 3 }, role: 'Kitri' };
const atCenter = { castMemberId: 'cast-1', x: 0.5, y: 0.5 };

test('puts each cast member at her position', () => {
  expect(stageDancers([clara], [atCenter])).toEqual([
    { id: 'cast-1', label: 'Clara', color: 3, x: 0.5, y: 0.5, open: false },
  ]);
});

test('shows a removed dancer as an open spot', () => {
  expect(stageDancers([{ ...clara, dancer: null }], [atCenter])).toEqual([
    { id: 'cast-1', label: 'Open spot', color: null, x: 0.5, y: 0.5, open: true },
  ]);
});

test('leaves out a cast member with no position', () => {
  expect(stageDancers([clara], [])).toEqual([]);
});
