import type {
  CastMember,
  CastMemberInput,
  CastMemberUpdate,
  Figure,
  FigureCopy,
} from '@living-stage/shared';
import { useEffect, useState } from 'react';
import { addCastMember, fetchCast, removeCastMember, updateCastMember } from '../api/cast.ts';
import { copyFigure as postFigureCopy, fetchFigures, updateFigure } from '../api/figures.ts';

export type CastState =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ready'; cast: CastMember[]; figures: Figure[] };

type Ready = Extract<CastState, { status: 'ready' }>;

export type CastActions = {
  add: (input: CastMemberInput) => Promise<void>;
  save: (castMember: CastMember) => Promise<void>;
  give: (castMemberId: string, dancerId: string) => Promise<void>;
  remove: (castMemberId: string) => Promise<void>;
  copyFigure: (copy: FigureCopy) => Promise<Figure>;
  renameFigure: (figureId: string, name: string | null) => Promise<void>;
};

export function useCast(schoolId: string, danceId: string): { state: CastState } & CastActions {
  const [state, setState] = useState<CastState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchCast(schoolId, danceId, controller.signal),
      fetchFigures(schoolId, danceId, controller.signal),
    ])
      .then(([cast, figures]) => setState({ status: 'ready', cast, figures }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'failed' });
      });
    return () => controller.abort();
  }, [schoolId, danceId]);

  function change(update: (ready: Ready) => Omit<Ready, 'status'>) {
    setState((current) => ({
      status: 'ready',
      ...update(current.status === 'ready' ? current : { status: 'ready', cast: [], figures: [] }),
    }));
  }

  async function add(input: CastMemberInput) {
    const added = await addCastMember(schoolId, danceId, input);
    change(({ cast, figures }) => ({
      cast: [...cast, added.castMember],
      figures: figures.map((figure) => ({
        ...figure,
        positions: [
          ...figure.positions,
          ...added.positions
            .filter(({ figureId }) => figureId === figure.id)
            .map(({ castMemberId, x, y }) => ({ castMemberId, x, y })),
        ],
      })),
    }));
  }

  async function update(castMemberId: string, changes: CastMemberUpdate) {
    const saved = await updateCastMember(schoolId, danceId, castMemberId, changes);
    change(({ cast, figures }) => ({
      cast: cast.map((each) => (each.id === saved.id ? saved : each)),
      figures,
    }));
  }

  const save = ({ id, role }: CastMember) => update(id, { role });
  const give = (castMemberId: string, dancerId: string) => update(castMemberId, { dancerId });

  async function remove(castMemberId: string) {
    await removeCastMember(schoolId, danceId, castMemberId);
    change(({ cast, figures }) => ({
      cast: cast.filter(({ id }) => id !== castMemberId),
      figures: figures.map((figure) => ({
        ...figure,
        positions: figure.positions.filter((position) => position.castMemberId !== castMemberId),
      })),
    }));
  }

  async function copyFigure(copy: FigureCopy) {
    const figure = await postFigureCopy(schoolId, danceId, copy);
    change(({ cast, figures }) => ({ cast, figures: insertFigure(figures, figure) }));
    return figure;
  }

  async function renameFigure(figureId: string, name: string | null) {
    const saved = await updateFigure(schoolId, danceId, figureId, { name });
    change(({ cast, figures }) => ({
      cast,
      figures: figures.map((each) => (each.id === saved.id ? saved : each)),
    }));
  }

  return { state, add, save, give, remove, copyFigure, renameFigure };
}

// Mirrors the server, which shifts every later figure up by one.
function insertFigure(figures: Figure[], figure: Figure) {
  const later = figures.filter(({ order }) => order >= figure.order);
  return [
    ...figures.filter(({ order }) => order < figure.order),
    figure,
    ...later.map((each) => ({ ...each, order: each.order + 1 })),
  ];
}
