---
phase: 44
slug: final-polish
status: verified
threats_open: 0
asvs_level: 2
created: 2026-05-25
---

# Phase 44 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Phase 44 is a closeout sweep (POLISH-01..09) across the v2.0 milestone surface (Phases 36–41).
> This security review covers all 3 D-15 attack surfaces:
> 1. **Preview audio path** (`src/audio/previewContext.ts`, Phase 40) — inherits 40-SECURITY.md verbatim (11 threats T-40-01..T-40-11, ASVS L2, status `verified`); zero drift detected at HEAD.
> 2. **Query-string dev toggles** (`?breathingShape=`, `?orbIdle=`, `?switcherIcon=`, Phase 41 J5/J6) — new threat register (T-44-06-01..T-44-06-07).
> 3. **Font asset hosting** (`@fontsource-variable/inter` woff2 via Workbox precache, Phase 41 J2) — new threat register (T-44-06-08..T-44-06-11).
>
> Threat register: 22 total (11 inherited from Phase 40 + 11 new). All 22 dispositioned. `threats_open: 0`.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| user-gesture → AudioContext creation (TimbrePicker preview) | First preview tap chains synchronously into `new AudioContext()` via `playInhalePreview()` → `ensurePreviewContext()` in `src/audio/previewContext.ts`. Browser autoplay-policy gate enforces gesture-attachment. | None — gesture-only signal; no payload crosses this boundary. |
| URL query-string → featureFlags parser → render | `window.location.search` is parsed by `readFeatureFlags(search)` in `src/featureFlags.ts`. Consumed by `useFeatureFlags()` hook (via `useSyncExternalStore`) → `appViewModel.featureFlags` → `PracticeScreen` → `OrbShape`/`NKShape`. | URL-borne strings: `?breathingShape=` (→ `BreathingShapeVariant` union), `?orbIdle=` (→ `OrbIdleBehavior` union), `?switcherIcon=` (→ `boolean`). All parsed case-insensitively with typed defaults on junk input. |
| Network → service-worker (Workbox) → font cache → DOM | `@fontsource-variable/inter` woff2 files are bundled into `dist/` by Vite's CSS pipeline (imported at `src/index.css:1`). Workbox `generateSW` precaches all `*.woff2` files (Latin + Latin-ext subsets; Cyrillic/Greek/Vietnamese excluded via `globIgnores`). Cached and served from same-origin cache storage. | Binary woff2 font payloads; no user data; served from same-origin only. |
| In-process function calls between TS modules | All other v2.0 surface (app views, audio engine, hooks, storage, content). All calls are intra-process, within the same TS trust domain. | TS-narrowed types at every interface. |

---

## Threat Register

*Category codes: S = Spoofing · T = Tampering · R = Repudiation · I = Information Disclosure · D = Denial of Service · E = Elevation of Privilege*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

### Inherited from Phase 40 (Preview Audio Path — T-40-01..T-40-11)

