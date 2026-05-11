---
phase: 06-learning-claim-safe-positioning
verified: 2026-05-10T23:11:00Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
re_verification: false
---

# Phase 6: Learning Claim-Safe Positioning — Verification Report

**Phase Goal:** Users can understand the app's HRV/resonance-style breathing context and reach Forrest Knutson learning resources through calm, claim-safe in-app content.
**Verified:** 2026-05-10T23:11:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can access a prominent link to Forrest Knutson's YouTube channel. | VERIFIED | `LearnAnchor` button rendered as first child of `<main>` in `App.tsx` line 487. Opens `LearnDialog` which renders `<a href="https://www.youtube.com/@ForrestKnutson">YouTube channel</a>` with `target="_blank" rel="noopener noreferrer"`. Both learnContent tests and LearnDialog tests assert this link. |
| 2 | User can access curated links to selected HRV breathing explanation videos. | VERIFIED | `learnContent.ts` contains `heroVideo` + 3-item `keyVideos` array (within 0–5 bound). `LearnDialog.tsx` renders all five/six link entries including the hero video and each keyVideo. Test file `learnContent.test.ts` asserts `keyVideos.length` is 0–5. LearnDialog tests assert all links carry security attributes. |
| 3 | User can read a brief in-app explanation of resonance-style breathing and the app's timing rules. | VERIFIED | `LEARN_CONTENT.explainer` in `learnContent.ts` has three sections — `hrv` ("What is HRV / resonance breathing"), `timing` ("How this app times your breath"), `forrest` ("Who is Forrest Knutson") — rendered verbatim by `LearnDialog.tsx` in fixed DOM order. Test asserts `Object.keys(LEARN_CONTENT.explainer)` equals `['hrv','timing','forrest']` and each section has non-empty title/body. |
| 4 | User sees copy that frames the app as guided breathing practice, not medical advice or diagnosis. | VERIFIED | `LearnDialog.tsx` renders two inline disclaimer lines: `"This is guided breathing practice — not medical advice."` and `"Independent project. Not affiliated with Forrest Knutson."`. No clinical verbs (improves/treats/cures/heals/diagnoses) appear in any explainer body (grep returns no matches; tests assert regex absence for each body). Anchor is disabled (not hidden) during session via `aria-disabled="true"` + JSX no-op + App-level early-return (two-layer gate, T-06-11). |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.planning/phases/06-learning-claim-safe-positioning/06-URLS.md` | Locked Forrest URLs source-of-truth | VERIFIED | Exists; `status: locked` in frontmatter; contains `https://amzn.to/3RTAVqi` once; rows for YouTube channel, Website, Book, Patreon (amendment), Hero video, 3 key videos; no dangerous schemes. |
| `src/content/learnContent.ts` | Typed LEARN_CONTENT export with explainer + links | VERIFIED | Exists, 86 lines. Exports `ExplainerSection`, `LearnLink`, `LearnContent`, `LEARN_CONTENT as const satisfies LearnContent`. Three section titles verbatim. Locked phrase `inspired by Forrest's teachings` in forrest body. Book URL `https://amzn.to/3RTAVqi` exactly once. Six link keys including patreon amendment. Zero imports, zero clinical verbs in prose. |
| `src/content/learnContent.test.ts` | Unit tests locking content contract | VERIFIED | Exists. Three describe blocks (`LEARN_CONTENT structural contract`, `LEARN_CONTENT locked copy contract`, `LEARN_CONTENT link contract`). 22 assertions. All 22 pass under vitest (confirmed by live run). No xit/skip/todo. |
| `src/components/LearnDialog.tsx` | Native dialog rendering explainer + links + disclaimers | VERIFIED | Exists, 168 lines. Named export `LearnDialog` + `LearnDialogProps`. Imports `LEARN_CONTENT` from `../content/learnContent`. Uses `dialog.showModal()`. Renders `>About this practice<` inline. Both disclaimer lines present on single source lines (grep confirmed). 8 `<a>` tags each with `target="_blank"` and `rel="noopener noreferrer"` (5 named + 3 keyVideos). No session-state coupling. No `dangerouslySetInnerHTML`. |
| `src/components/LearnDialog.test.tsx` | D-19 contract unit tests | VERIFIED | Exists. Four locked describe blocks present (count=4 confirmed). 16 assertions. All 16 pass. Asserts default focus on Close button, locked phrase, both disclaimer lines, Book href, Patreon label/href/target/rel, all-`<a>` security forEach. No xit/skip/todo. |
| `src/components/LearnAnchor.tsx` | Persistent corner anchor with aria-disabled gate | VERIFIED | Exists, 37 lines. Named export `LearnAnchor` + `LearnAnchorProps`. Zero hooks. Renders `>Learn</button>` inline. `aria-disabled={disabled \|\| undefined}`. Both aria-labels present. `min-h-[44px] min-w-[44px]` hit-area floor. `env(safe-area-inset-top/right)` positioning. `focus-visible:ring-breathing-accent` chain. No session-state coupling. |
| `src/components/LearnAnchor.test.tsx` | D-18 disabled-during-session unit tests | VERIFIED | Exists. Three locked describe blocks (count=3 confirmed). 7 assertions. All 7 pass. Asserts enabled click invokes onClick, disabled click does NOT invoke onClick, same DOM node identity across enabled→disabled rerender (toBe(before)). No xit/skip/todo. |
| `src/app/App.tsx` | Wire-up: 2 imports + 1 state hook + 2 callbacks + 2 JSX render sites | VERIFIED | Both imports present (lines 10–11). `learnDialogOpen` state declared (line 53). `onLearnClick` with `inSessionView` early-return (lines 351–354). `onLearnClose` (lines 356–358). `<LearnAnchor disabled={inSessionView} onClick={onLearnClick} />` as first child of `<main>` (line 487). `<LearnDialog open={learnDialogOpen} onClose={onLearnClose} />` as last child of `<main>` before `</main>` (line 567). `inSessionView` predicate unchanged at line 100. Existing `<EndSessionDialog>` and `<ResetStatsDialog>` unchanged (count=1 each). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `06-URLS.md` | `06-02-PLAN.md (content asset)` | Plan 02 read_first cites this file | WIRED | `learnContent.ts` URLs exactly match `06-URLS.md` locked values (channel URL, hero URL, all 3 keyVideo URLs, book URL verbatim, patreon URL). |
| `src/content/learnContent.ts` | `06-URLS.md` | URLs inlined from hand-off file | WIRED | All six link URLs in `LEARN_CONTENT.links` match `06-URLS.md` row-for-row. Book URL `https://amzn.to/3RTAVqi` confirmed verbatim. |
| `src/components/LearnDialog.tsx` | `src/content/learnContent.ts` | `import { LEARN_CONTENT } from '../content/learnContent'` | WIRED | Import at line 3. Component destructures `{ explainer, links }` from `LEARN_CONTENT` and renders all six sections. |
| `src/components/LearnDialog.tsx` | `<dialog>.showModal()` native API | `useEffect` imperative open/close | WIRED | `dialog.showModal()` at line 29; `closeButtonRef.current?.focus()` immediately after (D-05 default focus). `dialog.close()` on close. |
| `src/app/App.tsx` | `src/components/LearnAnchor.tsx` | `import { LearnAnchor } from '../components/LearnAnchor'` | WIRED | Import at line 10. Rendered at line 487 with `disabled={inSessionView}` and `onClick={onLearnClick}`. |
| `src/app/App.tsx` | `src/components/LearnDialog.tsx` | `import { LearnDialog } from '../components/LearnDialog'` | WIRED | Import at line 11. Rendered at line 567 with `open={learnDialogOpen}` and `onClose={onLearnClose}`. |
| `LearnAnchor.disabled prop` | `App.inSessionView predicate` | `<LearnAnchor disabled={inSessionView} onClick={onLearnClick} />` | WIRED | `disabled={inSessionView}` confirmed at line 487. `onLearnClick` guards with `if (inSessionView) return` at line 352 (defense in depth). |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `LearnDialog.tsx` | `explainer`, `links` (from `LEARN_CONTENT`) | `src/content/learnContent.ts` static typed record | Yes — static data asset; all six link URLs populated from `06-URLS.md` locked values; no empty arrays or placeholder strings. | FLOWING |
| `LearnAnchor.tsx` | `disabled` prop | `App.tsx` `inSessionView` predicate (`appPhase !== 'idle'`) | Yes — driven by live session engine state. | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 45 Phase-6 tests pass (learnContent + LearnDialog + LearnAnchor) | `npx vitest run src/content/learnContent.test.ts src/components/LearnDialog.test.tsx src/components/LearnAnchor.test.tsx` | 3 test files, 45 tests passed | PASS |
| Full suite shows no regressions (363 tests) | `npx vitest run` | 27 test files, 363 tests passed | PASS |
| TypeScript produces no errors in Phase 6 files | `npx tsc --noEmit -p tsconfig.app.json 2>&1 \| grep -E "learnContent\|LearnDialog\|LearnAnchor\|App\.tsx"` | No output (0 errors) | PASS |
| Locked book URL appears verbatim in content module | `grep -c 'https://amzn.to/3RTAVqi' src/content/learnContent.ts` | 1 | PASS |
| Locked phrase present in forrest body | `grep -Fc "inspired by Forrest's teachings" src/content/learnContent.ts` | 1 | PASS |
| No forbidden clinical verbs in explainer prose | `grep -v '^[[:space:]]*//' src/content/learnContent.ts \| grep -iE '\b(improves\|treats\|cures\|heals\|diagnoses)\b'` | No matches (exit 1) | PASS |
| Both disclaimer lines present in LearnDialog | `grep -c 'This is guided breathing practice — not medical advice\.'` and `'Independent project. Not affiliated with Forrest Knutson\.'` | 1 each | PASS |
| 8 target=_blank + 8 rel=noopener on all external links | `grep -c 'target="_blank"' src/components/LearnDialog.tsx` | 8 (≥4 required) | PASS |
| All commits documented in SUMMARYs verified in git history | `git log --oneline \| grep -E "7ba2f6f\|9db9a84\|a706188\|b214837\|7ee1f8f\|00590c3\|5b67089"` | All 7 found | PASS |

