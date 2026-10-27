import { afterEach, describe, expect, test, vi } from 'vitest';
import { createDancer, deleteDancer, fetchDancers, updateDancer } from './dancers.ts';

const julia = { id: 'dancer-1', name: 'Júlia', color: 8 };

function respondWith(status: number, body?: unknown) {
  const response = new Response(body === undefined ? null : JSON.stringify(body), { status });
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchDancers', () => {
  test('returns the dancers of the school', async () => {
    respondWith(200, { dancers: [julia] });
    expect(await fetchDancers('school-1', new AbortController().signal)).toEqual([julia]);
  });

  test('asks for the dancers of the given school', async () => {
    const fetchMock = respondWith(200, { dancers: [] });
    await fetchDancers('school-1', new AbortController().signal);
    expect(fetchMock.mock.lastCall![0]).toBe('/api/schools/school-1/dancers');
  });

  test('fails when the API answers with an error', async () => {
    respondWith(404, { error: 'not_found' });
    await expect(fetchDancers('school-1', new AbortController().signal)).rejects.toThrow('404');
  });
});

describe('createDancer', () => {
  test('returns the new dancer', async () => {
    respondWith(201, { dancer: julia });
    expect(await createDancer('school-1', { name: 'Júlia', color: 8 })).toEqual(julia);
  });

  test('sends the name and color', async () => {
    const fetchMock = respondWith(201, { dancer: julia });
    await createDancer('school-1', { name: 'Júlia', color: 8 });
    expect(JSON.parse(fetchMock.mock.lastCall![1].body)).toEqual({ name: 'Júlia', color: 8 });
  });

  test('fails when the API answers with an error', async () => {
    respondWith(400, { error: 'invalid_dancer' });
    await expect(createDancer('school-1', { name: 'Júlia', color: 8 })).rejects.toThrow('400');
  });
});

describe('updateDancer', () => {
  test('returns the updated dancer', async () => {
    respondWith(200, { dancer: julia });
    expect(await updateDancer('school-1', julia)).toEqual(julia);
  });

  test('puts the new fields at the dancer address', async () => {
    const fetchMock = respondWith(200, { dancer: julia });
    await updateDancer('school-1', julia);
    const [url, init] = fetchMock.mock.lastCall!;
    expect([url, init.method, JSON.parse(init.body)]).toEqual([
      '/api/schools/school-1/dancers/dancer-1',
      'PUT',
      { name: 'Júlia', color: 8 },
    ]);
  });

  test('fails when the API answers with an error', async () => {
    respondWith(404, { error: 'not_found' });
    await expect(updateDancer('school-1', julia)).rejects.toThrow('404');
  });
});

describe('deleteDancer', () => {
  test('deletes the dancer at her address', async () => {
    const fetchMock = respondWith(204);
    await deleteDancer('school-1', 'dancer-1');
    expect(fetchMock.mock.lastCall).toEqual([
      '/api/schools/school-1/dancers/dancer-1',
      { method: 'DELETE' },
    ]);
  });

  test('fails when the API answers with an error', async () => {
    respondWith(404, { error: 'not_found' });
    await expect(deleteDancer('school-1', 'dancer-1')).rejects.toThrow('404');
  });
});
