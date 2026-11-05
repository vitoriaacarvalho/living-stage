import type { Dance, DanceInput, DanceSummary } from '@living-stage/shared';
import { useEffect, useState } from 'react';
import { copyDance, createDance, deleteDance, fetchDances, updateDance } from '../api/dances.ts';

export type DancesState =
  { status: 'loading' } | { status: 'failed' } | { status: 'ready'; dances: DanceSummary[] };

export type DanceActions = {
  add: (input: DanceInput) => Promise<void>;
  duplicate: (danceId: string) => Promise<DanceSummary>;
  rename: (dance: Dance) => Promise<void>;
  remove: (danceId: string) => Promise<void>;
};

export function useDances(schoolId: string): { state: DancesState } & DanceActions {
  const [state, setState] = useState<DancesState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchDances(schoolId, controller.signal)
      .then((dances) => setState({ status: 'ready', dances }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'failed' });
      });
    return () => controller.abort();
  }, [schoolId]);

  function change(update: (dances: DanceSummary[]) => DanceSummary[]) {
    setState((current) => ({
      status: 'ready',
      dances: update(current.status === 'ready' ? current.dances : []),
    }));
  }

  async function add(input: DanceInput) {
    const dance = await createDance(schoolId, input);
    change((dances) => [{ ...dance, castCount: 0, preview: [], showTitles: [] }, ...dances]);
  }

  async function duplicate(danceId: string) {
    const copy = await copyDance(schoolId, danceId);
    change((dances) => [copy, ...dances]);
    return copy;
  }

  async function rename(dance: Dance) {
    const saved = await updateDance(schoolId, dance.id, { title: dance.title });
    change((dances) => dances.map((each) => (each.id === saved.id ? { ...each, ...saved } : each)));
  }

  async function remove(danceId: string) {
    await deleteDance(schoolId, danceId);
    change((dances) => dances.filter(({ id }) => id !== danceId));
  }

  return { state, add, duplicate, rename, remove };
}
