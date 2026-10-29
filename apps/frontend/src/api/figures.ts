import type { Figure, ListFiguresResponse } from '@living-stage/shared';

export async function fetchFigures(
  schoolId: string,
  danceId: string,
  signal: AbortSignal,
): Promise<Figure[]> {
  const res = await fetch(`/api/schools/${schoolId}/dances/${danceId}/figures`, { signal });
  if (!res.ok) throw new Error(`GET figures answered ${res.status}`);
  const body: ListFiguresResponse = await res.json();
  return body.figures;
}
