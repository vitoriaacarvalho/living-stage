import { type PointerEvent, type ReactNode, useRef, useState } from 'react';
import styles from './BottomSheet.module.css';

// A swipe this far up or down on the handle expands or collapses the sheet.
const SWIPE_PX = 30;

type BottomSheetProps = { label: string; children: ReactNode };

export function BottomSheet({ label, children }: BottomSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const startY = useRef<number | null>(null);
  const swiped = useRef(false);

  function startSwipe(event: PointerEvent) {
    startY.current = event.clientY;
    swiped.current = false;
  }

  function endSwipe(event: PointerEvent) {
    if (startY.current === null) return;
    const dy = event.clientY - startY.current;
    startY.current = null;
    if (Math.abs(dy) < SWIPE_PX) return;
    swiped.current = true;
    setExpanded(dy < 0);
  }

  // The click that ends a swipe is not a tap.
  function tap() {
    if (swiped.current) swiped.current = false;
    else setExpanded(!expanded);
  }

  return (
    <div className={styles.sheet} data-expanded={expanded}>
      <button
        type="button"
        className={styles.grab}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${label.toLowerCase()}`}
        aria-expanded={expanded}
        onPointerDown={startSwipe}
        onPointerUp={endSwipe}
        onClick={tap}
      >
        <span className={styles.bar} />
      </button>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
