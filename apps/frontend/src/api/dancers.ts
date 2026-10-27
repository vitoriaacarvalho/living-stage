import type {
  Dancer,
  DancerInput,
  DancerResponse,
  ListDancersResponse,
} from '@living-stage/shared';

export async function fetchDancers(schoolId: string, signal: AbortSignal): Promise<Dancer[]> {
  const res = await fetch(`/api/schools/${schoolId}/dancers`, { signal });
  if (!res.ok) throw new Error(`GET dancers answered ${res.status}`);
  const body: ListDancersResponse = await res.json();
  return body.dancers;
}

export async function createDancer(schoolId: string, input: DancerInput): Promise<Dancer> {
  const res = await fetch(`/api/schools/${schoolId}/dancers`, sendJson('POST', input));
  if (!res.ok) throw new Error(`POST dancer answered ${res.status}`);
  const body: DancerResponse = await res.json();
  return body.dancer;
}

export async function updateDancer(schoolId: string, dancer: Dancer): Promise<Dancer> {
  const { id, ...input } = dancer;
  const res = await fetch(`/api/schools/${schoolId}/dancers/${id}`, sendJson('PUT', input));
  if (!res.ok) throw new Error(`PUT dancer answered ${res.status}`);
  const body: DancerResponse = await res.json();
  return body.dancer;
}

export async function deleteDancer(schoolId: string, dancerId: string): Promise<void> {
  const res = await fetch(`/api/schools/${schoolId}/dancers/${dancerId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE dancer answered ${res.status}`);
}

function sendJson(method: string, body: unknown): RequestInit {
  return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}
