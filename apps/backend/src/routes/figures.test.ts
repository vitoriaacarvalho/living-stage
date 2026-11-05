import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
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
    dance: { findFirst: vi.fn() },
    figure: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
    },
    castMember: { count: vi.fn() },
    position: { update: vi.fn() },
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

const firstFigure = {
  id: 'figure-1',
  danceId: 'dance-1',
  order: 0,
  name: null,
  transitionMs: 4000,
  positions: [{ castMemberId: 'cast-1', x: -0.0625, y: 0.05 }],
};

let server: Server;
let url: string;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  url = `http://localhost:${(server.address() as AddressInfo).port}/api/schools/school-1/dances/dance-1/figures`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user,
    session: { id: 'session-1', userId: user.id } as never,
  });
  vi.mocked(prisma.school.findFirst)
    .mockReset()
    .mockResolvedValue({ id: 'school-1' } as never);
  vi.mocked(prisma.dance.findFirst)
    .mockReset()
    .mockResolvedValue({ figures: [firstFigure] } as never);
  vi.mocked(prisma.figure.findFirst)
    .mockReset()
    .mockResolvedValue(firstFigure as never);
  vi.mocked(prisma.figure.aggregate)
    .mockReset()
    .mockResolvedValue({ _max: { order: 2 } } as never);
  vi.mocked(prisma.figure.updateMany).mockReset();
  vi.mocked(prisma.figure.create)
    .mockReset()
    .mockImplementation((async ({ data }: { data: { order: number } }) => ({
      ...firstFigure,
      id: 'figure-new',
      order: data.order,
    })) as never);
  vi.mocked(prisma.$transaction).mockImplementation(((run: (tx: typeof prisma) => unknown) =>
    run(prisma)) as never);
});

test('lists the figures of the dance with their positions', async () => {
  const res = await fetch(url);
  expect(await res.json()).toEqual({
    figures: [
      {
        id: 'figure-1',
        order: 0,
        name: null,
        transitionMs: 4000,
        positions: [{ castMemberId: 'cast-1', x: -0.0625, y: 0.05 }],
        paths: [],
      },
    ],
  });
});

test('looks the dance up in this school', async () => {
  await fetch(url);
  expect(prisma.dance.findFirst).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: 'dance-1', schoolId: 'school-1' } }),
  );
});

test('responds 404 for a dance of another school', async () => {
  vi.mocked(prisma.dance.findFirst).mockResolvedValue(null);
  const res = await fetch(url);
  expect(res.status).toBe(404);
});

test('responds 404 for a school the user does not teach at', async () => {
  vi.mocked(prisma.school.findFirst).mockResolvedValue(null);
  const res = await fetch(url);
  expect(res.status).toBe(404);
});

