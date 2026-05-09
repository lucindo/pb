# Phase 2: Visual Guide & Accessible Responsive Interface - Research

**Researched:** 2026-05-09
**Domain:** React 19 + Tailwind v4 + Vitest accessibility / motion / responsive UI
**Confidence:** HIGH overall (browser APIs, Tailwind v4, jsdom limitations all directly verified; one MEDIUM area on the exact CSS gradient transition technique, where multiple equivalent approaches are valid).

## Summary

Phase 2 is a focused refinement layer over an already-working Phase 1 timing surface. The critical technical questions are not "what library do we add" — they are "which native browser primitives do we lean on, and which jsdom gaps must we polyfill in tests?" The repository is React 19 + Tailwind v4 + Vitest/jsdom 29 with no UI dependencies, and the right answer for Phase 2 is to keep it that way. No new runtime dependencies are needed.

The single load-bearing decision is the modal pattern. The native HTML `<dialog>` element with `showModal()` is the correct choice in 2026 because it handles focus trapping, the inert backdrop, and Escape-to-close natively, and it is the path the W3C / accessibility community now actively recommends [CITED: css-tricks.com/there-is-no-need-to-trap-focus-on-a-dialog-element]. The cost is real but bounded: jsdom 29.1.1 does not implement `show`, `showModal`, or `close` on `HTMLDialogElement.prototype` [VERIFIED: ran `new JSDOM(...).window.document.createElement('dialog')` — all three methods are `undefined`]. We polyfill the three methods in `vitest.setup.ts` with stubs that flip the `open` attribute. This is the established workaround [CITED: github.com/jestjs/jest/issues/13010].

The orb refinement keeps the existing `BreathingShape` data binding (`SessionFrame.phaseProgress` -> CSS variable -> `transform: scale()`) and adds two static reference rings, an inside-orb phase label, and an In/Out gradient swap. Reduced-motion mode already has a partial CSS guard in `theme.css`; Phase 2 extends it to a full 300-500ms `opacity` crossfade between two stacked gradient layers (since CSS cannot directly transition `background-image` [CITED: melanie-richards.com/blog/animating-gradients]). All animation is driven from the existing `SessionFrame` — no new timers, no new hooks beyond a thin `usePrefersReducedMotion`.

**Primary recommendation:** Use the native `<dialog>` element with `showModal()` and `close()`, polyfilled in tests; keep the orb as a single CSS-transformed div with stacked gradient layers for the In/Out crossfade; expose a `usePrefersReducedMotion` hook backed by `matchMedia`; rely on Tailwind v4's auto-generated color utilities (`ring-breathing-accent`, etc.) plus `focus-visible:` and `motion-reduce:` variants; size the orb with `clamp(180px, 35vw, 360px)` on a CSS custom property and have the static rings derive from the same token.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Animation Metaphor**
- **D-01:** The breathing visual is a single refined abstract orb — not concentric rings, not a lung/figure silhouette. The orb keeps the existing `SessionFrame.phaseProgress` data binding established in Phase 1.
- **D-02:** Phase change is communicated by both size and color/gradient shift (warmer/teal-leaning on `In`, cooler/blue-leaning on `Out`) AND by a persistent text label, so the cue is never color-only (GUID-04).
- **D-03:** The active phase label (`In` / `Out`, locked from Phase 1 D-16) is rendered centered inside the orb at large display size — not below or above the orb.
- **D-04:** The orb is framed by two static reference rings: an outer ring at the maximum-inhale diameter and a faint inner ring at the minimum-exhale diameter. The orb scales between these two fixed bounds so the user can see the edges of the breath without a separate progress meter.

**Reduced-Motion Display (GUID-03)**
- **D-05:** Reduced-motion mode is detected from the OS `prefers-reduced-motion: reduce` media query only. There is no in-app toggle and no runtime performance fallback.
- **D-06:** In reduced-motion mode, the orb is rendered at a fixed mid-size — it does not scale with `phaseProgress`. The static outer and inner reference rings remain visible.
- **D-07:** Phase change in reduced-motion mode is communicated by a soft 300-500ms color/gradient crossfade between the In and Out treatments plus the text label swap. No discrete jump, no scale animation.
- **D-08:** In reduced-motion mode, cycle progress is communicated only by the persistent phase text and the existing remaining/elapsed clock. There is no progress bar, dot indicator, or per-second phase countdown.
- **D-09:** Reduced-motion behavior applies globally, not only to the orb. Decorative transitions on buttons, settings steppers, and focus rings are disabled under `prefers-reduced-motion: reduce` using Tailwind `motion-reduce:` utilities to keep the experience consistent.

**Confirmation Modal (replaces Phase 1 `window.confirm`)**
- **D-10:** The timed-end confirmation introduced in Phase 1 (D-14) is reimplemented as an in-app accessible modal dialog. The native `window.confirm` call in `src/app/App.tsx` is removed in this phase. Implementation should prefer the native `<dialog>` element or an equivalent focus-trapped pattern; either way it must support backdrop, Esc-to-close, and focus restoration to the `End session` button on close.
- **D-11:** Modal copy is fixed: title `End this session?`, primary button `End`, cancel button `Keep going`. The primary button label intentionally matches the existing `End session` action language from Phase 1 D-11.
- **D-12:** Default focus on modal open is the `Keep going` cancel button, not the destructive primary. This protects against accidental Enter ending the session.
- **D-13:** The session timing clock continues running while the modal is open. The orb and readout continue updating behind a dim backdrop. Cancelling the modal returns the user to a live session with no drift, preserving SESS-05 single accurate continuous clock.
- **D-14:** Open-ended sessions still end directly without a confirmation dialog (Phase 1 D-14 is preserved). Only timed sessions raise the modal.

**Responsive Layout And Mobile/Desktop Polish (GUID-04, MOBL-01)**
- **D-15:** The layout stays a single vertical column on every breakpoint: header -> orb -> readout -> settings/controls -> end action. Spacing, font sizes, and orb diameter scale up on wider viewports rather than restructuring into a multi-column layout.
- **D-16:** During a running session, the BPM stepper and ratio stepper are hidden from the screen. Only the duration display remains visible — the existing increase-only `RunningDurationControl` for timed sessions, or a clearly labeled `Open-ended` indicator for open-ended sessions. Hiding these controls is what makes the orb plus the `End session` button reachable above the fold without scrolling on mobile.
- **D-17:** Stepper plus/minus buttons (and any other primary tappable controls) have a minimum 44x44px hit area on all viewports to meet the standard mobile touch-target guideline.
- **D-18:** The orb's rendered diameter uses a CSS fluid clamp around `clamp(180px, 35vw, 360px)` so the orb scales with viewport width up to a desktop cap. The static reference rings scale with the orb.
- **D-19:** On short-height viewports such as mobile landscape, the layout keeps the same single-column stack and accepts that idle-screen settings may require scrolling. The running-session screen still meets the orb-plus-`End session`-above-the-fold goal because of D-16. There is no dedicated landscape two-column layout.
- **D-20:** Phase 2 ships in light theme only. There is no dark-mode variant and no theme toggle in this phase. The existing pastel teal palette and `--color-breathing-*` tokens in `src/styles/theme.css` are the basis for refinement.
- **D-21:** Keyboard focus is communicated via a theme-matched `focus-visible` ring built on the existing `--color-breathing-accent` token (e.g., a 2px ring with a small offset against the soft background). The ring shows for keyboard focus only, not on mouse activation.

### Claude's Discretion
- Specific Tailwind utility composition, exact easing curves and crossfade durations within the 300-500ms band, exact ring stroke widths and opacities, modal entry/exit treatment, and the implementation choice between native `<dialog>` and a focus-trapped overlay are technical decisions left to the planner and executor as long as they satisfy the locked decisions above.

