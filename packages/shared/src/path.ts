import type { StagePoint } from './figure.ts';
import { STAGE_DEPTH_M, STAGE_WIDTH_M } from './stage.ts';

// A point the path passes through, relative to the straight line from start to end:
// along is the share of the way (0 to 1), side how far off it as a share of the line's
// length, positive to the left as the dancer travels. So a bend keeps its shape when
// either end moves.
export type PathPoint = { along: number; side: number };

// Circling another cast member: clockwise as seen on the plan, with whole extra turns.
export type PathAround = { castMemberId: string; clockwise: boolean; turns: number };

// The route a cast member takes into a figure, from her spot in the figure before: a
// curve through its points, or a circle around another cast member (then no points).
export type Path = { castMemberId: string; points: PathPoint[]; around: PathAround | null };

export type PathResponse = { path: Path };

export type PathUpdate = { points: PathPoint[] } | { around: PathAround };

// An arc around a centre that may itself be moving: centreAt(0) and centreAt(1) are its
// spots at the start and end of the move.
export type Orbit = {
  start: StagePoint;
  end: StagePoint;
  centreAt: (progress: number) => StagePoint;
  clockwise: boolean;
  turns: number;
};

export type CubicSegment = { start: StagePoint; c1: StagePoint; c2: StagePoint; end: StagePoint };

export const PATH_POINTS_MAX = 5;
export const PATH_TURNS_MAX = 3;
export const PATH_ALONG_MIN = 0.05;
export const PATH_ALONG_MAX = 0.95;
export const PATH_SIDE_MAX = 2;
// Letting go of a point this close to the straight line between its neighbours removes it.
export const PATH_STRAIGHT_M = 0.3;
// A shorter move shows no handle, so it never covers the dancer's own drag area.
export const PATH_HANDLE_MIN_M = 1.5;

const SAMPLES_PER_SEGMENT = 32;
const TAU = 2 * Math.PI;

type Vector = { x: number; y: number };

const plus = (a: Vector, b: Vector) => ({ x: a.x + b.x, y: a.y + b.y });
const minus = (a: Vector, b: Vector) => ({ x: a.x - b.x, y: a.y - b.y });
const times = (a: Vector, k: number) => ({ x: a.x * k, y: a.y * k });
const dot = (a: Vector, b: Vector) => a.x * b.x + a.y * b.y;
const length = (a: Vector) => Math.hypot(a.x, a.y);
// Left of the direction of travel, with y growing downstage.
const leftOf = (a: Vector) => ({ x: a.y, y: -a.x });

// Stage units stretch differently on each axis, so shapes are worked out in metres.
const toMetres = ({ x, y }: StagePoint) => ({ x: x * STAGE_WIDTH_M, y: y * STAGE_DEPTH_M });
const toStage = ({ x, y }: Vector) => ({ x: x / STAGE_WIDTH_M, y: y / STAGE_DEPTH_M });

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function moveLengthM(start: StagePoint, end: StagePoint): number {
  return length(minus(toMetres(end), toMetres(start)));
}

export function pathPointSpot(start: StagePoint, end: StagePoint, point: PathPoint): StagePoint {
  const from = toMetres(start);
  const line = minus(toMetres(end), from);
  return toStage(plus(from, plus(times(line, point.along), times(leftOf(line), point.side))));
}

// The point a handle dragged to spot stands for, kept within what a path may hold.
export function pathPointAt(start: StagePoint, end: StagePoint, spot: StagePoint): PathPoint {
  const from = toMetres(start);
  const line = minus(toMetres(end), from);
  const squared = dot(line, line) || 1;
  const offset = minus(toMetres(spot), from);
  return {
    along: clamp(dot(offset, line) / squared, PATH_ALONG_MIN, PATH_ALONG_MAX),
    side: clamp(dot(offset, leftOf(line)) / squared, -PATH_SIDE_MAX, PATH_SIDE_MAX),
  };
}

