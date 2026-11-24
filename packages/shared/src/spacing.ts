import type { StagePoint } from './figure.ts';
import { STAGE_DEPTH_M, STAGE_WIDTH_M } from './stage.ts';

// Low enough to follow a tight formation, high enough that a pair stacked on purpose doesn't decide it.
const CROWDED_PERCENTILE = 0.2;

export function metresApart(a: StagePoint, b: StagePoint): number {
  return Math.hypot((a.x - b.x) * STAGE_WIDTH_M, (a.y - b.y) * STAGE_DEPTH_M);
}

function nearestNeighbourM(spot: StagePoint, formation: StagePoint[]): number {
  return Math.min(...formation.filter((other) => other !== spot).map((o) => metresApart(spot, o)));
}

function tightSpacingM(formation: StagePoint[]): number {
  const gaps = formation.map((spot) => nearestNeighbourM(spot, formation)).sort((a, b) => a - b);
  return gaps[Math.floor(CROWDED_PERCENTILE * (gaps.length - 1))]!;
}

// The spacing of the most crowded formation, or null when no formation has two dancers.
export function crowdedSpacingM(formations: StagePoint[][]): number | null {
  const spacings = formations.filter((spots) => spots.length >= 2).map(tightSpacingM);
  return spacings.length > 0 ? Math.min(...spacings) : null;
}
