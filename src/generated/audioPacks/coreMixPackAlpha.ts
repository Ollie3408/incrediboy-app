/**
 * Core Mix Pack Alpha — IncrediBoy reference pack for effortless interactive mixing.
 *
 * Philosophy: sparse isolated stems, single BPM spine (105), harmonic cluster C/F/A#.
 * NOT cinematic full-production loops.
 *
 * Core library (16 sounds):
 *   4 beat loops · 3 bass · 3 melody · 2 FX one-shots · 2 atmosphere · 2 vocal chops
 *
 * Pad order matches ALL_PADS indices 0–23 (same grid as Cyberpunk Pack 1).
 * Every pad maps to a unique audioFile under public/audio/core-mix-pack-alpha/.
 */

import type { QuantizeMode } from '../../musicClock'
import type { CompatibleAudioPack, CompatiblePackPad } from '../../packBuilder/types'

export type CoreMixCategory =
  | 'beat'
  | 'bass'
  | 'melody'
  | 'fx'
  | 'voice'
  | 'transition'
  | 'atmosphere'

/** Category accent colors for grouped pad UI (subtle identity). */
export const CORE_MIX_CATEGORY_COLORS: Record<CoreMixCategory, string> = {
  beat: '#9b4dca',
  bass: '#d47a1a',
  melody: '#3b8fe0',
  fx: '#3cb878',
  voice: '#e04545',
  transition: '#6b8f71',
  atmosphere: '#6b7fd4',
}

export type CoreMixPadConfig = {
  id: string
  category: CoreMixCategory
  label: string
  audioFile: string
  sourceFile: string
  bpm: number | null
  bars: number | null
  notes: string
  volume: number
  playbackMode: 'loop' | 'one-shot'
  playbackQuantization?: QuantizeMode
  allowDriftCorrection: boolean
  energy: number
  harmonicGroup: 'tonic' | 'subdominant' | 'dominant' | 'modal' | 'relative' | 'atonal' | 'percussive'
  transientDensity: number
  lowEndWeight: number
  mixabilityScore: number
  /** When true, pad is wired but source is weak / off-spine — prefer replacing in a future pass. */
  needsSource?: boolean
}

/** The 16 primary mix stems (one per core role). */
export const CORE_MIX_CORE_PAD_IDS = [
  'cma-beat-01',
  'cma-beat-02',
  'cma-beat-03',
  'cma-beat-04',
  'cma-bass-01',
  'cma-bass-02',
  'cma-bass-03',
  'cma-melody-01',
  'cma-melody-02',
  'cma-melody-03',
  'cma-fx-01',
  'cma-fx-02',
  'cma-atmo-01',
  'cma-atmo-02',
  'cma-vox-01',
  'cma-vox-02',
] as const

const B = '/audio/core-mix-pack-alpha'
const SPINE_BPM = 105
const SPINE_KEY = 'C'
const SPINE_BARS = 4

/**
 * Pads in ALL_PADS index order (0–23).
 *
 * Idx  Game pad        Pad id              audioFile
 *  0   beat-0          cma-beat-01         beats/beat_01.wav
 *  1   beat-1          cma-beat-02         beats/beat_02.wav
 *  2   beat-2          cma-beat-03         beats/beat_03.wav
 *  3   beat-3          cma-beat-04         beats/beat_04.wav  (110 BPM alt)
 *  4   beat-4          cma-trans-beat      transitions/transition_01.wav
 *  5   melody-0        cma-melody-01       melody/melody_01.wav
 *  6   melody-1        cma-melody-02       melody/melody_02.wav
 *  7   melody-2        cma-melody-03       melody/melody_03.wav
 *  8   effect-0        cma-fx-01           fx/fx_01.wav
 *  9   effect-1        cma-fx-02           fx/fx_02.wav
 * 10   effect-2        cma-fx-aux-01       fx/fx_03.wav
 * 11   effect-3        cma-fx-aux-02       fx/fx_04.wav
 * 12   melody-3        cma-atmo-01         atmospheres/atmosphere_01.wav
 * 13   melody-4        cma-melody-04       melody/melody_04.wav
 * 14   percussion-0    cma-bass-01         bass/bass_01.wav
 * 15   percussion-1    cma-bass-02         bass/bass_02.wav
 * 16   percussion-2    cma-bass-03         bass/bass_03.wav
 * 17   percussion-3    cma-bass-04         bass/bass_04.wav
 * 18   percussion-4    cma-trans-perc      transitions/transition_03.wav
 * 19   voice-0         cma-vox-01          vocals/vocal_01.wav
 * 20   voice-1         cma-vox-02          vocals/vocal_02.wav
 * 21   voice-2         cma-vox-aux         vocals/vocal_03.wav
 * 22   voice-3         cma-trans-vox       transitions/transition_02.wav
 * 23   voice-4         cma-atmo-02         atmospheres/atmosphere_02.wav
 */
