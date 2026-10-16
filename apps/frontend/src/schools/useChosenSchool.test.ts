import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { findChosenSchool, useChosenSchoolId } from './useChosenSchool.ts';

const ana = { id: 'school-1', name: 'Escola Ana', createdAt: '2026-10-15T12:00:00.000Z' };
const bia = { id: 'school-2', name: 'Escola Bia', createdAt: '2026-10-16T12:00:00.000Z' };

afterEach(() => {
  sessionStorage.clear();
});

test('finds no school in an empty list', () => {
  expect(findChosenSchool([], 'school-1')).toBeNull();
});

test('goes straight into the only school, even without a choice', () => {
  expect(findChosenSchool([ana], null)).toBe(ana);
});

test('goes into the only school when the choice is stale', () => {
  expect(findChosenSchool([ana], 'school-2')).toBe(ana);
});

test('asks to pick among several schools without a choice', () => {
  expect(findChosenSchool([ana, bia], null)).toBeNull();
});

test('finds the chosen school among several', () => {
  expect(findChosenSchool([ana, bia], 'school-2')).toBe(bia);
});

test('asks to pick when the chosen school is no longer in the list', () => {
  expect(findChosenSchool([ana, bia], 'school-3')).toBeNull();
});

test('starts with no choice', () => {
  const { result } = renderHook(useChosenSchoolId);
  expect(result.current.chosenId).toBeNull();
});

test('remembers the choice', () => {
  const { result } = renderHook(useChosenSchoolId);
  act(() => result.current.choose('school-2'));
  expect(result.current.chosenId).toBe('school-2');
});

test('keeps the choice through a reload of the tab', () => {
  renderHook(useChosenSchoolId).result.current.choose('school-2');
  const { result } = renderHook(useChosenSchoolId);
  expect(result.current.chosenId).toBe('school-2');
});
