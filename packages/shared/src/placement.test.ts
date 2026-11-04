import { describe, expect, test } from 'vitest';
import {
  ARROW_LARGE_STEP_M,
  ARROW_STEP_M,
  PLAN_BOUNDS,
  SNAP_DISTANCE_M,
  arrowStep,
  isInsidePlan,
  moveGroup,
  parsePositionsUpdate,
  snapToGuides,
} from './placement.ts';
import { SIDE_WING_DEPTH, STAGE_DEPTH_M, STAGE_WIDTH_M, UPSTAGE_WING_DEPTH } from './stage.ts';

const snapX = SNAP_DISTANCE_M / STAGE_WIDTH_M;
const snapY = SNAP_DISTANCE_M / STAGE_DEPTH_M;

describe('isInsidePlan', () => {
  test('accepts centre stage', () => {
    expect(isInsidePlan({ x: 0.5, y: 0.5 })).toBe(true);
  });

  test('accepts the far corner of the left wing', () => {
    expect(isInsidePlan({ x: -SIDE_WING_DEPTH, y: -UPSTAGE_WING_DEPTH })).toBe(true);
  });

  test('accepts the downstage edge of the right wing', () => {
    expect(isInsidePlan({ x: 1 + SIDE_WING_DEPTH, y: 1 })).toBe(true);
  });

  test('rejects a spot past the downstage edge', () => {
    expect(isInsidePlan({ x: 0.5, y: 1.001 })).toBe(false);
  });

  test('rejects a spot past the left wing', () => {
    expect(isInsidePlan({ x: -SIDE_WING_DEPTH - 0.001, y: 0.5 })).toBe(false);
  });

  test('rejects a spot behind the upstage wing', () => {
    expect(isInsidePlan({ x: 0.5, y: -UPSTAGE_WING_DEPTH - 0.001 })).toBe(false);
  });
});

describe('moveGroup', () => {
  const pair = [
    { castMemberId: 'a', x: 0.4, y: 0.5 },
    { castMemberId: 'b', x: 0.6, y: 0.7 },
  ];

  test('moves every dancer by the delta', () => {
    const moved = moveGroup(pair, { x: 0.1, y: -0.1 });
    expect(moved.map(({ x, y }) => [x, y])).toEqual([
      [expect.closeTo(0.5), expect.closeTo(0.4)],
      [expect.closeTo(0.7), expect.closeTo(0.6)],
    ]);
  });

  test('keeps the other fields of each dancer', () => {
    expect(moveGroup(pair, { x: 0, y: 0 }).map(({ castMemberId }) => castMemberId)).toEqual([
      'a',
      'b',
    ]);
  });

  test('stops the whole group when its front dancer reaches the downstage edge', () => {
    const moved = moveGroup(pair, { x: 0, y: 1 });
    expect(moved.map(({ y }) => y)).toEqual([expect.closeTo(0.8), 1]);
  });

  test('stops the whole group at the far side of the right wing', () => {
    const moved = moveGroup(pair, { x: 1, y: 0 });
    expect(moved.map(({ x }) => x)).toEqual([
      expect.closeTo(PLAN_BOUNDS.maxX - 0.2),
      PLAN_BOUNDS.maxX,
    ]);
  });

  test('stops the whole group at the far side of the left wing', () => {
    const moved = moveGroup(pair, { x: -1, y: 0 });
    expect(moved[0]!.x).toBe(PLAN_BOUNDS.minX);
  });

  test('stops the whole group at the back of the upstage wing', () => {
    const moved = moveGroup(pair, { x: 0, y: -1 });
    expect(moved[0]!.y).toBe(PLAN_BOUNDS.minY);
  });

  test('still slides along an edge the group is pressed against', () => {
    const moved = moveGroup(pair, { x: 0.1, y: 1 });
    expect(moved[0]!.x).toBeCloseTo(0.5);
  });

  test('keeps every moved dancer inside the plan', () => {
    const odd = [{ x: 0.1 + 0.2, y: 0.3 }];
    expect(isInsidePlan(moveGroup(odd, { x: 10, y: 10 })[0]!)).toBe(true);
  });

  test('moves a single dancer', () => {
    expect(moveGroup([{ x: 0.5, y: 0.5 }], { x: 0.25, y: 0 })).toEqual([{ x: 0.75, y: 0.5 }]);
  });
});