### Deferred Ideas (OUT OF SCOPE)
- **Multiple selectable animation metaphors (orb / orb + concentric rings / lung-figure silhouette):** the user wants the option to switch between these eventually. Track against REQUIREMENTS.md v2 `CUST-01`. Phase 2 ships only the refined abstract orb.
- **Dark mode and theme toggle:** light-only for Phase 2 (D-20). Revisit alongside `CUST-01`.
- **In-app reduced-motion override toggle:** Phase 2 honors OS preference only (D-05).
- **Claim-safe disclaimer copy in the practice surface footer:** owned by Phase 6 (`LEARN-04`).
- **Two-column / landscape-specific layout:** Phase 2 uses a single-column stack at all viewports.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GUID-01 | User can follow a polished breathing animation synchronized to the current inhale/exhale phase. | Existing `BreathingShape` consumes `SessionFrame.phaseProgress` (`src/components/BreathingShape.tsx:14`). Refinement = single-orb visual + two static reference rings + in-orb phase label + In/Out gradient stacking. CSS `transform: scale()` is GPU-composited and stays at 60fps without parallel timers [CITED: developer.chrome.com/blog/hardware-accelerated-animations]. |
| GUID-02 | User can always read the current breathing phase as text. | `SessionReadout` already exposes `frame.phaseLabel` (`src/components/SessionReadout.tsx:33`). D-03 places the same label inside the orb at large display size. Single text node remains the source of truth, satisfying non-color-only cue requirement. |
| GUID-03 | User with reduced-motion preference gets a calmer reduced-motion session display. | `prefers-reduced-motion: reduce` media query + Tailwind v4 `motion-reduce:` variant. Detection via `window.matchMedia('(prefers-reduced-motion: reduce)')` [CITED: developer.mozilla.org/.../prefers-reduced-motion]. Crossfade pattern stacks two gradient layers and animates `opacity` because `background-image` itself is not directly transitionable [CITED: melanie-richards.com/blog/animating-gradients]. |
| GUID-04 | User can operate the app with accessible labeled controls, visible focus states, keyboard support, and non-color-only cues. | `focus-visible:` Tailwind variant scoped to keyboard focus only [CITED: tailwindcss.com/docs/hover-focus-and-other-states]. ARIA APG dialog pattern for modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on the title, focus on `Keep going` (D-12), Esc closes, focus restores to `End session` trigger [CITED: w3.org/WAI/ARIA/apg/patterns/dialog-modal]. 44x44 hit areas on steppers via min-size class composition. |
| MOBL-01 | User can use the app comfortably on mobile and desktop browser layouts. | Single-column stack at all breakpoints (D-15). Orb sized with `clamp(180px, 35vw, 360px)` (D-18); CSS `clamp()` is universally supported and is the standard fluid-sizing primitive [CITED: developer.mozilla.org/.../clamp]. Hiding BPM/ratio steppers during running (D-16) keeps orb + `End session` above the fold without a landscape-specific layout (D-19). |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Breathing orb animation | Browser / Client (CSS + DOM) | — | All animation is driven from the in-memory `SessionFrame` produced by `useSessionEngine` (`src/hooks/useSessionEngine.ts:23-57`). Orb scale binds to a CSS custom property; the browser compositor renders the rest. No backend involvement. |
| Phase label text rendering | Browser / Client (React render) | — | Pure derived data (`SessionFrame.phaseLabel`) - already implemented (`src/domain/sessionMath.ts:6-13`). |
| Reduced-motion detection | Browser / Client (`matchMedia`) | — | OS media query only (D-05). No server-side preference store. |
| Confirmation modal | Browser / Client (native `<dialog>`) | — | Pure UI state. Uses the native `<dialog>` element rendered in the same React tree, no portals or backend. |
| Focus / keyboard / `focus-visible` ring | Browser / Client (CSS pseudo-class + Tailwind variant) | — | Pure presentational layer; managed by the browser focus engine. |
| Responsive layout & 44x44 hit areas | Browser / Client (CSS) | — | CSS `clamp()`, Tailwind responsive utilities, no breakpoint-driven server rendering. |
| Hiding BPM/ratio while running | Browser / Client (React conditional render) | — | Driven by `state.status === 'running'` from the existing controller. |

**Result:** Phase 2 is entirely a client-tier refinement. There is no API, no SSR, no edge concern. The single risk to watch is keeping all visible state derived from `SessionFrame` (no parallel timers).

## Standard Stack

