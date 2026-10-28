export const DANCE_TITLE_MAX_LENGTH = 100;

export type Dance = { id: string; title: string; showGuides: boolean; createdAt: string };

export type DanceInput = { title: string };

export type DanceUpdate = { title?: string; showGuides?: boolean };

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

export function parseDanceUpdate(value: unknown): DanceUpdate | null {
  if (typeof value !== 'object' || value === null) return null;
  const body = value as Record<string, unknown>;
  const update: DanceUpdate = {};
  if (body.title !== undefined) {
    const title = parseDanceTitle(body.title);
    if (!title) return null;
    update.title = title;
  }
  if (body.showGuides !== undefined) {
    if (typeof body.showGuides !== 'boolean') return null;
    update.showGuides = body.showGuides;
  }
  return Object.keys(update).length > 0 ? update : null;
}
