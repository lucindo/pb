// Phase 4: Storage module barrel export
// NOTE: This is a stub created by Plan 02 to satisfy TypeScript imports.
// The real implementation is shipped by Plan 01. These stubs will be
// overwritten when Plan 01 merges into the main branch.

export interface PersistedStats {
  totalSessions: number
  totalElapsedSeconds: number
  lastSessionAtMs: number | null
  lastSessionDurationSeconds: number | null
}

// Re-export format utilities
export {
  formatSessionCount,
  formatTotalMinutes,
  formatLastSessionDate,
  formatLastSessionDuration,
} from './format'
