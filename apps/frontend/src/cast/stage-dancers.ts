import type { CastMember, Position } from '@living-stage/shared';
import type { StageDancer } from '../stage/Stage.tsx';

export function stageDancers(cast: CastMember[], positions: Position[]): StageDancer[] {
  return cast.flatMap(({ id, dancer }) => {
    const position = positions.find(({ castMemberId }) => castMemberId === id);
    if (!position) return [];
    const { x, y } = position;
    return [
      { id, label: dancer?.name ?? 'Open spot', color: dancer?.color ?? null, x, y, open: !dancer },
    ];
  });
}
