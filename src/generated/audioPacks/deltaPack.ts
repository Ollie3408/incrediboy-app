/**
 * Delta Pack — curated from Stickz - Byte + Stickz VCT
 *
 * BPM spine: 128  ·  Key: multi (C#min / Gmin / Amin / A#min)
 * Pads: 24 (matches ALL_PADS grid indices 0–23)
 *
 * ⚠️ BPM NOTE: This pack runs at 128 BPM, not the 105 BPM spine of other packs.
 *    All content is natively 128 BPM — no drift correction required.
 *
 * Changelog:
 *   bass-03: repaired leading silence (bars 16→8, silence-trimmed source)
 *   melody-03: replaced Lead Main→Break Pluck (bars 16→8, silence+content fix)
 *   beat-03: replaced Loop 003→Loop 004 (Loop 003 had two 0.7s structural gaps causing double-beat)
 *   beat-03: replaced Loop 004→Hi-Hat Loop 005 (30s full loops caused phase-correction hard snaps
 *            producing audible double-beat; 7.5s hi-hat loop eliminates the issue entirely)
 *   voice-4: replaced atmo-02→vocal-05 (voice-4 misplaced in LAYERS as atmosphere; now a true
 *            vocal chop — VCT Legacy Loop 16 Amin, 4 bars, matches bass-03/melody-03 key)
 *   layout:  voice-3 moved from TRANSITIONS→VOCALS; voice-4 moved from LAYERS→VOCALS;
 *            all 5 voice pads now grouped together in VOCALS section
 *   voice-0: replaced Loop 06 C#min→Legacy Loop 02 C#min (zero silence, higher energy density)
 *   voice-1: replaced Loop 08 Gmin→Legacy Loop 13 Gmin (distinct chop pattern, active from t=0)
 *   voice-0: replaced Legacy Loop 02 C#min→Legacy Loop 09 Fmin (fresh harmonic key, zero detectable
 *            silence across full 7.5s, stronger identity distinct from all 4 other vocal pads)
 *
 * INDEX ORDER (must match ALL_PADS in App.tsx):
 *  0  beat-0       → beat-01 (Byte Groove, 8 bars)
 *  1  beat-1       → beat-02 (Byte Hat, 4 bars)
 *  2  beat-2       → beat-03 (Byte Hat B, 4 bars — Hi-Hat Loop 005)
 *  3  beat-3       → beat-04 (Byte Top / No Kick, 8 bars)
 *  4  beat-4       → beat-05 (Byte Accent / Hi-Hat 2, 4 bars)
 *  5  melody-0     → melody-01 (Byte Lead C#min, 16 bars — trimmed from 17)
 *  6  melody-1     → melody-02 (Byte Lead Gmin, 16 bars — trimmed from 18)
 *  7  melody-2     → melody-03 (Byte Lead Amin, 16 bars — trimmed from 19)
 *  8  effect-0     → fx-01 (Byte Impact — loop cycle 8 bars, 6s hit + silence)
 *  9  effect-1     → fx-02 (Byte Uplift — loop cycle 8 bars, 5.5s sweep + silence)
 * 10  effect-2     → fx-03 (Byte Riser — loop cycle 16 bars, 15s riser + silence)
 * 11  effect-3     → trans-01 (Byte Fill A — loop cycle 4 bars, 1-bar fill + silence)
 * 12  melody-3     → melody-04 (Byte Lead A#min, 16 bars — trimmed from 17)
 * 13  melody-4     → atmo-01 (Byte Atmos C#min, 16 bars — trimmed from 17)
 * 14  percussion-0 → bass-01 (Byte Bass C#min, 16 bars — trimmed from 17)
 * 15  percussion-1 → bass-02 (Byte Bass Gmin, 16 bars — trimmed from 18)
 * 16  percussion-2 → bass-03 (Byte Bass Amin, 16 bars — trimmed from 19)
 * 17  percussion-3 → bass-04 (Byte Bass A#min, 16 bars — trimmed from 17)
 * 18  percussion-4 → trans-02 (Byte Fill B — loop cycle 4 bars, 1-bar fill + silence)
 * 19  voice-0      → vocal-01 (VCT Chop C#min, 4 bars)
 * 20  voice-1      → vocal-02 (VCT Chop Gmin, 4 bars)
 * 21  voice-2      → vocal-03 (VCT Chop Fmin, 8 bars)
 * 22  voice-3      → trans-03 (Byte Drop — loop cycle 8 bars, 9.2s sweep + silence)
 * 23  voice-4      → vocal-05 (VCT Legacy Amin, 4 bars — replaced atmo-02)
 */

