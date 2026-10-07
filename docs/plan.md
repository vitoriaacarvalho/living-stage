# Living Stage — Project Plan

Sep 29, 2026 · @Vitória Carvalho

## 1. Overview

Living Stage is a responsive web app where dance schools plan group choreography and whole shows: teachers place dancers on a virtual stage, animate them between formations in sync with the music, and organize dances into shows.

**The problem.** In large group dances (20+ dancers) with many formation changes, teachers track positions by hand, e.g. drawing each dancer as an "x" on an iPad. It is slow to edit, hard to share, and has no link to the music or timing.

**Who it's for.** Ballet teachers and school managers, the people in charge of a dance or a show. Dancers do not have accounts in the first version.

### Scope principles

- Not tied to any one ballet or style. Don Quixote is the first real use case, but roles, shows and dances are all defined by the school.
- Positions and movement only. The app does not record dance steps.
- The music is the clock: every formation is anchored to a moment in the song.
- Built for rehearsal: iPad and iPhone first, fully usable on desktop.

**Name.** Working name: **Living Stage**. No app or dance software with this name was found, but a former theater company and an eco-theater project used it, so the exact domain is likely taken. Options: livingstage.app, "LivingStage" as one word, or a suffix like "Studio". Domain (Registro.br) and trademark (INPI, USPTO) checks are still to do.

## 2. Decisions agreed so far

| Topic | Decision |
|---|---|
| Users | Ballet teachers and school managers; dancers have no accounts |
| Permissions | All members of a school have the same rights |
| Tenancy | Many schools, each a private space; several teachers share one school's environment |
| Editing model | One person edits a dance at a time; others watch changes live |
| Casts | One cast per dance |
| Roles | Free text per dance; the teacher decides whether to show and color by role |
| Devices | Mostly iPad and iPhone, also desktop; fully responsive; Chrome as the target browser |
| Languages | Portuguese (pt-BR) and English |
| Stage | Standard rectangular stage with wings; no custom proportions |
| Music | Uploaded audio files; no Spotify (its API no longer supports this use) |
| Offline | Not required |
| Props and set pieces | Not included |
| Export | Printable PDF of formations |

Note: on iPad and iPhone, Chrome uses Apple's WebKit engine, so testing must happen on real Apple devices, not only desktop Chrome.

## 3. Technology stack

TypeScript end to end, in one npm workspaces monorepo, with types and animation math shared between client and server.

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript | Frontend, backend and shared code |
| Package manager | npm (workspaces) | Root `package.json` with `"workspaces": ["apps/*", "packages/*"]` |
| Frontend | React + Vite | Single-page app, responsive, installable as a PWA |
| Stage rendering | SVG rendered by React | Fixed `viewBox`, normalized stage coordinates; no canvas or game engine |
| Touch and gestures | Pointer Events + `@use-gesture/react` | Drag, multi-select, pinch-to-zoom, pan; finger, mouse and Apple Pencil |
| Animation | Custom `requestAnimationFrame` loop | Cubic Bézier paths with easing; the audio's current time drives the frame |
| Audio waveform | `wavesurfer.js` | Waveform, playhead, regions for loops |
| Backend | Node + Express | REST API |
| Realtime | WebSockets | Pushes a dance's changes to viewers; edit lock heartbeat |
| Database | PostgreSQL + Prisma | Prisma chosen as the ORM |
| File storage | S3-compatible (e.g. Cloudflare R2) | Audio files, dancer photos, costume photos |
| Auth | OAuth via Better Auth | Google and Apple sign-in; Prisma adapter; organization plugin can model schools and invites. Apple sign-in needs a paid Apple Developer account |
| i18n | react-i18next | pt-BR and English; one JSON file per language and screen area, e.g. `locales/pt-BR/editor.json` |
| PDF export | In the browser: jsPDF + svg2pdf.js | The simpler option: no server rendering, reuses the SVG stage |

