import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Figure } from '@living-stage/shared';
import { useRef, useState } from 'react';
import formStyles from '../ui/Form.module.css';
import { Icon } from '../ui/Icon.tsx';
import { figureLabel } from './figure-label.ts';
import { droppedOrder } from './figure-order.ts';
import styles from './FigureStrip.module.css';

// Space picks a figure up and drops it; Enter stays a tap, so it still selects.
const keyboardCodes = { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Tab'] };

const instructions = {
  draggable:
    'To move a figure, press Space, move it with the arrow keys, then press Space again. Press Escape to cancel.',
};

// editable shows the pencil: tapping that chip again opens its panel. While playing, the
// figure being reached is marked instead, without it.
export type ActiveFigure = { id: string; editable: boolean };

type FigureStripProps = {
  figures: Figure[];
  active: ActiveFigure;
  onSelect: (figureId: string) => void;
  onReorder: (figureIds: string[]) => Promise<void>;
};

export function FigureStrip({ figures, active, onSelect, onReorder }: FigureStripProps) {
  const [failed, setFailed] = useState(false);
  const dragging = useRef(false);
  const ids = figures.map(({ id }) => id);
  // A finger holds a figure for a moment to drag it, so a quick swipe still scrolls the strip.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes }),
  );

  function labelOf(id: UniqueIdentifier) {
    const index = ids.indexOf(String(id));
    return index === -1 ? 'the figure' : figureLabel(figures[index]!, index);
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${labelOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${labelOf(active.id)} is now in place ${ids.indexOf(String(over.id)) + 1}.`
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Dropped ${labelOf(active.id)} in place ${ids.indexOf(String(over.id)) + 1}.`
        : undefined,
    onDragCancel: ({ active }) => `${labelOf(active.id)} stays where it was.`,
  };

  // The click that ends a pointer drag is not a tap.
  function endDrag() {
    setTimeout(() => (dragging.current = false));
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    endDrag();
    const order = droppedOrder(ids, String(active.id), over ? String(over.id) : null);
    if (!order) return;
    setFailed(false);
    try {
      await onReorder(order);
    } catch {
      setFailed(true);
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        accessibility={{ announcements, screenReaderInstructions: instructions }}
        onDragStart={() => (dragging.current = true)}
        onDragEnd={handleDragEnd}
        onDragCancel={endDrag}
      >
        <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
          <ol className={styles.strip} aria-label="Figures">
            {figures.map((figure, index) => (
              <FigureChip
                key={figure.id}
                figure={figure}
                label={figureLabel(figure, index)}
                mark={figure.id !== active.id ? null : active.editable ? 'selected' : 'reached'}
                onTap={() => {
                  if (!dragging.current) onSelect(figure.id);
                }}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {failed && (
        <p role="alert" className={formStyles.error}>
          Could not move the figure. Try again.
        </p>
      )}
    </>
  );
}

type FigureChipProps = {
  figure: Figure;
  label: string;
  mark: 'selected' | 'reached' | null;
  onTap: () => void;
};

function FigureChip({ figure, label, mark, onTap }: FigureChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: figure.id,
  });
  return (
    <li
      ref={setNodeRef}
      className={isDragging ? styles.lifted : undefined}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <button
        type="button"
        className={styles.chip}
        {...attributes}
        {...listeners}
        aria-roledescription="draggable figure"
        aria-current={mark ? 'true' : undefined}
        onClick={onTap}
      >
        {label}
        {mark === 'selected' && <Icon name="pencil" />}
      </button>
    </li>
  );
}
