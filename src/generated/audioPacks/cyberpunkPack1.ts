/**
 * Cyberpunk Pack 1 — built from MMP-Essentials-Pack-08-Cyberpunk.
 * All loops are served from public/audio/cyberpunk-pack-1/ as static assets.
 *
 * IMPORTANT: pads are ordered to match ALL_PADS indices 0–23 exactly so the
 * 24-pad curated lookup in packPadForGamePad() maps each game slot directly.
 *
 * TIMING NOTES
 * ─────────────────────────────────────────────────────────────────────────────
 * Target: 105 BPM · 4 bars · 9.142857 s (all beats/bass/melody/atmo-01 match)
 *
 *  Idx  Game pad       Mode       BPM   Dur(s)    Key  Display / Source
 *   0   beat-0         loop       105   9.1429    -    beat_01   Drum_Loop_04_(Beat)
 *   1   beat-1         loop       110   8.7273*   -    beat_02   Drum_Loop_01_(Beat)_V2  ← V2 variant
 *   2   beat-2         loop       105   9.1429    -    beat_03   Drum_Loop_04_(Full)
 *   3   beat-3         loop       105   9.1429    -    beat_04   Drum_Loop_04_(Top/hats)
 *   4   beat-4         one-shot   —     8.0000    -    transition_01  FX Downnoise 07
 *   5   melody-0       loop       105   9.1429    C    melody_01  Synth_Loop_17 (Wet)
 *   6   melody-1       loop       105   9.1429    C    melody_02  Synth_Loop_19_V1 (Wet)
 *   7   melody-2       loop       105   9.1429    C    melody_03  Synth_Loop_19_V2 (Wet)
 *   8   effect-0       one-shot   —    12.0000    -    fx_01  FX_Buildup_One_Shot_04
 *   9   effect-1       one-shot   —    12.6469    -    fx_02  FX_Buildup_One_Shot_08
 *  10   effect-2       one-shot   —     1.3333    -    fx_03  FX_Reverse_One_Shot_05
 *  11   effect-3       one-shot   —     4.3637    -    fx_04  FX_One_Shot_01
 *  12   melody-3       loop       105   9.1429    A#   atmosphere_01  Synth_Loop_18_V2 (Wet)
 *  13   melody-4       loop       105   9.1429    F    melody_04  Synth_Loop_18_V1 (Wet)
 *  14   percussion-0   loop       105   9.1429    C    bass_01  Bass_Loop_09_V1 (Wet)
 *  15   percussion-1   loop       105   9.1429    C    bass_02  Bass_Loop_09_V2 (Wet)
 *  16   percussion-2   loop       105   9.1429    C    bass_03  Bass_Loop_10_V1 (Wet)
 *  17   percussion-3   loop       105   9.1429    C    bass_04  Bass_Loop_10_V2 (Wet)
 *  18   percussion-4   one-shot   —    13.0909    -    transition_02  FX_One_Shot_03
 *  19   voice-0        loop        93  20.6674*   E    vocal_01  Vox_Loop_22_V1 (Wet)
 *  20   voice-1        loop        93  20.6674*   G    vocal_02  Vox_Loop_22_V2 (Wet)
 *  21   voice-2        loop        93  20.6674*   C    vocal_03  Synth_Loop_21_V1 (Wet)
 *  22   voice-3        one-shot   —     4.3637    -    transition_03  FX_One_Shot_02
 *  23   voice-4        loop        93  20.6674*   A    atmosphere_02  Synth_Loop_20_V2 (Wet)
 *
 * * beat_02 is 110 BPM (no 105 BPM drum alternatives exist in this pack).
 *   Drift: ~0.42 s per beat_01 cycle (~10 cycles / 91 s before 1 full beat offset).
 *   Acceptable for short performance sessions.
 *
 * * Vocals and atmosphere_02 are 93 BPM (no 105 BPM vocal loops in pack).
 *   Drift: ~2.38 s per pair of beat cycles (~8 cycles / 73 s before audible phase slip).
 *   Acceptable as textural layers; they are not the rhythmic spine of the mix.
 *
 * KEY HARMONY: All 105 BPM loops are in C (bass_01-04, melody_01-03), with
 * complementary F (melody_04) and A# (atmosphere_01). C/F/A# form a I/IV/VII
 * cluster — strong cyberpunk/minor character. Vocals are E and G (relative
 * minor territory) which blends well over C minor. No clashes detected.
 */

export type CyberpunkPackCategory =
  | 'beat'
  | 'bass'
  | 'melody'
  | 'fx'
  | 'voice'
  | 'transition'
  | 'atmosphere'

