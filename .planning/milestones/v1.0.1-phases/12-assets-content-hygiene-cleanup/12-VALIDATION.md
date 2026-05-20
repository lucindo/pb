---
phase: 12
slug: assets-content-hygiene-cleanup
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-20
---

# Phase 12 — Validation Strategy

_Backfilled retroactively for Phase 12 (shipped 2026-05-12). Frontmatter `created: 2026-05-20` reflects backfill date; the audited code surface is the Phase 12 implementation present in `main`._

> Per-phase validation contract. The Phase 12 PLAN.md already inlined `<automated>` verify blocks for every task at plan time (Phase 7 D-09 / Phase 11 D-17 per-commit green-gate invariant); this VALIDATION.md regenerates the Nyquist coverage table from those inline verify blocks and confirms each task maps to at least one current-`main` Vitest assertion or grep-assertion. No gap-filling was required — every must-have truth has a surviving automated check.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (with jsdom) |
| **Config file** | `vite.config.ts` (`test: { environment: 'jsdom', globals: true, setupFiles: './vitest.setup.ts' }`) |
| **Quick run command** | `npx vitest run src/domain src/content src/storage` |
| **Full suite command** | `npx tsc --noEmit && npm run lint && npm run build && npm test` |
| **Estimated runtime** | ~10 seconds (vitest) + ~15 seconds (full gate at Phase 12 ship time) |

---

## Sampling Rate

- **After every task commit:** `npm test` (per Phase 7 D-09 / Phase 12 D-15 invariant)
- **After every plan wave:** Full gate (`npx tsc --noEmit && npm run lint && npm run build && npm test`)
- **Before `/gsd-verify-work`:** Full gate must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-T1 | 01 | 1 | HYGIENE-01 (docs-only flip) | T-12-04 | No runtime surface; docs flip via `Overtaken (by Phase 9 AUDIO-02)` cell + REVIEW.md `[2026-05-12 update]` addendum | grep-assertion | `grep -c '\| HYGIENE-01 \| Phase 12 — Assets, Content & Hygiene Cleanup \| Overtaken (by Phase 9 AUDIO-02) \|' .planning/REQUIREMENTS.md` | ✅ inline | ✅ green |
| 12-01-T2 | 01 | 1 | HYGIENE-03 (JSDoc seam) | T-12-04 | Single-line `/** @param now Test-only seam … */` JSDoc above `formatLastSessionDate` | grep-assertion | `grep -c '@param now Test-only seam' src/storage/format.ts` (== 1) | ✅ inline | ✅ green |
| 12-01-T3 | 01 | 1 | ASSETS-01 (favicon SVG + `%BASE_URL%`) | T-12-01 | SVG body has no `<script>`/`<foreignObject>`/`onload=`/`xlink:href`/`<animate>`; `index.html:5` uses `%BASE_URL%favicon.svg`; build emits `dist/index.html` with `href="/hrv/favicon.svg"` | unit + build smoke | `test -f public/favicon.svg && ! grep -qE '<script\|<foreignObject\|onload=\|xlink:href\|<animate' public/favicon.svg && grep -q 'href="%BASE_URL%favicon.svg"' index.html` | ✅ inline | ✅ green |
| 12-01-T4 | 01 | 1 | CONTENT-01 (canonical amazon.com book URL) | T-12-02 | Hardcoded constant URL (not user-controlled); `target="_blank"` + `rel="noopener noreferrer"` preserved on the `<a>` | unit | `npx vitest run src/content/learnContent.test.ts src/components/LearnDialog.test.tsx` (URL assertion at `learnContent.test.ts`; href + target/rel sweep at `LearnDialog.test.tsx`) | ✅ existing | ✅ green |
| 12-01-T5 | 01 | 1 | HYGIENE-02 (shared `isValid<X>` predicates + domain test) | T-12-03 | `isValid<X>` predicates use `Number.isFinite` + readonly-allowlist `.includes()` only; no `obj[userKey]` dynamic lookup; `validateSettings` throws `RangeError` verbatim; `coerceSettings` fallback to `DEFAULT_SETTINGS` unchanged | unit (RED→GREEN TDD) | `npx vitest run src/domain/settings.test.ts src/storage/settings.test.ts` — domain test new at Phase 12 (6–9 cases across three `describe('isValid<X> (HYGIENE-02 D-08)', …)` blocks); storage tests still cover coercer behavior | ✅ existing | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Coverage confirmed against current `main` (2026-05-20 backfill audit):**

