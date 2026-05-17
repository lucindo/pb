import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BreathingShape } from '../components/BreathingShape'
import { EndSessionDialog } from '../components/EndSessionDialog'
import { SettingsForm } from '../components/SettingsForm'
import { NKShape } from '../components/NKShape'
import { NKSessionReadout } from '../components/NKSessionReadout'
import { MuteToggle } from '../components/MuteToggle'
import { StatusPanel } from '../components/StatusPanel'
import { PracticeToggle } from '../components/PracticeToggle'
import { SessionReadout } from '../components/SessionReadout'
import { SessionControls } from '../components/SessionControls'
import { StatsFooter } from '../components/StatsFooter'
import { ResetStatsDialog } from '../components/ResetStatsDialog'
import { LearnAnchor } from '../components/LearnAnchor'
import { LearnDialog } from '../components/LearnDialog'
import { SettingsAnchor } from '../components/SettingsAnchor'
import { SettingsDialog } from '../components/SettingsDialog'
import { InstallBanner } from '../components/InstallBanner'
import { useSessionEngine } from '../hooks/useSessionEngine'
import {
  useNKEngine,
  type NKAudioCallbacks,
  type NKOnComplete,
} from '../hooks/useNKEngine'
import {
  scheduleNKFrontMarker,
  scheduleNKBackMarker,
  scheduleNKTick,
  scheduleEndChord,
  scheduleCountdownTick,
} from '../audio/nkCueSynth'
import { useAudioCues } from '../hooks/useAudioCues'
import { useFavicon } from '../hooks/useFavicon'
import { useTheme } from '../hooks/useTheme'
import { useVisualVariant } from '../hooks/useVisualVariant'
import { useVisualCue } from '../hooks/useVisualCue'
import { useWakeLock } from '../hooks/useWakeLock'
import { useIsStandaloneOrPhone } from '../hooks/useIsStandaloneOrPhone'
import { useBeforeInstallPrompt } from '../hooks/useBeforeInstallPrompt'
import { createBreathingPlan, type BreathingPlan } from '../domain/breathingPlan'
import { getSessionFrame, type SessionFrame } from '../domain/sessionMath'
import { buildStretchSegments, getStretchFrame } from '../domain/stretchRamp'
import {
  LEAD_IN_DURATION_MS,
  LEAD_IN_TICK_INTERVAL_MS,
  SAFE_LEAD_SEC,
} from '../audio/audioEngine'
import {
  loadSettings,
  loadMute,
  saveMute,
  loadPrefs,
  ZERO_STATS,
  STATE_KEY,
  type PersistedStats,
  loadInstallDismissed,
  saveInstallDismissed,
  loadPractices,
  loadActivePractice,
  saveActivePractice,
  recordResonantSession,
  recordNaviKriyaSession,
  saveResonantSettings,
  saveNaviKriyaSettings,
  resetPracticeStats,
  type PracticeId,
} from '../storage'
import type { SessionSettings, VisualVariantId, CueStyleId } from '../domain/settings'
import type { NaviKriyaSettings } from '../domain/naviKriyaSettings'
import { useLocale } from '../hooks/useLocale'
import { LEARN_CONTENT } from '../content/learnContent'
import { LOCKED_COPY } from '../content/lockedCopy'

// Phase 3 D-13: appPhase gates whether useSessionEngine.start() has been called.
// 'lead-in' is BEFORE the session timing clock starts (preserves SESS-05).
type AppPhase = 'idle' | 'lead-in' | 'running'

// Wall-clock margin allowing the shared end chord to ring out before the Navi
// AudioContext closes (chord 1.8s + 0.2s cleanup padding, plus headroom). The
// HRV path defers teardown inside the audio engine instead (see close()).
const END_CHORD_RINGOUT_MS = 2500

// Phase 22 Pitfall 2: a stretch session has a variable per-cycle cycleMs, so a
// boundary's audio-clock offset cannot come from `cycleIndex * plan.cycleMs`.
// When the frame carries `cycleStartMs` (a stretch frame from getStretchFrame),
// read the boundary offset and per-cycle phase durations straight off the frame;
// otherwise use the constant-plan formula (standard sessions — byte-unchanged).
export function computeBoundaryAudioOffsets(
  frame: SessionFrame,
  plan: BreathingPlan,
): { boundaryStartMs: number; phaseDurationSec: number } {
  if (frame.cycleStartMs !== undefined) {
    const inhaleMs = frame.currentInhaleMs ?? plan.inhaleMs
    const exhaleMs = frame.currentExhaleMs ?? plan.exhaleMs
    return {
      boundaryStartMs: frame.cycleStartMs + (frame.phase === 'in' ? 0 : inhaleMs),
      phaseDurationSec: (frame.phase === 'in' ? inhaleMs : exhaleMs) / 1000,
    }
  }
  return {
    boundaryStartMs: frame.cycleIndex * plan.cycleMs + (frame.phase === 'in' ? 0 : plan.inhaleMs),
    phaseDurationSec: (frame.phase === 'in' ? plan.inhaleMs : plan.exhaleMs) / 1000,
  }
}

