import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  DndContext,
  type DragEndEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { motion } from 'framer-motion'
import * as Tone from 'tone'
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

type SoundEngine = {
  padId: string
  player: Tone.Player
}

type TransportStatus = 'Playing' | 'Paused' | 'Stopped'

type PreviewPlayers = {
  players: Partial<Record<string, Tone.Player>>
  dispose: () => void
}

const SLOT_COUNT = 7

/** Slots 0–4 = cat characters; slots 5–6 = human beatbox style */
const SLOT_IS_CAT = [true, true, true, true, true, false, false] as const
const DEFAULT_BPM = 100

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

const bundledCharacterUrls = import.meta.glob<string>(
  './assets/characters/*.{png,jpg,jpeg,webp,svg}',
  { query: '?url', import: 'default', eager: true },
)

const bundledPadUrls = import.meta.glob<string>(
  './assets/pads/*.{png,jpg,jpeg,webp,svg}',
  { query: '?url', import: 'default', eager: true },
)

const bundledAudioUrls = import.meta.glob<string>(
  './assets/audio/*.wav',
  { query: '?url', import: 'default', eager: true },
)

function bundledFileName(path: string): string {
  return path.split('/').pop() ?? path
}

const bundledCharacterFiles = Object.keys(bundledCharacterUrls).map(bundledFileName)
const bundledAssignedCharacterFiles = bundledCharacterFiles.filter(
  (file) => !/^empty-/i.test(file),
)

function numberedCharacterFiles(category: SoundCategory): string[] {
  const pattern = new RegExp(`^${category}-(\\d+)\\.(png|jpe?g|webp|svg)$`, 'i')
  return bundledCharacterFiles
    .map((file) => {
      const match = file.match(pattern)
      return match ? { file, number: Number(match[1]) } : null
    })
    .filter((entry): entry is { file: string; number: number } => entry !== null)
    .sort((a, b) => a.number - b.number)
    .map((entry) => entry.file)
}

function uniqueFiles(files: (string | undefined)[]): string[] {
  return [...new Set(files.filter((file): file is string => Boolean(file)))]
}

/** Image file candidates for a slot. Empty slots always use the blank default. */
function characterAssetFiles(pad: PadDefinition | null): string[] {
  if (!pad) return ['empty-character.png', 'empty-cat.png']

  const exact = `${pad.category}-${pad.variant + 1}.png`
  const availableByIndex = numberedCharacterFiles(pad.category)[pad.variant]
  const categoryFallbacks = numberedCharacterFiles(pad.category)
  const sharedFallback =
    bundledAssignedCharacterFiles[pad.variant % bundledAssignedCharacterFiles.length]

  return uniqueFiles([
    exact,
    availableByIndex,
    ...categoryFallbacks,
    sharedFallback,
  ])
}

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

