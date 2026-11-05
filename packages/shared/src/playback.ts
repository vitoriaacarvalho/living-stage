import type { Figure, Position } from './figure.ts';

// A new figure's time to arrive, until the teacher changes it or music pins figures (E4).
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

// The first figure starts at 0, so its own time to arrive never counts.
export function figureTimeMs(figures: Figure[], index: number): number {
  return figures.slice(1, index + 1).reduce((sum, { transitionMs }) => sum + transitionMs, 0);
}

export function playbackLengthMs(figures: Figure[]): number {
  return figureTimeMs(figures, figures.length - 1);
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Figures come in their dance order. A dancer missing from one side of the move stays put.
export function stageAt(figures: Figure[], timeMs: number): StageMoment | null {
  if (figures.length === 0) return null;
  const last = figures.length - 1;
  const time = clamp(timeMs, 0, playbackLengthMs(figures));
  let index = 0;
  let start = 0;
  while (index < last - 1 && start + figures[index + 1]!.transitionMs <= time) {
    index += 1;
    start += figures[index]!.transitionMs;
  }
  const from = figures[index]!;
  const to = figures[Math.min(index + 1, last)]!;
  const progress = from === to ? 0 : (time - start) / to.transitionMs;
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
