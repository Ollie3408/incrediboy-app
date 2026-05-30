/**
 * musicClock.ts — lightweight musical clock utilities for IncrediBoy.
 *
 * Pure functions, no React — importable by App.tsx and any future modules.
 *
 * ARCHITECTURE
 * ────────────────────────────────────────────────────────────────────────────
 * A MusicalClock records when playback last started and the current BPM
 * timing so the app can schedule audio events at beat/bar boundaries.
 *
 * HOW TO CONTROL QUANTIZATION
 * • resolveQuantization()  — picks the quantize mode for each pad
 * • msUntilNextBoundary()  — converts mode → ms delay
 * • Set musicalClockRef.current.originMs in startOrRestartLoops()
 *
 * HOW TO DISABLE QUANTIZATION GLOBALLY
 * • In resolveQuantization(), change all returns to 'immediate'
 * • OR set every pad's playbackQuantization to 'immediate' in the pack config
 *
 * HOW TO ADJUST LOOP VALIDATION THRESHOLDS
 * • Pass a custom thresholdPct to validateLoopTiming()
 * • Default: warn when drift > 1.5% of expected duration
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type QuantizeMode = 'immediate' | 'beat' | 'bar'

export type MusicalClock = {
  /** performance.now() timestamp recorded when playback last started. 0 = not started yet. */
  originMs: number
  /** Quarter-note duration in ms = 60_000 / bpm */
  beatMs: number
  /** One bar (4/4) in ms = beatMs × 4 */
  barMs: number
  /** Master loop cycle in ms (matches MASTER_LOOP_MS constant) */
  loopMs: number
}

// ── Clock factory / updaters ─────────────────────────────────────────────────

/** Create a fresh clock for the given BPM and master loop length. */
export function makeClock(bpm: number, loopMs: number): MusicalClock {
  const beatMs = 60_000 / bpm
  return { originMs: 0, beatMs, barMs: beatMs * 4, loopMs }
}

/** Return a new clock with updated BPM-derived timings (preserves originMs). */
export function clockWithBpm(clock: MusicalClock, bpm: number): MusicalClock {
  const beatMs = 60_000 / bpm
  return { ...clock, beatMs, barMs: beatMs * 4 }
}

// ── Quantization helpers ─────────────────────────────────────────────────────

/**
 * Milliseconds until the next quantize boundary from now.
 *
 * Returns 0 for 'immediate' or if the clock hasn't started (originMs === 0).
 * If the result would be < minMs (too close to boundary), adds an extra unit
 * to avoid scheduling a nearly-instant timer.
 *
 * @param clock     Current musical clock state
 * @param quantize  'immediate' | 'beat' | 'bar'
 * @param minMs     Minimum meaningful delay — default 20 ms
 */
export function msUntilNextBoundary(
  clock: MusicalClock,
  quantize: QuantizeMode,
  minMs = 20,
): number {
  if (quantize === 'immediate' || clock.originMs === 0) return 0
  const unit = quantize === 'beat' ? clock.beatMs : clock.barMs
  if (unit <= 0) return 0
  const elapsed = performance.now() - clock.originMs
  const msIntoUnit = elapsed % unit
  const remaining = unit - msIntoUnit
  // If remaining is tiny, advance to the NEXT boundary to avoid micro-delays
  return remaining < minMs ? remaining + unit : remaining
}

// ── Beat/bar position readouts (for debug overlay) ───────────────────────────

/** 1-indexed beat within the current bar (1–4), or 0 if not started. */
export function currentBeatInBar(clock: MusicalClock): number {
  if (clock.originMs === 0) return 0
  const elapsed = performance.now() - clock.originMs
  return (Math.floor(elapsed / clock.beatMs) % 4) + 1
}

/** 1-indexed bar within the current master loop, or 0 if not started. */
export function currentBarInLoop(clock: MusicalClock): number {
  if (clock.originMs === 0 || clock.loopMs <= 0) return 0
  const barsPerLoop = Math.max(1, Math.floor(clock.loopMs / clock.barMs))
  const elapsed = performance.now() - clock.originMs
  return (Math.floor(elapsed / clock.barMs) % barsPerLoop) + 1
}

// ── Loop validation (dev only) ────────────────────────────────────────────────

/**
 * Warns in the console when a loop's actual duration drifts more than
 * `thresholdPct` % from the BPM/bar-derived expected duration.
 * No-ops in production builds.
 *
 * HOW TO CONFIGURE: adjust thresholdPct (default 1.5 %).
 *   validateLoopTiming(label, dur, bpm, bars, 0.5) — stricter 0.5 % threshold
 */
export function validateLoopTiming(
  label: string,
  actualDuration: number,
  bpm: number | null,
  bars: number | null,
  thresholdPct = 1.5,
): void {
  if (!import.meta.env.DEV) return
  if (!bpm || !bars || actualDuration <= 0) return
  const expected = (60 / bpm) * 4 * bars
  const driftPct = (Math.abs(actualDuration - expected) / expected) * 100
  const tag = driftPct > thresholdPct ? '⚠' : '✓'
  const msg =
    `[loop-validation] ${tag} ${label}: ` +
    `actual=${actualDuration.toFixed(4)}s  ` +
    `expected=${expected.toFixed(4)}s @ ${bpm}bpm/${bars}bar  ` +
    `drift=${driftPct.toFixed(2)}%`
  if (driftPct > thresholdPct) {
    console.warn(msg)
  } else {
    console.debug(msg)
  }
}

