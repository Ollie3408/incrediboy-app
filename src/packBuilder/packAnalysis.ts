/**
 * packAnalysis.ts — loop timing, BPM/harmonic scoring, density & low-end analysis.
 *
 * Pure functions — safe for dev tooling and future server-side curation scripts.
 */

import { averageHarmonicMatch } from './harmonicGroups'
import type {
  CompatibleAudioPack,
  CompatiblePackPad,
  MixCompatibilityReport,
  PadCompatibilityReport,
  SoundCompatibilityMetadata,
} from './types'

const EXPECTED_BEATS_PER_BAR = 4

// ── Loop duration ─────────────────────────────────────────────────────────────

/** Expected loop length in seconds for 4/4 at given BPM and bar count. */
export function expectedLoopDuration(bpm: number, bars: number): number {
  return (60 / bpm) * EXPECTED_BEATS_PER_BAR * bars
}

export type LoopDurationAnalysis = {
  expectedDurationSec: number | null
  actualDurationSec: number
  driftSeconds: number | null
  driftPercent: number | null
  bpmMatchPercent: number | null
}

/**
 * Compare actual file duration against BPM/bar metadata.
 * bpmMatchPercent drops as drift exceeds 1.5 % (same threshold as musicClock validation).
 */
export function analyzeLoopDuration(
  actualDurationSec: number,
  bpm: number | null,
  bars: number | null,
  driftThresholdPct = 1.5,
): LoopDurationAnalysis {
  if (!bpm || !bars || actualDurationSec <= 0) {
    return {
      expectedDurationSec: null,
      actualDurationSec: actualDurationSec,
      driftSeconds: null,
      driftPercent: null,
      bpmMatchPercent: bpm ? 75 : 85,
    }
  }

  const expected = expectedLoopDuration(bpm, bars)
  const driftSeconds = Math.abs(actualDurationSec - expected)
  const driftPercent = (driftSeconds / expected) * 100
  let bpmMatchPercent = 100
  if (driftPercent > driftThresholdPct) {
    bpmMatchPercent = Math.max(0, 100 - driftPercent * 8)
  }

  return {
    expectedDurationSec: expected,
    actualDurationSec: actualDurationSec,
    driftSeconds,
    driftPercent,
    bpmMatchPercent,
  }
}

// ── BPM compatibility ─────────────────────────────────────────────────────────

/**
 * Estimate BPM lock quality vs pack master (0–100).
 * One-shots / null BPM return a neutral-high score (not rhythmic spine).
 */
export function estimateBpmCompatibility(padBpm: number | null, masterBpm: number): number {
  if (padBpm === null || padBpm <= 0) return 88
  const ratio = Math.abs(padBpm - masterBpm) / masterBpm
  if (ratio === 0) return 100
  if (ratio <= 0.01) return 98
  if (ratio <= 0.02) return 95
  if (ratio <= 0.03) return 88
  if (ratio <= 0.05) return 78
  if (ratio <= 0.08) return 62
  if (ratio <= 0.12) return 45
  return Math.max(15, 100 - ratio * 400)
}

// ── Harmonic compatibility ────────────────────────────────────────────────────

export function estimateHarmonicCompatibility(
  pad: SoundCompatibilityMetadata,
  _masterKey: string,
  otherPads: SoundCompatibilityMetadata[],
): number {
  if (otherPads.length === 0) return 100
  return averageHarmonicMatch(
    pad.harmonicGroup,
    pad.key,
    otherPads.map((p) => ({ group: p.harmonicGroup, key: p.key })),
  )
}

// ── Low-end overlap ───────────────────────────────────────────────────────────

/**
 * Detect excessive sub/bass stacking across active layers.
 * Returns conflict severity 0–100 (higher = worse).
 */
export function detectLowEndConflict(active: SoundCompatibilityMetadata[]): number {
  if (active.length === 0) return 0

  const lowEndPads = active.filter((p) => p.lowEndWeight >= 0.35)
  const totalWeight = active.reduce((s, p) => s + p.lowEndWeight, 0)
  const bassCount = active.filter((p) => p.category === 'bass').length
  const drumGrooveHeavy = active.filter(
    (p) => p.category === 'drum-groove' && p.lowEndWeight >= 0.5,
  ).length

  let conflict = 0
  if (totalWeight > 1.8) conflict += (totalWeight - 1.8) * 45
  if (bassCount > 2) conflict += (bassCount - 2) * 22
  if (drumGrooveHeavy > 2) conflict += (drumGrooveHeavy - 2) * 18
  if (lowEndPads.length > 3) conflict += (lowEndPads.length - 3) * 12

  return Math.min(100, Math.round(conflict))
}

// ── Transient density ─────────────────────────────────────────────────────────

/**
 * Detect overly dense / busy combinations (mud risk).
 * Returns overload severity 0–100 (higher = worse).
 */
export function detectDensityOverload(active: SoundCompatibilityMetadata[]): number {
  if (active.length === 0) return 0

  const densitySum = active.reduce((s, p) => s + p.transientDensity * p.energy, 0)
  const highEnergyCount = active.filter((p) => p.energy >= 0.75).length
  const melodyCount = active.filter((p) => p.category === 'melody').length

  let overload = 0
  if (densitySum > 2.2) overload += (densitySum - 2.2) * 35
  if (highEnergyCount > 4) overload += (highEnergyCount - 4) * 15
  if (melodyCount > 3) overload += (melodyCount - 3) * 12

  return Math.min(100, Math.round(overload))
}

// ── Interactive mixability score ──────────────────────────────────────────────

/**
 * Composite score for how well a pad fits an active mix (0–100, higher = better).
 * Weights: curated mixabilityScore, BPM, harmony, penalties for low-end/density.
 */
