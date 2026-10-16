import { afterEach, describe, expect, test, vi } from 'vitest';
import { createInvite, fetchInvite, joinSchool, previewInvite } from './invites.ts';

const invite = { code: 'ABCD2345', expiresAt: '2026-10-23T12:00:00.000Z' };
const school = { id: 'school-1', name: 'Escola Ana', createdAt: '2026-10-15T12:00:00.000Z' };

function respondWith(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchInvite', () => {
  test('returns the active invite', async () => {
    respondWith(200, { invite });
    expect(await fetchInvite('school-1', new AbortController().signal)).toEqual(invite);
  });

  test('asks for the invite of the given school', async () => {
    const fetchMock = respondWith(200, { invite: null });
    await fetchInvite('school-1', new AbortController().signal);
    expect(fetchMock.mock.lastCall![0]).toBe('/api/schools/school-1/invite');
  });

  test('fails when the API answers with an error', async () => {
    respondWith(404, { error: 'not_found' });
    await expect(fetchInvite('school-1', new AbortController().signal)).rejects.toThrow('404');
  });
});

describe('createInvite', () => {
  test('returns the new invite', async () => {
    respondWith(201, { invite });
    expect(await createInvite('school-1')).toEqual(invite);
  });

  test('fails when the API answers with an error', async () => {
    respondWith(500, {});
    await expect(createInvite('school-1')).rejects.toThrow('500');
  });
});

describe('previewInvite', () => {
  test('returns the name of the school', async () => {
    respondWith(200, { school: { name: 'Escola Ana' } });
    expect(await previewInvite('ABCD2345')).toBe('Escola Ana');
  });

  test('returns null for an unknown or expired code', async () => {
    respondWith(404, { error: 'invite_not_found' });
    expect(await previewInvite('ABCD2345')).toBeNull();
  });

  test('fails when the API answers with another error', async () => {
    respondWith(500, {});
    await expect(previewInvite('ABCD2345')).rejects.toThrow('500');
  });
});

describe('joinSchool', () => {
  test('returns the joined school', async () => {
    respondWith(200, { school });
    expect(await joinSchool('ABCD2345')).toEqual(school);
  });

  test('fails when the API answers with an error', async () => {
    respondWith(404, { error: 'invite_not_found' });
    await expect(joinSchool('ABCD2345')).rejects.toThrow('404');
  });
});