// ── Drift correction (architecture only — not currently active) ───────────────

/**
 * Calculates an `audio.playbackRate` correction to bring a drifting loop back
 * into sync with the expected BPM/bar grid.
 *
 * DISABLED BY DEFAULT — only activates when `allowCorrection === true`.
 * Max correction is ±2 % (0.98–1.02 range) to prevent audible pitch shift.
 *
 * To enable for a specific pad: set `allowDriftCorrection: true` in the pack
 * config. Currently no pads have this enabled.
 *
 * To enable globally (not recommended): change the guard to always run.
 */
export function computePlaybackRate(
  actualDuration: number,
  bpm: number | null,
  bars: number | null,
  allowCorrection: boolean,
): number {
  if (!allowCorrection || !bpm || !bars || actualDuration <= 0) return 1.0
  const expected = (60 / bpm) * 4 * bars
  const ratio = expected / actualDuration
  // Clamp correction to ±2 % — inaudible pitch shift, meaningful sync correction
  return Math.max(0.98, Math.min(1.02, ratio))
}

// ── Micro fade-in / gain ramp ─────────────────────────────────────────────────

/**
 * Anything with a writable `volume` (0–1) can be ramped. This lets the same
 * ramp helpers drive both an HTMLAudioElement and the Web Audio BufferVoice
 * (whose `volume` setter writes its GainNode), so the migration to a
 * sample-accurate buffer engine needs no change to the ramp call sites.
 */
export interface GainRampTarget {
  volume: number
}

/**
 * Per-target ramp handle.  When a new ramp starts on a target, any previous
 * ramp is cancelled by setting its handle's `cancelled` flag — preventing two
 * concurrent RAF loops from fighting over `volume` (which produced audible
 * clicks, dips, and momentary silence in earlier versions).
 */
const _activeRamps = new WeakMap<GainRampTarget, { cancelled: boolean }>()

/** Returns true if a gain ramp is currently running on this target. */
export function isRampActive(audio: GainRampTarget): boolean {
  return _activeRamps.has(audio)
}

/** Cancel any in-flight ramp for this target without changing its volume. */
export function cancelGainRamp(audio: GainRampTarget): void {
  const handle = _activeRamps.get(audio)
  if (handle) {
    handle.cancelled = true
    _activeRamps.delete(audio)
  }
}

/**
 * Ramp `audio.volume` from its current value to `targetVol` over `durationMs`.
 *
 * Key behaviours vs. the previous implementation:
 *   • Cancels any in-flight ramp on the same element before starting a new one,
 *     preventing two RAF loops from simultaneously writing conflicting values.
 *   • Starts from the CURRENT volume rather than hard-resetting to 0, so calling
 *     code that has already set volume=0 still produces a clean 0→target ramp,
 *     but a re-triggered ramp (e.g. rapid mute/unmute) starts from wherever the
 *     volume currently is — eliminating the jarring silent dip.
 *   • Callers that want a 0→target fade must set `audio.volume = 0` themselves
 *     before calling (all existing call sites in App.tsx already do this).
 *
 * RAF is coalesced by the browser into a single frame callback per element and
 * has no adverse effect on the audio thread scheduling.
 */
export function scheduleGainRamp(
  audio: GainRampTarget,
  targetVol: number,
  durationMs = 40,
): void {
  // Cancel any previous ramp on this element
  cancelGainRamp(audio)

  if (targetVol <= 0) {
    audio.volume = 0
    return
  }

  const handle = { cancelled: false }
  _activeRamps.set(audio, handle)

  const startVol = audio.volume          // Ramp from current, not from 0
  const startMs = performance.now()

  const tick = () => {
    if (handle.cancelled) return         // Superseded — stop immediately
    const progress = Math.min(1, (performance.now() - startMs) / durationMs)
    audio.volume = startVol + (targetVol - startVol) * progress
    if (progress < 1) {
      requestAnimationFrame(tick)
    } else {
      _activeRamps.delete(audio)         // Clean up when complete
    }
  }
  requestAnimationFrame(tick)
}

// ── Category gain staging ─────────────────────────────────────────────────────

/**
 * Compute a gain multiplier (0–1) for each active category based on how
 * many layers of that type are currently playing.
 *
 * Returns a Map<category, multiplier>.  Missing entries = multiplier 1.0.
 *
 * THRESHOLDS (HOW TO ADJUST):
 *   • bass:    starts ducking beyond 2 active layers, -7 % per extra layer
 *   • melody + atmosphere combined: beyond 3 layers, -5 % per extra
 *   • All other categories are left unattenuated
 *
 * The compressor remains the hard safety net — this is pre-limiter shaping.
 */
export function computeCategoryGains(
  categoryCounts: Partial<Record<string, number>>,
): Map<string, number> {
  const gains = new Map<string, number>()

  const bassCount = categoryCounts['bass'] ?? 0
  if (bassCount > 2) {
    const m = Math.pow(0.93, bassCount - 2)
    gains.set('bass', m)
  }

  const melCount = (categoryCounts['melody'] ?? 0) + (categoryCounts['atmosphere'] ?? 0)
  if (melCount > 3) {
    const m = Math.pow(0.95, melCount - 3)
    gains.set('melody', m)
    gains.set('atmosphere', m)
  }

  return gains
}
