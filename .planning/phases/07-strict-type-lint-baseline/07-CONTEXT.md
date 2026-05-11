# Phase 7: Strict Type & Lint Baseline - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Land strict TypeScript and strict-type-checked ESLint as the compiler- and linter-enforced baseline for the rest of milestone v1.0.1, fixing every resulting compiler/lint error inline so that all subsequent phases (8–12) write code against that baseline.

**Scope-fixed at this phase:** all three BUILD-* REQs from `.planning/REQUIREMENTS.md` — type-config tightening, ESLint preset upgrade, and react-hooks/exhaustive-deps enforcement audit. Inline fixes to surfaced errors are part of this phase even when the fix touches a file owned by a later phase's REQs.

**Explicitly NOT in this phase:** behavioral changes from later phases (no STORAGE-*, AUDIO-*, WAKELOCK-*, HOOKS-*, DOMAIN-*, UI-*, A11Y-*, CONTENT-*, ASSETS-*, HYGIENE-* fixes). If the strict baseline surfaces a latent bug that maps to a later REQ-ID, prefer the smallest type-narrowing fix that satisfies the compiler/linter without changing behavior; flag the underlying issue for the owning phase.

</domain>

<decisions>
## Implementation Decisions

### ESLint preset depth
- **D-01:** Adopt `tseslint.configs.strictTypeChecked` (full type-aware preset) — NOT `stylisticTypeChecked` and NOT a custom cherry-pick. Accept the noisier rule set including `no-floating-promises`, `no-misused-promises`, `await-thenable`, `no-unsafe-assignment`, `no-unsafe-member-access`, `no-unsafe-call`, and `no-unsafe-return`. Trade higher up-front fix cost for highest catch rate going forward.
- **D-02:** Wire `parserOptions.project` to `./tsconfig.app.json` (and `./tsconfig.node.json` where relevant) so type-aware rules have real type info. Confirm `tsconfigRootDir` is set so `eslint` can resolve from the repo root.

### Test files under strict mode
- **D-03:** Keep `src/**/*.test.ts(x)` inside `tsconfig.app.json` `include`. Do NOT carve out `tsconfig.test.json`. Strict applies to production AND tests under one config. Fix every typing gap that surfaces in test files inline (FakeAudioContext polyfill in `vitest.setup.ts`, mocks, spies, etc.). Rationale: production and tests speak the same type contract — splitting invites drift.

### react-hooks disable audit policy
- **D-04:** Audit every existing `// eslint-disable-next-line react-hooks/*` in the codebase. Each surviving disable MUST be preceded by (or carry on the same line) a `// Reason: …` annotation naming the invariant being protected (e.g., the Phase 5+ intentional `set-state-in-effect` cases). Unjustified disables are removed.
- **D-05 [informational]:** Do NOT add a project-level enforcement rule that flags un-annotated `eslint-disable` comments in this phase. Annotation policy is documented in CONTEXT/PLAN and enforced via code review for v1.0.1. Self-enforcement (custom ESLint rule) can ship in v1.1 if drift appears.

### noUncheckedIndexedAccess blast radius
- **D-06:** Enable `noUncheckedIndexedAccess: true` together with the rest of strict (no scope-check or staged-rollout gate). REQUIREMENTS.md locks the flag; fix every site inline.
- **D-07:** Do NOT introduce a `safeAt(arr, i)` helper or any new abstraction for narrowing. Fix sites with explicit `if`/`?:` narrowing, `.at()` where optional semantics already apply, or local non-null assertions WITH a `// Reason:` annotation for invariants the compiler cannot prove (mirror D-04 policy).
- **D-08:** If a strict-mode surfaced site reveals a real bug (not a noise-only typing gap), the smallest behavior-preserving narrowing ships in Phase 7; the bug fix itself is logged for the owning phase's plan to address explicitly. Phase 7 must not silently change runtime behavior.