### Architecture

The web app talks to one API, which owns the data.

```
Web app (React + Vite)  ──REST──▶  API (Node + Express)  ──▶  PostgreSQL (schools, dances, shows)
SVG stage, music timeline ◀─live updates─  REST + WebSockets, edit lock  ──▶  File storage / R2 (audio, photos)
iPad, iPhone, desktop

        both import packages/shared: types, validation, animation math
```

The web app and the API both import the shared package, so a figure or path means the same thing on both sides.

### Repository layout

```
living-stage/
  package.json        workspaces root
  apps/frontend       React + Vite
  apps/backend        Node + Express
  packages/shared     shared types, validation, animation math
```

**MCP.** The app does not need MCP. It is only optional tooling for building with an AI coding assistant (e.g. a Playwright or PostgreSQL MCP server), and can be added later.

**Uploads.** The browser asks the API for a short-lived upload link, sends the file straight to file storage with a progress bar, then tells the API it is done. Large files never pass through the API server.

**Hosting (proposed).** Web app on Cloudflare Pages; API and PostgreSQL on Railway (or Render / Fly.io), since WebSockets need a long-running server rather than serverless functions; files on Cloudflare R2.

## 4. Functional requirements

Requirements are grouped into parts, each with IDs, so each part can be planned in its own session (see `docs/features/`).

### Part S — Setup

- **S1.** npm workspaces monorepo with `apps/frontend`, `apps/backend`, `packages/shared`.
- **S2.** Shared TypeScript, lint and format config.
- **S3.** Local PostgreSQL and Prisma, first migration.
- **S4.** API skeleton with a health route.
- **S5.** Web skeleton (React + Vite) that calls the API.
- **S6.** CI: typecheck, lint, test on every push.

### Part A — Accounts and schools

- **A1.** A user can sign up and sign in with Google or Apple (OAuth).
- **A2.** A user can create a school and becomes its first member.
- **A3.** A member can invite other teachers by email or invite link.
- **A4.** A user can belong to more than one school and switch between them.
- **A5.** All members of a school have equal rights over its dancers, dances and shows.
- **A6.** A school's data is visible only to its members.

### Part B — Dancer roster

- **B1.** A member can add, edit and remove dancers in the school roster.
- **B2.** A dancer has a name, an optional photo and an optional default color.
- **B3.** The same roster is reused across all dances and shows; no retyping.
- **B4.** The roster can be searched and sorted by name.
- **B5.** Removing a dancer who is cast in dances keeps her spot as a placeholder until someone else is assigned.
- **B6.** Photos are resized in the browser before upload (dancer photos to 400 px, costume photos to 1600 px on the long edge); originals up to 10 MB are accepted, including iPhone HEIC.

### Part C — Formation editor

- **C1.** A dance shows a top-down stage with the audience at the bottom.
- **C2.** The stage has wing zones on the left, right and upstage, where dancers can wait off stage, enter and exit.
- **C3.** Optional guide lines (center and quarters) can be shown or hidden.
- **C4.** A member casts dancers from the roster into a dance, each with an optional free-text role.
- **C5.** Dancers appear as colored circles; the label can show name, role or both.
- **C6.** Dancers can be colored by their own color or by role, chosen per dance.
- **C7.** A dance is an ordered list of figures (formations): add, duplicate, rename, reorder, delete.
- **C8.** Dancers are placed by dragging; several can be selected and moved together.
- **C9.** Optional snapping to guide lines.
- **C10.** Layout tools for a selection: mirror left/right, align in a line, spread evenly, arrange in a circle.
- **C11.** A "ghost" view shows the previous figure's positions faintly while editing the current one.
- **C12.** Undo and redo while editing, kept per figure.

### Part D — Paths and animation

