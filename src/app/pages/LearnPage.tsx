import { useEffect, useRef, type ReactElement } from 'react'

import { ChevronBackIcon } from '../../components/icons'
import { LearnPanel } from '../../components/LearnPanel'
import { IconButton } from '../../components/primitives/IconButton'
import { PageShell } from '../../components/primitives/PageShell'
import { TopAppBar } from '../../components/primitives/TopAppBar'
import type { LearnContent } from '../../content/learnContent'
import type { LockedCopy } from '../../content/lockedCopy'
import { useUiStrings } from '../../hooks/useUiStringsContext'

export interface LearnPageProps {
  learnContent: LearnContent
  lockedCopy: LockedCopy
  onBack(this: void): void
}

/** Full-page "About this practice" surface. Composes PageShell + TopAppBar
 *  (back chevron in the leading slot) + Card-wrapped LearnPanel. Focuses
 *  the back button on mount so the user always has a known affordance. */
export function LearnPage({
  learnContent,
  lockedCopy,
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
          <IconButton
            icon={<ChevronBackIcon />}
            label={strings.close}
            onClick={onBack}
            buttonRef={backButtonRef}
          />
        }
      />
      <div className="w-full px-5 text-left sm:px-8">
        <LearnPanel
          learnContent={learnContent}
          lockedCopy={lockedCopy}
          strings={strings}
        />
      </div>
    </PageShell>
  )
}
