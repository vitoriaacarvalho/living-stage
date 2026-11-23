import { describe, expect, test } from 'vitest';
import {
  AUDIO_MAX_BYTES,
  SONG_MAX_DURATION_MS,
  SONG_NAME_MAX_LENGTH,
  parseAudioTrackInput,
  parseAudioUploadRequest,
  parseSongName,
  songExtension,
} from './audio.ts';

describe('songExtension', () => {
  test.each([
    ['audio/mpeg', 'mp3'],
    ['audio/mp4', 'm4a'],
    ['audio/x-m4a', 'm4a'],
    ['audio/aac', 'aac'],
    ['audio/wav', 'wav'],
    ['audio/x-wav', 'wav'],
    ['AUDIO/MPEG', 'mp3'],
  ])('names %s as .%s', (type, extension) => {
    expect(songExtension(type)).toBe(extension);
  });

  test.each(['audio/ogg', 'video/mp4', 'text/html', ''])('takes no %s', (type) => {
    expect(songExtension(type)).toBeNull();
  });
});

describe('parseSongName', () => {
  test('trims the name', () => {
    expect(parseSongName('  Kitri variation  ')).toBe('Kitri variation');
  });

  test('takes no blank name', () => {
    expect(parseSongName('   ')).toBeNull();
  });

  test('takes the longest name', () => {
    expect(parseSongName('a'.repeat(SONG_NAME_MAX_LENGTH))).not.toBeNull();
  });

  test('takes no name past the longest', () => {
    expect(parseSongName('a'.repeat(SONG_NAME_MAX_LENGTH + 1))).toBeNull();
  });
});

describe('parseAudioUploadRequest', () => {
  const request = { name: 'Kitri', contentType: 'audio/mpeg', sizeBytes: 5_000_000 };

  test('takes a song', () => {
    expect(parseAudioUploadRequest(request)).toEqual(request);
  });

  test('takes a file of exactly 30 MB', () => {
    expect(parseAudioUploadRequest({ ...request, sizeBytes: AUDIO_MAX_BYTES })).not.toBeNull();
  });

  test('takes no file past 30 MB', () => {
    expect(parseAudioUploadRequest({ ...request, sizeBytes: AUDIO_MAX_BYTES + 1 })).toBeNull();
  });

  test('takes no empty file', () => {
    expect(parseAudioUploadRequest({ ...request, sizeBytes: 0 })).toBeNull();
  });

  test('takes no other kind of file', () => {
    expect(parseAudioUploadRequest({ ...request, contentType: 'video/mp4' })).toBeNull();
  });

  test('takes nothing that is not an object', () => {
    expect(parseAudioUploadRequest(null)).toBeNull();
  });
});

describe('parseAudioTrackInput', () => {
  const input = {
    key: 'schools/s1/songs/a.mp3',
    name: 'Kitri',
    contentType: 'audio/mpeg',
    durationMs: 220_000,
  };

  test('takes an uploaded song', () => {
    expect(parseAudioTrackInput(input)).toEqual(input);
  });

  test('takes no song without a key', () => {
    expect(parseAudioTrackInput({ ...input, key: '' })).toBeNull();
  });

  test('takes no song without a length', () => {
    expect(parseAudioTrackInput({ ...input, durationMs: 0 })).toBeNull();
  });

  test('takes a song of exactly an hour', () => {
    expect(parseAudioTrackInput({ ...input, durationMs: SONG_MAX_DURATION_MS })).not.toBeNull();
  });

  test('takes no song past an hour', () => {
    expect(parseAudioTrackInput({ ...input, durationMs: SONG_MAX_DURATION_MS + 1 })).toBeNull();
  });

  test('takes no part of a millisecond', () => {
    expect(parseAudioTrackInput({ ...input, durationMs: 1.5 })).toBeNull();
  });
});
