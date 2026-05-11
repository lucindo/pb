# Phase 2: Visual Guide & Accessible Responsive Interface - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 replaces the Phase 1 functional placeholder visuals and interim native confirm dialog with a polished, accessible, responsive practice surface. It delivers: a refined breathing-orb visual driven by the existing `SessionFrame` timing source; a calmer reduced-motion variant; an in-app accessible confirmation modal; full keyboard / focus / non-color-only operability for settings and session controls; and a single-column responsive layout that keeps the orb and `End session` action above the fold during running sessions on both mobile and desktop.

The phase boundary is fixed by `.planning/ROADMAP.md`. Out of scope for Phase 2: audio cues (Phase 3), local persistence and stats (Phase 4), Wake Lock screen-awake behavior (Phase 5), learning content / claim-safe disclaimer copy (Phase 6), pause/resume, multiple selectable animation styles, dark mode, and any change to the Phase 1 timing math, lifecycle hook, settings stepper inventory, or `In`/`Out` phase copy. Visuals and confirmation UI MUST continue to consume `SessionFrame` from `useSessionEngine` rather than introducing parallel timers.

</domain>

<decisions>
## Implementation Decisions

### Animation Metaphor
- **D-01:** The breathing visual is a single refined abstract orb — not concentric rings, not a lung/figure silhouette. The orb keeps the existing `SessionFrame.phaseProgress` data binding established in Phase 1.
- **D-02:** Phase change is communicated by both size and color/gradient shift (warmer/teal-leaning on `In`, cooler/blue-leaning on `Out`) AND by a persistent text label, so the cue is never color-only (GUID-04).
- **D-03:** The active phase label (`In` / `Out`, locked from Phase 1 D-16) is rendered centered inside the orb at large display size — not below or above the orb.
- **D-04:** The orb is framed by two static reference rings: an outer ring at the maximum-inhale diameter and a faint inner ring at the minimum-exhale diameter. The orb scales between these two fixed bounds so the user can see the edges of the breath without a separate progress meter.

### Reduced-Motion Display (GUID-03)
- **D-05:** Reduced-motion mode is detected from the OS `prefers-reduced-motion: reduce` media query only. There is no in-app toggle and no runtime performance fallback.
- **D-06:** In reduced-motion mode, the orb is rendered at a fixed mid-size — it does not scale with `phaseProgress`. The static outer and inner reference rings remain visible.
- **D-07:** Phase change in reduced-motion mode is communicated by a soft 300–500ms color/gradient crossfade between the In and Out treatments plus the text label swap. No discrete jump, no scale animation.
- **D-08:** In reduced-motion mode, cycle progress is communicated only by the persistent phase text and the existing remaining/elapsed clock. There is no progress bar, dot indicator, or per-second phase countdown.
- **D-09:** Reduced-motion behavior applies globally, not only to the orb. Decorative transitions on buttons, settings steppers, and focus rings are disabled under `prefers-reduced-motion: reduce` using Tailwind `motion-reduce:` utilities to keep the experience consistent.

### Confirmation Modal (replaces Phase 1 `window.confirm`)
- **D-10:** The timed-end confirmation introduced in Phase 1 (D-14) is reimplemented as an in-app accessible modal dialog. The native `window.confirm` call in `src/app/App.tsx` is removed in this phase. Implementation should prefer the native `<dialog>` element or an equivalent focus-trapped pattern; either way it must support backdrop, Esc-to-close, and focus restoration to the `End session` button on close.
- **D-11:** Modal copy is fixed: title `End this session?`, primary button `End`, cancel button `Keep going`. The primary button label intentionally matches the existing `End session` action language from Phase 1 D-11.
- **D-12:** Default focus on modal open is the `Keep going` cancel button, not the destructive primary. This protects against accidental Enter ending the session.
- **D-13:** The session timing clock continues running while the modal is open. The orb and readout continue updating behind a dim backdrop. Cancelling the modal returns the user to a live session with no drift, preserving SESS-05 single accurate continuous clock.
- **D-14:** Open-ended sessions still end directly without a confirmation dialog (Phase 1 D-14 is preserved). Only timed sessions raise the modal.

