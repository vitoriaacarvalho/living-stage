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

- **In:** create shows with acts and dances, manage the school's dances, cast dancers into each dance (with how many there are), place them in formations on a top-down 2D stage plan as colored circles, animate them from one formation to the next (straight, curved and circular paths), show it full screen in rehearsal, and quick edits on iPhone.
- **Out, for later:** music and the timeline, costume photos, live viewing and the edit lock, PDF export, Portuguese, email invites, installing as an app, layout tools, ghost view, and undo and redo.

Section 7 lists the MVP plans in build order and keeps the rest under "After the MVP".

**Name.** Working name: **Living Stage**. No app or dance software with this name was found, but a former theater company and an eco-theater project used it, so the exact domain is likely taken. Options: livingstage.app, "LivingStage" as one word, or a suffix like "Studio". Domain (Registro.br) and trademark (INPI, USPTO) checks are still to do.

## 2. Decisions agreed so far

| Topic | Decision |
| Users | Ballet teachers and school managers; dancers have no accounts |
| Permissions | All members of a school have the same rights |
| School required | A signed-in user with no school must create one or join one with an invitation code before using the app. With one school she goes straight into it; with several she picks one at sign-in and can switch inside the app |
| Invitations | One reusable code per school, valid 7 days; any teacher can make a new one, which replaces the old. Shared as a short code to type (8 letters and digits without look-alikes, shown as `ABCD-2345`) or as a link carrying it (`/join/<code>`, kept through sign-in). Joining shows the school's name before confirming. Schools are never listed or searchable. Email invites come later |
| Tenancy | Many schools, each a private space; several teachers share one school's environment. Every route for a school's data lives under `/api/schools/:schoolId`, where one membership check answers 404 to non-members, so another school's data looks like it does not exist. No route checks who created the school |
| MVP scope | Shows, dances, casting, formations and movement first; everything else waits (see §1, MVP) |
| Editing model | One person edits a dance at a time; others watch changes live. Not in the MVP: until the edit lock ships, the last save wins |
| Casts | One cast per dance |
| Roles | Free text per dance; the teacher decides whether to show and color by role. Coloring by role is automatic: each distinct role takes the next color from `dancer-1` to `dancer-11` in the order roles first appear in the cast (starting over after 11), roles that differ only in case are one role, and dancers with no role are `dancer-12` (stone) |
| Devices | Mostly iPad and iPhone, also desktop; fully responsive; Chrome as the target browser |
| Languages | English only in the MVP; Portuguese (pt-BR) added after it with i18n |
| Stage | Standard rectangular stage with wings; no custom proportions |
| Music | Uploaded audio files, after the MVP; no Spotify (its API no longer supports this use). Until then playback runs on a time per move that the teacher sets (4 s by default), and a dance's duration is typed by hand |
| Offline | Not required |
| Props and set pieces | Not included |
| Export | Printable PDF of formations, after the MVP |
| Stage view | One view only: a flat top-down 2D plan with the audience at the bottom, where each dancer is a circle in her dancer color. Used in the editor, presentation mode, print and thumbnails. No 3D view |

Note: on iPad and iPhone, Chrome uses Apple's WebKit engine, so testing must happen on real Apple devices, not only desktop Chrome.

## 3. Technology stack

TypeScript end to end, in one npm workspaces monorepo, with types and animation math shared between client and server.

