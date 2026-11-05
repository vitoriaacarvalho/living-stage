import type { ActLayout } from '@living-stage/shared';

const actOf = (layout: ActLayout[], id: string) =>
  layout.findIndex((act) => act.id === id || act.danceIds.includes(id));

function moved<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

// over may be an act or a dance; the act moves to the place of over's act.
export function moveAct(layout: ActLayout[], actId: string, overId: string): ActLayout[] {
  const from = layout.findIndex(({ id }) => id === actId);
  const to = actOf(layout, overId);
  if (from === -1 || to === -1 || from === to) return layout;
  return moved(layout, from, to);
}

// Over a dance, the dragged one takes its place; over an act, it goes to the end of that act.
export function moveDance(layout: ActLayout[], danceId: string, overId: string): ActLayout[] {
  const from = actOf(layout, danceId);
  const to = actOf(layout, overId);
  if (from === -1 || to === -1 || danceId === overId) return layout;
  const target = layout[to]!;
  const overIndex = target.danceIds.indexOf(overId);
  if (from === to) {
    if (overIndex === -1) return layout;
    const index = target.danceIds.indexOf(danceId);
    return layout.map((act, at) =>
      at === to ? { ...act, danceIds: moved(act.danceIds, index, overIndex) } : act,
    );
  }
  const place = overIndex === -1 ? target.danceIds.length : overIndex;
  return layout.map((act, at) => {
    if (at === from) return { ...act, danceIds: act.danceIds.filter((id) => id !== danceId) };
    if (at !== to) return act;
    const danceIds = [...act.danceIds];
    danceIds.splice(place, 0, danceId);
    return { ...act, danceIds };
  });
}
