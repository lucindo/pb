// Persistent icon anchor labeled `Learn`, leading slot of TopAppBar.
// Disabled (not hidden) during lead-in and running — see IconAnchor.

import type { ReactElement } from 'react'
import type { UiStrings } from '../content/strings'
import { IconAnchor } from './IconAnchor'

export interface LearnAnchorProps {
  disabled: boolean
  onClick(this: void): void
  strings: UiStrings['practice']['topBar']
}

export function LearnAnchor({ disabled, onClick, strings }: LearnAnchorProps): ReactElement {
  return (
    <IconAnchor
      disabled={disabled}
      onClick={onClick}
      label={strings.learn}
      disabledLabel={strings.learnDisabled}
    >
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    </IconAnchor>
  )
}
