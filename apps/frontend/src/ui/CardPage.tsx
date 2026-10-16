import type { ReactNode } from 'react';
import styles from './CardPage.module.css';

export function CardPage({ children }: { children: ReactNode }) {
  return (
    <main className={styles.page}>
      <section className={styles.card}>{children}</section>
    </main>
  );
}
