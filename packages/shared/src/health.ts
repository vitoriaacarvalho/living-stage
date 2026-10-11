export type HealthResponse =
  { status: 'ok'; database: 'ok' } | { status: 'error'; database: 'unreachable' };
