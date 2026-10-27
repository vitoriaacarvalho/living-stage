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
    dancer: {
      findMany: vi.fn(),
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

const julia = {
  id: 'dancer-1',
  schoolId: 'school-1',
  name: 'Júlia',
  color: 8,
  createdAt: new Date('2026-10-27T12:00:00.000Z'),
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
  vi.mocked(prisma.dancer.findMany).mockReset();
  vi.mocked(prisma.dancer.create).mockReset();
  vi.mocked(prisma.dancer.updateManyAndReturn).mockReset();
  vi.mocked(prisma.dancer.deleteMany).mockReset();
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user,
    session: { id: 'session-1', userId: user.id } as never,
  });
  vi.mocked(prisma.school.findFirst).mockResolvedValue({ id: 'school-1' } as never);
});

function send(method: string, body: unknown) {
  return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

describe('GET /api/schools/:schoolId/dancers', () => {
  const url = () => `${baseUrl}/api/schools/school-1/dancers`;

  test('responds 404 for a school the user does not teach at', async () => {
    vi.mocked(prisma.school.findFirst).mockResolvedValue(null);
    const res = await fetch(url());
    expect(res.status).toBe(404);
  });

  test('lists the dancers of the school', async () => {
    vi.mocked(prisma.dancer.findMany).mockResolvedValue([julia]);
    const res = await fetch(url());
    expect(await res.json()).toEqual({ dancers: [{ id: 'dancer-1', name: 'Júlia', color: 8 }] });
  });

  test('reads only the dancers of this school, sorted by name', async () => {
    vi.mocked(prisma.dancer.findMany).mockResolvedValue([]);
    await fetch(url());
    expect(prisma.dancer.findMany).toHaveBeenCalledWith({
      where: { schoolId: 'school-1' },
      orderBy: { name: 'asc' },
    });
  });
});

describe('POST /api/schools/:schoolId/dancers', () => {
  const url = () => `${baseUrl}/api/schools/school-1/dancers`;

  test('responds 201 with the new dancer', async () => {
    vi.mocked(prisma.dancer.create).mockResolvedValue(julia);
    const res = await fetch(url(), send('POST', { name: 'Júlia', color: 8 }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ dancer: { id: 'dancer-1', name: 'Júlia', color: 8 } });
  });

  test('creates the dancer in this school', async () => {
    vi.mocked(prisma.dancer.create).mockResolvedValue(julia);
    await fetch(url(), send('POST', { name: ' Júlia ', color: 8 }));
    expect(prisma.dancer.create).toHaveBeenCalledWith({
      data: { schoolId: 'school-1', name: 'Júlia', color: 8 },
    });
  });

  test('responds 400 for a blank name', async () => {
    const res = await fetch(url(), send('POST', { name: ' ', color: null }));
    expect(res.status).toBe(400);
  });

  test('responds 400 for a color outside the palette', async () => {
    const res = await fetch(url(), send('POST', { name: 'Júlia', color: 13 }));
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/schools/:schoolId/dancers/:dancerId', () => {
  const url = () => `${baseUrl}/api/schools/school-1/dancers/dancer-1`;

  test('responds with the updated dancer', async () => {
    vi.mocked(prisma.dancer.updateManyAndReturn).mockResolvedValue([{ ...julia, color: null }]);
    const res = await fetch(url(), send('PUT', { name: 'Júlia', color: null }));
    expect(await res.json()).toEqual({ dancer: { id: 'dancer-1', name: 'Júlia', color: null } });
  });

  test('updates only a dancer of this school', async () => {
    vi.mocked(prisma.dancer.updateManyAndReturn).mockResolvedValue([julia]);
    await fetch(url(), send('PUT', { name: 'Júlia', color: 8 }));
    expect(prisma.dancer.updateManyAndReturn).toHaveBeenCalledWith({
      where: { id: 'dancer-1', schoolId: 'school-1' },
      data: { name: 'Júlia', color: 8 },
    });
  });

  test('responds 404 for a dancer of another school', async () => {
    vi.mocked(prisma.dancer.updateManyAndReturn).mockResolvedValue([]);
    const res = await fetch(url(), send('PUT', { name: 'Júlia', color: 8 }));
    expect(res.status).toBe(404);
  });

  test('responds 400 for a blank name', async () => {
    const res = await fetch(url(), send('PUT', { name: '', color: 8 }));
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/schools/:schoolId/dancers/:dancerId', () => {
  const url = () => `${baseUrl}/api/schools/school-1/dancers/dancer-1`;

  test('responds 204 once the dancer is removed', async () => {
    vi.mocked(prisma.dancer.deleteMany).mockResolvedValue({ count: 1 });
    const res = await fetch(url(), { method: 'DELETE' });
    expect(res.status).toBe(204);
  });

  test('removes only a dancer of this school', async () => {
    vi.mocked(prisma.dancer.deleteMany).mockResolvedValue({ count: 1 });
    await fetch(url(), { method: 'DELETE' });
    expect(prisma.dancer.deleteMany).toHaveBeenCalledWith({
      where: { id: 'dancer-1', schoolId: 'school-1' },
    });
  });

  test('responds 404 for a dancer of another school', async () => {
    vi.mocked(prisma.dancer.deleteMany).mockResolvedValue({ count: 0 });
    const res = await fetch(url(), { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});
