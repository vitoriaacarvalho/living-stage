export const SCHOOL_NAME_MAX_LENGTH = 100;

export type CreateSchoolRequest = { name: string };

export type School = { id: string; name: string; createdAt: string };

export type CreateSchoolResponse = { school: School };

export type ListSchoolsResponse = { schools: School[] };

export function parseSchoolName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  if (name.length === 0 || name.length > SCHOOL_NAME_MAX_LENGTH) return null;
  return name;
}
