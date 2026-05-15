---
phase: 21-per-theme-favicon
reviewed: 2026-05-15T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/styles/faviconPalette.ts
  - src/styles/faviconPalette.test.ts
  - src/styles/favicon.sync.test.ts
  - src/hooks/useFavicon.ts
  - src/hooks/useFavicon.test.ts
  - index.html
  - src/app/App.tsx
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
status: issues_found
---

# Phase 21: Code Review Report

**Reviewed:** 2026-05-15T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Phase 21 adds a per-theme favicon: a single recolor-only SVG template
(`faviconPalette.ts`), an orchestrator hook (`useFavicon.ts`) wired into
`App.tsx`, an inline pre-paint script in `index.html`, and a sync guard
test. The architecture is sound and closely mirrors the established
`useTheme` pattern. Tests are reasonably thorough.

No security vulnerabilities or crash-level defects were found. However,
there are correctness and robustness concerns worth fixing before ship:
the data-URI is not fully URL-encoded (relies on lenient browser
parsing), the favicon `<link>` is duplicated when the App hook and the
pre-paint script both target a head with no existing `link[rel="icon"]`,
the sync guard's `parseAccentStrongFromCss` makes a fragile assumption
about CSS block ordering, and the dark/light favicon resolution diverges
from the `useTheme` data-theme write under one edge case.

## Warnings

### WR-01: Favicon data-URI contains unescaped spaces and quote/angle-bracket characters

**File:** `src/styles/faviconPalette.ts:23-33`
**Issue:** `buildFaviconDataUri` only replaces `#` with `%23`. The
resulting `data:image/svg+xml,...` URI still contains literal spaces,
`<`, `>`, and `"` characters (verified: the produced URI contains a
literal space and unescaped `<` / `"`). Per RFC 3986 a URI must not
contain raw spaces, and `data:` URIs containing unescaped reserved
characters rely on browser leniency. Chrome/Firefox happen to tolerate
this for `image/svg+xml`, but it is not guaranteed, and the same string
embedded in a `<link href>` attribute is doubly fragile. The widely
recommended approach is to URL-encode the whole SVG payload (or at
minimum `<`, `>`, `"`, `#`, and space).
**Fix:**
```ts
export function buildFaviconDataUri(theme: Exclude<ThemeId, 'system'>): string {
  const hex = FAVICON_COLORS[theme]
  const svg = FAVICON_SVG_TEMPLATE.replace('__FILL__', hex)
  // Encode the full payload so the data-URI is RFC 3986 valid.
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
```
Note: if the encoding strategy changes, the `index.html` inline script
and `favicon.sync.test.ts` regex (`%23` form) must be kept in sync, and
the test `output contains the per-theme hex` assertions still pass since
they match the bare hex substring.

### WR-02: Duplicate `<link rel="icon">` when no icon link exists at hook mount

**File:** `src/hooks/useFavicon.ts:37-47`
**Issue:** `replaceFaviconLink` removes the old `link[rel="icon"]` only
`if (oldLink)`, then unconditionally appends a new one. In production
this is fine because `index.html` ships a static `<link rel="icon">`.
But the hook re-applies on every theme change AND on mount, and the
pre-paint inline script in `index.html` already does its own
remove-and-append. If, on any code path, two appends race or the
querySelector misses the freshly-created element, the head accumulates
multiple `link[rel="icon"]` elements. More concretely: `useFavicon`'s
Effect A and the pre-paint script both run; the pre-paint script's link
is correctly replaced, but the test `does not throw when document has no
link` (line 211) demonstrates the path where no link exists — the hook
appends without removing. Repeated mounts (StrictMode double-invoke, or
HMR) under that condition leak duplicate links. Browsers use the last
`<link rel="icon">`, so behavior is usually correct, but the head
pollution is a real defect and can confuse other code that
`querySelector`s the icon link.
**Fix:** Remove ALL existing icon links before appending, and guard
against StrictMode double-invocation:
```ts
function replaceFaviconLink(dataUri: string): void {
  document.querySelectorAll('link[rel="icon"]').forEach((el) => { el.remove() })
  const newLink = document.createElement('link')
  newLink.rel = 'icon'
  newLink.type = 'image/svg+xml'
  newLink.setAttribute('href', dataUri)
  document.head.appendChild(newLink)
}
```

### WR-03: `parseAccentStrongFromCss` assumes the `light` token precedes the first `[data-theme=` block

**File:** `src/styles/favicon.sync.test.ts:38-47`
**Issue:** For `light`, the parser slices everything before the first
`[data-theme=` occurrence and searches that prefix for
`--color-breathing-accent-strong`. This silently depends on theme.css
authoring order. If a future edit moves a `[data-theme]` block above the
base `@theme` block, or introduces a `[data-theme=...]` selector in a
comment before the base block, the regex
`/^([\s\S]*?)(?:\[data-theme=)/` truncates the base block and the test
either throws or — worse — could match a stray token and pass against
the wrong value. The guard is meant to *prevent* drift but its own
parsing is order-fragile.
**Fix:** Anchor the `light` parse to the base block by selector, mirror
the `[data-theme]` branch logic. For example match the `@theme` /
`:root` base block explicitly, or scan for the *first*
`--color-breathing-accent-strong` that is not inside any `[data-theme]`
block by tracking brace depth. At minimum, add an assertion that the
matched base block does not itself contain `[data-theme=`.

