---
phase: 06-learning-claim-safe-positioning
plan: 3
subsystem: components
status: complete
completed_at: 2026-05-11T02:01:41Z
tags:
  - dialog
  - native-dialog
  - claim-safe
  - external-links
  - accessibility
dependency_graph:
  requires:
    - 06-02-PLAN.md (learnContent.ts — LEARN_CONTENT export with 6 link keys)
  provides:
    - src/components/LearnDialog.tsx (LearnDialog component + LearnDialogProps type)
    - src/components/LearnDialog.test.tsx (D-19 contract unit tests, 16 assertions)
  affects:
    - 06-04-PLAN.md (App.tsx wire-up — imports LearnDialog, adds learnDialogOpen state)
tech_stack:
  added: []
  patterns:
    - "Native <dialog> with showModal/close imperative control (third instance — clone-and-rename from ResetStatsDialog)"
    - "target=_blank rel=noopener noreferrer on every external <a> — first instance in project (D-07)"
    - "Default focus on Close button via ref.focus() after showModal() (T-06-08 mitigation)"
    - "Backdrop-click detection via event.target === dialogRef.current guard"
key_files:
  created:
    - src/components/LearnDialog.tsx
    - src/components/LearnDialog.test.tsx
  modified: []
decisions:
  - "Clone-and-rename ResetStatsDialog.tsx as structural analog (N=3 does not justify generic extraction per CONTEXT.md Claude's Discretion)"
  - "Six link keys rendered in fixed order: youtubeChannel, website, book, patreon, heroVideo, keyVideos[] — per D-12 amendment binding override"
  - "Disclaimer copy inlined as JSX strings per CONTEXT.md Established Patterns (short copy stays inline; explainer lives in learnContent.ts)"
  - "h2 and Close button text written inline (not on separate lines) to satisfy grep-based acceptance criteria"
metrics:
  duration_minutes: 15
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
requirements_completed:
  - LEARN-02
  - LEARN-03
  - LEARN-04
---

# Phase 6 Plan 3: LearnDialog Component + Tests Summary

## One-liner

Native `<dialog>` LearnDialog with three-section HRV explainer, six-link block including patreon, inline disclaimer copy, Close-button default focus, Esc/backdrop close, and 16 vitest assertions covering the full D-19 test contract.

## What Was Built

### Task 1: `src/components/LearnDialog.tsx`

The third native `<dialog>` instance in the project (after `EndSessionDialog` and `ResetStatsDialog`). Cloned and adapted from `ResetStatsDialog.tsx` per PATTERNS.md guidance. Key characteristics:

- **Props:** `{ open: boolean; onClose(): void }` — fully controlled by parent, no internal session-state coupling.
- **Imperative open/close:** `useEffect([open])` calls `dialog.showModal()` then `closeButtonRef.current?.focus()` on open; calls `dialog.close()` on close.
- **Default focus:** Close button receives focus immediately after `showModal()` — never a Forrest link (D-05/T-06-08).
- **Esc handling:** `useEffect([onClose])` registers a `cancel` event handler that calls `event.preventDefault()` then `onClose()` (Pitfall 5 mitigation).
- **Backdrop click:** `handleBackdropClick` checks `event.target === dialogRef.current` before calling `onClose()`.
- **Content:** Three explainer sections (`hrv`, `timing`, `forrest`) from `LEARN_CONTENT.explainer` in fixed D-08 order. Six link block in fixed order per D-12 amendment. Two inline disclaimer micro-lines (D-14). Close button.
- **Security:** Every `<a>` carries `target="_blank"` and `rel="noopener noreferrer"` (8 links total: youtubeChannel, website, book, patreon, heroVideo, 3 keyVideos).

### Task 2: `src/components/LearnDialog.test.tsx`

16 vitest assertions organized in four locked describe blocks per D-19 contract:

- **`LearnDialog — closed state`** (1 test): `dialog.open === false` when `open=false` (IN-03 anti-flake).
- **`LearnDialog — open state default focus + locked copy`** (5 tests): default focus on Close button; modal title; locked phrase `inspired by Forrest's teachings`; medical-advice sentence; affiliation micro-line.
- **`LearnDialog — Esc + backdrop close paths`** (4 tests): Esc via cancel event; backdrop click; inner-panel non-trigger; Close button click.
- **`LearnDialog — external link security`** (6 tests): YouTube channel attrs; Website attrs; Book attrs + locked href; Patreon label/href/target/rel (D-12 amendment); forEach over all `<a>` elements; keyVideos iteration.

