---
phase: 12-assets-content-hygiene-cleanup
created: 2026-05-12
milestone: v1.0.1
requirements:
  - ASSETS-01
  - CONTENT-01
  - HYGIENE-01
  - HYGIENE-02
  - HYGIENE-03
---

# Phase 12 Context: Assets, Content & Hygiene Cleanup

<domain>
Ship the four non-behavioural cleanup items from the v1.0 deep review plus one docs-only "overtaken" reconciliation. Lives in `index.html` + new `public/favicon.svg` (ASSETS-01), `src/content/learnContent.ts` (CONTENT-01), `src/domain/settings.ts` + `src/storage/settings.ts` + new `src/domain/settings.test.ts` (HYGIENE-02), `src/storage/format.ts` (HYGIENE-03 JSDoc), and `.planning/REQUIREMENTS.md` + `REVIEW.md` (HYGIENE-01 docs-only row flip — overtaken by Phase 9 AUDIO-02). Single plan, single wave, five task groups; files do not overlap. Fix-only patch — no new user-facing features beyond the favicon asset itself materializing. Last phase of milestone v1.0.1.
</domain>

<decisions>

### HYGIENE-01 — overtaken by Phase 9 AUDIO-02 (docs-only)

- **D-01:** HYGIENE-01 status flipped from `Pending` → `Overtaken` in `.planning/REQUIREMENTS.md` traceability table. Reason: REVIEW.md §IN-02 said `audio.audioNow` is unread by `App.tsx` and recommended removing it from the hook return tuple. Phase 9 AUDIO-02 then introduced a caller-side clamp at `src/app/App.tsx:200` (`const audioAudioNow = audio.audioNow`) and `:549` (`const liveAudioNow = audioAudioNow()`) using exactly that surface to compute `Math.max(audioTime, liveAudioNow + SAFE_LEAD_SEC)` for the post-resume past-time clamp. Removing `audioNow` now would BREAK the AUDIO-02 contract that shipped two phases ago. Zero code change for HYGIENE-01 in Phase 12. Chosen over (b) refactor the clamp into the engine/hook so audioNow can still be removed (touches AUDIO-02 contract surface for a docs-only finding — risk/reward inverted) and (c) keep audioNow + rewrite docstring + narrow return type (doc-fix-only that doesn't reflect the cross-phase reality).

- **D-02:** REVIEW.md gets a one-line `[2026-05-12 update]` addendum line under §IN-02 noting it was overtaken by Phase 9 AUDIO-02. Keeps REVIEW.md self-explanatory for any future reader without rewriting the frozen 2026-05-11 snapshot. Combined with D-01 row-flip in REQUIREMENTS.md so the milestone audit cannot misread HYGIENE-01 as unfinished work.

### ASSETS-01 — ship favicon asset + base-path fix

- **D-03:** NEW file `public/favicon.svg` — filled teal orb in `--color-breathing-accent` (`#0d9488` or the equivalent hardcoded hex; CSS custom properties do NOT apply inside an external SVG loaded as a favicon — the planner picks the literal value matching the resolved `--color-breathing-accent` from the Tailwind theme). Single-color `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#0d9488"/></svg>` shape, ~150-200 bytes. Mirrors the BreathingShape resting state (recognizable HRV brand glyph at 16×16). Subsumes the favicon todo at `.planning/todos/pending/2026-05-11-missing-favicon-404-in-console.md` (the todo file moves to `.planning/todos/completed/` after Phase 12 ships). Chosen over (b) two concentric ratio rings (rings disappear at 16×16) and (c) letter mark `H`/`HRV` (visually disconnected from the in-app orb).

- **D-04:** `index.html:5` favicon href — `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` → `<link rel="icon" type="image/svg+xml" href="%BASE_URL%favicon.svg" />`. Chosen over `./favicon.svg` because `%BASE_URL%` is the documented Vite HTML substitution that survives any future `base` change in `vite.config.ts:7` (currently `'/hrv/'`). Same posture as the default Vite index.html template. Production `dist/index.html` will resolve to `<link ... href="/hrv/favicon.svg" />` after Vite builds.

### CONTENT-01 — replace amzn.to with Forrest's verbatim Amazon URL

- **D-05:** `src/content/learnContent.ts:60` — `url: 'https://amzn.to/3RTAVqi'` → `url: 'https://www.amazon.com/Mastering-Meditation-Eight-Steps-Beginner-ebook/dp/B0CCFWP4W8?sr=8-1&linkId=1a5a2958fc89bdb6769b54d0bc9a4d17&language=en_US'`. The replacement URL is verbatim the link Forrest Knutson uses on his own YouTube video descriptions for this book. IN-07's opaque-short-URL concern is closed: hover-preview now shows the full `amazon.com/...` domain plus the `/dp/B0CCFWP4W8` canonical product path. Chosen over (a-strip) stripping the `linkId`/`sr`/`language` query params because they are Forrest's own Amazon Associates tracking — preserving them matches his public source-of-truth and reflects how he chooses to share the book.

- **D-06:** `src/components/LearnDialog.tsx:171` disclaimer text NOT EDITED. "Independent project. Not affiliated with Forrest Knutson." remains accurate because (a) the `linkId` is Forrest's OWN Amazon Associates tag (his revenue, not ours), (b) the disclaimer's scope is "us-vs-Forrest" affiliation, not "us-vs-Amazon" link routing, and (c) the app has zero financial relationship with either Forrest or Amazon. Chosen over option (b) (add affiliate-disclosure copy to LearnDialog footer) — there is nothing on our side to disclose; Forrest's tag travels with the link he publicly shares.

- **D-07:** No new test geography for CONTENT-01. `learnContent.ts` is a frozen content asset; existing snapshot/integration tests (if any) update mechanically with the URL string change. Planner verifies no test currently asserts on the literal `amzn.to/3RTAVqi` URL string before the swap.

### HYGIENE-02 — shared predicates in `src/domain/settings.ts`

- **D-08:** Export `isValidBpm`, `isValidRatio`, `isValidDuration` from `src/domain/settings.ts` with single `(v: unknown): v is <DomainType>` signature each. Bodies are extracted verbatim from the existing private declarations at `src/storage/settings.ts:20-33` (which already use the right shape — `Number.isFinite` + `(<X>_OPTIONS as readonly <Type>[]).includes(v)` + `'open-ended'` short-circuit for duration). Chosen over (b) two-fn typed-vs-unknown variants (doubles export surface for low abstraction value) and (c) function overloads with type-narrowing predicates (notoriously fiddly, easy to misread). Single source of truth, smallest export surface.

- **D-09:** Consumer migration:
  - `src/domain/settings.ts:50-64` `validateSettings` — replace inline `.includes()` checks with predicate calls. Throw policy preserved verbatim: `if (!isValidBpm(settings.bpm)) throw new RangeError(`Unsupported BPM: ${String(settings.bpm)}`)` and parallel structure for ratio/duration. Throw class (`RangeError`) and message format unchanged so existing test expectations and caller catch sites are unaffected. The `(v: unknown)` predicate accepts already-typed `SessionSettings` fields cleanly (the type narrow is redundant on typed input but harmless).
  - `src/storage/settings.ts:20-33` — DELETE the three local `function isValid<X>(v: unknown)` declarations. Add `isValidBpm`, `isValidRatio`, `isValidDuration` to the existing `from '../domain/settings'` import block at lines 8-16. `coerceSettings` body at lines 35-44 is otherwise unchanged — fallback policy preserved.

- **D-10:** NEW test file `src/domain/settings.test.ts` (~6-9 cases). Locks the predicate contract at the domain layer where the predicates now live. Suggested case shape (planner final): `isValidBpm` (happy: `5.5` → true; invalid: `0`, `7.5`, `'5'`, `null`); `isValidRatio` (happy: `'40:60'` → true; invalid: `'40-60'`, `60`, `''`); `isValidDuration` (happy: `10`, `'open-ended'` → true; invalid: `7`, `'forever'`, `null`). Structural gap-fill — `src/domain/settings.ts` has no existing test file; same exception posture as Phase 10 D-20 (`useSessionEngine.test.ts`) and Phase 11 D-06 (`SessionReadout.test.tsx`). Existing `src/storage/settings.test.ts` covers `coerceSettings` round-trip and is unchanged (the predicates are now imported, not redeclared — no behaviour delta to test storage-side).

### HYGIENE-03 — JSDoc on `formatLastSessionDate` test-only seam

- **D-11:** Add a one-line JSDoc above `formatLastSessionDate` at `src/storage/format.ts:42`. Suggested wording (planner final): `/** @param now Test-only seam — production callers always omit this; tests pass a pinned `() => number` to drive the same-year vs other-year branch coverage in `format.test.ts`. */`. Zero code change. Existing `src/storage/format.test.ts` already exercises this seam — the doc just makes the test-only intent explicit so future readers don't add a production caller.

### Plan packaging

- **D-12:** Single plan, single wave, five task groups. Files do not overlap: HYGIENE-01 → docs only (`.planning/REQUIREMENTS.md` + `REVIEW.md`); ASSETS-01 → `index.html` + new `public/favicon.svg`; CONTENT-01 → `src/content/learnContent.ts`; HYGIENE-02 → `src/domain/settings.ts` + `src/storage/settings.ts` + new `src/domain/settings.test.ts`; HYGIENE-03 → `src/storage/format.ts` JSDoc only. Mirrors Phase 11 D-13 single-plan rationale for similarly trivial inter-locked fixes — review surface is small, no inter-task isolation gain from splitting. Chosen over (b) two plans (code + docs split) and (c) one plan per REQ (5 plans).

- **D-13:** Task ordering inside the plan (planner final, recommended starting point — risk-ascending): (1) HYGIENE-01 docs-only row-flip + REVIEW.md addendum (zero-code, lands first to close the misleading "Pending" status before any code edits); (2) HYGIENE-03 JSDoc one-liner (zero-behaviour, smallest possible code change); (3) ASSETS-01 favicon SVG + `index.html` `%BASE_URL%` swap (build-time-only delta, easy to verify via `dist/index.html` inspection); (4) CONTENT-01 URL swap (single-string content delta); (5) HYGIENE-02 predicate extraction + new test file + consumer migration (largest change — touches three source files; lands last so its test-suite delta lands on top of a known-green baseline). Each task commits independently with the per-commit green-gate per D-15.

### Carry-forward invariants

- **D-14:** Phase 7 D-04 — any new `// eslint-disable-next-line react-hooks/*` MUST carry a `// Reason:` annotation. Phase 12 should NOT introduce ANY new react-hooks disables (zero hook code touched). If one IS, annotate per Phase 7 D-04.

- **D-15:** Phase 7 D-09 / Phase 11 D-17 — every commit boundary inside Phase 12: `tsc --noEmit` exits 0, `npm run lint` exits 0, `npm run build` exits 0, full Vitest suite passes (400/400 post-Phase-11 baseline + ~6-9 new HYGIENE-02 cases → target ~406-409). A commit that breaks any is rolled back, not patched-forward.

- **D-16:** PROJECT.md milestone invariant — no user-facing behavior change. ASSETS-01: a 404 stops happening (network-log delta); the favicon glyph is technically a new visible asset, but ROADMAP.md §"Phase 12" Success Criterion 1 explicitly calls for the favicon to load in production — this is the intended outcome, not scope creep. CONTENT-01: hover-preview text changes (`amzn.to/3RTAVqi` → `amazon.com/.../dp/B0CCFWP4W8?...`); destination unchanged; same Amazon Associates code propagates either way (it was always Forrest's tag). HYGIENE-01: docs-only. HYGIENE-02: behaviour identical — same allowlists, same throw policy in `validateSettings`, same fallback policy in `coerceSettings`. HYGIENE-03: docs-only.

- **D-17:** Milestone closeout posture — Phase 12 is the LAST phase of v1.0.1. After verification + UAT, expect `/gsd-complete-milestone` to flip the milestone state, archive the milestone artifacts, and prepare for v1.1 (`/gsd-new-milestone`). Phase 12's plan SHOULD NOT pre-empt that flow (no premature archival edits, no v1.1 placeholder phases).

</decisions>

<canonical_refs>

**REQUIREMENTS / specs:**
- `.planning/REQUIREMENTS.md` §"Assets" (line 24) — ASSETS-01 source-of-truth, traces to `REVIEW.md` §CR-01.
- `.planning/REQUIREMENTS.md` §"Content" (line 88) — CONTENT-01 source-of-truth, traces to `REVIEW.md` §IN-07.
- `.planning/REQUIREMENTS.md` §"Hygiene" (lines 92-99) — HYGIENE-01 (traces §IN-02 — to be marked Overtaken per D-01), HYGIENE-02 (traces §IN-04), HYGIENE-03 (traces §IN-05).
- `.planning/REQUIREMENTS.md` traceability table (lines 122-152) — Phase 12 row HYGIENE-01 status flip per D-01.
- `REVIEW.md` (repo root, v1.0 full-codebase deep review, frozen 2026-05-11) — §CR-01 (favicon path, lines 74-85), §IN-02 (audioNow dead surface — to be addended `[2026-05-12 update]` per D-02, lines 385-389), §IN-04 (predicate duplication, lines 397-401), §IN-05 (`formatLastSessionDate` seam, lines 403-407), §IN-07 (amzn.to opacity, lines 415-419).

**Carry-forward CONTEXT files:**
- `.planning/phases/07-strict-type-lint-baseline/07-CONTEXT.md` — D-04 (`// Reason:` annotation policy for `react-hooks/*` disables, cited in D-14); D-09 (per-commit `tsc` / lint / build / Vitest gate, cited in D-15).
- `.planning/phases/09-audio-wake-lock-lifecycle-hardening/09-CONTEXT.md` — AUDIO-02 caller-side clamp introduction at App.tsx:546-551 — the consumer of `audio.audioNow` that makes HYGIENE-01 stale (foundational to D-01 / D-02).
- `.planning/phases/10-hooks-identity-effect-hygiene/10-CONTEXT.md` — D-20 (test-geography new-file exception for structural gap-fills, cited in D-10 for the new `domain/settings.test.ts`).
- `.planning/phases/11-domain-ui-contracts-accessibility/11-CONTEXT.md` — D-13 (single-plan packaging rationale for inter-locked small fixes, cited in D-12); D-17 (per-commit green-gate, cited in D-15); D-16 (test-geography co-location with EXCEPTION for new-file structural gap-fill, cited in D-10).

**Project-level:**
- `.planning/PROJECT.md` §"Current Milestone: v1.0.1 Code Review Patch" — "tests pass at v1.0 close — patch must not regress" invariant + "no user-facing features" constraint (cited in D-16); "Hygiene" target list explicitly includes the Phase 12 items.
- `.planning/ROADMAP.md` §"Phase 12: Assets, Content & Hygiene Cleanup" (lines 119-129) — Goal + Success Criteria 1..5; "Plans: TBD" closes here.
- `.planning/STATE.md` — Phase 11 closeout (400/400 Vitest baseline) + Phase 12 entry trigger.

**Source under edit:**
- `index.html:5` — favicon `<link>` href; D-04 swaps `/favicon.svg` → `%BASE_URL%favicon.svg`.
- `public/favicon.svg` — NEW file per D-03. Vite copies `public/*` to `dist/` verbatim under `base: '/hrv/'` resolution.
- `vite.config.ts:7` — `base: '/hrv/'`. NOT EDITED — referenced because `%BASE_URL%` substitution depends on this value.
- `src/content/learnContent.ts:60` — `book.url`. D-05 swaps the URL string only; no schema/type change.
- `src/components/LearnDialog.tsx:171` — disclaimer text. NOT EDITED per D-06.
- `src/domain/settings.ts:50-64` — `validateSettings` body rewritten to call shared predicates per D-09; new exports `isValidBpm`/`isValidRatio`/`isValidDuration` added before `validateSettings` per D-08.
- `src/storage/settings.ts:8-16` — import block; D-09 adds `isValidBpm`, `isValidRatio`, `isValidDuration` to the existing `from '../domain/settings'` import.
- `src/storage/settings.ts:20-33` — local predicate declarations DELETED per D-09; `coerceSettings` at lines 35-44 unchanged.
- `src/storage/format.ts:42` — JSDoc added above `formatLastSessionDate` per D-11.
- `.planning/REQUIREMENTS.md` (lines ~92-99 + traceability row at line 148) — HYGIENE-01 status `Pending` → `Overtaken` per D-01; one-line reason cell.
- `REVIEW.md` (line ~389, immediately after IN-02's "Fix:" paragraph) — append `[2026-05-12 update] Overtaken by Phase 9 AUDIO-02 — \`audio.audioNow()\` is the documented seam for the caller-side past-time clamp at App.tsx:549. HYGIENE-01 closed-no-op in 12-CONTEXT.md.` per D-02.

**Test files under edit:**
- NEW `src/domain/settings.test.ts` (~6-9 cases) per D-10. Structural gap-fill — same posture as Phase 10 `useSessionEngine.test.ts` and Phase 11 `SessionReadout.test.tsx`.
- `src/storage/settings.test.ts` — EXISTING. Likely no semantic change (predicates moved, not changed). Planner verifies no test currently imports the deleted local `isValid<X>` declarations directly (they appear to have been file-private — `function` not `export function`).
- `src/storage/format.test.ts` — EXISTING. NOT EDITED — already exercises the test-only seam D-11 documents.

**Reference patterns already in the codebase:**
- `src/storage/settings.ts:20-33` — existing `(v: unknown): v is <DomainType>` predicate shape. D-08 extracts these verbatim to the domain module — same signatures, same body, same `as readonly ...[]` assertions.
- `src/domain/settings.ts:51,55,59` — existing `(<X>_OPTIONS as readonly <Type>[]).includes(...)` allowlist check pattern. D-09 replaces the inline checks with predicate calls; allowlist source-of-truth (`BPM_OPTIONS`, `RATIO_OPTIONS`, `DURATION_OPTIONS`) unchanged.
- `.planning/phases/11-domain-ui-contracts-accessibility/11-CONTEXT.md` D-13 / D-14 / D-17 — single-plan + ordered-task-group + per-commit-green-gate package shape that D-12 / D-13 / D-15 mirror.
- `vite.config.ts:7` `base: '/hrv/'` + Vite's documented `%BASE_URL%` HTML substitution — D-04 reuses this verbatim, no plugin or build config change required.

</canonical_refs>

<code_context>

### Reusable Assets
- `BPM_OPTIONS`, `RATIO_OPTIONS`, `DURATION_OPTIONS`, `DurationOption`, `RatioLabel` already exported from `src/domain/settings.ts:1-42` — D-08 adds 3 new predicate exports alongside; no existing export changes.
- The exact predicate bodies at `src/storage/settings.ts:20-33` ARE the code that moves — they already use the canonical `Number.isFinite` + `(X_OPTIONS as readonly T[]).includes(v)` shape. D-08/D-09 = a verbatim relocate plus an import-source swap.
- `%BASE_URL%` Vite HTML substitution is a documented Vite feature — no plugin, no build-time codegen, no test-shim change required (Vite resolves it during the index.html transform).
- `public/` directory exists implicitly (Vite default); D-03 just creates the file inside. Vite copies `public/*` to `dist/` verbatim under the configured `base` path.
- `src/storage/format.test.ts` already covers `formatLastSessionDate` same-year vs other-year branches via the `now` injection — D-11's JSDoc cites the existing test file's behaviour as the proof-of-test-only-intent.

### Established Patterns
- Phase 9 D-14 / Phase 10 D-20 / Phase 11 D-16 — co-locate new contract tests in existing `*.test.{ts,tsx}` neighbors UNLESS the source file has no existing test file (then a new test file is the structural gap-fill exception). D-10's new `src/domain/settings.test.ts` follows the exception.
- Phase 7 D-09 / Phase 11 D-17 — per-commit green-gate (tsc/lint/build/vitest); D-15 inherits.
- Phase 11 D-13 — single-plan-single-wave packaging for inter-locked-but-non-overlapping small fixes; D-12 mirrors.
- Phase 7 D-04 — `// Reason:` annotation policy for any new `react-hooks/*` disable; D-14 inherits (expected to be a no-op for Phase 12).

### Integration Points
- `src/storage/settings.ts:8-16` import block — extends to import `isValidBpm`, `isValidRatio`, `isValidDuration` from `../domain/settings`.
- `src/domain/settings.ts:50-64` `validateSettings` body — predicate-call rewrite preserves throw class + message format verbatim; existing callers' catch sites unchanged.
- `index.html:5` favicon link — `%BASE_URL%` substitution resolves at Vite build time; production `dist/index.html` href becomes `/hrv/favicon.svg`.
- `src/content/learnContent.ts:60` `book.url` — single-string content edit; consumed by `LearnDialog.tsx` link list render at the existing JSX site.
- Test file delta: ~6-9 new cases in NEW `src/domain/settings.test.ts`; baseline 400 → target ~406-409.

</code_context>

<specifics>

- Forrest Knutson's verbatim YouTube-description book URL (the source-of-truth for D-05): `https://www.amazon.com/Mastering-Meditation-Eight-Steps-Beginner-ebook/dp/B0CCFWP4W8?sr=8-1&linkId=1a5a2958fc89bdb6769b54d0bc9a4d17&language=en_US`. The `linkId` is Forrest's own Amazon Associates tag — NOT to be stripped.
- Favicon SVG visual brief (D-03): filled teal orb matching `--color-breathing-accent` (BreathingShape resting state). Single `<circle>`, single fill colour. ~150-200 bytes target. Planner picks the literal hex matching the resolved Tailwind theme value (CSS custom properties do not apply inside an external SVG loaded as a `<link rel="icon">` resource).
- Phase 12 is the LAST phase of milestone v1.0.1 (per ROADMAP.md). Plan should NOT include any milestone-archival edits — `/gsd-complete-milestone` handles that after verification.

</specifics>

<deferred>

- **Refactor caller-side clamp into engine/hook to remove `audioNow`** (HYGIENE-01 option b) — considered then rejected per D-01. Touches the AUDIO-02 contract that shipped Phase 9; surface change for a docs-only finding inverts the risk/reward. Re-evaluate in v1.1+ if a hook-internal clamp ever becomes natural alongside other audio-engine work.

- **Two-fn typed-vs-unknown predicate variants** (HYGIENE-02 option b) — considered then rejected per D-08. Doubles export surface for low abstraction value.

- **Function-overload predicate API** (HYGIENE-02 option c) — considered then rejected per D-08. Overloads with type-narrowing predicates are notoriously fiddly to read and maintain.

- **Two-ring or letter-mark favicon designs** (ASSETS-01 options b/c) — considered then rejected per D-03. Filled orb reads at 16×16 and ties to the BreathingShape resting state. Alternative designs may surface in v1.1 if the Appearance/Themes umbrella (CUST-01/CUST-03) introduces a brand-mark refresh.

- **Drop the "Mastering Meditation" book link entirely** (CONTENT-01 option c) — considered then rejected per D-05. User-facing content removal would also violate the "no user-facing features" rule via a removal vector and lose a curated reference Forrest himself promotes.

- **Add affiliate-disclosure copy to LearnDialog footer** (CONTENT-01 option b) — considered then rejected per D-06 once the URL was confirmed as Forrest's own Associates tag (not ours). Disclaimer accuracy ("Not affiliated with Forrest Knutson") is about us-vs-Forrest; preserved.

- **Strip `linkId`/`sr`/`language` query params** from the Amazon URL — considered then rejected per D-05. User confirmed the verbatim URL is what Forrest publishes on his videos; preserving it matches the source-of-truth.

- **Drop ASSETS-01 path fix to v1.x and ship asset only** (or vice versa) — considered then rejected per D-03/D-04. Ship together; the fix only closes the success criterion when both land.

- **Remove the favicon `<link>` entirely** (ASSETS-01 option c) — considered then rejected per D-03. Brand presence valued; orb glyph is on-theme.

- **Multiple plans for Phase 12** (option b: 2 plans code+docs; option c: 5 plans one-per-REQ) — considered then rejected per D-12. Files don't overlap; review surface identical; same rationale as Phase 11 D-13.

- **Shared predicates in `src/storage/settings.ts` instead of `src/domain/settings.ts`** — considered. Domain wins because the `OPTIONS` arrays they assert against ARE in domain; storage is a downstream consumer. Inverting the dependency would create a domain-imports-storage cycle.

- **Reduced-motion BreathingShape boundary cue todo** (`.planning/todos/pending/2026-05-11-reduced-motion-still-shows-out-phase-boundary-cue.md`) — reviewed during cross-reference. Tangential — Phase 12 doesn't touch BreathingShape render path. Stays in v1.x backlog.

### Reviewed Todos (folded)

- **Favicon 404** (`.planning/todos/pending/2026-05-11-missing-favicon-404-in-console.md`) — FOLDED into ASSETS-01 per D-03/D-04. Will be moved to `.planning/todos/completed/` after Phase 12 ships.

</deferred>

---

*Phase: 12-assets-content-hygiene-cleanup*
*Context gathered: 2026-05-12*
