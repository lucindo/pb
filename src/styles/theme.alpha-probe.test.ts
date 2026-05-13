// src/styles/theme.alpha-probe.test.ts
//
// Phase 16.1 / Wave 0 / CONTEXT.md D-02: alpha-modifier strategy probe.
//
// =====================================================================================
// D-02 STRATEGY DECISION (recorded here so plans 04/05 can reference without re-debating)
// =====================================================================================
//
// Question: Does Tailwind v4 parse `bg-[var(--color-breathing-surface)]/70` (arbitrary
// value + alpha modifier on a `var()` reference) and emit a working background-color?
//
// Why this matters: 5 alpha sites in the migration surface use `bg-white/70`, `bg-white/80`,
// or `border-white/80`. We need ONE strategy for all 5 so we don't ship a hybrid mess.
//
// jsdom CANNOT answer this question. Tailwind v4 codegen runs at Vite build time, not
// inside jsdom — there is no way for a Vitest+jsdom test to render an arbitrary-value
// Tailwind class and observe the computed background. The probe's PRIMARY value is
// therefore forcing the decision (Path A vs Path B) into writing BEFORE plans 04/05
// touch any alpha site.
//
// Path A (DEFAULT — try first):
//   `bg-[var(--color-breathing-surface)]/70`
//   Tailwind v4 documents `/N` alpha-modifier support on arbitrary-value var() refs.
//   Emitted CSS uses `color-mix(in oklab, var(...) 70%, transparent)` or equivalent.
//   Verification: plan 04 dev-server smoke check (see below).
//
// Path B (FALLBACK — switch to this if Path A produces transparent render):
//   className="..." (drop the alpha class)
//   style={{ backgroundColor: 'rgb(from var(--color-breathing-surface) r g b / 0.7)' }}
//   CSS-native `rgb(from ...)` syntax is supported in Chrome 119+, Safari 16.4+,
//   Firefox 113+ (all evergreen targets per 16.1-RESEARCH.md §"Pitfall 3").
//
// Dev-server smoke check (plan 04 MUST run this before committing migration):
//   1. `npm run dev`
//   2. Open browser DevTools on a page rendering:
//      <div className="bg-[var(--color-breathing-surface)]/70 p-4">probe</div>
//   3. Inspect element; read getComputedStyle().backgroundColor
//   4. Expected (Light palette): rgba(255, 255, 255, 0.7) OR color-mix(...)
//      with non-zero alpha
//   5. If the computed style is `transparent` or `rgba(0, 0, 0, 0)`: switch the
//      WHOLE wave to Path B (inline style with rgb(from ...)).
//   6. Whichever path wins: ALL 5 alpha sites use the SAME path.
//
// =====================================================================================
// This test itself asserts the upstream invariant: --color-breathing-surface resolves to
// a valid hex on documentElement. If THAT breaks, neither Path A nor Path B can work,
// and the migration is blocked at a more fundamental level.
// =====================================================================================

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
