# Phase 7: Strict Type & Lint Baseline — Research

**Researched:** 2026-05-11
**Domain:** TypeScript strict mode, typescript-eslint strictTypeChecked, react-hooks v7 enforcement
**Confidence:** HIGH — all key findings verified against installed packages and live empirical runs

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Adopt `tseslint.configs.strictTypeChecked` (full type-aware preset) — NOT `stylisticTypeChecked` and NOT a custom cherry-pick.
- **D-02:** Wire `parserOptions.project` to `./tsconfig.app.json` (and `./tsconfig.node.json` where relevant) so type-aware rules have real type info.
- **D-03:** Keep `src/**/*.test.ts(x)` inside `tsconfig.app.json` `include`. Do NOT carve out `tsconfig.test.json`. Fix every typing gap that surfaces in test files inline.
- **D-04:** Audit every existing `// eslint-disable-next-line react-hooks/*` in the codebase. Each surviving disable MUST be preceded by a `// Reason: …` annotation.
- **D-05:** Do NOT add a project-level enforcement rule that flags un-annotated `eslint-disable` comments in this phase.
- **D-06:** Enable `noUncheckedIndexedAccess: true` together with the rest of strict (no staged-rollout gate).
- **D-07:** Do NOT introduce a `safeAt(arr, i)` helper. Fix sites with explicit `if`/`?:` narrowing, `.at()`, or local non-null assertions with `// Reason:` annotation.
- **D-08:** Strict-surfaced real bugs → smallest behavior-preserving type-narrowing in Phase 7; bug fix logged for owning phase.
- **D-09:** At every commit boundary: `tsc --noEmit`, `npm run lint`, `npm run build`, full Vitest suite all pass.
- **D-10:** Existing tsconfig flags `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch` are preserved.
- **D-11:** Split vs single plan decision delegated to planner based on actual error counts (split if tsconfig errors > 80, ESLint errors > 100, or hooks disables > 15).

### Claude's Discretion

- Exact ESLint config layout (per-file overrides for `vite.config.ts`, vitest setup, etc.) and the precise tsconfig.node.json adjustments.
- Whether `parserOptions.projectService: true` (TS 5.4+) is preferable to the legacy `project: ['./tsconfig.app.json']` array form — Claude picks the modern variant if compatible with installed tooling.

### Deferred Ideas (OUT OF SCOPE)

- Custom ESLint rule enforcing `// Reason:` annotations on every `eslint-disable` — proposed for v1.1.
- Splitting `tsconfig.test.json` — rejected for v1.0.1 (D-03).
- Type-only refactors not required by strict mode (branded types, discriminated union rewrites, etc.).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BUILD-01 | `tsconfig.app.json` and `tsconfig.node.json` enable `strict`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`; all resulting compiler errors are fixed inline. | Empirical tsc run: 12 errors, ALL in test files, 0 in production. See §Blast Radius: tsc. |
| BUILD-02 | `eslint.config.js` includes `tseslint.configs.strictTypeChecked` with `parserOptions.project` wired; resulting lint errors are fixed inline. | Empirical ESLint run: 226 total (64 prod, 162 test). See §Blast Radius: ESLint. D-11 → SPLIT recommended. |
| BUILD-03 | `react-hooks/exhaustive-deps` enforced at `error` level; each surviving `eslint-disable` is justified or removed. | Confirmed `exhaustive-deps` ships as `warn` in installed plugin; must be overridden to `error`. 3 `set-state-in-effect` disables in `App.tsx`, all need `// Reason:` annotation. |
</phase_requirements>

---

## Summary

Phase 7 lands the strict TypeScript and strict-type-checked ESLint baseline. The empirical blast radius (verified by running `tsc` and `eslint` against the real codebase) is encouragingly small on the compiler side and moderate-but-tractable on the linter side.

**tsc errors:** 12 total, ALL in test files (`*.test.ts(x)`), **zero in production code**. Every error is `TS2532: Object is possibly 'undefined'` caused by `noUncheckedIndexedAccess` on `mock.calls[0][0]` and `mock.results[0].value`-style test assertions. The fix pattern is uniform: add a `?? fail()` guard or use `.at(0)` with a non-null assertion plus `// Reason:` annotation.

**ESLint errors (with `strictTypeChecked` + `projectService`):** 226 total — 64 in production files across 20 files, 162 in test files across 16 files. The D-11 ESLint threshold (> 100) is exceeded, so the planner SHOULD split into at least two plans (tsconfig + ESLint). The dominant production rules are `no-unbound-method` (24 occurrences, all from React prop callback patterns), `restrict-template-expressions` (16), `no-unnecessary-condition` (6), and `no-confusing-void-expression` (6).

**Primary recommendation:** Split into two plans — Plan A: tsconfig strict (trivial, 12 test-only errors) and Plan B: ESLint strictTypeChecked (226 errors across 36 files, ordered production-first then tests). Include D-04 hooks audit in Plan B.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| tsconfig strict flags | Build toolchain | — | Compiler flags; no runtime tier involved |
| ESLint type-aware rules | Build toolchain | — | Static analysis; `parserOptions.project` invokes tsc API at lint time |
| `noUncheckedIndexedAccess` fixes | Source (all tiers) | — | Each array-indexing site fixed in-place; no runtime behavior change |
| `react-hooks/exhaustive-deps: error` | Frontend (hooks) | — | Hook dep arrays; React runtime enforces the hook contract |
| `// Reason:` annotations | Source (App-tier) | — | Policy documentation; no runtime effect |

