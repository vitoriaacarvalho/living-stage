import type { Act, ActUpdate, ShowDetail, ShowUpdate } from '@living-stage/shared';
import { useEffect, useState } from 'react';
import { addAct, deleteAct, deleteShow, fetchShow, updateAct, updateShow } from '../api/shows.ts';

export type ShowState =
  { status: 'loading' } | { status: 'failed' } | { status: 'ready'; show: ShowDetail };

export type ShowActions = {
  save: (update: ShowUpdate) => Promise<void>;
  remove: () => Promise<void>;
  addAct: () => Promise<void>;
  saveAct: (actId: string, update: ActUpdate) => Promise<void>;
  removeAct: (actId: string) => Promise<void>;
};

export function useShow(schoolId: string, showId: string): { state: ShowState } & ShowActions {
  const [state, setState] = useState<ShowState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchShow(schoolId, showId, controller.signal)
      .then((show) => setState({ status: 'ready', show }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'failed' });
      });
    return () => controller.abort();
  }, [schoolId, showId]);

  function change(update: (show: ShowDetail) => ShowDetail) {
    setState((current) =>
      current.status === 'ready' ? { status: 'ready', show: update(current.show) } : current,
    );
  }

  const changeActs = (update: (acts: Act[]) => Act[]) =>
    change((show) => ({ ...show, acts: update(show.acts) }));

  return {
    state,
    async save(update) {
      const saved = await updateShow(schoolId, showId, update);
      change((show) => ({ ...show, ...saved }));
    },
    remove: () => deleteShow(schoolId, showId),
    async addAct() {
      const act = await addAct(schoolId, showId);
      changeActs((acts) => [...acts, act]);
    },
    async saveAct(actId, update) {
      const saved = await updateAct({ schoolId, showId, actId }, update);
      changeActs((acts) => acts.map((act) => (act.id === actId ? saved : act)));
    },
    async removeAct(actId) {
      await deleteAct({ schoolId, showId, actId });
      changeActs((acts) => acts.filter(({ id }) => id !== actId));
    },
  };
}
