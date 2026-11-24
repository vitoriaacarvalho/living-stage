import { describe, expect, test } from 'vitest';
import {
  HISTORY_LIMIT,
  type History,
  lastRedo,
  lastUndo,
  recorded,
  redone,
  type Step,
  undone,
} from './history.ts';

const step = (figureId: string, x = 1): Step => ({
  figureId,
  before: { kind: 'positions', positions: [{ castMemberId: 'c1', x: 0, y: 0 }] },
  after: { kind: 'positions', positions: [{ castMemberId: 'c1', x, y: 0 }] },
});

const record = (...steps: Step[]) => steps.reduce<History>(recorded, {});

describe('recorded', () => {
  test('makes the step the next to undo', () => {
    expect(lastUndo(record(step('f1')), 'f1')).toEqual(step('f1'));
  });

  test('keeps each figure apart', () => {
    expect(lastUndo(record(step('f1')), 'f2')).toBeUndefined();
  });

  test('clears what could be redone', () => {
    const history = recorded(undone(record(step('f1')), 'f1'), step('f1', 2));
    expect(lastRedo(history, 'f1')).toBeUndefined();
  });

  test(`keeps the last ${HISTORY_LIMIT} steps`, () => {
    const steps = Array.from({ length: HISTORY_LIMIT + 1 }, (_, x) => step('f1', x));
    let history = record(...steps);
    for (let i = 0; i < HISTORY_LIMIT; i++) history = undone(history, 'f1');
    expect(lastUndo(history, 'f1')).toBeUndefined();
  });
});

describe('undone', () => {
  test('moves the step to redo', () => {
    expect(lastRedo(undone(record(step('f1')), 'f1'), 'f1')).toEqual(step('f1'));
  });

  test('leaves the history alone when there is nothing to undo', () => {
    const history = record(step('f1'));
    expect(undone(history, 'f2')).toBe(history);
  });
});

describe('redone', () => {
  test('moves the step back to undo', () => {
    const history = redone(undone(record(step('f1')), 'f1'), 'f1');
    expect(lastUndo(history, 'f1')).toEqual(step('f1'));
  });

  test('leaves the history alone when there is nothing to redo', () => {
    const history = record(step('f1'));
    expect(redone(history, 'f1')).toBe(history);
  });
});
