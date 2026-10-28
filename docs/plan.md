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

### MVP

The first release is about choreography and shows, and it should ship fast:

- **In:** create shows with acts and dances, manage the school's dances, cast dancers into each dance (with how many there are), place them in formations on a 3D stage of ballerinas (with a 2D plan one tap away), animate them from one formation to the next (straight, curved and circular paths), show it full screen in rehearsal, and quick edits on iPhone.
- **Out, for later:** music and the timeline, costume photos, live viewing and the edit lock, PDF export, Portuguese, email invites, installing as an app, layout tools, ghost view, and undo and redo.

Section 7 lists the MVP plans in build order and keeps the rest under "After the MVP".

**Name.** Working name: **Living Stage**. No app or dance software with this name was found, but a former theater company and an eco-theater project used it, so the exact domain is likely taken. Options: livingstage.app, "LivingStage" as one word, or a suffix like "Studio". Domain (Registro.br) and trademark (INPI, USPTO) checks are still to do.

## 2. Decisions agreed so far

| Topic | Decision |
|---|---|
| Users | Ballet teachers and school managers; dancers have no accounts |
| Permissions | All members of a school have the same rights |
| School required | A signed-in user with no school must create one or join one with an invitation code before using the app. With one school she goes straight into it; with several she picks one at sign-in and can switch inside the app |
| Invitations | One reusable code per school, valid 7 days; any teacher can make a new one, which replaces the old. Shared as a short code to type (8 letters and digits without look-alikes, shown as `ABCD-2345`) or as a link carrying it (`/join/<code>`, kept through sign-in). Joining shows the school's name before confirming. Schools are never listed or searchable. Email invites come later |
| Tenancy | Many schools, each a private space; several teachers share one school's environment. Every route for a school's data lives under `/api/schools/:schoolId`, where one membership check answers 404 to non-members, so another school's data looks like it does not exist. No route checks who created the school |
| MVP scope | Shows, dances, casting, formations and movement first; everything else waits (see §1, MVP) |
| Editing model | One person edits a dance at a time; others watch changes live. Not in the MVP: until the edit lock ships, the last save wins |
| Casts | One cast per dance |
| Roles | Free text per dance; the teacher decides whether to show and color by role |
| Devices | Mostly iPad and iPhone, also desktop; fully responsive; Chrome as the target browser |
| Languages | English only in the MVP; Portuguese (pt-BR) added after it with i18n |
| Stage | Standard rectangular stage with wings; no custom proportions |
| Music | Uploaded audio files, after the MVP; no Spotify (its API no longer supports this use). Until then playback runs on a default time per transition, and a dance's duration is typed by hand |
| Offline | Not required |
| Props and set pieces | Not included |
| Export | Printable PDF of formations, after the MVP |
| 3D | Dancers appear as 3D ballerinas on a perspective stage seen from the audience. This is the default view in the editor and in presentation mode, and it is in the MVP. The flat top-down 2D plan with colored circles is one tap away for precise placement, and is always used for print and thumbnails |

Note: on iPad and iPhone, Chrome uses Apple's WebKit engine, so testing must happen on real Apple devices, not only desktop Chrome.

## 3. Technology stack

TypeScript end to end, in one npm workspaces monorepo, with types and animation math shared between client and server.

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript | Frontend, backend and shared code |
| Package manager | npm (workspaces) | Root `package.json` with `"workspaces": ["apps/*", "packages/*"]` |
| Frontend | React + Vite | Single-page app, responsive, installable as a PWA |
| Stage rendering | 3D: Three.js through React Three Fiber (`@react-three/fiber`, `@react-three/drei`). 2D plan: SVG rendered by React | Both views read the same normalized stage coordinates. The 3D view is a WebGL canvas; the 2D plan keeps a fixed `viewBox`. No game engine |
| Touch and gestures | Pointer Events + `@use-gesture/react` | Drag, multi-select, pinch-to-zoom, pan; finger, mouse and Apple Pencil |
| Animation | Custom `requestAnimationFrame` loop | Cubic Bézier paths with easing; the audio's current time drives the frame |
| Audio waveform | `wavesurfer.js` | Waveform, playhead, regions for loops |
| Backend | Node + Express | REST API |
| Realtime | WebSockets | Pushes a dance's changes to viewers; edit lock heartbeat |
| Database | PostgreSQL + Prisma | Prisma chosen as the ORM |
| File storage | S3-compatible (e.g. Cloudflare R2) | Audio files, costume photos |
| Auth | Better Auth | Email and password (no third-party sign-in for now); Prisma adapter; organization plugin can model schools and invites |
| i18n | react-i18next | Added in plan 8.3, after the MVP; until then copy is plain English in the components. One JSON file per language and screen area, e.g. `locales/pt-BR/editor.json` |
| Styling | CSS variables + CSS Modules | Design tokens are CSS variables in `styles/tokens.css`; each component has its own CSS Module; no CSS framework |
| Fonts | Self-hosted with `@fontsource` | Instrument Sans and Cormorant Garamond ship with the app; no request to Google |
| Icons | The design system's own line icons | Ported as React components, only the ones in use |
| PDF export | In the browser: jsPDF + svg2pdf.js | The simpler option: no server rendering, reuses the SVG stage |

