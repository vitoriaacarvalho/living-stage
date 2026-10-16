import { afterEach, describe, expect, test, vi } from 'vitest';
import { createSchool, fetchSchools } from './schools.ts';

const school = { id: 'school-1', name: 'Escola Ana', createdAt: '2026-10-15T12:00:00.000Z' };

function respondWith(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchSchools', () => {
  test('returns the schools', async () => {
    respondWith(200, { schools: [school] });
    expect(await fetchSchools(new AbortController().signal)).toEqual([school]);
  });

  test('fails when the API answers with an error', async () => {
    respondWith(401, { error: 'unauthorized' });
    await expect(fetchSchools(new AbortController().signal)).rejects.toThrow('401');
  });
});

describe('createSchool', () => {
  test('returns the new school', async () => {
    respondWith(201, { school });
    expect(await createSchool({ name: 'Escola Ana' })).toEqual(school);
  });

  test('sends the name as JSON', async () => {
    const fetchMock = respondWith(201, { school });
    await createSchool({ name: 'Escola Ana' });
    const [, init] = fetchMock.mock.lastCall!;
    expect(JSON.parse(init.body)).toEqual({ name: 'Escola Ana' });
  });

  test('fails when the API answers with an error', async () => {
    respondWith(400, { error: 'invalid_name' });
    await expect(createSchool({ name: 'x' })).rejects.toThrow('400');
  });
});
