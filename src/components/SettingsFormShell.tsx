import type { ReactElement, ReactNode } from 'react'

interface SettingsFormShellProps {
  ariaLabel: string
  children: ReactNode
}

export function SettingsFormShell({ ariaLabel, children }: SettingsFormShellProps): ReactElement {
  return (
    <div className="grid w-full gap-4" aria-label={ariaLabel}>
      {children}
    </div>
  )
}
