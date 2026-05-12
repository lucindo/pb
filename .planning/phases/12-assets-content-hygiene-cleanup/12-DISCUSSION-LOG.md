# Phase 12: Assets, Content & Hygiene Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-12
**Phase:** 12-assets-content-hygiene-cleanup
**Areas discussed:** HYGIENE-01 stale finding, ASSETS-01 favicon scope, CONTENT-01 amzn.to policy, HYGIENE-02 predicate API, Plan packaging

---

## Area selection

| Option | Description | Selected |
|--------|-------------|----------|
| HYGIENE-01 stale finding | REVIEW.md says remove `audio.audioNow` (IN-02). Phase 9 AUDIO-02 introduced a consumer at App.tsx:200,549. Removing it breaks AUDIO-02. | ✓ |
| ASSETS-01 favicon scope | Path fix is one-line. `public/favicon.svg` doesn't exist — path fix alone still 404s. | ✓ |
| CONTENT-01 amzn.to policy | `amzn.to/3RTAVqi` is opaque. Disclaimer says "Not affiliated with Forrest Knutson". | ✓ |
| HYGIENE-02 predicate API | Extract `isValidBpm/Ratio/Duration` from storage to domain. Signature shape choice. | ✓ |

**User's choice:** All four selected.

---

## HYGIENE-01 stale finding

| Option | Description | Selected |
|--------|-------------|----------|
| (a) Drop HYGIENE-01 — document REVIEW.md drift | Smallest diff. Keep `audioNow`; mark HYGIENE-01 as overtaken by Phase 9 AUDIO-02. Zero code change. | ✓ |
| (b) Refactor clamp → engine/hook so audioNow can still be removed | Move `Math.max` clamp into a new hook method. Larger surface change; risks regressing AUDIO-02 boundary-clamp tests. | |
| (c) Keep audioNow + rewrite docstring + narrow return type | Tighten JSDoc to cite AUDIO-02/AUDIO-03 as consumers. Doc-fix-only. | |

**User's choice:** (a) Drop HYGIENE-01.

### Drift documentation

| Option | Description | Selected |
|--------|-------------|----------|
| REQUIREMENTS.md only — mark Overtaken | Single source of truth. New status value 'Overtaken' in traceability. REVIEW.md untouched (frozen snapshot). | |
| REQUIREMENTS.md + REVIEW.md addendum line | Same as (a) PLUS one-line `[2026-05-12 update]` note under IN-02 in REVIEW.md. Self-explanatory for future readers. | ✓ |
| CONTEXT.md only | Document the no-op decision only in 12-CONTEXT.md. Risks confusing the milestone audit. | |

**User's choice:** REQUIREMENTS.md + REVIEW.md addendum line.
**Notes:** Captured as D-01 + D-02. REVIEW.md addendum makes the cross-phase reality discoverable from the original review document.

---

## ASSETS-01 favicon scope

| Option | Description | Selected |
|--------|-------------|----------|
| (a) Ship `public/favicon.svg` + `%BASE_URL%favicon.svg` path | Closes ASSETS-01 fully. Generate small HRV-themed SVG (~1KB). Subsumes the favicon todo. | ✓ |
| (b) Path fix only, asset deferred to v1.x | Production 404 persists. Doesn't satisfy success criterion "favicon loading without a 404". | |
| (c) Remove the `<link rel=icon>` tag entirely | No icon, no 404, no asset. Loses brand presence. | |

**User's choice:** (a) Ship asset + path fix.

### Favicon SVG design

| Option | Description | Selected |
|--------|-------------|----------|
| (a) Filled teal orb — mirrors BreathingShape resting state | Solid circle in `--color-breathing-accent`. Most recognizable at 16×16. ~200 bytes. | ✓ |
| (b) Two concentric rings — inhale/exhale ratio glyph | More app-specific but rings disappear at 16×16. ~400 bytes. | |
| (c) Letter mark 'H' or 'HRV' | Typographic. Disconnected from in-app orb visual. | |
| (d) Placeholder — decide later | Skip the design call now; ship temporary teal orb. | |

