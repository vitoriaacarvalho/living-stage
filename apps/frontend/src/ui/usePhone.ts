import { useSyncExternalStore } from 'react';

// Together they make the "compact" breakpoint, (max-width: 599px), (max-height: 499px),
// repeated in the CSS of the Stage, the editor and its controls.
const queries = {
  portrait: '(max-width: 599px)',
  landscape: '(min-width: 600px) and (max-height: 499px)',
} as const;

export type PhoneLayout = keyof typeof queries;

function lists() {
  if (typeof window.matchMedia !== 'function') return [];
  return Object.entries(queries).map(([layout, query]) => ({
    layout: layout as PhoneLayout,
    list: window.matchMedia(query),
  }));
}

function subscribe(onChange: () => void) {
  const watched = lists();
  watched.forEach(({ list }) => list.addEventListener('change', onChange));
  return () => watched.forEach(({ list }) => list.removeEventListener('change', onChange));
}

function current(): PhoneLayout | null {
  return lists().find(({ list }) => list.matches)?.layout ?? null;
}

// Null on iPad and desktop.
export function usePhone() {
  return useSyncExternalStore(subscribe, current);
}
