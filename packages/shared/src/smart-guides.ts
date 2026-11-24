import type { StagePoint } from './figure.ts';
import { snapToGuides } from './placement.ts';
import { STAGE_DEPTH_M, STAGE_WIDTH_M, type StageGuides } from './stage.ts';

export const ALIGN_DISTANCE_M = 0.15;
// Dancers closer than this share a spot, so they set no gap.
const MIN_GAP_M = 0.05;

// Hint points are in stage units, like the dancers.
export type AlignHint = { kind: 'align'; from: StagePoint; to: StagePoint };
export type GapHint = { kind: 'gap'; through: [StagePoint, StagePoint, StagePoint]; gapM: number };
export type SnapHint = AlignHint | GapHint;
export type SmartSnap = { point: StagePoint; hints: SnapHint[] };

export type SnapSurroundings = { others: StagePoint[]; guides: StageGuides };

const toMetres = ({ x, y }: StagePoint) => ({ x: x * STAGE_WIDTH_M, y: y * STAGE_DEPTH_M });
const metresApart = (a: StagePoint, b: StagePoint) => {
  const [ma, mb] = [toMetres(a), toMetres(b)];
  return Math.hypot(ma.x - mb.x, ma.y - mb.y);
};

function nearestTo(point: StagePoint, points: StagePoint[]): StagePoint[] {
  return [...points].sort((a, b) => metresApart(point, a) - metresApart(point, b));
}

type GapSpot = { spot: StagePoint; hint: GapHint };

// B is the dancer nearest to the dragged one; the next spot after each of her two nearest neighbours.
function nextInPattern(point: StagePoint, others: StagePoint[]): GapSpot[] {
  const [b, ...rest] = nearestTo(point, others);
  if (!b) return [];
  return nearestTo(b, rest)
    .slice(0, 2)
    .filter((a) => metresApart(a, b) >= MIN_GAP_M)
    .map((a): GapSpot => {
      const spot = { x: 2 * b.x - a.x, y: 2 * b.y - a.y };
      return { spot, hint: { kind: 'gap', through: [a, b, spot], gapM: metresApart(a, b) } };
    });
}

function inBetween(point: StagePoint, others: StagePoint[]): GapSpot[] {
  const [c, d] = nearestTo(point, others);
  if (!c || !d || metresApart(c, d) < MIN_GAP_M) return [];
  const spot = { x: (c.x + d.x) / 2, y: (c.y + d.y) / 2 };
  return [{ spot, hint: { kind: 'gap', through: [c, spot, d], gapM: metresApart(c, d) / 2 } }];
}

export function snapToGap(point: StagePoint, others: StagePoint[]): SmartSnap | null {
  const near = [...nextInPattern(point, others), ...inBetween(point, others)]
    .filter(({ spot }) => metresApart(point, spot) <= ALIGN_DISTANCE_M)
    .sort((a, b) => metresApart(point, a.spot) - metresApart(point, b.spot));
  const best = near[0];
  return best ? { point: best.spot, hints: [best.hint] } : null;
}

type Axis = 'x' | 'y';

function alignedOn(axis: Axis, point: StagePoint, others: StagePoint[]): StagePoint | undefined {
  const metres = toMetres(point)[axis];
  return nearestTo(point, others)
    .filter((other) => Math.abs(toMetres(other)[axis] - metres) <= ALIGN_DISTANCE_M)
    .sort((a, b) => Math.abs(toMetres(a)[axis] - metres) - Math.abs(toMetres(b)[axis] - metres))[0];
}

// A dancer lined up with another wins over the guides on that axis.
export function snapToDancers(point: StagePoint, { others, guides }: SnapSurroundings): SmartSnap {
  const byX = alignedOn('x', point, others);
  const byY = alignedOn('y', point, others);
  const guided = snapToGuides(point, guides);
  const snapped = { x: byX?.x ?? guided.x, y: byY?.y ?? guided.y };
  const hints = [byX, byY]
    .filter((other) => other !== undefined)
    .map((from): AlignHint => ({ kind: 'align', from, to: snapped }));
  return { point: snapped, hints };
}

// An equal gap fixes both axes, so it wins over lining up and the guides.
export function smartSnap(point: StagePoint, surroundings: SnapSurroundings): SmartSnap {
  return snapToGap(point, surroundings.others) ?? snapToDancers(point, surroundings);
}