**User's choice:** (a) Filled teal orb.
**Notes:** Captured as D-03 + D-04. Planner picks the literal hex matching `--color-breathing-accent` from Tailwind theme (CSS vars don't apply inside an external SVG).

---

## CONTENT-01 amzn.to policy

| Option | Description | Selected |
|--------|-------------|----------|
| (a) Replace with canonical `amazon.com/dp/...` — no disclaimer change | Resolve `amzn.to/3RTAVqi` → canonical product page. Hover-preview becomes honest. | ✓ |
| (b) Keep `amzn.to` + add affiliate disclosure to LearnDialog footer | Add "Book link uses Amazon affiliate code" sentence. Touches LearnDialog.tsx. | |
| (c) Drop the book link entirely | Remove from learnContent.ts. Loses curated reference. | |

**User's choice:** (a) Replace with canonical URL.

### URL timing

| Option | Description | Selected |
|--------|-------------|----------|
| Supply now | User pastes the bare URL during this discussion. | ✓ (free-text) |
| Note as planning prerequisite | CONTEXT.md marks the URL as a TODO; planner pauses to ask. | |

**User's choice:** Pasted `https://www.amazon.com/Mastering-Meditation-Eight-Steps-Beginner-ebook/dp/B0CCFWP4W8?sr=8-1&linkId=1a5a2958fc89bdb6769b54d0bc9a4d17&language=en_US` (the link Forrest uses on his video descriptions).

### URL canonical form

| Option | Description | Selected |
|--------|-------------|----------|
| Strip to title-slug + ASIN | Drop linkId/sr/language. Hover honest, no affiliate code. | |
| Bare /dp/ASIN | Shortest canonical. | |
| Keep URL verbatim | Preserves Forrest's verbatim public link with his Associates tag. | ✓ (free-text) |

**User's choice:** Keep verbatim — "this is the link Forrest uses on his videos description".
**Notes:** Captured as D-05 + D-06. The `linkId` is Forrest's own Amazon Associates tag (his revenue, his public link). The disclaimer's scope is us-vs-Forrest, not us-vs-Amazon link routing — preserved without change. CONTENT-01 success criterion still satisfied: URL is canonical `amazon.com/dp/...` form (no longer the opaque `amzn.to` short-URL).

---

## HYGIENE-02 predicate API

| Option | Description | Selected |
|--------|-------------|----------|
| (a) Single `(v: unknown)` type-narrowing predicate | One predicate per field with `(v: unknown): v is <DomainType>`. Smallest surface. | ✓ |
| (b) Two-fn variants — typed for domain, unknown for storage | Doubles export surface for low abstraction value. | |
| (c) Single `(v: number \| unknown)` via overload | TypeScript function overloads. Fiddly to maintain. | |

**User's choice:** (a) Single `(v: unknown)` predicate.

### Predicate test geography

| Option | Description | Selected |
|--------|-------------|----------|
| (a) EXTEND `src/domain/settings.test.ts` | Co-locate per Phase 9/10/11 pattern. | ✓ |
| (b) NEW `src/domain/predicates.test.ts` | Splits tests across two files if settings.test.ts exists. | |
| (c) EXTEND both storage and domain test files | Risks duplication and drift. | |

**User's choice:** (a) Domain test geography.
**Notes:** Captured as D-08 + D-09 + D-10. Verified `src/domain/settings.test.ts` does NOT exist — option (a) becomes a NEW file under the structural-gap-fill exception (Phase 10 D-20 / Phase 11 D-06 precedent). Existing `src/storage/settings.test.ts` covers `coerceSettings` round-trip and is unchanged.

---

## Plan packaging

| Option | Description | Selected |
|--------|-------------|----------|
| (a) Single plan / single wave / 4 task groups | Mirrors Phase 11 D-13. Files don't overlap. Smallest review surface. | ✓ |
| (b) Two plans — code (assets/content/hygiene-02/03) + docs (hygiene-01) | Marginal separation value. | |
| (c) One plan per REQ-ID — 5 plans | Maximum granularity. No risk-reduction gain. | |

**User's choice:** (a) Single plan / single wave.
**Notes:** Captured as D-12 + D-13. Five task groups (HYGIENE-01 docs, HYGIENE-03 JSDoc, ASSETS-01, CONTENT-01, HYGIENE-02) ordered risk-ascending; per-commit green-gate per Phase 7 D-09 / Phase 11 D-17.

---

## Claude's Discretion

- HYGIENE-03 JSDoc wording (D-11) — single sentence, planner picks final phrasing.
- Favicon SVG hex literal (D-03) — planner picks the literal value matching the resolved `--color-breathing-accent` from Tailwind theme.
- HYGIENE-02 predicate test case shape (D-10) — planner picks final cases within the suggested ~6-9 range.
- Task ordering within the single plan (D-13) — planner final, recommended starting point provided.

## Deferred Ideas

- Refactor caller-side clamp into engine/hook to remove `audioNow` (HYGIENE-01 option b) — re-evaluate in v1.1+ if hook-internal clamp becomes natural alongside other audio-engine work.
- Two-fn / overload predicate API variants (HYGIENE-02 options b/c) — kept as-is; revisit if domain-vs-storage type-narrowing concerns ever diverge.
- Two-ring or letter-mark favicon designs (ASSETS-01 options b/c) — re-evaluate in v1.1 with the Appearance/Themes umbrella (CUST-01/CUST-03).
- Drop the "Mastering Meditation" book link (CONTENT-01 option c) — rejected; user-facing content removal violates "no user-facing features".
- Add affiliate-disclosure copy to LearnDialog footer (CONTENT-01 option b) — rejected once URL confirmed as Forrest's own Associates tag.
- Strip linkId/sr/language tracking params from Amazon URL — rejected; user confirmed verbatim URL matches Forrest's public source-of-truth.
- Multiple plans for Phase 12 (options b/c) — rejected per D-12; files don't overlap.
- Shared predicates in storage instead of domain — rejected; domain owns the OPTIONS arrays, inverting the dependency would create a cycle.
- Reduced-motion BreathingShape boundary cue todo — tangential to Phase 12; stays in v1.x backlog.
- Favicon 404 todo — FOLDED into ASSETS-01; will move to `.planning/todos/completed/` after phase ships.
