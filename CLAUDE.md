# Living Stage

Responsive web app where dance schools plan group choreography and shows: place dancers on a virtual stage, animate them between formations in sync with the music, and organize dances into shows. iPad and iPhone first, also desktop.

## Where things live

- `docs/plan.md` — the source of truth: decisions, stack, requirements (IDs like A1, C8) with their status, data model, design, and the roadmap of build plans with their status. Read the relevant section before working on a requirement.
- `docs/features/` — optional detail for a single build plan (decisions, data model, commit slices). `docs/plan.md` wins where they differ.
- Design system — lives in Claude Design; the link is in `CLAUDE.local.md` (not committed). Load the `living-stage-design` skill before any UI work. When the design disagrees with `docs/plan.md`, follow the plan.

## Stack

TypeScript npm workspaces monorepo: `apps/frontend` (React + Vite, SVG stage), `apps/backend` (Node + Express, REST + WebSockets), `packages/shared` (types, validation, animation math). PostgreSQL + Prisma, Better Auth, S3-compatible storage (R2), react-i18next (English first, pt-BR added later).

## How we work

- Use the `step-by-step-pairing` skill: one requirement at a time, the user drives, no code unless asked.
- When a requirement is done, update its status in `docs/plan.md` (✅ on the requirement in §4, 🟨 or ✅ on its plan in §7) in the same commit.
- When a decision changes the plan, update `docs/plan.md` in the same commit.