The MVP does not use file storage, WebSockets, `wavesurfer.js`, jsPDF or react-i18next; they come with the features that need them.

### Architecture

The web app talks to one API, which owns the data.

```
Web app (React + Vite)  ──REST──▶  API (Node + Express)  ──▶  PostgreSQL (schools, dances, shows)
3D stage + SVG plan, timeline ◀─live updates─  REST + WebSockets, edit lock  ──▶  File storage / R2 (audio, photos)
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

Requirements are grouped into parts, each with IDs. A requirement marked ✅ is done. A requirement or part marked *(after the MVP)* is not in the first release.

### Part S — Setup

- ✅ **S1.** npm workspaces monorepo with `apps/frontend`, `apps/backend`, `packages/shared`.
- ✅ **S2.** Shared TypeScript, lint and format config.
- ✅ **S3.** Local PostgreSQL and Prisma, first migration.
- ✅ **S4.** API skeleton with a health route.
- ✅ **S5.** Web skeleton (React + Vite) that calls the API.
- **S6.** CI: typecheck, lint, test on every push.
 
### Part A — Accounts and schools

- ✅ **A1.** A user can sign up and sign in with email and password.
- ✅ **A2.** A user can create a school and becomes its first member.
- ✅ **A3.** A member can invite other teachers with an invitation code or link (valid 7 days), and later by email. Code and link done; email comes with plan 1.4 *(after the MVP)*.
- ✅ **A4.** A user can belong to more than one school and switch between them.
- ✅ **A5.** All members of a school have equal rights over its dancers, dances and shows.
- ✅ **A6.** A school's data is visible only to its members.

### Part B — Dancer roster

- ✅ **B1.** A member can add, edit and remove dancers in the school roster.
- ✅ **B2.** A dancer has a name and an optional default color. Dancers have no photo.
- ✅ **B3.** The same roster is reused across all dances and shows; no retyping.
- ✅ **B4.** The roster can be searched and sorted by name.
- **B5.** Removing a dancer who is cast in dances keeps her spot as a placeholder until someone else is assigned.
- **B6.** Costume photos are resized in the browser to 1600 px on the long edge before upload; originals up to 10 MB are accepted, including iPhone HEIC. *(after the MVP)*

### Part C — Formation editor

- **C1.** A dance shows its stage as a 3D perspective view seen from the audience (the default, see Part L) or as a top-down 2D plan with the audience at the bottom; one tap switches between them.
- **C2.** The stage has wing zones on the left, right and upstage, where dancers can wait off stage, enter and exit.
- **C3.** Optional guide lines (center and quarters) can be shown or hidden.
- **C4.** A member casts dancers from the roster into a dance, each with an optional free-text role.
- **C5.** Dancers appear as 3D ballerinas in the 3D view and as colored circles in the 2D plan; the label can show name, role or both.
- **C6.** Dancers can be colored by their own color or by role, chosen per dance.
- **C7.** A dance is an ordered list of figures (formations): add, duplicate, rename, reorder, delete.
- **C8.** Dancers are placed by dragging, in both views; several can be selected and moved together. In 3D the finger moves the ballerina's feet across the floor.
- **C9.** Optional snapping to guide lines.
- **C10.** Layout tools for a selection: mirror left/right, align in a line, spread evenly, arrange in a circle. *(after the MVP)*
- **C11.** A "ghost" view shows the previous figure's positions faintly while editing the current one: dashed circles in 2D, dashed footprints on the floor in 3D. *(after the MVP)*
- **C12.** Undo and redo while editing, kept per figure. *(after the MVP)*
- **C13.** A member can create, rename and delete dances; the school's dances are listed on Home.
- **C14.** A dance shows its cast list and how many dancers are in it.

### Part D — Paths and animation

- **D1.** Each dancer's move between two figures is a straight line by default.
- **D2.** A path can be bent into a curve by dragging handles, or given waypoints.
- **D3.** A path can follow a circle or arc (e.g. circling around another dancer).
- **D4.** Playback animates every dancer smoothly along her path from one figure to the next, with easing.
- **D5.** Playback can run without music too, with a default duration per transition.

### Part E — Music timeline *(after the MVP, except E9)*

- **E1.** A member can upload an audio file (MP3, M4A, WAV) to a dance.
- **E2.** The timeline shows the song's waveform and a playhead below the stage.
- **E3.** Counts can be marked by tapping along, or generated from a BPM and start offset; the teacher chooses per song, and tapped counts handle tempo changes.
- **E4.** Each figure is pinned to a moment in the song (a timestamp or a count); the transition fills the time before it.
- **E5.** Play, pause, scrub, loop a section, and play at 0.5×, 0.75× or 1×.
- **E6.** The stage animation stays in sync with the audio at every speed and after scrubbing.
- **E7.** Audio files up to 30 MB (MP3, M4A, AAC, WAV). A song can be reused by several dances in the school.
- **E8.** The waveform is computed once at upload and stored, so it opens instantly afterwards.
- **E9.** Up to 60 dancers per dance.

### Part F — Editing lock and live viewing *(after the MVP)*

- **F1.** Only one member can edit a dance at a time; opening it while someone else edits shows it read-only.
- **F2.** A banner shows who is editing.
- **F3.** Viewers see the editor's changes live, without reloading.
- **F4.** The lock is released when the editor leaves, and expires automatically if she closes the tab or loses connection.
- **F5.** A viewer can ask to take over editing once the lock is free.

### Part G — Presentation mode

- **G1.** Full-screen stage with playback controls, for showing dancers in rehearsal. Music controls join once music ships.
- **G2.** Large, readable names, suitable for a TV or projector.
- **G3.** Figure-by-figure stepping, as well as continuous playback.

### Part H — Show manager

- **H1.** A member can create a show with a name, date and optional venue.
- **H2.** A show contains ordered acts; each act contains ordered dances.
- **H3.** Acts and dances can be reordered by dragging.
- **H4.** Each dance in a show displays its cast, how many dancers it has and its duration; its song and costume photos are added after the MVP.
- **H5.** A member can upload costume photos to a dance. *(after the MVP)*
- **H6.** The show's total running time is calculated from the dance durations. In the MVP the teacher types each dance's duration; once music ships, it comes from the song.
- **H7.** A dance belongs to the school and can appear in more than one show, or be duplicated as a starting point.

### Part I — PDF export *(after the MVP)*

- **I1.** Export a dance as a PDF with one figure per page, showing the stage and dancer names.
- **I2.** Each page shows the dance title, figure name and its count or time.
- **I3.** Layout suitable for printing and posting on the studio wall.
- **I4.** The PDF is generated in the browser.

### Part J — Languages *(after the MVP, except J4)*

- **J1.** The whole interface is available in Portuguese (pt-BR) and English.
- **J2.** Each user picks her language; the default follows the browser.
- **J3.** User-entered content (names, roles, titles) is never translated.
- ✅ **J4.** The interface is written in English first; Portuguese is added later through J1.

### Part K — Responsiveness and devices

- **K1.** Every screen works on iPad, iPhone and desktop.
- **K2.** Touch targets are large enough for finger dragging on a tablet.
- **K3.** On iPhone, the editor is optimized for viewing and quick edits; landscape is suggested for heavy editing.
- **K4.** The app is installable to the home screen and opens full-screen (PWA). *(after the MVP)*
- ✅ **K5.** The interface follows the Living Stage design system (tokens, fonts, icons, base components).

### Part L — 3D stage and ballerinas

- **L1.** The 3D view is a perspective stage seen from the audience, built with Three.js. The floor, wings and guide lines match the 2D plan, and dark flats ("legs") line the wings.
- **L2.** Each dancer is a shaded 3D ballerina standing at her stage position and scaling with depth. Her tutu and bodice carry her dancer color (by dancer or by role, C6); skin, hair and tights use decorative tokens. No faces or expressions, just posture: friendly and elegant, never cartoonish. Every ballerina shares one pose; poses per role are not planned. Skin and hair are assigned automatically from the dancer's id, so they stay the same everywhere.
- **L3.** Each ballerina has a soft floor shadow; the selected one gets a `stage-accent` ring on the floor. Dancers waiting in the wings show at 80% opacity.
- **L4.** Name and role labels are drawn above every figure, so a front-row head never hides a back-row label.
- **L5.** The 3D view is the default in the editor and in presentation mode; the 2D plan is one tap away ("2D plan / 3D stage"), and is always used for print and thumbnails.
- **L6.** 60 ballerinas render and animate smoothly on an iPad (E9).

## 5. Data model (first draft)

Everything belongs to a school; dances live at school level and are linked into shows.

```
School        id, name, createdAt, createdById, teachers[]   (teachers: many-to-many with User, equal rights)
User          id, name, email, language
Invite        id, schoolId, code, expiresAt, createdById   (one active code per school; email invites later)