### Core (Already Installed - No New Dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.2.5 | UI runtime | [VERIFIED: `package.json:14`] Already in use; React 19 supports refs as props, `use()`, and modern effect semantics. No new patterns needed. |
| react-dom | 19.2.5 | DOM renderer | [VERIFIED: `package.json:15`] |
| tailwindcss | 4.3.0 | Styling | [VERIFIED: `npm view tailwindcss version` -> 4.3.0; `package.json:17`] v4's `@theme` directive in `src/styles/theme.css` already drives `--color-breathing-*` tokens, and Tailwind auto-generates color utilities (`bg-breathing-accent`, `ring-breathing-accent`, etc.) from any `--color-*` variable [CITED: tailwindcss.com/docs/theme]. |
| @tailwindcss/vite | 4.3.0 | Tailwind v4 Vite plugin | [VERIFIED: `package.json:17`] |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.1.5 | Test runner | [VERIFIED: `npm view vitest version` -> 4.1.5] Phase 1 already configured (`vite.config.ts`). |
| @testing-library/react | 16.3.2 | React component test utilities | [VERIFIED: `npm view @testing-library/react version` -> 16.3.2] Already in use across `App.session.test.tsx`, `App.settings.test.tsx`. |
| @testing-library/user-event | 14.6.1 | Realistic interaction simulation | [VERIFIED: `package.json`] Used for keyboard-driven tests. |
| @testing-library/jest-dom | 6.9.1 | DOM matchers (`toBeVisible`, `toHaveAttribute`) | [VERIFIED: `package.json`] Auto-imported via `vitest.setup.ts`. |
| jsdom | 29.1.1 | DOM in tests | [VERIFIED: `npm view jsdom version` -> 29.1.1, published 2026-05-02] **Important caveat: jsdom 29.1.1 does NOT implement `HTMLDialogElement.prototype.show`/`showModal`/`close`** [VERIFIED: ran in Node `new JSDOM(...).window.document.createElement('dialog').showModal === undefined`]. Polyfill in `vitest.setup.ts` (see Code Examples). |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<dialog>` + showModal | `react-modal` / `radix-ui Dialog` / hand-rolled focus-trap | Adds a dependency for behavior the platform now provides natively. Native `<dialog>` correctly handles focus trapping via the `inert` attribute on background content, and the W3C accessibility community has explicitly walked back the older "manually trap focus" guidance for `<dialog>` [CITED: css-tricks.com/there-is-no-need-to-trap-focus-on-a-dialog-element]. Stick with native + jsdom polyfill. |
| Custom `usePrefersReducedMotion` | Mantine / framer-motion's `useReducedMotion` | One small hook; adding a UI library for one hook is overkill given zero existing UI dependencies. |
| Stacked gradient `<div>` orb | SVG `<circle>` + `<radialGradient>` | Both work. CSS-on-`<div>` keeps the GPU-friendly path (`transform: scale`) and avoids the SVG-specific compositing complexity. Chrome 89+ does GPU-accelerate SVG transforms [CITED: developer.chrome.com/blog/hardware-accelerated-animations], but the simpler div approach has fewer cross-browser surprises and is what `BreathingShape` already does. Stay on `<div>`. |
| `dialog-polyfill` for jsdom | Manual `vi.fn()` stubs | Polyfill adds a runtime dependency for a test-only gap. Manual prototype stubs are 6 lines and well-established [CITED: github.com/jestjs/jest/issues/13010 with Vitest equivalent]. |

**Installation:** No new packages. All existing.

**Version verification:**
```bash
npm view react version           # 19.2.5
npm view tailwindcss version     # 4.3.0
npm view vitest version          # 4.1.5
npm view jsdom version           # 29.1.1 (verified 2026-05-09)
```

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                           Browser                                    │
│                                                                       │
│  ┌──────────────────┐         ┌─────────────────────────────────┐   │
│  │  OS preferences   │ ──────> │   matchMedia                   │   │
│  │  (reduce-motion)  │         │   '(prefers-reduced-motion:    │   │
│  └──────────────────┘         │    reduce)'                    │   │
│                                └────────────────┬──────────────┘   │
│                                                 │                   │
│                                                 v                   │
│                                ┌─────────────────────────────┐     │
│                                │  usePrefersReducedMotion    │     │
│                                │  (subscribes via            │     │
│                                │   addEventListener)         │     │
│                                └────────────┬────────────────┘     │
│                                             │ boolean              │
│                                             v                      │
│  ┌────────────┐    SessionFrame   ┌─────────────────────────────┐ │
│  │useSession  │───────────────────>│        App.tsx              │ │
│  │  Engine    │   {phase, label,   │   (composition root)        │ │
│  │ (rAF tick) │    progress, time} │                             │ │
│  └────────────┘                    └──┬──────┬──────┬───────┬───┘ │
│                                       │      │      │       │     │
│                  ┌────────────────────┘      │      │       │     │
│                  │                           │      │       │     │
│                  v                           v      v       v     │
│        ┌───────────────────┐    ┌──────────────┐ ┌──────┐ ┌─────┐│
│        │  BreathingShape   │    │SessionReadout│ │Modal │ │Stepp││
│        │  (orb + 2 rings)  │    │ (clock+phase)│ │      │ │ ers │││
│        │                   │    │              │ │role= │ │     │││
│        │  [div]            │    │              │ │dialog│ │     │││
│        │   ↳ scale=fn(prog)│    │              │ │      │ │     │││
│        │   ↳ gradient In/  │    │              │ │      │ │     │││
│        │     Out crossfade │    │              │ │      │ │     │││
│        │   ↳ static rings  │    │              │ │      │ │     │││
│        │     at min/max    │    │              │ │      │ │     │││
│        └───────────────────┘    └──────────────┘ └──┬───┘ └─────┘│
│                                                     │             │
│                                                     v             │
│                                          ┌────────────────────┐  │
│                                          │ <dialog showModal()>│ │
│                                          │ + Escape closes    │  │
│                                          │ + focus restores   │  │
│                                          │   to End session   │  │
│                                          └────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

**Key flow invariant:** the rAF loop in `useSessionEngine` is the SOLE timing source. The modal does NOT pause it. Reduced-motion does NOT branch the timing logic — it only swaps how the same `SessionFrame` is presented (CSS branch only).

### Recommended Project Structure (Files to Add / Modify)

```
src/
├── components/
│   ├── BreathingShape.tsx           # MODIFY: refined orb + 2 static rings + in-orb label + In/Out gradient
│   ├── SessionReadout.tsx           # MODIFY: drop redundant phase label IF orb hosts it; keep clock
│   ├── SettingsForm.tsx             # MODIFY: hide BPM/ratio steppers when isRunning=true (D-16)
│   ├── SettingsStepper.tsx          # MODIFY: 44x44 hit area (D-17), focus-visible ring (D-21)
│   ├── SessionControls.tsx          # MODIFY: focus-visible ring (D-21), 44px min height
│   ├── EndSessionDialog.tsx         # NEW: native <dialog>, title "End this session?", buttons End/Keep going (D-10/D-11/D-12)
│   └── (existing untouched: SessionReadout extends only as needed)
├── hooks/
│   ├── useSessionEngine.ts          # NO CHANGE
│   └── usePrefersReducedMotion.ts   # NEW: matchMedia subscription, returns boolean
├── app/
│   ├── App.tsx                      # MODIFY: replace window.confirm with EndSessionDialog state machine
│   ├── App.settings.test.tsx        # MODIFY: stop using window.confirm spy; assert dialog instead
│   ├── App.session.test.tsx         # MODIFY: same; add hide-BPM/ratio assertions; add reduced-motion assertions
│   └── App.dialog.test.tsx          # NEW (optional split): focused tests for end-session dialog a11y behavior
├── styles/
│   └── theme.css                    # MODIFY: extend @theme tokens, add focus-visible ring vars, gradient stacks
└── (vitest.setup.ts)                # MODIFY: polyfill HTMLDialogElement methods + matchMedia
```

### Pattern 1: Native `<dialog>` Modal With Focus Restoration (D-10/D-11/D-12)

**What:** The browser-provided modal element. `showModal()` renders it in the top layer, applies `inert` to the page, traps focus inside the dialog, listens for Escape (fires `cancel` event then `close`), and on close moves focus back to the previously focused element.

**When to use:** Any modal that satisfies the locked decisions. Phase 2's only modal is `EndSessionDialog`.

**Example:**

```tsx
// Source: pattern derived from W3C APG dialog-modal example +
// https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/dialog/
// + https://dev.to/link2twenty/react-using-native-dialogs-to-make-a-modal-popup-4b25

import { useEffect, useRef } from 'react'

export interface EndSessionDialogProps {
  open: boolean
  onConfirm(): void
  onCancel(): void
}

export function EndSessionDialog({ open, onConfirm, onCancel }: EndSessionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  // Open / close imperatively so the browser sets up <dialog>'s top-layer + inert behavior.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
      // D-12: default focus on Keep going (cancel), not on the destructive primary.
      cancelButtonRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  // Esc fires `cancel` (preventable) then `close`. We treat both as a Keep-going outcome.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleCancel = (event: Event) => {
      event.preventDefault()  // prevent Esc-double-fire; we close via close() in onCancel
      onCancel()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onCancel])

  // Click on backdrop (the dialog itself, outside its inner panel) -> cancel.
  const handleBackdropClick: React.MouseEventHandler<HTMLDialogElement> = (event) => {
    if (event.target === dialogRef.current) onCancel()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="end-session-title"
      onClick={handleBackdropClick}
      className="rounded-3xl p-0 backdrop:bg-slate-900/30"
    >
      <div className="grid gap-5 p-6 sm:p-7">
        <h2 id="end-session-title" className="text-2xl font-semibold">
          End this session?
        </h2>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="min-h-12 rounded-full px-5 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
          >
            Keep going
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-12 rounded-full bg-teal-700 px-5 py-2 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
          >
            End
          </button>
        </div>
      </div>
    </dialog>
  )
}
```

**Critical browser semantics to keep:**
- `<dialog>` with `showModal()` automatically applies `aria-modal="true"` semantics — do NOT add `role="dialog"` manually [CITED: w3.org/WAI/ARIA/apg/patterns/dialog-modal — "Please DO NOT make the element with role dialog focusable"; the native element already exposes the role].
- `aria-labelledby` MUST point to the title; it is the only way the dialog gets an accessible name.
- Focus restoration to the `End session` trigger button is automatic when calling `dialog.close()` in supported browsers; React's re-render will reattach the same DOM node.
- The pseudo-element `::backdrop` styles the dim layer behind the dialog (Tailwind: `backdrop:bg-slate-900/30`).

### Pattern 2: `usePrefersReducedMotion` Hook (D-05)

**What:** A small hook that exposes the OS reduced-motion preference reactively. No third-party dependency.

**Example:**

```ts
// Source: derived from https://www.joshwcomeau.com/snippets/react-hooks/use-prefers-reduced-motion/
// (verified pattern, modernized for React 19 — no SSR concern in this Vite app, so the
//  isRenderingOnServer guard collapses).

