import type { DancerColor } from '@living-stage/shared';

const colorNames = [
  'Coral',
  'Amber',
  'Green',
  'Teal',
  'Blue',
  'Violet',
  'Orchid',
  'Chestnut',
  'Lime',
  'Sky',
  'Pink',
  'Stone',
];

export const dancerColors: DancerColor[] = colorNames.map((_, index) => index + 1);

export function dancerColorName(color: DancerColor | null): string {
  return color === null ? 'No color' : colorNames[color - 1]!;
}

export function dancerColorVar(color: DancerColor | null): string {
  return color === null ? 'var(--hairline)' : `var(--dancer-${color})`;
}

export function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const first = words[0] ?? '';
  const last = words.length > 1 ? words.at(-1)! : '';
  return (first.charAt(0) + last.charAt(0)).toLocaleUpperCase();
}
