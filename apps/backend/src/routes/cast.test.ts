import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { CAST_MAX_SIZE, type CastMemberCreatedResponse } from '@living-stage/shared';
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
    dance: { findFirst: vi.fn() },
    dancer: { findFirst: vi.fn() },
    figure: { findMany: vi.fn() },
    $transaction: vi.fn(),
    castMember: {
      findMany: vi.fn(),
      count: vi.fn(),
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

const clara = {
  id: 'dancer-1',
  schoolId: 'school-1',
  name: 'Clara',
  color: 3,
  createdAt: new Date(),
};

const kitri = {
  id: 'cast-1',
  danceId: 'dance-1',
  dancerId: 'dancer-1',
  role: 'Kitri',
  createdAt: new Date(),
  dancer: clara,
};

const firstFigure = { id: 'figure-1', danceId: 'dance-1', order: 0, name: null };
const secondFigure = { id: 'figure-2', danceId: 'dance-1', order: 1, name: null };
const topOfLeftWing = { x: -0.0625, y: 0.05 };

const kitriJson = {
  id: 'cast-1',
  role: 'Kitri',
  dancer: { id: 'dancer-1', name: 'Clara', color: 3 },
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
  vi.mocked(prisma.castMember.findMany).mockReset();
  vi.mocked(prisma.castMember.create).mockReset();
  vi.mocked(prisma.castMember.updateManyAndReturn).mockReset();
  vi.mocked(prisma.castMember.deleteMany).mockReset();
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user,
    session: { id: 'session-1', userId: user.id } as never,
  });
  vi.mocked(prisma.school.findFirst)
    .mockReset()
    .mockResolvedValue({ id: 'school-1' } as never);
  vi.mocked(prisma.dance.findFirst)
    .mockReset()
    .mockResolvedValue({ id: 'dance-1' } as never);
  vi.mocked(prisma.dancer.findFirst)
    .mockReset()
    .mockResolvedValue(clara as never);
  vi.mocked(prisma.figure.findMany)
    .mockReset()
    .mockResolvedValue([{ ...firstFigure, positions: [] }] as never);
  vi.mocked(prisma.castMember.count).mockResolvedValue(0);
  vi.mocked(prisma.$transaction).mockImplementation(((run: (tx: typeof prisma) => unknown) =>
    run(prisma)) as never);
});

function send(method: string, body: unknown) {
  return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

describe('GET /api/schools/:schoolId/dances/:danceId/cast', () => {
  const url = () => `${baseUrl}/api/schools/school-1/dances/dance-1/cast`;

  test('responds 404 for a school the user does not teach at', async () => {
    vi.mocked(prisma.school.findFirst).mockResolvedValue(null);
    const res = await fetch(url());
    expect(res.status).toBe(404);
  });

  test('responds 404 for a dance of another school', async () => {
    vi.mocked(prisma.dance.findFirst).mockResolvedValue(null);
    const res = await fetch(url());
    expect(res.status).toBe(404);
  });

  test('looks the dance up in this school', async () => {
    vi.mocked(prisma.castMember.findMany).mockResolvedValue([]);
    await fetch(url());
    expect(prisma.dance.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'dance-1', schoolId: 'school-1' } }),
    );
  });

  test('lists the cast with each dancer', async () => {
    vi.mocked(prisma.castMember.findMany).mockResolvedValue([kitri] as never);
    const res = await fetch(url());
    expect(await res.json()).toEqual({ cast: [kitriJson] });
  });

  test('lists a removed dancer as a placeholder', async () => {
    const placeholder = { ...kitri, dancerId: null, dancer: null };
    vi.mocked(prisma.castMember.findMany).mockResolvedValue([placeholder] as never);
    const res = await fetch(url());
    expect(await res.json()).toEqual({ cast: [{ ...kitriJson, dancer: null }] });
  });
});

