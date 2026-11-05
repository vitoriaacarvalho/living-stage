import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { ListDancesResponse } from '@living-stage/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../app.ts';
import { auth } from '../auth/auth.ts';
import { prisma } from '../db.ts';

vi.mock('../auth/auth.ts', () => ({
  auth: { handler: vi.fn(), api: { getSession: vi.fn() } },
}));

vi.mock('../db.ts', () => ({
  prisma: {
    school: { findFirst: vi.fn() },
    $transaction: vi.fn(),
    dance: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      updateManyAndReturn: vi.fn(),
      deleteMany: vi.fn(),
    },
    castMember: { createMany: vi.fn() },
    figure: { createMany: vi.fn() },
    position: { createMany: vi.fn() },
    path: { createMany: vi.fn() },
  },
}));

const user = {
  id: 'user-1',
  name: 'Ana',
  email: 'ana@example.com',
  emailVerified: false,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const kitri = {
  id: 'dance-1',
  schoolId: 'school-1',
  title: 'Kitri variation',
  showGuides: true,
  labelMode: 'name' as const,
  colorMode: 'dancer' as const,
  durationMs: null,
  createdAt: new Date('2026-10-27T12:00:00.000Z'),
};

const kitriJson = {
  id: 'dance-1',
  title: 'Kitri variation',
  showGuides: true,
  labelMode: 'name' as const,
  colorMode: 'dancer' as const,
  createdAt: '2026-10-27T12:00:00.000Z',
};

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  vi.mocked(prisma.school.findFirst).mockReset();
  vi.mocked(prisma.dance.findMany).mockReset();
  vi.mocked(prisma.dance.create).mockReset();
  vi.mocked(prisma.dance.updateManyAndReturn).mockReset();
  vi.mocked(prisma.dance.deleteMany).mockReset();
  vi.mocked(prisma.dance.findFirst).mockReset();
  vi.mocked(prisma.dance.findUniqueOrThrow).mockReset();
  vi.mocked(prisma.dance.create).mockReset();
  vi.mocked(prisma.castMember.createMany).mockReset();
  vi.mocked(prisma.figure.createMany).mockReset();
  vi.mocked(prisma.position.createMany).mockReset();
  vi.mocked(prisma.path.createMany).mockReset();
  vi.mocked(prisma.$transaction).mockImplementation(((run: (tx: typeof prisma) => unknown) =>
    run(prisma)) as never);
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user,
    session: { id: 'session-1', userId: user.id } as never,
  });
  vi.mocked(prisma.school.findFirst).mockResolvedValue({ id: 'school-1' } as never);
});

function send(method: string, body: unknown) {
  return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

describe('GET /api/schools/:schoolId/dances', () => {
  const url = () => `${baseUrl}/api/schools/school-1/dances`;

  test('responds 404 for a school the user does not teach at', async () => {
    vi.mocked(prisma.school.findFirst).mockResolvedValue(null);
    const res = await fetch(url());
    expect(res.status).toBe(404);
  });

  const clara = { id: 'dancer-1', schoolId: 'school-1', name: 'Clara', color: 3 };
  const listed = {
    ...kitri,
    cast: [
      { id: 'cast-1', role: 'Kitri', dancer: clara },
      { id: 'cast-2', role: null, dancer: null },
    ],
    figures: [
      {
        positions: [
          { castMemberId: 'cast-1', x: 0.25, y: 0.5 },
          { castMemberId: 'cast-2', x: -0.0625, y: 0.05 },
        ],
      },
    ],
    showItems: [{ show: { title: 'Winter gala' } }, { show: { title: 'Spring show' } }],
  };

  async function listedDance() {
    vi.mocked(prisma.dance.findMany).mockResolvedValue([listed] as never);
    const { dances } = (await (await fetch(url())).json()) as ListDancesResponse;
    return dances[0]!;
  }

  test('lists the dances of the school', async () => {
    expect(await listedDance()).toMatchObject(kitriJson);
  });

  test('counts the cast of each dance', async () => {
    expect((await listedDance()).castCount).toBe(2);
  });

  test("previews each dance's first figure with its colors", async () => {
    expect((await listedDance()).preview).toEqual([
      { x: 0.25, y: 0.5, color: 3, open: false },
      { x: -0.0625, y: 0.05, color: null, open: true },
    ]);
  });

  test('names the shows each dance is in', async () => {
    expect((await listedDance()).showTitles).toEqual(['Winter gala', 'Spring show']);
  });

  test('previews a dance with no cast as an empty stage', async () => {
    vi.mocked(prisma.dance.findMany).mockResolvedValue([
      { ...kitri, cast: [], figures: [{ positions: [] }], showItems: [] },
    ] as never);
    const { dances } = (await (await fetch(url())).json()) as ListDancesResponse;
    expect(dances[0]!.preview).toEqual([]);
  });

  test('reads only the dances of this school, newest first', async () => {
    vi.mocked(prisma.dance.findMany).mockResolvedValue([]);
    await fetch(url());
    expect(prisma.dance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { schoolId: 'school-1' }, orderBy: { createdAt: 'desc' } }),
    );
  });

  test('reads only the first figure for the preview', async () => {
    vi.mocked(prisma.dance.findMany).mockResolvedValue([]);
    await fetch(url());
    expect(vi.mocked(prisma.dance.findMany).mock.calls[0]![0]).toMatchObject({
      include: { figures: { where: { order: 0 } } },
    });
  });
});

