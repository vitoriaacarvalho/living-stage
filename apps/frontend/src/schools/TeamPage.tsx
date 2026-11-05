import { InviteTeachers } from './InviteTeachers.tsx';
import styles from './TeamPage.module.css';

type TeamPageProps = { schoolId: string; onDone: () => void };

export function TeamPage({ schoolId, onDone }: TeamPageProps) {
  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <InviteTeachers schoolId={schoolId} onDone={onDone} />
      </section>
    </div>
  );
}
