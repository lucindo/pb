# Phase 2: Visual Guide & Accessible Responsive Interface - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 02-visual-guide-accessible-responsive-interface
**Areas discussed:** Animation metaphor, Reduced-motion display, Replace window.confirm, Mobile vs desktop layout

---

## Animation Metaphor

### Q1: What's the core breathing visual?

| Option | Description | Selected |
|--------|-------------|----------|
| Refined abstract orb | Single soft pastel orb that smoothly grows on In and shrinks on Out. Keeps current SessionFrame.phaseProgress wiring; refines the Phase 1 placeholder. | ✓ (for Phase 2) |
| Orb + concentric rings | Central orb plus expanding/contracting halo rings. | (deferred) |
| Lung/figure silhouette | Figurative meditation/lung silhouette that fills/empties. | (deferred) |
| You decide | Claude picks during planning. | |

**User's choice:** "I want to have the 3 options, maybe this is set to a future phase, if so, then for now pick number 1."
**Notes:** Phase 2 ships only the refined abstract orb. The other two metaphors are tracked as a deferred multi-style selector under v2 CUST-01.

### Q2: How should the orb communicate phase change beyond size?

| Option | Description | Selected |
|--------|-------------|----------|
| Color shift + size | Warmer/teal-leaning on In, cooler/blue-leaning on Out, plus persistent text label. | ✓ |
| Size only, neutral color | Single calm gradient; phase only visible from size + text label. | |
| Subtle directional motion | Orb drifts up on In, down on Out in addition to scale. | |
| You decide | Claude chooses during UI planning. | |

**User's choice:** Color shift + size.
**Notes:** Persistent text label keeps the cue from being color-only (GUID-04).

### Q3: How should In and Out phase text relate to the orb?

| Option | Description | Selected |
|--------|-------------|----------|
| Inside orb, large | `In`/`Out` rendered centered inside the orb at large size. | ✓ |
| Below orb, separate | Orb purely visual; phase label sits in dedicated text row below clock. | |
| Above orb, header style | Phase label as small uppercase header above the orb. | |
| You decide | Claude picks during UI planning. | |

**User's choice:** Inside orb, large.
**Notes:** Phase 1 placeholder already does a small variant of this; D-03 commits to it as the polished pattern.

### Q4: Need a progress hint inside the cycle, or is phase + time enough?

| Option | Description | Selected |
|--------|-------------|----------|
| Orb scale alone | Smooth orb growth/shrink already shows progress; no extra ring/bar. | |
| Subtle ring progress | Faint stroke ring around orb fills across each phase. | |
| Tiny dot/bar under text | Small horizontal line beneath In/Out fills 0→100% per phase. | |
| Outer + inner reference rings | Static rings at max-inhale and min-exhale diameters; orb scales between. | ✓ |

**User's choice:** Free text — "orb scale works but lacks visual clue for user of boundaries (need a way for user to know for how long the orb will expand and contract, maybe an in-place tiny fixed 'border'?)" then confirmed Outer + inner rings.
**Notes:** D-04 captures the static outer + inner ring pair so the user can see the breath's bounds without a continuous progress meter.

---

## Reduced-Motion Display

### Q1: What should reduced-motion users see in place of the growing orb?

| Option | Description | Selected |
|--------|-------------|----------|
| Static orb + crossfade | Orb fixed at mid-size; soft 300–500ms color crossfade between In/Out; text swaps; bounds rings still visible. | ✓ |
| Static orb, instant phase swap | No transition at all — strictest reduce-motion. | |
| Linear progress bar | Replace orb entirely with a fill/empty bar. | |
| You decide | Claude picks during planning. | |

**User's choice:** Static orb + crossfade.

### Q2: How should reduced-motion users see cycle progress / time?

| Option | Description | Selected |
|--------|-------------|----------|
| Phase + clock text only | Same In/Out label and remaining/elapsed clock as default; no progress meter. | ✓ |
| Numeric phase countdown | `In · 3s` ticking down; explicit but text churn each second. | |
| Subtle non-animated dots | Discrete 25/50/75/100% dots. | |
| You decide | Claude picks during planning. | |

