import type { CastMember } from './cast.ts';
import { DANCER_COLOR_COUNT, type DancerColor } from './dancer.ts';

// The last dancer color (stone) is kept for dancers with no role; roles cycle through the others.
export const NO_ROLE_COLOR: DancerColor = DANCER_COLOR_COUNT;
const ROLE_COLOR_COUNT = DANCER_COLOR_COUNT - 1;

export type RoleColor = { role: string; color: DancerColor };

function sameRole(a: string, b: string): boolean {
  return a.toLocaleLowerCase() === b.toLocaleLowerCase();
}

export function roleColors(cast: CastMember[]): RoleColor[] {
  return cast.reduce<RoleColor[]>((colors, { role }) => {
    if (role === null || colors.some((known) => sameRole(known.role, role))) return colors;
    return [...colors, { role, color: (colors.length % ROLE_COLOR_COUNT) + 1 }];
  }, []);
}

export function roleColor(colors: RoleColor[], role: string | null): DancerColor {
  if (role === null) return NO_ROLE_COLOR;
  return colors.find((known) => sameRole(known.role, role))?.color ?? NO_ROLE_COLOR;
}