- **D1.** Each dancer's move between two figures is a straight line by default.
- **D2.** A path can be bent into a curve by dragging handles, or given waypoints.
- **D3.** A path can follow a circle or arc (e.g. circling around another dancer).
- **D4.** Playback animates every dancer smoothly along her path from one figure to the next, with easing.
- **D5.** Playback can run without music too, with a default duration per transition.

### Part E — Music timeline

- **E1.** A member can upload an audio file (MP3, M4A, WAV) to a dance.
- **E2.** The timeline shows the song's waveform and a playhead below the stage.
- **E3.** Counts can be marked by tapping along, or generated from a BPM and start offset; the teacher chooses per song, and tapped counts handle tempo changes.
- **E4.** Each figure is pinned to a moment in the song (a timestamp or a count); the transition fills the time before it.
- **E5.** Play, pause, scrub, loop a section, and play at 0.5×, 0.75× or 1×.
- **E6.** The stage animation stays in sync with the audio at every speed and after scrubbing.
- **E7.** Audio files up to 30 MB (MP3, M4A, AAC, WAV). A song can be reused by several dances in the school.
- **E8.** The waveform is computed once at upload and stored, so it opens instantly afterwards.
- **E9.** Up to 60 dancers per dance.

### Part F — Editing lock and live viewing

- **F1.** Only one member can edit a dance at a time; opening it while someone else edits shows it read-only.
- **F2.** A banner shows who is editing.
- **F3.** Viewers see the editor's changes live, without reloading.
- **F4.** The lock is released when the editor leaves, and expires automatically if she closes the tab or loses connection.
- **F5.** A viewer can ask to take over editing once the lock is free.

### Part G — Presentation mode

- **G1.** Full-screen stage with music controls, for showing dancers in rehearsal.
- **G2.** Large, readable names, suitable for a TV or projector.
- **G3.** Figure-by-figure stepping, as well as continuous playback.

### Part H — Show manager

- **H1.** A member can create a show with a name, date and optional venue.
- **H2.** A show contains ordered acts; each act contains ordered dances.
- **H3.** Acts and dances can be reordered by dragging.
- **H4.** Each dance in a show displays its song, duration, cast and costume photos.
- **H5.** A member can upload costume photos to a dance.
- **H6.** The show's total running time is calculated from the dance durations.
- **H7.** A dance belongs to the school and can appear in more than one show, or be duplicated as a starting point.

### Part I — PDF export

- **I1.** Export a dance as a PDF with one figure per page, showing the stage and dancer names.
- **I2.** Each page shows the dance title, figure name and its count or time.
- **I3.** Layout suitable for printing and posting on the studio wall.
- **I4.** The PDF is generated in the browser.

### Part J — Languages

- **J1.** The whole interface is available in Portuguese (pt-BR) and English.
- **J2.** Each user picks her language; the default follows the browser.
- **J3.** User-entered content (names, roles, titles) is never translated.

### Part K — Responsiveness and devices

- **K1.** Every screen works on iPad, iPhone and desktop.
- **K2.** Touch targets are large enough for finger dragging on a tablet.
- **K3.** On iPhone, the editor is optimized for viewing and quick edits; landscape is suggested for heavy editing.
- **K4.** The app is installable to the home screen and opens full-screen (PWA).

## 5. Data model (first draft)

Everything belongs to a school; dances live at school level and are linked into shows.

```
School        id, name
User          id, name, email, language
Membership    userId, schoolId                    (equal rights)
Invite        id, schoolId, email?, token, expiresAt

Dancer        id, schoolId, name, photoUrl?, color?

Dance         id, schoolId, title, audioId?, durationMs, labelMode, colorMode
CastMember    id, danceId, dancerId, role?, color?
Figure        id, danceId, order, name?, timeMs? | count?
Position      figureId, castMemberId, x, y
Path          figureId, castMemberId, segments[]  (route arriving into this figure)

AudioTrack    id, url, durationMs, bpm?, offsetMs?, beatMarks[]
CostumePhoto  id, danceId, url, caption?

Show          id, schoolId, title, date, venue?
Act           id, showId, order, title
ActItem       id, actId, danceId, order

EditLock      danceId, userId, expiresAt          (renewed by heartbeat)
```

