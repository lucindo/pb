// Spike-loop J18.8 drift-guard.
//
// Locks the done-state of J13 (InstallBanner removal) + J16 V4 (TopAppBar
// eyebrow drop) + J17 audit + the J18.2 / J18.3 orphan sweep. Any future
// phase that re-introduces one of the removed strings explicitly deletes
// this file with rationale recorded in that phase's commit.
//
// Analog: src/content/content.no-removed-themes.test.ts (Phase 39 drift-guard
// — verbatim structural twin scanning components/, app/, content/, styles/).
//
// WHAT IS LOCKED:
//   - Removed i18n keys (the *key names*, not their old values — assertion is
//     "this key no longer exists in strings.ts").
//   - Removed display strings whose re-introduction would be a visible regression.
//
// WHAT IS NOT LOCKED:
//   - Keys still present (header was removed in J18.2; if it returns it must
//     be re-justified, but headers in *unrelated* contexts like LearnPanel's
//     SettingsSectionHeader props that take a `label` string are fine — the
//     guard targets `practice.header` and `*Header` key suffixes specifically).

/// <reference types="node" />

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      collectFiles(full, acc)
    } else if (
      (entry.endsWith('.ts') || entry.endsWith('.tsx')) &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.test.tsx')
    ) {
      acc.push(full)
    }
  }
  return acc
}

const COMPONENTS_DIR = resolve(__dirname, '..', 'components')
const APP_DIR        = resolve(__dirname, '..', 'app')
const CONTENT_DIR    = resolve(__dirname)

const SCAN_FILES: string[] = [
  ...collectFiles(COMPONENTS_DIR),
  ...collectFiles(APP_DIR),
  ...collectFiles(CONTENT_DIR),
]

// Removed-key matchers. Each entry: a regex that targets an exact structural
// pattern of where the key would appear if re-introduced, plus a label naming
// which item removed it. Structural patterns avoid false positives in comments
// that mention the removed thing for historical context.
const FORBIDDEN_KEYS: Array<{ label: string; pattern: RegExp }> = [
  // J18.2 — practice header strings (TopAppBar eyebrow dropped in J16 V4)
  { label: "practice.header (J18.2)",            pattern: /\bpractice\.header\b/ },
  { label: "switcher.stretchHeader (J18.2)",     pattern: /\bswitcher\.stretchHeader\b/ },
  { label: "switcher.naviKriyaHeader (J18.2)",   pattern: /\bswitcher\.naviKriyaHeader\b/ },
  { label: "getPracticeHeader helper (J18.2)",   pattern: /\bgetPracticeHeader\b/ },
  { label: "appHeader viewmodel field (J18.2)",  pattern: /\bappHeader\s*:/ },

  // J18.3 — install LOCKED_COPY orphans (InstallBanner removed in J13)
  { label: "install.bannerText (J18.3)",   pattern: /\binstall\.bannerText\b/ },
  { label: "install.regionLabel (J18.3)",  pattern: /\binstall\.regionLabel\b/ },
  { label: "install.dismiss (J18.3)",      pattern: /\binstall\.dismiss\b/ },

  // J18.4 — install viewmodel orphans (banner removed; showBanner derivation dropped)
  { label: "showBanner viewmodel field (J18.4)", pattern: /\bshowBanner\s*:/ },

  // J18.1 — deleted dead components
  { label: "BooleanToggle import (J18.1)",  pattern: /from\s+['"][^'"]*BooleanToggle['"]/ },
  { label: "StatusPanel import (J18.1)",    pattern: /from\s+['"][^'"]*StatusPanel['"]/ },
  { label: "Card primitive import (J18.1)", pattern: /from\s+['"][^'"]*primitives\/Card['"]/ },
]

describe('J18.8 drift-guard: removed keys do not reappear', () => {
  // Sanity: a broken __dirname resolve or renamed scan root would silently
  // produce an empty list and pass vacuously. Floor above realistic minimum.
  it('scans a non-empty set of production files', () => {
    expect(
      SCAN_FILES.length,
      'J18.8 drift-guard scanned zero files — collectFiles or scan-root resolve is broken',
    ).toBeGreaterThan(20)
  })

  it('no forbidden key reference appears in src/components/, src/app/, or src/content/', () => {
    const hits: string[] = []

    for (const file of SCAN_FILES) {
      const text = readFileSync(file, 'utf-8')
      for (const key of FORBIDDEN_KEYS) {
        if (key.pattern.test(text)) {
          hits.push(`${file}: ${key.label}`)
        }
      }
    }

    expect(
      hits,
      `Forbidden removed keys re-introduced (J18 invariant violated):\n${hits.join('\n')}`,
    ).toEqual([])
  })
})
