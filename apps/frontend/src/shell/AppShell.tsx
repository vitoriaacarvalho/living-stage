import { APP_NAME } from '@living-stage/shared';
import type { ReactNode } from 'react';
import { Icon, type IconName } from '../ui/Icon.tsx';
import { Watermark, type WatermarkLayout } from '../ui/Watermark.tsx';
import { AccountMenu, type Account } from './AccountMenu.tsx';
import styles from './AppShell.module.css';

export type Section = 'home' | 'dancers' | 'team';

const sections: { id: Section; icon: IconName; label: string; watermark: WatermarkLayout }[] = [
  { id: 'home', icon: 'home', label: 'Home', watermark: 'page' },
  { id: 'dancers', icon: 'users', label: 'Dancers', watermark: 'quiet' },
  { id: 'team', icon: 'school', label: 'Team', watermark: 'form' },
];

export type ShellNav = { current: Section; onGo: (section: Section) => void };

type AppShellProps = { nav: ShellNav; account: Account; children: ReactNode };

export function AppShell({ nav, account, children }: AppShellProps) {
  const current = sections.find(({ id }) => id === nav.current)!;
  return (
    <div className={styles.shell}>
      <Watermark layout={current.watermark} />
      <header className={styles.topBar}>
        <span className={styles.brand}>{APP_NAME}</span>
      </header>
      <nav className={styles.rail} aria-label="Main">
        <span className={`${styles.brand} ${styles.railBrand}`}>{APP_NAME}</span>
        <ul className={styles.items}>
          {sections.map(({ id, icon, label }) => (
            <li key={id}>
              <button
                type="button"
                className={styles.item}
                aria-current={id === nav.current ? 'page' : undefined}
                onClick={() => nav.onGo(id)}
              >
                <Icon name={icon} />
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
        <AccountMenu account={account} />
      </nav>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
