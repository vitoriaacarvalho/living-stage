import type { Figure } from '@living-stage/shared';

// Numbered by place, not by the saved order, so the label follows reordering.
export function figureLabel({ name }: Figure, index: number) {
  return name ?? `Figure ${index + 1}`;
}
