// src/storage/settings.ts
//
// Phase 4 D-14/D-15: per-field validate-and-fallback for settings + mute.
// Coercers are NON-THROWING (cousin to validateSettings in src/domain/settings.ts which
// throws — see Pitfall 3). Per-field policy means a single drifted field does NOT
// discard the rest of the envelope.
//
// Phase 34 D-01/D-02: coerceSettings trimmed to standard-only (3 fields).
// mode, initialBpm, targetBpm, warmUpMinutes, coolDownMinutes, rampDurationMinutes
// moved to coerceStretchSettings in practices.ts.

import {
  DEFAULT_SETTINGS,
  isValidBpm,
  isValidRatio,
  isValidDuration,
  type SessionSettings,
} from '../domain/settings'

import { readEnvelope, writeEnvelope, type StorageDeps } from './storage'

export function coerceSettings(raw: unknown): SessionSettings {
  const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, unknown>
    : {}
  return {
    bpm:             isValidBpm(r.bpm)           ? r.bpm             : DEFAULT_SETTINGS.bpm,
    ratio:           isValidRatio(r.ratio)       ? r.ratio           : DEFAULT_SETTINGS.ratio,
    durationMinutes: isValidDuration(r.durationMinutes) ? r.durationMinutes : DEFAULT_SETTINGS.durationMinutes,
  }
}

export function coerceMute(raw: unknown): boolean {
  return typeof raw === 'boolean' ? raw : false  // D-07 seed default + D-15 type check
}

export function loadMute(deps: StorageDeps = {}): boolean {
  return coerceMute(readEnvelope(deps).mute)
}

export function saveMute(muted: boolean, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  writeEnvelope({ ...env, mute: muted }, deps)
}
