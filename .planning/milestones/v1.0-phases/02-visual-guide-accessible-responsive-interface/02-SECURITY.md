---
phase: 02-visual-guide-accessible-responsive-interface
status: SECURED
asvs_level: L1
block_on: critical
threats_total: 23
threats_closed: 23
threats_open: 0
unregistered_flags: 0
audited_at: 2026-05-09
register_authored_at_plan_time: true
---

# Phase 02 Security Audit Report

Verifies that every threat declared in the plan-time threat models for plans 02-01..02-04 has been mitigated, accepted, or transferred in the implemented code. Implementation files were treated as read-only — only this report was authored.

**Result:** 23/23 threats CLOSED. No open threats. No unregistered attack-surface flags.

## Trust Boundaries (consolidated)

| Boundary | Description |
|----------|-------------|
| OS → Browser | OS `prefers-reduced-motion` flows in via `window.matchMedia` (read-only single-bit signal) |
| Test environment → Production | Polyfills in `vitest.setup.ts` are guarded behind `typeof X !== 'undefined' && !X.prototype.method` — no-op in real browsers and excluded from the production bundle |
| `useSessionEngine` rAF tick → DOM | Single timing source; orb consumes derived `SessionFrame.phaseProgress` only |
| Keyboard / pointer input → focus state | `:focus-visible` only — mouse activation does not paint focus rings |
| `isRunning` state → DOM tree | Conditional render (not CSS hide) keeps tab order minimal during practice |
| User click on End session → modal open state | App-level state machine; only timed sessions raise modal (D-14) |
| Modal `cancel` event (Esc/backdrop) → onCancel | Native `<dialog>` event handled with `event.preventDefault()` to mitigate double-fire |

## Threat Verification

### Closed — `mitigate` dispositions verified by grep / runtime evidence