| Layer | Choice | Notes |
| Language | TypeScript | Frontend, backend and shared code |
| Package manager | npm (workspaces) | Root `package.json` with `"workspaces": ["apps/*", "packages/*"]` |
| Frontend | React + Vite | Single-page app, responsive, installable as a PWA |
| Stage rendering | SVG rendered by React | The plan reads normalized stage coordinates and keeps a fixed `viewBox`. No WebGL or game engine |
| Touch and gestures | Pointer Events + `@use-gesture/react` | Drag, multi-select, pinch-to-zoom, pan; finger, mouse and Apple Pencil |
| Reorderable lists | `@dnd-kit/core` + `@dnd-kit/sortable` | Drag to reorder figures, and later acts and dances (H3); touch, mouse and keyboard |
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
SVG stage plan, timeline ◀─live updates─  REST + WebSockets, edit lock  ──▶  File storage / R2 (audio, photos)
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
- ✅ **B5.** Removing a dancer who is cast in dances keeps her spot as a placeholder until someone else is assigned.
- **B6.** Costume photos are resized in the browser to 1600 px on the long edge before upload; originals up to 10 MB are accepted, including iPhone HEIC. *(after the MVP)*
- **B7.** A member can add a new dancer, with a name and an optional color, from a dance's "Add to cast" panel; she joins the roster and the dance's cast at once.

### Part C — Formation editor

- ✅ **C1.** A dance shows its stage as a top-down 2D plan with the audience at the bottom.
- ✅ **C2.** The stage has wing zones on the left, right and upstage, where dancers can wait off stage, enter and exit.
- ✅ **C3.** Optional guide lines (center and quarters) can be shown or hidden.
- ✅ **C4.** A member casts dancers from the roster into a dance, each with an optional free-text role.
- ✅ **C5.** Dancers appear as colored circles on the plan; the label can show name, role or both.
- ✅ **C6.** Dancers can be colored by their own color or by role, chosen per dance.
- ✅ **C7.** A dance is an ordered list of figures (formations): add, duplicate, rename, reorder, delete.
- ✅ **C8.** Dancers are placed by dragging; several can be selected and moved together.
- ✅ **C9.** Optional snapping to guide lines.
- **C10.** Layout tools for a selection: mirror left/right, align in a line, spread evenly, arrange in a circle. *(after the MVP)*
- **C11.** A "ghost" view shows the previous figure's positions faintly while editing the current one, as dashed circles. *(after the MVP)*
- **C12.** Undo and redo while editing, kept per figure. *(after the MVP)*
- ✅ **C13.** A member can create, rename and delete dances; the school's dances are listed on Home.
- ✅ **C14.** A dance shows its cast list and how many dancers are in it.

### Part D — Paths and animation

- ✅ **D1.** Each dancer's move between two figures is a straight line by default.
- **D2.** A path can be bent into a curve by dragging handles, or given waypoints.
- **D3.** A path can follow a circle or arc (e.g. circling around another dancer).
- ✅ **D4.** Playback animates every dancer smoothly along her path from one figure to the next, with easing.
- ✅ **D5.** Playback can run without music too, with a default duration per transition.
- ✅ **D6.** Until music pins figures to the song (E4), the teacher sets how long each move takes: 1 to 30 seconds in half seconds, 4 by default.

### Part E — Music timeline *(after the MVP, except E9)*

- **E1.** A member can upload an audio file (MP3, M4A, WAV) to a dance.
- **E2.** The timeline shows the song's waveform and a playhead below the stage.
- **E3.** Counts can be marked by tapping along, or generated from a BPM and start offset; the teacher chooses per song, and tapped counts handle tempo changes.
- **E4.** Each figure is pinned to a moment in the song (a timestamp or a count); the transition fills the time before it.
- **E5.** Play, pause, scrub, loop a section, and play at 0.5×, 0.75× or 1×.
- **E6.** The stage animation stays in sync with the audio at every speed and after scrubbing.
- **E7.** Audio files up to 30 MB (MP3, M4A, AAC, WAV). A song can be reused by several dances in the school.
- **E8.** The waveform is computed once at upload and stored, so it opens instantly afterwards.
- **E9.** Up to 40 dancers per dance, rendering and animating smoothly on an iPad.

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

