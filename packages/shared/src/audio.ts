export const AUDIO_MAX_BYTES = 30 * 1024 * 1024;

export const SONG_NAME_MAX_LENGTH = 100;

// Longer than any dance; a bigger number is a bad reading, not a song.
export const SONG_MAX_DURATION_MS = 60 * 60 * 1000;

// The waveform keeps the loudest point of every twentieth of a second, from 0 to 1.
export const PEAKS_PER_SECOND = 20;

// Browsers name the same format differently (an M4A comes as audio/mp4 or audio/x-m4a).
const EXTENSIONS: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
};

// url is a read link that expires, so it is made fresh on every listing.
export type AudioTrack = { id: string; name: string; durationMs: number; url: string };

// Asking for an upload link, before the file is sent.
export type AudioUploadRequest = { name: string; contentType: string; sizeBytes: number };

export type AudioUploadLinkResponse = { key: string; uploadUrl: string };

// Telling the API the file is in storage; durationMs is read by the browser.
export type AudioTrackInput = {
  key: string;
  name: string;
  contentType: string;
  durationMs: number;
  peaks: number[];
};

// One song with its waveform, fetched only for the dance that plays it.
export type AudioTrackDetail = AudioTrack & { peaks: number[] };

export type AudioTrackDetailResponse = { audioTrack: AudioTrackDetail };

export type ListAudioTracksResponse = { audioTracks: AudioTrack[] };

export type AudioTrackResponse = { audioTrack: AudioTrack };

// The file ending for a supported type, or null when the type isn't a song we take.
export function songExtension(contentType: string): string | null {
  return EXTENSIONS[contentType.toLowerCase()] ?? null;
}

export function parseSongName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  if (name.length === 0 || name.length > SONG_NAME_MAX_LENGTH) return null;
  return name;
}

function isWholeNumberIn(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= max;
}

function isSongType(value: unknown): value is string {
  return typeof value === 'string' && songExtension(value) !== null;
}

export function parseAudioUploadRequest(value: unknown): AudioUploadRequest | null {
  if (typeof value !== 'object' || value === null) return null;
  const { name: rawName, contentType, sizeBytes } = value as Record<string, unknown>;
  const name = parseSongName(rawName);
  if (!name || !isSongType(contentType) || !isWholeNumberIn(sizeBytes, AUDIO_MAX_BYTES)) {
    return null;
  }
  return { name, contentType, sizeBytes };
}

// One peak per twentieth of a second of the song, give or take one, each from 0 to 1.
function isPeaksFor(value: unknown, durationMs: number): value is number[] {
  if (!Array.isArray(value)) return false;
  const expected = (durationMs / 1000) * PEAKS_PER_SECOND;
  if (Math.abs(value.length - expected) > 2) return false;
  return value.every((peak) => typeof peak === 'number' && peak >= 0 && peak <= 1);
}

export function parseAudioTrackInput(value: unknown): AudioTrackInput | null {
  if (typeof value !== 'object' || value === null) return null;
  const { key, name: rawName, contentType, durationMs, peaks } = value as Record<string, unknown>;
  const name = parseSongName(rawName);
  if (typeof key !== 'string' || key.length === 0 || !name || !isSongType(contentType)) {
    return null;
  }
  if (!isWholeNumberIn(durationMs, SONG_MAX_DURATION_MS)) return null;
  if (!isPeaksFor(peaks, durationMs)) return null;
  return { key, name, contentType, durationMs, peaks };
}
