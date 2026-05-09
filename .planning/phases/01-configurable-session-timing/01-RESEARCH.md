# Phase 1 Research: Configurable Session Timing

**Phase:** 01-configurable-session-timing  
**Researched:** 2026-05-09  
**Confidence:** HIGH — project-level research already covered this domain; quick verification confirmed current official Vite, React, Vitest, and React Testing Library implementation patterns.

## Planning-Relevant Findings

### Stack and Setup

- Use a static React + Vite + TypeScript SPA. Project research recommends this stack because the product is local-only, account-free, and does not need server rendering.
- Use Tailwind via `@tailwindcss/vite` for responsive styling and calm design tokens, matching project research.
- Use Vitest + jsdom + React Testing Library for deterministic timing/domain tests and component behavior tests.
- Official Vite docs confirm non-interactive scaffolding with `npm create vite@latest <name> -- --template react-ts`. Because this repository already contains `.planning/`, executors should scaffold into a temporary directory and copy generated app files into the repository root rather than trying to scaffold directly into a non-empty directory.

### Timing Architecture

- Phase 1 must create one authoritative timing model. All phase, elapsed, remaining, completion, and visual-shape state must be derived from elapsed monotonic time, not independent intervals.
- React docs confirm timer/effect cleanup patterns: interval or animation loops should be established in effects and cleaned up on unmount. For this app, the loop may trigger renders, but timing truth remains derived from `performance.now()` or the RAF timestamp.
- Vitest docs confirm `vi.useFakeTimers()`, `vi.setSystemTime()`, and timer advancement patterns for deterministic time-dependent tests. Pure math tests should avoid real time entirely; hook/component tests can mock RAF/performance.

### UI and Verification Patterns

- React Testing Library docs recommend user-facing queries via `screen.getByRole`, `getByLabelText`, and text assertions. Phase 1 UI tests should verify labels and behaviors rather than implementation details.
- Controls must be steppers per CONTEXT decisions, ordered BPM → ratio → duration, with finite values constrained to the requirements.
- Duration extension while running must be modeled explicitly: timed sessions can only increase total duration; open-ended sessions expose no duration edits while running.

### Constraints from Project Research

- Do not add accounts, backend sync, analytics, medical claims, audio cues, local persistence, Wake Lock, polished final animation, learning content, pause/resume, preview seconds, advanced patterns, or biofeedback in Phase 1.
- Do include a functional breathing shape in Phase 1 because D-10 explicitly requires current-phase indication; keep it driven by the same derived session frame.
- Use generated/local browser capabilities only; no third-party runtime scripts or external media assets are needed for Phase 1.

## Architecture Responsibility Map

| Concern | Responsible Tier | Phase 1 Files |
|---------|------------------|---------------|
| Settings options, defaults, finite validation | Domain | `src/domain/settings.ts` |
| BPM/ratio/duration to phase durations | Domain | `src/domain/breathingPlan.ts` |
| Elapsed time to current phase/progress/remaining/completion | Domain | `src/domain/sessionMath.ts` |
| Running lifecycle, locked settings, end/reset/complete/extend rules | Domain + hook | `src/domain/sessionController.ts`, `src/hooks/useSessionEngine.ts` |
| User controls and display | UI components | `src/components/*`, `src/app/App.tsx` |
| Styling | CSS/Tailwind | `src/styles/theme.css`, `src/index.css` |

## Sources

- Project research: `.planning/research/SUMMARY.md`, `.planning/research/STACK.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/FEATURES.md`, `.planning/research/PITFALLS.md`.
- Context7 Vite docs: scaffold with `npm create vite@latest <name> -- --template react-ts`.
- Context7 React docs: use `useEffect` cleanup for interval/timer-like effects; keep non-idempotent time reads out of render.
- Context7 Vitest docs: `vi.useFakeTimers()`, `vi.setSystemTime()`, `vi.advanceTimersByTime()` for time-dependent verification.
- Context7 React Testing Library docs: render components and query with `screen.getByRole`, `getByLabelText`, and visible text.
