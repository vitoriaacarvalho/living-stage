import type { Figure } from '@living-stage/shared';
import type { StagePath } from './PathLayer.tsx';

// The routes into this figure of the selected dancers who had a spot in the figure before.
export function selectedPaths(
  figures: Figure[],
  figure: Figure,
  selectedIds: string[],
): StagePath[] {
  const before = figures[figures.indexOf(figure) - 1];
  if (!before) return [];
  return selectedIds.flatMap((id) => {
    const from = before.positions.find(({ castMemberId }) => castMemberId === id);
    if (!from) return [];
    const points = figure.paths.find(({ castMemberId }) => castMemberId === id)?.points ?? [];
    return [{ id, from: { x: from.x, y: from.y }, points }];
  });
}