export type CyberpunkPadConfig = {
  id: string
  category: CyberpunkPackCategory
  label: string
  audioFile: string
  sourceFile: string
  bpm: number | null
  bars: number | null
  notes: string
  /** Per-pad volume multiplier (0–1). Applied on top of the master volume
   *  so individual sounds layer cleanly without clipping. */
  volume: number
  /** 'one-shot' pads play once and stop; 'loop' pads repeat continuously.
   *  FX, buildups, risers, hits and transitions should be 'one-shot'.
   *  Beats, bass, melody, vocals and atmospheres should be 'loop'. */
  playbackMode: 'loop' | 'one-shot'
  /** Quantization grid applied when this pad is assigned during active playback.
   *  'immediate' = no delay, 'beat' = next quarter-note, 'bar' = next measure.
   *  Overrides the category-based defaults in resolvePlaybackQuantization().
   *  Omit to use the default (loops→bar, vocals→beat, one-shots→immediate). */
  playbackQuantization?: 'immediate' | 'beat' | 'bar'
  /** Set true to enable up-to-±2 % playbackRate drift correction for this pad.
   *  Architecture is in place; no pads currently enable this.
   *  Use only for loops with confirmed BPM that differs slightly from 105 BPM. */
  allowDriftCorrection: boolean
}

const B = '/audio/cyberpunk-pack-1'

