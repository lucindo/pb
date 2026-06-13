// Structural Web Audio constants shared by the cue synths. These are physical
// facts of the Web Audio graph (a near-zero floor, a GC margin, a ramp lead),
// not feel-tuning — keep per-cue tuning (gains, durations, decay taus) local to
// each synth. STRIKE_RAMP_OFFSET equals audioEngine.SAFE_LEAD_SEC numerically
// but is a distinct concept (strike ramp lead, not the scheduler safe-lead).

export const STRIKE_RAMP_OFFSET = 0.005 // when + 0.005 — instant attack with a tiny ramp lead
export const CLEANUP_PADDING_SEC = 0.2 // extra wallclock margin before nodes are GC-able
export const NEAR_SILENCE = 0.0001 // setTargetAtTime can't ramp to true zero
