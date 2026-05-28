/**
 * Alpha Pack — curated from Stickz - Byte + Stickz VCT
 *
 * BPM spine: 128  ·  Key: multi (C#min / Gmin / Amin / A#min / Emin / Fmin / Bmin)
 * Pads: 24 (matches ALL_PADS grid indices 0–23)
 *
 * Style: cleaner, smoother, lower fatigue than Delta.
 * Uses alternate Byte stems + full-mix loops not touched by Delta Pack.
 * Beats are hat-heavy (4 × hi-hat loops + 1 full groove) vs Delta's mixed approach.
 * Bass uses resampled/break/growl stems — less dominant low-end than Delta's main layers.
 * Melodies are smooth sustained pads (supersaw, reverses, response phrase).
 * Vocals span 5 entirely fresh harmonic keys.
 *
 * INDEX ORDER (must match ALL_PADS in App.tsx):
 *  0  beat-0       → beat-01 (Byte Full Groove 002, 16 bars)
 *  1  beat-1       → beat-02 (Byte Hi-Hat 003, 4 bars)
 *  2  beat-2       → beat-03 (Byte Hi-Hat 004, 4 bars)
 *  3  beat-3       → beat-04 (Byte Hi-Hat 006, 4 bars)
 *  4  beat-4       → beat-05 (Byte Hi-Hat 007, 4 bars)
 *  5  melody-0     → melody-01 (Byte Lead Supersaw Amin, 16 bars)
 *  6  melody-1     → melody-02 (Byte Lead Reverses Gmin, 16 bars)
 *  7  melody-2     → melody-03 (Byte Lead Response A#min, 16 bars)
 *  8  effect-0     → fx-01 (Byte Impact 002 — 8-bar cycle, 4.3s hit + silence)
 *  9  effect-1     → fx-02 (Byte Uplifter 002 — 8-bar cycle, 8.25s sweep + silence)
 * 10  effect-2     → trans-01 (Byte Fill 003 — 4-bar cycle, 1-bar fill + silence)
 * 11  effect-3     → trans-02 (Byte Fill 004 — 4-bar cycle, 1-bar fill + silence)
 * 12  melody-3     → melody-04 (Byte Full Mix C#min, 16 bars)
 * 13  melody-4     → atmo-01 (Byte Atmos FX Amin, 16 bars)
 * 14  percussion-0 → bass-01 (Byte Bass Resampled C#min, 16 bars)
 * 15  percussion-1 → bass-02 (Byte Resampled Bass Gmin, 16 bars)
 * 16  percussion-2 → bass-03 (Byte Break Bass Amin, 16 bars)
 * 17  percussion-3 → bass-04 (Byte Bass Growl Layers A#min, 16 bars)
 * 18  percussion-4 → atmo-02 (Byte Atmos Vox Amin, 16 bars)
 * 19  voice-0      → vocal-01 (VCT Legacy 01 C#min, 4 bars)
 * 20  voice-1      → vocal-02 (VCT Legacy 06 Emin, 4 bars)
 * 21  voice-2      → vocal-03 (VCT Legacy 15 Amin, 4 bars — replaced Loop 08 Fmin)
 * 22  voice-3      → vocal-04 (VCT Legacy 12 Gmin, 4 bars)
 * 23  voice-4      → vocal-05 (VCT Legacy 19 Bmin, 4 bars)
 */

import type { QuantizeMode } from '../../musicClock'
import type { CompatibleAudioPack, CompatiblePackPad } from '../../packBuilder/types'

export type AlphaPackCategory =
  | 'beat' | 'bass' | 'melody' | 'fx' | 'voice' | 'transition' | 'atmosphere'

export type AlphaPackPadConfig = {
  id: string
  category: AlphaPackCategory
  label: string
  audioFile: string
  sourceFile: string
  bpm: number | null
  bars: number | null
  key: string | null
  notes: string
  volume: number
  playbackMode: 'loop' | 'one-shot'
  playbackQuantization: QuantizeMode
  allowDriftCorrection: boolean
  energy: number
  harmonicGroup: string
  transientDensity: number
  lowEndWeight: number
  mixabilityScore: number
}

const A = '/audio/alpha-pack'
const SPINE_BPM = 128

