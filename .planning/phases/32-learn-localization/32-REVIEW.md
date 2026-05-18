---
phase: 32-learn-localization
reviewed: 2026-05-17T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/app/App.tsx
  - src/components/LearnDialog.tsx
  - src/components/LearnDialog.test.tsx
  - src/content/learnContent.ts
  - src/content/learnContent.test.ts
  - src/content/strings.ts
  - src/content/strings.test.ts
findings:
  critical: 0
  warning: 1
  info: 5
  total: 6
status: issues_found
---

# Phase 32: Code Review Report

**Reviewed:** 2026-05-17T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Reviewed the Phase 32 learn-localization changes: practice-aware `LearnDialog` rendering, the per-practice partition of `learnContent.ts`, new `learn.*` string keys, and the `App.tsx` wiring that passes `activePractice` into the dialog. The implementation is correct and well-tested — security posture on external links is enforced consistently (every `<a>` carries `target="_blank" rel="noopener noreferrer"`), URLs are guarded against dangerous schemes, and the locked Forrest phrase remains correctly externalized to `lockedCopy.ts`.

No Critical issues found. The findings below are one Warning (a `practiceContent` indexing assumption that is currently safe but brittle) and several Info-level robustness/consistency observations.

## Warnings

### WR-01: `practiceContent` lookup has no defensive guard if `practices` map drifts from `PracticeId`

**File:** `src/components/LearnDialog.tsx:88`
**Issue:** `const practiceContent = practices[activePractice]` is then dereferenced unconditionally (`practiceContent.description.section1.title`, `.videos.map(...)`). The `practices` object type guarantees `resonant` and `naviKriya` keys, and `PracticeId` is exactly those two, so this is type-safe today. However, the dialog is the single consumer of every practice's content and there is no runtime guard: if a future `PracticeId` member is added to `src/storage/practices.ts` (line 23) without a matching entry being added to both `LEARN_CONTENT` locales, `practiceContent` becomes `undefined` and the dialog crashes with an uncaught TypeError at render — a blank-screen failure for the user. The `learnContent.test.ts` structural-contract suite only asserts `resonant` and `naviKriya` explicitly; it does not iterate `PracticeId` members, so the gap would not be caught by tests either.
**Fix:** Either add a render-time guard, or make the test iterate the practice ID list so drift fails CI:
```ts
// learnContent.test.ts — make the practices contract exhaustive over PracticeId
import { PRACTICE_IDS } from '../storage/practices' // or LOCALE_OPTIONS-style list
for (const practice of PRACTICE_IDS) {
  it(`[${locale}] practices.${practice} exists with non-empty description sections`, () => {
    expect(LEARN_CONTENT[locale].practices[practice].description.section1.title.length).toBeGreaterThan(0)
    // ...
  })
}
```
If a `PRACTICE_IDS` const array does not exist alongside the `PracticeId` union, adding one mirrors the existing `LOCALE_OPTIONS` pattern and removes the drift risk for all such maps.

## Info

### IN-01: Forrest explainer paragraph keys use full paragraph text as React `key`

**File:** `src/components/LearnDialog.tsx:139-141`
**Issue:** `explainer.forrest.body.split('\n\n').map((paragraph) => <p key={paragraph} ...>)` uses the entire paragraph string as the React reconciliation key. This works because the two paragraphs are distinct, but it is fragile (two identical paragraphs would collide and produce a duplicate-key warning) and uses an unbounded string as a key.
**Fix:** Use the array index, which is stable here since the body is static content rendered top-to-bottom: `body.split('\n\n').map((paragraph, i) => <p key={i} ...>)`.

### IN-02: `videosHeading` ternary will silently mislabel any future practice

**File:** `src/components/LearnDialog.tsx:90`
**Issue:** `const videosHeading = activePractice === 'resonant' ? strings.videosHeading : strings.naviKriyaVideosHeading` treats every non-`resonant` practice as Navi Kriya. Combined with WR-01, a third practice would render the wrong heading rather than failing fast. This is a maintainability concern, not a current bug.
**Fix:** Drive the heading from a per-practice map keyed by `activePractice`, parallel to how `practiceContent` is selected — so adding a practice forces adding its heading.

### IN-03: Comment references stale line numbers

**File:** `src/app/App.tsx:476`
**Issue:** The WR-09 comment says "The onLearnClick open-guard (App.tsx:396-399)" but `onLearnClick` is actually defined at lines 661-664. Stale line references in comments mislead future readers.
**Fix:** Replace the hard-coded line range with a symbolic reference, e.g. "the `onLearnClick` open-guard".

### IN-04: `roundsCompletedLabel` carries an outdated "PT-BR stub" comment

**File:** `src/content/strings.ts:124-125`
**Issue:** The interface comment states `// PT-BR stub; real translation in Phase 32`. This is Phase 32, and the PT-BR value at line 485 (`'OMs na frente'`) is now a real translation. The "stub" comment is stale and misleading.
**Fix:** Remove or update the comment to reflect that the PT-BR translation is finalized.

### IN-05: `roundsCompletedLabel` EN/PT-BR values are semantically divergent

**File:** `src/content/strings.ts:305` and `src/content/strings.ts:485`
**Issue:** EN `roundsCompletedLabel` is `'Rounds'` while PT-BR is `'OMs na frente'` ("front OMs"). These are not translations of the same concept — one labels rounds, the other labels a front-OM count. If both render the same StatsFooter figure (the comment at line 123 says "label for the rounds-completed figure"), the PT-BR label describes a different quantity than the figure, which is a localization correctness defect. The consuming component is out of review scope, so this is flagged as Info pending confirmation of what figure the label sits next to.
**Fix:** Confirm with the StatsFooter consumer which quantity is displayed and align the PT-BR string — likely `'Rodadas'` to match the EN `'Rounds'`. If the figure genuinely is a front-OM count, fix the EN string instead.

---

_Reviewed: 2026-05-17T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
