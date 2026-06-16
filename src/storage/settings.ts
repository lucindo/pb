// src/storage/settings.ts
//
// Validate-and-fallback for the persisted pattern settings + mute. The pattern
// coercer (validatePatternSettings) is per-field and NON-THROWING, so a single
// drifted field does not discard the rest, and a legacy resonance envelope
// coerces cleanly to the pattern defaults.

import { validatePatternSettings, type PatternSettings } from '../domain/settings'

import { readEnvelope, writeEnvelope, type StorageDeps } from './storage'

export function coerceSettings(raw: unknown): PatternSettings {
  return validatePatternSettings(raw)
}

export function loadSettings(deps: StorageDeps = {}): PatternSettings {
  return coerceSettings(readEnvelope(deps).settings)
}

export function savePatternBreathingSettings(settings: PatternSettings, deps: StorageDeps = {}): void {
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
