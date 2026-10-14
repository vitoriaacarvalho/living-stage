import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../app.ts';
import { auth } from '../auth/auth.ts';

vi.mock('../auth/auth.ts', () => ({
  auth: { handler: vi.fn(), api: { getSession: vi.fn() } },
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

describe('GET /api/me', () => {
  describe('without a session', () => {
    beforeEach(() => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null);
    });

    test('responds 401', async () => {
      const res = await fetch(`${baseUrl}/api/me`);
      expect(res.status).toBe(401);
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
      const res = await fetch(`${baseUrl}/api/me`);
      expect(res.status).toBe(200);
    });

    test('returns the signed-in user', async () => {
      const res = await fetch(`${baseUrl}/api/me`);
      expect(await res.json()).toEqual({
        user: { id: 'user-1', name: 'Ana', email: 'ana@example.com', image: null },
      });
    });

    test('looks the session up from the request cookie', async () => {
      await fetch(`${baseUrl}/api/me`, { headers: { cookie: 'better-auth.session_token=abc' } });
      const [context] = vi.mocked(auth.api.getSession).mock.lastCall!;
      expect(new Headers(context?.headers).get('cookie')).toBe('better-auth.session_token=abc');
    });
  });
});
