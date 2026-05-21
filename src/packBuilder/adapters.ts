/**
 * adapters.ts — bridge CompatibleAudioPack → runtime App.tsx pack shape.
 * Use when registering Core Mix Pack Alpha in AUDIO_PACKS (future step).
 */

import type { QuantizeMode } from '../musicClock'
import type { CompatibleAudioPack, CompatiblePackPad } from './types'

/** Runtime pad shape expected by App.tsx (subset — extend as needed). */
export type RuntimeCompatiblePad = {
  id: string
  category: CompatiblePackPad['gameCategory']
  audioFile: string
  sourceFile: string
  volume: number
  playbackMode: 'loop' | 'one-shot'
  playbackQuantization?: QuantizeMode
  allowDriftCorrection: boolean
  bpm: number | null
  bars: number | null
}

export function compatiblePadToRuntime(pad: CompatiblePackPad): RuntimeCompatiblePad {
  const c = pad.compatibility
  return {
    id: pad.id,
    category: pad.gameCategory,
    audioFile: pad.audioFile,
    sourceFile: pad.sourceFile,
    volume: pad.volume,
    playbackMode: c.oneShot ? 'one-shot' : 'loop',
    playbackQuantization: c.playbackQuantization,
    allowDriftCorrection: false,
    bpm: c.bpm,
    bars: c.bars,
  }
}

export function compatiblePackToRuntimePads(pack: CompatibleAudioPack): RuntimeCompatiblePad[] {
  return pack.pads.map(compatiblePadToRuntime)
}