import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    // Defensive in tests where matchMedia may not be polyfilled yet.
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(QUERY).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return reduced
}
```

**Why not `useSyncExternalStore`?** It is the academically correct choice for tearing-free external store reads in concurrent React, but for a `prefers-reduced-motion` value that changes rarely and never during a single render, the simpler `useState`+`useEffect` is fine and matches the pattern most React projects use [CITED: joshwcomeau.com/snippets/react-hooks/use-prefers-reduced-motion]. If we were tearing-sensitive (e.g., reading the value in a derived render path twice), `useSyncExternalStore` would be the upgrade.

### Pattern 3: Refined Orb (D-01..D-04, D-06..D-07, D-18)

**What:** Single absolutely-positioned `<div>` orb with stacked gradient layers (one for In, one for Out), wrapped in two static reference-ring elements at `transform: scale(1)` (outer = max-inhale) and `transform: scale(0.58)` (inner = min-exhale). The same scale formula already in `BreathingShape.tsx:15` (`0.58 + progress * 0.42` for In, `1 - progress * 0.42` for Out) defines those bounds — they are already the visual extremes of the breath.

**Why two stacked gradients with `opacity` crossfade rather than animating `background-image`?**
> "You can't currently transition a gradient in CSS because gradient syntaxes are all values of the background-image property, and CSS doesn't allow transitions or animations on background-image." [CITED: melanie-richards.com/blog/animating-gradients]

So we layer two `<div>` (or two pseudo-elements) — one with the In gradient, one with the Out gradient — and animate the Out layer's `opacity` between 0 and 1 driven by `frame.phase`. CSS handles the 300-500ms transition; in reduced-motion mode the duration is preserved (the crossfade is the substitute for the scale animation per D-07) but the scale transform is suppressed.

**Example structure:**

```tsx
// src/components/BreathingShape.tsx (refined sketch)
import type { CSSProperties } from 'react'
import type { SessionFrame } from '../domain/sessionMath'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

const MIN_SCALE = 0.58
const MAX_SCALE = 1.0

