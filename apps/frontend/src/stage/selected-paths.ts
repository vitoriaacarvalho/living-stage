import type { Figure, Path } from '@living-stage/shared';
import type { StageAround, StagePath } from './PathLayer.tsx';

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
    const path = figure.paths.find(({ castMemberId }) => castMemberId === id);
    const around = path?.around && aroundOf(before, figure, path.around);
    return [
      { id, from: { x: from.x, y: from.y }, points: path?.points ?? [], ...(around && { around }) },
    ];
  });
}

// Like playback, a circle around someone with no spot in the figure before is walked
// straight, and the dancer circled is followed along her own bend, not her own circle.
function aroundOf(
  before: Figure,
  figure: Figure,
  { castMemberId, clockwise, turns }: NonNullable<Path['around']>,
): StageAround | undefined {
  const from = before.positions.find((position) => position.castMemberId === castMemberId);
  if (!from) return undefined;
  const points = figure.paths.find((each) => each.castMemberId === castMemberId)?.points ?? [];
  return { id: castMemberId, from: { x: from.x, y: from.y }, points, clockwise, turns };
}
