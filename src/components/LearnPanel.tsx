import type { ReactElement, ReactNode } from 'react'

import type { LearnContent } from '../content/learnContent'
import type { LockedCopy } from '../content/lockedCopy'
import type { UiStrings } from '../content/strings'
import type { PracticeId } from '../storage'
import { getLearnPanelModel } from './learnPanelModel'
import { SettingsSectionHeader } from './SettingsSectionHeader'

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

// Spike-locked card chrome — 1px border-soft + surface bg + 20 px radius
// (spike index.html L1809-1814). Mirrors SettingsPanelBody's private
// SectionCard for visual consistency between Learn + AppSettings pages.
function SectionCard({ children }: { children: ReactNode }): ReactElement {
  return (
    <div
      style={{
        background: 'var(--color-breathing-surface)',
        border: '1px solid var(--color-border-soft)',
        borderRadius: 20,
        padding: '16px 18px',
      }}
    >
      {children}
    </div>
  )
}

const LINK_CLASSES =
  'inline-flex min-h-[44px] items-center text-base font-medium text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2'

const BODY_CLASSES =
  'text-base leading-6 text-[var(--color-breathing-text-soft)]'

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
      <SectionCard>
        <p className={BODY_CLASSES}>{practiceContent.description.section1.body}</p>
      </SectionCard>

      <SettingsSectionHeader label={practiceContent.description.section2.title} />
      <SectionCard>
        <p className={BODY_CLASSES}>{practiceContent.description.section2.body}</p>
      </SectionCard>

      <SettingsSectionHeader label={videosHeading} />
      <SectionCard>
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
      </SectionCard>

      <SettingsSectionHeader label={explainer.forrest.title} />
      <SectionCard>
        {explainer.forrest.body.split('\n\n').map((paragraph) => (
          <p key={paragraph} className={`${BODY_CLASSES} [&:not(:first-of-type)]:mt-2`}>{paragraph}</p>
        ))}
      </SectionCard>

      <SettingsSectionHeader label={strings.resourcesHeading} />
      <SectionCard>
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
      </SectionCard>

      {showNativeApps && (
        <>
          <SettingsSectionHeader label={strings.nativeAppsHeading} />
          <SectionCard>
            <div className="grid gap-2">
              <a href={links.appStoreIos.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASSES}>
                {links.appStoreIos.label}
              </a>
              <a href={links.googlePlayAndroid.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASSES}>
                {links.googlePlayAndroid.label}
              </a>
            </div>
          </SectionCard>
        </>
      )}

      <p className="mt-6 text-center text-xs font-bold italic first-letter:uppercase text-[var(--color-breathing-muted)]">{lockedCopy.inspiredByForrest}</p>
      <p className="text-center text-xs text-[var(--color-breathing-muted)]">
        {lockedCopy.affiliationLine}
      </p>
    </div>
  )
}
