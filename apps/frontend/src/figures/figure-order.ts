import type { Figure } from '@living-stage/shared';

export type Step = -1 | 1;

export function canMove(figures: Figure[], figureId: string, step: Step) {
  const to = figures.findIndex(({ id }) => id === figureId) + step;
  return to >= 0 && to < figures.length;
}

// The ids in their new order, with the figure swapped with its neighbour.
export function movedOrder(figures: Figure[], figureId: string, step: Step) {
  const ids = figures.map(({ id }) => id);
  const from = ids.indexOf(figureId);
  if (!canMove(figures, figureId, step)) return ids;
  ids.splice(from, 1);
  ids.splice(from + step, 0, figureId);
  return ids;
}
