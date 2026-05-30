import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { CSSProperties } from 'react'
import {
  DndContext,
  type DragEndEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { motion } from 'framer-motion'
import * as Tone from 'tone'
import { beatsBoxCuratedPack1 } from './generated/audioPacks/beatsBoxCuratedPack1'
import { beatsBoxPack1 } from './generated/audioPacks/beatsBoxPack1'
import { cyberpunkPack1 } from './generated/audioPacks/cyberpunkPack1'
import { coreMixPackAlpha, CORE_MIX_CATEGORY_COLORS } from './generated/audioPacks/coreMixPackAlpha'
import { newPackAlpha } from './generated/audioPacks/newPackAlpha'
import { bravoPack } from './generated/audioPacks/bravoPack'
import { deltaPack } from './generated/audioPacks/deltaPack'
import { alphaPack } from './generated/audioPacks/alphaPack'
import { tranceCuratedPack1 } from './generated/audioPacks/tranceCuratedPack1'
import { trancePack1 } from './generated/audioPacks/trancePack1'
import {
  applyRecordedMixToUrl,
  buildRecordedShareUrl,
  clearShareMixFromUrl,
  hasShareMixInUrl,
  readAnyMixFromLocation,
  type MixEvent,
  type MixSnapshot,
  type RecordedMix,
  type SavedMix,
} from './mixShare'
import { IntroScreen } from './IntroScreen'
import {
  type MusicalClock,
  type QuantizeMode,
  clockWithBpm,
  cancelGainRamp,
  currentBarInLoop,
  currentBeatInBar,
  isRampActive,
  makeClock,
  scheduleGainRamp,
  validateLoopTiming,
} from './musicClock'
import { DevDiagnosticsDrawer, PackCompatibilityPanel } from './packBuilder'
import './App.css'

// =============================================================================
// TYPES & DATA — 24 pads in 5 colour categories (original, not Incredibox assets)
// =============================================================================

type SoundCategory = 'beat' | 'effect' | 'melody' | 'percussion' | 'voice'

/** Icon shape drawn as bold white SVG on each pad tile */
type PadIconType =
  | 'hat'
  | 'kick'
  | 'clock'
  | 'speaker'
  | 'vinyl'
  | 'phones'
  | 'bolt'
  | 'star'
  | 'wave'
  | 'ring'
  | 'bell'
  | 'keys'
  | 'note'
  | 'chord'
  | 'harp'
  | 'horn'
  | 'conga'
  | 'shaker'
  | 'cymbal'
  | 'spark'
  | 'mic'
  | 'mouth'
  | 'choir'
  | 'radio'

type PadDefinition = {
  id: string
  category: SoundCategory
  label: string
  icon: PadIconType
  color: string
  accent: string
  variant: number
}

type SlotAssignment = PadDefinition | null

type TransportStatus = 'Playing' | 'Paused' | 'Stopped'

/** Four-phase recording state for the Save Mix workflow. */
type MixRecordingState = 'idle' | 'recording' | 'finalizing' | 'saved'

function formatRecordingTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

type PreviewPlayers = {
  players: Partial<Record<string, Tone.Player>>
  dispose: () => void
}

const SLOT_COUNT = 7

/** Slots 0–4 = cat characters; slots 5–6 = human beatbox style */
const SLOT_IS_CAT = [true, true, true, true, true, false, false] as const
const DEFAULT_BPM = 100
const MASTER_LOOP_MS = 9600
/** One quarter-note visual period at 100 BPM within the 9.6s master loop. */
const MASTER_BEAT_MS = MASTER_LOOP_MS / 16
/** One bar (4 beats) visual period. */
const MASTER_BAR_MS = MASTER_LOOP_MS / 4
// Phase correction constants removed — phase correction is disabled in the recovery
// build (see runPhaseCorrectionPass stub below).  playbackRate nudges and
// currentTime hard-snaps mid-playback were the primary source of CPU heat and
// audio clicks under 7-pad load.  Pre-aligned PCM WAV loops stay in sync via
// native browser looping without any runtime correction.

type PerformanceCategory = 'beat' | 'bass' | 'melody' | 'fx' | 'voice'

const CATEGORY_META: Record<
  SoundCategory,
  { label: string; color: string; accent: string }
> = {
  beat: { label: 'Beat', color: '#9b4dca', accent: '#7e3eb3' },
  melody: { label: 'Melody', color: '#3b8fe0', accent: '#2b7ccc' },
  effect: { label: 'Effect', color: '#3cb878', accent: '#2da866' },
  percussion: { label: 'Perc', color: '#e88c2a', accent: '#d47a1a' },
  voice: { label: 'Voice', color: '#e04545', accent: '#c93a3a' },
}

/** Build one pad definition */
function makePad(
  category: SoundCategory,
  variant: number,
  icon: PadIconType,
): PadDefinition {
  const meta = CATEGORY_META[category]
  return {
    id: `${category}-${variant}`,
    category,
    label: `${meta.label} ${variant + 1}`,
    icon,
    color: meta.color,
    accent: meta.accent,
    variant,
  }
}

/**
 * 24 pads in reference order (instruction image):
 * Row 1: 5 purple beats | 3 blue melody | 4 green effects
 * Row 2: 2 blue melody | 5 orange percussion | 5 red voice
 */
function buildPads(): PadDefinition[] {
  const beats = [
    makePad('beat', 0, 'phones'),
    makePad('beat', 1, 'clock'),
    makePad('beat', 2, 'speaker'),
    makePad('beat', 3, 'vinyl'),
    makePad('beat', 4, 'kick'),
  ]
  const melodies = [
    makePad('melody', 0, 'note'),
    makePad('melody', 1, 'chord'),
    makePad('melody', 2, 'keys'),
    makePad('melody', 3, 'harp'),
    makePad('melody', 4, 'horn'),
  ]
  const effects = [
    makePad('effect', 0, 'bolt'),
    makePad('effect', 1, 'star'),
    makePad('effect', 2, 'wave'),
    makePad('effect', 3, 'ring'),
  ]
  const percussion = [
    makePad('percussion', 0, 'bell'),
    makePad('percussion', 1, 'shaker'),
    makePad('percussion', 2, 'cymbal'),
    makePad('percussion', 3, 'spark'),
    makePad('percussion', 4, 'conga'),
  ]
  const voices = [
    makePad('voice', 0, 'mic'),
    makePad('voice', 1, 'mouth'),
    makePad('voice', 2, 'choir'),
    makePad('voice', 3, 'radio'),
    makePad('voice', 4, 'hat'),
  ]

  return [
    ...beats,
    ...melodies.slice(0, 3),
    ...effects,
    ...melodies.slice(3, 5),
    ...percussion,
    ...voices,
  ]
}

const ALL_PADS = buildPads()
const PAD_BY_ID = Object.fromEntries(ALL_PADS.map((p) => [p.id, p])) as Record<
  string,
  PadDefinition
>
const ROW_A = ALL_PADS.slice(0, 12)
const ROW_B = ALL_PADS.slice(12, 24)


// =============================================================================
// ASSET PATHS — artwork lives in src/assets/* (bundled) or public/* (runtime)
// =============================================================================

const bundledPadUrls = import.meta.glob<string>(
  './assets/pads/*.{png,jpg,jpeg,webp,svg}',
  { query: '?url', import: 'default', eager: true },
)

const bundledAudioUrls = import.meta.glob<string>(
  './assets/audio/*.wav',
  { query: '?url', import: 'default', eager: true },
)

const bundledTrancePackAudioUrls = import.meta.glob<string>(
  './assets/audio/generated/trance-pack-1/*.wav',
  { query: '?url', import: 'default', eager: true },
)

const bundledBeatsBoxPackAudioUrls = import.meta.glob<string>(
  './assets/audio/generated/beats-box-pack-1/*.wav',
  { query: '?url', import: 'default', eager: true },
)

/** File name for a pad tile icon (matches character naming) */
function padAssetFile(pad: PadDefinition): string {
  return `${pad.category}-${pad.variant + 1}.png`
}

function lookupBundledAsset(
  map: Record<string, string>,
  folder: 'characters' | 'pads' | 'audio',
  filename: string,
): string | undefined {
  const exact = `./assets/${folder}/${filename}`
  if (map[exact]) return map[exact]
  const lower = filename.toLowerCase()
  return Object.entries(map).find(([key]) =>
    key.toLowerCase().endsWith(`/${lower}`),
  )?.[1]
}

/**
 * One cat_music PNG per pad, ordered by ALL_PADS index (01 = pad 0 … 24 = pad 23).
 * Files live in public/characters/ and are served as static assets.
 */
const PAD_CHARACTER_URLS: readonly string[] = Array.from(
  { length: 24 },
  (_, i) => `/characters/cat_music_${String(i + 1).padStart(2, '0')}.png`,
)

/** Resolved character image URL for a slot.
 *  - Empty slot  → placeholder-cyber.png
 *  - Assigned    → cat_music_XX.png matching the pad's index in ALL_PADS
 */
function resolveCharacterSrc(pad: PadDefinition | null, _slotIndex: number): string {
  if (!pad) return '/characters/placeholder-cyber.png'
  const padIndex = ALL_PADS.findIndex((p) => p.id === pad.id)
  return padIndex >= 0 ? PAD_CHARACTER_URLS[padIndex] : '/characters/placeholder-cyber.png'
}

function resolvePadSrc(pad: PadDefinition): string {
  const file = padAssetFile(pad)
  return (
    lookupBundledAsset(bundledPadUrls, 'pads', file) ?? `/pads/${file}`
  )
}

function audioAssetFile(pad: PadDefinition): string {
  return `${pad.category}-${pad.variant + 1}.wav`
}

type ActivePackId =
  | 'trance-pack-1'
  | 'trance-curated-pack-1'
  | 'beats-box-pack-1'
  | 'beats-box-curated-pack-1'
  | 'cyberpunk-pack-1'
  | 'core-mix-pack-alpha'
  | 'new-pack-alpha'
  | 'bravo-pack'
  | 'delta-pack'
  | 'alpha-pack'
type PackAudioCategory =
  | 'beat'
  | 'bass'
  | 'melody'
  | 'fx'
  | 'voice'
  | 'percussion'
  | 'transition'
  | 'atmosphere'
type PackPadAudio = {
  id: string
  category: PackAudioCategory
  audioFile: string
  sourceFile: string
  /** Per-pad volume multiplier (0–1). Multiplied with master volume when
   *  setting audio element volume. Defaults to 1.0 if omitted. */
  volume?: number
  /** 'one-shot' pads play once and stop; 'loop' pads repeat continuously.
   *  FX, buildups, risers, hits and transitions should be 'one-shot'.
   *  Beats, bass, melody, vocals and atmospheres should be 'loop'.
   *  Defaults to 'loop' if omitted. */
  playbackMode?: 'loop' | 'one-shot'
  /** Quantization grid for when this pad starts playing during an active session.
   *  'immediate' = no delay, 'beat' = next quarter-note, 'bar' = next measure.
   *  Defaults: loops → 'bar', vocals → 'beat', one-shots → 'immediate'. */
  playbackQuantization?: QuantizeMode
  /** When true, applies a gentle playbackRate correction (±2 %) to align
   *  a drifting loop to the 105 BPM/4-bar grid. Currently disabled globally —
   *  set per-pad in the pack config when drift correction is desired. */
  allowDriftCorrection?: boolean
  /** BPM of this audio file — used for loop validation and drift correction. */
  bpm?: number | null
  /** Number of bars in this audio file — used for loop validation. */
  bars?: number | null
}
type RuntimeAudioPack = {
  id: ActivePackId
  name: string
  pads: PackPadAudio[]
  audioUrls: Record<string, string>
}

const AUDIO_PACKS: Record<ActivePackId, RuntimeAudioPack> = {
  'trance-pack-1': {
    id: trancePack1.id,
    name: trancePack1.name,
    pads: trancePack1.pads.map((pad) => ({
      id: pad.id,
      category: pad.category,
      audioFile: pad.audioFile,
      sourceFile: pad.sourceFile,
    })),
    audioUrls: bundledTrancePackAudioUrls,
  },
  'trance-curated-pack-1': {
    id: tranceCuratedPack1.id,
    name: tranceCuratedPack1.name,
    pads: tranceCuratedPack1.pads.map((pad) => ({
      id: pad.id,
      category: pad.category,
      audioFile: pad.audioFile,
      sourceFile: pad.sourceFile,
    })),
    audioUrls: bundledTrancePackAudioUrls,
  },
  'beats-box-pack-1': {
    id: beatsBoxPack1.id,
    name: beatsBoxPack1.name,
    pads: beatsBoxPack1.pads.map((pad) => ({
      id: pad.id,
      category: pad.category,
      audioFile: pad.filename,
      sourceFile: pad.originalFilename,
    })),
    audioUrls: bundledBeatsBoxPackAudioUrls,
  },
  'beats-box-curated-pack-1': {
    id: beatsBoxCuratedPack1.id,
    name: beatsBoxCuratedPack1.name,
    pads: beatsBoxCuratedPack1.pads.map((pad) => ({
      id: pad.id,
      category: pad.category,
      audioFile: pad.filename,
      sourceFile: pad.originalFilename,
    })),
    audioUrls: bundledBeatsBoxPackAudioUrls,
  },
  'cyberpunk-pack-1': {
    id: cyberpunkPack1.id as ActivePackId,
    name: cyberpunkPack1.name,
    pads: cyberpunkPack1.pads.map((pad) => {
      type CP = {
        volume?: number
        playbackMode?: string
        playbackQuantization?: string
        allowDriftCorrection?: boolean
        bpm?: number | null
        bars?: number | null
      }
      const cp = pad as CP
      return {
        id: pad.id,
        category: pad.category as PackAudioCategory,
        audioFile: pad.audioFile,
        sourceFile: pad.sourceFile,
        volume: cp.volume,
        playbackMode: cp.playbackMode as 'loop' | 'one-shot' | undefined,
        playbackQuantization: cp.playbackQuantization as QuantizeMode | undefined,
        allowDriftCorrection: cp.allowDriftCorrection,
        bpm: cp.bpm,
        bars: cp.bars,
      }
    }),
    audioUrls: cyberpunkPack1.audioUrls,
  },
  'core-mix-pack-alpha': {
    id: coreMixPackAlpha.id as ActivePackId,
    name: coreMixPackAlpha.name,
    pads: coreMixPackAlpha.pads.map((pad) => ({
      id: pad.id,
      category: pad.category as PackAudioCategory,
      audioFile: pad.audioFile,
      sourceFile: pad.sourceFile,
      volume: pad.volume,
      playbackMode: pad.playbackMode,
      playbackQuantization: pad.playbackQuantization,
      allowDriftCorrection: pad.allowDriftCorrection,
      bpm: pad.bpm,
      bars: pad.bars,
    })),
    audioUrls: coreMixPackAlpha.audioUrls,
  },
  'new-pack-alpha': {
    id: newPackAlpha.id as ActivePackId,
    name: newPackAlpha.name,
    pads: newPackAlpha.pads.map((pad) => ({
      id: pad.id,
      category: pad.category as PackAudioCategory,
      audioFile: pad.audioFile,
      sourceFile: pad.sourceFile,
      volume: pad.volume,
      playbackMode: pad.playbackMode,
      playbackQuantization: pad.playbackQuantization,
      allowDriftCorrection: pad.allowDriftCorrection,
      bpm: pad.bpm,
      bars: pad.bars,
    })),
    audioUrls: newPackAlpha.audioUrls,
  },
  'bravo-pack': {
    id: bravoPack.id as ActivePackId,
    name: bravoPack.name,
    pads: bravoPack.pads.map((pad) => ({
      id: pad.id,
      category: pad.category as PackAudioCategory,
      audioFile: pad.audioFile,
      sourceFile: pad.sourceFile,
      volume: pad.volume,
      playbackMode: pad.playbackMode,
      playbackQuantization: pad.playbackQuantization,
      allowDriftCorrection: pad.allowDriftCorrection,
      bpm: pad.bpm,
      bars: pad.bars,
    })),
    audioUrls: bravoPack.audioUrls,
  },
  'delta-pack': {
    id: deltaPack.id as ActivePackId,
    name: deltaPack.name,
    pads: deltaPack.pads.map((pad) => ({
      id: pad.id,
      category: pad.category as PackAudioCategory,
      audioFile: pad.audioFile,
      sourceFile: pad.sourceFile,
      volume: pad.volume,
      playbackMode: pad.playbackMode,
      playbackQuantization: pad.playbackQuantization,
      allowDriftCorrection: pad.allowDriftCorrection,
      bpm: pad.bpm,
      bars: pad.bars,
    })),
    audioUrls: deltaPack.audioUrls,
  },
  'alpha-pack': {
    id: alphaPack.id as ActivePackId,
    name: alphaPack.name,
    pads: alphaPack.pads.map((pad) => ({
      id: pad.id,
      category: pad.category as PackAudioCategory,
      audioFile: pad.audioFile,
      sourceFile: pad.sourceFile,
      volume: pad.volume,
      playbackMode: pad.playbackMode,
      playbackQuantization: pad.playbackQuantization,
      allowDriftCorrection: pad.allowDriftCorrection,
      bpm: pad.bpm,
      bars: pad.bars,
    })),
    audioUrls: alphaPack.audioUrls,
  },
}

const PACK_CATEGORY_FALLBACKS: Record<SoundCategory, PackAudioCategory[]> = {
  beat: ['beat', 'bass', 'melody', 'fx'],
  melody: ['melody', 'bass', 'fx', 'beat'],
  effect: ['fx', 'melody', 'bass', 'beat'],
  percussion: ['percussion', 'beat', 'bass', 'fx', 'melody'],
  voice: ['voice', 'melody', 'fx', 'beat'],
}

const TRANCE_REPLACEMENT_PAD_IDS = new Set(ROW_A.slice(0, 5).map((pad) => pad.id))
const CURATED_SLOT_PAD_IDS = new Set(ROW_A.slice(0, 7).map((pad) => pad.id))
const CURATED_PACK_IDS = new Set<ActivePackId>([
  'delta-pack',
  'alpha-pack',
  'bravo-pack',
  'new-pack-alpha',
  'core-mix-pack-alpha',
  'trance-curated-pack-1',
  'beats-box-curated-pack-1',
  'cyberpunk-pack-1',
])

/**
 * The single active pack available to normal gameplay.
 * Delta Pack is the canonical reference implementation.
 */
const PLAYABLE_PACK_IDS = new Set<ActivePackId>(['bravo-pack', 'alpha-pack', 'delta-pack'])

/**
 * Packs that are archived — fully preserved in AUDIO_PACKS for replay
 * backwards-compatibility but hidden from the player-facing UI.
 */
const ARCHIVED_PACK_IDS = new Set<ActivePackId>([
  'cyberpunk-pack-1',
  'core-mix-pack-alpha',
  'new-pack-alpha',
])

/**
 * If a shared URL or old recording references an archived or unknown pack,
 * silently fall back to Delta Pack so the app never crashes.
 *
 * PLAYABLE_PACK_IDS  — the exact set of packs shown in the player dropdown.
 * ARCHIVED_PACK_IDS  — packs that still have data in AUDIO_PACKS (safe for
 *                      replay audio) but are redirected to Delta Pack for UI.
 */
function toPlayablePackId(id: string): ActivePackId {
  if (PLAYABLE_PACK_IDS.has(id as ActivePackId)) return id as ActivePackId
  if (ARCHIVED_PACK_IDS.has(id as ActivePackId)) return 'bravo-pack'
  if (id in AUDIO_PACKS) return id as ActivePackId
  return 'bravo-pack'
}

/**
 * Pack entries shown in the player-facing PACK dropdown.
 * Only Delta Pack appears here.  All other packs are accessible exclusively
 * through the DEV diagnostics drawer (which reads AUDIO_PACKS directly).
 */
const PACK_MENU: { group: string; packs: ActivePackId[] }[] = [
  {
    group: 'Curated Packs',
    packs: ['bravo-pack', 'alpha-pack', 'delta-pack'],
  },
]

/**
 * Cyberpunk Pack 1 — two-row grouped pad panel layout.
 * Mirrors the default pack's 2 × 12 grid structure so pad sizes match exactly.
 *
 * Row 1 (12 pads): BEATS(4) | BASS(4) | MELODY(4)
 * Row 2 (12 pads): FX(4)    | VOCALS(3) | TRANSITIONS(3) | ATMOSPHERES(2)
 *
 * Each group's padIds maps to game pad IDs set by the 24-pad curated index:
 *   beat-0..3       → BEATS
 *   percussion-0..3 → BASS
 *   melody-0..2, melody-4 → MELODY
 *   effect-0..3     → FX
 *   voice-0..2      → VOCALS
 *   beat-4, percussion-4, voice-3 → TRANSITIONS
 *   melody-3, voice-4 → ATMOSPHERES
 */
type CyberpunkPadGroup = { label: string; color: string; padIds: string[] }
const CYBERPUNK_PAD_ROWS: { groups: CyberpunkPadGroup[] }[] = [
  {
    groups: [
      { label: 'BEATS',  color: '#9b4dca', padIds: ['beat-0', 'beat-1', 'beat-2', 'beat-3'] },
      { label: 'BASS',   color: '#e88c2a', padIds: ['percussion-0', 'percussion-1', 'percussion-2', 'percussion-3'] },
      { label: 'MELODY', color: '#3b8fe0', padIds: ['melody-0', 'melody-1', 'melody-2', 'melody-4'] },
    ],
  },
  {
    groups: [
      { label: 'FX',          color: '#3cb878', padIds: ['effect-0', 'effect-1', 'effect-2', 'effect-3'] },
      { label: 'VOCALS',      color: '#e04545', padIds: ['voice-0', 'voice-1', 'voice-2'] },
      { label: 'TRANSITIONS', color: '#3cb878', padIds: ['beat-4', 'percussion-4', 'voice-3'] },
      { label: 'ATMOSPHERES', color: '#5c8ee0', padIds: ['melody-3', 'voice-4'] },
    ],
  },
]

/** Core Mix Pack Alpha — same 24-slot grid as Cyberpunk; category accent colors from pack config. */
const CORE_MIX_PAD_ROWS: { groups: CyberpunkPadGroup[] }[] = [
  {
    groups: [
      {
        label: 'BEATS',
        color: CORE_MIX_CATEGORY_COLORS.beat,
        padIds: ['beat-0', 'beat-1', 'beat-2', 'beat-3'],
      },
      {
        label: 'BASS',
        color: CORE_MIX_CATEGORY_COLORS.bass,
        padIds: ['percussion-0', 'percussion-1', 'percussion-2', 'percussion-3'],
      },
      {
        label: 'MELODY',
        color: CORE_MIX_CATEGORY_COLORS.melody,
        padIds: ['melody-0', 'melody-1', 'melody-2', 'melody-4'],
      },
    ],
  },
  {
    groups: [
      {
        label: 'FX',
        color: CORE_MIX_CATEGORY_COLORS.fx,
        padIds: ['effect-0', 'effect-1', 'effect-2', 'effect-3'],
      },
      {
        label: 'ATMOSPHERES',
        color: CORE_MIX_CATEGORY_COLORS.atmosphere,
        padIds: ['melody-3', 'voice-4'],
      },
      {
        label: 'VOCALS',
        color: CORE_MIX_CATEGORY_COLORS.voice,
        padIds: ['voice-0', 'voice-1', 'voice-2'],
      },
      {
        label: 'TRANSITIONS',
        color: CORE_MIX_CATEGORY_COLORS.transition,
        padIds: ['beat-4', 'percussion-4', 'voice-3'],
      },
    ],
  },
]

/**
 * Bravo Pack — 120 BPM curated pack, same 24-slot grid layout.
 * Row 1: BEATS(4) | BASS(4) | MELODY(4)
 * Row 2: FX(4) | VOCALS(3) | TRANSITIONS(3) | ATMOSPHERES(2)
 */
const BRAVO_PACK_PAD_ROWS: { groups: CyberpunkPadGroup[] }[] = [
  {
    groups: [
      { label: 'BEATS',  color: '#e84b3a', padIds: ['beat-0', 'beat-1', 'beat-2', 'beat-3', 'beat-4'] },
      { label: 'BASS',   color: '#c97d2a', padIds: ['percussion-0', 'percussion-1', 'percussion-2', 'percussion-3'] },
      { label: 'MELODY', color: '#3a8ee8', padIds: ['melody-0', 'melody-1', 'melody-2'] },
    ],
  },
  {
    groups: [
      { label: 'LAYERS',      color: '#3a6eb8', padIds: ['melody-3', 'melody-4', 'percussion-4'] },
      { label: 'VOCALS',      color: '#b83a7c', padIds: ['voice-0', 'voice-1', 'voice-2', 'voice-3', 'voice-4'] },
      { label: 'FX',          color: '#2ab88a', padIds: ['effect-0', 'effect-1'] },
      { label: 'TRANSITIONS', color: '#7ab83a', padIds: ['effect-2', 'effect-3'] },
    ],
  },
]

/**
 * New Pack Alpha — same 24-slot grid layout as Cyberpunk / Core Mix.
 * Row 1: BEATS(4) | BASS(4) | MELODY(4)
 * Row 2: FX(4) | VOCALS(3) | TRANSITIONS(3) | ATMOSPHERES(2)
 */
const NEW_PACK_ALPHA_PAD_ROWS: { groups: CyberpunkPadGroup[] }[] = [
  {
    groups: [
      { label: 'BEATS',  color: '#7b5cf0', padIds: ['beat-0', 'beat-1', 'beat-2', 'beat-3'] },
      { label: 'BASS',   color: '#d4831a', padIds: ['percussion-0', 'percussion-1', 'percussion-2', 'percussion-3'] },
      { label: 'MELODY', color: '#2da87a', padIds: ['melody-0', 'melody-1', 'melody-2', 'melody-4'] },
    ],
  },
  {
    groups: [
      { label: 'FX',          color: '#d45c3f', padIds: ['effect-0', 'effect-1', 'effect-2', 'effect-3'] },
      { label: 'VOCALS',      color: '#d44e7d', padIds: ['voice-0', 'voice-1', 'voice-2'] },
      { label: 'TRANSITIONS', color: '#6bae78', padIds: ['beat-4', 'percussion-4', 'voice-3'] },
      { label: 'ATMOSPHERES', color: '#4a8fcf', padIds: ['melody-3', 'voice-4'] },
    ],
  },
]

/**
 * Delta Pack — 128 BPM / Multi-key
 * Row 1: BEATS(5) | BASS(4) | MELODY(3)
 * Row 2: LAYERS(2: melody-04+atmo-01) | VOCALS(5: voice-0..4) | FX(3) | TRANSITIONS(2)
 *
 * voice-3 and voice-4 are both vocal game pads and must appear together in VOCALS.
 * voice-3 was previously misplaced in TRANSITIONS (far-right).
 * voice-4 was previously misplaced in LAYERS.
 */
const DELTA_PACK_PAD_ROWS: { groups: CyberpunkPadGroup[] }[] = [
  {
    groups: [
      { label: 'BEATS',  color: '#e84033', padIds: ['beat-0', 'beat-1', 'beat-2', 'beat-3', 'beat-4'] },
      { label: 'BASS',   color: '#e89033', padIds: ['percussion-0', 'percussion-1', 'percussion-2', 'percussion-3'] },
      { label: 'MELODY', color: '#338be8', padIds: ['melody-0', 'melody-1', 'melody-2'] },
    ],
  },
  {
    groups: [
      { label: 'LAYERS',      color: '#5c66d4', padIds: ['melody-3', 'melody-4'] },
      { label: 'VOCALS',      color: '#c03a7a', padIds: ['voice-0', 'voice-1', 'voice-2', 'voice-3', 'voice-4'] },
      { label: 'FX',          color: '#2aae85', padIds: ['effect-0', 'effect-1', 'effect-2'] },
      { label: 'TRANSITIONS', color: '#7ab83a', padIds: ['effect-3', 'percussion-4'] },
    ],
  },
]

const ALPHA_PACK_PAD_ROWS: { groups: CyberpunkPadGroup[] }[] = [
  {
    groups: [
      { label: 'BEATS',  color: '#e84033', padIds: ['beat-0', 'beat-1', 'beat-2', 'beat-3', 'beat-4'] },
      { label: 'BASS',   color: '#e89033', padIds: ['percussion-0', 'percussion-1', 'percussion-2', 'percussion-3'] },
      { label: 'MELODY', color: '#338be8', padIds: ['melody-0', 'melody-1', 'melody-2'] },
    ],
  },
  {
    groups: [
      { label: 'LAYERS',      color: '#5c66d4', padIds: ['melody-3', 'melody-4', 'percussion-4'] },
      { label: 'VOCALS',      color: '#c03a7a', padIds: ['voice-0', 'voice-1', 'voice-2', 'voice-3', 'voice-4'] },
      { label: 'FX',          color: '#2aae85', padIds: ['effect-0', 'effect-1'] },
      { label: 'TRANSITIONS', color: '#7ab83a', padIds: ['effect-2', 'effect-3'] },
    ],
  },
]

const GROUPED_CURATED_PACK_IDS = new Set<ActivePackId>([
  'delta-pack',
  'alpha-pack',
  'bravo-pack',
  'new-pack-alpha',
  'cyberpunk-pack-1',
  'core-mix-pack-alpha',
])

function groupedPadRowsForPack(packId: ActivePackId): { groups: CyberpunkPadGroup[] }[] | null {
  if (packId === 'cyberpunk-pack-1') return CYBERPUNK_PAD_ROWS
  if (packId === 'core-mix-pack-alpha') return CORE_MIX_PAD_ROWS
  if (packId === 'new-pack-alpha') return NEW_PACK_ALPHA_PAD_ROWS
  if (packId === 'bravo-pack') return BRAVO_PACK_PAD_ROWS
  if (packId === 'delta-pack') return DELTA_PACK_PAD_ROWS
  if (packId === 'alpha-pack') return ALPHA_PACK_PAD_ROWS
  return null
}

function groupPackPads(pack: RuntimeAudioPack): Record<PackAudioCategory, PackPadAudio[]> {
  return pack.pads.reduce(
    (groups, pad) => {
      groups[pad.category].push(pad)
      return groups
    },
    {
      beat: [],
      bass: [],
      melody: [],
      fx: [],
      voice: [],
      percussion: [],
      transition: [],
      atmosphere: [],
    } as Record<PackAudioCategory, PackPadAudio[]>,
  )
}

function lookupPackAudio(pack: RuntimeAudioPack, filename: string): string | undefined {
  const lower = filename.toLowerCase()
  return Object.entries(pack.audioUrls).find(([key]) =>
    key.toLowerCase().endsWith(`/${lower}`),
  )?.[1]
}

function packPadForGamePad(pad: PadDefinition, pack: RuntimeAudioPack): PackPadAudio | undefined {
  // Full 24-pad curated packs: map each game pad directly by ALL_PADS index
  if (CURATED_PACK_IDS.has(pack.id) && pack.pads.length >= 24) {
    const padIndex = ALL_PADS.findIndex((p) => p.id === pad.id)
    return padIndex >= 0 ? (pack.pads[padIndex] as PackPadAudio | undefined) : undefined
  }

  // Standard 7-pad curated packs: only populate the first 7 ROW_A slots
  if (CURATED_PACK_IDS.has(pack.id) && CURATED_SLOT_PAD_IDS.has(pad.id)) {
    const visiblePadIndex = ROW_A.findIndex((visiblePad) => visiblePad.id === pad.id)
    const curatedPad = pack.pads[visiblePadIndex]
    if (curatedPad) return curatedPad
    return undefined
  }

  if (CURATED_PACK_IDS.has(pack.id)) {
    return undefined
  }

  if (pack.id === 'trance-pack-1' && TRANCE_REPLACEMENT_PAD_IDS.has(pad.id)) {
    const visiblePadIndex = ROW_A.findIndex((visiblePad) => visiblePad.id === pad.id)
    const replacementPad = pack.pads[visiblePadIndex]
    if (replacementPad) return replacementPad
  }

  const padsByCategory = groupPackPads(pack)
  for (const category of PACK_CATEGORY_FALLBACKS[pad.category]) {
    const candidates = padsByCategory[category]
    if (candidates.length > 0) return candidates[pad.variant % candidates.length]
  }
  return pack.pads[pad.variant % pack.pads.length]
}

function resolvePackAudioSrc(pad: PadDefinition, packId: ActivePackId): string | undefined {
  const pack = AUDIO_PACKS[packId]
  const packPad = packPadForGamePad(pad, pack)
  const audioUrl = packPad ? lookupPackAudio(pack, packPad.audioFile) : undefined

  if (packId === 'trance-pack-1' && packPad && TRANCE_REPLACEMENT_PAD_IDS.has(pad.id)) {
    console.log('[trance replacement] pad id', pad.id)
    console.log('[trance replacement] category', packPad.category)
    console.log('[trance replacement] audio url', audioUrl)
    console.log('[trance replacement] source file', packPad.sourceFile)
  }

  return audioUrl
}

function packPadCount(packId: ActivePackId): number {
  return ALL_PADS.filter((pad) => resolvePackAudioSrc(pad, packId)).length
}

/**
 * Maps a pad's sound category to a character animation archetype.
 * Used to give each character type a distinct movement style while performing.
 *   beat       → DJ groove (smooth side-to-side head-nod)
 *   percussion → Drummer (sharp beat-hit bounce)
 *   melody     → Guitarist (energetic side sway)
 *   voice      → Rapper/Singer (confident bounce)
 *   effect     → Default (safe pulse fallback)
 */
type AnimType = 'dj' | 'drummer' | 'guitarist' | 'rapper' | 'default'

function resolveAnimType(pad: PadDefinition): AnimType {
  switch (pad.category) {
    case 'beat':       return 'dj'
    case 'percussion': return 'drummer'
    case 'melody':     return 'guitarist'
    case 'voice':      return 'rapper'
    case 'effect':     return 'default'
    default:           return 'default'
  }
}

/** Visual performer style from the loop actually played (pack category), not just pad tile colour. */
function resolvePerformanceCategory(
  pad: PadDefinition,
  packId: ActivePackId,
): PerformanceCategory {
  const packPad = packPadForGamePad(pad, AUDIO_PACKS[packId])
  if (packPad) {
    if (packPad.category === 'bass') return 'bass'
    if (packPad.category === 'fx') return 'fx'
    if (packPad.category === 'voice') return 'voice'
    if (packPad.category === 'melody') return 'melody'
    return 'beat'
  }
  if (pad.category === 'effect') return 'fx'
  if (pad.category === 'voice') return 'voice'
  if (pad.category === 'melody') return 'melody'
  return 'beat'
}

function resolveAudioSrc(pad: PadDefinition, packId: ActivePackId = 'trance-pack-1'): string | undefined {
  const packAudio = resolvePackAudioSrc(pad, packId)
  if (packAudio) return packAudio

  const file = audioAssetFile(pad)
  return lookupBundledAsset(bundledAudioUrls, 'audio', file)
}

function normalizedVolume(volume: number): number {
  return Math.min(1, Math.max(0, volume / 100))
}

function volumeDb(volume: number): number {
  return volume <= 0 ? -Infinity : (volume - 100) * 0.36
}

/**
 * Priority-aware dynamic category gain staging.
 *
 * Replaces the musicClock.ts version with a full 7-category priority model.
 * Higher-priority categories (beats) are never attenuated; lower-priority ones
 * (FX, transitions) duck progressively as concurrent count rises, preventing
 * gain stacking from overloading the compressor.
 *
 * Priority order (1 = fully protected):
 *   beats(1) > bass(2) > melody(3) > vocals(4) > atmosphere(5) > fx(6) > transition(7)
 *
 * Mix-bus headroom guard:
 *   When total active layers > 5, a gentle mix-bus reduction (-3% per extra layer)
 *   is applied to ALL categories, preventing the compressor from working too hard.
 *
 * Floor: no category is reduced below 0.50 — all performers remain audible.
 */
function computeEnhancedCategoryGains(
  counts: Partial<Record<string, number>>,
): Map<string, number> {
  const gains = new Map<string, number>()

  // Priority 1 — beats: fully protected, never attenuated

  // Priority 2 — bass: -7% per layer beyond 2
  const bassCount = counts['bass'] ?? 0
  if (bassCount > 2) {
    gains.set('bass', Math.pow(0.93, bassCount - 2))
  }

  // Priority 3 — melody: -3% per layer beyond 3
  const melodyCount = counts['melody'] ?? 0
  if (melodyCount > 3) {
    gains.set('melody', Math.pow(0.97, melodyCount - 3))
  }

  // Priority 4 — vocals: -4% per layer beyond 2
  const vocalCount = (counts['voice'] ?? 0) + (counts['vocals'] ?? 0)
  if (vocalCount > 2) {
    const m = Math.pow(0.96, vocalCount - 2)
    gains.set('voice', m)
    gains.set('vocals', m)
  }

  // Priority 5 — atmosphere: -5% per layer beyond 1
  const atmosphereCount = (counts['atmosphere'] ?? 0) + (counts['atmospheres'] ?? 0)
  if (atmosphereCount > 1) {
    const m = Math.pow(0.95, atmosphereCount - 1)
    gains.set('atmosphere', m)
    gains.set('atmospheres', m)
  }

  // Priority 6 — FX / effect: -6% per layer beyond 1
  const fxCount = (counts['effect'] ?? 0) + (counts['fx'] ?? 0)
  if (fxCount > 1) {
    const m = Math.pow(0.94, fxCount - 1)
    gains.set('effect', m)
    gains.set('fx', m)
  }

  // Priority 7 — transitions: -8% per layer beyond 1
  const transitionCount = (counts['transition'] ?? 0) + (counts['transitions'] ?? 0)
  if (transitionCount > 1) {
    const m = Math.pow(0.92, transitionCount - 1)
    gains.set('transition', m)
    gains.set('transitions', m)
  }

  // ── Mix-bus headroom guard ─────────────────────────────────────────────────
  // When total performer count exceeds 5, apply a gentle bus reduction to all
  // categories so the compressor does not need to apply heavy gain reduction
  // (which causes pumping and transient smearing).
  const totalLayers = Object.values(counts).reduce((s: number, n) => s + (n ?? 0), 0)
  if (totalLayers > 5) {
    const busReduction = Math.pow(0.97, totalLayers - 5)  // -3% per layer above 5
    // Apply to categories that already have an explicit gain
    gains.forEach((g, cat) => gains.set(cat, g * busReduction))
    // Apply to remaining categories (beats and anything else at 1.0)
    for (const [cat, count] of Object.entries(counts)) {
      if ((count ?? 0) > 0 && !gains.has(cat)) {
        gains.set(cat, busReduction)
      }
    }
  }

  // ── Audibility floor ──────────────────────────────────────────────────────
  // Never reduce any category below 0.50 — every performer must remain present.
  gains.forEach((g, cat) => gains.set(cat, Math.max(0.50, g)))

  return gains
}

function createTonePlayer(
  pad: PadDefinition,
  volume: number,
  loop: boolean,
  packId: ActivePackId = 'trance-pack-1',
): Tone.Player | null {
  const url = resolveAudioSrc(pad, packId)
  if (!url) return null

  const player = new Tone.Player({
    url,
    loop,
    autostart: false,
    fadeIn: 0,
    fadeOut: 0,
  }).toDestination()

  player.volume.value = volumeDb(volume)
  player.loop = loop
  return player
}

// =============================================================================
// FALLBACK ART — simple SVG when PNG is not present yet
// =============================================================================

const CHAR_FALLBACK_VIEW = '0 0 100 240'

/** Shared outer frame + inner visual scale (normalizes PNG transparent padding). */
function CharacterFigureFrame({ children }: { children: ReactNode }) {
  return (
    <div className="character-figure-frame">
      <motion.div className="character-figure-inner">{children}</motion.div>
    </div>
  )
}

/**
 * BufferVoice — a single sample-accurate Web Audio loop voice.
 *
 * Replaces HTMLAudioElement looping (whose loop seams are not sample-accurate
 * and which free-runs on its own clock, causing drift). The decoded AudioBuffer
 * is looped by an AudioBufferSourceNode on the shared AudioContext clock, so
 * loops never drift relative to each other.
 *
 *  • One persistent GainNode per voice (survives source restarts) → audibility.
 *  • The internal AudioBufferSourceNode is single-use: startAt() recreates it,
 *    stop() disposes it. The voice object itself persists for the pack lifetime.
 *  • Exposes a thin HTMLAudioElement-compatible surface (volume / paused /
 *    duration / loop / src / play / pause / currentTime) so the existing gain,
 *    mute, volume-slider, diagnostics, and replay call sites work unchanged.
 *    `volume` writes the GainNode, so scheduleGainRamp() ramps it directly.
 */
class BufferVoice {
  readonly ctx: AudioContext
  readonly buffer: AudioBuffer
  readonly gainNode: GainNode
  readonly src: string
  loop: boolean
  muted = false
  onerror: ((e: unknown) => void) | null = null
  onpause: (() => void) | null = null
  onended: (() => void) | null = null
  private source: AudioBufferSourceNode | null = null
  private startCtxTime = 0
  private startOffset = 0
  private pendingOffset = 0

  constructor(ctx: AudioContext, buffer: AudioBuffer, gainNode: GainNode, loop: boolean, src: string) {
    this.ctx = ctx
    this.buffer = buffer
    this.gainNode = gainNode
    this.loop = loop
    this.src = src
    this.gainNode.gain.value = 0
  }

  get duration(): number { return this.buffer.duration }
  get paused(): boolean { return this.source === null }
  /** Buffer engine never alters playback rate (no pitch-based drift correction). */
  get playbackRate(): number { return 1 }

  get volume(): number { return this.gainNode.gain.value }
  set volume(v: number) {
    const c = Math.max(0, Math.min(1, isFinite(v) ? v : 0))
    try { this.gainNode.gain.setValueAtTime(c, this.ctx.currentTime) }
    catch { this.gainNode.gain.value = c }
  }

  /** Computed playback position (for diagnostics) / pending seek offset. */
  get currentTime(): number {
    if (this.source === null) return this.pendingOffset
    const elapsed = this.ctx.currentTime - this.startCtxTime + this.startOffset
    const d = this.buffer.duration
    if (this.loop && d > 0) return ((elapsed % d) + d) % d
    return Math.min(Math.max(0, elapsed), d)
  }
  set currentTime(t: number) {
    // Buffer sources cannot be seeked in place — store as the next start offset.
    this.pendingOffset = isFinite(t) ? Math.max(0, t) : 0
  }

  /** Start (or restart) the source at an absolute AudioContext time. */
  startAt(when: number, offset = this.pendingOffset): void {
    this.stop()
    const d = this.buffer.duration
    const off = this.loop ? (d > 0 ? offset % d : 0) : Math.min(offset, d)
    const src = this.ctx.createBufferSource()
    src.buffer = this.buffer
    src.loop = this.loop
    src.connect(this.gainNode)
    src.onended = () => { if (this.onended) this.onended() }
    const startWhen = Math.max(when, this.ctx.currentTime)
    try { src.start(startWhen, Math.max(0, off || 0)) }
    catch (e) { if (this.onerror) this.onerror(e) }
    this.source = src
    this.startCtxTime = startWhen
    this.startOffset = Math.max(0, off || 0)
    this.pendingOffset = 0
  }

  /** HTMLAudio-compatible: ensure the voice is running. */
  play(): Promise<void> {
    if (this.source === null) this.startAt(this.ctx.currentTime)
    return Promise.resolve()
  }

  pause(): void {
    this.stop()
    if (this.onpause) this.onpause()
  }

  stop(): void {
    if (this.source) {
      try { this.source.onended = null; this.source.stop() } catch { /* already stopped */ }
      try { this.source.disconnect() } catch { /* noop */ }
      this.source = null
    }
  }

  dispose(): void {
    this.stop()
    try { this.gainNode.disconnect() } catch { /* noop */ }
  }
}


function CharacterFallbackAssigned({
  pad,
  muted,
  isCat,
}: {
  pad: PadDefinition
  muted: boolean
  isCat: boolean
}) {
  if (isCat) {
    return (
      <CharacterFigureFrame>
        <svg
          className="character-figure character-figure--assigned character-figure--fallback character-figure--cat"
          viewBox={CHAR_FALLBACK_VIEW}
        aria-hidden="true"
        style={{ opacity: muted ? 0.42 : 1 }}
      >
        <ellipse cx="50" cy="68" rx="30" ry="32" fill="#f5e6d3" stroke="#111" strokeWidth="2.5" />
        <polygon points="50,34 30,50 70,50" fill={pad.color} stroke="#111" strokeWidth="2" />
        <circle cx="38" cy="64" r="5" fill="#111" />
        <circle cx="62" cy="64" r="5" fill="#111" />
        <ellipse cx="50" cy="76" rx="6" ry="4" fill="#3d2018" />
        <path d="M26 100 Q50 90 74 100 L72 176 Q50 182 28 176 Z" fill={pad.color} stroke="#111" strokeWidth="2.5" />
        </svg>
      </CharacterFigureFrame>
    )
  }
  return (
    <CharacterFigureFrame>
      <svg
        className="character-figure character-figure--assigned character-figure--fallback"
        viewBox={CHAR_FALLBACK_VIEW}
        aria-hidden="true"
        style={{ opacity: muted ? 0.42 : 1 }}
      >
        <ellipse cx="50" cy="64" rx="24" ry="28" fill="#f7f2ea" stroke="#111" strokeWidth="2" />
        <path
          d="M26 92 Q50 86 74 92 L72 172 Q50 178 28 172 Z"
          fill={pad.color}
          stroke="#111"
          strokeWidth="2"
        />
      </svg>
    </CharacterFigureFrame>
  )
}

function CharacterFigureEmpty({
  slotIndex: _slotIndex,
  muted,
}: {
  slotIndex: number
  muted: boolean
}) {
  return (
    <CharacterFigureFrame>
      <img
        src="/characters/placeholder-cyber.png"
        alt="Empty performer"
        className="character-figure character-figure--empty"
        style={{ opacity: muted ? 0.38 : 1 }}
        draggable={false}
      />
    </CharacterFigureFrame>
  )
}

/** Image-based character with SVG fallback on missing file */
function CharacterFigure({
  pad,
  slotIndex,
  muted,
}: {
  pad: PadDefinition | null
  slotIndex: number
  muted: boolean
}) {
  const [useFallback, setUseFallback] = useState(false)
  const isCat = SLOT_IS_CAT[slotIndex]
  const src = resolveCharacterSrc(pad, slotIndex)

  useEffect(() => {
    setUseFallback(false)
  }, [pad?.id, slotIndex])

  if (!pad) {
    return <CharacterFigureEmpty slotIndex={slotIndex} muted={muted} />
  }

  if (useFallback) {
    return <CharacterFallbackAssigned pad={pad} muted={muted} isCat={isCat} />
  }

  return (
    <CharacterFigureFrame>
      <motion.img
        key={pad?.id ?? 'empty'}
        src={src}
        alt={pad ? `${pad.label} character` : 'Empty character'}
        className="character-figure character-figure--assigned"
        style={{ opacity: muted ? 0.42 : 1 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: muted ? 0.42 : 1 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onError={() => setUseFallback(true)}
        draggable={false}
      />
    </CharacterFigureFrame>
  )
}

// =============================================================================
// PAD TILE ICON — image from /pads/ with SVG fallback
// =============================================================================

function PadIconFallback({ type }: { type: PadIconType }) {
  return (
    <span className="sound-pad__icon" aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="currentColor">
        {type === 'hat' && (
          <path d="M8 28h32l-4-12H12L8 28zm6 4v4h20v-4H14z" />
        )}
        {type === 'kick' && (
          <>
            <circle cx="24" cy="26" r="14" />
            <circle cx="24" cy="26" r="6" fill="var(--panel-bg, #f0f0f0)" />
          </>
        )}
        {type === 'clock' && (
          <>
            <circle cx="24" cy="24" r="16" fill="none" stroke="currentColor" strokeWidth="4" />
            <path d="M24 14v12l8 4" stroke="currentColor" strokeWidth="3" fill="none" />
          </>
        )}
        {type === 'speaker' && (
          <path d="M10 18h8l10-8v28l-10-8H10V18zm22 4a8 8 0 010 12M36 16a14 14 0 010 16" fill="none" stroke="currentColor" strokeWidth="3" />
        )}
        {type === 'vinyl' && (
          <>
            <circle cx="24" cy="24" r="16" />
            <circle cx="24" cy="24" r="5" fill="var(--panel-bg, #f0f0f0)" />
          </>
        )}
        {type === 'phones' && (
          <path d="M10 22a14 14 0 0028 0v6H10v-6zm4 6h4v6h-4v-6zm20 0h4v6h-4v-6z" />
        )}
        {type === 'bolt' && <path d="M26 6L14 26h10l-4 16 18-24H28l-2-12z" />}
        {type === 'star' && (
          <path d="M24 6l4 12h12l-10 8 4 14-10-7-10 7 4-14-10-8h12z" />
        )}
        {type === 'wave' && (
          <path d="M6 28c6-12 12-12 18 0s12 12 18 0" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        )}
        {type === 'ring' && (
          <>
            <circle cx="24" cy="26" r="12" fill="none" stroke="currentColor" strokeWidth="5" />
            <circle cx="24" cy="12" r="5" />
          </>
        )}
        {type === 'bell' && (
          <path d="M24 8c8 0 10 10 10 16H14c0-6 2-16 10-16zm-8 20h16v4H16v-4z" />
        )}
        {type === 'keys' && (
          <path d="M8 32h32V18H8v14zm4-10h6v6h-6v-6zm10 0h6v6h-6v-6zm10 0h6v6h-6v-6z" />
        )}
        {type === 'note' && (
          <>
            <ellipse cx="16" cy="34" rx="7" ry="5" />
            <rect x="22" y="10" width="4" height="26" />
            <path d="M26 10c10-2 16 4 16 12 0 6-4 10-10 10" fill="none" stroke="currentColor" strokeWidth="4" />
          </>
        )}
        {type === 'chord' && (
          <>
            <ellipse cx="14" cy="34" rx="6" ry="4" />
            <ellipse cx="26" cy="30" rx="6" ry="4" />
            <rect x="30" y="12" width="3" height="20" />
          </>
        )}
        {type === 'harp' && (
          <path d="M18 8v32c0-8 4-12 8-12s8 4 8 12V8H18z" opacity="0.95" />
        )}
        {type === 'horn' && (
          <path d="M10 30h14c12 0 18-6 18-14S36 6 24 6H10v24z" />
        )}
        {type === 'conga' && (
          <path d="M16 10h16v28c-8 4-24 4-16 0V10z" />
        )}
        {type === 'shaker' && (
          <path d="M20 8h8l4 32H16l4-32zm2 6h4v4h-4v-4z" />
        )}
        {type === 'cymbal' && (
          <ellipse cx="24" cy="24" rx="18" ry="8" />
        )}
        {type === 'spark' && (
          <path d="M24 4l3 10h10l-8 6 3 10-8-6-8 6 3-10-8-6h10z" />
        )}
        {type === 'mic' && (
          <path d="M24 8a8 8 0 018 8v6a8 8 0 01-16 0v-6a8 8 0 018-8zm-12 16h24v4a12 12 0 01-24 0v-4z" />
        )}
        {type === 'mouth' && (
          <path d="M10 20c4 14 24 14 28 0-4 10-24 10-28 0z" />
        )}
        {type === 'choir' && (
          <>
            <circle cx="16" cy="18" r="6" />
            <circle cx="32" cy="18" r="6" />
            <path d="M8 36c4-8 8-10 16-10s12 2 16 10" />
          </>
        )}
        {type === 'radio' && (
          <path d="M10 14h28v24H10V14zm4 4h20v8H14v-8zm0 12h6v4h-6v-4zm10 0h6v4h-6v-4z" />
        )}
      </svg>
    </span>
  )
}

// =============================================================================
function PadTileArt({ pad }: { pad: PadDefinition }) {
  const [useFallback, setUseFallback] = useState(false)
  const src = resolvePadSrc(pad)

  useEffect(() => {
    setUseFallback(false)
  }, [pad.id])

  if (useFallback) {
    return <PadIconFallback type={pad.icon} />
  }

  return (
    <img
      src={src}
      alt=""
      className="sound-pad__art"
      onError={() => setUseFallback(true)}
      draggable={false}
    />
  )
}

// PAD & SLOT COMPONENTS
// =============================================================================

function SoundPad({
  pad,
  selected,
  inUse,
  isPerforming,
  onSelect,
}: {
  pad: PadDefinition
  selected: boolean
  inUse: boolean
  isPerforming: boolean
  onSelect: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: pad.id })

  const style: CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : {}

  return (
    <motion.button
      ref={setNodeRef}
      type="button"
      className={[
        'sound-pad',
        `sound-pad--${pad.category}`,
        selected ? 'sound-pad--selected' : '',
        inUse ? 'sound-pad--in-use' : '',
        isPerforming ? 'sound-pad--performing' : '',
      ].filter(Boolean).join(' ')}
      style={{
        ...style,
        background: pad.color,
        boxShadow: `inset 0 -4px 0 ${pad.accent}`,
        ['--pad-color' as string]: pad.color,
      }}
      onClick={() => onSelect(pad.id)}
      whileTap={{ scale: 0.94 }}
      animate={{ opacity: isDragging ? 0.55 : 1, scale: isDragging ? 1.06 : 1 }}
      aria-label={pad.label}
      title={pad.label}
      {...listeners}
      {...attributes}
    >
      <PadTileArt pad={pad} />
    </motion.button>
  )
}

// =============================================================================
// BEAT DEBUG OVERLAY — dev-only timing HUD
// =============================================================================

/**
 * Dev-only overlay that shows the current beat, bar, BPM, and the number of
 * pads waiting in the quantize queue. Visible only when import.meta.env.DEV.
 *
 * HOW TO USE: assign pads while music plays and watch "Q:" increment while the
 * pad waits for its bar/beat boundary, then drop to 0 once it starts.
 *
 * HOW TO DISABLE: remove the <BeatDebugOverlay> element from the JSX below.
 */
function BeatDebugOverlay({
  clock,
  queueSize,
  bpm,
}: {
  clock: MusicalClock
  queueSize: number
  bpm: number
}) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (clock.originMs === 0) return
    const id = window.setInterval(() => setTick((t) => t + 1), 250)
    return () => window.clearInterval(id)
  }, [clock.originMs])

  const beat = currentBeatInBar(clock)
  const bar = currentBarInLoop(clock)

  return (
    <div className="beat-debug-overlay" aria-hidden="true">
      <span className={`beat-debug-overlay__beat beat-debug-overlay__beat--${beat}`}>
        ♩{beat}
      </span>
      <span>bar {bar}</span>
      <span>{bpm} BPM</span>
      {queueSize > 0 && <span className="beat-debug-overlay__queue">Q:{queueSize}</span>}
      {/* Force re-render on tick to update readouts */}
      <span style={{ display: 'none' }}>{tick}</span>
    </div>
  )
}