describe('POST /api/schools/:schoolId/dances/:danceId/cast', () => {
  const url = () => `${baseUrl}/api/schools/school-1/dances/dance-1/cast`;

  test('responds 201 with the new cast member', async () => {
    vi.mocked(prisma.castMember.create).mockResolvedValue(kitri as never);
    const res = await fetch(url(), send('POST', { dancerId: 'dancer-1', role: 'Kitri' }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      castMember: kitriJson,
      positions: [{ figureId: 'figure-1', castMemberId: 'cast-1', ...topOfLeftWing }],
    });
  });

  test('casts the dancer into this dance', async () => {
    vi.mocked(prisma.castMember.create).mockResolvedValue(kitri as never);
    await fetch(url(), send('POST', { dancerId: 'dancer-1', role: 'Kitri' }));
    expect(prisma.castMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ danceId: 'dance-1', dancerId: 'dancer-1', role: 'Kitri' }),
      }),
    );
  });

  test('places the new dancer at the top of the left wing in the first figure', async () => {
    vi.mocked(prisma.castMember.create).mockResolvedValue(kitri as never);
    await fetch(url(), send('POST', { dancerId: 'dancer-1' }));
    expect(prisma.castMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          positions: { create: [{ figureId: 'figure-1', ...topOfLeftWing }] },
        }),
      }),
    );
  });

  test('places the new dancer below the ones already waiting in the wing', async () => {
    vi.mocked(prisma.figure.findMany).mockResolvedValue([
      {
        ...firstFigure,
        positions: [{ figureId: 'figure-1', castMemberId: 'cast-0', ...topOfLeftWing }],
      },
    ] as never);
    vi.mocked(prisma.castMember.create).mockResolvedValue(kitri as never);
    const res = await fetch(url(), send('POST', { dancerId: 'dancer-1' }));
    const body = (await res.json()) as CastMemberCreatedResponse;
    expect(body.positions).toEqual([
      { figureId: 'figure-1', castMemberId: 'cast-1', x: -0.0625, y: 0.15 },
    ]);
  });

  test('places the new dancer in the wing of every figure, each from its own wing', async () => {
    vi.mocked(prisma.figure.findMany).mockResolvedValue([
      {
        ...firstFigure,
        positions: [{ figureId: 'figure-1', castMemberId: 'cast-0', ...topOfLeftWing }],
      },
      { ...secondFigure, positions: [] },
    ] as never);
    vi.mocked(prisma.castMember.create).mockResolvedValue(kitri as never);
    await fetch(url(), send('POST', { dancerId: 'dancer-1' }));
    expect(prisma.castMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          positions: {
            create: [
              { figureId: 'figure-1', x: -0.0625, y: 0.15 },
              { figureId: 'figure-2', ...topOfLeftWing },
            ],
          },
        }),
      }),
    );
  });

  test('answers with the new spot in every figure, in figure order', async () => {
    vi.mocked(prisma.figure.findMany).mockResolvedValue([
      { ...firstFigure, positions: [] },
      { ...secondFigure, positions: [] },
    ] as never);
    vi.mocked(prisma.castMember.create).mockResolvedValue(kitri as never);
    const res = await fetch(url(), send('POST', { dancerId: 'dancer-1' }));
    const body = (await res.json()) as CastMemberCreatedResponse;
    expect(body.positions.map(({ figureId }) => figureId)).toEqual(['figure-1', 'figure-2']);
  });

  test('looks the figures up in figure order', async () => {
    vi.mocked(prisma.castMember.create).mockResolvedValue(kitri as never);
    await fetch(url(), send('POST', { dancerId: 'dancer-1' }));
    expect(prisma.figure.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { danceId: 'dance-1' }, orderBy: { order: 'asc' } }),
    );
  });

  test('looks the dancer up in this school', async () => {
    vi.mocked(prisma.castMember.create).mockResolvedValue(kitri as never);
    await fetch(url(), send('POST', { dancerId: 'dancer-1' }));
    expect(prisma.dancer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'dancer-1', schoolId: 'school-1' } }),
    );
  });

  test('responds 400 for a role over the maximum length', async () => {
    const res = await fetch(url(), send('POST', { dancerId: 'dancer-1', role: 'a'.repeat(41) }));
    expect(res.status).toBe(400);
  });

  test('responds 400 for a dancer of another school', async () => {
    vi.mocked(prisma.dancer.findFirst).mockResolvedValue(null);
    const res = await fetch(url(), send('POST', { dancerId: 'dancer-9' }));
    expect(res.status).toBe(400);
  });

  test('responds 404 for a dance of another school', async () => {
    vi.mocked(prisma.dance.findFirst).mockResolvedValue(null);
    const res = await fetch(url(), send('POST', { dancerId: 'dancer-1' }));
    expect(res.status).toBe(404);
  });

  test('casts the last dancer the dance can hold', async () => {
    vi.mocked(prisma.castMember.count).mockResolvedValue(CAST_MAX_SIZE - 1);
    vi.mocked(prisma.castMember.create).mockResolvedValue(kitri as never);
    const res = await fetch(url(), send('POST', { dancerId: 'dancer-1' }));
    expect(res.status).toBe(201);
  });

  test('responds 409 once the dance holds the most dancers it can', async () => {
    vi.mocked(prisma.castMember.count).mockResolvedValue(CAST_MAX_SIZE);
    const res = await fetch(url(), send('POST', { dancerId: 'dancer-1' }));
    expect(await res.json()).toEqual({ error: 'cast_full' });
  });

  test('casts nobody once the dance is full', async () => {
    vi.mocked(prisma.castMember.count).mockResolvedValue(CAST_MAX_SIZE);
    await fetch(url(), send('POST', { dancerId: 'dancer-1' }));
    expect(prisma.castMember.create).not.toHaveBeenCalled();
  });

  test('counts only the cast of this dance', async () => {
    vi.mocked(prisma.castMember.create).mockResolvedValue(kitri as never);
    await fetch(url(), send('POST', { dancerId: 'dancer-1' }));
    expect(prisma.castMember.count).toHaveBeenCalledWith({ where: { danceId: 'dance-1' } });
  });

  test('responds 409 when the dancer is already in the cast', async () => {
    vi.mocked(prisma.castMember.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    const res = await fetch(url(), send('POST', { dancerId: 'dancer-1' }));
    expect(res.status).toBe(409);
  });
});

