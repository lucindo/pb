import type { CSSProperties, ReactElement, ReactNode } from 'react'

// Card chrome — border-soft 1px + surface bg + 20px radius.
// Padding varies per section content; callers supply via the `padding` prop.
// Shared across SettingsPanelBody and AdvancedPage to keep chrome consistent.
//
// NOTE: `LearnPanel.tsx` has a structurally different `SectionCard`
// (different signature, no `padding` prop) — intentionally NOT consolidated
// here; the variants serve distinct surfaces.

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
