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
| Auth | Better Auth | Email and password (no third-party sign-in for now); Prisma adapter; organization plugin can model schools and invites |
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

**Local development.** PostgreSQL 18 runs in Docker Compose (`compose.yaml` at the root) on port 5433, so it does not clash with a Postgres already installed on 5432. The connection string lives in `apps/backend/.env` (copy `.env.example`).

**Hosting (proposed).** Web app on Cloudflare Pages; API and PostgreSQL on Railway (or Render / Fly.io), since WebSockets need a long-running server rather than serverless functions; files on Cloudflare R2.

## 4. Functional requirements

Requirements are grouped into parts, each with IDs. A requirement marked ✅ is done.

### Part S — Setup

- ✅ **S1.** npm workspaces monorepo with `apps/frontend`, `apps/backend`, `packages/shared`.
- ✅ **S2.** Shared TypeScript, lint and format config.
- ✅ **S3.** Local PostgreSQL and Prisma, first migration.
- ✅ **S4.** API skeleton with a health route.
- ✅ **S5.** Web skeleton (React + Vite) that calls the API.
- **S6.** CI: typecheck, lint, test on every push.
 
### Part A — Accounts and schools

- ✅ **A1.** A user can sign up and sign in with email and password.
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
- **K5.** The interface follows the Living Stage design system (tokens, fonts, icons, base components).

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

The build is split into small plans that each fit a sitting or two. Work top to bottom; a plan starts only when the plans it depends on are done. Each plan is a vertical slice: shared types, API and the screens it needs, built together. The Screens column names the design system components it builds (load the `living-stage-design` skill).

A plan that needs more than this table (decisions, data model, commit slices) gets its own file in `docs/features/` (e.g. `1.2-auth.md`). Those files hold detail only: any decision that changes this plan is copied here too, and this file wins where they differ.

Status: ⬜ not started · 🟨 in progress · ✅ done. When a requirement is done, mark it ✅ in section 4 and set its plan's row to 🟨 (some requirements done) or ✅ (all done and its "Done when" check passes), in the same commit as the work.

### Phase 1 — Foundation

| # | Plan | Requirements | Screens | Depends on | Done when | Status |
|---|---|---|---|---|---|---|
| 1.1 | Monorepo and tooling | S1–S6 | — | — | `npm run dev` starts web and API; CI is green | 🟨 |
| 1.2 | Sign in | A1 | `Access` | 1.1 | Sign up, sign in and sign out with email and password | ✅ |
| 1.3 | Schools and data isolation | A2, A4, A5, A6 | `Access` | 1.2 | Create a school, switch schools; another school's data returns 404 | ⬜ |
| 1.4 | Invites | A3 | `Access` | 1.3 | An invited teacher joins by email or link | ⬜ |
| 1.5 | Languages | J1, J2, J3 | — | 1.1 | Every screen so far works in pt-BR and English; default follows the browser | ⬜ |
| 1.6a | Design foundation | K5 | `Button`, `SegmentedControl` | 1.1 | Design tokens are CSS variables, fonts load, and the icons, `Button`, `SegmentedControl` and focus ring render on a test page | ⬜ |
| 1.6 | Responsive app shell | K1, K2 | `Home` (shell, nav rail) | 1.5, 1.6a | Navigation and layout work on iPhone, iPad and desktop | ⬜ |
| 1.7 | Dancer roster | B1, B2, B3, B4, B5 | `DancerRoster` | 1.3 | Add, edit, remove, search and sort dancers | ⬜ |
| 1.8 | Photo upload | B6 | `DancerRoster` | 1.7 | A HEIC photo from an iPhone uploads resized to 400 px | ⬜ |

### Phase 2 — Formation editor

First milestone to show real teachers.

| # | Plan | Requirements | Screens | Depends on | Done when | Status |
|---|---|---|---|---|---|---|
| 2.1 | Stage | C1, C2, C3 | `Stage`, `DanceEditorIPad` | 1.6 | Empty stage with wings and toggleable guide lines | ⬜ |
| 2.2 | Casting | C4, C5, C6 | `CastList` | 2.1, 1.7 | Cast dancers with roles; label and color modes switch | ⬜ |
| 2.3 | Figures | C7 | `Toolbar`, `Timeline` (figure markers) | 2.2 | Add, duplicate, rename, reorder, delete figures | ⬜ |
| 2.4 | Dragging and selection | C8, C9 | `Stage` | 2.3 | Drag one or many dancers, with optional snapping, by finger and mouse | ⬜ |
| 2.5 | Layout tools and ghost view | C10, C11 | `Toolbar` | 2.4 | Mirror, align, spread, circle; previous figure shown faintly | ⬜ |
| 2.6 | Undo and redo | C12 | `Toolbar` | 2.4 | Undo/redo per figure | ⬜ |
| 2.7 | Straight-line playback | D1, D4, D5, E9 | `Timeline` | 2.3 | 60 dancers animate smoothly between figures without music | ⬜ |

