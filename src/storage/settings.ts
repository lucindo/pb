// src/storage/settings.ts
//
// Phase 4 D-14/D-15: per-field validate-and-fallback for settings + mute.
// Coercers are NON-THROWING (cousin to validateSettings in src/domain/settings.ts which
// throws — see Pitfall 3). Per-field policy means a single drifted field does NOT
// discard the rest of the envelope.

import {
  DEFAULT_SETTINGS,
  DEFAULT_STRETCH_SETTINGS,
  isValidBpm,
  isValidRatio,
  isValidDuration,
  isValidMode,
  isValidWarmUp,
  isValidCoolDown,
  isValidRampDuration,
  type SessionSettings,
} from '../domain/settings'

import { readEnvelope, writeEnvelope, type StorageDeps } from './storage'

export function coerceSettings(raw: unknown): SessionSettings {
  const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, unknown>
    : {}
  return {
    bpm:                 isValidBpm(r.bpm)                     ? r.bpm                     : DEFAULT_SETTINGS.bpm,
    ratio:               isValidRatio(r.ratio)                 ? r.ratio                   : DEFAULT_SETTINGS.ratio,
    durationMinutes:     isValidDuration(r.durationMinutes)    ? r.durationMinutes         : DEFAULT_SETTINGS.durationMinutes,
    mode:                isValidMode(r.mode)                   ? r.mode                    : DEFAULT_SETTINGS.mode,
    initialBpm:          isValidBpm(r.initialBpm)              ? r.initialBpm              : DEFAULT_STRETCH_SETTINGS.initialBpm,
    targetBpm:           isValidBpm(r.targetBpm)               ? r.targetBpm               : DEFAULT_STRETCH_SETTINGS.targetBpm,
    warmUpMinutes:       isValidWarmUp(r.warmUpMinutes)        ? r.warmUpMinutes           : DEFAULT_STRETCH_SETTINGS.warmUpMinutes,
    coolDownMinutes:     isValidCoolDown(r.coolDownMinutes)    ? r.coolDownMinutes         : DEFAULT_STRETCH_SETTINGS.coolDownMinutes,
    rampDurationMinutes: isValidRampDuration(r.rampDurationMinutes) ? r.rampDurationMinutes : DEFAULT_STRETCH_SETTINGS.rampDurationMinutes,
  }
}

export function coerceMute(raw: unknown): boolean {
  return typeof raw === 'boolean' ? raw : false  // D-07 seed default + D-15 type check
}

export function loadSettings(deps: StorageDeps = {}): SessionSettings {
  return coerceSettings(readEnvelope(deps).settings)
}

export function saveSettings(settings: SessionSettings, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  writeEnvelope({ ...env, settings }, deps)
}

export function loadMute(deps: StorageDeps = {}): boolean {
  return coerceMute(readEnvelope(deps).mute)
}

export function saveMute(muted: boolean, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  writeEnvelope({ ...env, mute: muted }, deps)
}
