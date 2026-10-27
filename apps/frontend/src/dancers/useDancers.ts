import type { Dancer, DancerInput } from '@living-stage/shared';
import { useEffect, useState } from 'react';
import { createDancer, deleteDancer, fetchDancers, updateDancer } from '../api/dancers.ts';

export type DancersState =
  { status: 'loading' } | { status: 'failed' } | { status: 'ready'; dancers: Dancer[] };

export type DancerActions = {
  add: (input: DancerInput) => Promise<void>;
  save: (dancer: Dancer) => Promise<void>;
  remove: (dancerId: string) => Promise<void>;
};

export function useDancers(schoolId: string): { state: DancersState } & DancerActions {
  const [state, setState] = useState<DancersState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchDancers(schoolId, controller.signal)
      .then((dancers) => setState({ status: 'ready', dancers }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'failed' });
      });
    return () => controller.abort();
  }, [schoolId]);

  function change(update: (dancers: Dancer[]) => Dancer[]) {
    setState((current) => {
      const dancers = current.status === 'ready' ? current.dancers : [];
      return { status: 'ready', dancers: update(dancers).sort(byName) };
    });
  }

  async function add(input: DancerInput) {
    const dancer = await createDancer(schoolId, input);
    change((dancers) => [...dancers, dancer]);
  }

  async function save(dancer: Dancer) {
    const saved = await updateDancer(schoolId, dancer);
    change((dancers) => dancers.map((each) => (each.id === saved.id ? saved : each)));
  }

  async function remove(dancerId: string) {
    await deleteDancer(schoolId, dancerId);
    change((dancers) => dancers.filter(({ id }) => id !== dancerId));
  }

  return { state, add, save, remove };
}

function byName(a: Dancer, b: Dancer) {
  return a.name.localeCompare(b.name);
}
