---
milestone: v1.0.1
milestone_name: Code Review Patch
source: REVIEW.md (full-codebase deep review, 2026-05-11)
total_requirements: 27
maps_findings: 26
last_updated: 2026-05-11
---

# Milestone v1.0.1 Requirements — Code Review Patch

All requirements derive from `REVIEW.md` (full-codebase deep review, 2026-05-11 — 5 Critical / 12 Warning / 9 Info / 26 findings). Each REQ-ID maps to one or more findings via the `Source` field. No new user-facing features. Patch must keep 363/363 Vitest tests passing (additive test updates allowed; behavior changes that intentionally tighten contracts must add tests).

## Build / Type Safety

- [ ] **BUILD-01**: `tsconfig.app.json` and `tsconfig.node.json` enable `strict: true` plus `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`. All resulting compiler errors are fixed inline.
  Source: CR-05.
- [ ] **BUILD-02**: `eslint.config.js` includes `tseslint.configs.strictTypeChecked` (or `stylisticTypeChecked` at minimum) with `parserOptions.project` wired up so type-aware rules run. Resulting lint errors are fixed inline.
  Source: IN-08.
- [ ] **BUILD-03**: `react-hooks/exhaustive-deps` is enforced at `error` level in `eslint.config.js`; an audit of existing `// eslint-disable` comments confirms each is justified (or removed).
  Source: IN-09.

## Assets

- [ ] **ASSETS-01**: Favicon resolves under Vite `base: '/hrv/'` in production builds (no `/favicon.svg` 404). Verified by inspecting the built `dist/index.html` href.
  Source: CR-01.

## Storage

- [ ] **STORAGE-01**: `readEnvelope` preserves the on-disk `version` field instead of overwriting it with the running build's `STATE_VERSION`. Unknown disk fields pass through to callers when forward-compatible.
  Source: CR-02 (read-side).
- [ ] **STORAGE-02**: `writeEnvelope` refuses to write when the on-disk envelope's `version` is greater than the running build's `STATE_VERSION` (no silent schema downgrade).
  Source: CR-02 (write-side).
- [ ] **STORAGE-03**: A `storage` event listener on the App keeps stats display consistent across tabs when another tab writes the envelope. (Increment-race documented; UI consistency restored.)
  Source: WR-07.

## Audio

- [ ] **AUDIO-01**: `useAudioCues.reconstructEngine` stamps a generation counter on each reconstruction and bails out (closing the new engine) if the generation changed during the `await createAudioEngine(...)`. `stop()` and unmount cleanup bump the same generation.
  Source: CR-03.
- [ ] **AUDIO-02**: The boundary effect clamps `audioTime` to `engine.now() + SAFE_LEAD_SEC` (≈ 5 ms) before scheduling cues, so post-resume past-time schedules never silently drop.
  Source: WR-02.
- [ ] **AUDIO-03**: `audioEngine.scheduleLeadIn` returns `null` when the engine is `closed` (instead of a meaningless projected time); the caller propagates the null up to `useAudioCues.start`'s existing `number | null` return.
  Source: WR-10.
- [ ] **AUDIO-04**: `cueSynth.scheduleBowlCue` explicitly disconnects partial nodes (gain → filter → envelope) via `osc.onended` to avoid retaining the partial-chain graph after `osc.stop()` resolves.
  Source: WR-11.
- [ ] **AUDIO-05**: `useAudioCues.handleStateChange` is defensive against `engineRef.current === null` for any future branch it reads. Either: (a) make the body null-safe end-to-end, or (b) defer `addEventListener('statechange')` until after the WR-06 resume completes.
  Source: WR-12.
- [ ] **AUDIO-06**: Remove the dead `'starting'` member from `AudioStatus` (or surface it to UI). It is set transiently inside `start()` and overwritten before any render observes it.
  Source: IN-03.

## Wake Lock

- [ ] **WAKELOCK-01**: `useWakeLock.request()` guards against concurrent acquisitions via an in-flight ref; second caller no-ops until first resolves. If `release()` / unmount ran during the await, the freshly-acquired sentinel is released cleanly.
  Source: CR-04.

## Hooks / Effect Hygiene

- [ ] **HOOKS-01**: `useAudioCues.start()` and `reconstructEngine` read mute state via a `mutedRef` (updated by an effect on `[muted]`) so their `useCallback` deps no longer include `muted` — `onStartClick` identity stabilizes across mute toggles.
  Source: WR-03.
