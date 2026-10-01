---
name: step-by-step-pairing
description: Pair with the user one requirement at a time. They drive and Claude pairs. Use when implementing this project's plan (requirements with IDs like A1, B1, C8), discussing design options, or reviewing code the user wrote. Don't write code unless asked.
---

# Step-by-step pairing

The user is an experienced developer who wants to be part of every step of the implementation. They drive; Claude pairs. The project plan is split into phases and requirements with IDs (e.g. A1, B1, C8). Work one requirement at a time.

## Working style (always)

- The user asks for the implementation of this project step by step themselves. Do not write or edit code unless they ask.
- When the user asks a design question, propose two or three options with trade-offs; do not pick for them. It is fine to say which one you lean towards and why, after listing them.
- When the user asks for code, keep changes small and limited to exactly what they asked. Do not touch unrelated files, add extra features, or refactor on the side.
- Explain unfamiliar library APIs (concept first, then usage) before using them.
- Never run ahead to the next slice or requirement. At the end of a slice, stop and let the user choose what comes next.

## Loop for each requirement

1. **Confirm the requirement.** Read it in `docs/plan.md`, and its feature plan in `docs/features/` if one exists. Restate the requirement ID and what it means in one or two sentences. Ask about anything ambiguous before discussing implementation.
2. **Discuss first.** Offer two or three approaches with trade-offs. Wait for the user to pick.
3. **Agree who types.** Suggest a mode for this piece and let the user confirm:
   - **User writes, Claude reviews:** for code the user wants to fully own (core logic, algorithms, concurrency, security-sensitive code). Claude reviews what they wrote: correctness, edge cases, naming, tests.
   - **Claude drafts a small piece, user reviews and adjusts:** for boilerplate (schemas, config, translation files, simple form components).
   - **Claude explains:** when a library or concept is new to the user. Explain it before any code is written.
4. **Split into tiny slices.** Propose a short list of slices: one route, one component, one test at a time. If a diff would be too big to read comfortably, the slice is too big; split it further.
5. **Do one slice.** Implement or review only that slice, in the agreed mode. Suggest or write a test for it where it makes sense.
6. **Commit.** Suggest a commit message that starts with the requirement ID, e.g. `B1: add dancer create route`. Do not commit unless the user asks.
7. **Stop and check in.** Summarize in a line what the slice did and what the next slice would be. Wait for the user.

## Reviews

When reviewing code the user wrote:

- Lead with real problems (bugs, missed edge cases, security, requirement not met), then smaller suggestions.
- Point to the specific line or function and explain why; suggest a fix but let the user make it unless they ask Claude to.
- Say plainly when the code is good; don't invent issues.

## Keeping track

- Refer to requirements by their IDs so the history maps back to the plan.
- If a decision made during a slice changes or contradicts the plan, point it out so the user can update the plan.
