import type { ReactElement, ReactNode } from 'react'

import type { LearnContent } from '../content/learnContent'
import type { LockedCopy } from '../content/lockedCopy'
import type { UiStrings } from '../content/strings'
import type { PracticeId } from '../storage'
import { getLearnPanelModel } from './learnPanelModel'
import { SettingsSectionHeader } from './SettingsSectionHeader'
import { SectionCard } from './primitives/SectionCard'

// Body of the "About this practice" surface. Consumed by LearnPage.
// Each existing learn-content section title is hoisted to a
// SettingsSectionHeader (eyebrow) above its own SectionCard so the page
// reads as a stack of small labeled groups — same chrome pattern as the
// AppSettings page.

export interface LearnPanelProps {
  learnContent: LearnContent
  lockedCopy: LockedCopy
  strings: UiStrings['learn']
  activePractice: PracticeId
}

// Every Learn card shares one padding; chrome lives in the SectionCard primitive.
function Card({ children }: { children: ReactNode }): ReactElement {
  return <SectionCard padding="16px 18px">{children}</SectionCard>
}

const LINK_CLASSES =
  'inline-flex min-h-[44px] items-center text-sm font-medium text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2'

const BODY_CLASSES =
  'text-sm leading-relaxed text-[var(--color-breathing-text-soft)]'

export function LearnPanel({
  learnContent,
  lockedCopy,
  strings,
  activePractice,
}: LearnPanelProps): ReactElement {
  const { explainer, links } = learnContent
  const { practiceContent, videosHeading, showNativeApps } = getLearnPanelModel({
    activePractice,
    learnContent,
    strings,
  })

  return (
    <div>
      <SettingsSectionHeader label={practiceContent.description.section1.title} />
      <Card>
        <p className={BODY_CLASSES}>{practiceContent.description.section1.body}</p>
      </Card>

      <SettingsSectionHeader label={practiceContent.description.section2.title} />
      <Card>
        <p className={BODY_CLASSES}>{practiceContent.description.section2.body}</p>
      </Card>

      {practiceContent.adaptation && (
        <>
          <SettingsSectionHeader label={practiceContent.adaptation.title} />
          <Card>
            <p className={BODY_CLASSES}>{practiceContent.adaptation.body}</p>
            <p className={`${BODY_CLASSES} mt-3 border-l-2 border-[var(--color-border-soft)] pl-3 text-xs italic`}>
              {practiceContent.adaptation.note}
            </p>
          </Card>
        </>
      )}

      <SettingsSectionHeader label={videosHeading} />
      <Card>
        <div className="grid gap-2">
          {practiceContent.videos.map((video) => (
            <a
              key={video.url}
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASSES}
            >
              {video.label}
            </a>
          ))}
        </div>
      </Card>

      <SettingsSectionHeader label={explainer.forrest.title} />
      <Card>
        {explainer.forrest.body.split('\n\n').map((paragraph) => (
          <p key={paragraph} className={`${BODY_CLASSES} [&:not(:first-of-type)]:mt-2`}>{paragraph}</p>
        ))}
      </Card>

      <SettingsSectionHeader label={strings.resourcesHeading} />
      <Card>
        <div className="grid gap-2">
          <a href={links.youtubeChannel.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASSES}>
            {links.youtubeChannel.label}
          </a>
          <a href={links.website.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASSES}>
            {links.website.label}
          </a>
          <a href={links.book.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASSES}>
            {links.book.label}
          </a>
          <a href={links.patreon.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASSES}>
            {links.patreon.label}
          </a>
        </div>
      </Card>

      {showNativeApps && (
        <>
          <SettingsSectionHeader label={strings.nativeAppsHeading} />
          <Card>
            <div className="grid gap-2">
              <a href={links.appStoreIos.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASSES}>
                {links.appStoreIos.label}
              </a>
              <a href={links.googlePlayAndroid.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASSES}>
                {links.googlePlayAndroid.label}
              </a>
            </div>
          </Card>
        </>
      )}

      <p className="mt-6 text-center text-xs font-bold italic first-letter:uppercase text-[var(--color-breathing-muted)]">{lockedCopy.inspiredByForrest}</p>
      <p className="text-center text-xs text-[var(--color-breathing-muted)]">
        {lockedCopy.affiliationLine}
      </p>
    </div>
  )
}
