import type { Dance, School } from '@living-stage/shared';
import { useState } from 'react';
import { authClient } from './auth/client.ts';
import { Access } from './auth/Access.tsx';
import { SignOutButton } from './auth/SignOutButton.tsx';
import { DancerRoster } from './dancers/DancerRoster.tsx';
import { DanceEditor } from './dances/DanceEditor.tsx';
import { HomePage } from './home/HomePage.tsx';
import { AddSchool } from './schools/AddSchool.tsx';
import { readJoinCode } from './schools/join-link.ts';
import { JoinFromLink } from './schools/JoinFromLink.tsx';
import { NoSchool } from './schools/NoSchool.tsx';
import { SchoolPicker } from './schools/SchoolPicker.tsx';
import { TeamPage } from './schools/TeamPage.tsx';
import { findChosenSchool, useChosenSchoolId } from './schools/useChosenSchool.ts';
import { useSchools } from './schools/useSchools.ts';
import { AppShell, type Section } from './shell/AppShell.tsx';
import { Button } from './ui/Button.tsx';
import { CardPage } from './ui/CardPage.tsx';
import formStyles from './ui/Form.module.css';

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
  const [section, setSection] = useState<Section>('home');
  const [openDance, setOpenDance] = useState<Dance | null>(null);

  if (openDance) {
    return <DanceEditor schoolId={school.id} dance={openDance} onBack={() => setOpenDance(null)} />;
  }
  return (
    <AppShell
      nav={{ current: section, onGo: setSection }}
      account={{ userName, schoolName: school.name, onSwitch }}
    >
      {section === 'home' && (
        <HomePage userName={userName} schoolId={school.id} onOpen={setOpenDance} />
      )}
      {section === 'dancers' && <DancerRoster school={school} />}
      {section === 'team' && <TeamPage schoolId={school.id} onDone={() => setSection('home')} />}
    </AppShell>
  );
}
