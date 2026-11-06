import type {
  Figure,
  FigureCopy,
  FigureOrder,
  FigureResponse,
  FigureUpdate,
  ListFiguresResponse,
  Path,
  PositionsUpdate,
} from '@living-stage/shared';

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

export async function updateFigure(
  schoolId: string,
  danceId: string,
  figureId: string,
  update: FigureUpdate,
): Promise<Figure> {
  const res = await fetch(`/api/schools/${schoolId}/dances/${danceId}/figures/${figureId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error(`PATCH figure answered ${res.status}`);
  const body: FigureResponse = await res.json();
  return body.figure;
}

export async function reorderFigures(
  schoolId: string,
  danceId: string,
  order: FigureOrder,
): Promise<Figure[]> {
  const res = await fetch(`/api/schools/${schoolId}/dances/${danceId}/figures/order`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(order),
  });
  if (!res.ok) throw new Error(`PUT figure order answered ${res.status}`);
  const body: ListFiguresResponse = await res.json();
  return body.figures;
}

export async function moveFigurePositions(
  schoolId: string,
  danceId: string,
  figureId: string,
  update: PositionsUpdate,
): Promise<Figure> {
  const res = await fetch(
    `/api/schools/${schoolId}/dances/${danceId}/figures/${figureId}/positions`,
    {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(update),
    },
  );
  if (!res.ok) throw new Error(`PUT figure positions answered ${res.status}`);
  const body: FigureResponse = await res.json();
  return body.figure;
}

export async function deleteFigure(
  schoolId: string,
  danceId: string,
  figureId: string,
): Promise<void> {
  const res = await fetch(`/api/schools/${schoolId}/dances/${danceId}/figures/${figureId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`DELETE figure answered ${res.status}`);
}

// A path with no points and no circle is straight, which is the same as having none.
export async function savePath(
  schoolId: string,
  danceId: string,
  figureId: string,
  { castMemberId, points, around }: Path,
): Promise<void> {
  const url = `/api/schools/${schoolId}/dances/${danceId}/figures/${figureId}/paths/${castMemberId}`;
  const body = around ? { around } : points.length > 0 ? { points } : null;
  const res = await fetch(
    url,
    body
      ? {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }
      : { method: 'DELETE' },
  );
  if (!res.ok) throw new Error(`${body ? 'PUT' : 'DELETE'} path answered ${res.status}`);
}