### Responsive Layout And Mobile/Desktop Polish (GUID-04, MOBL-01)
- **D-15:** The layout stays a single vertical column on every breakpoint: header → orb → readout → settings/controls → end action. Spacing, font sizes, and orb diameter scale up on wider viewports rather than restructuring into a multi-column layout.
- **D-16:** During a running session, the BPM stepper and ratio stepper are hidden from the screen. Only the duration display remains visible — the existing increase-only `RunningDurationControl` for timed sessions, or a clearly labeled `Open-ended` indicator for open-ended sessions. Hiding these controls is what makes the orb plus the `End session` button reachable above the fold without scrolling on mobile.
- **D-17:** Stepper plus/minus buttons (and any other primary tappable controls) have a minimum 44×44px hit area on all viewports to meet the standard mobile touch-target guideline.
- **D-18:** The orb's rendered diameter uses a CSS fluid clamp around `clamp(180px, 35vw, 360px)` so the orb scales with viewport width up to a desktop cap. The static reference rings scale with the orb.
- **D-19:** On short-height viewports such as mobile landscape, the layout keeps the same single-column stack and accepts that idle-screen settings may require scrolling. The running-session screen still meets the orb-plus-`End session`-above-the-fold goal because of D-16. There is no dedicated landscape two-column layout.
- **D-20:** Phase 2 ships in light theme only. There is no dark-mode variant and no theme toggle in this phase. The existing pastel teal palette and `--color-breathing-*` tokens in `src/styles/theme.css` are the basis for refinement.
- **D-21:** Keyboard focus is communicated via a theme-matched `focus-visible` ring built on the existing `--color-breathing-accent` token (e.g., a 2px ring with a small offset against the soft background). The ring shows for keyboard focus only, not on mouse activation.

### Claude's Discretion
- Specific Tailwind utility composition, exact easing curves and crossfade durations within the 300–500ms band, exact ring stroke widths and opacities, modal entry/exit treatment, and the implementation choice between native `<dialog>` and a focus-trapped overlay are technical decisions left to the planner and executor as long as they satisfy the locked decisions above.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope And Constraints
- `.planning/PROJECT.md` — Defines the web-first, local-only, calm, non-medical product direction; flags multiple animation styles and themes as out-of-scope for v1; confirms the visual goal of one excellent calm guide rather than many configurable options.
- `.planning/ROADMAP.md` — Defines Phase 2 goal, fixed boundary, dependencies on Phase 1, requirements mapping (GUID-01 through GUID-04, MOBL-01), and success criteria.

### Requirements
- `.planning/REQUIREMENTS.md` — Defines Phase 2 requirement IDs `GUID-01` (synchronized animation), `GUID-02` (phase as text), `GUID-03` (reduced-motion display), `GUID-04` (accessible labeled controls, focus, keyboard, non-color-only cues), and `MOBL-01` (mobile and desktop comfort). Also defines the v2 `CUST-01` slot used to defer multiple animation styles.