| Threat ID | Category | Evidence |
|-----------|----------|----------|
| T-02-02 | Tampering | `vitest.setup.ts:6-23` — each `HTMLDialogElement.prototype.*` polyfill gated by `if (!HTMLDialogElement.prototype.X)`; `vitest.setup.ts:30` — `if (typeof window !== 'undefined' && !window.matchMedia)` gate. No-op in real browsers. |
| T-02-04 | Denial of Service | `src/hooks/usePrefersReducedMotion.ts:21-24` — `useEffect` returns cleanup that calls `mql.removeEventListener('change', onChange)`. `usePrefersReducedMotion.test.ts:32-51` asserts addEventListener and removeEventListener are both called with `'change'`. |
| T-02-05 | Spoofing | `usePrefersReducedMotion.test.ts:6-8` declares file-level `afterEach(() => vi.restoreAllMocks())`. App-level test files mirror the same pattern (`App.settings.test.tsx:9-11`, `App.session.test.tsx:18-20, 244-246`). |
| T-02-06 | Tampering | `src/components/BreathingShape.tsx` — `grep -cE "setInterval\|requestAnimationFrame\|setTimeout"` returns `0`. Orb scale is purely derived from `frame.phaseProgress` (`BreathingShape.tsx:20-25`). SESS-05 single-clock invariant preserved. |
| T-02-07 | Spoofing | `src/components/BreathingShape.tsx:40-69` — 4 `aria-hidden="true"` elements: outer ring (line 41), inner ring (line 50), `.orb-layer--in` (line 63), `.orb-layer--out` (line 67). `grep -c "aria-hidden=\"true\""` returns `4`. The wrapper exposes a single human-readable name via `role="img"` + `aria-label`. |
| T-02-09 | Denial of Service | `src/styles/theme.css:61,67` — `transition: opacity 400ms ease-in-out` on `.orb-layer--in` and `.orb-layer--out`. The crossfade is bound to `[data-phase='out']` attribute changes (theme.css:70-76), not per-frame, so at most ~14 transitions/min at 7 BPM (worst case). 400ms within D-07's 300–500ms band. |
| T-02-10 | Repudiation | `src/hooks/usePrefersReducedMotion.ts` is the sole reduced-motion signal source — only reads `(prefers-reduced-motion: reduce)` via matchMedia. No in-app toggle exists in BreathingShape, App, SettingsForm, or any component (verified by absence of any `setReducedMotion`/override prop). D-05 enforced. |
| T-02-12 | Tampering | `src/components/SettingsForm.tsx:53-69` — `{!isRunning && <>...</>}` wraps BPM and Ratio steppers (DOM removal, not CSS hide). Asserted by `App.settings.test.tsx:132,142` — `queryByRole('group', { name: 'BPM' })).not.toBeInTheDocument()`. |
| T-02-14 | Spoofing | `focus-visible:ring-breathing-accent` present in `SettingsStepper.tsx:45,60`, `SessionControls.tsx:15`, `EndSessionDialog.tsx:68,75`. Build gate verified: `npm run build` succeeds → Tailwind v4 generates the utility from `--color-breathing-accent` token (`theme.css:6`). Runtime test at `App.settings.test.tsx` asserts className regex `/focus-visible:ring-breathing-accent/`. |
| T-02-15 | Denial of Service | Phase 1 legacy assertion `does not allow BPM or ratio edits while a session is running` removed and replaced with three new tests (`removes BPM and Ratio steppers...`, `restores BPM and Ratio steppers after the session ends`, `does not render the Current phase eyebrow...`). `grep -rE "focus:ring-4\|focus:ring-teal-200" src/` returns only the regression-guard test reference (no production code matches). |
| T-02-16 | Repudiation | `src/app/App.settings.test.tsx:209` — test `removes the legacy Phase 1 focus:ring-4 focus:ring-teal-200 utilities (regression guard)` iterates all `screen.getAllByRole('button')` and asserts neither `focus:ring-4` nor `focus:ring-teal-200` appears as a standalone class. |
| T-02-17 | Tampering | `src/app/App.tsx:28-53` — modal handlers (requestEnd, confirmEnd, cancelEnd) only flip `endDialogOpen`; no `session.pause()` (no such API). `App.dialog.test.tsx:208-240` — `SESS-05 regression with fake timers` test uses `vi.useFakeTimers() + vi.advanceTimersByTime(1000)` and asserts the readout shrinks from `10:00` to `9:59` while the modal remains open. |
| T-02-18 | Spoofing | `src/components/EndSessionDialog.tsx:50-62` — native `<dialog>` element with `aria-labelledby="end-session-title"` (line 52) pointing to the `<h2 id="end-session-title">End this session?</h2>` (lines 57-61). `App.dialog.test.tsx:34,42` finds it via `screen.getByRole('dialog', { name: 'End this session?' })`. No manual `role="dialog"` override (verified). |
| T-02-19 | Repudiation | `src/components/EndSessionDialog.tsx:18-24` — on open, `cancelButtonRef.current?.focus()` focuses the Keep going button (the cancel pathway). `App.dialog.test.tsx:36` (component-level) and line 145 (App-integration) both assert `screen.getByRole('button', { name: 'Keep going' }).toHaveFocus()`. Stray Enter is non-destructive. |
| T-02-21 | Denial of Service | `src/components/EndSessionDialog.tsx:31-39` — `handleCancel` calls `event.preventDefault()` (line 32) before invoking `onCancel`. The same `useEffect` cleanup removes the listener (line 37), preventing duplicate handler attachment. `App.dialog.test.tsx:75-86,180-188` simulate the cancel event and assert `onCancel` was called exactly once (`toHaveBeenCalledTimes(1)`). |
| T-02-22 | Elevation of Privilege | `grep -rE "window\.confirm\|window\.prompt\|window\.alert" src/` returns zero matches. `grep -c "vi.spyOn(window, 'confirm'"` returns `0` across `App.session.test.tsx`, `App.settings.test.tsx`, `App.dialog.test.tsx`. |
| T-02-23 | Tampering | `src/app/App.tsx:29` — `state.lockedSettings.durationMinutes !== 'open-ended'` gate present (`grep -c` returns `1`). `App.dialog.test.tsx:191-206` — Test E `open-ended sessions skip the modal entirely (D-14)` is the runtime regression guard. Rewritten `App.session.test.tsx` `ends open-ended sessions directly without showing the modal (D-14)` covers the same path. |