Dancer        id, schoolId, name, color?   (color: 1–12, the number of a dancer-N token)

Dance         id, schoolId, title, audioId?, durationMs?, labelMode, colorMode   (durationMs typed by hand in the MVP)
CastMember    id, danceId, dancerId?, role?, color?   (dancerId is set to null when the dancer is removed: the placeholder of B5)
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

`AudioTrack`, `CostumePhoto` and `EditLock` are not built in the MVP.

**Coordinates.** `x` and `y` are stage units, not pixels: 0–1 is the visible stage (`x` left to right, `y` upstage to downstage). Values just outside that range are the wings. The 3D view maps 0–1 onto a 12 × 8 m floor, so the same position drives both views.

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

**Ballerinas.** On the 3D stage each dancer is a shaded ballerina: tutu and bodice in her dancer color, skin (`skin-1`–`skin-4`), hair (`hair-1`–`hair-3`) and `tights` as decorative tokens used only on figures. The 2D plan keeps the colored circles with a 2px `stage-ink` ring.

**Fonts:** Instrument Sans for the interface; Cormorant Garamond for large titles only (show names, screen titles, 24px and up).

**Illustration.** Four hand-drawn sepia pencil sketches (arabesque, cambré, révérence, pointe shoes) bring warmth to the light pages. Sign in and sign up split the screen: the four sketches as a collage on the left at full strength, the form card on the right with the "Living Stage" wordmark; on phones the collage shrinks to a band of three above the card. Other light pages carry the sketches faintly (about 14% opacity) behind their content as a watermark: `page` for roomy screens such as invites, `quiet` for dense lists such as the dancer roster, `form` around a centered card. Cards stay opaque, so a sketch never sits under text. Never on the stage, in presentation mode or on print.

