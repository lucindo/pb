# Phase 39: Theme simplification — Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Collapse the 5-palette + system theme system to **3 options** (`light` / `dark` / `system`) so Phase 41 Mono Zen only has to retune two palettes plus a system follow. The three named palettes (Moss, Slate, Dusk) are deleted from code / CSS / picker / favicon map / contrast test / i18n catalogs. Persisted `theme: 'moss' | 'slate' | 'dusk'` coerces to `'system'` on read via `coerceTheme` and re-persists as `'system'` on next write (Phase 8 D-01 envelope tolerance preserves the original value on disk until it gets rewritten).

**In scope:**
- Shrink `ThemeId` union from `'light' | 'dark' | 'system' | 'moss' | 'slate' | 'dusk'` to `'light' | 'dark' | 'system'` in `src/domain/settings.ts`
- Shrink `THEME_OPTIONS` from 6 → 3 entries (`['light', 'dark', 'system']`)
- `coerceTheme` body unchanged — already returns `DEFAULT_THEME` (`'system'`) for invalid input; flipping moss/slate/dusk to "invalid" via the union narrowing makes THM-05 the natural read-path behavior
- Delete 3 `[data-theme='moss'/'slate'/'dusk']:root { ... }` blocks from `src/styles/theme.css` (~L193–L360)
- Delete 3 entries (`moss`, `slate`, `dusk`) from `FAVICON_COLORS` in `src/styles/faviconPalette.ts`
- Delete `themes.moss/slate/dusk` from the `UiStrings` type AND both EN + PT-BR catalogs in `src/content/strings.ts` (`Moss/Slate/Dusk`, `Musgo/Ardósia/Crepúsculo`)
- Update `src/styles/theme.contrast.test.ts` — drop 3 entries from `THEME_05_FLOORS` (table shape preserved; `CONCRETE_THEMES` derives from `THEME_OPTIONS` and shrinks naturally)
- Update `src/styles/faviconPalette.test.ts` — strip 3 hex assertions; update the 5-keys assertion to 2-keys
- Update `src/styles/favicon.sync.test.ts` — guard the new 2-palette mapping (THM-07)
- Update `src/components/ThemePicker.test.tsx` — strip moss/slate/dusk option-list assertions; expect 3 options total
- Surgical edit of `index.html:18` inline FOUC script — drop `'moss'/'slate'/'dusk'` from the allowlist + 3 hex entries from the `c` color map; preserve the minified single-line IIFE shape
- Add a Phase 39 fs-scan drift-guard test at `src/content/content.no-removed-themes.test.ts` (D-03..D-05) — analog to Phase 38 `content.no-variants.test.ts`
- Two-level THM-05 regression test in `src/storage/prefs.test.ts` (D-02) — read-coerce + write-back round-trip
- Surgical strip of cross-cutting tests that reference deprecated theme IDs (e.g. `src/app/App.session.test.tsx` has a `'moss'` reference per grep; verify all at plan time)

**Out of scope (other phases):**
- Mono Zen palette retune (`light` accent `#5e81ac → #5d6877`, `dark` accent `#81a1c1 → #b4bac4`, bg/surface re-paint, `borderSoft`/`textSoft`/`orbHalo1-3`/`onAccent` new tokens, semibold Inter typography) — **Phase 41**
- New orb (three-layer halo + centre disc) — Phase 42
- App Settings page surface (where ThemePicker will live in v2.0) — Phase 43
- `STATE_VERSION` bump — explicitly NOT bumped (per-field coerce + Phase 8 D-01 envelope tolerance — same stance as Phase 38)
- Re-introduction of any deprecated palette (rejected alternates per spike-010 visual lock — exit-ramp is via explicit drift-guard deletion in a future deliberate phase)
- `useTheme.ts` / `useThemeChoice.ts` hook body changes — the apply effect already only differentiates "is system?" vs "write data-theme"; behavior survives the union shrink unchanged

</domain>

<decisions>
## Implementation Decisions