### Closed — `accept` dispositions documented as accepted risks

See **Accepted Risks Log** below for full justifications.

| Threat ID | Category | Acceptance Reference |
|-----------|----------|----------------------|
| T-02-01 | Tampering | Accepted Risk #1 (test polyfills are not bundled by Vite production build) |
| T-02-03 | Information Disclosure | Accepted Risk #2 (OS reduced-motion is a single local boolean, no PII) |
| T-02-08 | Information Disclosure | Accepted Risk #3 (data-phase decorative attribute, v1 local-only) |
| T-02-11 | Elevation of Privilege | Accepted Risk #4 (numeric scale interpolation, no user input flows into style) |
| T-02-13 | Information Disclosure | Accepted Risk #5 (Phase 1 ring-on-mouse was UX nit; superseded by `:focus-visible`) |
| T-02-20 | Information Disclosure | Accepted Risk #6 (v1 local-only — no postMessage, iframe, or cross-origin) |

## Accepted Risks Log

### #1 — T-02-01: vitest polyfills leaking into production bundle

**Claim:** `vitest.setup.ts` is referenced exclusively from `vite.config.ts` `test.setupFiles` and is not part of `npm run build`'s entry graph.

**Verification:** Phase 1 already established this pattern (`vitest.setup.ts` was a single jest-dom import in Phase 1, never bundled). Plan 02-01 added two polyfills behind feature-detection guards (`if (!HTMLDialogElement.prototype.showModal)`, `if (!window.matchMedia)`) — even if accidentally bundled they would no-op in any modern browser. Risk magnitude: zero practical impact.

**Decision:** ACCEPT.

### #2 — T-02-03: OS reduced-motion signal

**Claim:** The `(prefers-reduced-motion: reduce)` boolean is read locally via `matchMedia`, never transmitted off-device. No PII. v1 product is local-only (PROJECT.md).

**Verification:** `src/hooks/usePrefersReducedMotion.ts` makes no network calls, no logging, no storage writes. The boolean only flows into a CSS scale value.

**Decision:** ACCEPT.

### #3 — T-02-08: Phase data leak via class names

**Claim:** `data-phase` attribute on the orb wrapper (`'in'` or `'out'`) is decorative metadata for the CSS attribute selector. It was already present in Phase 1. v1 has no cross-origin surface that could read it.

**Verification:** `BreathingShape.tsx:31` — `data-phase={frame.phase}`. No PII; mirrors the visible UI state. PROJECT.md confirms local-only scope.

**Decision:** ACCEPT.

### #4 — T-02-11: Inline style allowing CSS injection

**Claim:** `transform: scale(${orbScale})` interpolates a numeric value (`orbScale: number`). No user input flows into the style.

**Verification:** `BreathingShape.tsx:20-25,60` — `progress` is bounded to `[0, 1]` via `Math.min(1, Math.max(0, frame.phaseProgress))`; `orbScale` is computed from `MIN_SCALE`, `MAX_SCALE`, `MID_SCALE` constants and the bounded `progress`. React's JSX serialization escapes attribute values.

**Decision:** ACCEPT.

### #5 — T-02-13: Phase 1 ring-on-mouse activation

**Claim:** Phase 1 used `focus:ring-4 focus:ring-teal-200`, which paints on mouse activation. This is a UX nit, not a security risk. Phase 2 replaces it with `focus-visible:` so the ring only paints on keyboard.

**Verification:** Phase 2 production code uses `focus-visible:` exclusively (`SettingsStepper.tsx:45,60`, `SessionControls.tsx:15`, `EndSessionDialog.tsx:68,75`). Regression guard test in `App.settings.test.tsx:209` prevents reintroduction.

