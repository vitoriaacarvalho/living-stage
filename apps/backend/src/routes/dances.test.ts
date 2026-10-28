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
    dance: { findMany: vi.fn(), create: vi.fn(), updateManyAndReturn: vi.fn() },
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
  createdAt: new Date('2026-10-27T12:00:00.000Z'),
};

const kitriJson = {
  id: 'dance-1',
  title: 'Kitri variation',
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

  test('lists the dances of the school', async () => {
    vi.mocked(prisma.dance.findMany).mockResolvedValue([kitri]);
    const res = await fetch(url());
    expect(await res.json()).toEqual({ dances: [kitriJson] });
  });

  test('reads only the dances of this school, newest first', async () => {
    vi.mocked(prisma.dance.findMany).mockResolvedValue([]);
    await fetch(url());
    expect(prisma.dance.findMany).toHaveBeenCalledWith({
      where: { schoolId: 'school-1' },
      orderBy: { createdAt: 'desc' },
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
      data: { schoolId: 'school-1', title: 'Kitri variation' },
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

describe('PUT /api/schools/:schoolId/dances/:danceId', () => {
  const url = () => `${baseUrl}/api/schools/school-1/dances/dance-1`;

  test('responds with the renamed dance', async () => {
    vi.mocked(prisma.dance.updateManyAndReturn).mockResolvedValue([{ ...kitri, title: 'Kitri' }]);
    const res = await fetch(url(), send('PUT', { title: 'Kitri' }));
    expect(await res.json()).toEqual({ dance: { ...kitriJson, title: 'Kitri' } });
  });

  test('renames only a dance of this school', async () => {
    vi.mocked(prisma.dance.updateManyAndReturn).mockResolvedValue([kitri]);
    await fetch(url(), send('PUT', { title: ' Kitri variation ' }));
    expect(prisma.dance.updateManyAndReturn).toHaveBeenCalledWith({
      where: { id: 'dance-1', schoolId: 'school-1' },
      data: { title: 'Kitri variation' },
    });
  });

  test('responds 404 for a dance of another school', async () => {
    vi.mocked(prisma.dance.updateManyAndReturn).mockResolvedValue([]);
    const res = await fetch(url(), send('PUT', { title: 'Kitri' }));
    expect(res.status).toBe(404);
  });

  test('responds 400 for a blank title', async () => {
    const res = await fetch(url(), send('PUT', { title: '' }));
    expect(res.status).toBe(400);
  });
});