describe('PATCH /api/schools/:schoolId/dances/:danceId/cast/:castMemberId', () => {
  const url = () => `${baseUrl}/api/schools/school-1/dances/dance-1/cast/cast-1`;

  test('responds with the updated cast member', async () => {
    vi.mocked(prisma.castMember.updateManyAndReturn).mockResolvedValue([
      { ...kitri, role: 'Dulcinea' },
    ] as never);
    const res = await fetch(url(), send('PATCH', { role: 'Dulcinea' }));
    expect(await res.json()).toEqual({ castMember: { ...kitriJson, role: 'Dulcinea' } });
  });

  test('updates only a cast member of this dance in this school', async () => {
    vi.mocked(prisma.castMember.updateManyAndReturn).mockResolvedValue([kitri] as never);
    await fetch(url(), send('PATCH', { role: 'Kitri' }));
    expect(prisma.castMember.updateManyAndReturn).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cast-1', danceId: 'dance-1', dance: { schoolId: 'school-1' } },
      }),
    );
  });

  test('clears the role when it is blank', async () => {
    vi.mocked(prisma.castMember.updateManyAndReturn).mockResolvedValue([kitri] as never);
    await fetch(url(), send('PATCH', { role: '  ' }));
    expect(prisma.castMember.updateManyAndReturn).toHaveBeenCalledWith(
      expect.objectContaining({ data: { role: null } }),
    );
  });

  test('responds 404 for a cast member of another school', async () => {
    vi.mocked(prisma.castMember.updateManyAndReturn).mockResolvedValue([]);
    const res = await fetch(url(), send('PATCH', { role: 'Kitri' }));
    expect(res.status).toBe(404);
  });

  test('responds 400 for a role over the maximum length', async () => {
    const res = await fetch(url(), send('PATCH', { role: 'a'.repeat(41) }));
    expect(res.status).toBe(400);
  });

  test('gives the spot to another dancer of the school', async () => {
    vi.mocked(prisma.dancer.findFirst).mockResolvedValue(clara);
    vi.mocked(prisma.castMember.updateManyAndReturn).mockResolvedValue([kitri] as never);
    await fetch(url(), send('PATCH', { dancerId: 'dancer-1' }));
    expect(prisma.castMember.updateManyAndReturn).toHaveBeenCalledWith(
      expect.objectContaining({ data: { dancerId: 'dancer-1' } }),
    );
  });

  test('looks for the new dancer in this school', async () => {
    vi.mocked(prisma.dancer.findFirst).mockResolvedValue(clara);
    vi.mocked(prisma.castMember.updateManyAndReturn).mockResolvedValue([kitri] as never);
    await fetch(url(), send('PATCH', { dancerId: 'dancer-1' }));
    expect(prisma.dancer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'dancer-1', schoolId: 'school-1' } }),
    );
  });

  test('responds 400 for a dancer of another school', async () => {
    vi.mocked(prisma.dancer.findFirst).mockResolvedValue(null);
    const res = await fetch(url(), send('PATCH', { dancerId: 'dancer-9' }));
    expect(res.status).toBe(400);
  });

  test('responds 409 when the new dancer is already in the cast', async () => {
    vi.mocked(prisma.dancer.findFirst).mockResolvedValue(clara);
    vi.mocked(prisma.castMember.updateManyAndReturn).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    const res = await fetch(url(), send('PATCH', { dancerId: 'dancer-1' }));
    expect(res.status).toBe(409);
  });
});

describe('DELETE /api/schools/:schoolId/dances/:danceId/cast/:castMemberId', () => {
  const url = () => `${baseUrl}/api/schools/school-1/dances/dance-1/cast/cast-1`;

  test('responds 204 once the cast member is removed', async () => {
    vi.mocked(prisma.castMember.deleteMany).mockResolvedValue({ count: 1 });
    const res = await fetch(url(), { method: 'DELETE' });
    expect(res.status).toBe(204);
  });

  test('removes only a cast member of this dance in this school', async () => {
    vi.mocked(prisma.castMember.deleteMany).mockResolvedValue({ count: 1 });
    await fetch(url(), { method: 'DELETE' });
    expect(prisma.castMember.deleteMany).toHaveBeenCalledWith({
      where: { id: 'cast-1', danceId: 'dance-1', dance: { schoolId: 'school-1' } },
    });
  });

  test('responds 404 for a cast member of another school', async () => {
    vi.mocked(prisma.castMember.deleteMany).mockResolvedValue({ count: 0 });
    const res = await fetch(url(), { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});
