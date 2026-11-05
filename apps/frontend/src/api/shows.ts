import type {
  ListShowsResponse,
  Show,
  ShowDetail,
  ShowDetailResponse,
  ShowInput,
  ShowResponse,
  ShowSummary,
} from '@living-stage/shared';

export async function fetchShows(schoolId: string, signal: AbortSignal): Promise<ShowSummary[]> {
  const res = await fetch(`/api/schools/${schoolId}/shows`, { signal });
  if (!res.ok) throw new Error(`GET shows answered ${res.status}`);
  const body: ListShowsResponse = await res.json();
  return body.shows;
}

export async function createShow(schoolId: string, input: ShowInput): Promise<Show> {
  const res = await fetch(`/api/schools/${schoolId}/shows`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`POST show answered ${res.status}`);
  const body: ShowResponse = await res.json();
  return body.show;
}

export async function fetchShow(
  schoolId: string,
  showId: string,
  signal: AbortSignal,
): Promise<ShowDetail> {
  const res = await fetch(`/api/schools/${schoolId}/shows/${showId}`, { signal });
  if (!res.ok) throw new Error(`GET show answered ${res.status}`);
  const body: ShowDetailResponse = await res.json();
  return body.show;
}
