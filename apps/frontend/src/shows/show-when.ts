import { formatRunningTime, type Show, type ShowSummary } from '@living-stage/shared';

// The date is a plain calendar day, so it is read and written in UTC to keep the day.
const day = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export function showWhen({ date, time }: Pick<Show, 'date' | 'time'>): string {
  const written = day.format(new Date(`${date}T00:00:00.000Z`));
  return time ? `${written}, ${time}` : written;
}

// The teacher's own calendar day, to tell which shows have been performed.
export function localDay(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// The running time joins in once any dance has a time.
export function showCounts({
  actCount,
  danceCount,
  totalMs,
}: Pick<ShowSummary, 'actCount' | 'danceCount' | 'totalMs'>) {
  const acts = actCount === 1 ? '1 act' : `${actCount} acts`;
  const dances = danceCount === 1 ? '1 dance' : `${danceCount} dances`;
  return totalMs > 0
    ? `${acts} · ${dances} · ${formatRunningTime(totalMs)}`
    : `${acts} · ${dances}`;
}
