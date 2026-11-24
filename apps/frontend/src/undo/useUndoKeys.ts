import { useEffect } from 'react';

type UndoKeys = { undo: (() => void) | null; redo: (() => void) | null };

// Ctrl/Cmd+Z undoes; Shift+Ctrl/Cmd+Z or Ctrl+Y redoes. A text field keeps its own undo.
export function useUndoKeys({ undo, redo }: UndoKeys) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || typing(event.target)) return;
      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      event.preventDefault();
      const redoing = key === 'y' || event.shiftKey;
      (redoing ? redo : undo)?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [undo, redo]);
}

function typing(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
