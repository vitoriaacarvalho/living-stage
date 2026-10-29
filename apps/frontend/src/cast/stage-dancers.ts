import type { CastMember, LabelMode, Position } from '@living-stage/shared';
import type { StageDancer } from '../stage/Stage.tsx';

export function stageDancers(
  cast: CastMember[],
  positions: Position[],
  labelMode: LabelMode,
): StageDancer[] {
  return cast.flatMap((castMember) => {
    const position = positions.find(({ castMemberId }) => castMemberId === castMember.id);
    if (!position) return [];
    const { id, dancer } = castMember;
    const { x, y } = position;
    return [
      { id, ...labels(castMember, labelMode), color: dancer?.color ?? null, x, y, open: !dancer },
    ];
  });
}

// A dancer with no role keeps her name in role mode, so every circle has a label.
function labels({ dancer, role }: CastMember, labelMode: LabelMode) {
  const name = dancer?.name ?? 'Open spot';
  if (labelMode === 'role') return { label: role ?? name, role: null };
  if (labelMode === 'both') return { label: name, role };
  return { label: name, role: null };
}
