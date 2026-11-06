import type { Figure } from '@living-stage/shared';
import { expect, test } from 'vitest';
import { selectedPaths } from './selected-paths.ts';

const figure = (order: number, x: number): Figure => ({
  id: `figure-${order}`,
  order,
  name: null,
  transitionMs: 4000,
  positions: [
    { castMemberId: 'cast-1', x, y: 0.5 },
    { castMemberId: 'cast-2', x, y: 0.8 },
  ],
  paths: [],
});

const bend = [{ along: 0.5, side: 0.2 }];
const first = figure(0, 0.2);
const second = {
  ...figure(1, 0.8),
  paths: [{ castMemberId: 'cast-1', points: bend, around: null }],
};
const figures = [first, second];

test('starts a selected dancer from her spot in the figure before', () => {
  expect(selectedPaths(figures, second, ['cast-2'])).toEqual([
    { id: 'cast-2', from: { x: 0.2, y: 0.8 }, points: [] },
  ]);
});

test('carries the bend of the path into this figure', () => {
  expect(selectedPaths(figures, second, ['cast-1'])[0]?.points).toEqual(bend);
});

test('gives a path for each selected dancer', () => {
  expect(selectedPaths(figures, second, ['cast-1', 'cast-2'])).toHaveLength(2);
});

test('gives no path when nobody is selected', () => {
  expect(selectedPaths(figures, second, [])).toEqual([]);
});

test('gives no path into the first figure', () => {
  expect(selectedPaths(figures, first, ['cast-1'])).toEqual([]);
});

test('gives no path to a dancer with no spot in the figure before', () => {
  const late = {
    ...second,
    positions: [...second.positions, { castMemberId: 'cast-3', x: 0.5, y: 0.5 }],
  };
  expect(selectedPaths([first, late], late, ['cast-3'])).toEqual([]);
});
