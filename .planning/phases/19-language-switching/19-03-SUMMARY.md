---
phase: 19-language-switching
plan: "03"
subsystem: content
tags:
  - i18n
  - locked-copy
  - learnContent
  - lockedCopy
  - LearnDialog
  - PT-BR
dependency_graph:
  requires:
    - Phase 14 (LocaleId + LOCALE_OPTIONS in domain/settings.ts)
    - Phase 6 (LearnDialog + locked claim-safe copy origin)
  provides:
    - LEARN_CONTENT locale-keyed catalog (EN + PT-BR)
    - LOCKED_COPY 3 entries x 2 locales with frozen-EN snapshot guard
    - LearnDialog stop-gap composition (LEARN_CONTENT.en + LOCKED_COPY.en)
  affects:
    - src/content/learnContent.ts
    - src/content/lockedCopy.ts
    - src/components/LearnDialog.tsx
tech_stack:
  added: []
  patterns:
    - Readonly<Record<LocaleId, LearnContent>> locale-keyed data module
    - LOCKED_COPY frozen-EN .toBe() snapshot guard (no toMatchInlineSnapshot)
    - Substring-absence guard iterating LOCALE_OPTIONS
    - LearnDialog stop-gap .en direct access (removed in Plan 08)
key_files:
  created:
    - src/content/lockedCopy.ts
    - src/content/lockedCopy.test.ts
  modified:
    - src/content/learnContent.ts
    - src/content/learnContent.test.ts
    - src/components/LearnDialog.tsx
    - src/components/LearnDialog.test.tsx
decisions:
  - "Single atomic commit required: LearnDialog stop-gap depends on both LEARN_CONTENT shape change AND LOCKED_COPY creation — splitting leaves broken TS compile"
  - "Worktree reset required: spawned at d583d00b (pre-Phase 14); reset to 60e14852 to get LocaleId from domain/settings.ts"
  - "LOCKED_COPY back-translation comment for PT-BR inspiredByForrest avoids duplicating EN phrase literal (grep count acceptance criteria)"
metrics:
  duration: "~20 minutes"
  completed: "2026-05-14T21:52:09Z"
  tasks: 6
  files: 6
---

# Phase 19 Plan 03: Locale-keyed learnContent + lockedCopy + frozen-EN guard + LearnDialog stop-gap

**One-liner:** Locale-keyed LEARN_CONTENT (EN + PT-BR) with locked Forrest phrase stripped to LOCKED_COPY module plus frozen-EN byte-equality test guard and LearnDialog stop-gap composition.

## What Was Built

6 files (2 NEW, 4 EDIT) implementing I18N-06 physical separation of locked claim-safe copy from the translatable catalog, plus the LearnDialog stop-gap to keep the per-commit green-gate passing while LEARN_CONTENT changes shape.

### Task 1: learnContent.ts — locale-keyed shape + EN strip + PT-BR translation

`LEARN_CONTENT` is now `Readonly<Record<LocaleId, LearnContent>>`. The EN `forrest.body` second paragraph had the substring `"inspired by Forrest's teachings, "` removed — the phrase moved to `LOCKED_COPY.en.inspiredByForrest` and is composed at render time by LearnDialog. A complete PT-BR locale entry was added with 14 `// TODO: native-speaker review` markers across all 3 explainer titles, 3 explainer bodies, and 8 link labels. PT-BR link URLs are byte-identical to EN.

**EN forrest.body strip delta:**
- Before: `"...This is an independent web app inspired by Forrest's teachings, made so anyone can follow a calm paced breath from a browser..."`
- After: `"...This is an independent web app made so anyone can follow a calm paced breath from a browser..."`

### Task 2: lockedCopy.ts — LOCKED_COPY 3 entries x 2 locales

