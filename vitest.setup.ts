import '@testing-library/jest-dom/vitest'

// HTMLDialogElement polyfill — jsdom 29.1.1 does not implement show/showModal/close.
// Source: 02-RESEARCH.md Pitfall 1 / Code Examples; verified against
// github.com/jestjs/jest/issues/13010 and github.com/jsdom/jsdom/issues/3294.
if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true
    }
  }
  if (!HTMLDialogElement.prototype.show) {
    HTMLDialogElement.prototype.show = function () {
      this.open = true
    }
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function (returnValue?: string) {
      this.open = false
      if (returnValue !== undefined) this.returnValue = returnValue
      this.dispatchEvent(new Event('close'))
    }
  }
}

// window.matchMedia polyfill — jsdom has no layout engine and does not implement matchMedia.
// Default `matches: false` keeps the suite running under "motion ALLOWED" semantics.
// Reduced-motion tests override with `vi.spyOn(window, 'matchMedia').mockReturnValue(...)`.
// Source: 02-RESEARCH.md Pitfall 2 / Code Examples; mantine.dev/guides/vitest pattern.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
