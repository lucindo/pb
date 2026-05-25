---
phase: 39
slug: theme-simplification
status: verified
threats_open: 0
threats_total: 17
asvs_level: 1
created: 2026-05-21
verified: 2026-05-21
---

# Phase 39 — Security

> Per-phase threat verification contract reconstructed from artifacts (State B) after phase completion.
> Register authored at plan time across all 5 plans (`register_authored_at_plan_time: true`).
> All 17 threats CLOSED via mitigation or documented acceptance.

---

## Trust Boundaries

| Boundary                                         | Description                                                                                                  | Data Crossing                                              |
|--------------------------------------------------|--------------------------------------------------------------------------------------------------------------|------------------------------------------------------------|
| Persisted `localStorage` envelope → `coercePrefs` | Returning user's persisted `theme: 'moss'\|'slate'\|'dusk'` crosses into the in-memory pref object           | Untrusted persisted user-pref value (UserPrefs.theme)      |
| `localStorage` → pre-paint FOUC IIFE              | Returning user's persisted theme value read by the inline IIFE at `index.html:18` before React mounts        | Untrusted persisted UserPrefs.theme (read-only, pre-paint) |
| Future contribution → `src/`                      | Future PR could re-introduce deprecated palette IDs/strings/CSS selectors into render or styles paths        | Source code (test-guarded contract)                        |
| Drift-guard self-exclusion                        | The drift-guard test file itself contains literal forbidden-token strings — must be excluded from its own scan | Source file contents (fs-scan)                            |
| `node:fs` `readFileSync` inside drift-guard       | The drift-guard reads files under 4 hardcoded scoped roots                                                   | Source file bytes (test-time only, no user input)         |

---

## Threat Register

