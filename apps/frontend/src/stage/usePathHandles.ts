import {
  ARROW_LARGE_STEP_M,
  ARROW_STEP_M,
  PATH_HANDLE_MIN_M,
  PATH_STRAIGHT_M,
  arrowStep,
  clampToPlan,
  moveLengthM,
  offLineM,
  pathPointAt,
  pathPointSpot,
  type PathPoint,
  type StagePoint,
} from '@living-stage/shared';
import { type KeyboardEvent, type PointerEvent, type RefObject, useState } from 'react';
import type { StagePath } from './PathLayer.tsx';
import type { StageDancer } from './Stage.tsx';
import { TAP_SLOP_PX, stagePointAt, type StageEditing } from './usePlanGestures.ts';

// A straight path's one handle sits halfway along it; dragging it makes the first point.
const MIDDLE: PathPoint = { along: 0.5, side: 0 };

type Bending = {
  pointerId: number;
  start: { clientX: number; clientY: number };
  index: number;
  point: PathPoint;
  moved: boolean;
};

export type PathHandle = {
  label: string;
  spot: StagePoint;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

type HandleSetup = {
  paths: StagePath[];
  dancers: StageDancer[];
  edit: StageEditing | undefined;
  planRef: RefObject<HTMLElement | null>;
};

const replaced = (points: PathPoint[], index: number, point: PathPoint) =>
  points.map((each, at) => (at === index ? point : each));

// Only one selected dancer's path gets handles, and only on a move long enough that they
// stay clear of her own drag area.
export function usePathHandles({ paths, dancers, edit, planRef }: HandleSetup) {
  const [bending, setBending] = useState<Bending | null>(null);
  const path =
    edit?.selectedIds.length === 1 ? paths.find(({ id }) => id === edit.selectedIds[0]) : undefined;
  const dancer = path && dancers.find(({ id }) => id === path.id);
  const held = path && (path.points.length > 0 ? path.points : [MIDDLE]);
  const live = held && bending ? replaced(held, bending.index, bending.point) : held;
  const drawn =
    bending && path
      ? paths.map((each) => (each === path ? { ...each, points: live! } : each))
      : paths;

  if (!edit || !path || !dancer || !live || moveLengthM(path.from, dancer) < PATH_HANDLE_MIN_M) {
    return { drawn, handles: [] };
  }
  const { from } = path;

  // A point let go close to the line between its neighbours goes, and the curve with it.
  function save(points: PathPoint[], index: number, reach: number) {
    const kept =
      offLineM(from, dancer!, points, index) < reach
        ? points.filter((_, at) => at !== index)
        : points;
    edit!.onBend(path!.id, kept);
  }

  const label = (index: number) =>
    path.points.length === 0
      ? `Bend the path of ${dancer.label}`
      : `Point ${index + 1} of ${path.points.length} on the path of ${dancer.label}`;

  const handles = live.map((point, index): PathHandle => ({
    label: label(index),
    spot: clampToPlan(pathPointSpot(from, dancer, point)),
    onPointerDown(event) {
      event.stopPropagation();
      if (bending) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      const { pointerId, clientX, clientY } = event;
      setBending({ pointerId, start: { clientX, clientY }, index, point, moved: false });
    },
    onPointerMove(event) {
      if (!bending || event.pointerId !== bending.pointerId) return;
      const { clientX, clientY } = event;
      const travelled = Math.hypot(
        clientX - bending.start.clientX,
        clientY - bending.start.clientY,
      );
      if (!bending.moved && travelled < TAP_SLOP_PX) return;
      const spot = clampToPlan(stagePointAt(planRef.current!, clientX, clientY));
      setBending({ ...bending, moved: true, point: pathPointAt(from, dancer, spot) });
    },
    onPointerUp(event) {
      if (!bending || event.pointerId !== bending.pointerId) return;
      if (bending.moved) save(live, bending.index, PATH_STRAIGHT_M);
      setBending(null);
    },
    onPointerCancel(event) {
      if (bending && event.pointerId === bending.pointerId) setBending(null);
    },
    // By key a point goes within half a step, or one press could never leave the line.
    onKeyDown(event) {
      const step = arrowStep(event.key, event.shiftKey ? ARROW_LARGE_STEP_M : ARROW_STEP_M);
      if (!step || bending) return;
      event.preventDefault();
      const spot = pathPointSpot(from, dancer, point);
      const moved = clampToPlan({ x: spot.x + step.x, y: spot.y + step.y });
      save(replaced(live, index, pathPointAt(from, dancer, moved)), index, ARROW_STEP_M / 2);
    },
  }));
  return { drawn, handles };
}