/** Resolved URL: bundled src/assets first, then public/characters */
function resolveCharacterSrc(
  pad: PadDefinition | null,
  _slotIndex: number,
): string {
  const files = characterAssetFiles(pad)
  for (const file of files) {
    const bundled = lookupBundledAsset(bundledCharacterUrls, 'characters', file)
    if (bundled) return bundled
  }

  return `/characters/${files[0]}`
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

function resolveAudioSrc(pad: PadDefinition): string | undefined {
  const file = audioAssetFile(pad)
  return lookupBundledAsset(bundledAudioUrls, 'audio', file)
}

function volumeDb(volume: number): number {
  return volume <= 0 ? -Infinity : (volume - 100) * 0.36
}

function createTonePlayer(
  pad: PadDefinition,
  volume: number,
  loop: boolean,
): Tone.Player | null {
  const url = resolveAudioSrc(pad)
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

function CharacterFallbackEmpty({
  muted,
  isCat,
}: {
  muted: boolean
  isCat: boolean
}) {
  if (isCat) {
    return (
      <svg
        className="character-figure character-figure--empty character-figure--fallback character-figure--cat"
        viewBox={CHAR_FALLBACK_VIEW}
        aria-hidden="true"
        style={{ opacity: muted ? 0.4 : 1 }}
      >
        <ellipse cx="50" cy="70" rx="28" ry="30" fill="#c4c4c4" stroke="#111" strokeWidth="3" />
        <polygon points="50,38 32,52 68,52" fill="#c4c4c4" stroke="#111" strokeWidth="2" />
        <circle cx="40" cy="66" r="4" fill="#111" />
        <circle cx="60" cy="66" r="4" fill="#111" />
        <path d="M44 76 Q50 80 56 76" fill="none" stroke="#555" strokeWidth="2" />
        <path d="M48 52 L52 44 L56 52" fill="none" stroke="#111" strokeWidth="2" />
        <path d="M28 100 Q50 92 72 100 L70 178 Q50 184 30 178 Z" fill="#b0b0b0" stroke="#111" strokeWidth="3" />
      </svg>
    )
  }
  return (
    <svg
      className="character-figure character-figure--empty character-figure--fallback"
      viewBox={CHAR_FALLBACK_VIEW}
      aria-hidden="true"
      style={{ opacity: muted ? 0.4 : 1 }}
    >
      <path
        d="M24 50 Q50 24 76 46 L72 66 Q50 48 28 64 Z"
        fill="#141414"
        stroke="#111"
        strokeWidth="3"
      />
      <ellipse cx="50" cy="64" rx="24" ry="28" fill="#efefef" stroke="#111" strokeWidth="3" />
      <circle cx="41" cy="62" r="3" fill="#111" />
      <circle cx="59" cy="62" r="3" fill="#111" />
      <line x1="43" y1="78" x2="57" y2="78" stroke="#555" strokeWidth="2.5" />
      <path d="M26 92 Q50 84 74 92 L72 178 Q50 184 28 178 Z" fill="#b5b5b5" stroke="#111" strokeWidth="3" />
    </svg>
  )
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
    )
  }
  return (
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
    return <CharacterFallbackEmpty muted={muted} isCat={isCat} />
  }

  if (useFallback) {
    return <CharacterFallbackAssigned pad={pad} muted={muted} isCat={isCat} />
  }

  return (
    <motion.img
      key={pad?.id ?? 'empty'}
      src={src}
      alt={pad ? `${pad.label} character` : 'Empty character'}
      className={`character-figure ${pad ? 'character-figure--assigned' : 'character-figure--empty'}`}
      style={{ opacity: muted ? 0.42 : 1 }}
      initial={pad ? { scale: 0.92, opacity: 0 } : false}
      animate={{ scale: 1, opacity: muted ? 0.42 : 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      onError={() => setUseFallback(true)}
      draggable={false}
    />
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
  onSelect,
}: {
  pad: PadDefinition
  selected: boolean
  inUse: boolean
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
      className={`sound-pad sound-pad--${pad.category} ${selected ? 'sound-pad--selected' : ''} ${inUse ? 'sound-pad--in-use' : ''}`}
      style={{
        ...style,
        background: pad.color,
        boxShadow: `inset 0 -4px 0 ${pad.accent}`,
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
  onSlotClick,
  onRemove,
}: {
  index: number
  assignment: SlotAssignment
  muted: boolean
  isPlaying: boolean
  onSlotClick: (index: number) => void
  onRemove: (index: number) => void
}) {
  const slotId = `slot-${index}`
  const { setNodeRef, isOver } = useDroppable({ id: slotId })

  return (
    <motion.div
      ref={setNodeRef}
      className={`character-slot-wrap ${isOver ? 'character-slot-wrap--over' : ''} ${
        assignment ? 'character-slot-wrap--filled' : 'character-slot-wrap--empty'
      } ${isPlaying && assignment && !muted ? 'character-slot-wrap--playing' : ''} ${
        muted ? 'character-slot-wrap--muted' : ''
      }`}
      animate={
        isPlaying && assignment && !muted
          ? {
              y: [0, -7, 0],
              transition: { repeat: Infinity, duration: 0.34, ease: 'easeInOut' },
            }
          : { y: 0 }
      }
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

function App() {
  const [slots, setSlots] = useState<(string | null)[]>(
    Array(SLOT_COUNT).fill(null),
  )
  const [mutedSlots, setMutedSlots] = useState<Set<number>>(() => new Set())
  const [selectedPadId, setSelectedPadId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [transportStatus, setTransportStatus] = useState<TransportStatus>('Stopped')
  const [audioReady, setAudioReady] = useState(false)
  const [volume, setVolume] = useState(80)
  const [bpm, setBpm] = useState(DEFAULT_BPM)

  const activePlayersRef = useRef<Map<number, SoundEngine>>(new Map())
  const assignedPlayerPoolRef = useRef<Map<string, Tone.Player>>(new Map())
  const previewRef = useRef<PreviewPlayers>({
    players: {},
    dispose: () => undefined,
  })

  const assignments = useMemo(
    () =>
      slots.map((id) => (id ? (PAD_BY_ID[id] ?? null) : null)) as SlotAssignment[],
    [slots],
  )

  const initAudio = useCallback(async () => {
    await Tone.start()
    await Tone.getContext().resume()
    Tone.getTransport().bpm.value = bpm
    Tone.getTransport().loop = true
    Tone.getTransport().loopStart = 0
    Tone.getTransport().loopEnd = '4m'
    setAudioReady(true)
  }, [bpm])

  useEffect(() => {
    ALL_PADS.forEach((pad) => {
      const assignedPlayer = createTonePlayer(pad, volume, true)
      const previewPlayer = createTonePlayer(pad, volume, false)
      if (assignedPlayer) assignedPlayerPoolRef.current.set(pad.id, assignedPlayer)
      if (previewPlayer) previewRef.current.players[pad.id] = previewPlayer
    })

    Tone.loaded().then(() => {
      console.log('[audio] all files loaded', {
        count: assignedPlayerPoolRef.current.size,
        loopEnd: Tone.getTransport().loopEnd,
      })
    })

    return () => {
      Tone.getTransport().stop()
      Tone.getTransport().cancel()
      activePlayersRef.current.forEach((engine) => {
        engine.player.stop()
        engine.player.unsync()
      })
      activePlayersRef.current.clear()
      assignedPlayerPoolRef.current.forEach((player) => player.dispose())
      assignedPlayerPoolRef.current.clear()
      Object.values(previewRef.current.players).forEach((player) => player?.dispose())
      previewRef.current.players = {}
    }
  }, [])

  useEffect(() => {
    Tone.getTransport().bpm.value = bpm
  }, [bpm])

  useEffect(() => {
    const db = volumeDb(volume)
    activePlayersRef.current.forEach((engine) => {
      engine.player.volume.value = db
    })
    assignedPlayerPoolRef.current.forEach((player) => {
      player.volume.value = db
    })
    Object.values(previewRef.current.players).forEach((player) => {
      if (player) player.volume.value = db
    })
  }, [volume])

  const previewPad = useCallback(
    async (pad: PadDefinition) => {
      await initAudio()
      const player = previewRef.current.players[pad.id]
      if (!player) return
      player.stop()
      player.start(undefined, 0, '1m')
    },
    [initAudio],
  )

  const disposeSlotPlayer = useCallback((slotIndex: number) => {
    const engine = activePlayersRef.current.get(slotIndex)
    if (!engine) return
    engine.player.stop()
    engine.player.unsync()
    engine.player.mute = false
    activePlayersRef.current.delete(slotIndex)
    console.log('[audio] player disposed', { slotIndex, padId: engine.padId })
  }, [])

  const configureTransport = useCallback(() => {
    Tone.getTransport().bpm.value = bpm
    Tone.getTransport().loop = true
    Tone.getTransport().loopStart = 0
    Tone.getTransport().loopEnd = '4m'
  }, [bpm])

  const scheduleSlotPlayer = useCallback((engine: SoundEngine, slotIndex: number) => {
    engine.player.stop()
    engine.player.unsync()
    engine.player.loop = true
    engine.player.fadeIn = 0
    engine.player.fadeOut = 0
    engine.player.playbackRate = bpm / DEFAULT_BPM
    engine.player.volume.value = volumeDb(volume)
    engine.player.mute = mutedSlots.has(slotIndex)
    engine.player.sync().start(0)
  }, [bpm, mutedSlots, volume])

  const syncActivePlayers = useCallback(() => {
    activePlayersRef.current.forEach((engine, slotIndex) => {
      engine.player.playbackRate = bpm / DEFAULT_BPM
      engine.player.volume.value = volumeDb(volume)
      engine.player.mute = mutedSlots.has(slotIndex)
    })
  }, [bpm, mutedSlots, volume])

  const createAssignedPlayer = useCallback((pad: PadDefinition, slotIndex: number) => {
    disposeSlotPlayer(slotIndex)
    const player = assignedPlayerPoolRef.current.get(pad.id)
    if (!player) return
    const engine = { padId: pad.id, player }
    activePlayersRef.current.set(slotIndex, engine)
    scheduleSlotPlayer(engine, slotIndex)
    console.log('[audio] player assigned', { slotIndex, padId: pad.id })
  }, [disposeSlotPlayer, scheduleSlotPlayer])

  const assignPadToSlot = useCallback((padId: string, slotIndex: number) => {
    const pad = PAD_BY_ID[padId]
    if (!pad) return

    const next = [...slots]
    for (let i = 0; i < next.length; i += 1) {
      if (next[i] === padId || i === slotIndex) {
        next[i] = null
        disposeSlotPlayer(i)
      }
    }
    next[slotIndex] = padId
    createAssignedPlayer(pad, slotIndex)
    setSlots(next)
    setMutedSlots((prev) => {
      const next = new Set(prev)
      next.delete(slotIndex)
      return next
    })
  }, [createAssignedPlayer, disposeSlotPlayer, slots])

  const assignToFirstEmpty = useCallback((padId: string) => {
    const pad = PAD_BY_ID[padId]
    if (!pad) return

    const existing = slots.indexOf(padId)
    if (existing !== -1) {
      const next = [...slots]
      next[existing] = null
      disposeSlotPlayer(existing)
      setSlots(next)
      return
    }

    const empty = slots.indexOf(null)
    if (empty === -1) return
    const next = [...slots]
    next[empty] = padId
    createAssignedPlayer(pad, empty)
    setSlots(next)
  }, [createAssignedPlayer, disposeSlotPlayer, slots])

  const handlePadSelect = useCallback(
    async (padId: string) => {
      const pad = PAD_BY_ID[padId]
      if (!pad) return
      await initAudio()
      setSelectedPadId(padId)
      await previewPad(pad)
      assignToFirstEmpty(padId)
    },
    [initAudio, previewPad, assignToFirstEmpty],
  )

  const handleSlotClick = useCallback(
    async (index: number) => {
      await initAudio()
      if (slots[index]) {
        setMutedSlots((prev) => {
          const next = new Set(prev)
          const muted = next.has(index)
          if (muted) next.delete(index)
          else next.add(index)
          const engine = activePlayersRef.current.get(index)
          if (engine) engine.player.mute = !muted
          return next
        })
        return
      }
      if (selectedPadId) {
        assignPadToSlot(selectedPadId, index)
        await previewPad(PAD_BY_ID[selectedPadId])
      }
    },
    [initAudio, slots, selectedPadId, assignPadToSlot, previewPad],
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const padId = String(event.active.id)
      const pad = PAD_BY_ID[padId]
      const overId = event.over?.id
      if (!pad || !overId || typeof overId !== 'string' || !overId.startsWith('slot-')) return

      const index = Number.parseInt(overId.replace('slot-', ''), 10)
      if (Number.isNaN(index)) return

      await initAudio()
      setSelectedPadId(padId)
      assignPadToSlot(padId, index)
      await previewPad(pad)
    },
    [initAudio, assignPadToSlot, previewPad],
  )

  const syncLoops = useCallback(
    (playing: boolean) => {
      if (playing) syncActivePlayers()
      else activePlayersRef.current.forEach((engine) => engine.player.mute = true)
    },
    [syncActivePlayers],
  )

  const removeFromSlot = useCallback((index: number) => {
    disposeSlotPlayer(index)
    console.log('[audio] audio removed', { slotIndex: index })
    const hasRemainingAssigned = slots.some((slot, i) => i !== index && slot)
    if (isPlaying && !hasRemainingAssigned) {
      Tone.getTransport().stop()
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
      return next
    })
  }, [disposeSlotPlayer, isPlaying, slots])

  const handlePlayPause = useCallback(async () => {
    await initAudio()

    if (isPlaying) {
      Tone.getTransport().pause()
      setIsPlaying(false)
      setTransportStatus('Paused')
      return
    }

    const hasActive = assignments.some((p, i) => p && !mutedSlots.has(i))
    if (!hasActive) {
      setTransportStatus('Stopped')
      return
    }

    configureTransport()
    Tone.getTransport().stop()
    Tone.getTransport().position = 0
    activePlayersRef.current.forEach((engine, slotIndex) => {
      scheduleSlotPlayer(engine, slotIndex)
    })
    Tone.getTransport().start('+0.1')
    console.log('[audio] transport started', {
      position: Tone.getTransport().position,
      loopEnd: Tone.getTransport().loopEnd,
    })
    setIsPlaying(true)
    setTransportStatus('Playing')
  }, [configureTransport, initAudio, isPlaying, assignments, mutedSlots, scheduleSlotPlayer])

  const handleStopReset = useCallback(() => {
    Tone.getTransport().stop()
    activePlayersRef.current.forEach((engine) => {
      engine.player.stop()
      engine.player.unsync()
      engine.player.mute = false
    })
    activePlayersRef.current.clear()
    setIsPlaying(false)
    setTransportStatus('Stopped')
    setSlots(Array(SLOT_COUNT).fill(null))
    setMutedSlots(new Set())
    setSelectedPadId(null)
  }, [])

  useEffect(() => {
    syncLoops(isPlaying)
  }, [mutedSlots, isPlaying, syncLoops])

  const filledCount = slots.filter(Boolean).length
  const usedPadIds = useMemo(() => new Set(slots.filter(Boolean) as string[]), [slots])

  return (
    <div className="incrediboy">
      {/* TOP NAV — black bar */}
      <header className="top-nav">
        <div className="top-nav__spacer" aria-hidden="true" />
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
            onClick={handlePlayPause}
            disabled={filledCount === 0 && !isPlaying}
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
          {[1, 2].map((i) => (
            <button key={i} type="button" className="control-bar__mix control-bar__mix--locked" disabled aria-label="Locked mix">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#999" aria-hidden="true">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 018 0v3" fill="none" stroke="#999" strokeWidth="2" />
              </svg>
            </button>
          ))}
          <span className={`control-bar__status control-bar__status--${transportStatus.toLowerCase()}`}>
            {transportStatus}
          </span>
        </div>
        <div className="control-bar__transport">
          <label className="control-bar__field">
            <span>VOL</span>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
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
              onChange={(e) => setBpm(Math.min(180, Math.max(60, Number(e.target.value) || DEFAULT_BPM)))}
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
        </div>
      </motion.div>

      {!audioReady && (
        <p className="incrediboy__hint">Tap any sound pad to enable audio.</p>
      )}

      <DndContext onDragEnd={handleDragEnd}>
        <div className="game-shell">
          <main className="stage" aria-label="Characters">
            <div className="character-slots">
              {assignments.map((assignment, index) => (
                <CharacterSlot
                  key={index}
                  index={index}
                  assignment={assignment}
                  muted={mutedSlots.has(index)}
                  isPlaying={isPlaying}
                  onSlotClick={handleSlotClick}
                  onRemove={removeFromSlot}
                />
              ))}
            </div>
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
                      onSelect={handlePadSelect}
                    />
                  ))}
                </motion.div>
              ))}
            </footer>
          </motion.div>
        </div>
      </DndContext>
    </div>
  )
}

export default App
