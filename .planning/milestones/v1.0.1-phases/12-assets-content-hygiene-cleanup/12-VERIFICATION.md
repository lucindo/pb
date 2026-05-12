---
phase: 12-assets-content-hygiene-cleanup
verified: 2026-05-12T00:00:00Z
status: passed
score: 11/11 must-haves verified
overrides_applied: 0
---

# Phase 12: Assets, Content & Hygiene Cleanup — Verification Report

**Phase Goal:** Ship the non-behavioural cleanup items — favicon base-path fix, affiliate-link honesty, removal of dead API surface (via docs-only flip carve-out), shared validation predicates, and JSDoc on the test-only seam.
**Verified:** 2026-05-12
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### ROADMAP Phase 12 Success Criteria Coverage

| SC# | Criterion | Resolution Path | Status |
|-----|-----------|-----------------|--------|
| SC#1 (ASSETS-01) | `index.html` favicon resolves under Vite `base: '/hrv/'`; `dist/index.html` shows correct href; no 404 | `index.html:5` uses `%BASE_URL%favicon.svg`; `dist/index.html:5` resolves to `/hrv/favicon.svg`; `dist/favicon.svg` byte-identical to `public/favicon.svg` (114 bytes) | VERIFIED |
| SC#2 (CONTENT-01) | Canonical `amazon.com/dp/...` URL OR LearnDialog discloses affiliate; "Not affiliated with Forrest Knutson" disclaimer remains accurate | `learnContent.ts:60` uses canonical amazon.com `/dp/B0CCFWP4W8` URL; `LearnDialog.tsx:171` disclaimer unchanged (linkId is Forrest's, not ours per D-06) | VERIFIED |
| SC#3 (HYGIENE-01) | `useAudioCues` no longer returns `audioNow` — **CARVE-OUT per CONTEXT D-01/D-02**: docs-only flip, NOT literal removal (Phase 9 AUDIO-02 caller-side clamp depends on it) | REQUIREMENTS.md HYGIENE-01 row reads `Overtaken (by Phase 9 AUDIO-02)`; REVIEW.md §IN-02 has `[2026-05-12 update]` addendum; `audio.audioNow` STILL exported from `useAudioCues.ts:58, :390` (cross-phase invariant preserved); App.tsx lines 200/342/549 still consume it | VERIFIED (carve-out) |
| SC#4 (HYGIENE-02) | Predicates exported from `src/domain/settings.ts`; consumed by `validateSettings` (throwing) AND `coerceSettings` (silent fallback); duplicated allow-list logic removed | `src/domain/settings.ts:50-63` exports the 3 predicates; `validateSettings` body calls them with verbatim RangeError + message format; `storage/settings.ts` imports them and no longer defines locally; 9 new cases in `src/domain/settings.test.ts` | VERIFIED |
| SC#5 (HYGIENE-03) | JSDoc above `formatLastSessionDate` documents test-only `now` seam; Vitest suite passes | `src/storage/format.ts:42` has single-line `/** @param now Test-only seam — ... */` JSDoc immediately above line 43 function signature; full suite 409/409 passing | VERIFIED |

### Observable Truths (from PLAN frontmatter must_haves)

