import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { ListShowsResponse, ShowDetailResponse } from '@living-stage/shared';
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
    show: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateManyAndReturn: vi.fn(),
      deleteMany: vi.fn(),
    },
    act: {
      aggregate: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
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

const gala = {
  id: 'show-1',
  schoolId: 'school-1',
  title: 'Winter gala',
  date: new Date('2026-12-12T00:00:00.000Z'),
  time: '19:00',
  venue: 'City theatre',
  createdAt: new Date('2026-11-05T12:00:00.000Z'),
};

const galaJson = {
  id: 'show-1',
  title: 'Winter gala',
  date: '2026-12-12',
  time: '19:00',
  venue: 'City theatre',
  createdAt: '2026-11-05T12:00:00.000Z',
};

const kitri = {
  id: 'dance-1',
  title: 'Kitri variation',
  colorMode: 'dancer' as const,
  cast: [
    {
      id: 'cast-1',
      role: null,
      dancer: { id: 'dancer-1', schoolId: 'school-1', name: 'Clara', color: 3 },
    },
  ],
  figures: [{ positions: [{ castMemberId: 'cast-1', x: 0.5, y: 0.5 }] }],
};

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}/api/schools/school-1`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  for (const mock of Object.values(prisma.show)) vi.mocked(mock).mockReset();
  for (const mock of Object.values(prisma.act)) vi.mocked(mock).mockReset();
  vi.mocked(prisma.$transaction).mockImplementation(((run: (tx: typeof prisma) => unknown) =>
    run(prisma)) as never);
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user,
    session: { id: 'session-1', userId: user.id } as never,
  });
  vi.mocked(prisma.school.findFirst)
    .mockReset()
    .mockResolvedValue({ id: 'school-1' } as never);
});

function send(method: string, body: unknown) {
  return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

describe('GET /shows', () => {
  async function listed(acts: unknown[]) {
    vi.mocked(prisma.show.findMany).mockResolvedValue([{ ...gala, acts }] as never);
    const { shows } = (await (await fetch(`${baseUrl}/shows`)).json()) as ListShowsResponse;
    return shows[0]!;
  }

  test('lists the shows with their dates as calendar days', async () => {
    expect(await listed([])).toMatchObject(galaJson);
  });

  test('counts the acts', async () => {
    expect((await listed([{ items: [] }, { items: [] }])).actCount).toBe(2);
  });

  test('counts the dances across every act', async () => {
    const show = await listed([{ items: [{ dance: kitri }] }, { items: [{ dance: kitri }] }]);
    expect(show.danceCount).toBe(2);
  });

  test("previews the first dance's first figure", async () => {
    const show = await listed([{ items: [] }, { items: [{ dance: kitri }] }]);
    expect(show.preview).toEqual([{ x: 0.5, y: 0.5, color: 3, open: false }]);
  });

  test('previews an empty stage for a show with no dances', async () => {
    expect((await listed([{ items: [] }])).preview).toEqual([]);
  });

  test('reads only the shows of this school', async () => {
    vi.mocked(prisma.show.findMany).mockResolvedValue([]);
    await fetch(`${baseUrl}/shows`);
    expect(vi.mocked(prisma.show.findMany).mock.calls[0]![0]).toMatchObject({
      where: { schoolId: 'school-1' },
    });
  });

  test('responds 404 for a school the user does not teach at', async () => {
    vi.mocked(prisma.school.findFirst).mockResolvedValue(null);
    expect((await fetch(`${baseUrl}/shows`)).status).toBe(404);
  });
});

describe('POST /shows', () => {
  const post = (body: unknown) => fetch(`${baseUrl}/shows`, send('POST', body));

  beforeEach(() => {
    vi.mocked(prisma.show.create).mockResolvedValue(gala as never);
  });

  test('responds 201 with the new show', async () => {
    const res = await post({ title: 'Winter gala', date: '2026-12-12', time: '19:00' });
    expect(res.status).toBe(201);
  });

  test('answers with the show', async () => {
    const res = await post({ title: 'Winter gala', date: '2026-12-12' });
    expect(await res.json()).toEqual({ show: galaJson });
  });

  test('creates the show in this school', async () => {
    await post({ title: 'Winter gala', date: '2026-12-12' });
    expect(vi.mocked(prisma.show.create).mock.calls[0]![0].data).toMatchObject({
      schoolId: 'school-1',
      title: 'Winter gala',
    });
  });

  test('stores the date as that day at midnight UTC', async () => {
    await post({ title: 'Winter gala', date: '2026-12-12' });
    expect(vi.mocked(prisma.show.create).mock.calls[0]![0].data.date).toEqual(
      new Date('2026-12-12T00:00:00.000Z'),
    );
  });

  test('creates the show with its first act', async () => {
    await post({ title: 'Winter gala', date: '2026-12-12' });
    expect(vi.mocked(prisma.show.create).mock.calls[0]![0].data.acts).toEqual({
      create: { order: 0 },
    });
  });

  test('responds 400 for a show with no date', async () => {
    expect((await post({ title: 'Winter gala' })).status).toBe(400);
  });

  test('creates nothing for a bad body', async () => {
    await post({ title: 'Winter gala', date: '2026-02-30' });
    expect(prisma.show.create).not.toHaveBeenCalled();
  });
});

describe('GET /shows/:showId', () => {
  const get = () => fetch(`${baseUrl}/shows/show-1`);
  const act = (id: string, order: number, items: unknown[] = []) => ({
    id,
    showId: 'show-1',
    order,
    name: null,
    items,
  });

  test('answers with the acts in order and their dances', async () => {
    vi.mocked(prisma.show.findFirst).mockResolvedValue({
      ...gala,
      acts: [
        act('act-1', 0, [
          {
            id: 'item-1',
            danceId: 'dance-1',
            dance: { title: 'Kitri variation', _count: { cast: 16 } },
          },
        ]),
        act('act-2', 1),
      ],
    } as never);
    const { show } = (await (await get()).json()) as ShowDetailResponse;
    expect(show.acts).toEqual([
      {
        id: 'act-1',
        order: 0,
        name: null,
        dances: [{ id: 'item-1', danceId: 'dance-1', title: 'Kitri variation', castCount: 16 }],
      },
      { id: 'act-2', order: 1, name: null, dances: [] },
    ]);
  });

  test('looks the show up in this school', async () => {
    vi.mocked(prisma.show.findFirst).mockResolvedValue(null);
    await get();
    expect(vi.mocked(prisma.show.findFirst).mock.calls[0]![0]).toMatchObject({
      where: { id: 'show-1', schoolId: 'school-1' },
    });
  });

  test('responds 404 for a show of another school', async () => {
    vi.mocked(prisma.show.findFirst).mockResolvedValue(null);
    expect((await get()).status).toBe(404);
  });
});

describe('PATCH /shows/:showId', () => {
  const patch = (body: unknown) => fetch(`${baseUrl}/shows/show-1`, send('PATCH', body));

  beforeEach(() => {
    vi.mocked(prisma.show.updateManyAndReturn).mockResolvedValue([gala] as never);
  });

  test('answers with the updated show', async () => {
    expect(await (await patch({ title: 'Winter gala' })).json()).toEqual({ show: galaJson });
  });

  test('updates only a show of this school', async () => {
    await patch({ venue: '' });
    expect(prisma.show.updateManyAndReturn).toHaveBeenCalledWith({
      where: { id: 'show-1', schoolId: 'school-1' },
      data: { venue: null },
    });
  });

  test('stores a new date as that day at midnight UTC', async () => {
    await patch({ date: '2027-01-15' });
    expect(vi.mocked(prisma.show.updateManyAndReturn).mock.calls[0]![0].data).toEqual({
      date: new Date('2027-01-15T00:00:00.000Z'),
    });
  });

  test('responds 400 for an empty body', async () => {
    expect((await patch({})).status).toBe(400);
  });

  test('responds 404 for a show of another school', async () => {
    vi.mocked(prisma.show.updateManyAndReturn).mockResolvedValue([]);
    expect((await patch({ title: 'Winter gala' })).status).toBe(404);
  });
});

describe('DELETE /shows/:showId', () => {
  const remove = () => fetch(`${baseUrl}/shows/show-1`, { method: 'DELETE' });

  test('responds 204 once the show is deleted', async () => {
    vi.mocked(prisma.show.deleteMany).mockResolvedValue({ count: 1 });
    expect((await remove()).status).toBe(204);
  });

  test('deletes only a show of this school', async () => {
    vi.mocked(prisma.show.deleteMany).mockResolvedValue({ count: 1 });
    await remove();
    expect(prisma.show.deleteMany).toHaveBeenCalledWith({
      where: { id: 'show-1', schoolId: 'school-1' },
    });
  });

  test('responds 404 for a show of another school', async () => {
    vi.mocked(prisma.show.deleteMany).mockResolvedValue({ count: 0 });
    expect((await remove()).status).toBe(404);
  });
});

const actRow = (id: string, order: number, name: string | null = null) => ({
  id,
  showId: 'show-1',
  order,
  name,
  items: [],
});

describe('POST /shows/:showId/acts', () => {
  const post = () => fetch(`${baseUrl}/shows/show-1/acts`, { method: 'POST' });

  beforeEach(() => {
    vi.mocked(prisma.show.findFirst).mockResolvedValue({ id: 'show-1' } as never);
    vi.mocked(prisma.act.aggregate).mockResolvedValue({ _max: { order: 1 } } as never);
    vi.mocked(prisma.act.create).mockResolvedValue(actRow('act-3', 2) as never);
  });

  test('responds 201 with the new act', async () => {
    const res = await post();
    expect(await res.json()).toEqual({ act: { id: 'act-3', order: 2, name: null, dances: [] } });
  });

  test('puts the new act after the last one', async () => {
    await post();
    expect(vi.mocked(prisma.act.create).mock.calls[0]![0].data).toEqual({
      showId: 'show-1',
      order: 2,
    });
  });

  test('looks the show up in this school', async () => {
    await post();
    expect(vi.mocked(prisma.show.findFirst).mock.calls[0]![0]).toMatchObject({
      where: { id: 'show-1', schoolId: 'school-1' },
    });
  });

  test('responds 404 for a show of another school', async () => {
    vi.mocked(prisma.show.findFirst).mockResolvedValue(null);
    expect((await post()).status).toBe(404);
  });

  test('adds no act to a show of another school', async () => {
    vi.mocked(prisma.show.findFirst).mockResolvedValue(null);
    await post();
    expect(prisma.act.create).not.toHaveBeenCalled();
  });
});

describe('PATCH /shows/:showId/acts/:actId', () => {
  const patch = (body: unknown) => fetch(`${baseUrl}/shows/show-1/acts/act-1`, send('PATCH', body));

  beforeEach(() => {
    vi.mocked(prisma.act.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.act.findUniqueOrThrow).mockResolvedValue(
      actRow('act-1', 0, 'Classics') as never,
    );
  });

  test('answers with the renamed act', async () => {
    const res = await patch({ name: 'Classics' });
    expect(await res.json()).toEqual({
      act: { id: 'act-1', order: 0, name: 'Classics', dances: [] },
    });
  });

  test('renames only an act of this show in this school', async () => {
    await patch({ name: ' Classics ' });
    expect(prisma.act.updateMany).toHaveBeenCalledWith({
      where: { id: 'act-1', showId: 'show-1', show: { schoolId: 'school-1' } },
      data: { name: 'Classics' },
    });
  });

  test('responds 400 for a name over the maximum length', async () => {
    expect((await patch({ name: 'a'.repeat(41) })).status).toBe(400);
  });

  test('responds 404 for an act of another show or school', async () => {
    vi.mocked(prisma.act.updateMany).mockResolvedValue({ count: 0 });
    expect((await patch({ name: 'Classics' })).status).toBe(404);
  });
});

describe('DELETE /shows/:showId/acts/:actId', () => {
  const remove = (actId = 'act-1') =>
    fetch(`${baseUrl}/shows/show-1/acts/${actId}`, { method: 'DELETE' });

  beforeEach(() => {
    vi.mocked(prisma.act.findFirst).mockResolvedValue(actRow('act-1', 0) as never);
    vi.mocked(prisma.act.findMany).mockResolvedValue([
      { id: 'act-1' },
      { id: 'act-2' },
      { id: 'act-3' },
    ] as never);
  });

  test('responds 204 once the act is deleted', async () => {
    expect((await remove()).status).toBe(204);
  });

  test('deletes the act', async () => {
    await remove();
    expect(prisma.act.delete).toHaveBeenCalledWith({ where: { id: 'act-1' } });
  });

  test('moves the other acts past every current order first', async () => {
    await remove();
    expect(prisma.act.updateMany).toHaveBeenCalledWith({
      where: { showId: 'show-1' },
      data: { order: { increment: 3 } },
    });
  });

  test('numbers the remaining acts from the start', async () => {
    await remove();
    expect(vi.mocked(prisma.act.update).mock.calls.map(([call]) => call)).toEqual([
      { where: { id: 'act-2' }, data: { order: 0 } },
      { where: { id: 'act-3' }, data: { order: 1 } },
    ]);
  });

  test('looks the act up in this show and school', async () => {
    await remove();
    expect(prisma.act.findFirst).toHaveBeenCalledWith({
      where: { id: 'act-1', showId: 'show-1', show: { schoolId: 'school-1' } },
    });
  });

  test('responds 409 for the only act of the show', async () => {
    vi.mocked(prisma.act.findMany).mockResolvedValue([{ id: 'act-1' }] as never);
    expect((await remove()).status).toBe(409);
  });

  test('keeps the only act of the show', async () => {
    vi.mocked(prisma.act.findMany).mockResolvedValue([{ id: 'act-1' }] as never);
    await remove();
    expect(prisma.act.delete).not.toHaveBeenCalled();
  });

  test('responds 404 for an act of another show or school', async () => {
    vi.mocked(prisma.act.findFirst).mockResolvedValue(null);
    expect((await remove()).status).toBe(404);
  });
});
