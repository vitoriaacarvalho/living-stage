import type { Act } from '@living-stage/shared';

// Acts are numbered by their place, so the number follows reordering.
export function actLabel({ name }: Pick<Act, 'name'>, index: number): string {
  return name ? `Act ${index + 1} · ${name}` : `Act ${index + 1}`;
}
