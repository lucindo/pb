---
phase: 28
slug: phone-install-banner
status: secured
threats_open: 0
threats_closed: 9
asvs_level: 1
created: 2026-05-16
---

# SECURITY.md — Phase 28: Phone Install Banner

**Audited:** 2026-05-16
**ASVS Level:** 1
**Threats Closed:** 9/9
**Threats Open:** 0

---

## Threat Verification

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-28-01 | Tampering | mitigate | CLOSED | `src/storage/installDismissed.ts:17` — `=== 'true'` strict-equals comparison; no `eval`/`JSON.parse`; catch returns `false` |
| T-28-02 | Denial of Service | accept | CLOSED | See Accepted Risks log below |
| T-28-03 | Information Disclosure | accept | CLOSED | See Accepted Risks log below |
| T-28-04 | Spoofing | accept | CLOSED | See Accepted Risks log below |
| T-28-05 | Tampering | mitigate | CLOSED | `src/hooks/useBeforeInstallPrompt.ts:69` — `await deferredPrompt.prompt()` called directly with no intervening async work; `triggerInstall` is a `useCallback` invoked from `onClick` in `InstallBanner.tsx:58` via `void onInstall()` |
| T-28-06 | Elevation of Privilege | accept | CLOSED | See Accepted Risks log below |
| T-28-07 | Spoofing | mitigate | CLOSED | `src/components/InstallBanner.tsx` — no `position: fixed/absolute`, no `z-index`, no `pointer-events` class; banner mounted in normal document flow at `src/app/App.tsx:794` between `</section>` (line 790) and `</main>` (line 819) |
| T-28-08 | Tampering | mitigate | CLOSED | `src/app/App.tsx:200` — `showBanner` is a pure derived `const` boolean (`isPhone && !isStandalone && !installDismissed && appPhase === 'idle' && (isIOS \|\| deferredPrompt !== null)`); no external mutation surface; `installDismissed` tamper handling covered by T-28-01 |
| T-28-09 | Information Disclosure | accept | CLOSED | See Accepted Risks log below |

---

## Mitigate Threat Detail

### T-28-01 — Tampering: installDismissed.ts read path

**Mitigation verified at:** `src/storage/installDismissed.ts:17`

```
return window.localStorage.getItem(INSTALL_DISMISSED_KEY) === 'true'
```

Strict string equality (`=== 'true'`). Any value other than the literal string `'true'` — including injected JSON, script fragments, numeric strings, or boolean-coercible strings — resolves to `false`. The `catch` branch (line 18-20) also returns `false`, preventing a thrown exception from being interpreted as `true`. No `eval`, `JSON.parse`, or type coercion is present in the file.

### T-28-05 — Tampering: triggerInstall() user-gesture chain

**Mitigation verified at:** `src/hooks/useBeforeInstallPrompt.ts:66-76`

`triggerInstall` is an `async` `useCallback`. The first operation after the null-guard is `await deferredPrompt.prompt()` — no other async work, timers, or intermediate awaits precede it. The call site in `src/components/InstallBanner.tsx:58` is `onClick={() => { void onInstall() }}`, a direct synchronous click handler. No wrapper component or intermediary delays the gesture.

### T-28-07 — Spoofing: InstallBanner clickjacking

**Mitigation verified at:** `src/components/InstallBanner.tsx` (full file) and `src/app/App.tsx:790-801`

Grep for `position`, `fixed`, `absolute`, `z-index`, `pointer-events`, `z-[` in `InstallBanner.tsx` returns zero matches. The component's outer `<div>` uses only `mt-6 border-t … bg-… px-4 py-2` — flow layout, no stacking context manipulation. JSX mount point is after `</section>` (line 790) and before `</main>` (line 819), confirming normal document flow placement (D-02).

### T-28-08 — Tampering: App.tsx showBanner gate

**Mitigation verified at:** `src/app/App.tsx:200`

```
const showBanner = isPhone && !isStandalone && !installDismissed && appPhase === 'idle' && (isIOS || deferredPrompt !== null)
```

`showBanner` is a `const` expression derived from React state, hook outputs, and `appPhase` (also React state). There is no `ref`, `window` property, or imperative setter that could mutate `showBanner` from outside the React render cycle. The five inputs are all typed booleans or `null`-checked values with no coercion path.

---

## Accepted Risks Log

| Threat ID | Category | Rationale |
|-----------|----------|-----------|
| T-28-02 | Denial of Service — localStorage throwing | `loadInstallDismissed` and `saveInstallDismissed` wrap all localStorage access in try/catch (D-16/D-17). Worst case: banner re-appears after a blocked write. No crash, no data loss, no PII. Low impact, fully accepted. |
| T-28-03 | Information Disclosure — hrv:install-dismissed key | The stored value is the single non-sensitive boolean string `'true'`. Any same-origin script can read it; it reveals no user data, no secrets, and nothing beyond the fact that the banner was dismissed. Fully accepted. |
| T-28-04 | Spoofing — synthetic beforeinstallprompt event | `beforeinstallprompt` is a browser-runtime-only event. A same-origin script could synthesize an `Event` and set a fake `prompt()` method, but `prompt()` on a synthetic object produces no native dialog and no privilege gain. No secrets exposed, no harm possible. Fully accepted. |
| T-28-06 | Elevation of Privilege — install prompt | PWA installation is a browser-native capability gated by OS-level user confirmation. The app cannot install itself; it only forwards the browser-held `BeforeInstallPromptEvent`. No app-side privilege to elevate. Fully accepted. |
| T-28-09 | Information Disclosure — InstallBanner UI | The banner renders only static localized copy (`strings` prop from `UiStrings.install`) and the public app icon (`pwa-192x192.png`). No user data, session state, or secrets are rendered. Fully accepted. |

---

## Unregistered Flags

None. All three SUMMARY.md files (`28-01`, `28-02`, `28-03`) report no Threat Flags.

---

## Audit Scope

**Phase:** 28 — Phone Install Banner (Plans 01, 02, 03)
**Files audited:**
- `src/storage/installDismissed.ts`
- `src/hooks/useBeforeInstallPrompt.ts`
- `src/hooks/useIsStandaloneOrPhone.ts`
- `src/components/InstallBanner.tsx`
- `src/app/App.tsx` (banner integration section)
- `src/content/strings.ts` (referenced; strings-only, no security surface)