export default function App() {
  // Phase 4 LOCL-01: restore persisted settings + mute at mount.
  // useMemo([]) ensures one synchronous read per app load, before children mount.
  const initialSettings = useMemo<SessionSettings>(() => loadSettings(), [])
  const initialMute = useMemo<boolean>(() => loadMute(), [])
  // Phase 30 PRACTICE-02/04: restore the per-practice envelope at mount. The
  // v1→v2 migration (plan 30-03) runs inside loadPractices so a returning
  // single-practice user's data surfaces as practices.resonant.
  const initialPractices = useMemo(() => loadPractices(), [])
  const initialActivePractice = useMemo(() => loadActivePractice(), [])
  // Phase 28 INSTALL-04: single synchronous read at mount; setInstallDismissed(true)
  // on dismiss triggers immediate re-gate via showBanner.
  const [installDismissed, setInstallDismissed] = useState<boolean>(() => loadInstallDismissed())

  // Phase 30 D-07: per-practice stats. Each practice keeps its own snapshot;
  // the render path selects the active practice's slice. They are mutated at
  // three sites — recordResonantSession at end-transition, resetPracticeStats
  // from the dialog, and the cross-tab storage listener.
  const [activePractice, setActivePractice] = useState<PracticeId>(initialActivePractice)
  const [resonantStats, setResonantStats] = useState<PersistedStats>(() => initialPractices.resonant.stats)
  const [naviKriyaStats, setNaviKriyaStats] = useState<PersistedStats>(() => initialPractices.naviKriya.stats)
  const [resetDialogOpen, setResetDialogOpen] = useState<boolean>(false)

  const session = useSessionEngine(initialSettings)
  const { state } = session
  const [endDialogOpen, setEndDialogOpen] = useState<boolean>(false)
  const [learnDialogOpen, setLearnDialogOpen] = useState<boolean>(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState<boolean>(false)

  // Phase 31: Navi Kriya engine + session state. The engine is audio-agnostic
  // (cues injected as callbacks); App owns the AudioContext, the countdown
  // timers, the NK settings draft, and the early-end dialog.
  const nkEngine = useNKEngine()
  const { nkPhase, nkRound, nkCount, nkRunning } = nkEngine
  const nkStart = nkEngine.start
  const nkEnd = nkEngine.end
  const nkToggleCue = nkEngine.toggleCue
  const [nkSettings, setNkSettings] = useState<NaviKriyaSettings>(
    () => initialPractices.naviKriya.settings,
  )
  // True from the Start tap through the 3-2-1 countdown until the engine's
  // first phase commits — keeps the NK session screen visible during the
  // countdown and blocks a double-start.
  const [nkStarting, setNkStarting] = useState<boolean>(false)
  // HRV parity: the 3-2-1 countdown digit shown in the shape during the Navi
  // pre-session window. null outside the countdown.
  const [nkLeadInDigit, setNkLeadInDigit] = useState<3 | 2 | 1 | null>(null)
  // HRV parity: true after a natural completion until the next Start / practice
  // switch — drives the inline "practice complete" headline (no popup).
  const [nkJustCompleted, setNkJustCompleted] = useState<boolean>(false)
  // D-13 early-end confirmation dialog.
  const [nkEndDialogOpen, setNkEndDialogOpen] = useState<boolean>(false)
  // AudioContext for the NK session (born in the Start gesture — autoplay
  // policy). Held in a ref so end/cleanup can close it.
  const nkAudioCtxRef = useRef<AudioContext | null>(null)
  // Pending 3-2-1 countdown timer ids — cleared on Cancel and on unmount.
  const nkLeadInTimeoutsRef = useRef<number[]>([])
  // Live mute state mirror for the NK cue callbacks (built once at Start, so
  // they read a ref rather than a stale `audio.muted` closure).
  const nkMutedRef = useRef<boolean>(initialMute)
  // Dedup: onNKComplete fires once on natural completion and again when nkEnd
  // resets the engine — record stats once.
  const nkRecordedRef = useRef<boolean>(false)
  // True whenever an NK session occupies the screen (countdown + running).
  const nkSessionActive = activePractice === 'naviKriya' && (nkStarting || nkPhase !== 'idle')
  // Anchor for Pitfall 2 dual-clock alignment. Captured at lead-in completion (t=0).
  // - audioAnchorRef.current = the firstInAudioTime returned by audioStart (deterministic
  //   on the audio clock — WR-01) → null if AC unavailable (D-10 fallback)
  // Read by Task 1b's boundary effect to compute each cue's audio-clock time from the breathing plan.
  // (WR-03: the previously-paired sessionAnchorMsRef was orphaned — set in three places, never
  //  read — so it was deleted along with its writes.)
  // Plan 06: declared BEFORE useAudioCues so the onAudioReanchorRequired callback (which
  // writes audioAnchorRef.current on engine reconstruction — D-35) can close over the ref.
  const audioAnchorRef = useRef<number | null>(null)
  // Plan 06 D-35: pass the re-anchor receiver — fires on engine reconstruction (NOT plain
  // resume). The callback writes the new AC's currentTime to audioAnchorRef.current so the
  // dual-anchor (Phase 3 D-13/D-14) is re-established against the new origin. The new
  // useCallback identity is captured via the hook's onReanchorRequiredRef so closure churn
  // does not bypass the latest callback.
  //
  // Plan 06 Task 8 UAT cycle 2 — kitchen-sink fix (2026-05-10): the boundary effect
  // computes `audioTime = audioAnchor + boundaryStartMs/1000` where boundaryStartMs is
  // the absolute offset from SESSION start (cycle * cycleMs + maybe inhaleMs). When
  // reconstruction fires mid-session, the new AC.currentTime ≈ 0 while session-elapsed
  // has accumulated lockDuration + pre-lock seconds. If we set audioAnchor = newAC.now()
  // (≈ 0), the formula evaluates to a large audioTime far in the new AC's future and
  // cues schedule past the visual boundary window (real-device diagnostic showed
  // deltas growing 9s → 26s → 57s). Subtract the session-elapsed visual offset so the
  // formula yields audioTime ≈ newAC.currentTime at the upcoming boundary — i.e., the
  // next cue plays at the right perceptual moment relative to the next visual phase.
  const sessionFrameRef = useRef(session.liveFrame)
  useEffect(() => {
    sessionFrameRef.current = session.liveFrame
  }, [session.liveFrame])

  // STORAGE-03: cross-tab stats refresh via the `window` 'storage' event.
  // - D-05: stats-only refresh — settings and mute are NOT re-read cross-tab.
  // - D-06: the 'storage' event is the SOLE refresh trigger — no `focus`,
  //   no `visibilitychange`, no `BroadcastChannel`, no poll.
  // - D-06a: filter on the STATE_KEY identity so events for unrelated
  //   localStorage keys never trigger a re-read; register once at mount,
  //   clean up on unmount.
  // - WR-08 posture: `setStats` is React-state-only — no domain side
  //   effects, so mid-session firings are tolerated (footer is hidden via
  //   the existing `inSessionView` gating; D-10).
  // - UI-SPEC §"Interaction Contract — STORAGE-03 Cross-Tab Stats Refresh"
  //   locks the decorative-update behavior: no aria-live, no animation,
  //   no flash. The removeItem(STATE_KEY) case from another tab arrives as
  //   `e.key === STATE_KEY` with `e.newValue === null` and falls through
  //   naturally: `loadStats() -> coerceStats(undefined) -> ZERO_STATS` ->
  //   footer hides via the existing `totalSessions > 0` gating. A cross-tab
  //   `localStorage.clear()` is NOT covered by this listener: per the
  //   WHATWG Storage spec it dispatches with `e.key === null`, which the
  //   `e.key === STATE_KEY` filter rejects. This is an accepted gap —
  //   `clear()` from other tabs is rare in practice (typically only
  //   DevTools) and explicitly out of Phase 8 scope (UI-SPEC §"Edge
  //   cases — locked behavior" only locks the `e.newValue === null` row,
  //   i.e. the `removeItem(STATE_KEY)` case; the cross-tab `clear()` row
  //   is intentionally absent). The footer will catch up on the next
  //   mount of this tab.
  // Empty deps `[]` are correct — `setStats` is stable from useState,
  // and `loadStats` + `STATE_KEY` are module-level imports.
  // Phase 30 Pitfall 6: read the per-practice subtree, not the flat env.stats.
  // After the v1→v2 migration env.stats is an orphaned field; the old
  // loadStats() would coerce undefined → ZERO_STATS and wrongly blank the
  // footer. loadPractices() refreshes both practices' stats slices.
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === STATE_KEY) {
        const practices = loadPractices()
        setResonantStats(practices.resonant.stats)
        setNaviKriyaStats(practices.naviKriya.stats)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const onAudioReanchorRequired = useCallback((newAudioAnchor: number) => {
    const elapsedMs = sessionFrameRef.current?.elapsedMs ?? 0
    // D-35: write the new AC currentTime (offset by session-elapsed) to the
    // dual-anchor ref. Subsequent boundary cues schedule against this new
    // origin. D-35a: do NOT replay lead-in here — the session continues to
    // the next phase boundary via the existing boundary effect.
    audioAnchorRef.current = newAudioAnchor - elapsedMs / 1000
  }, [])
  const audio = useAudioCues(initialMute, onAudioReanchorRequired) // Phase 3 + Plan 06 D-35
  // Keep the NK cue mute mirror in sync — the NK callbacks are built once at
  // Start and read this ref, so a mid-session mute click silences them live.
  useEffect(() => {
    nkMutedRef.current = audio.muted
  }, [audio.muted])
  const wakeLock = useWakeLock() // Phase 5: imperative resource — D-11/D-12 (no React state surface)
  useTheme() // Phase 16 THEME-01..04: orchestrates <html data-theme> writes (S-01/S-04), cross-tab + same-tab sync (A-03/A-04)
  useFavicon() // Phase 21 FAVI-01..03: per-palette favicon swap, same-tab + cross-tab + pre-paint (D-04/D-05/D-06)
  const { isPhone, isStandalone, isIOS } = useIsStandaloneOrPhone() // Phase 28: phone + standalone + iOS detection
  const { deferredPrompt, triggerInstall } = useBeforeInstallPrompt() // Phase 28: Android install prompt capture
  const { variant: liveVariant } = useVisualVariant() // Phase 17 VARIANT-01..07: live state + cross-tab/same-tab sync (no global attribute write — D-16)
  const { cue: liveCue } = useVisualCue() // Phase 25 CUE-01..03: live cue state + cross-tab/same-tab sync
  const { locale, uiStrings } = useLocale() // Phase 19 I18N-01..07: locale + typed UI strings; drives language switching
  const learnContent = LEARN_CONTENT[locale] // per-render catalog resolution (D-06 hook return shape)
  const lockedCopy = LOCKED_COPY[locale] // per-render catalog resolution (D-04 composition rule)

  // Phase 3 D-14: appPhase + leadInDigit drive the 3-2-1 lead-in visual.
  const [appPhase, setAppPhase] = useState<AppPhase>('idle')
  // True for both lead-in and running: the "session view" layout (settings
  // collapsed to Duration only, page description hidden, tighter top margin).
  // Without this the countdown 3-2-1 fires on the configuration screen, then
  // the layout snaps to the running view at t=0 — a jarring jump.
  const inSessionView = appPhase !== 'idle'

  // Phase 30 D-07/D-08: render-time selection of the active practice's data.
  // StatsFooter shows only the active slice; the reset dialog names the
  // practice being reset.
  const activeStats = activePractice === 'resonant' ? resonantStats : naviKriyaStats
  // Reset dialog + app title use the full practice name (*Heading), not the
  // short switcher label (*Name) — the switcher is the only mobile-width-
  // constrained surface.
  const activePracticeName =
    activePractice === 'resonant'
      ? uiStrings.practice.resonantHeading
      : uiStrings.practice.naviKriyaHeading
  // Phase 30 (checkpoint feedback): the active practice is named in the app
  // header + title, not in a separate inline heading. Resonant keeps the
  // existing app copy; Navi Kriya swaps both lines.
  const appHeader =
    activePractice === 'resonant' ? uiStrings.app.header : uiStrings.practice.naviKriyaHeader
  const appTitle =
    activePractice === 'resonant' ? uiStrings.app.title : uiStrings.practice.naviKriyaHeading

  // Phase 28 showBanner — AND of all five gates (INSTALL-01/02/03/04/05, D-01/D-02/D-08/SC5):
  // isPhone guards desktop (SC5), !isStandalone blocks installed PWA (INSTALL-05),
  // !installDismissed blocks dismissed state (INSTALL-04), appPhase==='idle' hides
  // during sessions (D-01), and (isIOS || deferredPrompt !== null) ensures Android
  // only shows when install prompt is available (D-08).
  const showBanner = isPhone && !isStandalone && !installDismissed && appPhase === 'idle' && (isIOS || deferredPrompt !== null)
  // Pre-session readout chip shown during lead-in so the layout doesn't shift
  // when the In phase begins. Synthesises an elapsed=0 frame from the locked
  // settings (Remaining = configured duration; Elapsed 0:00 for open-ended).
  const leadInPlaceholderFrame = useMemo(() => {
    if (appPhase !== 'lead-in') return null
    const settings = state.selectedSettings
    // A stretch session's readout is Stage/Remaining/BPM, not a plain timer —
    // build the same segment table startSession will use so the lead-in
    // preview matches the running session (mirrors sessionController.ts).
    if (settings.mode === 'stretch') {
      return getStretchFrame(buildStretchSegments(settings, settings.ratio), 0)
    }
    return getSessionFrame(createBreathingPlan(settings), 0)
  }, [appPhase, state.selectedSettings])
  // null when not in lead-in OR when the lead-in has reached t=0 (the In phase label takes over).
  const [leadInDigit, setLeadInDigit] = useState<3 | 2 | 1 | null>(null)

  // CR-01: cancel-during-lead-in race guard. onStartClick is async (awaits AC creation).
  // Between setAppPhase('lead-in') and the await resolving, the user can re-click — the
  // cancel branch flips appPhase back to 'idle' and calls audioStop(). When the original
  // chain resumes, it would otherwise schedule timeouts that flip appPhase back to
  // 'running' on a session the user already cancelled. Bumping startGenerationRef in
  // both branches and re-checking after the await lets the post-await continuation abort.
  const startGenerationRef = useRef(0)

  // The breathing plan captured at session start. Stored in a ref so Task 1b's boundary effect
  // can read cycleMs/inhaleMs/exhaleMs to compute boundary start times (per Pitfall 2 fix from
  // checker B1: boundary start times come from the PLAN, not from frame.elapsedMs at render time).
  const planRef = useRef<ReturnType<typeof createBreathingPlan> | null>(null)

  // Phase 17 D-09: captured-at-Start snapshot. While non-null (during an active session
  // including lead-in), BreathingShape receives this frozen value and ignores liveVariant.
  // Belt-and-suspenders against a cross-tab storage event that the picker-disable cannot block (D-10).
  // D-11: audio reconstruction (Phase 5.1 / Phase 9) does NOT re-snapshot — orthogonal subsystems.
  // Note: kept as both a ref (for synchronous write in onStartClick before any await) AND as state
  // (for the JSX render path — react-hooks/refs disallows reading .current in render).
  const sessionVariantRef = useRef<VisualVariantId | null>(null)
  const [sessionVariant, setSessionVariant] = useState<VisualVariantId | null>(null)

  // Phase 25 D-09: captured-at-Start snapshot for cue (mirrors sessionVariantRef / sessionVariant).
  // T-25-09: freezes the cue at onStartClick — a cross-tab 'storage' event cannot alter the
  // running session's cue because BreathingShape reads sessionCue (frozen) not liveCue.
  const sessionCueRef = useRef<CueStyleId | null>(null)
  const [sessionCue, setSessionCue] = useState<CueStyleId | null>(null)

  // Refs to track in-flight lead-in timeouts so end-during-lead-in can cancel them cleanly.
  const leadInTimeoutsRef = useRef<number[]>([])

  // Track the LAST cycleIndex+phase we scheduled audio for, to avoid double-scheduling.
  // SessionFrame can re-render multiple times within the same phase tick (rAF + state updates).
  // Read by Task 1b boundary effect.
  const lastBoundaryKeyRef = useRef<string | null>(null)

  // Phase 10 HOOKS-02 (D-06): the running-snapshot ref formerly declared here
  // is now owned by useSessionEngine (writes happen inside the rAF tick's
  // setState updater per D-08 — RESEARCH Pitfall 1 closure-staleness fix).
  // The App-level cleanup effect reads `session.runningSnapshotRef.current`
  // synchronously below. Old code path: local useRef + per-render effect at
  // App.tsx:412-420 that wrote on every state change while running. New path:
  // engine-owned writer fires once per rAF tick from inside the setState
  // updater, eliminating the per-render React-effect overhead.

  // Pitfall 1 idempotency guard: keyed on state.startedAtMs (unique per session
  // generation since performance.now() does not repeat). Prevents the cleanup
  // effect from double-writing if React re-runs it on dependency drift.
  const recordedSessionKeyRef = useRef<string | null>(null)

  // useAudioCues returns a fresh object literal each render, but its individual
  // function fields are wrapped in useCallback([]) so their identities are stable.
  // Hoist the stable references so effects can depend on them without re-firing
  // every render (the bug: depending on `audio` made the complete useEffect run on
  // each render while status was 'complete', repeatedly resetting appPhase to
  // 'idle' AND destroying the engine that onStartClick had just rebuilt).
  const audioStop = audio.stop
  const audioStart = audio.start
  const audioNotifyPhaseBoundary = audio.notifyPhaseBoundary
  // Hoisted like audioStop/audioStart — stable useCallback identity; lets the
  // leave-running effect depend on it without churning every render.
  const audioPlayEndChord = audio.playEndChord
  // AC-WR-02: hoist the primitives/callback that onMuteOrResumeClick reads so the
  // handler's useCallback deps are stable values, not the fresh `audio` object literal
  // useAudioCues returns each render (which churned the handler every animation frame
  // during a running session). Same hoisting pattern as audioStop/audioStart above.
  const audioStatus = audio.audioStatus
  const audioResume = audio.resume
  const audioMuted = audio.muted
  // Phase 9 AUDIO-02: stable reference for the boundary effect's caller-side clamp.
  // audio.audioNow is a useCallback([]) — identity is stable; hoisted to avoid
  // re-firing the boundary effect on every render (same pattern as audioNotifyPhaseBoundary).
  const audioAudioNow = audio.audioNow
  // useWakeLock returns a fresh object literal each render but `request`/`release`
  // are useCallback([])-stable. Hoist the same way as audio (App.tsx:114-122) so the
  // state.status !== 'running' cleanup effect can depend on `wakeLockRelease` without
  // re-firing every render.
  const wakeLockRequest = wakeLock.request
  const wakeLockRelease = wakeLock.release

  // Phase 4 LOCL-01: wrap setSelectedSettings + setMuted to persist on every change.
  // The wrapped functions are passed to children in place of the raw setters.
  const sessionSetSelectedSettings = session.setSelectedSettings
  const audioSetMuted = audio.setMuted
  // session.end is useCallback([])-stable; hoist so callbacks that depend on it
  // (onSwitchPractice, confirmEnd) keep a stable identity without depending on
  // the fresh `session` object literal re-created each render.
  const sessionEnd = session.end

  const persistedSetSettings = useCallback((next: SessionSettings) => {
    sessionSetSelectedSettings(next)
    // CR-01 (Phase 30 carry-forward): resonant settings persist into the
    // per-practice envelope (practices.resonant.settings) via
    // saveResonantSettings — NOT the legacy flat env.settings path.
    saveResonantSettings(next)
  }, [sessionSetSelectedSettings])

  const persistedSetMuted = useCallback((next: boolean) => {
    audioSetMuted(next)
    saveMute(next)
  }, [audioSetMuted])

  // Phase 30 PRACTICE-01/03 (T-30-09): switch the active practice and persist
  // it. The `inSessionView` early-return is defense-in-depth behind
  // PracticeToggle's `disabled` prop — no practice switch can occur mid-session.
  const onSwitchPractice = useCallback((next: PracticeId) => {
    // Phase 31: also block a switch while a Navi Kriya session occupies the
    // screen — otherwise the NK engine would keep ticking with no UI.
    if (inSessionView || nkSessionActive) return
    setNkJustCompleted(false) // drop a stale Navi completion headline on switch
    // Consistency with Navi: switching practices also clears a finished
    // resonant session so its "Session complete" headline does not linger or
    // reappear on switch-back. end() from 'complete' resolves to 'idle'; from
    // 'idle' it is a no-op.
    sessionEnd()
    setActivePractice(next)
    saveActivePractice(next)
  }, [inSessionView, nkSessionActive, sessionEnd])

  // Plan 06 D-31 / D-33: gesture-attached recovery click handler.
  // When audioStatus === 'needs-resume', the click IS a user gesture — chain
  // audio.resume() synchronously inside this handler so the iOS gesture context
  // spans the engine.resume() (and any escalation to reconstruction inside
  // useAudioCues.resume()) call (Pitfall 2 — no setTimeout/Promise.then break
  // between the click event and audio.resume()).
  // D-31: also fires for unmute clicks during needs-resume — a user who
  // instinctively un-mutes after lock/unlock gets recovery for free.
  // When audioStatus !== 'needs-resume', this collapses to the pre-Plan-06
  // persistedSetMuted(!audio.muted) behavior verbatim.
  const onMuteOrResumeClick = useCallback(async () => {
    if (audioStatus === 'needs-resume') {
      await audioResume()
    }
    persistedSetMuted(!audioMuted)
  }, [audioStatus, audioResume, audioMuted, persistedSetMuted])

  // WR-01: Auto-close the confirmation modal when the session leaves the running
  // state on its own (e.g. timer reaches the end while the modal is open). Without
  // this, the modal would float over a "Session complete" readout for an arbitrary
  // window until the user dismissed it.
  // The setState below is intentional: status is owned by useSessionEngine (an
  // external system from this component's POV) so reacting to its change with a
  // local-state update is the documented React pattern for "subscribe + reflect".
  useEffect(() => {
    if (state.status !== 'running' && endDialogOpen) {
      // Reason: subscribe-and-reflect — endDialogOpen mirrors external session.status; setting local state from this trigger effect is the documented React pattern for "subscribe + reflect".
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEndDialogOpen(false)
    }
  }, [state.status, endDialogOpen])

  // WR-09: Auto-close LearnDialog and ResetStatsDialog when the session view
  // becomes active. Without this, a dialog that was open during an appPhase
  // transition to 'lead-in' could float over the session view for an arbitrary
  // window. The onLearnClick open-guard (App.tsx:396-399) is the first line of
  // defense; this effect is the second for any race where the dialog is already
  // open when inSessionView flips. onResetClick has no symmetric open-guard
  // because the Reset button lives in StatsFooter which is hidden when
  // inSessionView is true — this reactive close catches the impossible-by-UI
  // race anyway.
  useEffect(() => {
    if (inSessionView) {
      // Reason: subscribe-and-reflect — dialog visibility mirrors external inSessionView; setting local state from this trigger effect is the documented React pattern, identical posture to the EndSessionDialog auto-close at App.tsx:247-253 (WR-01).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLearnDialogOpen(false)
      setResetDialogOpen(false)
      // Reason: subscribe-and-reflect — settingsDialogOpen mirrors external inSessionView; same WR-09 pattern as setLearnDialogOpen/setResetDialogOpen.
      setSettingsDialogOpen(false)
    }
  }, [inSessionView])

  const clearLeadInTimeouts = useCallback(() => {
    for (const id of leadInTimeoutsRef.current) {
      window.clearTimeout(id)
    }
    leadInTimeoutsRef.current = []
  }, [])

  // Phase 20 D-04 supersedes Phase 3 D-11 copy lock for the lead-in window: the primary button
  // label is now 'Cancel'/'Cancelar' during lead-in (LEAD-01 via the inLeadIn prop on
  // SessionControls). The still-accurate part: the cancel path is routed THROUGH onStartClick
  // because session.status is still 'idle' during lead-in (SESS-05 — useSessionEngine has not
  // yet been started). SessionControls dispatches onClick by status; idle → onStart.
  // So onStartClick handles BOTH the start-from-idle case AND the cancel-during-lead-in case.
  const onStartClick = useCallback(async () => {
    // Cancel-during-lead-in branch (Open Question 2 option (a) + checker W4):
    if (appPhase === 'lead-in') {
      // CR-01: invalidate any in-flight start whose await audioStart(plan) is still
      // pending. The post-await continuation re-checks startGenerationRef and aborts
      // when the token has been bumped.
      startGenerationRef.current += 1
      clearLeadInTimeouts()
      setLeadInDigit(null)
      setAppPhase('idle')
      audioAnchorRef.current = null
      planRef.current = null
      sessionVariantRef.current = null  // Phase 17 D-10 tidy clear (redundant with leave-running effect but avoids 1 frame of stale ref)
      setSessionVariant(null)
      sessionCueRef.current = null  // Phase 25 D-09 tidy clear (mirrors sessionVariantRef clear)
      setSessionCue(null)
      void audioStop()
      void wakeLockRelease() // Phase 5 D-07/D-08: idempotent if no lock held
      return
    }
    if (appPhase !== 'idle') return // defensive: ignore clicks during running (handled by onEnd)

    // CR-01: stamp this start's generation token before any await — the cancel branch
    // bumps the same ref, so the post-await continuation can detect "I was cancelled"
    // by comparing local generation against the ref's current value.
    const generation = ++startGenerationRef.current

    // Phase 17 D-10: capture-at-session-start — set BEFORE lead-in begins so the visual variant
    // is frozen for the entire session (lead-in + breath loop). Reset in the leave-running cleanup
    // effect below. D-11: audio reconstruction does NOT re-snapshot.
    // Ref for synchronous write (pre-await guard); state for the JSX render path.
    sessionVariantRef.current = liveVariant
    setSessionVariant(liveVariant)
    // Phase 25 D-09: capture cue at session start (mirrors variant capture above).
    // T-25-09: sessionCueRef freezes the cue; mid-session cross-tab changes feed liveCue only,
    // which is not read while sessionCue is non-null. Applies on next Start.
    sessionCueRef.current = liveCue
    setSessionCue(liveCue)

    setAppPhase('lead-in')
    setLeadInDigit(3)
    // Phase 5 D-01/D-02: parallel with audioStart, fire-and-forget. Failures
    // (rejection, no API) update internal hook state but do not block lead-in.
    void wakeLockRequest()

    // D-09: AudioContext is constructed inside this user-gesture-derived chain.
    const plan = createBreathingPlan(state.selectedSettings)
    planRef.current = plan // stored for Task 1b boundary computation
    // Phase 18 D-09/D-10: read timbre from storage once at session start (mirror
    // of the sessionVariantRef.current = liveVariant site above at line ~338).
    // useAudioCues' timbreRef IS the session-scoped capture (D-08 — no App-side
    // sessionTimbreRef). loadPrefs is a static import (not a useCallback dep);
    // capturedTimbre is a local const (not a closure dep). Reconstruction inside
    // useAudioCues NEVER re-reads loadPrefs — it inherits timbreRef.current (D-11).
    const capturedTimbre = loadPrefs().timbre
    const firstInAudioTime = await audioStart(plan, capturedTimbre)
    // firstInAudioTime is null if AC failed (D-10) — visuals-only path.
    // The lead-in setTimeout chain still runs in either case so the visual countdown
    // is independent of audio availability.

    // CR-01: if the user clicked Start again while we were awaiting AC creation, the
    // cancel branch already ran (cleared timeouts, reset appPhase, called audioStop).
    // Tear down the freshly-built engine and abort BEFORE scheduling timeouts — otherwise
    // the timeouts would later flip appPhase back to 'running' and start the session the
    // user just cancelled.
    if (generation !== startGenerationRef.current) {
      void audioStop()
      return
    }

    // WR-04: drive these from the shared LEAD_IN_TICK_INTERVAL_MS / LEAD_IN_DURATION_MS
    // exports so a future tweak to the lead-in length stays in lockstep across the
    // visual countdown, the audio ticks, and the audio anchor.
    const t1 = window.setTimeout(() => { setLeadInDigit(2) }, 1 * LEAD_IN_TICK_INTERVAL_MS)
    const t2 = window.setTimeout(() => { setLeadInDigit(1) }, 2 * LEAD_IN_TICK_INTERVAL_MS)
    const t3 = window.setTimeout(() => {
      // t=0: lead-in done. Switch to running. SESS-05: session.start() is called HERE,
      // not at the original Start button-press. The session clock begins now.
      setLeadInDigit(null)
      // WR-01: capture the audio anchor from the deterministic firstInAudioTime returned
      // by audioStart, NOT from a re-query of audioNow() inside this setTimeout callback.
      // setTimeout(LEAD_IN_DURATION_MS) overshoots its deadline by 4-16 ms (more under
      // load); reading audioCtx.currentTime in the overshoot window gave an anchor that
      // was late by that delta, and every subsequent boundary inherited the drift on top
      // of the rAF jitter. firstInAudioTime is sample-accurate on the audio clock
      // (= engine.now() + LEAD_IN_DURATION_SEC at schedule time). null when AC unavailable
      // → Task 1b's effect treats null as "skip cue scheduling" (D-10 visuals-only fallback).
      // AC-WR-01: this audioAnchorRef write MUST precede setAppPhase('running'). The
      // boundary-audio effect (see ~line 613) reads audioAnchorRef.current on the first
      // non-cycleIndex:0/in frame; if 'running' committed before this write, the effect
      // would observe a null anchor. The effect now retries instead of dropping the cue,
      // but keeping the write first avoids the retry path entirely on the happy path.
      audioAnchorRef.current = firstInAudioTime
      setAppPhase('running')
      session.start()
    }, LEAD_IN_DURATION_MS)
    leadInTimeoutsRef.current = [t1, t2, t3]
  }, [appPhase, liveVariant, liveCue, state.selectedSettings, audioStart, audioStop, wakeLockRequest, wakeLockRelease, session, clearLeadInTimeouts])

  // D-14: open-ended sessions still end directly; only timed sessions raise the modal.
  // D-13: when the modal opens, the session timing clock keeps running (no session.pause; no setTimeout).
  // Phase 3 D-11: also stop audio on open-ended/post-complete end paths.
  // This handler is only invoked by SessionControls when status === 'running' (the session has
  // started and the button label has flipped to 'End session'). Cancel-during-lead-in is handled
  // by onStartClick (above) because session.status is still 'idle' during the lead-in window.
  const requestEnd = useCallback(() => {
    if (state.status === 'running' && state.lockedSettings.durationMinutes !== 'open-ended') {
      setEndDialogOpen(true)
      return
    }
    session.end()
    void audioStop() // D-11
  }, [state, session, audioStop])

  // WR-02: memoize so EndSessionDialog's cancel-listener effect (depends on
  // [onCancel]) does not tear down and re-attach on every parent render.
  // App re-renders on every animation frame while a session is running, which
  // would otherwise produce hundreds of addEventListener/removeEventListener
  // pairs per second on long sessions. Depends on the hoisted stable
  // `sessionEnd` (session.end), not the fresh `session` object literal.
  const confirmEnd = useCallback(() => {
    setEndDialogOpen(false)
    sessionEnd()
    void audioStop() // D-11: AC closed on modal-confirm end
  }, [sessionEnd, audioStop])

  const cancelEnd = useCallback(() => {
    setEndDialogOpen(false)
    // session continues — clock keeps running (D-13). No additional work.
  }, [])

  const onResetClick = useCallback(() => {
    setResetDialogOpen(true)
  }, [])

  const confirmReset = useCallback(() => {
    // WR-08: optimistic UI — set RAM state from a known zero-state, not from
    // a re-read of disk. If resetPracticeStats() fails silently (D-16 quota /
    // Safari ITP / private mode), RAM-side state must still reflect the user's
    // intent — same posture as Phase 3 D-10.
    // Phase 30 D-08 / Pitfall 4 / T-30-11: reset wipes ONLY the active
    // practice's stats; the other practice's history is untouched.
    resetPracticeStats(activePractice)
    if (activePractice === 'resonant') setResonantStats({ ...ZERO_STATS })
    else setNaviKriyaStats({ ...ZERO_STATS })
    setResetDialogOpen(false)
  }, [activePractice])

  const cancelReset = useCallback(() => {
    setResetDialogOpen(false)
  }, [])

  // Phase 6 LEARN-01/LEARN-04: open the Learn modal from the corner anchor.
  // D-03 defense in depth: even though the anchor is aria-disabled during session view,
  // gate state mutation here too (the anchor's JSX-layer no-op is the first gate).
  const onLearnClick = useCallback(() => {
    if (inSessionView) return
    setLearnDialogOpen(true)
  }, [inSessionView])

  const onLearnClose = useCallback(() => {
    setLearnDialogOpen(false)
  }, [])

  // Phase 15 INFRA-04: open the Settings dialog from the gear anchor.
  // D-08 defense in depth: even though the anchor is aria-disabled during session view,
  // gate state mutation here too (the anchor's JSX-layer no-op is the first gate).
  const onSettingsClick = useCallback(() => {
    if (inSessionView) return
    setSettingsDialogOpen(true)
  }, [inSessionView])

  const onSettingsClose = useCallback(() => {
    setSettingsDialogOpen(false)
  }, [])

  // Phase 28 INSTALL-04: dismiss handler — persists to localStorage and gates the
  // banner out of the React tree immediately.
  const handleInstallDismiss = useCallback(() => {
    saveInstallDismissed()
    setInstallDismissed(true)
  }, [])

  // D-11 + D-16: when the session reaches 'complete', the last cue tail naturally rings out
  // (cues already scheduled in the audio thread; AC.close() resolves after they finish).
  // Reset appPhase to 'idle' so the orb stops rendering the last frame, and clear the dual anchors.
  // The setState below is intentional: state.status is owned by useSessionEngine and its
  // 'complete' transition is the external trigger we synchronise with — exactly the
  // "subscribe to external state" effect pattern React recommends.
  //
  // Phase 10 HOOKS-02 (D-09) — Pitfall 3 mitigation Option A (const-extract):
  // tightening deps from `[state, ...]` to `[state.status, ...]` causes
  // react-hooks/exhaustive-deps to flag `state.completedAtMs` (read inside the
  // narrowed `state.status === 'complete'` branch) and
  // `session.runningSnapshotRef` (refs accessed via an object property are
  // not auto-detected as stable). Hoisting both to local consts narrows the
  // dep array to genuinely effect-triggering primitives + a stable ref local
  // (refs to refs are exempt from exhaustive-deps when bound to a local) and
  // avoids introducing a new eslint-disable. The `completedAtMs` value is
  // `null` outside the 'complete' branch — the narrowing inside the effect
  // body uses `isComplete` to decide which value to consume.
  const completedAtMs = state.status === 'complete' ? state.completedAtMs : null
  const runningSnapshotRefStable = session.runningSnapshotRef
  useEffect(() => {
    if (state.status !== 'running') {
      // Covers BOTH 'complete' (timed end-of-session) and 'idle' (manual End,
      // modal-confirm End, open-ended End). All four lifecycle exits must
      // reset appPhase + clear engine/anchor refs — otherwise appPhase stays
      // 'running' after End and the next Start click silently no-ops on the
      // `appPhase !== 'idle'` guard in onStartClick.
      // HRV parity with Navi: a natural completion plays the shared end chord.
      // Must run BEFORE audioStop() — the engine schedules the chord, then
      // close() defers its own teardown until the chord rings out. Manual ends
      // ('idle') get no chord, matching the Navi early-end behaviour.
      if (state.status === 'complete') {
        audioPlayEndChord()
      }
      void audioStop()
      void wakeLockRelease() // Phase 5 D-07: single-write release site (D-08 idempotent)
      // Reason: subscribe-and-reflect — appPhase resets to 'idle' when session leaves running; this effect is the single write site per D-16 Phase 4 invariant.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAppPhase('idle')
      clearLeadInTimeouts()
      audioAnchorRef.current = null
      planRef.current = null
      sessionVariantRef.current = null  // Phase 17 D-10 release the captured variant so next Start re-reads liveVariant
      setSessionVariant(null)  // Phase 17 D-10 release the captured variant for the JSX render path
      sessionCueRef.current = null  // Phase 25 D-09 release captured cue so next Start re-reads liveCue
      setSessionCue(null)  // Phase 25 D-09 release captured cue for the JSX render path
      lastBoundaryKeyRef.current = null

      // Phase 4 LOCL-02 + Phase 10 HOOKS-02 (D-06/D-09): single write site for
      // stats (Pitfall 1). Reads the running-snapshot ref now owned by
      // useSessionEngine — the hook writes from inside its rAF tick's setState
      // updater (D-08). The engine does NOT null the snapshot on the
      // transition-out-of-running branch of its rAF effect: hook useEffects
      // fire BEFORE consumer-component useEffects, so nulling on transition
      // out would clobber `runningSnapshotRef.current` BEFORE this leave-
      // running cleanup effect could read it (see useSessionEngine.ts:79-91).
      // The snapshot therefore PERSISTS across the transition out and is
      // overwritten on the next session's first rAF tick (the in-updater
      // write inside the engine's `tick`). Reading a stale snapshot on a
      // subsequent idle render is safe — the recordedSessionKeyRef guard
      // below dedupes idempotently via the snapshot's `key` so the stats
      // write only fires on a fresh key.
      // - For 'complete': elapsed = state.completedAtMs - snap.startedAtMs (sample-accurate)
      // - For 'idle' (manual End): elapsed = snap.lastElapsedMs (last rAF reading; <16ms stale)
      // The snap-null guard handles cancel-during-lead-in (D-03 / Pitfall 2): when the user
      // never entered 'running', the engine never populated the snapshot and we skip the write.
      // The recordedSessionKeyRef guard makes the write idempotent per session — protects
      // against React re-running the effect under StrictMode or dep-drift.
      const snap = runningSnapshotRefStable.current
      if (snap !== null && recordedSessionKeyRef.current !== snap.key) {
        const isComplete = state.status === 'complete'
        const elapsedMs =
          isComplete && completedAtMs !== null
            ? completedAtMs - snap.startedAtMs
            : snap.lastElapsedMs
        // Phase 30 Pitfall 3 / T-30-08: the resonant session engine records
        // into the resonant practice subtree, not the flat env.stats.
        const updated = recordResonantSession(elapsedMs, isComplete)
        setResonantStats(updated)
        recordedSessionKeyRef.current = snap.key
      }
    }
    // HOOKS-02 D-09: depend on `state.status` (primitive) — NOT the full
    // `state` object. The effect fires once per status-transition-out-of-running
    // instead of every rAF (the per-rAF state-object identity churn was the
    // root cause of the App-level effect re-running on every animation frame).
    // `completedAtMs` is a hoisted const narrowed via discriminated union;
    // `runningSnapshotRefStable` is a stable ref bound to a local so
    // exhaustive-deps can detect its ref-shape.
  }, [state.status, completedAtMs, runningSnapshotRefStable, audioStop, audioPlayEndChord, wakeLockRelease, clearLeadInTimeouts])

  // Phase 3 D-12 + Pitfall 2 dual-anchor invariant: 1-cue lookahead.
  // On every cycleIndex/phase transition in SessionFrame, schedule the corresponding In/Out cue
  // at its EXACT audio-clock time, computed from the dual anchor captured at lead-in completion
  // PLUS the boundary's deterministic offset derived from the breathing plan.
  //
  // Per checker B1 fix: the boundary start time MUST come from the plan (cycleIndex * cycleMs +
  // phase offset), NOT from frame.elapsedMs at render time. Reading the rAF-driven elapsedMs is
  // the self-invalidating "main-thread clock" anti-pattern that Pitfall 2 explicitly warns
  // against: rAF jitter (±16 ms) becomes audio jitter (audible). The audio thread's job is to
  // schedule cues at deterministic instants on the audio clock; the main-thread effect's job is
  // to compute those instants from the source-of-truth plan.
  //
  // Per checker B2 fix: when audioAnchorRef.current is null (AC unavailable), this effect is a
  // no-op — the visual session continues without audio. This is the D-10 fallback path.
  useEffect(() => {
    if (appPhase !== 'running') {
      lastBoundaryKeyRef.current = null
      return
    }
    const frame = session.currentFrame
    if (frame === null) return
    const key = `${String(frame.cycleIndex)}:${frame.phase}`
    if (lastBoundaryKeyRef.current === key) return
    lastBoundaryKeyRef.current = key

    // Skip the very first In phase: its cue was already scheduled inside audio.start() at the
    // lead-in anchor (firstInAudioTime). cycleIndex=0 + phase='in' is the t=0 moment we covered.
    if (frame.cycleIndex === 0 && frame.phase === 'in') return

    const audioAnchor = audioAnchorRef.current
    const plan = planRef.current
    // AC-WR-01: the t3 callback writes audioAnchorRef.current then setAppPhase('running').
    // If this non-initial frame commits before that write lands, audioAnchor is still null
    // even though AC is available. Reset lastBoundaryKeyRef so the NEXT frame retries this
    // boundary instead of permanently dropping the cue. (plan is set synchronously at start,
    // so a null plan here is the genuine D-10 visuals-only fallback — no retry needed.)
    if (audioAnchor === null && plan !== null) {
      lastBoundaryKeyRef.current = null
      return
    }
    // D-10 fallback: AC unavailable → no-op (visual session continues uninterrupted).
    if (audioAnchor === null || plan === null) return

    // Compute boundary start time from the plan (NOT from frame.elapsedMs).
    // boundaryStartMs is the elapsed offset from session t=0 to the start of THIS phase.
    // Standard sessions: cycleIndex * cycleMs (+ inhaleMs for Out). Stretch sessions:
    // straight off the segment table's cycleStartMs (variable cycleMs — Pitfall 2).
    // phaseDurationSec likewise uses the per-cycle inhale/exhale for stretch frames.
    const { boundaryStartMs, phaseDurationSec } = computeBoundaryAudioOffsets(frame, plan)

    // Convert to audio-clock time using the dual anchor captured at lead-in completion.
    const audioTime = audioAnchor + boundaryStartMs / 1000

    // AUDIO-02 D-01/D-02 caller-side clamp. Pitfall 5: audio.audioNow() returns
    // number | null — null in the window between engine close and audioAnchor clear.
    // Skip the schedule entirely when null (engine-side clamp is the safety net at the callee).
    const liveAudioNow = audioAudioNow()
    if (liveAudioNow === null) return
    const clampedAudioTime = Math.max(audioTime, liveAudioNow + SAFE_LEAD_SEC)

    // 260510-tc9 Bug 2: phaseDurationSec (computed above) is the UPCOMING phase's
    // duration so the bowl-cue decay envelope stretches with the phase length at
    // low BPM (avoids silent tail before the next boundary at BPM ≤ 3.5). The
    // engine + cueSynth clamp the value so default short-phase cues are unchanged
    // and very long phases do not drone.
    audioNotifyPhaseBoundary({ newPhase: frame.phase, audioTime: clampedAudioTime, phaseDurationSec })
  }, [appPhase, session.currentFrame, audioNotifyPhaseBoundary, audioAudioNow])

  // Cleanup pending lead-in timeouts on unmount (Pitfall 3 leak guard).
  useEffect(() => {
    return () => {
      clearLeadInTimeouts()
    }
  }, [clearLeadInTimeouts])

  // -------------------------------------------------------------------------
  // Phase 31: Navi Kriya session handlers.

  // D-13: fired by the engine on natural completion (isComplete) and on early
  // end (nkEnd → isComplete false). nkEnd is also called from inside the
  // natural-completion branch below to reset the engine — that re-fires this
  // callback with isComplete:false, which the nkRecordedRef guard absorbs.
  const onNKComplete = useCallback<NKOnComplete>((result) => {
    if (nkRecordedRef.current) return
    nkRecordedRef.current = true
    // NK-08 / D-13: records the fully-completed rounds + elapsed minutes for
    // both natural completion and early end; writes only the naviKriya slice.
    const updated = recordNaviKriyaSession(result.elapsedMs, result.completedRounds, result.isComplete)
    setNaviKriyaStats(updated)
    void wakeLockRelease()
    sessionVariantRef.current = null
    setSessionVariant(null)
    if (result.isComplete) {
      // HRV parity: natural completion shows no popup. Surface the inline
      // completion headline, let the end chord ring out, then close the
      // AudioContext and reset the engine to idle so the config screen
      // returns (nkEnd re-fires this callback — the guard above no-ops it).
      setNkJustCompleted(true)
      const ctx = nkAudioCtxRef.current
      nkAudioCtxRef.current = null
      if (ctx !== null) {
        window.setTimeout(() => { void ctx.close() }, END_CHORD_RINGOUT_MS)
      }
      nkEnd()
    } else {
      // Early end — no end chord scheduled; close the AudioContext now.
      void nkAudioCtxRef.current?.close()
      nkAudioCtxRef.current = null
    }
  }, [wakeLockRelease, nkEnd])

  // NK-06 / D-07: persist the NK settings draft. A live perOmCue flip during a
  // running session is pushed straight to the engine ref (stale-closure-safe).
  const onNKSettingsChange = useCallback((next: NaviKriyaSettings) => {
    if (next.perOmCue !== nkSettings.perOmCue) {
      nkToggleCue(next.perOmCue)
    }
    setNkSettings(next)
    saveNaviKriyaSettings(next)
  }, [nkSettings, nkToggleCue])

  // HRV parity: a 3-2-1 countdown (a tick on each digit) precedes the engine
  // start — replaces the old silent settle. The AudioContext is created
  // synchronously inside this gesture handler (autoplay policy — RESEARCH
  // Pitfall 2).
  const onNKStartClick = useCallback(() => {
    if (nkSessionActive) return
    setNkEndDialogOpen(false)
    setNkJustCompleted(false) // clear any prior completion headline
    // WR-03: AudioContext construction can throw (browser without Web Audio,
    // hardened privacy config). Treat audio as fail-soft — match the resonant
    // path: the visual engine still starts, only the cues go silent.
    let audioCtx: AudioContext | null = null
    try {
      audioCtx = new AudioContext()
    } catch {
      audioCtx = null
    }
    nkAudioCtxRef.current = audioCtx
    const timbre = loadPrefs().timbre
    sessionVariantRef.current = liveVariant
    setSessionVariant(liveVariant)
    void wakeLockRequest()
    nkRecordedRef.current = false
    setNkStarting(true)
    setNkLeadInDigit(3)

    // WR-03: with no AudioContext the cue callbacks become no-ops so the engine
    // runs silently rather than aborting the session. The non-null branch binds
    // a const so TypeScript narrows it inside the cue closures. Each cue checks
    // nkMutedRef so the NK mute toggle actually silences audio.
    const callbacks: NKAudioCallbacks = (() => {
      const ctx = audioCtx
      if (ctx === null) {
        return {
          frontMarker: () => undefined,
          backMarker: () => undefined,
          tick: () => undefined,
          endCue: () => undefined,
        }
      }
      // IN-03: schedule each cue a small look-ahead ahead of currentTime
      // rather than exactly at it. Starting a Web Audio node at currentTime
      // leaves no headroom — the audio thread can already be past that
      // instant by the time the node is wired up, producing clicks on slower
      // devices. SAFE_LEAD_SEC is the same single-source-of-truth guard the
      // resonant cue path applies (audioEngine.ts).
      const cueWhen = (): number => ctx.currentTime + SAFE_LEAD_SEC
      return {
        frontMarker: () => { if (!nkMutedRef.current) scheduleNKFrontMarker(ctx, cueWhen(), ctx.destination, timbre) },
        backMarker: () => { if (!nkMutedRef.current) scheduleNKBackMarker(ctx, cueWhen(), ctx.destination, timbre) },
        tick: () => { if (!nkMutedRef.current) scheduleNKTick(ctx, cueWhen(), ctx.destination, timbre) },
        endCue: () => { if (!nkMutedRef.current) scheduleEndChord(ctx, cueWhen(), ctx.destination, timbre) },
      }
    })()

    // Countdown beep — deliberately separate from callbacks.tick (the per-OM
    // tick): same sound today, but the countdown beep and the OM tick are not
    // semantically related, so each can be explored without touching the
    // other. Shared with HRV via scheduleCountdownTick.
    const countdownTick = (): void => {
      if (audioCtx !== null && !nkMutedRef.current) {
        scheduleCountdownTick(audioCtx, audioCtx.currentTime + SAFE_LEAD_SEC, audioCtx.destination, timbre)
      }
    }

    // HRV parity: 3-2-1 countdown driven by the shared LEAD_IN constants, a
    // tick on each digit. The engine fires the front marker itself at t=0, so
    // App does not pre-fire it (that would double the marker).
    countdownTick()
    const t1 = window.setTimeout(() => { setNkLeadInDigit(2); countdownTick() }, 1 * LEAD_IN_TICK_INTERVAL_MS)
    const t2 = window.setTimeout(() => { setNkLeadInDigit(1); countdownTick() }, 2 * LEAD_IN_TICK_INTERVAL_MS)
    const t3 = window.setTimeout(() => {
      setNkLeadInDigit(null)
      setNkStarting(false)
      nkStart(nkSettings, callbacks, onNKComplete)
    }, LEAD_IN_DURATION_MS)
    nkLeadInTimeoutsRef.current = [t1, t2, t3]
  }, [nkSessionActive, liveVariant, wakeLockRequest, nkSettings, nkStart, onNKComplete])

  // HRV parity: Cancel during the countdown — abort before the engine starts.
  const onNKCancelClick = useCallback(() => {
    for (const id of nkLeadInTimeoutsRef.current) window.clearTimeout(id)
    nkLeadInTimeoutsRef.current = []
    setNkLeadInDigit(null)
    setNkStarting(false)
    void nkAudioCtxRef.current?.close()
    nkAudioCtxRef.current = null
    void wakeLockRelease()
    sessionVariantRef.current = null
    setSessionVariant(null)
  }, [wakeLockRelease])

  // NK-07: end early — open the confirmation dialog (HRV-consistent).
  const onNKEndClick = useCallback(() => {
    setNkEndDialogOpen(true)
  }, [])

  const confirmNKEnd = useCallback(() => {
    setNkEndDialogOpen(false)
    // D-13: nkEnd fires onNKComplete with isComplete:false → records partial.
    nkEnd()
  }, [nkEnd])

  const cancelNKEnd = useCallback(() => {
    setNkEndDialogOpen(false)
  }, [])

  // Cancel any pending countdown timers on unmount.
  useEffect(() => {
    return () => {
      for (const id of nkLeadInTimeoutsRef.current) window.clearTimeout(id)
    }
  }, [])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--color-breathing-bg-soft),_var(--color-breathing-bg)_48%,_var(--color-breathing-bg-edge))] px-4 py-6 text-[var(--color-breathing-accent-strong)] sm:px-6 sm:py-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col items-center justify-center text-center sm:min-h-[calc(100vh-4rem)]">
        {/* Phase 6 D-01/D-03: Learn anchor — persistent across all session states,
            positioned at the column top-right (moved from page-level fixed on
            2026-05-10 per user layout request). Wrapper provides position:relative
            anchor for the absolute-positioned button. Disabled (not hidden) during
            lead-in and running (D-03 disable-not-hide). */}
        <div className="relative w-full">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-[var(--color-breathing-accent)]">
            {appHeader}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--color-breathing-accent-strong)] sm:text-5xl">
            {appTitle}
          </h1>
          <SettingsAnchor disabled={inSessionView || nkSessionActive} onClick={onSettingsClick} strings={uiStrings.anchors} />
          <LearnAnchor disabled={inSessionView || nkSessionActive} onClick={onLearnClick} strings={uiStrings.anchors} />
        </div>
        <div className={`${inSessionView ? 'mt-6' : 'mt-10'} w-full rounded-[2rem] border border-[var(--color-breathing-surface)]/80 bg-[var(--color-breathing-surface)]/70 p-5 shadow-[var(--shadow-breathing-card)] backdrop-blur sm:p-6`}>
          {/* Phase 30 PRACTICE-01/03: practice switcher — new first child of the
              main card, above the orb. Disabled during a session (D-06). */}
          <div className="mb-5">
            <PracticeToggle
              active={activePractice}
              disabled={inSessionView || nkSessionActive}
              onSwitch={onSwitchPractice}
              strings={{
                toggleLabel: uiStrings.practice.toggleLabel,
                practiceNames: {
                  resonant: uiStrings.practice.resonantName,
                  naviKriya: uiStrings.practice.naviKriyaName,
                },
              }}
            />
          </div>
          {/* Phase 3 D-14: lead-in numeral takes over the orb area when appPhase==='lead-in' */}
          {/* Phase 17 D-09: sessionVariant is the captured-at-Start frozen value (non-null during lead-in + running); liveVariant is the fallback at idle. */}
          {/* Phase 25 D-09: sessionCue is the captured-at-Start frozen value (T-25-09); liveCue is the fallback at idle. */}
          {/* Phase 31: an active Navi Kriya session replaces the resonant
              breathing shape with the OM-counting NKShape. The key restarts
              the nk-om-pulse animation on every OM (NKShape caller contract). */}
          {nkSessionActive ? (
            nkStarting ? (
              // HRV parity: the Navi 3-2-1 countdown reuses the resonant
              // lead-in numeral — the engine has not started, so NKShape
              // (which renders the live OM count) is not yet appropriate.
              <BreathingShape
                variant={sessionVariant ?? liveVariant}
                cue={sessionCue ?? liveCue}
                frame={null}
                leadInDigit={nkLeadInDigit}
                strings={uiStrings.breathing}
              />
            ) : (
              <NKShape
                key={`nk-${String(nkCount)}`}
                variant={sessionVariant ?? liveVariant}
                count={nkCount}
                phase={nkPhase === 'back' ? 'back' : 'front'}
                isPaused={!nkRunning}
                strings={uiStrings.breathing}
                nkReadoutStrings={uiStrings.nkReadout}
              />
            )
          ) : (
            <BreathingShape
              variant={sessionVariant ?? liveVariant}
              cue={sessionCue ?? liveCue}
              frame={appPhase === 'running' ? session.liveFrame : null}
              leadInDigit={appPhase === 'lead-in' ? leadInDigit : null}
              strings={uiStrings.breathing}
            />
          )}
          {/* Phase 30 (checkpoint feedback): the SessionReadout reflects the
              Resonant session engine. It must not render under Navi Kriya —
              otherwise a completed Resonant session leaks a stale "Session
              complete" headline onto the Navi Kriya scaffold. */}
          {activePractice === 'resonant' && (
            <SessionReadout
              frame={leadInPlaceholderFrame ?? session.liveFrame}
              status={state.status}
              isLeadInPlaceholder={appPhase === 'lead-in'}
              showCompletionHeadline={state.status === 'complete' && !inSessionView}
              strings={uiStrings.readout}
            />
          )}
          {/* Phase 31 (NK-09): the phase / round / target strip below the
              NKShape. HRV parity — it is also shown during the countdown
              (mirroring the resonant lead-in placeholder readout), seeded with
              the about-to-start values: Front phase, round 1, front target. */}
          {nkSessionActive && (
            <NKSessionReadout
              phase={!nkStarting && nkPhase === 'back' ? 'back' : 'front'}
              round={nkStarting ? 1 : nkRound}
              totalRounds={nkSettings.rounds}
              target={!nkStarting && nkPhase === 'back' ? nkSettings.frontCount / 4 : nkSettings.frontCount}
              strings={uiStrings.nkReadout}
            />
          )}
          {/* HRV parity: the inline completion headline replaces the D-12
              completion popup. Shown on the config screen after a natural
              completion, mirroring the resonant SessionReadout headline. */}
          {activePractice === 'naviKriya' && nkJustCompleted && !nkSessionActive && (
            <StatusPanel
              legend={uiStrings.nkReadout.statusLabel}
              ariaLabel={uiStrings.nkReadout.readoutAriaLabel}
            >
              <div role="status" aria-live="polite" aria-atomic="true">
                {/* Same headline copy as the resonant SessionReadout — HRV
                    parity, one shared string across both practices. */}
                <p className="text-3xl font-semibold text-[var(--color-breathing-accent-strong)]">
                  {uiStrings.readout.sessionComplete}
                </p>
              </div>
            </StatusPanel>
          )}
          {/* The configuration form (resonant knobs or NK controls) is hidden
              while a Navi Kriya session occupies the screen. */}
          {!nkSessionActive && (
            <SettingsForm
              activePractice={activePractice}
              settings={state.selectedSettings}
              isRunning={inSessionView}
              onChange={persistedSetSettings}
              onExtendDuration={session.extendDuration}
              strings={uiStrings.settingsForm}
              practiceStrings={uiStrings.practice}
              nkSettings={nkSettings}
              onNKSettingsChange={onNKSettingsChange}
              nkControlsStrings={uiStrings.nkControls}
            />
          )}
          {/* Phase 30 D-01: the live Resonant session controls render only for
              the Resonant practice. The Navi Kriya scaffold supplies its own
              disabled Start stub inside SettingsForm (no NK engine in Phase 30),
              so the real CTA must not also render — that would give two Start
              buttons and a clickable Start for an engine-less practice. */}
          {activePractice === 'resonant' && (
            <SessionControls
              status={state.status}
              onStart={() => { void onStartClick() }}
              onEnd={requestEnd}
              strings={uiStrings.controls}
              muted={audio.muted}
              audioAvailable={audio.audioAvailable}
              needsResume={audio.audioStatus === 'needs-resume'}
              resumeHintId="mute-toggle-resume-hint"
              muteStrings={uiStrings.mute}
              onMuteToggle={() => { void onMuteOrResumeClick() }}
              inLeadIn={appPhase === 'lead-in'}
            />
          )}
          {/* Phase 31 (NK-07): Navi Kriya CTA row — HRV-parity inline layout,
              rendered for the whole practice (idle config screen included) so
              the MuteToggle is visible from the start, exactly like the
              resonant SessionControls. The primary button switches Start →
              Cancel (during the countdown) → End session (while running). No
              pause button (HRV has none). */}
          {activePractice === 'naviKriya' && (
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={nkStarting ? onNKCancelClick : nkSessionActive ? onNKEndClick : onNKStartClick}
                className="min-h-11 flex-1 rounded-full bg-[var(--color-breathing-accent-strong)] px-6 py-4 text-lg font-semibold text-[var(--color-breathing-on-accent)] shadow-lg shadow-teal-900/20 transition hover:bg-[var(--color-breathing-accent)] active:bg-[var(--color-breathing-accent-strong)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
              >
                {nkStarting
                  ? uiStrings.controls.cancel
                  : nkSessionActive
                    ? uiStrings.controls.endSession
                    : uiStrings.controls.startSession}
              </button>
              <MuteToggle
                muted={audio.muted}
                audioAvailable={audio.audioAvailable}
                needsResume={false}
                resumeHintId=""
                strings={uiStrings.mute}
                onToggle={() => { void onMuteOrResumeClick() }}
              />
            </div>
          )}
          {/* Plan 06 D-32b: aria-live region for the needs-resume state transition.
              Lives at the App level (discretion #6) so the announcement fires once on
              transition, not on every MuteToggle re-render. Empty string when not in
              needs-resume mode — React's reconciler suppresses no-op updates. */}
          <div
            id="mute-toggle-resume-hint"
            role="status"
            aria-live="polite"
            className="sr-only"
          >
            {audio.audioStatus === 'needs-resume' ? uiStrings.mute.audioPausedAnnouncement : ''}
          </div>
          {/* D-15 amendment (2026-05-10, user-approved): the main-screen helper
              line was replaced with the medical-advice disclaimer. Original D-15
              locked NO disclaimer copy outside the Learn modal; the amendment
              relaxes that decision and surfaces LEARN-04 framing on the practice
              screen too. The phrase matches D-14's modal-only line verbatim. */}
          <p className="mt-4 text-sm leading-6 text-[var(--color-breathing-muted)]">
            {lockedCopy.medicalAdviceLine}
          </p>
        </div>
        {!inSessionView && !nkSessionActive && activeStats.totalSessions > 0 && (
          <StatsFooter
            stats={activeStats}
            onResetClick={onResetClick}
            strings={uiStrings.stats}
            locale={locale}
            showRounds={activePractice === 'naviKriya'}
          />
        )}
      </section>
      {/* Phase 28 D-02: banner in normal document flow, below section content.
          showBanner gates all five conditions: phone + not standalone + not
          dismissed + idle + (iOS or deferredPrompt available). */}
      {showBanner && (
        <InstallBanner
          isIOS={isIOS}
          onInstall={triggerInstall}
          onDismiss={handleInstallDismiss}
          strings={uiStrings.install}
        />
      )}
      <EndSessionDialog
        open={endDialogOpen}
        onConfirm={confirmEnd}
        onCancel={cancelEnd}
        strings={uiStrings.endSessionDialog}
      />
      {/* Phase 31 D-13: early-end confirmation for a Navi Kriya session. */}
      <EndSessionDialog
        open={nkEndDialogOpen}
        onConfirm={confirmNKEnd}
        onCancel={cancelNKEnd}
        strings={uiStrings.endSessionDialog}
      />
      <ResetStatsDialog
        open={resetDialogOpen}
        onConfirm={confirmReset}
        onCancel={cancelReset}
        strings={uiStrings.resetStatsDialog}
        title={uiStrings.practice.resetStatsTitle(activePracticeName)}
      />
      {/* Phase 6 LEARN-01..LEARN-04: Learn modal — controlled by learnDialogOpen state,
          opened from the corner anchor in idle state only (D-03/D-05). */}
      <LearnDialog open={learnDialogOpen} onClose={onLearnClose} learnContent={learnContent} lockedCopy={lockedCopy} strings={uiStrings.learn} />
      {/* Phase 15 INFRA-04: SettingsDialog shell — hosts ThemePicker/VariantPicker/TimbrePicker/LanguagePicker stubs. */}
      {/* Phase 29 INSTALL-06: prop-drill install state (isIOS/isStandalone from useIsStandaloneOrPhone,
          installable computed per D-08, triggerInstall from useBeforeInstallPrompt — single listener). */}
      <SettingsDialog
        open={settingsDialogOpen}
        onClose={onSettingsClose}
        inSessionView={inSessionView}
        strings={uiStrings}
        isIOS={isIOS}
        isStandalone={isStandalone}
        installable={isIOS || deferredPrompt !== null}
        onInstall={triggerInstall}
      />
    </main>
  )
}
