import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fetchCast } from '../api/cast.ts';
import { fetchFigures, moveFigurePositions, reorderFigures, savePath } from '../api/figures.ts';
import { useCast } from './useCast.ts';

vi.mock('../api/cast.ts', () => ({ fetchCast: vi.fn() }));
vi.mock('../api/figures.ts', () => ({
  fetchFigures: vi.fn(),
  moveFigurePositions: vi.fn(),
  reorderFigures: vi.fn(),
  savePath: vi.fn(),
}));

const entrance = {
  id: 'figure-1',
  order: 0,
  name: 'Entrance',
  transitionMs: 4000,
  positions: [],
  paths: [],
};
const finale = {
  id: 'figure-2',
  order: 1,
  name: 'Finale',
  transitionMs: 4000,
  positions: [],
  paths: [],
};

beforeEach(() => {
  vi.mocked(fetchCast).mockReset().mockResolvedValue([]);
  vi.mocked(fetchFigures).mockReset().mockResolvedValue([entrance, finale]);
  vi.mocked(reorderFigures).mockReset();
  vi.mocked(moveFigurePositions).mockReset();
  vi.mocked(savePath).mockReset().mockResolvedValue();
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

describe('movePositions', () => {
  const clara = { castMemberId: 'cast-1', x: 0.2, y: 0.3 };
  const odile = { castMemberId: 'cast-2', x: 0.6, y: 0.4 };
  const moved = { ...clara, x: 0.5, y: 0.5 };

  beforeEach(() => {
    vi.mocked(fetchFigures).mockResolvedValue([{ ...entrance, positions: [clara, odile] }, finale]);
  });

  function entrancePositions(hook: Awaited<ReturnType<typeof loadedCast>>) {
    const { state } = hook.result.current;
    return state.status === 'ready' ? state.figures[0]!.positions : [];
  }

  test('shows the new spots before they are saved', async () => {
    vi.mocked(moveFigurePositions).mockReturnValue(new Promise(() => {}));
    const hook = await loadedCast();
    act(() => {
      hook.result.current.movePositions('figure-1', [moved]);
    });
    expect(entrancePositions(hook)).toEqual([moved, odile]);
  });

  test('saves only the moved dancers', async () => {
    vi.mocked(moveFigurePositions).mockResolvedValue(entrance);
    const hook = await loadedCast();
    await act(() => hook.result.current.movePositions('figure-1', [moved]));
    expect(moveFigurePositions).toHaveBeenCalledWith('school-1', 'dance-1', 'figure-1', {
      positions: [moved],
    });
  });

  test('puts the moved dancers back when saving fails', async () => {
    vi.mocked(moveFigurePositions).mockRejectedValue(new Error('PUT answered 500'));
    const hook = await loadedCast();
    await act(() => hook.result.current.movePositions('figure-1', [moved]).catch(() => {}));
    expect(entrancePositions(hook)).toEqual([clara, odile]);
  });

  test('leaves the other figures alone', async () => {
    vi.mocked(moveFigurePositions).mockResolvedValue(entrance);
    const hook = await loadedCast();
    await act(() => hook.result.current.movePositions('figure-1', [moved]));
    const { state } = hook.result.current;
    expect(state.status === 'ready' && state.figures[1]).toEqual(finale);
  });
});

describe('bendPath', () => {
  const bent = { castMemberId: 'cast-1', points: [{ along: 0.5, side: 0.2 }] };
  const straight = { castMemberId: 'cast-1', points: [] };

  function finalePaths(hook: Awaited<ReturnType<typeof loadedCast>>) {
    const { state } = hook.result.current;
    return state.status === 'ready' ? state.figures[1]!.paths : [];
  }

  test('shows the bend before it is saved', async () => {
    vi.mocked(savePath).mockReturnValue(new Promise(() => {}));
    const hook = await loadedCast();
    act(() => {
      hook.result.current.bendPath('figure-2', bent);
    });
    expect(finalePaths(hook)).toEqual([bent]);
  });

  test('saves the points of the path into this figure', async () => {
    const hook = await loadedCast();
    await act(() => hook.result.current.bendPath('figure-2', bent));
    expect(savePath).toHaveBeenCalledWith(
      'school-1',
      'dance-1',
      { figureId: 'figure-2', castMemberId: 'cast-1' },
      bent.points,
    );
  });

  test('drops a straightened path from the figure', async () => {
    vi.mocked(fetchFigures).mockResolvedValue([entrance, { ...finale, paths: [bent] }]);
    const hook = await loadedCast();
    await act(() => hook.result.current.bendPath('figure-2', straight));
    expect(finalePaths(hook)).toEqual([]);
  });

  test('puts a new bend back to straight when saving fails', async () => {
    vi.mocked(savePath).mockRejectedValue(new Error('PUT path answered 500'));
    const hook = await loadedCast();
    await act(() => hook.result.current.bendPath('figure-2', bent).catch(() => {}));
    expect(finalePaths(hook)).toEqual([]);
  });

  test('puts the earlier bend back when saving fails', async () => {
    vi.mocked(fetchFigures).mockResolvedValue([entrance, { ...finale, paths: [bent] }]);
    vi.mocked(savePath).mockRejectedValue(new Error('DELETE path answered 500'));
    const hook = await loadedCast();
    await act(() => hook.result.current.bendPath('figure-2', straight).catch(() => {}));
    expect(finalePaths(hook)).toEqual([bent]);
  });
});
