import { randomUUID } from 'node:crypto';
import {
  AUDIO_MAX_BYTES,
  parseAudioTrackInput,
  parseAudioUploadRequest,
  songExtension,
  type AudioTrack,
  type AudioTrackDetailResponse,
  type AudioTrackResponse,
  type AudioUploadLinkResponse,
  type ListAudioTracksResponse,
} from '@living-stage/shared';
import { Router } from 'express';
import { prisma } from '../db.ts';
import { Prisma } from '../generated/prisma/client.ts';
import { storage } from '../storage/storage.ts';

export const schoolSongsRouter = Router();

schoolSongsRouter.get('/songs', async (_req, res) => {
  const songs = await prisma.audioTrack.findMany({
    where: { schoolId: res.locals.schoolId },
    orderBy: { name: 'asc' },
  });

  const audioTracks = await Promise.all(songs.map(toAudioTrack));
  res.json({ audioTracks } satisfies ListAudioTracksResponse);
});

// One song with its waveform, for the dance that plays it.
schoolSongsRouter.get('/songs/:songId', async (req, res) => {
  const song = await prisma.audioTrack.findFirst({
    where: { id: req.params.songId, schoolId: res.locals.schoolId },
  });
  if (!song) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  res.json({
    audioTrack: { ...(await toAudioTrack(song)), peaks: song.peaks },
  } satisfies AudioTrackDetailResponse);
});

// The first step of an upload: a link the browser sends the file to, under a key of our making.
schoolSongsRouter.post('/songs/upload-link', async (req, res) => {
  const request = parseAudioUploadRequest(req.body);
  if (!request) {
    res.status(400).json({ error: 'invalid_song' });
    return;
  }

  const extension = songExtension(request.contentType)!;
  const key = `${songsFolder(res.locals.schoolId)}${randomUUID()}.${extension}`;
  const uploadUrl = await storage.uploadUrl(key, request.contentType);

  res.json({ key, uploadUrl } satisfies AudioUploadLinkResponse);
});

// The last step: the file is in storage, so the song joins the school's library.
schoolSongsRouter.post('/songs', async (req, res) => {
  const input = parseAudioTrackInput(req.body);
  if (!input || !isSongKeyOf(input.key, res.locals.schoolId)) {
    res.status(400).json({ error: 'invalid_song' });
    return;
  }

  const sizeBytes = await storage.size(input.key);
  if (sizeBytes === null) {
    res.status(409).json({ error: 'not_uploaded' });
    return;
  }
  // The upload link doesn't limit the size, so a file sent past the limit is thrown away here.
  if (sizeBytes > AUDIO_MAX_BYTES) {
    await storage.remove(input.key);
    res.status(413).json({ error: 'too_large' });
    return;
  }

  try {
    const song = await prisma.audioTrack.create({
      data: {
        schoolId: res.locals.schoolId,
        name: input.name,
        storageKey: input.key,
        contentType: input.contentType,
        sizeBytes,
        durationMs: input.durationMs,
        peaks: input.peaks,
      },
    });
    res.status(201).json({ audioTrack: await toAudioTrack(song) } satisfies AudioTrackResponse);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    res.status(409).json({ error: 'already_saved' });
  }
});

function songsFolder(schoolId: string) {
  return `schools/${schoolId}/songs/`;
}

// Only a key this school was handed: its folder, a UUID and a song's file ending.
function isSongKeyOf(key: string, schoolId: string) {
  const folder = songsFolder(schoolId);
  if (!key.startsWith(folder)) return false;
  return /^[0-9a-f-]{36}\.(mp3|m4a|aac|wav)$/.test(key.slice(folder.length));
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

async function toAudioTrack(song: {
  id: string;
  name: string;
  durationMs: number;
  storageKey: string;
}): Promise<AudioTrack> {
  return {
    id: song.id,
    name: song.name,
    durationMs: song.durationMs,
    url: await storage.readUrl(song.storageKey),
  };
}