- ✅ **H1.** A member can create a show with a name, date and optional venue.
- ✅ **H2.** A show contains ordered acts; each act contains ordered dances.
- ✅ **H3.** Acts and dances can be reordered by dragging.
- ✅ **H4.** Each dance in a show displays its cast, how many dancers it has and its duration; its song and costume photos are added after the MVP.
- **H5.** A member can upload costume photos to a dance. *(after the MVP)*
- ✅ **H6.** The show's total running time is calculated from the dance durations. In the MVP the teacher types each dance's duration; once music ships, it comes from the song.
- ✅ **H7.** A dance belongs to the school and can appear in more than one show, or be duplicated as a starting point.

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
- ✅ **K2.** Touch targets are large enough for finger dragging on a tablet.
- **K3.** On iPhone, the editor is optimized for viewing and quick edits; landscape is suggested for heavy editing.
- **K4.** The app is installable to the home screen and opens full-screen (PWA). *(after the MVP)*
- ✅ **K5.** The interface follows the Living Stage design system (tokens, fonts, icons, base components).

## 5. Data model (first draft)

Everything belongs to a school; dances live at school level and are linked into shows.

```
School        id, name, createdAt, createdById, teachers[]   (teachers: many-to-many with User, equal rights)
User          id, name, email, language
Invite        id, schoolId, code, expiresAt, createdById   (one active code per school; email invites later)

Dancer        id, schoolId, name, color?   (color: 1–12, the number of a dancer-N token)

Dance         id, schoolId, title, audioId?, durationMs?, labelMode, colorMode, showGuides   (durationMs typed by hand in the MVP; showGuides is shared by everyone in the school)
CastMember    id, danceId, dancerId?, role?   (dancerId is set to null when the dancer is removed: the placeholder of B5; a dancer is cast at most once per dance, and a dance holds at most 40 (E9); a newly cast dancer waits in the left wing of every figure, one spot down the wing after another)
Figure        id, danceId, order, name?, transitionMs, timeMs? | count?   (every dance is created with a first figure, so cast dancers have saved positions before plan 2.3; transitionMs is the time to arrive from the figure before, 4000 by default, ignored on the first figure and replaced by timeMs or count once music ships)
Position      figureId, castMemberId, x, y
Path          figureId, castMemberId, segments[]  (route arriving into this figure)

AudioTrack    id, url, durationMs, bpm?, offsetMs?, beatMarks[]
CostumePhoto  id, danceId, url, caption?

Show          id, schoolId, title, date, time?, venue?, intervalMs   (date is a calendar day and time a wall-clock time, kept as typed; intervalMs is the interval between acts, 0 by default)
Act           id, showId, order, name?   (numbered "Act 1" with an optional name; a show keeps at least one)
ActItem       id, showId, actId, danceId, order   (a dance is in a show at most once; showId is there for that check)

EditLock      danceId, userId, expiresAt          (renewed by heartbeat)
```

`AudioTrack`, `CostumePhoto` and `EditLock` are not built in the MVP.

**Coordinates.** `x` and `y` are stage units, not pixels: 0–1 is the visible stage (`x` left to right, `y` upstage to downstage). Values just outside that range are the wings. The plan maps 0–1 onto a 12 × 8 m floor; guides, snapping and keyboard moves work in those metres.

**Paths.** A path is a list of cubic Bézier segments (start, two control points, end). A straight line is a segment with its controls on the line; waypoints and circles are several segments joined.

**Animation.** A dancer's position at time *t* is a pure function of the two figures around *t*, her path and an easing curve. It lives in `packages/shared` and is unit tested.

## 6. Design direction

The interface stays calm so the dancers on the dark stage are the most colorful thing on screen. Palette: "Pointe". Light theme only; the stage is always dark.

The full design system (tokens, components, screens) lives in Claude Design (link kept private, outside the repo). The `living-stage-design` skill reads it.

| Use | Color |
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

**Dancers on stage.** Each dancer is a circle in her dancer color (by dancer or by role) with a 2px `stage-ink` ring.

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

The build is split into small plans that each fit a sitting or two. Work top to bottom; a plan starts only when the plans it depends on are done. Each plan is a vertical slice: shared types, API and the screens it needs, built together.

