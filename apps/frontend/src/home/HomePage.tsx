import type { Dance, ShowSummary } from '@living-stage/shared';
import { ShowList } from '../shows/ShowList.tsx';
import { DanceList } from '../dances/DanceList.tsx';
import { greeting, todayLine } from './greeting.ts';
import styles from './HomePage.module.css';

export type HomeOpen = { dance: (dance: Dance) => void; show: (show: ShowSummary) => void };

type HomePageProps = { userName: string; schoolId: string; open: HomeOpen };

export function HomePage({ userName, schoolId, open }: HomePageProps) {
  const now = new Date();
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <span className={styles.today}>{todayLine(now)}</span>
        <h1 className={styles.greeting}>{greeting(now, userName)}</h1>
      </header>
      <ShowList schoolId={schoolId} onOpen={open.show} />
      <DanceList schoolId={schoolId} onOpen={open.dance} />
    </div>
  );
}
