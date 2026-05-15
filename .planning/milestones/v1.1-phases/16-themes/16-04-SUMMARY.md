---
phase: 16
plan: "04"
subsystem: ui
tags: [ThemePicker, radiogroup, aria, useTheme, App.tsx, phase-close, human-verify]
dependency_graph:
  requires:
    - "16-01 (CSS theme cascade — [data-theme] attribute surface)"
    - "16-02 (useTheme + useThemeChoice hooks)"
    - "16-03 (FOUC inline script — first-paint contract)"
  provides:
    - "ThemePicker radiogroup with 6 native <button role=radio> options"
    - "App.tsx useTheme() invocation (side-effect mount)"
    - "Phase 16 close artifacts: REQUIREMENTS/STATE/ROADMAP/16-SUMMARY"
  affects:
    - "src/components/SettingsDialog.test.tsx (Landmine 7 test updated)"
    - "Phase 17/18/19 (ThemePicker pattern template established)"
tech_stack:
  added: []
  patterns:
    - "radiogroup over native <button role=radio> with aria-checked (UI-SPEC §1)"
    - "3-channel selected-state signal: border-2 accent + bg-soft + accent-strong text"
    - "disabled gating: disabled attr on each button + aria-disabled on radiogroup"
key_files:
  created:
    - .planning/phases/16-themes/16-SUMMARY.md
  modified:
    - src/components/ThemePicker.tsx
    - src/components/ThemePicker.test.tsx
    - src/components/SettingsDialog.test.tsx
    - src/app/App.tsx
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
    - .planning/ROADMAP.md
decisions:
  - "ThemePickerProps stays { disabled: boolean } only — D-20 invariant preserved; setter from internal useThemeChoice"
  - "useTheme() invocation placed after wakeLock hook — side-effect only, return value unused (CONTEXT.md item 6)"
  - "[Rule 1 - Bug] SettingsDialog.test.tsx Landmine 7 updated: Phase 15 stub text 'Theme: system' replaced by radiogroup aria-disabled assertion"
metrics:
  duration: "~15 min"
  completed: "2026-05-13"
  tasks_completed: 3
  tasks_remaining: 1
  files_modified: 7
  tests_added: 5
---

# Phase 16 Plan 04: ThemePicker Wire-up + Phase Close Summary

**Wire-up plan: ThemePicker radiogroup + App.tsx useTheme() + REQUIREMENTS/STATE/ROADMAP close artifacts + human visual checkpoint (Task 4 — pending approval)**

## Task Results

### Task 1: ThemePicker.tsx Radiogroup + ThemePicker.test.tsx

**ThemePicker.tsx final structure:**

- File header: updated to document D-19/D-20/D-22 invariants (SettingsDialog not edited; props = { disabled } only; locked English labels).
- Imports: `{ THEME_OPTIONS, type ThemeId }` from `'../domain/settings'`; `{ useThemeChoice }` from `'../hooks/useThemeChoice'`. No React import needed (JSX transform).
- `ThemePickerProps`: `{ disabled: boolean }` — exactly one property (D-20 invariant confirmed).
- Body: `useThemeChoice()` → destructure `{ theme, setTheme }`.
- JSX: `<div>` → `<p id="theme-picker-label">Theme</p>` → `<div role="radiogroup" aria-labelledby="theme-picker-label" aria-disabled={disabled}>`.
- `THEME_OPTIONS.map((id: ThemeId) => <button ...>)` — one button per option.
- Each button: `type="button"`, `role="radio"`, `aria-checked={theme === id}`, `disabled={disabled}`, `onClick={() => { setTheme(id) }}`.
- Label: `id.charAt(0).toUpperCase() + id.slice(1)` → `Light / Dark / System / Moss / Slate / Dusk` (D-22 verbatim).
- Selected classes: `border-2 border-[var(--color-breathing-accent)] bg-[var(--color-breathing-bg-soft)] text-[var(--color-breathing-accent-strong)]`.
- Not-selected classes: `border border-teal-200 bg-white text-teal-800 hover:bg-teal-50 active:bg-teal-100`.
- Base classes: `min-h-12 rounded-full px-3 py-2 text-sm font-semibold shadow-sm transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45`.