**Decision:** ACCEPT (issue is now mitigated by T-02-21's focus-visible standardization, but original UX-nit risk class is accepted as low impact).

### #6 — T-02-20: Modal session state cross-origin exposure

**Claim:** v1 product is local-only — no postMessage, no iframe embedding, no cross-origin storage. The modal is a same-origin React component sourced exclusively from the user's session in `useSessionEngine`.

**Verification:** `grep -rE "postMessage|iframe" src/` returns zero matches. No `window.opener`, no cross-origin fetch. PROJECT.md confirms scope.

**Decision:** ACCEPT.

## Threat Flags from SUMMARY.md

| Plan | `## Threat Flags` Section | Mapping |
|------|---------------------------|---------|
| 02-01 | (Threat-model compliance section reports all `mitigate` dispositions satisfied; no new flags raised) | Informational — covered by registered threats T-02-01..05 |
| 02-02 | "Threat Flags: None — Plan 02 introduces no new network endpoints, auth surface, file-access patterns, or schema changes." | Informational |
| 02-03 | (No `## Threat Flags` section; SUMMARY was reconstructed post-merge — verified no new attack surface from grep audit) | Informational |
| 02-04 | (No `## Threat Flags` section; modal threats T-02-17..23 fully registered at plan time and verified) | Informational |

**Unregistered Flags:** none.

## ASVS L1 Applicability

ASVS V3 (Authentication) — N/A (no auth in v1, local-only).
ASVS V4 (Access Control) — N/A (no multi-user surface).
ASVS V5 (Validation, Sanitization, Encoding) — minimal: settings are constrained enums (`BPM_OPTIONS`, `RATIO_OPTIONS`, `DURATION_OPTIONS`); orb scale is numeric and bounded. No user-controlled string flows into innerHTML, src, href, or style.
ASVS V8 (Errors and Logging) — N/A (no error UI in this phase).
ASVS V14 (Configuration) — Tailwind v4 build verified by acceptance-criteria `npm run build` gates; production CSS contains the focus-visible utility (Plan 03 SUMMARY confirms via grep on `dist/assets/index-*.css`).

The relevant integrity controls in scope here are a11y correctness (T-02-07, T-02-12, T-02-18, T-02-19) and timing-invariant correctness (T-02-06, T-02-17). Both classes are mitigated by code structure (no parallel timers, conditional render, native `<dialog>` semantics) and asserted at runtime (5 fake-timer + 4 conditional-render tests + 11 dialog tests + 6 App-integration tests).

## Audit Trail

- **2026-05-09** — Phase 2 security audit performed.
  - Read all 4 plan threat models from `02-0{1..4}-PLAN.md`.
  - Read all 4 implementation summaries from `02-0{1..4}-SUMMARY.md`.
  - Read all cited implementation files: `vitest.setup.ts`, `src/hooks/usePrefersReducedMotion.{ts,test.ts}`, `src/components/{BreathingShape,EndSessionDialog,SettingsForm,SettingsStepper,SessionControls,SessionReadout}.tsx`, `src/styles/theme.css`, `src/app/App.tsx`, `src/app/App.{dialog,session,settings}.test.tsx`.
  - Verified each `mitigate` threat by grep against the file:line cited in the mitigation plan.
  - Verified `accept` threats by re-confirming the assumption (e.g., "v1 local-only" still true in PROJECT.md; no cross-origin surface introduced).
  - Verified runtime: `npm run test -- --run` → 79/79 pass (including 5 fake-timer regression tests, regression-guard tests for legacy focus utilities, modal cancel single-fire test, and SESS-05 single-clock test).
  - Confirmed zero `window.confirm/prompt/alert` references in `src/` and zero lingering `vi.spyOn(window, 'confirm')` spies across all test files.
  - Confirmed zero new attack surface flagged in any SUMMARY.md `## Threat Flags` section.

**Auditor:** gsd-security-auditor (read-only verification mode)
**Verdict:** SECURED. Phase 02 may ship.