Re-verified 2026-05-25: `src/audio/previewContext.ts` has ONE commit (`9c93da6 feat(40): add previewContext module + unit tests`); NOT touched by Phase 41 or any subsequent commit. ZERO drift. All 11 T-40-* threats apply verbatim.

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-40-01 | T (Tampering) | previewContext.ts module-level `let ctx` singleton | accept | `let ctx` at `src/audio/previewContext.ts:20` is module-private; only export is `playInhalePreview` at line 30. ES module encapsulation prevents external reassignment. No exported setter. Re-verified at HEAD 2026-05-25 — structure unchanged. | closed |
| T-40-02 | I (Information Disclosure) | `playInhalePreview(timbre)` input | accept | `timbre: TimbreId` (narrowed `'bowl' \| 'bell' \| 'sine' \| 'flute'` per `src/domain/settings.ts:107`). TS enforces the narrow type at every call site; `scheduleInCueForTimbre` dispatch table only contains keys for the four enumerated values. No PII, no remote data, no untrusted string flows through. Re-verified at HEAD 2026-05-25. | closed |
| T-40-03 | D (Denial of Service) | rapid-tap polyphonic overlap | accept | cueSynth per-call oscillator + envelope + `osc.addEventListener('ended', …)` explicit-disconnect cleanup (Phase 9 AUDIO-04) at `src/audio/cueSynth.ts:163-177`. Web Audio engines bound oscillator count; pathological tap-storms degrade gracefully. By-design polyphonic overlap per Phase 40 CONTEXT D-08. | closed |
| T-40-04 | E (Elevation of Privilege) | `new AudioContext()` construction | accept | Single construction site at `src/audio/previewContext.ts:25` reached only through `ensurePreviewContext()` → `playInhalePreview()` → `onClick={() => …}` chain at `src/components/TimbrePicker.tsx:56`. Browser autoplay policy refuses non-gesture construction. Same invariant as Phase 5/5.1 / Phase 9 audio creation. | closed |
| T-40-05 | T (Tampering) | previewContext.ts source text | mitigate | Drift-guard `src/audio/previewContext.no-audioengine-import.test.ts:34-55` scans the source via `readFileSync` with regex ban-list (3 patterns: `./audioEngine`, `../audio/audioEngine`, `../hooks/useAudioCues`). Verified — `npx vitest run src/audio/previewContext.no-audioengine-import.test.ts` exits 0; any future audioEngine import fails the per-commit green gate. | closed |
| T-40-06 | I (Information Disclosure) | `readFileSync` call in drift-guard | accept | Hard-coded sibling path `resolve(__dirname, 'previewContext.ts')` at `src/audio/previewContext.no-audioengine-import.test.ts:29`. No user input, no path traversal surface. | closed |
| T-40-07 | E (Elevation of Privilege) | drift-guard bypass via comment / string literal | accept | Regex (`/from\s+['"]\.\/audioEngine['"]/`) is plain-text — matches commented-out imports and string literals too. Over-locks rather than under-locks (false-positive-leaning, not false-negative-leaning). Deleting the test is the documented unlock; bypass via syntax tricks remains detectable in code review. | closed |
| T-40-08 | T (Tampering) | TimbrePicker onClick handler call order | accept | Synchronous two-call sequence `setTimbre(id); playInhalePreview(id)` at `src/components/TimbrePicker.tsx:56`. Order enforced by JS sequence; no async race. TS narrowing on `id: TimbreId` (via `TIMBRE_OPTIONS.map((id: TimbreId) => …)` at line 42) prevents arbitrary string payloads. | closed |
| T-40-09 | E (Elevation of Privilege) | bypass of `disabled={inSessionView}` | accept | Button carries `disabled={disabled}` at `src/components/TimbrePicker.tsx:55`; browser refuses to fire click events on `<button disabled>`. Phase 15 INFRA-04 / Phase 18 D-17 invariant. PREV-04 regression-lock at test level via `'when disabled=true, clicking a button does NOT invoke playInhalePreview'` in `src/components/TimbrePicker.test.tsx:143`. | closed |
| T-40-10 | D (Denial of Service) | spam-tap audio surface (UI side) | accept | Same disposition as T-40-03 — bounded by cueSynth's per-call envelope + explicit-disconnect `ended` cleanup. No new attack surface introduced by the UI wiring. | closed |
| T-40-11 | n/a (doc artifact) | `.planning/phases/40-timbre-preview-cue/40-HUMAN-UAT.md` | accept | Doc artifact with no executable surface, no input handling, no network or storage interaction. The only "threat" — operator skipping the iOS Safari item — is mitigated by the explicit HIGH-SIGNAL label in item 4 of the UAT. | closed |

### New — Query-String Dev Toggles (Phase 41 J5/J6 — T-44-06-01..T-44-06-07)

