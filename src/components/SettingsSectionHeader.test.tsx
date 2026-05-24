import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SettingsSectionHeader } from './SettingsSectionHeader'

describe('SettingsSectionHeader', () => {
  it('renders the label text', () => {
    render(<SettingsSectionHeader label="Appearance" />)
    expect(screen.getByText('Appearance')).toBeVisible()
  })

  it('defaults to an <h2> tag for semantic page-section headings', () => {
    render(<SettingsSectionHeader label="Audio" />)
    expect(screen.getByRole('heading', { level: 2, name: 'Audio' })).toBeInTheDocument()
  })

  it('renders as <p> when as="p" is passed (no heading role)', () => {
    render(<SettingsSectionHeader label="About" as="p" />)
    expect(screen.queryByRole('heading', { name: 'About' })).toBeNull()
    expect(screen.getByText('About')).toBeVisible()
  })
})
