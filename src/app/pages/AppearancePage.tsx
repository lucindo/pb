import { useEffect, useRef, type ReactElement, type ReactNode } from 'react'

import { ChevronBackIcon } from '../../components/icons'
import { OrbPicker } from '../../components/OrbPicker'
import { RingCuePicker } from '../../components/RingCuePicker'
import { SettingsSectionHeader } from '../../components/SettingsSectionHeader'
import { SettingsToggleRow } from '../../components/SettingsToggleRow'
import { IconButton } from '../../components/primitives/IconButton'
import { PageShell } from '../../components/primitives/PageShell'
import { TopAppBar } from '../../components/primitives/TopAppBar'
import { useOrbIdleChoice } from '../../hooks/useOrbIdleChoice'
import { useSwitcherIconChoice } from '../../hooks/useSwitcherIconChoice'
import { useUiStrings } from '../../hooks/useUiStringsContext'

export interface AppearancePageProps {
  onBack(this: void): void
}

// Spike-locked card chrome — border-soft 1px + surface bg + 20px radius
// (spike index.html lines 1809-1814). Duplicated inline per RESEARCH OQ#4;
// do NOT export — private to this file.
function SectionCard({
  padding,
  children,
}: {
  padding: string
  children: ReactNode
}): ReactElement {
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

/** Full-page Appearance surface. Composes PageShell + TopAppBar (back
 *  chevron in the leading slot) + two SectionCards. Focuses the back
 *  chevron on mount. Changes apply live across the app via the Phase 47
 *  choice-hook setters. */
export function AppearancePage({ onBack }: AppearancePageProps): ReactElement {
  const strings = useUiStrings().appearance
  const { orbIdle, setOrbIdle } = useOrbIdleChoice()
  const { switcherIcon, setSwitcherIcon } = useSwitcherIconChoice()
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
            label={strings.backChevron}
            onClick={onBack}
            buttonRef={backButtonRef}
          />
        }
      />
      <div className="w-full text-left">
        <SettingsSectionHeader label={strings.sections.orbStyle} />
        <SectionCard padding="16px">
          <div className="grid gap-4">
            <OrbPicker
              disabled={false}
              sectionLabel={strings.orb.label}
              sectionLabelHidden={false}
              strings={strings.orb.options}
            />
            <RingCuePicker
              disabled={false}
              sectionLabel={strings.ringCue.label}
              sectionLabelHidden={false}
              strings={strings.ringCue.options}
            />
          </div>
        </SectionCard>

        <SettingsSectionHeader label={strings.sections.visual} />
        <SectionCard padding="16px">
          <SettingsToggleRow
            label={strings.breathingEffect.label}
            ariaLabel={strings.breathingEffect.label}
            checked={orbIdle === 'ambient'}
            onChange={(next) => {
              setOrbIdle(next ? 'ambient' : 'still')
            }}
          />
          <SettingsToggleRow
            label={strings.switcherIcons.label}
            ariaLabel={strings.switcherIcons.label}
            checked={switcherIcon}
            onChange={setSwitcherIcon}
          />
        </SectionCard>
      </div>
    </PageShell>
  )
}