export function BreathingShape({ frame }: { frame: SessionFrame | null }) {
  const reducedMotion = usePrefersReducedMotion()
  if (frame === null) return null

  const progress = Math.min(1, Math.max(0, frame.phaseProgress))
  // D-06: in reduced-motion, hold the orb at a fixed mid-size; otherwise scale with progress.
  const liveScale = frame.phase === 'in'
    ? MIN_SCALE + progress * (MAX_SCALE - MIN_SCALE)
    : MAX_SCALE - progress * (MAX_SCALE - MIN_SCALE)
  const orbScale = reducedMotion ? (MIN_SCALE + MAX_SCALE) / 2 : liveScale

  return (
    <div
      role="img"
      aria-label={`Breathing shape: ${frame.phaseLabel}`}
      data-phase={frame.phase}
      data-progress={progress.toFixed(3)}
      className="breathing-orb-frame relative mx-auto grid place-items-center"
      style={{
        width: 'var(--orb-size)',
        height: 'var(--orb-size)',
        '--orb-size': 'clamp(180px, 35vw, 360px)',  // D-18
      } as CSSProperties}
    >
      {/* Outer reference ring at MAX_SCALE (= 1) */}
      <span aria-hidden="true" className="orb-ring orb-ring--outer absolute inset-0 rounded-full border" />
      {/* Inner reference ring at MIN_SCALE */}
      <span
        aria-hidden="true"
        className="orb-ring orb-ring--inner absolute rounded-full border"
        style={{ width: `${MIN_SCALE * 100}%`, height: `${MIN_SCALE * 100}%` }}
      />
      {/* The orb itself: stacked gradient layers + scale transform */}
      <div
        className="orb absolute rounded-full transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{ width: '100%', height: '100%', transform: `scale(${orbScale})` }}
      >
        <span aria-hidden="true" className="orb-layer orb-layer--in absolute inset-0 rounded-full" />
        <span aria-hidden="true" className="orb-layer orb-layer--out absolute inset-0 rounded-full" />
      </div>
      {/* D-03: phase label centered inside, large */}
      <span className="relative z-10 text-5xl font-semibold sm:text-6xl">{frame.phaseLabel}</span>
    </div>
  )
}
```

```css
/* src/styles/theme.css additions */
.orb-layer--in  { background: radial-gradient(circle at 35% 30%, #ccfbf1, #99f6e4 60%, #5eead4); opacity: 1; transition: opacity 400ms ease-out; }
.orb-layer--out { background: radial-gradient(circle at 35% 30%, #dbeafe, #bfdbfe 60%, #93c5fd); opacity: 0; transition: opacity 400ms ease-out; }

[data-phase='out'] .orb-layer--in  { opacity: 0; }
[data-phase='out'] .orb-layer--out { opacity: 1; }

.orb-ring--outer { border-color: rgb(15 118 110 / 0.35); border-width: 1.5px; }
.orb-ring--inner { border-color: rgb(15 118 110 / 0.18); border-width: 1px; }

@media (prefers-reduced-motion: reduce) {
  .orb { transition: none; }
  /* Crossfade timing in the 300-500ms band per D-07 still applies to gradient layers. */
}
```

**Performance:** `transform: scale()` and `opacity` are the two GPU-composited properties [CITED: developer.chrome.com/blog/hardware-accelerated-animations]. No layout / paint thrash. No `will-change` needed for animations this small; adding it speculatively only inflates memory.

### Pattern 4: `focus-visible` Ring On Theme Token (D-21)

**What:** Tailwind v4 auto-generates `ring-breathing-accent` from `--color-breathing-accent` because any `--color-*` namespace variable in `@theme` becomes a color utility [CITED: tailwindcss.com/docs/theme]. Combine with `focus-visible:` (keyboard-only) and a `ring-offset` for separation against the soft background.

**Example:**

```tsx
// On every interactive button or stepper:
<button
  type="button"
  className="
    rounded-full bg-white
    focus-visible:outline-none
    focus-visible:ring-2
    focus-visible:ring-breathing-accent
    focus-visible:ring-offset-2
    focus-visible:ring-offset-breathing-bg-soft
  "
>...</button>
```

If a Tailwind v4 utility-name resolution issue surfaces (the registry has open issues around `ring-offset` arbitrary CSS-var values [CITED: github.com/tailwindlabs/tailwindcss/issues/19452]), the explicit-arbitrary fallback works:
```html
class="focus-visible:ring-[var(--color-breathing-accent)]"
```

[ASSUMED] The auto-generated `ring-breathing-accent` works against `--color-breathing-accent` exactly as for `bg-breathing-accent`. Verified pattern for `bg-*` and `text-*`; for `ring-*` the Tailwind docs assert the same generation, but the planner should verify with a single representative test in the build during Wave 1.

### Pattern 5: 44x44 Hit Area Without Visual Bloat (D-17)

**What:** The visible button can stay at e.g. 12 (48px) or smaller; what matters is the `min-h` and `min-w` pixel-accurate floor. Tailwind's `min-h-11 min-w-11` (44px each) is the standard recipe. The current `SettingsStepper` (`SettingsStepper.tsx:45-50`) uses `size-12` (48px) on the +/- buttons, which already meets 44x44. Verify both stepper buttons and the `End session` button visibly satisfy the floor. [CITED: w3.org/WAI/WCAG21/Understanding/target-size — 2.5.5 sets 44x44 as the AAA enhanced minimum].

**Example:**
```tsx
className="min-h-11 min-w-11 grid size-12 place-items-center ..."
```

### Pattern 6: Hide BPM/Ratio While Running (D-16)

**What:** Conditional render rather than CSS hiding, so the elements are not in the accessibility tree and tab order while running. The existing `SettingsForm` already receives `isRunning`, so the change is local.

```tsx
// SettingsForm.tsx (sketch)
return (
  <div className="grid w-full gap-4" aria-label="Session settings">
    {!isRunning && <>
      <SettingsStepper label="BPM" ... disabled={isRunning} />
      <SettingsStepper label="Ratio" ... disabled={isRunning} />
    </>}
    <SettingsStepper label="Duration" ... />
  </div>
)
```

[CITED: w3.org/WAI/ARIA/apg/patterns/dialog-modal — controls outside dialog should be inert; here, we apply the same hygiene to the main flow: hidden controls should be removed, not just visually masked, to keep the mobile screen + tab order minimal during practice.]

### Anti-Patterns to Avoid

- **Manual focus-trap libraries on top of `<dialog>`:** redundant, and the W3C accessibility group has explicitly walked back that guidance for native dialogs [CITED: css-tricks.com/there-is-no-need-to-trap-focus-on-a-dialog-element]. Don't add `focus-trap-react`.
- **Animating `background-image` to crossfade gradients:** browsers do not transition `background-image` [CITED: melanie-richards.com/blog/animating-gradients]. Always crossfade two stacked layers via `opacity`.
- **Using `display: none` to hide BPM/ratio while running:** keeps elements out of paint but they remain in some assistive-tech states inconsistently. Conditional render is cleaner and matches the rest of this codebase's testing-by-presence patterns (`queryByRole(...).not.toBeInTheDocument()`).
- **`window.matchMedia(...).matches` directly inside render without a subscription:** value will be stale across OS preference changes. Always subscribe via `addEventListener('change', ...)`.
- **Adding `role="dialog"` to a native `<dialog>` element:** the element already has the role. Adding it redundantly is harmless but adding `tabindex="0"` to it is actively harmful — APG: "DO NOT make the element with role dialog focusable" [CITED: w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/dialog/].
- **Pausing the rAF loop in `useSessionEngine` while the modal is open:** violates D-13 and SESS-05. The modal is presentational; the timer continues unchanged.
- **A separate timer for the gradient crossfade or for reduced-motion display:** all visible state derives from `SessionFrame`; any change to the orb visuals must come from `frame.phase`/`frame.phaseProgress`, not from `setInterval` or independent state.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal focus trap | Custom Tab/Shift-Tab cycling logic | Native `<dialog>.showModal()` | The browser handles trap + restore + Escape correctly via `inert` and the top layer [CITED: css-tricks.com/there-is-no-need-to-trap-focus-on-a-dialog-element]. |
| Modal escape-to-close | Custom `keydown` listener | Native `cancel` event | Fires on Escape automatically. Listen to it; call `event.preventDefault()` if you want to control sync. |
| Modal focus restoration | Stash `document.activeElement`, restore on close | Native `<dialog>.close()` | Modern browsers move focus back to the previously focused element automatically. |
| Reduced-motion detection | Custom `requestIdleCallback` polling, performance heuristics | `window.matchMedia('(prefers-reduced-motion: reduce)')` | D-05 explicitly forbids runtime perf fallback. The OS query is the only authoritative source. |
| Gradient crossfade timing | `requestAnimationFrame` lerp on color stops | Two layers + `opacity` + CSS `transition` | The compositor handles it for free [CITED: developer.chrome.com/blog/hardware-accelerated-animations]. |
| Color-utility generation | Hand-writing CSS for each token color | Tailwind v4 `@theme` namespace | `--color-*` namespace auto-generates `bg-*`, `text-*`, `ring-*`, etc. [CITED: tailwindcss.com/docs/theme]. |

**Key insight:** Phase 2 is mostly removing manual work and leaning on the platform. Native `<dialog>`, native `prefers-reduced-motion`, native `:focus-visible`, native `transform`/`opacity` compositing, and Tailwind v4's auto-generated color utilities together cover ~95% of the implementation. The bespoke pieces are the orb visuals (small) and one ~15-line hook.

## Common Pitfalls

### Pitfall 1: jsdom Has No `HTMLDialogElement.showModal`
**What goes wrong:** Tests calling `dialog.showModal()` throw `TypeError: dialog.showModal is not a function`.
**Why it happens:** [VERIFIED] jsdom 29.1.1's `HTMLDialogElement.prototype` has `show`, `showModal`, and `close` all `undefined`. This is a long-standing gap (issue #3294 is still open) [CITED: github.com/jsdom/jsdom/issues/3294].
**How to avoid:** Polyfill in `vitest.setup.ts`:
```ts
// src/vitest.setup.ts (extend existing)
import '@testing-library/jest-dom/vitest'

if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.show) {
    HTMLDialogElement.prototype.show = function () { this.open = true }
  }
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () { this.open = true }
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function (returnValue?: string) {
      this.open = false
      if (returnValue !== undefined) this.returnValue = returnValue
      this.dispatchEvent(new Event('close'))
    }
  }
}
```
[CITED: github.com/jestjs/jest/issues/13010 — same recipe, Vitest equivalents]
**Warning signs:** Test failing with `is not a function` when interacting with the dialog. Tests asserting `expect(dialog).toBeVisible()` may also need to use `.open === true` since jsdom doesn't render the top layer.

### Pitfall 2: `window.matchMedia` Is Undefined In jsdom
**What goes wrong:** `window.matchMedia(...)` throws `TypeError: window.matchMedia is not a function` when the reduced-motion hook runs in tests.
**Why it happens:** [VERIFIED via documented jsdom limitation] jsdom does not implement `matchMedia` because there is no real layout engine to evaluate media queries. [CITED: github.com/Ayc0/mock-match-media; mantine.dev/guides/vitest]
**How to avoid:** Polyfill in `vitest.setup.ts`:
```ts
// Add to src/vitest.setup.ts
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,        // default = motion ALLOWED
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
```
For tests that explicitly assert reduced-motion behavior, override per-test with `vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true, ... } as any)`.
**Warning signs:** Reduced-motion test claims "no scale animation" but the hook silently throws and mounts return `null`.

### Pitfall 3: Modal State Leaks Across Tests
**What goes wrong:** Test 1 opens the modal; Test 2 starts and `dialog.open` is still true from polyfilled state.
**Why it happens:** The polyfilled `open` attribute persists on prototype-extended DOM but jsdom resets DOM between tests. The risk is asserting state of a *closed* dialog incorrectly when the test rendered a fresh App.
**How to avoid:** Always assert dialog state via `screen.queryByRole('dialog', { hidden: false })` or by checking `aria-modal` rather than relying on the `open` attribute. Use `findBy*` for async state changes after `userEvent.click`.

### Pitfall 4: Tailwind v4 Auto-Generated Utilities Use Token Suffix Names, Not "color-" Prefix
**What goes wrong:** Writing `ring-color-breathing-accent` (a v3 instinct) silently produces no styles because it doesn't match a generated utility.
**Why it happens:** Tailwind v4 strips the `--color-` namespace prefix when generating utility names. A `--color-breathing-accent` token produces `ring-breathing-accent`, NOT `ring-color-breathing-accent` [CITED: tailwindcss.com/docs/theme — "theme variables defined in the --color-* namespace determine all of the [color] utilities"].
**How to avoid:** Use `bg-breathing-accent`, `text-breathing-accent`, `border-breathing-accent`, `ring-breathing-accent`. If a utility silently fails, fall back to `ring-[var(--color-breathing-accent)]`.

### Pitfall 5: `<dialog>` `cancel` Event Fires Twice On Esc If Not Handled Carefully
**What goes wrong:** Pressing Esc fires `cancel`, then automatically calls `dialog.close()`, which fires `close`. If both invoke `onCancel`, the parent state may try to set `dialogOpen=false` twice.
**Why it happens:** Native semantics. `cancel` is preventable; if not prevented, `close` follows.
**How to avoid:** Either (a) attach the cancel handler with `event.preventDefault()` and call your own close logic, OR (b) only listen to `close` and let Esc do the default. Both are correct; pick one. The Code Examples above use (a).

### Pitfall 6: Conditional Render Dependent On `isRunning` Causes Layout Jump
**What goes wrong:** When the user starts a timed session, BPM and Ratio steppers vanish (D-16). The orb plus the End session button shift up suddenly — visually jarring.
**Why it happens:** The mounted height changes by ~200px instantly.
**How to avoid:** Either (a) accept the jump (the user clicked Start; brief reorganization is fine) or (b) use a `motion-safe:transition-all` on the container to smooth the height change over ~200ms. Prefer (a) for simplicity; the user's eyes are about to be on the orb anyway.

### Pitfall 7: Crossfade Direction Flips At Phase Boundary But Looks Janky Mid-Cycle
**What goes wrong:** Animating opacity in 400ms when the In phase is only 1.8 seconds (at high BPM, low ratio) means the crossfade overlaps multiple phase transitions.
**Why it happens:** Phase duration at e.g. 7 BPM, 30:70 ratio = ~2.6s out of an 8.6s cycle. A 400ms crossfade is 15% of that phase.
**How to avoid:** Pin the crossfade to the lower end of the 300-500ms band (e.g., 350ms) and ensure the transition triggers ON `[data-phase]` change only — not continuously per `phaseProgress`. The CSS in Pattern 3 already does this (the selector switches based on `[data-phase='out']` only when the attribute itself changes).

## Code Examples

### Polyfill `HTMLDialogElement` In Vitest Setup
```ts
// src/vitest.setup.ts
// Source: https://github.com/jestjs/jest/issues/13010 (Jest variant; Vitest mirrors it)

