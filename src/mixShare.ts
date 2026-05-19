/** URL hash mix save/load — lightweight JSON + base64url. */

export const MIX_VERSION = 1 as const

export const MIX_PACK_IDS = [
  'trance-pack-1',
  'trance-curated-pack-1',
  'beats-box-pack-1',
  'beats-box-curated-pack-1',
] as const

export type MixPackId = (typeof MIX_PACK_IDS)[number]

export type SavedMix = {
  v: typeof MIX_VERSION
  /** Pack id */
  p: MixPackId
  /** Pad ids per character slot (null = empty) */
  s: (string | null)[]
  /** Muted slot indices */
  m: number[]
  /** Volume 0–100 */
  vol: number
  /** Master pause (global mute) */
  pause: boolean
  /** Transport was playing */
  play: boolean
}

const MIX_HASH_PREFIX = '#mix='
const SLOT_COUNT = 7

function isMixPackId(value: string): value is MixPackId {
  return (MIX_PACK_IDS as readonly string[]).includes(value)
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (base64.length % 4)) % 4
  const padded = base64 + '='.repeat(padLength)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 80
  return Math.min(100, Math.max(0, Math.round(value)))
}

function normalizeSlots(raw: unknown): (string | null)[] | null {
  if (!Array.isArray(raw) || raw.length !== SLOT_COUNT) return null
  const slots: (string | null)[] = []
  for (const entry of raw) {
    if (entry === null) {
      slots.push(null)
      continue
    }
    if (typeof entry !== 'string' || entry.length === 0 || entry.length > 48) {
      return null
    }
    slots.push(entry)
  }
  return slots
}

function normalizeMuted(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  const indices: number[] = []
  for (const entry of raw) {
    if (typeof entry !== 'number' || !Number.isInteger(entry)) continue
    if (entry < 0 || entry >= SLOT_COUNT) continue
    if (!indices.includes(entry)) indices.push(entry)
  }
  return indices.sort((a, b) => a - b)
}

export function encodeMixHash(mix: SavedMix): string {
  const payload = JSON.stringify(mix)
  return `${MIX_HASH_PREFIX}${toBase64Url(payload)}`
}

export function decodeMixFromHash(hash: string): SavedMix | null {
  if (!hash.startsWith(MIX_HASH_PREFIX)) return null

  const encoded = hash.slice(MIX_HASH_PREFIX.length).trim()
  if (!encoded) return null

  try {
    const json = fromBase64Url(encoded)
    const data = JSON.parse(json) as Record<string, unknown>
    if (data.v !== MIX_VERSION) return null
    if (typeof data.p !== 'string' || !isMixPackId(data.p)) return null

    const slots = normalizeSlots(data.s)
    if (!slots) return null

    return {
      v: MIX_VERSION,
      p: data.p,
      s: slots,
      m: normalizeMuted(data.m),
      vol: clampVolume(Number(data.vol)),
      pause: Boolean(data.pause),
      play: Boolean(data.play),
    }
  } catch {
    return null
  }
}

/** True only when the URL contains a decodable #mix= share payload. */
export function hasShareMixInUrl(): boolean {
  return decodeMixFromHash(window.location.hash) !== null
}

/** Remove leftover #mix fragments so a normal reload shows the intro. */
export function clearShareMixFromUrl(): void {
  const { pathname, search, hash } = window.location
  if (!hash.startsWith('#mix')) return
  window.history.replaceState(null, '', `${pathname}${search}`)
}

export function readMixFromLocation(): SavedMix | null {
  const fromHash = decodeMixFromHash(window.location.hash)
  if (fromHash) return fromHash

  if (window.location.hash.startsWith('#mix')) {
    console.warn('[mix] invalid share link')
    clearShareMixFromUrl()
  }
  return null
}

export function buildShareUrl(mix: SavedMix): string {
  const hash = encodeMixHash(mix)
  return `${window.location.origin}${window.location.pathname}${window.location.search}${hash}`
}

export function applyMixToUrl(mix: SavedMix): void {
  const hash = encodeMixHash(mix)
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`)
}
