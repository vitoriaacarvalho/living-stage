import { APP_NAME, type HealthResponse, type School } from '@living-stage/shared';
import { useEffect, useState } from 'react';
import { fetchHealth } from './api/health.ts';
import { authClient } from './auth/client.ts';
import { Access } from './auth/Access.tsx';
import { SignOutButton } from './auth/SignOutButton.tsx';
import { NoSchool } from './schools/NoSchool.tsx';
import { useSchools } from './schools/useSchools.ts';
import { CardPage } from './ui/CardPage.tsx';

type ApiStatus = HealthResponse | 'loading' | 'unreachable';

export function App() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return null;
  return session ? <SignedIn userName={session.user.name} /> : <Access />;
}

function SignedIn({ userName }: { userName: string }) {
  const { state, addSchool } = useSchools();

  if (state.status === 'loading') return null;
  if (state.status === 'failed') return <SchoolsUnavailable />;
  const [school] = state.schools;
  if (!school) return <NoSchool onCreated={addSchool} />;
  return <Home userName={userName} school={school} />;
}

function SchoolsUnavailable() {
  return (
    <CardPage>
      <p role="alert">Could not load your schools. Reload the page to try again.</p>
      <SignOutButton />
    </CardPage>
  );
}

function Home({ userName, school }: { userName: string; school: School }) {
  const apiStatus = useApiStatus();

  return (
    <main>
      <h1>{APP_NAME}</h1>
      <p>{school.name}</p>
      <p>{userName}</p>
      <SignOutButton />
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
