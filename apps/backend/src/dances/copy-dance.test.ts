import { describe, expect, test } from 'vitest';
import { danceCopy, type DanceSource } from './copy-dance.ts';

const castCreatedAt = new Date('2026-10-27T12:00:00.000Z');

const kitri: DanceSource = {
  schoolId: 'school-1',
  title: 'Kitri variation',
  showGuides: false,
  labelMode: 'role',
  colorMode: 'role',
  durationMs: 220_000,
  cast: [
    { id: 'cast-1', dancerId: 'dancer-1', role: 'Kitri', createdAt: castCreatedAt },
    { id: 'cast-2', dancerId: null, role: null, createdAt: castCreatedAt },
  ],
  figures: [
    {
      id: 'figure-1',
      order: 0,
      name: 'Entrance',
      transitionMs: 4000,
      positions: [
        { castMemberId: 'cast-1', x: 0.25, y: 0.5 },
        { castMemberId: 'cast-2', x: 0.75, y: 0.5 },
      ],
      paths: [],
    },
    {
      id: 'figure-2',
      order: 1,
      name: null,
      transitionMs: 2500,
      positions: [{ castMemberId: 'cast-1', x: 0.5, y: 0.25 }],
      paths: [{ castMemberId: 'cast-1', points: [{ along: 0.4, side: -0.3 }] }],
    },
  ],
};

describe('danceCopy', () => {
  test('names the copy after the dance', () => {
    expect(danceCopy(kitri).dance.title).toBe('Kitri variation (copy)');
  });

  test('keeps the school, view settings and duration', () => {
    expect(danceCopy(kitri).dance).toMatchObject({
      schoolId: 'school-1',
      showGuides: false,
      labelMode: 'role',
      colorMode: 'role',
      durationMs: 220_000,
    });
  });

  test('gives the copy a new id', () => {
    expect(danceCopy(kitri).dance.id).not.toBe('dance-1');
  });

  test('copies the cast in order with dancers, roles and open spots', () => {
    expect(danceCopy(kitri).cast).toMatchObject([
      { dancerId: 'dancer-1', role: 'Kitri', createdAt: castCreatedAt },
      { dancerId: null, role: null, createdAt: castCreatedAt },
    ]);
  });

  test('puts the cast in the copy', () => {
    const copy = danceCopy(kitri);
    expect(copy.cast.map(({ danceId }) => danceId)).toEqual([copy.dance.id, copy.dance.id]);
  });

  test('gives each cast member a new id', () => {
    const ids = danceCopy(kitri).cast.map(({ id }) => id);
    expect(ids).not.toContain('cast-1');
  });

  test('copies the figures in order with names and transition times', () => {
    expect(danceCopy(kitri).figures).toMatchObject([
      { order: 0, name: 'Entrance', transitionMs: 4000 },
      { order: 1, name: null, transitionMs: 2500 },
    ]);
  });

  test('puts the figures in the copy', () => {
    const copy = danceCopy(kitri);
    expect(copy.figures.map(({ danceId }) => danceId)).toEqual([copy.dance.id, copy.dance.id]);
  });

  test('places each copied cast member where the original stood in each figure', () => {
    const { cast, figures, positions } = danceCopy(kitri);
    const [clara, open] = cast.map(({ id }) => id);
    const [entrance, second] = figures.map(({ id }) => id);
    expect(positions).toEqual([
      { figureId: entrance, castMemberId: clara, x: 0.25, y: 0.5 },
      { figureId: entrance, castMemberId: open, x: 0.75, y: 0.5 },
      { figureId: second, castMemberId: clara, x: 0.5, y: 0.25 },
    ]);
  });

  test("bends each copied cast member's path like the original", () => {
    const { cast, figures, paths } = danceCopy(kitri);
    expect(paths).toEqual([
      { figureId: figures[1]!.id, castMemberId: cast[0]!.id, points: [{ along: 0.4, side: -0.3 }] },
    ]);
  });

  test('copies a dance with no cast and one empty figure', () => {
    const empty = { ...kitri, cast: [], figures: [{ ...kitri.figures[0]!, positions: [] }] };
    expect(danceCopy(empty).positions).toEqual([]);
  });
});
