export const DURATION_MAX_MS = 60 * 60_000;
export const INTERVAL_MAX_MS = 60 * 60_000;

// A dance's duration: whole seconds up to an hour, or null to clear it.
// undefined means the value is not a duration at all.
export function parseDurationMs(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value)) return undefined;
  if (value < 1000 || value > DURATION_MAX_MS || value % 1000 !== 0) return undefined;
  return value;
}

// The interval between acts: whole minutes up to an hour.
export function parseIntervalMs(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value)) return undefined;
  if (value < 0 || value > INTERVAL_MAX_MS || value % 60_000 !== 0) return undefined;
  return value;
}

// What the teacher types: m:ss, such as 3:40. Blank clears it.
export function parseDurationText(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(trimmed);
  if (!match) return undefined;
  return parseDurationMs((Number(match[1]) * 60 + Number(match[2])) * 1000);
}

const pad = (value: number) => String(value).padStart(2, '0');

// 3:40, or 1:02:30 past an hour; a missing time shows as –:––.
export function formatDuration(ms: number | null): string {
  if (ms === null) return '–:––';
  const seconds = Math.round(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
}

// 57min 15s, or 1h 15min past an hour.
export function formatRunningTime(ms: number): string {
  const seconds = Math.round(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  return rest > 0 ? `${minutes}min ${rest}s` : `${minutes}min`;
}

type Timed = { dances: { durationMs: number | null }[] };

export type RunningTime = {
  acts: number[];
  intervals: number;
  totalMs: number;
  untimed: number;
};

// Every gap between two acts holds one interval.
export function runningTime(acts: Timed[], intervalMs: number): RunningTime {
  const totals = acts.map(({ dances }) =>
    dances.reduce((sum, { durationMs }) => sum + (durationMs ?? 0), 0),
  );
  const intervals = Math.max(0, acts.length - 1);
  return {
    acts: totals,
    intervals,
    totalMs: totals.reduce((sum, ms) => sum + ms, 0) + intervals * intervalMs,
    untimed: acts.flatMap(({ dances }) => dances).filter(({ durationMs }) => durationMs === null)
      .length,
  };
}
