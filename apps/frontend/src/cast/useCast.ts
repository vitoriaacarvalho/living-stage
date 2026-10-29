import type { CastMember, CastMemberInput } from '@living-stage/shared';
import { useEffect, useState } from 'react';
import { addCastMember, fetchCast, removeCastMember, updateCastMember } from '../api/cast.ts';

export type CastState =
  { status: 'loading' } | { status: 'failed' } | { status: 'ready'; cast: CastMember[] };

export type CastActions = {
  add: (input: CastMemberInput) => Promise<void>;
  save: (castMember: CastMember) => Promise<void>;
  remove: (castMemberId: string) => Promise<void>;
};

export function useCast(schoolId: string, danceId: string): { state: CastState } & CastActions {
  const [state, setState] = useState<CastState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchCast(schoolId, danceId, controller.signal)
      .then((cast) => setState({ status: 'ready', cast }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'failed' });
      });
    return () => controller.abort();
  }, [schoolId, danceId]);

  function change(update: (cast: CastMember[]) => CastMember[]) {
    setState((current) => ({
      status: 'ready',
      cast: update(current.status === 'ready' ? current.cast : []),
    }));
  }

  async function add(input: CastMemberInput) {
    const castMember = await addCastMember(schoolId, danceId, input);
    change((cast) => [...cast, castMember]);
  }

  async function save({ id, role }: CastMember) {
    const saved = await updateCastMember(schoolId, danceId, id, { role });
    change((cast) => cast.map((each) => (each.id === saved.id ? saved : each)));
  }

  async function remove(castMemberId: string) {
    await removeCastMember(schoolId, danceId, castMemberId);
    change((cast) => cast.filter(({ id }) => id !== castMemberId));
  }

  return { state, add, save, remove };
}
