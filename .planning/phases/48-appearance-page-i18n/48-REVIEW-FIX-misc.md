---
phase: 48-appearance-page-i18n
chunk: misc
fixed_at: 2026-05-26T00:00:00Z
review_path: .planning/phases/48-appearance-page-i18n/48-REVIEW-misc.md
iteration: 1
findings_in_scope: 8
fixed: 7
skipped: 1
status: partial
---

# Phase 48: Code Review Fix Report (misc chunk)

**Fixed at:** 2026-05-26T00:00:00Z
**Source review:** `.planning/phases/48-appearance-page-i18n/48-REVIEW-misc.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (all severities)
- Fixed: 7
- Skipped: 1

All severities were approved; chunk-scoped fix pass attempted every finding. Each
commit verified with `tsc --noEmit` against the full project tsconfig. No vitest
runs (per output directive). All commits follow `fix(48-misc-<ID>): <summary>`.

## Fixed Issues

### WR-01: `RING_CUE_FLAG` / `BREATHING_SHAPE_FLAG` alias provenance

**Files modified:** `src/featureFlags.ts`
**Commit:** `340fcab`
**Applied fix:** Documented every non-canonical alias for `BREATHING_SHAPE_FLAG.parse` and `RING_CUE_FLAG.parse` with its origin (UI-label token vs spike-branch shorthand vs design heritage). Clarified that `'rings'` resolving to different canonical values per query parameter is by design (per-parameter scope), not collision. Did NOT delete the dead aliases (`production`, `default`, `south`, `progress`) because the existing `featureFlags.test.ts` rows assert them; documented the audit guidance instead so a future cleanup can drop alias + test rows together. No behaviour change.

### WR-02: `__FILL__` substitution drift guard

**Files modified:** `src/styles/faviconPalette.ts`
**Commit:** `2e66aa7`
**Applied fix:** Added module-load count check (`FAVICON_FILL_PLACEHOLDER_COUNT`) that throws if `FAVICON_SVG_TEMPLATE` contains zero `__FILL__` placeholders. Picked the module-load variant over the post-`replaceAll` runtime check because the runtime check cannot distinguish "all placeholders replaced" from "no placeholders to begin with" — the latter is the exact drift mode the reviewer cited. Also removed the stale "three places" comment (J16 made it four) since it had already demonstrated the drift hazard once.

### WR-03: StrictMode + inline pre-paint favicon link churn

**Files modified:** `src/hooks/useFavicon.ts`
**Commit:** `4c1c265`
**Applied fix:** Made `replaceFaviconLink` idempotent — if the existing `<link rel="icon">` already has `href === dataUri`, return early without remove/append. This eliminates the StrictMode double-mount churn in dev and the inline-pre-paint vs React-mount race that could cause Chrome to debounce-drop the tab icon. The behaviour for actual theme changes is unchanged (href differs, so the remove/append path runs). Updated the JSDoc to document the idempotency contract.

### IN-02: `readQueryFeatureFlag` dead-export documentation

**Files modified:** `src/featureFlags.ts`
**Commit:** `1edb83d`
**Applied fix:** Added a JSDoc-style comment block explaining that `readQueryFeatureFlag` is intentionally exported as a public extensibility surface for ad-hoc query-parameter parsing, distinct from the in-app `readFeatureFlags` pipeline which routes through the private `readQueryFeatureFlagOrNull` (per D-07's persisted-fallback semantics). The existing test ('supports adding non-boolean query flags with custom parsers') is now explicitly the contract this export serves. Documented the audit path for future removal.

### IN-03: `FAVICON_COLORS` `as const satisfies`

**Files modified:** `src/styles/faviconPalette.ts`
**Commit:** `cd9bd6c`
**Applied fix:** Replaced `Object.freeze({...})` with `{...} as const satisfies Record<Exclude<ThemeId, 'system'>, string>`. Compile-time readonly plus key-set conformance — TypeScript now catches assignment attempts at build time. All consumers use the values as strings (`.toLowerCase()`, `.slice()`, regex match) so literal-typed values do not change any caller's behaviour. `tsc --noEmit` passes across the full project.

### IN-04: `parseQueryBoolean` empty-string entry comment

**Files modified:** `src/featureFlags.ts`
**Commit:** `212dfcc`
**Applied fix:** Added an inline comment on the `''` entry in `TRUE_QUERY_BOOLEAN_VALUES` explaining that it covers both `?switcherIcon` (bare flag) and `?switcherIcon=` (explicit empty) — `URLSearchParams.get` returns `''` for both, so they are indistinguishable here by design (matches CLI boolean-toggle convention).

### IN-05: `useFavicon` non-throwing `loadPrefs` rationale

**Files modified:** `src/hooks/useFavicon.ts`
**Commit:** `aec17ca`
**Applied fix:** Added a brief comment on the `useState` initializer noting that `loadPrefs` is non-throwing by contract (via `coercePrefs`), so a defensive try/catch is intentionally absent. Notes the parallel with the inline `index.html` catch block (different mechanism, same 'light is the safe default' spirit). Prevents a future reader from adding a try/catch that would suppress unrelated failures.

## Skipped Issues

### IN-01: `main.tsx` root-not-found static fallback DOM

**File:** `src/main.tsx:7`
**Reason:** Reviewer explicitly noted "Skip if the project decision is to keep `main.tsx` minimal." The current file is 12 lines and the existing thrown error already produces a clear console message. The failure mode (CSP strip, third-party extension stripping `<div id="root">`) is extremely unlikely for the same-build-artifact `index.html`/`main.tsx` pair. Without explicit operator direction to add the fallback DOM injection, the conservative call is to preserve the minimal entry-point style. No code change.
**Original issue:** The thrown error in `main.tsx:7` (`'Root element #root not found in index.html'`) only reaches the console; end-users see a blank page. Adding a static `<div>` with a "Please reload" hint before throwing would degrade more gracefully.

---

_Fixed: 2026-05-26T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Chunk: misc_
_Iteration: 1_
