import {
  roleColor,
  type CastMember,
  type ColorMode,
  type DancerColor,
  type RoleColor,
} from '@living-stage/shared';

// An open spot has no color in either mode; it is drawn as a dashed ring.
export function castMemberColor(
  { dancer, role }: CastMember,
  colorMode: ColorMode,
  colors: RoleColor[],
): DancerColor | null {
  if (!dancer) return null;
  return colorMode === 'role' ? roleColor(colors, role) : dancer.color;
}