New `src/content/lockedCopy.ts` exports `LockedCopy` interface and `LOCKED_COPY: Readonly<Record<LocaleId, LockedCopy>>` with:
- **EN baseline (byte-exact, frozen):**
  - `inspiredByForrest`: `"inspired by Forrest's teachings"` (ASCII apostrophe U+0027)
  - `medicalAdviceLine`: `"Guided breathing practice — not medical advice."` (em-dash U+2014)
  - `affiliationLine`: `"Independent project. Not affiliated with Forrest Knutson."`
- **PT-BR values (3 entries, each with `// LOCKED: back-translation` comment):**
  - `inspiredByForrest`: `"inspirado nos ensinamentos do Forrest"`
  - `medicalAdviceLine`: `"Prática de respiração guiada — não é conselho médico."` (em-dash U+2014)
  - `affiliationLine`: `"Projeto independente. Não afiliado a Forrest Knutson."`

### Task 3: lockedCopy.test.ts — frozen-EN + PT-BR non-empty + substring-absence guards

New `src/content/lockedCopy.test.ts` with 6 tests across 3 describe blocks:
- **Frozen-EN snapshot (D-02):** 3 `.toBe()` byte-equality assertions for all EN values. NOT `.toMatchInlineSnapshot()` (auto-update would defeat the lock).
- **PT-BR non-empty:** 4 assertions (3 length > 0 + PT-BR medicalAdviceLine contains em-dash U+2014).
- **Substring-absence guard (D-02 + D-04):** `for (const locale of LOCALE_OPTIONS)` loop asserts `LEARN_CONTENT[locale].explainer.forrest.body` does NOT contain `LOCKED_COPY[locale].inspiredByForrest`. Auto-scales to future locales.

PT-BR chosen value: `"inspirado nos ensinamentos do Forrest"` — matches the CONTEXT.md and PATTERNS.md recommendation.

### Task 4: learnContent.test.ts — per-locale loops + deleted presence guard + PT-BR URL identity

- Deleted `describe('LEARN_CONTENT locked copy contract')` block including the verbatim-presence test — now inverted to absence guard in lockedCopy.test.ts.
- Structural-contract tests wrapped in `for (const locale of LOCALE_OPTIONS)` loop.
- Clinical-verbs guards added per-locale: EN regex `/\b(improves|treats|cures|heals|diagnoses)\b/i`, PT-BR regex `/\b(melhora|trata|cura|diagnostica|avalia)\b/i`.
- `describe('LEARN_CONTENT link contract')` updated: all `LEARN_CONTENT.links.*` references changed to `LEARN_CONTENT.en.links.*`.
- Added `describe('LEARN_CONTENT PT-BR URL identity (D-12)')` with 8 tests: 5 per-link URL assertions + keyVideos URLs per-index + keyVideos length equality + PT-BR forrest body absence guard.

### Task 5: LearnDialog stop-gap

