import { describe, expect, test } from 'vitest';
import type { Figure, Position } from './figure.ts';
import type { Path } from './path.ts';
import { pathPointSpot } from './path.ts';
import {
  easeInOutCubic,
  figureIndexAt,
  figureTimeMs,
  playbackLengthMs,
  stageAt,
} from './playback.ts';
import { SIDE_WING_DEPTH } from './stage.ts';

const figure = (order: number, transitionMs: number, positions: Position[]): Figure => ({
  id: `f${order}`,
  order,
  name: null,
  transitionMs,
  positions,
  paths: [],
});

const spot = (castMemberId: string, x: number, y: number): Position => ({ castMemberId, x, y });

const wing = -SIDE_WING_DEPTH / 2;

// The first figure's 9 s never count: nothing comes before it.
const intoSecond = 2000;
const intoThird = 6000;
const atThird = intoSecond + intoThird;

const figures = [
  figure(0, 9000, [spot('a', 0.2, 0.2), spot('b', wing, 0.5)]),
  figure(1, intoSecond, [spot('a', 0.6, 0.2), spot('b', 0.5, 0.5)]),
  figure(2, intoThird, [spot('a', 0.6, 0.8), spot('b', 1 + SIDE_WING_DEPTH / 2, 0.5)]),
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
  test("adds up each later figure's time to arrive", () => {
    expect(playbackLengthMs(figures)).toBe(atThird);
  });

  test('is zero for a single figure', () => {
    expect(playbackLengthMs([figures[0]!])).toBe(0);
  });

  test('is zero with no figures', () => {
    expect(playbackLengthMs([])).toBe(0);
  });
});

describe('figureIndexAt', () => {
  test('is the first figure at the start', () => {
    expect(figureIndexAt(figures, 0)).toBe(0);
  });

  test('stays on the figure being left just before the next one', () => {
    expect(figureIndexAt(figures, intoSecond - 1)).toBe(0);
  });

  test('reaches a figure at its own moment', () => {
    expect(figureIndexAt(figures, intoSecond)).toBe(1);
  });

  test('is the last figure at the end', () => {
    expect(figureIndexAt(figures, atThird)).toBe(2);
  });

  test('stays on the last figure past the end', () => {
    expect(figureIndexAt(figures, atThird + 1000)).toBe(2);
  });

  test('is the first figure before the start', () => {
    expect(figureIndexAt(figures, -1)).toBe(0);
  });

  test('is zero with no figures', () => {
    expect(figureIndexAt([], 1000)).toBe(0);
  });
});

