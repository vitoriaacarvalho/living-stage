import type { DancerColor } from './dancer.ts';
import type { StagePoint } from './figure.ts';
import { parseDurationMs } from './running-time.ts';

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
  durationMs?: number | null;
};

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return values.includes(value as T);
}

// One spot of the first figure, colored by the dance's color mode, for the card thumbnail.
export type DancePreviewSpot = StagePoint & { color: DancerColor | null; open: boolean };

// showTitles names the shows the dance is in, for the warning before deleting it.
export type DanceSummary = Dance & {
  castCount: number;
  preview: DancePreviewSpot[];
  showTitles: string[];
};

export type ListDancesResponse = { dances: DanceSummary[] };

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
  if (body.durationMs !== undefined) {
    const durationMs = parseDurationMs(body.durationMs);
    if (durationMs === undefined) return null;
    update.durationMs = durationMs;
  }
  return Object.keys(update).length > 0 ? update : null;
}
