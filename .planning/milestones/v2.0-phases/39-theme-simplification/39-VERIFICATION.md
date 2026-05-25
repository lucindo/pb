---
phase: 39-theme-simplification
verified: 2026-05-21T18:00:00Z
status: passed
score: 8/8 must-haves verified
overrides_applied: 0
---

# Phase 39: theme-simplification Verification Report

**Phase Goal:** Collapse the 5-palette theme system to Light / Dark / System (removing moss/slate/dusk runtime artifacts across types, CSS, strings, favicon palette, FOUC IIFE, and tests) and lock the deletion against re-introduction with a drift-guard test.

**Verified:** 2026-05-21T18:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria + Requirement IDs)

| #   | Truth | Status     | Evidence |
| --- | ----- | ---------- | -------- |
| 1   | SC1 — `theme.css` and `ThemeId` union contain only `light`/`dark`/`system`; Moss, Slate, Dusk deleted (THM-01..04) | VERIFIED | `src/domain/settings.ts:97`: `export type ThemeId = 'light' \| 'dark' \| 'system'`; `src/domain/settings.ts:99`: `THEME_OPTIONS = ['light', 'dark', 'system']`; `src/styles/theme.css:132`: only `[data-theme='dark']:root` selector; grep for `[data-theme='moss'|'slate'|'dusk']` returns 0 |
| 2   | SC2 — ThemePicker renders exactly 3 options; System resolves to OS (THM-04) | VERIFIED | `src/components/ThemePicker.tsx:32`: `THEME_OPTIONS.map(id => ...)` auto-shrinks to 3; `src/components/ThemePicker.test.tsx:40`: `expect(radios).toHaveLength(3)`; `:42`: `expect(labels).toEqual(['Light', 'Dark', 'System'])`; 8/8 tests pass |
| 3   | SC3 — Persisted moss/slate/dusk lands on `'system'` on read AND re-persists as `'system'` (THM-05) | VERIFIED | `src/storage/prefs.test.ts:234`: read-coerce loop over `['moss','slate','dusk']` asserting `loadPrefs().theme === 'system'`; `:246`: round-trip seed `'moss'` → savePrefs → re-read raw JSON asserts `'system'`; `vitest run -t "THM-05"` passes 2/2 |
| 4   | SC4 — `FAVICON_COLORS` reduced to light+dark; `favicon.sync.test.ts` guards 2-palette mapping; pre-paint no FOUC (THM-06, THM-07) | VERIFIED | `src/styles/faviconPalette.ts:13-15`: exactly 2 entries (`light: '#5e81ac'`, `dark: '#81a1c1'`); `src/styles/favicon.sync.test.ts:22`: `CONCRETE_THEMES` filter auto-shrinks to 2; 4/4 favicon.sync tests pass; `index.html:18` FOUC allowlist = `['light','dark']`, color map = `{'light':'#5e81ac','dark':'#81a1c1'}` |
| 5   | SC5 — WCAG luminance contrast guard regenerated against 2-palette + system; passes (THM-08) | VERIFIED | `src/styles/theme.contrast.test.ts:132`: `THEME_05_FLOORS: Record<Exclude<ThemeId,'system'>, number> = { light: 1.15, dark: 1.5 }`; `:137`: `describe.each(CONCRETE_THEMES)` iterates 2 themes; 4/4 theme.contrast tests pass |
| 6   | Drift-guard test exists and locks the 3-theme-only invariant | VERIFIED | `src/content/content.no-removed-themes.test.ts` exists (154 lines); 12 forbidden tokens defined (D-04: 8 plain-substring + 1 word-bounded regex + 3 multi-token regex); scans 4 roots (`components/`, `app/`, `content/`, `styles/`) with `.ts/.tsx/.css` filter + `.test.ts/.test.tsx` exclusion; 2/2 cases pass |
| 7   | Surface deletion is complete across all four planes (CSS, FOUC IIFE, i18n, hook/component tests) | VERIFIED | `grep -rEn "\b(moss\|slate\|dusk\|Moss\|Slate\|Dusk\|Musgo\|Ardósia\|Crepúsculo)\b" src/ --include='*.ts' --include='*.tsx' --include='*.css'` returns only: (a) `theme.no-hardcoded-classes.test.ts` Tailwind `text-slate-N/bg-slate-N/border-slate-N` utility-class drift-guard (unrelated framework, predates Phase 39), and (b) `prefs.test.ts` THM-05 regression test fixtures (intentional). Zero hits in production code; zero hits in `index.html` |
| 8   | STATE_VERSION unchanged (D-01) — Phase 39 carries no migration bump | VERIFIED | `src/storage/storage.ts:40`: `STATE_VERSION = 3 as const` (unchanged from Phase 34); `git log --oneline -- src/storage/storage.ts` shows no Phase 39 commits — last touch was `f6d5c49 feat(34-02): STATE_VERSION 2→3`. Phase 8 D-01 envelope tolerance + per-field coercer handles forward-compat |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/domain/settings.ts` | ThemeId narrowed to 3 members; THEME_OPTIONS 3 entries; isValidTheme/DEFAULT_THEME unchanged | VERIFIED | L97 `ThemeId = 'light' \| 'dark' \| 'system'`; L99 `THEME_OPTIONS = ['light', 'dark', 'system']`; `DEFAULT_THEME: ThemeId = 'system'` unchanged |
| `src/styles/theme.css` | Only Light (@theme baseline) + Dark (`[data-theme='dark']:root`) palettes | VERIFIED | `grep "data-theme=" theme.css` returns 1 line at L132 (`[data-theme='dark']:root`); deprecated hex values (`#35a77c`, `#3760bf`, `#f6c177`) returns 0 hits; surviving `#5e81ac` / `#81a1c1` byte-preserved |
| `src/styles/faviconPalette.ts` | 2-entry FAVICON_COLORS table | VERIFIED | Object.freeze({ light: '#5e81ac', dark: '#81a1c1' }); Record<Exclude<ThemeId, 'system'>, string> type; buildFaviconDataUri signature unchanged |
| `src/styles/faviconPalette.test.ts` | 2-key assertion; moss/slate/dusk per-hex cases deleted | VERIFIED | `toHaveLength(2)` at L17; 11/11 tests pass; zero deprecated theme references |
| `src/styles/favicon.sync.test.ts` | comment-debt clean; CONCRETE_THEMES filter auto-shrinks; 2-palette drift-guard | VERIFIED | Zero deprecated references (L34 doc + L82 regex example rotated); `CONCRETE_THEMES = THEME_OPTIONS.filter(t !== 'system')` auto-shrinks to 2; 4/4 tests pass |
| `src/styles/theme.contrast.test.ts` | THEME_05_FLOORS 2 entries | VERIFIED | `{ light: 1.15, dark: 1.5 }` at L132-135; describe.each auto-iterates 2 themes; docstring "2 concrete themes (light, dark)"; 4/4 tests pass |
| `src/content/strings.ts` | UiStrings.themes type + EN + PT-BR catalogs each 3 entries | VERIFIED | Type block L35-39 (3 fields); EN L190-194 ('Light'/'Dark'/'System'); PT-BR L343-347 ('Claro'/'Escuro'/'Sistema'); zero Musgo/Ardósia/Crepúsculo |
| `src/components/ThemePicker.tsx` | THEME_OPTIONS.map render auto-shrinks; comment-debt updated | VERIFIED | L8 comment reads "English-locked labels (Light/Dark/System verbatim)"; L32 maps `THEME_OPTIONS` (auto-shrinks via Plan 01) |
| `src/components/ThemePicker.test.tsx` | 3-option assertion + L87 description fix + rotations | VERIFIED | `toHaveLength(3)` + `['Light','Dark','System']` at L40-42; "all 3 buttons" at L87; behavioral rotations preserved (8 it() blocks); 8/8 pass |
| `src/hooks/useTheme.test.ts` | seedPrefs('moss'/'dusk') rotated; cross-tab event payload rotated | VERIFIED | Zero deprecated references; 11/11 tests pass (cross-tab uses `'dark' → 'light'` for non-trivial delta) |
| `src/hooks/useThemeChoice.test.ts` | 16 hits rotated (fixtures + setters + it() descriptions) | VERIFIED | Zero deprecated references; all setTheme calls + assertions + it() descriptions rotated; 6/6 tests pass |
| `src/hooks/useFavicon.test.ts` | 8 hits rotated incl. FAVICON_COLORS.* property accesses | VERIFIED | Zero deprecated references; `FAVICON_COLORS.moss\|.slate\|.dusk` property accesses (TS-2339 after Plan 02 key deletions) all rewritten to `.light`/`.dark`; 10/10 tests pass |
| `src/storage/prefs.test.ts` | THM-05 two-level regression added (read-coerce + round-trip) | VERIFIED | `it('coerces deprecated persisted theme values...')` at L234 (iterates `['moss','slate','dusk']`); `it('re-persists deprecated theme as "system"...')` at L242 (round-trip); both pass |
| `index.html` L18 FOUC IIFE | 2-token allowlist + 2-entry color map; IIFE shape preserved | VERIFIED | `['light','dark'].indexOf(t)<0` allowlist; `var c={'light':'#5e81ac','dark':'#81a1c1'};` color map; matchMedia + catch fallback byte-preserved; single-line minified shape preserved (1113 chars) |
| `src/content/content.no-removed-themes.test.ts` | NEW drift-guard mirroring no-variants.test.ts | VERIFIED | File exists (154 lines); 12-entry FORBIDDEN_TOKENS; 4-root scan; collectFiles with .ts/.tsx/.css filter + .test.ts/.test.tsx exclusion; sanity-floor + main-sweep it() cases; 2/2 pass |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `src/domain/settings.ts` | `src/storage/prefs.ts` | `isValidTheme(raw) ? raw : DEFAULT_THEME` in coerceTheme | WIRED | Union narrowing flips `isValidTheme('moss'/'slate'/'dusk')` to false, routing to DEFAULT_THEME `'system'`; verified by passing THM-05 cases |
| `src/styles/faviconPalette.ts` | `src/domain/settings.ts` | `Record<Exclude<ThemeId, 'system'>, string>` | WIRED | Type narrows via union shrink in Plan 01; literal collapse in Plan 02 matches narrowed type; `tsc --noEmit` exits 0 |
| `src/styles/theme.contrast.test.ts` | `src/domain/settings.ts` | `Record<Exclude<ThemeId, 'system'>, number>` THEME_05_FLOORS | WIRED | Same narrowing pattern; literal collapsed to 2 entries; tsc green |
| `src/styles/favicon.sync.test.ts` | `src/styles/theme.css` + `src/styles/faviconPalette.ts` | Parses theme.css `[data-theme='${themeId}']:root` blocks; cross-asserts with FAVICON_COLORS | WIRED | `describe.each(CONCRETE_THEMES)` auto-iterates 2 themes; 4/4 cases pass; THM-07 invariant intact |
| `index.html:18` FOUC | `src/storage/prefs.ts` coerce path | localStorage read → allowlist check → matchMedia fallback for invalid | WIRED | Deprecated persisted value (`'moss'`) falls through `['light','dark'].indexOf('moss') < 0` to matchMedia → OS-active; post-mount coerceTheme re-persists as `'system'`; round-trip locked by prefs.test.ts |
| `src/content/content.no-removed-themes.test.ts` | 4 roots (components, app, content, styles) | `collectFiles` recursive fs-scan with .ts/.tsx/.css filter | WIRED | `SCAN_FILES.length > 10` sanity floor passes (~70+ files); main sweep iterates all 12 FORBIDDEN_TOKENS over every file; 0 hits — passes |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full test suite green | `npm run test:run` | `Test Files 72 passed (72) / Tests 1082 passed (1082)` | PASS |
| TypeScript compile clean | `npx tsc --noEmit` | exit 0, zero output | PASS |
| Production build green | `npm run build` | `built in 781ms` / `dist/index.html 2.55 kB` / PWA precache 17 entries | PASS |
| Drift-guard isolated run | `npx vitest run src/content/content.no-removed-themes.test.ts` | `Test Files 1 passed (1) / Tests 2 passed (2)` | PASS |
| THM-05 regression isolated run | `npx vitest run src/storage/prefs.test.ts -t "THM-05"` | `Tests 2 passed \| 24 skipped (26)` | PASS |
| Cumulative grep audit — production code | `grep -rEn "\b(moss\|slate\|dusk\|Moss\|Slate\|Dusk\|Musgo\|Ardósia\|Crepúsculo)\b" src/ --include='*.ts' --include='*.tsx' --include='*.css' \| grep -v content.no-removed-themes.test.ts` | Returns: (a) Tailwind `text-slate-N/bg-slate-N/border-slate-N` utility-class drift-guard (unrelated CSS framework — pre-Phase-39 artifact), (b) `prefs.test.ts` THM-05 regression test fixtures (intentional, locks coercion contract) | PASS — both classes of remaining hits are accepted (documented in 39-05-SUMMARY.md Closing Audit) |
| index.html clean | `grep -nE "moss\|slate\|dusk" index.html` | 0 matches | PASS |
| STATE_VERSION unchanged | `git log --oneline -- src/storage/storage.ts \| head -5` | No Phase 39 commits; last touch is `f6d5c49 feat(34-02)`; current value `STATE_VERSION = 3 as const` | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| THM-01 | 39-01, 39-02, 39-05 | Moss palette removed from theme.css + ThemeId union | SATISFIED | `ThemeId = 'light' \| 'dark' \| 'system'`; theme.css `[data-theme='moss']:root` deleted (Plan 02 commit 765ed6e); drift-guard locks via 12-token banlist |
| THM-02 | 39-01, 39-02, 39-05 | Slate palette removed | SATISFIED | Same evidence as THM-01 for slate selectors/keys |
| THM-03 | 39-01, 39-02, 39-05 | Dusk palette removed | SATISFIED | Same evidence as THM-01 for dusk selectors/keys |
| THM-04 | 39-01, 39-03 | ThemePicker reduced to Light/Dark/System (3 options) | SATISFIED | THEME_OPTIONS narrowed (Plan 01); UiStrings.themes 3 fields + EN/PT-BR catalogs 3 entries (Plan 03); ThemePicker.test.tsx asserts `toHaveLength(3)` with `['Light','Dark','System']` |
| THM-05 | 39-01 | Persisted deprecated → 'system' on read; re-persists as 'system' | SATISFIED | prefs.test.ts two-level regression (commit 03912aa) passes 2/2; no STATE_VERSION bump |
| THM-06 | 39-02 | faviconPalette reduced to light + dark | SATISFIED | FAVICON_COLORS = 2 entries; faviconPalette.test.ts `toHaveLength(2)` passes 11/11 |
| THM-07 | 39-02, 39-04 | favicon.sync.test.ts guards 2-palette mapping | SATISFIED | favicon.sync.test.ts comment-debt clean; CONCRETE_THEMES filter auto-shrinks; cross-file invariant (theme.css ↔ FAVICON_COLORS ↔ index.html FOUC) — all sides align to {light, dark}; 4/4 tests pass |
| THM-08 | 39-02 | WCAG luminance contrast guard regenerated for 2-palette + system | SATISFIED | theme.contrast.test.ts THEME_05_FLOORS = {light: 1.15, dark: 1.5}; describe.each auto-iterates 2; 4/4 tests pass |

