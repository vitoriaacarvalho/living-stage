import type { Position, StagePoint } from './figure.ts';
import {
  SIDE_WING_DEPTH,
  STAGE_CENTER,
  STAGE_DEPTH_M,
  STAGE_QUARTERS,
  STAGE_WIDTH_M,
  UPSTAGE_WING_DEPTH,
} from './stage.ts';

// The wings are part of the plan, the audience isn't: y stops at the downstage edge.
export const PLAN_BOUNDS = {
  minX: -SIDE_WING_DEPTH,
  maxX: 1 + SIDE_WING_DEPTH,
  minY: -UPSTAGE_WING_DEPTH,
  maxY: 1,
} as const;

export const SNAP_DISTANCE_M = 0.25;

const GUIDES = [STAGE_QUARTERS[0], STAGE_CENTER, STAGE_QUARTERS[1]];

export type PositionsUpdate = { positions: Position[] };

export function isInsidePlan({ x, y }: StagePoint): boolean {
  const { minX, maxX, minY, maxY } = PLAN_BOUNDS;
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// The delta is cut down so the whole group stops at the edge together and keeps its shape.
export function moveGroup<T extends StagePoint>(points: T[], delta: StagePoint): T[] {
  const { minX, maxX, minY, maxY } = PLAN_BOUNDS;
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const dx = clamp(delta.x, minX - Math.min(...xs), maxX - Math.max(...xs));
  const dy = clamp(delta.y, minY - Math.min(...ys), maxY - Math.max(...ys));
  // Clamping each point again keeps float error from landing a hair past the edge.
  return points.map((point) => ({
    ...point,
    x: clamp(point.x + dx, minX, maxX),
    y: clamp(point.y + dy, minY, maxY),
  }));
}

function snapAxis(value: number, metresPerUnit: number): number {
  const guide = GUIDES.find((at) => Math.abs(value - at) * metresPerUnit <= SNAP_DISTANCE_M);
  return guide ?? value;
}

export function snapToGuides({ x, y }: StagePoint): StagePoint {
  return { x: snapAxis(x, STAGE_WIDTH_M), y: snapAxis(y, STAGE_DEPTH_M) };
}

function parsePosition(value: unknown): Position | null {
  if (typeof value !== 'object' || value === null) return null;
  const { castMemberId, x, y } = value as Record<string, unknown>;
  if (typeof castMemberId !== 'string' || castMemberId.length === 0) return null;
  if (typeof x !== 'number' || typeof y !== 'number') return null;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !isInsidePlan({ x, y })) return null;
  return { castMemberId, x, y };
}

// Whether each cast member belongs to the dance is the route's check.
export function parsePositionsUpdate(value: unknown): PositionsUpdate | null {
  if (typeof value !== 'object' || value === null) return null;
  const { positions: raw } = value as Record<string, unknown>;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const positions = raw.map(parsePosition);
  if (positions.some((position) => position === null)) return null;
  const parsed = positions as Position[];
  if (new Set(parsed.map(({ castMemberId }) => castMemberId)).size !== parsed.length) return null;
  return { positions: parsed };
}
