import { PEAKS_PER_SECOND } from '@living-stage/shared';

// The loudest point of each slice of the song, across its channels, from 0 to 1 in hundredths.
export function peaksOf(channels: Float32Array[], sampleRate: number): number[] {
  const length = channels[0]?.length ?? 0;
  const perSlice = sampleRate / PEAKS_PER_SECOND;
  const count = Math.ceil(length / perSlice);
  const peaks: number[] = [];
  for (let slice = 0; slice < count; slice++) {
    const start = Math.floor(slice * perSlice);
    const end = Math.min(length, Math.floor((slice + 1) * perSlice));
    let loudest = 0;
    for (const channel of channels) {
      for (let i = start; i < end; i++) {
        const level = Math.abs(channel[i]!);
        if (level > loudest) loudest = level;
      }
    }
    peaks.push(Math.round(Math.min(1, loudest) * 100) / 100);
  }
  return peaks;
}

// Decoding at a low rate keeps a 13-minute song to about 50 MB in memory, even on an iPhone;
// the waveform only needs a twentieth of a second.
const DECODE_RATE = 8000;

// The song's length and waveform from one decoding, so the two always agree.
export async function readSong(file: Blob): Promise<{ durationMs: number; peaks: number[] }> {
  const context = new OfflineAudioContext({
    numberOfChannels: 1,
    length: 1,
    sampleRate: DECODE_RATE,
  });
  const audio = await context.decodeAudioData(await file.arrayBuffer());
  const channels = Array.from({ length: audio.numberOfChannels }, (_, i) =>
    audio.getChannelData(i),
  );
  const durationMs = Math.round(audio.duration * 1000);
  if (!(durationMs > 0)) throw new Error('The song has no length');
  return { durationMs, peaks: peaksOf(channels, audio.sampleRate) };
}
