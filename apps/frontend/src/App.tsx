import { APP_NAME, type HealthResponse, type School } from '@living-stage/shared';
import { useEffect, useState } from 'react';
import { fetchHealth } from './api/health.ts';
import { authClient } from './auth/client.ts';
import { Access } from './auth/Access.tsx';
import { SignOutButton } from './auth/SignOutButton.tsx';
import { DancerRoster } from './dancers/DancerRoster.tsx';
import { DanceList } from './dances/DanceList.tsx';
import { AddSchool } from './schools/AddSchool.tsx';
import { InviteTeachers } from './schools/InviteTeachers.tsx';
import { readJoinCode } from './schools/join-link.ts';
import { JoinFromLink } from './schools/JoinFromLink.tsx';
import { NoSchool } from './schools/NoSchool.tsx';
import { SchoolPicker } from './schools/SchoolPicker.tsx';
import { findChosenSchool, useChosenSchoolId } from './schools/useChosenSchool.ts';
import { useSchools } from './schools/useSchools.ts';
import { Button } from './ui/Button.tsx';
import { CardPage } from './ui/CardPage.tsx';
import formStyles from './ui/Form.module.css';

type ApiStatus = HealthResponse | 'loading' | 'unreachable';

export function App() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return null;
  return session ? <SignedIn userName={session.user.name} /> : <Access />;
}

type Screen = 'school' | 'picker' | 'adding';

function SignedIn({ userName }: { userName: string }) {
  const { state, addSchool } = useSchools();
  const { chosenId, choose } = useChosenSchoolId();
  const [screen, setScreen] = useState<Screen>('school');
  const [joinCode, setJoinCode] = useState(() => readJoinCode(window.location.pathname));

  function pick(school: School) {
    choose(school.id);
    setScreen('school');
  }

  function enter(school: School) {
    addSchool(school);
    pick(school);
  }

  function leaveJoinLink() {
    window.history.replaceState(null, '', '/');
    setJoinCode(null);
  }

  function joinFromLink(school: School) {
    enter(school);
    leaveJoinLink();
  }

  if (state.status === 'loading') return null;
  if (state.status === 'failed') return <SchoolsUnavailable />;
  if (joinCode) {
    return <JoinFromLink code={joinCode} onJoined={joinFromLink} onDismiss={leaveJoinLink} />;
  }
  if (state.schools.length === 0) return <NoSchool onSchool={enter} />;
  if (screen === 'adding') {
    return (
      <AddSchool onSchool={enter}>
        <Button variant="secondary" onClick={() => setScreen('picker')}>
          Back
        </Button>
      </AddSchool>
    );
  }
  const school = findChosenSchool(state.schools, chosenId);
  if (school && screen === 'school') {
    return <Home userName={userName} school={school} onSwitch={() => setScreen('picker')} />;
  }
  return (
    <CardPage>
      <SchoolPicker schools={state.schools} currentId={school?.id ?? null} onPick={pick} />
      <p className={formStyles.switch}>
        Teach at another school too?{' '}
        <button type="button" className={formStyles.link} onClick={() => setScreen('adding')}>
          Add a school
        </button>
      </p>
      <SignOutButton />
    </CardPage>
  );
}

function SchoolsUnavailable() {
  return (
    <CardPage>
      <p role="alert">Could not load your schools. Reload the page to try again.</p>
      <SignOutButton />
    </CardPage>
  );
}

type HomeProps = { userName: string; school: School; onSwitch: () => void };

function Home({ userName, school, onSwitch }: HomeProps) {
  const apiStatus = useApiStatus();
  const [view, setView] = useState<'home' | 'inviting' | 'dancers'>('home');

  if (view === 'inviting') {
    return (
      <CardPage watermark="page">
        <InviteTeachers schoolId={school.id} onDone={() => setView('home')} />
      </CardPage>
    );
  }
  if (view === 'dancers') return <DancerRoster school={school} onDone={() => setView('home')} />;
  return (
    <main>
      <h1>{APP_NAME}</h1>
      <p>{school.name}</p>
      <p>{userName}</p>
      <Button variant="secondary" onClick={() => setView('dancers')}>
        Dancers
      </Button>
      <Button variant="secondary" onClick={() => setView('inviting')}>
        Invite teachers
      </Button>
      <Button variant="secondary" onClick={onSwitch}>
        Your schools
      </Button>
      <SignOutButton />
      <DanceList schoolId={school.id} />
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
