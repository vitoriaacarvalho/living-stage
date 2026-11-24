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

- **4.1 Audio upload** (E1, E7): ✅ SeaweedFS in Compose and the storage client (slice 1); ✅ the `AudioTrack` and `Dance.audioId` migration with shared types and validation: MP3, M4A, AAC or WAV, up to 30 MB, names up to 100 characters, lengths up to an hour (slice 2); ✅ upload link and "done" routes (slice 3: `POST songs/upload-link` hands out a key under the school's folder; `POST songs` checks the file is in storage and within 30 MB, deleting it if not, then saves the song; `GET songs` lists them with fresh play links); ✅ the music control (slice 4: a button at the end of the play row, "Add music" or the song's name, opens a Music panel in the sidebar, or the bottom sheet on a phone, to upload a song with a progress bar, pick one of the school's songs, or remove it; the browser reads the length from the file's header); ✅ durations from the song (slice 5: show rows show the song's length, muted and not editable, and the show's total adds it); ✅ checked in the browser (slice 6): a 30.00 MB MP3 read as 13:06, reused by a second dance, and a show of both plus a typed 3:00 totalled 29min 13s.
- **4.2 Waveform** (E2, E8): ✅ done. The browser decodes the song once at upload at 8 kHz (about 50 MB for 13 minutes) and keeps the loudest point of each twentieth of a second; the decoded length is the song's length, so the two always agree. The peaks are stored on the song and fetched only by `GET songs/:id`, for the dance that plays it. `wavesurfer.js` draws them without downloading the song: 2 px bars with a 1 px gap, played part `primary`, the rest `ink-muted` at 45%, a 2 px playhead, about 50 s across the iPad timeline with the whole-song strip above, 45 s and no strip on iPhone. Songs saved before 4.2 have no peaks and say so; uploading them again draws them.
- **4.5 Playing to the music** (E4, E5, E6), with 4.3 Transport merged in on 24 Nov 2026 so the song and the dancers always share one clock. Slices:
  1. ✅ Pins: the `Figure.timeMs` migration; shared rules for placing pins, with tests; the server keeps pins right when a song is attached or changed and when figures are added, duplicated, reordered or deleted; `PATCH` a figure's time between its neighbours.
  2. ✅ The song clock: an `<audio>` element drives the time; Play and Pause on the song; the stage follows the song through the pins; the time as `00:58 / 03:40`.
  3. ✅ The interactive timeline: the playhead moves; tapping or dragging the waveform scrubs; figure markers on the waveform that drag between their neighbours.
  4. ✅ Speed (0.5×, 0.75×, 1×, pitch kept) and Repeat figure.
  5. ✅ The figure panel: "Reached at" (m:ss) in place of "Time to arrive" when the dance has a song.
  6. ✅ Presentation mode plays the song: Next plays to the next figure's moment, speed, the dark timeline.
  7. ✅ Check "Done when" in the browser, measuring how far the stage drifts from the song at each speed and after scrubbing.

## Decisions for 4.5

- **Each figure is pinned to its own moment** (`Figure.timeMs`, the moment it is reached). Moving one figure changes only the moves into and out of it; the figures after it stay on their beats. A pin can't pass its neighbours: at least half a second apart.
- **Before the first pin the dancers hold the first figure; after the last pin they hold the last one** until the song ends.
- **Attaching a song to a dance with no pins** pins each figure where its move times put it today (the first figure at 0:00); if they run past the song's end, they are squeezed in proportion to fit.
- **Changing the song** keeps the pins, squeezed to fit if the new song is shorter. **Removing the song** goes back to the move times, which were never changed.
- **New figure:** 4 s after the last pin. **Duplicate:** halfway between the figure and the next one (as a new figure when it is the last). If a new last figure runs past the song's end, every pin is squeezed in proportion to fit, so no two figures share a moment; this is the one case where adding a figure moves others.
- **Reordering:** the moments stay where they are; figures take the moments of their new places, so the music keeps its shape.
- **Deleting a figure** removes its pin; the move into the next figure takes up the gap.
- **The pins live on the server**, which applies these rules in every figure route, so two teachers' screens agree.

Left out of 4.5: the dark waveform in presentation mode (the speed and Repeat figure controls are there); it can join later without changing anything else.

## Before starting

- The 2.7 iPad measurement (40 dancers) should be done before 4.5's check, which builds on smooth playback.
- Hosting: choose where R2 and the API live (the open question in §7) before 4.1 ships beyond local development.