### Phase 3 — Paths

| # | Plan | Requirements | Screens | Depends on | Done when | Status |
|---|---|---|---|---|---|---|
| 3.1 | Curved paths | D2 (curves) | `Stage` | 2.7 | Drag handles to bend a path; playback follows it | ⬜ |
| 3.2 | Waypoints | D2 (waypoints) | `Stage` | 3.1 | Add and move waypoints on a path | ⬜ |
| 3.3 | Circles and arcs | D3 | `Stage` | 3.1 | A dancer circles another dancer | ⬜ |

### Phase 4 — Music

| # | Plan | Requirements | Screens | Depends on | Done when | Status |
|---|---|---|---|---|---|---|
| 4.1 | Audio upload | E1, E7 | — | 1.8, 2.3 | Upload a 30 MB MP3 and reuse it in a second dance | ⬜ |
| 4.2 | Waveform | E2, E8 | `Timeline` | 4.1 | Waveform and playhead open instantly on reload | ⬜ |
| 4.3 | Transport controls | E5 | `Timeline` | 4.2 | Play, pause, scrub, loop, 0.5× / 0.75× / 1× | ⬜ |
| 4.4 | Counts | E3 | `Timeline` | 4.2 | Tap counts or generate them from BPM and offset | ⬜ |
| 4.5 | Figures on the timeline | E4, E6 | `Timeline` | 4.3, 4.4, 2.7 | Stage stays in sync with the music at every speed and after scrubbing | ⬜ |

### Phase 5 — Live viewing

| # | Plan | Requirements | Screens | Depends on | Done when | Status |
|---|---|---|---|---|---|---|
| 5.1 | Edit lock | F1, F2, F4 | `EditingBanner` | 2.3 | Second teacher sees read-only with a banner; lock expires on tab close | ⬜ |
| 5.2 | Live updates | F3 | — | 5.1 | Viewer sees edits without reloading | ⬜ |
| 5.3 | Take over editing | F5 | `EditingBanner` | 5.1 | Viewer takes over once the lock is free | ⬜ |

### Phase 6 — Show manager

| # | Plan | Requirements | Screens | Depends on | Done when | Status |
|---|---|---|---|---|---|---|
| 6.1 | Shows and acts | H1, H2 | `ShowManager`, `ShowCard`, `DanceRow` | 2.3 | Create a show with acts holding dances | ⬜ |
| 6.2 | Reordering | H3 | `ShowManager` | 6.1 | Drag acts and dances into a new order | ⬜ |
| 6.3 | Reuse and duplicate dances | H7 | `DanceRow` | 6.1 | One dance in two shows; duplicate a dance | ⬜ |
| 6.4 | Costume photos | H5 | `ShowManager` | 1.8, 6.1 | Upload costume photos to a dance | ⬜ |
| 6.5 | Show details and running time | H4, H6 | `ShowManager`, `DanceRow` | 4.1, 6.4 | Each dance shows song, duration, cast, photos; show total time is right | ⬜ |

### Phase 7 — Presentation and export

| # | Plan | Requirements | Screens | Depends on | Done when | Status |
|---|---|---|---|---|---|---|
| 7.1 | Presentation mode | G1, G2, G3 | `PresentationMode` | 4.5 | Full-screen stage readable on a TV; step or play continuously | ⬜ |
| 7.2 | PDF export | I1, I2, I3, I4 | `PrintView` | 2.3 | Printable PDF, one figure per page, made in the browser | ⬜ |

### Phase 8 — Polish

| # | Plan | Requirements | Screens | Depends on | Done when | Status |
|---|---|---|---|---|---|---|
| 8.1 | Installable app | K4 | — | 1.6 | Add to home screen on iPad; opens full-screen | ⬜ |
| 8.2 | iPhone editor | K3 | `DanceEditorIPhone` | 2.5 | Quick edits work on iPhone; landscape hint for heavy editing | ⬜ |

### Open questions to settle in each part's planning session

- [x] Auth: Better Auth with email and password; no third-party sign-in (Google, Apple) for now
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
