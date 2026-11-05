import type {
  Act,
  ActResponse,
  ActUpdate,
  ListShowsResponse,
  Show,
  ShowDetail,
  ShowDetailResponse,
  ShowInput,
  ShowResponse,
  ShowSummary,
  ShowUpdate,
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

async function send<T>(url: string, init: RequestInit & { what: string }): Promise<T> {
  const { what, ...request } = init;
  const res = await fetch(url, {
    ...request,
    headers: request.body ? { 'content-type': 'application/json' } : undefined,
  });
  if (!res.ok) throw new Error(`${request.method} ${what} answered ${res.status}`);
  return res.status === 204 ? (undefined as T) : res.json();
}

const showUrl = (schoolId: string, showId: string) => `/api/schools/${schoolId}/shows/${showId}`;

export async function updateShow(schoolId: string, showId: string, update: ShowUpdate) {
  const body = await send<ShowResponse>(showUrl(schoolId, showId), {
    method: 'PATCH',
    body: JSON.stringify(update),
    what: 'show',
  });
  return body.show;
}

export function deleteShow(schoolId: string, showId: string): Promise<void> {
  return send(showUrl(schoolId, showId), { method: 'DELETE', what: 'show' });
}

export async function addAct(schoolId: string, showId: string): Promise<Act> {
  const body = await send<ActResponse>(`${showUrl(schoolId, showId)}/acts`, {
    method: 'POST',
    what: 'act',
  });
  return body.act;
}

export type ActRef = { schoolId: string; showId: string; actId: string };

const actUrl = ({ schoolId, showId, actId }: ActRef) =>
  `${showUrl(schoolId, showId)}/acts/${actId}`;

export async function updateAct(ref: ActRef, update: ActUpdate): Promise<Act> {
  const body = await send<ActResponse>(actUrl(ref), {
    method: 'PATCH',
    body: JSON.stringify(update),
    what: 'act',
  });
  return body.act;
}

export function deleteAct(ref: ActRef): Promise<void> {
  return send(actUrl(ref), { method: 'DELETE', what: 'act' });
}
