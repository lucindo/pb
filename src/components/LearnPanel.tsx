import type { ReactElement, ReactNode } from 'react'

import type { LearnContent } from '../content/learnContent'
import type { LockedCopy } from '../content/lockedCopy'
import { SettingsSectionHeader } from './SettingsSectionHeader'
import { SectionCard } from './primitives/SectionCard'

// Body of the "About Pattern Breathing" surface. Consumed by LearnPage.
// Each section's title is hoisted to a SettingsSectionHeader (eyebrow) above its
// own SectionCard — same chrome pattern as the AppSettings page.

export interface LearnPanelProps {
  learnContent: LearnContent
  lockedCopy: LockedCopy
}

// Every Learn card shares one padding; chrome lives in the SectionCard primitive.
function Card({ children }: { children: ReactNode }): ReactElement {
  return <SectionCard padding="16px 18px">{children}</SectionCard>
}

const BODY_CLASSES =
  'text-sm leading-relaxed text-[var(--color-breathing-text-soft)]'

export function LearnPanel({
  learnContent,
  lockedCopy,
}: LearnPanelProps): ReactElement {
  return (
    <div>
      {learnContent.sections.map((section) => (
        <div key={section.title}>
          <SettingsSectionHeader label={section.title} />
          <Card>
            <p className={BODY_CLASSES}>{section.body}</p>
          </Card>
        </div>
      ))}

      <p className="mt-6 text-center text-xs text-[var(--color-breathing-muted)]">
        {lockedCopy.affiliationLine}
      </p>
    </div>
  )
}