export function scoreInteractiveMixability(
  pad: CompatiblePackPad,
  activeOthers: CompatiblePackPad[],
  masterBpm: number,
  masterKey: string,
): number {
  const meta = pad.compatibility
  const othersMeta = activeOthers.map((p) => p.compatibility)

  const bpmScore = estimateBpmCompatibility(meta.bpm, masterBpm)
  const harmScore = estimateHarmonicCompatibility(meta, masterKey, othersMeta)
  const combined = [...othersMeta, meta]
  const lowEndPenalty = detectLowEndConflict(combined) * 0.35
  const densityPenalty = detectDensityOverload(combined) * 0.25

  const raw =
    meta.mixabilityScore * 0.35 +
    bpmScore * 0.25 +
    harmScore * 0.25 +
    (100 - lowEndPenalty) * 0.075 +
    (100 - densityPenalty) * 0.075

  return Math.round(Math.max(0, Math.min(100, raw)))
}

// ── Pad & mix reports ─────────────────────────────────────────────────────────

export function analyzePadCompatibility(
  pad: CompatiblePackPad,
  pack: CompatibleAudioPack,
  activeOthers: CompatiblePackPad[],
  actualDurationSec: number | null = null,
): PadCompatibilityReport {
  const meta = pad.compatibility
  const othersMeta = activeOthers.map((p) => p.compatibility)
  const flags: string[] = []

  const duration =
    actualDurationSec !== null && actualDurationSec > 0
      ? analyzeLoopDuration(actualDurationSec, meta.bpm, meta.bars)
      : null

  const bpmMatch = duration?.bpmMatchPercent ?? estimateBpmCompatibility(meta.bpm, pack.spine.bpm)
  const harmonicMatch = estimateHarmonicCompatibility(meta, pack.spine.key, othersMeta)
  const lowEnd = detectLowEndConflict([...othersMeta, meta])
  const density = detectDensityOverload([...othersMeta, meta])
  const overall = scoreInteractiveMixability(pad, activeOthers, pack.spine.bpm, pack.spine.key)

  if (bpmMatch < 70) flags.push('bpm-drift')
  if (harmonicMatch < 75) flags.push('harmonic-clash')
  if (lowEnd > 40) flags.push('low-end-stack')
  if (density > 45) flags.push('density-overload')
  if (meta.mixabilityScore < 60) flags.push('low-curation-score')
  if (meta.transientDensity > 0.85 && meta.category === 'melody') flags.push('busy-melody')

  return {
    padId: pad.id,
    label: pad.label,
    bpmMatchPercent: Math.round(bpmMatch),
    harmonicCompatibilityPercent: Math.round(harmonicMatch),
    lowEndConflictPercent: lowEnd,
    densityRiskPercent: density,
    overallMixabilityScore: overall,
    durationDriftPercent: duration?.driftPercent ?? null,
    actualDurationSec: duration?.actualDurationSec ?? null,
    flags,
  }
}

export function analyzeActiveMix(
  pack: CompatibleAudioPack,
  activePadIds: string[],
  durationByPadId: Record<string, number> = {},
): MixCompatibilityReport {
  const activePads = pack.pads.filter((p) => activePadIds.includes(p.id))
  const warnings: string[] = []

  const padReports = activePads.map((pad) => {
    const others = activePads.filter((p) => p.id !== pad.id)
    return analyzePadCompatibility(
      pad,
      pack,
      others,
      durationByPadId[pad.id] ?? null,
    )
  })

  const avg = (vals: number[]) =>
    vals.length === 0 ? 100 : vals.reduce((a, b) => a + b, 0) / vals.length

  const allMeta = activePads.map((p) => p.compatibility)
  const lowEndConflict = detectLowEndConflict(allMeta)
  const densityOverload = detectDensityOverload(allMeta)

  if (lowEndConflict > 50) warnings.push('Heavy low-end overlap — reduce bass or kick layers')
  if (densityOverload > 50) warnings.push('Mix is transient-dense — remove a melody or drum layer')
  if (avg(padReports.map((r) => r.bpmMatchPercent)) < 75) {
    warnings.push('BPM mismatch on one or more layers — check spine alignment')
  }

  return {
    packId: pack.id,
    masterBpm: pack.spine.bpm,
    masterKey: pack.spine.key,
    activePadCount: activePads.length,
    averageBpmMatch: Math.round(avg(padReports.map((r) => r.bpmMatchPercent))),
    averageHarmonicMatch: Math.round(avg(padReports.map((r) => r.harmonicCompatibilityPercent))),
    lowEndConflictPercent: lowEndConflict,
    densityOverloadPercent: densityOverload,
    overallMixabilityScore: Math.round(avg(padReports.map((r) => r.overallMixabilityScore))),
    pads: padReports,
    warnings,
  }
}

/** Score every pad in a pack against the spine (curation preview, no active mix). */
export function analyzePackCuration(pack: CompatibleAudioPack): PadCompatibilityReport[] {
  return pack.pads.map((pad) => analyzePadCompatibility(pad, pack, []))
}

/** Validate pack spine consistency — dev helper. */
export function validatePackSpine(pack: CompatibleAudioPack): string[] {
  const issues: string[] = []
  for (const pad of pack.pads) {
    const m = pad.compatibility
    if (!m.oneShot && m.bpm !== null && m.bpm !== pack.spine.bpm) {
      issues.push(`${pad.id}: BPM ${m.bpm} ≠ spine ${pack.spine.bpm}`)
    }
    if (m.mixabilityScore < 0 || m.mixabilityScore > 100) {
      issues.push(`${pad.id}: mixabilityScore out of range`)
    }
  }
  return issues
}