**Alternatives considered:** "Velvet curtain" (dark theater, gold, crimson); "Studio mirror" (cool neutral, teal, coral). No dark mode.

### Screens

1. Sign in, create school, invite teachers
2. Home: the school's shows and dances
3. Dancer roster
4. Dance editor: stage, music timeline, cast panel (sidebar on iPad, bottom sheet on iPhone), toolbar
5. Show manager: acts and dances in order, total running time
6. Presentation mode: full-screen dark stage
7. Print / PDF view: one figure per page

Mockups for every screen above live in the Claude Design system, which is the visual source of truth; when it changes, the built screens are updated to match.

## 7. Roadmap and open questions

The MVP comes first (see §1). Its plans are listed below in build order: shows and dances first, then casting and placing dancers, then movement and rehearsal. Plan numbers are kept from the earlier roadmap, so they are not in numeric order. The end of MVP phase 3 is the first milestone to put in front of real teachers.

The build is split into small plans that each fit a sitting or two. Work top to bottom; a plan starts only when the plans it depends on are done. Each plan is a vertical slice: shared types, API and the screens it needs, built together. The Screens column names the design system components it builds (load the `living-stage-design` skill).

**Every plan ships its UI.** When a plan starts, check the design system for the screens it touches. A plan with a screen builds that screen to the design in the same plan, never as plain HTML to style later, and its "Done when" is checked in the browser against the design. Order the slices so the screen appears early: the first API route, then its screen, then the next route and its screen, so each sitting ends with something visible. Small sub-slices can stay backend-only.

A plan that needs more than this table (decisions, data model, commit slices) gets its own file in `docs/features/` (e.g. `1.2-auth.md`). Those files hold detail only: any decision that changes this plan is copied here too, and this file wins where they differ.

Status: ⬜ not started · 🟨 in progress · ✅ done. When a requirement is done, mark it ✅ in section 4 and set its plan's row to 🟨 (some requirements done) or ✅ (all done and its "Done when" check passes), in the same commit as the work.

### MVP

#### MVP 1 — Foundation

