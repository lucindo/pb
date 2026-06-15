// Silent-loop <audio> bypass for the iOS hardware silent switch. Zero React imports.
//
// Coerces iOS Safari's audio session category from "ambient" to "playback" so cue
// audio routes through the device speaker even when the silent switch is ON and no
// headphones are connected. Used by createAudioEngine for the breathing session.
//
// iOS gesture-token constraint: createSilentLoopBypass() MUST be called
// SYNCHRONOUSLY on the user-gesture head, BEFORE any await. iOS Safari ties
// AudioContext construction and HTMLAudioElement construction to the same gesture
// token; constructing the element after the first await breaks the chain and the
// session fails to coerce from 'ambient' to 'playback'.

// Silent-loop WAV data URL — format: 16-bit signed / 22050 Hz / 200 samples (~9 ms),
// near-DC stepped pulse. Peak amplitude is 1/32768 ≈ -90 dBFS — inaudible on iPhone
// speakers at full system volume. Loop-continuous (sample 0 == sample 199 == 0, no
// boundary clicks). NOT pure digital silence — iOS Safari rejects fully-silent tracks
// for session coercion; this track contains ±1 samples so the browser treats it as a
// real audio source.
//
// SILENT_LOOP_VOLUME stays at 0.0001 — a no-op on iOS (hardware-controlled volume) but
// attenuates on Android Chrome and desktop (defense in depth). iOS Safari ignores the
// HTMLMediaElement.volume attribute entirely; attenuation is encoded into the PCM
// samples themselves, not via .volume.
const SILENT_WAV_DATA_URL =
  'data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YZABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
const SILENT_LOOP_VOLUME = 0.0001

export interface SilentLoopBypass {
  /** Pause the element and release the decoded buffer. Idempotent. */
  teardown(this: void): void
}

/**
 * Construct + play the silent-loop element. MUST be called synchronously on the
 * user-gesture head (see file header). Returns a `teardown()` handle the owner
 * calls when the audio session ends.
 */
export function createSilentLoopBypass(): SilentLoopBypass {
  const element = new Audio(SILENT_WAV_DATA_URL)
  // Reason: `playsInline` is typed only on HTMLVideoElement in lib.dom.d.ts, but
  // iOS Safari honors the property on HTMLMediaElement (the trick lifted from
  // Howler.js). The runtime assignment is correct; the cast documents the
  // type-vs-runtime gap.
  ;(element as HTMLMediaElement & { playsInline: boolean }).playsInline = true
  element.loop = true
  element.muted = false
  element.volume = SILENT_LOOP_VOLUME
  // A .play() rejection (autoplay policy regression, codec issue) does NOT propagate.
  // Session continues; iOS silent-switch users simply do not get speaker routing — no
  // worse than omitting the element entirely.
  //
  // Optional chain: per HTMLMediaElement spec play() returns a Promise<void>, but very
  // old browsers (Safari < 11) and the jsdom test environment return undefined. The
  // chain absorbs that variant under the same silent-absorb posture.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  void element.play()?.catch(() => undefined)

  let torndown = false
  return {
    teardown(): void {
      if (torndown) return
      torndown = true
      element.pause()
      element.removeAttribute('src')
    },
  }
}
