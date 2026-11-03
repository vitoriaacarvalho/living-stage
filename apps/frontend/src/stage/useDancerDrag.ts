import { PLAN_BOUNDS, moveGroup, type Position, type StagePoint } from '@living-stage/shared';
import { type PointerEvent, type RefObject, useState } from 'react';
import type { StageDancer } from './Stage.tsx';

export type StageEditing = {
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onMove: (positions: Position[]) => void;
};

type Drag = {
  pointerId: number;
  dancerId: string;
  start: { clientX: number; clientY: number };
  origins: Position[];
  delta: StagePoint | null;
};

type DragSetup = {
  dancers: StageDancer[];
  edit: StageEditing | undefined;
  planRef: RefObject<HTMLElement | null>;
};

// A press that travels less than this is a tap, so a shaky finger doesn't move anyone.
const TAP_SLOP_PX = 4;

export function useDancerDrag({ dancers, edit, planRef }: DragSetup) {
  const [drag, setDrag] = useState<Drag | null>(null);

  const moved = drag?.delta ? moveGroup(drag.origins, drag.delta) : [];
  const shown = dancers.map((dancer) => {
    const spot = moved.find(({ castMemberId }) => castMemberId === dancer.id);
    return spot ? { ...dancer, x: spot.x, y: spot.y } : dancer;
  });

  function press(dancer: StageDancer, event: PointerEvent<HTMLElement>) {
    event.stopPropagation();
    if (!edit || drag) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const selected = edit.selectedIds.includes(dancer.id);
    const ids = selected ? edit.selectedIds : [dancer.id];
    if (!selected) edit.onSelect(ids);
    setDrag({
      pointerId: event.pointerId,
      dancerId: dancer.id,
      start: { clientX: event.clientX, clientY: event.clientY },
      origins: dancers
        .filter(({ id }) => ids.includes(id))
        .map(({ id, x, y }) => ({ castMemberId: id, x, y })),
      delta: null,
    });
  }

  function follow(event: PointerEvent<HTMLElement>) {
    const plan = planRef.current;
    if (!drag || !plan || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.start.clientX;
    const dy = event.clientY - drag.start.clientY;
    if (!drag.delta && Math.hypot(dx, dy) < TAP_SLOP_PX) return;
    const { width, height } = plan.getBoundingClientRect();
    const delta = {
      x: (dx / width) * (PLAN_BOUNDS.maxX - PLAN_BOUNDS.minX),
      y: (dy / height) * (PLAN_BOUNDS.maxY - PLAN_BOUNDS.minY),
    };
    setDrag({ ...drag, delta });
  }

  function release(event: PointerEvent<HTMLElement>) {
    if (!edit || !drag || event.pointerId !== drag.pointerId) return;
    if (drag.delta) edit.onMove(moveGroup(drag.origins, drag.delta));
    else edit.onSelect([drag.dancerId]);
    setDrag(null);
  }

  function cancel(event: PointerEvent<HTMLElement>) {
    if (drag && event.pointerId === drag.pointerId) setDrag(null);
  }

  const handlers = (dancer: StageDancer) => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => press(dancer, event),
    onPointerMove: follow,
    onPointerUp: release,
    onPointerCancel: cancel,
  });

  return { shown, handlers };
}