Entry point: `src/featureFlags.ts` `readFeatureFlags(search: string): FeatureFlags`. Consumed via `src/hooks/useFeatureFlags.ts` → React component tree → `PracticeScreen.tsx` → `OrbShape`/`NKShape`.

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-44-06-01 | T (Tampering) | `readQueryFeatureFlag`: malformed / adversarial query string | mitigate | `new URLSearchParams(search)` at `src/featureFlags.ts:50` handles malformed input safely — URLSearchParams is a platform API that tolerates arbitrary byte sequences (percent-encoded or raw). Invalid `?breathingShape=INVALID` → `parse()` returns `null` → `spec.defaultValue` (`'orb-halo'`) is used. All three `parse()` implementations (`breathingShape`, `orbIdle`, `switcherIcon`) return `null` on unrecognized input; callers fall back to the typed default. No crash path. Verified: `src/featureFlags.test.ts` covers the `null`-→-default fallback. | closed |
| T-44-06-02 | T (Tampering) | Query parameter triggers unexpected feature flag combination (`?breathingShape=minimal-rings&?orbIdle=ambient`) | accept | All flag combinations are independently parsed; the render path (`OrbShape`/`NKShape`) handles all valid enum combinations. No combination causes a crash or security-relevant unexpected state — the flags are purely visual render-mode switches with no data model impact, no storage writes, and no audio-engine coupling. Visual rendering is self-contained within the component. | closed |
| T-44-06-03 | S (Spoofing) | Adversarial URL shared to mass-apply dev orb variant to unsuspecting user | accept | Flags are visual-only (`BreathingShapeVariant` → orb render mode, `OrbIdleBehavior` → idle animation). No data exfiltration, no persistent state change (flags re-read from URL on each navigation event via `useSyncExternalStore` + `popstate`; removing the query param restores default). Impact is purely cosmetic (the user sees a different orb shape). Severity: low. A user noticing the URL looks unusual is the available detection. | closed |
| T-44-06-04 | I (Information Disclosure) | URL parameters appear in browser history / referrer headers / shared screenshots | accept | Flag values (`breathingShape`, `orbIdle`, `switcherIcon`) are visual mode names — not secrets, not PII, not session tokens. Disclosure risk: negligible. The parameters exist explicitly to be shareable (per Phase 41 J5 operator decision: "query-string so variants can be toggled per-tab without a rebuild"). | closed |
| T-44-06-05 | D (Denial of Service) | Extremely long or high-cardinality query string causes parser performance degradation | accept | `new URLSearchParams(search)` is a native platform implementation with O(N) parse complexity bounded by the browser's URL length limit (~2 MB practical; typically 8 KB enforced by servers). The app reads only 3 named parameters and ignores all others. No risk of quadratic blowup or regex backtracking (no regex is used in the URL parsing). | closed |
| T-44-06-06 | I (Information Disclosure) | `useFeatureFlags` hook via `useSyncExternalStore` — does subscribing to `popstate` leak navigation events? | accept | `window.addEventListener('popstate', onStoreChange)` at `src/hooks/useFeatureFlags.ts:6` is a standard React `useSyncExternalStore` subscription pattern. The handler only signals `onStoreChange()` (no event object is read, no URL is logged). No sensitive navigation data leaves the component. The subscription is removed on unmount (`removeEventListener` in the returned cleanup function at line 8). | closed |
| T-44-06-07 | E (Elevation of Privilege) | Query-string boolean flag `?switcherIcon=1` enables a hidden UI element accessible only via URL | accept | `switcherIcon` controls display of the practice-switcher icon (a visual toggle for a pre-existing UI control). No privilege boundary is crossed — the icon is a navigation affordance that already exists in the app; the flag only controls its visibility. No restricted functionality is unlocked; no auth bypass; no capability the user did not already possess via normal navigation is granted. | closed |

### New — Font Asset Hosting (Phase 41 J2 — T-44-06-08..T-44-06-11)