### WR-04: System-favicon resolution can disagree with `useTheme`'s data-theme write

**File:** `src/hooks/useFavicon.ts:55-79` and `useTheme.ts:38-55`
**Issue:** `useFavicon` and `useTheme` independently resolve `system` via
`window.matchMedia('(prefers-color-scheme: dark)')`. They are separate
hooks with separate effects and listeners. Under normal conditions they
agree, but there is no shared source of truth: if the OS color scheme
flips between the two hooks' effect runs (or one hook's matchMedia
listener fires before the other's), the `<html data-theme>` attribute
and the favicon color can momentarily disagree. The favicon color is
sourced from `FAVICON_COLORS` (mirroring `--color-breathing-accent-strong`),
so a mismatch produces a tab icon that does not match the page accent.
This is a transient, low-severity inconsistency, but it is a real
correctness gap from duplicating the resolution logic in two places
rather than having `useFavicon` consume the resolved theme from
`useTheme` (or a shared resolver).
**Fix:** Have `useFavicon` derive its resolved theme from a single
shared resolution path — e.g. read `document.documentElement.dataset.theme`
(which `useTheme` already maintains as the resolved `light`/`dark`
value for `system`) instead of re-querying matchMedia, or extract a
shared `resolveSystemTheme()` helper used by both hooks. This also
removes the duplicated `MQL_QUERY` constant and the duplicated gated
matchMedia effect.

## Info

### IN-01: `resolved in FAVICON_COLORS` guard is provably dead

**File:** `src/hooks/useFavicon.ts:73-75`
**Issue:** After the `system` branch, `resolved` has type
`Exclude<ThemeId, 'system'>`, and `FAVICON_COLORS` is
`Record<Exclude<ThemeId, 'system'>, string>`. The `if (!(resolved in
FAVICON_COLORS)) return` can never be true. The comment even
acknowledges this. Dead defensive code adds noise; if a genuinely
untrusted value could reach here it should be validated at the boundary
(it cannot — `theme` comes from `loadPrefs()` which coerces).
**Fix:** Remove the guard, or if kept for paranoia, add a comment that
it is unreachable-by-type and exists only as a runtime backstop. The
current comment is contradictory ("always true by type ... but guard
defensively").

### IN-02: Favicon color logic is triplicated across three files

**File:** `src/styles/faviconPalette.ts:12-24`, `index.html:9`, `src/hooks/useFavicon.ts`
**Issue:** The hex map and the SVG circle template exist in three
places: the `faviconPalette.ts` module, the inline `index.html`
pre-paint script (`var c={'light':'#5e81ac',...}` plus an inline SVG
string), and implicitly the theme.css tokens. The `favicon.sync.test.ts`
guard mitigates drift, which is the right call given the inline script
cannot import the module. This is an accepted constraint, not a bug —
but it is worth flagging that the inline `index.html` script's SVG
string is a *fourth* hand-maintained copy of `FAVICON_SVG_TEMPLATE` that
the sync test does NOT verify (it only checks the hex map). A template
drift (e.g. someone changes `r="14"` in the module but not index.html)
would go undetected.
**Fix:** Optionally extend `favicon.sync.test.ts` to also assert that
the inline script's SVG markup matches `FAVICON_SVG_TEMPLATE`'s
structure (viewBox, circle geometry), so the template — not just the
colors — is drift-guarded.

### IN-03: `detail.key === undefined` branch is redundant with the `!detail` branch

**File:** `src/hooks/useFavicon.ts:136`
**Issue:** The condition `if (!detail || detail.key === 'theme' ||
detail.key === undefined)` — when `detail` is a non-null object with no
`key`, `detail.key` is `undefined`, so `detail.key === undefined` is
true. When `detail` is `null`/`undefined`, `!detail` already short-
circuits. The `detail.key === undefined` term only adds the case "detail
is a non-null object literally without a `key` property", which is the
documented forward-compat broadcast-all case. This is intentional and
matches `useTheme.ts:81` verbatim, so it is consistent — just noting the
condition reads as partially redundant. No change required; flagged for
awareness.
**Fix:** None required — consistency with `useTheme` is the correct
priority here.

### IN-04: Test `does not throw when document has no link` does not assert a favicon was created

**File:** `src/hooks/useFavicon.test.ts:211-220`
**Issue:** This test removes the icon link and asserts `useFavicon()`
does not throw. It does not assert that a new `link[rel="icon"]` was
created with the correct href. Given WR-02 (duplicate-link behavior),
strengthening this test to verify exactly one icon link exists after
mount with the expected dark hex would catch the head-pollution
regression and document the intended behavior.
**Fix:**
```ts
it('creates exactly one icon link when none exists at mount', () => {
  const link = document.querySelector('link[rel="icon"]')
  if (link) link.remove()
  seedPrefs('dark')
  renderHook(() => { useFavicon() })
  const links = document.querySelectorAll('link[rel="icon"]')
  expect(links).toHaveLength(1)
  expect(links[0]?.getAttribute('href')).toContain(
    FAVICON_COLORS.dark.replace('#', '%23').slice(1),
  )
})
```

---

_Reviewed: 2026-05-15T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
