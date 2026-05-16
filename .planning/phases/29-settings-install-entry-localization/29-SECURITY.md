---
phase: 29
slug: settings-install-entry-localization
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-16
---

# Phase 29 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser → App.tsx | `beforeinstallprompt` event (via `useBeforeInstallPrompt`) and `isIOS`/`isStandalone` (via `useIsStandaloneOrPhone`) are browser-controlled inputs, surfaced as plain booleans. | Non-sensitive booleans / browser-owned install event |
| App.tsx → SettingsDialog | `isIOS`, `isStandalone`, `installable`, `onInstall` cross as React props — internal, trusted, no user-text payload. | Derived booleans + a function reference |
| parent → IosInstallSteps | `id` prop and `strings` object passed by `InstallBanner` / `SettingsDialog`. Static literals; no user input. | Static string literals + localized copy |

No server, no auth, no network endpoints, no new storage keys. Phase 29 is UI-only composition — same posture as Phase 28 (T-28-08).

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-29-01 | Tampering | IosInstallSteps `id` prop | accept | `id` is a static string literal supplied by the parent (`"install-ios-steps"` / `"settings-ios-steps"`), never user input. Used only as a DOM `id`/`aria-controls` target — no injection surface. | closed |
| T-29-02 | Information Disclosure | strings.ts `settingsLabel` | accept | Static localized UI copy; no PII, no secrets. Rendered as React text content (auto-escaped), not `dangerouslySetInnerHTML`. No XSS surface. | closed |
| T-29-03 | Spoofing / Tampering | `installable` derived boolean | accept | `installable = isIOS \|\| deferredPrompt !== null` — pure derived boolean computed in App.tsx from browser-owned events. No external mutation surface. Worst case is a visible-but-inert install row, handled gracefully (D-07: never a dead button). | closed |
| T-29-04 | Elevation of Privilege | `onInstall` (triggerInstall) prop | accept | `triggerInstall` replays the browser-captured install prompt; the browser, not the app, gates the actual install. No app-side privilege boundary. Button is `disabled` during `inSessionView` (defence-in-depth). | closed |
| T-29-05 | Information Disclosure | PT-BR install copy in strings.ts | accept | Static localized UI copy; no PII, no secrets. Rendered as auto-escaped React text content; no `dangerouslySetInnerHTML`. No new `localStorage` keys. | closed |
| T-29-06 | Denial of Service | iOS steps inline-expand state | accept | `iosExpanded` is component-local boolean state toggled only by the user's own click. No unbounded growth, no external trigger. | closed |
| T-29-07 | Information Disclosure | IosInstallSteps.tsx (29-03) | accept | No data handled. Component renders static localized strings with theme-token CSS classes; no PII, no network, no storage. | closed |
| T-29-08 | Tampering | IosInstallSteps.tsx (29-03) | accept | Class strings are compile-time literals; no runtime-computed class names, no `dangerouslySetInnerHTML`. No injection surface. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

All 8 threats carry an `accept` disposition authored at plan time across 29-01/29-02/29-03 PLAN threat models. Verified: no `dangerouslySetInnerHTML` in `IosInstallSteps.tsx`, `SettingsDialog.tsx`, or `InstallBanner.tsx`; all class/`id` strings are compile-time literals; no new storage keys or network calls introduced by the phase.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-29-01 | T-29-01..08 | Phase 29 is UI-only composition: static localized copy, derived booleans, browser-gated install prompt, component-local toggle state. No PII, no secrets, no server, no auth, no new storage, no `dangerouslySetInnerHTML`. Every threat is a non-exploitable accepted risk — same posture as Phase 28 (T-28-08). | Operator (milestone close) | 2026-05-16 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-16 | 8 | 8 | 0 | Claude (gsd-secure-phase, State B) |

State B run — no prior SECURITY.md. Register reconstructed from 29-01/29-02/29-03 PLAN `<threat_model>` blocks (`register_authored_at_plan_time: true`). All 8 threats disposition `accept`; short-circuit rule applied (`threats_open: 0 AND register_authored_at_plan_time: true`). Accept rationale spot-verified against implementation — no `dangerouslySetInnerHTML`, all literals.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-16
