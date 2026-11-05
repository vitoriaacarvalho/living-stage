import type { Act, ActLayout } from '@living-stage/shared';
import { describe, expect, test } from 'vitest';
import { arrange, layoutOf, moveAct, moveDance, sameLayout } from './show-order.ts';

const layout: ActLayout[] = [
  { id: 'act-1', danceIds: ['a', 'b', 'c'] },
  { id: 'act-2', danceIds: ['d'] },
  { id: 'act-3', danceIds: [] },
];

const order = (next: ActLayout[]) => next.map(({ id, danceIds }) => `${id}:${danceIds.join('')}`);

describe('moveAct', () => {
  test('moves an act down to the place of another', () => {
    expect(order(moveAct(layout, 'act-1', 'act-3'))).toEqual(['act-2:d', 'act-3:', 'act-1:abc']);
  });

  test('moves an act up to the place of another', () => {
    expect(order(moveAct(layout, 'act-3', 'act-1'))).toEqual(['act-3:', 'act-1:abc', 'act-2:d']);
  });

  test("moves an act to the place of a dance's act", () => {
    expect(order(moveAct(layout, 'act-1', 'd'))).toEqual(['act-2:d', 'act-1:abc', 'act-3:']);
  });

  test('keeps the order when an act is dropped on itself', () => {
    expect(moveAct(layout, 'act-2', 'act-2')).toBe(layout);
  });

  test('keeps the order for an unknown act', () => {
    expect(moveAct(layout, 'act-9', 'act-1')).toBe(layout);
  });
});

describe('moveDance', () => {
  test('moves a dance down within its act', () => {
    expect(order(moveDance(layout, 'a', 'c'))[0]).toBe('act-1:bca');
  });

  test('moves a dance up within its act', () => {
    expect(order(moveDance(layout, 'c', 'a'))[0]).toBe('act-1:cab');
  });

  test('moves a dance into another act at the place of a dance there', () => {
    expect(order(moveDance(layout, 'b', 'd')).slice(0, 2)).toEqual(['act-1:ac', 'act-2:bd']);
  });

  test("puts a dance dropped on another act's head at its end", () => {
    expect(order(moveDance(layout, 'a', 'act-2')).slice(0, 2)).toEqual(['act-1:bc', 'act-2:da']);
  });

  test('puts a dance into an empty act', () => {
    expect(order(moveDance(layout, 'd', 'act-3')).slice(1)).toEqual(['act-2:', 'act-3:d']);
  });

  test("keeps the order when a dance is dropped on its own act's head", () => {
    expect(moveDance(layout, 'a', 'act-1')).toBe(layout);
  });

  test('keeps the order when a dance is dropped on itself', () => {
    expect(moveDance(layout, 'b', 'b')).toBe(layout);
  });

  test('keeps the order for an unknown dance', () => {
    expect(moveDance(layout, 'z', 'a')).toBe(layout);
  });
});

const dance = (id: string) => ({
  id,
  danceId: `dance-${id}`,
  title: id,
  castCount: 1,
  durationMs: null,
  cast: [],
});
const acts: Act[] = [
  { id: 'act-1', order: 0, name: null, dances: [dance('a'), dance('b')] },
  { id: 'act-2', order: 1, name: 'Classics', dances: [] },
];

describe('layoutOf', () => {
  test('lists each act with its dances in order', () => {
    expect(layoutOf(acts)).toEqual([
      { id: 'act-1', danceIds: ['a', 'b'] },
      { id: 'act-2', danceIds: [] },
    ]);
  });
});

describe('arrange', () => {
  test('puts the acts and dances in the layout order', () => {
    const moved = arrange(acts, [
      { id: 'act-2', danceIds: ['b'] },
      { id: 'act-1', danceIds: ['a'] },
    ]);
    expect(moved.map(({ id, dances }) => `${id}:${dances.map((d) => d.id).join('')}`)).toEqual([
      'act-2:b',
      'act-1:a',
    ]);
  });

  test('keeps each act as it was apart from its dances', () => {
    expect(arrange(acts, layoutOf(acts))[1]).toEqual(acts[1]);
  });

  test('leaves out an act the layout names but the show no longer has', () => {
    expect(arrange(acts, [...layoutOf(acts), { id: 'act-9', danceIds: [] }])).toHaveLength(2);
  });
});

describe('sameLayout', () => {
  test('finds an unchanged layout the same', () => {
    expect(sameLayout(layoutOf(acts), layoutOf(acts))).toBe(true);
  });

  test('finds a moved dance different', () => {
    expect(sameLayout(layoutOf(acts), moveDance(layoutOf(acts), 'a', 'act-2'))).toBe(false);
  });
});