// =============================================================================
// MIX VISUALIZER — lightweight CSS-animated equalizer bars
// =============================================================================

function MixVisualizer({
  isPlaying,
  beatPeriodMs,
}: {
  isPlaying: boolean
  beatPeriodMs: number
}) {
  return (
    <div
      className={`mix-visualizer${isPlaying ? ' mix-visualizer--active' : ''}`}
      style={{ '--beat-period': `${beatPeriodMs}ms` } as CSSProperties}
      aria-hidden="true"
      title={isPlaying ? 'Mix playing' : 'Mix stopped'}
    >
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <span
          key={i}
          className="mix-visualizer__bar"
          style={{ '--bar-i': i } as CSSProperties}
        />
      ))}
    </div>
  )
}

// =============================================================================
// CHARACTER SLOT
// =============================================================================

function CharacterSlot({
  index,
  assignment,
  muted,
  isPlaying,
  masterMuted,
  activePackId,
  onSlotClick,
  onRemove,
}: {
  index: number
  assignment: SlotAssignment
  muted: boolean
  isPlaying: boolean
  masterMuted: boolean
  activePackId: ActivePackId
  onSlotClick: (index: number) => void
  onRemove: (index: number) => void
}) {
  const slotId = `slot-${index}`
  const { setNodeRef, isOver } = useDroppable({ id: slotId })
  const performance = assignment
    ? resolvePerformanceCategory(assignment, activePackId)
    : null
  const isPerforming = Boolean(assignment && isPlaying && !muted && !masterMuted)
  const animType = assignment ? resolveAnimType(assignment) : null

  // Track assignment transitions for drop/remove feedback
  const prevAssignmentRef = useRef<SlotAssignment>(assignment)
  const [dropFlash, setDropFlash] = useState<'in' | 'out' | null>(null)
  useEffect(() => {
    const prev = prevAssignmentRef.current
    prevAssignmentRef.current = assignment
    if (!prev && assignment) {
      setDropFlash('in')
      const t = window.setTimeout(() => setDropFlash(null), 580)
      return () => window.clearTimeout(t)
    }
    if (prev && !assignment) {
      setDropFlash('out')
      const t = window.setTimeout(() => setDropFlash(null), 360)
      return () => window.clearTimeout(t)
    }
  }, [assignment])

  return (
    <motion.div
      ref={setNodeRef}
      className={[
        'character-slot-wrap',
        isOver ? 'character-slot-wrap--over' : '',
        assignment ? 'character-slot-wrap--filled' : 'character-slot-wrap--empty',
        isPerforming ? 'character-slot-wrap--performing' : '',
        performance ? `character-slot-wrap--perform-${performance}` : '',
        animType ? `character-slot-wrap--anim-${animType}` : '',
        muted ? 'character-slot-wrap--muted' : '',
        dropFlash === 'in' ? 'character-slot-wrap--just-assigned' : '',
        dropFlash === 'out' ? 'character-slot-wrap--just-removed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        ['--slot-index' as string]: String(index),
        ['--slot-pad-color' as string]: assignment?.color ?? 'transparent',
      }}
    >
      <button
        type="button"
        className="character-slot__body"
        onClick={() => onSlotClick(index)}
        title={assignment ? `Click to ${muted ? 'unmute' : 'mute'} ${assignment.label}` : 'Empty slot'}
        aria-label={
          assignment
            ? `Character ${index + 1}, ${assignment.label}${muted ? ', muted' : ''}`
            : `Empty character ${index + 1}`
        }
      >
        <CharacterFigure
          pad={assignment}
          slotIndex={index}
          muted={muted}
        />
        {assignment && muted && <span className="character-slot__mute-badge">MUTED</span>}
      </button>
      {assignment && (
        <button
          type="button"
          className="character-slot__remove"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(index)
          }}
          aria-label={`Remove ${assignment.label} from character ${index + 1}`}
        >
          ×
        </button>
      )}
    </motion.div>
  )
}

