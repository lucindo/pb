import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PickerCardGrid } from './PickerCardGrid'

type Fruit = 'apple' | 'banana' | 'cherry'

function renderGrid(
  props: Partial<{
    value: Fruit
    disabled: boolean
    onChange: (next: Fruit) => void
    columns: 2 | 3
    optionLayout: 'inline' | 'stack'
    renderOption: (option: Fruit) => string
  }> = {},
) {
  const onChange = props.onChange ?? vi.fn()
  const utils = render(
    <PickerCardGrid<Fruit>
      sectionLabel="Fruit"
      labelId="fruit-label"
      options={['apple', 'banana', 'cherry']}
      value={props.value ?? 'apple'}
      onChange={onChange}
      renderOption={props.renderOption ?? ((o) => o)}
      columns={props.columns ?? 3}
      disabled={props.disabled ?? false}
      optionLayout={props.optionLayout}
    />,
  )
  return { ...utils, onChange }
}

describe('PickerCardGrid', () => {
  it('renders the section label with the supplied id', () => {
    renderGrid()
    const label = document.getElementById('fruit-label')
    expect(label).not.toBeNull()
    expect(label).toHaveTextContent('Fruit')
  })

  it('renders a radiogroup with aria-labelledby pointing to the label id', () => {
    renderGrid()
    const rg = screen.getByRole('radiogroup', { name: 'Fruit' })
    expect(rg).toHaveAttribute('aria-labelledby', 'fruit-label')
  })

  it('renders one radio button per option with the rendered label as content', () => {
    renderGrid()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    expect(radios[0]).toHaveTextContent('apple')
    expect(radios[1]).toHaveTextContent('banana')
    expect(radios[2]).toHaveTextContent('cherry')
  })

  it('marks the matching value as aria-checked=true and others as false', () => {
    renderGrid({ value: 'banana' })
    const radios = screen.getAllByRole('radio')
    expect(radios[0]).toHaveAttribute('aria-checked', 'false')
    expect(radios[1]).toHaveAttribute('aria-checked', 'true')
    expect(radios[2]).toHaveAttribute('aria-checked', 'false')
  })

  it('clicking an option fires onChange with that option id', () => {
    const { onChange } = renderGrid()
    fireEvent.click(screen.getByRole('radio', { name: 'cherry' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('cherry')
  })

  it('disabled cascades to aria-disabled on the radiogroup and disabled on each radio', () => {
    renderGrid({ disabled: true })
    const rg = screen.getByRole('radiogroup')
    expect(rg).toHaveAttribute('aria-disabled', 'true')
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled()
    }
  })

  it('applies the grid-cols-3 class when columns=3', () => {
    renderGrid({ columns: 3 })
    expect(screen.getByRole('radiogroup')).toHaveClass('grid-cols-3')
  })

  it('applies the grid-cols-2 class when columns=2', () => {
    renderGrid({ columns: 2 })
    expect(screen.getByRole('radiogroup')).toHaveClass('grid-cols-2')
  })

  it('default optionLayout=inline does NOT add flex-col to option buttons', () => {
    renderGrid()
    expect(screen.getAllByRole('radio')[0]).not.toHaveClass('flex-col')
  })

  it('optionLayout=stack adds flex-col + items-center + gap-1 to option buttons', () => {
    renderGrid({ optionLayout: 'stack' })
    const radio = screen.getAllByRole('radio')[0]
    expect(radio).toHaveClass('flex')
    expect(radio).toHaveClass('flex-col')
    expect(radio).toHaveClass('items-center')
    expect(radio).toHaveClass('gap-1')
  })

  it('selected option has the border-2 + accent fill class; unselected stays border (single)', () => {
    renderGrid({ value: 'apple' })
    const radios = screen.getAllByRole('radio')
    expect(radios[0]).toHaveClass('border-2')
    expect(radios[1]).not.toHaveClass('border-2')
  })
})