- [ ] **HOOKS-02**: The App effect that cleans up audio/wake-lock/lead-in on leaving `running` depends on `state.status` (and other primitives) — not `state`. The running-snapshot writer is moved off React effects (ref-write from inside `useSessionEngine` or via `useEvent`-style stable callback).
  Source: WR-04.
- [ ] **HOOKS-03**: `useSessionEngine.currentFrame` returns the same memoized frame object across renders within the same `cycleIndex:phase`. A separate `liveFrame` (or equivalent) carries per-rAF `phaseProgress` for `BreathingShape` consumers that need it.
  Source: WR-05.
- [ ] **HOOKS-04**: `useSessionEngine`'s rAF loop short-circuits on `cancelled` at the top of `tick()` so an extra rAF firing after teardown returns immediately.
  Source: WR-06.
- [ ] **HOOKS-05**: The `sessionFrameRef`-updater effect at `App.tsx:80-82` declares explicit deps `[session.currentFrame]` (no missing dep array) and passes `react-hooks/exhaustive-deps`.
  Source: IN-01.

## Domain

- [ ] **DOMAIN-01**: `extendTimedSession` validates `durationMinutes` against `DURATION_OPTIONS` at the boundary (explicit throw OR narrow parameter type to `DurationOption`) rather than discovering invalidity via thrown `RangeError` inside `createBreathingPlan`.
  Source: WR-01.

## UI Contracts

- [ ] **UI-01**: `SessionReadout` has an explicit contract for the lead-in placeholder case (idle status + non-null frame): either a `'lead-in'` value on `status` or an `isLeadInPlaceholder` prop, with the contract documented in `SessionReadoutProps` JSDoc and tested.
  Source: WR-08.
- [ ] **UI-02**: `LearnDialog` and `ResetStatsDialog` cannot remain open when the session view becomes active. App-level effect closes both on `inSessionView` transition.
  Source: WR-09.

## Accessibility

- [ ] **A11Y-01**: `MuteToggle` carries semantically correct attributes when `needsResume` is true: `aria-pressed` removed, `aria-describedby` linked to the App-level `aria-live` resume hint region (or equivalent). Verified by Testing Library assertions.
  Source: IN-06.

## Content

- [ ] **CONTENT-01**: The "Mastering Meditation" link in `learnContent.ts` either uses a canonical `amazon.com/dp/...` URL OR `LearnDialog` discloses the affiliate relationship so the existing "Not affiliated with Forrest Knutson" disclaimer remains accurate.
  Source: IN-07.

## Hygiene

- [ ] **HYGIENE-01**: `useAudioCues` no longer returns `audioNow` (unused by `App.tsx`); the type and return tuple are pruned.
  Source: IN-02.
- [ ] **HYGIENE-02**: `validateSettings` (`src/domain/settings.ts`) and `coerceSettings` (`src/storage/settings.ts`) share `isValidBpm` / `isValidRatio` / `isValidDuration` predicates exported from `src/domain/settings.ts`.
  Source: IN-04.
- [ ] **HYGIENE-03**: `formatLastSessionDate`'s `now: () => number = Date.now` injection seam is documented as test-only in JSDoc.
  Source: IN-05.

---

## Future Requirements (deferred from v1.0.1 scope)

Carried into v1.1 — see `PROJECT.md` "Next milestone" section:
- Appearance/Settings umbrella (themes, audio timbres, visual variants, language)
- PWA install + app icon
- BPM stretch session
- v1.0 → v1.x carry-forwards (iOS Safari mid-page audio recovery, Firefox Desktop orb flicker, S2 Android wake-lock UAT, iOS Safari Pitfall 6 phone-call interrupted state, Inner-ring UX symmetry)

## Out of Scope (for v1.0.1)

- Any user-facing feature work or visual changes.
- Behavior changes to the cross-tab `recordSession` increment race itself (WR-07 covers UI consistency only; increment-race fix deferred to v1.x as documented).
- Audio quality improvements beyond the node-cleanup hygiene in AUDIO-04.
- Adding new tests beyond those required to lock in tightened contracts from BUILD-01 / UI-01 / A11Y-01.

## Traceability

(Filled by roadmap — each REQ-ID will be assigned to exactly one phase.)
