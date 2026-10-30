import { describe, expect, test } from 'vitest';
import {
  FIGURE_NAME_MAX_LENGTH,
  nextWingSpot,
  parseFigureCopy,
  parseFigureName,
  parseFigureUpdate,
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

  test('rejects a body with no name', () => {
    expect(parseFigureUpdate({})).toBeNull();
  });
});
