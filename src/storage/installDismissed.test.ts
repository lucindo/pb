import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { loadInstallDismissed, saveInstallDismissed } from './installDismissed'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('installDismissed storage (D-16/D-17)', () => {
  it('Test 1: saveInstallDismissed() then loadInstallDismissed() returns true', () => {
    saveInstallDismissed()
    expect(loadInstallDismissed()).toBe(true)
  })

  it('Test 2: loadInstallDismissed() returns false when no key has been written', () => {
    expect(loadInstallDismissed()).toBe(false)
  })

  it('Test 3: loadInstallDismissed() returns false when getItem throws (silent fallback, D-17)', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('ITP')
    })
    expect(loadInstallDismissed()).toBe(false)
  })

  it('Test 4: saveInstallDismissed() does not throw when setItem throws (silent fallback, D-16)', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => { saveInstallDismissed() }).not.toThrow()
  })

  it('Test 5: loadInstallDismissed() returns false when stored value is any string other than "true"', () => {
    window.localStorage.setItem('pattern-breathing:install-dismissed', 'false')
    expect(loadInstallDismissed()).toBe(false)

    window.localStorage.setItem('pattern-breathing:install-dismissed', '1')
    expect(loadInstallDismissed()).toBe(false)

    window.localStorage.setItem('pattern-breathing:install-dismissed', 'yes')
    expect(loadInstallDismissed()).toBe(false)

    window.localStorage.setItem('pattern-breathing:install-dismissed', '')
    expect(loadInstallDismissed()).toBe(false)
  })
})
