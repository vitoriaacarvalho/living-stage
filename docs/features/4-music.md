# 4.1–4.5 — Music

Requirements: **E1** (upload audio to a dance), **E2** (waveform and playhead), **E3** (counts, tapped or from BPM), **E4** (figures pinned to the song), **E5** (play, pause, scrub, loop, 0.5× / 0.75× / 1×), **E6** (stage in sync with the audio), **E7** (files up to 30 MB, songs reused across dances), **E8** (waveform computed once and stored). Also finishes **H6**: durations come from the song.

Screens: `Timeline` (with its `compact` iPhone form and `theme: 'dark'` for presentation mode), `PresentationMode` (load the `living-stage-design` skill).

Status: decisions agreed on 18 Nov 2026.

## Decisions

- **Songs belong to the school**, as `AudioTrack` rows, so one song can serve several dances (E7). A dance points at one song or none (`Dance.audioId`).
- **Uploads go straight to storage**, as §3 says: the API hands out a short-lived upload link, the browser sends the file with a progress bar, then tells the API it is done. Cloudflare R2 in production; MinIO in Docker Compose for local development, next to Postgres, so local uploads take the same S3 code path.
- **The browser reads the song once at upload** with the Web Audio API: its duration and the waveform peaks (E8). Both are sent with "done" and stored on the track, so the waveform opens at once on every later visit.
- **A dance with a song takes its duration from it.** The typed duration on the show's dance row is replaced by the song's length, and the show's total follows (H6). Dances without a song keep their typed duration.
- **The audio element is the clock.** While a song plays, the stage reads its current time; speeds use `playbackRate` with the pitch kept. Without a song, playback keeps today's clock.
- **Waveform with `wavesurfer.js`**, drawn from the stored peaks, as in §3.
- **Counts belong to the song** (E3): either tapped along (any tempo changes are kept), or generated from a BPM and a start offset. The teacher chooses per song.
- **Figures are pinned by time.** A figure gets `timeMs`, the moment it is reached; its move fills the time since the figure before. Only the time is saved. With counts, a dragged marker snaps to the nearest count, and the count shows beside it.
- **Dances without music keep working**: until a song is attached, figures keep their `transitionMs` and nothing else changes.
- **Loop repeats the move into the selected figure** ("Repeat figure" in the design), not a free section dragged on the waveform.

## Plans and slices

- **4.1 Audio upload** (E1, E7): MinIO in Compose and the storage client; `AudioTrack` and `Dance.audioId` migration; upload link and "done" routes; the "Add music" control in the editor with a progress bar and a list of the school's songs; durations from the song on show rows.
- **4.2 Waveform** (E2, E8): peaks read in the browser at upload and stored; the `Timeline` waveform and playhead under the stage, compact on iPhone.
- **4.3 Transport** (E5): play and pause on the audio, scrubbing, speed, Repeat figure, the time as `00:58 / 03:40`.
- **4.4 Counts** (E3): tap-along mode, BPM and offset mode, the count ruler with each phrase's "1" in bold.
- **4.5 Figures on the timeline** (E4, E6): `Figure.timeMs` migration; markers dragged along the timeline; `stageAt` driven by figure times; presentation mode with the dark timeline and speed; checked in sync at every speed and after scrubbing.

## Before starting

- The 2.7 iPad measurement (40 dancers) should be done before 4.5, which builds on smooth playback.
- Hosting: choose where R2 and the API live (the open question in §7) before 4.1 ships beyond local development.
