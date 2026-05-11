---
phase: 06-learning-claim-safe-positioning
plan: 2
subsystem: content
status: complete
completed_at: 2026-05-11T01:55:55Z
tags:
  - content-asset
  - typed-record
  - claim-safe
  - i18n-ready
dependency_graph:
  requires:
    - 06-01-PLAN.md (URL hand-off — 06-URLS.md source of truth)
  provides:
    - src/content/learnContent.ts (LEARN_CONTENT export, LearnContent/ExplainerSection/LearnLink interfaces)
    - src/content/learnContent.test.ts (contract lock assertions)
  affects:
    - 06-03-PLAN.md (LearnDialog.tsx imports LEARN_CONTENT directly)
tech_stack:
  added: []
  patterns:
    - "as const satisfies TypeName — literal-narrowing typed export (mirrors src/domain/settings.ts)"
    - "Section-keyed content record — i18n-ready shape per D-10"
key_files:
  created:
    - src/content/learnContent.ts
    - src/content/learnContent.test.ts
  modified: []
decisions:
  - "Forrest section body uses double-quoted string to preserve unescaped apostrophe for grep acceptance criterion on locked phrase"
  - "learnContent.ts has zero imports — leaf data module, no dependency surface"
  - "Disclaimer copy intentionally absent from content asset — stays inline in LearnDialog.tsx per CONTEXT.md §Established Patterns"
  - "patreon added as 6th link key per user-approved D-12 execute-time amendment (binding on Plans 02 and 03)"
metrics:
  duration_minutes: 15
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
requirements_completed:
  - LEARN-01
  - LEARN-02
  - LEARN-03
  - LEARN-04
---

# Phase 6 Plan 2: Content Asset — learnContent.ts Summary

## One-liner

Typed section-keyed content asset `learnContent.ts` with drafted HRV explainer prose and locked Forrest Knutson link set (six keys including patreon amendment), backed by 22 vitest assertions locking the entire content contract.

## What Was Built

### Task 1: `src/content/learnContent.ts`

A zero-dependency TypeScript module that is the single source of truth for the Phase 6 Learn modal's explainer prose and curated link set. Exports four symbols:

- `ExplainerSection` interface (`readonly title: string; readonly body: string`)
- `LearnLink` interface (`readonly label: string; readonly url: string`)
- `LearnContent` interface (explainer sub-record with `hrv`/`timing`/`forrest`; links sub-record with `youtubeChannel`/`website`/`book`/`patreon`/`heroVideo`/`keyVideos`)
- `LEARN_CONTENT` constant (`as const satisfies LearnContent`)

The explainer contains three verbatim sections per the plan's locked prose (D-08, D-09):
1. **hrv** — "What is HRV / resonance breathing": calm description of low-rate paced breathing and resonance without clinical framing
2. **timing** — "How this app times your breath": paraphrases the three PROJECT.md rules (fewer than 7 BPM, no pauses, exhale longer than inhale)
3. **forrest** — "Who is Forrest Knutson": introduces Forrest as a teacher, contains the verbatim locked phrase `inspired by Forrest's teachings` (D-11)

The link set contains six keys per the D-12 amendment:
- `youtubeChannel`: label `YouTube channel`, URL from 06-URLS.md
- `website`: label `Website`, URL from 06-URLS.md
- `book`: label `Book`, locked URL `https://amzn.to/3RTAVqi` (D-12 item 3)
- `patreon`: label `Patreon`, URL `https://www.patreon.com/forrestknutson` (D-12 amendment)
- `heroVideo`: label from 06-URLS.md title row, URL from 06-URLS.md
- `keyVideos`: readonly array of 3 items from 06-URLS.md (within 0–5 bound)

### Task 2: `src/content/learnContent.test.ts`

22 vitest assertions organized in three describe blocks:

