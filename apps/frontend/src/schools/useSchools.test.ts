import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { fetchSchools } from '../api/schools.ts';
import { useSchools } from './useSchools.ts';

vi.mock('../api/schools.ts', () => ({ fetchSchools: vi.fn() }));

const school = { id: 'school-1', name: 'Escola Ana', createdAt: '2026-10-15T12:00:00.000Z' };
const other = { id: 'school-2', name: 'Escola Bia', createdAt: '2026-10-16T12:00:00.000Z' };

beforeEach(() => {
  vi.mocked(fetchSchools).mockResolvedValue([school]);
});

async function renderLoaded() {
  const hook = renderHook(useSchools);
  await waitFor(() => expect(hook.result.current.state.status).toBe('ready'));
  return hook;
}

test('adds a new school to the list', async () => {
  const { result } = await renderLoaded();
  act(() => result.current.addSchool(other));
  expect(result.current.state).toEqual({ status: 'ready', schools: [school, other] });
});

test('does not add a school that is already in the list', async () => {
  const { result } = await renderLoaded();
  act(() => result.current.addSchool(school));
  expect(result.current.state).toEqual({ status: 'ready', schools: [school] });
});
