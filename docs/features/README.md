# Feature plans — roadmap

The build phases from `docs/plan.md` §7, split into small plans that each fit a sitting or two. Each plan gets its own file in this folder (`1.2-auth.md`, …) when we start it. Work top to bottom; a plan starts only when the plans it depends on are done.

Status: ⬜ not started · 🟨 in progress · ✅ done

## Open before starting

- [x] Backend framework: Express (as in `docs/plan.md` §3).
- [x] Add Part S (setup) to `docs/plan.md` §4 so setup commits have IDs.
- [x] Move K3 and K4 out of Phase 1 in `docs/plan.md` §7.

## Part S — Setup

- **S1.** npm workspaces monorepo with `apps/web`, `apps/api`, `packages/shared`.
- **S2.** Shared TypeScript, lint and format config.
- **S3.** Local PostgreSQL and Prisma, first migration.
- **S4.** API skeleton with a health route.
- **S5.** Web skeleton (React + Vite) that calls the API.
- **S6.** CI: typecheck, lint, test on every push.

## Phase 1 — Foundation

| # | Plan | Requirements | Depends on | Done when | Status |
|---|---|---|---|---|---|
| 1.1 | Monorepo and tooling | S1–S6 | — | `npm run dev` starts web and API; CI is green | ⬜ |
| 1.2 | Sign in | A1 | 1.1 | Sign in and out with Google (Apple can follow once the developer account exists) | ⬜ |
| 1.3 | Schools and data isolation | A2, A4, A5, A6 | 1.2 | Create a school, switch schools; another school's data returns 404 | ⬜ |
| 1.4 | Invites | A3 | 1.3 | An invited teacher joins by email or link | ⬜ |
| 1.5 | Languages | J1, J2, J3 | 1.1 | Every screen so far works in pt-BR and English; default follows the browser | ⬜ |
| 1.6 | Responsive app shell | K1, K2 | 1.5 | Navigation and layout work on iPhone, iPad and desktop | ⬜ |
| 1.7 | Dancer roster | B1, B2, B3, B4, B5 | 1.3 | Add, edit, remove, search and sort dancers | ⬜ |
| 1.8 | Photo upload | B6 | 1.7 | A HEIC photo from an iPhone uploads resized to 400 px | ⬜ |

## Phase 2 — Formation editor

First milestone to show real teachers.

| # | Plan | Requirements | Depends on | Done when | Status |
|---|---|---|---|---|---|
| 2.1 | Stage | C1, C2, C3 | 1.6 | Empty stage with wings and toggleable guide lines | ⬜ |
| 2.2 | Casting | C4, C5, C6 | 2.1, 1.7 | Cast dancers with roles; label and color modes switch | ⬜ |
| 2.3 | Figures | C7 | 2.2 | Add, duplicate, rename, reorder, delete figures | ⬜ |
| 2.4 | Dragging and selection | C8, C9 | 2.3 | Drag one or many dancers, with optional snapping, by finger and mouse | ⬜ |
| 2.5 | Layout tools and ghost view | C10, C11 | 2.4 | Mirror, align, spread, circle; previous figure shown faintly | ⬜ |
| 2.6 | Undo and redo | C12 | 2.4 | Undo/redo per figure | ⬜ |
| 2.7 | Straight-line playback | D1, D4, D5, E9 | 2.3 | 60 dancers animate smoothly between figures without music | ⬜ |

## Phase 3 — Paths

| # | Plan | Requirements | Depends on | Done when | Status |
|---|---|---|---|---|---|
| 3.1 | Curved paths | D2 (curves) | 2.7 | Drag handles to bend a path; playback follows it | ⬜ |
| 3.2 | Waypoints | D2 (waypoints) | 3.1 | Add and move waypoints on a path | ⬜ |
| 3.3 | Circles and arcs | D3 | 3.1 | A dancer circles another dancer | ⬜ |

## Phase 4 — Music

| # | Plan | Requirements | Depends on | Done when | Status |
|---|---|---|---|---|---|
| 4.1 | Audio upload | E1, E7 | 1.8, 2.3 | Upload a 30 MB MP3 and reuse it in a second dance | ⬜ |
| 4.2 | Waveform | E2, E8 | 4.1 | Waveform and playhead open instantly on reload | ⬜ |
| 4.3 | Transport controls | E5 | 4.2 | Play, pause, scrub, loop, 0.5× / 0.75× / 1× | ⬜ |
| 4.4 | Counts | E3 | 4.2 | Tap counts or generate them from BPM and offset | ⬜ |
| 4.5 | Figures on the timeline | E4, E6 | 4.3, 4.4, 2.7 | Stage stays in sync with the music at every speed and after scrubbing | ⬜ |

## Phase 5 — Live viewing

| # | Plan | Requirements | Depends on | Done when | Status |
|---|---|---|---|---|---|
| 5.1 | Edit lock | F1, F2, F4 | 2.3 | Second teacher sees read-only with a banner; lock expires on tab close | ⬜ |
| 5.2 | Live updates | F3 | 5.1 | Viewer sees edits without reloading | ⬜ |
| 5.3 | Take over editing | F5 | 5.1 | Viewer takes over once the lock is free | ⬜ |

## Phase 6 — Show manager

| # | Plan | Requirements | Depends on | Done when | Status |
|---|---|---|---|---|---|
| 6.1 | Shows and acts | H1, H2 | 2.3 | Create a show with acts holding dances | ⬜ |
| 6.2 | Reordering | H3 | 6.1 | Drag acts and dances into a new order | ⬜ |
| 6.3 | Reuse and duplicate dances | H7 | 6.1 | One dance in two shows; duplicate a dance | ⬜ |
| 6.4 | Costume photos | H5 | 1.8, 6.1 | Upload costume photos to a dance | ⬜ |
| 6.5 | Show details and running time | H4, H6 | 4.1, 6.4 | Each dance shows song, duration, cast, photos; show total time is right | ⬜ |

## Phase 7 — Presentation and export

| # | Plan | Requirements | Depends on | Done when | Status |
|---|---|---|---|---|---|
| 7.1 | Presentation mode | G1, G2, G3 | 4.5 | Full-screen stage readable on a TV; step or play continuously | ⬜ |
| 7.2 | PDF export | I1, I2, I3, I4 | 2.3 | Printable PDF, one figure per page, made in the browser | ⬜ |

## Phase 8 — Polish

| # | Plan | Requirements | Depends on | Done when | Status |
|---|---|---|---|---|---|
| 8.1 | Installable app | K4 | 1.6 | Add to home screen on iPad; opens full-screen | ⬜ |
| 8.2 | iPhone editor | K3 | 2.5 | Quick edits work on iPhone; landscape hint for heavy editing | ⬜ |
| 8.3 | Dark mode | — (palette open question) | palette decision | Dark theme across the app | ⬜ |
