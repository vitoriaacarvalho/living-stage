import { AUDIO_MAX_BYTES, SONG_NAME_MAX_LENGTH, songExtension } from '@living-stage/shared';

// Some browsers leave the type of an M4A or AAC file empty, so the file ending decides then.
const TYPES_BY_ENDING: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
};

export const SONG_FILE_ACCEPT = '.mp3,.m4a,.aac,.wav,audio/mpeg,audio/mp4,audio/aac,audio/wav';

function ending(fileName: string) {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
}

// The type to upload the file as, or null when it isn't a song we take.
export function songTypeOf(file: { name: string; type: string }): string | null {
  if (songExtension(file.type)) return file.type;
  return TYPES_BY_ENDING[ending(file.name)] ?? null;
}

// The file name without its ending, as the song's first name.
export function songNameOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  const name = (dot > 0 ? fileName.slice(0, dot) : fileName).trim();
  return (name || 'Song').slice(0, SONG_NAME_MAX_LENGTH);
}

export function songFileProblem(file: { name: string; type: string; size: number }) {
  if (!songTypeOf(file)) return 'That file isn’t a song we can use. Try an MP3, M4A, AAC or WAV.';
  if (file.size > AUDIO_MAX_BYTES) return 'That song is over 30 MB. Try a smaller file.';
  if (file.size === 0) return 'That file is empty.';
  return null;
}

// Read from the file's own header by an audio element, without decoding the whole song.
export function readDurationMs(file: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = () => URL.revokeObjectURL(url);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      done();
      const ms = Math.round(audio.duration * 1000);
      if (Number.isFinite(ms) && ms > 0) resolve(ms);
      else reject(new Error('The song has no length'));
    };
    audio.onerror = () => {
      done();
      reject(new Error('The song could not be read'));
    };
    audio.src = url;
  });
}
