import type { AudioTrackDetail } from '@living-stage/shared';
import { useEffect, useState } from 'react';
import { fetchSong } from '../api/songs.ts';

// The dance's song with its waveform, or null while it loads, if it fails, or without a song.
export function useSong(schoolId: string, audioId: string | null): AudioTrackDetail | null {
  const [song, setSong] = useState<AudioTrackDetail | null>(null);

  useEffect(() => {
    if (!audioId) return;
    const controller = new AbortController();
    fetchSong(schoolId, audioId, controller.signal)
      .then(setSong)
      .catch(() => {});
    return () => controller.abort();
  }, [schoolId, audioId]);

  // A song fetched for an earlier choice is never shown for the new one.
  return song?.id === audioId ? song : null;
}
