import { useEffect, useRef, type ReactElement } from 'react'

import { ChevronBackIcon } from '../../components/icons'
import { LearnPanel } from '../../components/LearnPanel'
import { Card } from '../../components/primitives/Card'
import { IconButton } from '../../components/primitives/IconButton'
import { PageShell } from '../../components/primitives/PageShell'
import { TopAppBar } from '../../components/primitives/TopAppBar'
import type { LearnContent } from '../../content/learnContent'
import type { LockedCopy } from '../../content/lockedCopy'
import { useUiStrings } from '../../hooks/useUiStringsContext'
import type { PracticeId } from '../../storage/practices'

export interface LearnPageProps {
  learnContent: LearnContent
  lockedCopy: LockedCopy
  activePractice: PracticeId
  onBack(this: void): void
}

/** Full-page "About this practice" surface. Composes PageShell + TopAppBar
 *  (back chevron in the leading slot) + Card-wrapped LearnPanel. Focuses
 *  the back button on mount so the user always has a known affordance. */
export function LearnPage({
  learnContent,
  lockedCopy,
  activePractice,
  onBack,
}: LearnPageProps): ReactElement {
  const strings = useUiStrings().learn
  const backButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    backButtonRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <PageShell>
      <TopAppBar
        title={strings.title}
        leading={
          <div className="absolute left-0 top-0">
            <IconButton
              icon={<ChevronBackIcon />}
              label={strings.close}
              onClick={onBack}
              buttonRef={backButtonRef}
            />
          </div>
        }
      />
      <div className="mt-6 w-full text-left">
        <Card padding="lg">
          <LearnPanel
            learnContent={learnContent}
            lockedCopy={lockedCopy}
            strings={strings}
            activePractice={activePractice}
          />
        </Card>
      </div>
    </PageShell>
  )
}
