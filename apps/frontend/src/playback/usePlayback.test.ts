import { TRANSITION_MS, type Figure } from '@living-stage/shared';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { usePlayback } from './usePlayback.ts';

const figure = (order: number): Figure => ({ id: `f${order}`, order, name: null, positions: [] });

const three = [figure(0), figure(1), figure(2)];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(selectedIndex = 0, figures = three) {
  const onFinish = vi.fn();
  const hook = renderHook(() => usePlayback({ figures, selectedIndex, onFinish }));
  return { ...hook, onFinish };
}

function advance(ms: number) {
  act(() => vi.advanceTimersByTime(ms));
}

test('starts stopped', () => {
  expect(setup().result.current.status).toBe('stopped');
});

test('shows the selected figure time while stopped', () => {
  expect(setup(1).result.current.timeMs).toBe(TRANSITION_MS);
});

test('lasts one transition per figure after the first', () => {
  expect(setup().result.current.lengthMs).toBe(2 * TRANSITION_MS);
});

test('plays', () => {
  const { result } = setup();
  act(() => result.current.play());
  expect(result.current.status).toBe('playing');
});

test('moves the time forward each frame', () => {
  const { result } = setup();
  act(() => result.current.play());
  advance(1000);
  expect(result.current.timeMs).toBeCloseTo(1000, -2);
});

test('starts at the selected figure', () => {
  const { result } = setup(1);
  act(() => result.current.play());
  advance(500);
  expect(result.current.timeMs).toBeCloseTo(TRANSITION_MS + 500, -2);
});

test('starts again at the first figure from the last one', () => {
  const { result } = setup(2);
  act(() => result.current.play());
  advance(500);
  expect(result.current.timeMs).toBeCloseTo(500, -2);
});

test('pauses', () => {
  const { result } = setup();
  act(() => result.current.play());
  advance(1000);
  act(() => result.current.pause());
  expect(result.current.status).toBe('paused');
});

test('holds the time while paused', () => {
  const { result } = setup();
  act(() => result.current.play());
  advance(1000);
  act(() => result.current.pause());
  const paused = result.current.timeMs;
  advance(1000);
  expect(result.current.timeMs).toBe(paused);
});

test('goes on from the paused time', () => {
  const { result } = setup();
  act(() => result.current.play());
  advance(1000);
  act(() => result.current.pause());
  const paused = result.current.timeMs;
  advance(5000);
  act(() => result.current.play());
  advance(500);
  expect(result.current.timeMs).toBeCloseTo(paused + 500, -2);
});

test('stops back at the selected figure', () => {
  const { result } = setup(1);
  act(() => result.current.play());
  advance(1000);
  act(() => result.current.stop());
  expect(result.current.timeMs).toBe(TRANSITION_MS);
});

test('stops at the end', () => {
  const { result } = setup();
  act(() => result.current.play());
  advance(2 * TRANSITION_MS + 100);
  expect(result.current.status).toBe('stopped');
});

test('reports the last figure at the end', () => {
  const { result, onFinish } = setup();
  act(() => result.current.play());
  advance(2 * TRANSITION_MS + 100);
  expect(onFinish).toHaveBeenCalledWith('f2');
});

test('keeps playing just before the end', () => {
  const { result } = setup();
  act(() => result.current.play());
  advance(2 * TRANSITION_MS - 100);
  expect(result.current.status).toBe('playing');
});

test('does not play a single figure', () => {
  const { result } = setup(0, [figure(0)]);
  act(() => result.current.play());
  expect(result.current.status).toBe('stopped');
});

test('stops asking for frames once unmounted', () => {
  const { result, unmount } = setup();
  act(() => result.current.play());
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
