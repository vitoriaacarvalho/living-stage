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
