import { describe, expect, test } from 'vitest';
import { crowdedSpacingM, metresApart } from './spacing.ts';
import { STAGE_DEPTH_M, STAGE_WIDTH_M } from './stage.ts';

const at = (xM: number, yM: number) => ({ x: xM / STAGE_WIDTH_M, y: yM / STAGE_DEPTH_M });
const row = (count: number, gapM: number) =>
  Array.from({ length: count }, (_, index) => at(1 + index * gapM, 4));

describe('metresApart', () => {
  test('measures across and deep in metres', () => {
    expect(metresApart(at(1, 1), at(4, 5))).toBeCloseTo(5);
  });
});

describe('crowdedSpacingM', () => {
  test('gives the gap of an evenly spaced row', () => {
    expect(crowdedSpacingM([row(6, 1.5)])).toBeCloseTo(1.5);
  });

  test('gives the gap between two dancers', () => {
    expect(crowdedSpacingM([[at(2, 2), at(5, 6)]])).toBeCloseTo(5);
  });

  test('takes the most crowded of several formations', () => {
    expect(crowdedSpacingM([row(6, 2), row(6, 0.8), row(6, 1.2)])).toBeCloseTo(0.8);
  });

  test('is not set by one pair stacked on purpose in a large cast', () => {
    const stacked = [...row(10, 1), at(1, 4.1)];
    expect(crowdedSpacingM([stacked])).toBeCloseTo(1);
  });

  test('follows a formation where most dancers are close', () => {
    const tight = [...row(8, 0.5), at(10, 1), at(10, 7)];
    expect(crowdedSpacingM([tight])).toBeCloseTo(0.5);
  });

  test('skips a formation with a single dancer', () => {
    expect(crowdedSpacingM([[at(6, 4)], row(3, 2)])).toBeCloseTo(2);
  });

  test('gives null when no formation has two dancers', () => {
    expect(crowdedSpacingM([[at(6, 4)], []])).toBeNull();
  });

  test('gives null with no formations', () => {
    expect(crowdedSpacingM([])).toBeNull();
  });
});
