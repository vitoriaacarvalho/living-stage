import type { Figure, Position } from './figure.ts';

// Until music pins figures to the song (E4), every transition takes the same time.
export const TRANSITION_MS = 4000;

export type StageMoment = {
  positions: Position[];
  from: Figure;
  to: Figure;
  // Linear time between the two figures, 0 to 1; the positions are eased.
  progress: number;
};

export function easeInOutCubic(progress: number): number {
  return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
}

export function figureTimeMs(index: number): number {
  return index * TRANSITION_MS;
}

export function playbackLengthMs(figures: Figure[]): number {
  return figureTimeMs(Math.max(0, figures.length - 1));
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Figures come in their dance order. A dancer missing from one side of the move stays put.
export function stageAt(figures: Figure[], timeMs: number): StageMoment | null {
  if (figures.length === 0) return null;
  const last = figures.length - 1;
  const time = clamp(timeMs, 0, playbackLengthMs(figures));
  const index = Math.min(Math.floor(time / TRANSITION_MS), Math.max(0, last - 1));
  const from = figures[index]!;
  const to = figures[Math.min(index + 1, last)]!;
  const progress = from === to ? 0 : (time - figureTimeMs(index)) / TRANSITION_MS;
  return { positions: between(from, to, easeInOutCubic(progress)), from, to, progress };
}

function between(from: Figure, to: Figure, eased: number): Position[] {
  const moving = from.positions.map((start) => {
    const end = to.positions.find(({ castMemberId }) => castMemberId === start.castMemberId);
    if (!end) return start;
    return {
      castMemberId: start.castMemberId,
      x: start.x + (end.x - start.x) * eased,
      y: start.y + (end.y - start.y) * eased,
    };
  });
  const arriving = to.positions.filter(
    ({ castMemberId }) => !from.positions.some((start) => start.castMemberId === castMemberId),
  );
  return [...moving, ...arriving];
}