| Threat ID    | Plan    | Category                                                                       | Component                                            | Disposition | Mitigation / Acceptance Rationale                                                                                                                          | Status   |
|--------------|---------|--------------------------------------------------------------------------------|------------------------------------------------------|-------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| T-39-01      | 39-01   | T — tampering (persisted theme value)                                          | `src/storage/prefs.ts` `coerceTheme` path            | mitigate    | Narrowed `THEME_OPTIONS` → `isValidTheme('moss'\|'slate'\|'dusk')` returns false → `coerceTheme` routes to `DEFAULT_THEME` (`'system'`). THM-05 two-level regression (`prefs.test.ts` ×2 cases) locks read-coerce + re-persist. | ✅ closed |
| T-39-02      | 39-01   | I — info (silent acceptance of invalid persisted value)                        | `coerceTheme`                                        | accept      | No new attack surface. `coerceTheme` body unchanged; only the union narrowed, so more values route through the existing `DEFAULT_THEME` fallback. No new code path added. | ✅ closed |
| T-39-03      | 39-02   | I — info (accidental palette deletion beyond scope)                            | `src/styles/theme.css`                               | mitigate    | Strict deletion scope (L152–L320); `grep -nE "\\[data-theme=" src/styles/theme.css` returns exactly 1 line (`[data-theme='dark']:root`); light + dark hex byte-preserved per verification grep. | ✅ closed |
| T-39-04      | 39-02   | I — info (accidental change to surviving favicon hex values)                   | `src/styles/faviconPalette.ts`                       | mitigate    | Surviving entries `light: '#5e81ac'`, `dark: '#81a1c1'` byte-preserved; `faviconPalette.test.ts` per-hex assertions still lock the contract; Phase 41 will retune intentionally. | ✅ closed |
| T-39-05      | 39-02   | T — tampering (drift between `theme.css` ↔ `faviconPalette.ts`)               | `src/styles/favicon.sync.test.ts`                    | mitigate    | Cross-file drift-guard auto-iterates `CONCRETE_THEMES` (now 2) and cross-asserts every CSS `[data-theme='X']:root` accent-strong matches `FAVICON_COLORS[X]`. 4/4 tests pass. | ✅ closed |
| T-39-06      | 39-03   | I — info (accidental `LOCKED_COPY` drift)                                      | `src/content/strings.ts`                             | mitigate    | Palette display strings (Moss/Slate/Dusk + Musgo/Ardósia/Crepúsculo) are NOT in `LOCKED_COPY` (only Forrest/medical claim-safe copy is). Phase 19 frozen-EN byte-equality guard untouched; `strings.test.ts` 33/33 passes. | ✅ closed |
| T-39-07      | 39-03   | I — info (review-marker debt)                                                  | `src/content/strings.ts`                             | mitigate    | Clean-cut deletion per D-07; no `[review-needed]` markers inserted; Phase 26 `content.no-review-markers.test.ts` drift-guard continues to pass. | ✅ closed |
| T-39-08      | 39-03   | I — info (behavioral coverage loss in hook tests)                              | `useTheme.test.ts`, `useThemeChoice.test.ts`, `useFavicon.test.ts` | mitigate | Rotation strategy (D-12) — fixtures rotated to surviving theme IDs rather than deleted; cross-tab + same-tab event tests preserve non-trivial before/after deltas by rotating to two distinct surviving themes. Suites green. | ✅ closed |
| T-39-09 (a)  | 39-03   | T — tampering (tsc-broken commit boundary on `FAVICON_COLORS.moss\|slate\|dusk`) | `src/hooks/useFavicon.test.ts`                       | mitigate    | All 3 `FAVICON_COLORS.moss\|.dusk` property accesses (L84, L150, L191) rewritten to surviving keys (`.dark` / `.light`) in same wave as Plan 02's key deletion. Final `npx tsc --noEmit` exits 0. | ✅ closed |
| T-39-09 (b)  | 39-04   | I — info (pure literal deletion of FOUC tokens)                               | `index.html:18` FOUC script                          | accept      | Pure literal deletion of 3 hex entries + 3 allowlist tokens; no new code path, no new input handling; matchMedia fallback for deprecated values was already in place. Duplicate-ID note: separate planners reused `T-39-09`; both threats CLOSED. | ✅ closed |
| T-39-10      | 39-04   | T — tampering (FOUC contract breakage)                                         | `index.html:18` FOUC script structure                | mitigate    | IIFE wrapper, matchMedia branch, catch fallback, single-line minified shape, and `data-theme` write timing all byte-preserved outside the 2 surgical excision points; `favicon.sync.test.ts` drift-guard verifies cross-file invariant (4/4 pass). | ✅ closed |
| T-39-11      | 39-04   | I — info (accidental change to surviving hex values)                           | `index.html` L18 — `'#5e81ac'`, `'#81a1c1'`           | mitigate    | Surviving hex byte-preserved per `grep -c "'#5e81ac'" index.html` and `grep -c "'#81a1c1'" index.html` (each returns 1). Phase 41 retunes intentionally. | ✅ closed |
| T-39-12      | 39-05   | T — tampering (future regression of theme-axis cleanup)                        | `src/components/`, `src/app/`, `src/content/`, `src/styles/` | mitigate | `src/content/content.no-removed-themes.test.ts` fs-scan drift-guard fails CI on any of 12 forbidden tokens (9 plain-substring + 3 regex categories). Per D-06 future re-introduction is a deliberate phase decision that explicitly deletes this file. | ✅ closed |
| T-39-13      | 39-05   | I — info (vacuous pass)                                                        | The drift-guard test itself                          | mitigate    | Sanity-floor `it()` asserts `SCAN_FILES.length > 10` — a broken `__dirname` resolve or renamed scan root would otherwise silently produce an empty list and pass vacuously. | ✅ closed |
| T-39-14      | 39-05   | I — info (drift-guard self-flag)                                               | The drift-guard file's own forbidden-token literals  | mitigate    | `collectFiles` rejects `.test.ts` and `.test.tsx` files via filename filter; the guard file's `.test.ts` suffix excludes it from its own scan. Load-bearing. | ✅ closed |
| T-39-15      | 39-05   | I — info (path-traversal in fs read)                                           | `node:fs` `readFileSync` inside the it() loop        | accept      | Scan roots are hardcoded constants (`COMPONENTS_DIR`, `APP_DIR`, `CONTENT_DIR`, `STYLES_DIR`); no user input crosses the boundary; the test only string-searches matched content (no execution). Same disposition as Phase 38 T-38-15. | ✅ closed |
| T-39-16      | 39-05   | D — denial (false positive on legitimate "slate" / "dusk" English)             | Comments / strings using those words in non-theme contexts | mitigate (originally `accept` per plan; upgraded during execution) | Plan-time disposition was `accept` (per CONTEXT D-04 Claude's Discretion — err on inclusion). During execution, the lowercase `'slate'` matcher was narrowed from `t.includes('slate')` to a word-bounded regex `/(?<![a-zA-Z])slate(?![a-zA-Z])/` to avoid colliding with the structurally unavoidable CSS/Tailwind `translate*` keyword. Invariant preserved 100%; documented in 39-05-SUMMARY.md Auto-fixed Issues #2 (Rule 3) and 39-VERIFICATION.md Documented Deviations. | ✅ closed |

*Status: ✅ closed · ⚠️ open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID   | Threat Ref     | Rationale                                                                                                                                                          | Accepted By                     | Date       |
|-----------|----------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------|------------|
| AR-39-01  | T-39-02        | `coerceTheme` body is unchanged across Phase 39 — the union narrowing only routes additional values through the same existing fallback. No new attack surface.    | Planner (Plan 01)               | 2026-05-21 |
| AR-39-02  | T-39-09 (b)    | Pure literal deletion in the FOUC IIFE. No new code path; the matchMedia + catch fallbacks that handle deprecated values were already in place pre-Phase-39.       | Planner (Plan 04)               | 2026-05-21 |
| AR-39-03  | T-39-15        | The drift-guard reads files via `node:fs.readFileSync` only at test time, only from 4 hardcoded scan roots. No user input crosses the boundary; no execution.       | Planner (Plan 05)               | 2026-05-21 |

*Accepted risks do not resurface in future audit runs.*

---

## STRIDE Coverage

| Category                  | Threats                                                                       | Disposition Mix              |
|---------------------------|-------------------------------------------------------------------------------|------------------------------|
| Spoofing                  | —                                                                             | (not applicable)             |
| Tampering                 | T-39-01, T-39-05, T-39-09 (a), T-39-10, T-39-12                              | 5 mitigate / 0 accept        |
| Repudiation               | —                                                                             | (not applicable)             |
| Information disclosure    | T-39-02, T-39-03, T-39-04, T-39-06, T-39-07, T-39-08, T-39-09 (b), T-39-11, T-39-13, T-39-14, T-39-15 | 8 mitigate / 3 accept |
| Denial of service         | T-39-16                                                                       | 1 mitigate                   |
| Elevation of privilege    | —                                                                             | (not applicable)             |

Pure deletion phase: no new code paths, no new input handling, no new fs/network surfaces beyond the test-time drift-guard `readFileSync` (T-39-15, accepted).

---

## Security Audit Trail

| Audit Date  | Threats Total | Closed | Open | Run By                                       |
|-------------|---------------|--------|------|----------------------------------------------|
| 2026-05-21  | 17            | 17     | 0    | Claude (`gsd-secure-phase` reconstructed from artifacts) |

### Audit Notes

- **Duplicate threat ID `T-39-09`** — Plan 03 and Plan 04 both assigned `T-39-09` (separate planners, plans authored independently before wave execution). Disambiguated in this register as `T-39-09 (a)` (Plan 03 — tsc-broken commit boundary) and `T-39-09 (b)` (Plan 04 — pure literal deletion of FOUC tokens). Both threats CLOSED; numbering collision is a documentation artifact only.
- **T-39-16 disposition upgrade** — Plan-time disposition was `accept` (per CONTEXT D-04 Claude's Discretion); during Plan 05 execution the matcher was narrowed to a word-bounded regex (Rule 3 blocking deviation) to remove false-positive friction on the CSS/Tailwind `translate*` keyword. Upgraded to `mitigate` in this register since the implementation includes an active mitigation (the regex narrowing), not just an accepted residual risk.
- **`register_authored_at_plan_time: true`** — All 5 PLANs contained parseable `<threat_model>` blocks; the auditor short-circuited per workflow Step 3 rule (`threats_open: 0 AND register_authored_at_plan_time: true → skip directly to Step 6`). No retroactive-STRIDE pass needed.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log (AR-39-01 .. AR-39-03)
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-21
