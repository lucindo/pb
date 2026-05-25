---
phase: 39
slug: theme-simplification
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-21
---

# Phase 39 — Validation Strategy

> Per-phase validation contract reconstructed from artifacts after phase completion (State B).
> All 8 THM requirements have automated test coverage; the drift-guard locks THM-01..03 against future regression.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (jsdom env via `@testing-library/react`) |
| **Config file** | inline in `vite.config.ts` (no separate `vitest.config.*`) |
| **Quick run command** | `npm run test:run -- <path>` (alias for `vitest run <path>`) |
| **Full suite command** | `npm run test:run` |
| **Type check** | `npx tsc --noEmit` |
| **Build** | `npm run build` (= `tsc -b && vite build`) |
| **Estimated runtime** | ~10s (per-file) / ~25s (full suite, 72 files / 1082 tests) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run -- <touched-test-path>`
- **After every plan wave:** Run `npm run test:run`
- **Before `/gsd-verify-work`:** Full suite must be green + `npx tsc --noEmit` + `npm run build`
- **Max feedback latency:** ≤ 30 seconds

---

## Per-Task Verification Map

| Task ID    | Plan | Wave | Requirements          | Threat Ref            | Secure Behavior                                                                                                       | Test Type        | Automated Command                                                                            | File Exists | Status   |
|------------|------|------|-----------------------|-----------------------|-----------------------------------------------------------------------------------------------------------------------|------------------|----------------------------------------------------------------------------------------------|-------------|----------|
| 39-01-01   | 01   | 1    | THM-01, THM-02, THM-03, THM-04 (type) | T-39-02              | ThemeId union narrowed; `isValidTheme('moss'\|'slate'\|'dusk')` returns false; coerceTheme routes to DEFAULT_THEME    | unit (type)      | `grep -nE "^export (type ThemeId\|const THEME_OPTIONS)" src/domain/settings.ts && npx tsc --noEmit` | ✅          | ✅ green |
| 39-01-02   | 01   | 1    | THM-05                | T-39-01              | Persisted deprecated value coerces to 'system' on read AND re-persists as 'system' on next savePrefs                  | unit (regression) | `npm run test:run -- src/storage/prefs.test.ts`                                              | ✅          | ✅ green |
| 39-02-01   | 02   | 2    | THM-01, THM-02, THM-03 (CSS)         | T-39-03              | theme.css contains only `[data-theme='dark']:root` override + `@theme` baseline (light)                                | unit + build     | `grep -nE "\\[data-theme=" src/styles/theme.css && npm run build`                            | ✅          | ✅ green |
| 39-02-02   | 02   | 2    | THM-06                | T-39-04              | FAVICON_COLORS = `{ light, dark }` (2 entries, byte-preserved hex)                                                     | unit             | `npm run test:run -- src/styles/faviconPalette.test.ts`                                      | ✅          | ✅ green |
| 39-02-03   | 02   | 2    | THM-07 (CSS half), THM-08             | T-39-05              | favicon.sync drift-guard regenerates for 2-palette mapping; theme.contrast THEME_05_FLOORS = 2 entries                | unit (drift)     | `npm run test:run -- src/styles/favicon.sync.test.ts src/styles/theme.contrast.test.ts`     | ✅          | ✅ green |
| 39-03-01   | 03   | 2    | THM-04 (strings)      | T-39-06, T-39-07     | UiStrings.themes has 3 fields; EN+PT-BR catalogs aligned; LOCKED_COPY guard intact; no review markers                  | unit             | `npm run test:run -- src/content/strings.test.ts`                                            | ✅          | ✅ green |
| 39-03-02   | 03   | 2    | THM-04 (render)       | T-39-08              | ThemePicker renders exactly 3 radio buttons with labels `['Light', 'Dark', 'System']`; behavioral rotations preserve coverage | unit             | `npm run test:run -- src/components/ThemePicker.test.tsx`                                    | ✅          | ✅ green |
| 39-03-03   | 03   | 2    | THM-04 (cross-cutting tests)         | T-39-08, T-39-09     | Hook tests rotated to surviving themes (useTheme cross-tab + same-tab; useThemeChoice setTheme; useFavicon FAVICON_COLORS.*) | unit             | `npm run test:run -- src/hooks src/app/App.session.test.tsx`                                | ✅          | ✅ green |
| 39-04-01   | 04   | 2    | THM-07 (FOUC half)    | T-39-10, T-39-11     | index.html L18 IIFE allowlist + color map both = 2 entries; IIFE wrapper + matchMedia + catch fallback byte-preserved | unit + build     | `grep -cE "moss\|slate\|dusk" index.html && npm run test:run -- src/styles/favicon.sync.test.ts && npm run build` | ✅          | ✅ green |
| 39-05-01   | 05   | 3    | THM-01, THM-02, THM-03 (lock)         | T-39-12 .. T-39-16   | fs-scan drift-guard fails CI if any of 12 forbidden tokens (9 plain + 3 regex) reappear in 4 production roots          | drift-guard      | `npm run test:run -- src/content/content.no-removed-themes.test.ts`                          | ✅          | ✅ green |
| 39-05-02   | 05   | 3    | (verification gate)   | —                    | Phase-level closing green gate: tsc clean + 1082/1082 tests + vite build green; STATE_VERSION unchanged                | meta (CI)        | `npx tsc --noEmit && npm run test:run && npm run build`                                      | ✅          | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

- vitest + jsdom test environment was already installed (Phase 0); no framework install needed.
- Per-plan tests were added in the same commit as the source-file collapse they verify (D-11 delete-with-component policy):
  - Plan 01: `src/storage/prefs.test.ts` THM-05 two-level regression (commit `03912aa`).
  - Plan 02: `faviconPalette.test.ts` keys-count update + `theme.contrast.test.ts` floor strip (commit `99bb405`, `8fbc55e`).
  - Plan 03: ThemePicker.test.tsx 3-option assertion + hook test rotations (commits `41ddb4c`, `19cb9e6`).
  - Plan 04: no new test file; the existing `favicon.sync.test.ts` was the cross-file regression that confirmed the FOUC alignment.
  - Plan 05: NEW `src/content/content.no-removed-themes.test.ts` drift-guard (commit `a1ccb7d`).

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

Per VERIFICATION.md §"Human Verification Required": **None.** Phase 39 is a pure deletion phase preserving existing behaviors; all 8 success criteria are programmatically verifiable through grep / tsc / vitest / vite build. No visual / real-time / external-service behaviors to validate. Phase 41 (Mono Zen visual rebuild) and Phase 43 (surface redesign) will require human visual verification; Phase 39 does not.

---

## Requirement Coverage Map

| Requirement | Source Plan(s)       | Primary Test File(s)                                                                | Lock Mechanism                                                  |
|-------------|----------------------|-------------------------------------------------------------------------------------|-----------------------------------------------------------------|
| THM-01      | 39-01, 39-02, 39-05  | `prefs.test.ts`, `favicon.sync.test.ts`, `content.no-removed-themes.test.ts`        | drift-guard 12-token banlist (`'moss'` + multi-token regex)     |
| THM-02      | 39-01, 39-02, 39-05  | `theme.contrast.test.ts`, `content.no-removed-themes.test.ts`                       | drift-guard word-bounded regex `/(?<![a-zA-Z])slate(?![a-zA-Z])/` |
| THM-03      | 39-01, 39-02, 39-05  | `favicon.sync.test.ts`, `content.no-removed-themes.test.ts`                         | drift-guard 12-token banlist (`'dusk'` + multi-token regex)     |
| THM-04      | 39-01, 39-03         | `ThemePicker.test.tsx`, `strings.test.ts`                                           | 3-option `toHaveLength(3)` + `['Light','Dark','System']` labels |
| THM-05      | 39-01                | `prefs.test.ts` (2 dedicated it() cases)                                            | read-coerce loop + round-trip re-persist assertion              |
| THM-06      | 39-02                | `faviconPalette.test.ts`                                                            | `toHaveLength(2)` keys-count + per-hex byte-preservation asserts |
| THM-07      | 39-02, 39-04         | `favicon.sync.test.ts`                                                              | cross-file drift-guard (theme.css ↔ FAVICON_COLORS ↔ index.html) |
| THM-08      | 39-02                | `theme.contrast.test.ts`                                                            | `THEME_05_FLOORS` 2-entry record + `describe.each(CONCRETE_THEMES)` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — 11/11 tasks have automated verification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — every task commit produced green test feedback
- [x] Wave 0 covers all MISSING references — no MISSING references; existing infrastructure sufficient
- [x] No watch-mode flags — all commands use `vitest run` (single-shot)
- [x] Feedback latency < 30s — per-file vitest runs complete in ~10s; full suite in ~25s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-21

---

## Audit Trail

This VALIDATION.md was reconstructed from phase artifacts (5 PLANs + 5 SUMMARYs + VERIFICATION.md) on 2026-05-21 after phase execution completed without a pre-existing VALIDATION.md. The reconstruction reflects the realized state of the phase, not a pre-execution contract.

| Metric                                  | Count |
|-----------------------------------------|-------|
| Plans audited                           | 5     |
| Tasks audited                           | 11    |
| Requirements audited                    | 8     |
| Gaps found                              | 0     |
| Resolved (automated added retroactively) | 0     |
| Escalated to manual-only                | 0     |
| Tests already in place at audit time    | 11/11 |
