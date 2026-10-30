import type { CastMember, CastMemberInput, CastMemberUpdate, Position } from '@living-stage/shared';
import { useEffect, useState } from 'react';
import { addCastMember, fetchCast, removeCastMember, updateCastMember } from '../api/cast.ts';
import { fetchFigures } from '../api/figures.ts';

export type CastState =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ready'; cast: CastMember[]; positions: Position[] };

type Ready = Extract<CastState, { status: 'ready' }>;

export type CastActions = {
  add: (input: CastMemberInput) => Promise<void>;
  save: (castMember: CastMember) => Promise<void>;
  give: (castMemberId: string, dancerId: string) => Promise<void>;
  remove: (castMemberId: string) => Promise<void>;
};

// Until figures can be added (plan 2.3), the stage shows the dance's first figure.
export function useCast(schoolId: string, danceId: string): { state: CastState } & CastActions {
  const [state, setState] = useState<CastState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchCast(schoolId, danceId, controller.signal),
      fetchFigures(schoolId, danceId, controller.signal),
    ])
      .then(([cast, figures]) =>
        setState({ status: 'ready', cast, positions: figures[0]?.positions ?? [] }),
      )
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'failed' });
      });
    return () => controller.abort();
  }, [schoolId, danceId]);

  function change(update: (ready: Ready) => Omit<Ready, 'status'>) {
    setState((current) => ({
      status: 'ready',
      ...update(
        current.status === 'ready' ? current : { status: 'ready', cast: [], positions: [] },
      ),
    }));
  }

  async function add(input: CastMemberInput) {
    const added = await addCastMember(schoolId, danceId, input);
    change(({ cast, positions }) => ({
      cast: [...cast, added.castMember],
      positions: [...positions, ...added.positions.slice(0, 1)],
    }));
  }

  async function update(castMemberId: string, changes: CastMemberUpdate) {
    const saved = await updateCastMember(schoolId, danceId, castMemberId, changes);
    change(({ cast, positions }) => ({
      cast: cast.map((each) => (each.id === saved.id ? saved : each)),
      positions,
    }));
  }

  const save = ({ id, role }: CastMember) => update(id, { role });
  const give = (castMemberId: string, dancerId: string) => update(castMemberId, { dancerId });

  async function remove(castMemberId: string) {
    await removeCastMember(schoolId, danceId, castMemberId);
    change(({ cast, positions }) => ({
      cast: cast.filter(({ id }) => id !== castMemberId),
      positions: positions.filter((position) => position.castMemberId !== castMemberId),
    }));
  }

  return { state, add, save, give, remove };
}
