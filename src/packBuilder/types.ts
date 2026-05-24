/**
 * packBuilder/types.ts — compatibility metadata for IncrediBoy interactive packs.
 *
 * Core Mix Pack Alpha and future curated packs attach SoundCompatibilityMetadata
 * to every pad so analysis utilities can score mixability before playback.
 */

import type { QuantizeMode } from '../musicClock'

/** Interactive layering roles — prefer isolated stems over full productions. */
export type CoreMixCategory =
  | 'drum-groove'
  | 'bass'
  | 'melody'
  | 'atmosphere'
  | 'fx'
  | 'vocal-chop'
  | 'transition'

/**
 * Harmonic family relative to pack tonic.
 * Used by harmonicGroups.ts for compatibility scoring.
 */
export type HarmonicGroup =
  | 'tonic'
  | 'subdominant'
  | 'dominant'
  | 'modal'
  | 'relative'
  | 'atonal'
  | 'percussive'

/** Per-sound compatibility profile (required on every Core Mix pad). */
export type SoundCompatibilityMetadata = {
  bpm: number | null
  key: string | null
  bars: number | null
  energy: number
  category: CoreMixCategory
  harmonicGroup: HarmonicGroup
  /** 0 = sparse/sustained, 1 = busy/percussive — detects layering mud. */
  transientDensity: number
  /** 0 = no subs, 1 = heavy subs/kick — detects low-end stacking. */
  lowEndWeight: number
  /** Pre-curated 0–100 interactive mixability (higher = safer default layer). */
  mixabilityScore: number
  playbackQuantization: QuantizeMode
  oneShot: boolean
}

/** A pad in a compatible / Core Mix pack. */
export type CompatiblePackPad = {
  id: string
  label: string
  audioFile: string
  sourceFile: string
  /** Maps to game PackAudioCategory when registered in App.tsx. */
  gameCategory: 'beat' | 'bass' | 'melody' | 'fx' | 'voice' | 'percussion' | 'transition' | 'atmosphere'
  volume: number
  notes?: string
  compatibility: SoundCompatibilityMetadata
}

/** Pack-level spine — all pads should align to this BPM/key where possible. */
export type CompatiblePackSpine = {
  bpm: number
  key: string
  bars: number
  harmonicTonic: HarmonicGroup
}

export type CompatibleAudioPack = {
  id: string
  name: string
  description: string
  spine: CompatiblePackSpine
  /** Design philosophy tag for tooling / docs. */
  philosophy: 'core-mix-alpha' | 'new-pack-alpha' | 'bravo-pack' | 'delta-pack'
  pads: CompatiblePackPad[]
  audioBasePath: string
  audioUrls: Record<string, string>
}

/** Result of analyzing one pad against the pack spine. */
export type PadCompatibilityReport = {
  padId: string
  label: string
  bpmMatchPercent: number
  harmonicCompatibilityPercent: number
  lowEndConflictPercent: number
  densityRiskPercent: number
  overallMixabilityScore: number
  durationDriftPercent: number | null
  actualDurationSec: number | null
  flags: string[]
}

/** Aggregate report for a set of active pads. */
export type MixCompatibilityReport = {
  packId: string
  masterBpm: number
  masterKey: string
  activePadCount: number
  averageBpmMatch: number
  averageHarmonicMatch: number
  lowEndConflictPercent: number
  densityOverloadPercent: number
  overallMixabilityScore: number
  pads: PadCompatibilityReport[]
  warnings: string[]
}
