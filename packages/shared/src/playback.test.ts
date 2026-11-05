import { describe, expect, test } from 'vitest';
import type { Figure, Position } from './figure.ts';
import {
  TRANSITION_MS,
  easeInOutCubic,
  figureTimeMs,
  playbackLengthMs,
  stageAt,
} from './playback.ts';
import { SIDE_WING_DEPTH } from './stage.ts';

const figure = (order: number, positions: Position[]): Figure => ({
  id: `f${order}`,
  order,
  name: null,
  transitionMs: TRANSITION_MS,
  positions,
});

const spot = (castMemberId: string, x: number, y: number): Position => ({ castMemberId, x, y });

const wing = -SIDE_WING_DEPTH / 2;

const figures = [
  figure(0, [spot('a', 0.2, 0.2), spot('b', wing, 0.5)]),
  figure(1, [spot('a', 0.6, 0.2), spot('b', 0.5, 0.5)]),
  figure(2, [spot('a', 0.6, 0.8), spot('b', 1 + SIDE_WING_DEPTH / 2, 0.5)]),
];

const xy = (positions: Position[] | undefined) =>
  positions?.map(({ castMemberId, x, y }) => [castMemberId, x, y]);

const near = (positions: Position[]) =>
  positions.map(({ castMemberId, x, y }) => [castMemberId, expect.closeTo(x), expect.closeTo(y)]);

describe('easeInOutCubic', () => {
  test('starts at rest', () => {
    expect(easeInOutCubic(0)).toBe(0);
  });

  test('ends at the figure', () => {
    expect(easeInOutCubic(1)).toBe(1);
  });

  test('is halfway at half time', () => {
    expect(easeInOutCubic(0.5)).toBe(0.5);
  });

  test('moves slowly out of a figure', () => {
    expect(easeInOutCubic(0.25)).toBeCloseTo(0.0625);
  });

  test('moves slowly into a figure', () => {
    expect(easeInOutCubic(0.75)).toBeCloseTo(0.9375);
  });
});

describe('playbackLengthMs', () => {
  test('is one transition per figure after the first', () => {
    expect(playbackLengthMs(figures)).toBe(2 * TRANSITION_MS);
  });

  test('is zero for a single figure', () => {
    expect(playbackLengthMs([figures[0]!])).toBe(0);
  });

  test('is zero with no figures', () => {
    expect(playbackLengthMs([])).toBe(0);
  });
});

describe('figureTimeMs', () => {
  test('puts the first figure at the start', () => {
    expect(figureTimeMs(0)).toBe(0);
  });

  test('puts each figure one transition after the one before', () => {
    expect(figureTimeMs(2)).toBe(2 * TRANSITION_MS);
  });
});

describe('stageAt', () => {
  test('gives nothing with no figures', () => {
    expect(stageAt([], 0)).toBeNull();
  });

  test('shows the first figure at time 0', () => {
    expect(xy(stageAt(figures, 0)?.positions)).toEqual(xy(figures[0]!.positions));
  });

  test('is leaving the first figure at time 0', () => {
    expect(stageAt(figures, 0)?.from).toBe(figures[0]);
  });

  test('is reaching the second figure at time 0', () => {
    expect(stageAt(figures, 0)?.to).toBe(figures[1]);
  });

  test('shows a figure exactly at its time', () => {
    expect(near(stageAt(figures, TRANSITION_MS)!.positions)).toEqual(near(figures[1]!.positions));
  });

  test('is leaving a figure exactly at its time', () => {
    expect(stageAt(figures, TRANSITION_MS)?.from).toBe(figures[1]);
  });

  test('is halfway between two figures at half the transition', () => {
    expect(near(stageAt(figures, TRANSITION_MS / 2)!.positions)).toEqual(
      near([spot('a', 0.4, 0.2), spot('b', (wing + 0.5) / 2, 0.5)]),
    );
  });

  test('reports linear progress', () => {
    expect(stageAt(figures, TRANSITION_MS / 4)?.progress).toBe(0.25);
  });

  test('eases the positions', () => {
    const [a] = stageAt(figures, TRANSITION_MS / 4)!.positions;
    expect(a!.x).toBeCloseTo(0.2 + 0.4 * 0.0625);
  });

  test('shows the last figure at the end', () => {
    expect(near(stageAt(figures, 2 * TRANSITION_MS)!.positions)).toEqual(
      near(figures[2]!.positions),
    );
  });

  test('ends with full progress', () => {
    expect(stageAt(figures, 2 * TRANSITION_MS)?.progress).toBe(1);
  });

  test('holds the last figure past the end', () => {
    expect(xy(stageAt(figures, 99 * TRANSITION_MS)?.positions)).toEqual(xy(figures[2]!.positions));
  });

  test('is reaching the last figure past the end', () => {
    expect(stageAt(figures, 99 * TRANSITION_MS)?.to).toBe(figures[2]);
  });

  test('holds the first figure before the start', () => {
    expect(xy(stageAt(figures, -TRANSITION_MS)?.positions)).toEqual(xy(figures[0]!.positions));
  });

  test('shows a single figure at any time', () => {
    expect(xy(stageAt([figures[0]!], TRANSITION_MS)?.positions)).toEqual(xy(figures[0]!.positions));
  });

  test('stays still with a single figure', () => {
    expect(stageAt([figures[0]!], TRANSITION_MS)?.progress).toBe(0);
  });

  test('brings a dancer in from the wing in a straight line', () => {
    const b = stageAt(figures, TRANSITION_MS / 2)!.positions[1]!;
    expect([b.x, b.y]).toEqual([expect.closeTo((wing + 0.5) / 2), 0.5]);
  });

  test('takes a dancer out to the far wing', () => {
    const b = stageAt(figures, 2 * TRANSITION_MS)!.positions[1]!;
    expect(b.x).toBeCloseTo(1 + SIDE_WING_DEPTH / 2);
  });

  test('keeps a dancer still when the next figure has no spot for her', () => {
    const pair = [figure(0, [spot('a', 0.2, 0.2)]), figure(1, [])];
    expect(xy(stageAt(pair, TRANSITION_MS / 2)?.positions)).toEqual([['a', 0.2, 0.2]]);
  });

  test('shows a dancer who only has a spot in the next figure', () => {
    const pair = [figure(0, []), figure(1, [spot('a', 0.6, 0.2)])];
    expect(xy(stageAt(pair, TRANSITION_MS / 2)?.positions)).toEqual([['a', 0.6, 0.2]]);
  });
});