export const coreMixPackAlphaPads: CoreMixPadConfig[] = [
  // ── 0–3 BEATS (4 unique loops) ─────────────────────────────────────────────
  {
    id: 'cma-beat-01', category: 'beat', label: 'Kick/Snare',
    audioFile: 'beats/beat_01.wav',
    sourceFile: 'MMP_EP8_105bpm_4bar_Drum_Loop_04_(Beat).wav',
    bpm: 105, bars: 4, notes: '105 BPM kick/snare — primary groove',
    volume: 0.86, playbackMode: 'loop', playbackQuantization: 'bar',
    allowDriftCorrection: false,
    energy: 0.70, harmonicGroup: 'percussive', transientDensity: 0.76, lowEndWeight: 0.52,
    mixabilityScore: 96,
  },
  {
    id: 'cma-beat-02', category: 'beat', label: 'Hi-Hats',
    audioFile: 'beats/beat_02.wav',
    sourceFile: 'MMP_EP8_105bpm_4bar_Drum_Loop_04_(Top).wav',
    bpm: 105, bars: 4, notes: '105 BPM hats/cymbals only',
    volume: 0.62, playbackMode: 'loop', playbackQuantization: 'bar',
    allowDriftCorrection: false,
    energy: 0.48, harmonicGroup: 'percussive', transientDensity: 0.58, lowEndWeight: 0.06,
    mixabilityScore: 94,
  },
  {
    id: 'cma-beat-03', category: 'beat', label: 'Soft Kit',
    audioFile: 'beats/beat_03.wav',
    sourceFile: 'MMP_EP8_105bpm_4bar_Drum_Loop_04_(Full).wav',
    bpm: 105, bars: 4, notes: '105 BPM full kit — stack lightly',
    volume: 0.58, playbackMode: 'loop', playbackQuantization: 'bar',
    allowDriftCorrection: false,
    energy: 0.62, harmonicGroup: 'percussive', transientDensity: 0.72, lowEndWeight: 0.48,
    mixabilityScore: 78,
  },
  {
    id: 'cma-beat-04', category: 'beat', label: 'Alt Beat',
    audioFile: 'beats/beat_04.wav',
    sourceFile: 'MMP_EP8_110bpm_4bar_Drum_Loop_01_(Beat)_V1.wav',
    bpm: 110, bars: 4,
    notes: '110 BPM alternate beat — only non-duplicate drum loop in source pack; phases vs 105 spine',
    volume: 0.52, playbackMode: 'loop', playbackQuantization: 'bar',
    allowDriftCorrection: false,
    energy: 0.55, harmonicGroup: 'percussive', transientDensity: 0.68, lowEndWeight: 0.45,
    mixabilityScore: 72,
    needsSource: true,
  },
  // ── 4 transition (one-shot) ───────────────────────────────────────────────
  {
    id: 'cma-trans-beat', category: 'transition', label: 'Sweep',
    audioFile: 'transitions/transition_01.wav',
    sourceFile: 'MMP_EP8_FX_Downnoise_One_Shot_07.wav',
    bpm: null, bars: null, notes: 'Down sweep accent — one-shot',
    volume: 0.58, playbackMode: 'one-shot', playbackQuantization: 'beat',
    allowDriftCorrection: false,
    energy: 0.65, harmonicGroup: 'atonal', transientDensity: 0.40, lowEndWeight: 0.18,
    mixabilityScore: 82,
  },
  // ── 5–7 MELODY (3 core loops) ─────────────────────────────────────────────
  {
    id: 'cma-melody-01', category: 'melody', label: 'Hook F',
    audioFile: 'melody/melody_01.wav',
    sourceFile: 'MMP_EP8_F_105bpm_4bar_Synth_Loop_18_V1_(Wet).wav',
    bpm: 105, bars: 4, notes: '105 BPM F hook — short motif',
    volume: 0.68, playbackMode: 'loop', playbackQuantization: 'bar',
    allowDriftCorrection: false,
    energy: 0.52, harmonicGroup: 'subdominant', transientDensity: 0.38, lowEndWeight: 0.04,
    mixabilityScore: 90,
  },
  {
    id: 'cma-melody-02', category: 'melody', label: 'Motif C',
    audioFile: 'melody/melody_02.wav',
    sourceFile: 'MMP_EP8_C_105bpm_4bar_Synth_Loop_19_V1_(Wet).wav',
    bpm: 105, bars: 4, notes: '105 BPM C tonic motif',
    volume: 0.64, playbackMode: 'loop', playbackQuantization: 'bar',
    allowDriftCorrection: false,
    energy: 0.48, harmonicGroup: 'tonic', transientDensity: 0.42, lowEndWeight: 0.04,
    mixabilityScore: 88,
  },
  {
    id: 'cma-melody-03', category: 'melody', label: 'Motif C2',
    audioFile: 'melody/melody_03.wav',
    sourceFile: 'MMP_EP8_C_105bpm_4bar_Synth_Loop_19_V2_(Wet).wav',
    bpm: 105, bars: 4, notes: '105 BPM C variant — avoid stacking with Motif C',
    volume: 0.60, playbackMode: 'loop', playbackQuantization: 'bar',
    allowDriftCorrection: false,
    energy: 0.50, harmonicGroup: 'tonic', transientDensity: 0.44, lowEndWeight: 0.04,
    mixabilityScore: 80,
  },
  // ── 8–9 FX (2 core one-shots) ─────────────────────────────────────────────
  {
    id: 'cma-fx-01', category: 'fx', label: 'Reverse',
    audioFile: 'fx/fx_01.wav',
    sourceFile: 'MMP_EP8_FX_Reverse_One_Shot_05.wav',
    bpm: null, bars: null, notes: 'Short reverse sweep — one-shot',
    volume: 0.58, playbackMode: 'one-shot', playbackQuantization: 'immediate',
    allowDriftCorrection: false,
    energy: 0.62, harmonicGroup: 'atonal', transientDensity: 0.50, lowEndWeight: 0.06,
    mixabilityScore: 88,
  },
  {
    id: 'cma-fx-02', category: 'fx', label: 'Impact',
    audioFile: 'fx/fx_02.wav',
    sourceFile: 'MMP_EP8_FX_One_Shot_01.wav',
    bpm: null, bars: null, notes: 'Light impact hit — one-shot',
    volume: 0.55, playbackMode: 'one-shot', playbackQuantization: 'immediate',
    allowDriftCorrection: false,
    energy: 0.70, harmonicGroup: 'atonal', transientDensity: 0.62, lowEndWeight: 0.12,
    mixabilityScore: 86,
  },
  // ── 10–11 auxiliary FX (unique one-shots) ─────────────────────────────────
  {
    id: 'cma-fx-aux-01', category: 'fx', label: 'Reverse B',
    audioFile: 'fx/fx_03.wav',
    sourceFile: 'MMP_EP8_FX_Reverse_One_Shot_06.wav',
    bpm: null, bars: null, notes: 'Alternate reverse FX — one-shot',
    volume: 0.42, playbackMode: 'one-shot', playbackQuantization: 'beat',
    allowDriftCorrection: false,
    energy: 0.55, harmonicGroup: 'atonal', transientDensity: 0.48, lowEndWeight: 0.08,
    mixabilityScore: 76,
  },
  {
    id: 'cma-fx-aux-02', category: 'fx', label: 'Build',
    audioFile: 'fx/fx_04.wav',
    sourceFile: 'MMP_EP8_FX_Buildup_One_Shot_08.wav',
    bpm: null, bars: null, notes: 'Buildup riser — one-shot',
    volume: 0.38, playbackMode: 'one-shot', playbackQuantization: 'bar',
    allowDriftCorrection: false,
    energy: 0.45, harmonicGroup: 'atonal', transientDensity: 0.35, lowEndWeight: 0.04,
    mixabilityScore: 74,
  },
  // ── 12 atmosphere + 13 fourth melody ───────────────────────────────────────
  {
    id: 'cma-atmo-01', category: 'atmosphere', label: 'Air',
    audioFile: 'atmospheres/atmosphere_01.wav',
    sourceFile: 'MMP_EP8_A#_105bpm_4bar_Synth_Loop_18_V2_(Wet).wav',
    bpm: 105, bars: 4, notes: '105 BPM A# pad glue',
    volume: 0.48, playbackMode: 'loop', playbackQuantization: 'bar',
    allowDriftCorrection: false,
    energy: 0.28, harmonicGroup: 'dominant', transientDensity: 0.16, lowEndWeight: 0.05,
    mixabilityScore: 92,
  },
  {
    id: 'cma-melody-04', category: 'melody', label: 'Lead C',
    audioFile: 'melody/melody_04.wav',
    sourceFile: 'MMP_EP8_C_105bpm_4bar_Synth_Loop_17_(Wet).wav',
    bpm: 105, bars: 4, notes: '105 BPM C synth lead — distinct from Motif C/V2',
    volume: 0.44, playbackMode: 'loop', playbackQuantization: 'bar',
    allowDriftCorrection: false,
    energy: 0.35, harmonicGroup: 'tonic', transientDensity: 0.28, lowEndWeight: 0.03,
    mixabilityScore: 82,
  },
  // ── 14–17 BASS (4 unique loops; core uses 01–03) ──────────────────────────
  {
    id: 'cma-bass-01', category: 'bass', label: 'Bass',
    audioFile: 'bass/bass_01.wav',
    sourceFile: 'MMP_EP8_C_105bpm_4bar_Bass_Loop_09_V1_(Wet).wav',
    bpm: 105, bars: 4, notes: '105 BPM main C bass',
    volume: 0.68, playbackMode: 'loop', playbackQuantization: 'bar',
    allowDriftCorrection: false,
    energy: 0.58, harmonicGroup: 'tonic', transientDensity: 0.32, lowEndWeight: 0.78,
    mixabilityScore: 94,
  },
  {
    id: 'cma-bass-02', category: 'bass', label: 'Bass Alt',
    audioFile: 'bass/bass_02.wav',
    sourceFile: 'MMP_EP8_C_105bpm_4bar_Bass_Loop_09_V2_(Wet).wav',
    bpm: 105, bars: 4, notes: '105 BPM bass variant',
    volume: 0.62, playbackMode: 'loop', playbackQuantization: 'bar',
    allowDriftCorrection: false,
    energy: 0.54, harmonicGroup: 'tonic', transientDensity: 0.34, lowEndWeight: 0.74,
    mixabilityScore: 84,
  },
  {
    id: 'cma-bass-03', category: 'bass', label: 'Sub Pulse',
    audioFile: 'bass/bass_03.wav',
    sourceFile: 'MMP_EP8_C_105bpm_4bar_Bass_Loop_10_V1_(Wet).wav',
    bpm: 105, bars: 4, notes: '105 BPM pulsing sub',
    volume: 0.56, playbackMode: 'loop', playbackQuantization: 'bar',
    allowDriftCorrection: false,
    energy: 0.50, harmonicGroup: 'tonic', transientDensity: 0.30, lowEndWeight: 0.72,
    mixabilityScore: 78,
  },
  {
    id: 'cma-bass-04', category: 'bass', label: 'Sub Deep',
    audioFile: 'bass/bass_04.wav',
    sourceFile: 'MMP_EP8_C_105bpm_4bar_Bass_Loop_10_V2_(Wet).wav',
    bpm: 105, bars: 4, notes: '105 BPM bass V2 — fourth unique bass layer',
    volume: 0.40, playbackMode: 'loop', playbackQuantization: 'bar',
    allowDriftCorrection: false,
    energy: 0.38, harmonicGroup: 'tonic', transientDensity: 0.22, lowEndWeight: 0.65,
    mixabilityScore: 76,
  },
  // ── 18 transition hit ─────────────────────────────────────────────────────
  {
    id: 'cma-trans-perc', category: 'transition', label: 'Hit',
    audioFile: 'transitions/transition_03.wav',
    sourceFile: 'MMP_EP8_FX_One_Shot_03.wav',
    bpm: null, bars: null, notes: 'Long FX impact — one-shot',
    volume: 0.52, playbackMode: 'one-shot', playbackQuantization: 'beat',
    allowDriftCorrection: false,
    energy: 0.68, harmonicGroup: 'atonal', transientDensity: 0.55, lowEndWeight: 0.10,
    mixabilityScore: 78,
  },
  // ── 19–21 VOCALS ──────────────────────────────────────────────────────────
  {
    id: 'cma-vox-01', category: 'voice', label: 'Chop A',
    audioFile: 'vocals/vocal_01.wav',
    sourceFile: 'MMP_EP8_E_93bpm_8bar_Vox_Loop_22_V1_(Wet).wav',
    bpm: 93, bars: 8, notes: '93 BPM 8-bar vocal chop — repeating phrase loop',
    volume: 0.52, playbackMode: 'loop', playbackQuantization: 'beat',
    allowDriftCorrection: false,
    energy: 0.42, harmonicGroup: 'relative', transientDensity: 0.34, lowEndWeight: 0.03,
    mixabilityScore: 64,
    needsSource: true,
  },
  {
    id: 'cma-vox-02', category: 'voice', label: 'Chop B',
    audioFile: 'vocals/vocal_02.wav',
    sourceFile: 'MMP_EP8_G_93bpm_8bar_Vox_Loop_22_V2_(Wet).wav',
    bpm: 93, bars: 8, notes: '93 BPM 8-bar vocal chop — repeating phrase loop',
    volume: 0.48, playbackMode: 'loop', playbackQuantization: 'beat',
    allowDriftCorrection: false,
    energy: 0.40, harmonicGroup: 'relative', transientDensity: 0.32, lowEndWeight: 0.03,
    mixabilityScore: 62,
    needsSource: true,
  },
  {
    id: 'cma-vox-aux', category: 'voice', label: 'Synth Vox',
    audioFile: 'vocals/vocal_03.wav',
    sourceFile: 'MMP_EP8_C_93bpm_8bar_Synth_Loop_21_V1_(Wet).wav',
    bpm: 93, bars: 8, notes: '93 BPM synth-vocal texture — repeating loop',
    volume: 0.36, playbackMode: 'loop', playbackQuantization: 'beat',
    allowDriftCorrection: false,
    energy: 0.30, harmonicGroup: 'relative', transientDensity: 0.22, lowEndWeight: 0.02,
    mixabilityScore: 58,
    needsSource: true,
  },
  // ── 22 transition stab ────────────────────────────────────────────────────
  {
    id: 'cma-trans-vox', category: 'transition', label: 'Stab',
    audioFile: 'transitions/transition_02.wav',
    sourceFile: 'MMP_EP8_FX_One_Shot_02.wav',
    bpm: null, bars: null, notes: 'Short FX stab — one-shot',
    volume: 0.45, playbackMode: 'one-shot', playbackQuantization: 'beat',
    allowDriftCorrection: false,
    energy: 0.60, harmonicGroup: 'atonal', transientDensity: 0.50, lowEndWeight: 0.08,
    mixabilityScore: 70,
  },
  // ── 23 second atmosphere ───────────────────────────────────────────────────
  {
    id: 'cma-atmo-02', category: 'atmosphere', label: 'Wide Pad',
    audioFile: 'atmospheres/atmosphere_02.wav',
    sourceFile: 'MMP_EP8_A_93bpm_8bar_Synth_Loop_20_V2_(Wet).wav',
    bpm: 93, bars: 8, notes: '93 BPM 8-bar wide pad — repeating atmosphere loop',
    volume: 0.42, playbackMode: 'loop', playbackQuantization: 'bar',
    allowDriftCorrection: false,
    energy: 0.26, harmonicGroup: 'dominant', transientDensity: 0.14, lowEndWeight: 0.04,
    mixabilityScore: 80,
    needsSource: true,
  },
]

