import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  AUDIO_MAX_BYTES,
  type AudioUploadLinkResponse,
  type ListAudioTracksResponse,
} from '@living-stage/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../app.ts';
import { auth } from '../auth/auth.ts';
import { prisma } from '../db.ts';
import { Prisma } from '../generated/prisma/client.ts';
import { storage } from '../storage/storage.ts';

vi.mock('../auth/auth.ts', () => ({
  auth: { handler: vi.fn(), api: { getSession: vi.fn() } },
}));

vi.mock('../db.ts', () => ({
  prisma: {
    school: { findFirst: vi.fn() },
    audioTrack: { findMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('../storage/storage.ts', () => ({
  storage: { uploadUrl: vi.fn(), readUrl: vi.fn(), size: vi.fn(), remove: vi.fn() },
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

const key = 'schools/school-1/songs/0f8fad5b-d9cb-469f-a165-70867728950e.mp3';

const kitri = {
  id: 'song-1',
  schoolId: 'school-1',
  name: 'Kitri variation',
  storageKey: key,
  contentType: 'audio/mpeg',
  sizeBytes: 5_000_000,
  durationMs: 220_000,
  createdAt: new Date('2026-11-23T12:00:00.000Z'),
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
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user,
    session: { id: 'session-1', userId: user.id } as never,
  });
  vi.mocked(prisma.school.findFirst).mockResolvedValue({ id: 'school-1' } as never);
  vi.mocked(storage.uploadUrl).mockResolvedValue('https://storage.test/upload');
  vi.mocked(storage.readUrl).mockImplementation(async (k) => `https://storage.test/read/${k}`);
  vi.mocked(storage.size).mockResolvedValue(5_000_000);
  vi.mocked(prisma.audioTrack.create).mockResolvedValue(kitri);
});

function post(path: string, body: unknown) {
  return fetch(`${baseUrl}/api/schools/school-1${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/schools/:schoolId/songs', () => {
  const list = () => fetch(`${baseUrl}/api/schools/school-1/songs`);

  test('responds 404 for a school the user does not teach at', async () => {
    vi.mocked(prisma.school.findFirst).mockResolvedValue(null);
    expect((await list()).status).toBe(404);
  });

  test('lists only the school songs, by name', async () => {
    vi.mocked(prisma.audioTrack.findMany).mockResolvedValue([kitri]);
    await list();
    expect(prisma.audioTrack.findMany).toHaveBeenCalledWith({
      where: { schoolId: 'school-1' },
      orderBy: { name: 'asc' },
    });
  });

  test('gives each song a fresh link to play it', async () => {
    vi.mocked(prisma.audioTrack.findMany).mockResolvedValue([kitri]);
    const body = (await (await list()).json()) as ListAudioTracksResponse;
    expect(body.audioTracks).toEqual([
      {
        id: 'song-1',
        name: 'Kitri variation',
        durationMs: 220_000,
        url: `https://storage.test/read/${key}`,
      },
    ]);
  });
});

describe('POST /api/schools/:schoolId/songs/upload-link', () => {
  const request = { name: 'Kitri variation', contentType: 'audio/mpeg', sizeBytes: 5_000_000 };

  test('responds 404 for a school the user does not teach at', async () => {
    vi.mocked(prisma.school.findFirst).mockResolvedValue(null);
    expect((await post('/songs/upload-link', request)).status).toBe(404);
  });

  test('responds 400 for a file that is not a song', async () => {
    const res = await post('/songs/upload-link', { ...request, contentType: 'video/mp4' });
    expect(res.status).toBe(400);
  });

  test('responds 400 for a file past 30 MB', async () => {
    const res = await post('/songs/upload-link', { ...request, sizeBytes: AUDIO_MAX_BYTES + 1 });
    expect(res.status).toBe(400);
  });

  test('hands out a key in the school folder with the song file ending', async () => {
    const body = (await (
      await post('/songs/upload-link', request)
    ).json()) as AudioUploadLinkResponse;
    expect(body.key).toMatch(/^schools\/school-1\/songs\/[0-9a-f-]{36}\.mp3$/);
  });

  test('signs the link for that key and type', async () => {
    const body = (await (
      await post('/songs/upload-link', request)
    ).json()) as AudioUploadLinkResponse;
    expect(storage.uploadUrl).toHaveBeenCalledWith(body.key, 'audio/mpeg');
  });

  test('returns the upload link', async () => {
    const body = (await (
      await post('/songs/upload-link', request)
    ).json()) as AudioUploadLinkResponse;
    expect(body.uploadUrl).toBe('https://storage.test/upload');
  });
});

describe('POST /api/schools/:schoolId/songs', () => {
  const input = { key, name: 'Kitri variation', contentType: 'audio/mpeg', durationMs: 220_000 };

  test('responds 404 for a school the user does not teach at', async () => {
    vi.mocked(prisma.school.findFirst).mockResolvedValue(null);
    expect((await post('/songs', input)).status).toBe(404);
  });

  test('responds 400 for a song without a length', async () => {
    expect((await post('/songs', { ...input, durationMs: 0 })).status).toBe(400);
  });

  test('responds 400 for a key in another school folder', async () => {
    const other = key.replace('school-1', 'school-2');
    expect((await post('/songs', { ...input, key: other })).status).toBe(400);
  });

  test('responds 400 for a key that climbs out of the folder', async () => {
    const climbing = 'schools/school-1/songs/../../school-2/songs/a.mp3';
    expect((await post('/songs', { ...input, key: climbing })).status).toBe(400);
  });

  test('responds 409 when nothing was uploaded', async () => {
    vi.mocked(storage.size).mockResolvedValue(null);
    expect((await post('/songs', input)).status).toBe(409);
  });

  test('takes a file of exactly 30 MB', async () => {
    vi.mocked(storage.size).mockResolvedValue(AUDIO_MAX_BYTES);
    expect((await post('/songs', input)).status).toBe(201);
  });

  test('responds 413 for a file past 30 MB', async () => {
    vi.mocked(storage.size).mockResolvedValue(AUDIO_MAX_BYTES + 1);
    expect((await post('/songs', input)).status).toBe(413);
  });

  test('throws away a file past 30 MB', async () => {
    vi.mocked(storage.size).mockResolvedValue(AUDIO_MAX_BYTES + 1);
    await post('/songs', input);
    expect(storage.remove).toHaveBeenCalledWith(key);
  });

  test('saves the song with the size found in storage', async () => {
    vi.mocked(storage.size).mockResolvedValue(4_321_000);
    await post('/songs', input);
    expect(prisma.audioTrack.create).toHaveBeenCalledWith({
      data: {
        schoolId: 'school-1',
        name: 'Kitri variation',
        storageKey: key,
        contentType: 'audio/mpeg',
        sizeBytes: 4_321_000,
        durationMs: 220_000,
      },
    });
  });

  test('responds 201 with the song and its link', async () => {
    const res = await post('/songs', input);
    expect(await res.json()).toEqual({
      audioTrack: {
        id: 'song-1',
        name: 'Kitri variation',
        durationMs: 220_000,
        url: `https://storage.test/read/${key}`,
      },
    });
  });

  test('responds 409 when the same file is saved twice', async () => {
    vi.mocked(prisma.audioTrack.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    expect((await post('/songs', input)).status).toBe(409);
  });
});