**User's choice:** Phase + clock text only.

### Q3: How should reduced-motion be detected and applied?

| Option | Description | Selected |
|--------|-------------|----------|
| OS preference only | Honor `prefers-reduced-motion: reduce` media query; no in-app toggle. | ✓ |
| OS + in-app override toggle | Detect OS pref but expose a Calm motion toggle. | |
| OS + auto-fallback if frame drops | Detect OS pref AND switch on perf issues. | |
| You decide | Claude picks during planning. | |

**User's choice:** OS preference only.

### Q4: Should reduced-motion also calm non-orb motion?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — strip transitions globally | Disable transitions/animations on buttons, steppers, focus rings under reduce-motion. | ✓ |
| No — only orb is calmed | Keep button hover/press transitions; only orb is static. | |
| You decide | Claude picks consistent strategy. | |

**User's choice:** Strip transitions globally.

---

## Replace window.confirm

### Q1: How should timed-end confirmation work post-Phase-1?

| Option | Description | Selected |
|--------|-------------|----------|
| In-app modal dialog | Custom accessible modal: backdrop, focus-trap, Esc closes, restore focus. | ✓ |
| Inline confirmation row | End button morphs into 'Are you sure?' row in place. | |
| Two-tap End button | First tap shifts End into 'Tap again to confirm'; second tap ends. | |
| You decide | Claude picks during planning. | |

**User's choice:** In-app modal dialog.

### Q2: Modal copy and primary action label?

| Option | Description | Selected |
|--------|-------------|----------|
| 'End this session?' / End / Keep going | Matches existing End session copy; cancel framed positively. | ✓ |
| 'End session early?' / Yes, end / Cancel | Acknowledges timed nature explicitly. | |
| 'Stop now?' / Stop / Keep breathing | Softer, more meditative wording. | |
| You decide | Claude picks copy that matches calm tone. | |

**User's choice:** 'End this session?' / End / Keep going.

### Q3: Default focus when modal opens?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep going (cancel) | Defensive default — accidental Enter won't end the session. | ✓ |
| End (primary) | Faster confirm; risk of accidental Enter ending session. | |
| Modal container, no button focused | Focus dialog itself; user explicitly chooses. | |
| You decide | Claude picks during a11y planning. | |

**User's choice:** Keep going (cancel).

### Q4: Behind the modal, does the session keep running?

| Option | Description | Selected |
|--------|-------------|----------|
| Session keeps running | Clock continues; orb/text behind dim backdrop continues; cancel returns to live session with no drift. | ✓ |
| Visually freeze orb/text | Backdrop dims AND orb/text freeze visually while clock keeps running. | |
| You decide | Claude picks consistent behavior. | |

**User's choice:** Session keeps running.

---

## Mobile vs Desktop Layout

### Q1: Layout direction across breakpoints?

| Option | Description | Selected |
|--------|-------------|----------|
| Single column, scale spacing | Same vertical stack on all sizes; spacing/sizes scale up on desktop. | ✓ |
| Desktop two-column, mobile stack | Orb left, settings/readout right on desktop. | |
| Mobile-first, desktop max-width capped | Same layout, narrower centered column on desktop. | |
| You decide | Claude picks during UI planning. | |

**User's choice:** Single column, scale spacing.

### Q2: During a running session, should settings stay visible or collapse?

| Option | Description | Selected |
|--------|-------------|----------|
| Stay visible but locked | Disabled BPM/ratio/duration steppers + extension control. | |
| Collapse settings, show 'Edit settings' link | Hide all settings; expose only an extension trigger. | |
| Compact summary chip while running | Replace settings card with one-line chip; tap to expand. | |
| Custom (user free text) | Hide BPM and Ratio; keep Duration display only. | ✓ |

