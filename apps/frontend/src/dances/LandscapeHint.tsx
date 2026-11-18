import { useState } from 'react';
import { Button } from '../ui/Button.tsx';
import styles from './LandscapeHint.module.css';

const storageKey = 'living-stage:landscape-hint-dismissed';

// Storage can be blocked (private browsing); the hint then simply shows again.
function wasDismissed() {
  try {
    return localStorage.getItem(storageKey) === 'true';
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    localStorage.setItem(storageKey, 'true');
  } catch {
    // Hidden for this visit only.
  }
}

export function LandscapeHint() {
  const [hidden, setHidden] = useState(wasDismissed);
  if (hidden) return null;

  function dismiss() {
    rememberDismissed();
    setHidden(true);
  }

  return (
    <div className={styles.hint} role="note">
      <p className={styles.text}>Turn sideways for more room to edit</p>
      <Button variant="ghost" icon="x" aria-label="Hide this tip" onClick={dismiss} />
    </div>
  );
}
