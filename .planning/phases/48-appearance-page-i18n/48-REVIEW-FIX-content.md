---
phase: 48-appearance-page-i18n
chunk: content
fixed_at: 2026-05-26T20:00:00Z
review_path: .planning/phases/48-appearance-page-i18n/48-REVIEW-content.md
iteration: 1
findings_in_scope: 7
fixed: 6
skipped: 1
status: partial
---

# Phase 48: Code Review Fix Report — Content / i18n chunk

**Fixed at:** 2026-05-26T20:00:00Z
**Source review:** `.planning/phases/48-appearance-page-i18n/48-REVIEW-content.md`
**Iteration:** 1
**Chunk scope:** `src/content/{strings.ts,learnContent.ts,lockedCopy.ts}` + their `*.test.ts` siblings

**Summary:**
- Findings in scope: 7
- Fixed: 6 (4 Warnings + 2 Info)
- Skipped/deferred: 1 (IN-03 — operator decision required)

The 46 prior commits from audio/components-main/app/components-primitives chunks were
already on `main` at start. `src/content/strings.ts` had drifted from the line numbers
in REVIEW-content.md (NK section keys moved from `:206-207/:384-385/:595-596` to
`:208-209/:388-389/:601-602`) due to `nkReadout.orbAriaLabel` /
`nkReadout.announcementAriaLabel` insertions earlier in the file. Fix anchors were
re-located by symbol, not by line; deletions were textual and unambiguous.

## Fixed Issues

### WR-01: Dead i18n keys `learn.naviKriyaDescriptionSection{1,2}Title`

**Files modified:** `src/content/strings.ts`, `src/content/strings.test.ts`
**Commit:** `c91aaa2`
**Applied fix:** Deleted both keys across the UiStrings interface, the EN catalog, and
the PT-BR catalog. Removed them from the `newLearnKeys` tuple in the Phase-32 test
block, deleted the two byte-lock `.toBe()` assertions, and re-pointed the
"Navi Kriya stays untranslated in PT-BR" check at `naviKriyaVideosHeading` (the only
remaining Phase-32 key, which also contains the proper noun). The rendered Navi Kriya
section titles continue to flow from
`LEARN_CONTENT.{locale}.practices.naviKriya.description.sectionN.title` via
`LearnPanel.tsx:62,67`.

### WR-02: Same Navi Kriya section titles live in two source modules

**Files modified:** (resolved by WR-01)
**Commit:** `c91aaa2` (same as WR-01)
**Applied fix:** Option A from the review (recommended, "aligns with WR-01"). Deleting
the `strings.ts` duplicates in WR-01 leaves `learnContent.ts` as the sole source of
truth for the four section titles. No parity test needed because there is no longer
anything to keep in parity.

### WR-03: PT-BR `LOCKED_COPY` values are not byte-locked

**Files modified:** `src/content/lockedCopy.ts`, `src/content/lockedCopy.test.ts`
**Commit:** `52fabd9`
**Applied fix:** Replaced the `LOCKED_COPY PT-BR non-empty` block with
`LOCKED_COPY frozen-PT-BR snapshot (D-02 parity)`. Three `.toBe()` assertions now
byte-lock the PT-BR values mirror-image to the EN block (the em-dash check is
subsumed by the byte-exact `medicalAdviceLine` assertion, so it was not kept as a
separate test). Updated the lockedCopy.ts file-header to say D-02 covers
"all 3 EN values AND all 3 PT-BR values", aligning the doc with the test contract.

### WR-04: PT-BR drops "optional" qualifier on resonant audio-cue copy

**Files modified:** `src/content/learnContent.ts`
**Commit:** `046177a`
**Applied fix:** Replaced `tons suaves de tigela` with `tons opcionais de tigela`
in `practices.resonant.description.section2.body` for PT-BR. Restores the `optional`
qualifier present in the EN baseline and matches the symmetry with the Navi Kriya
passage at line 215 (`emite um sinal sonoro opcional a cada OM`).

### IN-01: Inconsistent `LocaleId` import path across the three sibling files

**Files modified:** `src/content/learnContent.ts`, `src/content/lockedCopy.ts`
**Commit:** `e87a8df`
**Applied fix:** Changed both deep imports
`import type { LocaleId } from '../domain/settings'` to barrel imports
`import type { LocaleId } from '../domain'`. All three content modules now match
the convention documented in `src/domain/index.ts:2-4`.

### IN-02: `learnContent.test.ts:232-234` hardcodes the PT-BR locked phrase

**Files modified:** `src/content/learnContent.test.ts`
**Commit:** `a0a371b`
**Applied fix:** Deleted the redundant
`PT-BR forrest body does NOT contain its EN-baseline-equivalent locked phrase`
test block. The dynamic substring-absence guard at `lockedCopy.test.ts:39-47`
already iterates all locales and reads `LOCKED_COPY[locale].inspiredByForrest`,
so removing the hardcoded version eliminates the design-lock without losing
the invariant. Cited memory rule: `[[feedback_no_design_locking]]`.

## Deferred Issues

### IN-03: Affiliate tracking parameter on Amazon book URL

**File:** `src/content/learnContent.ts:68` (EN) and `:157` (PT-BR)
**Reason:** Operator decision required. The review itself states
"No mechanical fix recommended without operator input" and offers three orthogonal
options (A: strip `linkId` from both locales; B: keep + document; C: strip
`language=en_US` from PT-BR only). The finding is flagged "for visibility, not
blocking". Not in the `<priorities>` list for this fix pass.
**Original issue:** The Amazon book URL carries the `linkId=...` Site-Stripe
tracker, which is in soft tension with the affiliation-independence claim in
`LOCKED_COPY.affiliationLine`. Test `learnContent.test.ts:137` already byte-locks
the URL including the tracker, so the team has explicitly chosen this state — but
the choice is undocumented.

## Verification

- TypeScript: `npx tsc --noEmit -p tsconfig.json` ran clean after each of the 6
  fixes (Tier 2 pass on every commit).
- Vitest: not run per instructions (deferred to phase verifier).
- File state: re-read after every edit; no corruption.

## Memory rules applied

- `[[feedback_no_design_locking]]` — IN-02 removed the hardcoded literal anchor;
  WR-01 removed dead byte-locks that were anchoring values no UI consumed.
- LOCKED_COPY policy — WR-03 extended the existing locked-copy contract to PT-BR.
  Not a new design lock; the file-header already implied universal coverage.
- General hygiene — no WHAT comments and no finding-ID refs were introduced in
  source. Commit-message subjects carry the finding ID per the requested
  `fix(48-content-WR-NN):` convention.

---

_Fixed: 2026-05-26T20:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
_Chunk: content_
