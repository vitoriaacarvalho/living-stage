import type { FigureUpdate, Path, Position } from '@living-stage/shared';

export type Edit =
  | { kind: 'positions'; positions: Position[] }
  | { kind: 'path'; path: Path }
  | { kind: 'figure'; update: FigureUpdate };

export type Step = { figureId: string; before: Edit; after: Edit };

type Stacks = { undo: Step[]; redo: Step[] };

export type History = Record<string, Stacks>;

export const HISTORY_LIMIT = 50;

const empty: Stacks = { undo: [], redo: [] };

const stacksOf = (history: History, figureId: string) => history[figureId] ?? empty;

export const lastUndo = (history: History, figureId: string) =>
  stacksOf(history, figureId).undo.at(-1);

export const lastRedo = (history: History, figureId: string) =>
  stacksOf(history, figureId).redo.at(-1);

// A new edit clears the steps that could be redone.
export function recorded(history: History, step: Step): History {
  const { undo } = stacksOf(history, step.figureId);
  return { ...history, [step.figureId]: { undo: [...undo, step].slice(-HISTORY_LIMIT), redo: [] } };
}

export function undone(history: History, figureId: string): History {
  const { undo, redo } = stacksOf(history, figureId);
  const step = undo.at(-1);
  if (!step) return history;
  return { ...history, [figureId]: { undo: undo.slice(0, -1), redo: [...redo, step] } };
}

export function redone(history: History, figureId: string): History {
  const { undo, redo } = stacksOf(history, figureId);
  const step = redo.at(-1);
  if (!step) return history;
  return { ...history, [figureId]: { undo: [...undo, step], redo: redo.slice(0, -1) } };
}
