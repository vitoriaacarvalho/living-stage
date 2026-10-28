import type { Dance, DanceInput } from '@living-stage/shared';
import { useEffect, useState } from 'react';
import { createDance, fetchDances, updateDance } from '../api/dances.ts';

export type DancesState =
  { status: 'loading' } | { status: 'failed' } | { status: 'ready'; dances: Dance[] };

export function useDances(schoolId: string) {
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

  function change(update: (dances: Dance[]) => Dance[]) {
    setState((current) => ({
      status: 'ready',
      dances: update(current.status === 'ready' ? current.dances : []),
    }));
  }

  async function add(input: DanceInput) {
    const dance = await createDance(schoolId, input);
    change((dances) => [dance, ...dances]);
  }

  async function rename(dance: Dance) {
    const saved = await updateDance(schoolId, dance);
    change((dances) => dances.map((each) => (each.id === saved.id ? saved : each)));
  }

  return { state, add, rename };
}