describe('POST /api/schools/:schoolId/dances', () => {
  const url = () => `${baseUrl}/api/schools/school-1/dances`;

  test('responds 201 with the new dance', async () => {
    vi.mocked(prisma.dance.create).mockResolvedValue(kitri);
    const res = await fetch(url(), send('POST', { title: 'Kitri variation' }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ dance: kitriJson });
  });

  test('creates the dance in this school', async () => {
    vi.mocked(prisma.dance.create).mockResolvedValue(kitri);
    await fetch(url(), send('POST', { title: ' Kitri variation ' }));
    expect(prisma.dance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ schoolId: 'school-1', title: 'Kitri variation' }),
    });
  });

  test('creates the dance with its first figure', async () => {
    vi.mocked(prisma.dance.create).mockResolvedValue(kitri);
    await fetch(url(), send('POST', { title: 'Kitri variation' }));
    expect(prisma.dance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ figures: { create: { order: 0 } } }),
    });
  });

  test('responds 400 for a blank title', async () => {
    const res = await fetch(url(), send('POST', { title: ' ' }));
    expect(res.status).toBe(400);
  });

  test('responds 404 for a school the user does not teach at', async () => {
    vi.mocked(prisma.school.findFirst).mockResolvedValue(null);
    const res = await fetch(url(), send('POST', { title: 'Kitri variation' }));
    expect(res.status).toBe(404);
  });

  test('does not create a dance in a school the user does not teach at', async () => {
    vi.mocked(prisma.school.findFirst).mockResolvedValue(null);
    await fetch(url(), send('POST', { title: 'Kitri variation' }));
    expect(prisma.dance.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/schools/:schoolId/dances/:danceId/copies', () => {
  const url = () => `${baseUrl}/api/schools/school-1/dances/dance-1/copies`;
  const copyOfKitri = () => fetch(url(), { method: 'POST' });
  const castCreatedAt = new Date('2026-10-27T12:00:00.000Z');

  const source = {
    ...kitri,
    cast: [
      {
        id: 'cast-1',
        danceId: 'dance-1',
        dancerId: 'dancer-1',
        role: 'Kitri',
        createdAt: castCreatedAt,
      },
    ],
    figures: [
      {
        id: 'figure-1',
        danceId: 'dance-1',
        order: 0,
        name: 'Entrance',
        transitionMs: 4000,
        positions: [{ figureId: 'figure-1', castMemberId: 'cast-1', x: 0.25, y: 0.5 }],
        paths: [],
      },
      {
        id: 'figure-2',
        danceId: 'dance-1',
        order: 1,
        name: null,
        transitionMs: 4000,
        positions: [{ figureId: 'figure-2', castMemberId: 'cast-1', x: 0.75, y: 0.5 }],
        paths: [
          { figureId: 'figure-2', castMemberId: 'cast-1', points: [{ along: 0.5, side: 0.2 }] },
        ],
      },
    ],
  };

  const saved = {
    ...kitri,
    id: 'dance-2',
    title: 'Kitri variation (copy)',
    createdAt: new Date('2026-11-05T12:00:00.000Z'),
    cast: [
      {
        id: 'cast-9',
        role: 'Kitri',
        dancer: { id: 'dancer-1', schoolId: 'school-1', name: 'Clara', color: 3 },
      },
    ],
    figures: [{ positions: [{ castMemberId: 'cast-9', x: 0.25, y: 0.5 }] }],
    showItems: [],
  };

  beforeEach(() => {
    vi.mocked(prisma.dance.findFirst).mockResolvedValue(source as never);
    vi.mocked(prisma.dance.findUniqueOrThrow).mockResolvedValue(saved as never);
  });

  test('responds 201 with the copy as it is listed', async () => {
    const res = await copyOfKitri();
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      dance: {
        id: 'dance-2',
        title: 'Kitri variation (copy)',
        showGuides: true,
        labelMode: 'name',
        colorMode: 'dancer',
        createdAt: '2026-11-05T12:00:00.000Z',
        castCount: 1,
        preview: [{ x: 0.25, y: 0.5, color: 3, open: false }],
        showTitles: [],
      },
    });
  });

  test('looks the dance up in this school', async () => {
    await copyOfKitri();
    expect(prisma.dance.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'dance-1', schoolId: 'school-1' } }),
    );
  });

  test('copies the dance inside one transaction', async () => {
    await copyOfKitri();
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  test('creates the copy in this school with its new title', async () => {
    await copyOfKitri();
    expect(vi.mocked(prisma.dance.create).mock.calls[0]![0].data).toMatchObject({
      schoolId: 'school-1',
      title: 'Kitri variation (copy)',
    });
  });

  test('creates the copied cast in the copy', async () => {
    await copyOfKitri();
    const { id } = vi.mocked(prisma.dance.create).mock.calls[0]![0].data;
    expect(vi.mocked(prisma.castMember.createMany).mock.calls[0]![0]!.data).toMatchObject([
      { danceId: id, dancerId: 'dancer-1', role: 'Kitri' },
    ]);
  });

  test('creates the copied figures in the copy', async () => {
    await copyOfKitri();
    const { id } = vi.mocked(prisma.dance.create).mock.calls[0]![0].data;
    expect(vi.mocked(prisma.figure.createMany).mock.calls[0]![0]!.data).toMatchObject([
      { danceId: id, order: 0, name: 'Entrance' },
      { danceId: id, order: 1, name: null },
    ]);
  });

  test('creates the copied positions', async () => {
    await copyOfKitri();
    expect(vi.mocked(prisma.position.createMany).mock.calls[0]![0]!.data).toMatchObject([
      { x: 0.25, y: 0.5 },
      { x: 0.75, y: 0.5 },
    ]);
  });

  test('creates the copied paths', async () => {
    await copyOfKitri();
    expect(vi.mocked(prisma.path.createMany).mock.calls[0]![0]!.data).toMatchObject([
      { points: [{ along: 0.5, side: 0.2 }] },
    ]);
  });

  test('responds 404 for a dance of another school', async () => {
    vi.mocked(prisma.dance.findFirst).mockResolvedValue(null);
    expect((await copyOfKitri()).status).toBe(404);
  });

  test('creates nothing for a dance of another school', async () => {
    vi.mocked(prisma.dance.findFirst).mockResolvedValue(null);
    await copyOfKitri();
    expect(prisma.dance.create).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/schools/:schoolId/dances/:danceId', () => {
  const url = () => `${baseUrl}/api/schools/school-1/dances/dance-1`;

  test('saves a typed duration', async () => {
    vi.mocked(prisma.dance.updateManyAndReturn).mockResolvedValue([kitri]);
    await fetch(
      `${baseUrl}/api/schools/school-1/dances/dance-1`,
      send('PATCH', { durationMs: 220_000 }),
    );
    expect(prisma.dance.updateManyAndReturn).toHaveBeenCalledWith(
      expect.objectContaining({ data: { durationMs: 220_000 } }),
    );
  });

  test('clears the duration', async () => {
    vi.mocked(prisma.dance.updateManyAndReturn).mockResolvedValue([kitri]);
    await fetch(
      `${baseUrl}/api/schools/school-1/dances/dance-1`,
      send('PATCH', { durationMs: null }),
    );
    expect(prisma.dance.updateManyAndReturn).toHaveBeenCalledWith(
      expect.objectContaining({ data: { durationMs: null } }),
    );
  });

  test('responds 400 for a duration in part of a second', async () => {
    const res = await fetch(
      `${baseUrl}/api/schools/school-1/dances/dance-1`,
      send('PATCH', { durationMs: 220_500 }),
    );
    expect(res.status).toBe(400);
  });

  test('responds with the renamed dance', async () => {
    vi.mocked(prisma.dance.updateManyAndReturn).mockResolvedValue([{ ...kitri, title: 'Kitri' }]);
    const res = await fetch(url(), send('PATCH', { title: 'Kitri' }));
    expect(await res.json()).toEqual({ dance: { ...kitriJson, title: 'Kitri' } });
  });

  test('renames only a dance of this school', async () => {
    vi.mocked(prisma.dance.updateManyAndReturn).mockResolvedValue([kitri]);
    await fetch(url(), send('PATCH', { title: ' Kitri variation ' }));
    expect(prisma.dance.updateManyAndReturn).toHaveBeenCalledWith({
      where: { id: 'dance-1', schoolId: 'school-1' },
      data: { title: 'Kitri variation' },
    });
  });

  test('responds 404 for a dance of another school', async () => {
    vi.mocked(prisma.dance.updateManyAndReturn).mockResolvedValue([]);
    const res = await fetch(url(), send('PATCH', { title: 'Kitri' }));
    expect(res.status).toBe(404);
  });

  test('saves only the fields it is sent', async () => {
    vi.mocked(prisma.dance.updateManyAndReturn).mockResolvedValue([kitri]);
    await fetch(url(), send('PATCH', { showGuides: false }));
    expect(prisma.dance.updateManyAndReturn).toHaveBeenCalledWith({
      where: { id: 'dance-1', schoolId: 'school-1' },
      data: { showGuides: false },
    });
  });

  test('responds with the dance once its guides are hidden', async () => {
    vi.mocked(prisma.dance.updateManyAndReturn).mockResolvedValue([
      { ...kitri, showGuides: false },
    ]);
    const res = await fetch(url(), send('PATCH', { showGuides: false }));
    expect(await res.json()).toEqual({ dance: { ...kitriJson, showGuides: false } });
  });

  test('responds with the dance once its label mode is saved', async () => {
    vi.mocked(prisma.dance.updateManyAndReturn).mockResolvedValue([
      { ...kitri, labelMode: 'both' },
    ]);
    const res = await fetch(url(), send('PATCH', { labelMode: 'both' }));
    expect(await res.json()).toEqual({ dance: { ...kitriJson, labelMode: 'both' } });
  });

  test('responds with the dance once its color mode is saved', async () => {
    vi.mocked(prisma.dance.updateManyAndReturn).mockResolvedValue([
      { ...kitri, colorMode: 'role' },
    ]);
    const res = await fetch(url(), send('PATCH', { colorMode: 'role' }));
    expect(await res.json()).toEqual({ dance: { ...kitriJson, colorMode: 'role' } });
  });

  test('responds 400 for an unknown color mode', async () => {
    const res = await fetch(url(), send('PATCH', { colorMode: 'costume' }));
    expect(res.status).toBe(400);
  });

  test('responds 400 for an unknown label mode', async () => {
    const res = await fetch(url(), send('PATCH', { labelMode: 'none' }));
    expect(res.status).toBe(400);
  });

  test('responds 400 for a blank title', async () => {
    const res = await fetch(url(), send('PATCH', { title: '' }));
    expect(res.status).toBe(400);
  });

  test('responds 400 when there is nothing to change', async () => {
    const res = await fetch(url(), send('PATCH', {}));
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/schools/:schoolId/dances/:danceId', () => {
  const url = () => `${baseUrl}/api/schools/school-1/dances/dance-1`;

  test('responds 204 once the dance is deleted', async () => {
    vi.mocked(prisma.dance.deleteMany).mockResolvedValue({ count: 1 });
    const res = await fetch(url(), { method: 'DELETE' });
    expect(res.status).toBe(204);
  });

  test('deletes only a dance of this school', async () => {
    vi.mocked(prisma.dance.deleteMany).mockResolvedValue({ count: 1 });
    await fetch(url(), { method: 'DELETE' });
    expect(prisma.dance.deleteMany).toHaveBeenCalledWith({
      where: { id: 'dance-1', schoolId: 'school-1' },
    });
  });

  test('responds 404 for a dance of another school', async () => {
    vi.mocked(prisma.dance.deleteMany).mockResolvedValue({ count: 0 });
    const res = await fetch(url(), { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});
