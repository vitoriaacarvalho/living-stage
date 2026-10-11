import type { HealthResponse } from '@living-stage/shared';

// The API answers 503 with a HealthResponse body when the database is down, so the body is read whatever the status.
export async function fetchHealth(signal: AbortSignal): Promise<HealthResponse> {
  const res = await fetch('/api/health', { signal });
  return res.json();
}
