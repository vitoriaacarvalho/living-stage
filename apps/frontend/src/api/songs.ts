import type {
  AudioTrack,
  AudioTrackDetail,
  AudioTrackDetailResponse,
  AudioTrackInput,
  AudioTrackResponse,
  AudioUploadLinkResponse,
  AudioUploadRequest,
  ListAudioTracksResponse,
} from '@living-stage/shared';

export async function fetchSongs(schoolId: string, signal: AbortSignal): Promise<AudioTrack[]> {
  const res = await fetch(`/api/schools/${schoolId}/songs`, { signal });
  if (!res.ok) throw new Error(`GET songs answered ${res.status}`);
  const body: ListAudioTracksResponse = await res.json();
  return body.audioTracks;
}

export async function fetchSong(
  schoolId: string,
  songId: string,
  signal: AbortSignal,
): Promise<AudioTrackDetail> {
  const res = await fetch(`/api/schools/${schoolId}/songs/${songId}`, { signal });
  if (!res.ok) throw new Error(`GET song answered ${res.status}`);
  const body: AudioTrackDetailResponse = await res.json();
  return body.audioTrack;
}

export async function requestUploadLink(
  schoolId: string,
  request: AudioUploadRequest,
): Promise<AudioUploadLinkResponse> {
  const res = await fetch(`/api/schools/${schoolId}/songs/upload-link`, sendJson('POST', request));
  if (!res.ok) throw new Error(`POST upload link answered ${res.status}`);
  return res.json();
}

export async function saveSong(schoolId: string, input: AudioTrackInput): Promise<AudioTrack> {
  const res = await fetch(`/api/schools/${schoolId}/songs`, sendJson('POST', input));
  if (!res.ok) throw new Error(`POST song answered ${res.status}`);
  const body: AudioTrackResponse = await res.json();
  return body.audioTrack;
}

// XMLHttpRequest, because fetch can't report how much of an upload has been sent.
// The Content-Type must be the one the link was signed for.
export function uploadFile(
  url: string,
  file: Blob,
  { contentType, onProgress }: { contentType: string; onProgress: (sent: number) => void },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', url);
    request.setRequestHeader('Content-Type', contentType);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(`PUT song answered ${request.status}`));
    request.onerror = () => reject(new Error('PUT song failed'));
    request.send(file);
  });
}

function sendJson(method: string, body: unknown): RequestInit {
  return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}