describe('POST /api/schools/:schoolId/dances/:danceId/figures', () => {
  function copy(body: unknown) {
    return fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  function createdData() {
    return vi.mocked(prisma.figure.create).mock.calls[0]![0].data;
  }

  test('responds 201 with the new figure', async () => {
    const res = await copy({ copyOf: 'figure-1', placement: 'end' });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      figure: {
        id: 'figure-new',
        order: 3,
        name: null,
        transitionMs: 4000,
        positions: [{ castMemberId: 'cast-1', x: -0.0625, y: 0.05 }],
        paths: [],
      },
    });
  });

  test('copies every position of the figure', async () => {
    await copy({ copyOf: 'figure-1', placement: 'end' });
    expect(createdData()).toMatchObject({
      positions: { create: [{ castMemberId: 'cast-1', x: -0.0625, y: 0.05 }] },
    });
  });

  test('leaves the copy unnamed', async () => {
    vi.mocked(prisma.figure.findFirst).mockResolvedValue({
      ...firstFigure,
      name: 'Entrance',
    } as never);
    await copy({ copyOf: 'figure-1', placement: 'end' });
    expect(createdData()).not.toHaveProperty('name');
  });

  test('keeps the time to arrive of the figure it copies', async () => {
    vi.mocked(prisma.figure.findFirst).mockResolvedValue({
      ...firstFigure,
      transitionMs: 6500,
    } as never);
    await copy({ copyOf: 'figure-1', placement: 'end' });
    expect(createdData()).toMatchObject({ transitionMs: 6500 });
  });

  test('adds a new figure after the last one', async () => {
    await copy({ copyOf: 'figure-1', placement: 'end' });
    expect(createdData()).toMatchObject({ danceId: 'dance-1', order: 3 });
  });

  test('moves no figure when adding at the end', async () => {
    await copy({ copyOf: 'figure-1', placement: 'end' });
    expect(prisma.figure.updateMany).not.toHaveBeenCalled();
  });

  test('puts a duplicate right after the figure it copies', async () => {
    await copy({ copyOf: 'figure-1', placement: 'after' });
    expect(createdData()).toMatchObject({ order: 1 });
  });

  test('moves the later figures past the last order before shifting them', async () => {
    await copy({ copyOf: 'figure-1', placement: 'after' });
    expect(prisma.figure.updateMany).toHaveBeenNthCalledWith(1, {
      where: { danceId: 'dance-1', order: { gte: 1 } },
      data: { order: { increment: 3 } },
    });
  });

  test('brings the later figures back one place later than they were', async () => {
    await copy({ copyOf: 'figure-1', placement: 'after' });
    expect(prisma.figure.updateMany).toHaveBeenNthCalledWith(2, {
      where: { danceId: 'dance-1', order: { gte: 4 } },
      data: { order: { decrement: 2 } },
    });
  });

  test('moves no figure when duplicating the last one', async () => {
    vi.mocked(prisma.figure.findFirst).mockResolvedValue({ ...firstFigure, order: 2 } as never);
    await copy({ copyOf: 'figure-1', placement: 'after' });
    expect(prisma.figure.updateMany).not.toHaveBeenCalled();
  });

  test('looks the figure up in this dance', async () => {
    await copy({ copyOf: 'figure-1', placement: 'end' });
    expect(prisma.figure.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'figure-1', danceId: 'dance-1' } }),
    );
  });

  test('responds 404 for a figure of another dance', async () => {
    vi.mocked(prisma.figure.findFirst).mockResolvedValue(null);
    const res = await copy({ copyOf: 'figure-9', placement: 'end' });
    expect(res.status).toBe(404);
  });

  test('responds 404 for a dance of another school', async () => {
    vi.mocked(prisma.dance.findFirst).mockResolvedValue(null);
    const res = await copy({ copyOf: 'figure-1', placement: 'end' });
    expect(res.status).toBe(404);
  });

  test('responds 400 for an invalid body', async () => {
    const res = await copy({ copyOf: 'figure-1', placement: 'before' });
    expect(res.status).toBe(400);
  });

  test('creates nothing for an invalid body', async () => {
    await copy({ copyOf: 'figure-1' });
    expect(prisma.figure.create).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/schools/:schoolId/dances/:danceId/figures/:figureId', () => {
  function rename(body: unknown) {
    return fetch(`${url}/figure-1`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    vi.mocked(prisma.figure.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.figure.findUniqueOrThrow)
      .mockReset()
      .mockResolvedValue({ ...firstFigure, name: 'Entrance' } as never);
  });

  test('responds with the renamed figure', async () => {
    const res = await rename({ name: 'Entrance' });
    expect(await res.json()).toEqual({
      figure: {
        id: 'figure-1',
        order: 0,
        name: 'Entrance',
        transitionMs: 4000,
        positions: [{ castMemberId: 'cast-1', x: -0.0625, y: 0.05 }],
        paths: [],
      },
    });
  });

  test('renames only a figure of this dance in this school', async () => {
    await rename({ name: 'Entrance' });
    expect(prisma.figure.updateMany).toHaveBeenCalledWith({
      where: { id: 'figure-1', danceId: 'dance-1', dance: { schoolId: 'school-1' } },
      data: { name: 'Entrance' },
    });
  });

  test('clears the name when it is blank', async () => {
    await rename({ name: '  ' });
    expect(prisma.figure.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: null } }),
    );
  });

  test('responds 404 for a figure of another dance or school', async () => {
    vi.mocked(prisma.figure.updateMany).mockResolvedValue({ count: 0 });
    const res = await rename({ name: 'Entrance' });
    expect(res.status).toBe(404);
  });

  test('responds 400 for a name over the maximum length', async () => {
    const res = await rename({ name: 'a'.repeat(41) });
    expect(res.status).toBe(400);
  });

  test('sets the time to arrive', async () => {
    await rename({ transitionMs: 6500 });
    expect(prisma.figure.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { transitionMs: 6500 } }),
    );
  });

  test('sets the name and the time to arrive together', async () => {
    await rename({ name: 'Entrance', transitionMs: 6500 });
    expect(prisma.figure.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: 'Entrance', transitionMs: 6500 } }),
    );
  });

  test('responds 400 for a time to arrive over 30 seconds', async () => {
    const res = await rename({ transitionMs: 30_500 });
    expect(res.status).toBe(400);
  });

  test('changes nothing for a time to arrive between half seconds', async () => {
    await rename({ transitionMs: 4250 });
    expect(prisma.figure.updateMany).not.toHaveBeenCalled();
  });
});

