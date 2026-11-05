import { describe, expect, test } from 'vitest';
import {
  FIGURE_NAME_MAX_LENGTH,
  nextWingSpot,
  parseFigureCopy,
  parseFigureName,
  parseFigureOrder,
  parseFigureUpdate,
  parseTransitionMs,
  TRANSITION_MAX_MS,
  TRANSITION_MIN_MS,
  TRANSITION_STEP_MS,
  WING_SPOTS,
} from './figure.ts';
import { SIDE_WING_DEPTH } from './stage.ts';

const wingX = -SIDE_WING_DEPTH / 2;
const spot = (index: number) => ({ x: wingX, y: (index + 0.5) / WING_SPOTS });

describe('nextWingSpot', () => {
  test('puts the first dancer at the top of the left wing', () => {
    expect(nextWingSpot([])).toEqual(spot(0));
  });

  test('puts the next dancer below the ones already waiting', () => {
    expect(nextWingSpot([spot(0), spot(1)])).toEqual(spot(2));
  });

  test('fills a spot left free by a dancer who moved', () => {
    expect(nextWingSpot([spot(0), spot(2)])).toEqual(spot(1));
  });

  test('ignores dancers standing on stage', () => {
    expect(nextWingSpot([{ x: 0.5, y: 0.05 }])).toEqual(spot(0));
  });

  test('uses the last spot when only it is free', () => {
    const taken = Array.from({ length: WING_SPOTS - 1 }, (_, index) => spot(index));
    expect(nextWingSpot(taken)).toEqual(spot(WING_SPOTS - 1));
  });

  test('starts sharing spots from the top once the wing is full', () => {
    const taken = Array.from({ length: WING_SPOTS }, (_, index) => spot(index));
    expect(nextWingSpot(taken)).toEqual(spot(0));
  });
});

describe('parseFigureCopy', () => {
  test('accepts a copy to the end', () => {
    expect(parseFigureCopy({ copyOf: 'figure-1', placement: 'end' })).toEqual({
      copyOf: 'figure-1',
      placement: 'end',
    });
  });

  test('accepts a copy right after the figure', () => {
    expect(parseFigureCopy({ copyOf: 'figure-1', placement: 'after' })).toEqual({
      copyOf: 'figure-1',
      placement: 'after',
    });
  });

  test('rejects a missing figure', () => {
    expect(parseFigureCopy({ placement: 'end' })).toBeNull();
  });

  test('rejects an empty figure id', () => {
    expect(parseFigureCopy({ copyOf: '', placement: 'end' })).toBeNull();
  });

  test('rejects an unknown placement', () => {
    expect(parseFigureCopy({ copyOf: 'figure-1', placement: 'before' })).toBeNull();
  });

  test('rejects a body that is not an object', () => {
    expect(parseFigureCopy('figure-1')).toBeNull();
  });
});

describe('parseFigureName', () => {
  test('trims surrounding spaces', () => {
    expect(parseFigureName('  Entrance  ')).toBe('Entrance');
  });

  test('turns a blank name into no name', () => {
    expect(parseFigureName('   ')).toBeNull();
  });

  test('accepts no name', () => {
    expect(parseFigureName(null)).toBeNull();
  });

  test('accepts a name at the maximum length', () => {
    const name = 'a'.repeat(FIGURE_NAME_MAX_LENGTH);
    expect(parseFigureName(name)).toBe(name);
  });

  test('rejects a name over the maximum length', () => {
    expect(parseFigureName('a'.repeat(FIGURE_NAME_MAX_LENGTH + 1))).toBeUndefined();
  });

  test('rejects a name that is not text', () => {
    expect(parseFigureName(3)).toBeUndefined();
  });
});

describe('parseFigureUpdate', () => {
  test('accepts a new name', () => {
    expect(parseFigureUpdate({ name: 'Entrance' })).toEqual({ name: 'Entrance' });
  });

  test('accepts clearing the name', () => {
    expect(parseFigureUpdate({ name: '' })).toEqual({ name: null });
  });

  test('rejects an empty body', () => {
    expect(parseFigureUpdate({})).toBeNull();
  });

  test('accepts a new time to arrive', () => {
    expect(parseFigureUpdate({ transitionMs: 6000 })).toEqual({ transitionMs: 6000 });
  });

  test('accepts a name and a time together', () => {
    expect(parseFigureUpdate({ name: 'Entrance', transitionMs: 6000 })).toEqual({
      name: 'Entrance',
      transitionMs: 6000,
    });
  });

  test('rejects a bad time even with a good name', () => {
    expect(parseFigureUpdate({ name: 'Entrance', transitionMs: 0 })).toBeNull();
  });

  test('rejects a bad name even with a good time', () => {
    expect(parseFigureUpdate({ name: 'a'.repeat(41), transitionMs: 6000 })).toBeNull();
  });
});

describe('parseTransitionMs', () => {
  test('accepts the shortest time', () => {
    expect(parseTransitionMs(TRANSITION_MIN_MS)).toBe(TRANSITION_MIN_MS);
  });

  test('accepts the longest time', () => {
    expect(parseTransitionMs(TRANSITION_MAX_MS)).toBe(TRANSITION_MAX_MS);
  });

  test('accepts a half second', () => {
    expect(parseTransitionMs(4500)).toBe(4500);
  });

  test('rejects a time under the shortest', () => {
    expect(parseTransitionMs(TRANSITION_MIN_MS - TRANSITION_STEP_MS)).toBeNull();
  });

  test('rejects a time over the longest', () => {
    expect(parseTransitionMs(TRANSITION_MAX_MS + TRANSITION_STEP_MS)).toBeNull();
  });

  test('rejects a time between half seconds', () => {
    expect(parseTransitionMs(4250)).toBeNull();
  });

  test('rejects a fraction of a millisecond', () => {
    expect(parseTransitionMs(4000.5)).toBeNull();
  });

  test('rejects a time sent as text', () => {
    expect(parseTransitionMs('4000')).toBeNull();
  });
});

describe('parseFigureOrder', () => {
  test('accepts a list of figure ids', () => {
    expect(parseFigureOrder({ figureIds: ['figure-2', 'figure-1'] })).toEqual({
      figureIds: ['figure-2', 'figure-1'],
    });
  });

  test('rejects an empty list', () => {
    expect(parseFigureOrder({ figureIds: [] })).toBeNull();
  });

  test('rejects a figure listed twice', () => {
    expect(parseFigureOrder({ figureIds: ['figure-1', 'figure-1'] })).toBeNull();
  });

  test('rejects an id that is not text', () => {
    expect(parseFigureOrder({ figureIds: ['figure-1', 2] })).toBeNull();
  });

  test('rejects a body with no list', () => {
    expect(parseFigureOrder({})).toBeNull();
  });
});