All 8 THM requirement IDs from REQUIREMENTS.md Phase 39 mapping (`THM-01..08`) are covered by at least one plan's `requirements` frontmatter, satisfied in the codebase, and corroborated by passing tests. Zero orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (none) | — | — | — | — |

Scanned all Phase 39 modified files (`src/domain/settings.ts`, `src/storage/prefs.test.ts`, `src/styles/theme.css`, `src/styles/faviconPalette.ts`, `src/styles/faviconPalette.test.ts`, `src/styles/favicon.sync.test.ts`, `src/styles/theme.contrast.test.ts`, `src/content/strings.ts`, `src/components/ThemePicker.tsx`, `src/components/ThemePicker.test.tsx`, `src/hooks/useTheme.test.ts`, `src/hooks/useThemeChoice.test.ts`, `src/hooks/useFavicon.test.ts`, `src/app/App.session.test.tsx`, `index.html`, `src/content/content.no-removed-themes.test.ts`, `src/components/PracticeToggle.tsx`) for TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers and stub patterns. Zero hits.

### Documented Deviations (Reviewed and Accepted)

| Deviation | Plan | Type | Disposition |
| --------- | ---- | ---- | ----------- |
| Lowercase `'slate'` matcher narrowed from `t.includes('slate')` to word-bounded regex `/(?<![a-zA-Z])slate(?![a-zA-Z])/` | 39-05 | Rule 3 (Blocking) | ACCEPTED — Plan's plain-substring matcher would have false-positive flagged the structurally-unavoidable CSS/Tailwind keyword `translate*` in OrbShape.tsx, BooleanToggle.tsx, StatusPanel.tsx, etc. The threat T-39-16 disposition (CONTEXT.md) explicitly authorizes this narrowing. Invariant preserved 100%: word-bounded regex still catches `'slate'` literal, `[data-theme='slate']`, `slate:` (object key), and free-text `slate`; does NOT catch `translate*`. Documented in 39-05-SUMMARY.md "Auto-fixed Issues #2 [Rule 3]" |
| Plan 05 Task 1 stale-comment rotations in non-test files (PracticeToggle.tsx L62/L79 "on dark/dusk" → "on the dark theme"; theme.css L28 "n3 polar slate" → "n3 polar tone") | 39-05 | Rule 1 (Bug) | ACCEPTED — Plan 05 Task 1 step 8 explicitly directs this ("Common false-failure traceback: a stray 'slate' comment in surviving code ... Investigate and either rotate the comment wording or — only if the planner explicitly approves — narrow the substring entry to a regex"). Both options were exercised: rotate the rotatable, narrow the unrotatable. Documented in 39-05-SUMMARY.md "Auto-fixed Issues #1 [Rule 1]" with commit `4ef624c` |
| Plan 03 useFavicon.test.ts Group A rotation: moss → light (not moss → dark as plan recommended) | 39-03 | Rule 3 (Blocking) | ACCEPTED — Plan's recommended `moss → dark` rotation would have produced a duplicate it() description with the existing L72 "dark" test in the same describe block (misleading documentation). Rotated to `light` instead, yielding complementary dark/light mount-time coverage. Documented in 39-03-SUMMARY.md "Auto-fixed Issues #1 [Rule 3]" with commit `19cb9e6` |
| Plan 01 + Plan 04: `pnpm` unavailable in executor worktree; used `npm`/`node_modules/.bin/{vitest,vite}` instead | 39-01, 39-04 | Operational | NOT A DEVIATION — Tool-mapping artifact of the worktree provisioning; commands run via main-repo binaries with worktree cwd produce identical results. Phase tests pass against the same binaries used to verify here. |

### Human Verification Required

None.

All Phase 39 success criteria are programmatically verifiable through grep, tsc, vitest, and vite build. No visual / real-time / external-service behaviors to validate (this is a pure deletion phase preserving existing behaviors). Phase 41 Mono Zen visual rebuild and Phase 43 surface redesign will require human visual verification; Phase 39 does not.

### Gaps Summary

No gaps. All 8 must-haves verified. All 8 THM requirement IDs satisfied. Full closing green gate (tsc + 1082 tests + build) exits 0. Drift-guard locks the deletion against future regression.

The phase goal — "collapse the theme system from 6 themes down to 3, removing moss/slate/dusk runtime artifacts across types, CSS, strings, favicon palette, FOUC IIFE, and tests; and lock the deletion against re-introduction with a drift-guard test" — is observably achieved in the codebase.

---

*Verified: 2026-05-21T18:00:00Z*
*Verifier: Claude (gsd-verifier)*
