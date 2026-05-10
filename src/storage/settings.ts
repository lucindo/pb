// src/storage/settings.ts
//
// Phase 4 D-14/D-15: per-field validate-and-fallback for settings + mute.
// Coercers are NON-THROWING (cousin to validateSettings in src/domain/settings.ts which
// throws — see Pitfall 3). Per-field policy means a single drifted field does NOT
// discard the rest of the envelope.

import {
  BPM_OPTIONS,
  RATIO_OPTIONS,
  DURATION_OPTIONS,
  DEFAULT_SETTINGS,
  type SessionSettings,
  type RatioLabel,
  type DurationOption,
} from '../domain/settings'

import { readEnvelope, writeEnvelope, type StorageDeps } from './storage'

function isValidBpm(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && (BPM_OPTIONS as readonly number[]).includes(v)
}

function isValidRatio(v: unknown): v is RatioLabel {
  return typeof v === 'string' && (RATIO_OPTIONS as readonly string[]).includes(v)
}

function isValidDuration(v: unknown): v is DurationOption {
  if (v === 'open-ended') return true
  return typeof v === 'number'
    && Number.isFinite(v)
    && (DURATION_OPTIONS as readonly DurationOption[]).includes(v)
}

export function coerceSettings(raw: unknown): SessionSettings {
  const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, unknown>
    : {}
  return {
    bpm:             isValidBpm(r.bpm)             ? r.bpm             : DEFAULT_SETTINGS.bpm,
    ratio:           isValidRatio(r.ratio)         ? r.ratio           : DEFAULT_SETTINGS.ratio,
    durationMinutes: isValidDuration(r.durationMinutes) ? r.durationMinutes : DEFAULT_SETTINGS.durationMinutes,
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
