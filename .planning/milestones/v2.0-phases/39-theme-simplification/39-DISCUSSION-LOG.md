# Phase 39: Theme simplification — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 39-theme-simplification
**Areas discussed:** Drift-guard test, THM-05 re-persist verification, index.html FOUC script, theme.contrast.test.ts shape

---

## Area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Drift-guard test | Add a Phase 39 fs-scan drift-guard test mirroring Phase 37 STATS-05 + Phase 38 VAR-06 | ✓ |
| THM-05 re-persist verification | Add explicit unit test for read-coerce + write-back contract | ✓ |
| index.html FOUC script | Surgical edit vs cleaner rewrite of the inline pre-paint script | ✓ |
| theme.contrast.test.ts shape | Keep per-theme floors table vs simplify to single floor | ✓ |

**User's choice:** All four gray areas selected for discussion.

---

## Drift-guard test

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, ship the drift-guard | Add `src/content/content.no-removed-themes.test.ts` mirroring Phase 38 VAR-06. Four-root scan (`src/components/`, `src/app/`, `src/content/`, `src/styles/`) with full token list (plain substrings + persisted-value regex + CSS selector regex + object-key regex). Exit-ramp: future re-introduction phase deletes the test with rationale in SUMMARY. | ✓ |
| Yes, but narrower scope | Drop the plain-substring `moss`/`slate`/`dusk` tokens (false-positive risk). Keep capitalized component names + CSS regex + persisted-value regex. Safer, still locks the load-bearing surface. | |
| No drift-guard | Rely on TypeScript union + manual git-grep audit at phase close. Risk: future contributors could land `[data-theme='moss']:root { ... }` in CSS without TS catching it. | |

**User's choice:** Yes, ship the drift-guard (full token list).
**Notes:** Locked as D-03..D-06 in CONTEXT.md. Forbidden token list includes all plain substrings (lower- and upper-case English + PT-BR), persisted-value regex, CSS selector regex, and object-key regex. Matches Phase 38 VAR-06 four-root + `.css`-extension filter precedent.

---

## THM-05 re-persist verification

| Option | Description | Selected |
|--------|-------------|----------|
| Two-level: read-coerce + write-back round-trip | (1) Seed `localStorage` with `theme: 'moss'/'slate'/'dusk'`, `loadPrefs()` returns `theme: 'system'`. (2) Round-trip: load coerced → save → reload → assert persisted = `'system'`. Locks both halves of THM-05; matches Phase 38 VAR-05 forward-compat fill pattern. | ✓ |
| One-level: read-coerce only | Seed + assert returned theme is `'system'`. Trust existing `savePrefs` shape without round-trip. Simpler; THM-05 'on read' explicit, 're-persists' implicit. | |
| Skip explicit test | `coerceTheme`'s existing tests cover invalid → `DEFAULT_THEME`. Drift-guard catches CSS/string regressions. No dedicated THM-05 test. | |

**User's choice:** Two-level test.
**Notes:** Locked as D-02 in CONTEXT.md. Phase 38 added an equivalent assertion only at end-of-phase as commit `4bd5e78`; Phase 39 captures it up-front to avoid a retroactive validation cycle.

---

## index.html FOUC script

| Option | Description | Selected |
|--------|-------------|----------|
| Surgical edit, keep minified one-liner | In-place delete: drop 3 tokens from allowlist + 3 hex entries from `c` map. Preserve the single-line minified IIFE shape. Smallest diff (5 deletions). Phase 41 will re-touch the surviving hex values. | ✓ |
| Surgical edit, multiline reformat | Same content edits but reformat the IIFE to multiline indented JS for readability. Tiger Style favors readable over minified for source files. | |
| Full rewrite | Restructure: separate functions, named constants, comments. Heaviest diff. Risk: subtle behavior change could re-introduce FOUC. | |

**User's choice:** Surgical edit, keep minified one-liner.
**Notes:** Locked as D-08 in CONTEXT.md. The FOUC pre-paint contract is load-bearing; minimal touch preserves the timing-critical write order. Phase 41 will touch the same script for the Mono Zen hex retune.

---

## theme.contrast.test.ts shape

| Option | Description | Selected |
|--------|-------------|----------|
| Keep per-theme floors table | Drop 3 deprecated entries from `THEME_05_FLOORS`; leave `CONCRETE_THEMES` + `describe.each` + `Record<Exclude<ThemeId,'system'>, number>` structure intact. Forward-compat for Phase 41 Mono Zen retune. Tiny diff (3 deletions). | ✓ |
| Simplify to single floor constant | Replace table with a single constant; `describe.each` iterates 2 themes against the same floor. Forward-incompatible: Phase 41 would re-add the table when Mono Zen wants per-theme floors. Cleaner now, more churn later. | |

**User's choice:** Keep per-theme floors table.
**Notes:** Locked as D-09 in CONTEXT.md. Phase 41 may set different floors for the new cool-slate accent against new bg/surface; the table shape gives Phase 41 room without test scaffolding rework.

---

## Claude's Discretion

Locked under D-09..D-12 of CONTEXT.md and the "Plan structure" subsection of `<decisions>`:

- File-level commit grouping (single atomic vs split domain/storage / CSS+favicon / i18n / FOUC / drift-guard) — Tiger Style + Phase 36/37/38 PATTERNS favor split.
- Suggested plan order: (1) domain/storage type collapse + prefs.test.ts, (2) CSS deletion + faviconPalette + contrast test + favicon.sync test, (3) i18n strings + ThemePicker test, (4) `index.html` FOUC script, (5) drift-guard test. Planner may reorder if dependency analysis flips.
- Drift-guard filename — `src/content/content.no-removed-themes.test.ts` is closest analog naming; planner may pick `src/styles/no-removed-themes.test.ts` if scoping reads cleaner.
- Whether to inline-ban PT-BR display strings (`Musgo`/`Ardósia`/`Crepúsculo`) in the drift-guard plain-substring list or rely on `UiStrings` type removal alone — D-04 errs on inclusion; planner picks during PATTERNS.

## Deferred Ideas

All deferred items locked under `<deferred>` of CONTEXT.md:

- Mono Zen palette retune (`light` + `dark` hex value rewrite, new `borderSoft`/`textSoft`/`orbHalo1-3`/`onAccent` tokens, semibold Inter typography) — Phase 41
- New orb (three-layer halo + centre disc) — Phase 42
- App Settings page (where ThemePicker lives in v2.0) — Phase 43
- `MuteToggle.tsx:52` chrome alignment to `borderSoft`/`textSoft` — Phase 42 ORB-10
- WCAG contrast regeneration against Mono Zen values (Phase 39 satisfies THM-08 against current hex; Phase 41 re-runs against new hex) — Phase 41 follow-on
- `THEME_05_FLOORS` per-theme floor retune — Phase 41
- `VITE_BREATHING_SHAPE` / `VITE_ORB_IDLE_BEHAVIOR` defaults — Phase 42

---

*Discussion completed: 2026-05-21*
