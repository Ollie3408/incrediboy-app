export type {
  CompatibleAudioPack,
  CompatiblePackPad,
  CompatiblePackSpine,
  CoreMixCategory,
  HarmonicGroup,
  MixCompatibilityReport,
  PadCompatibilityReport,
  SoundCompatibilityMetadata,
} from './types'

export {
  normalizeKey,
  keyToHarmonicGroup,
  harmonicCompatibilityPercent,
  averageHarmonicMatch,
} from './harmonicGroups'

export {
  expectedLoopDuration,
  analyzeLoopDuration,
  estimateBpmCompatibility,
  estimateHarmonicCompatibility,
  detectLowEndConflict,
  detectDensityOverload,
  scoreInteractiveMixability,
  analyzePadCompatibility,
  analyzeActiveMix,
  analyzePackCuration,
  validatePackSpine,
} from './packAnalysis'

export {
  COMPATIBLE_PACKS,
  COMPATIBLE_PACK_LIST,
  getCompatiblePack,
  DEFAULT_COMPATIBLE_PACK_ID,
} from './packRegistry'

export { isDevDiagnosticsEnabled } from './devDiagnosticsConfig'
export { DevDiagnosticsDrawer } from './DevDiagnosticsDrawer'
export { PackCompatibilityPanel } from './PackCompatibilityPanel'
export { compatiblePadToRuntime, compatiblePackToRuntimePads } from './adapters'
export type { RuntimeCompatiblePad } from './adapters'

export {
  coreMixPackAlpha,
  coreMixPackAlphaPads,
  coreMixPackAlphaCompatible,
  CORE_MIX_CATEGORY_COLORS,
  buildCoreMixCompatiblePack,
} from '../generated/audioPacks/coreMixPackAlpha'
