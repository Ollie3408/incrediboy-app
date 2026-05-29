/**
 * Bravo Pack — curated from Stickz Byte + Hearts + Chroma + VCT
 *
 * BPM spine: 128  ·  Key: multi (Emin / Bmin / Gmaj / Gmin / C#min / A#min / A / Dmaj / F#maj / B)
 * Pads: 24 (matches ALL_PADS grid indices 0–23)
 *
 * Style: guitar-forward with synth bass textures, fresh vocal chop roster.
 * Beat section uses Byte full-mix loops and hat/top variants not used by Alpha or Delta.
 * Bass section pairs pre-processed C# and A# bass lines with Byte accents/Amin synth texture.
 * Melody section anchors on Hearts guitar loops (Emin/Bmin/Gmaj) + pre-processed Byte lead (Gmin).
 * Vocals span 5 entirely fresh harmonic keys (Dmaj, F#maj, Bmin, C#min, Emin).
 *
 * INDEX ORDER (must match ALL_PADS in App.tsx):
 *  0  beat-0       → beat-01 (Byte Full Groove 03-byte-full, 16 bars)
 *  1  beat-1       → beat-02 (01-byte-groove, 8 bars)
 *  2  beat-2       → beat-03 (02-byte-hat, 4 bars)
 *  3  beat-3       → beat-04 (04-byte-top-nokick, 8 bars)
 *  4  beat-4       → beat-05 (Byte Drum Loop 005, 16 bars)
 *  5  melody-0     → melody-01 (Hearts Guitar 023 Emin, 8 bars)
 *  6  melody-1     → melody-02 (Hearts Guitar 026 Bmin, 8 bars)
 *  7  melody-2     → melody-03 (Hearts Legacy 003 Gmaj, 4 bars)
 *  8  effect-0     → fx-01 (Byte Impact 01 — 4-bar cycle, padded)
 *  9  effect-1     → fx-02 (Byte Uplift 02 — 4-bar cycle, padded)
 * 10  effect-2     → trans-01 (Byte Fill A — 4-bar cycle, padded)
 * 11  effect-3     → trans-02 (Chroma Downlifter 037 — 4-bar cycle, padded)
 * 12  melody-3     → melody-04 (02-byte-lead-gmin, 16 bars trimmed)
 * 13  melody-4     → atmo-01 (Chroma Long Fill 019, 8 bars)
 * 14  percussion-0 → bass-01 (01-byte-bass-csharp, 16 bars trimmed)
 * 15  percussion-1 → bass-02 (04-byte-bass-asharp, 16 bars trimmed)
 * 16  percussion-2 → bass-03 (Byte Synth Loop 001 Bass Accents, 16 bars trimmed)
 * 17  percussion-3 → bass-04 (Byte Synth Loop 003 Amin, 16 bars trimmed)
 * 18  percussion-4 → atmo-02 (03-byte-riser, 8 bars)
 * 19  voice-0      → vocal-01 (VCT Legacy 04 Dmaj, 4 bars)
 * 20  voice-1      → vocal-02 (VCT Legacy 11 F#maj, 4 bars)
 * 21  voice-2      → vocal-03 (Chroma Vocal Chop 020 Bmin, 8 bars)
 * 22  voice-3      → vocal-04 (Vocoded Layer 06 C#min, 4 bars)
 * 23  voice-4      → vocal-05 (Hearts Guitar 024 Emin, 8 bars — melodic voice layer)
 */

import type { QuantizeMode } from '../../musicClock'
import type { CompatibleAudioPack, CompatiblePackPad } from '../../packBuilder/types'

export type BravoPackCategory =
  | 'beat' | 'bass' | 'melody' | 'fx' | 'voice' | 'transition' | 'atmosphere'