**ThemePicker.test.tsx — 8 tests (replaces 3 Phase 15 stubs):**

1. Renders "Theme" section label.
2. Renders 6 radio buttons with labels `['Light','Dark','System','Moss','Slate','Dusk']` in order.
3. `aria-checked='true'` on stored theme; others `'false'` (seeds `theme: 'moss'`).
4. Click writes `prefs.theme` to disk — direct-read of `STATE_KEY` from localStorage.
5. Click dispatches `hrv:prefs-changed` with `{ key: 'theme', value: <id> }`.
6. `disabled=true`: all 6 buttons have `disabled` attr; radiogroup has `aria-disabled='true'`.
7. `disabled=true`: click does NOT change disk envelope (theme stays `'light'` after clicking `Dusk`).
8. Selected option retains `aria-checked='true'` + `disabled` attr simultaneously.

**Deviation [Rule 1 - Bug]: SettingsDialog.test.tsx Landmine 7 updated**

The Phase 15 Landmine 7 test (`'renders all four picker stub texts when open=true with inSessionView=true'`) asserted `screen.getByText('Theme: system')` — the Phase 15 stub rendered this literal text. The Phase 16 real picker replaces that text with a radiogroup; the assertion would permanently fail post-replacement.

Fix: Updated the test to assert `screen.getByText('Theme')` (the section label, which persists) and `screen.getByRole('radiogroup').toHaveAttribute('aria-disabled', 'true')` (the disabled contract). The remaining stub pickers (`Variant: orb`, `Timbre: bowl`, `Language: en`) assertions remain unchanged (those stubs are Phase 17/18/19 deliverables).

### Task 2: App.tsx useTheme() Wire-up

- **Import added:** `import { useTheme } from '../hooks/useTheme'` — placed immediately after `useAudioCues` import in the `'../hooks/...'` cluster.
- **Invocation added:** `useTheme()` — one line, no `const` assignment, no destructuring. Placed after `const wakeLock = useWakeLock()` at the base of the side-effectful hook cluster.
- **Trailing comment:** `// Phase 16 THEME-01..04: orchestrates <html data-theme> writes (S-01/S-04), cross-tab + same-tab sync (A-03/A-04)`.
- `grep -c "useTheme" src/app/App.tsx` → `2` (1 import + 1 call).
- No new `useState`, `useEffect`, `useMemo`, `useRef`, `useCallback`, or JSX added.
- `App.persistence.test.tsx` — 18/18 pass (no regression from new hook invocation).

### Task 3: Phase Close Artifacts

- **REQUIREMENTS.md:** THEME-01..05 checkbox `[ ]` → `[x]`; Traceability table `Pending` → `Done` for all 5 rows; last-updated line bumped to 2026-05-13.
- **STATE.md:** `stopped_at` → `Phase 16 themes complete`; `completed_phases` 3 → 4; `completed_plans` 6 → 10; Current Position Phase 16 → 17; Performance Metrics Phase 16 → Complete 4 plans; Session Continuity → Phase 17 planning; Operator Next Steps → `/gsd-plan-phase 17`.
- **ROADMAP.md:** Phase 16 line `[ ]` → `[x]` with completion date; `**Plans**: TBD` → `**Plans**: 4 plans` with per-plan `[x]` bullets; Progress table Phase 16 → `4/4 | Complete | 2026-05-13`.
- **16-SUMMARY.md created** (`.planning/phases/16-themes/16-SUMMARY.md`): 120 lines covering Summary, Plans (01-04), Locked Decisions Honored (D-01..D-22), Test Counts, Files Modified, Carry-Forward, Next Phase.

### Task 4: Human Visual Checkpoint (PENDING)

