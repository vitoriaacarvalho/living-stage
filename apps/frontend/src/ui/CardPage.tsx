import type { ReactNode } from 'react';
import styles from './CardPage.module.css';
import { Watermark, type WatermarkLayout } from './Watermark.tsx';

type CardPageProps = { watermark?: WatermarkLayout; children: ReactNode };

export function CardPage({ watermark = 'form', children }: CardPageProps) {
  return (
    <main className={styles.page}>
      <Watermark layout={watermark} />
      <section className={styles.card}>{children}</section>
    </main>
  );
}