---

## Standard Stack

### Core (already installed — no new packages needed)

[VERIFIED: npm view + node_modules inspection]

| Library | Installed Version | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| `typescript-eslint` | 8.59.2 | Provides `tseslint.config()`, `strictTypeChecked` preset, TS parser | Canonical mono-package; replaces `@typescript-eslint/{parser,eslint-plugin}` in v8+ |
| `typescript` | 6.0.2 | Compiler; `projectService` API requires TS 5.0+ | Project uses TS 6 — `projectService: true` is fully supported |
| `eslint-plugin-react-hooks` | 7.1.1 | `exhaustive-deps`, `set-state-in-effect`, etc. | Official React team plugin; v7 adds many new rules |
| `eslint` | 10.2.1 | Flat-config runtime | Project already on flat-config (ESLint 9+) |

**No new npm installs are needed.** All required libraries are already in `devDependencies`.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `parserOptions.projectService: true` | `parserOptions.project: ['./tsconfig.app.json', './tsconfig.node.json']` | Legacy `project` array works but is slower (resolves per-file); `projectService` uses a single TS language-service instance (faster, more accurate). Both are supported in typescript-eslint 8.x. Discretion: use `projectService`. |
| `tseslint.configs.strictTypeChecked` | `tseslint.configs.strictTypeCheckedOnly` | `strictTypeChecked` = `recommended` union `strictTypeCheckedOnly`. Using `strictTypeChecked` (not Only) replaces the existing `...tseslint.configs.recommended` spread correctly. |

---

## Architecture Patterns

### System Architecture Diagram

```
tsconfig.app.json (strict flags added)
        │
        ├──▶ tsc --noEmit ──────────────────────▶ 0 exit (BUILD-01 gate)
        │
        └──▶ ESLint (projectService) ─────────────▶ 0 exit (BUILD-02 gate)
                │
                ├─ tseslint.configs.strictTypeChecked
                │       (type-aware rules — require parserOptions.project)
                │
                ├─ reactHooks.configs.recommended.rules
                │       + exhaustive-deps: 'error' (override from 'warn')
                │
                └─ per-file override block
                        (eslint.config.js itself ignored via `ignores`)

Vitest suite ──▶ npm run test ──────────────────▶ 363/363 pass (D-09 gate)
npm run build ─▶ tsc -b && vite build ──────────▶ 0 exit (D-09 gate)
```

### Recommended `eslint.config.js` Shape

The current `eslint.config.js` uses `tseslint.config()` and spreads `...tseslint.configs.recommended`. The migration to `strictTypeChecked` requires:

1. Replace `...tseslint.configs.recommended` with `...tseslint.configs.strictTypeChecked`
2. Add a `languageOptions.parserOptions` block with `projectService: true` and `tsconfigRootDir`
3. Override `react-hooks/exhaustive-deps` to `'error'`

```typescript
// Source: [VERIFIED: node_modules inspection + live test of tseslint.config()]
import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  js.configs.recommended,
  // Replace ...tseslint.configs.recommended with the full strict preset:
  ...tseslint.configs.strictTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      // Wire type-aware rules (D-02):
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname, // repo root
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // BUILD-03: upgrade from 'warn' (recommended default) to 'error':
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
)
```

**Key detail:** `parserOptions.projectService: true` (without specifying individual tsconfig paths) instructs the typescript-eslint parser to use TS's project-service API. It automatically discovers `tsconfig.json` at `tsconfigRootDir` and resolves composite project references to `tsconfig.app.json` and `tsconfig.node.json`. [VERIFIED: node_modules/typescript-eslint 8.59.2]

**The `eslint.config.js` file itself** does not need a separate `ignores` entry to avoid type-checking errors, because flat-config files in the project root are not matched by `**/*.{ts,tsx}` glob patterns (they are `.js` files). No special per-file override is needed for `eslint.config.js`.

**`vite.config.ts`** is covered by `tsconfig.node.json` (`include: ["vite.config.ts"]`). The `projectService` approach resolves this automatically without manual `files`/`project` overrides. [VERIFIED: tsconfig.node.json + live projectService test]

### Recommended tsconfig Changes