### Global Phase 7 invariants
- **D-09:** At every commit boundary within Phase 7: `tsc --noEmit` exits 0, `npm run lint` exits 0, `npm run build` exits 0, and the full Vitest suite (363/363 at milestone start) passes with no behavior change. A commit that breaks any of these is rolled back, not patched-forward.
- **D-10:** Existing tsconfig flags `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch` are preserved. `noFallthroughCasesInSwitch` is already set in both `tsconfig.app.json` and `tsconfig.node.json` — no change needed there.

### Plan splitting (deferred to planner)
- **D-11:** Decision on whether Phase 7 ships as a single plan or splits into 2–3 plans (tsconfig strict → ESLint preset → hooks audit) is delegated to `gsd-planner` based on the actual error blast radius surfaced when strict is first enabled. Splitting is preferred if any of: tsconfig-only error count > 80, ESLint-only error count > 100, or the hooks audit reveals > 15 disables. Single plan is preferred if all three counts are below those thresholds.

### Claude's Discretion
- Exact ESLint config layout (per-file overrides for `vite.config.ts`, vitest setup, etc.) and the precise tsconfig.node.json adjustments needed for `parserOptions.project` resolution.
- Whether `parserOptions.projectService: true` (TS 5.4+) is preferable to the legacy `project: ['./tsconfig.app.json', './tsconfig.node.json']` array form — Claude picks the modern variant if compatible with the installed tooling versions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source spec for the milestone
- `REVIEW.md` — Full-codebase deep review (2026-05-11). Critical findings CR-05 (tsconfig strict), Warning findings none for this phase, Info findings IN-08 (ESLint strictTypeChecked), IN-09 (react-hooks/exhaustive-deps enforcement). Findings drive BUILD-01..03.

### Milestone requirements
- `.planning/REQUIREMENTS.md` §"Build / Type Safety" — BUILD-01, BUILD-02, BUILD-03 (the three REQs this phase satisfies).
- `.planning/REQUIREMENTS.md` §"Out of Scope (for v1.0.1)" — what NOT to introduce while fixing.
- `.planning/ROADMAP.md` §"Phase 7: Strict Type & Lint Baseline" — success criteria + invariants.

### Project context
- `.planning/PROJECT.md` §"Current Milestone: v1.0.1 Code Review Patch" — milestone goal + constraint that 363/363 tests must keep passing.
- `.planning/PROJECT.md` §"Key Decisions" — D-09 (silent-fallback localStorage envelope), D-13/D-14 (dual-anchor audio scheduling) — these are Phase 7-adjacent invariants Phase 7 must not break.

### TypeScript / ESLint configuration baselines
- `tsconfig.json` — root project references (already minimal; should not need changes beyond preserving the references array).
- `tsconfig.app.json` — current `compilerOptions`. Already has `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`. Missing: `strict`, `noUncheckedIndexedAccess`, `noImplicitReturns`.
- `tsconfig.node.json` — same baseline shape as `tsconfig.app.json` but for vite.config.ts.
- `eslint.config.js` — current flat-config. Uses `js.configs.recommended`, `tseslint.configs.recommended`, `reactHooks.configs.recommended.rules`. Missing: `tseslint.configs.strictTypeChecked` + `parserOptions.project` + verified `react-hooks/exhaustive-deps: 'error'`.
- `package.json` §"devDependencies" — `typescript-eslint`, `@eslint/js`, `eslint-plugin-react-hooks` versions in use. Verify these support the strictTypeChecked preset and projectService API.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`tsconfig.app.json` already has `noFallthroughCasesInSwitch`** — one of the four BUILD-01 flags is already in place. Strict-mode landing only needs to add `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitReturns: true`.
- **`eslint-plugin-react-hooks` is already installed and active** — flat config spreads `reactHooks.configs.recommended.rules`. BUILD-03 work is: verify `exhaustive-deps` resolves at `error` level (not `warn`), not adding a new dep.
- **`typescript-eslint` is already installed** — flat-config helpers (`tseslint.config(...)`) already in use. BUILD-02 work is: add `...tseslint.configs.strictTypeChecked` + wire `parserOptions.project` / `projectService`.

