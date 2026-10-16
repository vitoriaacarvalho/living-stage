import type {
  CreateSchoolRequest,
  CreateSchoolResponse,
  ListSchoolsResponse,
  School,
} from '@living-stage/shared';

export async function fetchSchools(signal: AbortSignal): Promise<School[]> {
  const res = await fetch('/api/schools', { signal });
  if (!res.ok) throw new Error(`GET /api/schools answered ${res.status}`);
  const body: ListSchoolsResponse = await res.json();
  return body.schools;
}

export async function createSchool(request: CreateSchoolRequest): Promise<School> {
  const res = await fetch('/api/schools', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`POST /api/schools answered ${res.status}`);
  const body: CreateSchoolResponse = await res.json();
  return body.school;
}
