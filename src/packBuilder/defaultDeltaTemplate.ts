/**
 * defaultDeltaTemplate.ts — canonical Delta Foundation template for all future IncrediBoy packs.
 *
 * Delta Pack (built from Stickz - Byte + Stickz VCT stems) is the reference implementation
 * for transport synchronization, beat-grid alignment, volume staging, and curation quality.
 *
 * Every new pack created via `npm run pack:build-delta-template` must conform to the
 * specifications defined here.  The constants, types, and slot map in this file are the
 * single source of truth consumed by the pack-builder CLI scripts.
 *
 * DELTA RULES TO INHERIT
 * ──────────────────────
 * Synchronization:  shared BPM spine · identical beat-grid origin · phase-lock monitoring ·
 *                   runtime drift correction · quantized starts · synchronized pause/resume ·
 *                   identical loop bar structure · master transport behavior
 *
 * Pack structure:   Beats 5 · Bass 4 · Melody 4 · Atmospheres 2 · Vocals 3 · FX 3 · Transitions 3
 *
 * Curation rules:   same-ecosystem source material preferred · exact BPM matching preferred ·
 *                   harmonically compatible · low fatigue · simple layering · distinct sounds ·
 *                   no duplicate audio · avoid complex overlapping melodies
 */

import type { QuantizeMode } from '../musicClock'

// ─────────────────────────────────────────────────────────────────────────────
// BPM & KEY
// ─────────────────────────────────────────────────────────────────────────────

/** Spine BPM for new Delta-template packs.  Must match source stems exactly. */
export const DELTA_TEMPLATE_BPM = 128

/**
 * Key center label for the pack.  Multi-key packs (different stems in
 * different keys) should list the tonic of each key family used.
 * Example: 'C#min / Gmin / Amin / A#min'
 */
export const DELTA_TEMPLATE_KEY_CENTER = 'multi'

// ─────────────────────────────────────────────────────────────────────────────
// PAD STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

