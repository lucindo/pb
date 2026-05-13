---
phase: 16
slug: themes
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-12
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 + jsdom 29.1.1 + @testing-library/react 16.3.2 + @testing-library/jest-dom 6.9.1 |
| **Config file** | `vite.config.ts` (Vitest config inlined under `test:` key) |
| **Quick run command** | `npx vitest run src/styles/theme.contrast.test.ts src/hooks/useTheme.test.ts src/hooks/useThemeChoice.test.ts src/components/ThemePicker.test.tsx` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~15 seconds (quick) / ~60 seconds (full) |

---

## Sampling Rate

- **After every task commit:** `npx vitest run src/styles/theme.contrast.test.ts src/hooks/useTheme.test.ts src/hooks/useThemeChoice.test.ts src/components/ThemePicker.test.tsx`
- **After every plan wave:** `npm run test:run`
- **Before `/gsd-verify-work`:** `npx tsc --noEmit && npm run lint && npm run build && npm run test:run` (D-17 per-commit green-gate)
- **Max feedback latency:** 15 seconds (quick) / 60 seconds (full)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | THEME-03, THEME-05 | — | N/A (CSS tokens, no user input) | integration (CSS cascade) | `npx vitest run src/styles/theme.contrast.test.ts` | ❌ W0 | ⬜ pending |
| 16-01-02 | 01 | 1 | THEME-05 | — | luminance contrast ≥ 1.5 enforced for all 5 themes | integration (it.each × 5 themes) | `npx vitest run src/styles/theme.contrast.test.ts` | ❌ W0 | ⬜ pending |
| 16-02-01 | 02 | 1 | THEME-02, THEME-04 | T-16-02-01 (forged CustomEvent) | re-read loadPrefs() on event; never trust event.detail; coerceTheme clamps invalid ids | unit (renderHook + matchMedia mock) | `npx vitest run src/hooks/useTheme.test.ts` | ❌ W0 | ⬜ pending |
| 16-02-02 | 02 | 1 | THEME-01, THEME-04 | T-16-02-02 (React state → dataset.theme tampering) | ThemeId union narrowing + coerceTheme at every load | unit (renderHook) | `npx vitest run src/hooks/useThemeChoice.test.ts` | ❌ W0 | ⬜ pending |
| 16-03-01 | 03 | 1 | THEME-04 | T-16-03-01 (malicious stored prefs.theme) | hardcoded allowlist `['light','dark','moss','slate','dusk']` in FOUC script; setAttribute only writes safe strings | manual + grep | `grep -F "localStorage.getItem('hrv:state:v1')" index.html && grep -F "setAttribute('data-theme'" index.html` | ❌ W0 | ⬜ pending |
| 16-03-02 | 03 | 1 | THEME-04 | — | SYNC comment documents cross-file coupling so STATE_KEY bumps stay coherent | source assertion | `grep -F "SYNC WITH index.html FOUC SCRIPT" src/storage/storage.ts` | ❌ W0 | ⬜ pending |
| 16-04-01 | 04 | 2 | THEME-01, THEME-03 | — | role=radiogroup + aria-checked semantics; disabled gating | unit (RTL) | `npx vitest run src/components/ThemePicker.test.tsx` | ❌ W0 (rewrites existing 3-test stub) | ⬜ pending |
| 16-04-02 | 04 | 2 | THEME-01, THEME-02, THEME-04 | — | useTheme invoked once in App; cleanup on unmount | source assertion + behavior | `grep -c "useTheme" src/app/App.tsx` outputs `2` (import + call) | ✅ (App.tsx exists) | ⬜ pending |
| 16-04-03 | 04 | 2 | THEME-01..05 | — | requirements traceability + STATE/ROADMAP updates | source assertion | `grep -E "THEME-0[1-5].*Done" .planning/REQUIREMENTS.md \| wc -l` outputs `5` | ✅ | ⬜ pending |
| 16-04-04 | 04 | 2 | THEME-01..05 | — | human visual checkpoint — 5 palettes render correctly + FOUC absent on hard-refresh + cross-tab sync works | manual UAT | dev-server visual review per checkpoint script | n/a (manual) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/styles/theme.contrast.test.ts` — new file; covers THEME-05 (5 themes × luminance contrast ≥ 1.5)
- [ ] `src/hooks/useTheme.test.ts` — new file; covers THEME-02, THEME-04 (matchMedia integration, storage events, custom events, mount seed, gated listener)
- [ ] `src/hooks/useThemeChoice.test.ts` — new file; covers THEME-01, THEME-04 (savePrefs write, CustomEvent dispatch)
- [ ] `src/components/ThemePicker.test.tsx` — rewrite existing 3-test stub to ≥ 7 tests; covers THEME-01, THEME-03 (6 options rendered, click handlers, disabled gating, role=radiogroup, aria-checked, focus ring)
- [x] No framework install needed — Vitest 4.1.5 + jsdom 29.1.1 + @testing-library/react 16.3.2 + @testing-library/jest-dom 6.9.1 all present

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No FOUC on hard-refresh for each of the 5 themes | THEME-04 | jsdom does not render styles; only a real browser exhibits flash-of-default-theme | Build (`npm run build`), serve `dist/` (`npx vite preview`), hard-refresh page (Cmd+Shift+R) on each theme — observe `<html data-theme>` is set before `<body>` is rendered (no visible flash). |
| 5 palettes render correctly (Light, Dark, Moss, Slate, Dusk) | THEME-01, THEME-03 | Visual review — automated tests verify tokens, not aesthetic correctness | Dev server (`npm run dev`), open SettingsDialog, switch through all 6 options (Light, Dark, System, Moss, Slate, Dusk), confirm orb gradient + UI chrome shift per theme. |
| System mode tracks OS prefers-color-scheme | THEME-02 | Requires toggling OS dark mode at runtime | Set theme to System in dialog. Toggle macOS Appearance (System Settings → Appearance) between Light and Dark. Confirm orb + UI flips without page reload. |
| Cross-tab sync via `storage` event | THEME-04 | Requires two real browser tabs | Open app in 2 tabs. Change theme in tab A. Confirm tab B updates within 1 second. |
| Reduced-motion crossfade contrast preserved | THEME-05 | Visual perception check beyond luminance ratio | macOS: System Settings → Accessibility → Display → Reduce motion ON. Open each theme. Confirm orb crossfade (`.orb-layer--in` vs `.orb-layer--out`) remains perceptually distinguishable. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify (or human-checkpoint for 16-04-04) or Wave 0 dependencies declared
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every task carries either automated or grep-based source assertion; 16-04-04 is the lone manual checkpoint)
- [x] Wave 0 covers all MISSING references (4 new/rewritten test files enumerated above)
- [x] No watch-mode flags (all commands use `vitest run`, never `vitest watch`)
- [x] Feedback latency < 60s (quick: ~15s; full: ~60s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-12
