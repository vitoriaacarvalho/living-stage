import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../app.ts';
import { auth } from '../auth/auth.ts';
import { prisma } from '../db.ts';

vi.mock('../auth/auth.ts', () => ({
  auth: { handler: vi.fn(), api: { getSession: vi.fn() } },
}));

vi.mock('../db.ts', () => ({
  prisma: {
    school: { findFirst: vi.fn(), update: vi.fn() },
    invite: { findFirst: vi.fn(), upsert: vi.fn() },
  },
}));

vi.mock('../invites/generate-invite-code.ts', () => ({
  generateInviteCode: () => 'ABCD2345',
}));

const user = {
  id: 'user-2',
  name: 'Bia',
  email: 'bia@example.com',
  emailVerified: false,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const school = {
  id: 'school-1',
  name: 'Escola Ana',
  createdAt: new Date('2026-10-15T12:00:00.000Z'),
  createdById: 'user-1',
};

const now = new Date('2026-10-16T12:00:00.000Z');

const invite = {
  id: 'invite-1',
  schoolId: 'school-1',
  code: 'ABCD2345',
  expiresAt: new Date('2026-10-23T12:00:00.000Z'),
  createdAt: now,
  createdById: 'user-1',
  school: { name: 'Escola Ana' },
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
  vi.useFakeTimers({ now, toFake: ['Date'] });
  vi.mocked(prisma.school.findFirst).mockReset();
  vi.mocked(prisma.school.update).mockReset();
  vi.mocked(prisma.invite.findFirst).mockReset();
  vi.mocked(prisma.invite.upsert).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

function signOut() {
  vi.mocked(auth.api.getSession).mockResolvedValue(null);
}

function signIn() {
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user,
    session: { id: 'session-2', userId: user.id } as never,
  });
}

function teachAtSchool() {
  vi.mocked(prisma.school.findFirst).mockResolvedValue({ id: 'school-1' } as never);
}

function teachElsewhere() {
  vi.mocked(prisma.school.findFirst).mockResolvedValue(null);
}

const post = { method: 'POST' };

describe('GET /api/schools/:schoolId/invite', () => {
  const url = () => `${baseUrl}/api/schools/school-1/invite`;

  test('responds 401 without a session', async () => {
    signOut();
    const res = await fetch(url());
    expect(res.status).toBe(401);
  });

  describe('with a session', () => {
    beforeEach(signIn);

    test('responds 404 for a school the user does not teach at', async () => {
      teachElsewhere();
      const res = await fetch(url());
      expect(res.status).toBe(404);
    });

    test('checks membership for the signed-in user', async () => {
      teachElsewhere();
      await fetch(url());
      const [args] = vi.mocked(prisma.school.findFirst).mock.lastCall!;
      expect(args?.where).toEqual({ id: 'school-1', teachers: { some: { id: 'user-2' } } });
    });

    test('does not look up the invite of another school', async () => {
      teachElsewhere();
      await fetch(url());
      expect(prisma.invite.findFirst).not.toHaveBeenCalled();
    });

    test('returns the active invite', async () => {
      teachAtSchool();
      vi.mocked(prisma.invite.findFirst).mockResolvedValue(invite);
      const res = await fetch(url());
      expect(await res.json()).toEqual({
        invite: { code: 'ABCD2345', expiresAt: '2026-10-23T12:00:00.000Z' },
      });
    });

    test('returns no invite when the school has no active one', async () => {
      teachAtSchool();
      vi.mocked(prisma.invite.findFirst).mockResolvedValue(null);
      const res = await fetch(url());
      expect(await res.json()).toEqual({ invite: null });
    });

    test('only looks up an invite that has not expired', async () => {
      teachAtSchool();
      vi.mocked(prisma.invite.findFirst).mockResolvedValue(null);
      await fetch(url());
      const [args] = vi.mocked(prisma.invite.findFirst).mock.lastCall!;
      expect(args?.where).toEqual({ schoolId: 'school-1', expiresAt: { gt: now } });
    });
  });
});