import type { QuantizeMode } from '../../musicClock'
import type { CompatibleAudioPack, CompatiblePackPad } from '../../packBuilder/types'

export type DeltaPackCategory =
  | 'beat' | 'bass' | 'melody' | 'fx' | 'voice' | 'transition' | 'atmosphere'

export type DeltaPackPadConfig = {
  id: string
  category: DeltaPackCategory
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

const D = '/audio/delta-pack'
const SPINE_BPM = 128
const SPINE_KEY = 'C#'
const SPINE_BARS = 8

export const deltaPackPads: DeltaPackPadConfig[] = [
  // ── Index 0: beat-0 ────────────────────────────────────────────────────
  {
    id: 'deltaPack-beat-01', category: 'beat',
    label: 'Byte Groove',
    audioFile: 'beats/beat-01.wav', sourceFile: 'Stickz - Byte Drum Loop 001 - 128BPM.wav',
    bpm: 128, bars: 8, key: null,
    notes: 'Foundational full drum groove, 8 bars @ 128 BPM. Kick + snare + hat. Cleanest entry point.',
    volume: 0.87, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.82, harmonicGroup: 'neutral', transientDensity: 0.78, lowEndWeight: 0.70, mixabilityScore: 94,
  },
  // ── Index 1: beat-1 ────────────────────────────────────────────────────
  {
    id: 'deltaPack-beat-02', category: 'beat',
    label: 'Byte Hat',
    audioFile: 'beats/beat-02.wav', sourceFile: 'Stickz - Byte Hi-Hat Loop 001 - 128BPM.wav',
    bpm: 128, bars: 4, key: null,
    notes: 'Hi-hat only loop, 4 bars @ 128 BPM. Lightweight rhythmic texture, minimal low-end.',
    volume: 0.84, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.55, harmonicGroup: 'neutral', transientDensity: 0.85, lowEndWeight: 0.10, mixabilityScore: 91,
  },
  // ── Index 2: beat-2 ────────────────────────────────────────────────────
  {
    id: 'deltaPack-beat-03', category: 'beat',
    label: 'Byte Hat B',
    audioFile: 'beats/beat-03.wav', sourceFile: 'Stickz - Byte Hi-Hat Loop 005 - 128BPM.wav',
    bpm: 128, bars: 4, key: null,
    notes: 'Hi-hat percussion loop, 4 bars @ 128 BPM. Exact 7.500s duration — zero drift, zero leading pre-roll. No silence gaps throughout. Distinct rhythmic pattern from Byte Hat (HH 001) and Byte Accent (HH 002). Replaced full drum loops (Loop 003, Loop 004) which produced phase-correction hard snaps after pause/resume due to 30s loop length, creating audible double-beat. A 4-bar hi-hat loop eliminates phase sensitivity and complements the existing beat grid without kick competition.',
    volume: 0.82, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.62, harmonicGroup: 'neutral', transientDensity: 0.70, lowEndWeight: 0.10, mixabilityScore: 96,
  },
  // ── Index 3: beat-3 ────────────────────────────────────────────────────
  {
    id: 'deltaPack-beat-04', category: 'beat',
    label: 'Byte Top',
    audioFile: 'beats/beat-04.wav', sourceFile: 'Stickz - Byte Top Loop 001 - 128BPM.wav',
    bpm: 128, bars: 8, key: null,
    notes: 'Top loop (no kick), 8 bars @ 128 BPM. Layerable over bass-heavy beats, no low-end clash.',
    volume: 0.85, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.62, harmonicGroup: 'neutral', transientDensity: 0.72, lowEndWeight: 0.15, mixabilityScore: 90,
  },
  // ── Index 4: beat-4 — 5th beat (accent groove) ─────────────────────────
  {
    id: 'deltaPack-beat-05', category: 'beat',
    label: 'Byte Accent',
    audioFile: 'beats/beat-05.wav', sourceFile: 'Stickz - Byte Hi-Hat Loop 002 - 128BPM.wav',
    bpm: 128, bars: 4, key: null,
    notes: 'Second hi-hat pattern, 4 bars @ 128 BPM. Accent groove variant — adds rhythmic density.',
    volume: 0.83, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.50, harmonicGroup: 'neutral', transientDensity: 0.88, lowEndWeight: 0.08, mixabilityScore: 88,
  },
  // ── Index 5: melody-0 ─────────────────────────────────────────────────
  {
    id: 'deltaPack-melody-01', category: 'melody',
    label: 'Byte Lead C#',
    audioFile: 'melody/melody-01.wav', sourceFile: 'Stickz - Byte Synth Loop 001 - Leads.wav',
    bpm: 128, bars: 16, key: 'C#',
    notes: 'Lead synth stem Loop 001, 16 bars @ 128 BPM, C#min (trimmed from 17 for sync). Safe melodic anchor. Pairs with bass-01, atmo-01.',
    volume: 0.72, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.65, harmonicGroup: 'C#min', transientDensity: 0.45, lowEndWeight: 0.20, mixabilityScore: 86,
  },
  // ── Index 6: melody-1 ─────────────────────────────────────────────────
  {
    id: 'deltaPack-melody-02', category: 'melody',
    label: 'Byte Lead G',
    audioFile: 'melody/melody-02.wav', sourceFile: 'Stickz - Byte Synth Loop 002 - Lead.wav',
    bpm: 128, bars: 16, key: 'G',
    notes: 'Lead synth stem Loop 002, 16 bars @ 128 BPM, Gmin (trimmed from 18 for sync). Secondary melodic texture. Pairs with bass-02.',
    volume: 0.74, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.68, harmonicGroup: 'Gmin', transientDensity: 0.48, lowEndWeight: 0.22, mixabilityScore: 84,
  },
  // ── Index 7: melody-2 ─────────────────────────────────────────────────
  {
    id: 'deltaPack-melody-03', category: 'melody',
    label: 'Byte Pluck Am',
    audioFile: 'melody/melody-03.wav', sourceFile: 'Stickz - Byte Synth Loop 003 - Break Pluck.wav',
    bpm: 128, bars: 8, key: 'A',
    notes: 'Pluck synth stem Loop 003, 8 bars @ 128 BPM, Amin. Replaced Lead Main (had 16.875s leading silence causing dropout + over-complex melody). Break Pluck adds rhythmic pluck texture with distinct character. ~0.5s natural pickup before first hit. Pairs with bass-03, atmo-02.',
    volume: 0.78, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.62, harmonicGroup: 'Amin', transientDensity: 0.65, lowEndWeight: 0.18, mixabilityScore: 86,
  },
  // ── Index 8: effect-0 ─────────────────────────────────────────────────
  {
    id: 'deltaPack-fx-01', category: 'fx',
    label: 'Byte Impact',
    audioFile: 'fx/fx-01.wav', sourceFile: 'Stickz - Byte Impact 001.wav',
    bpm: 128, bars: 8, key: null,
    notes: 'Cinematic impact hit, 6s hit + 9s silence = 8-bar cycle. Auto-retriggers every 8 bars. Character stays active.',
    volume: 0.55, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.90, harmonicGroup: 'neutral', transientDensity: 0.95, lowEndWeight: 0.60, mixabilityScore: 90,
  },
  // ── Index 9: effect-1 ─────────────────────────────────────────────────
  {
    id: 'deltaPack-fx-02', category: 'fx',
    label: 'Byte Uplift',
    audioFile: 'fx/fx-02.wav', sourceFile: 'Stickz - Byte Uplifter 001.wav',
    bpm: 128, bars: 8, key: null,
    notes: 'Uplifter sweep, 5.5s sweep + 9.5s silence = 8-bar cycle. Auto-retriggers every 8 bars. Builds tension rhythmically.',
    volume: 0.53, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.72, harmonicGroup: 'neutral', transientDensity: 0.40, lowEndWeight: 0.30, mixabilityScore: 87,
  },
  // ── Index 10: effect-2 ────────────────────────────────────────────────
  {
    id: 'deltaPack-fx-03', category: 'fx',
    label: 'Byte Riser',
    audioFile: 'fx/fx-03.wav', sourceFile: 'Stickz - Byte Riser 001 - 128BPM C.wav',
    bpm: 128, bars: 16, key: 'C',
    notes: 'BPM-synced riser, 15s build + 15s silence = 16-bar cycle. Auto-retriggers every 16 bars. Character stays active between cycles.',
    volume: 0.51, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.68, harmonicGroup: 'Cmaj', transientDensity: 0.30, lowEndWeight: 0.45, mixabilityScore: 84,
  },
  // ── Index 11: effect-3 — transition A ────────────────────────────────
  {
    id: 'deltaPack-trans-01', category: 'transition',
    label: 'Byte Fill A',
    audioFile: 'transitions/trans-01.wav', sourceFile: 'Stickz - Byte Fill 001 - 128BPM.wav',
    bpm: 128, bars: 4, key: null,
    notes: 'Drum fill, 1 bar hit + 3 bars silence = 4-bar cycle. Auto-retriggers every 4 bars. Rhythmic section marker.',
    volume: 0.55, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.85, harmonicGroup: 'neutral', transientDensity: 0.92, lowEndWeight: 0.65, mixabilityScore: 92,
  },
  // ── Index 12: melody-3 — 4th melody (A#min lead) ─────────────────────
  {
    id: 'deltaPack-melody-04', category: 'melody',
    label: 'Byte Lead A#',
    audioFile: 'melody/melody-04.wav', sourceFile: 'Stickz - Byte Synth Loop 004 - Lead Call.wav',
    bpm: 128, bars: 16, key: 'A#',
    notes: 'Lead call stem Loop 004, 16 bars @ 128 BPM, A#min (trimmed from 17 for sync). Call-response motif. Most experimental lead.',
    volume: 0.73, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.66, harmonicGroup: 'A#min', transientDensity: 0.52, lowEndWeight: 0.24, mixabilityScore: 80,
  },
  // ── Index 13: melody-4 — atmosphere 1 ────────────────────────────────
  {
    id: 'deltaPack-atmo-01', category: 'atmosphere',
    label: 'Byte Atmos C#',
    audioFile: 'atmospheres/atmo-01.wav', sourceFile: 'Stickz - Byte Synth Loop 001 - Atmos FX.wav',
    bpm: 128, bars: 16, key: 'C#',
    notes: 'Atmospheric FX stem Loop 001, 16 bars @ 128 BPM, C#min (trimmed from 17 for sync). Wide digital texture, low fatigue.',
    volume: 0.50, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.35, harmonicGroup: 'C#min', transientDensity: 0.18, lowEndWeight: 0.12, mixabilityScore: 88,
  },
  // ── Index 14: percussion-0 ────────────────────────────────────────────
  {
    id: 'deltaPack-bass-01', category: 'bass',
    label: 'Byte Bass C#',
    audioFile: 'bass/bass-01.wav', sourceFile: 'Stickz - Byte Synth Loop 001 - Bass Main Layer.wav',
    bpm: 128, bars: 16, key: 'C#',
    notes: 'Synth bass stem Loop 001, 16 bars @ 128 BPM, C#min (trimmed from 17 for sync). Clean filtered bass. Works with melody-01, atmo-01.',
    volume: 0.68, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.72, harmonicGroup: 'C#min', transientDensity: 0.35, lowEndWeight: 0.82, mixabilityScore: 85,
  },
  // ── Index 15: percussion-1 ────────────────────────────────────────────
  {
    id: 'deltaPack-bass-02', category: 'bass',
    label: 'Byte Bass G',
    audioFile: 'bass/bass-02.wav', sourceFile: 'Stickz - Byte Synth Loop 002 - Bass Main Layer.wav',
    bpm: 128, bars: 16, key: 'G',
    notes: 'Synth bass stem Loop 002, 16 bars @ 128 BPM, Gmin (trimmed from 18 for sync). Warm low-end. Pairs with melody-02, vocal-02.',
    volume: 0.70, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.74, harmonicGroup: 'Gmin', transientDensity: 0.38, lowEndWeight: 0.80, mixabilityScore: 83,
  },
  // ── Index 16: percussion-2 ────────────────────────────────────────────
  {
    id: 'deltaPack-bass-03', category: 'bass',
    label: 'Byte Bass Am',
    audioFile: 'bass/bass-03.wav', sourceFile: 'Stickz - Byte Synth Loop 003 - Bass Main Layer.wav',
    bpm: 128, bars: 8, key: 'A',
    notes: 'Synth bass stem Loop 003, 8 bars @ 128 BPM, Amin. Silence-trimmed (source had 9-bar leading silence — dropout fix). 7 bars active + 1 bar phrase rest. Growl bass stabs. Pairs with melody-03.',
    volume: 0.67, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.76, harmonicGroup: 'Amin', transientDensity: 0.42, lowEndWeight: 0.85, mixabilityScore: 82,
  },
  // ── Index 17: percussion-3 ────────────────────────────────────────────
  {
    id: 'deltaPack-bass-04', category: 'bass',
    label: 'Byte Bass A#',
    audioFile: 'bass/bass-04.wav', sourceFile: 'Stickz - Byte Synth Loop 004 - Bass.wav',
    bpm: 128, bars: 16, key: 'A#',
    notes: 'Synth bass stem Loop 004, 16 bars @ 128 BPM, A#min (trimmed from 17 for sync). Complementary to Gmin. Pairs with melody-04.',
    volume: 0.69, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.73, harmonicGroup: 'A#min', transientDensity: 0.36, lowEndWeight: 0.83, mixabilityScore: 84,
  },
  // ── Index 18: percussion-4 — transition B ────────────────────────────
  {
    id: 'deltaPack-trans-02', category: 'transition',
    label: 'Byte Fill B',
    audioFile: 'transitions/trans-02.wav', sourceFile: 'Stickz - Byte Fill 002 - 128BPM.wav',
    bpm: 128, bars: 4, key: null,
    notes: 'Drum fill variant, 1 bar hit + 3 bars silence = 4-bar cycle. Auto-retriggers every 4 bars. Complementary to trans-01.',
    volume: 0.54, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.83, harmonicGroup: 'neutral', transientDensity: 0.90, lowEndWeight: 0.62, mixabilityScore: 91,
  },
  // ── Index 19: voice-0 ─────────────────────────────────────────────────
  {
    id: 'deltaPack-vocal-01', category: 'voice',
    label: 'VCT Legacy Fm',
    audioFile: 'vocals/vocal-01.wav', sourceFile: 'Stickz VCT - Legacy Vocal Chop Loop 09 - 128BPM Fmin.wav',
    bpm: 128, bars: 4, key: 'F',
    notes: 'VCT Legacy vocal chop loop 09, 4 bars @ 128 BPM, Fmin. Zero detectable silence across entire 7.5s (even at -60dB threshold) — continuous chop energy. Mean -13.9 dB, peak -0.0 dB (457 histogram samples). Fmin adds harmonic freshness to vocal layer. Pairs with bass-02, melody-02. Distinct from vocal-03 (Chop series) despite shared key.',
    volume: 0.60, playbackMode: 'loop', playbackQuantization: 'beat', allowDriftCorrection: false,
    energy: 0.68, harmonicGroup: 'Fmin', transientDensity: 0.75, lowEndWeight: 0.08, mixabilityScore: 88,
  },
  // ── Index 20: voice-1 ─────────────────────────────────────────────────
  {
    id: 'deltaPack-vocal-02', category: 'voice',
    label: 'VCT Legacy Gm',
    audioFile: 'vocals/vocal-02.wav', sourceFile: 'Stickz VCT - Legacy Vocal Chop Loop 13 - 128BPM Gmin.wav',
    bpm: 128, bars: 4, key: 'G',
    notes: 'VCT Legacy vocal chop loop 13, 4 bars @ 128 BPM, Gmin. Active from t=0, only micro gaps (19ms, 34ms at 1.27s/1.73s — rhythmic chop pattern). Mean -14.7 dB. Replaces Loop 08 (weaker stutter). Distinct timbre from Legacy-02. Pairs with bass-02, melody-02.',
    volume: 0.54, playbackMode: 'loop', playbackQuantization: 'beat', allowDriftCorrection: false,
    energy: 0.62, harmonicGroup: 'Gmin', transientDensity: 0.72, lowEndWeight: 0.08, mixabilityScore: 84,
  },
  // ── Index 21: voice-2 ─────────────────────────────────────────────────
  {
    id: 'deltaPack-vocal-03', category: 'voice',
    label: 'VCT Chop Fm',
    audioFile: 'vocals/vocal-03.wav', sourceFile: 'Stickz VCT - Vocal Chop Loop 07 - 128BPM Fmin.wav',
    bpm: 128, bars: 8, key: 'F',
    notes: 'Vocal chop loop 07, 8 bars @ 128 BPM, Fmin. Longer phrase. Use after establishing key pads.',
    volume: 0.54, playbackMode: 'loop', playbackQuantization: 'beat', allowDriftCorrection: false,
    energy: 0.50, harmonicGroup: 'Fmin', transientDensity: 0.65, lowEndWeight: 0.06, mixabilityScore: 78,
  },
  // ── Index 22: voice-3 — transition C ─────────────────────────────────
  {
    id: 'deltaPack-trans-03', category: 'transition',
    label: 'Byte Drop',
    audioFile: 'transitions/trans-03.wav', sourceFile: 'Stickz - Byte Downlifter 001.wav',
    bpm: 128, bars: 8, key: null,
    notes: 'Downlifter, 9.2s sweep + 5.8s silence = 8-bar cycle. Auto-retriggers every 8 bars. Drop signal repeats periodically.',
    volume: 0.50, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.60, harmonicGroup: 'neutral', transientDensity: 0.25, lowEndWeight: 0.55, mixabilityScore: 85,
  },
  // ── Index 23: voice-4 — vocal 5 ─────────────────────────────────────
  {
    id: 'deltaPack-vocal-05', category: 'voice',
    label: 'VCT Legacy Am',
    audioFile: 'vocals/vocal-05.wav', sourceFile: 'Stickz VCT - Legacy Vocal Chop Loop 16 - 128BPM Amin.wav',
    bpm: 128, bars: 4, key: 'A',
    notes: 'VCT Legacy vocal chop loop 16, 4 bars @ 128 BPM, Amin. Dense vocal texture, continuous for 4.6s before first tiny 6ms gap. No leading silence. Harmonically pairs with bass-03, melody-03. Replaced atmosphere pad atmo-02 to complete the VOCALS group. Volume calibrated to -11.0 dB source (-1.4 dB vs vocal-02, -0.7 dB vs vocal-01).',
    volume: 0.55, playbackMode: 'loop', playbackQuantization: 'beat', allowDriftCorrection: false,
    energy: 0.64, harmonicGroup: 'Amin', transientDensity: 0.72, lowEndWeight: 0.08, mixabilityScore: 83,
  },
]

function buildAudioUrls(base: string): Record<string, string> {
  const paths = new Set<string>()
  for (const pad of deltaPackPads) paths.add(pad.audioFile)
  return Object.fromEntries([...paths].map((p) => [`${base}/${p}`, `${base}/${p}`]))
}

export const deltaPack = {
  id: 'delta-pack' as const,
  name: 'Delta Pack',
  bpm: SPINE_BPM,
  description: 'Delta Pack — 128 BPM curated collection from Stickz Byte. Drum loops, synth stems, vocal chops, FX and transitions.',
  pads: deltaPackPads,
  audioUrls: buildAudioUrls(D),
}

export function buildDeltaPackCompatiblePack(): CompatibleAudioPack {
  const pads: CompatiblePackPad[] = deltaPackPads.map((p) => ({
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
    id: deltaPack.id,
    name: deltaPack.name,
    description: deltaPack.description,
    philosophy: 'delta-pack',
    spine: { bpm: SPINE_BPM, key: SPINE_KEY, bars: SPINE_BARS, harmonicTonic: 'tonic' },
    pads,
    audioBasePath: D,
    audioUrls: deltaPack.audioUrls,
  }
}

export const deltaPackCompatible = buildDeltaPackCompatiblePack()