- **`LEARN_CONTENT structural contract`**: key order assertion (`Object.keys` equals `['hrv', 'timing', 'forrest']`); non-empty title/body for all three sections
- **`LEARN_CONTENT locked copy contract`**: locked phrase presence (D-11); forbidden clinical verbs absent from all three bodies (D-08/LEARN-04)
- **`LEARN_CONTENT link contract`**: locked book URL (D-12/T-06-06); locked labels; patreon label/URL assertions; https:// prefix on all six link types; keyVideos count bounds (0–5); dangerous-scheme absence check on all URL strings (T-06-04)

## Verification Results

- `npx vitest run src/content/learnContent.test.ts` — 22 tests passed (0 failed)
- `npx tsc --noEmit -p tsconfig.app.json | grep learnContent` — 0 errors (PASS)

Note: `tsconfig.app.json` reports 3 pre-existing errors in `src/hooks/useAudioCues.test.tsx` (Phase 3, unrelated to this plan). These existed at the base commit before Plan 02 changes.

## Commits

| Task | Commit | Files | Type |
|------|--------|-------|------|
| Task 1: learnContent.ts | `7ba2f6f` | `src/content/learnContent.ts` | feat |
| Task 2: learnContent.test.ts | `9db9a84` | `src/content/learnContent.test.ts` | test |

## Deviations from Plan

### User-Approved Amendment: D-12 Patreon Key (Binding Override)

**Classification:** D-12 amendment, user-approved at execute time during Plan 06-01

**Scope:** This deviation was pre-authorized by the orchestrator via `<deviation_override>` block before execution began.

**Original plan:** `LearnContent.links` had five keys: `youtubeChannel`, `website`, `book`, `heroVideo`, `keyVideos`.

**Amendment applied:**
1. `LearnContent` interface extended with `readonly patreon: LearnLink` between `book` and `heroVideo` in insertion order.
2. `LEARN_CONTENT.links.patreon` populated with `{ label: 'Patreon', url: 'https://www.patreon.com/forrestknutson' }` from 06-URLS.md.
3. Three test assertions added in `learnContent.test.ts`:
   - `expect(LEARN_CONTENT.links.patreon.label).toBe('Patreon')`
   - `expect(LEARN_CONTENT.links.patreon.url).toBe('https://www.patreon.com/forrestknutson')`
   - `expect(LEARN_CONTENT.links.patreon.url.startsWith('https://')).toBe(true)`
   - `patreon.url` included in the dangerous-scheme assertion array
4. All Plan 06-02 success criteria additions from the override block are satisfied.

**Downstream impact:** Plan 06-03 (LearnDialog.tsx) MUST render the patreon row between `book` and `heroVideo` per the amendment.

### Auto-Fix: Single-Quoted String Apostrophe Escaping

**Rule:** Rule 1 (Bug fix)

**Found during:** Task 1 acceptance criteria check

**Issue:** The forrest section body was initially written using a single-quoted JS string (`'...'`), causing the apostrophe in `Forrest's` to be escaped as `\'` in the source file. The plan's acceptance criterion `grep -Fc "inspired by Forrest's teachings"` searches for an unescaped apostrophe and returned 0.

**Fix:** Changed the forrest body string to use double quotes (`"..."`) so the apostrophe is unescaped in the source, allowing the grep to find the exact locked phrase.

**Files modified:** `src/content/learnContent.ts` (inline fix before first commit)

**Commit:** Included in Task 1 commit `7ba2f6f` (fix applied before commit, not a separate commit)

## Known Stubs

None. All link values are populated with real URLs from 06-URLS.md. The explainer prose is verbatim from the plan's locked drafts. No placeholder text or empty fields.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The module is a static data-only TypeScript file with no side effects. All URLs in `LEARN_CONTENT.links` validated against the dangerous-scheme blocklist (T-06-04 mitigation) in both the module content and the test assertions.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `src/content/learnContent.ts` exists | FOUND |
| `src/content/learnContent.test.ts` exists | FOUND |
| `06-02-SUMMARY.md` exists | FOUND |
| Commit `7ba2f6f` (Task 1) | FOUND |
| Commit `9db9a84` (Task 2) | FOUND |
| `vitest run learnContent.test.ts` | 22 tests passed |