Minimal 3-delta stop-gap in `LearnDialog.tsx`:
1. Added `import { LOCKED_COPY } from '../content/lockedCopy'`
2. Changed `const { explainer, links } = LEARN_CONTENT` to `const { explainer, links } = LEARN_CONTENT.en` (1-character `.en` suffix)
3. Added italicized closing paragraph after forrest body split: `<p className="text-base leading-6 italic text-[var(--color-breathing-muted)] [&:not(:first-of-type)]:mt-2">{LOCKED_COPY.en.inspiredByForrest}</p>` (JSX option A per Claude's Discretion)
4. Changed `Independent project. Not affiliated with Forrest Knutson.` inline literal to `{LOCKED_COPY.en.affiliationLine}` (D-19 minimal-diff: outer `<p>` className preserved verbatim)

In `LearnDialog.test.tsx`: changed `LEARN_CONTENT.links.keyVideos` to `LEARN_CONTENT.en.links.keyVideos` (1-delta fix, line 147).

**Plan 08 note:** The `.en` stop-gap (`LEARN_CONTENT.en` + `LOCKED_COPY.en` direct access) will be removed in Plan 08 when `LearnDialogProps` is widened with `learnContent` / `lockedCopy` prop-driven from `useLocale()`.

### Task 6: Green-gate

`npx tsc --noEmit && npm run lint && npm run build && npm test -- --run` exits 0.
- 664 tests pass (baseline 644 + 20 new: 6 in lockedCopy.test.ts + 14 additional in learnContent.test.ts)

## Commit

| Commit | Hash | Files |
|--------|------|-------|
| feat(19-03): locale-keyed learnContent + lockedCopy + frozen-EN guard + LearnDialog stop-gap | c471ca4 | 6 files (2 new, 4 edit) |

Single atomic commit (required: LearnDialog stop-gap depends on both LEARN_CONTENT shape change AND LOCKED_COPY creation — splitting would leave intermediate broken TS compile state).

## Metrics

- **TODO: native-speaker review count added:** 14 (in learnContent.ts PT-BR entries)
- **LOCKED: back-translation count added:** 3 (in lockedCopy.ts PT-BR entries)
- **JSX shape chosen:** Italicized closing paragraph (Claude's Discretion option A) with className `text-base leading-6 italic text-[var(--color-breathing-muted)] [&:not(:first-of-type)]:mt-2`
- **PT-BR inspiredByForrest value:** `"inspirado nos ensinamentos do Forrest"`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree base commit mismatch**
- **Found during:** Initial setup
- **Issue:** Worktree was spawned at `d583d00b` (pre-Phase 14 work), which does not have `LocaleId` / `LOCALE_OPTIONS` in `src/domain/settings.ts`. The branch check in the prompt specified resetting to `60e14852` if merge-base did not match.
- **Fix:** Reset worktree to `60e14852` (main HEAD at plan execution time) per the worktree_branch_check protocol in the prompt.
- **Files modified:** n/a (working-tree reset, not a source edit)

**2. [Rule 1 - Bug] Comment phrases triggered grep acceptance criteria**
- **Found during:** Task 1 verification
- **Issue:** Header comment and inline comment in `learnContent.ts` contained `"inspired by Forrest"` — acceptance criteria requires count = 0.
- **Fix:** Rewrote comments to avoid the exact phrase while preserving intent.
- **Files modified:** src/content/learnContent.ts

**3. [Rule 1 - Bug] Back-translation comment duplicated Forrest's teachings phrase**
- **Found during:** Task 2 verification
- **Issue:** `// LOCKED: back-translation = "inspired by Forrest's teachings"` comment caused `grep -c "Forrest's teachings" lockedCopy.ts` to return 2 (should be 1).
- **Fix:** Changed comment to reference EN baseline by key name: `// LOCKED: back-translation = EN inspiredByForrest baseline (see en.inspiredByForrest above)`.
- **Files modified:** src/content/lockedCopy.ts

## Known Stubs

The `// TODO: native-speaker review` markers in `learnContent.ts` are intentional I18N-07 tracking markers, not rendering stubs. All PT-BR translations render valid content; the markers track pending native-speaker review as a v1.x carry-forward per REQUIREMENTS.md.

The `.en` direct access in `LearnDialog.tsx` (`LEARN_CONTENT.en` / `LOCKED_COPY.en`) is an intentional stop-gap documented in the plan. Plan 08 will replace it with prop-driven `learnContent` / `lockedCopy` resolved via `useLocale()`.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Plan 03 ships static-data + tests only. T-19-06, T-19-07, T-19-08, T-19-09 mitigations from plan threat model are all implemented.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/content/lockedCopy.ts | FOUND |
| src/content/lockedCopy.test.ts | FOUND |
| src/content/learnContent.ts | FOUND |
| src/content/learnContent.test.ts | FOUND |
| src/components/LearnDialog.tsx | FOUND |
| src/components/LearnDialog.test.tsx | FOUND |
| commit c471ca4 | FOUND |
