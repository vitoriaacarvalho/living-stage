import { APP_NAME, type HealthResponse } from '@living-stage/shared';
import { useEffect, useState } from 'react';
import { fetchHealth } from './api/health.ts';

type ApiStatus = HealthResponse | 'loading' | 'unreachable';

export function App() {
  const apiStatus = useApiStatus();

  return (
    <main>
      <h1>{APP_NAME}</h1>
      <p>{describe(apiStatus)}</p>
    </main>
  );
}

function useApiStatus(): ApiStatus {
  const [status, setStatus] = useState<ApiStatus>('loading');

  useEffect(() => {
    const controller = new AbortController();
    fetchHealth(controller.signal)
      .then(setStatus)
      .catch(() => {
        if (!controller.signal.aborted) setStatus('unreachable');
      });
    return () => controller.abort();
  }, []);

  return status;
}

function describe(status: ApiStatus): string {
  if (status === 'loading') return 'Checking API…';
  if (status === 'unreachable') return 'API: unreachable';
  return `API: ok · database: ${status.database}`;
}
