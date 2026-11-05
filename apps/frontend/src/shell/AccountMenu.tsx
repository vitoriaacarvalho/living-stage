import { useEffect, useId, useRef, useState } from 'react';
import { SignOutButton } from '../auth/SignOutButton.tsx';
import { initials } from '../dancers/dancer-colors.ts';
import { Button } from '../ui/Button.tsx';
import styles from './AppShell.module.css';

export type Account = { userName: string; schoolName: string; onSwitch: () => void };

export function AccountMenu({ account }: { account: Account }) {
  const { userName, schoolName, onSwitch } = account;
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    function closeOutside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOutside);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOutside);
    };
  }, [open]);

  return (
    <div ref={root} className={styles.account}>
      <button
        type="button"
        className={styles.accountButton}
        aria-label={`Account, ${userName}, ${schoolName}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(!open)}
      >
        <span className={styles.avatar} aria-hidden="true">
          {initials(userName)}
        </span>
        <span className={styles.who}>
          <span className={styles.userName}>{userName}</span>
          <span className={styles.schoolName}>{schoolName}</span>
        </span>
      </button>
      {open && (
        <div id={menuId} className={styles.menu} role="group" aria-label="Account">
          <div className={styles.menuWho}>
            <span className={styles.userName}>{userName}</span>
            <span className={styles.schoolName}>{schoolName}</span>
          </div>
          <Button variant="ghost" onClick={onSwitch}>
            Switch school
          </Button>
          <SignOutButton />
        </div>
      )}
    </div>
  );
}