**Every plan ships its UI.** When a plan starts, check the design system for the screens it touches. A plan with a screen builds that screen to the design in the same plan, never as plain HTML to style later, and its "Done when" is checked in the browser against the design. Order the slices so the screen appears early: the first API route, then its screen, then the next route and its screen, so each sitting ends with something visible. Small sub-slices can stay backend-only.

A plan that needs more than its entry here (decisions, data model, commit slices) gets its own file in `docs/features/` (e.g. `1.2-auth.md`). Those files hold detail only: any decision that changes this plan is copied here too, and this file wins where they differ.

How to read a plan:

- ⬜ **2.1 Stage** · after 2.0 ← status, plan number and name, then the plans that must be done first
  - Done when: … ← the check that closes the plan
  - Requirements: … · Screens: … ← the §4 IDs it covers and the design system components it builds (load the `living-stage-design` skill)

Status: ⬜ not started · 🟨 in progress · ✅ done. When a requirement is done, mark it ✅ in section 4 and set its plan's status to 🟨 (some requirements done) or ✅ (all done and its "Done when" check passes), in the same commit as the work.

### MVP

#### MVP 1 — Foundation

- 🟨 **1.1 Monorepo and tooling**
  - Done when: `npm run dev` starts web and API; CI is green
  - Requirements: S1–S6
- ✅ **1.2 Sign in** · after 1.1
  - Done when: Sign up, sign in and sign out with email and password
  - Requirements: A1 · Screens: `Access`
- ✅ **1.2a English copy** · after 1.2
  - Done when: No Portuguese copy left in the interface or its tests
  - Requirements: J4 · Screens: `Access`
- ✅ **1.6a Design foundation and styled sign-in** · after 1.2
  - Done when: Design tokens are CSS variables, fonts and icons load, and the sign-in and sign-up forms match the design on iPhone, iPad and desktop
  - Requirements: K5 · Screens: `Access` (sign in, sign up), `Button`, `SegmentedControl`
- 🟨 **1.3 Schools and data isolation** · after 1.6a
  - Done when: Create a school, join one with a code or link, pick and switch schools from screens that match the design; another school's data returns 404
  - Requirements: A2, A3 (code and link), A4, A5, A6 · Screens: `Access` (create or join a school), school picker and switcher
- 🟨 **1.6 Responsive app shell** · after 1.6a
  - Done when: Navigation and layout work on iPhone, iPad and desktop
  - Requirements: K1, K2 · Screens: `Home` (shell, nav rail, dance cards with a stage thumbnail)
  - Note: only built destinations are in the shell (Home, Dancers, Team); Shows, search and Settings join with their plans
- ✅ **1.7 Dancer roster** · after 1.3
  - Done when: Add, edit, remove, search and sort dancers
  - Requirements: B1, B2, B3, B4 · Screens: `DancerRoster`

#### MVP 2 — Shows and dances

- ✅ **2.0 Dances** · after 1.3
  - Done when: Create, rename and delete dances; Home lists them
  - Requirements: C13 · Screens: `Home` (dance list)
- ✅ **6.1 Shows and acts** · after 2.0
  - Done when: Create a show with acts holding dances
  - Requirements: H1, H2 · Screens: `ShowManager`, `ShowCard`, `DanceRow`
  - Note: shows have an optional time; the only status is "Performed", from the date
- ✅ **6.2 Reordering** · after 6.1
  - Done when: Drag acts and dances into a new order
  - Requirements: H3 · Screens: `ShowManager`
  - Note: a dance can be dragged into another act; acts carry their dances

#### MVP 3 — Casting and formations

First milestone to show real teachers.

- 🟨 **2.1 Stage** · after 2.0
  - Done when: Empty stage with wings and toggleable guide lines
  - Requirements: C1, C2, C3 · Screens: `Stage`, `DanceEditorIPad`