describe('snapToGuides', () => {
  test('snaps x onto the centre line within the snap distance', () => {
    expect(snapToGuides({ x: 0.5 + snapX * 0.9, y: 0.4 }).x).toBe(0.5);
  });

  test('snaps x onto a quarter line', () => {
    expect(snapToGuides({ x: 0.75 - snapX * 0.9, y: 0.4 }).x).toBe(0.75);
  });

  test('snaps y onto a quarter line', () => {
    expect(snapToGuides({ x: 0.4, y: 0.25 + snapY * 0.9 }).y).toBe(0.25);
  });

  test('snaps both axes at once onto a crossing', () => {
    expect(snapToGuides({ x: 0.51, y: 0.49 })).toEqual({ x: 0.5, y: 0.5 });
  });

  test('leaves x alone just past the snap distance', () => {
    const x = 0.5 + snapX * 1.1;
    expect(snapToGuides({ x, y: 0.4 }).x).toBe(x);
  });

  test('uses the depth in metres for y, not the width', () => {
    const y = 0.5 + snapX * 1.1;
    expect(snapToGuides({ x: 0.4, y }).y).toBe(0.5);
  });

  test('leaves a spot far from every guide alone', () => {
    expect(snapToGuides({ x: 0.4, y: 0.4 })).toEqual({ x: 0.4, y: 0.4 });
  });
});

describe('arrowStep', () => {
  test('moves left by the step across the width', () => {
    expect(arrowStep('ArrowLeft', ARROW_STEP_M)).toEqual({
      x: -ARROW_STEP_M / STAGE_WIDTH_M,
      y: 0,
    });
  });

  test('moves right by the step across the width', () => {
    expect(arrowStep('ArrowRight', ARROW_STEP_M)).toEqual({
      x: ARROW_STEP_M / STAGE_WIDTH_M,
      y: 0,
    });
  });

  test('moves up towards upstage by the step across the depth', () => {
    expect(arrowStep('ArrowUp', ARROW_STEP_M)).toEqual({ x: 0, y: -ARROW_STEP_M / STAGE_DEPTH_M });
  });

  test('moves down towards the audience by the step across the depth', () => {
    expect(arrowStep('ArrowDown', ARROW_STEP_M)).toEqual({ x: 0, y: ARROW_STEP_M / STAGE_DEPTH_M });
  });

  test('takes the large step when given it', () => {
    expect(arrowStep('ArrowRight', ARROW_LARGE_STEP_M)).toEqual({ x: 1 / STAGE_WIDTH_M, y: 0 });
  });

  test('ignores a key that is not an arrow', () => {
    expect(arrowStep('Enter', ARROW_STEP_M)).toBeNull();
  });
});

describe('parsePositionsUpdate', () => {
  const position = { castMemberId: 'cast-1', x: 0.5, y: 0.5 };

  test('accepts a list of positions', () => {
    expect(parsePositionsUpdate({ positions: [position] })).toEqual({ positions: [position] });
  });

  test('accepts a spot in the wing', () => {
    const wing = { ...position, x: -SIDE_WING_DEPTH };
    expect(parsePositionsUpdate({ positions: [wing] })).toEqual({ positions: [wing] });
  });

  test('drops unknown fields', () => {
    expect(parsePositionsUpdate({ positions: [{ ...position, figureId: 'f' }] })).toEqual({
      positions: [position],
    });
  });

  test('rejects an empty list', () => {
    expect(parsePositionsUpdate({ positions: [] })).toBeNull();
  });

  test('rejects positions that are not a list', () => {
    expect(parsePositionsUpdate({ positions: position })).toBeNull();
  });

  test('rejects a body that is not an object', () => {
    expect(parsePositionsUpdate('positions')).toBeNull();
  });

  test('rejects a position that is not an object', () => {
    expect(parsePositionsUpdate({ positions: [null] })).toBeNull();
  });

  test('rejects a missing cast member', () => {
    expect(parsePositionsUpdate({ positions: [{ x: 0.5, y: 0.5 }] })).toBeNull();
  });

  test('rejects an empty cast member id', () => {
    expect(parsePositionsUpdate({ positions: [{ ...position, castMemberId: '' }] })).toBeNull();
  });

  test('rejects a number sent as a string', () => {
    expect(parsePositionsUpdate({ positions: [{ ...position, x: '0.5' }] })).toBeNull();
  });

  test('rejects a coordinate that is not finite', () => {
    expect(parsePositionsUpdate({ positions: [{ ...position, y: Infinity }] })).toBeNull();
  });

  test('rejects a coordinate that is not a number', () => {
    expect(parsePositionsUpdate({ positions: [{ ...position, x: NaN }] })).toBeNull();
  });

  test('rejects a spot in the audience', () => {
    expect(parsePositionsUpdate({ positions: [{ ...position, y: 1.01 }] })).toBeNull();
  });

  test('rejects a cast member listed twice', () => {
    expect(parsePositionsUpdate({ positions: [position, { ...position, x: 0.2 }] })).toBeNull();
  });
});
