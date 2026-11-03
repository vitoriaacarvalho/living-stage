import { arrayMove } from '@dnd-kit/sortable';

// The figure ids once the dragged figure is dropped on another figure's place.
export function droppedOrder(figureIds: string[], draggedId: string, overId: string | null) {
  const from = figureIds.indexOf(draggedId);
  const to = overId === null ? -1 : figureIds.indexOf(overId);
  if (from === -1 || to === -1 || from === to) return null;
  return arrayMove(figureIds, from, to);
}
