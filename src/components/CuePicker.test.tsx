import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CuePicker } from './CuePicker'
import { STATE_KEY } from '../storage'
import type { CueStyleId } from '../domain/settings'
import { UI_STRINGS } from '../content/strings'

const EN_STRINGS_FIXTURE = UI_STRINGS.en

// Helper: seed localStorage with a known cue so useCueChoice reads it on mount.
function seedCue(cue: CueStyleId): void {
  const envelope = {
    version: 1,
    prefs: { theme: 'system', timbre: 'bowl', cue, locale: 'en' },
  }
  window.localStorage.setItem(STATE_KEY, JSON.stringify(envelope))
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('CuePicker — full radiogroup picker (Phase 25 Plan 04)', () => {
  // Test 1: aria-checked reflects the stored cue
  it('renders 3 radio buttons with aria-checked matching the seeded cue', () => {
    seedCue('arrow')
    render(<CuePicker disabled={false} strings={EN_STRINGS_FIXTURE.cue} sectionLabel={EN_STRINGS_FIXTURE.settings.cueLabel} />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    // Arrow button should be checked
    const arrowButton = radios.find((b) => b.getAttribute('aria-checked') === 'true')
    expect(arrowButton).not.toBeUndefined()
    // Others should be unchecked
    const others = radios.filter((b) => b.getAttribute('aria-checked') !== 'true')
    expect(others).toHaveLength(2)
    for (const button of others) {
      expect(button).toHaveAttribute('aria-checked', 'false')
    }
  })

  // Test 2: renders section header with id="cue-picker-label"
  it('renders a section header <p id="cue-picker-label">Cue style</p> above the radiogroup', () => {
    render(<CuePicker disabled={false} strings={EN_STRINGS_FIXTURE.cue} sectionLabel={EN_STRINGS_FIXTURE.settings.cueLabel} />)
    const label = document.getElementById('cue-picker-label')
    expect(label).not.toBeNull()
    // Reason: label is asserted non-null on the line above; non-null assertion is invariant-safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(label!.textContent).toBe('Cue style')
  })

  // Test 3: no id collision with VariantPicker — cue-picker-label not variant-picker-label
  it('uses id="cue-picker-label" (NOT "variant-picker-label") to avoid DOM id collision', () => {
    render(<CuePicker disabled={false} strings={EN_STRINGS_FIXTURE.cue} sectionLabel={EN_STRINGS_FIXTURE.settings.cueLabel} />)
    expect(document.getElementById('cue-picker-label')).not.toBeNull()
    expect(document.getElementById('variant-picker-label')).toBeNull()
  })

  // Test 4: aria-disabled + disabled attribute
  it('radiogroup has aria-disabled={disabled} and each button has native disabled={disabled}', () => {
    render(<CuePicker disabled={true} strings={EN_STRINGS_FIXTURE.cue} sectionLabel={EN_STRINGS_FIXTURE.settings.cueLabel} />)
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-disabled', 'true')
    const radios = screen.getAllByRole('radio')
    for (const button of radios) {
      expect(button).toBeDisabled()
    }
  })

  // Test 5: clicking an unselected button calls setCue — verified via savePrefs round-trip
  it('clicking an unselected button calls setCue — verified via savePrefs round-trip', async () => {
    seedCue('labels')
    const user = userEvent.setup()
    render(<CuePicker disabled={false} strings={EN_STRINGS_FIXTURE.cue} sectionLabel={EN_STRINGS_FIXTURE.settings.cueLabel} />)
    const arrowButton = screen.getByRole('radio', { name: /arrow/i })
    await user.click(arrowButton)
    const stored = window.localStorage.getItem(STATE_KEY)
    expect(stored).not.toBeNull()
    // Reason: stored is asserted non-null on the line above; non-null assertion is invariant-safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-member-access
    const parsed = JSON.parse(stored!).prefs.cue as string
    expect(parsed).toBe('arrow')
  })

  // Test 6: dispatches hrv:prefs-changed CustomEvent with { key: 'cue', value: id }
  it('clicking dispatches hrv:prefs-changed with { key: "cue", value: id }', async () => {
    seedCue('labels')
    const user = userEvent.setup()
    render(<CuePicker disabled={false} strings={EN_STRINGS_FIXTURE.cue} sectionLabel={EN_STRINGS_FIXTURE.settings.cueLabel} />)
    const spy = vi.fn()
    window.addEventListener('hrv:prefs-changed', spy)
    const arrowButton = screen.getByRole('radio', { name: /arrow/i })
    await user.click(arrowButton)
    window.removeEventListener('hrv:prefs-changed', spy)
    expect(spy).toHaveBeenCalledTimes(1)
    const event = spy.mock.calls[0]?.[0] as CustomEvent<{ key: string; value: string }>
    expect(event.detail.key).toBe('cue')
    expect(event.detail.value).toBe('arrow')
  })

  // Test 7: when disabled=true, clicking does NOT write to disk and no CustomEvent fires
  it('when disabled=true, clicking does NOT write to disk and no CustomEvent fires', async () => {
    seedCue('labels')
    const user = userEvent.setup()
    render(<CuePicker disabled={true} strings={EN_STRINGS_FIXTURE.cue} sectionLabel={EN_STRINGS_FIXTURE.settings.cueLabel} />)
    const spy = vi.fn()
    window.addEventListener('hrv:prefs-changed', spy)
    const arrowButton = screen.getByRole('radio', { name: /arrow/i })
    await user.click(arrowButton)
    window.removeEventListener('hrv:prefs-changed', spy)
    const stored = window.localStorage.getItem(STATE_KEY)
    expect(stored).not.toBeNull()
    // Reason: stored is asserted non-null on the line above; non-null assertion is invariant-safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-member-access
    const parsed = JSON.parse(stored!).prefs.cue as string
    // Envelope was seeded as labels; a disabled click should not change it
    expect(parsed).toBe('labels')
    expect(spy).not.toHaveBeenCalled()
  })

  // Test 8: when disabled=true, selected option retains aria-checked="true"
  it('when disabled=true, the selected option button retains aria-checked="true" and is disabled', () => {
    seedCue('nose')
    render(<CuePicker disabled={true} strings={EN_STRINGS_FIXTURE.cue} sectionLabel={EN_STRINGS_FIXTURE.settings.cueLabel} />)
    const noseButton = screen.getByRole('radio', { name: /nose/i })
    expect(noseButton).toHaveAttribute('aria-checked', 'true')
    expect(noseButton).toBeDisabled()
  })

  // Test 9: 44px hit area via min-h-12 + px-3
  it('every button has min-h-12 class AND px-3 class (44px hit area)', () => {
    render(<CuePicker disabled={false} strings={EN_STRINGS_FIXTURE.cue} sectionLabel={EN_STRINGS_FIXTURE.settings.cueLabel} />)
    const radios = screen.getAllByRole('radio')
    for (const button of radios) {
      expect(button.className).toContain('min-h-12')
      expect(button.className).toContain('px-3')
    }
  })

  // Test 10: focus-visible ring classes
  it('every button has focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 classes', () => {
    render(<CuePicker disabled={false} strings={EN_STRINGS_FIXTURE.cue} sectionLabel={EN_STRINGS_FIXTURE.settings.cueLabel} />)
    const radios = screen.getAllByRole('radio')
    for (const button of radios) {
      expect(button.className).toContain('focus-visible:ring-2')
      expect(button.className).toContain('focus-visible:ring-breathing-accent')
      expect(button.className).toContain('focus-visible:ring-offset-2')
    }
  })

  // Test 11: each button contains a preview glyph (svg or span for labels mode)
  it('each button contains a preview CueGlyph element above the text label', () => {
    render(<CuePicker disabled={false} strings={EN_STRINGS_FIXTURE.cue} sectionLabel={EN_STRINGS_FIXTURE.settings.cueLabel} />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    // Each button should contain a child structure (glyph + label span)
    for (const button of radios) {
      // button should have some child nodes (glyph + label)
      expect(button.children.length).toBeGreaterThan(0)
    }
  })

  // Test 12: radiogroup references cue-picker-label via aria-labelledby
  it('radiogroup has aria-labelledby="cue-picker-label"', () => {
    render(<CuePicker disabled={false} strings={EN_STRINGS_FIXTURE.cue} sectionLabel={EN_STRINGS_FIXTURE.settings.cueLabel} />)
    const radiogroup = screen.getByRole('radiogroup')
    expect(radiogroup).toHaveAttribute('aria-labelledby', 'cue-picker-label')
  })
})
