# Phase 6: Learning & Claim-Safe Positioning — Pattern Map

**Mapped:** 2026-05-10
**Files analyzed:** 5 new/modified (LearnDialog.tsx, LearnDialog.test.tsx, learnContent.ts, App.tsx-mod, optional LearnAnchor.tsx)
**Analogs found:** 5 / 5 (full coverage for dialog, test, footer-anchor, App composition, content-asset)

> No RESEARCH.md was produced for this run. Pattern excerpts below are sourced directly from the existing codebase. The two patterns with no in-repo precedent (external-link security default `target="_blank" rel="noopener noreferrer"`, and `aria-disabled="true"` no-op click) are called out explicitly under §Shared Patterns with the canonical formulation the planner should use, anchored to CONTEXT.md decisions (D-07, D-03).

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/LearnDialog.tsx` | component (dialog) | request-response (open/close events) | `src/components/ResetStatsDialog.tsx` | exact (3rd instance of pattern) |
| `src/components/LearnDialog.test.tsx` | test | request-response | `src/components/ResetStatsDialog.test.tsx` | exact |
| `src/content/learnContent.ts` | content asset (typed record) | static import | `src/domain/settings.ts` (typed `as const` records) | role-match (typed config module; settings is the closest existing typed-record export) |
| `src/app/App.tsx` (modified) | composition site | event-driven (state hooks) | `src/app/App.tsx` itself (existing dialog wiring) | exact (mirror the `resetDialogOpen` triad) |
| `src/components/LearnAnchor.tsx` (or inline) | component (button) | event-driven | `src/components/StatsFooter.tsx` (inline Reset button) | role-match (text-label button with 44×44 padding floor) |

---

## Pattern Assignments

### `src/components/LearnDialog.tsx` (component, request-response)

**Analog:** `src/components/ResetStatsDialog.tsx` (Phase 4 D-12). Same dialog pattern as `EndSessionDialog.tsx` (Phase 2 D-10..D-12). LearnDialog is the third instance — clone-and-rename is the recommended path (N=3 still does not justify a generic `ConfirmDialog` extraction; see CONTEXT.md Claude's Discretion bullet 9).

**Props pattern** — adapt from `ResetStatsDialog.tsx` lines 1-7. The Learn dialog has no destructive action, so the prop shape collapses from `{onConfirm, onCancel}` to a single `{onClose}` (UI-SPEC §LearnDialog Props row):

```typescript
import { useEffect, useRef, type MouseEventHandler } from 'react'

export interface LearnDialogProps {
  open: boolean
  onClose(): void
}
```

**Imperative open/close + default-focus pattern** (`ResetStatsDialog.tsx` lines 13-24):

```typescript
const dialogRef = useRef<HTMLDialogElement>(null)
const closeButtonRef = useRef<HTMLButtonElement>(null)