Entry point: `src/index.css:1` `@import '@fontsource-variable/inter'`. Workbox precache config at `vite.config.ts:80-86`.

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-44-06-08 | T (Tampering) | woff2 file integrity in Workbox precache | mitigate | Workbox `generateSW` (via `vite-plugin-pwa`) computes a content hash for each precached asset at build time. The generated service worker (`sw.js`) checks the hash on install and rejects assets with hash mismatches. Glob pattern at `vite.config.ts:81` includes `*.woff2`; Workbox injects integrity metadata per-asset into the precache manifest. An attacker who could tamper with the cached woff2 would need to bypass same-origin cache storage — which requires same-origin code execution (already a game-over condition). | closed |
| T-44-06-09 | I (Information Disclosure) | `@fontsource-variable/inter` is a public package — does self-hosting reveal user data? | accept | The font is served as a static asset from the same origin. No external font service is contacted (Google Fonts or equivalent). No user identifier, session token, or request metadata is sent to a third party. Self-hosting explicitly eliminates the Google Fonts third-party information-disclosure risk. | closed |
| T-44-06-10 | D (Denial of Service) | Font payload size impacts initial load / Time-to-Interactive | accept | Latin + Latin-ext subsets only are precached (Cyrillic/Greek/Vietnamese excluded at `vite.config.ts:85` via `globIgnores`). Phase 41 J2 established the 514.18 KiB total precache figure. The font payload is bounded and fits well within PWA performance budgets. POLISH-08 confirms zero net-new runtime deps; the font is classified as an asset, consistent with Phase 41 disposition. | closed |
| T-44-06-11 | S (Spoofing) | Supply-chain risk on `@fontsource-variable/inter` npm package | accept | `@fontsource-variable/inter` is a well-established npm package (Fontsource project) distributing the SIL Open Font License Inter typeface. Package integrity is pinned via `package-lock.json` (SHA-512 integrity hash for the exact version installed). npm signature verification and registry trust chain apply. The package ships only woff2 font files and CSS `@font-face` declarations — zero executable code surface. Risk category: low (static font asset from established OFL project). | closed |

---

## Accepted Risks Log