- ✅ **2.2 Casting** · after 2.1, 1.7
  - Done when: Cast dancers with roles; the cast list shows how many dancers; label and color modes switch; a removed dancer's spot stays as a placeholder
  - Requirements: C4, C5, C6, C14, B5 · Screens: `CastList`
- ✅ **2.3 Figures** · after 2.2
  - Done when: Add, duplicate, rename, reorder, delete figures
  - Requirements: C7 · Screens: `Toolbar`, `Timeline` (figure markers)
- ✅ **2.4 Dragging and selection** · after 2.3
  - Done when: Drag one or many dancers on the plan, with optional snapping, by finger and mouse
  - Requirements: C8, C9 · Screens: `Stage`
- 🟨 **2.7 Straight-line playback** · after 2.3
  - Done when: 40 dancers animate smoothly between figures without music on an iPad
  - Requirements: D1, D4, D5, D6, E9 · Screens: `Timeline`, `Stage`, figure panel
  - Note: the 40-dancer cap is enforced here, on the cast route (409 `cast_full`) and in the cast picker
  - To do: measure playback of 40 dancers on a real iPad (steps in `docs/features/2.7-straight-line-playback.md`, Measurements). Put off on 5 Nov 2026; E9 and 2.7 stay open until then, and the plans after 2.7 can go ahead

- ⬜ **2.8 Quick-add dancers** · after 2.2, 1.7
  - Done when: From a dance's "Add to cast" panel, search the roster and add a new dancer who is not in it yet; she lands in the roster and in the cast without leaving the dance
  - Requirements: B7 · Screens: `CastList` (the "Add to cast" panel)
  - Note: the panel gets a search field; a "New dancer" row opens a name and color form, and a search with no exact match offers "Add “Ana” as a new dancer". The Dancers screen stays as it is

#### MVP 4 — Show details

- ✅ **6.5 Show details and running time** · after 6.1, 2.2
  - Done when: Each dance shows its cast, dancer count and typed duration; the show's total time is right
  - Requirements: H4, H6 (typed durations) · Screens: `ShowManager`, `DanceRow`
  - Note: durations are typed on the show's dance rows and kept on the dance; the total adds an optional interval between acts; the cast opens under a row on tap
- ✅ **6.3 Reuse and duplicate dances** · after 6.1, 2.3
  - Done when: One dance in two shows; duplicate a dance with its cast and figures
  - Requirements: H7 · Screens: `DanceCard` on Home
  - Note: Duplicate is a button on each dance card on Home; the copy, "X (copy)", takes everything but the shows and opens in its rename form

#### MVP 5 — Movement and rehearsal

- ⬜ **3.1 Curved paths** · after 2.7
  - Done when: Drag handles to bend a path; playback follows it
  - Requirements: D2 (curves) · Screens: `Stage`
- ⬜ **3.2 Waypoints** · after 3.1
  - Done when: Add and move waypoints on a path
  - Requirements: D2 (waypoints) · Screens: `Stage`
- ⬜ **3.3 Circles and arcs** · after 3.1
  - Done when: A dancer circles another dancer
  - Requirements: D3 · Screens: `Stage`
- ⬜ **7.1 Presentation mode** · after 2.7
  - Done when: Full-screen stage readable on a TV; step or play continuously
  - Requirements: G1, G2, G3 · Screens: `PresentationMode`
- ⬜ **8.2 iPhone editor** · after 2.4
  - Done when: Quick edits work on iPhone; landscape hint for heavy editing
  - Requirements: K3 · Screens: `DanceEditorIPhone`
  - Note: today the editor squeezes the stage to about 205 px wide on a 393 px iPhone, so dancers and names overlap; the full-bleed stage fixes it. Dragging and the keyboard already work there

### After the MVP

Not ordered yet; plan it when the MVP ships.

- ⬜ **1.4 Email invites** · after 1.3
  - Done when: An invited teacher joins from an email
  - Requirements: A3 (email)
