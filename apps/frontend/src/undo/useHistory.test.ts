import { act, renderHook } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { Step } from './history.ts';
import { useHistory } from './useHistory.ts';

const step: Step = {
  figureId: 'f1',
  before: { kind: 'figure', update: { name: null } },
  after: { kind: 'figure', update: { name: 'Entrance' } },
};

function setup(apply = vi.fn().mockResolvedValue(undefined)) {
  const hook = renderHook(() => useHistory(apply));
  act(() => hook.result.current.record(step));
  return { ...hook, apply };
}

test('undoing saves the earlier state', async () => {
  const { result, apply } = setup();
  await act(() => result.current.undo('f1'));
  expect(apply).toHaveBeenCalledWith('f1', step.before);
});

test('redoing saves the later state again', async () => {
  const { result, apply } = setup();
  await act(() => result.current.undo('f1'));
  await act(() => result.current.redo('f1'));
  expect(apply).toHaveBeenLastCalledWith('f1', step.after);
});

test('an undone step can be redone', async () => {
  const { result } = setup();
  await act(() => result.current.undo('f1'));
  expect(result.current.canRedo('f1')).toBe(true);
});

test('a failed save keeps the step to undo', async () => {
  const { result } = setup(vi.fn().mockRejectedValue(new Error('PATCH figure answered 500')));
  await act(() => result.current.undo('f1'));
  expect(result.current.canUndo('f1')).toBe(true);
});

test('runs one step at a time', async () => {
  const { result, apply } = setup(vi.fn(() => new Promise<void>(() => {})));
  act(() => {
    result.current.undo('f1');
    result.current.undo('f1');
  });
  expect(apply).toHaveBeenCalledTimes(1);
});

test('clearing forgets every step', () => {
  const { result } = setup();
  act(() => result.current.clear());
  expect(result.current.canUndo('f1')).toBe(false);
});