*Inherited from Phase 40 (AR-40-*)* and *new in Phase 44-06 (AR-44-06-*)*

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-40-01 | T-40-01 | Module-private `let ctx` singleton at `previewContext.ts:20`; only export is `playInhalePreview`. ES module encapsulation prevents external reassignment. | gsd-security-auditor | 2026-05-21 |
| AR-40-02 | T-40-02 | TS-narrowed `TimbreId` union (`'bowl' \| 'bell' \| 'sine' \| 'flute'`) at `src/domain/settings.ts:107`. No PII, no remote data, no untrusted string flows. | gsd-security-auditor | 2026-05-21 |
| AR-40-03 | T-40-03 | cueSynth `ended` listener + explicit disconnect at `cueSynth.ts:163-177` bounds oscillator graph. By-design polyphonic overlap per Phase 40 CONTEXT D-08. | gsd-security-auditor | 2026-05-21 |
| AR-40-04 | T-40-04 | `new AudioContext()` at `previewContext.ts:25` only reachable through user-gesture onClick chain (TimbrePicker.tsx:56). Browser autoplay policy enforces gesture-attached construction. | gsd-security-auditor | 2026-05-21 |
| AR-40-06 | T-40-06 | `readFileSync` path is hard-coded sibling via `resolve(__dirname, 'previewContext.ts')` — no user input, no traversal surface. | gsd-security-auditor | 2026-05-21 |
| AR-40-07 | T-40-07 | Drift-guard regex over-locks: matches commented imports and string literals too. False-positive-leaning is the desired posture; bypass attempts remain visible in code review. | gsd-security-auditor | 2026-05-21 |
| AR-40-08 | T-40-08 | Synchronous JS call sequence `setTimbre(id); playInhalePreview(id)` at TimbrePicker.tsx:56; TS narrowing on `id: TimbreId` prevents arbitrary payloads. | gsd-security-auditor | 2026-05-21 |
| AR-40-09 | T-40-09 | Browser-enforced `<button disabled>` semantics block onClick when `disabled={inSessionView}` is true. Phase 15 INFRA-04 / Phase 18 D-17 invariant; test-level regression lock at TimbrePicker.test.tsx:143 (D-10(f)). | gsd-security-auditor | 2026-05-21 |
| AR-40-10 | T-40-10 | Same disposition as AR-40-03; UI wiring does not introduce new audio resource surface beyond cueSynth's bounded oscillator graph. | gsd-security-auditor | 2026-05-21 |
| AR-40-11 | T-40-11 | Doc-only artifact (`40-HUMAN-UAT.md`); no executable surface. Operator-skip risk mitigated by HIGH-SIGNAL label on item 4. | gsd-security-auditor | 2026-05-21 |
| AR-44-06-01 | T-44-06-02 | All feature flag combinations are independently parsed; all are purely visual with no data model impact, no storage writes, no audio-engine coupling. | gsd-security-auditor | 2026-05-25 |
| AR-44-06-02 | T-44-06-03 | Visual-only impact (orb shape/animation). No data exfiltration, no persistent state change, no PII. Low severity; removable by the user by editing the URL. | gsd-security-auditor | 2026-05-25 |
| AR-44-06-03 | T-44-06-04 | Flag values are visual mode names — not secrets, not PII, not session tokens. Explicit design intent is shareability (Phase 41 J5 operator decision). | gsd-security-auditor | 2026-05-25 |
| AR-44-06-04 | T-44-06-05 | URLSearchParams native API; reads only 3 named parameters; no regex; bounded by browser URL length limits. | gsd-security-auditor | 2026-05-25 |
| AR-44-06-05 | T-44-06-06 | `popstate` handler reads no event data; signals only; cleanup removes the listener on unmount. Standard React `useSyncExternalStore` pattern. | gsd-security-auditor | 2026-05-25 |
| AR-44-06-06 | T-44-06-07 | `switcherIcon` reveals a pre-existing UI affordance; no privilege boundary crossed; no restricted functionality unlocked. | gsd-security-auditor | 2026-05-25 |
| AR-44-06-07 | T-44-06-09 | Self-hosted font; no third-party request; no user data transmitted. | gsd-security-auditor | 2026-05-25 |
| AR-44-06-08 | T-44-06-10 | Latin + Latin-ext subsets only precached; bounded payload; consistent with Phase 41 asset classification. | gsd-security-auditor | 2026-05-25 |
| AR-44-06-09 | T-44-06-11 | Established OFL font package; `package-lock.json` integrity pin; zero executable code surface. | gsd-security-auditor | 2026-05-25 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-21 | 11 | 11 | 0 | gsd-security-auditor (ASVS L2) — Phase 40 original audit |
| 2026-05-25 | 22 | 22 | 0 | gsd-security-auditor (ASVS L2) — Phase 44 POLISH-06 cumulative re-audit; 11 inherited (T-40-* re-verified at HEAD) + 11 new (T-44-06-01..T-44-06-11) |

---

## Unregistered Threat Flags

None. Phase 44 POLISH-01..09 sweep adds no new network endpoints, auth paths, file access patterns, or schema changes beyond the 3 D-15 attack surfaces already registered above. The code-review sweep (POLISH-01), test cleanup (POLISH-03), comment audit (POLISH-04), refactor pass (POLISH-05), and readability sweep (POLISH-07) are doc/style/test-only changes — zero new executable surface.

---

## Sign-Off

- [x] All 22 threats have a disposition (mitigate / accept / transfer) — 3 mitigate, 19 accept, 0 transfer.
- [x] All `mitigate` dispositions cite specific implementation: T-40-05 → drift-guard file + regex + line numbers; T-44-06-01 → `readQueryFeatureFlag` null-→-default fallback + test file; T-44-06-08 → Workbox `generateSW` integrity hash + `globPatterns` line in `vite.config.ts`.
- [x] Accepted risks documented in Accepted Risks Log (19 entries matching `accept` dispositions above).
- [x] `threats_open: 0` confirmed.
- [x] `status: verified` set in frontmatter.
- [x] Surface #1 (preview audio path) re-verified at HEAD: zero drift from 40-SECURITY.md analyzed surface.
- [x] Surface #2 (query-string dev toggles) new register: T-44-06-01..T-44-06-07 (7 threats, all closed).
- [x] Surface #3 (font asset hosting) new register: T-44-06-08..T-44-06-11 (4 threats, all closed).

**Approval:** verified 2026-05-25
