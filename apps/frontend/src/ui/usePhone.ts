import { useSyncExternalStore } from 'react';

// Matches the phone breakpoint in Stage.module.css and DanceEditor.module.css.
const phoneQuery = '(max-width: 599px)';

function query() {
  return typeof window.matchMedia === 'function' ? window.matchMedia(phoneQuery) : null;
}

function subscribe(onChange: () => void) {
  const list = query();
  list?.addEventListener('change', onChange);
  return () => list?.removeEventListener('change', onChange);
}

export function usePhone() {
  return useSyncExternalStore(subscribe, () => query()?.matches ?? false);
}