### Carrying Forward From Phase 1
- `.planning/phases/01-configurable-session-timing/01-CONTEXT.md` — Locked product decisions Phase 2 must respect: D-01 default settings, D-02 stepper UI pattern, D-11 `End session` button copy, D-13 `Session complete` message, D-14 timed-only confirmation, D-15 `Start session` idle copy, D-16 `In` / `Out` phase labels, D-17 `Open-ended` duration label.
- `.planning/phases/01-configurable-session-timing/01-04-SUMMARY.md` — Documents the existing `BreathingShape`, `SessionReadout`, `RunningDurationControl`, and the running-time UI that Phase 2 must refine, plus the established pattern that all visible session state derives from a single `SessionFrame`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/useSessionEngine.ts` and the `SessionFrame` shape from `src/domain/sessionMath.ts` already provide `phase`, `phaseLabel`, `phaseProgress`, and the running clock. Phase 2 visuals MUST consume this frame rather than introducing new timers.
- `src/components/BreathingShape.tsx` already binds scale to `phaseProgress`, exposes `data-phase` and `data-progress` for styling hooks, and includes a baseline `prefers-reduced-motion` CSS guard. Phase 2 refines this component (or replaces its internals) — the component contract and the data binding stay.
- `src/components/SessionReadout.tsx` already renders the `In` / `Out` label and the remaining/elapsed clock; Phase 2's "phase + clock text only" reduced-motion story (D-08) and the "phase label inside orb" decision (D-03) coordinate visual handoff between this component and the orb.
- `src/components/SettingsForm.tsx`, `src/components/SettingsStepper.tsx`, and `src/components/RunningDurationControl.tsx` are the touch-target and locking-pattern surfaces that D-16 (hide BPM/ratio while running, keep duration) and D-17 (44×44 hit areas) modify.
- `src/styles/theme.css` already exposes `--color-breathing-bg`, `--color-breathing-bg-soft`, `--color-breathing-accent`, `--color-breathing-accent-strong`, `--color-breathing-muted`, and `--shadow-breathing-card`. Phase 2 refines and extends these tokens; the theme-matched focus ring (D-21) builds on `--color-breathing-accent`.
- `src/app/App.tsx` currently calls `window.confirm('End this timed session?')` inside `endSession`. D-10 removes this call and replaces it with the in-app modal flow.

### Established Patterns
- **Single-frame data flow:** every visible session element derives from `SessionFrame` from `useSessionEngine`. Phase 2 must not introduce parallel timers, animation drivers, or local interval state for the orb, modal, or reduced-motion crossfade.
- **Tailwind v4 + CSS variable theme tokens:** Tailwind v4 with `@theme` tokens in `src/styles/theme.css` is the styling baseline. New tokens or motion utilities should slot into the same pattern.
- **Component tests use user-visible roles and copy:** Phase 1 tests in `src/app/App.session.test.tsx` and `src/app/App.settings.test.tsx` exercise behavior through accessible names. Phase 2 tests should follow the same approach for the modal, focus ring, reduced-motion variant, and running-mode hide-BPM/ratio behavior.
- **`motion-reduce:` and `@media (prefers-reduced-motion: reduce)`:** the codebase already uses both Tailwind `motion-reduce` utilities and a CSS-level guard. D-05 and D-09 extend this pattern across new motion surfaces rather than introducing a new detection strategy.

### Integration Points
- `src/app/App.tsx` is the composition point that wires the orb, readout, settings, controls, and the new confirmation modal. The current `endSession` handler is the integration seam for D-10 / D-13 (modal replaces `window.confirm`, session timing keeps running).
- `src/components/BreathingShape.tsx` is the integration seam for D-01 through D-04, D-06, D-07, and D-18 (refined orb plus static reference rings, reduced-motion static + crossfade, fluid sizing).
- `src/components/SettingsForm.tsx` is the seam for D-16 (hide BPM and ratio steppers in the running state, surface only the duration display) and D-17 (hit-area sizing).

</code_context>

<specifics>
## Specific Ideas

- The user explicitly wants visible reference rails ("border") at both the maximum-inhale and minimum-exhale orb sizes so they can see how big the orb will get and how small it will shrink during a breath cycle. The static outer + inner ring pair is captured in D-04 specifically to deliver that read.
- The reason BPM and ratio controls are hidden during a running session (D-16) is to keep the orb and the `End session` button reachable above the fold without scrolling on mobile, not just to clean up the screen.
- The reason `Keep going` is the default focused button in the confirmation modal (D-12) is to actively defend against accidentally ending a calm hands-off session with a stray Enter press.
- The reason multiple selectable animation metaphors are deferred (orb vs concentric rings vs lung silhouette) is that the user wants all three available eventually but recognizes Phase 2's job is to ship one excellent default first; the alternatives are tracked in `<deferred>` against v2 `CUST-01`.

</specifics>

<deferred>
## Deferred Ideas

- **Multiple selectable animation metaphors (orb / orb + concentric rings / lung-figure silhouette):** the user wants the option to switch between these eventually. Track against REQUIREMENTS.md v2 `CUST-01` ("alternate themes, animation styles, audio timbres, or display options"). Phase 2 ships only the refined abstract orb.
- **Dark mode and theme toggle:** light-only for Phase 2 (D-20). PROJECT.md already lists multiple themes as v1 out-of-scope; revisit alongside `CUST-01` when configurable experience is in scope.
- **In-app reduced-motion override toggle:** Phase 2 honors OS preference only (D-05). An in-app override could be revisited if user feedback indicates the OS signal is insufficient.
- **Claim-safe disclaimer copy in the practice surface footer:** owned by Phase 6 (`LEARN-04`). Phase 2 does not add disclaimer text.
- **Two-column / landscape-specific layout:** Phase 2 uses a single-column stack at all viewports (D-15, D-19). A short-height landscape variant could be reconsidered later if practice testing exposes a problem.

</deferred>

---

*Phase: 02-visual-guide-accessible-responsive-interface*
*Context gathered: 2026-05-09*
