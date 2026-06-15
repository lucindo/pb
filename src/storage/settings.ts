// src/storage/settings.ts
//
// Per-field validate-and-fallback for settings + mute. Coercers are NON-THROWING
// (cousin to validateSettings in src/domain/settings.ts which throws). Per-field
// policy means a single drifted field does NOT discard the rest of the envelope.

import {
  DEFAULT_SETTINGS,
  isValidBpm,
  isValidRatio,
  isValidDuration,
  type SessionSettings,
} from '../domain/settings'

import { asRecord, readEnvelope, writeEnvelope, type StorageDeps } from './storage'

export function coerceSettings(raw: unknown): SessionSettings {
  const r = asRecord(raw)
  return {
    bpm:             isValidBpm(r.bpm)           ? r.bpm             : DEFAULT_SETTINGS.bpm,
    ratio:           isValidRatio(r.ratio)       ? r.ratio           : DEFAULT_SETTINGS.ratio,
    durationMinutes: isValidDuration(r.durationMinutes) ? r.durationMinutes : DEFAULT_SETTINGS.durationMinutes,
  }
}

export function loadSettings(deps: StorageDeps = {}): SessionSettings {
  return coerceSettings(readEnvelope(deps).settings)
}

export function savePatternBreathingSettings(settings: SessionSettings, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  writeEnvelope({ ...env, settings }, deps)
}

export function coerceMute(raw: unknown): boolean {
  return typeof raw === 'boolean' ? raw : false
}

export function loadMute(deps: StorageDeps = {}): boolean {
  return coerceMute(readEnvelope(deps).mute)
}

export function saveMute(muted: boolean, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  writeEnvelope({ ...env, mute: muted }, deps)
}
