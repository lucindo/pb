---
phase: 28-phone-install-banner
source: 28-REVIEW.md
fixed_at: 2026-05-16T12:40:00Z
fix_scope: critical_warning
findings_in_scope: 7
fixed: 7
skipped: 0
iteration: 1
status: all_fixed
---

# Code Review Fix Report — Phase 28

Applied fixes for all 7 Critical + Warning findings from `28-REVIEW.md`.
Info findings (IN-01..04) were out of scope (`fix_scope: critical_warning`).

Build clean (`npm run build`), 987/987 tests pass after fixes.

## Fixed

### CR-01 (Critical) — iOS detection
`navigator.standalone !== undefined` probe replaced with explicit user-agent
iOS detection (`detectIsIOS()`), centralized in `useIsStandaloneOrPhone` and
computed once via a lazy `useState` initializer. Fixes iPadOS 13+ desktop-mode
Safari, which previously fell through to the Android `deferredPrompt` branch
and got no working install affordance.
Commit: `d7561ce`

### WR-01 (Warning) — `isIOS` recomputation + duplicated interface
Resolved as a side effect of CR-01: per-render recomputation and the inline
`SafariNavigator` interface duplicate were removed from `App.tsx`.
Commit: `d7561ce`

### WR-02 (Warning) — missing icon error fallback
Added an `onError` handler to `InstallBanner` `<img>` — hides the icon on load
failure instead of showing a broken-image glyph.
Commit: `c5d7bfb`

### WR-03 (Warning) — incomplete iOS disclosure semantics
Added `aria-expanded` / `aria-controls` to the iOS expand button.
Commit: `caa7724`

### WR-04 (Warning) — iOS steps not semantically ordered
Converted the iOS install steps from loose `<p>` tags to an `<ol>`.
Commit: `caa7724`

### WR-05 (Warning) — banner text truncation
Replaced `truncate` with `break-words` on the banner text — prevents clipping
the install message on narrow phones (worse for the longer PT-BR string).
Commit: `caa7724`

### WR-06 (Warning) — hardcoded English region label
Added a localized `regionLabel` string (EN + PT-BR), wired
`aria-label={strings.regionLabel}`; updated the test to read from `UI_STRINGS`.
Commit: `7d8f4f2`

## Skipped

None.

## Notes

- WR-03/04/05 share `InstallBanner.tsx`; committed together (`gsd-sdk query
  commit` stages whole files — cannot split without interactive staging).
- IN-04 remains open (Info, out of scope): PT-BR install copy — including the
  new `regionLabel: 'Instalar app'` — is DRAFT pending Phase 29.

## Files modified

- `src/hooks/useIsStandaloneOrPhone.ts`
- `src/app/App.tsx`
- `src/content/strings.ts`
- `src/components/InstallBanner.tsx`
- `src/components/InstallBanner.test.tsx`
