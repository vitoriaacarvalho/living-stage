import type { CastMember } from './cast.ts';
import type { ColorMode, DancePreviewSpot } from './dance.ts';
import type { Position } from './figure.ts';
import { castMemberColor, roleColors } from './role-color.ts';

// Cast in its listed order, so role colors match the ones the editor gives.
export function dancePreview(
  cast: CastMember[],
  positions: Position[],
  colorMode: ColorMode,
): DancePreviewSpot[] {
  const colors = roleColors(cast);
  return positions.flatMap(({ castMemberId, x, y }) => {
    const member = cast.find(({ id }) => id === castMemberId);
    if (!member) return [];
    return [{ x, y, color: castMemberColor(member, colorMode, colors), open: !member.dancer }];
  });
}