// Imperative open/close so the browser sets up <dialog>'s top-layer + inert behavior.
// D-05: default focus on Close button — never on a Forrest link.
useEffect(() => {
  const dialog = dialogRef.current
  if (!dialog) return
  if (open && !dialog.open) {
    dialog.showModal()
    closeButtonRef.current?.focus()
  } else if (!open && dialog.open) {
    dialog.close()
  }
}, [open])
```

Adaptation notes:
- Rename `cancelButtonRef` → `closeButtonRef` (UI-SPEC: only one button, labeled `Close`).
- Phase 6's locked behavior is identical: `showModal()` plus an imperative `focus()` on the non-link control. This defends against accidental Enter dispatching navigation to a Forrest link (CONTEXT.md D-05).

**Esc / cancel event handler** (`ResetStatsDialog.tsx` lines 28-39):

```typescript
// Esc fires `cancel` (preventable) then `close`. We handle `cancel` and call onCancel.
// Pitfall 5 mitigation: preventDefault to avoid double-fire of close.
useEffect(() => {
  const dialog = dialogRef.current
  if (!dialog) return
  const handleCancel = (event: Event) => {
    event.preventDefault()
    onCancel()
  }
  dialog.addEventListener('cancel', handleCancel)
  return () => {
    dialog.removeEventListener('cancel', handleCancel)
  }
}, [onCancel])
```

Adaptation: rename `onCancel` → `onClose` in both the effect dep array and the handler call. The `preventDefault()` line stays verbatim (Pitfall 5 — prevents double-fire of close).

**Backdrop-click handler** (`ResetStatsDialog.tsx` lines 41-47):

```typescript
// Click on the dialog itself (backdrop area) -> cancel.
// Click on a child (the inner panel) -> ignored.
const handleBackdropClick: MouseEventHandler<HTMLDialogElement> = (event) => {
  if (event.target === dialogRef.current) {
    onCancel()
  }
}
```

Adaptation: rename `onCancel()` → `onClose()`. The `event.target === dialogRef.current` guard is the entire pattern — do not wrap or modify it.

**Dialog markup + styling** (`ResetStatsDialog.tsx` lines 49-62) — copy classes verbatim per UI-SPEC §LearnDialog:

```typescript
<dialog
  ref={dialogRef}
  aria-labelledby="learn-dialog-title"
  onClick={handleBackdropClick}
  className="modal-fade m-auto max-w-sm rounded-3xl border border-teal-100 bg-white p-0 shadow-[var(--shadow-breathing-card)] backdrop:bg-[var(--color-modal-backdrop)]"
>
  <div className="grid gap-5 p-6 sm:p-7">
    <h2
      id="learn-dialog-title"
      className="text-2xl font-semibold tracking-tight text-slate-950"
    >
      About this practice
    </h2>
    {/* explainer sections, link block, disclaimer micro-lines, close button */}
  </div>
</dialog>
```

Adaptation:
- `aria-labelledby` id changes from `reset-stats-title` to `learn-dialog-title` (or planner-equivalent; must match the `<h2>` id).
- `max-w-sm` is kept per UI-SPEC. If the explainer + 5-link block overflows the small dialog comfortably, planner may bump to `max-w-md` — but UI-SPEC explicitly locks `max-w-sm`.
- The dialog's content slot replaces the two-button row with the 6-element internal layout (UI-SPEC §LearnDialog internal layout).

**Close button** — adapt the cancel-button from `ResetStatsDialog.tsx` lines 64-72 (the non-destructive variant, NOT the red destructive style):

```typescript
<button
  ref={closeButtonRef}
  type="button"
  onClick={onClose}
  className="min-h-12 rounded-full border border-teal-200 bg-white px-5 py-2 text-base font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50 active:bg-teal-100 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
>
  Close
</button>
```

Adaptation notes:
- Drop the destructive red button entirely (no `onConfirm` action in Phase 6).
- `min-h-12` already exceeds the 44px floor (UI-SPEC: `min-h-[44px]` — note UI-SPEC uses bracket syntax; both yield ≥44px. Planner may use either; `min-h-12` matches the existing dialog convention.)
- Container layout: drop the `flex flex-col gap-3 sm:flex-row sm:justify-end` row (there is only one button). A simple `<div className="flex justify-end">` or no wrapper is sufficient.

**Link block (D-12) — NEW pattern (no in-repo analog).** Each item is a plain text-labelled `<a>`:

```typescript
<a
  href={url}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex min-h-[44px] items-center text-sm text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
>
  {label}
</a>
```

Source for excerpt formulation:
- Color tokens + focus-visible ring classes — copied from `StatsFooter.tsx` line 54 (the inline Reset button, the closest "small text link with accent color + 44px floor + focus ring" precedent in the repo).
- `target="_blank" rel="noopener noreferrer"` — first instance in repo. Canonical formulation locked by CONTEXT.md D-07 and MDN `rel="noopener noreferrer"` (cited in CONTEXT.md §Canonical Refs).

**Disclaimer micro-lines** (UI-SPEC §Copywriting Contract — locked, inline JSX per CONTEXT.md D-10 + §Established Patterns "Inline locked copy"):

```typescript
<p className="text-sm text-[var(--color-breathing-muted)]">
  This is guided breathing practice — not medical advice.
