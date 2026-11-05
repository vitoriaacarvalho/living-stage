import { describe, expect, test } from 'vitest';
import type { StagePoint } from './figure.ts';
import {
  PATH_ALONG_MAX,
  PATH_ALONG_MIN,
  PATH_POINTS_MAX,
  PATH_SIDE_MAX,
  moveLengthM,
  offLineM,
  parsePathPoints,
  parsePathUpdate,
  pathCurve,
  pathPointAt,
  pathPointSpot,
  spotAlong,
  spotsAlong,
  withPointAt,
} from './path.ts';

// Stage left to right across the middle: 7.2 m on the 12 m floor.
const start = { x: 0.2, y: 0.5 };
const end = { x: 0.8, y: 0.5 };
const moveM = 7.2;

const near = ({ x, y }: StagePoint) => ({ x: expect.closeTo(x, 6), y: expect.closeTo(y, 6) });

describe('moveLengthM', () => {
  test('measures the move in metres', () => {
    expect(moveLengthM(start, end)).toBeCloseTo(moveM);
  });

  test('measures depth on the 8 m axis', () => {
    expect(moveLengthM({ x: 0.5, y: 0 }, { x: 0.5, y: 1 })).toBeCloseTo(8);
  });
});

describe('pathPointSpot', () => {
  test('puts a point with no side on the straight line', () => {
    expect(pathPointSpot(start, end, { along: 0.5, side: 0 })).toEqual(near({ x: 0.5, y: 0.5 }));
  });

  test('puts a positive side to the left of the dancer, upstage when crossing left to right', () => {
    expect(pathPointSpot(start, end, { along: 0.5, side: 0.25 })).toEqual(
      near({ x: 0.5, y: 0.5 - (0.25 * moveM) / 8 }),
    );
  });

  test('turns with the line when the dancer travels the other way', () => {
    expect(pathPointSpot(end, start, { along: 0.5, side: 0.25 })).toEqual(
      near({ x: 0.5, y: 0.5 + (0.25 * moveM) / 8 }),
    );
  });

  test('stretches with the line when an end moves', () => {
    const farther = { x: 0.8, y: 0.9 };
    expect(pathPointSpot(start, farther, { along: 1, side: 0 })).toEqual(near(farther));
  });
});

describe('pathPointAt', () => {
  test('gives back the point of a spot on the path', () => {
    const point = { along: 0.3, side: -0.2 };
    const spot = pathPointSpot(start, end, point);
    const found = pathPointAt(start, end, spot);
    expect([found.along, found.side]).toEqual([expect.closeTo(0.3), expect.closeTo(-0.2)]);
  });

  test('keeps the point from reaching the start', () => {
    expect(pathPointAt(start, end, start).along).toBe(PATH_ALONG_MIN);
  });

  test('keeps the point from going past the end', () => {
    expect(pathPointAt(start, end, { x: 1, y: 0.5 }).along).toBe(PATH_ALONG_MAX);
  });

  test('keeps the point within the side limit', () => {
    expect(pathPointAt(start, { x: 0.21, y: 0.5 }, { x: 0.2, y: 0 }).side).toBe(PATH_SIDE_MAX);
  });

  test('does not fail when the dancer does not move', () => {
    expect(pathPointAt(start, start, end)).toEqual({ along: PATH_ALONG_MIN, side: 0 });
  });
});

describe('offLineM', () => {
  test('measures a single point from the straight line from start to end', () => {
    expect(offLineM(start, end, [{ along: 0.5, side: 0.29 / moveM }], 0)).toBeCloseTo(0.29);
  });

  test('measures a point to the right of the line the same way', () => {
    expect(offLineM(start, end, [{ along: 0.5, side: -0.31 / moveM }], 0)).toBeCloseTo(0.31);
  });

  test('measures a point from the line between the points either side of it', () => {
    const points = [
      { along: 0.25, side: 0.25 },
      { along: 0.5, side: 0.25 },
      { along: 0.75, side: 0.25 },
    ];
    expect(offLineM(start, end, points, 1)).toBeCloseTo(0);
  });

  test('measures the first point from the start and the next point', () => {
    const points = [
      { along: 0.25, side: 0 },
      { along: 0.5, side: 0.5 },
    ];
    expect(offLineM(start, end, points, 0)).toBeGreaterThan(0.3);
  });

  test('measures the last point from the point before it and the end', () => {
    const points = [
      { along: 0.5, side: 0.5 },
      { along: 0.75, side: 0.25 },
    ];
    expect(offLineM(start, end, points, 1)).toBeCloseTo(0);
  });
});

describe('pathCurve', () => {
  test('is one segment with its controls on the line when there are no points', () => {
    expect(pathCurve(start, end, [])).toEqual([
      {
        start: near(start),
        c1: near({ x: 0.4, y: 0.5 }),
        c2: near({ x: 0.6, y: 0.5 }),
        end: near(end),
      },
    ]);
  });

  test('has one segment more for each point', () => {
    expect(pathCurve(start, end, [{ along: 0.5, side: 0.2 }])).toHaveLength(2);
  });

  test('passes through its point', () => {
    const point = { along: 0.4, side: 0.2 };
    const [first] = pathCurve(start, end, [point]);
    expect(first!.end).toEqual(near(pathPointSpot(start, end, point)));
  });

  test('joins its segments smoothly', () => {
    const [first, second] = pathCurve(start, end, [{ along: 0.4, side: 0.2 }]);
    const into = { x: first!.end.x - first!.c2.x, y: first!.end.y - first!.c2.y };
    const out = { x: second!.c1.x - second!.start.x, y: second!.c1.y - second!.start.y };
    expect(into.x * out.y - into.y * out.x).toBeCloseTo(0, 9);
  });
});

