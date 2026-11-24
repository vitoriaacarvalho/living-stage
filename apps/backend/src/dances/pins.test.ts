import { describe, expect, test, vi } from 'vitest';
import { pinToSong } from './pins.ts';

type Row = { id: string; timeMs: number | null; transitionMs: number };

function fakeTx(figures: Row[]) {
  const update = vi.fn();
  const tx = { figure: { findMany: vi.fn().mockResolvedValue(figures), update } };
  return { tx: tx as never, update };
}

function saved(update: ReturnType<typeof vi.fn>) {
  return update.mock.calls.map(([{ where, data }]) => [where.id, data.timeMs]);
}

describe('pinToSong', () => {
  test('pins figures never pinned where their moves put them', async () => {
    const { tx, update } = fakeTx([
      { id: 'f1', timeMs: null, transitionMs: 4000 },
      { id: 'f2', timeMs: null, transitionMs: 6000 },
    ]);
    await pinToSong(tx, 'dance-1', 60_000);
    expect(saved(update)).toEqual([
      ['f1', 0],
      ['f2', 6000],
    ]);
  });

  test('squeezes pins of an earlier song into a shorter one', async () => {
    const { tx, update } = fakeTx([
      { id: 'f1', timeMs: 0, transitionMs: 4000 },
      { id: 'f2', timeMs: 120_000, transitionMs: 4000 },
    ]);
    await pinToSong(tx, 'dance-1', 60_000);
    expect(saved(update)).toEqual([['f2', 60_000]]);
  });

  test('leaves pins that fit the new song', async () => {
    const { tx, update } = fakeTx([
      { id: 'f1', timeMs: 0, transitionMs: 4000 },
      { id: 'f2', timeMs: 30_000, transitionMs: 4000 },
    ]);
    await pinToSong(tx, 'dance-1', 60_000);
    expect(update).not.toHaveBeenCalled();
  });

  test('keeps earlier pins and slots in a figure added without a song', async () => {
    const { tx, update } = fakeTx([
      { id: 'f1', timeMs: 0, transitionMs: 4000 },
      { id: 'f2', timeMs: null, transitionMs: 4000 },
      { id: 'f3', timeMs: 20_000, transitionMs: 4000 },
    ]);
    await pinToSong(tx, 'dance-1', 60_000);
    expect(saved(update)).toEqual([['f2', 10_000]]);
  });
});