**Coordinates.** `x` and `y` are stage units, not pixels: 0–1 is the visible stage (`x` left to right, `y` upstage to downstage). Values just outside that range are the wings.

**Paths.** A path is a list of cubic Bézier segments (start, two control points, end). A straight line is a segment with its controls on the line; waypoints and circles are several segments joined.

**Animation.** A dancer's position at time *t* is a pure function of the two figures around *t*, her path and an easing curve. It lives in `packages/shared` and is unit tested.

## 6. Design direction

The interface stays calm so the dancers on the dark stage are the most colorful thing on screen. Palette: "Pointe". Light theme only; the stage is always dark.

The full design system (tokens, components, screens) lives in Claude Design (link kept private, outside the repo). The `living-stage-design` skill reads it.

| Use | Color |
|---|---|
| Background | `#FBF8F6` |
| Surfaces | `#FFFFFF` |
| Primary (rose) | `#B4476E` |
| Soft rose | `#F6DDE6` |
| Text (deep plum) | `#2B1E2F` |
| Muted text | `#7A6B7D` |
| Stage floor (dark marley) | `#2A2730` |
| Stage guide lines | `#4A4552` |
| Wing areas | `#1C1A21` |

**Dancer colors** (one per role, 12 max): `#E4572E` `#F3A712` `#7BB661` `#29A3A3` `#3F7FBF` `#7A5CC9` `#D05AA8` `#8C5A3C` `#A8B820` `#5AB8E0` `#E88AA0` `#9AA0A6`

**Fonts:** Instrument Sans for the interface; Cormorant Garamond for large titles only (show names, screen titles, 24px and up).

**Alternatives considered:** "Velvet curtain" (dark theater, gold, crimson); "Studio mirror" (cool neutral, teal, coral). No dark mode.

### Screens

1. Sign in, create school, invite teachers
2. Home: the school's shows and dances
3. Dancer roster
4. Dance editor: stage, music timeline, cast panel (sidebar on iPad, bottom sheet on iPhone), toolbar
5. Show manager: acts and dances in order, total running time
6. Presentation mode: full-screen dark stage
7. Print / PDF view: one figure per page

Design mockups will be produced in Claude Design, starting with the dance editor.

## 7. Build phases and open questions

Phase 2 alone replaces the teacher's hand-drawn formations, so it is the first milestone to put in front of real teachers.

1. **Foundation** — monorepo setup, auth, schools, invites, dancer roster, languages, responsive shell (Parts S, A, B, J, K1, K2)
2. **Formation editor** — stage, figures, dragging, wings, straight-line playback (Parts C, D1, D4, D5)
3. **Paths** — curves, waypoints, circles (D2, D3)
4. **Music** — upload, waveform, counts, sync (Part E)
5. **Live viewing** — edit lock and realtime updates (Part F)
6. **Show manager** — shows, acts, ordering, costume photos, running time (Part H)
7. **Presentation and export** — presentation mode, PDF export (Parts G, I)
8. **Polish** — PWA, iPhone editor (K3, K4)

### Open questions to settle in each part's planning session

- [x] Auth: OAuth (Google, Apple) via Better Auth
- [x] ORM: Prisma
- [x] i18n: react-i18next, JSON per language and screen area
- [ ] Hosting: confirm the proposal in section 3
- [x] Palette: "Pointe", light theme only
- [x] Undo/redo: per figure
- [x] Counts: the teacher chooses tapped counts or BPM per song
- [x] PDF export: in the browser
- [x] Limits: 60 dancers, 30 MB audio, 10 MB photos (resized before upload)
- [x] Deleted dancers: kept as placeholders
- [ ] App name: Living Stage check domain and trademark
