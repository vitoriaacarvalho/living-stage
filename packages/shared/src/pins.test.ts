import { describe, expect, test } from 'vitest';
import {
  copyPin,
  fillPins,
  fitPins,
  isInPinRange,
  newPin,
  pinRange,
  pinsFromMoves,
} from './pins.ts';

const SONG = 60_000;

describe('pinsFromMoves', () => {
  test('starts the first figure at the start of the song', () => {
    expect(pinsFromMoves([4000], SONG)).toEqual([0]);
  });

  test('reaches each figure when its move ends', () => {
    expect(pinsFromMoves([4000, 4000, 2500], SONG)).toEqual([0, 4000, 6500]);
  });

  test('keeps moves that end exactly at the song end', () => {
    expect(pinsFromMoves([4000, 30_000, 30_000], SONG)).toEqual([0, 30_000, 60_000]);
  });

  test('squeezes moves that run past the song end', () => {
    expect(pinsFromMoves([4000, 60_000, 60_000], SONG)).toEqual([0, 30_000, 60_000]);
  });
});

describe('fitPins', () => {
  test('leaves pins that fit', () => {
    expect(fitPins([0, 20_000, 50_000], SONG)).toEqual([0, 20_000, 50_000]);
  });

  test('squeezes pins in proportion for a shorter song', () => {
    expect(fitPins([0, 40_000, 120_000], SONG)).toEqual([0, 20_000, 60_000]);
  });

  test('leaves no pins as none', () => {
    expect(fitPins([], SONG)).toEqual([]);
  });
});

describe('fillPins', () => {
  test('keeps the pins there are', () => {
    expect(fillPins([0, 10_000], SONG)).toEqual([0, 10_000]);
  });

  test('slots a missing pin halfway between its neighbours', () => {
    expect(fillPins([0, null, 20_000], SONG)).toEqual([0, 10_000, 20_000]);
  });

  test('puts a missing last pin four seconds after the one before', () => {
    expect(fillPins([0, 10_000, null], SONG)).toEqual([0, 10_000, 14_000]);
  });

  test('starts a missing first pin at the song start', () => {
    expect(fillPins([null, 10_000], SONG)).toEqual([5000, 10_000]);
  });

  test('squeezes the filled pins into the song', () => {
    expect(fillPins([0, 120_000, null], SONG)).toEqual([0, 58_065, 60_000]);
  });
});

describe('newPin', () => {
  test('lands four seconds after the last pin', () => {
    expect(newPin([0, 10_000])).toBe(14_000);
  });

  test('lands four seconds after the last pin even past the song end', () => {
    expect(newPin([0, 60_000])).toBe(64_000);
  });

  test('starts the song for a dance with no figures', () => {
    expect(newPin([])).toBe(0);
  });
});

describe('copyPin', () => {
  test('lands halfway to the next pin', () => {
    expect(copyPin([0, 10_000, 20_000], 1)).toBe(15_000);
  });

  test('lands as a new figure after the last one', () => {
    expect(copyPin([0, 10_000], 1)).toBe(14_000);
  });
});

describe('pinRange', () => {
  const pins = [0, 10_000, 20_000];

  test('keeps the first pin from the song start up to before the next', () => {
    expect(pinRange(pins, 0, SONG)).toEqual({ minMs: 0, maxMs: 9500 });
  });

  test('keeps a middle pin half a second from each neighbour', () => {
    expect(pinRange(pins, 1, SONG)).toEqual({ minMs: 500, maxMs: 19_500 });
  });

  test('keeps the last pin up to the song end', () => {
    expect(pinRange(pins, 2, SONG)).toEqual({ minMs: 10_500, maxMs: 60_000 });
  });
});

describe('isInPinRange', () => {
  const pins = [0, 10_000, 20_000];

  test('takes a time half a second after the neighbour', () => {
    expect(isInPinRange(pins, 1, SONG, 500)).toBe(true);
  });

  test('takes no time closer than half a second', () => {
    expect(isInPinRange(pins, 1, SONG, 499)).toBe(false);
  });

  test('takes no time past the song end', () => {
    expect(isInPinRange(pins, 2, SONG, 60_001)).toBe(false);
  });
});
