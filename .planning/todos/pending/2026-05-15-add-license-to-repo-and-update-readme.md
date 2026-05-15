---
created: 2026-05-15T15:00:44.934Z
title: Add license to repo and update README
area: docs
resolves_phase: 23
files:
  - LICENSE
  - README.md:130
---

## Problem

The repo has no LICENSE file. README.md:130-132 ("## License") currently hedges:
"See `LICENSE` if present. Otherwise the source is provided as-is..." — the
licensing is undefined.

## Solution

Add a real LICENSE file to the repo root and update the README "## License"
section to reference it concretely (drop the "if present" hedge). Decide the
license type with the operator before writing. Keep the existing requests to
credit Forrest Knutson as the practice source and to retain the "not medical
advice" framing — fold those into the updated README section as appropriate.