export const alphaPackPads: AlphaPackPadConfig[] = [
  // ── Index 0: beat-0 ────────────────────────────────────────────────────
  {
    id: 'alphaPack-beat-01', category: 'beat',
    label: 'Byte Groove 2',
    audioFile: 'beats/beat-01.wav', sourceFile: 'Stickz - Byte Drum Loop 002 - 128BPM.wav',
    bpm: 128, bars: 16, key: null,
    notes: 'Full drum groove Loop 002, 16 bars @ 128 BPM. Kick + snare + hat. Second groove variant — distinct pattern from Loop 001 (used by Delta). Slightly more open feel.',
    volume: 0.87, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.78, harmonicGroup: 'neutral', transientDensity: 0.72, lowEndWeight: 0.65, mixabilityScore: 91,
  },
  // ── Index 1: beat-1 ────────────────────────────────────────────────────
  {
    id: 'alphaPack-beat-02', category: 'beat',
    label: 'Byte Hat 3',
    audioFile: 'beats/beat-02.wav', sourceFile: 'Stickz - Byte Hi-Hat Loop 003 - 128BPM.wav',
    bpm: 128, bars: 4, key: null,
    notes: 'Hi-hat loop 003, 4 bars @ 128 BPM. Lighter rhythmic texture. Distinct from Delta\'s HH 001, 002, 005.',
    volume: 0.85, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.52, harmonicGroup: 'neutral', transientDensity: 0.80, lowEndWeight: 0.08, mixabilityScore: 93,
  },
  // ── Index 2: beat-2 ────────────────────────────────────────────────────
  {
    id: 'alphaPack-beat-03', category: 'beat',
    label: 'Byte Hat 4',
    audioFile: 'beats/beat-03.wav', sourceFile: 'Stickz - Byte Hi-Hat Loop 004 - 128BPM.wav',
    bpm: 128, bars: 4, key: null,
    notes: 'Hi-hat loop 004, 4 bars @ 128 BPM. Varied sixteenth-note pattern. Layerable over full groove without kick competition.',
    volume: 0.83, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.55, harmonicGroup: 'neutral', transientDensity: 0.82, lowEndWeight: 0.08, mixabilityScore: 92,
  },
  // ── Index 3: beat-3 ────────────────────────────────────────────────────
  {
    id: 'alphaPack-beat-04', category: 'beat',
    label: 'Byte Hat 6',
    audioFile: 'beats/beat-04.wav', sourceFile: 'Stickz - Byte Hi-Hat Loop 006 - 128BPM.wav',
    bpm: 128, bars: 4, key: null,
    notes: 'Hi-hat loop 006, 4 bars @ 128 BPM. Lighter accent groove. Adds rhythmic density without adding low-end weight.',
    volume: 0.82, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.48, harmonicGroup: 'neutral', transientDensity: 0.78, lowEndWeight: 0.06, mixabilityScore: 90,
  },
  // ── Index 4: beat-4 — 5th beat (accent) ────────────────────────────────
  {
    id: 'alphaPack-beat-05', category: 'beat',
    label: 'Byte Hat 7',
    audioFile: 'beats/beat-05.wav', sourceFile: 'Stickz - Byte Hi-Hat Loop 007 - 128BPM.wav',
    bpm: 128, bars: 4, key: null,
    notes: 'Hi-hat loop 007, 4 bars @ 128 BPM. Lightest hat — sparse open hi-hat feel. Thermally minimal, accent-only layer.',
    volume: 0.82, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.45, harmonicGroup: 'neutral', transientDensity: 0.68, lowEndWeight: 0.05, mixabilityScore: 89,
  },
  // ── Index 5: melody-0 ─────────────────────────────────────────────────
  {
    id: 'alphaPack-melody-01', category: 'melody',
    label: 'Byte Supersaw Am',
    audioFile: 'melody/melody-01.wav', sourceFile: 'Stickz - Byte Synth Loop 003 - Lead Supersaw.wav',
    bpm: 128, bars: 16, key: 'A',
    notes: 'Lead Supersaw stem from Loop 003, 16 bars @ 128 BPM, Amin (trimmed from 19 bars). Smooth, sustained supersaw — smoothest, most universally mixable lead in Alpha Pack. Low transient density. Pairs with bass-03, atmo-01.',
    volume: 0.72, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.60, harmonicGroup: 'Amin', transientDensity: 0.38, lowEndWeight: 0.18, mixabilityScore: 90,
  },
  // ── Index 6: melody-1 ─────────────────────────────────────────────────
  {
    id: 'alphaPack-melody-02', category: 'melody',
    label: 'Byte Reverses Gm',
    audioFile: 'melody/melody-02.wav', sourceFile: 'Stickz - Byte Synth Loop 002 - Lead Reverses.wav',
    bpm: 128, bars: 16, key: 'G',
    notes: 'Lead Reverses stem from Loop 002, 16 bars @ 128 BPM, Gmin (trimmed from 18 bars). Reversed melodic phrases — atmospheric, smooth texture. Pairs with bass-02, vocal-04.',
    volume: 0.70, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.55, harmonicGroup: 'Gmin', transientDensity: 0.32, lowEndWeight: 0.16, mixabilityScore: 87,
  },
  // ── Index 7: melody-2 ─────────────────────────────────────────────────
  {
    id: 'alphaPack-melody-03', category: 'melody',
    label: 'Byte Response A#',
    audioFile: 'melody/melody-03.wav', sourceFile: 'Stickz - Byte Synth Loop 004 - Lead Response.wav',
    bpm: 128, bars: 16, key: 'A#',
    notes: 'Lead Response stem from Loop 004, 16 bars @ 128 BPM, A#min (trimmed from 17 bars). Complement response phrase to Delta\'s Lead Call — distinct melodic variation. Pairs with bass-04.',
    volume: 0.74, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.62, harmonicGroup: 'A#min', transientDensity: 0.45, lowEndWeight: 0.20, mixabilityScore: 85,
  },
  // ── Index 8: effect-0 ─────────────────────────────────────────────────
  {
    id: 'alphaPack-fx-01', category: 'fx',
    label: 'Byte Impact 2',
    audioFile: 'fx/fx-01.wav', sourceFile: 'Stickz - Byte Impact 002.wav',
    bpm: 128, bars: 8, key: null,
    notes: 'Impact hit 002, 4.3s hit + 10.7s silence = 8-bar cycle (padded). Lighter than Delta\'s Impact 001. Auto-retriggers every 8 bars.',
    volume: 0.52, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.75, harmonicGroup: 'neutral', transientDensity: 0.88, lowEndWeight: 0.45, mixabilityScore: 88,
  },
  // ── Index 9: effect-1 ─────────────────────────────────────────────────
  {
    id: 'alphaPack-fx-02', category: 'fx',
    label: 'Byte Uplift 2',
    audioFile: 'fx/fx-02.wav', sourceFile: 'Stickz - Byte Uplifter 002.wav',
    bpm: 128, bars: 8, key: null,
    notes: 'Uplifter sweep 002, 8.25s sweep + 6.75s silence = 8-bar cycle (padded). Lighter sweep variant. Auto-retriggers every 8 bars.',
    volume: 0.50, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.65, harmonicGroup: 'neutral', transientDensity: 0.35, lowEndWeight: 0.25, mixabilityScore: 86,
  },
  // ── Index 10: effect-2 — transition 1 ───────────────────────────────
  {
    id: 'alphaPack-trans-01', category: 'transition',
    label: 'Byte Fill 3',
    audioFile: 'transitions/trans-01.wav', sourceFile: 'Stickz - Byte Fill 003 - 128BPM.wav',
    bpm: 128, bars: 4, key: null,
    notes: 'Drum fill 003, 1 bar hit + 3 bars silence = 4-bar cycle (padded). Fresh fill variant not used in Delta. Auto-retriggers every 4 bars.',
    volume: 0.52, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.80, harmonicGroup: 'neutral', transientDensity: 0.88, lowEndWeight: 0.58, mixabilityScore: 91,
  },
  // ── Index 11: effect-3 — transition 2 ───────────────────────────────
  {
    id: 'alphaPack-trans-02', category: 'transition',
    label: 'Byte Fill 4',
    audioFile: 'transitions/trans-02.wav', sourceFile: 'Stickz - Byte Fill 004 - 128BPM.wav',
    bpm: 128, bars: 4, key: null,
    notes: 'Drum fill 004, 1 bar hit + 3 bars silence = 4-bar cycle (padded). Complementary to trans-01. Auto-retriggers every 4 bars.',
    volume: 0.50, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.78, harmonicGroup: 'neutral', transientDensity: 0.86, lowEndWeight: 0.55, mixabilityScore: 90,
  },
  // ── Index 12: melody-3 — 4th melody ─────────────────────────────────
  {
    id: 'alphaPack-melody-04', category: 'melody',
    label: 'Byte Full C#',
    audioFile: 'melody/melody-04.wav', sourceFile: 'Stickz - Byte Synth Loop 001 - 128BPM C#min.wav',
    bpm: 128, bars: 16, key: 'C#',
    notes: 'Full mixed loop 001, 16 bars @ 128 BPM, C#min (trimmed from 17 bars). All voices blended — bass, leads, atmosphere FX combined. Richer, fuller sound than individual stems. Pairs with bass-01, atmo-01.',
    volume: 0.68, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.70, harmonicGroup: 'C#min', transientDensity: 0.50, lowEndWeight: 0.35, mixabilityScore: 82,
  },
  // ── Index 13: melody-4 — atmosphere 1 ───────────────────────────────
  {
    id: 'alphaPack-atmo-01', category: 'atmosphere',
    label: 'Byte Atmos Am',
    audioFile: 'atmospheres/atmo-01.wav', sourceFile: 'Stickz - Byte Synth Loop 003 - Atmos FX.wav',
    bpm: 128, bars: 16, key: 'A',
    notes: 'Atmosphere FX stem from Loop 003, 16 bars @ 128 BPM, Amin (trimmed from 19 bars). Wide digital texture, very low transient density. Supports melodic material without conflicting. Pairs with melody-01, bass-03.',
    volume: 0.48, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.30, harmonicGroup: 'Amin', transientDensity: 0.15, lowEndWeight: 0.10, mixabilityScore: 89,
  },
  // ── Index 14: percussion-0 ───────────────────────────────────────────
  {
    id: 'alphaPack-bass-01', category: 'bass',
    label: 'Byte Resampled C#',
    audioFile: 'bass/bass-01.wav', sourceFile: 'Stickz - Byte Synth Loop 001 - Bass Resampled.wav',
    bpm: 128, bars: 16, key: 'C#',
    notes: 'Bass Resampled stem from Loop 001, 16 bars @ 128 BPM, C#min (trimmed from 17 bars). Resampled bass texture — lighter, less aggressive than Main Layer. Pairs with melody-04, atmo-01.',
    volume: 0.65, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.65, harmonicGroup: 'C#min', transientDensity: 0.28, lowEndWeight: 0.68, mixabilityScore: 86,
  },
  // ── Index 15: percussion-1 ───────────────────────────────────────────
  {
    id: 'alphaPack-bass-02', category: 'bass',
    label: 'Byte Resampled Gm',
    audioFile: 'bass/bass-02.wav', sourceFile: 'Stickz - Byte Synth Loop 002 - Resampled Bass.wav',
    bpm: 128, bars: 16, key: 'G',
    notes: 'Resampled Bass stem from Loop 002, 16 bars @ 128 BPM, Gmin (trimmed from 18 bars). Warm resampled bass texture — smoother than Main Layer. Pairs with melody-02, vocal-04.',
    volume: 0.66, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.67, harmonicGroup: 'Gmin', transientDensity: 0.30, lowEndWeight: 0.70, mixabilityScore: 84,
  },
  // ── Index 16: percussion-2 ───────────────────────────────────────────
  {
    id: 'alphaPack-bass-03', category: 'bass',
    label: 'Byte Break Bass Am',
    audioFile: 'bass/bass-03.wav', sourceFile: 'Stickz - Byte Synth Loop 003 - Break Bass.wav',
    bpm: 128, bars: 16, key: 'A',
    notes: 'Break Bass stem from Loop 003, 16 bars @ 128 BPM, Amin (trimmed from 19 bars). Break-pattern bass — rhythmic stabs, lower fatigue than growl. Pairs with melody-01, atmo-01.',
    volume: 0.64, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.68, harmonicGroup: 'Amin', transientDensity: 0.40, lowEndWeight: 0.72, mixabilityScore: 83,
  },
  // ── Index 17: percussion-3 ───────────────────────────────────────────
  {
    id: 'alphaPack-bass-04', category: 'bass',
    label: 'Byte Growl A#',
    audioFile: 'bass/bass-04.wav', sourceFile: 'Stickz - Byte Synth Loop 004 - Bass Growl Layers.wav',
    bpm: 128, bars: 16, key: 'A#',
    notes: 'Bass Growl Layers stem from Loop 004, 16 bars @ 128 BPM, A#min (trimmed from 17 bars). Layered growl bass texture — more aggressive than resampled but less than Main Layer. Pairs with melody-03.',
    volume: 0.65, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.70, harmonicGroup: 'A#min', transientDensity: 0.38, lowEndWeight: 0.75, mixabilityScore: 82,
  },
  // ── Index 18: percussion-4 — atmosphere 2 ───────────────────────────
  {
    id: 'alphaPack-atmo-02', category: 'atmosphere',
    label: 'Byte Atmos Vox Am',
    audioFile: 'atmospheres/atmo-02.wav', sourceFile: 'Stickz - Byte Synth Loop 003 - Atmos Vox.wav',
    bpm: 128, bars: 16, key: 'A',
    notes: 'Atmosphere Vox stem from Loop 003, 16 bars @ 128 BPM, Amin (trimmed from 19 bars). Atmospheric vocal texture — wide, airy, minimal transients. Distinct from Atmos FX (atmo-01). Low fatigue.',
    volume: 0.46, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.28, harmonicGroup: 'Amin', transientDensity: 0.12, lowEndWeight: 0.08, mixabilityScore: 88,
  },
  // ── Index 19: voice-0 ────────────────────────────────────────────────
  {
    id: 'alphaPack-vocal-01', category: 'voice',
    label: 'VCT Legacy C#',
    audioFile: 'vocals/vocal-01.wav', sourceFile: 'Stickz VCT - Legacy Vocal Chop Loop 01 - 128BPM C#min.wav',
    bpm: 128, bars: 4, key: 'C#',
    notes: 'VCT Legacy vocal chop loop 01, 4 bars @ 128 BPM, C#min. Active from t=0, no detectable silence at -50dB. Pairs harmonically with bass-01, melody-04.',
    volume: 0.58, playbackMode: 'loop', playbackQuantization: 'beat', allowDriftCorrection: false,
    energy: 0.62, harmonicGroup: 'C#min', transientDensity: 0.70, lowEndWeight: 0.07, mixabilityScore: 86,
  },
  // ── Index 20: voice-1 ────────────────────────────────────────────────
  {
    id: 'alphaPack-vocal-02', category: 'voice',
    label: 'VCT Legacy Em',
    audioFile: 'vocals/vocal-02.wav', sourceFile: 'Stickz VCT - Legacy Vocal Chop Loop 06 - 128BPM Emin.wav',
    bpm: 128, bars: 4, key: 'E',
    notes: 'VCT Legacy vocal chop loop 06, 4 bars @ 128 BPM, Emin. Active from t=0. Fresh harmonic key not in Delta Pack — adds tonal variety.',
    volume: 0.55, playbackMode: 'loop', playbackQuantization: 'beat', allowDriftCorrection: false,
    energy: 0.58, harmonicGroup: 'Emin', transientDensity: 0.68, lowEndWeight: 0.07, mixabilityScore: 83,
  },
  // ── Index 21: voice-2 ────────────────────────────────────────────────
  {
    id: 'alphaPack-vocal-03', category: 'voice',
    label: 'VCT Legacy Am',
    audioFile: 'vocals/vocal-03.wav', sourceFile: 'Stickz VCT - Legacy Vocal Chop Loop 15 - 128BPM Amin.wav',
    bpm: 128, bars: 4, key: 'A',
    notes: 'VCT Legacy vocal chop loop 15, 4 bars @ 128 BPM, Amin. Zero silence regions across full 7.5s (-50dB threshold), mean -11.7 dB. Amin is the harmonic spine of Alpha Pack — strongest compatibility with Supersaw melody (Amin), both atmospheres (Amin), and bass-03 (Break Bass Amin). Replaces Loop 08 Fmin whose key duplicated Delta\'s Loop 09.',
    volume: 0.55, playbackMode: 'loop', playbackQuantization: 'beat', allowDriftCorrection: false,
    energy: 0.62, harmonicGroup: 'Amin', transientDensity: 0.70, lowEndWeight: 0.07, mixabilityScore: 91,
  },
  // ── Index 22: voice-3 ────────────────────────────────────────────────
  {
    id: 'alphaPack-vocal-04', category: 'voice',
    label: 'VCT Legacy Gm',
    audioFile: 'vocals/vocal-04.wav', sourceFile: 'Stickz VCT - Legacy Vocal Chop Loop 12 - 128BPM Gmin.wav',
    bpm: 128, bars: 4, key: 'G',
    notes: 'VCT Legacy vocal chop loop 12, 4 bars @ 128 BPM, Gmin. Active from t=0. Sibling of Delta\'s Loop 13 — distinct chop pattern, pairs with melody-02, bass-02.',
    volume: 0.52, playbackMode: 'loop', playbackQuantization: 'beat', allowDriftCorrection: false,
    energy: 0.56, harmonicGroup: 'Gmin', transientDensity: 0.68, lowEndWeight: 0.07, mixabilityScore: 83,
  },
  // ── Index 23: voice-4 — 5th vocal ────────────────────────────────────
  {
    id: 'alphaPack-vocal-05', category: 'voice',
    label: 'VCT Legacy Bm',
    audioFile: 'vocals/vocal-05.wav', sourceFile: 'Stickz VCT - Legacy Vocal Chop Loop 19 - 128BPM Bmin.wav',
    bpm: 128, bars: 4, key: 'B',
    notes: 'VCT Legacy vocal chop loop 19, 4 bars @ 128 BPM, Bmin. Active from t=0. Completely fresh harmonic key absent from Delta Pack — adds tonal freshness to vocal group.',
    volume: 0.52, playbackMode: 'loop', playbackQuantization: 'beat', allowDriftCorrection: false,
    energy: 0.58, harmonicGroup: 'Bmin', transientDensity: 0.70, lowEndWeight: 0.07, mixabilityScore: 82,
  },
]

