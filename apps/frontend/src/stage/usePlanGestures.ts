import {
  ARROW_LARGE_STEP_M,
  ARROW_STEP_M,
  PLAN_BOUNDS,
  arrowStep,
  moveGroup,
  snapToGuides,
  type PathPoint,
  type Position,
  type StagePoint,
} from '@living-stage/shared';
import { type KeyboardEvent, type PointerEvent, type RefObject, useState } from 'react';
import type { StageDancer } from './Stage.tsx';

export type StageEditing = {
  selectedIds: string[];
  snap: boolean;
  onSelect: (ids: string[]) => void;
  onMove: (positions: Position[]) => void;
  // No points makes the path straight again.
  onBend: (castMemberId: string, points: PathPoint[]) => void;
};

type Press = { pointerId: number; start: { clientX: number; clientY: number }; moved: boolean };

type DragGesture = Press & {
  kind: 'drag';
  dancerId: string;
  origins: Position[];
  delta: StagePoint;
};

type Gesture = DragGesture | (Press & { kind: 'box'; from: StagePoint; to: StagePoint });

export type DancerHandlers = {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

export type SelectionBox = { left: number; top: number; right: number; bottom: number };

type GestureSetup = {
  dancers: StageDancer[];
  edit: StageEditing | undefined;
  planRef: RefObject<HTMLElement | null>;
};

// A press that travels less than this is a tap, so a shaky finger doesn't move anyone.
export const TAP_SLOP_PX = 4;

const spanX = PLAN_BOUNDS.maxX - PLAN_BOUNDS.minX;
const spanY = PLAN_BOUNDS.maxY - PLAN_BOUNDS.minY;

function boxOf({ from, to }: { from: StagePoint; to: StagePoint }): SelectionBox {
  return {
    left: Math.min(from.x, to.x),
    top: Math.min(from.y, to.y),
    right: Math.max(from.x, to.x),
    bottom: Math.max(from.y, to.y),
  };
}

function inBox({ x, y }: StagePoint, box: SelectionBox) {
  return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
}

// The dragged dancer lands on the guide and the rest of the group keeps its offsets.
function snapped(
  { origins, dancerId }: Pick<DragGesture, 'origins' | 'dancerId'>,
  delta: StagePoint,
) {
  const origin = origins.find(({ castMemberId }) => castMemberId === dancerId)!;
  const target = snapToGuides({ x: origin.x + delta.x, y: origin.y + delta.y });
  return { x: target.x - origin.x, y: target.y - origin.y };
}

// The plan box spans exactly PLAN_BOUNDS, so its pixels map straight onto stage units.
export function stagePointAt(plan: HTMLElement, clientX: number, clientY: number): StagePoint {
  const rect = plan.getBoundingClientRect();
  return {
    x: PLAN_BOUNDS.minX + ((clientX - rect.left) / rect.width) * spanX,
    y: PLAN_BOUNDS.minY + ((clientY - rect.top) / rect.height) * spanY,
  };
}

export function usePlanGestures({ dancers, edit, planRef }: GestureSetup) {
  const [gesture, setGesture] = useState<Gesture | null>(null);

  const toStage = (clientX: number, clientY: number) =>
    stagePointAt(planRef.current!, clientX, clientY);

  const moved = gesture?.kind === 'drag' ? moveGroup(gesture.origins, gesture.delta) : [];
  const shown = dancers.map((dancer) => {
    const spot = moved.find(({ castMemberId }) => castMemberId === dancer.id);
    return spot ? { ...dancer, x: spot.x, y: spot.y } : dancer;
  });
  const box = gesture?.kind === 'box' && gesture.moved ? boxOf(gesture) : null;

  function start(event: PointerEvent<HTMLElement>): Press {
    event.currentTarget.setPointerCapture(event.pointerId);
    const { pointerId, clientX, clientY } = event;
    return { pointerId, start: { clientX, clientY }, moved: false };
  }

  function toggle(dancerId: string) {
    if (!edit) return;
    const { selectedIds } = edit;
    edit.onSelect(
      selectedIds.includes(dancerId)
        ? selectedIds.filter((id) => id !== dancerId)
        : [...selectedIds, dancerId],
    );
  }

  // Moving a dancer who isn't selected selects only her first, by pointer or by key.
  function grab(editing: StageEditing, dancerId: string): Position[] {
    const selected = editing.selectedIds.includes(dancerId);
    const ids = selected ? editing.selectedIds : [dancerId];
    if (!selected) editing.onSelect(ids);
    return dancers
      .filter(({ id }) => ids.includes(id))
      .map(({ id, x, y }) => ({ castMemberId: id, x, y }));
  }

  function pressDancer(dancer: StageDancer, event: PointerEvent<HTMLElement>) {
    event.stopPropagation();
    if (!edit || gesture) return;
    if (event.shiftKey) {
      toggle(dancer.id);
      return;
    }
    setGesture({
      ...start(event),
      kind: 'drag',
      dancerId: dancer.id,
      origins: grab(edit, dancer.id),
      delta: { x: 0, y: 0 },
    });
  }

  function pressKey(dancer: StageDancer, event: KeyboardEvent<HTMLElement>) {
    if (!edit || gesture) return;
    const step = arrowStep(event.key, event.shiftKey ? ARROW_LARGE_STEP_M : ARROW_STEP_M);
    if (step) {
      event.preventDefault();
      nudge(edit, dancer.id, step);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (event.shiftKey) toggle(dancer.id);
      else edit.onSelect([dancer.id]);
    }
  }

  // A group already against the edge doesn't move, so there is nothing to save.
  function nudge(editing: StageEditing, dancerId: string, step: StagePoint) {
    const origins = grab(editing, dancerId);
    const moved = moveGroup(origins, step);
    if (moved.some((spot, index) => spot.x !== origins[index]!.x || spot.y !== origins[index]!.y)) {
      editing.onMove(moved);
    }
  }

  function pressFloor(event: PointerEvent<HTMLElement>) {
    if (!edit || gesture) return;
    const from = toStage(event.clientX, event.clientY);
    setGesture({ ...start(event), kind: 'box', from, to: from });
  }

  function follow(event: PointerEvent<HTMLElement>) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const dx = event.clientX - gesture.start.clientX;
    const dy = event.clientY - gesture.start.clientY;
    if (!gesture.moved && Math.hypot(dx, dy) < TAP_SLOP_PX) return;
    if (gesture.kind === 'box') {
      setGesture({ ...gesture, moved: true, to: toStage(event.clientX, event.clientY) });
      return;
    }
    const { width, height } = planRef.current!.getBoundingClientRect();
    const delta = { x: (dx / width) * spanX, y: (dy / height) * spanY };
    setGesture({ ...gesture, moved: true, delta: edit?.snap ? snapped(gesture, delta) : delta });
  }

  function release(event: PointerEvent<HTMLElement>) {
    if (!edit || !gesture || event.pointerId !== gesture.pointerId) return;
    if (gesture.kind === 'drag') {
      if (gesture.moved) edit.onMove(moveGroup(gesture.origins, gesture.delta));
      else edit.onSelect([gesture.dancerId]);
    } else if (gesture.moved) {
      const area = boxOf(gesture);
      edit.onSelect(dancers.filter((dancer) => inBox(dancer, area)).map(({ id }) => id));
    } else if (edit.selectedIds.length > 0) {
      edit.onSelect([]);
    }
    setGesture(null);
  }

  function cancel(event: PointerEvent<HTMLElement>) {
    if (gesture && event.pointerId === gesture.pointerId) setGesture(null);
  }

  const floor = {
    onPointerDown: pressFloor,
    onPointerMove: follow,
    onPointerUp: release,
    onPointerCancel: cancel,
  };
  const dancerHandlers = (dancer: StageDancer): DancerHandlers => ({
    onPointerDown: (event) => pressDancer(dancer, event),
    onKeyDown: (event) => pressKey(dancer, event),
  });

  return { shown, box, floor, dancerHandlers };
}