## Verification Results

- `npx vitest run src/components/LearnDialog.test.tsx` — **16 tests passed** (0 failed)
- `npx vitest run` — **356 tests passed across 26 test files** (0 regressions)
- `npx tsc --noEmit -p tsconfig.app.json | grep LearnDialog.tsx` — **0 errors** (PASS)

## Commits

| Task | Commit | Files | Type |
|------|--------|-------|------|
| Task 1: LearnDialog.tsx | `a706188` | `src/components/LearnDialog.tsx` | feat |
| Task 2: LearnDialog.test.tsx | `b214837` | `src/components/LearnDialog.test.tsx` | test |

## Deviations

### D-12 Amendment: Six Link Keys (Patreon — Pre-Authorized Override)

**Classification:** User-approved D-12 amendment, binding via `<deviation_override>` in execution context.

**Original plan:** D-12 locked the link set at five keys (`youtubeChannel`, `website`, `book`, `heroVideo`, `keyVideos`).

**Amendment applied (from Plan 06-01 Patreon amendment, carried forward via `<deviation_override>`):**

1. **Render order:** Six keys rendered in fixed visual order — `youtubeChannel`, `website`, `book`, `patreon`, `heroVideo`, then `keyVideos[]` in array order.
2. **Patreon link rendered** with:
   - `href="https://www.patreon.com/forrestknutson"` (from `LEARN_CONTENT.links.patreon.url`)
   - Label text from `LEARN_CONTENT.links.patreon.label` (which is `'Patreon'`)
   - `target="_blank"` and `rel="noopener noreferrer"` (same security posture as all other links)
3. **Test assertions added** in `LearnDialog.test.tsx`:
   - Dedicated test: patreon link rendered with correct label, href, target, rel.
   - The `forEach` over `container.querySelectorAll('a')` iterates ALL links including patreon — patreon cannot slip past the aggregate security check.

**Impact:** `target="_blank"` and `rel="noopener noreferrer"` counts are 8 in the component (not 4+ as the original plan minimum), reflecting 6 named links + 3 keyVideos — 1 heroVideo + 3 keyVideos + youtubeChannel + website + book + patreon = 8 total anchors.

### Auto-fix: Inline Text for grep Acceptance Criteria

**Rule:** Rule 1 (Bug fix — grep-based acceptance criteria)

**Found during:** Task 1 acceptance criteria check.

**Issue:** The `<h2>` and `<button>` elements had their text content on separate lines from the opening/closing tags, causing `grep -c '>About this practice<'` and `grep -c '>Close<'` to return 0.

**Fix:** Collapsed `<h2 id="learn-dialog-title" className="...">About this practice</h2>` to a single line; similarly collapsed the button text `>Close</button>` to a single line.

**Files modified:** `src/components/LearnDialog.tsx` (inline fix before first commit).

## Known Stubs

None. All link values are populated from `LEARN_CONTENT` (which reads from locked URLs in `06-URLS.md`). Explainer prose is verbatim per Plan 06-02 Task 1. No placeholder text, no empty fields.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The component is a fully controlled UI element. All external links use `target="_blank" rel="noopener noreferrer"` (T-06-07 mitigated). Default focus lands on Close button not on any link (T-06-08 mitigated). Disclaimer copy is inline JSX strings and cannot drift (T-06-09 mitigated). No iframe, embed, or third-party script (T-06-10 accepted). No new threat surface beyond what the plan's threat register covers.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `src/components/LearnDialog.tsx` exists | FOUND |
| `src/components/LearnDialog.test.tsx` exists | FOUND |
| `06-03-SUMMARY.md` exists | FOUND |
| Commit `a706188` (Task 1) | FOUND |
| Commit `b214837` (Task 2) | FOUND |
| `vitest run LearnDialog.test.tsx` | 16 tests passed |
| `vitest run` (full suite) | 356 tests passed, 0 regressions |
| `tsc --noEmit` LearnDialog errors | 0 |
