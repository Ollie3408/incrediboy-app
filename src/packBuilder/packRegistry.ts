/**
 * packRegistry.ts — central registry of compatibility-aware packs.
 */

import { coreMixPackAlphaCompatible } from '../generated/audioPacks/coreMixPackAlpha'
import { newPackAlphaCompatible } from '../generated/audioPacks/newPackAlpha'
import { bravoPackCompatible } from '../generated/audioPacks/bravoPack'
import { deltaPackCompatible } from '../generated/audioPacks/deltaPack'
import type { CompatibleAudioPack } from './types'

export const COMPATIBLE_PACKS: Record<string, CompatibleAudioPack> = {
  [coreMixPackAlphaCompatible.id]: coreMixPackAlphaCompatible,
  [newPackAlphaCompatible.id]: newPackAlphaCompatible,
  [bravoPackCompatible.id]: bravoPackCompatible,
  [deltaPackCompatible.id]: deltaPackCompatible,
}

export const COMPATIBLE_PACK_LIST = Object.values(COMPATIBLE_PACKS)

export function getCompatiblePack(id: string): CompatibleAudioPack | undefined {
  return COMPATIBLE_PACKS[id]
}

export const DEFAULT_COMPATIBLE_PACK_ID = newPackAlphaCompatible.id
