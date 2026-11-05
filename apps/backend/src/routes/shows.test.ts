import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { ListShowsResponse, ShowDetailResponse } from '@living-stage/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../app.ts';
import { auth } from '../auth/auth.ts';
import { prisma } from '../db.ts';
import { Prisma } from '../generated/prisma/client.ts';

vi.mock('../auth/auth.ts', () => ({
  auth: { handler: vi.fn(), api: { getSession: vi.fn() } },
}));

vi.mock('../db.ts', () => ({
  prisma: {
    school: { findFirst: vi.fn() },
    show: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
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
    actItem: {
      aggregate: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    dance: { findFirst: vi.fn() },
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
  intervalMs: 0,
  createdAt: new Date('2026-11-05T12:00:00.000Z'),
};

const galaJson = {
  id: 'show-1',
  title: 'Winter gala',
  date: '2026-12-12',
  time: '19:00',
  venue: 'City theatre',
  intervalMs: 0,
  createdAt: '2026-11-05T12:00:00.000Z',
};

const kitri = {
  id: 'dance-1',
  title: 'Kitri variation',
  colorMode: 'dancer' as const,
  durationMs: 220_000,
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
  for (const mock of Object.values(prisma.actItem)) vi.mocked(mock).mockReset();
  vi.mocked(prisma.dance.findFirst).mockReset();
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

  test('adds up the running time with the intervals', async () => {
    vi.mocked(prisma.show.findMany).mockResolvedValue([
      {
        ...gala,
        intervalMs: 15 * 60_000,
        acts: [
          { items: [{ dance: kitri }] },
          { items: [{ dance: { ...kitri, durationMs: null } }] },
        ],
      },
    ] as never);
    const { shows } = (await (await fetch(`${baseUrl}/shows`)).json()) as ListShowsResponse;
    expect(shows[0]!.totalMs).toBe(220_000 + 15 * 60_000);
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

  test('creates the show with no interval unless one is given', async () => {
    await post({ title: 'Winter gala', date: '2026-12-12' });
    expect(vi.mocked(prisma.show.create).mock.calls[0]![0].data.intervalMs).toBe(0);
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
            dance: {
              title: 'Kitri variation',
              durationMs: 220_000,
              cast: [
                { id: 'cast-1', role: 'Kitri', dancer: { name: 'Clara' } },
                { id: 'cast-2', role: null, dancer: null },
              ],
            },
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
        dances: [
          {
            id: 'item-1',
            danceId: 'dance-1',
            title: 'Kitri variation',
            castCount: 2,
            durationMs: 220_000,
            cast: [
              { id: 'cast-1', name: 'Clara', role: 'Kitri' },
              { id: 'cast-2', name: null, role: null },
            ],
          },
        ],
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

  test('sets the interval between acts', async () => {
    await patch({ intervalMs: 15 * 60_000 });
    expect(vi.mocked(prisma.show.updateManyAndReturn).mock.calls[0]![0].data).toEqual({
      intervalMs: 15 * 60_000,
    });
  });

  test('responds 400 for an interval in part of a minute', async () => {
    expect((await patch({ intervalMs: 90_000 })).status).toBe(400);
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

describe('POST /shows/:showId/acts/:actId/dances', () => {
  const post = (body: unknown) =>
    fetch(`${baseUrl}/shows/show-1/acts/act-1/dances`, send('POST', body));

  beforeEach(() => {
    vi.mocked(prisma.act.findFirst).mockResolvedValue(actRow('act-1', 0) as never);
    vi.mocked(prisma.dance.findFirst).mockResolvedValue({ id: 'dance-1' } as never);
    vi.mocked(prisma.actItem.aggregate).mockResolvedValue({ _max: { order: 2 } } as never);
    vi.mocked(prisma.actItem.create).mockResolvedValue({
      id: 'item-4',
      danceId: 'dance-1',
      dance: { title: 'Kitri variation', durationMs: null, cast: [] },
    } as never);
  });

  test('responds 201 with the dance in the act', async () => {
    const res = await post({ danceId: 'dance-1' });
    expect(await res.json()).toEqual({
      dance: {
        id: 'item-4',
        danceId: 'dance-1',
        title: 'Kitri variation',
        castCount: 0,
        durationMs: null,
        cast: [],
      },
    });
  });

  test('puts the dance at the end of the act', async () => {
    await post({ danceId: 'dance-1' });
    expect(vi.mocked(prisma.actItem.create).mock.calls[0]![0].data).toEqual({
      showId: 'show-1',
      actId: 'act-1',
      danceId: 'dance-1',
      order: 3,
    });
  });

  test('puts the first dance of an empty act first', async () => {
    vi.mocked(prisma.actItem.aggregate).mockResolvedValue({ _max: { order: null } } as never);
    await post({ danceId: 'dance-1' });
    expect(vi.mocked(prisma.actItem.create).mock.calls[0]![0].data.order).toBe(0);
  });

  test('looks the dance up in this school', async () => {
    await post({ danceId: 'dance-1' });
    expect(prisma.dance.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'dance-1', schoolId: 'school-1' } }),
    );
  });

  test('responds 400 for a dance of another school', async () => {
    vi.mocked(prisma.dance.findFirst).mockResolvedValue(null);
    expect((await post({ danceId: 'dance-9' })).status).toBe(400);
  });

  test('responds 400 for a body with no dance', async () => {
    expect((await post({})).status).toBe(400);
  });

  test('responds 404 for an act of another show or school', async () => {
    vi.mocked(prisma.act.findFirst).mockResolvedValue(null);
    expect((await post({ danceId: 'dance-1' })).status).toBe(404);
  });

  test('responds 409 for a dance already in the show', async () => {
    vi.mocked(prisma.actItem.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    const res = await post({ danceId: 'dance-1' });
    expect(await res.json()).toEqual({ error: 'already_in_show' });
  });
});

describe('DELETE /shows/:showId/acts/:actId/dances/:itemId', () => {
  const remove = () =>
    fetch(`${baseUrl}/shows/show-1/acts/act-1/dances/item-1`, { method: 'DELETE' });

  beforeEach(() => {
    vi.mocked(prisma.actItem.findFirst).mockResolvedValue({
      id: 'item-1',
      actId: 'act-1',
    } as never);
    vi.mocked(prisma.actItem.findMany).mockResolvedValue([
      { id: 'item-2' },
      { id: 'item-3' },
    ] as never);
  });

  test('responds 204 once the dance leaves the act', async () => {
    expect((await remove()).status).toBe(204);
  });

  test('takes the dance out of the act', async () => {
    await remove();
    expect(prisma.actItem.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
  });

  test('numbers the remaining dances from the start', async () => {
    await remove();
    expect(vi.mocked(prisma.actItem.update).mock.calls.map(([call]) => call)).toEqual([
      { where: { id: 'item-2' }, data: { order: 0 } },
      { where: { id: 'item-3' }, data: { order: 1 } },
    ]);
  });

  test('looks the dance up in this act, show and school', async () => {
    await remove();
    expect(prisma.actItem.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'item-1',
        actId: 'act-1',
        act: { id: 'act-1', showId: 'show-1', show: { schoolId: 'school-1' } },
      },
    });
  });

  test('responds 404 for a dance of another act, show or school', async () => {
    vi.mocked(prisma.actItem.findFirst).mockResolvedValue(null);
    expect((await remove()).status).toBe(404);
  });
});

describe('PUT /shows/:showId/order', () => {
  const put = (body: unknown) => fetch(`${baseUrl}/shows/show-1/order`, send('PUT', body));
  const order = {
    acts: [
      { id: 'act-2', danceIds: ['item-3', 'item-1'] },
      { id: 'act-1', danceIds: ['item-2'] },
    ],
  };

  beforeEach(() => {
    vi.mocked(prisma.show.findFirst).mockResolvedValue({
      acts: [{ id: 'act-1' }, { id: 'act-2' }],
      items: [
        { id: 'item-1', order: 0 },
        { id: 'item-2', order: 4 },
        { id: 'item-3', order: 0 },
      ],
    } as never);
    vi.mocked(prisma.show.findUniqueOrThrow).mockResolvedValue({ ...gala, acts: [] } as never);
  });

  test('answers with the show in its new order', async () => {
    const res = await put(order);
    expect(await res.json()).toEqual({ show: { ...galaJson, acts: [] } });
  });

  test('moves every act and dance past the orders in use first', async () => {
    await put(order);
    expect(vi.mocked(prisma.actItem.updateMany).mock.calls[0]![0]).toEqual({
      where: { showId: 'show-1' },
      data: { order: { increment: 6 } },
    });
  });

  test('numbers the acts in their new order', async () => {
    await put(order);
    expect(vi.mocked(prisma.act.update).mock.calls.map(([call]) => call)).toEqual([
      { where: { id: 'act-2' }, data: { order: 0 } },
      { where: { id: 'act-1' }, data: { order: 1 } },
    ]);
  });

  test('puts each dance in its act at its place', async () => {
    await put(order);
    expect(vi.mocked(prisma.actItem.update).mock.calls.map(([call]) => call)).toEqual([
      { where: { id: 'item-3' }, data: { actId: 'act-2', order: 0 } },
      { where: { id: 'item-1' }, data: { actId: 'act-2', order: 1 } },
      { where: { id: 'item-2' }, data: { actId: 'act-1', order: 0 } },
    ]);
  });

  test('moves everything clear of every new place when the dances gather in one act', async () => {
    vi.mocked(prisma.show.findFirst).mockResolvedValue({
      acts: [{ id: 'act-1' }, { id: 'act-2' }],
      items: [
        { id: 'item-1', order: 0 },
        { id: 'item-2', order: 0 },
        { id: 'item-3', order: 1 },
      ],
    } as never);
    await put({
      acts: [
        { id: 'act-1', danceIds: ['item-1', 'item-2', 'item-3'] },
        { id: 'act-2', danceIds: [] },
      ],
    });
    expect(vi.mocked(prisma.actItem.updateMany).mock.calls[0]![0].data).toEqual({
      order: { increment: 4 },
    });
  });

  test('responds 400 when an act of the show is left out', async () => {
    const res = await put({ acts: [{ id: 'act-2', danceIds: ['item-1', 'item-2', 'item-3'] }] });
    expect(res.status).toBe(400);
  });

  test('responds 400 when a dance of the show is left out', async () => {
    const res = await put({
      acts: [
        { id: 'act-2', danceIds: ['item-3'] },
        { id: 'act-1', danceIds: ['item-2'] },
      ],
    });
    expect(res.status).toBe(400);
  });

  test('responds 400 for a dance of another show', async () => {
    const res = await put({
      acts: [
        { id: 'act-2', danceIds: ['item-3', 'item-9'] },
        { id: 'act-1', danceIds: ['item-2'] },
      ],
    });
    expect(res.status).toBe(400);
  });

  test('changes nothing for a wrong order', async () => {
    await put({ acts: [{ id: 'act-1', danceIds: [] }] });
    expect(prisma.act.updateMany).not.toHaveBeenCalled();
  });

  test('looks the show up in this school', async () => {
    await put(order);
    expect(vi.mocked(prisma.show.findFirst).mock.calls[0]![0]).toMatchObject({
      where: { id: 'show-1', schoolId: 'school-1' },
    });
  });

  test('responds 404 for a show of another school', async () => {
    vi.mocked(prisma.show.findFirst).mockResolvedValue(null);
    expect((await put(order)).status).toBe(404);
  });
});
