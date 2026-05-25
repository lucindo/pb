import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { SettingsRow } from './SettingsRow'

describe('SettingsRow', () => {
  it('renders a fieldset with the provided aria-label', () => {
    render(
      <SettingsRow label="Duration" ariaLabel="Duration setting">
        <button>control</button>
      </SettingsRow>,
    )
    expect(screen.getByRole('group', { name: 'Duration setting' })).toBeInTheDocument()
  })

  it('renders the label text inside the row', () => {
    render(
      <SettingsRow label="Rounds" ariaLabel="Rounds setting">
        <button>control</button>
      </SettingsRow>,
    )
    expect(screen.getByText('Rounds')).toBeInTheDocument()
  })

  it('renders children inside the row', () => {
    render(
      <SettingsRow label="Theme" ariaLabel="Theme setting">
        <button>Select theme</button>
      </SettingsRow>,
    )
    expect(screen.getByRole('button', { name: 'Select theme' })).toBeInTheDocument()
  })
})
