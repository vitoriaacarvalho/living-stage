import type {
  CastMember,
  CastMemberInput,
  CastMemberResponse,
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
): Promise<CastMember> {
  const res = await fetch(`/api/schools/${schoolId}/dances/${danceId}/cast`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`POST cast member answered ${res.status}`);
  const body: CastMemberResponse = await res.json();
  return body.castMember;
}
