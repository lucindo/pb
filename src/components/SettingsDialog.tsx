import { useEffect, useRef, type MouseEventHandler } from 'react'

import { CuePicker } from './CuePicker'
import { LanguagePicker } from './LanguagePicker'
import { ThemePicker } from './ThemePicker'
import { TimbrePicker } from './TimbrePicker'
import { VariantPicker } from './VariantPicker'
import type { UiStrings } from '../content/strings'

// src/components/SettingsDialog.tsx
//
// Phase 15 INFRA-04: SettingsDialog — native <dialog> shell for four customization pickers.
//
// D-05: single onClose prop (no onConfirm/onCancel split — not a destructive action).
// D-10: inner layout single column, Theme → Variant → Timbre → Language order.
// D-11: Close affordance = explicit Close button + native Esc + backdrop-click cancel.
// D-12: auto-close on inSessionView is handled in App.tsx (WR-09 useEffect); this component
//        receives the resulting open=false prop and closes imperatively via dialogRef.
// D-13: NO explicit focus call on open — SettingsDialog has no destructive default;
//        native focus-return contract; differs from ResetStatsDialog which focuses Keep.
// D-15: zero new npm dependencies — pure React + native <dialog>.
// D-18: locked strings — title "Settings", Close button "Close".
//
// Three structural deltas from ResetStatsDialog:
//   (a) single onClose prop (not onConfirm/onCancel)
//   (b) inSessionView prop threaded as disabled={inSessionView} to all four pickers
//   (c) NO explicit focus on open (D-13 — no destructive default; native focus-return only)

export interface SettingsDialogProps {
  open: boolean
  onClose(this: void): void
  inSessionView: boolean
  strings: Pick<UiStrings, 'settings' | 'themes' | 'variants' | 'cue' | 'timbres'>
}

export function SettingsDialog({ open, onClose, inSessionView, strings }: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Imperative open/close so the browser sets up <dialog>'s top-layer + inert behavior.
  // D-13: no explicit focus call — SettingsDialog has no destructive default; native focus-return only.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // D-13: no explicit focus on open — native focus-return contract; no destructive default
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  // Esc fires `cancel` (preventable) then `close`. We handle `cancel` and call onClose.
  // Pitfall 5 mitigation: preventDefault to avoid double-fire of close sequence (Landmine 1).
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleCancel = (event: Event) => {
      event.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => {
      dialog.removeEventListener('cancel', handleCancel)
    }
  }, [onClose])

  // Click on the dialog itself (backdrop area) -> close.
  // Click on a child (inner panel) -> ignored (Landmine 2).
  const handleBackdropClick: MouseEventHandler<HTMLDialogElement> = (event) => {
    if (event.target === dialogRef.current) {
      onClose()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="settings-dialog-title"
      onClick={handleBackdropClick}
      className="modal-fade m-auto max-w-md rounded-3xl border border-[var(--color-breathing-muted)] bg-[var(--color-breathing-surface)] p-0 shadow-[var(--shadow-breathing-card)] backdrop:bg-[var(--color-modal-backdrop)]"
    >
      <div className="grid gap-5 p-6 sm:p-7">
        <h2 id="settings-dialog-title" className="text-2xl font-semibold tracking-tight text-[var(--color-breathing-accent-strong)]">{strings.settings.title}</h2>
        {/* D-10 (updated Phase 25 Plan 04): Theme → Variant → Cue → Timbre → Language order (Landmine 7: each receives disabled={inSessionView}) */}
        <ThemePicker disabled={inSessionView} strings={strings.themes} sectionLabel={strings.settings.themeLabel} />
        <VariantPicker disabled={inSessionView} strings={strings.variants} sectionLabel={strings.settings.variantLabel} />
        <CuePicker disabled={inSessionView} strings={strings.cue} sectionLabel={strings.settings.cueLabel} />
        <TimbrePicker disabled={inSessionView} strings={strings.timbres} sectionLabel={strings.settings.timbreLabel} />
        <LanguagePicker disabled={inSessionView} sectionLabel={strings.settings.languageLabel} />
        {/* D-11 + D-18: explicit Close button — primary mobile dismiss path */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-full border border-[var(--color-breathing-accent)] bg-[var(--color-breathing-surface)] px-5 py-2 text-base font-semibold text-[var(--color-breathing-accent-strong)] shadow-sm transition hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
          >{strings.settings.close}</button>
        </div>
      </div>
    </dialog>
  )
}
