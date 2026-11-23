# 4.1–4.5 — Music (no 4.4)

Requirements: **E1** (upload audio to a dance), **E2** (waveform and playhead), **E4** (figures pinned to the song), **E5** (play, pause, scrub, loop, 0.5× / 0.75× / 1×), **E6** (stage in sync with the audio), **E7** (files up to 30 MB, songs reused across dances), **E8** (waveform computed once and stored). Also finishes **H6**: durations come from the song.

Screens: `Timeline` (with its `compact` iPhone form and `theme: 'dark'` for presentation mode), `PresentationMode` (load the `living-stage-design` skill).

Status: decisions agreed on 18 Nov 2026. Musical counts (E3, plan 4.4) were dropped the same day: figures are placed by time only.

## Decisions

- **Songs belong to the school**, as `AudioTrack` rows, so one song can serve several dances (E7). A dance points at one song or none (`Dance.audioId`).
- **Uploads go straight to storage**, as §3 says: the API hands out a short-lived upload link, the browser sends the file with a progress bar, then tells the API it is done. Cloudflare R2 in production; SeaweedFS in Docker Compose for local development, next to Postgres, so local uploads take the same S3 code path. (MinIO was the first choice, but it no longer publishes Docker images.)
- **Signed links.** An upload link lasts 10 minutes and is signed for one key and one content type, so the browser can't send anything else; a read link lasts 6 hours, long enough for a rehearsal. The SDK's default checksums are turned off, since a browser upload can't send them.
- **The browser reads the song once at upload** with the Web Audio API: its duration and the waveform peaks (E8). Both are sent with "done" and stored on the track, so the waveform opens at once on every later visit.
- **A dance with a song takes its duration from it.** The typed duration on the show's dance row is replaced by the song's length, and the show's total follows (H6). Dances without a song keep their typed duration.
- **The audio element is the clock.** While a song plays, the stage reads its current time; speeds use `playbackRate` with the pitch kept. Without a song, playback keeps today's clock.
- **Waveform with `wavesurfer.js`**, drawn from the stored peaks, as in §3.
- **Figures are pinned by time.** A figure gets `timeMs`, the moment it is reached; its move fills the time since the figure before. The marker shows that time, such as `0:58`, in tabular numerals.
- **Dances without music keep working**: until a song is attached, figures keep their `transitionMs` and nothing else changes.
- **Loop repeats the move into the selected figure** ("Repeat figure" in the design), not a free section dragged on the waveform.

## Plans and slices

- **4.1 Audio upload** (E1, E7): ✅ SeaweedFS in Compose and the storage client (slice 1); ✅ the `AudioTrack` and `Dance.audioId` migration with shared types and validation: MP3, M4A, AAC or WAV, up to 30 MB, names up to 100 characters, lengths up to an hour (slice 2); ✅ upload link and "done" routes (slice 3: `POST songs/upload-link` hands out a key under the school's folder; `POST songs` checks the file is in storage and within 30 MB, deleting it if not, then saves the song; `GET songs` lists them with fresh play links); ✅ the music control (slice 4: a button at the end of the play row, "Add music" or the song's name, opens a Music panel in the sidebar, or the bottom sheet on a phone, to upload a song with a progress bar, pick one of the school's songs, or remove it; the browser reads the length from the file's header); durations from the song on show rows.
- **4.2 Waveform** (E2, E8): peaks read in the browser at upload and stored; the `Timeline` waveform and playhead under the stage, compact on iPhone.
- **4.3 Transport** (E5): play and pause on the audio, scrubbing, speed, Repeat figure, the time as `00:58 / 03:40`.
- **4.5 Figures on the timeline** (E4, E6): `Figure.timeMs` migration; markers dragged along the timeline; `stageAt` driven by figure times; presentation mode with the dark timeline and speed; checked in sync at every speed and after scrubbing.

## Before starting

- The 2.7 iPad measurement (40 dancers) should be done before 4.5, which builds on smooth playback.
- Hosting: choose where R2 and the API live (the open question in §7) before 4.1 ships beyond local development.
