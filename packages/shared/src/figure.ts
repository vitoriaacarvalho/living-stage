import type { Path } from './path.ts';
import { SIDE_WING_DEPTH } from './stage.ts';

export type StagePoint = { x: number; y: number };

export type Position = StagePoint & { castMemberId: string };

export type FigurePosition = Position & { figureId: string };

// transitionMs is the time to arrive from the figure before; the first figure's is unused.
// paths are the bent routes into this figure; a cast member without one walks straight.
export type Figure = {
  id: string;
  order: number;
  name: string | null;
  transitionMs: number;
  positions: Position[];
  paths: Path[];
};

export type ListFiguresResponse = { figures: Figure[] };

export type FigureResponse = { figure: Figure };

// A new figure copies an existing one: 'end' adds it after the last figure (New figure),
// 'after' right after the one it copies (Duplicate).
export type FigureCopy = { copyOf: string; placement: 'end' | 'after' };

export function parseFigureCopy(value: unknown): FigureCopy | null {
  if (typeof value !== 'object' || value === null) return null;
  const { copyOf, placement } = value as Record<string, unknown>;
  if (typeof copyOf !== 'string' || copyOf.length === 0) return null;
  if (placement !== 'end' && placement !== 'after') return null;
  return { copyOf, placement };
}

export const FIGURE_NAME_MAX_LENGTH = 40;

export const TRANSITION_MIN_MS = 1000;
export const TRANSITION_MAX_MS = 30_000;
export const TRANSITION_STEP_MS = 500;

// At least one of the two is set.
export type FigureUpdate = { name?: string | null; transitionMs?: number };

// Every figure of the dance, each once, in the new order.
export type FigureOrder = { figureIds: string[] };

export const WING_SPOTS = 10;

const wingX = -SIDE_WING_DEPTH / 2;

// Newly cast dancers wait in the left wing, one per spot down its length; once
// every spot is taken they start sharing from the top again.
export function nextWingSpot(taken: StagePoint[]): StagePoint {
  const spots = Array.from({ length: WING_SPOTS }, (_, index) => ({
    x: wingX,
    y: (index + 0.5) / WING_SPOTS,
  }));
  const isTaken = (spot: StagePoint) =>
    taken.some(({ x, y }) => Math.abs(x - spot.x) < 1e-9 && Math.abs(y - spot.y) < 1e-9);
  return spots.find((spot) => !isTaken(spot)) ?? spots[taken.length % WING_SPOTS]!;
}

// Blank means no name, so the figure shows as "Figure N" again.
export function parseFigureName(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const name = value.trim();
  if (name.length > FIGURE_NAME_MAX_LENGTH) return undefined;
  return name.length === 0 ? null : name;
}

export function parseTransitionMs(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  if (value < TRANSITION_MIN_MS || value > TRANSITION_MAX_MS) return null;
  return value % TRANSITION_STEP_MS === 0 ? value : null;
}

export function parseFigureUpdate(value: unknown): FigureUpdate | null {
  if (typeof value !== 'object' || value === null) return null;
  const body = value as Record<string, unknown>;
  const update: FigureUpdate = {};
  if (body.name !== undefined) {
    const name = parseFigureName(body.name);
    if (name === undefined) return null;
    update.name = name;
  }
  if (body.transitionMs !== undefined) {
    const transitionMs = parseTransitionMs(body.transitionMs);
    if (transitionMs === null) return null;
    update.transitionMs = transitionMs;
  }
  return Object.keys(update).length > 0 ? update : null;
}

export function parseFigureOrder(value: unknown): FigureOrder | null {
  if (typeof value !== 'object' || value === null) return null;
  const { figureIds } = value as Record<string, unknown>;
  if (!Array.isArray(figureIds) || figureIds.length === 0) return null;
  if (!figureIds.every((id) => typeof id === 'string' && id.length > 0)) return null;
  if (new Set(figureIds).size !== figureIds.length) return null;
  return { figureIds };
}
