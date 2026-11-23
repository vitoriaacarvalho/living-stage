import type { AudioTrack } from '@living-stage/shared';
import { useEffect, useState } from 'react';
import { fetchSongs, requestUploadLink, saveSong, uploadFile } from '../api/songs.ts';
import { readDurationMs, songNameOf, songTypeOf } from './song-file.ts';

export type SongsState =
  { status: 'loading' } | { status: 'failed' } | { status: 'ready'; songs: AudioTrack[] };

// Thrown when the browser can't read the song's length, so the panel can say so.
export class UnreadableSongError extends Error {}

export type SongLibrary = {
  state: SongsState;
  upload: (file: File, onProgress: (sent: number) => void) => Promise<AudioTrack>;
};

function byName(a: AudioTrack, b: AudioTrack) {
  return a.name.localeCompare(b.name);
}

export function useSongs(schoolId: string): SongLibrary {
  const [state, setState] = useState<SongsState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchSongs(schoolId, controller.signal)
      .then((songs) => setState({ status: 'ready', songs }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'failed' });
      });
    return () => controller.abort();
  }, [schoolId]);

  // Read the length, get a link, send the file, then save the song to the library.
  async function upload(file: File, onProgress: (sent: number) => void) {
    const contentType = songTypeOf(file)!;
    const name = songNameOf(file.name);
    const durationMs = await readDurationMs(file).catch(() => {
      throw new UnreadableSongError();
    });
    const { key, uploadUrl } = await requestUploadLink(schoolId, {
      name,
      contentType,
      sizeBytes: file.size,
    });
    await uploadFile(uploadUrl, file, { contentType, onProgress });
    const song = await saveSong(schoolId, { key, name, contentType, durationMs });
    setState((current) =>
      current.status === 'ready'
        ? { status: 'ready', songs: [...current.songs, song].sort(byName) }
        : current,
    );
    return song;
  }

  return { state, upload };
}
