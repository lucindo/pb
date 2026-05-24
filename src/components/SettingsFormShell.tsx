import type { ReactElement, ReactNode } from 'react'

interface SettingsFormShellProps {
  ariaLabel: string
  children: ReactNode
}

// Per-form wrapper. Each child row owns its own border-top divider, so the
// shell is a plain stack — no gap or padding around the rows.
export function SettingsFormShell({ ariaLabel, children }: SettingsFormShellProps): ReactElement {
  return (
    <div className="w-full" aria-label={ariaLabel}>
      {children}
    </div>
  )
}