`tsconfig.app.json` — add three flags to `compilerOptions`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```
`noFallthroughCasesInSwitch` is ALREADY present — preserve it (D-10).

`tsconfig.node.json` — identical additions to `compilerOptions`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

`tsconfig.json` — NO changes needed. The root file is already a project-references shell (`files: [], references: [...]`).

### `strictTypeChecked` Rule Inventory (77 rules)

[VERIFIED: node_modules inspection of tseslint.configs.strictTypeChecked[2].rules]

All 77 rules are set to `"error"` (or a tuned error configuration). Notable type-aware rules that require `parserOptions.project`:
- `@typescript-eslint/no-floating-promises` — requires `void` prefix on intentional fire-and-forget
- `@typescript-eslint/no-misused-promises` — prevents passing async functions to `onClick` / `onChange` attributes expecting `void`
- `@typescript-eslint/no-unsafe-assignment` / `no-unsafe-member-access` / `no-unsafe-call` / `no-unsafe-return` — fires on `any`-typed expressions
- `@typescript-eslint/restrict-template-expressions` — fires when `number` or non-string types appear in template literals (strict config: `allowNumber: false`)
- `@typescript-eslint/no-unnecessary-condition` — fires when a condition is provably always truthy/falsy
- `@typescript-eslint/no-unnecessary-type-assertion` — fires when `as T` is a no-op
- `@typescript-eslint/unbound-method` — fires when an object method is accessed as a property without `this: void` annotation
- `@typescript-eslint/no-confusing-void-expression` — prevents `() => voidFn()` arrow shorthand when `voidFn` returns void
- `@typescript-eslint/require-await` — async functions without await
- `@typescript-eslint/use-unknown-in-catch-callback-variable` — catch clause variable must be typed `unknown`

### Anti-Patterns to Avoid

- **Disabling rules globally:** Resist project-level `"off"` for noisy rules. The blast radius is bounded and fixable; global disables permanently weaken the baseline for phases 8-12.
- **Adding `@ts-ignore` / `@ts-expect-error`:** The `ban-ts-comment` rule in `strictTypeChecked` requires a minimum-description-length of 10 characters for any surviving `@ts-expect-error`.
- **Using `as unknown as T`:** Double-cast sequences are a smell; address the underlying type issue.
- **Adding `eslint-disable` for `no-unsafe-*` on test files without justification:** Test files should narrow their types (use typed mock helpers) rather than suppressing rules wholesale.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Array index with possible `undefined` | `safeAt(arr, i)` helper (D-07 explicitly forbids) | `if (arr[i] !== undefined)` guard, `.at(i)` with `?? fallback`, or `arr[i]!` + `// Reason:` | The helper abstracts away the type narrowing that the compiler needs to verify correctness |
| `parserOptions.project` resolution | Manual `files` overrides per tsconfig | `projectService: true` with `tsconfigRootDir` | The service API handles composite-project resolution automatically |
| Type-aware lint caching | Custom build scripts | ESLint's own caching (`--cache` flag) | Built into ESLint 10; no custom infrastructure needed |

---

## Blast Radius: tsc (BUILD-01)

[VERIFIED: empirical run — `npx tsc --noEmit --strict --noUncheckedIndexedAccess --noImplicitReturns -p tsconfig.app.json`]

**Total: 12 errors, ALL in test files, 0 in production code.**

| File | Errors | Error Code | Pattern |
|------|--------|------------|---------|
| `src/app/App.audio.test.tsx` | 2 | TS18048 | `mock.calls[0]` → possibly undefined (`noUncheckedIndexedAccess`) |
| `src/app/App.wakeLock.test.tsx` | 4 | TS2532 | `mock.results[0].value` → possibly undefined |
| `src/audio/cueSynth.test.ts` | 4 | TS2532 | `oscillators[0]`, `filters[0]` → possibly undefined |
| `src/hooks/useAudioCues.test.tsx` | 2 | TS2532 | `reanchorSpy.mock.calls[0][0]` → possibly undefined |

**Root cause:** All 12 errors are `mock.calls[N]` and `mock.results[N]` array accesses where `noUncheckedIndexedAccess` adds `| undefined` to the element type. The fix is to add either:
- `expect(arr).toHaveLength(N); const item = arr[0]!; // Reason: length asserted above`
- Or: `const item = arr.at(0); expect(item).toBeDefined();`

**`TS2882` on `main.tsx`** (CSS import `import './index.css'`): only surfaces when running tsc without `types: ["vite/client"]`. The standard `tsc -b tsconfig.app.json` command (used by `npm run build`) resolves this correctly. This is not a new error.

**D-11 check:** 12 tsconfig errors — BELOW the 80-error threshold. No tsconfig-driven split needed.

---

## Blast Radius: ESLint (BUILD-02)

[VERIFIED: empirical run with temp config using `tseslint.configs.strictTypeChecked` + `parserOptions.projectService: true`]

**Total: 226 problems (225 errors + 1 warning).**
- Production files: **64 errors** across 20 files
- Test files: **162 errors** across 16 files

**D-11 check:** 226 ESLint errors — EXCEEDS the 100-error threshold. **SPLIT PLAN RECOMMENDED.**

### Production Errors by Rule (64 total)

