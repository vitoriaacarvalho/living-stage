import type { Dance } from '@living-stage/shared';
import { DanceList } from '../dances/DanceList.tsx';
import { greeting, todayLine } from './greeting.ts';
import styles from './HomePage.module.css';

type HomePageProps = { userName: string; schoolId: string; onOpen: (dance: Dance) => void };

export function HomePage({ userName, schoolId, onOpen }: HomePageProps) {
  const now = new Date();
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <span className={styles.today}>{todayLine(now)}</span>
        <h1 className={styles.greeting}>{greeting(now, userName)}</h1>
      </header>
      <DanceList schoolId={schoolId} onOpen={onOpen} />
    </div>
  );
}
