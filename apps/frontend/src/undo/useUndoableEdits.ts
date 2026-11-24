import type { Figure, FigureUpdate, Path, Position } from '@living-stage/shared';
import type { CastActions } from '../cast/useCast.ts';
import type { Edit } from './history.ts';
import { useHistory } from './useHistory.ts';

type Saves = Pick<CastActions, 'movePositions' | 'setPath' | 'saveFigure'>;

// The edits on one figure that can be undone, each recorded once it is saved.
export function useUndoableEdits(saves: Saves) {
  const history = useHistory(apply);

  function apply(figureId: string, edit: Edit) {
    if (edit.kind === 'positions') return saves.movePositions(figureId, edit.positions);
    if (edit.kind === 'path') return saves.setPath(figureId, edit.path);
    return saves.saveFigure(figureId, edit.update);
  }

  async function save(figure: Figure, before: Edit, after: Edit) {
    await apply(figure.id, after);
    history.record({ figureId: figure.id, before, after });
  }

  function movePositions(figure: Figure, positions: Position[]) {
    const before = figure.positions.filter(({ castMemberId }) =>
      positions.some((moved) => moved.castMemberId === castMemberId),
    );
    return save(figure, { kind: 'positions', positions: before }, { kind: 'positions', positions });
  }

  function setPath(figure: Figure, path: Path) {
    const { castMemberId } = path;
    const before = figure.paths.find((each) => each.castMemberId === castMemberId) ?? {
      castMemberId,
      points: [],
      around: null,
    };
    return save(figure, { kind: 'path', path: before }, { kind: 'path', path });
  }

  // Saving the panel unchanged is not a step.
  async function saveFigure(figure: Figure, update: FigureUpdate) {
    const before = earlier(figure, update);
    if (Object.keys(update).every((key) => same(before, update, key as keyof FigureUpdate))) {
      return saves.saveFigure(figure.id, update);
    }
    return save(figure, { kind: 'figure', update: before }, { kind: 'figure', update });
  }

  return { movePositions, setPath, saveFigure, ...history };
}

function earlier(figure: Figure, update: FigureUpdate): FigureUpdate {
  return {
    ...('name' in update && { name: figure.name }),
    ...('transitionMs' in update && { transitionMs: figure.transitionMs }),
    ...('timeMs' in update && figure.timeMs !== null && { timeMs: figure.timeMs }),
  };
}

const same = (before: FigureUpdate, after: FigureUpdate, key: keyof FigureUpdate) =>
  before[key] === after[key];
