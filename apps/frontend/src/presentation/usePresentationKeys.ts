import { useEffect, useEffectEvent } from 'react';
import type { Steps } from './PresentationControls.tsx';

type PresentationKeys = Steps & { leave: () => void; toggle: () => void };

export function usePresentationKeys(keys: PresentationKeys) {
  const press = useEffectEvent((event: KeyboardEvent) => {
    // A focused button already answers Space and Enter itself.
    if (event.target instanceof HTMLButtonElement && [' ', 'Enter'].includes(event.key)) return;
    const action = {
      Escape: keys.leave,
      ' ': keys.toggle,
      ArrowRight: keys.next,
      ArrowLeft: keys.previous,
    }[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  });
  useEffect(() => {
    document.addEventListener('keydown', press);
    return () => document.removeEventListener('keydown', press);
  }, []);
}