</p>
<p className="text-xs text-[var(--color-breathing-muted)]">
  Independent project. Not affiliated with Forrest Knutson.
</p>
```

The muted color token `var(--color-breathing-muted)` is the same one `StatsFooter.tsx` line 35 uses for its container — reuse, do not introduce a new token (CONTEXT.md D-17).

---

### `src/components/LearnDialog.test.tsx` (test)

**Analog:** `src/components/ResetStatsDialog.test.tsx` (lines 1-89). Same vitest + RTL pattern; same `HTMLDialogElement` polyfill (already in `vitest.setup.ts` lines 86-104 — no new test infrastructure needed).

**Test scaffolding** (`ResetStatsDialog.test.tsx` lines 1-17):

```typescript
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { LearnDialog } from './LearnDialog'

function renderDialog(
  props: Partial<{ open: boolean; onClose: () => void }> = {},
) {
  const onClose = props.onClose ?? vi.fn()
  const utils = render(
    <LearnDialog open={props.open ?? false} onClose={onClose} />,
  )
  return { ...utils, onClose }
}
```

Adaptation: prop shape simplifies from `{ open, onConfirm, onCancel }` to `{ open, onClose }`.

**Default-focus assertion** (`ResetStatsDialog.test.tsx` lines 29-34) — CONTEXT.md D-19(c):

```typescript
it('opens with focus on Close button (D-05 default-focus-on-non-link safety)', () => {
  renderDialog({ open: true })
  const dialog = screen.getByRole('dialog', { name: 'About this practice' }) as HTMLDialogElement
  expect(dialog.open).toBe(true)
  expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
})
```

**Esc / cancel-event assertion** (`ResetStatsDialog.test.tsx` lines 57-62) — CONTEXT.md D-19(a):

```typescript
it('Esc (dialog cancel event) invokes onClose via preventDefault path', () => {
  const { onClose, container } = renderDialog({ open: true })
  const dialog = container.querySelector('dialog')!
  fireEvent(dialog, new Event('cancel', { cancelable: true }))
  expect(onClose).toHaveBeenCalledTimes(1)
})
```

**Backdrop-click assertion** (`ResetStatsDialog.test.tsx` lines 64-77) — CONTEXT.md D-19(b):

```typescript
it('clicking the backdrop (event.target === dialog itself) invokes onClose', () => {
  const { onClose, container } = renderDialog({ open: true })
  const dialog = container.querySelector('dialog')!
  fireEvent.click(dialog, { target: dialog })
  expect(onClose).toHaveBeenCalledTimes(1)
})

it('clicking inside the inner panel (not the backdrop) does NOT invoke onClose', async () => {
  const user = userEvent.setup()
  const { onClose } = renderDialog({ open: true })
  await user.click(screen.getByText('About this practice'))
  expect(onClose).not.toHaveBeenCalled()
})
```

**Phase-6-specific assertions (no direct analog — new tests per CONTEXT.md D-19(d)(e)):**

```typescript
it('external Forrest links carry target="_blank" and rel="noopener noreferrer" (D-07, D-19d)', () => {
  renderDialog({ open: true })
  const channelLink = screen.getByRole('link', { name: /YouTube channel/i })
  expect(channelLink).toHaveAttribute('target', '_blank')
  expect(channelLink).toHaveAttribute('rel', 'noopener noreferrer')
  // repeat for Website, Book, Hero video, Key videos
})