/** Exact number of pads per category — must sum to 24 to fill the full game grid. */
export const DELTA_TEMPLATE_PAD_COUNTS = {
  beats:       5,
  bass:        4,
  melody:      4,
  atmospheres: 2,
  vocals:      3,
  fx:          3,
  transitions: 3,
  total:       24,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// BAR LENGTHS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All loop lengths must be powers-of-2 bars so that every pad phase-resets
 * at the same time.  The LCM is 16 bars = 30 000 ms at 128 BPM.
 *
 *   4 bars  →  7 500 ms  (hi-hats, accents, fills, short vocal chops)
 *   8 bars  → 15 000 ms  (groove beats, sweeps)
 *  16 bars  → 30 000 ms  (bass lines, melodies, atmospheres, long risers)
 *
 * FX and transition pads follow the same grid but may contain silence padding
 * after their active hit/sweep content.  The silence ensures phase alignment
 * without introducing drift.
 */
export type DeltaBarLength = 4 | 8 | 16

export const DELTA_TEMPLATE_BAR_LENGTHS: DeltaBarLength[] = [4, 8, 16]

/** Loop duration in milliseconds at 128 BPM per bar count. */
export const DELTA_TEMPLATE_LOOP_DURATION_MS: Record<DeltaBarLength, number> = {
  4:  7_500,
  8:  15_000,
  16: 30_000,
}

/** LCM of all loop durations — the point at which every pad phase-resets together. */
export const DELTA_TEMPLATE_LCM_DURATION_MS = 30_000

// ─────────────────────────────────────────────────────────────────────────────
// VOLUME TARGETS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-category volume targets (0–1 multiplier applied to audio.volume).
 * These targets assume the global master volume is at 100 % (1.0).
 * A soft ceiling of 0.95 is applied at runtime by padEffVol() to preserve
 * headroom into the DynamicsCompressorNode.
 *
 * Do NOT flatten dynamics — preserve punch, musical character, and feel.
 */
export const DELTA_TEMPLATE_VOLUME_TARGETS = {
  beats:       { min: 0.82, max: 0.90, recommended: 0.87 },
  bass:        { min: 0.62, max: 0.72, recommended: 0.67 },
  melody:      { min: 0.65, max: 0.80, recommended: 0.72 },
  atmospheres: { min: 0.42, max: 0.58, recommended: 0.50 },
  vocals:      { min: 0.48, max: 0.65, recommended: 0.55 },
  fx:          { min: 0.50, max: 0.65, recommended: 0.57 },
  transitions: { min: 0.45, max: 0.60, recommended: 0.52 },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// PLAYBACK RULES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default playback behaviour per category.
 *
 * FX and Transition pads use `loop` with bar quantization.  The active audio
 * content should be short (hit / sweep / fill) followed by silence padding to
 * fill the grid slot.  This prevents characters becoming dead/idle after a
 * single trigger while keeping the feel of a one-shot event.
 */
type DeltaTemplateCategory = 'beats' | 'bass' | 'melody' | 'atmospheres' | 'vocals' | 'fx' | 'transitions'

export const DELTA_TEMPLATE_PLAYBACK_RULES: Record<
  DeltaTemplateCategory,
  { playbackMode: 'loop' | 'one-shot'; playbackQuantization: QuantizeMode; allowDriftCorrection: boolean }
> = {
  beats:       { playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false },
  bass:        { playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false },
  melody:      { playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false },
  atmospheres: { playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false },
  vocals:      { playbackMode: 'loop', playbackQuantization: 'beat', allowDriftCorrection: false },
  fx:          { playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false },
  transitions: { playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false },
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNCHRONISATION REQUIREMENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Transport and phase-lock settings that every Delta-template pack must respect. */
export const DELTA_TEMPLATE_SYNC = {
  /** All loops must be exactly N bars at the spine BPM — no fractional bars. */
  requireExactBarAlignment: true,

  /** Acceptable bar counts (powers of 2 whose LCM fits in 30 000 ms). */
  acceptedBarCounts: [4, 8, 16] as DeltaBarLength[],

  /** Maximum allowed BPM deviation from DELTA_TEMPLATE_BPM before rejection. */
  maxBpmDeviationPct: 1.5,

  /** Maximum drift percentage before allowDriftCorrection should be set true. */
  driftCorrectionThresholdPct: 1.0,

  /** Phase correction: use playbackRate adjustment below this delta (ms). */
  phaseSoftThresholdMs: 25,

  /** Phase correction: hard audio.currentTime snap above this delta (ms). */
  phaseHardThresholdMs: 80,

  /** Phase correction poll interval (ms). */
  phaseCorrectionIntervalMs: 2_000,

  /** All pads in a session are batch-started for sample-accurate alignment. */
  batchStart: true,

  /**
   * True Transport Lock: on global pause, every active audio element is paused
   * with its currentTime stored.  On resume, currentTime is restored per element
   * and all elements are batch-played in a single synchronised call.
   */
  trueTransportLock: true,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// CURATION RULES
// ─────────────────────────────────────────────────────────────────────────────

/** Qualitative and quantitative rules for source audio selection. */
export const DELTA_TEMPLATE_CURATION_RULES = {
  /** Prefer stems from the same sample pack or artist for tonal cohesion. */
  preferSingleEcosystem: true,

  /** BPM must match spine exactly; fractional-BPM stems should be rejected. */
  requireExactBpmMatch: true,

  /** All melodic material must share harmonic family or be clearly atonal. */
  requireHarmonicCompatibility: true,

  /** Clipping at any loudness level disqualifies a stem. */
  noClipping: true,

  /** Maximum allowed silence at the start of a loop before the first transient. */
  maxSilenceAtStartMs: 10,

  /** Loop start/end must be click-free (apply ≤ 40 ms fade if necessary). */
  requireCleanLoopPoint: true,

  /** No two pads may be derived from the same source file. */
  noIdenticalStemDuplicates: true,

  /** Two bass stems must not occupy the same fundamental frequency band. */
  noOverlappingBassFrequencies: true,

  /** At most two melody stems may share the same frequency range in the mix. */
  maxMelodySameFrequencyRange: 2,

  /**
   * FX active content should be padded with silence to align to the next
   * power-of-2 bar boundary.  Do NOT use true one-shots; use grid-aligned
   * loops so characters remain active between cycles.
   */
  fxPaddedToGrid: true,

  /** Transitions follow the same grid-loop rule as FX. */
  transitionsPaddedToGrid: true,

  /** Composite mixability score floor for approval. */
  minimumMixabilityScore: 75,

  /** Maximum acceptable fatigue risk score (0 = no fatigue, 1 = exhausting). */
  maximumFatigueRisk: 0.60,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// MIXABILITY SCORING WEIGHTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Weights used to compute the composite 0–100 mixability score during curation.
 * Must sum to 1.0.
 */
export const DELTA_TEMPLATE_MIXABILITY_WEIGHTS = {
  bpmMatch:        0.30,
  harmonicCompat:  0.25,
  loopCleanness:   0.20,
  transientDensity: 0.15,
  lowEndConflict:  0.10,
} as const

/** Minimum acceptable mixability score per category during pack approval. */
export const DELTA_TEMPLATE_MINIMUM_MIXABILITY: Record<DeltaTemplateCategory, number> = {
  beats:       85,
  bass:        80,
  melody:      75,
  vocals:      70,
  atmospheres: 65,
  fx:          60,
  transitions: 55,
}

// ─────────────────────────────────────────────────────────────────────────────
// PAD DESIGN PHILOSOPHY
// ─────────────────────────────────────────────────────────────────────────────

/** Human-readable design intent for each pad slot within its category. */
export const DELTA_TEMPLATE_PAD_PHILOSOPHY = {
  beats: [
    'beat-01: safe foundational groove — most stable, kick + snare + hat, minimal melodic content',
    'beat-02: secondary groove — lighter percussion (hi-hat only), complementary rhythm, low low-end',
    'beat-03: fuller groove — main groove anchor, longest loop (16 bars), highest mixability',
    'beat-04: top loop / no kick — layerable without low-end clash, accent texture',
    'beat-05: accent groove — hats or percussion accent only, least intrusive, densest transients',
  ],
  bass: [
    'bass-01: simplest bass movement, widest harmonic compatibility, same key as melody-01',
    'bass-02: secondary bass texture, different key center for harmonic contrast',
    'bass-03: variation — distinct from bass-01/02, no frequency overlap',
    'bass-04: most colorful / expressive bass line, highest mixability score',
  ],
  melody: [
    'melody-01: most universally mixable melody, safest starting layer',
    'melody-02: secondary texture — different key center, non-clashing frequency range',
    'melody-03: variation / accent — distinct spectral character from 01 & 02',
    'melody-04: most colorful / experimental melody, lowest fatigue risk',
  ],
  atmospheres: [
    'atmo-01: widest / softest texture, no dominant melody, low fatigue, longest loop (16 bars)',
    'atmo-02: complementary atmosphere, different spectral character from atmo-01',
  ],
  vocals: [
    'vocal-01: shortest / cleanest vocal chop (4 bars preferred), snappiest rhythmic entry',
    'vocal-02: secondary chop — different pitch center or phrase length',
    'vocal-03: variation — longer phrase (8 bars) or distinct rhythmic pattern',
  ],
  fx: [
    'fx-01: impact / hit — shortest cycle (4–8 bars), high energy, significant transient',
    'fx-02: sweep / uplift — medium cycle (8 bars), smooth spectral movement',
    'fx-03: riser / build — longest cycle (16 bars), sustained tension and release',
  ],
  transitions: [
    'trans-01: fill — shortest cycle (4 bars), rhythmic punctuation between sections',
    'trans-02: drop element — 4–8 bars, breakdown / buildup marker',
    'trans-03: sweep / drop — 8–16 bars, major section transition (intro → verse, verse → drop)',
  ],
} as const

// ─────────────────────────────────────────────────────────────────────────────
// GAME SLOT MAP  (ALL_PADS grid indices 0–23)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps each ALL_PADS grid slot (0–23) to its expected Delta-template category,
 * bar count, volume target, and playback rule.
 *
 * This table is consumed by `pack:build-delta-template` to auto-assign category
 * metadata and validate each pad in the generated pack config.
 *
 * Slot ordering follows the Delta Pack reference implementation exactly:
 *   Slots  0– 4  → beat-0..beat-4     (5 beats)
 *   Slots  5– 7  → melody-0..melody-2 (3 melodies, game "melody" slots)
 *   Slot   8     → effect-0           (fx-01)
 *   Slot   9     → effect-1           (fx-02)
 *   Slot  10     → effect-2           (fx-03)
 *   Slot  11     → effect-3           (trans-01, game "effect" slot)
 *   Slot  12     → melody-3           (melody-04)
 *   Slot  13     → melody-4           (atmo-01, game "melody" slot)
 *   Slots 14–17  → percussion-0..3    (bass-01..bass-04)
 *   Slot  18     → percussion-4       (trans-02, game "percussion" slot)
 *   Slots 19–21  → voice-0..voice-2   (vocal-01..vocal-03)
 *   Slot  22     → voice-3            (trans-03, game "voice" slot)
 *   Slot  23     → voice-4            (atmo-02, game "voice" slot)
 */
export type DeltaSlotSpec = {
  slotIndex:          number
  gameSlotId:         string
  templateRole:       string
  category:           'beat' | 'bass' | 'melody' | 'fx' | 'voice' | 'transition' | 'atmosphere'
  preferredBars:      DeltaBarLength
  volumeTarget:       { min: number; max: number; recommended: number }
  playbackMode:       'loop' | 'one-shot'
  playbackQuantization: QuantizeMode
  allowDriftCorrection: boolean
  philosophy:         string
}

export const DELTA_TEMPLATE_SLOT_MAP: DeltaSlotSpec[] = [
  // ── Beats (slots 0–4) ──────────────────────────────────────────────────────
  { slotIndex:  0, gameSlotId: 'beat-0',       templateRole: 'beat-01',   category: 'beat',        preferredBars: 8,  volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.beats,       playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.beats[0]  },
  { slotIndex:  1, gameSlotId: 'beat-1',       templateRole: 'beat-02',   category: 'beat',        preferredBars: 4,  volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.beats,       playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.beats[1]  },
  { slotIndex:  2, gameSlotId: 'beat-2',       templateRole: 'beat-03',   category: 'beat',        preferredBars: 16, volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.beats,       playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.beats[2]  },
  { slotIndex:  3, gameSlotId: 'beat-3',       templateRole: 'beat-04',   category: 'beat',        preferredBars: 8,  volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.beats,       playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.beats[3]  },
  { slotIndex:  4, gameSlotId: 'beat-4',       templateRole: 'beat-05',   category: 'beat',        preferredBars: 4,  volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.beats,       playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.beats[4]  },
  // ── Melody slots 0–2 (slots 5–7) ──────────────────────────────────────────
  { slotIndex:  5, gameSlotId: 'melody-0',     templateRole: 'melody-01', category: 'melody',      preferredBars: 16, volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.melody,      playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.melody[0]  },
  { slotIndex:  6, gameSlotId: 'melody-1',     templateRole: 'melody-02', category: 'melody',      preferredBars: 16, volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.melody,      playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.melody[1]  },
  { slotIndex:  7, gameSlotId: 'melody-2',     templateRole: 'melody-03', category: 'melody',      preferredBars: 16, volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.melody,      playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.melody[2]  },
  // ── FX slots 0–2 (slots 8–10) ────────────────────────────────────────────
  { slotIndex:  8, gameSlotId: 'effect-0',     templateRole: 'fx-01',     category: 'fx',          preferredBars: 8,  volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.fx,          playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.fx[0]      },
  { slotIndex:  9, gameSlotId: 'effect-1',     templateRole: 'fx-02',     category: 'fx',          preferredBars: 8,  volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.fx,          playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.fx[1]      },
  { slotIndex: 10, gameSlotId: 'effect-2',     templateRole: 'fx-03',     category: 'fx',          preferredBars: 16, volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.fx,          playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.fx[2]      },
  // ── Transition-01 (slot 11 — game "effect-3" slot) ───────────────────────
  { slotIndex: 11, gameSlotId: 'effect-3',     templateRole: 'trans-01',  category: 'transition',  preferredBars: 4,  volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.transitions, playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.transitions[0] },
  // ── Melody slots 3–4 (slots 12–13, also carries atmosphere) ──────────────
  { slotIndex: 12, gameSlotId: 'melody-3',     templateRole: 'melody-04', category: 'melody',      preferredBars: 16, volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.melody,      playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.melody[3]  },
  { slotIndex: 13, gameSlotId: 'melody-4',     templateRole: 'atmo-01',   category: 'atmosphere',  preferredBars: 16, volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.atmospheres, playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.atmospheres[0] },
  // ── Bass / Percussion slots 0–3 (slots 14–17) ────────────────────────────
  { slotIndex: 14, gameSlotId: 'percussion-0', templateRole: 'bass-01',   category: 'bass',        preferredBars: 16, volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.bass,        playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.bass[0]    },
  { slotIndex: 15, gameSlotId: 'percussion-1', templateRole: 'bass-02',   category: 'bass',        preferredBars: 16, volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.bass,        playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.bass[1]    },
  { slotIndex: 16, gameSlotId: 'percussion-2', templateRole: 'bass-03',   category: 'bass',        preferredBars: 16, volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.bass,        playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.bass[2]    },
  { slotIndex: 17, gameSlotId: 'percussion-3', templateRole: 'bass-04',   category: 'bass',        preferredBars: 16, volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.bass,        playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.bass[3]    },
  // ── Transition-02 (slot 18 — game "percussion-4" slot) ───────────────────
  { slotIndex: 18, gameSlotId: 'percussion-4', templateRole: 'trans-02',  category: 'transition',  preferredBars: 4,  volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.transitions, playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.transitions[1] },
  // ── Vocal / Voice slots 0–2 (slots 19–21) ────────────────────────────────
  { slotIndex: 19, gameSlotId: 'voice-0',      templateRole: 'vocal-01',  category: 'voice',       preferredBars: 4,  volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.vocals,      playbackMode: 'loop', playbackQuantization: 'beat', allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.vocals[0]  },
  { slotIndex: 20, gameSlotId: 'voice-1',      templateRole: 'vocal-02',  category: 'voice',       preferredBars: 4,  volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.vocals,      playbackMode: 'loop', playbackQuantization: 'beat', allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.vocals[1]  },
  { slotIndex: 21, gameSlotId: 'voice-2',      templateRole: 'vocal-03',  category: 'voice',       preferredBars: 8,  volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.vocals,      playbackMode: 'loop', playbackQuantization: 'beat', allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.vocals[2]  },
  // ── Transition-03 & Atmosphere-02 (slots 22–23 — game "voice" slots) ─────
  { slotIndex: 22, gameSlotId: 'voice-3',      templateRole: 'trans-03',  category: 'transition',  preferredBars: 8,  volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.transitions, playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.transitions[2] },
  { slotIndex: 23, gameSlotId: 'voice-4',      templateRole: 'atmo-02',   category: 'atmosphere',  preferredBars: 16, volumeTarget: DELTA_TEMPLATE_VOLUME_TARGETS.atmospheres, playbackMode: 'loop', playbackQuantization: 'bar',  allowDriftCorrection: false, philosophy: DELTA_TEMPLATE_PAD_PHILOSOPHY.atmospheres[1] },
]

// ─────────────────────────────────────────────────────────────────────────────
// FUTURE BUILD WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canonical CLI workflow for building a new pack using this template.
 * Each step is a string suitable for display in CLI help output or documentation.
 */
export const DELTA_TEMPLATE_BUILD_WORKFLOW = [
  '1. Place source stems in:  ~/Documents/<new-source-folder>/',
  '2. Scan:    npm run pack:scan    -- --source=<folder> --template=delta',
  '3. Review:  reports/<pack>-scan.md  —  verify BPM, bars, categories',
  '4. Preview: npm run pack:preview -- --template=delta',
  '5. Listen:  <folder>/recommended-audio-preview/demo-preview-mix.wav',
  '6. Build:   npm run pack:build-delta-template -- --name=<PackName>',
  '7. Validate: reports/<pack>-final-build.md  —  confirm 24 pads, no drift',
  '8. Register: src/generated/audioPacks/<packName>.ts  (auto-generated)',
  '9. Auto-patch: App.tsx + packRegistry.ts  (add to ActivePackId + PACK_MENU)',
] as const

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the DeltaSlotSpec for a given ALL_PADS grid index (0–23). */
export function getDeltaSlotSpec(slotIndex: number): DeltaSlotSpec | undefined {
  return DELTA_TEMPLATE_SLOT_MAP.find((s) => s.slotIndex === slotIndex)
}

/** Returns the loop duration in milliseconds for a given bar count at DELTA_TEMPLATE_BPM. */
export function deltaLoopDurationMs(bars: DeltaBarLength): number {
  return DELTA_TEMPLATE_LOOP_DURATION_MS[bars]
}

/** Returns the expected loop duration in seconds for metadata validation. */
export function deltaExpectedDurationSec(bars: DeltaBarLength): number {
  return deltaLoopDurationMs(bars) / 1000
}

/**
 * Validates that a measured audio duration is within tolerance of the expected
 * duration for the given bar count.
 *
 * Returns `{ ok: true }` when within ±50 ms, otherwise `{ ok: false, driftMs }`.
 */
export function validateDeltaLoopDuration(
  measuredSec: number,
  bars: DeltaBarLength,
  toleranceMs = 50,
): { ok: boolean; expectedSec: number; driftMs: number } {
  const expectedSec = deltaExpectedDurationSec(bars)
  const driftMs = Math.abs(measuredSec - expectedSec) * 1000
  return { ok: driftMs <= toleranceMs, expectedSec, driftMs }
}
