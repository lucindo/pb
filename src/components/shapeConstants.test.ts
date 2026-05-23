import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { MAX_SCALE, MID_SCALE, MIN_SCALE } from './shapeConstants'

// Drift guard — NOT a value lock. This test asserts EQUALITY between the
// three TS exports in shapeConstants.ts and the matching `--orb-scale-*`
// custom properties in src/styles/theme.css. It is value-agnostic: if a
// future orb redesign changes any of these numbers, change BOTH sides and
// the test stays green. If the scale-based orb is replaced wholesale,
// delete shapeConstants.ts + the CSS vars + THIS TEST together — the test
// is not meant to anchor the constants to existence. Its only job is to
// prevent silent drift between two files that have to agree at runtime.

const THEME_CSS_PATH = resolve(__dirname, '..', 'styles', 'theme.css')

function parseVar(name: string, css: string): number {
  // Match `--orb-scale-min: 0.58;` (or whatever number, with any trailing comment).
  const re = new RegExp(`--${name}\\s*:\\s*([0-9.]+)\\s*;`)
  const match = re.exec(css)
  if (match === null || match[1] === undefined) {
    throw new Error(`shapeConstants.test: could not find --${name} in theme.css`)
  }
  return Number.parseFloat(match[1])
}

describe('shapeConstants ↔ theme.css drift guard', () => {
  const css = readFileSync(THEME_CSS_PATH, 'utf-8')

  it('MIN_SCALE matches --orb-scale-min', () => {
    expect(parseVar('orb-scale-min', css)).toBe(MIN_SCALE)
  })

  it('MAX_SCALE matches --orb-scale-max', () => {
    expect(parseVar('orb-scale-max', css)).toBe(MAX_SCALE)
  })

  it('MID_SCALE matches --orb-scale-mid', () => {
    expect(parseVar('orb-scale-mid', css)).toBe(MID_SCALE)
  })
})
