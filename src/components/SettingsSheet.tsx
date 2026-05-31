import { useId, type ReactElement, type ReactNode } from 'react'

import { useModalDialog } from './useModalDialog'

// Responsive sheet/modal primitive: bottom-anchored full-width sheet on
// mobile (< sm), auto-centered modal on desktop (≥ sm). Native <dialog>
// via useModalDialog (focus trap, Esc handling, backdrop click delegated).
// Pure presentation primitive — caller supplies open/onClose/title/
// subtitle/closeLabel/children.

export interface SettingsSheetProps {
  open: boolean
  onClose(this: void): void
  title: string
  subtitle?: string | undefined
  closeLabel: string
  children: ReactNode
}

export function SettingsSheet({
  open,
  onClose,
  title,
  subtitle,
  closeLabel,
  children,
}: SettingsSheetProps): ReactElement {
  const titleId = useId()
  const { dialogRef, onBackdropClick } = useModalDialog({ open, onClose })

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClick={onBackdropClick}
      className="modal-fade m-0 mt-auto mb-0 max-h-[85vh] w-full max-w-full overflow-y-auto rounded-t-3xl rounded-b-none border-t bg-[var(--color-breathing-surface)] p-5 pb-7 text-[var(--color-breathing-text)] shadow-[0_-10px_30px_rgba(0,0,0,0.10)] backdrop:bg-[var(--color-modal-backdrop)] sm:m-auto sm:max-h-[82vh] sm:w-[88%] sm:max-w-[460px] sm:rounded-3xl sm:rounded-b-3xl sm:border sm:p-6 sm:pb-7 sm:shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
      style={{
        borderColor: 'var(--color-border-soft)',
        overscrollBehavior: 'contain',
      }}
    >
      <div
        aria-hidden="true"
        className="mx-auto mb-4 h-1 w-11 rounded-full sm:hidden"
        style={{ background: 'var(--color-border-soft)' }}
      />
      <header className="mb-2 flex items-center justify-between gap-3">
        <h2
          id={titleId}
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--color-breathing-text)',
          }}
        >
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border px-3 py-1.5 transition-colors"
          style={{
            background: 'transparent',
            borderColor: 'var(--color-border-soft)',
            color: 'var(--color-breathing-text-soft)',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {closeLabel}
        </button>
      </header>
      {subtitle !== undefined && (
        <p
          className="mb-2 uppercase"
          style={{
            fontSize: 11,
            letterSpacing: '0.12em',
            color: 'var(--color-breathing-muted)',
          }}
        >
          {subtitle}
        </p>
      )}
      <div>{children}</div>
    </dialog>
  )
}