it('renders the user-locked verbatim phrase "inspired by Forrest\'s teachings" (D-11, D-19e)', () => {
  renderDialog({ open: true })
  expect(screen.getByText(/inspired by Forrest's teachings/)).toBeInTheDocument()
})
```

**Closed-state assertion** (`ResetStatsDialog.test.tsx` lines 19-26 — IN-03 anti-flake pattern):

```typescript
it('does not show the modal when open=false (anti-flake — query raw <dialog>)', () => {
  const { container } = renderDialog({ open: false })
  const dialog = container.querySelector('dialog')
  expect(dialog).not.toBeNull()
  expect((dialog as HTMLDialogElement).open).toBe(false)
})
```

---

### `src/content/learnContent.ts` (content asset, static import)

**Analog:** `src/domain/settings.ts` (closest existing typed exported record — `as const satisfies readonly …` pattern at lines 10-43). No section-keyed content asset exists yet in the repo; settings is the nearest precedent for "typed module exporting structured constants."

**Typed record / `as const satisfies` pattern** (`settings.ts` lines 10-26):

```typescript
export const BPM_OPTIONS = [
  1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7,
] as const satisfies readonly number[]

export const RATIO_OPTIONS = ['50:50', '40:60', '30:70', '20:80'] as const satisfies readonly RatioLabel[]
```

**Recommended Phase 6 shape** — i18n-ready section-keyed object literal (CONTEXT.md D-10):

```typescript
// src/content/learnContent.ts
// CONTEXT.md D-10: i18n-ready section-keyed content asset. Single source of truth
// for the Phase 6 Learn modal explainer + curated link set. English-only in v1;
// the section keys are stable identifiers for future locale swap (v2 I18N-01).
// No runtime i18n framework — typed TS record only.

export interface ExplainerSection {
  readonly title: string
  readonly body: string
}

export interface LearnLink {
  readonly label: string
  readonly url: string
}

export interface LearnContent {
  readonly explainer: {
    readonly hrv: ExplainerSection
    readonly timing: ExplainerSection
    readonly forrest: ExplainerSection  // MUST contain 'inspired by Forrest\'s teachings' (D-11)
  }
  readonly links: {
    readonly youtubeChannel: LearnLink
    readonly website: LearnLink
    readonly book: LearnLink             // URL locked: https://amzn.to/3RTAVqi (D-12)
    readonly heroVideo: LearnLink
    readonly keyVideos: readonly LearnLink[]
  }
}

export const LEARN_CONTENT: LearnContent = {
  /* ... drafted at plan-phase per D-09 ... */
} as const satisfies LearnContent
```

Pattern justifications:
- `as const satisfies` mirrors `settings.ts` lines 24, 26, 43 for compile-time literal narrowing without losing the interface contract.
- `readonly` on every member matches the immutable-export posture used across `domain/` (settings, breathingPlan).
- Section keys (`hrv`, `timing`, `forrest`) are deliberately language-neutral identifiers — they survive future locale swaps unchanged (D-10 i18n-readiness).
- Disclaimer copy (D-14 #1 + #2) is intentionally NOT in this asset — per CONTEXT.md §Established Patterns "Inline locked copy", short disclaimer strings stay inline in `LearnDialog.tsx` JSX (same as Phase 2 D-11 / Phase 4 D-12).

---

### `src/app/App.tsx` (modified) — composition site

**Analog:** existing `endDialogOpen` / `resetDialogOpen` wiring in App.tsx itself. The Phase 6 changes mirror the Phase 4 `resetDialogOpen` triad (open / confirm-equivalent / cancel-equivalent). For Phase 6 there is no destructive action, so the triad collapses to a pair (`onLearnClick` to open, `onLearnClose` to close).

**Existing dialog state pattern** (`App.tsx` lines 45-50):

```typescript
const [stats, setStats] = useState<PersistedStats>(() => loadStats())
const [resetDialogOpen, setResetDialogOpen] = useState<boolean>(false)

const session = useSessionEngine(initialSettings)
const { state } = session
const [endDialogOpen, setEndDialogOpen] = useState<boolean>(false)
```

Add `learnDialogOpen` sibling-state alongside these two:

```typescript
const [learnDialogOpen, setLearnDialogOpen] = useState<boolean>(false)
```

**Existing dialog open/close handler triad** (`App.tsx` lines 325-343) — model `onLearnClick` / `onLearnClose` after `onResetClick` / `cancelReset`:

```typescript
const onResetClick = useCallback(() => {
  setResetDialogOpen(true)
}, [])

const confirmReset = useCallback(() => {
  /* ... resetStats() + setStats(ZERO_STATS) ... */
  setResetDialogOpen(false)
}, [])

const cancelReset = useCallback(() => {
  setResetDialogOpen(false)
}, [])
```

Phase 6 collapses to two handlers (no confirm path):

```typescript
const onLearnClick = useCallback(() => {
  // D-03 belt-and-suspenders: even though the anchor is aria-disabled during
  // session view, gate state mutation defensively.
  if (inSessionView) return
  setLearnDialogOpen(true)
}, [inSessionView])

const onLearnClose = useCallback(() => {
  setLearnDialogOpen(false)
}, [])
```

**Existing `inSessionView` predicate site** (`App.tsx` lines 91-97) — the SAME boolean the anchor's disabled state reads (CONTEXT.md D-03 / §Integration Points):

```typescript
// Phase 3 D-14: appPhase + leadInDigit drive the 3-2-1 lead-in visual.
const [appPhase, setAppPhase] = useState<AppPhase>('idle')
// True for both lead-in and running: the "session view" layout (settings
// collapsed to Duration only, page description hidden, tighter top margin).
const inSessionView = appPhase !== 'idle'
```

The Learn anchor reads `inSessionView` to drive its disabled posture — no new predicate is computed.

**Modal render-site precedent** (`App.tsx` lines 536-545):

```typescript
<EndSessionDialog
  open={endDialogOpen}
  onConfirm={confirmEnd}
  onCancel={cancelEnd}
/>
<ResetStatsDialog
  open={resetDialogOpen}
  onConfirm={confirmReset}
  onCancel={cancelReset}
/>
```

Phase 6 adds a third sibling render directly below these two, inside the existing `<main>`:

```typescript
<LearnDialog
  open={learnDialogOpen}
  onClose={onLearnClose}
/>
```

**Corner-anchor render site** — Phase 6 places the anchor at the TOP of `<main>` (page-level, outside the `<section>` that wraps the breathing card). Current `App.tsx` line 467-468 opens `<main>`:

```typescript
return (
  <main className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--color-breathing-bg-soft),_var(--color-breathing-bg)_48%,_var(--color-breathing-bg-edge))] px-4 py-6 text-slate-900 sm:px-6 sm:py-8">
    <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col items-center justify-center text-center sm:min-h-[calc(100vh-4rem)]">
      {/* ... existing breathing card flow ... */}
    </section>
    {/* dialogs at end of <main> */}
  </main>
)
```

Insert the anchor between the opening `<main>` and the existing `<section>`, with `fixed`/`absolute` positioning per UI-SPEC §Layout Contract. The anchor lives OUTSIDE `<section>` so it never moves with the centered breathing-card flex column.

---

### `src/components/LearnAnchor.tsx` (or inline in App.tsx) — small button component

**Analog:** `src/components/StatsFooter.tsx` (Phase 4 D-13 — inline Reset button with 44×44 padding floor on a small text label).

**44×44 hit-area technique via padding** (`StatsFooter.tsx` lines 49-58) — CONTEXT.md D-04 explicitly cites this as the technique to inherit:

```typescript
<div role="presentation" className="mt-1 flex flex-wrap items-center justify-center gap-x-1">
  {lastLine && <span>{lastLine} ·</span>}
  <button
    type="button"
    onClick={onResetClick}
    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-2 underline underline-offset-2 text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
  >
    Reset
  </button>
