import type { School } from '@living-stage/shared';
import { useState } from 'react';
import { SignOutButton } from '../auth/SignOutButton.tsx';
import { CardPage } from '../ui/CardPage.tsx';
import styles from '../ui/Form.module.css';
import { CreateSchoolForm } from './CreateSchoolForm.tsx';
import { JoinWithCode } from './JoinWithCode.tsx';

export function NoSchool({ onSchool }: { onSchool: (school: School) => void }) {
  const [joining, setJoining] = useState(false);

  return (
    <CardPage>
      {joining ? <JoinWithCode onJoined={onSchool} /> : <CreateSchoolForm onCreated={onSchool} />}
      <p className={styles.switch}>
        {joining ? 'Starting a new school?' : 'Have an invitation code?'}{' '}
        <button type="button" className={styles.link} onClick={() => setJoining(!joining)}>
          {joining ? 'Create a school' : 'Join a school'}
        </button>
      </p>
      <SignOutButton />
    </CardPage>
  );
}
