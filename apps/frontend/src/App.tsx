import { APP_NAME, type HealthResponse, type School } from '@living-stage/shared';
import { useEffect, useState } from 'react';
import { fetchHealth } from './api/health.ts';
import { authClient } from './auth/client.ts';
import { Access } from './auth/Access.tsx';
import { SignOutButton } from './auth/SignOutButton.tsx';
import { InviteTeachers } from './schools/InviteTeachers.tsx';
import { readJoinCode } from './schools/join-link.ts';
import { JoinFromLink } from './schools/JoinFromLink.tsx';
import { NoSchool } from './schools/NoSchool.tsx';
import { useSchools } from './schools/useSchools.ts';
import { Button } from './ui/Button.tsx';
import { CardPage } from './ui/CardPage.tsx';

type ApiStatus = HealthResponse | 'loading' | 'unreachable';

export function App() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return null;
  return session ? <SignedIn userName={session.user.name} /> : <Access />;
}

function SignedIn({ userName }: { userName: string }) {
  const { state, addSchool } = useSchools();
  const [joinCode, setJoinCode] = useState(() => readJoinCode(window.location.pathname));

  function leaveJoinLink() {
    window.history.replaceState(null, '', '/');
    setJoinCode(null);
  }

  function joinFromLink(school: School) {
    addSchool(school);
    leaveJoinLink();
  }

  if (state.status === 'loading') return null;
  if (state.status === 'failed') return <SchoolsUnavailable />;
  if (joinCode) {
    return <JoinFromLink code={joinCode} onJoined={joinFromLink} onDismiss={leaveJoinLink} />;
  }
  const [school] = state.schools;
  if (!school) return <NoSchool onSchool={addSchool} />;
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
  const [inviting, setInviting] = useState(false);

  if (inviting) {
    return (
      <CardPage>
        <InviteTeachers schoolId={school.id} onDone={() => setInviting(false)} />
      </CardPage>
    );
  }
  return (
    <main>
      <h1>{APP_NAME}</h1>
      <p>{school.name}</p>
      <p>{userName}</p>
      <Button variant="secondary" onClick={() => setInviting(true)}>
        Invite teachers
      </Button>
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
