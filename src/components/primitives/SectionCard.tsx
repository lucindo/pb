import type { CSSProperties, ReactElement, ReactNode } from 'react'

// Card chrome — border-soft 1px + surface bg + 20px radius.
// Padding varies per section content; callers supply via the `padding` prop.
// Shared across SettingsPanelBody, AdvancedPage, and LearnPanel (via its local
// Card delegate) to keep chrome consistent.

export interface SectionCardProps {
  padding: CSSProperties['padding']
  children: ReactNode
}

export function SectionCard({ padding, children }: SectionCardProps): ReactElement {
  return (
    <div
      style={{
        background: 'var(--color-breathing-surface)',
        border: '1px solid var(--color-border-soft)',
        borderRadius: 20,
        padding,
      }}
    >
      {children}
    </div>
  )
}