### Established Patterns
- **Defensive null-handling everywhere (`T | null` returns):** `audioNow(): number | null`, `frame: SessionFrame | null`, etc. Strict will validate these are consumed correctly. Most should pass without code change — the defensive style was written *as if* strict were on.
- **`useRef` + `void`-prefixed promise patterns:** the codebase uses `void engine.close()`, `void wakeLockRequest()` to mark intentional fire-and-forget. `no-floating-promises` (strictTypeChecked) will REQUIRE this `void` prefix going forward — current code already follows the pattern, so churn should be low.
- **Generation counters for async-token invalidation (Phase 5.1 `startGenerationRef`):** strict mode shouldn't disturb these. Pattern is reused by AUDIO-01 in Phase 9.
- **Intentional `// eslint-disable-next-line react-hooks/set-state-in-effect` comments in `App.tsx`:** these are Phase 5+ deliberate decisions (subscribe-and-reflect effects). The audit (D-04) attaches `// Reason: …` annotations rather than removing them.

### Integration Points
- **`vitest.setup.ts` + `FakeAudioContext` polyfill:** lives in `src/`-adjacent test seam, will be included in tsconfig.app.json strict pass. Polyfill currently does type assertion to satisfy WebAudio interface — D-03 says fix inline.
- **`vite.config.ts`:** covered by `tsconfig.node.json`. Same strict flags applied. Small scope (one file).
- **`src/storage/storage.ts:67-72`:** `readEnvelope` currently casts `parsed as Record<string, unknown>` after a typeof check. Under strict, the existing cast pattern likely keeps working but `noUnsafeAssignment` from strictTypeChecked will require `unknown` → narrow before assigning. Touches storage but is type-only — does NOT execute the STORAGE-01/02 behavior change (those belong to Phase 8).
- **`src/domain/sessionMath.ts` + `src/domain/breathingPlan.ts`:** heavy array indexing. Top candidates for `noUncheckedIndexedAccess` surfaces. D-07: narrow inline, no helper.

</code_context>

<specifics>
## Specific Ideas

- **Prefer `parserOptions.projectService: true`** (typescript-eslint 8+ API) over the legacy `project: ['./tsconfig.app.json', './tsconfig.node.json']` array if the installed `typescript-eslint` version supports it. Cleaner and avoids per-file project-resolution overhead. Claude's discretion.
- **Annotation format for surviving lint disables:** `// eslint-disable-next-line <rule>` directly above the line, with the preceding line as `// Reason: <one sentence naming the invariant>`. Example pattern:
  ```ts
  // Reason: subscribe-and-reflect — App-level effect mirrors useSessionEngine state for cleanup; setting react state here is the documented Phase 5 pattern.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setEndDialogOpen(false)
  ```
- **Behavior-preserving fix style for surfaced bugs (D-08):** if strict reveals a real bug (e.g., a path that returns undefined where the caller assumes a value), the Phase 7 fix is the minimum type-narrowing (an `if (x === undefined) return ...` early-out that mirrors what runtime does TODAY, even if buggy). The underlying bug is logged for the owning phase. Phase 7 must NOT silently change behavior.

</specifics>

<deferred>
## Deferred Ideas

- **Custom ESLint rule enforcing `// Reason:` annotations on every `eslint-disable`** — proposed for v1.1 if drift appears (D-05). Not in v1.0.1 scope.
- **Splitting `tsconfig.test.json`** — rejected for v1.0.1 (D-03). Re-evaluate if test-file type ergonomics become a maintenance problem in v1.1+.
- **Type-only refactors that aren't required by strict mode** — e.g., introducing branded types for `BPM`/`Ratio`/`DurationMinutes`, or replacing `T | null` patterns with discriminated unions — explicitly out of v1.0.1 scope per REQUIREMENTS.md "Out of Scope".

</deferred>

---

*Phase: 7-strict-type-lint-baseline*
*Context gathered: 2026-05-11*