### Persisted-pref disposition
- **D-01:** **Tighten `ThemeId` to `'light' | 'dark' | 'system'`; keep the field; let `coerceTheme` handle THM-05.** Phase 38 D-01 deleted the `variant` field entirely; Phase 39 keeps `theme` (it's required, has a meaningful default, and the redesign needs it). The persisted-value coercion happens naturally: `THEME_OPTIONS` shrinks to 3, `isValidTheme('moss')` returns false, `coerceTheme('moss')` returns `DEFAULT_THEME` (`'system'`). On next save, the in-memory `'system'` value writes back. **No `STATE_VERSION` bump** (Phase 8 D-01 envelope tolerance + per-field coercer; matches Phase 38 stance). On disk, the original `'moss'` value is preserved via `readEnvelope`'s spread-then-override pattern until the next `savePrefs` call overwrites it with `'system'`.

### THM-05 re-persist verification
- **D-02:** **Two-level regression test in `src/storage/prefs.test.ts`** locking both halves of THM-05:
  1. **Read-coerce:** seed `localStorage[STATE_KEY]` with `{prefs: {theme: 'moss'}}` (and `'slate'`, `'dusk'`), call `loadPrefs()`, assert returned `theme === 'system'`.
  2. **Round-trip:** `const loaded = loadPrefs()` → `savePrefs(loaded)` → `loadPrefs()` again → assert persisted JSON `prefs.theme === 'system'` (not the original deprecated value). Locks the re-persist contract against future hook refactors that might break `setTheme(loaded.theme)` flow on mount. Matches the Phase 38 VAR-05 forward-compat fill pattern (which was added late as commit `4bd5e78`; Phase 39 captures it up-front).

### Drift-guard mechanism
- **D-03:** **Add an fs-scan drift-guard test** at `src/content/content.no-removed-themes.test.ts` (closest analog naming; planner may pick `src/styles/no-removed-themes.test.ts` if path scoping reads cleaner). Direct structural twin of Phase 38 `src/content/content.no-variants.test.ts` (which itself twinned Phase 37 `content.no-stats-ui.test.ts`). Same loop, same four-root scope, same `.ts/.tsx/.css` filter (Phase 38 D-04 extension carries forward), same filename-filter test-exclusion (`*.test.ts` / `*.test.tsx`; the guard file excludes itself by name). Single Vitest case that fails CI if any forbidden token appears in any non-test file under the scoped roots.
- **D-04:** **Forbidden token list (case-sensitive unless flagged):**
  - **Plain substring (identifier/key references + display strings):** `moss`, `slate`, `dusk`, `Moss`, `Slate`, `Dusk`, `Musgo`, `Ardósia`, `Crepúsculo`
  - **Regex (persisted-value literals):** `/theme:\s*['"](moss|slate|dusk)['"]/`
  - **Regex (CSS selectors):** `/\[data-theme=['"]?(moss|slate|dusk)['"]?\]/`
  - **Regex (object-key entries — favicon palette, contrast floors, etc.):** `/'(moss|slate|dusk)'\s*:/`
- **D-05:** **Surface coverage:** four scanned roots — `src/components/`, `src/app/`, `src/content/`, `src/styles/` — cover render paths (components + app), i18n catalogs (content), and CSS tokens (styles). Test files (`*.test.ts` / `*.test.tsx`) excluded via filename filter; the guard file itself is excluded by its own filename.
- **D-06:** **Exit-ramp policy (mirrors Phase 37 D-11 + Phase 38 D-06):** any future deliberate phase that re-introduces a deprecated palette (or a new palette under one of the reserved names) explicitly deletes this drift-guard test with rationale logged in its SUMMARY. The test IS the lock; deleting it IS the unlock.

### i18n strings disposition
- **D-07:** **Clean cut** — delete the `themes.moss`, `themes.slate`, `themes.dusk` fields from the `UiStrings.themes` type AND from both EN + PT-BR catalogs in `src/content/strings.ts`. Per Phase 37 D-01 + Phase 38 D-08 precedent: re-introduction (if it ever happens) will design fresh copy + key shape anyway; orphan strings risk rot and unused-export lint noise. The Phase 26 `content.no-review-markers.test.ts` drift-guard stays intact (no review markers are introduced — the strings disappear entirely). The Phase 19 `LOCKED_COPY` byte-equality guard is untouched (palette display strings are NOT in `LOCKED_COPY` — only Forrest/medical claim-safe copy is).

### index.html inline FOUC script
- **D-08:** **Surgical edit, preserve minified one-liner shape.** Touch points (3 total within `index.html:18`):
  1. Allowlist: `['light','dark','moss','slate','dusk'].indexOf(t)<0` → `['light','dark'].indexOf(t)<0` (2 tokens deleted)
  2. Color map: `var c={'light':'#5e81ac','dark':'#81a1c1','moss':'#35a77c','slate':'#3760bf','dusk':'#f6c177'};` → `var c={'light':'#5e81ac','dark':'#81a1c1'};` (3 hex entries deleted)
  3. (No third touch-point — the system-fallback matchMedia branch and the catch-fallback already write `light` defaults; no moss/slate/dusk references there.)
  No structural change to the IIFE shape, the pre-paint contract, or the `data-theme` write timing. Phase 41 (Mono Zen) will retune the surviving 2 hex values in the `c` map; the structure stays.

### Contrast guard disposition
- **D-09:** **Keep per-theme `THEME_05_FLOORS` table** in `src/styles/theme.contrast.test.ts`. After the union shrink, `THEME_05_FLOORS: Record<Exclude<ThemeId, 'system'>, number>` becomes a 2-entry record (`light`, `dark`); TypeScript enforces the shape. Just delete the 3 deprecated entries from the table literal. `CONCRETE_THEMES` (derived from `THEME_OPTIONS.filter(t => t !== 'system')`) auto-shrinks to 2; `describe.each` auto-iterates 2 themes. **Forward-compat for Phase 41:** Mono Zen may want different per-theme floors (cool-slate accent has different contrast against the new bg surfaces than the current Nord accent) — the table shape gives Phase 41 room to retune floors without touching the test scaffold. THM-08 (WCAG contrast guard regenerated) satisfied via the existing scaffolding.

### faviconPalette disposition
- **D-10:** **Drop 3 entries from `FAVICON_COLORS` in `src/styles/faviconPalette.ts`.** The `Record<Exclude<ThemeId, 'system'>, string>` type auto-shrinks to `Record<'light' | 'dark', string>`. `buildFaviconDataUri(theme: Exclude<ThemeId, 'system'>)` signature unchanged. `useFavicon.ts` consumer unchanged. THM-06 satisfied. Phase 21 D-01 ("single source for the 5 palette accent colors") contract collapses to 2 colors — the pattern survives, the cardinality changes.

### Test retention
- **D-11:** **Delete-with-component test policy** (Phase 37 D-06, Phase 38 D-09) — strip moss/slate/dusk branches from `prefs.test.ts`, `faviconPalette.test.ts`, `favicon.sync.test.ts`, `theme.contrast.test.ts`, `ThemePicker.test.tsx`, `useTheme.test.ts`, `useThemeChoice.test.ts` in the same commit/plan as their source-file collapse.
- **D-12:** **Surgical strip of cross-cutting tests** (Phase 37 D-07, Phase 38 D-10) — strip moss/slate/dusk fixture references from `src/app/App.session.test.tsx` (current grep finds at least one), `src/content/strings.test.ts`, and any other tests that import deprecated theme IDs. Keep the rest of those files intact.

### Plan structure (Claude's Discretion)
- **File-level commit grouping** (single atomic vs split domain/storage / CSS+favicon / i18n / FOUC script / drift-guard) — planner chooses based on git-history clarity. Tiger Style "small atomic commits" + Phase 36 PATTERNS + Phase 38 precedent favor split.
- **Suggested plan order:** (1) domain/storage type collapse + prefs.test.ts (D-01 + D-02), (2) CSS deletion + faviconPalette + contrast test + favicon.sync test (D-09 + D-10), (3) i18n strings + ThemePicker test (D-07), (4) index.html FOUC script (D-08), (5) drift-guard test (D-03..D-06). Planner may reorder if dependency analysis flips the order.
- **Drift-guard test filename** — `src/content/content.no-removed-themes.test.ts` is the closest analog; planner may pick `src/styles/no-removed-themes.test.ts` or similar if path scoping reads cleaner during the PATTERNS pass.
- **Whether to inline-ban PT-BR display strings (`Musgo`/`Ardósia`/`Crepúsculo`)** in the drift-guard's plain-substring list or rely on the `UiStrings` type removal alone for catalog drift — planner picks the cleaner banlist shape during PATTERNS pass (D-04 errs on inclusion).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Spike & milestone alignment
- `.planning/spikes/MANIFEST.md` §Requirements — locks `light + dark + system` only; Moss/Slate/Dusk are rejected alternates from the spike-009 → spike-010 investigation trail. Don't re-propose them.
- `.planning/spikes/010-mono-zen-light-dark/` (folder) — visual lock; rejected color directions documented in README. Phase 41 will apply the surviving palette retune; Phase 39 only deletes the rejected ones.
- `.planning/PROJECT.md` §Current Milestone: v2.0 New Design — frames Phase 39 alongside 37/38/41/42/43 so the planner understands sequencing (39 lands after 38 variant-removal; before 41 Mono Zen palette retune).
- `.planning/ROADMAP.md` §Phase 39 — goal + 5 ROADMAP success criteria (THM-01..04 deletion, THM-05 coerce, THM-06/07 favicon, THM-08 contrast guard).
- `.planning/REQUIREMENTS.md` §THM — THM-01..08 normative statements.

### Pattern analogs (planner reuses these in PATTERNS.md)
- `src/content/content.no-variants.test.ts` — **Phase 38 VAR-06 drift-guard. The direct structural twin for D-03.** Same fs-scan shape, four-root scope, `.ts/.tsx/.css` extension filter, filename-filter test-exclusion, regex+substring forbidden-token list. Reuse verbatim with the Phase 39 token list (D-04).
- `src/content/content.no-stats-ui.test.ts` — Phase 37 STATS-05 drift-guard. Original precedent; Phase 38 inherited from this. Reference for structural questions.
- `.planning/phases/38-variant-removal/38-CONTEXT.md` — direct precedent for clean-cut i18n delete (D-07 ↔ D-08), drift-guard pattern (D-03..D-06 ↔ D-04..D-07), delete-with-component policy (D-11 ↔ D-09), surgical-strip pattern (D-12 ↔ D-10), no-`STATE_VERSION`-bump stance (D-01 ↔ D-01). The planner's strongest analog for plan shape.
- `.planning/phases/37-stats-ui-removal/37-CONTEXT.md` — Phase 37 precedent (original i18n clean-cut + original drift-guard scaffold).
- `.planning/phases/38-variant-removal/38-04-SUMMARY.md` — Phase 38 VAR-06 drift-guard implementation summary; concrete shape of the four-root + `.css`-extension scan that Phase 39 mirrors.

### Codebase touchpoints (full path list — feeds the planner directly)
- `src/domain/settings.ts:97-105` — shrink `ThemeId` union; shrink `THEME_OPTIONS`; `isValidTheme`/`DEFAULT_THEME` bodies unchanged (logic flows from the union)
- `src/storage/prefs.ts:38-39, 66` — `coerceTheme` body unchanged; return type narrows from settings.ts shrink
- `src/storage/prefs.test.ts:109-116` (plus elsewhere) — strip moss/slate/dusk THEME_OPTIONS iteration cases; ADD two-level THM-05 regression test (D-02)
- `src/styles/theme.css:193-360` — delete `[data-theme='moss']:root { ... }` (L193..), `[data-theme='slate']:root { ... }` (L241..), `[data-theme='dusk']:root { ... }` (L302..) — ~165 LOC total
- `src/styles/faviconPalette.ts:15-17` — delete `moss`, `slate`, `dusk` entries from `FAVICON_COLORS` (D-10)
- `src/styles/faviconPalette.test.ts:18, 29-39` — update 5-keys assertion to 2-keys; drop 3 hex assertions; check the build-favicon-uri iteration (if any)
- `src/styles/favicon.sync.test.ts` — update guard to expect the 2-palette mapping (THM-07 explicit requirement)
- `src/styles/theme.contrast.test.ts:124-132` — drop 3 entries from `THEME_05_FLOORS` table literal (D-09)
- `src/content/strings.ts:35-42, 197-199, 353-355` — delete `themes.moss/slate/dusk` from type + EN + PT-BR catalogs (D-07)
- `src/content/strings.test.ts` — verify any iterations over `themes` keys still pass (likely no change beyond the type narrowing)
- `src/components/ThemePicker.tsx` — no code change (renders `THEME_OPTIONS.map(...)`); option list shrinks from 6 to 3 automatically
- `src/components/ThemePicker.test.tsx` — strip moss/slate/dusk assertions; expect 3 options
- `src/app/App.session.test.tsx` — surgical strip of any `'moss'` references (verify with grep at plan time, D-12)
- `src/hooks/useTheme.ts` — no body change (apply effect already only branches on `'system'` vs named-theme)
- `src/hooks/useTheme.test.ts` + `useThemeChoice.test.ts` — verify theme-iteration assertions; strip deprecated values
- `src/hooks/useFavicon.ts` + `useFavicon.test.ts` — no body change (consumes `FAVICON_COLORS` keyed by `Exclude<ThemeId, 'system'>`; auto-shrinks)
- `index.html:18` — surgical edit of inline FOUC script (D-08): drop 3 allowlist tokens + 3 color-map hex entries
- **NEW** `src/content/content.no-removed-themes.test.ts` (or planner's chosen analog filename) — Phase 39 drift-guard (D-03..D-06)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/content/content.no-variants.test.ts`** — Phase 38 VAR-06 drift-guard. **The load-bearing analog for D-03.** Already validated as part of the 1095/1095 test count at Phase 38 close. Same fs-scan loop, same test-file exclusion, same forbidden-token-list shape (10 plain-substring + 2 persisted-value regex + 2 CSS selector regex). Phase 38 D-04 extended the file-extension filter from `.ts/.tsx` to also accept `.css` (vs Phase 37's `.ts/.tsx`-only filter) — Phase 39 inherits the extended filter. The only thing that changes for Phase 39 is the forbidden-token list (D-04 of this phase).
- **`src/content/content.no-stats-ui.test.ts`** — Phase 37 STATS-05 drift-guard. Original precedent (131 LOC); Phase 38 extended it to 133 LOC with the `.css` filter.
- **Phase 8 D-01 envelope tolerance** (`readEnvelope` in `src/storage/envelope.ts`) — spread-then-override pattern preserves unknown keys on disk. Deprecated `theme: 'moss'` value reads via `coerceTheme` → `'system'` (in-memory) while the original `'moss'` is harmlessly preserved on the persisted object until the next `savePrefs` call overwrites it. No `STATE_VERSION` bump needed.
- **`coerceTheme`** (`src/storage/prefs.ts:38-39`) — already correct (`return isValidTheme(raw) ? raw : DEFAULT_THEME`). No body changes; the union-narrowing in `src/domain/settings.ts` makes moss/slate/dusk fail `isValidTheme` → return `DEFAULT_THEME` (`'system'`). This is the THM-05 read-side mechanism in one line.
- **Per-field non-throwing coercer pattern** (Phase 14) — `coerceTheme` is one of 5 such coercers in `coercePrefs` (theme, timbre, cue, locale, plus the now-deleted variant). After Phase 38 only 4 remain; Phase 39 changes the return-union shape of `coerceTheme` but not its position in the pipeline.

### Established Patterns
- **Typed catalog with frozen-EN guard** (Phase 19 I18N + Phase 26 I18N-07) — removing `themes.moss/slate/dusk` from the `UiStrings` type AND both catalogs is the type-safe clean path; the type system catches stale consumers at compile time.
- **`LOCKED_COPY` byte-equality guard** (Phase 19) — palette display strings (`'Moss'`/`'Slate'`/`'Dusk'`/`'Musgo'`/`'Ardósia'`/`'Crepúsculo'`) are NOT in `LOCKED_COPY` (only Forrest/medical claim-safe copy is). Deletion is safe.
- **`Record<Exclude<ThemeId, 'system'>, X>` shape** (`FAVICON_COLORS`, `THEME_05_FLOORS`) — the type narrows naturally when the union shrinks. TypeScript enforces exhaustive keys; deleting `moss/slate/dusk` literal entries is the type-safe way to drop them.
- **Atomic commit per logical change scoped `(39)`** (Tiger Style, reinforced by Phase 36/37/38 PATTERNS) — small, focused commits.
- **Drift-guard-as-lock pattern** (Phase 26 I18N-07, Phase 37 STATS-05, Phase 38 VAR-06) — runtime fs-scan vitest test makes the absence-invariant survive future contributions; deleting the test file is the explicit unlock for future re-introduction.
- **No-FOUC pre-paint pattern** (Phase 21) — inline IIFE in `index.html` reads `localStorage`, resolves system→OS, writes `data-theme` + favicon before first paint. Survives the union narrowing intact.

### Integration Points
- **`ThemePicker.tsx` render** (`THEME_OPTIONS.map(id => ...)`) — option list shrinks from 6 → 3 automatically once `THEME_OPTIONS` shrinks. No JSX change. The `id` is typed `ThemeId`, so the closure body still type-checks.
- **`useTheme.ts` apply effect** — writes `data-theme` for named themes (`light`, `dark`); defers to mql for `'system'`. After collapse the apply effect handles only `light`/`dark` written paths plus `system` mql — semantically identical to today (moss/slate/dusk already used the named-theme write path).
- **`useTheme.ts` mql effect** — only attaches `matchMedia` listener when state === `'system'`. Unchanged.
- **`useTheme.ts` cross-tab + same-tab listeners** — re-read `loadPrefs().theme` (passed through `coerceTheme`). Coerce-on-read carries the THM-05 invariant across tabs automatically.
- **`useFavicon.ts`** — consumes `FAVICON_COLORS[theme]` keyed by `Exclude<ThemeId, 'system'>`. After collapse, key set is `'light' | 'dark'`. Logic unchanged; type narrows.
- **`theme.css:132` `[data-theme='dark']:root { ... }`** — Dark stays (palette currently uses Nord accents; Phase 41 will retune to Mono Zen). Light is the `@theme` baseline (no `data-theme` block). The 3 deletions in Phase 39 are `[data-theme='moss'/'slate'/'dusk']` blocks at L193, L241, L302.
- **`index.html:18` FOUC script** — `if(t==='system' || !t || ['light','dark','moss','slate','dusk'].indexOf(t)<0)` resolves invalid/deprecated values to OS-active. Surgical edit (D-08) shrinks the allowlist; the matchMedia fallback already handles the "deprecated value" case for any persisted user.
- **Comment debt** — `theme.css` has commentary referencing the 5-palette set (e.g. `// midpoint colors, iterated over the 5 concrete themes (light, dark, moss, slate, dusk).` in `theme.contrast.test.ts:5`). Tiger Style WHY-only: the WHY no longer cites 5 concrete themes → comment updates or deletes per planner judgment.

</code_context>

<specifics>
## Specific Ideas

- The drift-guard test (D-03..D-06) is the load-bearing artifact of this phase — it's how the Mono Zen visual lock survives Phase 41+ contributions. Treat as a first-class deliverable, equal weight to the actual deletions.
- THM-08 (WCAG contrast guard) is the cheapest THM requirement to satisfy — the test scaffold shrinks from union narrowing alone. No code change beyond `THEME_05_FLOORS` literal deletions.
- The two-level THM-05 test (D-02) is a proactive forward-compat fill — Phase 38 added its equivalent (VAR-05) only at end-of-phase as commit `4bd5e78`. Locking it up-front in Phase 39 saves a retroactive validation cycle.
- Phase 41 (Mono Zen) will retune the surviving 2 palette hex values (`light` accent `#5e81ac → #5d6877`, `dark` accent `#81a1c1 → #b4bac4`, plus new bg/surface/border tokens). Phase 39 must leave `light` + `dark` palette hex values UNCHANGED — the only Phase 39 hex deletions are the 3 deprecated palette accent values in `FAVICON_COLORS` and the 3 `:root { ... }` blocks in `theme.css`.
- The `git grep -i 'moss\|slate\|dusk' src/` audit at the close of plan execution is the belt-and-suspenders pair to the drift-guard (matches Phase 38's manual-audit pattern at end-of-phase).

</specifics>

<deferred>
## Deferred Ideas

- **Mono Zen palette retune** (`light` + `dark` hex value rewrite per spike-010: `bg #f3f5f7` / surface `#ffffff` / accent slate `#5d6877` light; `bg #1a1d24` / surface `#252932` / accent dimmed mid-slate `#b4bac4` dark) — **Phase 41**, not 39. Phase 39 deletes the rejected 3 palettes; Phase 41 retunes the surviving 2.
- **`borderSoft` / `textSoft` / `orbHalo1-3` / `onAccent` token additions** — Phase 41.
- **Semibold Inter typography app-wide** — Phase 41.
- **Top-bar gear icon → App Settings page** (where ThemePicker will live in v2.0) — Phase 43.
- **`MuteToggle.tsx:52` chrome alignment to `borderSoft`/`textSoft`** — Phase 42 ORB-10.
- **WCAG luminance contrast guard regeneration against Mono Zen palette values** (THM-08 is satisfied by Phase 39 against current hex; Phase 41 re-runs against new hex) — Phase 41 follow-on.
- **`shapeConstants.ts` filename rename** (carried from Phase 38 deferred) — not relevant to Phase 39.
- **`THEME_05_FLOORS` per-theme floor retune** — Phase 41 may adjust floors to match Mono Zen's new accent contrast against new bg/surface.
- **Default value of `VITE_BREATHING_SHAPE` and `VITE_ORB_IDLE_BEHAVIOR`** (spike-010 deferred decisions) — Phase 42.

</deferred>

---

*Phase: 39-theme-simplification*
*Context gathered: 2026-05-21*