</div>
```

Key adaptations for the corner anchor:
- The `min-h-[44px] min-w-[44px] items-center justify-center px-2` triad is the entire hit-area technique — copy verbatim. The visible text stays `text-sm` (UI-SPEC); the 44×44 floor is achieved via padding, NOT by enlarging the text (D-04 explicit).
- Drop `underline underline-offset-2` — the corner anchor is not an inline link inside a text run; it stands alone. UI-SPEC specifies `font-semibold` (no underline).
- Keep the `text-[var(--color-breathing-accent)]` token + the entire `focus-visible:…` ring chain verbatim — Phase 6 D-04 and Phase 2 D-21 lock the same focus-ring contract.

**Phase-6-specific disabled / aria-disabled wiring (NEW pattern — no in-repo analog).** CONTEXT.md D-03 specifies the disable-not-hide stance; the precedent it cites (Phase 4 `StatsFooter` hide-during-session-view at `App.tsx` line 532) HIDES rather than disables. Phase 6 needs a fresh pattern:

```typescript
interface LearnAnchorProps {
  disabled: boolean        // derived from App's inSessionView
  onClick(): void
}

export function LearnAnchor({ disabled, onClick }: LearnAnchorProps) {
  return (
    <button
      type="button"
      // D-03: aria-disabled (NOT the `disabled` HTML attribute) keeps the button
      // focusable for screen-reader discovery while removing its click semantics.
      aria-disabled={disabled || undefined}
      aria-label={disabled ? 'Learn (unavailable during session)' : 'Learn'}
      onClick={disabled ? undefined : onClick}
      className={`fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 ${
        disabled
          ? 'cursor-not-allowed text-[var(--color-breathing-muted)]'
          : 'text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)]'
      }`}
    >
      Learn
    </button>
  )
}
```

Rationale for each Phase-6-original line:
- `aria-disabled={disabled || undefined}` — render the attribute only when truly disabled (clean DOM in the enabled state). Source: WAI-ARIA spec and CONTEXT.md D-03 + UI-SPEC §Copywriting Contract row for the corner anchor aria-label.
- `onClick={disabled ? undefined : onClick}` — the no-op-during-session technique. The `inSessionView` check is also enforced inside `onLearnClick` in App (defensive — see App pattern above), but stripping the handler at the JSX level prevents the React synthetic event from firing in the first place.
- The fixed-positioning + safe-area-inset math is directly from UI-SPEC §Layout Contract (`top-[max(16px,env(safe-area-inset-top))] right-[max(16px,env(safe-area-inset-right))]`). No in-repo precedent uses `env(safe-area-inset-*)` yet — Phase 6 is the first instance.

---

## Shared Patterns

### External-link security default — `target="_blank" rel="noopener noreferrer"`

**Source:** CONTEXT.md D-07 + MDN `rel="noopener noreferrer"` (cited in §Canonical Refs). NO existing instance in the repo — Phase 6 is the first surface to ship external links (`grep -rn 'target="_blank"' src/` returns zero matches as of 2026-05-10).

**Apply to:** every `<a>` inside `LearnDialog.tsx` link block (5 items per UI-SPEC: YouTube channel, Website, Book, Hero video, Key videos):

```typescript
<a
  href={url}
  target="_blank"
  rel="noopener noreferrer"
  className="…"
