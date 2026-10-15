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
  prisma: { school: { create: vi.fn(), findMany: vi.fn() } },
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

const createdSchool = {
  id: 'school-1',
  name: 'Escola Ana',
  createdAt: new Date('2026-10-15T12:00:00.000Z'),
  createdById: user.id,
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

function postSchool(body: unknown) {
  return fetch(`${baseUrl}/api/schools`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/schools', () => {
  beforeEach(() => {
    vi.mocked(prisma.school.create).mockReset();
  });

  describe('without a session', () => {
    beforeEach(() => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null);
    });

    test('responds 401', async () => {
      const res = await postSchool({ name: 'Escola Ana' });
      expect(res.status).toBe(401);
    });

    test('does not create a school', async () => {
      await postSchool({ name: 'Escola Ana' });
      expect(prisma.school.create).not.toHaveBeenCalled();
    });
  });

  describe('with a session', () => {
    beforeEach(() => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user,
        session: { id: 'session-1', userId: user.id } as never,
      });
      vi.mocked(prisma.school.create).mockResolvedValue(createdSchool as never);
    });

    test('responds 201', async () => {
      const res = await postSchool({ name: 'Escola Ana' });
      expect(res.status).toBe(201);
    });

    test('returns the new school', async () => {
      const res = await postSchool({ name: 'Escola Ana' });
      expect(await res.json()).toEqual({
        school: { id: 'school-1', name: 'Escola Ana', createdAt: '2026-10-15T12:00:00.000Z' },
      });
    });

    test('makes the signed-in user the creator and first teacher', async () => {
      await postSchool({ name: 'Escola Ana' });
      expect(prisma.school.create).toHaveBeenCalledWith({
        data: {
          name: 'Escola Ana',
          createdById: 'user-1',
          teachers: { connect: { id: 'user-1' } },
        },
      });
    });

    test('saves the name trimmed', async () => {
      await postSchool({ name: '  Escola Ana  ' });
      const [args] = vi.mocked(prisma.school.create).mock.lastCall!;
      expect(args.data.name).toBe('Escola Ana');
    });

    test('responds 400 for a blank name', async () => {
      const res = await postSchool({ name: '  ' });
      expect(res.status).toBe(400);
    });

    test('responds 400 when the name is missing', async () => {
      const res = await postSchool({});
      expect(res.status).toBe(400);
    });

    test('does not create a school for an invalid name', async () => {
      await postSchool({ name: '' });
      expect(prisma.school.create).not.toHaveBeenCalled();
    });
  });
});

describe('GET /api/schools', () => {
  beforeEach(() => {
    vi.mocked(prisma.school.findMany).mockReset();
  });

  describe('without a session', () => {
    beforeEach(() => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null);
    });

    test('responds 401', async () => {
      const res = await fetch(`${baseUrl}/api/schools`);
      expect(res.status).toBe(401);
    });

    test('does not look up schools', async () => {
      await fetch(`${baseUrl}/api/schools`);
      expect(prisma.school.findMany).not.toHaveBeenCalled();
    });
  });

  describe('with a session', () => {
    beforeEach(() => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user,
        session: { id: 'session-1', userId: user.id } as never,
      });
    });

    test('responds 200', async () => {
      vi.mocked(prisma.school.findMany).mockResolvedValue([]);
      const res = await fetch(`${baseUrl}/api/schools`);
      expect(res.status).toBe(200);
    });

    test('returns an empty list when the user has no school', async () => {
      vi.mocked(prisma.school.findMany).mockResolvedValue([]);
      const res = await fetch(`${baseUrl}/api/schools`);
      expect(await res.json()).toEqual({ schools: [] });
    });

    test('returns the schools the user teaches at', async () => {
      vi.mocked(prisma.school.findMany).mockResolvedValue([createdSchool] as never);
      const res = await fetch(`${baseUrl}/api/schools`);
      expect(await res.json()).toEqual({
        schools: [{ id: 'school-1', name: 'Escola Ana', createdAt: '2026-10-15T12:00:00.000Z' }],
      });
    });

    test('only looks up schools where the signed-in user is a teacher', async () => {
      vi.mocked(prisma.school.findMany).mockResolvedValue([]);
      await fetch(`${baseUrl}/api/schools`);
      const [args] = vi.mocked(prisma.school.findMany).mock.lastCall!;
      expect(args?.where).toEqual({ teachers: { some: { id: 'user-1' } } });
    });
  });
});
