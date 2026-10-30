import {
  roleColors,
  type CastMember,
  type Dance,
  type LabelMode,
  type Position,
} from '@living-stage/shared';
import type { StageDancer } from '../stage/Stage.tsx';
import { castMemberColor } from './cast-color.ts';

export type StageView = Pick<Dance, 'labelMode' | 'colorMode'>;

export function stageDancers(
  cast: CastMember[],
  positions: Position[],
  { labelMode, colorMode }: StageView,
): StageDancer[] {
  const colors = roleColors(cast);
  return cast.flatMap((castMember) => {
    const position = positions.find(({ castMemberId }) => castMemberId === castMember.id);
    if (!position) return [];
    const { x, y } = position;
    return [
      {
        id: castMember.id,
        ...labels(castMember, labelMode),
        color: castMemberColor(castMember, colorMode, colors),
        x,
        y,
        open: !castMember.dancer,
      },
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
