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

const NAV_LINKS = ['App', 'Demo', 'Mods', 'Albums', 'Shop'] as const

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
type PackAudioCategory = 'beat' | 'bass' | 'melody' | 'fx' | 'voice' | 'percussion'
type PackPadAudio = {
  id: string
  category: PackAudioCategory
  audioFile: string
  sourceFile: string
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
  'trance-curated-pack-1',
  'beats-box-curated-pack-1',
])

/** Ordered list of pack entries shown in the UI dropdown. */
const PACK_MENU: { group: string; packs: ActivePackId[] }[] = [
  {
    group: 'Curated Packs',
    packs: ['trance-curated-pack-1', 'beats-box-curated-pack-1'],
  },
  {
    group: 'Advanced — Raw Packs',
    packs: ['trance-pack-1', 'beats-box-pack-1'],
  },
]

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

function assignedAudioHasSrc(audio: HTMLAudioElement): boolean {
  const src = audio.currentSrc || audio.src
  if (!src) return false
  return /\.(wav|mp3|ogg|m4a|aac|flac)(\?|#|$)/i.test(src) || src.startsWith('blob:')
}

function waitForAssignedAudioReady(audio: HTMLAudioElement): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const onReady = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error('assigned audio failed to load'))
    }
    const cleanup = () => {
      audio.removeEventListener('canplaythrough', onReady)
      audio.removeEventListener('error', onError)
    }
    audio.addEventListener('canplaythrough', onReady, { once: true })
    audio.addEventListener('error', onError, { once: true })
    audio.load()
  })
}

