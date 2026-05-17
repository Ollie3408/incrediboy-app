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

type TransportStatus = 'Playing' | 'Paused' | 'Stopped'

type PreviewPlayers = {
  players: Partial<Record<string, Tone.Player>>
  dispose: () => void
}

const SLOT_COUNT = 7

/** Slots 0–4 = cat characters; slots 5–6 = human beatbox style */
const SLOT_IS_CAT = [true, true, true, true, true, false, false] as const
const DEFAULT_BPM = 100
const MASTER_LOOP_MS = 9600

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
  const [diagnosticNativeUrl, setDiagnosticNativeUrl] = useState<string>('')
  const [assignedBeatOneUrl, setAssignedBeatOneUrl] = useState<string>('')

  const assignedAudioRef = useRef<Map<number, HTMLAudioElement>>(new Map())
  const masterCycleIntervalRef = useRef<number | null>(null)
  const isPlayingRef = useRef(false)
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

  const assignments = useMemo(
    () =>
      slots.map((id) => (id ? (PAD_BY_ID[id] ?? null) : null)) as SlotAssignment[],
    [slots],
  )

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    mutedSlotsRef.current = mutedSlots
  }, [mutedSlots])

  useEffect(() => {
    volumeRef.current = volume
  }, [volume])

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
    ALL_PADS.forEach((pad) => {
      const previewPlayer = createTonePlayer(pad, volume, false)
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
  }, [clearDiagnosticNativeTest, clearDiagnosticToneTest])

  useEffect(() => {
    const db = volumeDb(volume)
    Object.values(previewRef.current.players).forEach((player) => {
      if (player) player.volume.value = db
    })
  }, [volume])

  useEffect(() => {
    return () => {
      clearMasterCycle()
      clearAllAssignedDebugIntervals()
    }
  }, [clearAllAssignedDebugIntervals, clearMasterCycle])

  const restartAssignedAudioCycle = useCallback(() => {
    console.log('[assigned] master cycle restart')
    assignedAudioRef.current.forEach((audio, slot) => {
      if (mutedSlotsRef.current.has(slot)) {
        audio.pause()
        return
      }

      audio.loop = true
      audio.currentTime = 0
      audio.volume = normalizedVolume(volumeRef.current)
      void audio.play()
        .then(() => console.log('[assigned] cycle play resolved', slot))
        .catch((error) => console.warn('[assigned] cycle play failed', { slot, url: audio.src, error }))

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

  const startMasterCycle = useCallback(() => {
    clearMasterCycle()
    restartAssignedAudioCycle()
    masterCycleIntervalRef.current = window.setInterval(restartAssignedAudioCycle, MASTER_LOOP_MS)
    isPlayingRef.current = true
    setIsPlaying(true)
    setTransportStatus('Playing')
    console.log('[assigned] master cycle started', { loopMs: MASTER_LOOP_MS })
  }, [clearMasterCycle, restartAssignedAudioCycle])

  const disposeAssignedAudio = useCallback((slotIndex: number) => {
    const audio = assignedAudioRef.current.get(slotIndex)
    if (!audio) return
    clearAssignedDebugInterval(slotIndex)
    audio.pause()
    audio.currentTime = 0
    assignedAudioRef.current.delete(slotIndex)
    console.log('[assigned] removed', { slot: slotIndex, url: audio.src })
  }, [clearAssignedDebugInterval])

  const createAssignedAudio = useCallback(async (pad: PadDefinition, slotIndex: number) => {
    disposeAssignedAudio(slotIndex)
    const url = resolveAudioSrc(pad)
    if (!url) return

    const audio = new Audio(url)
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = normalizedVolume(volumeRef.current)
    audio.onpause = () => console.log('[assigned] paused', slotIndex)
    audio.onended = () => console.log('[assigned] ended', slotIndex)
    audio.onerror = (event) => console.log('[assigned] error', slotIndex, event)
    assignedAudioRef.current.set(slotIndex, audio)

    if (pad.id === 'beat-0') {
      setAssignedBeatOneUrl(audio.src)
    }

    console.log('[assigned] created', {
      slot: slotIndex,
      url: audio.src,
      loop: audio.loop,
    })

    if (!isPlayingRef.current) {
      startMasterCycle()
    } else {
      console.log('[assigned] waiting for next master cycle', { slot: slotIndex })
    }
  }, [disposeAssignedAudio, startMasterCycle])

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
    await createAssignedAudio(pad, slotIndex)
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
        setMutedSlots((prev) => {
          const next = new Set(prev)
          const muted = next.has(index)
          if (muted) next.delete(index)
          else next.add(index)
          mutedSlotsRef.current = next
          const audio = assignedAudioRef.current.get(index)
          if (audio) {
            audio.muted = !muted
            if (!muted) audio.pause()
            else console.log('[assigned] unmuted; waiting for next master cycle', { slot: index })
          }
          return next
        })
        return
      }
    },
    [slots],
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
    },
    [assignPadToSlot, slots],
  )

  const removeFromSlot = useCallback((index: number) => {
    disposeAssignedAudio(index)
    const hasRemainingAssigned = slots.some((slot, i) => i !== index && slot)
    if (isPlaying && !hasRemainingAssigned) {
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
  }, [clearMasterCycle, disposeAssignedAudio, isPlaying, slots])

  const playAssignedAudioNow = useCallback(async () => {
    console.log('[PLAY LOOPS] clicked')
    console.log('[PLAY LOOPS] starting master cycle')
    if (assignedAudioRef.current.size === 0) {
      setTransportStatus('Stopped')
      return
    }

    startMasterCycle()
  }, [startMasterCycle])

  const pauseAssignedAudioNow = useCallback(() => {
    clearMasterCycle()
    assignedAudioRef.current.forEach((audio) => {
      audio.pause()
    })
    isPlayingRef.current = false
    setIsPlaying(false)
    setTransportStatus('Paused')
  }, [clearMasterCycle])

  const handleStopReset = useCallback(() => {
    clearMasterCycle()
    clearAllAssignedDebugIntervals()
    assignedAudioRef.current.forEach((audio) => {
      audio.pause()
      audio.muted = false
      audio.currentTime = 0
    })
    assignedAudioRef.current.clear()
    isPlayingRef.current = false
    setIsPlaying(false)
    setTransportStatus('Stopped')
    setSlots(Array(SLOT_COUNT).fill(null))
    mutedSlotsRef.current = new Set()
    setMutedSlots(new Set())
    setSelectedPadId(null)
  }, [clearAllAssignedDebugIntervals, clearMasterCycle])

  const handleTestNativeAudioLoop = useCallback(async () => {
    clearDiagnosticNativeTest()
    const beatOneUrl = resolveAudioSrc(PAD_BY_ID['beat-0'])
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
  }, [clearDiagnosticNativeTest, volume])

  const handleStopNativeAudioTest = useCallback(() => {
    clearDiagnosticNativeTest()
    console.log('[diagnostic] native stopped')
  }, [clearDiagnosticNativeTest])

  const handleTestTonePlayerLoop = useCallback(async () => {
    clearDiagnosticToneTest()
    const beatOneUrl = resolveAudioSrc(PAD_BY_ID['beat-0'])
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
  }, [clearDiagnosticToneTest, volume])

  const handleStopToneTest = useCallback(() => {
    clearDiagnosticToneTest()
    console.log('[diagnostic] Tone stopped')
  }, [clearDiagnosticToneTest])

  const filledCount = slots.filter(Boolean).length
  const usedPadIds = useMemo(() => new Set(slots.filter(Boolean) as string[]), [slots])
  const audioDebugUrlsMatch =
    Boolean(diagnosticNativeUrl && assignedBeatOneUrl) &&
    diagnosticNativeUrl === assignedBeatOneUrl

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
          <button
            type="button"
            className={`control-bar__loops ${isPlaying ? 'control-bar__loops--playing' : ''}`}
            onClick={isPlaying ? pauseAssignedAudioNow : playAssignedAudioNow}
            disabled={filledCount === 0}
            aria-label={isPlaying ? 'Pause loops' : 'Play loops'}
          >
            {isPlaying ? 'PAUSE LOOPS' : 'PLAY LOOPS'}
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
  )
}

export default App