describe('POST /api/schools/:schoolId/invite', () => {
  const url = () => `${baseUrl}/api/schools/school-1/invite`;

  test('responds 401 without a session', async () => {
    signOut();
    const res = await fetch(url(), post);
    expect(res.status).toBe(401);
  });

  describe('with a session', () => {
    beforeEach(() => {
      signIn();
      vi.mocked(prisma.invite.upsert).mockResolvedValue(invite);
    });

    test('responds 404 for a school the user does not teach at', async () => {
      teachElsewhere();
      const res = await fetch(url(), post);
      expect(res.status).toBe(404);
    });

    test('does not make an invite for another school', async () => {
      teachElsewhere();
      await fetch(url(), post);
      expect(prisma.invite.upsert).not.toHaveBeenCalled();
    });

    test('responds 201', async () => {
      teachAtSchool();
      const res = await fetch(url(), post);
      expect(res.status).toBe(201);
    });

    test('returns the new invite', async () => {
      teachAtSchool();
      const res = await fetch(url(), post);
      expect(await res.json()).toEqual({
        invite: { code: 'ABCD2345', expiresAt: '2026-10-23T12:00:00.000Z' },
      });
    });

    test('replaces the school invite with a new code valid for 7 days', async () => {
      teachAtSchool();
      await fetch(url(), post);
      const fields = {
        code: 'ABCD2345',
        expiresAt: new Date('2026-10-23T12:00:00.000Z'),
        createdById: 'user-2',
      };
      expect(prisma.invite.upsert).toHaveBeenCalledWith({
        where: { schoolId: 'school-1' },
        create: { schoolId: 'school-1', ...fields },
        update: fields,
      });
    });
  });
});

describe('GET /api/invites/:code', () => {
  test('responds 401 without a session', async () => {
    signOut();
    const res = await fetch(`${baseUrl}/api/invites/ABCD2345`);
    expect(res.status).toBe(401);
  });

  describe('with a session', () => {
    beforeEach(signIn);

    test('returns the name of the school', async () => {
      vi.mocked(prisma.invite.findFirst).mockResolvedValue(invite);
      const res = await fetch(`${baseUrl}/api/invites/ABCD2345`);
      expect(await res.json()).toEqual({ school: { name: 'Escola Ana' } });
    });

    test('looks up the code as typed, in any case and with a dash', async () => {
      vi.mocked(prisma.invite.findFirst).mockResolvedValue(invite);
      await fetch(`${baseUrl}/api/invites/abcd-2345`);
      const [args] = vi.mocked(prisma.invite.findFirst).mock.lastCall!;
      expect(args?.where).toEqual({ code: 'ABCD2345', expiresAt: { gt: now } });
    });

    test('responds 404 for an unknown or expired code', async () => {
      vi.mocked(prisma.invite.findFirst).mockResolvedValue(null);
      const res = await fetch(`${baseUrl}/api/invites/ABCD2345`);
      expect(res.status).toBe(404);
    });

    test('responds 404 for a malformed code', async () => {
      const res = await fetch(`${baseUrl}/api/invites/nope`);
      expect(res.status).toBe(404);
    });

    test('does not look up a malformed code', async () => {
      await fetch(`${baseUrl}/api/invites/nope`);
      expect(prisma.invite.findFirst).not.toHaveBeenCalled();
    });
  });
});

describe('POST /api/invites/:code/accept', () => {
  const url = () => `${baseUrl}/api/invites/ABCD2345/accept`;

  test('responds 401 without a session', async () => {
    signOut();
    const res = await fetch(url(), post);
    expect(res.status).toBe(401);
  });

  describe('with a session', () => {
    beforeEach(signIn);

    test('responds 404 for an unknown or expired code', async () => {
      vi.mocked(prisma.invite.findFirst).mockResolvedValue(null);
      const res = await fetch(url(), post);
      expect(res.status).toBe(404);
    });

    test('does not join a school with an unknown or expired code', async () => {
      vi.mocked(prisma.invite.findFirst).mockResolvedValue(null);
      await fetch(url(), post);
      expect(prisma.school.update).not.toHaveBeenCalled();
    });

    test('adds the signed-in user to the school teachers', async () => {
      vi.mocked(prisma.invite.findFirst).mockResolvedValue(invite);
      vi.mocked(prisma.school.update).mockResolvedValue(school);
      await fetch(url(), post);
      expect(prisma.school.update).toHaveBeenCalledWith({
        where: { id: 'school-1' },
        data: { teachers: { connect: { id: 'user-2' } } },
      });
    });

    test('returns the joined school', async () => {
      vi.mocked(prisma.invite.findFirst).mockResolvedValue(invite);
      vi.mocked(prisma.school.update).mockResolvedValue(school);
      const res = await fetch(url(), post);
      expect(await res.json()).toEqual({
        school: { id: 'school-1', name: 'Escola Ana', createdAt: '2026-10-15T12:00:00.000Z' },
      });
    });
  });
});
