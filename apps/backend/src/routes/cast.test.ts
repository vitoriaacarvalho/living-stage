import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
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
    castMember: { findMany: vi.fn(), create: vi.fn() },
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
    expect(await res.json()).toEqual({ castMember: kitriJson });
  });

  test('casts the dancer into this dance', async () => {
    vi.mocked(prisma.castMember.create).mockResolvedValue(kitri as never);
    await fetch(url(), send('POST', { dancerId: 'dancer-1', role: 'Kitri' }));
    expect(prisma.castMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { danceId: 'dance-1', dancerId: 'dancer-1', role: 'Kitri' },
      }),
    );
  });

  test('looks the dancer up in this school', async () => {
    vi.mocked(prisma.castMember.create).mockResolvedValue(kitri as never);
    await fetch(url(), send('POST', { dancerId: 'dancer-1' }));
    expect(prisma.dancer.findFirst).toHaveBeenCalledWith({
      where: { id: 'dancer-1', schoolId: 'school-1' },
    });
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
