import { useRef, useState } from 'react';
import {
  type Edit,
  type History,
  lastRedo,
  lastUndo,
  recorded,
  redone,
  type Step,
  undone,
} from './history.ts';

type Apply = (figureId: string, edit: Edit) => Promise<void>;

// One history per figure. Undoing saves the step's earlier state through apply; if that
// fails, the step stays where it was.
export function useHistory(apply: Apply) {
  const [history, setHistory] = useState<History>({});
  // A held key repeats faster than a save answers, so one step runs at a time.
  const busy = useRef(false);

  async function travel(step: Step | undefined, edit: (step: Step) => Edit, move: typeof undone) {
    if (!step || busy.current) return;
    busy.current = true;
    try {
      await apply(step.figureId, edit(step));
      setHistory((current) => move(current, step.figureId));
    } catch {
      // The save put the figure back already.
    } finally {
      busy.current = false;
    }
  }

  return {
    record: (step: Step) => setHistory((current) => recorded(current, step)),
    clear: () => setHistory({}),
    canUndo: (figureId: string) => lastUndo(history, figureId) !== undefined,
    canRedo: (figureId: string) => lastRedo(history, figureId) !== undefined,
    undo: (figureId: string) => travel(lastUndo(history, figureId), ({ before }) => before, undone),
    redo: (figureId: string) => travel(lastRedo(history, figureId), ({ after }) => after, redone),
  };
}
