/**
 * packRegistry.ts — central registry of compatibility-aware packs.
 */

import { coreMixPackAlphaCompatible } from '../generated/audioPacks/coreMixPackAlpha'
import { newPackAlphaCompatible } from '../generated/audioPacks/newPackAlpha'
import type { CompatibleAudioPack } from './types'

export const COMPATIBLE_PACKS: Record<string, CompatibleAudioPack> = {
  [coreMixPackAlphaCompatible.id]: coreMixPackAlphaCompatible,
  [newPackAlphaCompatible.id]: newPackAlphaCompatible,
}

export const COMPATIBLE_PACK_LIST = Object.values(COMPATIBLE_PACKS)

export function getCompatiblePack(id: string): CompatibleAudioPack | undefined {
  return COMPATIBLE_PACKS[id]
}

export const DEFAULT_COMPATIBLE_PACK_ID = newPackAlphaCompatible.id
