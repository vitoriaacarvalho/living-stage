export const DANCE_TITLE_MAX_LENGTH = 100;

export type Dance = { id: string; title: string; createdAt: string };

export type DanceInput = { title: string };

export type ListDancesResponse = { dances: Dance[] };

export type DanceResponse = { dance: Dance };

export function parseDanceTitle(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const title = value.trim();
  if (title.length === 0 || title.length > DANCE_TITLE_MAX_LENGTH) return null;
  return title;
}

export function parseDanceInput(value: unknown): DanceInput | null {
  if (typeof value !== 'object' || value === null) return null;
  const title = parseDanceTitle((value as Record<string, unknown>).title);
  return title ? { title } : null;
}
