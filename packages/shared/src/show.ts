import type { DancePreviewSpot } from './dance.ts';
import { parseIntervalMs } from './running-time.ts';

export const SHOW_TITLE_MAX_LENGTH = 100;
export const SHOW_VENUE_MAX_LENGTH = 100;
export const ACT_NAME_MAX_LENGTH = 40;

// date is a calendar day (YYYY-MM-DD) and time a wall-clock time (HH:MM), both as typed,
// so a show at 19:00 stays at 19:00 whatever the device's time zone.
export type Show = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  venue: string | null;
  // One interval between every two acts; 0 means none.
  intervalMs: number;
  createdAt: string;
};

export type ShowSummary = Show & {
  actCount: number;
  danceCount: number;
  totalMs: number;
  preview: DancePreviewSpot[];
};

// name is null for an open spot.
export type ShowCastMember = { id: string; name: string | null; role: string | null };

// id is the dance's place in the act, not the dance itself.
export type ShowDance = {
  id: string;
  danceId: string;
  title: string;
  castCount: number;
  durationMs: number | null;
  cast: ShowCastMember[];
};

export type Act = { id: string; order: number; name: string | null; dances: ShowDance[] };

export type ShowDetail = Show & { acts: Act[] };

export type ShowInput = {
  title: string;
  date: string;
  time: string | null;
  venue: string | null;
  intervalMs: number;
};

// At least one field is set.
export type ShowUpdate = Partial<ShowInput>;

export type ActUpdate = { name: string | null };

export type ActDanceInput = { danceId: string };

// The whole running order: every act in order, each with its dances' places (ShowDance.id).
export type ActLayout = { id: string; danceIds: string[] };
export type ShowOrder = { acts: ActLayout[] };

export type ListShowsResponse = { shows: ShowSummary[] };
export type ShowResponse = { show: Show };
export type ShowDetailResponse = { show: ShowDetail };
export type ActResponse = { act: Act };
export type ActDanceResponse = { dance: ShowDance };

function trimmed(value: unknown, max: number): string | null | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (text.length > max) return undefined;
  return text.length === 0 ? null : text;
}

export function parseShowTitle(value: unknown): string | null {
  return trimmed(value, SHOW_TITLE_MAX_LENGTH) ?? null;
}

// Blank means no venue; undefined means the value is not a venue at all.
export function parseShowVenue(value: unknown): string | null | undefined {
  if (value === null) return null;
  return trimmed(value, SHOW_VENUE_MAX_LENGTH);
}

export function parseShowDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return real ? value : null;
}

// Blank means no time; undefined means the value is not a time at all.
export function parseShowTime(value: unknown): string | null | undefined {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') return undefined;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return undefined;
  return value;
}

export function parseShowInput(value: unknown): ShowInput | null {
  if (typeof value !== 'object' || value === null) return null;
  const body = value as Record<string, unknown>;
  const title = parseShowTitle(body.title);
  const date = parseShowDate(body.date);
  const time = parseShowTime(body.time ?? null);
  const venue = parseShowVenue(body.venue ?? null);
  const intervalMs = parseIntervalMs(body.intervalMs ?? 0);
  if (!title || !date || time === undefined || venue === undefined) return null;
  if (intervalMs === undefined) return null;
  return { title, date, time, venue, intervalMs };
}

export function parseShowUpdate(value: unknown): ShowUpdate | null {
  if (typeof value !== 'object' || value === null) return null;
  const body = value as Record<string, unknown>;
  const update: ShowUpdate = {};
  if (body.title !== undefined) {
    const title = parseShowTitle(body.title);
    if (!title) return null;
    update.title = title;
  }
  if (body.date !== undefined) {
    const date = parseShowDate(body.date);
    if (!date) return null;
    update.date = date;
  }
  if (body.time !== undefined) {
    const time = parseShowTime(body.time);
    if (time === undefined) return null;
    update.time = time;
  }
  if (body.venue !== undefined) {
    const venue = parseShowVenue(body.venue);
    if (venue === undefined) return null;
    update.venue = venue;
  }
  if (body.intervalMs !== undefined) {
    const intervalMs = parseIntervalMs(body.intervalMs);
    if (intervalMs === undefined) return null;
    update.intervalMs = intervalMs;
  }
  return Object.keys(update).length > 0 ? update : null;
}

export function parseActUpdate(value: unknown): ActUpdate | null {
  if (typeof value !== 'object' || value === null) return null;
  const { name } = value as Record<string, unknown>;
  if (name === null) return { name: null };
  const parsed = trimmed(name, ACT_NAME_MAX_LENGTH);
  return parsed === undefined ? null : { name: parsed };
}

export function parseActDanceInput(value: unknown): ActDanceInput | null {
  if (typeof value !== 'object' || value === null) return null;
  const { danceId } = value as Record<string, unknown>;
  return typeof danceId === 'string' && danceId.length > 0 ? { danceId } : null;
}

// today is the local calendar day as YYYY-MM-DD, so "past" follows the teacher's own day.
export function isPerformed(show: Pick<Show, 'date'>, today: string): boolean {
  return show.date < today;
}

// Upcoming shows first, soonest first; then past ones, most recent first.
export function inShowOrder<T extends Pick<Show, 'date' | 'time'>>(shows: T[], today: string): T[] {
  const when = (show: T) => `${show.date} ${show.time ?? ''}`;
  const upcoming = shows.filter((show) => !isPerformed(show, today));
  const past = shows.filter((show) => isPerformed(show, today));
  upcoming.sort((a, b) => when(a).localeCompare(when(b)));
  past.sort((a, b) => when(b).localeCompare(when(a)));
  return [...upcoming, ...past];
}

const isId = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

// Whether the ids are exactly the show's own is the route's check.
export function parseShowOrder(value: unknown): ShowOrder | null {
  if (typeof value !== 'object' || value === null) return null;
  const { acts } = value as Record<string, unknown>;
  if (!Array.isArray(acts) || acts.length === 0) return null;
  const parsed: ActLayout[] = [];
  for (const act of acts) {
    if (typeof act !== 'object' || act === null) return null;
    const { id, danceIds } = act as Record<string, unknown>;
    if (!isId(id) || !Array.isArray(danceIds) || !danceIds.every(isId)) return null;
    parsed.push({ id, danceIds });
  }
  const danceIds = parsed.flatMap((act) => act.danceIds);
  if (new Set(parsed.map(({ id }) => id)).size !== parsed.length) return null;
  if (new Set(danceIds).size !== danceIds.length) return null;
  return { acts: parsed };
}