// Start, every point and end, in order along the path.
function throughSpots(start: StagePoint, end: StagePoint, points: PathPoint[]): StagePoint[] {
  return [start, ...points.map((point) => pathPointSpot(start, end, point)), end];
}

// How far the point at index sits from the straight line between its neighbours: the
// points either side of it, or the start and end.
export function offLineM(
  start: StagePoint,
  end: StagePoint,
  points: PathPoint[],
  index: number,
): number {
  const [before, at, after] = throughSpots(start, end, points)
    .slice(index, index + 3)
    .map(toMetres) as [Vector, Vector, Vector];
  const line = minus(after, before);
  const share = clamp(dot(minus(at, before), line) / (dot(line, line) || 1), 0, 1);
  return length(minus(at, plus(before, times(line, share))));
}

// The points with a new one at spot, placed between the points it was tapped between so
// they stay in order along the path.
export function withPointAt(
  start: StagePoint,
  end: StagePoint,
  points: PathPoint[],
  spot: StagePoint,
): PathPoint[] {
  const target = toMetres(spot);
  const nearest = pathCurve(start, end, points)
    .map((segment, index) => {
      const steps = Array.from({ length: SAMPLES_PER_SEGMENT + 1 }, (_, step) =>
        length(minus(toMetres(bezier(segment, step / SAMPLES_PER_SEGMENT)), target)),
      );
      return { index, distance: Math.min(...steps) };
    })
    .reduce((best, each) => (each.distance < best.distance ? each : best));
  const point = pathPointAt(start, end, spot);
  return [...points.slice(0, nearest.index), point, ...points.slice(nearest.index)];
}

// A centripetal Catmull-Rom spline through start, the points and end, as cubic Bézier
// segments. Centripetal keeps it from looping or overshooting near close points.
export function pathCurve(start: StagePoint, end: StagePoint, points: PathPoint[]): CubicSegment[] {
  const through = throughSpots(start, end, points).map(toMetres);
  const last = through.length - 1;
  const before = minus(times(through[0]!, 2), through[1]!);
  const after = minus(times(through[last]!, 2), through[last - 1]!);
  const knots = [before, ...through, after];
  return through.slice(0, -1).map((_, index) => {
    const [p0, p1, p2, p3] = knots.slice(index, index + 4) as [Vector, Vector, Vector, Vector];
    return {
      start: toStage(p1),
      c1: toStage(control(p0, p1, p2)),
      c2: toStage(control(p3, p2, p1)),
      end: toStage(p2),
    };
  });
}

// The Bézier control next to `at`, on its way towards `to`, with `away` the knot behind it.
function control(away: Vector, at: Vector, to: Vector): Vector {
  const near = Math.sqrt(length(minus(at, away)));
  const far = Math.sqrt(length(minus(to, at)));
  if (near === 0 || far === 0) return at;
  const weighted = plus(
    plus(times(to, near * near), times(away, -far * far)),
    times(at, 2 * near * near + 3 * near * far + far * far),
  );
  return times(weighted, 1 / (3 * near * (near + far)));
}

function bezier({ start, c1, c2, end }: CubicSegment, t: number): Vector {
  const u = 1 - t;
  return plus(
    plus(times(start, u * u * u), times(c1, 3 * u * u * t)),
    plus(times(c2, 3 * u * t * t), times(end, t * t * t)),
  );
}

type DistanceTable = { samples: Vector[]; distances: number[] };

// Points along the curve with the distance walked to reach each, in metres.
function distanceTable(curve: CubicSegment[]): DistanceTable {
  const samples = curve.flatMap((segment, index) =>
    Array.from({ length: SAMPLES_PER_SEGMENT + (index === curve.length - 1 ? 1 : 0) }, (_, step) =>
      bezier(segment, step / SAMPLES_PER_SEGMENT),
    ),
  );
  const distances = [0];
  for (let index = 1; index < samples.length; index += 1) {
    const step = length(minus(toMetres(samples[index]!), toMetres(samples[index - 1]!)));
    distances.push(distances[index - 1]! + step);
  }
  return { samples, distances };
}