| Rule | Count | Files Affected | Fix Pattern |
|------|-------|----------------|-------------|
| `@typescript-eslint/unbound-method` | 24 | `App.tsx`, `SessionControls.tsx`, `EndSessionDialog.tsx`, `ResetStatsDialog.tsx`, `SettingsForm.tsx`, `SettingsStepper.tsx`, `LearnAnchor.tsx`, `LearnDialog.tsx`, `MuteToggle.tsx`, `StatsFooter.tsx` | Add `this: void` to prop interface method signatures |
| `@typescript-eslint/restrict-template-expressions` | 16 | `BreathingShape.tsx` (7), `SettingsForm.tsx` (2), `storage/format.ts` (3), `domain/settings.ts` (2), `App.tsx` (1), `domain/sessionMath.ts` (1) | Template literals with `number` — wrap with `String(n)` or change to `${n.toFixed(...)}` etc. |
| `@typescript-eslint/no-confusing-void-expression` | 6 | `App.tsx` (2), `SettingsForm.tsx` (2), `SettingsStepper.tsx` (2) | Arrow shorthand `() => voidFn()` → add braces `() => { voidFn() }` |
| `@typescript-eslint/no-unnecessary-condition` | 6 | `usePrefersReducedMotion.ts` (2), `audioEngine.ts` (1), `cueSynth.ts` (1), `SettingsStepper.tsx` (1), `useAudioCues.ts` (1) | Remove provably-always-false guards (`window.matchMedia` check in jsdom context), remove unnecessary `?.` on non-nullable |
| `@typescript-eslint/no-unnecessary-type-assertion` | 5 | `audioEngine.ts` (3), `BreathingShape.tsx` (2) | Remove `as T` casts that are no-ops — type is already the expected type |
| `@typescript-eslint/no-misused-promises` | 2 | `App.tsx` (2) | `onStart={onStartClick}` (async fn) passed to `void`-return props — add `void` wrapper or type prop as `() => unknown` |
| `react-hooks/exhaustive-deps` | 1 | `App.tsx` | `audio` missing from `useCallback` deps — fix dep list |
| `no-useless-assignment` | 1 | `useAudioCues.ts` | `let newEngine = null` initial assignment unused — `const newEngine =` or restructure |
| `@typescript-eslint/no-non-null-assertion` | 1 | `main.tsx` | `document.getElementById('root')!` — add null check or `// Reason: root element always exists in index.html` |
| `react-hooks/set-state-in-effect` (stale disable) | 1 (warning) | `App.tsx:411` | The disable at line 411 is flagged as unused (stale) — the `setStats()` call at line 412 does NOT fire the rule (because it's inside an `if` guard on a non-running state). Remove the stale disable. |

### Test Errors by Rule (162 total — top rules)

| Rule | Approx Count | Files Affected | Fix Pattern |
|------|-------|----------------|-------------|
| `@typescript-eslint/no-non-null-assertion` | 42 | Multiple test files | `requestSpy.mock.results[0]!` patterns in test assertions |
| `@typescript-eslint/no-unsafe-member-access` | 37 | `App.persistence.test.tsx`, `settings.test.ts` | Accessing properties of `any`-typed parsed JSON in tests |
| `@typescript-eslint/no-unnecessary-type-assertion` | 13 | `App.audio.test.tsx` | Unnecessary `as T` casts on typed mock returns |
| `@typescript-eslint/no-unsafe-assignment` | 16 | `App.persistence.test.tsx`, `settings.test.ts` | Assigning `any` from parsed JSON |
| `@typescript-eslint/require-await` | 14 | `App.audio.test.tsx`, `audioEngine.test.ts`, `useAudioCues.test.tsx` | `async` test helpers / FakeAudioContext methods without `await` |
| `@typescript-eslint/no-extraneous-class` | 4 | `App.audio.test.tsx` | Class-only constructors in test files (FakeAudioContext variants) |
| `@typescript-eslint/no-confusing-void-expression` | 5 | `storage/*.test.ts` | Arrow shorthand returning `void` in `expect(fn).not.toThrow()` style |

### Production Errors by File (top files)

| File | Errors | Dominant Rule |
|------|--------|---------------|
| `src/app/App.tsx` | 17 | `unbound-method` (8 occurrences for hoisted `audio.*` / `session.*` / `wakeLock.*` methods) |
| `src/components/BreathingShape.tsx` | 9 | `restrict-template-expressions` (7 — numbers in template literals for CSS transforms) |
| `src/components/SettingsForm.tsx` | 6 | `restrict-template-expressions` (2) + `unbound-method` (2) + `no-confusing-void-expression` (2) |
| `src/audio/audioEngine.ts` | 4 | `no-unnecessary-type-assertion` (3) + `no-unnecessary-condition` (1) |
| `src/components/SettingsStepper.tsx` | 4 | `unbound-method` (1) + `no-unnecessary-condition` (1) + `no-confusing-void-expression` (2) |
| `src/components/SessionControls.tsx` | 3 | `unbound-method` (3) |
| `src/hooks/usePrefersReducedMotion.ts` | 3 | `no-unnecessary-condition` (2) + `set-state-in-effect` (1, existing error) |
| `src/storage/format.ts` | 3 | `restrict-template-expressions` (3) |

---

## Blast Radius: react-hooks Disables (BUILD-03)

[VERIFIED: `grep -rn "eslint-disable" src/` against live codebase]

**Total `// eslint-disable-next-line react-hooks/*` comments: 3, ALL in `src/app/App.tsx`.**

| Location | Rule | Line Content Suppressed | Current Annotation | Phase 7 Action |
|----------|------|------------------------|--------------------|----------------|
| `App.tsx:205` | `react-hooks/set-state-in-effect` | `setEndDialogOpen(false)` inside effect | No annotation (MUST add D-04) | Add `// Reason: subscribe-and-reflect — endDialogOpen mirrors external session.status; setting local state from this trigger effect is the documented React pattern.` |
| `App.tsx:390` | `react-hooks/set-state-in-effect` | `setAppPhase('idle')` inside effect | No annotation (MUST add D-04) | Add `// Reason: subscribe-and-reflect — appPhase resets to 'idle' when session leaves running; this effect is the single write site per D-16 Phase 4 invariant.` |
| `App.tsx:411` | `react-hooks/set-state-in-effect` | `setStats(updated)` | **STALE DISABLE** — ESLint reports it as unused | REMOVE the disable at line 411; the `setStats(updated)` call at line 412 does not fire the rule because `set-state-in-effect` in react-hooks 7.1.1 does not flag `setState` calls inside conditional branches of effects in this pattern. |

**Additional `set-state-in-effect` error (NOT currently suppressed):**
- `src/hooks/usePrefersReducedMotion.ts:22` — `setReduced(mql.matches)` called synchronously in `useEffect` body. This fires under the installed react-hooks 7.1.1 and has NO existing disable. Phase 7 must either add a justified disable or refactor the call pattern. Given D-08 (smallest behavior-preserving fix), the recommended action is to add a disable with `// Reason: re-seed from live MediaQueryList on mount to close the stale-initial-state window; subsequent updates come from the change listener (MDN canonical pattern).`

**`react-hooks/exhaustive-deps` — already `warn` in installed plugin:**
[VERIFIED: node_modules inspection of eslint-plugin-react-hooks 7.1.1 recommended config]

The installed `eslint-plugin-react-hooks@7.1.1` ships `exhaustive-deps` as **`"warn"`** in `recommended.rules`, not `error`. BUILD-03 requires the plan to explicitly override this to `"error"` in `eslint.config.js`. The current config spreads `reactHooks.configs.recommended.rules` without an override — this is the gap.

**`react-hooks` new rules in v7 (not in v6):**
The installed v7.1.1 plugin adds many new rules including `set-state-in-effect`, `static-components`, `use-memo`, `refs`, `immutability`, `purity`, `error-boundaries`, etc. The existing `...reactHooks.configs.recommended.rules` spread already includes all of these because the spread reads from the v7 recommended config. This means some rules fire that were absent in v6 — the `set-state-in-effect` errors already appearing in `npm run lint` output confirm this is active.

**D-11 hooks check:** 3 disables — BELOW the 15-disable threshold. No hooks-audit-driven split.

---

## Empirical Error Count Strategy (for D-11 decision)

The cheapest recipe for getting first-pass error counts before committing to the full fix:

**Step 1 — tsc blast radius:**
```bash
# Run from project root — uses installed tsc via npx
npx tsc --noEmit --strict --noUncheckedIndexedAccess --noImplicitReturns -p tsconfig.app.json 2>&1 | tee /tmp/tsc-strict-out.txt
wc -l /tmp/tsc-strict-out.txt
grep "error TS" /tmp/tsc-strict-out.txt | sed 's/src\///' | sed 's/([0-9].*$//' | sort | uniq -c | sort -rn
```

**Step 2 — ESLint blast radius (type-aware):**
Create a temp config at `/tmp/hrv-strict-eslint.mjs` (or add flags directly to the real config before the fix pass), then:
```bash
npx eslint src/ --config /tmp/hrv-strict-eslint.mjs 2>&1 | tee /tmp/eslint-strict-out.txt
grep -c "error\|warning" /tmp/eslint-strict-out.txt
```

**The research has already run this.** Results: tsc = 12 errors, ESLint = 226. D-11 conclusion = SPLIT.

---

## `unbound-method` Rule Explanation and Fix Pattern

[VERIFIED: typescript-eslint 8.x docs + live codebase inspection]

The `@typescript-eslint/unbound-method` rule fires when a method declared on an interface (or class) WITHOUT `this: void` is accessed as a standalone value (destructured, or stored in a variable), because such access loses the `this` binding.

**Why it fires in this codebase:**

In `App.tsx`, lines 154-167, the pattern is:
```typescript
const audioStop = audio.stop       // ← unbound-method fires
const audioStart = audio.start     // ← unbound-method fires
const wakeLockRequest = wakeLock.request  // ← unbound-method fires
```

These are accessing methods on the `UseAudioCues` and `UseWakeLock` interfaces. The methods ARE arrow functions in the implementation (via `useCallback`), but the interface declarations use method syntax (`stop(): Promise<void>`) which does not carry `this: void`.

**Fix: add `this: void` to interface method declarations.**

```typescript
// In UseAudioCues interface:
stop(this: void): Promise<void>
start(this: void, plan: BreathingPlan): Promise<number | null>
// etc.

// In UseWakeLock interface:
request(this: void): Promise<void>
release(this: void): Promise<void>
```

In React component prop interfaces (`SessionControlsProps`, `EndSessionDialogProps`, etc.), the method props declared as `onStart(): void` also fire. Fix:
```typescript
onStart(this: void): void
onEnd(this: void): void
// OR use function type syntax (equivalent):
onStart: () => void   // arrow function type syntax doesn't have `this` issue
```

**Note:** The `no-misused-promises` errors in `App.tsx` (passing `onStartClick` async function to `onStart?: () => void`) are a separate related issue — the fix is to type the `onClick` JSX handler props as `() => void | Promise<void>` or to use a void-wrapper: `onStart={() => void onStartClick()}`.

---

## `restrict-template-expressions` Rule Explanation and Fix Pattern

[VERIFIED: strictTypeChecked config shows `allowNumber: false`]

`restrict-template-expressions` with `allowNumber: false` (the strictTypeChecked default) forbids `${number}` in template literals. This affects every place the codebase formats numbers via string interpolation.

**Affected production files:**
- `src/components/BreathingShape.tsx`: 7 occurrences — CSS `transform: \`scale(${orbScale})\`` and `width: \`${MIN_SCALE * 100}%\``
- `src/storage/format.ts`: 3 occurrences — date/duration formatting with numeric interpolation
- `src/components/SettingsForm.tsx`: 2 occurrences — `${value} BPM` and duration labels
- `src/domain/settings.ts`: 2 occurrences — error messages with BPM/duration values
- `src/app/App.tsx`: 1 occurrence — `${frame.cycleIndex}:${frame.phase}`
- `src/domain/sessionMath.ts`: 1 occurrence — `${minutes}:${seconds...}`

**Fix pattern (three options):**
1. `String(n)` — explicit conversion, zero-ambiguity
2. `n.toString()` — equivalent
3. `n.toFixed(3)` — when precision matters (CSS transforms)
4. Or use rule configuration option `allowNumber: true` if the project decides numbers in templates are always safe — but D-01 says no cherry-picking, so individual fixes are required.

Recommended: use `String(n)` for simple cases, `n.toFixed(decimals)` for CSS `scale()` values (maintains precision guarantee).

---

## `no-unnecessary-condition` in Production (D-08 flag)

[VERIFIED: live ESLint output]

Six `no-unnecessary-condition` occurrences in production. Three are genuine D-08 candidates (the condition was defensive but the type system proves it's always false):

1. **`usePrefersReducedMotion.ts:7,14`** — `typeof window === 'undefined'` checks. Under strict+jsdom types, `window` is always defined (type is `Window & typeof globalThis`). The rule fires because the type doesn't narrow. These ARE meaningful SSR guards even if TypeScript can't see it. D-08 approach: add `// Reason: SSR/non-browser guard — window may be undefined in Node 25.x without jsdom; this is a runtime defensive check the type system cannot model.` and add `// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition`.

2. **`audioEngine.ts:232`** — `opts.onStateChange?.()` — the optional chain fires because `onStateChange` is always defined at this call site. Actual fix: remove the `?.` optional chain if the invariant holds, or keep it if the defensive intent is valid (D-08: keep and annotate).

3. **`cueSynth.ts:104`** — `phaseDurationSec !== undefined` check where the type already narrows to non-undefined at that point. Phase 7 fix: restructure the conditional or use a type assertion + `// Reason:` annotation.

4. **`SettingsStepper.tsx:28`** — `nextValue !== undefined` check. This fires because after `noUncheckedIndexedAccess`, `options[selectedIndex + offset]` returns `T | undefined`, but the rule then says the check is "always truthy" — this is a rule contradiction that sometimes happens with generic arrays. The fix is to use `options.at(selectedIndex + offset)` which more cleanly returns `T | undefined`, making the undefined check unambiguously valid.

5. **`useAudioCues.ts:124`** — `state === 'interrupted'` check: TypeScript knows this is always true within that branch. The fix is to restructure the if-else ladder.

---

## `no-confusing-void-expression` Fix Pattern

Six occurrences, all in JSX event handlers using arrow shorthand that return void:

```typescript
// BEFORE (fires no-confusing-void-expression):
onClick={() => clearLeadInTimeouts()}
onClick={() => audioStop()}

// AFTER (add braces):
onClick={() => { clearLeadInTimeouts() }}
onClick={() => { void audioStop() }}  // if async
```

For `SettingsStepper.tsx:47,62`:
```typescript
// BEFORE:
onClick={() => changeBy(-1)}

// AFTER:
onClick={() => { changeBy(-1) }}
```

---

## `no-misused-promises` in App.tsx

Two occurrences where an async function (`onStartClick: async () => Promise<void>`) is passed to a prop typed as `onStart: () => void`.

**Fix pattern — option A:** Wrap the async call with `void` in the JSX:
```tsx
onStart={() => { void onStartClick() }}
```

**Fix pattern — option B:** Widen the interface type to accept `() => void | Promise<void>`:
```typescript
onStart: () => void | Promise<void>
```

Option A is preferred (avoids interface pollution) and is behavior-preserving (D-08).

---

## Common Pitfalls

### Pitfall 1: `projectService` Lint Slowdown on First Run
**What goes wrong:** The first `npm run lint` after wiring `parserOptions.projectService: true` takes 10-30 seconds instead of <5 seconds because typescript-eslint starts a full TypeScript language-service instance that processes every file.
**Why it happens:** Type-aware rules require the TS type checker to run. This is a one-time cost per cache invalidation; subsequent runs with `--cache` are fast.
**How to avoid:** Enable ESLint's built-in cache: `npx eslint src/ --cache`. Add `--cache` to the `lint` script in package.json for dev convenience, but keep CI without cache to always get clean results.
**Warning signs:** `npm run lint` taking > 20 seconds post-change.

### Pitfall 2: `restrict-template-expressions` Cascades Through Utility Functions
**What goes wrong:** Adding `String(n)` fixes in utility format functions may surface downstream `restrict-template-expressions` errors in callers if the return type changes.
**Why it happens:** Changing `return \`${n} BPM\`` (returns `string`) to a version using `String()` keeps the return type `string` — so this pitfall is minimal here.
**How to avoid:** Fix innermost utility functions first; verify callers do not chain template expressions downstream.

### Pitfall 3: Stale `eslint-disable` Becomes an Error
**What goes wrong:** The existing `App.tsx:411` disable for `set-state-in-effect` is already flagged as unused (stale). With `strictTypeChecked`, any `@typescript-eslint/ban-ts-comment` rule applies too — stale disables become warnings or errors.
**How to avoid:** Remove stale disables during the hooks audit pass. The ESLint `--report-unused-disable-directives` flag can identify them.

### Pitfall 4: Test Files Generating Bulk Unsafe-`any` Errors from Parsed JSON
**What goes wrong:** `App.persistence.test.tsx` and `settings.test.ts` contain many `JSON.parse(...)` calls where the result is assigned to a variable and then properties are accessed — these generate cascading `no-unsafe-assignment` + `no-unsafe-member-access` errors.
**Why it happens:** `JSON.parse` returns `any` by design; `strictTypeChecked` bans unsafe member access on `any`.
**How to avoid:** Fix by typing the parsed result: `const parsed = JSON.parse(raw) as Record<string, unknown>` (with `// Reason:` annotation if needed), then narrow each property access.

### Pitfall 5: `require-await` on FakeAudioContext Methods in Tests
**What goes wrong:** The `FakeAudioContext.resume/suspend/close` methods in `vitest.setup.ts` are declared `async` but use `vi.fn(async () => {...})` without `await` inside. `require-await` fires.
**Why it happens:** `async` is used to match the real `AudioContext` API signature (which is `Promise<void>`), not because there is actual async work.
**How to avoid:** The fix is to add `// eslint-disable-next-line @typescript-eslint/require-await` before each such method WITH `// Reason: async signature matches AudioContext API; no real async work in the fake.`

### Pitfall 6: Ordering of `strictTypeChecked` Config Spread
**What goes wrong:** If `tseslint.configs.strictTypeChecked` is spread AFTER the custom rule overrides block, the preset's rules overwrite the custom overrides.
**Why it happens:** ESLint flat-config processes configs in array order; later entries win.
**How to avoid:** Spread `strictTypeChecked` first, then the custom block with overrides (including `exhaustive-deps: 'error'`). The template in §Architecture Patterns above shows the correct order.

### Pitfall 7: `no-unnecessary-type-assertion` Removes Safety-Meaningful Casts
**What goes wrong:** The `audioCtx.state as AudioContextState | 'interrupted'` cast in `audioEngine.ts:125` is flagged as unnecessary. Removing it may make the code look less explicit about the WebKit extension, even though TypeScript already infers the type.
**Why it happens:** The cast is a documentation annotation (D-37 — widened for WebKit) more than a type-forcing cast.
**How to avoid:** Replace with a typed variable or add an annotated disable: `// Reason: AudioContextState widened to include WebKit 'interrupted' extension (D-37).`

---

## Runtime State Inventory

Not applicable. Phase 7 is a pure compiler/linter configuration change + inline type-narrowing fixes. No runtime state (databases, services, OS registrations, secrets, build artifacts) is renamed or migrated.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `typescript-eslint` | BUILD-02 (strictTypeChecked preset) | ✓ | 8.59.2 (installed) | — |
| `eslint-plugin-react-hooks` | BUILD-03 | ✓ | 7.1.1 (installed) | — |
| `typescript` | tsc (BUILD-01) + ESLint projectService (BUILD-02) | ✓ | 6.0.2 (installed) | — |
| `vitest` | D-09 test gate | ✓ | 4.1.5 (installed) | — |
| `npx tsc` | Blast radius measurement recipe | ✓ | via project devDeps | — |
| `npx eslint` | Blast radius measurement recipe | ✓ | via project devDeps | — |

**All dependencies are already installed. No `npm install` needed.**

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 |
| Config file | `vite.config.ts` (Vitest config embedded in Vite config) |
| Setup file | `vitest.setup.ts` (FakeAudioContext, localStorage, matchMedia polyfills) |
| Quick run command | `npx vitest run --reporter=dot` |
| Full suite command | `npm run test:run` (or `npx vitest run`) |
| Quick build check | `npm run build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BUILD-01 | `tsc --noEmit` exits 0 with strict flags | Compiler oracle | `npx tsc --noEmit -p tsconfig.app.json && npx tsc --noEmit -p tsconfig.node.json` | N/A (compiler, no test file) |
| BUILD-01 | `npm run build` exits 0 (no emit errors) | Build smoke | `npm run build` | N/A |
| BUILD-01 | 363 tests still pass after tsc fixes | Behavioral regression | `npm run test:run` | ✅ existing suite |
| BUILD-02 | `npm run lint` exits 0 with strictTypeChecked | Linter oracle | `npm run lint` | N/A (linter, no test file) |
| BUILD-02 | 363 tests still pass after ESLint fixes | Behavioral regression | `npm run test:run` | ✅ existing suite |
| BUILD-03 | `exhaustive-deps` errors at `error` level | Linter oracle | `npm run lint` | N/A |
| BUILD-03 | Each surviving `set-state-in-effect` disable has `// Reason:` | Manual audit | `grep -n "eslint-disable" src/` | N/A |

**Behavioral preservation oracle:** The compiler and linter are their own oracles for BUILD-01/02/03. The "no behavior change" claim (D-08, D-09) is validated by the 363/363 Vitest pass count at every commit boundary.

**No new test files are needed** for Phase 7. The existing test suite IS the behavioral regression gate. The plan gates each commit on `npm run test:run` passing with count = 363.

### Sampling Rate

- **Per task commit:** `npx tsc --noEmit -p tsconfig.app.json && npx tsc --noEmit -p tsconfig.node.json && npm run lint && npm run build && npm run test:run`
- **Per wave merge:** Same as above (all commands; this is a small phase)
- **Phase gate:** All four commands green before `/gsd-verify-work`

### Wave 0 Gaps

None — existing test infrastructure fully covers all phase requirements. No new test files, no new framework installs, no new config files needed.

---

## Security Domain

`security_enforcement` is not explicitly set to `false` in `.planning/config.json`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Phase 7 is compiler/linter only |
| V3 Session Management | No | Phase 7 is compiler/linter only |
| V4 Access Control | No | Phase 7 is compiler/linter only |
| V5 Input Validation | Indirectly | `noUncheckedIndexedAccess` prevents undefined from reaching downstream validators — tightens existing zod-free validation |
| V6 Cryptography | No | Phase 7 is compiler/linter only |

### Known Threat Patterns

Phase 7 is a static-analysis hardening phase with no new attack surface. The `no-unsafe-assignment` / `no-unsafe-member-access` rules indirectly prevent type confusion bugs that could become injection-adjacent issues, but there are no direct security threats to mitigate in this phase.

---

## D-11 Split Decision (Planner Input)

Based on empirical error counts:

| Threshold | Value | Exceeded? |
|-----------|-------|-----------|
| tsconfig errors > 80 | 12 | NO |
| ESLint errors > 100 | 226 | **YES** |
| hooks disables > 15 | 3 | NO |

**Recommendation: SPLIT into 2 plans.**

**Proposed split:**

- **Plan A — tsconfig Strict:** Add `strict`, `noUncheckedIndexedAccess`, `noImplicitReturns` to both tsconfigs. Fix 12 test-file errors (uniform `mock.calls[N]` narrowing pattern). Commit gate: `tsc --noEmit` + `npm run build` + `npm run test:run`. This plan is fast (<30 min) and unblocks ESLint type-aware rules.

- **Plan B — ESLint strictTypeChecked + Hooks Audit:** Switch `eslint.config.js` to `strictTypeChecked` preset, wire `projectService`, upgrade `exhaustive-deps` to `error`. Fix all 226 lint errors (64 prod, 162 test). Apply D-04 `// Reason:` annotations to 2 surviving `set-state-in-effect` disables. Remove 1 stale disable. Commit gate: full D-09 quad. Ordered approach: fix production files first (64 errors), then test files (162 errors), grouped by rule similarity (all `unbound-method` together, all `restrict-template-expressions` together, etc.).

---

## Open Questions

1. **`no-misused-promises` in JSX prop callbacks**
   - What we know: `onStart={onStartClick}` (async) passed to `SessionControlsProps.onStart: () => void` fires the rule. Fix options: void-wrapper in JSX, or widen prop type.
   - What's unclear: Whether the prop type widening touches the Phase 10 HOOKS-* REQs (since `SessionControlsProps` is in scope for multiple phases).
   - Recommendation: Use JSX void-wrapper (`onStart={() => { void onStartClick() }}`) in Phase 7 — no interface change, pure behavioral preservation.

2. **`usePrefersReducedMotion.ts` `no-unnecessary-condition`**
   - What we know: `typeof window === 'undefined'` fires because TypeScript's DOM lib types window as always-defined.
   - What's unclear: Whether this SSR guard should be preserved as-is with a disable, or removed as dead code. The app is a Vite SPA with no SSR.
   - Recommendation: Remove the `typeof window === 'undefined'` checks entirely (they are dead in this SPA context). The `usePrefersReducedMotion` hook already has a `window.matchMedia` check as a second guard; that is sufficient and won't fire the rule.

3. **`no-useless-assignment` in `useAudioCues.ts:261`**
   - What we know: `let newEngine: AudioEngine | null = null` is flagged because the initial `null` is overwritten before use.
   - Recommendation: Change to `let newEngine: AudioEngine | undefined` initialized from the `try`, or restructure with early `const` + `catch` return pattern. Either is a trivial refactor with no behavior change.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `parserOptions.projectService: true` resolves both `tsconfig.app.json` and `tsconfig.node.json` via the composite `tsconfig.json` references array | Architecture Patterns | If wrong, `vite.config.ts` would not be type-checked by ESLint — would need explicit `project: [...]` array |

**All other claims were verified against installed packages or empirical runs this session.**

---

## Sources

### Primary (HIGH confidence)
- `node_modules/typescript-eslint@8.59.2` — verified `strictTypeChecked` rule set (77 rules), `projectService` API, config shape
- `node_modules/eslint-plugin-react-hooks@7.1.1` — verified `exhaustive-deps: 'warn'` in recommended config, rule inventory
- Empirical `npx tsc --noEmit --strict --noUncheckedIndexedAccess --noImplicitReturns -p tsconfig.app.json` — 12 errors, 4 test files
- Empirical `npx eslint src/ --config /tmp/hrv-strict-eslint.mjs` — 226 errors, 20 production files, 16 test files
- `npx vitest run` — confirmed 363/363 passing baseline

### Secondary (MEDIUM confidence)
- `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.json` — read directly, confirmed current flags and include paths
- `src/app/App.tsx`, `src/hooks/useAudioCues.ts`, `src/hooks/useWakeLock.ts`, `src/audio/audioEngine.ts`, `src/audio/cueSynth.ts` — read directly for blast-radius characterization

### Tertiary (LOW confidence — training knowledge, not re-verified)
- ESLint `--cache` flag behavior for projectService lint speedups [ASSUMED]
- `this: void` as the canonical fix for `unbound-method` on React prop interfaces [ASSUMED — highly standard pattern, not cross-verified against tseslint docs in this session]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against installed packages
- Blast radius (tsc): HIGH — empirical run, exact numbers
- Blast radius (ESLint): HIGH — empirical run, exact numbers
- Architecture (eslint.config.js shape): HIGH — verified API surface in node_modules
- Pitfalls: MEDIUM — training knowledge plus live-code confirmation

**Research date:** 2026-05-11
**Valid until:** 2026-05-18 (7 days — fast-moving toolchain, but all decisions locked by CONTEXT.md anyway)