// =============================================================================
// MAIN APP — state, audio, handlers
// =============================================================================

function sanitizeMixSlots(mix: SavedMix): SavedMix {
  return {
    ...mix,
    s: mix.s.map((padId) => (padId && PAD_BY_ID[padId] ? padId : null)),
  }
}

function transportFromMix(mix: SavedMix | null): TransportStatus {
  if (!mix?.play) return 'Stopped'
  return mix.pause ? 'Paused' : 'Playing'
}

type BootResolution =
  | { mode: 'clean' }
  | { mode: 'share'; mix: SavedMix }
  | { mode: 'recorded'; mix: RecordedMix }

function resolveAppBoot(): BootResolution {
  const url = window.location.href
  console.log('[boot-debug] url', url)

  const decoded = readAnyMixFromLocation()

  if (!decoded) {
    clearShareMixFromUrl()
    console.log('[boot] clean load no mix')
    console.log('[boot-debug] initial slots', Array(SLOT_COUNT).fill(null))
    return { mode: 'clean' }
  }

  if (decoded.v === 2) {
    const sanitizedSlots = decoded.init.slots.map((padId) =>
      padId && PAD_BY_ID[padId] ? padId : null,
    )
    const mix: RecordedMix = { ...decoded, init: { ...decoded.init, slots: sanitizedSlots } }
    console.log('[boot] recorded mix found', {
      events: mix.ev.length,
      durMs: mix.dur,
      initSlots: mix.init.slots,
    })
    return { mode: 'recorded', mix }
  }

  // v:1 SavedMix
  const sanitized = sanitizeMixSlots(decoded)
  console.log('[boot] share mix found')
  console.log('[boot] restored mix slots', sanitized.s)
  console.log('[boot-debug] initial slots', sanitized.s)
  return { mode: 'share', mix: sanitized }
}

