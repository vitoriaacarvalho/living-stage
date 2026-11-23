import { AUDIO_MAX_BYTES, SONG_NAME_MAX_LENGTH } from '@living-stage/shared';
import { describe, expect, test } from 'vitest';
import { songFileProblem, songNameOf, songTypeOf } from './song-file.ts';

describe('songTypeOf', () => {
  test('keeps a song type the browser gave', () => {
    expect(songTypeOf({ name: 'kitri.mp3', type: 'audio/mpeg' })).toBe('audio/mpeg');
  });

  test('goes by the file ending when the browser gave no type', () => {
    expect(songTypeOf({ name: 'Kitri.M4A', type: '' })).toBe('audio/mp4');
  });

  test('takes no other kind of file', () => {
    expect(songTypeOf({ name: 'notes.pdf', type: 'application/pdf' })).toBeNull();
  });

  test('takes no file without an ending or a type', () => {
    expect(songTypeOf({ name: 'kitri', type: '' })).toBeNull();
  });
});

describe('songNameOf', () => {
  test('drops the file ending', () => {
    expect(songNameOf('Kitri variation.mp3')).toBe('Kitri variation');
  });

  test('keeps dots inside the name', () => {
    expect(songNameOf('Act 1. Waltz.wav')).toBe('Act 1. Waltz');
  });

  test('names a file that is only an ending', () => {
    expect(songNameOf('.mp3')).toBe('.mp3');
  });

  test('names a file with a blank name', () => {
    expect(songNameOf('  .mp3')).toBe('Song');
  });

  test('cuts a long name to the longest a song can have', () => {
    expect(songNameOf(`${'a'.repeat(150)}.mp3`)).toHaveLength(SONG_NAME_MAX_LENGTH);
  });
});

describe('songFileProblem', () => {
  const song = { name: 'kitri.mp3', type: 'audio/mpeg', size: 5_000_000 };

  test('finds nothing wrong with a song', () => {
    expect(songFileProblem(song)).toBeNull();
  });

  test('takes a song of exactly 30 MB', () => {
    expect(songFileProblem({ ...song, size: AUDIO_MAX_BYTES })).toBeNull();
  });

  test('says when a song is past 30 MB', () => {
    expect(songFileProblem({ ...song, size: AUDIO_MAX_BYTES + 1 })).toMatch(/over 30 MB/);
  });

  test('says when a file is not a song', () => {
    expect(songFileProblem({ ...song, name: 'notes.pdf', type: 'application/pdf' })).toMatch(
      /MP3, M4A, AAC or WAV/,
    );
  });

  test('says when a file is empty', () => {
    expect(songFileProblem({ ...song, size: 0 })).toMatch(/empty/);
  });
});