import '@testing-library/jest-dom/vitest'

if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () { this.open = true }
  }
  if (!HTMLDialogElement.prototype.show) {
    HTMLDialogElement.prototype.show = function () { this.open = true }
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function (returnValue?: string) {
      this.open = false
      if (returnValue !== undefined) this.returnValue = returnValue
      this.dispatchEvent(new Event('close'))
    }
  }
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
```

### Test The End-Session Modal (Behavior + A11y)
```tsx
// src/app/App.dialog.test.tsx (or extend App.session.test.tsx)
// Source: pattern matches existing src/app/App.session.test.tsx style

import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('end-session confirmation modal', () => {
  it('opens with focus on Keep going when ending a timed session', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start session' }))
    await user.click(screen.getByRole('button', { name: 'End session' }))

    const dialog = await screen.findByRole('dialog', { name: 'End this session?' })
    expect(dialog).toBeVisible()
    expect(within(dialog).getByRole('button', { name: 'Keep going' })).toHaveFocus()
  })

  it('keeps the session running when Keep going is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start session' }))
    await user.click(screen.getByRole('button', { name: 'End session' }))
    await user.click(screen.getByRole('button', { name: 'Keep going' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'End session' })).toBeVisible()
    expect(screen.getByRole('region', { name: 'Session readout' })).toBeVisible()
  })

  it('ends the session when End is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start session' }))
    await user.click(screen.getByRole('button', { name: 'End session' }))
    await user.click(screen.getByRole('button', { name: 'End' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()
  })

  it('closes via Escape key (treats as Keep going)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start session' }))
    await user.click(screen.getByRole('button', { name: 'End session' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'End session' })).toBeVisible()
  })

  it('open-ended sessions end without showing the dialog', async () => {
    const user = userEvent.setup()
    render(<App />)
    const duration = screen.getByRole('group', { name: 'Duration' })
    const increase = within(duration).getByRole('button', { name: /increase duration/i })
    for (let i = 0; i < 11; i += 1) await user.click(increase)
    await user.click(screen.getByRole('button', { name: 'Start session' }))
    await user.click(screen.getByRole('button', { name: 'End session' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()
  })
})
```

### Test Reduced-Motion Variant
```tsx
// src/app/App.session.test.tsx (additions)
// Source: pattern matches existing tests; matchMedia override per-test.

import { vi } from 'vitest'

it('renders the orb at fixed mid-size when reduced-motion is preferred', async () => {
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: query.includes('reduce'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as MediaQueryList))

  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Start session' }))

  const shape = screen.getByRole('img', { name: /Breathing shape: In/ })
  // The orb's data-progress still tracks (so the readout is consistent), but the
  // applied transform should be the fixed mid-scale. Assert via data-attribute:
  expect(shape).toHaveAttribute('data-phase', 'in')
  // (Optional) assert via inline-style transform that reduced-motion clamped to mid-scale.
})
```

### Test 44x44 Hit Areas
```tsx
it('exposes 44x44 minimum hit area on stepper buttons', () => {
  render(<App />)
  const inc = screen.getByRole('button', { name: /increase bpm/i })
  // Tailwind size-12 = 48x48 = >= 44x44.
  // jsdom does not compute layout, so assert via class presence (cheap, deterministic):
  expect(inc.className).toMatch(/(?:size-12|min-h-(?:11|12)|min-w-(?:11|12))/)
})
```

[ASSUMED] jsdom does not provide computed layout (`getBoundingClientRect` returns zeros), so we cannot assert pixel sizes reliably in unit tests. Class-presence assertions are the established workaround in this codebase's testing style. A real-pixel verification belongs in an explicit browser-mode test or a manual UAT step.

### Test Hide BPM/Ratio While Running (D-16)
```tsx
it('hides BPM and Ratio steppers during a running session', async () => {
  const user = userEvent.setup()
  render(<App />)
  expect(screen.getByRole('group', { name: 'BPM' })).toBeInTheDocument()
  expect(screen.getByRole('group', { name: 'Ratio' })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Start session' }))

  expect(screen.queryByRole('group', { name: 'BPM' })).not.toBeInTheDocument()
  expect(screen.queryByRole('group', { name: 'Ratio' })).not.toBeInTheDocument()
  expect(screen.getByRole('group', { name: 'Duration' })).toBeInTheDocument()
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-rolled focus trap with `tabbable`/`focus-trap-react` | Native `<dialog>.showModal()` + `inert` | `<dialog>` reached cross-browser parity in 2022; W3C accessibility guidance updated 2023-2024 [CITED: css-tricks.com/there-is-no-need-to-trap-focus-on-a-dialog-element] | Fewer dependencies; one less JS event-loop interaction; better screen-reader behavior. |
| `addListener`/`removeListener` on MediaQueryList | `addEventListener('change', ...)` | Modern browsers (>2019) | Cleaner removal; single API surface. The Comeau snippet still includes the legacy fallback but it's optional in modern targets. |
| Animating `background-image` with custom keyframes | Two stacked layers crossfading via `opacity` | Always (browsers have never transitioned `background-image`) [CITED: melanie-richards.com/blog/animating-gradients] | The "never could, never can" pattern. |
| v3 Tailwind `@layer components` + `theme.extend.colors` | v4 `@theme { --color-*: ...; }` directly in CSS | Tailwind v4 (Jan 2025) | Already adopted in this codebase. Auto-generates utilities including `ring-*`. |
| Manual ARIA `role="dialog"` on a `<div>` | Native `<dialog>` | 2022+ | Avoid mixing — don't add `role="dialog"` to `<dialog>`. |
| `:focus` ring visible to mouse users (often distracting) | `:focus-visible` (keyboard-only by default) | Modern browsers (>=Chrome 86 / Firefox 85 / Safari 15.4) | Aligns with D-21. |

**Deprecated/outdated:**
- The instruction to manually trap focus inside a `<dialog>` is no longer the WCAG-blessed approach for native dialogs. WCAG itself never normatively required focus trapping in dialogs [CITED: css-tricks.com/there-is-no-need-to-trap-focus-on-a-dialog-element].
- `tabindex` cycling logic is unnecessary for native dialogs.
- Per-component reduced-motion CSS branches (e.g., a `motion-reduce` flag passed as a prop) are not needed when Tailwind's `motion-reduce:` variant + the global `@media (prefers-reduced-motion: reduce)` block in `theme.css` cover the same surface.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 with jsdom 29.1.1 environment |
| Config file | `vite.config.ts` (test config block) |
| Quick run command | `npm test -- --run src/app/App.session.test.tsx src/app/App.settings.test.tsx` |
| Full suite command | `npm run test:run` (alias for `vitest run`) |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GUID-01 | Orb reflects `phaseProgress` and phase from same `SessionFrame` (already in Phase 1; refined visuals don't change the binding) | unit / component | `npm test -- --run src/app/App.session.test.tsx -t "drives the breathing shape"` | YES (existing) — augment to assert refined attributes |
| GUID-01 | Two static reference rings rendered around the orb | unit / component | `npm test -- --run src/app/App.session.test.tsx -t "shows two reference rings"` | NO — Wave 0 add |
| GUID-02 | Phase label `In`/`Out` always rendered as text inside orb AND in readout | unit / component | `npm test -- --run src/app/App.session.test.tsx -t "phase label inside orb"` | NO — Wave 0 add |
| GUID-03 | When `prefers-reduced-motion: reduce`, orb does not scale (mid-size held); crossfade between In/Out gradients still occurs | unit / component (matchMedia mock) | `npm test -- --run src/app/App.session.test.tsx -t "reduced-motion"` | NO — Wave 0 add (also: matchMedia polyfill in vitest.setup.ts) |
| GUID-03 | When `prefers-reduced-motion: reduce`, no progress meter, dot indicator, or per-second countdown is rendered | unit / component | `npm test -- --run src/app/App.session.test.tsx -t "no progress meter in reduced motion"` | NO — Wave 0 add |
| GUID-04 | Modal opens with `role=dialog`, `aria-labelledby` resolves to title, default focus on Keep going | unit / component | `npm test -- --run src/app/App.dialog.test.tsx` | NO — Wave 0 add (file + dialog polyfill) |
| GUID-04 | Modal Esc closes (treats as Keep going) and restores focus to End session | unit / component | `npm test -- --run src/app/App.dialog.test.tsx -t "Escape"` | NO — Wave 0 add |
| GUID-04 | Modal End button confirms; Keep going cancels with no state change | unit / component | `npm test -- --run src/app/App.dialog.test.tsx -t "End is clicked|Keep going"` | NO — Wave 0 add |
| GUID-04 | Stepper +/- buttons have 44x44 min hit area (class-presence assertion in unit; visual UAT in browser) | unit (class) + manual UAT | `npm test -- --run src/components/SettingsStepper.test.tsx` (or in App.settings.test.tsx) | NO — Wave 0 add |
| GUID-04 | Focus-visible ring shows on keyboard focus (class presence + manual UAT) | unit (class) + manual UAT | `npm test -- --run src/app/App.settings.test.tsx -t "focus-visible"` | NO — Wave 0 add |
| GUID-04 | Phase indication is non-color-only (text label always present) | unit / component | covered by GUID-02 test | YES (extend existing) |
| MOBL-01 | BPM and Ratio steppers hidden during running session; Duration remains | unit / component | `npm test -- --run src/app/App.session.test.tsx -t "hides BPM and Ratio"` | NO — Wave 0 add |
| MOBL-01 | Layout is single-column at all viewport sizes (manual / visual; class-presence in unit) | unit (class) + manual UAT | `npm test -- --run src/app/App.session.test.tsx -t "single-column"` | NO — Wave 0 add (lightweight) |
| MOBL-01 | Orb size uses `clamp(180px, 35vw, 360px)` (CSS-variable assertion) | unit (style) | inline check on `data-orb-size` style or computed style | NO — Wave 0 add |
| SESS-05 (regression) | Session timing clock continues during modal (D-13) | unit / component (vi.useFakeTimers) | `npm test -- --run src/app/App.dialog.test.tsx -t "timing keeps running"` | NO — Wave 0 add |

### Sampling Rate
- **Per task commit:** `npm test -- --run src/app/App.session.test.tsx src/app/App.settings.test.tsx src/app/App.dialog.test.tsx` (~3 files, fast)
- **Per wave merge:** `npm run test:run && npm run build` (full suite + tsc + vite build)
- **Phase gate:** `npm run test:run && npm run build && npm run lint` green; manual UAT for visual reduced-motion and focus-ring confirmation

### Wave 0 Gaps
- [ ] `src/vitest.setup.ts` — extend with `HTMLDialogElement` polyfill (showModal/show/close) AND `matchMedia` polyfill
- [ ] `src/hooks/usePrefersReducedMotion.ts` — new file
- [ ] `src/components/EndSessionDialog.tsx` — new file
- [ ] `src/app/App.dialog.test.tsx` — new test file (dialog a11y suite)
- [ ] `src/app/App.session.test.tsx` — extend with reduced-motion + hide-BPM/ratio + reference-rings + in-orb label tests
- [ ] `src/app/App.settings.test.tsx` — update to expect dialog instead of `window.confirm` spy in the 2 places that use it (D-10 removes `window.confirm`)

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build / test | YES (verified) | 25.9.0 (project requires modern Node for Vite 8 + Vitest 4) | — |
| npm | Package manager | YES (verified — `npm view` works) | bundled with Node 25 | — |
| Vite | Dev server / bundler | YES (`package.json:31`) | 8.0.10 | — |
| Vitest | Test runner | YES (`package.json:32`) | 4.1.5 | — |
| jsdom | Test DOM | YES (`package.json:24`) | 29.1.1 | — (gap: `HTMLDialogElement.showModal`, `matchMedia` — polyfill in setup) |
| TypeScript | Type checking | YES | ~6.0.2 | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None — but jsdom has two known runtime gaps (`HTMLDialogElement` methods and `matchMedia`) addressed by polyfill in `vitest.setup.ts`. These are test-only and do not affect production.

## Project Constraints (from CLAUDE.md)

The project root `/Users/lucindo/Code/hrv` does NOT contain a `CLAUDE.md`. The user-level `~/.claude/CLAUDE.md` references RTK (a CLI proxy for token-optimized commands); this is environmental tooling, not project policy. There are no project-level skill files in `.claude/skills/` or `.agents/skills/`.

**Project conventions extracted from existing code (instead):**
- All visible session state derives from `SessionFrame` returned by `useSessionEngine`. No parallel timers.
- Component tests target user-visible roles and copy via `screen.getByRole(...)`, `within(...)`, and `userEvent` from `@testing-library/user-event`. Phase 2 must follow this pattern.
- Tailwind v4 + `@theme` tokens in `src/styles/theme.css` are the styling baseline. Add tokens there; do not introduce a separate config file.
- TDD pattern: each task lands a RED commit (test added) followed by a GREEN commit (implementation). [VERIFIED: Phase 1 plan 04 commit log shows `238a661`/`d2c1dd6` etc.]
- Strict TypeScript (`noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`); avoid type predicates that widen literals (Phase 1 plan 04 had to fix one).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Tailwind v4 `ring-breathing-accent` is auto-generated from `--color-breathing-accent` exactly like `bg-breathing-accent` is | Pattern 4 | LOW. The Tailwind v4 docs assert auto-generation across color utilities, but the `ring` family had a recent issue (#19452) about ring-OFFSET CSS-var arbitrary syntax. Mitigation: planner/executor verifies in Wave 1 with one test class. Fallback `ring-[var(--color-breathing-accent)]` always works. |
| A2 | jsdom layout APIs (`getBoundingClientRect`) return zeros, so 44x44 hit-area assertions must use class-presence | Code Examples / Pitfall section | LOW. This is well-documented jsdom behavior. Mitigation: the assertion is on the class — if the class is wrong, build fails; if the class is right, real-pixel size is correct. UAT covers actual rendered size. |
| A3 | The native `<dialog>`'s automatic focus restoration to the trigger element works in our React 19 setup without any explicit `previouslyFocusedElement` stash | Pattern 1 | LOW. Browsers (Chrome, Firefox, Safari) all implement this in 2025. React 19's render of the same trigger node preserves identity. Mitigation: include `useEffect` cleanup that calls `(triggerRef.current as HTMLElement | null)?.focus()` if needed. The dialog tests will surface any regression. |
| A4 | A 350-400ms `opacity` crossfade between two stacked gradient layers is visually smooth at all phase rates between 1 BPM (60s phase) and 7 BPM at 20:80 (~1.7s shortest phase) | Pitfall 7 | LOW. The crossfade triggers on `[data-phase]` change (a discrete attribute swap), not continuously, so it cannot stack. The user-perceived smoothness is a UAT call. Mitigation: keep the value tunable as a CSS custom property so adjustment doesn't require code edits. |
| A5 | Switching from `window.confirm` to a native `<dialog>` removes the need for `vi.spyOn(window, 'confirm')` in Phase 1's existing tests | Wave 0 Gaps | LOW. Phase 1 tests in `App.settings.test.tsx:98,110` and `App.session.test.tsx:176,188,202` use that spy; we update them to assert the dialog DOM instead. Mitigation: do this in the same RED/GREEN pair that introduces the dialog. |

## Open Questions

1. **Should the `phaseLabel` in the readout (`SessionReadout`) be removed if it now lives inside the orb (D-03)?**
   - What we know: D-03 says the label is "centered inside the orb at large display size — not below or above the orb." `SessionReadout` currently renders the label below the orb (`SessionReadout.tsx:33`).
   - What's unclear: whether D-03 intends the readout to drop the label (single source) OR keep it for an extra fallback line.
   - Recommendation: drop the label from `SessionReadout` and keep only `Current phase` -> in-orb label, plus the clock. This matches "non-color-only cues" because the orb itself shows the text. If discoverability suffers, restore the readout label later.

2. **Does the planner want the dialog to be a full top-layer modal even on mobile, or should it be a bottom sheet on small viewports?**
   - What we know: D-10 says "modal dialog" with backdrop + Esc. CONTEXT.md does not specify a bottom-sheet pattern.
   - What's unclear: on a 360-pixel-wide viewport, a centered modal is fine but could be styled as an action-sheet for ergonomics.
   - Recommendation: ship a centered modal with a `max-w` and let it sit at the bottom of the viewport for smaller screens via Tailwind responsive utilities (`sm:items-center`). This stays inside the locked decisions.

3. **Test environment (browser mode vs jsdom): should we add Vitest browser mode for one or two visual tests?**
   - What we know: Vitest 4 supports browser-mode component tests against a real browser.
   - What's unclear: whether the planner wants to invest in that for Phase 2's reduced-motion / orb-size verification.
   - Recommendation: defer. A manual UAT step covers it cheaply and the project hasn't paid the browser-mode setup cost yet.

## Sources

### Primary (HIGH confidence)
- W3C ARIA APG Dialog (Modal) Pattern — https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ — initial focus, ARIA attributes, keyboard model
- W3C ARIA APG Dialog Modal Example — https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/dialog/ — reference implementation
- W3C WCAG 2.1 Understanding 2.5.5 Target Size — https://www.w3.org/WAI/WCAG21/Understanding/target-size.html — 44x44 AAA threshold rationale
- MDN `<dialog>` — https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog — browser semantics
- MDN `prefers-reduced-motion` — https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion — media query
- MDN `clamp()` — https://developer.mozilla.org/en-US/docs/Web/CSS/clamp — fluid sizing primitive
- Tailwind v4 Theme docs — https://tailwindcss.com/docs/theme — `@theme` namespace -> auto-generated utilities
- Tailwind v4 Hover/Focus/Other states — https://tailwindcss.com/docs/hover-focus-and-other-states — `focus-visible:` and `motion-reduce:` variants
- Tailwind v4 Ring Color — https://tailwindcss.com/docs/ring-color — `ring-(color:--var)` and `ring-[var(--var)]` patterns
- jsdom 29.1.1 verification — `npm view jsdom version` -> 29.1.1; manual `new JSDOM(...)` HTMLDialogElement test confirms `show`/`showModal`/`close` are `undefined`

### Secondary (MEDIUM confidence)
- CSS-Tricks: There is No Need to Trap Focus on a Dialog Element — https://css-tricks.com/there-is-no-need-to-trap-focus-on-a-dialog-element/ — modern accessibility consensus
- Josh W. Comeau: prefers-reduced-motion React hook — https://www.joshwcomeau.com/snippets/react-hooks/use-prefers-reduced-motion/ — verified hook implementation
- Melanie Richards: Fun with Animated Gradients — https://melanie-richards.com/blog/animating-gradients/ — `background-image` is non-transitionable; layered-opacity is the standard workaround
- Chrome for Developers: Hardware-accelerated animations — https://developer.chrome.com/blog/hardware-accelerated-animations — GPU compositing for `transform` + `opacity`; SVG GPU acceleration since Chromium 89
- Jest Issue 13010 — https://github.com/jestjs/jest/issues/13010 — `HTMLDialogElement.prototype` polyfill recipe
- jsdom Issue 3294 — https://github.com/jsdom/jsdom/issues/3294 — open issue tracking missing `HTMLDialogElement` implementation
- Mantine Vitest guide — https://mantine.dev/guides/vitest/ — `matchMedia` mock pattern
- Tailwind Issue 19452 — https://github.com/tailwindlabs/tailwindcss/issues/19452 — known caveat around `ring-offset` CSS-var syntax (closed; fallback to arbitrary `[var(--x)]` is always available)
- testing-library/react Issue 1106 — https://github.com/testing-library/react-testing-library/issues/1106 — confirmation that this is a jsdom limit, not RTL

### Tertiary (LOW confidence)
- DEV.to: HTML Dialog with React — https://dev.to/link2twenty/react-using-native-dialogs-to-make-a-modal-popup-4b25 — implementation pattern (verified against W3C APG)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package version verified via `npm view` against the repo's `package.json`.
- Architecture (orb / modal / hooks): HIGH — every pattern cross-referenced with at least one primary source (MDN / W3C / Tailwind official) and a working code example.
- Pitfalls: HIGH — jsdom gap verified by direct execution; matchMedia gap is well-documented; `background-image` non-transitionability is canonical CSS knowledge; `<dialog>` focus semantics confirmed by W3C and CSS-Tricks (the latter explicitly documents the change in guidance).
- Tailwind v4 ring-breathing-accent auto-generation: MEDIUM — Tailwind docs assert the namespace generates the family of utilities, but the planner should verify in Wave 1 (low-cost check). Fallback to explicit `ring-[var(--color-breathing-accent)]` is always available, so risk is bounded.

**Research date:** 2026-05-09
**Valid until:** 2026-06-08 (30 days — the relevant ecosystem pieces — Tailwind v4, React 19, native `<dialog>`, `prefers-reduced-motion` — are all stable. The single moving part is jsdom's HTMLDialogElement support; if a future jsdom adds it natively, the polyfill simply becomes a no-op.)
