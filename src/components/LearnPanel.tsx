import type { ReactElement } from 'react'

import type { LearnContent } from '../content/learnContent'
import type { LockedCopy } from '../content/lockedCopy'
import type { UiStrings } from '../content/strings'
import type { PracticeId } from '../storage'
import { getLearnPanelModel } from './learnPanelModel'

// Body of the "About this practice" surface. Consumed by LearnPage.
// Renders the sections, videos, explainer, resources, and native-apps
// blocks; the surrounding chrome (title + back affordance) is the page's
// responsibility.

export interface LearnPanelProps {
  learnContent: LearnContent
  lockedCopy: LockedCopy
  strings: UiStrings['learn']
  activePractice: PracticeId
}

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
    <div className="grid gap-5">
      {/* Practice description — practice-specific (D-01 first, D-08 single signal). */}
      <div className="grid gap-4">
        <div>
          <h3 className="text-xl font-semibold text-[var(--color-breathing-accent-strong)]">{practiceContent.description.section1.title}</h3>
          <p className="text-base leading-6 text-[var(--color-breathing-muted)]">{practiceContent.description.section1.body}</p>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-[var(--color-breathing-accent-strong)]">{practiceContent.description.section2.title}</h3>
          <p className="text-base leading-6 text-[var(--color-breathing-muted)]">{practiceContent.description.section2.body}</p>
        </div>
      </div>

      {/* Practice videos — practice-specific (D-01 second). D-07 link security. */}
      <div>
        <h3 className="text-xl font-semibold text-[var(--color-breathing-accent-strong)]">{videosHeading}</h3>
        <div className="mt-1 grid gap-2">
          {practiceContent.videos.map((video) => (
            <a
              key={video.url}
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center text-base font-medium text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
            >
              {video.label}
            </a>
          ))}
        </div>
      </div>

      {/* Shared Forrest explainer (D-01 third, LEARN-03). */}
      <div>
        <h3 className="text-xl font-semibold text-[var(--color-breathing-accent-strong)]">{explainer.forrest.title}</h3>
        {explainer.forrest.body.split('\n\n').map((paragraph) => (
          <p key={paragraph} className="text-base leading-6 text-[var(--color-breathing-muted)] [&:not(:first-of-type)]:mt-2">{paragraph}</p>
        ))}
      </div>

      {/* Forrest resources — shared (D-01 fourth). */}
      <div>
        <h3 className="text-xl font-semibold text-[var(--color-breathing-accent-strong)]">{strings.resourcesHeading}</h3>
        <div className="mt-1 grid gap-2">
          <a
            href={links.youtubeChannel.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center text-base font-medium text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
          >
            {links.youtubeChannel.label}
          </a>
          <a
            href={links.website.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center text-base font-medium text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
          >
            {links.website.label}
          </a>
          <a
            href={links.book.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center text-base font-medium text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
          >
            {links.book.label}
          </a>
          <a
            href={links.patreon.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center text-base font-medium text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
          >
            {links.patreon.label}
          </a>
        </div>
      </div>

      {/* Native-apps sub-section — resonant only (D-02). */}
      {showNativeApps && (
        <div>
          <h3 className="text-xl font-semibold text-[var(--color-breathing-accent-strong)]">{strings.nativeAppsHeading}</h3>
          <div className="mt-1 grid gap-2">
            <a
              href={links.appStoreIos.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center text-base font-medium text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
            >
              {links.appStoreIos.label}
            </a>
            <a
              href={links.googlePlayAndroid.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center text-base font-medium text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
            >
              {links.googlePlayAndroid.label}
            </a>
          </div>
        </div>
      )}

      <p className="text-center text-xs font-bold italic first-letter:uppercase text-[var(--color-breathing-muted)]">{lockedCopy.inspiredByForrest}</p>
      <p className="text-center text-xs text-[var(--color-breathing-muted)]">
        {lockedCopy.affiliationLine}
      </p>
    </div>
  )
}
