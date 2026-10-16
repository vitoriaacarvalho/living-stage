import type { School } from './school.ts';

// No 0, 1, I, L or O: a code read aloud or copied from a screen can't be mistyped.
export const INVITE_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const INVITE_CODE_LENGTH = 8;
export const INVITE_VALID_DAYS = 7;

export type Invite = { code: string; expiresAt: string };

export type SchoolInviteResponse = { invite: Invite | null };

export type CreateInviteResponse = { invite: Invite };

export type InvitePreviewResponse = { school: { name: string } };

export type JoinSchoolResponse = { school: School };

export function parseInviteCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.replace(/[\s-]/g, '').toUpperCase();
  if (code.length !== INVITE_CODE_LENGTH) return null;
  if ([...code].some((char) => !INVITE_CODE_ALPHABET.includes(char))) return null;
  return code;
}

export function formatInviteCode(code: string): string {
  const half = INVITE_CODE_LENGTH / 2;
  return `${code.slice(0, half)}-${code.slice(half)}`;
}