- `public/favicon.svg` exists (486 bytes after the spike-010 orb-halo redesign supersession; original Phase 12 shipped a ~150-byte single-circle teal glyph — the asset surface and threat carve-out are unchanged: still no `<script>`/`<foreignObject>`/`onload=`/`xlink:href`/`<animate>` elements). `index.html:5` carries `href="%BASE_URL%favicon.svg"`.
- `src/content/learnContent.ts:68` (book.url) and `src/content/learnContent.ts:157` (a second LearnLink site that reuses the same canonical URL) both reference `https://www.amazon.com/Mastering-Meditation-Eight-Steps-Beginner-ebook/dp/B0CCFWP4W8?sr=8-1&linkId=…&language=en_US`. The `amzn.to/3RTAVqi` short URL no longer appears anywhere under `src/`.
- `src/domain/settings.ts:147,151,155` export `isValidBpm`/`isValidRatio`/`isValidDuration` exactly as specified by HYGIENE-02; `validateSettings` calls them with the verbatim `RangeError` throw + message format.
- `src/domain/settings.test.ts` exists with 54 `it()` cases (Phase 12 baseline 6–9 + downstream phases extended the file with stretch/NK predicates — the Phase 12 contribution remains identifiable via the `(HYGIENE-02 D-08)` describe-block tags).

---

## Wave 0 Requirements

No Wave 0 gaps. Phase 12 was a v1.0.1 patch wave: Vitest + jsdom + the FakeAudioContext setup were already in place from Phases 3–4; `src/domain/settings.test.ts` was the only new file (HYGIENE-02 D-10 structural gap-fill) and it landed inside the same task that introduced the relocated predicates. D-11 milestone invariant (zero net-new runtime deps) preserved.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| LearnDialog book link hover-preview text shows the canonical `amazon.com/.../dp/B0CCFWP4W8?…` URL (no longer the opaque `amzn.to/3RTAVqi` short link) | CONTENT-01 | Browser tooltip text is rendered by the user agent's status bar / native tooltip, not by the DOM — Vitest+jsdom cannot inspect it. The `href` attribute is automated above; the hover-preview is the user-visible delta. | (1) `npm run dev`; (2) open the Learn dialog; (3) hover the book link; (4) confirm the browser status-bar URL preview begins with `https://www.amazon.com/Mastering-Meditation-Eight-Steps-Beginner-ebook/dp/B0CCFWP4W8`. |
| Favicon renders correctly in the browser tab at the `/hrv/` base path under production build | ASSETS-01 | Browser tab favicon load + rendering involves the user-agent's resource pipeline and `<link rel="icon">` interpretation, not exercisable in jsdom. | (1) `npm run build && npx vite preview`; (2) open the served `/hrv/` URL; (3) confirm the favicon appears in the browser tab; (4) confirm the network panel shows `200 OK` for `/hrv/favicon.svg`. |

---

## Validation Sign-Off

- [x] All tasks have inline `<automated>` verify (Phase 12 PLAN.md Tasks 1–5 each carry a grep/test/build assertion block per Phase 7 D-09)
- [x] Sampling continuity: every task has at least one automated check (no 3 consecutive tasks without verify)
- [x] Wave 0 covers all MISSING references — N/A (HYGIENE-02 D-10 new test file landed inside the originating task)
- [x] No watch-mode flags
- [x] Feedback latency < 30s (full gate ~15s at Phase 12 ship time)
- [x] Pre-existing test baseline (400 → 406–409) preserved across all five commits per Phase 12 D-15
- [x] `nyquist_compliant: true` set in frontmatter — every must-have truth maps to a surviving automated check

**Approval:** verified 2026-05-20 (backfill — every Phase 12 must-have truth confirmed against the current `main` code surface; no gap-filling required, no test file added during this backfill audit)
