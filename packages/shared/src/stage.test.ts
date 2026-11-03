import { describe, expect, test } from 'vitest';
import { SIDE_WING_DEPTH, STAGE_DEPTH_M, STAGE_WIDTH_M, stageToFloor } from './stage.ts';

describe('stageToFloor', () => {
  test('puts centre stage at the middle of the floor', () => {
    expect(stageToFloor({ x: 0.5, y: 0.5 })).toEqual({ x: 0, z: 0 });
  });

  test('puts the upstage left corner at the far left of the floor', () => {
    expect(stageToFloor({ x: 0, y: 0 })).toEqual({ x: -STAGE_WIDTH_M / 2, z: -STAGE_DEPTH_M / 2 });
  });

  test('puts the downstage right corner nearest the audience', () => {
    expect(stageToFloor({ x: 1, y: 1 })).toEqual({ x: STAGE_WIDTH_M / 2, z: STAGE_DEPTH_M / 2 });
  });

  test('puts a dancer in the left wing beyond the floor edge', () => {
    expect(stageToFloor({ x: -SIDE_WING_DEPTH / 2, y: 0.5 }).x).toBeLessThan(-STAGE_WIDTH_M / 2);
  });
});
