---
created: 2026-05-11T17:11:30.587Z
title: Missing favicon 404 in console
area: ui
files:
  - index.html:6
---

## Problem

Browser console shows `Failed to load resource: the server responded with a status of 404 (Not Found)` for the favicon on every page load.

`index.html:6` declares `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` but no `public/favicon.svg` (or any other favicon asset) exists in the repo, so Vite never copies one into `dist/` and the request 404s.

Cosmetic — no functional impact — but pollutes the console and looks unprofessional in DevTools / when sharing screenshots.

Surfaced during Phase 7 UAT (2026-05-11) as a pre-existing, non-regression issue.

## Solution

TBD. Two options:

1. Add a real `public/favicon.svg` (Vite copies `public/*` to `dist/` verbatim) — preferred; pick or generate a small HRV-themed SVG icon.
2. Remove the `<link rel="icon">` tag from `index.html` if no favicon is desired.

Option 1 is the right answer; option 2 is the one-liner fallback if no asset is available before v1.0.1 ships.