describe('figureTimeMs', () => {
  test('puts the first figure at the start', () => {
    expect(figureTimeMs(figures, 0)).toBe(0);
  });

  test('puts the second figure after its own time to arrive', () => {
    expect(figureTimeMs(figures, 1)).toBe(intoSecond);
  });

  test('puts a later figure after every time to arrive before it', () => {
    expect(figureTimeMs(figures, 2)).toBe(atThird);
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
    expect(near(stageAt(figures, intoSecond)!.positions)).toEqual(near(figures[1]!.positions));
  });

  test('is leaving a figure exactly at its time', () => {
    expect(stageAt(figures, intoSecond)?.from).toBe(figures[1]);
  });

  test('is halfway between two figures at half the time to arrive', () => {
    expect(near(stageAt(figures, intoSecond / 2)!.positions)).toEqual(
      near([spot('a', 0.4, 0.2), spot('b', (wing + 0.5) / 2, 0.5)]),
    );
  });

  test('is halfway through a later move at half its own time', () => {
    expect(stageAt(figures, intoSecond + intoThird / 2)?.progress).toBe(0.5);
  });

  test('is still on the first move just before the second figure', () => {
    expect(stageAt(figures, intoSecond - 1)?.to).toBe(figures[1]);
  });

  test('reports linear progress', () => {
    expect(stageAt(figures, intoSecond / 4)?.progress).toBe(0.25);
  });

  test('eases the positions', () => {
    const [a] = stageAt(figures, intoSecond / 4)!.positions;
    expect(a!.x).toBeCloseTo(0.2 + 0.4 * 0.0625);
  });

  test('shows the last figure at the end', () => {
    expect(near(stageAt(figures, atThird)!.positions)).toEqual(near(figures[2]!.positions));
  });

  test('ends with full progress', () => {
    expect(stageAt(figures, atThird)?.progress).toBe(1);
  });

  test('holds the last figure past the end', () => {
    expect(xy(stageAt(figures, atThird * 10)?.positions)).toEqual(xy(figures[2]!.positions));
  });

  test('is reaching the last figure past the end', () => {
    expect(stageAt(figures, atThird * 10)?.to).toBe(figures[2]);
  });

  test('holds the first figure before the start', () => {
    expect(xy(stageAt(figures, -intoSecond)?.positions)).toEqual(xy(figures[0]!.positions));
  });

  test('shows a single figure at any time', () => {
    expect(xy(stageAt([figures[0]!], intoSecond)?.positions)).toEqual(xy(figures[0]!.positions));
  });

  test('stays still with a single figure', () => {
    expect(stageAt([figures[0]!], intoSecond)?.progress).toBe(0);
  });

  test('brings a dancer in from the wing in a straight line', () => {
    const b = stageAt(figures, intoSecond / 2)!.positions[1]!;
    expect([b.x, b.y]).toEqual([expect.closeTo((wing + 0.5) / 2), 0.5]);
  });

  test('takes a dancer out to the far wing', () => {
    const b = stageAt(figures, atThird)!.positions[1]!;
    expect(b.x).toBeCloseTo(1 + SIDE_WING_DEPTH / 2);
  });

  test('keeps a dancer still when the next figure has no spot for her', () => {
    const pair = [figure(0, 4000, [spot('a', 0.2, 0.2)]), figure(1, 4000, [])];
    expect(xy(stageAt(pair, 2000)?.positions)).toEqual([['a', 0.2, 0.2]]);
  });

  test('shows a dancer who only has a spot in the next figure', () => {
    const pair = [figure(0, 4000, []), figure(1, 4000, [spot('a', 0.6, 0.2)])];
    expect(xy(stageAt(pair, 2000)?.positions)).toEqual([['a', 0.6, 0.2]]);
  });

  describe('along a bent path', () => {
    const bend = { along: 0.5, side: 0.25 };
    const bentInto = (paths: Path[]) => [
      figure(0, 4000, [spot('a', 0.2, 0.5), spot('b', 0.2, 0.8)]),
      { ...figure(1, 4000, [spot('a', 0.8, 0.5), spot('b', 0.8, 0.8)]), paths },
    ];
    const bent = bentInto([{ castMemberId: 'a', points: [bend], around: null }]);
    const dancerAt = (timeMs: number, index = 0) => stageAt(bent, timeMs)!.positions[index]!;

    test('passes through the bend halfway', () => {
      const middle = pathPointSpot({ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }, bend);
      expect([dancerAt(2000).x, dancerAt(2000).y]).toEqual([
        expect.closeTo(middle.x, 3),
        expect.closeTo(middle.y, 3),
      ]);
    });

    test('starts at the spot in the figure before', () => {
      expect([dancerAt(0).x, dancerAt(0).y]).toEqual([expect.closeTo(0.2), expect.closeTo(0.5)]);
    });

    test('arrives at the spot in the figure', () => {
      expect([dancerAt(4000).x, dancerAt(4000).y]).toEqual([
        expect.closeTo(0.8),
        expect.closeTo(0.5),
      ]);
    });

    test('eases along the bend', () => {
      expect(dancerAt(400).x).toBeLessThan(0.2 + 0.6 * 0.1);
    });

    test('keeps a dancer without a path on the straight line', () => {
      expect(dancerAt(2000, 1).y).toBeCloseTo(0.8);
    });

    test('ignores a path for a dancer who is not in the figure before', () => {
      const pair = [
        figure(0, 4000, []),
        {
          ...figure(1, 4000, [spot('a', 0.6, 0.2)]),
          paths: [{ castMemberId: 'a', points: [bend], around: null }],
        },
      ];
      expect(xy(stageAt(pair, 2000)?.positions)).toEqual([['a', 0.6, 0.2]]);
    });
  });

  describe('circling another dancer', () => {
    const centre = { x: 0.5, y: 0.5 };
    const east = { x: 0.5 + 2 / 12, y: 0.5 };
    const circling = (around: Path['around'], positions = [spot('a', 0.5, 0.5)]) => [
      figure(0, 4000, [...positions, spot('b', east.x, east.y)]),
      {
        ...figure(1, 4000, [spot('a', centre.x, centre.y), spot('b', east.x, east.y)]),
        paths: [{ castMemberId: 'b', points: [], around }],
      },
    ];
    const bAt = (figures: Figure[], timeMs: number) =>
      stageAt(figures, timeMs)!.positions.find(({ castMemberId }) => castMemberId === 'b')!;

    test('goes around the other dancer and back to her spot', () => {
      const around = { castMemberId: 'a', clockwise: true, turns: 0 };
      const b = bAt(circling(around), 2000);
      expect([b.x, b.y]).toEqual([expect.closeTo(0.5 - 2 / 12), expect.closeTo(0.5)]);
    });

    test('ends at her spot in the figure', () => {
      const around = { castMemberId: 'a', clockwise: true, turns: 0 };
      const b = bAt(circling(around), 4000);
      expect([b.x, b.y]).toEqual([expect.closeTo(east.x), expect.closeTo(east.y)]);
    });

    test('walks straight when the dancer she circles was not in the figure before', () => {
      const around = { castMemberId: 'a', clockwise: true, turns: 0 };
      const b = bAt(circling(around, []), 2000);
      expect([b.x, b.y]).toEqual([expect.closeTo(east.x), expect.closeTo(east.y)]);
    });
  });
});
