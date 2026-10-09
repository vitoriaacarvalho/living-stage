import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../app.ts';
import { prisma } from '../db.ts';

vi.mock('../db.ts', () => ({ prisma: { $queryRaw: vi.fn() } }));

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

describe('GET /health', () => {
  describe('when the database answers', () => {
    beforeEach(() => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
    });

    test('responds 200', async () => {
      const res = await fetch(`${baseUrl}/health`);
      expect(res.status).toBe(200);
    });

    test('reports the database as ok', async () => {
      const res = await fetch(`${baseUrl}/health`);
      expect(await res.json()).toEqual({ status: 'ok', database: 'ok' });
    });
  });

  describe('when the database is unreachable', () => {
    beforeEach(() => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('connection refused'));
    });

    test('responds 503', async () => {
      const res = await fetch(`${baseUrl}/health`);
      expect(res.status).toBe(503);
    });

    test('reports the database as unreachable', async () => {
      const res = await fetch(`${baseUrl}/health`);
      expect(await res.json()).toEqual({ status: 'error', database: 'unreachable' });
    });
  });
});