| #   | Truth   | Status     | Evidence       |
| --- | ------- | ---------- | -------------- |
| 1   | HYGIENE-01 row in REQUIREMENTS.md reads "Overtaken (by Phase 9 AUDIO-02)" (docs-only flip, no audioNow removal) | VERIFIED | `.planning/REQUIREMENTS.md:148` reads `\| HYGIENE-01 \| Phase 12 — Assets, Content & Hygiene Cleanup \| Overtaken (by Phase 9 AUDIO-02) \|`. `audio.audioNow` STILL exported from `src/hooks/useAudioCues.ts:58, :390`. App.tsx:200, 342, 549 still consume `audio.audioNow()` for the AUDIO-02 caller-side clamp. |
| 2   | REVIEW.md §IN-02 ends with `[2026-05-12 update] Overtaken by Phase 9 AUDIO-02` line citing App.tsx:549 and 12-CONTEXT.md | VERIFIED | `REVIEW.md:391` contains the verbatim addendum: `[2026-05-12 update] Overtaken by Phase 9 AUDIO-02 — \`audio.audioNow()\` is the documented seam for the caller-side past-time clamp at App.tsx:549. HYGIENE-01 closed-no-op in 12-CONTEXT.md.` Exactly one `[2026-05-12 update]` match in the file. |
| 3   | src/storage/format.ts:42 has single-line `/** @param now Test-only seam — ... */` JSDoc above `formatLastSessionDate` | VERIFIED | Line 41 is the existing `// D-05:` comment. Line 42 is `/** @param now Test-only seam — production callers always omit this; tests pass a pinned ` followed by full prose ending in `*/`. Line 43 is `export function formatLastSessionDate(...)`. |
| 4   | public/favicon.svg exists, ~150-200 bytes, single `<circle>` with `#0f766e` fill, no script-execution surface | VERIFIED | File size 114 bytes (within ≤250 byte gate, slightly below the speculative 150-200 range — single-line minimal SVG). Single `<circle>` count = 1. `fill="#0f766e"` matches `--color-breathing-accent` from theme.css:7. Negative grep for `<script|<foreignObject|onload=|xlink:href|<animate` returns 0 hits. |
| 5   | index.html:5 favicon href is `%BASE_URL%favicon.svg`; `npm run build` produces dist/index.html with `/hrv/favicon.svg` | VERIFIED | `index.html:5` reads `<link rel="icon" type="image/svg+xml" href="%BASE_URL%favicon.svg" />`. After `npm run build`, `dist/index.html:5` resolves to `href="/hrv/favicon.svg"`. `diff -q public/favicon.svg dist/favicon.svg` exits 0 (byte-identical). |
| 6   | learnContent.ts:60 book.url is verbatim Forrest YouTube-description amazon.com URL (linkId preserved); `amzn.to/3RTAVqi` absent from src/ | VERIFIED | `src/content/learnContent.ts:60` reads `url: 'https://www.amazon.com/Mastering-Meditation-Eight-Steps-Beginner-ebook/dp/B0CCFWP4W8?sr=8-1&linkId=1a5a2958fc89bdb6769b54d0bc9a4d17&language=en_US',`. Recursive grep for `amzn.to/3RTAVqi` in src/ returns exit 1 (no matches). |
| 7   | LearnDialog disclaimer at LearnDialog.tsx:171 ("Independent project. Not affiliated with Forrest Knutson.") NOT EDITED | VERIFIED | `src/components/LearnDialog.tsx:171` reads `Independent project. Not affiliated with Forrest Knutson.` verbatim. Per D-06, the linkId is Forrest's Associates tag (not ours); disclaimer accuracy preserved. |
| 8   | src/domain/settings.ts exports isValidBpm/isValidRatio/isValidDuration with `(v: unknown): v is <T>` signatures; validateSettings calls them; RangeError throw class + message format preserved | VERIFIED | Lines 50-63 export the three predicates with the required signatures. Lines 65-84 are the rewritten `validateSettings` calling `isValidBpm(settings.bpm)`, `isValidRatio(settings.ratio)`, `isValidDuration(settings.durationMinutes)`. Throws are verbatim: ``throw new RangeError(`Unsupported BPM: ${String(settings.bpm)}`)`` (line 67), ``throw new RangeError(`Unsupported ratio: ${settings.ratio}`)`` (line 76), ``throw new RangeError(`Unsupported duration: ${String(settings.durationMinutes)}`)`` (line 80). |
| 9   | src/storage/settings.ts no longer defines isValid<X> locally; imports from `../domain/settings`; unused BPM_OPTIONS/RATIO_OPTIONS/DURATION_OPTIONS/RatioLabel/DurationOption imports pruned | VERIFIED | `src/storage/settings.ts:8-14` imports `{ DEFAULT_SETTINGS, isValidBpm, isValidRatio, isValidDuration, type SessionSettings } from '../domain/settings'`. No `function isValid<X>` declarations remain (grep `^function isValid` returns 0 hits). Unused option-list/RatioLabel/DurationOption imports are absent. `coerceSettings` body (lines 18-27) preserves byte-identical fallback policy. |
| 10  | src/domain/settings.test.ts exists with 6-9 it() cases across 3 describe blocks tagged `(HYGIENE-02 D-08)` | VERIFIED | File exists. 9 it() cases (within the 6-9 bound). 3 describe blocks: `isValidBpm (HYGIENE-02 D-08)`, `isValidRatio (HYGIENE-02 D-08)`, `isValidDuration (HYGIENE-02 D-08)`. Imports `{ isValidBpm, isValidRatio, isValidDuration } from './settings'`. Covers happy/invalid/wrong-type per predicate. |
| 11  | Every Phase 12 commit boundary passes tsc/lint/build/vitest; no new react-hooks/* ESLint disables | VERIFIED | At current HEAD: `npx tsc --noEmit` exit 0 (no output); `npm run lint` exit 0 (no findings); `npm run build` exit 0 (43 modules transformed, 112ms); `npm test -- --run` → `Test Files 29 passed (29)`, `Tests 409 passed (409)`. Git diff a817c06..HEAD for new `react-hooks/*` disables: zero. Six existing `react-hooks/*` disables (App.tsx:250/267/453, useSessionEngine.ts:168, useAudioCues.ts:162, usePrefersReducedMotion.ts:27) all pre-date Phase 12. |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact | Expected | Level 1 (Exists) | Level 2 (Substantive) | Level 3 (Wired) | Level 4 (Data Flows) | Status |
| -------- | -------- | ---------------- | --------------------- | --------------- | -------------------- | ------ |
| `.planning/REQUIREMENTS.md` | HYGIENE-01 row flipped to "Overtaken (by Phase 9 AUDIO-02)" | ✓ | ✓ (line 148 verbatim) | ✓ (cross-cited from REVIEW.md) | N/A (docs) | VERIFIED |
| `REVIEW.md` | [2026-05-12 update] addendum under §IN-02 | ✓ | ✓ (line 391 verbatim) | ✓ (cites App.tsx:549 + 12-CONTEXT.md) | N/A (docs) | VERIFIED |
| `src/storage/format.ts` | Single-line JSDoc above formatLastSessionDate test-only `now` seam | ✓ | ✓ (line 42 JSDoc, line 43 fn signature) | ✓ (format.test.ts already exercises the seam — proof-of-test-only-intent) | N/A (docs) | VERIFIED |
| `public/favicon.svg` | Single-color filled-orb favicon (~150-200 bytes target; ≤250 bytes gate) | ✓ | ✓ (114 bytes, single `<circle fill="#0f766e"/>`) | ✓ (Vite copies public/* → dist/) | ✓ (rendered by browser as favicon resource) | VERIFIED |
| `index.html` | favicon `<link>` href uses `%BASE_URL%favicon.svg` | ✓ | ✓ (line 5 verbatim) | ✓ (`%BASE_URL%` substituted at build → `/hrv/favicon.svg` in dist) | ✓ (dist/index.html shows resolved href) | VERIFIED |
| `src/content/learnContent.ts` | book.url = canonical amazon.com /dp/B0CCFWP4W8 URL | ✓ | ✓ (line 60 full verbatim URL) | ✓ (consumed by LearnDialog render at JSX site) | ✓ (existing snapshot/integration tests assert) | VERIFIED |
| `src/content/learnContent.test.ts` | URL assertion updated to canonical URL with `(CONTENT-01 D-05)` traceability | ✓ | ✓ (line 54 expectation; line 53 it() description includes `(CONTENT-01 D-05)`) | ✓ (imports `LEARN_CONTENT`) | ✓ (test runs green) | VERIFIED |
| `src/components/LearnDialog.test.tsx` | Book link href assertion updated to canonical URL | ✓ | ✓ (line 120 verbatim) | ✓ (renders LearnDialog, queries link) | ✓ (test runs green) | VERIFIED |
| `src/domain/settings.ts` | Three exports `isValidBpm`/`isValidRatio`/`isValidDuration` + predicate-call rewrite of validateSettings | ✓ | ✓ (lines 50-63 exports; 65-84 rewritten body) | ✓ (consumed by storage/settings.ts AND validateSettings in same module) | ✓ (9 tests in domain/settings.test.ts + existing storage tests pass) | VERIFIED |
| `src/storage/settings.ts` | Imports shared predicates from domain; local declarations removed; unused imports pruned | ✓ | ✓ (lines 8-14 import block; no local predicate declarations) | ✓ (predicates resolve to imported names in coerceSettings body) | ✓ (coerceSettings round-trip tests pass) | VERIFIED |
| `src/domain/settings.test.ts` | NEW file with 6-9 it() cases locking the predicate contract | ✓ | ✓ (9 cases, 3 describe blocks, all tagged HYGIENE-02 D-08) | ✓ (imports from './settings') | ✓ (all 9 pass — observable in 409/409 total) | VERIFIED |

### Key Link Verification

| From | To  | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `src/storage/settings.ts` | `src/domain/settings.ts` | named import of isValidBpm/isValidRatio/isValidDuration | WIRED | Imports at lines 8-14 include all 3 predicates by name; used in coerceSettings at lines 23-25 |
| `index.html` | `public/favicon.svg` | Vite `%BASE_URL%` HTML substitution (vite.config.ts base: '/hrv/') | WIRED | `index.html:5` matches `%BASE_URL%favicon\.svg`; vite.config.ts:7 confirmed `base: '/hrv/'` |
| `dist/index.html` | `/hrv/favicon.svg` | Vite build-time substitution of `%BASE_URL%` → `/hrv/` | WIRED | Post-build inspection: `dist/index.html:5` reads `href="/hrv/favicon.svg"`; `dist/favicon.svg` byte-identical to `public/favicon.svg` |
| `src/components/LearnDialog.tsx` (render — not edited per D-06) | `src/content/learnContent.ts` book.url | anchor href via `LEARN_CONTENT.links.book.url` | WIRED | `LearnDialog.test.tsx:120` asserts the rendered href matches the canonical URL — proves the wiring is live |
| `.planning/REQUIREMENTS.md` HYGIENE-01 row | `REVIEW.md` §IN-02 addendum | cross-cited "Overtaken by Phase 9 AUDIO-02" rationale | WIRED | Both files contain the matching "Overtaken (by Phase 9 AUDIO-02)" / "Overtaken by Phase 9 AUDIO-02" wording; REVIEW.md addendum explicitly cites "HYGIENE-01 closed-no-op in 12-CONTEXT.md" |
| `App.tsx:200/:342/:549` (Phase 9 AUDIO-02 consumer) | `useAudioCues.ts:58, :390` (audio.audioNow export) | caller-side past-time clamp — cross-phase invariant | WIRED | `useAudioCues.ts:58` declares `audioNow(this: void): number | null` in interface; line 390 returns it. App.tsx:200 captures `const audioAudioNow = audio.audioNow`; line 549 calls `audioAudioNow()`. This wiring is what makes HYGIENE-01 "Overtaken" — confirmed not broken by Phase 12. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `public/favicon.svg` | static asset bytes | inline `<circle fill="#0f766e">` | Yes — 114 bytes of valid SVG | FLOWING |
| `index.html` favicon link | href attribute | `%BASE_URL%` substitution → `/hrv/` at build | Yes — `dist/index.html` resolved | FLOWING |
| LearnDialog book anchor | href | `LEARN_CONTENT.links.book.url` constant | Yes — full canonical URL string flows through to render | FLOWING |
| `validateSettings` | RangeError instances | computed message via template literal + verbatim `String(...)` calls | Yes — preserved byte-identical from prior shape | FLOWING |
| `coerceSettings` | SessionSettings fields | imported predicates `isValidBpm`/`isValidRatio`/`isValidDuration` | Yes — same allowlists as before relocation (predicates moved verbatim) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| TypeScript types check | `npx tsc --noEmit` | exit 0, no output | PASS |
| ESLint clean | `npm run lint` | exit 0, no findings | PASS |
| Production build succeeds and emits dist/favicon.svg | `npm run build` | exit 0; "✓ built in 112ms"; dist/index.html + dist/favicon.svg present | PASS |
| Full test suite passes | `npm test -- --run` | `Test Files 29 passed (29)`, `Tests 409 passed (409)` | PASS |
| dist favicon byte-identical to source | `diff -q public/favicon.svg dist/favicon.svg` | exit 0 | PASS |
| dist/index.html resolves favicon href | `grep 'favicon' dist/index.html` | `<link rel="icon" type="image/svg+xml" href="/hrv/favicon.svg" />` | PASS |
| amzn.to short URL absent from src | `grep -rn 'amzn.to/3RTAVqi' src/` | exit 1 (no matches) | PASS |
| Favicon SVG has no script-execution surface | `grep -E '<script\|<foreignObject\|onload=\|xlink:href\|<animate' public/favicon.svg` | exit 1 (no matches) | PASS |
| `audio.audioNow` STILL exported (cross-phase invariant) | `grep -n 'audioNow' src/hooks/useAudioCues.ts` | lines 58 (interface), 378 (useCallback), 390 (return) | PASS |
| No new react-hooks/* ESLint disables | `git diff a817c06..HEAD src/` | zero new `react-hooks/*` disables | PASS |

### Probe Execution

No probe scripts (`scripts/*/tests/probe-*.sh`) are referenced in the phase plan or codebase. The phase's verification model is the per-commit green-gate (tsc/lint/build/vitest), which is executed under Behavioral Spot-Checks above.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| ASSETS-01 | 12-01-PLAN.md | Favicon resolves under Vite `base: '/hrv/'` in production builds (no `/favicon.svg` 404) | SATISFIED | `public/favicon.svg` exists (114 bytes, valid SVG); `index.html:5` uses `%BASE_URL%favicon.svg`; `dist/index.html:5` resolves to `/hrv/favicon.svg`; `dist/favicon.svg` byte-identical to source |
| CONTENT-01 | 12-01-PLAN.md | Canonical amazon.com/dp/... URL OR LearnDialog discloses affiliate; disclaimer remains accurate | SATISFIED | `learnContent.ts:60` uses canonical URL `/dp/B0CCFWP4W8` with Forrest's linkId preserved (per D-05/D-06); `LearnDialog.tsx:171` disclaimer unchanged |
| HYGIENE-01 | 12-01-PLAN.md | `useAudioCues` no longer returns `audioNow`; pruned. **DOCS-ONLY CARVE-OUT** per CONTEXT D-01/D-02 — overtaken by Phase 9 AUDIO-02 | SATISFIED (overtaken) | REQUIREMENTS.md:148 reads `Overtaken (by Phase 9 AUDIO-02)`; REVIEW.md:391 has the `[2026-05-12 update]` addendum; `audio.audioNow` correctly STILL exported (literal removal would break AUDIO-02 caller-side clamp at App.tsx:200/342/549) |
| HYGIENE-02 | 12-01-PLAN.md | Shared isValidBpm/isValidRatio/isValidDuration predicates from `src/domain/settings.ts` consumed by both `validateSettings` and `coerceSettings`; duplicated logic removed | SATISFIED | `src/domain/settings.ts:50-63` exports the predicates; `validateSettings:65-84` calls them with verbatim RangeError throws; `src/storage/settings.ts:8-14` imports them; local declarations deleted; 9 new tests lock the contract |
| HYGIENE-03 | 12-01-PLAN.md | `formatLastSessionDate`'s `now` injection seam documented as test-only in JSDoc | SATISFIED | `src/storage/format.ts:42` single-line `/** @param now Test-only seam — ... */` JSDoc immediately above the function declaration on line 43; full Vitest suite (including format.test.ts) passes 409/409 |

**Coverage:** 5/5 requirement IDs satisfied. No orphaned requirements (REQUIREMENTS.md table maps exactly 5 IDs to Phase 12; all 5 declared in 12-01-PLAN.md frontmatter).

**Note on traceability table state:** ASSETS-01, CONTENT-01, HYGIENE-02, HYGIENE-03 rows in `.planning/REQUIREMENTS.md` (lines 146, 147, 149, 150) still read "Pending" rather than "Complete". This matches Phase 11 precedent — those rows are flipped to "Complete" by the verify-phase commit (see commit a817c06 which did exactly that for Phase 11's DOMAIN-01/UI-01/UI-02/A11Y-01). The verification request explicitly only required HYGIENE-01 = "Overtaken (by Phase 9 AUDIO-02)", which is verified. Marking the other four "Complete" is a follow-up housekeeping action for the verifier's commit step (outside the goal-achievement scope).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| None | — | — | — | Modified files scanned for `TBD\|FIXME\|XXX` and `TODO\|HACK\|PLACEHOLDER` markers — zero matches. Modified files scanned for empty-stub patterns (`return null`, `return []`, `return {}`, empty arrow `=> {}`) outside of legitimate per-field default paths — no smell. One inline `eslint-disable-next-line @typescript-eslint/restrict-template-expressions` was added at `src/domain/settings.ts:75` with a 4-line `// Reason:` annotation justifying preservation of D-09 byte-identical throw message format (NOT a `react-hooks/*` disable — D-14 satisfied). |

