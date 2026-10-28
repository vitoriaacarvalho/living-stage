import type {
  Dance,
  DanceInput,
  DanceResponse,
  DanceUpdate,
  ListDancesResponse,
} from '@living-stage/shared';

export async function fetchDances(schoolId: string, signal: AbortSignal): Promise<Dance[]> {
  const res = await fetch(`/api/schools/${schoolId}/dances`, { signal });
  if (!res.ok) throw new Error(`GET dances answered ${res.status}`);
  const body: ListDancesResponse = await res.json();
  return body.dances;
}

export async function createDance(schoolId: string, input: DanceInput): Promise<Dance> {
  const res = await fetch(`/api/schools/${schoolId}/dances`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`POST dance answered ${res.status}`);
  const body: DanceResponse = await res.json();
  return body.dance;
}

export async function updateDance(
  schoolId: string,
  danceId: string,
  update: DanceUpdate,
): Promise<Dance> {
  const res = await fetch(`/api/schools/${schoolId}/dances/${danceId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error(`PATCH dance answered ${res.status}`);
  const body: DanceResponse = await res.json();
  return body.dance;
}

export async function deleteDance(schoolId: string, danceId: string): Promise<void> {
  const res = await fetch(`/api/schools/${schoolId}/dances/${danceId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE dance answered ${res.status}`);
}