export const cyberpunkPack1 = {
  id: 'cyberpunk-pack-1',
  name: 'Cyberpunk Pack 1',
  bpm: 105,

  pads: [
    // ── BEATS (indices 0–3, game beat-0..3) ─────────────────────────────────
    // beat_01/03/04 are all 105 BPM from Drum_Loop_04 — perfectly in sync.
    // beat_02 is 110 BPM V2 (no 105 BPM drum alternative available); acceptable drift.
    {
      id: 'cp1-beat-01', category: 'beat' as CyberpunkPackCategory,
      label: 'Beat 1',
      audioFile: 'beat_01.wav',
      sourceFile: 'MMP_EP8_105bpm_4bar_Drum_Loop_04_(Beat).wav',
      bpm: 105, bars: 4, notes: '105 BPM, 9.143s — main kick/snare, no cymbals',
      volume: 0.90, playbackMode: 'loop' as const,
      allowDriftCorrection: false,
    },
    {
      id: 'cp1-beat-02', category: 'beat' as CyberpunkPackCategory,
      label: 'Beat 2',
      audioFile: 'beat_02.wav',
      sourceFile: 'MMP_EP8_110bpm_4bar_Drum_Loop_01_(Beat)_V2.wav',
      bpm: 110, bars: 4,
      notes: '110 BPM V2 variant, 8.727s — best available; ~0.42s drift/cycle vs 105 BPM spine. Use as accent layer.',
      volume: 0.82, playbackMode: 'loop' as const,
      allowDriftCorrection: false,
    },
    {
      id: 'cp1-beat-03', category: 'beat' as CyberpunkPackCategory,
      label: 'Beat 3',
      audioFile: 'beat_03.wav',
      sourceFile: 'MMP_EP8_105bpm_4bar_Drum_Loop_04_(Full).wav',
      bpm: 105, bars: 4, notes: '105 BPM, 9.143s — full kit (kick+snare+hats), same family as beat_01 and beat_04',
      volume: 0.78, playbackMode: 'loop' as const,
      allowDriftCorrection: false,
    },
    {
      id: 'cp1-beat-04', category: 'beat' as CyberpunkPackCategory,
      label: 'Hi-Hats',
      audioFile: 'beat_04.wav',
      sourceFile: 'MMP_EP8_105bpm_4bar_Drum_Loop_04_(Top).wav',
      bpm: 105, bars: 4, notes: '105 BPM, 9.143s — cymbals & hi-hats layer only',
      volume: 0.70, playbackMode: 'loop' as const,
      allowDriftCorrection: false,
    },
    // ── TRANSITION at beat-4 slot (index 4) — ONE-SHOT ──────────────────────
    {
      id: 'cp1-trans-01', category: 'transition' as CyberpunkPackCategory,
      label: 'Sweep Down',
      audioFile: 'transition_01.wav',
      sourceFile: 'MMP_EP8_FX_Downnoise_One_Shot_07.wav',
      bpm: null, bars: null, notes: '8.0s downward noise sweep — one-shot, plays once per trigger',
      volume: 0.68, playbackMode: 'one-shot' as const,
      playbackQuantization: 'beat' as const,
      allowDriftCorrection: false,
    },
    // ── MELODY (indices 5–7, game melody-0..2) — all 105 BPM C key ──────────
    {
      id: 'cp1-melody-01', category: 'melody' as CyberpunkPackCategory,
      label: 'Synth Lead',
      audioFile: 'melody_01.wav',
      sourceFile: 'MMP_EP8_C_105bpm_4bar_Synth_Loop_17_(Wet).wav',
      bpm: 105, bars: 4, notes: '105 BPM, C key — main cyberpunk synth lead (Wet)',
      volume: 0.80, playbackMode: 'loop' as const,
      allowDriftCorrection: false,
    },
    {
      id: 'cp1-melody-02', category: 'melody' as CyberpunkPackCategory,
      label: 'Synth Loop A',
      audioFile: 'melody_02.wav',
      sourceFile: 'MMP_EP8_C_105bpm_4bar_Synth_Loop_19_V1_(Wet).wav',
      bpm: 105, bars: 4, notes: '105 BPM, C key — Synth Loop 19 V1 (Wet)',
      volume: 0.75, playbackMode: 'loop' as const,
      allowDriftCorrection: false,
    },
    {
      id: 'cp1-melody-03', category: 'melody' as CyberpunkPackCategory,
      label: 'Synth Loop B',
      audioFile: 'melody_03.wav',
      sourceFile: 'MMP_EP8_C_105bpm_4bar_Synth_Loop_19_V2_(Wet).wav',
      bpm: 105, bars: 4, notes: '105 BPM, C key — Synth Loop 19 V2 (Wet)',
      volume: 0.75, playbackMode: 'loop' as const,
      allowDriftCorrection: false,
    },
    // ── FX (indices 8–11, game effect-0..3) — ALL ONE-SHOTS ─────────────────
    // These are recorded FX transitions — they must NOT loop continuously.
    // Previously looping, fx_03 (1.33s) repeated 7× per beat cycle.
    {
      id: 'cp1-fx-01', category: 'fx' as CyberpunkPackCategory,
      label: 'Buildup A',
      audioFile: 'fx_01.wav',
      sourceFile: 'MMP_EP8_FX_Buildup_One_Shot_04.wav',
      bpm: null, bars: null, notes: '12.0s buildup riser — one-shot, assign for dramatic build',
      volume: 0.62, playbackMode: 'one-shot' as const,
      playbackQuantization: 'bar' as const,
      allowDriftCorrection: false,
    },
    {
      id: 'cp1-fx-02', category: 'fx' as CyberpunkPackCategory,
      label: 'Buildup B',
      audioFile: 'fx_02.wav',
      sourceFile: 'MMP_EP8_FX_Buildup_One_Shot_08.wav',
      bpm: null, bars: null, notes: '12.6s alternative buildup riser — one-shot',
      volume: 0.62, playbackMode: 'one-shot' as const,
      playbackQuantization: 'bar' as const,
      allowDriftCorrection: false,
    },
    {
      id: 'cp1-fx-03', category: 'fx' as CyberpunkPackCategory,
      label: 'Reverse FX',
      audioFile: 'fx_03.wav',
      sourceFile: 'MMP_EP8_FX_Reverse_One_Shot_05.wav',
      bpm: null, bars: null, notes: '1.33s reverse sweep — one-shot, quick backward whoosh',
      volume: 0.70, playbackMode: 'one-shot' as const,
      allowDriftCorrection: false,
    },
    {
      id: 'cp1-fx-04', category: 'fx' as CyberpunkPackCategory,
      label: 'FX Shot',
      audioFile: 'fx_04.wav',
      sourceFile: 'MMP_EP8_FX_One_Shot_01.wav',
      bpm: null, bars: null, notes: '4.36s cyberpunk FX impact — one-shot',
      volume: 0.67, playbackMode: 'one-shot' as const,
      allowDriftCorrection: false,
    },
    // ── ATMOSPHERE at melody-3 slot (index 12) — 105 BPM A# ─────────────────
    {
      id: 'cp1-atmo-01', category: 'atmosphere' as CyberpunkPackCategory,
      label: 'Atmosphere',
      audioFile: 'atmosphere_01.wav',
      sourceFile: 'MMP_EP8_A#_105bpm_4bar_Synth_Loop_18_V2_(Wet).wav',
      bpm: 105, bars: 4, notes: '105 BPM, A# key — complementary VII chord over C bass (Wet)',
      volume: 0.62, playbackMode: 'loop' as const,
      allowDriftCorrection: false,
    },
    // ── MELODY continued at melody-4 slot (index 13) — 105 BPM F key ────────
    {
      id: 'cp1-melody-04', category: 'melody' as CyberpunkPackCategory,
      label: 'Synth F',
      audioFile: 'melody_04.wav',
      sourceFile: 'MMP_EP8_F_105bpm_4bar_Synth_Loop_18_V1_(Wet).wav',
      bpm: 105, bars: 4, notes: '105 BPM, F key — IV chord warmth over C bass (Wet)',
      volume: 0.75, playbackMode: 'loop' as const,
      allowDriftCorrection: false,
    },
    // ── BASS (indices 14–17, game percussion-0..3) — all 105 BPM C key ──────
    {
      id: 'cp1-bass-01', category: 'bass' as CyberpunkPackCategory,
      label: 'Bass 1',
      audioFile: 'bass_01.wav',
      sourceFile: 'MMP_EP8_C_105bpm_4bar_Bass_Loop_09_V1_(Wet).wav',
      bpm: 105, bars: 4, notes: '105 BPM, C key — main bass line V1 (Wet)',
      volume: 0.72, playbackMode: 'loop' as const,
      allowDriftCorrection: false,
    },
    {
      id: 'cp1-bass-02', category: 'bass' as CyberpunkPackCategory,
      label: 'Bass 2',
      audioFile: 'bass_02.wav',
      sourceFile: 'MMP_EP8_C_105bpm_4bar_Bass_Loop_09_V2_(Wet).wav',
      bpm: 105, bars: 4, notes: '105 BPM, C key — Bass Loop 09 V2 (Wet)',
      volume: 0.70, playbackMode: 'loop' as const,
      allowDriftCorrection: false,
    },
    {
      id: 'cp1-bass-03', category: 'bass' as CyberpunkPackCategory,
      label: 'Bass 3',
      audioFile: 'bass_03.wav',
      sourceFile: 'MMP_EP8_C_105bpm_4bar_Bass_Loop_10_V1_(Wet).wav',
      bpm: 105, bars: 4, notes: '105 BPM, C key — Bass Loop 10 V1 (Wet)',
      volume: 0.70, playbackMode: 'loop' as const,
      allowDriftCorrection: false,
    },
    {
      id: 'cp1-bass-04', category: 'bass' as CyberpunkPackCategory,
      label: 'Bass 4',
      audioFile: 'bass_04.wav',
      sourceFile: 'MMP_EP8_C_105bpm_4bar_Bass_Loop_10_V2_(Wet).wav',
      bpm: 105, bars: 4, notes: '105 BPM, C key — Bass Loop 10 V2 (Wet)',
      volume: 0.68, playbackMode: 'loop' as const,
      allowDriftCorrection: false,
    },
    // ── TRANSITION at percussion-4 slot (index 18) — ONE-SHOT ───────────────
    {
      id: 'cp1-trans-02', category: 'transition' as CyberpunkPackCategory,
      label: 'FX Hit A',
      audioFile: 'transition_02.wav',
      sourceFile: 'MMP_EP8_FX_One_Shot_03.wav',
      bpm: null, bars: null, notes: '13.1s long FX hit — one-shot, cinematic impact',
      volume: 0.65, playbackMode: 'one-shot' as const,
      allowDriftCorrection: false,
    },
    // ── VOCALS (indices 19–21, game voice-0..2) — 93 BPM, accepted drift ────
    // No 105 BPM vocal loops exist in this pack. Drift ~2.4s per 2 beat cycles.
    // Lower volume than original to prevent domination over rhythmic spine.
    {
      id: 'cp1-vox-01', category: 'voice' as CyberpunkPackCategory,
      label: 'Vocals',
      audioFile: 'vocal_01.wav',
      sourceFile: 'MMP_EP8_E_93bpm_8bar_Vox_Loop_22_V1_(Wet).wav',
      bpm: 93, bars: 8, notes: '93 BPM, E key — processed vocal loop V1 (Wet); accepted drift vs 105 BPM spine',
      volume: 0.72, playbackMode: 'loop' as const,
      allowDriftCorrection: false,
    },
    {
      id: 'cp1-vox-02', category: 'voice' as CyberpunkPackCategory,
      label: 'Vocals G',
      audioFile: 'vocal_02.wav',
      sourceFile: 'MMP_EP8_G_93bpm_8bar_Vox_Loop_22_V2_(Wet).wav',
      bpm: 93, bars: 8, notes: '93 BPM, G key — vocal loop V2 (Wet); accepted drift',
      volume: 0.72, playbackMode: 'loop' as const,
      allowDriftCorrection: false,
    },
    {
      id: 'cp1-vox-03', category: 'voice' as CyberpunkPackCategory,
      label: 'Synth Vox',
      audioFile: 'vocal_03.wav',
      sourceFile: 'MMP_EP8_C_93bpm_8bar_Synth_Loop_21_V1_(Wet).wav',
      bpm: 93, bars: 8, notes: '93 BPM, C key — vocal-textured synth pad (Wet); accepted drift',
      volume: 0.70, playbackMode: 'loop' as const,
      allowDriftCorrection: false,
    },
    // ── TRANSITION at voice-3 slot (index 22) — ONE-SHOT ────────────────────
    {
      id: 'cp1-trans-03', category: 'transition' as CyberpunkPackCategory,
      label: 'FX Hit B',
      audioFile: 'transition_03.wav',
      sourceFile: 'MMP_EP8_FX_One_Shot_02.wav',
      bpm: null, bars: null, notes: '4.36s cyberpunk FX impact B — one-shot',
      volume: 0.67, playbackMode: 'one-shot' as const,
      allowDriftCorrection: false,
    },
    // ── ATMOSPHERE at voice-4 slot (index 23) — 93 BPM, accepted drift ──────
    {
      id: 'cp1-atmo-02', category: 'atmosphere' as CyberpunkPackCategory,
      label: 'Dark Pad',
      audioFile: 'atmosphere_02.wav',
      sourceFile: 'MMP_EP8_A_93bpm_8bar_Synth_Loop_20_V2_(Wet).wav',
      bpm: 93, bars: 8, notes: '93 BPM, A key — dark atmospheric pad (Wet); accepted drift; sits lowest in mix',
      volume: 0.58, playbackMode: 'loop' as const,
      allowDriftCorrection: false,
    },
  ] as CyberpunkPadConfig[],

  audioUrls: {
    [`${B}/beats/beat_01.wav`]:               `${B}/beats/beat_01.wav`,
    [`${B}/beats/beat_02.wav`]:               `${B}/beats/beat_02.wav`,
    [`${B}/beats/beat_03.wav`]:               `${B}/beats/beat_03.wav`,
    [`${B}/beats/beat_04.wav`]:               `${B}/beats/beat_04.wav`,
    [`${B}/bass/bass_01.wav`]:                `${B}/bass/bass_01.wav`,
    [`${B}/bass/bass_02.wav`]:                `${B}/bass/bass_02.wav`,
    [`${B}/bass/bass_03.wav`]:                `${B}/bass/bass_03.wav`,
    [`${B}/bass/bass_04.wav`]:                `${B}/bass/bass_04.wav`,
    [`${B}/melody/melody_01.wav`]:            `${B}/melody/melody_01.wav`,
    [`${B}/melody/melody_02.wav`]:            `${B}/melody/melody_02.wav`,
    [`${B}/melody/melody_03.wav`]:            `${B}/melody/melody_03.wav`,
    [`${B}/melody/melody_04.wav`]:            `${B}/melody/melody_04.wav`,
    [`${B}/fx/fx_01.wav`]:                   `${B}/fx/fx_01.wav`,
    [`${B}/fx/fx_02.wav`]:                   `${B}/fx/fx_02.wav`,
    [`${B}/fx/fx_03.wav`]:                   `${B}/fx/fx_03.wav`,
    [`${B}/fx/fx_04.wav`]:                   `${B}/fx/fx_04.wav`,
    [`${B}/vocals/vocal_01.wav`]:             `${B}/vocals/vocal_01.wav`,
    [`${B}/vocals/vocal_02.wav`]:             `${B}/vocals/vocal_02.wav`,
    [`${B}/vocals/vocal_03.wav`]:             `${B}/vocals/vocal_03.wav`,
    [`${B}/transitions/transition_01.wav`]:   `${B}/transitions/transition_01.wav`,
    [`${B}/transitions/transition_02.wav`]:   `${B}/transitions/transition_02.wav`,
    [`${B}/transitions/transition_03.wav`]:   `${B}/transitions/transition_03.wav`,
    [`${B}/atmospheres/atmosphere_01.wav`]:   `${B}/atmospheres/atmosphere_01.wav`,
    [`${B}/atmospheres/atmosphere_02.wav`]:   `${B}/atmospheres/atmosphere_02.wav`,
  } as Record<string, string>,
}