function App() {
  const bootRef = useRef<BootResolution>(resolveAppBoot())
  const isSharedMixLoad = bootRef.current.mode === 'share'
  const shareMix = bootRef.current.mode === 'share' ? bootRef.current.mix : null

  const [slots, setSlots] = useState<(string | null)[]>(() => Array(SLOT_COUNT).fill(null))
  const [mutedSlots, setMutedSlots] = useState<Set<number>>(() => new Set())
  const [selectedPadId, setSelectedPadId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [transportStatus, setTransportStatus] = useState<TransportStatus>('Stopped')
  const [audioReady, setAudioReady] = useState(false)
  const [masterMuted, setMasterMuted] = useState(false)
  const [volume, setVolume] = useState(80)
  const [bpm, setBpm] = useState(DEFAULT_BPM)
  const [diagnosticNativeUrl, setDiagnosticNativeUrl] = useState<string>('')
  const [assignedBeatOneUrl, setAssignedBeatOneUrl] = useState<string>('')
  const [activePackId, setActivePackId] = useState<ActivePackId>('bravo-pack')
  const [mixToast, setMixToast] = useState<string | null>(null)
  const [mixRecordingState, setMixRecordingState] = useState<MixRecordingState>('idle')
  /** RecordedMix finalised from the user's own session (enables SHARE + REPLAY). */
  const [savedRecordedMix, setSavedRecordedMix] = useState<RecordedMix | null>(null)
  /** RecordedMix loaded from a shared URL — enables REPLAY MIX on boot. */
  const [sharedRecordedMix, setSharedRecordedMix] = useState<RecordedMix | null>(
    bootRef.current.mode === 'recorded' ? bootRef.current.mix : null,
  )
  /** True while a replay is in progress (timeline events are still scheduled). */
  const [isReplayingMix, setIsReplayingMix] = useState(false)
  const [recordingElapsed, setRecordingElapsed] = useState(0)
  const recordingTimerRef = useRef<number | null>(null)
  const [stageEntered, setStageEntered] = useState(false)
  const [devDrawerOpen, setDevDrawerOpen] = useState(false)
  const [devPerfPanel, setDevPerfPanel] = useState<{
    activePads: number; nodes: number; softCorr: number; hardSnaps: number; ctxState: string
    nextResyncS: number; lastDriftMs: number; lastCorrected: number; resyncs: number
  } | null>(null)
  const [introExiting, setIntroExiting] = useState(false)
  const [sharedMixAwaitingAudio, setSharedMixAwaitingAudio] = useState(false)
  const sharedMixHydratedRef = useRef(false)

  const assignedAudioRef = useRef<Map<number, BufferVoice>>(new Map())
  /** Per-slot pad volume multiplier (0–1). Set when a pad is assigned. */
  const padVolumeRef = useRef<Map<number, number>>(new Map())
  /** RAF handle for throttled volume slider updates — prevents 60Hz React re-renders. */
  const volumeRafRef = useRef<number | null>(null)
  // Tracks which slots hold one-shot pads (loop = false) vs continuous loops
  const padOneShotRef = useRef<Map<number, boolean>>(new Map())
  /** Shared Web Audio context for the master dynamics compressor. */
  const audioCtxRef = useRef<AudioContext | null>(null)
  const masterCompressorRef = useRef<DynamicsCompressorNode | null>(null)
  /** Master gain bus between the compressor and destination. Used purely as the
   *  pause/resume control: ramping it to 0 silences everything while the
   *  AudioContext clock — and every looping source — keeps running, so resume is
   *  perfectly in phase with zero node churn. */
  const masterGainNodeRef = useRef<GainNode | null>(null)
  // ── Sample-accurate Web Audio transport pool ───────────────────────────────
  // One persistent BufferVoice per pack pad, keyed by game pad id. Each pad's WAV
  // is decoded once into an AudioBuffer and looped by an AudioBufferSourceNode on
  // the shared AudioContext clock, so loops are sample-accurate and never drift.
  // Every loop pad starts together at gain 0 when the transport starts and is
  // NEVER restarted while playing. Assigning / removing / muting a character only
  // ramps that voice's GainNode.
  const packTransportRef = useRef<Map<string, BufferVoice>>(new Map())
  /** Decoded AudioBuffers for the active pack, keyed by pad id (reused across
   *  source restarts so Restart Loops never re-decodes). */
  const audioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map())
  const packTransportPackIdRef = useRef<ActivePackId | null>(null)
  /** In-flight build promise so concurrent callers await the same load pass. */
  const packTransportBuildRef = useRef<Promise<void> | null>(null)
  /** Indirection so the early-defined startOrRestartLoops can invoke the
   *  pool starter, which must be declared after ensureAudioCtx. */
  const startGlobalTransportRef = useRef<() => void>(() => {})
  // ── Bar-boundary resync ─────────────────────────────────────────────────────
  // Lightweight scheduled re-alignment: at predictable 16-bar phrase boundaries
  // (≈30 s @ 128 BPM) every pool loop is snapped back to its exact expected
  // position in one synchronous batch. This is NOT continuous phase correction —
  // it fires once per phrase, only touches pads that have drifted past threshold,
  // and seeks at the loop-start zero-crossing so it is inaudible.
  const resyncTimeoutRef = useRef<number | null>(null)
  const resyncIntervalRef = useRef<number | null>(null)
  /** Same indirection trick as the pool starter (declared after ensureAudioCtx). */
  const scheduleResyncRef = useRef<() => void>(() => {})
  /** DEV-only resync telemetry surfaced in the perf panel. */
  const resyncStatsRef = useRef({
    lastResyncAt: 0,
    nextResyncAt: 0,
    lastMaxDriftMs: 0,
    lastCorrectedCount: 0,
    totalResyncs: 0,
  })
  const masterCycleIntervalRef = useRef<number | null>(null)
  /** setInterval handle for the master phase lock correction monitor. */
  const phaseCorrectionIntervalRef = useRef<number | null>(null)
  /** DEV-only: setInterval handle for the silent-pad dropout watcher. */
  const devDropoutWatcherRef = useRef<number | null>(null)
  /** DEV-only: accumulated phase correction counters for the perf panel. */
  const devPerfStatsRef = useRef({ softCorrections: 0, hardSnaps: 0, intervalStart: 0 })
  const isPlayingRef = useRef(false)
  const masterMutedRef = useRef(false)
  const mutedSlotsRef = useRef<Set<number>>(new Set())
  const volumeRef = useRef(volume)
  /**
   * Per-slot timestamp (performance.now()) of the most recent audio.play() call.
   * Used by runPhaseCorrectionPass to skip corrections during the post-play
   * settle period (PHASE_SETTLE_MS), preventing hard snaps while the browser's
   * audio decoder is still starting up.
   */
  const slotLastPlayTimeRef = useRef<Map<number, number>>(new Map())
  // ── Musical clock & quantization ──────────────────────────────────────────
  /** Live musical clock — updated in startOrRestartLoops and on BPM change. */
  const musicalClockRef = useRef<MusicalClock>(makeClock(DEFAULT_BPM, MASTER_LOOP_MS))
  /** Pending quantize setTimeout IDs keyed by slot index.
   *  Cancelled in disposeAssignedAudio so removing a pad before its
   *  scheduled play-start doesn't trigger a ghost audio start. */
  const quantizeTimersRef = useRef<Map<number, number>>(new Map())
  /** Ref mirror of isReplayingMix state for synchronous checks inside
   *  callbacks without stale closure problems. */
  const isReplayingMixRef = useRef(false)
  /** Per-slot gain multipliers for category gain staging.
   *  Updated whenever slots or activePackId change.
   *  Keyed by slot index — same lookup pattern as padVolumeRef. */
  const categoryGainRef = useRef<Map<number, number>>(new Map())
  const diagnosticNativeAudioRef = useRef<HTMLAudioElement | null>(null)
  const diagnosticTonePlayerRef = useRef<Tone.Player | null>(null)
  const diagnosticNativeIntervalRef = useRef<number | null>(null)
  const assignedDebugIntervalsRef = useRef<Map<number, number>>(new Map())
  const diagnosticToneIntervalRef = useRef<number | null>(null)
  const diagnosticToneStartedAtRef = useRef<number | null>(null)
  const previewRef = useRef<PreviewPlayers>({
    players: {},
    dispose: () => undefined,
  })

  // ── Timeline recording refs ────────────────────────────────────────────────
  /** True while SAVE MIX recording is active. */
  const isRecordingRef = useRef(false)
  /** State captured the moment SAVE MIX is pressed. */
  const recordingInitRef = useRef<MixSnapshot | null>(null)
  /** Recording start timestamp (Date.now()). */
  const recordingStartTimeRef = useRef<number | null>(null)
  /** Accumulates all timeline events during a recording session. */
  const timelineEventsRef = useRef<MixEvent[]>([])
  /** setTimeout ids for scheduled replay events — cancelled on new replay. */
  const replayTimeoutsRef = useRef<number[]>([])
  /**
   * Always-fresh event application function for replay.
   * Updated by an unconditional useEffect so it always captures
   * the latest React state via closure — avoids stale-closure issues
   * with setTimeout-dispatched events.
   */
  const applyTimelineEventRef = useRef<(event: MixEvent) => Promise<void>>(async () => {})

  const applyCleanBootState = useCallback(() => {
    clearShareMixFromUrl()
    if (masterCycleIntervalRef.current !== null) {
      window.clearInterval(masterCycleIntervalRef.current)
      masterCycleIntervalRef.current = null
    }
    if (phaseCorrectionIntervalRef.current !== null) {
      window.clearInterval(phaseCorrectionIntervalRef.current)
      phaseCorrectionIntervalRef.current = null
    }
    if (devDropoutWatcherRef.current !== null) {
      window.clearInterval(devDropoutWatcherRef.current)
      devDropoutWatcherRef.current = null
    }
    assignedAudioRef.current.clear()
    // Tear down the transport pool (stops every looping source + GainNode).
    packTransportRef.current.forEach((voice) => voice.dispose())
    packTransportRef.current.clear()
    audioBuffersRef.current.clear()
    packTransportPackIdRef.current = null
    packTransportBuildRef.current = null
    setSlots(Array(SLOT_COUNT).fill(null))
    setMutedSlots(new Set())
    mutedSlotsRef.current = new Set()
    setIsPlaying(false)
    isPlayingRef.current = false
    setMasterMuted(false)
    masterMutedRef.current = false
    setTransportStatus('Stopped')
    setSelectedPadId(null)
    setSharedMixAwaitingAudio(false)
    sharedMixHydratedRef.current = false
  }, [])

  const applyShareBootState = useCallback((mix: SavedMix) => {
    const sanitized = sanitizeMixSlots(mix)
    volumeRef.current = sanitized.vol
    masterMutedRef.current = sanitized.pause
    mutedSlotsRef.current = new Set(sanitized.m)
    isPlayingRef.current = sanitized.play
    setActivePackId(toPlayablePackId(sanitized.p))
    setVolume(sanitized.vol)
    setMasterMuted(sanitized.pause)
    setMutedSlots(new Set(sanitized.m))
    setIsPlaying(sanitized.play)
    setTransportStatus(transportFromMix(sanitized))
    setSlots([...sanitized.s])
    setSharedMixAwaitingAudio(sanitized.s.some(Boolean))
    setStageEntered(true)
  }, [])

  /** Apply the initial state from a v:2 RecordedMix URL — skips intro, waits for REPLAY. */
  const applyRecordedBootState = useCallback((mix: RecordedMix) => {
    const { init } = mix
    setSharedRecordedMix(mix)
    volumeRef.current = init.vol
    masterMutedRef.current = false
    mutedSlotsRef.current = new Set(init.muted)
    isPlayingRef.current = false
    setActivePackId(toPlayablePackId(init.pack))
    setVolume(init.vol)
    setBpm(init.bpm)
    setMasterMuted(false)
    setMutedSlots(new Set(init.muted))
    setIsPlaying(false)
    setTransportStatus('Stopped')
    setSlots([...init.slots])
    setStageEntered(true)
    setMixToast('Recorded mix loaded — press ▶ REPLAY MIX to play from the beginning')
    console.log('[boot] recorded boot state applied', { initSlots: init.slots, events: mix.ev.length })
  }, [])

  useLayoutEffect(() => {
    if (bootRef.current.mode === 'share') {
      applyShareBootState(bootRef.current.mix)
      console.log('[boot-debug] final slots after boot', bootRef.current.mix.s)
      return
    }

    if (bootRef.current.mode === 'recorded') {
      applyRecordedBootState(bootRef.current.mix)
      console.log('[boot-debug] final slots after boot (recorded init)', bootRef.current.mix.init.slots)
      return
    }

    console.log('[boot] forcing empty slots')
    applyCleanBootState()
    const emptySlots = Array(SLOT_COUNT).fill(null)
    console.log('[boot-debug] final slots after boot', emptySlots)
  }, [applyCleanBootState, applyRecordedBootState, applyShareBootState])

  const assignments = useMemo(
    () =>
      slots.map((id) => (id ? (PAD_BY_ID[id] ?? null) : null)) as SlotAssignment[],
    [slots],
  )

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    masterMutedRef.current = masterMuted
  }, [masterMuted])

  useEffect(() => {
    mutedSlotsRef.current = mutedSlots
  }, [mutedSlots])

  useEffect(() => {
    volumeRef.current = volume
  }, [volume])

  // Keep musical clock BPM-derived timings in sync whenever BPM changes.
  useEffect(() => {
    musicalClockRef.current = clockWithBpm(musicalClockRef.current, bpm)
  }, [bpm])

  // Recompute per-slot category gain staging whenever slots or pack change.
  // computeEnhancedCategoryGains returns per-category multipliers; we then map to
  // per-slot and immediately apply the new gains to any active audio elements so
  // existing pads reflect the new mix balance without waiting for a volume event.
  useEffect(() => {
    const counts: Partial<Record<string, number>> = {}
    const slotCategories: Array<{ slot: number; category: string }> = []
    for (let i = 0; i < slots.length; i++) {
      const padId = slots[i]
      if (!padId) continue
      const pad = PAD_BY_ID[padId]
      if (!pad) continue
      const packPad = packPadForGamePad(pad, AUDIO_PACKS[activePackId])
      const cat = (packPad?.category ?? pad.category) as string
      counts[cat] = (counts[cat] ?? 0) + 1
      slotCategories.push({ slot: i, category: cat })
    }
    const categoryMultipliers = computeEnhancedCategoryGains(counts)
    categoryGainRef.current.clear()
    for (const { slot, category } of slotCategories) {
      categoryGainRef.current.set(slot, categoryMultipliers.get(category) ?? 1.0)
    }

    // Immediately propagate new gains to playing audio elements.
    // Skip elements with an active ramp — their volume will be set correctly
    // when the ramp completes.  Cancel any ramp that has since been superseded
    // by a new pad assignment that changes the category count.
    if (isPlayingRef.current && !masterMutedRef.current) {
      const master = normalizedVolume(volumeRef.current)
      assignedAudioRef.current.forEach((audio, slot) => {
        if (mutedSlotsRef.current.has(slot)) return
        if (isRampActive(audio)) return  // Let the ramp finish; it uses padEffVol at creation time
        const padVol = padVolumeRef.current.get(slot) ?? 1.0
        const categoryGain = categoryGainRef.current.get(slot) ?? 1.0
        const eff = Math.max(0, Math.min(0.95, master * padVol * categoryGain))
        if (isFinite(eff)) audio.volume = eff
      })
    }
  }, [slots, activePackId])

  useEffect(() => {
    if (!mixToast) return
    const timeout = window.setTimeout(() => setMixToast(null), 2600)
    return () => window.clearTimeout(timeout)
  }, [mixToast])

  // Recording elapsed-time counter — ticks every second while recording.
  useEffect(() => {
    if (mixRecordingState !== 'recording') {
      if (recordingTimerRef.current !== null) {
        window.clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      return
    }
    setRecordingElapsed(0)
    recordingTimerRef.current = window.setInterval(() => {
      setRecordingElapsed((prev) => prev + 1)
    }, 1000)
    return () => {
      if (recordingTimerRef.current !== null) {
        window.clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
    }
  }, [mixRecordingState])

  /** Snapshot of the entire mix state at a point in time. */
  const buildSnapshot = useCallback((): MixSnapshot => ({
    pack: activePackId,
    slots: [...slots],
    muted: [...mutedSlots].sort((a, b) => a - b),
    vol: volume,
    bpm,
    play: isPlaying,
    pause: masterMuted,
  }), [activePackId, bpm, isPlaying, masterMuted, mutedSlots, slots, volume])

  /** Append a timestamped event to the recording timeline — no-op when not recording. */
  const recordEvent = useCallback((event: Omit<MixEvent, 't'>) => {
    if (!isRecordingRef.current || recordingStartTimeRef.current === null) return
    const t = Date.now() - recordingStartTimeRef.current
    timelineEventsRef.current.push({ t, ...event } as MixEvent)
  }, [])

  /** Start a new timeline recording session. */
  const handleStartRecording = useCallback(() => {
    const init = buildSnapshot()
    recordingInitRef.current = init
    recordingStartTimeRef.current = Date.now()
    timelineEventsRef.current = []
    isRecordingRef.current = true
    setMixRecordingState('recording')
    setRecordingElapsed(0)
    setSavedRecordedMix(null)
    console.log('[mix-record] recording started', { initSlots: init.slots })
  }, [buildSnapshot])

  /** Stop recording, finalise the RecordedMix, and write it to the URL. */
  const handleStopRecording = useCallback(() => {
    isRecordingRef.current = false
    setMixRecordingState('finalizing')
    const dur = recordingStartTimeRef.current !== null ? Date.now() - recordingStartTimeRef.current : 0
    const init = recordingInitRef.current ?? buildSnapshot()
    const events = [...timelineEventsRef.current]
    console.log('[mix-record] recording stopped — finalizing', { events: events.length, dur })
    window.setTimeout(() => {
      const recordedMix: RecordedMix = { v: 2, at: recordingStartTimeRef.current ?? Date.now(), dur, init, ev: events }
      setSavedRecordedMix(recordedMix)
      applyRecordedMixToUrl(recordedMix)
      setMixRecordingState('saved')
      setMixToast('Mix recorded — press SHARE MIX to copy the link, or ▶ REPLAY MIX to replay')
      console.log('[mix-record] mix finalized and written to URL', recordedMix)
      recordingInitRef.current = null
      recordingStartTimeRef.current = null
      timelineEventsRef.current = []
    }, 750)
  }, [buildSnapshot])

  const handleEnterStage = useCallback(() => {
    setIntroExiting(true)
    window.setTimeout(() => {
      if (!hasShareMixInUrl()) {
        console.log('[boot] forcing empty slots')
        applyCleanBootState()
      }
      setStageEntered(true)
      setIntroExiting(false)
    }, 520)
  }, [applyCleanBootState])

  const handleCopyShareLink = useCallback(async () => {
    const mixToShare = savedRecordedMix ?? sharedRecordedMix
    if (!mixToShare) return
    const shareUrl = buildRecordedShareUrl(mixToShare)
    console.log('[mix] sharing recorded mix', { events: mixToShare.ev.length, dur: mixToShare.dur })

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
      } else {
        const input = document.createElement('textarea')
        input.value = shareUrl
        input.setAttribute('readonly', 'true')
        input.style.position = 'fixed'
        input.style.left = '-9999px'
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
      }
      setMixToast('Mix link copied — share it to let others replay your mix!')
    } catch (error) {
      console.warn('[mix] clipboard copy failed', error)
      setMixToast('Copy failed — try again')
    }
  }, [savedRecordedMix, sharedRecordedMix])

  const clearAssignedDebugInterval = useCallback((slotIndex: number) => {
    const interval = assignedDebugIntervalsRef.current.get(slotIndex)
    if (interval === undefined) return
    window.clearInterval(interval)
    assignedDebugIntervalsRef.current.delete(slotIndex)
  }, [])

  const clearAllAssignedDebugIntervals = useCallback(() => {
    assignedDebugIntervalsRef.current.forEach((interval) => window.clearInterval(interval))
    assignedDebugIntervalsRef.current.clear()
  }, [])

  const clearMasterCycle = useCallback(() => {
    if (masterCycleIntervalRef.current !== null) {
      window.clearInterval(masterCycleIntervalRef.current)
      masterCycleIntervalRef.current = null
    }
    if (phaseCorrectionIntervalRef.current !== null) {
      window.clearInterval(phaseCorrectionIntervalRef.current)
      phaseCorrectionIntervalRef.current = null
    }
    if (devDropoutWatcherRef.current !== null) {
      window.clearInterval(devDropoutWatcherRef.current)
      devDropoutWatcherRef.current = null
    }
    // Bar-boundary resync timers
    if (resyncTimeoutRef.current !== null) {
      window.clearTimeout(resyncTimeoutRef.current)
      resyncTimeoutRef.current = null
    }
    if (resyncIntervalRef.current !== null) {
      window.clearInterval(resyncIntervalRef.current)
      resyncIntervalRef.current = null
    }
  }, [])

  const clearDiagnosticNativeTest = useCallback(() => {
    if (diagnosticNativeIntervalRef.current !== null) {
      window.clearInterval(diagnosticNativeIntervalRef.current)
      diagnosticNativeIntervalRef.current = null
    }
    const audio = diagnosticNativeAudioRef.current
    if (!audio) return
    audio.pause()
    audio.onended = null
    audio.onerror = null
    audio.onloadedmetadata = null
    audio.oncanplaythrough = null
    audio.currentTime = 0
    audio.removeAttribute('src')
    audio.load()
    diagnosticNativeAudioRef.current = null
  }, [])

  const clearDiagnosticToneTest = useCallback(() => {
    if (diagnosticToneIntervalRef.current !== null) {
      window.clearInterval(diagnosticToneIntervalRef.current)
      diagnosticToneIntervalRef.current = null
    }
    diagnosticToneStartedAtRef.current = null
    const player = diagnosticTonePlayerRef.current
    if (!player) return
    player.stop()
    player.dispose()
    diagnosticTonePlayerRef.current = null
  }, [])

  useEffect(() => {
    const activePack = AUDIO_PACKS[activePackId]
    console.log('[audio pack] active', {
      id: activePack.id,
      name: activePack.name,
      padsLoaded: packPadCount(activePackId),
      generatedPads: activePack.pads.length,
      generatedAudioFiles: Object.keys(activePack.audioUrls).length,
    })

    if (CURATED_PACK_IDS.has(activePackId)) {
      console.log('[curated pack] active', {
        packId: activePack.id,
        files: activePack.pads.map((pad) => pad.audioFile),
      })
    }

    // Use the ref (not reactive `volume`) so slider moves never re-run this
    // expensive effect. The volume useEffect below keeps players in sync.
    const currentVol = volumeRef.current
    ALL_PADS.forEach((pad) => {
      const previewPlayer = createTonePlayer(pad, currentVol, false, activePackId)
      if (previewPlayer) previewRef.current.players[pad.id] = previewPlayer
    })

    Tone.loaded().then(() => {
      console.log('[audio] all files loaded', {
        count: Object.keys(previewRef.current.players).length,
      })
    })

    return () => {
      Object.values(previewRef.current.players).forEach((player) => player?.dispose())
      previewRef.current.players = {}
      clearDiagnosticNativeTest()
      clearDiagnosticToneTest()
    }
    // volume intentionally excluded: slider moves must NOT recreate Tone players.
    // The separate volume useEffect keeps player.volume.value in sync via ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePackId, clearDiagnosticNativeTest, clearDiagnosticToneTest])

  useEffect(() => {
    // HTMLAudioElement volumes are written directly in handleVolumeChange (RAF-throttled).
    // This effect only keeps Tone.js preview players in sync with the committed state value.
    const db = volumeDb(volume)
    Object.values(previewRef.current.players).forEach((player) => {
      if (player) player.volume.value = db
    })
  }, [volume])

  /** Cancel all scheduled replay timeouts and mark replay as inactive. */
  const clearReplayTimers = useCallback(() => {
    replayTimeoutsRef.current.forEach((id) => window.clearTimeout(id))
    replayTimeoutsRef.current = []
    isReplayingMixRef.current = false
    setIsReplayingMix(false)
  }, [])

  useEffect(() => {
    return () => {
      clearMasterCycle()
      clearAllAssignedDebugIntervals()
      // Cancel replay events on unmount so stale timeouts can't fire
      replayTimeoutsRef.current.forEach((id) => window.clearTimeout(id))
      replayTimeoutsRef.current = []
      // Cancel any pending volume RAF
      if (volumeRafRef.current !== null) cancelAnimationFrame(volumeRafRef.current)
      // Close the shared Web Audio context
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        void audioCtxRef.current.close()
      }
    }
  }, [clearAllAssignedDebugIntervals, clearMasterCycle])

  /**
   * Effective volume for a slot = master volume × per-pad multiplier × category gain.
   * Falls back to 1.0 for missing multipliers (preserves existing pack behaviour).
   * Category gain provides subtle attenuation when many same-type layers are active.
   * categoryGainRef is keyed by slot index and refreshed whenever slots change.
   */
  const padEffVol = useCallback((slotIndex: number): number => {
    const master = normalizedVolume(volumeRef.current)
    const padVol = padVolumeRef.current.get(slotIndex) ?? 1.0
    const categoryGain = categoryGainRef.current.get(slotIndex) ?? 1.0
    const result = master * padVol * categoryGain
    // Soft ceiling 0.95 — prevents any single element from hitting digital full-scale
    // into the compressor input, preserving headroom across a full 7-performer stack.
    return Math.max(0, Math.min(0.95, isFinite(result) ? result : 0))
  }, [])

  /** Dev-only report: loop mode, duration drift, manual-restart status per slot. */
  const logAssignedAudioDiagnostics = useCallback(() => {
    if (!import.meta.env.DEV) return
    const rows: Array<Record<string, unknown>> = []
    assignedAudioRef.current.forEach((audio, slot) => {
      const isOneShot = padOneShotRef.current.get(slot) ?? false
      const padId = slots[slot]
      const pad = padId ? PAD_BY_ID[padId] : undefined
      const packPad = pad ? packPadForGamePad(pad, AUDIO_PACKS[activePackId]) : undefined
      const bpm = packPad?.bpm ?? null
      const bars = packPad?.bars ?? null
      const actual = audio.duration > 0 ? audio.duration : null
      let driftPct: string | null = null
      if (bpm && bars && actual) {
        const expected = (60 / bpm) * 4 * bars
        driftPct = `${((Math.abs(actual - expected) / expected) * 100).toFixed(2)}%`
      }
      rows.push({
        slot,
        padId: padId ?? '—',
        mode: isOneShot ? 'one-shot' : 'native-loop',
        nativeLoop: !isOneShot,
        manualCycleRestart: false,
        paused: audio.paused,
        duration: actual?.toFixed(3) ?? '—',
        drift: driftPct ?? '—',
      })
    })
    console.log('[loop-diagnostics] assigned audio report (native loop — no manual cycle restart)')
    if (rows.length > 0) console.table(rows)
    else console.log('[loop-diagnostics] no assigned audio')
  }, [slots, activePackId])

  /**
   * DEV-only master transport report. Reports the always-running pool state and a
   * pure drift read-out (expected loop position vs actual audio.currentTime) for
   * every pool pad. This is observe-only — there is NO automatic phase correction.
   */
  const logGlobalTransportDiagnostics = useCallback(() => {
    if (!import.meta.env.DEV) return
    if (packTransportRef.current.size === 0) return
    const pack = AUDIO_PACKS[activePackId]
    const elapsedMs =
      musicalClockRef.current.originMs > 0
        ? performance.now() - musicalClockRef.current.originMs
        : 0
    let runningCount = 0
    const rows: Array<Record<string, unknown>> = []
    packTransportRef.current.forEach((audio, padId) => {
      if (!audio.paused) runningCount += 1
      const pad = PAD_BY_ID[padId]
      const packPad = pad ? packPadForGamePad(pad, pack) : undefined
      const dur = audio.duration > 0 ? audio.duration : null
      let expectedPos: number | null = null
      let driftMs: string | null = null
      if (dur) {
        expectedPos = (elapsedMs / 1000) % dur
        driftMs = `${(Math.abs(audio.currentTime - expectedPos) * 1000).toFixed(0)}ms`
      }
      rows.push({
        padId,
        cat: packPad?.category ?? pad?.category ?? '—',
        running: !audio.paused,
        currentTime: dur ? audio.currentTime.toFixed(3) : '—',
        expected: expectedPos !== null ? expectedPos.toFixed(3) : '—',
        drift: driftMs ?? '—',
      })
    })
    console.log('[global-transport] sync report (drift = |actual − expected|, observe-only)', {
      pack: pack.id,
      loadedPads: packTransportRef.current.size,
      runningLoops: runningCount,
      assignedSlots: assignedAudioRef.current.size,
      mutedSlots: mutedSlotsRef.current.size,
      masterPaused: masterMutedRef.current,
      clockElapsedMs: Math.round(elapsedMs),
    })
    if (rows.length > 0) console.table(rows)
  }, [activePackId])

  /**
   * DEV-only: snapshot the full runtime audio state for stability diagnostics.
   * Logs active pad count, effective volume per slot, AudioContext state,
   * compressor reduction, and flags any invalid or overloaded values.
   * Called at session start and from the DEV button for on-demand inspection.
   */
  const logFullMixDiagnostics = useCallback(() => {
    if (!import.meta.env.DEV) return

    const ctxState   = audioCtxRef.current?.state ?? 'none'
    const padCount   = assignedAudioRef.current.size
    const master     = normalizedVolume(volumeRef.current)
    const rows: Array<Record<string, unknown>> = []
    let overloadCount = 0
    let dropoutCount  = 0
    let nanCount      = 0
    let hardSnapCount = 0

    assignedAudioRef.current.forEach((audio, slot) => {
      const padVol      = padVolumeRef.current.get(slot) ?? 1.0
      const catGain     = categoryGainRef.current.get(slot) ?? 1.0
      const eff         = master * padVol * catGain
      const clamped     = Math.max(0, Math.min(0.95, isFinite(eff) ? eff : 0))
      const isOverload  = eff > 0.95
      const isNaN_      = !isFinite(eff)
      const isOneShot_  = padOneShotRef.current.get(slot) ?? false
      const isMuted_    = mutedSlotsRef.current.has(slot)
      // Dropout: non-muted, non-one-shot, playing loop has near-zero actual volume
      const isDropout   = !isMuted_ && !isOneShot_ && !audio.paused && audio.volume < 0.01
      const isBoundaryRisk =
        audio.duration > 0 &&
        (audio.currentTime < 0.3 || audio.currentTime > audio.duration - 0.3)

      if (isOverload) overloadCount++
      if (isNaN_) nanCount++
      if (isDropout) dropoutCount++

      rows.push({
        slot,
        master:    master.toFixed(3),
        padVol:    padVol.toFixed(3),
        catGain:   catGain.toFixed(3),
        effRaw:    eff.toFixed(3),
        effClamped: clamped.toFixed(3),
        actual:    audio.volume.toFixed(3),
        paused:    audio.paused,
        rate:      audio.playbackRate.toFixed(3),
        ctTime:    audio.currentTime.toFixed(2),
        dur:       audio.duration?.toFixed(2) ?? '—',
        boundary:  isBoundaryRisk ? 'NEAR' : '—',
        flags:     [
          isOverload  && 'OVERLOAD',
          isNaN_      && 'NAN',
          isDropout   && 'DROPOUT',
        ].filter(Boolean).join(' ') || 'ok',
      })
    })

    console.group('[mix-diag] full-mix stability snapshot')
    console.log(
      `pads: ${padCount} | masterVol: ${volumeRef.current} | ctxState: ${ctxState}`,
      `| overload: ${overloadCount} | nan: ${nanCount} | dropout: ${dropoutCount} | hardSnap: ${hardSnapCount}`,
    )
    if (masterCompressorRef.current) {
      const c = masterCompressorRef.current
      console.log('compressor:', {
        threshold: c.threshold.value,
        knee:      c.knee.value,
        ratio:     c.ratio.value,
        attack:    c.attack.value.toFixed(3),
        release:   c.release.value.toFixed(3),
        reduction: c.reduction.toFixed(2) + ' dB',
      })
    }
    if (ctxState === 'suspended') {
      console.warn('[mix-diag] AudioContext is SUSPENDED — audio will be silent until resumed')
    }
    if (overloadCount > 0) {
      console.warn(`[mix-diag] ${overloadCount} pad(s) computed eff > 0.95 — check gain staging`)
    }
    if (nanCount > 0) {
      console.error(`[mix-diag] ${nanCount} pad(s) have NaN effective volume — gain chain broken`)
    }
    if (dropoutCount > 0) {
      console.error(
        `[mix-diag] ${dropoutCount} non-muted loop pad(s) have actual volume < 0.01 — potential dropout`,
      )
    }
    if (rows.length > 0) console.table(rows)
    console.groupEnd()
  }, [])

  // ── GLOBAL ALWAYS-RUNNING TRANSPORT ─────────────────────────────────────────
  // The old per-slot starters (startAssignedSlotAudio / startAllAssignedAudio)
  // reset audio.currentTime to 0 and called play() every time a pad was assigned,
  // which is what let loops drift out of phase. They are replaced by the pack
  // transport pool (buildPackTransport + startGlobalTransport, declared after
  // ensureAudioCtx): every loop starts once at a shared origin and assignment only
  // adjusts gain.

  /**
   * Master clock heartbeat — keeps masterCycleIntervalRef alive as a session-active
   * signal for createAssignedAudio's quantize-vs-start decision.
   *
   * IMPORTANT: do NOT reset originMs here. The clock origin is anchored once at
   * startOrRestartLoops() time and must remain fixed for the life of the session.
   * Re-anchoring at a non-bar-aligned interval (MASTER_LOOP_MS = 9600 ms, which is
   * not a multiple of any audio loop length) shifts msUntilNextBoundary calculations
   * away from true beat positions, causing new pads to start at the wrong beat/bar.
   */
  const tickMasterClock = useCallback(() => {
    if (import.meta.env.DEV) {
      console.debug('[master] clock heartbeat — origin preserved', {
        originMs: musicalClockRef.current.originMs,
        elapsedMs: Math.round(performance.now() - musicalClockRef.current.originMs),
      })
    }
    // ── AudioContext heartbeat guard ─────────────────────────────────────────
    // Backup for the onstatechange handler: catches any suspension that the
    // event listener misses (e.g. browser-specific autoplay policy enforcement
    // that fires between onstatechange and the next user gesture).
    if (
      audioCtxRef.current &&
      audioCtxRef.current.state === 'suspended' &&
      isPlayingRef.current &&
      !masterMutedRef.current
    ) {
      void audioCtxRef.current.resume().catch(() => undefined)
    }
  }, [])

  /**
   * Phase correction stub — disabled in the recovery build.
   * playbackRate nudges and audio.currentTime hard-snaps during playback were
   * the primary source of CPU heat and audible clicks under 7-pad load.
   * Pre-aligned 128 BPM PCM WAV loops stay in sync via native browser looping
   * without any runtime correction.  The ref + clearInterval machinery in
   * clearMasterCycle is kept as a safety net in case it is re-enabled.
   */
  const runPhaseCorrectionPass = useCallback(() => { /* disabled */ }, [])

  const startOrRestartLoops = useCallback(() => {
    clearMasterCycle()
    quantizeTimersRef.current.forEach((id) => window.clearTimeout(id))
    quantizeTimersRef.current.clear()
    musicalClockRef.current = { ...musicalClockRef.current, originMs: performance.now() }
    isPlayingRef.current = true
    setIsPlaying(true)
    setTransportStatus(masterMutedRef.current ? 'Paused' : 'Playing')
    // GLOBAL TRANSPORT: reset every pack loop to bar 1 / beat 1 and start them all
    // in one synchronized batch at volume 0, then reveal the assigned slots.
    // Native audio.loop handles seamless repetition; nothing is restarted afterwards.
    startGlobalTransportRef.current()
    // Heartbeat: keeps masterCycleIntervalRef non-null as the session-active signal
    masterCycleIntervalRef.current = window.setInterval(tickMasterClock, MASTER_LOOP_MS)
    // Schedule lightweight bar-boundary resync from this fresh transport origin.
    scheduleResyncRef.current()
    // Phase correction disabled: writing playbackRate (0.98/1.02) and hard-snapping
    // audio.currentTime mid-playback both cause audible clicks and trigger the browser's
    // real-time pitch-shift DSP on all 7 active elements — the primary source of CPU heat
    // and audio instability.  Delta Pack files are PCM WAV loops pre-aligned to 128 BPM;
    // native browser looping (audio.loop=true) keeps them in sync without correction.
    // phaseCorrectionIntervalRef.current = window.setInterval(
    //   runPhaseCorrectionPass,
    //   PHASE_CORRECTION_INTERVAL_MS,
    // )
    // DEV-only: silent-pad dropout watcher + performance panel updater
    if (import.meta.env.DEV) {
      devPerfStatsRef.current = { softCorrections: 0, hardSnaps: 0, intervalStart: performance.now() }
      devDropoutWatcherRef.current = window.setInterval(() => {
        if (!isPlayingRef.current || masterMutedRef.current) return
        let dropoutFound = false
        assignedAudioRef.current.forEach((audio, slot) => {
          const isOneShot_ = padOneShotRef.current.get(slot) ?? false
          const isMuted_   = mutedSlotsRef.current.has(slot)
          if (!isMuted_ && !isOneShot_ && !audio.paused && audio.volume < 0.01) {
            dropoutFound = true
            console.warn('[dropout-watch] slot', slot, 'has near-zero volume while playing', {
              volume: audio.volume,
              paused: audio.paused,
              currentTime: audio.currentTime.toFixed(3),
              duration: audio.duration.toFixed(3),
              ctxState: audioCtxRef.current?.state ?? 'none',
            })
          }
        })
        // Update the DEV perf panel every 5s
        const stats = devPerfStatsRef.current
        const elapsedS = (performance.now() - stats.intervalStart) / 1000
        setDevPerfPanel({
          activePads: assignedAudioRef.current.size,
          nodes: packTransportRef.current.size,
          softCorr: Math.round(stats.softCorrections / Math.max(elapsedS, 1) * 10),
          hardSnaps: stats.hardSnaps,
          ctxState: audioCtxRef.current?.state ?? 'none',
          nextResyncS: Math.max(0, Math.round((resyncStatsRef.current.nextResyncAt - performance.now()) / 1000)),
          lastDriftMs: resyncStatsRef.current.lastMaxDriftMs,
          lastCorrected: resyncStatsRef.current.lastCorrectedCount,
          resyncs: resyncStatsRef.current.totalResyncs,
        })
        devPerfStatsRef.current = { softCorrections: 0, hardSnaps: 0, intervalStart: performance.now() }
        if (dropoutFound && import.meta.env.DEV) {
          console.warn('[dropout-watch] dropout detected — see above')
        }
        // Global transport sync report (drift only — no automatic correction).
        logGlobalTransportDiagnostics()
      }, 5_000)
    }
    if (import.meta.env.DEV) {
      console.log('[master] session started', {
        loopMs: MASTER_LOOP_MS,
        phaseCorrectionMs: 'disabled',
        pads: assignedAudioRef.current.size,
      })
    }
    // DEV: print full gain-chain snapshot after all pads start
    if (import.meta.env.DEV) {
      // Small delay so audio elements have time to set their initial volumes
      window.setTimeout(logFullMixDiagnostics, 200)
    }
  }, [clearMasterCycle, tickMasterClock, runPhaseCorrectionPass, logFullMixDiagnostics, logGlobalTransportDiagnostics])

  /**
   * Lazily create a shared AudioContext + DynamicsCompressor chain.
   * Called inside user-gesture callbacks so browser autoplay policy is met.
   * Returns null if the Web Audio API is unavailable (logs a warning instead).
   */
  const ensureAudioCtx = useCallback((): {
    ctx: AudioContext
    compressor: DynamicsCompressorNode
    masterGain: GainNode
  } | null => {
    try {
      if (!audioCtxRef.current) {
        const ctx = new AudioContext()
        const comp = ctx.createDynamicsCompressor()

        // ── Compressor settings for full-mix stability ─────────────────────
        // Goal: transparent glue compression that prevents digital clipping
        // without pumping or breathing during normal multi-pad playback.
        //
        //   threshold=-12  Only engages on coincident peaks; pre-gain-staged
        //                  individual pad volumes (0.5–0.7) sit well below this
        //                  when summed across 5-7 sources.
        //   knee=30        Very soft knee — gradual onset, no hard clamping.
        //   ratio=2.0:1    Minimal gain reduction — ~2 dB GR at hard peaks.
        //   attack=10ms    Allows initial kick transient through for punch; compressor
        //                  then clamps gracefully. Raised from 5ms to reduce
        //                  audible transient smearing on simultaneous beat hits.
        //   release=400ms  At 128BPM (beat every 469ms), a 250ms release caused
        //                  rhythmic breathing — compressor partially recovered then
        //                  re-engaged on the next kick. 400ms keeps the compressor
        //                  in a near-steady-state during continuous percussion,
        //                  producing transparent glue rather than audible pumping.
        comp.threshold.setValueAtTime(-12, ctx.currentTime)
        comp.knee.setValueAtTime(30, ctx.currentTime)
        comp.ratio.setValueAtTime(2.0, ctx.currentTime)
        comp.attack.setValueAtTime(0.010, ctx.currentTime)
        comp.release.setValueAtTime(0.40, ctx.currentTime)
        // Pad voices → compressor → masterGain → destination.
        // masterGain is the pause/resume bus (1 = playing, 0 = paused).
        const masterGain = ctx.createGain()
        masterGain.gain.setValueAtTime(1, ctx.currentTime)
        comp.connect(masterGain)
        masterGain.connect(ctx.destination)
        audioCtxRef.current = ctx
        masterCompressorRef.current = comp
        masterGainNodeRef.current = masterGain

        // ── AudioContext auto-resume guard ─────────────────────────────────
        // Browsers auto-suspend the AudioContext after a period of no user
        // interaction (even during active playback).  Listening to onstatechange
        // lets us resume immediately rather than waiting for the next user event.
        ctx.onstatechange = () => {
          if (ctx.state === 'suspended' && isPlayingRef.current && !masterMutedRef.current) {
            void ctx.resume().catch((e) =>
              console.warn('[audio] ctx auto-resume failed', e),
            )
          }
          if (import.meta.env.DEV) {
            console.log('[audio] ctx state changed →', ctx.state)
          }
        }

        if (import.meta.env.DEV) {
          console.log('[audio] compressor chain created', {
            threshold: -12, knee: 30, ratio: 2.0, attack: 0.010, release: 0.40,
          })
        }
      }
      return {
        ctx: audioCtxRef.current,
        compressor: masterCompressorRef.current!,
        masterGain: masterGainNodeRef.current!,
      }
    } catch (e) {
      console.warn('[audio] AudioContext unavailable — running without compressor', e)
      return null
    }
  }, [])

  // ── SAMPLE-ACCURATE WEB AUDIO TRANSPORT POOL ────────────────────────────────

  /**
   * Tear down the entire transport pool. Stops every looping source, disconnects
   * each voice's GainNode, and drops decoded buffers. assignedAudioRef references
   * become dead afterwards, so callers must clear it too.
   */
  const disposePackTransport = useCallback(() => {
    packTransportRef.current.forEach((voice) => {
      cancelGainRamp(voice)
      voice.dispose()
    })
    packTransportRef.current.clear()
    audioBuffersRef.current.clear()
    packTransportPackIdRef.current = null
    packTransportBuildRef.current = null
  }, [])

  /**
   * Stop every looping source (keeps decoded buffers + GainNodes loaded) so the
   * idle pool consumes no audio-thread time. Used when the stage empties; the
   * next start recreates the sources from bar 1 in sync.
   */
  const pausePackTransport = useCallback(() => {
    packTransportRef.current.forEach((voice) => {
      cancelGainRamp(voice)
      voice.volume = 0
      voice.stop()
    })
  }, [])

  /**
   * Build the transport pool for a pack: decode every game pad's WAV into an
   * AudioBuffer, create one persistent GainNode per pad routed through the master
   * compressor, and wrap them in BufferVoices (sources are started later by the
   * global transport). Idempotent — concurrent callers await the same in-flight
   * build. Switching packs disposes the previous pool first.
   */
  const buildPackTransport = useCallback(
    async (packId: ActivePackId): Promise<void> => {
      if (packTransportPackIdRef.current === packId && packTransportRef.current.size > 0) {
        if (packTransportBuildRef.current) await packTransportBuildRef.current
        return
      }
      // Different pack already loaded → tear it down before building the new one.
      if (packTransportPackIdRef.current !== null && packTransportPackIdRef.current !== packId) {
        disposePackTransport()
        assignedAudioRef.current.clear()
      }
      packTransportPackIdRef.current = packId

      const build = (async () => {
        const pack = AUDIO_PACKS[packId]
        const ac = ensureAudioCtx()
        if (!ac) {
          console.warn('[web-audio] AudioContext unavailable — cannot build buffer engine')
          return
        }
        if (ac.ctx.state === 'suspended') {
          try { await ac.ctx.resume() } catch { /* resumed on next gesture */ }
        }
        const loadWaits: Promise<void>[] = []
        ALL_PADS.forEach((pad) => {
          if (packTransportRef.current.has(pad.id)) return
          const url = resolveAudioSrc(pad, packId)
          if (!url) return
          const packPad = packPadForGamePad(pad, pack)
          const isOneShot = packPad?.playbackMode === 'one-shot'
          loadWaits.push(
            (async () => {
              try {
                const resp = await fetch(url)
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
                const arr = await resp.arrayBuffer()
                const buffer = await ac.ctx.decodeAudioData(arr)
                // Skip if a concurrent build already populated this pad.
                if (packTransportRef.current.has(pad.id)) return
                const gainNode = ac.ctx.createGain()
                gainNode.gain.value = 0
                gainNode.connect(ac.compressor)
                const voice = new BufferVoice(ac.ctx, buffer, gainNode, !isOneShot, url)
                voice.onerror = (e) => console.warn('[web-audio] source start failed', pad.id, e)
                audioBuffersRef.current.set(pad.id, buffer)
                packTransportRef.current.set(pad.id, voice)
                if (import.meta.env.DEV && !isOneShot && buffer.duration > 0) {
                  validateLoopTiming(pad.id, buffer.duration, packPad?.bpm ?? null, packPad?.bars ?? null)
                }
              } catch (error) {
                // FALLBACK (#6): a failed buffer decode is loud in DEV so the pad
                // can be re-encoded; in prod the pad is simply silent rather than
                // crashing the whole mix.
                console.warn('[web-audio] buffer load/decode FAILED — pad will be silent', {
                  padId: pad.id,
                  packId,
                  url,
                  error,
                })
              }
            })(),
          )
        })
        await Promise.all(loadWaits)
        if (import.meta.env.DEV) {
          console.log('[web-audio] buffer pool built', {
            pack: packId,
            voices: packTransportRef.current.size,
            buffers: audioBuffersRef.current.size,
          })
        }
      })()

      packTransportBuildRef.current = build
      try {
        await build
      } finally {
        if (packTransportBuildRef.current === build) packTransportBuildRef.current = null
      }
    },
    [ensureAudioCtx, disposePackTransport],
  )

  /**
   * Start (or restart) the whole pool in one sample-locked batch. A single
   * AudioContext start time is captured and EVERY loop voice's source is
   * (re)created and scheduled to begin at that exact instant from buffer offset
   * 0 — so all loops are phase-aligned to bar 1 / beat 1 on the audio clock and
   * never drift. Currently-assigned, non-muted slots are then revealed with a
   * gain ramp; one-shot pads fire once on reveal only.
   */
  const startGlobalTransport = useCallback(() => {
    const ac = ensureAudioCtx()
    if (!ac) return
    if (ac.ctx.state === 'suspended') {
      void ac.ctx.resume().catch(() => undefined)
    }
    // Make sure the pause bus is open whenever the transport (re)starts.
    masterGainNodeRef.current?.gain.setValueAtTime(
      masterMutedRef.current ? 0 : 1,
      ac.ctx.currentTime,
    )
    // One shared start instant (small lookahead so every source is scheduled
    // before the clock reaches it → truly simultaneous, sample-accurate).
    const startAt = ac.ctx.currentTime + 0.08
    // Re-anchor the musical clock to when audio actually begins (for the overlay).
    musicalClockRef.current = {
      ...musicalClockRef.current,
      originMs: performance.now() + 80,
    }
    // Phase 1 — (re)create + schedule every loop source at the shared instant.
    packTransportRef.current.forEach((voice) => {
      cancelGainRamp(voice)
      voice.volume = 0
      if (voice.loop) {
        voice.startAt(startAt, 0)
      } else {
        voice.stop()
      }
    })
    // Phase 2 — reveal assigned, non-muted slots.
    assignedAudioRef.current.forEach((voice, slot) => {
      const slotMuted = mutedSlotsRef.current.has(slot) || masterMutedRef.current
      const isOneShot = padOneShotRef.current.get(slot) ?? false
      if (slotMuted) {
        voice.volume = 0
        return
      }
      if (isOneShot) {
        // One-shot: fire once from the top, aligned to the shared start instant.
        voice.startAt(startAt, 0)
      }
      scheduleGainRamp(voice, padEffVol(slot))
    })
    logAssignedAudioDiagnostics()
  }, [ensureAudioCtx, padEffVol, logAssignedAudioDiagnostics])
  // Keep the indirection ref current so the earlier-declared startOrRestartLoops
  // can invoke the pool starter without a forward-reference dependency.
  startGlobalTransportRef.current = startGlobalTransport

  // ── DRIFT MONITOR (DEV observe-only) ────────────────────────────────────────
  // The sample-accurate buffer engine cannot drift, so the old corrective
  // bar-boundary resync has been REMOVED. What remains is a DEV-only observer
  // that, once per 16-bar phrase, measures each loop voice's position against
  // its mathematically-expected position and reports the max drift — proof that
  // the engine stays locked. It NEVER seeks, mutes, or alters playback, and it
  // does not run at all in production builds.
  const MONITOR_BARS = 16

  /** 16-bar monitor period (ms) for the active pack, from its nominal BPM. */
  const getResyncMs = useCallback((): number => {
    const pack = AUDIO_PACKS[activePackId]
    const bpm = pack?.pads?.find((p) => typeof p.bpm === 'number' && p.bpm > 0)?.bpm ?? 128
    const barMs = (60 / bpm) * 4 * 1000
    return barMs * MONITOR_BARS
  }, [activePackId])

  /** Observe-only: measure max loop drift across the pool and log it. No edits. */
  const runBarBoundaryResync = useCallback(() => {
    if (!isPlayingRef.current || masterMutedRef.current) return
    const origin = musicalClockRef.current.originMs
    if (origin <= 0) return
    const elapsedMs = performance.now() - origin
    let maxDriftMs = 0
    packTransportRef.current.forEach((voice) => {
      if (voice.paused || !voice.loop) return
      const dur = voice.duration
      if (!(dur > 0) || !isFinite(dur)) return
      const loopMs = dur * 1000
      const expected = (elapsedMs % loopMs) / 1000
      let drift = Math.abs(voice.currentTime - expected)
      drift = Math.min(drift, dur - drift)
      const driftMs = drift * 1000
      if (driftMs > maxDriftMs) maxDriftMs = driftMs
    })
    const stats = resyncStatsRef.current
    stats.lastResyncAt = performance.now()
    stats.lastMaxDriftMs = Math.round(maxDriftMs)
    stats.lastCorrectedCount = 0
    stats.totalResyncs += 1
    if (import.meta.env.DEV) {
      console.log('[drift-monitor] phrase boundary', {
        maxDriftMs: Math.round(maxDriftMs),
        elapsedMs: Math.round(elapsedMs),
      })
    }
  }, [])

  /**
   * (Re)schedule the DEV drift monitor on 16-bar boundaries. No-ops in
   * production (the buffer engine cannot drift, so there is nothing to watch).
   * Clears existing timers first so pause/resume and restarts never duplicate.
   */
  const scheduleResync = useCallback(() => {
    if (resyncTimeoutRef.current !== null) {
      window.clearTimeout(resyncTimeoutRef.current)
      resyncTimeoutRef.current = null
    }
    if (resyncIntervalRef.current !== null) {
      window.clearInterval(resyncIntervalRef.current)
      resyncIntervalRef.current = null
    }
    if (!import.meta.env.DEV) return
    const resyncMs = getResyncMs()
    if (!(resyncMs > 0) || !isFinite(resyncMs)) return
    const origin = musicalClockRef.current.originMs
    const elapsed = origin > 0 ? performance.now() - origin : 0
    const intoPhrase = ((elapsed % resyncMs) + resyncMs) % resyncMs
    const msUntilNext = Math.max(50, resyncMs - intoPhrase)
    resyncStatsRef.current.nextResyncAt = performance.now() + msUntilNext
    resyncTimeoutRef.current = window.setTimeout(() => {
      resyncTimeoutRef.current = null
      runBarBoundaryResync()
      resyncStatsRef.current.nextResyncAt = performance.now() + resyncMs
      resyncIntervalRef.current = window.setInterval(() => {
        runBarBoundaryResync()
        resyncStatsRef.current.nextResyncAt = performance.now() + resyncMs
      }, resyncMs)
    }, msUntilNext)
    console.log('[drift-monitor] scheduled', { resyncMs: Math.round(resyncMs), firstInMs: Math.round(msUntilNext) })
  }, [getResyncMs, runBarBoundaryResync])
  scheduleResyncRef.current = scheduleResync

  /**
   * Hide a slot. The pooled loop element is NOT stopped or destroyed — it keeps
   * running silently so its phase stays locked for a later re-assignment. We only
   * fade its gain to 0 and drop the slot → element mapping + slot-keyed metadata.
   * One-shot pads (archived packs only) are paused since they never run silently.
   */
  const disposeAssignedAudio = useCallback((slotIndex: number) => {
    const audio = assignedAudioRef.current.get(slotIndex)
    clearAssignedDebugInterval(slotIndex)
    // Cancel any legacy pending quantize start timer for this slot.
    const qTimer = quantizeTimersRef.current.get(slotIndex)
    if (qTimer !== undefined) {
      window.clearTimeout(qTimer)
      quantizeTimersRef.current.delete(slotIndex)
    }
    if (audio) {
      cancelGainRamp(audio)
      const isOneShot = padOneShotRef.current.get(slotIndex) ?? false
      if (isOneShot) {
        // One-shots are not part of the running pool — silence + stop the source.
        audio.volume = 0
        audio.stop()
      } else {
        // Loop pad: keep its source running silently in the pool, just fade out.
        audio.volume = 0
      }
    }
    assignedAudioRef.current.delete(slotIndex)
    padVolumeRef.current.delete(slotIndex)
    padOneShotRef.current.delete(slotIndex)
    slotLastPlayTimeRef.current.delete(slotIndex)
    if (import.meta.env.DEV) {
      console.log('[transport] slot hidden (pool loop kept alive)', {
        slot: slotIndex,
        assignedSlots: assignedAudioRef.current.size,
      })
    }
  }, [clearAssignedDebugInterval])

  /**
   * Assign a pad to a slot under the GLOBAL TRANSPORT model.
   *
   * This NEVER creates a new audio element and NEVER resets currentTime. It maps
   * the slot to the pad's already-running pool element and reveals it with a gain
   * ramp (the loop is already in phase because the whole pool started together).
   *
   *  - deferPlayback: just build the pool + register the mapping silently (used
   *    by replay/shared-mix hydration before the transport starts).
   *  - no active session: start the global transport, which plays every pool loop
   *    and reveals this freshly-mapped slot.
   *  - active session: ramp this slot's pool element up — no play()-from-zero.
   */
  const createAssignedAudio = useCallback(
    async (
      pad: PadDefinition,
      slotIndex: number,
      options?: { deferPlayback?: boolean },
    ): Promise<boolean> => {
      // Build (or reuse) the pack's transport pool, then grab this pad's voice.
      await buildPackTransport(activePackId)
      const audio = packTransportRef.current.get(pad.id)
      if (!audio) {
        console.warn('[transport] assign skipped — pool voice missing', {
          slot: slotIndex,
          padId: pad.id,
          packId: activePackId,
        })
        return false
      }

      const packPad = packPadForGamePad(pad, AUDIO_PACKS[activePackId])
      const padVol = packPad?.volume ?? 1.0
      const isOneShot = packPad?.playbackMode === 'one-shot'

      // If this slot already holds a DIFFERENT pool element, hide that one first.
      const existing = assignedAudioRef.current.get(slotIndex)
      if (existing && existing !== audio) disposeAssignedAudio(slotIndex)

      padVolumeRef.current.set(slotIndex, padVol)
      padOneShotRef.current.set(slotIndex, isOneShot)
      assignedAudioRef.current.set(slotIndex, audio)

      if (pad.id === 'beat-0') setAssignedBeatOneUrl(audio.src)

      if (import.meta.env.DEV) {
        console.log('[transport] slot mapped → pool element', {
          slot: slotIndex,
          padId: pad.id,
          padVol,
          isOneShot,
          running: !audio.paused,
        })
      }

      if (options?.deferPlayback) return true

      const slotMuted = mutedSlotsRef.current.has(slotIndex) || masterMutedRef.current

      if (masterCycleIntervalRef.current === null || !isPlayingRef.current) {
        // No active session yet — start the whole pool in one synchronized batch.
        startOrRestartLoops()
      } else if (slotMuted) {
        audio.volume = 0
      } else if (isOneShot) {
        // One-shot reveal (archived packs only): fire once, no retrigger timer.
        audio.startAt(audio.ctx.currentTime + 0.02, 0)
        scheduleGainRamp(audio, padEffVol(slotIndex))
      } else {
        // Loop pad — already running in phase. Reveal with a gain ramp only.
        scheduleGainRamp(audio, padEffVol(slotIndex))
      }
      return true
    },
    [activePackId, buildPackTransport, disposeAssignedAudio, startOrRestartLoops, padEffVol],
  )

  const ensureAssignedAudioForSlots = useCallback(
    async (slotList: (string | null)[]) => {
      for (let i = 0; i < slotList.length; i += 1) {
        const padId = slotList[i]
        if (!padId || assignedAudioRef.current.has(i)) continue
        const pad = PAD_BY_ID[padId]
        if (!pad) continue
        await createAssignedAudio(pad, i, { deferPlayback: true })
      }
    },
    [createAssignedAudio],
  )

  const assignPadToSlot = useCallback(async (padId: string, slotIndex: number) => {
    const pad = PAD_BY_ID[padId]
    if (!pad) return

    const next = [...slots]
    const clearedSlots: number[] = []
    for (let i = 0; i < next.length; i += 1) {
      if (next[i] === padId || i === slotIndex) {
        next[i] = null
        clearedSlots.push(i)
        disposeAssignedAudio(i)
      }
    }
    next[slotIndex] = padId
    const created = await createAssignedAudio(pad, slotIndex)
    if (!created) {
      next[slotIndex] = null
    }
    setSlots(next)
    setMutedSlots((prev) => {
      const next = new Set(prev)
      clearedSlots.forEach((clearedSlot) => next.delete(clearedSlot))
      mutedSlotsRef.current = next
      return next
    })
  }, [createAssignedAudio, disposeAssignedAudio, slots])

  const handlePadSelect = useCallback(
    (padId: string) => {
      const pad = PAD_BY_ID[padId]
      if (!pad) return
      setSelectedPadId(padId)
    },
    [],
  )

  const handleSlotClick = useCallback(
    async (index: number) => {
      if (slots[index]) {
        const currentlyMuted = mutedSlotsRef.current.has(index)
        const nowMuted = !currentlyMuted
        setMutedSlots((prev) => {
          const next = new Set(prev)
          if (nowMuted) next.add(index)
          else next.delete(index)
          mutedSlotsRef.current = next
          const audio = assignedAudioRef.current.get(index)
          if (audio) {
            const isOneShot = padOneShotRef.current.get(index) ?? false
            if (nowMuted) {
              audio.volume = 0
              // Keep loop pads running silently — preserves phase for gapless unmute
              if (isOneShot) audio.pause()
            } else if (!masterMutedRef.current) {
              if (!isOneShot && isPlayingRef.current && audio.paused) {
                void audio.play().catch((err) =>
                  console.warn('[assigned] unmute resume failed', { slot: index, err }),
                )
              }
              // Ramp from 0 → target to eliminate click on unmute
              scheduleGainRamp(audio, padEffVol(index), 60)
              if (import.meta.env.DEV) console.log('[assigned] unmuted', { slot: index })
            }
          }
          return next
        })
        recordEvent({ tp: 'sm', si: index, mu: nowMuted })
        return
      }
    },
    [slots, recordEvent, padEffVol],
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const padId = String(event.active.id)
      const pad = PAD_BY_ID[padId]
      const overId = event.over?.id
      if (!pad || !overId || typeof overId !== 'string' || !overId.startsWith('slot-')) return

      const index = Number.parseInt(overId.replace('slot-', ''), 10)
      if (Number.isNaN(index)) return
      if (slots[index]) return

      setAudioReady(true)
      setSelectedPadId(padId)
      await assignPadToSlot(padId, index)
      recordEvent({ tp: 'sa', si: index, pid: padId })
    },
    [assignPadToSlot, slots, recordEvent],
  )

  const removeFromSlot = useCallback((index: number) => {
    const hasRemainingAssigned = slots.some((slot, i) => i !== index && slot)
    disposeAssignedAudio(index)
    if (!hasRemainingAssigned) {
      clearMasterCycle()
      // Stage is empty — park the silent pool so its decoders stop consuming CPU.
      // It stays loaded; the next assignment restarts it from bar 1 in sync.
      pausePackTransport()
      isPlayingRef.current = false
      setIsPlaying(false)
      setTransportStatus('Stopped')
    }
    setSlots((prev) => {
      const next = [...prev]
      next[index] = null
      return next
    })
    setMutedSlots((prev) => {
      const next = new Set(prev)
      next.delete(index)
      mutedSlotsRef.current = next
      return next
    })
    recordEvent({ tp: 'sc', si: index })
  }, [clearMasterCycle, disposeAssignedAudio, pausePackTransport, slots, recordEvent])

  useEffect(() => {
    if (!shareMix || !stageEntered || sharedMixHydratedRef.current) return
    if (!shareMix.s.some(Boolean)) {
      sharedMixHydratedRef.current = true
      return
    }

    sharedMixHydratedRef.current = true
    console.log('[mix] restored visual state')
    console.log('[mix] waiting for user audio start')
    setMixToast('Mix restored — press Start Shared Mix to hear it')
    setSharedMixAwaitingAudio(true)

    void (async () => {
      for (let i = 0; i < shareMix.s.length; i += 1) {
        const padId = shareMix.s[i]
        if (!padId) continue
        const pad = PAD_BY_ID[padId]
        if (pad) await createAssignedAudio(pad, i, { deferPlayback: true })
      }
    })()
  }, [createAssignedAudio, shareMix, stageEntered])

  const handleStartSharedMix = useCallback(async () => {
    setAudioReady(true)
    try {
      await Tone.start()
    } catch (error) {
      console.warn('[mix] Tone.start failed', error)
    }

    for (let i = 0; i < slots.length; i += 1) {
      const padId = slots[i]
      if (!padId) continue
      const pad = PAD_BY_ID[padId]
      if (!pad) continue
      if (!assignedAudioRef.current.has(i)) {
        await createAssignedAudio(pad, i, { deferPlayback: true })
      }
    }

    assignedAudioRef.current.forEach((audio, slot) => {
      const slotMuted = mutedSlotsRef.current.has(slot)
      audio.volume = masterMutedRef.current || slotMuted ? 0 : padEffVol(slot)
    })

    if (shareMix?.play && !shareMix.pause) {
      startOrRestartLoops()
    } else if (shareMix?.play && shareMix.pause) {
      isPlayingRef.current = true
      setIsPlaying(true)
      setTransportStatus('Paused')
    } else {
      isPlayingRef.current = false
      setIsPlaying(false)
      setTransportStatus('Stopped')
    }

    setSharedMixAwaitingAudio(false)
    if (import.meta.env.DEV) console.log('[mix] shared audio started')
  }, [createAssignedAudio, shareMix, slots, startOrRestartLoops])

  const playAssignedAudioNow = useCallback(async () => {
    if (import.meta.env.DEV) console.log('[PLAY LOOPS] clicked')
    setAudioReady(true)
    try {
      await Tone.start()
    } catch (error) {
      console.warn('[PLAY LOOPS] Tone.start failed', error)
    }

    await ensureAssignedAudioForSlots(slots)

    if (assignedAudioRef.current.size === 0) {
      console.warn('[audio] play skipped — no assigned audio elements')
      setTransportStatus('Stopped')
      return
    }

    assignedAudioRef.current.forEach((audio, slot) => {
      const slotMuted = mutedSlotsRef.current.has(slot)
      audio.volume = masterMutedRef.current || slotMuted ? 0 : padEffVol(slot)
    })

    setSharedMixAwaitingAudio(false)
    startOrRestartLoops()
    recordEvent({ tp: 'pl', pl: true })
  }, [ensureAssignedAudioForSlots, slots, startOrRestartLoops, recordEvent])

  const toggleMasterMute = useCallback(() => {
    const nextMuted = !masterMutedRef.current
    masterMutedRef.current = nextMuted
    setMasterMuted(nextMuted)

    // ── PAUSE / RESUME via the master gain bus ──────────────────────────────────
    // The sample-accurate buffer engine keeps every looping source running on the
    // AudioContext clock; pause simply closes the master gain bus (and lets the
    // browser suspend the context to save CPU), resume re-opens it. Because no
    // source is ever stopped or reseeked, all loops are still perfectly in phase
    // on resume — the lowest-CPU, most stable option.
    const ctx = audioCtxRef.current
    const masterGain = masterGainNodeRef.current

    if (nextMuted) {
      // Close the bus with a short click-free ramp; freeze the DEV drift monitor.
      if (resyncTimeoutRef.current !== null) {
        window.clearTimeout(resyncTimeoutRef.current)
        resyncTimeoutRef.current = null
      }
      if (resyncIntervalRef.current !== null) {
        window.clearInterval(resyncIntervalRef.current)
        resyncIntervalRef.current = null
      }
      if (ctx && masterGain) {
        const now = ctx.currentTime
        masterGain.gain.cancelScheduledValues(now)
        masterGain.gain.setValueAtTime(masterGain.gain.value, now)
        masterGain.gain.linearRampToValueAtTime(0, now + 0.03)
      }
      if (import.meta.env.DEV) {
        console.log('[transport] PAUSE (master gain → 0, clock continues)', {
          poolVoices: packTransportRef.current.size,
          assignedSlots: assignedAudioRef.current.size,
          ctxState: ctx?.state ?? 'none',
        })
      }
    } else {
      // Wake the context if the browser suspended it, then re-open the bus.
      if (ctx?.state === 'suspended') {
        void ctx.resume().catch((err) =>
          console.warn('[transport] AudioContext resume failed', err),
        )
      }
      if (ctx && masterGain) {
        const now = ctx.currentTime
        masterGain.gain.cancelScheduledValues(now)
        masterGain.gain.setValueAtTime(masterGain.gain.value, now)
        masterGain.gain.linearRampToValueAtTime(1, now + 0.03)
      }
      // Restart the DEV drift monitor from the resumed timeline.
      scheduleResyncRef.current()
      if (import.meta.env.DEV) {
        console.log('[transport] RESUME (master gain → 1)', {
          poolVoices: packTransportRef.current.size,
          assignedSlots: assignedAudioRef.current.size,
          ctxState: ctx?.state ?? 'none',
        })
      }
    }

    setTransportStatus(nextMuted ? 'Paused' : (isPlayingRef.current ? 'Playing' : 'Stopped'))
    recordEvent({ tp: 'mm', mu: nextMuted })
  }, [recordEvent])

  const handleStopReset = useCallback(() => {
    if (import.meta.env.DEV) console.log('[audio] reset stopping all')
    // Cancel any in-progress replay first
    clearReplayTimers()
    clearMasterCycle()
    clearAllAssignedDebugIntervals()
    assignedAudioRef.current.clear()
    slotLastPlayTimeRef.current.clear()
    // Full stop also tears down the global transport pool so no silent decoders
    // keep running. The next play (or pack switch) rebuilds it fresh.
    disposePackTransport()
    if (import.meta.env.DEV) console.log('[transport] reset — pool disposed')
    masterMutedRef.current = false
    setMasterMuted(false)
    isPlayingRef.current = false
    setIsPlaying(false)
    setTransportStatus('Stopped')
    setSlots(Array(SLOT_COUNT).fill(null))
    mutedSlotsRef.current = new Set()
    setMutedSlots(new Set())
    setSelectedPadId(null)
    recordEvent({ tp: 'pl', pl: false })
  }, [clearAllAssignedDebugIntervals, clearMasterCycle, clearReplayTimers, disposePackTransport, recordEvent])

  const handlePackChange = useCallback(
    (packId: ActivePackId) => {
      handleStopReset()
      setActivePackId(packId)
      setDiagnosticNativeUrl('')
      setAssignedBeatOneUrl('')
      recordEvent({ tp: 'pk', pack: packId })
    },
    [handleStopReset, recordEvent],
  )

  /** Volume change handler — batches all writes to one RAF frame to prevent
   *  CPU spikes from rapid slider movement (was: synchronous writes on every
   *  mousemove event + a second write from useEffect([volume]) each RAF). */
  const handleVolumeChange = useCallback((vol: number) => {
    // 1. Clamp and store in ref immediately — padEffVol() reads this synchronously
    const clamped = Math.max(0, Math.min(100, isFinite(vol) ? vol : 0))
    volumeRef.current = clamped

    // 2. All DOM writes are deferred to the next animation frame so that rapid
    //    slider movement collapses into one write batch at ≤60 fps instead of
    //    firing 7 × N audio.volume writes per second during continuous drag.
    if (volumeRafRef.current !== null) cancelAnimationFrame(volumeRafRef.current)
    volumeRafRef.current = requestAnimationFrame(() => {
      volumeRafRef.current = null
      const latest = volumeRef.current
      const master = normalizedVolume(latest)
      const db = volumeDb(latest)

      // Update Tone.js preview players
      Object.values(previewRef.current.players).forEach((player) => {
        if (player) player.volume.value = db
      })

      // Update all live HTMLAudioElement volumes in one pass.
      // Skip elements with an active gain ramp — the ramp owns that element's
      // volume until it completes; writing here would cause a backwards dip.
      assignedAudioRef.current.forEach((audio, slot) => {
        if (isPlayingRef.current && !masterMutedRef.current && !mutedSlotsRef.current.has(slot)) {
          if (!isRampActive(audio)) {
            const padVol = padVolumeRef.current.get(slot) ?? 1.0
            const categoryGain = categoryGainRef.current.get(slot) ?? 1.0
            audio.volume = Math.max(0, Math.min(0.95, master * padVol * categoryGain))
          }
        }
      })

      // Commit React state and record timeline event
      setVolume(latest)
      recordEvent({ tp: 'vo', vol: latest })
    })
  }, [recordEvent])

  /** BPM change handler — updates state and records a timeline event. */
  const handleBpmChange = useCallback((rawBpm: number) => {
    const clamped = Math.min(180, Math.max(60, rawBpm || DEFAULT_BPM))
    setBpm(clamped)
    recordEvent({ tp: 'bp', bpm: clamped })
  }, [recordEvent])

  const handleTestNativeAudioLoop = useCallback(async () => {
    clearDiagnosticNativeTest()
    const beatOneUrl = resolveAudioSrc(PAD_BY_ID['beat-0'], activePackId)
    if (!beatOneUrl) return

    const audio = new Audio(beatOneUrl)
    setDiagnosticNativeUrl(audio.src)
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = normalizedVolume(volume)
    audio.onended = () => {
      console.log('[diagnostic] native ended fired', {
        currentTime: audio.currentTime,
        loop: audio.loop,
      })
    }
    audio.onerror = () => {
      console.error('[diagnostic] native error', audio.error)
    }
    audio.onloadedmetadata = () => {
      console.log('[diagnostic] native metadata', {
        url: audio.src,
        duration: audio.duration,
        loop: audio.loop,
        paused: audio.paused,
      })
    }
    audio.oncanplaythrough = () => {
      console.log('[diagnostic] native canplaythrough', {
        url: audio.src,
        duration: audio.duration,
        currentTime: audio.currentTime,
        loop: audio.loop,
        paused: audio.paused,
      })
    }

    diagnosticNativeAudioRef.current = audio
    await audio.play().catch((error) => {
      console.warn('[diagnostic] native play failed', error)
    })
    console.log('[diagnostic] native started', {
      url: audio.src,
      duration: audio.duration,
      currentTime: audio.currentTime,
      loop: audio.loop,
      paused: audio.paused,
    })
    diagnosticNativeIntervalRef.current = window.setInterval(() => {
      console.log('[diagnostic] native currentTime', {
        url: audio.src,
        currentTime: audio.currentTime,
        duration: audio.duration,
        loop: audio.loop,
        paused: audio.paused,
      })
    }, 1000)
  }, [activePackId, clearDiagnosticNativeTest, volume])

  const handleStopNativeAudioTest = useCallback(() => {
    clearDiagnosticNativeTest()
    console.log('[diagnostic] native stopped')
  }, [clearDiagnosticNativeTest])

  const handleTestTonePlayerLoop = useCallback(async () => {
    clearDiagnosticToneTest()
    const beatOneUrl = resolveAudioSrc(PAD_BY_ID['beat-0'], activePackId)
    if (!beatOneUrl) return

    await Tone.start()
    const context = Tone.getContext()
    await context.resume()
    console.log('[diagnostic] Tone context state', context.state)

    const player = new Tone.Player({
      url: beatOneUrl,
      loop: true,
      autostart: false,
      fadeIn: 0,
      fadeOut: 0,
    }).toDestination()
    player.volume.value = volumeDb(volume)
    diagnosticTonePlayerRef.current = player

    await Tone.loaded()
    player.start()
    diagnosticToneStartedAtRef.current = Tone.now()
    console.log('[diagnostic] Tone player started', {
      duration: player.buffer.duration,
      loop: player.loop,
      contextState: Tone.getContext().state,
    })
    diagnosticToneIntervalRef.current = window.setInterval(() => {
      const startedAt = diagnosticToneStartedAtRef.current
      const duration = player.buffer.duration || 0
      const estimatedCurrentTime =
        startedAt !== null && duration > 0 ? (Tone.now() - startedAt) % duration : 0
      console.log('[diagnostic] Tone player currentTime', {
        currentTime: estimatedCurrentTime,
        duration,
        loop: player.loop,
        state: player.state,
        contextState: Tone.getContext().state,
      })
    }, 2000)
  }, [activePackId, clearDiagnosticToneTest, volume])

  const handleStopToneTest = useCallback(() => {
    clearDiagnosticToneTest()
    console.log('[diagnostic] Tone stopped')
  }, [clearDiagnosticToneTest])

  /**
   * Keep applyTimelineEventRef.current up-to-date after every render so that
   * scheduled replay timeouts always call the freshest version of the function,
   * with the latest React state captured via closure.
   * (No dependency array = runs unconditionally after every render.)
   */
  useEffect(() => {
    applyTimelineEventRef.current = async (event: MixEvent) => {
      switch (event.tp) {
        case 'sa': {
          if (event.pid === undefined || event.si === undefined) break
          const pad = PAD_BY_ID[event.pid]
          if (!pad) break
          setSlots((prev) => {
            const next = [...prev]
            for (let i = 0; i < next.length; i++) {
              if (next[i] === event.pid && i !== event.si) next[i] = null
            }
            next[event.si!] = event.pid!
            return next
          })
          await createAssignedAudio(pad, event.si)
          break
        }
        case 'sc': {
          if (event.si !== undefined) removeFromSlot(event.si)
          break
        }
        case 'sm': {
          if (event.si === undefined || event.mu === undefined) break
          setMutedSlots((prev) => {
            const next = new Set(prev)
            if (event.mu) next.add(event.si!)
            else next.delete(event.si!)
            mutedSlotsRef.current = next
            const audio = assignedAudioRef.current.get(event.si!)
            if (audio) {
              const isOneShot = padOneShotRef.current.get(event.si!) ?? false
              if (event.mu || masterMutedRef.current) {
                audio.volume = 0
                if (isOneShot) audio.pause()
              } else {
                if (!isOneShot && isPlayingRef.current && audio.paused) {
                  void audio.play().catch(() => undefined)
                }
                audio.volume = padEffVol(event.si!)
              }
            }
            return next
          })
          break
        }
        case 'mm': {
          if (event.mu === undefined) break
          masterMutedRef.current = event.mu
          setMasterMuted(event.mu)
          assignedAudioRef.current.forEach((audio, slot) => {
            audio.volume = event.mu || mutedSlotsRef.current.has(slot) ? 0 : padEffVol(slot)
          })
          if (!event.mu && audioCtxRef.current?.state === 'suspended') {
            void audioCtxRef.current.resume().catch(() => undefined)
          }
          break
        }
        case 'pl': {
          if (event.pl) {
            startOrRestartLoops()
          } else {
            clearMasterCycle()
            isPlayingRef.current = false
            setIsPlaying(false)
            setTransportStatus('Stopped')
            assignedAudioRef.current.forEach((audio) => { audio.volume = 0 })
          }
          break
        }
        case 'vo': {
          if (event.vol !== undefined) {
            volumeRef.current = event.vol
            setVolume(event.vol)
          }
          break
        }
        case 'bp': {
          if (event.bpm !== undefined) setBpm(event.bpm)
          break
        }
        case 'pk': {
          if (event.pack) handlePackChange(toPlayablePackId(event.pack))
          break
        }
        default:
          break
      }
    }
  })

  /**
   * Immediately stop a replay in progress — stops audio, cancels all
   * scheduled timeline events, but preserves the current visual slot state
   * so the user can see where the recording left off.
   */
  const handleStopReplay = useCallback(() => {
    console.log('[mix-replay] stopping replay')
    clearReplayTimers()           // cancels all scheduled timeouts + sets isReplayingMix=false
    clearMasterCycle()            // stops the audio loop cycle
    clearAllAssignedDebugIntervals()
    // Silence audio without destroying the elements (visual state preserved)
    assignedAudioRef.current.forEach((audio) => {
      audio.volume = 0
      audio.pause()
    })
    isPlayingRef.current = false
    setIsPlaying(false)
    setTransportStatus('Stopped')
    setMixToast('Replay stopped')
  }, [clearReplayTimers, clearMasterCycle, clearAllAssignedDebugIntervals])

  /** Reset to recorded init state and replay the full timeline, stopping exactly at dur. */
  const handleReplayMix = useCallback(async () => {
    const mix = savedRecordedMix ?? sharedRecordedMix
    if (!mix) return

    const { init, ev, dur } = mix
    const initPack = toPlayablePackId(init.pack)

    // Guard against zero/invalid duration to avoid infinite playback
    if (typeof dur !== 'number' || !Number.isFinite(dur) || dur < 0) {
      console.warn('[mix-replay] invalid duration — aborting', dur)
      return
    }

    console.log('[mix-replay] starting replay', { events: ev.length, dur })

    // Cancel any existing replay
    clearReplayTimers()

    // ── 1. Stop all current audio + tear down the existing pool ────────────
    clearMasterCycle()
    clearAllAssignedDebugIntervals()
    assignedAudioRef.current.clear()
    disposePackTransport()

    // ── 2. Apply initial mix state ─────────────────────────────────────────
    masterMutedRef.current = init.pause
    setMasterMuted(init.pause)
    mutedSlotsRef.current = new Set(init.muted)
    setMutedSlots(new Set(init.muted))
    volumeRef.current = init.vol
    setVolume(init.vol)
    setBpm(init.bpm)
    setActivePackId(initPack)
    setSlots([...init.slots])
    isPlayingRef.current = false
    setIsPlaying(false)
    setTransportStatus('Stopped')
    isReplayingMixRef.current = true
    setIsReplayingMix(true)
    setMixToast('Replaying mix from the start…')

    // ── 3. Build the global transport pool for the recorded pack, then map the
    //        initial slots to their pooled elements (explicit pack — no stale
    //        closure on activePackId mid replay-init). ─────────────────────────
    await buildPackTransport(initPack)
    for (let i = 0; i < init.slots.length; i++) {
      const padId = init.slots[i]
      if (!padId) continue
      const pad = PAD_BY_ID[padId]
      if (!pad) continue
      const audio = packTransportRef.current.get(pad.id)
      if (!audio) {
        console.warn('[replay] pool voice missing', { slot: i, padId })
        continue
      }
      const replayPackPad = packPadForGamePad(pad, AUDIO_PACKS[initPack])
      padVolumeRef.current.set(i, replayPackPad?.volume ?? 1.0)
      padOneShotRef.current.set(i, replayPackPad?.playbackMode === 'one-shot')
      assignedAudioRef.current.set(i, audio)
    }

    // ── 4. Start playback if the recording began playing ───────────────────
    if (init.play && !init.pause && assignedAudioRef.current.size > 0) {
      startOrRestartLoops()
    }

    // ── 5. Schedule all timeline events ────────────────────────────────────
    for (const event of ev) {
      const id = window.setTimeout(() => {
        void applyTimelineEventRef.current(event)
      }, event.t)
      replayTimeoutsRef.current.push(id)
    }

    // ── 6. Schedule the definitive end-of-recording stop ──────────────────
    // This mirrors exactly what happened when the user pressed STOP SAVING.
    const stopId = window.setTimeout(() => {
      console.log('[mix-replay] auto-stop at dur', dur)
      clearMasterCycle()
      clearAllAssignedDebugIntervals()
      assignedAudioRef.current.forEach((audio) => {
        audio.volume = 0
        audio.pause()
      })
      isPlayingRef.current = false
      setIsPlaying(false)
      setTransportStatus('Stopped')
      isReplayingMixRef.current = false
      setIsReplayingMix(false)
      setMixToast('Replay complete')
    }, dur > 0 ? dur : 1)   // dur=0 is fine — fires almost immediately
    replayTimeoutsRef.current.push(stopId)

    console.log('[mix-replay] scheduled', { events: ev.length, dur })
  }, [
    savedRecordedMix,
    sharedRecordedMix,
    clearReplayTimers,
    clearMasterCycle,
    clearAllAssignedDebugIntervals,
    buildPackTransport,
    disposePackTransport,
    startOrRestartLoops,
  ])

  const filledCount = slots.filter(Boolean).length
  const usedPadIds = useMemo(() => new Set(slots.filter(Boolean) as string[]), [slots])
  // Pads actively playing (assigned + not muted + not master-muted + isPlaying)
  const performingPadIds = useMemo(() => {
    if (!isPlaying || masterMuted) return new Set<string>()
    return new Set(slots.filter((padId, i) => padId && !mutedSlots.has(i)) as string[])
  }, [isPlaying, masterMuted, slots, mutedSlots])
  const audioDebugUrlsMatch =
    Boolean(diagnosticNativeUrl && assignedBeatOneUrl) &&
    diagnosticNativeUrl === assignedBeatOneUrl

  return (
    <div className={`incrediboy ${stageEntered ? 'incrediboy--stage-visible' : ''}`}>
      {!stageEntered && <IntroScreen exiting={introExiting} onStart={handleEnterStage} />}

      <div className="incrediboy__main" aria-hidden={!stageEntered}>
      {/* CONTROL BAR — logo, mix controls, transport */}
      <motion.div className="control-bar">
        <div className="control-bar__left">
          <h1 className="control-bar__logo">INCREDIMIX</h1>
        </div>
        <div className="control-bar__mixes">
          {/* ── Recording control: cycles through idle → recording → finalizing → saved ── */}
          {mixRecordingState === 'idle' && (
            <button
              type="button"
              className="control-bar__mix-share control-bar__rec-btn"
              onClick={handleStartRecording}
              aria-label="Start recording mix session"
            >
              SAVE MIX
            </button>
          )}
          {mixRecordingState === 'recording' && (
            <button
              type="button"
              className="control-bar__mix-share control-bar__rec-btn control-bar__rec-btn--recording"
              onClick={handleStopRecording}
              aria-label="Stop recording and save mix"
            >
              ● {formatRecordingTime(recordingElapsed)} STOP
            </button>
          )}
          {mixRecordingState === 'finalizing' && (
            <button
              type="button"
              className="control-bar__mix-share control-bar__rec-btn control-bar__rec-btn--finalizing"
              disabled
              aria-label="Saving mix…"
            >
              SAVING…
            </button>
          )}
          {mixRecordingState === 'saved' && (
            <button
              type="button"
              className="control-bar__mix-share control-bar__rec-btn control-bar__rec-btn--saved"
              onClick={handleStartRecording}
              aria-label="Mix saved — click to record again"
            >
              ✓ SAVED
            </button>
          )}

          {/* ── Share Mix: disabled until a RecordedMix exists ── */}
          {(() => {
            const hasMix = Boolean(savedRecordedMix ?? sharedRecordedMix)
            return (
              <button
                type="button"
                className={[
                  'control-bar__mix-share',
                  'control-bar__mix-share--copy',
                  hasMix ? 'control-bar__share-btn--ready' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => { void handleCopyShareLink() }}
                disabled={!hasMix}
                aria-label={hasMix ? 'Copy share link for recorded mix' : 'Record a mix first to share'}
              >
                SHARE MIX
              </button>
            )
          })()}

          {/* ── Replay Mix: toggles ▶ / ■ while replay is active ── */}
          {(savedRecordedMix ?? sharedRecordedMix) && (
            <button
              type="button"
              className={[
                'control-bar__mix-share',
                'control-bar__replay-btn',
                isReplayingMix ? 'control-bar__replay-btn--active' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => {
                if (isReplayingMix) {
                  handleStopReplay()
                } else {
                  void handleReplayMix()
                }
              }}
              aria-label={isReplayingMix ? 'Stop replay' : 'Replay the recorded mix from the beginning'}
            >
              {isReplayingMix ? '■ STOP REPLAY' : '▶ REPLAY MIX'}
            </button>
          )}

          {isSharedMixLoad && sharedMixAwaitingAudio && filledCount > 0 && (
            <button
              type="button"
              className="control-bar__mix-share control-bar__mix-share--shared"
              onClick={() => {
                void handleStartSharedMix()
              }}
            >
              START SHARED MIX
            </button>
          )}
          <span className={`control-bar__status control-bar__status--${transportStatus.toLowerCase()}`}>
            {transportStatus}
          </span>
        </div>
        <div className="control-bar__transport">
          <label className="control-bar__field">
            <span>PACK</span>
            <select
              className="control-bar__pack-select"
              value={activePackId}
              onChange={(e) => handlePackChange(e.target.value as ActivePackId)}
              aria-label="Audio pack"
            >
              {PACK_MENU.map(({ group, packs }) => (
                <optgroup key={group} label={group}>
                  {packs.map((id) => (
                    <option key={id} value={id}>
                      {AUDIO_PACKS[id].name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="control-bar__field">
            <span>VOL</span>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              aria-label="Volume"
            />
          </label>
          <label className="control-bar__field control-bar__field--bpm">
            <span>BPM</span>
            <input
              type="number"
              min="60"
              max="180"
              value={bpm}
              onChange={(e) => handleBpmChange(Number(e.target.value))}
              aria-label="BPM"
            />
          </label>
          {import.meta.env.DEV && (
            <button
              type="button"
              className={`control-bar__dev${devDrawerOpen ? ' control-bar__dev--active' : ''}`}
              onClick={() => setDevDrawerOpen((open) => !open)}
              aria-label={devDrawerOpen ? 'Close dev diagnostics' : 'Open dev diagnostics'}
              aria-expanded={devDrawerOpen}
            >
              DEV
            </button>
          )}
          <button
            type="button"
            className="control-bar__reset"
            onClick={handleStopReset}
            aria-label="Stop and reset"
          >
            RESET
          </button>
          <button
            type="button"
            className={`control-bar__loops ${masterMuted ? 'control-bar__loops--playing' : ''}`}
            onClick={toggleMasterMute}
            disabled={filledCount === 0 || !isPlaying}
            aria-label={masterMuted ? 'Unpause audio' : 'Pause audio'}
          >
            {masterMuted ? 'UNPAUSE AUDIO' : 'PAUSE AUDIO'}
          </button>
          <button
            type="button"
            className={`control-bar__loops ${isPlaying ? 'control-bar__loops--playing' : ''}`}
            onClick={playAssignedAudioNow}
            disabled={filledCount === 0}
            aria-label={isPlaying ? 'Restart loops' : 'Play loops'}
          >
            {isPlaying ? 'RESTART LOOPS' : 'PLAY LOOPS'}
          </button>
          <MixVisualizer isPlaying={isPlaying} beatPeriodMs={MASTER_BEAT_MS} />
          {import.meta.env.DEV && isPlaying && (
            <BeatDebugOverlay
              clock={musicalClockRef.current}
              queueSize={quantizeTimersRef.current.size}
              bpm={bpm}
            />
          )}
        </div>
      </motion.div>

      {mixToast && (
        <p className="mix-toast" role="status" aria-live="polite">
          {mixToast}
        </p>
      )}

      {!audioReady && (
        <p className="incrediboy__hint">Tap any sound pad to enable audio.</p>
      )}

      <DndContext onDragEnd={handleDragEnd}>
        <div className={`game-shell ${isPlaying ? 'game-shell--playing' : ''}`}>
          <main className="stage" aria-label="Characters">
            <motion.div
              className="character-slots"
              style={
                {
                  '--loop-duration': `${MASTER_LOOP_MS}ms`,
                  '--beat-period': `${MASTER_BEAT_MS}ms`,
                  '--bar-period': `${MASTER_BAR_MS}ms`,
                  '--half-loop': `${MASTER_LOOP_MS / 2}ms`,
                } as CSSProperties
              }
            >
              {assignments.map((assignment, index) => (
                <CharacterSlot
                  key={index}
                  index={index}
                  assignment={assignment}
                  muted={mutedSlots.has(index)}
                  isPlaying={isPlaying}
                  masterMuted={masterMuted}
                  activePackId={activePackId}
                  onSlotClick={handleSlotClick}
                  onRemove={removeFromSlot}
                />
              ))}
            </motion.div>
          </main>

          <motion.div
            className="pad-panel-wrap"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <footer className="pad-panel" aria-label="Sound library">
              {GROUPED_CURATED_PACK_IDS.has(activePackId) ? (
                /* ── Curated 24-pad: 2-row grouped layout (matches default grid) ─ */
                <div
                  className={`pad-panel__cp-rows${activePackId === 'core-mix-pack-alpha' ? ' pad-panel__cp-rows--cma' : activePackId === 'new-pack-alpha' ? ' pad-panel__cp-rows--npa' : activePackId === 'bravo-pack' ? ' pad-panel__cp-rows--bp' : activePackId === 'delta-pack' ? ' pad-panel__cp-rows--dp' : ''}`}
                >
                  {(groupedPadRowsForPack(activePackId) ?? CYBERPUNK_PAD_ROWS).map((row, ri) => (
                    <motion.div
                      key={ri}
                      className="pad-panel__cp-row-wrap"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 + ri * 0.06 }}
                    >
                      {/* Grid row 1: group label chips */}
                      {row.groups.map((g) => (
                        <div
                          key={g.label}
                          className="pad-panel__cp-group-hdr"
                          style={{
                            '--cp-group-color': g.color,
                            gridColumn: `span ${g.padIds.length}`,
                          } as CSSProperties}
                        >
                          {g.label}
                        </div>
                      ))}
                      {/* Grid row 2: pads (auto-placed by .sound-pad grid-row rule) */}
                      {row.groups.flatMap((g) => g.padIds).map((padId) => {
                        const pad = PAD_BY_ID[padId]
                        if (!pad) return null
                        return (
                          <SoundPad
                            key={pad.id}
                            pad={pad}
                            selected={selectedPadId === pad.id}
                            inUse={usedPadIds.has(pad.id)}
                            isPerforming={performingPadIds.has(pad.id)}
                            onSelect={handlePadSelect}
                          />
                        )
                      })}
                    </motion.div>
                  ))}
                </div>
              ) : (
                /* ── Default: two-row layout ─────────────────────────────── */
                [ROW_A, ROW_B].map((row, rowIndex) => (
                  <motion.div
                    key={rowIndex}
                    className="pad-panel__row"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.12 + rowIndex * 0.06 }}
                  >
                    {row.map((pad) => (
                      <SoundPad
                        key={pad.id}
                        pad={pad}
                        selected={selectedPadId === pad.id}
                        inUse={usedPadIds.has(pad.id)}
                        isPerforming={performingPadIds.has(pad.id)}
                        onSelect={handlePadSelect}
                      />
                    ))}
                  </motion.div>
                ))
              )}
            </footer>
          </motion.div>
        </div>
      </DndContext>

      <aside className="audio-diagnostic-panel" aria-label="Temporary audio diagnostics">
        <strong>Audio diagnostics</strong>
        <button type="button" onClick={handleTestNativeAudioLoop}>
          Test Native Audio Loop
        </button>
        <button type="button" onClick={handleStopNativeAudioTest}>
          Stop Native Audio Test
        </button>
        <button type="button" onClick={handleTestTonePlayerLoop}>
          Test Tone Player Loop
        </button>
        <button type="button" onClick={handleStopToneTest}>
          Stop Tone Test
        </button>
      </aside>

      <aside className="audio-debug-url-box" aria-label="Audio URL comparison">
        <strong>Audio URL debug</strong>
        <span>Diagnostic URL: {diagnosticNativeUrl || 'not tested yet'}</span>
        <span>Assigned beat-1 URL: {assignedBeatOneUrl || 'not assigned yet'}</span>
        <span>Same file URL: {audioDebugUrlsMatch ? 'yes' : 'not confirmed'}</span>
      </aside>

      {import.meta.env.DEV && (
        <DevDiagnosticsDrawer open={devDrawerOpen} onClose={() => setDevDrawerOpen(false)}>
          {devPerfPanel && (
            <div style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8, padding: '8px 0 4px' }}>
              <strong>⚡ PERF</strong>
              <div>Pads: {devPerfPanel.activePads} · Nodes: {devPerfPanel.nodes}</div>
              <div>Soft corr/10s: {devPerfPanel.softCorr} · Hard snaps: {devPerfPanel.hardSnaps}</div>
              <div>AudioCtx: {devPerfPanel.ctxState}</div>
              <div>Resync in: {devPerfPanel.nextResyncS}s · last drift: {devPerfPanel.lastDriftMs}ms</div>
              <div>Corrected: {devPerfPanel.lastCorrected} · total resyncs: {devPerfPanel.resyncs}</div>
            </div>
          )}
          <PackCompatibilityPanel />
        </DevDiagnosticsDrawer>
      )}
      </div>
    </div>
  )
}

export default App