describe('PUT /api/schools/:schoolId/dances/:danceId/figures/order', () => {
  const secondFigure = { ...firstFigure, id: 'figure-2', order: 1, positions: [] };

  function reorder(body: unknown) {
    return fetch(`${url}/order`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    vi.mocked(prisma.figure.findMany)
      .mockReset()
      .mockResolvedValueOnce([{ id: 'figure-1' }, { id: 'figure-2' }] as never)
      .mockResolvedValueOnce([
        { ...secondFigure, order: 0 },
        { ...firstFigure, order: 1 },
      ] as never);
    vi.mocked(prisma.figure.update).mockReset();
  });

  test('responds with the figures in their new order', async () => {
    const res = await reorder({ figureIds: ['figure-2', 'figure-1'] });
    const body = (await res.json()) as { figures: { id: string; order: number }[] };
    expect(body.figures.map(({ id, order }) => ({ id, order }))).toEqual([
      { id: 'figure-2', order: 0 },
      { id: 'figure-1', order: 1 },
    ]);
  });

  test('moves every figure past the current orders first', async () => {
    await reorder({ figureIds: ['figure-2', 'figure-1'] });
    expect(prisma.figure.updateMany).toHaveBeenCalledWith({
      where: { danceId: 'dance-1' },
      data: { order: { increment: 2 } },
    });
  });

  test('gives each figure its place in the list', async () => {
    await reorder({ figureIds: ['figure-2', 'figure-1'] });
    expect(vi.mocked(prisma.figure.update).mock.calls.map(([args]) => args)).toEqual([
      { where: { id: 'figure-2' }, data: { order: 0 } },
      { where: { id: 'figure-1' }, data: { order: 1 } },
    ]);
  });

  test('responds 400 when a figure of the dance is missing', async () => {
    const res = await reorder({ figureIds: ['figure-2'] });
    expect(res.status).toBe(400);
  });

  test('responds 400 for a figure of another dance', async () => {
    const res = await reorder({ figureIds: ['figure-2', 'figure-9'] });
    expect(res.status).toBe(400);
  });

  test('changes no order when the list does not match the dance', async () => {
    await reorder({ figureIds: ['figure-2', 'figure-9'] });
    expect(prisma.figure.updateMany).not.toHaveBeenCalled();
  });

  test('responds 400 for an invalid body', async () => {
    const res = await reorder({ figureIds: [] });
    expect(res.status).toBe(400);
  });

  test('responds 404 for a dance of another school', async () => {
    vi.mocked(prisma.dance.findFirst).mockResolvedValue(null);
    const res = await reorder({ figureIds: ['figure-2', 'figure-1'] });
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/schools/:schoolId/dances/:danceId/figures/:figureId/positions', () => {
  const moved = [
    { castMemberId: 'cast-1', x: 0.5, y: 0.5 },
    { castMemberId: 'cast-2', x: 0.75, y: 0.25 },
  ];

  function move(body: unknown) {
    return fetch(`${url}/figure-1/positions`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    vi.mocked(prisma.castMember.count).mockReset().mockResolvedValue(2);
    vi.mocked(prisma.position.update).mockReset();
    vi.mocked(prisma.figure.findUniqueOrThrow)
      .mockReset()
      .mockResolvedValue({ ...firstFigure, positions: moved } as never);
  });

  test('responds with the figure and its new positions', async () => {
    const res = await move({ positions: moved });
    expect(await res.json()).toEqual({
      figure: {
        id: 'figure-1',
        order: 0,
        name: null,
        transitionMs: 4000,
        positions: moved,
        paths: [],
      },
    });
  });

  test('saves each listed position in this figure', async () => {
    await move({ positions: moved });
    expect(prisma.position.update).toHaveBeenCalledWith({
      where: { figureId_castMemberId: { figureId: 'figure-1', castMemberId: 'cast-2' } },
      data: { x: 0.75, y: 0.25 },
    });
  });

  test('changes only the listed positions', async () => {
    await move({ positions: moved });
    expect(prisma.position.update).toHaveBeenCalledTimes(2);
  });

  test('looks the figure up in this dance', async () => {
    await move({ positions: moved });
    expect(prisma.figure.findFirst).toHaveBeenCalledWith({
      where: { id: 'figure-1', danceId: 'dance-1' },
    });
  });

  test('counts only cast members of this dance', async () => {
    await move({ positions: moved });
    expect(prisma.castMember.count).toHaveBeenCalledWith({
      where: { danceId: 'dance-1', id: { in: ['cast-1', 'cast-2'] } },
    });
  });

  test('responds 400 for a cast member who is not in this dance', async () => {
    vi.mocked(prisma.castMember.count).mockResolvedValue(1);
    const res = await move({ positions: moved });
    expect(res.status).toBe(400);
  });

  test('moves nobody when a cast member is not in this dance', async () => {
    vi.mocked(prisma.castMember.count).mockResolvedValue(1);
    await move({ positions: moved });
    expect(prisma.position.update).not.toHaveBeenCalled();
  });

  test('responds 400 for a spot outside the plan', async () => {
    const res = await move({ positions: [{ castMemberId: 'cast-1', x: 0.5, y: 1.5 }] });
    expect(res.status).toBe(400);
  });

  test('responds 400 for a cast member listed twice', async () => {
    const res = await move({ positions: [moved[0], { ...moved[0], x: 0.2 }] });
    expect(res.status).toBe(400);
  });

  test('responds 400 for an invalid body', async () => {
    const res = await move({ positions: 'here' });
    expect(res.status).toBe(400);
  });

  test('responds 404 for a figure of another dance', async () => {
    vi.mocked(prisma.figure.findFirst).mockResolvedValue(null);
    const res = await move({ positions: moved });
    expect(res.status).toBe(404);
  });

  test('moves nobody in a figure of another dance', async () => {
    vi.mocked(prisma.figure.findFirst).mockResolvedValue(null);
    await move({ positions: moved });
    expect(prisma.position.update).not.toHaveBeenCalled();
  });

  test('responds 404 for a dance of another school', async () => {
    vi.mocked(prisma.dance.findFirst).mockResolvedValue(null);
    const res = await move({ positions: moved });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/schools/:schoolId/dances/:danceId/figures/:figureId', () => {
  function remove(figureId = 'figure-1') {
    return fetch(`${url}/${figureId}`, { method: 'DELETE' });
  }

  beforeEach(() => {
    vi.mocked(prisma.figure.aggregate).mockResolvedValue({
      _count: 3,
      _max: { order: 2 },
    } as never);
    vi.mocked(prisma.figure.delete).mockReset();
  });

  test('responds 204 once the figure is deleted', async () => {
    const res = await remove();
    expect(res.status).toBe(204);
  });

  test('deletes the figure', async () => {
    await remove();
    expect(prisma.figure.delete).toHaveBeenCalledWith({ where: { id: 'figure-1' } });
  });

  test('looks the figure up in this dance', async () => {
    await remove();
    expect(prisma.figure.findFirst).toHaveBeenCalledWith({
      where: { id: 'figure-1', danceId: 'dance-1' },
    });
  });

  test('moves the later figures past the last order before closing the gap', async () => {
    await remove();
    expect(prisma.figure.updateMany).toHaveBeenNthCalledWith(1, {
      where: { danceId: 'dance-1', order: { gte: 1 } },
      data: { order: { increment: 3 } },
    });
  });

  test('brings the later figures back one place earlier than they were', async () => {
    await remove();
    expect(prisma.figure.updateMany).toHaveBeenNthCalledWith(2, {
      where: { danceId: 'dance-1', order: { gte: 4 } },
      data: { order: { decrement: 4 } },
    });
  });

  test('moves no figure when deleting the last one in the order', async () => {
    vi.mocked(prisma.figure.findFirst).mockResolvedValue({ ...firstFigure, order: 2 } as never);
    await remove();
    expect(prisma.figure.updateMany).not.toHaveBeenCalled();
  });

  test('responds 409 for the only figure of the dance', async () => {
    vi.mocked(prisma.figure.aggregate).mockResolvedValue({
      _count: 1,
      _max: { order: 0 },
    } as never);
    const res = await remove();
    expect(res.status).toBe(409);
  });

  test('keeps the only figure of the dance', async () => {
    vi.mocked(prisma.figure.aggregate).mockResolvedValue({
      _count: 1,
      _max: { order: 0 },
    } as never);
    await remove();
    expect(prisma.figure.delete).not.toHaveBeenCalled();
  });

  test('responds 404 for a figure of another dance', async () => {
    vi.mocked(prisma.figure.findFirst).mockResolvedValue(null);
    const res = await remove('figure-9');
    expect(res.status).toBe(404);
  });

  test('responds 404 for a dance of another school', async () => {
    vi.mocked(prisma.dance.findFirst).mockResolvedValue(null);
    const res = await remove();
    expect(res.status).toBe(404);
  });
});