function spotIn({ samples, distances }: DistanceTable, share: number): StagePoint {
  const total = distances[distances.length - 1]!;
  if (total === 0) return samples[0]!;
  const target = clamp(share, 0, 1) * total;
  const index = Math.max(
    1,
    distances.findIndex((distance) => distance >= target),
  );
  const span = distances[index]! - distances[index - 1]!;
  const part = span === 0 ? 0 : (target - distances[index - 1]!) / span;
  const from = samples[index - 1]!;
  return plus(from, times(minus(samples[index]!, from), part));
}

// The spot a share of the way along the curve, measured by distance so the dancer's
// speed follows the easing and not the curve's parameter.
export function spotAlong(curve: CubicSegment[], share: number): StagePoint {
  return spotIn(distanceTable(curve), share);
}

// count + 1 spots evenly spaced along the curve, from its start to its end.
export function spotsAlong(curve: CubicSegment[], count: number): StagePoint[] {
  const table = distanceTable(curve);
  return Array.from({ length: count + 1 }, (_, index) => spotIn(table, index / count));
}

const turnShare = (angle: number) => ((angle % TAU) + TAU) % TAU;

// Her angle around the centre and her distance from it change evenly from start to end.
// With no extra turns and the same angle at both ends she still goes once around, since
// circling someone and coming back is what was asked for.
export function orbitSpot(
  { start, end, centreAt, clockwise, turns }: Orbit,
  progress: number,
): StagePoint {
  const from = minus(toMetres(start), toMetres(centreAt(0)));
  const to = minus(toMetres(end), toMetres(centreAt(1)));
  const startAngle = Math.atan2(from.y, from.x);
  const endAngle = Math.atan2(to.y, to.x);
  const way = turnShare(clockwise ? endAngle - startAngle : startAngle - endAngle) || TAU;
  const sweep = (way + turns * TAU) * (clockwise ? 1 : -1);
  const angle = startAngle + sweep * progress;
  const radius = length(from) + (length(to) - length(from)) * progress;
  const around = { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
  return toStage(plus(toMetres(centreAt(progress)), around));
}

export function parsePathPoints(value: unknown): PathPoint[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > PATH_POINTS_MAX) return null;
  const points = value.map(parsePathPoint);
  return points.every((point) => point !== null) ? (points as PathPoint[]) : null;
}

function parsePathPoint(value: unknown): PathPoint | null {
  if (typeof value !== 'object' || value === null) return null;
  const { along, side } = value as Record<string, unknown>;
  if (typeof along !== 'number' || typeof side !== 'number') return null;
  if (!Number.isFinite(along) || !Number.isFinite(side)) return null;
  if (along < PATH_ALONG_MIN || along > PATH_ALONG_MAX) return null;
  if (Math.abs(side) > PATH_SIDE_MAX) return null;
  return { along, side };
}

export function parsePathAround(value: unknown): PathAround | null {
  if (typeof value !== 'object' || value === null) return null;
  const { castMemberId, clockwise, turns } = value as Record<string, unknown>;
  if (typeof castMemberId !== 'string' || castMemberId.length === 0) return null;
  if (typeof clockwise !== 'boolean') return null;
  if (typeof turns !== 'number' || !Number.isInteger(turns)) return null;
  if (turns < 0 || turns > PATH_TURNS_MAX) return null;
  return { castMemberId, clockwise, turns };
}

// Either points or a circle, never both.
export function parsePathUpdate(value: unknown): PathUpdate | null {
  if (typeof value !== 'object' || value === null) return null;
  const body = value as Record<string, unknown>;
  if ('points' in body === 'around' in body) return null;
  if ('around' in body) {
    const around = parsePathAround(body.around);
    return around ? { around } : null;
  }
  const points = parsePathPoints(body.points);
  return points ? { points } : null;
}
