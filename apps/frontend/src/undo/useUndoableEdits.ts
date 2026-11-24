import type { Figure, Position } from '@living-stage/shared';
import type { CastActions } from '../cast/useCast.ts';
import type { Edit } from './history.ts';
import { useHistory } from './useHistory.ts';

type Saves = Pick<CastActions, 'movePositions'>;

// The edits on one figure's stage that can be undone, each recorded once it is saved.
export function useUndoableEdits(saves: Saves, figure: Figure | undefined) {
  const history = useHistory(apply);

  function apply(figureId: string, edit: Edit) {
    return saves.movePositions(figureId, edit.kind === 'positions' ? edit.positions : []);
  }

  async function movePositions(positions: Position[]) {
    if (!figure) return;
    const before = figure.positions.filter(({ castMemberId }) =>
      positions.some((moved) => moved.castMemberId === castMemberId),
    );
    await saves.movePositions(figure.id, positions);
    history.record({
      figureId: figure.id,
      before: { kind: 'positions', positions: before },
      after: { kind: 'positions', positions },
    });
  }

  const id = figure?.id;
  return {
    movePositions,
    undo: id && history.canUndo(id) ? () => history.undo(id) : null,
    redo: id && history.canRedo(id) ? () => history.redo(id) : null,
    clear: history.clear,
  };
}