>
  {label}
</a>
```

Both attributes are mandatory:
- `target="_blank"` — opens in new browser tab, leaving the practice tab untouched (CONTEXT.md D-07: a link click must NEVER navigate the practice tab away from a running session).
- `rel="noopener noreferrer"` — `noopener` denies the opened page access to `window.opener` (prevents tabnabbing); `noreferrer` strips the Referer header. Together they form the project's locked external-link posture for v1+ (CONTEXT.md §Established Patterns "External-link security default").

Test assertion (per CONTEXT.md D-19(d)):
```typescript
expect(link).toHaveAttribute('target', '_blank')
expect(link).toHaveAttribute('rel', 'noopener noreferrer')
```

### Focus-visible ring — accent color

**Source:** Phase 2 D-21 carry-forward. The same class chain appears at:
- `EndSessionDialog.tsx` lines 74, 81 (dialog buttons)
- `ResetStatsDialog.tsx` lines 69, 76 (dialog buttons)
- `StatsFooter.tsx` line 54 (Reset button)

**Canonical class chain:**
```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2
```

**Apply to:** the corner anchor (LearnAnchor), the dialog Close button, and every external link inside the modal link block.

### 44×44 hit-area floor via padding (not text enlargement)

**Source:** Phase 2 D-17 + Phase 4 D-13. Sole in-repo instance is `StatsFooter.tsx` line 54.

**Canonical class triad:**
```
min-h-[44px] min-w-[44px] items-center justify-center px-2
```

(Or `min-h-12` which is the dialog-button convention at `EndSessionDialog.tsx` line 74 — both yield ≥44px and both are acceptable; the bracket-syntax variant is precise to the floor.)

**Apply to:**
- Corner anchor `Learn` button (D-04)
- Close button inside the dialog
- Every link row inside the modal link block (UI-SPEC §Accessibility Contract "Link rows: `min-h-[44px]` padding")

### Modal-fade + reduced-motion gating

**Source:** existing `src/styles/theme.css` `.modal-fade` rule (used by both `EndSessionDialog.tsx` line 54 and `ResetStatsDialog.tsx` line 54). Already gated by `@media (prefers-reduced-motion: reduce) { transition: none !important }` in theme.css.

**Apply to:** the `<dialog>` element in `LearnDialog.tsx`. No new CSS needed; reduced-motion handling is inherited from the existing rule (UI-SPEC §Component Inventory "Reduced motion" row).

### Muted color token for low-emphasis text

**Source:** `var(--color-breathing-muted)` in `theme.css`. Existing instances:
- `StatsFooter.tsx` line 35 (footer container)
- `App.tsx` (implicit via existing slate-600 / token usage elsewhere)

**Apply to:**
- Disabled-state corner anchor text color
- Both disclaimer micro-lines at the bottom of the dialog (UI-SPEC §Color "Muted" row)
- Body text of the explainer sections (`text-base text-slate-700` per UI-SPEC — but the slate-700 variant is the existing alternative; both are explicitly acceptable in the UI-SPEC color map)

---

## No Analog Found

Two narrow patterns have no existing instance in the codebase. Both are explicitly locked by CONTEXT.md decisions and the canonical formulation is supplied in §Shared Patterns above:

| Concept | Reason no analog exists | Where the planner sources the pattern |
|---------|------------------------|--------------------------------------|
| `target="_blank" rel="noopener noreferrer"` | Phase 6 is the first surface to ship external links — earlier phases are entirely local/in-app | CONTEXT.md D-07 + MDN (§Canonical Refs); see §Shared Patterns above for the exact JSX |
| `aria-disabled="true"` + no-op click on a focusable button | Earlier phases either HIDE during session view (Phase 4 `StatsFooter`) or use destructive-confirm dialogs that never need a disabled posture | CONTEXT.md D-03 + UI-SPEC §Copywriting Contract corner-anchor aria-label row; see `LearnAnchor.tsx` excerpt above for the exact wiring |
| `env(safe-area-inset-*)` positioning | No existing component is fixed-positioned to the page edge — the breathing card is centered in a flex column with no iOS-notch concerns | UI-SPEC §Layout Contract; see `LearnAnchor.tsx` excerpt above |

---

## Metadata

**Analog search scope:**
- `src/components/` (8 component files + tests)
- `src/app/App.tsx` (composition site)
- `src/domain/` (typed config exports — closest precedent for content asset)
- `src/styles/theme.css` (color tokens — already enumerated by UI-SPEC §Color)
- `vitest.setup.ts` (HTMLDialogElement polyfill confirmation)

**Files scanned:** ~14 source files + 2 spec files (06-CONTEXT.md, 06-UI-SPEC.md)
**Pattern extraction date:** 2026-05-10
**Project skills consulted:** none (no `.claude/skills/` or `.agents/skills/` directory present)
**Project CLAUDE.md consulted:** none in repo root (only user-level `~/.claude/CLAUDE.md` covering RTK CLI, not applicable to pattern mapping)