### Probe Execution

Step 7c: SKIPPED — no conventional `scripts/*/tests/probe-*.sh` discovered; phase is a UI feature addition, no migration/tooling probes defined.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| LEARN-01 | 06-01, 06-02, 06-04 | User can access a prominent link to Forrest Knutson's YouTube channel. | SATISFIED | `LearnAnchor` in App.tsx opens `LearnDialog`; dialog renders `<a href="https://www.youtube.com/@ForrestKnutson">YouTube channel</a>` with `target="_blank" rel="noopener noreferrer"`. Test asserts `youtubeChannel` label and attrs. |
| LEARN-02 | 06-02, 06-03 | User can access curated links to selected HRV breathing explanation videos. | SATISFIED | `LEARN_CONTENT.links.heroVideo` and `LEARN_CONTENT.links.keyVideos` (3 items) populated from `06-URLS.md`. `LearnDialog` renders all in fixed order. Tests assert length 0–5 and all URLs start with `https://`. |
| LEARN-03 | 06-02, 06-03, 06-04 | User can read a brief in-app explanation of HRV/resonance-style breathing and the timing rules. | SATISFIED | Three-section explainer (`hrv`, `timing`, `forrest`) with verbatim locked prose rendered by `LearnDialog.tsx`. Accessible via `LearnAnchor` corner button on the main screen. |
| LEARN-04 | 06-02, 06-03, 06-04 | User sees claim-safe copy that frames the app as guided breathing practice, not medical advice. | SATISFIED | Two inline disclaimers in `LearnDialog.tsx`. No clinical verbs in any explainer body (CI-enforceable via test). Anchor is aria-disabled + no-op during session (not hidden). Copy avoids all forbidden medical framing. |

