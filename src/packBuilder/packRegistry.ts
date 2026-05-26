/**
 * packRegistry.ts — central registry of compatibility-aware packs.
 *
 * PLAYABLE:  Delta Pack — the only active gameplay pack.
 * ARCHIVED:  Core Mix Alpha, New Pack Alpha, Bravo Pack — preserved for
 *            diagnostics, historical reference, and replay backwards-compatibility.
 *            Not shown in the player-facing UI.
 */

import { coreMixPackAlphaCompatible } from '../generated/audioPacks/coreMixPackAlpha'
import { newPackAlphaCompatible } from '../generated/audioPacks/newPackAlpha'
import { bravoPackCompatible } from '../generated/audioPacks/bravoPack'
import { deltaPackCompatible } from '../generated/audioPacks/deltaPack'
import type { CompatibleAudioPack } from './types'

export const COMPATIBLE_PACKS: Record<string, CompatibleAudioPack> = {
  [deltaPackCompatible.id]: deltaPackCompatible,
  [coreMixPackAlphaCompatible.id]: coreMixPackAlphaCompatible,
  [newPackAlphaCompatible.id]: newPackAlphaCompatible,
  [bravoPackCompatible.id]: bravoPackCompatible,
}

/** IDs of packs shown only in diagnostics — not in the player dropdown. */
export const ARCHIVED_COMPATIBLE_PACK_IDS = new Set<string>([
  coreMixPackAlphaCompatible.id,
  newPackAlphaCompatible.id,
  bravoPackCompatible.id,
])

export const COMPATIBLE_PACK_LIST = Object.values(COMPATIBLE_PACKS)

export function getCompatiblePack(id: string): CompatibleAudioPack | undefined {
  return COMPATIBLE_PACKS[id]
}

/** Returns whether a compatible pack is actively playable or archived. */
export function getPackStatus(id: string): 'playable' | 'archived' {
  return ARCHIVED_COMPATIBLE_PACK_IDS.has(id) ? 'archived' : 'playable'
}

/** Default pack for the diagnostics panel — Delta Pack. */
export const DEFAULT_COMPATIBLE_PACK_ID = deltaPackCompatible.id
