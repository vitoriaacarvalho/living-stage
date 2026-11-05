import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  formatDuration,
  type ActLayout,
  type DanceSummary,
  type ShowDetail,
} from '@living-stage/shared';
import { Fragment } from 'react';
import { useState } from 'react';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import { ActCard, type DragKind } from './ActCard.tsx';
import { actLabel } from './act-label.ts';
import { arrange, layoutOf, moveAct, moveDance, sameLayout } from './show-order.ts';
import styles from './ShowPage.module.css';
import type { ShowActions } from './useShow.ts';

// Space picks a handle up and drops it; Enter stays a press on the handle.
const keyboardCodes = { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Tab'] };

const instructions = {
  draggable:
    'To move an act or a dance, press Space on its handle, move it with the arrow keys, then press Space again. Press Escape to cancel.',
};

type Container = { data: { current?: Record<string, unknown> } };

const kindOf = (container: Container) => container.data.current?.kind as DragKind | undefined;

// Where each kind can land: an act among acts, a dance on a dance or an empty act.
function landsOn(dragging: DragKind | undefined) {
  return (container: Container) =>
    dragging === 'act'
      ? kindOf(container) === 'act'
      : kindOf(container) === 'dance' || container.data.current?.empty === true;
}

// dnd-kit's keyboard steps go to the nearest droppable of any kind; this limits them to the
// places the dragged item can land.
const keyboardSteps: KeyboardCoordinateGetter = (event, args) => {
  const all = args.context.droppableContainers;
  const lands = landsOn(
    args.active ? (all.get(args.active)?.data.current?.kind as DragKind) : undefined,
  );
  const droppableContainers = {
    ...all,
    get: (id: UniqueIdentifier) => all.get(id),
    getEnabled: () => all.getEnabled().filter(lands),
  } as typeof all;
  return sortableKeyboardCoordinates(event, {
    ...args,
    context: { ...args.context, droppableContainers },
  });
};

// An act only lands among acts. A dance prefers the dance under the pointer, then the act it
// is over (to go to its end). With no pointer, as by keyboard, it takes the nearest dance or
// empty act: a whole act's centre would otherwise beat the rows around it.
const collision: CollisionDetection = (args) => {
  const dragging = args.active.data.current?.kind as DragKind;
  const landings = args.droppableContainers.filter(landsOn(dragging));
  if (dragging === 'act') return closestCenter({ ...args, droppableContainers: landings });
  const within = pointerWithin(args);
  const kindIn = (id: UniqueIdentifier) =>
    kindOf(args.droppableContainers.find((c) => c.id === id)!);
  const dance = within.find(({ id }) => kindIn(id) === 'dance' && id !== args.active.id);
  if (dance) return [dance];
  if (within.length > 0) return within.filter(({ id }) => kindIn(id) === 'act');
  return closestCenter({ ...args, droppableContainers: landings });
};

type RunningOrderProps = { show: ShowDetail; actions: ShowActions; dances: DanceSummary[] };

export function RunningOrder({ show, actions, dances }: RunningOrderProps) {
  const [draft, setDraft] = useState<ActLayout[] | null>(null);
  // The item a dance was over when it crossed into another act; dropping there keeps that place.
  const [crossedOver, setCrossedOver] = useState<UniqueIdentifier | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardSteps, keyboardCodes }),
  );
  const acts = draft ? arrange(show.acts, draft) : show.acts;
  const onlyAct = acts.length === 1;
  const inShow = new Set(acts.flatMap((act) => act.dances.map(({ danceId }) => danceId)));
  const addable = dances.filter(({ id }) => !inShow.has(id));

  function nameOf(id: UniqueIdentifier) {
    const index = acts.findIndex((act) => act.id === id);
    if (index !== -1) return actLabel(acts[index]!, index);
    return acts.flatMap((act) => act.dances).find((dance) => dance.id === id)?.title ?? 'it';
  }

  function placeOf(id: UniqueIdentifier) {
    const index = acts.findIndex((act) => act.id === id);
    if (index !== -1) return `place ${index + 1} of the acts`;
    const at = acts.findIndex((act) => act.dances.some((dance) => dance.id === id));
    const place = acts[at]?.dances.findIndex((dance) => dance.id === id) ?? -1;
    return at === -1 ? 'its place' : `${actLabel(acts[at]!, at)}, place ${place + 1}`;
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}.`,
    onDragOver: ({ active }) => `${nameOf(active.id)} is now in ${placeOf(active.id)}.`,
    onDragEnd: ({ active }) => `Dropped ${nameOf(active.id)} in ${placeOf(active.id)}.`,
    onDragCancel: ({ active }) => `${nameOf(active.id)} stays where it was.`,
  };

  // A dance crossing into another act moves there at once, so the drop spot shows.
  function handleDragOver({ active, over }: DragOverEvent) {
    if (!draft || !over || active.data.current?.kind !== 'dance') return;
    const from = draft.findIndex(({ danceIds }) => danceIds.includes(String(active.id)));
    const to = draft.findIndex(
      ({ id, danceIds }) => id === over.id || danceIds.includes(String(over.id)),
    );
    if (from === to) return;
    setDraft(moveDance(draft, String(active.id), String(over.id)));
    setCrossedOver(over.id);
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    const start = layoutOf(show.acts);
    const current = draft ?? start;
    setDraft(null);
    setCrossedOver(null);
    const move = active.data.current?.kind === 'act' ? moveAct : moveDance;
    const settled = !over || over.id === crossedOver;
    const next = settled ? current : move(current, String(active.id), String(over.id));
    if (sameLayout(next, start)) return;
    setFailed(null);
    try {
      await actions.reorder(next);
    } catch {
      setFailed('Could not move it. Try again.');
    }
  }

  async function addAct() {
    setFailed(null);
    try {
      await actions.addAct();
    } catch {
      setFailed('Could not add the act. Try again.');
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={collision}
        accessibility={{ announcements, screenReaderInstructions: instructions }}
        onDragStart={() => setDraft(layoutOf(show.acts))}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setDraft(null);
          setCrossedOver(null);
        }}
      >
        <SortableContext items={acts.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
          <ol className={styles.acts} aria-label="Acts">
            {acts.map((act, index) => (
              <Fragment key={act.id}>
                {index > 0 && show.intervalMs > 0 && (
                  <li className={styles.interval}>
                    <span>Interval</span>
                    <span className={styles.intervalTime}>{formatDuration(show.intervalMs)}</span>
                  </li>
                )}
                <li>
                  <ActCard
                    act={act}
                    label={actLabel(act, index)}
                    actions={{
                      saveAct: actions.saveAct,
                      remove: onlyAct ? null : () => actions.removeAct(act.id),
                      addDance: (danceId) => actions.addDance(act.id, danceId),
                      removeDance: (dance) => actions.removeDance(act.id, dance.id),
                      setDuration: (dance, durationMs) =>
                        actions.setDuration(dance.danceId, durationMs),
                      addable,
                    }}
                  />
                </li>
              </Fragment>
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {failed && (
        <p role="alert" className={formStyles.error}>
          {failed}
        </p>
      )}
      <div>
        <Button variant="secondary" icon="plus" onClick={addAct}>
          New act
        </Button>
      </div>
    </>
  );
}