| # | Plan | Requirements | Screens | Depends on | Done when | Status |
|---|---|---|---|---|---|---|
| 1.1 | Monorepo and tooling | S1–S6 | — | — | `npm run dev` starts web and API; CI is green | 🟨 |
| 1.2 | Sign in | A1 | `Access` | 1.1 | Sign up, sign in and sign out with email and password | ✅ |
| 1.2a | English copy | J4 | `Access` | 1.2 | No Portuguese copy left in the interface or its tests | ✅ |
| 1.6a | Design foundation and styled sign-in | K5 | `Access` (sign in, sign up), `Button`, `SegmentedControl` | 1.2 | Design tokens are CSS variables, fonts and icons load, and the sign-in and sign-up forms match the design on iPhone, iPad and desktop | ✅ |
| 1.3 | Schools and data isolation | A2, A3 (code and link), A4, A5, A6 | `Access` (create or join a school), school picker and switcher | 1.6a | Create a school, join one with a code or link, pick and switch schools from screens that match the design; another school's data returns 404 | 🟨 |
| 1.6 | Responsive app shell | K1, K2 | `Home` (shell, nav rail) | 1.6a | Navigation and layout work on iPhone, iPad and desktop | ⬜ |
| 1.7 | Dancer roster | B1, B2, B3, B4 | `DancerRoster` | 1.3 | Add, edit, remove, search and sort dancers | ✅ |

#### MVP 2 — Shows and dances

| # | Plan | Requirements | Screens | Depends on | Done when | Status |
|---|---|---|---|---|---|---|
| 2.0 | Dances | C13 | `Home` (dance list) | 1.3 | Create, rename and delete dances; Home lists them | ⬜ |
| 6.1 | Shows and acts | H1, H2 | `ShowManager`, `ShowCard`, `DanceRow` | 2.0 | Create a show with acts holding dances | ⬜ |
| 6.2 | Reordering | H3 | `ShowManager` | 6.1 | Drag acts and dances into a new order | ⬜ |

#### MVP 3 — Casting and formations

First milestone to show real teachers.

| # | Plan | Requirements | Screens | Depends on | Done when | Status |
|---|---|---|---|---|---|---|
| 2.1 | Stage | C1, C2, C3 | `Stage`, `DanceEditorIPad` | 2.0 | Empty stage with wings and toggleable guide lines | ⬜ |
| 2.2 | Casting | C4, C5, C6, C14, B5 | `CastList` | 2.1, 1.7 | Cast dancers with roles; the cast list shows how many dancers; label and color modes switch; a removed dancer's spot stays as a placeholder | ⬜ |
| 9.1 | 3D stage and ballerinas | L1–L6, C1 (3D), C5 (3D) | `Stage3D`, `DanceEditorIPad` | 2.2 | Cast dancers stand as 3D ballerinas on the perspective stage, colored by dancer or role, with readable labels; one tap switches to the 2D plan | ⬜ |
| 2.3 | Figures | C7 | `Toolbar`, `Timeline` (figure markers) | 2.2 | Add, duplicate, rename, reorder, delete figures | ⬜ |
| 2.4 | Dragging and selection | C8, C9 | `Stage`, `Stage3D` | 2.3, 9.1 | Drag one or many dancers in the 2D plan and the 3D stage, with optional snapping, by finger and mouse | ⬜ |
| 2.7 | Straight-line playback | D1, D4, D5, E9 | `Timeline`, `Stage3D` | 2.3, 9.1 | 60 ballerinas animate smoothly between figures without music, on the 3D stage and the 2D plan | ⬜ |

#### MVP 4 — Show details

| # | Plan | Requirements | Screens | Depends on | Done when | Status |
|---|---|---|---|---|---|---|
| 6.5 | Show details and running time | H4, H6 (typed durations) | `ShowManager`, `DanceRow` | 6.1, 2.2 | Each dance shows its cast, dancer count and typed duration; the show's total time is right | ⬜ |
| 6.3 | Reuse and duplicate dances | H7 | `DanceRow` | 6.1, 2.3 | One dance in two shows; duplicate a dance with its cast and figures | ⬜ |

#### MVP 5 — Movement and rehearsal

