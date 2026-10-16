import type {
  CreateInviteResponse,
  Invite,
  InvitePreviewResponse,
  JoinSchoolResponse,
  School,
  SchoolInviteResponse,
} from '@living-stage/shared';

export async function fetchInvite(schoolId: string, signal: AbortSignal): Promise<Invite | null> {
  const res = await fetch(`/api/schools/${schoolId}/invite`, { signal });
  if (!res.ok) throw new Error(`GET invite answered ${res.status}`);
  const body: SchoolInviteResponse = await res.json();
  return body.invite;
}

export async function createInvite(schoolId: string): Promise<Invite> {
  const res = await fetch(`/api/schools/${schoolId}/invite`, { method: 'POST' });
  if (!res.ok) throw new Error(`POST invite answered ${res.status}`);
  const body: CreateInviteResponse = await res.json();
  return body.invite;
}

/** Resolves to null when the code is unknown or has expired. */
export async function previewInvite(code: string, signal?: AbortSignal): Promise<string | null> {
  const res = await fetch(`/api/invites/${code}`, { signal });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /api/invites answered ${res.status}`);
  const body: InvitePreviewResponse = await res.json();
  return body.school.name;
}

export async function joinSchool(code: string): Promise<School> {
  const res = await fetch(`/api/invites/${code}/accept`, { method: 'POST' });
  if (!res.ok) throw new Error(`POST /api/invites/accept answered ${res.status}`);
  const body: JoinSchoolResponse = await res.json();
  return body.school;
}
