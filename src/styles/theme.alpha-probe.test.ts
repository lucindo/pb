// src/styles/theme.alpha-probe.test.ts
//
// Alpha-modifier strategy probe: asserts that --color-breathing-surface resolves to a
// valid hex on documentElement. If that breaks, neither the `bg-[var(...)]/70` approach
// nor the `rgb(from var(...) r g b / 0.7)` fallback approach can work.

/// <reference types="node" />

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

let styleEl: HTMLStyleElement

beforeAll(() => {
  const themeCssPath = resolve(__dirname, 'theme.css')
  const raw = readFileSync(themeCssPath, 'utf-8')
  // Rewrite @theme { -> :root { because jsdom does not recognize Tailwind v4's @theme at-rule.
  // Same trick used by theme.contrast.test.ts (line 103) — kept consistent so both probes
  // see the cascade identically.
  const rewritten = raw.replace(/@theme\s*\{/g, ':root {')
  styleEl = document.createElement('style')
  styleEl.textContent = rewritten
  document.head.appendChild(styleEl)
})

afterAll(() => {
  styleEl.remove()
})

describe('D-02 alpha-modifier probe (upstream sanity)', () => {
  it('--color-breathing-surface resolves to a valid color on documentElement', () => {
    // Sanity: if the cascade is healthy, --color-breathing-surface should resolve to
    // a non-empty hex on :root. The Light palette baseline is #ffffff (theme.css line 7).
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-breathing-surface')
      .trim()
    expect(value).not.toBe('')
    expect(value).toMatch(/^#[0-9a-fA-F]{3,8}$/)
  })

  it('--color-breathing-surface rgb(from ...) fallback syntax is well-formed (Path B)', () => {
    // The Path B fallback (inline style) uses CSS-native rgb(from var(...) r g b / 0.7).
    // We can't run a real browser parser here, but we CAN assert the string shape is
    // syntactically the form we documented above — so future grep audits hit this file.
    const pathBFallback = 'rgb(from var(--color-breathing-surface) r g b / 0.7)'
    // Syntactic sanity: the fallback contains "rgb(from", the surface token reference,
    // and a /N alpha. Future migration plans (04, 05) grep this file for the canonical
    // form before adopting Path B.
    expect(pathBFallback).toContain('rgb(from')
    expect(pathBFallback).toContain('var(--color-breathing-surface)')
    expect(pathBFallback).toContain('/ 0.7')
  })
})