/** Fully stop and detach one assigned loop element. */
function stopAssignedAudioElement(audio: HTMLAudioElement): void {
  audio.pause()
  audio.loop = false
  audio.muted = false
  audio.volume = 0
  audio.currentTime = 0
  if (assignedAudioHasSrc(audio)) {
    audio.removeAttribute('src')
    try {
      audio.load()
    } catch {
      // load() can throw if the element is already torn down
    }
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
  const isSharedRecordedMixLoad = bootRef.current.mode === 'recorded'
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
  const [activePackId, setActivePackId] = useState<ActivePackId>('trance-curated-pack-1')
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
  const [introExiting, setIntroExiting] = useState(false)
  const [sharedMixAwaitingAudio, setSharedMixAwaitingAudio] = useState(false)
  const sharedMixHydratedRef = useRef(false)

  const assignedAudioRef = useRef<Map<number, HTMLAudioElement>>(new Map())
  const masterCycleIntervalRef = useRef<number | null>(null)
  const isPlayingRef = useRef(false)
  const masterMutedRef = useRef(false)
  const mutedSlotsRef = useRef<Set<number>>(new Set())
  const volumeRef = useRef(volume)
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
    assignedAudioRef.current.forEach((audio) => stopAssignedAudioElement(audio))
    assignedAudioRef.current.clear()
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
    setActivePackId(sanitized.p as ActivePackId)
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
    setActivePackId(init.pack as ActivePackId)
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
    if (masterCycleIntervalRef.current === null) return
    window.clearInterval(masterCycleIntervalRef.current)
    masterCycleIntervalRef.current = null
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

    ALL_PADS.forEach((pad) => {
      const previewPlayer = createTonePlayer(pad, volume, false, activePackId)
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
  }, [activePackId, clearDiagnosticNativeTest, clearDiagnosticToneTest, volume])

  useEffect(() => {
    const db = volumeDb(volume)
    Object.values(previewRef.current.players).forEach((player) => {
      if (player) player.volume.value = db
    })
    const normalized = normalizedVolume(volume)
    assignedAudioRef.current.forEach((audio, slot) => {
      audio.volume = isPlayingRef.current && !masterMutedRef.current && !mutedSlotsRef.current.has(slot)
        ? normalized
        : 0
    })
    console.log('[volume] updated', { value: volume, normalized })
  }, [volume])

  /** Cancel all scheduled replay timeouts and mark replay as inactive. */
  const clearReplayTimers = useCallback(() => {
    replayTimeoutsRef.current.forEach((id) => window.clearTimeout(id))
    replayTimeoutsRef.current = []
    setIsReplayingMix(false)
  }, [])

  useEffect(() => {
    return () => {
      clearMasterCycle()
      clearAllAssignedDebugIntervals()
      // Cancel replay events on unmount so stale timeouts can't fire
      replayTimeoutsRef.current.forEach((id) => window.clearTimeout(id))
      replayTimeoutsRef.current = []
    }
  }, [clearAllAssignedDebugIntervals, clearMasterCycle])

  const restartAssignedAudioCycle = useCallback(() => {
    console.log('[assigned] master cycle restart')
    assignedAudioRef.current.forEach((audio, slot) => {
      if (!assignedAudioHasSrc(audio)) {
        console.warn('[audio] play skipped — no src', { slot })
        return
      }

      if (mutedSlotsRef.current.has(slot)) {
        audio.pause()
        return
      }

      audio.loop = true
      audio.muted = false
      audio.currentTime = 0
      audio.volume = isPlayingRef.current && !masterMutedRef.current ? normalizedVolume(volumeRef.current) : 0
      console.log('[audio] play requested', { slot, url: audio.currentSrc || audio.src })
      void audio
        .play()
        .then(() => console.log('[audio] play resolved', { slot }))
        .catch((error) => console.warn('[audio] play failed', { slot, url: audio.currentSrc || audio.src, error }))

      if (!assignedDebugIntervalsRef.current.has(slot)) {
        const interval = window.setInterval(() => {
          console.log('[assigned] currentTime', {
            slot,
            currentTime: audio.currentTime,
            duration: audio.duration,
            paused: audio.paused,
            loop: audio.loop,
          })
        }, 1000)
        assignedDebugIntervalsRef.current.set(slot, interval)
      }
    })
  }, [])

  const startOrRestartLoops = useCallback(() => {
    clearMasterCycle()
    isPlayingRef.current = true
    setIsPlaying(true)
    setTransportStatus(masterMutedRef.current ? 'Paused' : 'Playing')
    restartAssignedAudioCycle()
    masterCycleIntervalRef.current = window.setInterval(restartAssignedAudioCycle, MASTER_LOOP_MS)
    console.log('[master] start/restart loops', { loopMs: MASTER_LOOP_MS })
  }, [clearMasterCycle, restartAssignedAudioCycle])

  const disposeAssignedAudio = useCallback((slotIndex: number) => {
    const audio = assignedAudioRef.current.get(slotIndex)
    if (!audio) return
    clearAssignedDebugInterval(slotIndex)
    assignedAudioRef.current.delete(slotIndex)
    stopAssignedAudioElement(audio)
    console.log('[audio] removed slot stopped', { slot: slotIndex })
    console.log('[audio] assignedAudioRef size', assignedAudioRef.current.size)
  }, [clearAssignedDebugInterval])

  const createAssignedAudio = useCallback(
    async (
      pad: PadDefinition,
      slotIndex: number,
      options?: { deferPlayback?: boolean },
    ): Promise<boolean> => {
      disposeAssignedAudio(slotIndex)
      const url = resolveAudioSrc(pad, activePackId)
      if (!url) {
        console.warn('[audio] assigned skipped — no url', {
          slot: slotIndex,
          padId: pad.id,
          packId: activePackId,
        })
        return false
      }

      const audio = new Audio(url)
      audio.loop = true
      audio.preload = 'auto'
      audio.volume = 0
      audio.onpause = () => console.log('[assigned] paused', slotIndex)
      audio.onended = () => console.log('[assigned] ended', slotIndex)
      audio.onerror = (event) => console.log('[assigned] error', slotIndex, event)
      assignedAudioRef.current.set(slotIndex, audio)

      try {
        await waitForAssignedAudioReady(audio)
      } catch (error) {
        console.warn('[audio] assigned load failed', {
          slot: slotIndex,
          padId: pad.id,
          url,
          error,
        })
        assignedAudioRef.current.delete(slotIndex)
        return false
      }

      if (pad.id === 'beat-0') {
        setAssignedBeatOneUrl(audio.src)
      }

      console.log('[audio] assigned created', {
        slot: slotIndex,
        padId: pad.id,
        url: audio.src,
      })

      if (options?.deferPlayback) return true

      if (masterCycleIntervalRef.current === null) {
        startOrRestartLoops()
      } else {
        console.log('[assigned] waiting for next master cycle', { slot: slotIndex })
      }
      return true
    },
    [activePackId, disposeAssignedAudio, startOrRestartLoops],
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
            audio.muted = nowMuted
            audio.volume = nowMuted || masterMutedRef.current ? 0 : normalizedVolume(volumeRef.current)
            if (!nowMuted) console.log('[assigned] unmuted', { slot: index })
          }
          return next
        })
        recordEvent({ tp: 'sm', si: index, mu: nowMuted })
        return
      }
    },
    [slots, recordEvent],
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
  }, [clearMasterCycle, disposeAssignedAudio, slots, recordEvent])

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

    const restoredVolume = normalizedVolume(volumeRef.current)
    assignedAudioRef.current.forEach((audio, slot) => {
      const slotMuted = mutedSlotsRef.current.has(slot)
      audio.volume =
        masterMutedRef.current || slotMuted ? 0 : restoredVolume
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
    console.log('[mix] shared audio started')
  }, [createAssignedAudio, shareMix, slots, startOrRestartLoops])

  const playAssignedAudioNow = useCallback(async () => {
    console.log('[PLAY LOOPS] clicked')
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
      audio.volume =
        masterMutedRef.current || slotMuted ? 0 : normalizedVolume(volumeRef.current)
    })

    setSharedMixAwaitingAudio(false)
    startOrRestartLoops()
    recordEvent({ tp: 'pl', pl: true })
  }, [ensureAssignedAudioForSlots, slots, startOrRestartLoops, recordEvent])

  const toggleMasterMute = useCallback(() => {
    const nextMuted = !masterMutedRef.current
    masterMutedRef.current = nextMuted
    setMasterMuted(nextMuted)
    const restoredVolume = normalizedVolume(volumeRef.current)
    assignedAudioRef.current.forEach((audio, slot) => {
      audio.volume = nextMuted || mutedSlotsRef.current.has(slot) ? 0 : restoredVolume
    })
    setTransportStatus(nextMuted ? 'Paused' : (isPlayingRef.current ? 'Playing' : 'Stopped'))
    console.log(nextMuted ? '[pause] global mute' : '[pause] global unmute', {
      muted: nextMuted,
      restoredVolume,
    })
    recordEvent({ tp: 'mm', mu: nextMuted })
  }, [recordEvent])

  const handleStopReset = useCallback(() => {
    console.log('[audio] reset stopping all')
    // Cancel any in-progress replay first
    clearReplayTimers()
    clearMasterCycle()
    clearAllAssignedDebugIntervals()
    assignedAudioRef.current.forEach((audio) => stopAssignedAudioElement(audio))
    assignedAudioRef.current.clear()
    console.log('[audio] assignedAudioRef size', assignedAudioRef.current.size)
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
  }, [clearAllAssignedDebugIntervals, clearMasterCycle, clearReplayTimers, recordEvent])

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

  /** Volume change handler — updates state and records a timeline event. */
  const handleVolumeChange = useCallback((vol: number) => {
    volumeRef.current = vol
    setVolume(vol)
    recordEvent({ tp: 'vo', vol })
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
              audio.volume = event.mu || masterMutedRef.current ? 0 : normalizedVolume(volumeRef.current)
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
            audio.volume =
              event.mu || mutedSlotsRef.current.has(slot) ? 0 : normalizedVolume(volumeRef.current)
          })
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
          if (event.pack) handlePackChange(event.pack as ActivePackId)
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
    const initPack = init.pack as ActivePackId

    // Guard against zero/invalid duration to avoid infinite playback
    if (typeof dur !== 'number' || !Number.isFinite(dur) || dur < 0) {
      console.warn('[mix-replay] invalid duration — aborting', dur)
      return
    }

    console.log('[mix-replay] starting replay', { events: ev.length, dur })

    // Cancel any existing replay
    clearReplayTimers()

    // ── 1. Stop all current audio ──────────────────────────────────────────
    clearMasterCycle()
    clearAllAssignedDebugIntervals()
    assignedAudioRef.current.forEach((audio) => stopAssignedAudioElement(audio))
    assignedAudioRef.current.clear()

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
    setIsReplayingMix(true)
    setMixToast('Replaying mix from the start…')

    // ── 3. Load audio for initial slots using explicit pack (no stale closure) ─
    for (let i = 0; i < init.slots.length; i++) {
      const padId = init.slots[i]
      if (!padId) continue
      const pad = PAD_BY_ID[padId]
      if (!pad) continue
      const url = resolveAudioSrc(pad, initPack)
      if (!url) continue
      disposeAssignedAudio(i)
      const audio = new Audio(url)
      audio.loop = true
      audio.preload = 'auto'
      audio.volume = 0
      audio.onpause = () => console.log('[replay] audio paused', i)
      audio.onerror = (e) => console.warn('[replay] audio error', { slot: i, padId, e })
      assignedAudioRef.current.set(i, audio)
      try {
        await waitForAssignedAudioReady(audio)
        console.log('[replay] audio loaded', { slot: i, padId })
      } catch {
        console.warn('[replay] audio load failed', { slot: i, padId })
        assignedAudioRef.current.delete(i)
      }
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
    disposeAssignedAudio,
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
      {/* TOP NAV — black bar */}
      <header className="top-nav">
        <div className="top-nav__spacer" aria-hidden="true">
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              padding: '2px 6px',
              borderRadius: '3px',
              background: isSharedMixLoad ? '#7c3aed' : isSharedRecordedMixLoad ? '#0369a1' : '#15803d',
              color: '#fff',
              marginLeft: '6px',
              verticalAlign: 'middle',
            }}
          >
            {isSharedMixLoad ? 'SHARE BOOT' : isSharedRecordedMixLoad ? 'RECORDED BOOT' : 'CLEAN BOOT'}
          </span>
        </div>
        <nav className="top-nav__links" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <button key={link} type="button" className="top-nav__link">
              {link}
            </button>
          ))}
        </nav>
        <motion.div className="top-nav__right">
          {['f', 'x', '▶', '◎', '♪', 't'].map((label) => (
            <button key={label} type="button" className="top-nav__social" aria-label={`Social ${label}`}>
              <span className="top-nav__social-icon">{label}</span>
            </button>
          ))}
          <button type="button" className="top-nav__flag" aria-label="Language region">
            🇺🇸
          </button>
          <button type="button" className="top-nav__lang" aria-label="Language">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </button>
        </motion.div>
      </header>

      {/* CONTROL BAR — logo, menu, play, reset */}
      <motion.div className="control-bar">
        <div className="control-bar__left">
          <h1 className="control-bar__logo">INCrediBOY</h1>
          <button type="button" className="control-bar__menu" aria-label="Menu disabled" disabled>
            <svg width="22" height="16" viewBox="0 0 22 16" aria-hidden="true">
              <rect y="0" width="22" height="2.5" rx="1" fill="#333" />
              <rect y="6.5" width="22" height="2.5" rx="1" fill="#333" />
              <rect y="13" width="22" height="2.5" rx="1" fill="#333" />
            </svg>
          </button>
        </div>
        <div className="control-bar__mixes">
          <button
            type="button"
            className={`control-bar__mix control-bar__mix--play ${isPlaying ? 'control-bar__mix--playing' : ''}`}
            disabled
            hidden
            aria-hidden="true"
            aria-label={isPlaying ? 'Pause loop' : 'Play loop'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="9" y="2" width="6" height="10" rx="3" fill="#111" />
              <path d="M12 2c-4 0-7 3-7 7v2h14V9c0-4-3-7-7-7z" fill="none" stroke="#111" strokeWidth="2" />
              {isPlaying ? (
                <path d="M8 14h3v8H8zm5 0h3v8h-3z" fill="#111" />
              ) : (
                <path d="M8 14h8v8H8z" fill="#111" />
              )}
            </svg>
          </button>
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
              {[ROW_A, ROW_B].map((row, rowIndex) => (
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
              ))}
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
      </div>
    </div>
  )
}

export default App
