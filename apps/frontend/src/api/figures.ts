import type { Figure, FigureCopy, FigureResponse, ListFiguresResponse } from '@living-stage/shared';

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

export async function copyFigure(
  schoolId: string,
  danceId: string,
  copy: FigureCopy,
): Promise<Figure> {
  const res = await fetch(`/api/schools/${schoolId}/dances/${danceId}/figures`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(copy),
  });
  if (!res.ok) throw new Error(`POST figure answered ${res.status}`);
  const body: FigureResponse = await res.json();
  return body.figure;
}
