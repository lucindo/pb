---
phase: 40
slug: timbre-preview-cue
status: verified
threats_open: 0
asvs_level: 2
created: 2026-05-21
---

# Phase 40 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Phase 40 ships a pure Web Audio preview module (`src/audio/previewContext.ts`) wired into the
> `TimbrePicker` onClick handler, locked structurally by an import-graph drift-guard, and
> validated empirically by `40-HUMAN-UAT.md`. All threats discharge to `mitigate` (one) or
> `accept` (ten) with rationale validated against the implementation on disk.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| user-gesture → AudioContext creation | First TimbrePicker onClick chains synchronously into `new AudioContext()`. The browser autoplay-policy gate enforces gesture-attachment. | None (no payload — gesture-only signal) |
| previewContext module → cueSynth module | In-process function call between two pure-audio modules; both live in the same TS trust domain. | `AudioContext`, `currentTime`, `destination`, `TimbreId` (TS-narrowed union) |
| React component → previewContext module | Synchronous call from TimbrePicker.tsx:56 (`onClick={() => { setTimbre(id); playInhalePreview(id) }}`). Same trust domain. | `TimbreId` (TS-narrowed union) |
| test file → previewContext.ts (file-I/O) | `previewContext.no-audioengine-import.test.ts` reads `previewContext.ts` via `readFileSync(resolve(__dirname, 'previewContext.ts'))`. Internal, repo-only path. | UTF-8 source text |
| operator → real hardware | `40-HUMAN-UAT.md` items run on iOS Safari / desktop. Doc-only artifact; no executable surface. | n/a |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-40-01 | T (Tampering) | previewContext.ts module-level `let ctx` singleton | accept | `let ctx` at `src/audio/previewContext.ts:20` is module-private; only export is `playInhalePreview` at line 30. ES module encapsulation prevents external reassignment. No exported setter. | closed |
| T-40-02 | I (Information disclosure) | `playInhalePreview(timbre)` input | accept | `timbre: TimbreId` (narrowed `'bowl' \| 'bell' \| 'sine' \| 'flute'` per `src/domain/settings.ts:107`). TS enforces the narrow type at every call site; `scheduleInCueForTimbre` dispatch table only contains keys for the four enumerated values. No PII, no remote data, no untrusted string flows through. | closed |
| T-40-03 | D (Denial of service) | rapid-tap polyphonic overlap | accept | cueSynth per-call oscillator + envelope + `osc.addEventListener('ended', …)` explicit-disconnect cleanup (Phase 9 AUDIO-04) at `src/audio/cueSynth.ts:163-177`. Web Audio engines bound oscillator count; pathological tap-storms degrade gracefully. By-design polyphonic overlap per CONTEXT D-08. | closed |
| T-40-04 | E (Elevation of privilege) | `new AudioContext()` construction | accept | Single construction site at `src/audio/previewContext.ts:25` reached only through `ensurePreviewContext()` → `playInhalePreview()` → `onClick={() => …}` chain at `src/components/TimbrePicker.tsx:56`. Browser autoplay policy refuses non-gesture construction. Same invariant as Phase 5/5.1 / Phase 9 audio creation. | closed |
| T-40-05 | T (Tampering) | previewContext.ts source text | mitigate | Drift-guard `src/audio/previewContext.no-audioengine-import.test.ts:34-55` scans the source via `readFileSync` with regex ban-list (3 patterns: `./audioEngine`, `../audio/audioEngine`, `../hooks/useAudioCues`). Verified — `npx vitest run src/audio/previewContext.no-audioengine-import.test.ts` exits 0; any future audioEngine import fails the per-commit green gate. | closed |
| T-40-06 | I (Information disclosure) | `readFileSync` call in drift-guard | accept | Hard-coded sibling path `resolve(__dirname, 'previewContext.ts')` at `src/audio/previewContext.no-audioengine-import.test.ts:29`. No user input, no path traversal surface. | closed |
| T-40-07 | E (Elevation of privilege) | drift-guard bypass via comment / string literal | accept | Regex (`/from\s+['"]\.\/audioEngine['"]/`) is plain-text — matches commented-out imports and string literals too. Over-locks rather than under-locks (false-positive-leaning, not false-negative-leaning). Deleting the test is the documented unlock; bypass via syntax tricks remains detectable in code review. | closed |
| T-40-08 | T (Tampering) | TimbrePicker onClick handler call order | accept | Synchronous two-call sequence `setTimbre(id); playInhalePreview(id)` at `src/components/TimbrePicker.tsx:56`. Order enforced by JS sequence; no async race. TS narrowing on `id: TimbreId` (via `TIMBRE_OPTIONS.map((id: TimbreId) => …)` at line 42) prevents arbitrary string payloads. | closed |
| T-40-09 | E (Elevation of privilege) | bypass of `disabled={inSessionView}` | accept | Button carries `disabled={disabled}` at `src/components/TimbrePicker.tsx:55`; browser refuses to fire click events on `<button disabled>`. Phase 15 INFRA-04 / Phase 18 D-17 invariant in production since 2026-05-15 without regression. PREV-04 regression-lock at the test level via D-10(f) test `'when disabled=true, clicking a button does NOT invoke playInhalePreview'` in `src/components/TimbrePicker.test.tsx:143`. | closed |
| T-40-10 | D (Denial of service) | spam-tap audio surface (UI side) | accept | Same disposition as T-40-03 — bounded by cueSynth's per-call envelope + explicit-disconnect `ended` cleanup. No new attack surface introduced by the UI wiring. | closed |
| T-40-11 | n/a (doc artifact) | `.planning/phases/40-timbre-preview-cue/40-HUMAN-UAT.md` | accept | Doc artifact with no executable surface, no input handling, no network or storage interaction. The only "threat" — operator skipping the iOS Safari item — is mitigated by the explicit HIGH-SIGNAL label in item 4 of the UAT. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-40-01 | T-40-01 | Module-private `let ctx` singleton at `previewContext.ts:20`; only export is `playInhalePreview`. ES module encapsulation prevents external reassignment. Same pattern as cueSynth, audioEngine, useTimbreChoice. | gsd-security-auditor | 2026-05-21 |
| AR-40-02 | T-40-02 | TS-narrowed `TimbreId` union (`'bowl' \| 'bell' \| 'sine' \| 'flute'`) at `src/domain/settings.ts:107`. No PII, no remote data, no untrusted string flows. | gsd-security-auditor | 2026-05-21 |
| AR-40-03 | T-40-03 | cueSynth `ended` listener + explicit disconnect at `cueSynth.ts:163-177` bounds oscillator graph. By-design polyphonic overlap per CONTEXT D-08. | gsd-security-auditor | 2026-05-21 |
| AR-40-04 | T-40-04 | `new AudioContext()` at `previewContext.ts:25` only reachable through user-gesture onClick chain (TimbrePicker.tsx:56). Browser autoplay policy enforces gesture-attached construction. | gsd-security-auditor | 2026-05-21 |
| AR-40-06 | T-40-06 | `readFileSync` path is hard-coded sibling via `resolve(__dirname, 'previewContext.ts')` — no user input, no traversal surface. | gsd-security-auditor | 2026-05-21 |
| AR-40-07 | T-40-07 | Drift-guard regex over-locks: matches commented imports and string literals too. False-positive-leaning is the desired posture; bypass attempts remain visible in code review. | gsd-security-auditor | 2026-05-21 |
| AR-40-08 | T-40-08 | Synchronous JS call sequence `setTimbre(id); playInhalePreview(id)` at TimbrePicker.tsx:56; TS narrowing on `id: TimbreId` prevents arbitrary payloads. | gsd-security-auditor | 2026-05-21 |
| AR-40-09 | T-40-09 | Browser-enforced `<button disabled>` semantics block onClick when `disabled={inSessionView}` is true. Phase 15 INFRA-04 / Phase 18 D-17 invariant; test-level regression lock at TimbrePicker.test.tsx:143 (D-10(f)). | gsd-security-auditor | 2026-05-21 |
| AR-40-10 | T-40-10 | Same disposition as AR-40-03; UI wiring does not introduce new audio resource surface beyond cueSynth's bounded oscillator graph. | gsd-security-auditor | 2026-05-21 |
| AR-40-11 | T-40-11 | Doc-only artifact (`40-HUMAN-UAT.md`); no executable surface. Operator-skip risk mitigated by HIGH-SIGNAL label on item 4. | gsd-security-auditor | 2026-05-21 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-21 | 11 | 11 | 0 | gsd-security-auditor (ASVS L2) |

---

## Unregistered Threat Flags

None. SUMMARY checks:
- `40-01-SUMMARY.md` "Threat Surface Scan" section: "No new network endpoints, auth paths, file access patterns, or schema changes introduced … No additions to the threat register beyond the four accepted items."
- `40-02-SUMMARY.md`: no "Threat Flags" section emitted (drift-guard test only; no new attack surface).
- `40-03-SUMMARY.md`: no "Threat Flags" section emitted (3-line surgical edit + 3 wiring tests; no new attack surface).
- `40-04-SUMMARY.md` "Threat Flags" section: "None — doc-only file; no executable surface, no network or storage interaction, no STRIDE threats apply (T-40-11 in plan threat register confirms this)."

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer) — 1 mitigate, 10 accept, 0 transfer.
- [x] Accepted risks documented in Accepted Risks Log (10 entries; T-40-05 is `mitigate`, not `accept`, and is closed-on-verification of the drift-guard).
- [x] `threats_open: 0` confirmed.
- [x] `status: verified` set in frontmatter.

**Approval:** verified 2026-05-21