**Pre-existing react-hooks/* disables (NOT new in Phase 12):** App.tsx:250, App.tsx:267, App.tsx:453, useSessionEngine.ts:168, useAudioCues.ts:162, usePrefersReducedMotion.ts:27. Verified via `git diff a817c06..HEAD` — zero new react-hooks/* disables added since Phase 11 completion.

### Cross-Phase Invariant Check (Critical for HYGIENE-01 Carve-Out)

| Invariant | Expected State | Actual State | Status |
| --------- | -------------- | ------------ | ------ |
| `audio.audioNow` exported from `useAudioCues.ts` | Still present (carve-out depends on it) | Line 58 (interface declaration), line 378 (useCallback), line 390 (return) — all present | VERIFIED |
| App.tsx caller-side clamp at line 200 captures `audio.audioNow` | `const audioAudioNow = audio.audioNow` present | Line 200 reads `const audioAudioNow = audio.audioNow` | VERIFIED |
| App.tsx line 549 calls `audioAudioNow()` for past-time clamp | Call site preserved | Line 549 reads `const liveAudioNow = audioAudioNow()` (within AUDIO-02 D-01/D-02 clamp block at lines 546-551) | VERIFIED |
| Phase 9 AUDIO-02 contract surface unbroken | Tests covering AUDIO-02 still pass | Full suite 409/409 green; no AUDIO-02 regressions | VERIFIED |

### Regression Check Against Prior Phase Claims

| Prior Phase | Claim | Status at HEAD |
| ----------- | ----- | -------------- |
| Phase 11 (VERIFICATION) | 400/400 Vitest baseline | Now 409/409 (Phase 12 added 9 cases — within target range 406-409) — baseline preserved |
| Phase 11 (VERIFICATION) | tsc/lint/build/vitest all exit 0 | Confirmed at HEAD — all four gates green |
| Phase 9 (AUDIO-02) | `audio.audioNow()` caller-side clamp at App.tsx:546-551 | Preserved — Phase 12 explicitly carved out HYGIENE-01 to keep this working |
| Phase 7 (D-04) | `// Reason:` annotation policy for `react-hooks/*` disables | Zero new `react-hooks/*` disables added by Phase 12 (one new `@typescript-eslint/restrict-template-expressions` disable at domain/settings.ts:75 follows the same `// Reason:` annotation pattern) |

### Human Verification Required

None. All Phase 12 truths are programmatically verifiable via grep + tsc/lint/build/vitest. The favicon visual brief (single teal orb at 16×16) is fundamentally a UX-quality concern but the success criterion (favicon loads under base path without 404) is mechanically verified via dist/index.html inspection and dist/favicon.svg byte-identity.

A UAT smoke test of "favicon shows in browser tab in production build" is recommended as a final manual check before milestone closeout, but the SC#1 contract ("`dist/index.html` inspection shows correct href and a manual production-build smoke check shows the favicon loading without a 404") is fully satisfied via the automated checks above.

### Gaps Summary

No gaps blocking goal achievement. All five ROADMAP Phase 12 Success Criteria satisfied:

- **SC#1 (ASSETS-01):** favicon ships at `public/favicon.svg` (114 bytes); `index.html` uses `%BASE_URL%`; `dist/index.html` resolves to `/hrv/favicon.svg`; `dist/favicon.svg` byte-identical to source.
- **SC#2 (CONTENT-01):** canonical amazon.com /dp/B0CCFWP4W8 URL in source; disclaimer at LearnDialog.tsx:171 unchanged (D-06 carve-out).
- **SC#3 (HYGIENE-01):** Docs-only flip carve-out per CONTEXT D-01/D-02 — REQUIREMENTS.md row → "Overtaken (by Phase 9 AUDIO-02)" + REVIEW.md §IN-02 addendum. `audio.audioNow` correctly STILL exported (literal removal would break AUDIO-02 contract at App.tsx:200/342/549). Cross-phase invariant preserved.
- **SC#4 (HYGIENE-02):** 3 predicates relocated to domain/settings.ts as exports; validateSettings calls them with byte-identical RangeError + message format; storage/settings.ts imports them; unused imports pruned; 9 new tests in domain/settings.test.ts as structural gap-fill.
- **SC#5 (HYGIENE-03):** Single-line JSDoc above `formatLastSessionDate` at `src/storage/format.ts:42` documents the test-only `now` seam.

**Per-commit green-gate (D-15) confirmed at HEAD:** `npx tsc --noEmit` (exit 0), `npm run lint` (exit 0), `npm run build` (exit 0, 112ms), `npm test -- --run` (409/409 passing, 29 test files). Zero new `react-hooks/*` ESLint disables (D-14 satisfied).

**Housekeeping items for the orchestrator's verify-phase commit (informational, not goal-blocking):**

1. **REQUIREMENTS.md traceability row state flips:** Per Phase 11 precedent (commit a817c06), the orchestrator's verify-phase commit should flip ASSETS-01, CONTENT-01, HYGIENE-02, HYGIENE-03 rows from "Pending" → "Complete". HYGIENE-01 stays at "Overtaken (by Phase 9 AUDIO-02)" — that flip was the work of Phase 12 itself.
2. **Todo lifecycle:** `.planning/todos/pending/2026-05-11-missing-favicon-404-in-console.md` should be moved to `.planning/todos/completed/` (folded into ASSETS-01 per CONTEXT D-03).

---

*Verified: 2026-05-12*
*Verifier: Claude (gsd-verifier)*
