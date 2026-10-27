export const DANCER_NAME_MAX_LENGTH = 80;

// Numbers of the dancer-1 … dancer-12 tokens in the design system, so the stored value survives palette tweaks.
export const DANCER_COLOR_COUNT = 12;

export type DancerColor = number;

export type Dancer = { id: string; name: string; color: DancerColor | null };

export type DancerInput = { name: string; color: DancerColor | null };

export type ListDancersResponse = { dancers: Dancer[] };

export type DancerResponse = { dancer: Dancer };

export function parseDancerName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  if (name.length === 0 || name.length > DANCER_NAME_MAX_LENGTH) return null;
  return name;
}

export function isDancerColor(value: unknown): value is DancerColor {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= DANCER_COLOR_COUNT
  );
}

export function parseDancerInput(value: unknown): DancerInput | null {
  if (typeof value !== 'object' || value === null) return null;
  const { name: rawName, color = null } = value as Record<string, unknown>;
  const name = parseDancerName(rawName);
  if (!name) return null;
  if (color !== null && !isDancerColor(color)) return null;
  return { name, color };
}