export type BravoPackPadConfig = {
  id: string
  category: BravoPackCategory
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

const B = '/audio/bravo-pack'
const SPINE_BPM = 128
const SPINE_KEY = 'E'
const SPINE_BARS = 8

export const bravoPackPads: BravoPackPadConfig[] = [
  // ── Index 0: beat-0 ────────────────────────────────────────────────────
  {
    id: 'bravoPack-beat-01', category: 'beat',
    label: 'Byte Full 03',
    audioFile: 'beats/beat-01.wav', sourceFile: '03-byte-full.wav',
    bpm: 128, bars: 16, key: null,
    notes: 'Full drum groove (pre-processed), 16 bars @ 128 BPM confirmed. Kick + snare + hat full mix. Primary groove layer.',
    volume: 0.87, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.80, harmonicGroup: 'neutral', transientDensity: 0.75, lowEndWeight: 0.62, mixabilityScore: 91,
  },
  // ── Index 1: beat-1 ────────────────────────────────────────────────────
  {
    id: 'bravoPack-beat-02', category: 'beat',
    label: 'Byte Groove 01',
    audioFile: 'beats/beat-02.wav', sourceFile: '01-byte-groove.wav',
    bpm: 128, bars: 8, key: null,
    notes: 'Groove loop (pre-processed), 8 bars @ 128 BPM confirmed. Second groove variant for layering over beat-01.',
    volume: 0.86, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.75, harmonicGroup: 'neutral', transientDensity: 0.72, lowEndWeight: 0.58, mixabilityScore: 90,
  },
  // ── Index 2: beat-2 ────────────────────────────────────────────────────
  {
    id: 'bravoPack-beat-03', category: 'beat',
    label: 'Byte Hat 02',
    audioFile: 'beats/beat-03.wav', sourceFile: '02-byte-hat.wav',
    bpm: 128, bars: 4, key: null,
    notes: 'Hi-hat loop (pre-processed), 4 bars @ 128 BPM confirmed. Sparse hi-hat texture, low transient density relative to full groove.',
    volume: 0.85, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.50, harmonicGroup: 'neutral', transientDensity: 0.78, lowEndWeight: 0.06, mixabilityScore: 93,
  },
  // ── Index 3: beat-3 ────────────────────────────────────────────────────
  {
    id: 'bravoPack-beat-04', category: 'beat',
    label: 'Byte Top NoKick',
    audioFile: 'beats/beat-04.wav', sourceFile: '04-byte-top-nokick.wav',
    bpm: 128, bars: 8, key: null,
    notes: 'Top loop without kick (pre-processed), 8 bars @ 128 BPM confirmed. Adds rhythmic density without competing with bass low-end.',
    volume: 0.84, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.52, harmonicGroup: 'neutral', transientDensity: 0.80, lowEndWeight: 0.08, mixabilityScore: 92,
  },
  // ── Index 4: beat-4 — 5th beat ─────────────────────────────────────────
  {
    id: 'bravoPack-beat-05', category: 'beat',
    label: 'Byte Drum 005',
    audioFile: 'beats/beat-05.wav', sourceFile: 'Stickz - Byte Drum Loop 005 - 128BPM.wav',
    bpm: 128, bars: 16, key: null,
    notes: 'Byte Drum Loop 005, 16 bars @ 128 BPM. Second full-mix drum pattern — distinct from Loops 001 (Delta) and 002 (Alpha). Denser groove with different snare emphasis.',
    volume: 0.84, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.78, harmonicGroup: 'neutral', transientDensity: 0.70, lowEndWeight: 0.60, mixabilityScore: 90,
  },
  // ── Index 5: melody-0 ─────────────────────────────────────────────────
  {
    id: 'bravoPack-melody-01', category: 'melody',
    label: 'Hearts Guitar Em',
    audioFile: 'melody/melody-01.wav', sourceFile: 'Stickz - Hearts Guitar Loop 023 - 128BPM Emin.wav',
    bpm: 128, bars: 8, key: 'E',
    notes: 'Hearts Guitar Loop 023, 8 bars @ 128 BPM, Emin. Clean guitar phrase with natural decay. Primary melody anchor. Pairs with bass-01 (C# enharmonic), vocal-01 (Dmaj relative), vocal-05 (Emin match).',
    volume: 0.70, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.58, harmonicGroup: 'Emin', transientDensity: 0.42, lowEndWeight: 0.14, mixabilityScore: 88,
  },
  // ── Index 6: melody-1 ─────────────────────────────────────────────────
  {
    id: 'bravoPack-melody-02', category: 'melody',
    label: 'Hearts Guitar Bm',
    audioFile: 'melody/melody-02.wav', sourceFile: 'Stickz - Hearts Guitar Loop 026 - 128BPM Bmin.wav',
    bpm: 128, bars: 8, key: 'B',
    notes: 'Hearts Guitar Loop 026, 8 bars @ 128 BPM, Bmin. Darker guitar phrasing than Loop 023. Pairs with vocal-03 (Bmin match), vocal-04 (C#min relative).',
    volume: 0.65, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.55, harmonicGroup: 'Bmin', transientDensity: 0.40, lowEndWeight: 0.16, mixabilityScore: 86,
  },
  // ── Index 7: melody-2 ─────────────────────────────────────────────────
  {
    id: 'bravoPack-melody-03', category: 'melody',
    label: 'Hearts Legacy Gmaj',
    audioFile: 'melody/melody-03.wav', sourceFile: 'Stickz - Hearts Legacy Loop 003 - 128BPM Gmaj.wav',
    bpm: 128, bars: 4, key: 'G',
    notes: 'Hearts Legacy Loop 003, 4 bars @ 128 BPM, Gmaj. Shorter loop cycle — more rhythmic punch. Bright major-key guitar. Pairs with bass-02 (A# relative major), vocal-02 (F#maj relative).',
    volume: 0.70, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.60, harmonicGroup: 'Gmaj', transientDensity: 0.45, lowEndWeight: 0.15, mixabilityScore: 84,
  },
  // ── Index 8: effect-0 ─────────────────────────────────────────────────
  {
    id: 'bravoPack-fx-01', category: 'fx',
    label: 'Byte Impact 01',
    audioFile: 'fx/fx-01.wav', sourceFile: '01-byte-impact.wav',
    bpm: 128, bars: 4, key: null,
    notes: 'Impact hit (pre-processed), 6.03s hit + 1.47s silence = 4-bar cycle (7.5s padded). Percussive impact trigger. Auto-retriggers every 4 bars.',
    volume: 0.55, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.72, harmonicGroup: 'neutral', transientDensity: 0.90, lowEndWeight: 0.50, mixabilityScore: 86,
  },
  // ── Index 9: effect-1 ─────────────────────────────────────────────────
  {
    id: 'bravoPack-fx-02', category: 'fx',
    label: 'Byte Uplift 02',
    audioFile: 'fx/fx-02.wav', sourceFile: '02-byte-uplift.wav',
    bpm: 128, bars: 4, key: null,
    notes: 'Uplifter sweep (pre-processed), 5.52s sweep + 1.98s silence = 4-bar cycle (7.5s padded). Rising energy sweep. Auto-retriggers every 4 bars.',
    volume: 0.52, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.62, harmonicGroup: 'neutral', transientDensity: 0.30, lowEndWeight: 0.28, mixabilityScore: 84,
  },
  // ── Index 10: effect-2 — transition 1 ───────────────────────────────
  {
    id: 'bravoPack-trans-01', category: 'transition',
    label: 'Byte Fill A',
    audioFile: 'transitions/trans-01.wav', sourceFile: '01-byte-fill-a.wav',
    bpm: 128, bars: 4, key: null,
    notes: 'Drum fill A (pre-processed), 1-bar fill + 3 bars silence = 4-bar cycle (7.5s padded). Clean 1-bar percussive fill. Auto-retriggers every 4 bars.',
    volume: 0.50, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.78, harmonicGroup: 'neutral', transientDensity: 0.88, lowEndWeight: 0.55, mixabilityScore: 90,
  },
  // ── Index 11: effect-3 — transition 2 ───────────────────────────────
  {
    id: 'bravoPack-trans-02', category: 'transition',
    label: 'Chroma Downlift',
    audioFile: 'transitions/trans-02.wav', sourceFile: 'Stickz - Chroma Downlifter 037.wav',
    bpm: 128, bars: 4, key: null,
    notes: 'Chroma Downlifter 037, 6.0s downlifter + 1.5s silence = 4-bar cycle (7.5s padded). Sweeping downward transition. Auto-retriggers every 4 bars.',
    volume: 0.52, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.65, harmonicGroup: 'neutral', transientDensity: 0.28, lowEndWeight: 0.30, mixabilityScore: 85,
  },
  // ── Index 12: melody-3 — 4th melody ─────────────────────────────────
  {
    id: 'bravoPack-melody-04', category: 'melody',
    label: 'Byte Lead Gm',
    audioFile: 'melody/melody-04.wav', sourceFile: '02-byte-lead-gmin.wav',
    bpm: 128, bars: 16, key: 'G',
    notes: 'Lead synth loop in Gmin (pre-processed), 18 bars trimmed to 16 bars @ 128 BPM. Synth-lead texture distinct from guitar melodies. Pairs with bass-01 (C# enharmonic), vocal-01 (Dmaj relative).',
    volume: 0.75, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.62, harmonicGroup: 'Gmin', transientDensity: 0.40, lowEndWeight: 0.20, mixabilityScore: 82,
  },
  // ── Index 13: melody-4 — atmosphere 1 ───────────────────────────────
  {
    id: 'bravoPack-atmo-01', category: 'atmosphere',
    label: 'Chroma Long Fill',
    audioFile: 'atmospheres/atmo-01.wav', sourceFile: 'Stickz - Chroma Long Fill 019 - 128BPM.wav',
    bpm: 128, bars: 8, key: null,
    notes: 'Chroma Long Fill 019, 8 bars @ 128 BPM. Sweeping rhythmic fill loop with atmospheric texture. Low fatigue backdrop. Pairs well with guitar melodies.',
    volume: 0.50, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.38, harmonicGroup: 'neutral', transientDensity: 0.25, lowEndWeight: 0.18, mixabilityScore: 87,
  },
  // ── Index 14: percussion-0 ───────────────────────────────────────────
  {
    id: 'bravoPack-bass-01', category: 'bass',
    label: 'Byte Bass C#',
    audioFile: 'bass/bass-01.wav', sourceFile: '01-byte-bass-csharp.wav',
    bpm: 128, bars: 16, key: 'C#',
    notes: 'Pre-processed bass in C#, 17 bars trimmed to 16 bars @ 128 BPM. Punchy melodic bass line. Pairs with melody-01 (Emin relative), melody-04 (Gmin modal).',
    volume: 0.68, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.68, harmonicGroup: 'C#min', transientDensity: 0.38, lowEndWeight: 0.72, mixabilityScore: 86,
  },
  // ── Index 15: percussion-1 ───────────────────────────────────────────
  {
    id: 'bravoPack-bass-02', category: 'bass',
    label: 'Byte Bass A#',
    audioFile: 'bass/bass-02.wav', sourceFile: '04-byte-bass-asharp.wav',
    bpm: 128, bars: 16, key: 'A#',
    notes: 'Pre-processed bass in A#, 17 bars trimmed to 16 bars @ 128 BPM. Complementary to bass-01 in a different key center. Pairs with melody-03 (Gmaj relative), vocal-02 (F#maj relative).',
    volume: 0.68, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.66, harmonicGroup: 'A#min', transientDensity: 0.36, lowEndWeight: 0.70, mixabilityScore: 84,
  },
  // ── Index 16: percussion-2 ───────────────────────────────────────────
  {
    id: 'bravoPack-bass-03', category: 'bass',
    label: 'Byte Bass Accents',
    audioFile: 'bass/bass-03.wav', sourceFile: 'Stickz - Byte Synth Loop 001 - Bass Accents.wav',
    bpm: 128, bars: 16, key: null,
    notes: 'Byte Synth Loop 001 Bass Accents, 17 bars trimmed to 16 bars @ 128 BPM. Sparse rhythmic bass stabs — low mean volume (-26.5 dB) due to gaps. Percussive accent layer rather than sustained bass.',
    volume: 0.72, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.58, harmonicGroup: 'neutral', transientDensity: 0.55, lowEndWeight: 0.65, mixabilityScore: 83,
  },
  // ── Index 17: percussion-3 ───────────────────────────────────────────
  {
    id: 'bravoPack-bass-04', category: 'bass',
    label: 'Byte Synth Am',
    audioFile: 'bass/bass-04.wav', sourceFile: 'Stickz - Byte Synth Loop 003 - 128BPM Amin.wav',
    bpm: 128, bars: 16, key: 'A',
    notes: 'Byte Synth Loop 003 full mix in Amin, 19 bars trimmed to 16 bars @ 128 BPM. Richer synth texture with embedded bass — fuller sound. Pairs with melody-01 (Emin relative), vocal-03 (Bmin relative), atmo-02.',
    volume: 0.62, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.70, harmonicGroup: 'Amin', transientDensity: 0.45, lowEndWeight: 0.68, mixabilityScore: 82,
  },
  // ── Index 18: percussion-4 — atmosphere 2 ───────────────────────────
  {
    id: 'bravoPack-atmo-02', category: 'atmosphere',
    label: 'Byte Riser 03',
    audioFile: 'atmospheres/atmo-02.wav', sourceFile: '03-byte-riser.wav',
    bpm: 128, bars: 8, key: null,
    notes: 'Riser sweep (pre-processed), 8 bars @ 128 BPM confirmed. Rising atmospheric texture — adds build energy without harmonic content. Low mean volume (-23 dB) due to sweep character.',
    volume: 0.55, playbackMode: 'loop', playbackQuantization: 'bar', allowDriftCorrection: false,
    energy: 0.32, harmonicGroup: 'neutral', transientDensity: 0.12, lowEndWeight: 0.15, mixabilityScore: 85,
  },
  // ── Index 19: voice-0 ────────────────────────────────────────────────
  {
    id: 'bravoPack-vocal-01', category: 'voice',
    label: 'VCT Legacy Dmaj',
    audioFile: 'vocals/vocal-01.wav', sourceFile: 'Stickz VCT - Legacy Vocal Chop Loop 04 - 128BPM Dmaj.wav',
    bpm: 128, bars: 4, key: 'D',
    notes: 'VCT Legacy vocal chop loop 04, 4 bars @ 128 BPM, Dmaj. Fresh key not in Alpha or Delta. Pairs harmonically with melody-04 (Gmin modal), beat-01 through beat-05.',
    volume: 0.58, playbackMode: 'loop', playbackQuantization: 'beat', allowDriftCorrection: false,
    energy: 0.60, harmonicGroup: 'Dmaj', transientDensity: 0.68, lowEndWeight: 0.07, mixabilityScore: 85,
  },
  // ── Index 20: voice-1 ────────────────────────────────────────────────
  {
    id: 'bravoPack-vocal-02', category: 'voice',
    label: 'VCT Legacy F#maj',
    audioFile: 'vocals/vocal-02.wav', sourceFile: 'Stickz VCT - Legacy Vocal Chop Loop 11 - 128BPM F#maj.wav',
    bpm: 128, bars: 4, key: 'F#',
    notes: 'VCT Legacy vocal chop loop 11, 4 bars @ 128 BPM, F#maj. Entirely fresh key absent from Alpha and Delta. Bright major tonality — highest mixability with guitar melodies.',
    volume: 0.58, playbackMode: 'loop', playbackQuantization: 'beat', allowDriftCorrection: false,
    energy: 0.58, harmonicGroup: 'F#maj', transientDensity: 0.66, lowEndWeight: 0.07, mixabilityScore: 84,
  },
  // ── Index 21: voice-2 ────────────────────────────────────────────────
  {
    id: 'bravoPack-vocal-03', category: 'voice',
    label: 'Chroma Vocal Bm',
    audioFile: 'vocals/vocal-03.wav', sourceFile: 'Stickz - Chroma Vocal Chop Loop 020 - 128BPM Bmin.wav',
    bpm: 128, bars: 8, key: 'B',
    notes: 'Chroma Vocal Chop Loop 020, 8 bars @ 128 BPM, Bmin. Longer 8-bar phrase with distinct Chroma character. Pairs with melody-02 (Bmin match), bass-04 (Amin relative).',
    volume: 0.60, playbackMode: 'loop', playbackQuantization: 'beat', allowDriftCorrection: false,
    energy: 0.62, harmonicGroup: 'Bmin', transientDensity: 0.70, lowEndWeight: 0.08, mixabilityScore: 86,
  },
  // ── Index 22: voice-3 ────────────────────────────────────────────────
  {
    id: 'bravoPack-vocal-04', category: 'voice',
    label: 'Vocoded C#m',
    audioFile: 'vocals/vocal-04.wav', sourceFile: 'Stickz VCT - Vocoded Loop Layer 06 - 128BPM C#min.wav',
    bpm: 128, bars: 4, key: 'C#',
    notes: 'VCT Vocoded Loop Layer 06, 4 bars @ 128 BPM, C#min. Processed vocal texture with synth-vocal character — distinct timbre from traditional chops. Pairs with bass-01 (C#min match), melody-01 (Emin relative).',
    volume: 0.58, playbackMode: 'loop', playbackQuantization: 'beat', allowDriftCorrection: false,
    energy: 0.56, harmonicGroup: 'C#min', transientDensity: 0.60, lowEndWeight: 0.10, mixabilityScore: 83,
  },
  // ── Index 23: voice-4 ────────────────────────────────────────────────
  {
    id: 'bravoPack-vocal-05', category: 'voice',
    label: 'Hearts Guitar Em2',
    audioFile: 'vocals/vocal-05.wav', sourceFile: 'Stickz - Hearts Guitar Loop 024 - 128BPM Emin.wav',
    bpm: 128, bars: 8, key: 'E',
    notes: 'Hearts Guitar Loop 024, 8 bars @ 128 BPM, Emin. Distinct MD5 from Loop 023 — different chop/phrase pattern in same key. Used as melodic voice layer; complements the vocal section with harmonic guitar texture. Pairs with vocal-01 (Dmaj relative), bass-04 (Amin relative to Emin).',
    volume: 0.65, playbackMode: 'loop', playbackQuantization: 'beat', allowDriftCorrection: false,
    energy: 0.55, harmonicGroup: 'Emin', transientDensity: 0.38, lowEndWeight: 0.12, mixabilityScore: 82,
  },
]

function buildAudioUrls(base: string): Record<string, string> {
  const paths = new Set<string>()
  for (const pad of bravoPackPads) paths.add(pad.audioFile)
  return Object.fromEntries([...paths].map((p) => [`${base}/${p}`, `${base}/${p}`]))
}

export const bravoPack = {
  id: 'bravo-pack' as const,
  name: 'Bravo Pack',
  bpm: SPINE_BPM,
  description: 'Bravo Pack — 128 BPM guitar-forward collection. Hearts guitar melodies, Byte synth bass, fresh VCT vocal keys.',
  pads: bravoPackPads,
  audioUrls: buildAudioUrls(B),
}

export function buildBravoPackCompatiblePack(): CompatibleAudioPack {
  const pads: CompatiblePackPad[] = bravoPackPads.map((p) => ({
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
    id: bravoPack.id,
    name: bravoPack.name,
    description: bravoPack.description,
    philosophy: 'bravo-pack',
    spine: { bpm: SPINE_BPM, key: SPINE_KEY, bars: SPINE_BARS, harmonicTonic: 'tonic' },
    pads,
    audioBasePath: B,
    audioUrls: bravoPack.audioUrls,
  }
}

export const bravoPackCompatible = buildBravoPackCompatiblePack()