function buildAudioUrls(base: string): Record<string, string> {
  const paths = new Set<string>()
  for (const pad of alphaPackPads) paths.add(pad.audioFile)
  return Object.fromEntries([...paths].map((p) => [`${base}/${p}`, `${base}/${p}`]))
}

export const alphaPack = {
  id: 'alpha-pack' as const,
  name: 'Alpha Pack',
  bpm: SPINE_BPM,
  description: 'Alpha Pack — 128 BPM clean collection from Stickz Byte. Lighter feel, lower fatigue, thermally efficient.',
  pads: alphaPackPads,
  audioUrls: buildAudioUrls(A),
}

const SPINE_KEY = 'A'
const SPINE_BARS = 16

export function buildAlphaPackCompatiblePack(): CompatibleAudioPack {
  const pads: CompatiblePackPad[] = alphaPackPads.map((p) => ({
    id: p.id,
    label: p.label,
    audioFile: p.audioFile,
    sourceFile: p.sourceFile,
    gameCategory: p.category as CompatiblePackPad['gameCategory'],
    volume: p.volume,
    notes: p.notes,
    compatibility: {
      bpm: p.bpm,
      key: p.key,
      bars: p.bars,
      energy: p.energy,
      category: (p.category === 'beat' ? 'drum-groove'
        : p.category === 'voice' ? 'vocal-chop'
        : p.category) as import('../../packBuilder/types').CoreMixCategory,
      harmonicGroup: p.harmonicGroup as import('../../packBuilder/types').HarmonicGroup,
      transientDensity: p.transientDensity,
      lowEndWeight: p.lowEndWeight,
      mixabilityScore: p.mixabilityScore,
      playbackQuantization: p.playbackQuantization,
      oneShot: p.playbackMode === 'one-shot',
    },
  }))
  return {
    id: 'alpha-pack',
    name: 'Alpha Pack',
    description: alphaPack.description,
    philosophy: 'alpha-pack',
    spine: { bpm: SPINE_BPM, key: SPINE_KEY, bars: SPINE_BARS, harmonicTonic: 'tonic' },
    pads,
    audioBasePath: A,
    audioUrls: alphaPack.audioUrls,
  }
}
