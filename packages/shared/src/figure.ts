import { SIDE_WING_DEPTH } from './stage.ts';

export type StagePoint = { x: number; y: number };

export type Position = StagePoint & { castMemberId: string };

export type FigurePosition = Position & { figureId: string };

export type Figure = { id: string; order: number; name: string | null; positions: Position[] };

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