Task 4 is `type="checkpoint:human-verify"` — halted here per the plan's autonomous: false declaration. See checkpoint details in the executor's return message.

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ThemePicker radiogroup + 8 tests | e15422a | ThemePicker.tsx, ThemePicker.test.tsx, SettingsDialog.test.tsx |
| 2 | App.tsx useTheme() wire-up | 58d0fad | App.tsx |
| 3 | Phase close artifacts | 7496773 | REQUIREMENTS.md, STATE.md, ROADMAP.md, 16-SUMMARY.md |

## D-20 Invariant Confirmation

`ThemePickerProps` contains exactly one property: `disabled: boolean`. Verified via `grep -A 2 "interface ThemePickerProps"`:
```
export interface ThemePickerProps {
  disabled: boolean
}
```

## App.tsx Minimal-State Confirmation

No new `useState`, `useEffect`, `useMemo`, `useRef`, or `useCallback` added to `App.tsx`. `useTheme()` adds one invocation line (for side effect only); the hook owns its internal state outside of App's render cycle.

## Phase Close Verification

- `grep -c "^- \[x\] \*\*THEME-0[1-5]\*\*" .planning/REQUIREMENTS.md` → 5 ✓
- `grep -E "^\| THEME-0[1-5] \| Phase 16 \| Done \|"` → 5 rows ✓
- `stopped_at: Phase 16 themes complete` in STATE.md ✓
- `completed_phases: 4` in STATE.md ✓
- Phase 17 as Current Position in STATE.md ✓
- Phase 16 `[x]` in ROADMAP.md ✓
- Progress table `4/4 | Complete | 2026-05-13` ✓
- 16-SUMMARY.md exists, ≥ 30 lines (120 lines), references all 5 THEME-IDs ✓

## Known Stubs

None introduced by this plan. ThemePicker is fully wired via useThemeChoice. App.tsx useTheme() is a real hook. Planning docs are all updated with concrete values.

## Threat Flags

No new security-relevant surface introduced. ThemePicker onClick handlers are narrowed to `ThemeId` via `THEME_OPTIONS.map()` at compile time (T-16-04-01 mitigated). The App.tsx edit is a single hook invocation with no new data flows (T-16-04-03 accepted). All STRIDE dispositions from the plan's threat register remain as specified.

## Self-Check: PASSED

Files exist:
- FOUND: src/components/ThemePicker.tsx (radiogroup with 6 buttons)
- FOUND: src/components/ThemePicker.test.tsx (8 tests)
- FOUND: src/app/App.tsx (useTheme import + invocation)
- FOUND: .planning/phases/16-themes/16-SUMMARY.md (120 lines)

Commits exist:
- e15422a: feat(16-04): replace ThemePicker stub with radiogroup picker (useThemeChoice)
- 58d0fad: feat(16-04): wire useTheme() into App.tsx (single import + invocation)
- 7496773: docs(16-04): phase close artifacts — THEME-01..05 Done; Phase 17 next

Green-gate at Task 3 commit: tsc (0 errors) + lint (0 errors) + build (success) + test (492/492 pass).

Task 4 (human visual checkpoint) — APPROVED 2026-05-13.

## Human Verification Result (2026-05-13)

**Verdict:** APPROVED (functional). All 11 verification steps pass: FOUC absent on first paint, live OS-dark/light flip works, 6-button 3×2 grid renders, click swaps palette + persists, in-session gating disables picker, cross-tab sync fires, contrast visually distinguishable.

**Aesthetic feedback:** "All themes extremely ugly." Carry-forward — not blocking ship of THEME-01..05 (functional contract satisfied + automated WCAG ≥ 1.5 guard holds). Tracked in `.planning/todos/pending/2026-05-13-themes-aesthetic-refresh.md` for v1.x palette refresh. Plan 01's Moss orb-out token deviation (1.087 → 1.94) is one signal that the v1.0.1 baseline was tuned for the OLD viewport, not the new 6-palette cascade — a coordinated palette redesign pass is the right fix.