| # | Plan | Requirements | Screens | Depends on | Done when | Status |
|---|---|---|---|---|---|---|
| 3.1 | Curved paths | D2 (curves) | `Stage` | 2.7 | Drag handles to bend a path; playback follows it | ⬜ |
| 3.2 | Waypoints | D2 (waypoints) | `Stage` | 3.1 | Add and move waypoints on a path | ⬜ |
| 3.3 | Circles and arcs | D3 | `Stage` | 3.1 | A dancer circles another dancer | ⬜ |
| 7.1 | Presentation mode | G1, G2, G3 | `PresentationMode` | 2.7 | Full-screen stage readable on a TV; step or play continuously | ⬜ |
| 8.2 | iPhone editor | K3 | `DanceEditorIPhone` | 2.4 | Quick edits work on iPhone; landscape hint for heavy editing | ⬜ |

### After the MVP

Not ordered yet; plan it when the MVP ships.

| # | Plan | Requirements | Screens | Depends on | Done when | Status |
|---|---|---|---|---|---|---|
| 1.4 | Email invites | A3 (email) | — | 1.3 | An invited teacher joins from an email | ⬜ |
| 2.5 | Layout tools and ghost view | C10, C11 | `Toolbar` | 2.4 | Mirror, align, spread, circle; previous figure shown faintly | ⬜ |
| 2.6 | Undo and redo | C12 | `Toolbar` | 2.4 | Undo/redo per figure | ⬜ |
| 4.1 | Audio upload | E1, E7 | — | 2.3 | Upload a 30 MB MP3 and reuse it in a second dance; a dance's duration and the show's running time come from its song | ⬜ |
| 4.2 | Waveform | E2, E8 | `Timeline` | 4.1 | Waveform and playhead open instantly on reload | ⬜ |
| 4.3 | Transport controls | E5 | `Timeline` | 4.2 | Play, pause, scrub, loop, 0.5× / 0.75× / 1× | ⬜ |
| 4.4 | Counts | E3 | `Timeline` | 4.2 | Tap counts or generate them from BPM and offset | ⬜ |
| 4.5 | Figures on the timeline | E4, E6 | `Timeline`, `PresentationMode` | 4.3, 4.4, 2.7 | Stage stays in sync with the music at every speed and after scrubbing, in the editor and in presentation mode | ⬜ |
| 5.1 | Edit lock | F1, F2, F4 | `EditingBanner` | 2.3 | Second teacher sees read-only with a banner; lock expires on tab close | ⬜ |
| 5.2 | Live updates | F3 | — | 5.1 | Viewer sees edits without reloading | ⬜ |
| 5.3 | Take over editing | F5 | `EditingBanner` | 5.1 | Viewer takes over once the lock is free | ⬜ |
| 6.4 | Costume photos | H5, B6 | `ShowManager` | 6.1 | A HEIC costume photo from an iPhone uploads resized to 1600 px and shows in the show manager | ⬜ |
| 7.2 | PDF export | I1, I2, I3, I4 | `PrintView` | 2.3 | Printable PDF, one figure per page, made in the browser | ⬜ |
| 8.1 | Installable app | K4 | — | 1.6 | Add to home screen on iPad; opens full-screen | ⬜ |
| 8.3 | Languages | J1, J2, J3 | — | 1.6 | Every screen works in pt-BR and English; default follows the browser | ⬜ |

### Open questions to settle in each part's planning session

- [x] Auth: Better Auth with email and password; no third-party sign-in (Google, Apple) for now
- [x] ORM: Prisma
- [x] i18n: react-i18next, JSON per language and screen area; English first, pt-BR added in plan 8.3 (after the MVP)
- [ ] Hosting: confirm the proposal in section 3
- [x] Palette: "Pointe", light theme only
- [x] Undo/redo: per figure
- [x] Counts: the teacher chooses tapped counts or BPM per song
- [x] PDF export: in the browser
- [x] Limits: 60 dancers, 30 MB audio, 10 MB photos (resized before upload)
- [x] Deleted dancers: kept as placeholders
- [x] MVP scope: shows, dances, casting, formations, the 3D stage, paths, presentation mode and iPhone editing; see §1
- [x] 3D view: 3D ballerinas on a perspective stage, the default view, in the MVP (plan 9.1)
- [x] 3D ballerinas: built from Three.js primitives first; a Blender model (glTF) can replace it later, since the rest of the app only knows a figure with tutu, bodice, skin, hair and tights parts
- [x] 3D ballerinas: one shared pose, no poses per role
- [x] 3D ballerinas: skin and hair are assigned automatically from the dancer's id; no roster fields
- [ ] Deleting a dance: removed for good after a confirm in plan 2.0; revisit in plan 6.1, once a dance can belong to shows
- [ ] App name: Living Stage check domain and trademark
