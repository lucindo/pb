import type { ReactElement } from 'react'

// Quiet uppercase tracked label that groups a card below it. Used by the
// App Settings page to label the Appearance / Language / Audio / About
// sections, and on the Learn page for section eyebrows.
//
// Locked style values:
// - fontSize 11, weight 500, letterSpacing 0.16em
// - uppercase, color muted
// - marginTop 24, marginBottom 8

export interface SettingsSectionHeaderProps {
  // Localized text, natural case (the component applies uppercase via CSS).
  label: string
  // Render as <h2> when this section header is the primary heading of a
  // page-level section. Default <p> when the surrounding card already owns
  // the semantic structure (e.g. inside a region with its own label).
  as?: 'h2' | 'p'
}

export function SettingsSectionHeader({
  label,
  as = 'h2',
}: SettingsSectionHeaderProps): ReactElement {
  const Tag = as
  return (
    <Tag
      className="uppercase"
      style={{
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.16em',
        color: 'var(--color-breathing-muted)',
        marginTop: 24,
        marginBottom: 8,
      }}
    >
      {label}
    </Tag>
  )
}
