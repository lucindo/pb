# Phase 27: PWA Install & Offline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-16
**Phase:** 27-pwa-install-offline
**Areas discussed:** SW generation mode, Update delivery UX, Install identity & icons, Offline behavior & iOS Wake Lock

---

## SW Generation Mode

| Option | Description | Selected |
|--------|-------------|----------|
| generateSW | Workbox auto-generates the SW from a precache glob. Zero custom SW code. Fits no-backend, static-shell, precache-only offline. | ✓ |
| injectManifest | Hand-write `src/sw.ts`; plugin injects the precache manifest. Only worth it for custom runtime caching/routing — out of scope per REQUIREMENTS.md. | |

**User's choice:** generateSW
**Notes:** Runtime caching beyond the app shell is explicitly out of scope, so no custom SW code is needed.

---

## Update Delivery UX

| Option | Description | Selected |
|--------|-------------|----------|
| Silent auto-update | `registerType: 'autoUpdate'`. New SW precaches in background, applies on next app load. Running session untouched. Zero new UI. `cleanupOutdatedCaches` kills stale shell. | ✓ |
| Refresh prompt toast | `registerType: 'prompt'`. Shows a "new version — refresh" toast. Net-new UI; could surface mid-session. | |
| Auto-update, deferred till idle | Auto-update but suppress activation/reload during a session. In practice identical to silent auto-update — extra logic for no observable difference. | |

**User's choice:** Silent auto-update
**Notes:** Satisfies PWA-03's two constraints (never stale, never interrupt) with no net-new UI.

---

## Install Identity & Icons

### short_name

| Option | Description | Selected |
|--------|-------------|----------|
| HRV Breathing | Matches `<title>` and full manifest `name`. May truncate on some launchers. | ✓ |
| HRV | Terse, never truncates. Opaque acronym to a general meditator. | |
| Breathe | Friendly, action-describing. Diverges from the established brand. | |

**User's choice:** HRV Breathing — full brand string, accepting truncation risk.

### Install icon artwork

| Option | Description | Selected |
|--------|-------------|----------|
| Orb on solid bg | Single breathing orb on a solid background, consistent with favicon.svg. Maskable safe-zone variant. | |
| Concentric breathing rings | Inhale/exhale ring motif. Net-new artwork with no codebase reference. | |
| You decide at planning | Defer exact artwork to planner; lock only "static neutral set, maskable + Apple-touch". | ✓ |

**User's choice:** You decide at planning — Claude's discretion (captured in CONTEXT.md as orb-based static set).

### Splash colors (theme_color / background_color)

| Option | Description | Selected |
|--------|-------------|----------|
| Match light palette | `background_color` = light surface, `theme_color` = light accent (`#5e81ac`). Brightest, least jarring. | ✓ |
| Match dark palette | Dark surface + accent. Calmer, but bright-to-dark flash for the light-theme majority. | |
| You decide at planning | Planner picks exact hex from theme.css. | |

**User's choice:** Match light palette

---

## Offline Behavior & iOS Wake Lock

### Offline indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Silent — no indicator | App works offline identically (precached shell, runtime audio). Nothing degrades. Zero new UI. | ✓ |
| Offline banner / toast | "You're offline" notice. Reassuring but arguably noise; net-new UI. | |

**User's choice:** Silent — no indicator

### iOS < 18.4 Wake Lock limitation

| Option | Description | Selected |
|--------|-------------|----------|
| Document-only | Note as known limitation in README / Learn. No runtime detection. Consistent with progressive-enhancement stance. | ✓ |
| Detect + warn | One-time "your screen may sleep" notice in standalone mode with no Wake Lock API. Net-new detection + UI. | |

**User's choice:** Document-only

---

## Claude's Discretion

- Install icon artwork — operator deferred to planning; locked as a static, neutral, orb-based icon set (192/512 PNG + maskable + 180px Apple touch).
- Precache glob scope — generateSW default; planner confirms coverage.

## Deferred Ideas

None — discussion stayed within phase scope.
