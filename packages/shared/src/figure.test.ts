import { describe, expect, test } from 'vitest';
import { nextWingSpot, parseFigureCopy, WING_SPOTS } from './figure.ts';
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
