import type { CSSProperties, ReactElement, ReactNode } from 'react'

// Spike-locked card chrome — border-soft 1px + surface bg + 20px radius
// (spike index.html lines 1809-1814). Padding varies per section content;
// callers supply via the `padding` prop.
//
// Phase 48 WR-01 follow-up: previously duplicated as private functions in
// SettingsPanelBody.tsx and AdvancedPage.tsx (Phase 49.1 D-10 rename). Two private
// copies meant a future spike-locked update to one would silently desync
// from the other. Extracted here to keep chrome consistent across surfaces.
// Visual output is byte-identical to the prior inline copies.
//
// NOTE: `LearnPanel.tsx` has a structurally different `SectionCard`
// (different signature, no `padding` prop) — intentionally NOT consolidated
// here per code-reviewer note that the variants serve distinct surfaces.

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