- ⬜ **2.5 Layout tools and ghost view** · after 2.4
  - Done when: Mirror, align, spread, circle; previous figure shown faintly
  - Requirements: C10, C11 · Screens: `Toolbar`
- ⬜ **2.6 Undo and redo** · after 2.4
  - Done when: Undo/redo per figure
  - Requirements: C12 · Screens: `Toolbar`
- ⬜ **4.1 Audio upload** · after 2.3
  - Done when: Upload a 30 MB MP3 and reuse it in a second dance; a dance's duration and the show's running time come from its song
  - Requirements: E1, E7
- ⬜ **4.2 Waveform** · after 4.1
  - Done when: Waveform and playhead open instantly on reload
  - Requirements: E2, E8 · Screens: `Timeline`
- ⬜ **4.3 Transport controls** · after 4.2
  - Done when: Play, pause, scrub, loop, 0.5× / 0.75× / 1×
  - Requirements: E5 · Screens: `Timeline`
- ⬜ **4.4 Counts** · after 4.2
  - Done when: Tap counts or generate them from BPM and offset
  - Requirements: E3 · Screens: `Timeline`
- ⬜ **4.5 Figures on the timeline** · after 4.3, 4.4, 2.7
  - Done when: Stage stays in sync with the music at every speed and after scrubbing, in the editor and in presentation mode
  - Requirements: E4, E6 · Screens: `Timeline`, `PresentationMode`
- ⬜ **5.1 Edit lock** · after 2.3
  - Done when: Second teacher sees read-only with a banner; lock expires on tab close
  - Requirements: F1, F2, F4 · Screens: `EditingBanner`
- ⬜ **5.2 Live updates** · after 5.1
  - Done when: Viewer sees edits without reloading
  - Requirements: F3
- ⬜ **5.3 Take over editing** · after 5.1
  - Done when: Viewer takes over once the lock is free
  - Requirements: F5 · Screens: `EditingBanner`
- ⬜ **6.4 Costume photos** · after 6.1
  - Done when: A HEIC costume photo from an iPhone uploads resized to 1600 px and shows in the show manager
  - Requirements: H5, B6 · Screens: `ShowManager`
- ⬜ **7.2 PDF export** · after 2.3
  - Done when: Printable PDF, one figure per page, made in the browser
  - Requirements: I1, I2, I3, I4 · Screens: `PrintView`
- ⬜ **8.1 Installable app** · after 1.6
  - Done when: Add to home screen on iPad; opens full-screen
  - Requirements: K4
- ⬜ **8.3 Languages** · after 1.6
  - Done when: Every screen works in pt-BR and English; default follows the browser
  - Requirements: J1, J2, J3

### To do

- [ ] Measure 2.7 playback (40 dancers with labels) on a real iPad and record the numbers; closes E9 and 2.7

### Open questions to settle in each part's planning session

- [x] Auth: Better Auth with email and password; no third-party sign-in (Google, Apple) for now
- [x] ORM: Prisma
- [x] i18n: react-i18next, JSON per language and screen area; English first, pt-BR added in plan 8.3 (after the MVP)
- [ ] Hosting: confirm the proposal in section 3
- [x] Palette: "Pointe", light theme only
- [x] Undo/redo: per figure
- [x] Counts: the teacher chooses tapped counts or BPM per song
- [x] PDF export: in the browser
- [x] Limits: 40 dancers (lowered from 60 in Nov 2026), 30 MB audio, 10 MB photos (resized before upload)
- [x] Deleted dancers: kept as placeholders
- [x] MVP scope: shows, dances, casting, formations, the stage plan, paths, presentation mode and iPhone editing; see §1
- [x] Stage view: 2D plan only, dancers as colored circles; the 3D stage and ballerinas were dropped (Nov 2026)
- [x] Deleting a dance: removed for good after a confirm; from plan 6.1 the confirm names the shows it is in, and it leaves them
- [ ] App name: Living Stage check domain and trademark
