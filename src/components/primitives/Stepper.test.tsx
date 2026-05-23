import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Stepper } from './Stepper'

describe('Stepper', () => {
  it('renders the value', () => {
    render(
      <Stepper
        value={5.5}
        onDecrement={vi.fn()}
        onIncrement={vi.fn()}
        decrementLabel="Decrease"
        incrementLabel="Increase"
      />,
    )
    expect(screen.getByText('5.5')).toBeInTheDocument()
  })

  it('uses formatValue when provided', () => {
    render(
      <Stepper
        value={5}
        formatValue={(n) => `${String(n)} min`}
        onDecrement={vi.fn()}
        onIncrement={vi.fn()}
        decrementLabel="Decrease"
        incrementLabel="Increase"
      />,
    )
    expect(screen.getByText('5 min')).toBeInTheDocument()
  })

  it('fires onDecrement when the minus button is clicked', () => {
    const onDecrement = vi.fn()
    render(
      <Stepper
        value={5}
        onDecrement={onDecrement}
        onIncrement={vi.fn()}
        decrementLabel="Decrease"
        incrementLabel="Increase"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Decrease' }))
    expect(onDecrement).toHaveBeenCalledOnce()
  })

  it('fires onIncrement when the plus button is clicked', () => {
    const onIncrement = vi.fn()
    render(
      <Stepper
        value={5}
        onDecrement={vi.fn()}
        onIncrement={onIncrement}
        decrementLabel="Decrease"
        incrementLabel="Increase"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Increase' }))
    expect(onIncrement).toHaveBeenCalledOnce()
  })

  it('disables the decrement button when decrementDisabled is true', () => {
    render(
      <Stepper
        value={5}
        onDecrement={vi.fn()}
        onIncrement={vi.fn()}
        decrementLabel="Decrease"
        incrementLabel="Increase"
        decrementDisabled
      />,
    )
    expect(screen.getByRole('button', { name: 'Decrease' })).toBeDisabled()
  })
})
