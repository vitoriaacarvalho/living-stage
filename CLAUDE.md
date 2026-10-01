# Living Stage

Responsive web app where dance schools plan group choreography and shows: place dancers on a virtual stage, animate them between formations in sync with the music, and organize dances into shows. iPad and iPhone first, also desktop.

## Where things live

- `docs/plan.md` — the full project plan: decisions, stack, requirements (IDs like A1, C8), data model, design, build phases. Read the relevant section before working on a requirement.
- `docs/features/` — one plan per phase or part, written as each is planned. Takes precedence over `docs/plan.md` where they differ.

## Stack

TypeScript npm workspaces monorepo: `apps/web` (React + Vite, SVG stage), `apps/api` (Node + Express, REST + WebSockets), `packages/shared` (types, validation, animation math). PostgreSQL + Prisma, Better Auth, S3-compatible storage (R2), react-i18next (pt-BR and English).

## How we work

- Use the `step-by-step-pairing` skill: one requirement at a time, the user drives, no code unless asked.
- Commit messages start with the requirement ID, e.g. `B1: add dancer create route`.
- When a decision contradicts `docs/plan.md`, say so, so the plan can be updated.