### D-12 Amendment Coverage (Patreon — Accepted In-Scope Deviation)

The user-approved amendment adding `patreon` as a 6th link key was consistently applied across all plans:

- `06-URLS.md`: `patreon` row with `https://www.patreon.com/forrestknutson` present; frontmatter `amendments:` documents the override.
- `src/content/learnContent.ts`: `LearnContent` interface extended with `readonly patreon: LearnLink`; `LEARN_CONTENT.links.patreon` populated with label `'Patreon'` and locked URL.
- `src/content/learnContent.test.ts`: Three patreon-specific assertions (label, URL exact match, URL starts-with-https); patreon URL included in dangerous-scheme check.
- `src/components/LearnDialog.tsx`: Patreon `<a>` rendered 4th in link block (between book and heroVideo), with `target="_blank" rel="noopener noreferrer"`. Count of `target="_blank"` is 8 (not 5).
- `src/components/LearnDialog.test.tsx`: Dedicated patreon test (label, href, target, rel); patreon included in the all-`<a>` forEach security check.
- Amendment consistently carried forward — not a gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | No TBD/FIXME/XXX markers, no placeholder strings, no return null/empty stubs found in any Phase 6 source file. |

No blocking or warning anti-patterns found. All stub detection patterns returned clean.

### Human Verification Required

One item requires human confirmation (visual/behavioral, not automatable):

**1. Learn anchor visible and correctly positioned in the browser**

**Test:** Open the app in a browser (`idle` state). Observe the top-right corner of the screen.
**Expected:** A small `Learn` button is visible at the top-right, positioned with safe-area-inset clearance. Clicking it opens the `LearnDialog` modal with focus on the Close button. The explainer sections and all six links (YouTube channel, Website, Book, Patreon, hero video, 3 key videos) are readable. Both disclaimer lines appear at the bottom. Pressing Esc or clicking the backdrop closes the modal.
**Why human:** Fixed positioning with `env(safe-area-inset-top/right)`, modal visual appearance, focus behavior after `showModal()`, and link rendering layout cannot be verified programmatically without a browser runtime.

**2. Learn anchor disabled state during session**

**Test:** Start a breathing session. Observe the `Learn` button.
**Expected:** Button text color changes to muted. Clicking or tapping the button does nothing (no modal opens). The button remains visible (not hidden).
**Why human:** CSS color changes and click-suppression during live session state require visual inspection with an active session.

### Gaps Summary

No gaps found. All four success criteria are met by the codebase as committed. The D-12 Patreon amendment was consistently applied across all four plans and their artifacts. The full test suite (363 tests across 27 files) passes with zero regressions. TypeScript is clean for all Phase 6 files.

---

_Verified: 2026-05-10T23:11:00Z_
_Verifier: Claude (gsd-verifier)_
