import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { createApp } from '../app.ts';
import { auth } from '../auth/auth.ts';
import { prisma } from '../db.ts';

vi.mock('../auth/auth.ts', () => ({
  auth: { handler: vi.fn(), api: { getSession: vi.fn() } },
}));

vi.mock('../db.ts', () => ({
  prisma: { school: { findFirst: vi.fn() }, dance: { findFirst: vi.fn() } },
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
});

test('lists the figures of the dance with their positions', async () => {
  const res = await fetch(url);
  expect(await res.json()).toEqual({
    figures: [
      {
        id: 'figure-1',
        order: 0,
        name: null,
        positions: [{ castMemberId: 'cast-1', x: -0.0625, y: 0.05 }],
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
