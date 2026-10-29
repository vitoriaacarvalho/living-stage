import type { Dancer } from './dancer.ts';

export const CAST_ROLE_MAX_LENGTH = 40;

// dancer is null once she is removed from the roster: her spot stays as a placeholder (B5).
export type CastMember = { id: string; dancer: Dancer | null; role: string | null };

export type CastMemberInput = { dancerId: string; role: string | null };

export type ListCastResponse = { cast: CastMember[] };

export type CastMemberResponse = { castMember: CastMember };

export function parseCastRole(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const role = value.trim();
  if (role.length > CAST_ROLE_MAX_LENGTH) return undefined;
  return role.length === 0 ? null : role;
}

export function parseCastMemberInput(value: unknown): CastMemberInput | null {
  if (typeof value !== 'object' || value === null) return null;
  const { dancerId, role: rawRole = null } = value as Record<string, unknown>;
  if (typeof dancerId !== 'string' || dancerId.length === 0) return null;
  const role = parseCastRole(rawRole);
  if (role === undefined) return null;
  return { dancerId, role };
}
