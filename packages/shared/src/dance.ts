export const DANCE_TITLE_MAX_LENGTH = 100;

const LABEL_MODES = ['name', 'role', 'both'] as const;

export type LabelMode = (typeof LABEL_MODES)[number];

const COLOR_MODES = ['dancer', 'role'] as const;

export type ColorMode = (typeof COLOR_MODES)[number];

export type Dance = {
  id: string;
  title: string;
  showGuides: boolean;
  labelMode: LabelMode;
  colorMode: ColorMode;
  createdAt: string;
};

export type DanceInput = { title: string };

export type DanceUpdate = {
  title?: string;
  showGuides?: boolean;
  labelMode?: LabelMode;
  colorMode?: ColorMode;
};

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return values.includes(value as T);
}

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
  if (body.labelMode !== undefined) {
    if (!isOneOf(LABEL_MODES, body.labelMode)) return null;
    update.labelMode = body.labelMode;
  }
  if (body.colorMode !== undefined) {
    if (!isOneOf(COLOR_MODES, body.colorMode)) return null;
    update.colorMode = body.colorMode;
  }
  return Object.keys(update).length > 0 ? update : null;
}
