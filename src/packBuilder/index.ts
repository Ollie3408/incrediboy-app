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
  ARCHIVED_COMPATIBLE_PACK_IDS,
  getCompatiblePack,
  getPackStatus,
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

export {
  DELTA_TEMPLATE_BPM,
  DELTA_TEMPLATE_KEY_CENTER,
  DELTA_TEMPLATE_PAD_COUNTS,
  DELTA_TEMPLATE_BAR_LENGTHS,
  DELTA_TEMPLATE_LOOP_DURATION_MS,
  DELTA_TEMPLATE_LCM_DURATION_MS,
  DELTA_TEMPLATE_VOLUME_TARGETS,
  DELTA_TEMPLATE_PLAYBACK_RULES,
  DELTA_TEMPLATE_SYNC,
  DELTA_TEMPLATE_CURATION_RULES,
  DELTA_TEMPLATE_MIXABILITY_WEIGHTS,
  DELTA_TEMPLATE_MINIMUM_MIXABILITY,
  DELTA_TEMPLATE_PAD_PHILOSOPHY,
  DELTA_TEMPLATE_SLOT_MAP,
  DELTA_TEMPLATE_BUILD_WORKFLOW,
  getDeltaSlotSpec,
  deltaLoopDurationMs,
  deltaExpectedDurationSec,
  validateDeltaLoopDuration,
} from './defaultDeltaTemplate'
export type { DeltaBarLength, DeltaSlotSpec } from './defaultDeltaTemplate'
