import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { fetchCast } from '../api/cast.ts';
import { fetchFigures, reorderFigures } from '../api/figures.ts';
import { useCast } from './useCast.ts';

vi.mock('../api/cast.ts', () => ({ fetchCast: vi.fn() }));
vi.mock('../api/figures.ts', () => ({ fetchFigures: vi.fn(), reorderFigures: vi.fn() }));

const entrance = { id: 'figure-1', order: 0, name: 'Entrance', positions: [] };
const finale = { id: 'figure-2', order: 1, name: 'Finale', positions: [] };

beforeEach(() => {
  vi.mocked(fetchCast).mockReset().mockResolvedValue([]);
  vi.mocked(fetchFigures).mockReset().mockResolvedValue([entrance, finale]);
  vi.mocked(reorderFigures).mockReset();
});

async function loadedCast() {
  const hook = renderHook(() => useCast('school-1', 'dance-1'));
  await waitFor(() => expect(hook.result.current.state.status).toBe('ready'));
  return hook;
}

function figureIds(hook: Awaited<ReturnType<typeof loadedCast>>) {
  const { state } = hook.result.current;
  return state.status === 'ready' ? state.figures.map(({ id, order }) => ({ id, order })) : [];
}

test('shows the new figure order before it is saved', async () => {
  vi.mocked(reorderFigures).mockReturnValue(new Promise(() => {}));
  const hook = await loadedCast();
  act(() => {
    hook.result.current.reorderFigures(['figure-2', 'figure-1']);
  });
  expect(figureIds(hook)).toEqual([
    { id: 'figure-2', order: 0 },
    { id: 'figure-1', order: 1 },
  ]);
});

test('saves the new figure order', async () => {
  vi.mocked(reorderFigures).mockResolvedValue([]);
  const hook = await loadedCast();
  await act(() => hook.result.current.reorderFigures(['figure-2', 'figure-1']));
  expect(reorderFigures).toHaveBeenCalledWith('school-1', 'dance-1', {
    figureIds: ['figure-2', 'figure-1'],
  });
});

test('puts the figure order back when saving fails', async () => {
  vi.mocked(reorderFigures).mockRejectedValue(new Error('PUT figure order answered 500'));
  const hook = await loadedCast();
  await act(() => hook.result.current.reorderFigures(['figure-2', 'figure-1']).catch(() => {}));
  expect(figureIds(hook)).toEqual([
    { id: 'figure-1', order: 0 },
    { id: 'figure-2', order: 1 },
  ]);
});