**User's choice:** Free text — "Show only Duration control, not BPM and Ratio. This way user can change duration and if it is open-ended the information is present. Now showing BPM/Ratio control gives space for the orb and the End Session button appear without needing to scroll down to find the end session button."
**Notes:** D-16 captures this exact behavior: BPM and ratio steppers are hidden while running; the duration control remains (extension control for timed, `Open-ended` indicator for open-ended) so the orb and End session button are above the fold without scrolling on mobile.

### Q3: Mobile tap target / hit-area for stepper +/- buttons?

| Option | Description | Selected |
|--------|-------------|----------|
| 44×44px minimum | Apple/WCAG guideline. | ✓ |
| 48×48px (Material) | Slightly larger; more intrusive on desktop. | |
| 32×32px (compact) | Risks misclicks on mobile. | |
| You decide | Claude picks during UI planning. | |

**User's choice:** 44×44px minimum.

### Q4: Orb sizing across breakpoints?

| Option | Description | Selected |
|--------|-------------|----------|
| Fluid clamp | `clamp(180px, 35vw, 360px)` — grows with viewport up to a desktop cap. | ✓ |
| Two fixed sizes | Mobile/desktop step at sm breakpoint. | |
| Fixed 240px everywhere | Same size on all screens. | |
| You decide | Claude picks during UI planning. | |

**User's choice:** Fluid clamp.

### Q5: Mobile landscape / short-height handling?

| Option | Description | Selected |
|--------|-------------|----------|
| Same vertical stack, allow scroll | Idle screen may scroll on landscape; running screen still meets above-fold goal. | ✓ |
| Two-column landscape | Side-by-side orb + controls on short-height landscape. | |
| Shrink orb in landscape | Reduce orb when viewport-height is low. | |
| You decide | Claude picks during UI planning. | |

**User's choice:** Same vertical stack, allow scroll.

### Q6: Dark mode for v1 polish?

| Option | Description | Selected |
|--------|-------------|----------|
| Light only | Skip dark mode in Phase 2; aligns with PROJECT.md out-of-scope on multiple themes. | ✓ |
| Auto via prefers-color-scheme | OS-driven dark variant. | |
| Manual toggle | Adds setting + persistence. | |
| You decide | Claude picks during UI planning. | |

**User's choice:** Light only.

### Q7: Footer / claim-safe disclaimer in Phase 2?

| Option | Description | Selected |
|--------|-------------|----------|
| Defer to Phase 6 | LEARN-04 owns claim-safe copy in Phase 6. | ✓ |
| Add minimal disclaimer now | Place a short 'Not medical advice' line in footer. | |
| You decide | Claude picks consistent with phase boundary. | |

**User's choice:** Defer to Phase 6.

### Q8: Focus ring style for keyboard a11y (GUID-04)?

| Option | Description | Selected |
|--------|-------------|----------|
| Theme-matched ring | Custom focus-visible ring built on `--color-breathing-accent`. | ✓ |
| Browser default focus | Inconsistent across browsers; can clash with palette. | |
| High-contrast outline | Solid 3px outline; visually loud. | |
| You decide | Claude picks during UI planning. | |

**User's choice:** Theme-matched ring.

---

## Claude's Discretion

No "you decide" answers were selected during this discussion. Implementation latitude noted in CONTEXT.md (D-section "Claude's Discretion") covers technical sub-choices below the locked decisions: exact Tailwind utilities, easing curves, crossfade durations within the 300–500ms band, ring stroke widths, modal entry/exit treatment, and the choice between native `<dialog>` and a focus-trapped overlay.

## Deferred Ideas

- **Multiple selectable animation metaphors** (orb / orb + concentric rings / lung-figure silhouette) — track against v2 `CUST-01` ("alternate themes, animation styles, audio timbres, or display options"). User explicitly wants all three available eventually but ships the refined orb first in Phase 2.
- **Dark mode and theme toggle** — Phase 2 is light-only (D-20). Revisit with `CUST-01`.
- **In-app reduced-motion override toggle** — Phase 2 honors OS preference only.
- **Claim-safe disclaimer copy** — owned by Phase 6 (`LEARN-04`).
- **Two-column / landscape-specific layout** — Phase 2 stays single-column at all viewports.