export const coreMixPackAlpha = {
  id: 'core-mix-pack-alpha',
  name: 'Core Mix Pack Alpha',
  bpm: SPINE_BPM,
  description:
    'Reference interactive pack — sparse grooves, harmonic C cluster, low mud. Built for easy Incredibox-style layering.',
  pads: coreMixPackAlphaPads,
  audioUrls: buildAudioUrls(B),
}

function buildAudioUrls(base: string): Record<string, string> {
  const paths = new Set<string>()
  for (const pad of coreMixPackAlphaPads) {
    paths.add(pad.audioFile)
  }
  return Object.fromEntries([...paths].map((p) => [`${base}/${p}`, `${base}/${p}`]))
}

/** Build CompatibleAudioPack for diagnostics drawer / packBuilder tools. */
export function buildCoreMixCompatiblePack(): CompatibleAudioPack {
  const pads: CompatiblePackPad[] = coreMixPackAlphaPads.map((p) => ({
    id: p.id,
    label: p.label,
    audioFile: p.audioFile,
    sourceFile: p.sourceFile,
    gameCategory: mapGameCategory(p.category),
    volume: p.volume,
    notes: p.notes,
    compatibility: {
      bpm: p.bpm,
      key: keyFromHarmonic(p),
      bars: p.bars,
      energy: p.energy,
      category: mapCoreMixCategory(p.category),
      harmonicGroup: p.harmonicGroup,
      transientDensity: p.transientDensity,
      lowEndWeight: p.lowEndWeight,
      mixabilityScore: p.mixabilityScore,
      playbackQuantization: p.playbackQuantization ?? defaultQuantization(p),
      oneShot: p.playbackMode === 'one-shot',
    },
  }))

  return {
    id: coreMixPackAlpha.id,
    name: coreMixPackAlpha.name,
    description: coreMixPackAlpha.description,
    philosophy: 'core-mix-alpha',
    spine: { bpm: SPINE_BPM, key: SPINE_KEY, bars: SPINE_BARS, harmonicTonic: 'tonic' },
    pads,
    audioBasePath: B,
    audioUrls: coreMixPackAlpha.audioUrls,
  }
}

function mapGameCategory(
  c: CoreMixCategory,
): CompatiblePackPad['gameCategory'] {
  if (c === 'bass') return 'bass'
  if (c === 'atmosphere') return 'atmosphere'
  return c
}

function mapCoreMixCategory(
  c: CoreMixCategory,
): CompatiblePackPad['compatibility']['category'] {
  if (c === 'beat') return 'drum-groove'
  if (c === 'bass') return 'bass'
  if (c === 'voice') return 'vocal-chop'
  return c as CompatiblePackPad['compatibility']['category']
}

function keyFromHarmonic(p: CoreMixPadConfig): string | null {
  if (p.harmonicGroup === 'percussive' || p.harmonicGroup === 'atonal') return null
  if (p.harmonicGroup === 'subdominant') return 'F'
  if (p.harmonicGroup === 'dominant') return 'A#'
  return SPINE_KEY
}

function defaultQuantization(p: CoreMixPadConfig): QuantizeMode {
  if (p.playbackMode === 'one-shot') return p.category === 'fx' ? 'immediate' : 'beat'
  if (p.category === 'voice') return 'beat'
  return 'bar'
}

export const coreMixPackAlphaCompatible = buildCoreMixCompatiblePack()
