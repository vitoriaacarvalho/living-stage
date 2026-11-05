import type {
  CastMember,
  CastMemberInput,
  CastMemberUpdate,
  Figure,
  FigureCopy,
  FigureUpdate,
  Path,
  Position,
} from '@living-stage/shared';
import { useEffect, useState } from 'react';
import { addCastMember, fetchCast, removeCastMember, updateCastMember } from '../api/cast.ts';
import {
  copyFigure as postFigureCopy,
  deleteFigure as sendFigureDelete,
  fetchFigures,
  moveFigurePositions,
  reorderFigures as putFigureOrder,
  savePath,
  updateFigure,
} from '../api/figures.ts';

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
  saveFigure: (figureId: string, update: FigureUpdate) => Promise<void>;
  reorderFigures: (figureIds: string[]) => Promise<void>;
  deleteFigure: (figureId: string) => Promise<void>;
  movePositions: (figureId: string, positions: Position[]) => Promise<void>;
  bendPath: (figureId: string, path: Path) => Promise<void>;
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

  async function saveFigure(figureId: string, update: FigureUpdate) {
    const saved = await updateFigure(schoolId, danceId, figureId, update);
    change(({ cast, figures }) => ({
      cast,
      figures: figures.map((each) => (each.id === saved.id ? saved : each)),
    }));
  }

  // Shown right away; put back if saving fails.
  async function reorderFigures(figureIds: string[]) {
    const previous = state.status === 'ready' ? state.figures : [];
    change(({ cast, figures }) => ({ cast, figures: inOrder(figures, figureIds) }));
    try {
      await putFigureOrder(schoolId, danceId, { figureIds });
    } catch (error) {
      change(({ cast }) => ({ cast, figures: previous }));
      throw error;
    }
  }

  async function deleteFigure(figureId: string) {
    await sendFigureDelete(schoolId, danceId, figureId);
    change(({ cast, figures }) => ({
      cast,
      figures: figures
        .filter(({ id }) => id !== figureId)
        .map((figure, order) => ({ ...figure, order })),
    }));
  }

  // Shown right away; only the moved dancers go back if saving fails.
  async function movePositions(figureId: string, positions: Position[]) {
    const figure =
      state.status === 'ready' ? state.figures.find(({ id }) => id === figureId) : null;
    const previous = (figure?.positions ?? []).filter(({ castMemberId }) =>
      positions.some((moved) => moved.castMemberId === castMemberId),
    );
    change(({ cast, figures }) => ({ cast, figures: placed(figures, figureId, positions) }));
    try {
      await moveFigurePositions(schoolId, danceId, figureId, { positions });
    } catch (error) {
      change(({ cast, figures }) => ({ cast, figures: placed(figures, figureId, previous) }));
      throw error;
    }
  }

  // Shown right away; the path goes back to how it was if saving fails.
  async function bendPath(figureId: string, path: Path) {
    const figure =
      state.status === 'ready' ? state.figures.find(({ id }) => id === figureId) : null;
    const previous = figure?.paths.find(({ castMemberId }) => castMemberId === path.castMemberId);
    const before = previous ?? { castMemberId: path.castMemberId, points: [] };
    change(({ cast, figures }) => ({ cast, figures: withPath(figures, figureId, path) }));
    try {
      await savePath(schoolId, danceId, { figureId, castMemberId: path.castMemberId }, path.points);
    } catch (error) {
      change(({ cast, figures }) => ({ cast, figures: withPath(figures, figureId, before) }));
      throw error;
    }
  }

  return {
    state,
    add,
    save,
    give,
    remove,
    copyFigure,
    saveFigure,
    reorderFigures,
    deleteFigure,
    movePositions,
    bendPath,
  };
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

function inOrder(figures: Figure[], figureIds: string[]) {
  return figureIds.flatMap((id, order) => {
    const figure = figures.find((each) => each.id === id);
    return figure ? [{ ...figure, order }] : [];
  });
}

function placed(figures: Figure[], figureId: string, positions: Position[]) {
  return figures.map((figure) =>
    figure.id === figureId
      ? {
          ...figure,
          positions: figure.positions.map(
            (position) =>
              positions.find(({ castMemberId }) => castMemberId === position.castMemberId) ??
              position,
          ),
        }
      : figure,
  );
}

// A path with no points is straight, so it leaves the figure's list.
function withPath(figures: Figure[], figureId: string, path: Path): Figure[] {
  return figures.map((figure) => {
    if (figure.id !== figureId) return figure;
    const others = figure.paths.filter(({ castMemberId }) => castMemberId !== path.castMemberId);
    return { ...figure, paths: path.points.length === 0 ? others : [...others, path] };
  });
}