describe('withPointAt', () => {
  const first = { along: 0.3, side: 0.2 };
  const second = { along: 0.7, side: -0.2 };

  test('adds the first point of a straight path where it was tapped', () => {
    const [point] = withPointAt(start, end, [], { x: 0.5, y: 0.5 });
    expect([point!.along, point!.side]).toEqual([expect.closeTo(0.5), expect.closeTo(0)]);
  });

  test('puts a point tapped before the first point ahead of it', () => {
    const spot = spotAlong(pathCurve(start, end, [first, second]), 0.1);
    expect(withPointAt(start, end, [first, second], spot)[1]).toEqual(first);
  });

  test('puts a point tapped between two points between them', () => {
    const spot = spotAlong(pathCurve(start, end, [first, second]), 0.5);
    const points = withPointAt(start, end, [first, second], spot);
    expect([points[0], points[2]]).toEqual([first, second]);
  });

  test('puts a point tapped after the last point at the end', () => {
    const spot = spotAlong(pathCurve(start, end, [first, second]), 0.9);
    expect(withPointAt(start, end, [first, second], spot).slice(0, 2)).toEqual([first, second]);
  });
});

describe('spotAlong', () => {
  const straight = pathCurve(start, end, []);
  const bent = pathCurve(start, end, [{ along: 0.5, side: 0.25 }]);

  test('starts at the start', () => {
    expect(spotAlong(bent, 0)).toEqual(near(start));
  });

  test('ends at the end', () => {
    expect(spotAlong(bent, 1)).toEqual(near(end));
  });

  test('goes by distance along a straight line', () => {
    expect(spotAlong(straight, 0.25)).toEqual(near({ x: 0.35, y: 0.5 }));
  });

  test('is at the middle point halfway along an even bend', () => {
    const middle = pathPointSpot(start, end, { along: 0.5, side: 0.25 });
    const halfway = spotAlong(bent, 0.5);
    expect([halfway.x, halfway.y]).toEqual([
      expect.closeTo(middle.x, 3),
      expect.closeTo(middle.y, 3),
    ]);
  });

  test('stays on the bend between its ends', () => {
    expect(spotAlong(bent, 0.3).y).toBeLessThan(0.5);
  });

  test('stays at the spot of a dancer who does not move', () => {
    expect(spotAlong(pathCurve(start, start, []), 0.5)).toEqual(near(start));
  });
});

describe('spotsAlong', () => {
  const straight = pathCurve(start, end, []);

  test('gives one spot more than the steps asked for', () => {
    expect(spotsAlong(straight, 4)).toHaveLength(5);
  });

  test('spaces the spots evenly from start to end', () => {
    expect(spotsAlong(straight, 2)).toEqual([near(start), near({ x: 0.5, y: 0.5 }), near(end)]);
  });
});

describe('parsePathPoints', () => {
  test('accepts one point', () => {
    expect(parsePathPoints([{ along: 0.5, side: -0.3 }])).toEqual([{ along: 0.5, side: -0.3 }]);
  });

  test('accepts the limits', () => {
    const points = [{ along: PATH_ALONG_MIN, side: PATH_SIDE_MAX }];
    expect(parsePathPoints(points)).toEqual(points);
  });

  test('refuses no points', () => {
    expect(parsePathPoints([])).toBeNull();
  });

  test('accepts as many points as a path holds', () => {
    const points = Array.from({ length: PATH_POINTS_MAX }, (_, index) => ({
      along: 0.1 + index * 0.1,
      side: 0,
    }));
    expect(parsePathPoints(points)).toEqual(points);
  });

  test('refuses more points than a path holds', () => {
    const points = Array.from({ length: PATH_POINTS_MAX + 1 }, (_, index) => ({
      along: 0.1 + index * 0.1,
      side: 0,
    }));
    expect(parsePathPoints(points)).toBeNull();
  });

  test('refuses a point too close to the start', () => {
    expect(parsePathPoints([{ along: 0.04, side: 0 }])).toBeNull();
  });

  test('refuses a point too close to the end', () => {
    expect(parsePathPoints([{ along: 0.96, side: 0 }])).toBeNull();
  });

  test('refuses a point too far to the side', () => {
    expect(parsePathPoints([{ along: 0.5, side: -2.01 }])).toBeNull();
  });

  test('refuses a point that is not a number', () => {
    expect(parsePathPoints([{ along: Number.NaN, side: 0 }])).toBeNull();
  });

  test('refuses something that is not a list', () => {
    expect(parsePathPoints({ along: 0.5, side: 0 })).toBeNull();
  });
});

describe('parsePathUpdate', () => {
  test('reads the points', () => {
    expect(parsePathUpdate({ points: [{ along: 0.5, side: 0.1 }] })).toEqual({
      points: [{ along: 0.5, side: 0.1 }],
    });
  });

  test('refuses a body without points', () => {
    expect(parsePathUpdate({})).toBeNull();
  });
});
