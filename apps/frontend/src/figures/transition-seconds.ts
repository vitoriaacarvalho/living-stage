import { parseTransitionMs } from '@living-stage/shared';

export function transitionSeconds(transitionMs: number): string {
  return String(transitionMs / 1000);
}

// A comma is accepted too, since Portuguese writes 4,5 for 4.5.
export function parseTransitionSeconds(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  return parseTransitionMs(Math.round(Number(trimmed) * 1000));
}
