import type {
  CastMember,
  CastMemberCreatedResponse,
  CastMemberInput,
  CastMemberResponse,
  CastMemberUpdate,
  ListCastResponse,
} from '@living-stage/shared';

export async function fetchCast(
  schoolId: string,
  danceId: string,
  signal: AbortSignal,
): Promise<CastMember[]> {
  const res = await fetch(`/api/schools/${schoolId}/dances/${danceId}/cast`, { signal });
  if (!res.ok) throw new Error(`GET cast answered ${res.status}`);
  const body: ListCastResponse = await res.json();
  return body.cast;
}

export async function addCastMember(
  schoolId: string,
  danceId: string,
  input: CastMemberInput,
): Promise<CastMemberCreatedResponse> {
  const res = await fetch(`/api/schools/${schoolId}/dances/${danceId}/cast`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`POST cast member answered ${res.status}`);
  return res.json();
}

export async function updateCastMember(
  schoolId: string,
  danceId: string,
  castMemberId: string,
  update: CastMemberUpdate,
): Promise<CastMember> {
  const res = await fetch(`/api/schools/${schoolId}/dances/${danceId}/cast/${castMemberId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error(`PATCH cast member answered ${res.status}`);
  const body: CastMemberResponse = await res.json();
  return body.castMember;
}

export async function removeCastMember(
  schoolId: string,
  danceId: string,
  castMemberId: string,
): Promise<void> {
  const res = await fetch(`/api/schools/${schoolId}/dances/${danceId}/cast/${castMemberId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`DELETE cast member answered ${res.status}`);
}
