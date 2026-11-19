import { describe, expect, test } from 'vitest';
import { createStorage, READ_LINK_SECONDS, UPLOAD_LINK_SECONDS } from './storage.ts';

const storage = createStorage({
  endpoint: 'http://storage.test:8333',
  region: 'auto',
  bucket: 'songs-bucket',
  accessKeyId: 'key',
  secretAccessKey: 'secret',
});

describe('upload links', () => {
  async function upload() {
    return new URL(await storage.uploadUrl('schools/s1/songs/a.mp3', 'audio/mpeg'));
  }

  test('point at the key inside the bucket', async () => {
    expect((await upload()).pathname).toBe('/songs-bucket/schools/s1/songs/a.mp3');
  });

  test('last ten minutes', async () => {
    expect((await upload()).searchParams.get('X-Amz-Expires')).toBe(String(UPLOAD_LINK_SECONDS));
  });

  test('sign the content type', async () => {
    expect((await upload()).searchParams.get('X-Amz-SignedHeaders')).toContain('content-type');
  });

  test('carry no checksum a browser could not send', async () => {
    const params = [...(await upload()).searchParams.keys()];
    expect(params.filter((name) => name.toLowerCase().includes('checksum'))).toEqual([]);
  });
});

describe('read links', () => {
  test('last six hours', async () => {
    const url = new URL(await storage.readUrl('schools/s1/songs/a.mp3'));
    expect(url.searchParams.get('X-Amz-Expires')).toBe(String(READ_LINK_SECONDS));
  });
});
