# Delta Foundation Architecture

**Phase:** Delta Foundation Architecture Phase  
**Date:** 2026-05-24  
**Status:** COMPLETE — build clean, 0 errors

---

## Objective

Establish Delta Pack as the canonical reference implementation and master template
for all future IncrediBoy music packs.  Older packs are moved to archive status in
the gameplay menu while their source files, pack configs, generated metadata, and
reports are fully preserved.

---

## Changes Made

### 1 — `src/App.tsx` — Archive older packs from active gameplay selection

`PACK_MENU` restructured from one "Curated Packs" group into three groups:

| Group | Packs |
|---|---|
| **Curated Packs** (active) | Delta Pack *(flagship)*, Trance Curated Pack 1, Beats Box Curated Pack 1 |
| **Archive** | Bravo Pack, New Pack Alpha, Core Mix Pack Alpha, Cyberpunk Pack 1 |
| **Advanced — Raw Packs** | Trance Pack 1, Beats Box Pack 1 |

**What was NOT changed:**
- `ActivePackId` type — all pack IDs remain valid (shared-URL backwards-compatibility)
- `AUDIO_PACKS` record — all packs remain loadable at runtime
- `CURATED_PACK_IDS` set — all curated packs retain their grid layout behaviour
- `GROUPED_CURATED_PACK_IDS` set — grouped panel layout unchanged
- All imports, pad rows, and audio URL maps — fully preserved

Archive packs are still fully playable; they are simply moved below the fold in the
pack selector dropdown so Delta Pack is the clear primary choice.

---

### 2 — `src/packBuilder/defaultDeltaTemplate.ts` *(new file)*

Single source of truth for all future Delta-template pack creation.

#### Constants exported

| Export | Value | Purpose |
|---|---|---|
| `DELTA_TEMPLATE_BPM` | 128 | Spine BPM — all stems must match exactly |
| `DELTA_TEMPLATE_KEY_CENTER` | `'multi'` | Multi-key packs supported |
| `DELTA_TEMPLATE_PAD_COUNTS` | beats:5 bass:4 melody:4 atmo:2 vox:3 fx:3 trans:3 | 24-pad structure |
| `DELTA_TEMPLATE_BAR_LENGTHS` | `[4, 8, 16]` | Accepted bar counts |
| `DELTA_TEMPLATE_LOOP_DURATION_MS` | 4→7500 / 8→15000 / 16→30000 | ms at 128 BPM |
| `DELTA_TEMPLATE_LCM_DURATION_MS` | 30 000 ms | Phase-reset interval |
| `DELTA_TEMPLATE_VOLUME_TARGETS` | per-category min/max/recommended | Volume staging reference |
| `DELTA_TEMPLATE_PLAYBACK_RULES` | per-category mode/quantization/drift | Playback behaviour |
| `DELTA_TEMPLATE_SYNC` | thresholds, flags | Transport lock + phase correction |
| `DELTA_TEMPLATE_CURATION_RULES` | boolean/numeric constraints | Source audio approval criteria |
| `DELTA_TEMPLATE_MIXABILITY_WEIGHTS` | 5 weights summing to 1.0 | Composite score formula |
| `DELTA_TEMPLATE_MINIMUM_MIXABILITY` | per-category floor scores | Approval thresholds |
| `DELTA_TEMPLATE_PAD_PHILOSOPHY` | per-category string[] | Human design intent per slot |
| `DELTA_TEMPLATE_SLOT_MAP` | 24 `DeltaSlotSpec` entries | Full ALL_PADS ↔ category mapping |
| `DELTA_TEMPLATE_BUILD_WORKFLOW` | 9-step string[] | CLI build sequence |

#### Helper functions exported

| Function | Purpose |
|---|---|
| `getDeltaSlotSpec(slotIndex)` | Look up spec for a given ALL_PADS grid index |
| `deltaLoopDurationMs(bars)` | Duration in ms for a bar count at 128 BPM |
| `deltaExpectedDurationSec(bars)` | Duration in seconds for metadata validation |
| `validateDeltaLoopDuration(measuredSec, bars)` | Tolerance check (±50 ms) for audio files |

#### Types exported

| Type | Description |
|---|---|
| `DeltaBarLength` | `4 \| 8 \| 16` — valid bar counts |
| `DeltaSlotSpec` | Full spec for one ALL_PADS slot |

---

### 3 — `src/packBuilder/index.ts` — Template exported from packBuilder barrel

All `defaultDeltaTemplate` exports are re-exported from the packBuilder public API,
making them available to CLI scripts and diagnostics panels via:

```ts
import { DELTA_TEMPLATE_SLOT_MAP, validateDeltaLoopDuration } from '../packBuilder'
```

---

## Delta Rules Codified

### Synchronisation
| Rule | Setting |
|---|---|
| Shared BPM spine | 128 BPM — `DELTA_TEMPLATE_BPM` |
| Accepted bar counts | 4, 8, 16 bars (powers of 2) |
| LCM phase reset | 30 000 ms |
| Beat-grid alignment | `requireExactBarAlignment: true` |
| Max BPM deviation | ±1.5 % |
| Phase soft threshold | 25 ms → `playbackRate` adjustment |
| Phase hard threshold | 80 ms → `audio.currentTime` snap |
| Phase correction interval | every 2 000 ms |
| Batch start | all pads start simultaneously |
| True Transport Lock | pause stores `currentTime`; resume batch-restores |

### Volume Staging
| Category | Min | Max | Recommended |
|---|---|---|---|
| Beats | 0.82 | 0.90 | 0.87 |
| Bass | 0.62 | 0.72 | 0.67 |
| Melody | 0.65 | 0.80 | 0.72 |
| Atmospheres | 0.42 | 0.58 | 0.50 |
| Vocals | 0.48 | 0.65 | 0.55 |
| FX | 0.50 | 0.65 | 0.57 |
| Transitions | 0.45 | 0.60 | 0.52 |

Soft ceiling: **0.95** applied by `padEffVol()` to preserve headroom into the compressor.

### Playback Rules
| Category | Mode | Quantization | Drift Correction |
|---|---|---|---|
| Beats | loop | bar | false |
| Bass | loop | bar | false |
| Melody | loop | bar | false |
| Atmospheres | loop | bar | false |
| Vocals | loop | beat | false |
| FX | loop | bar | false |
| Transitions | loop | bar | false |

FX and transition pads contain silence-padded loops — the active audio event
(hit / sweep / fill) is followed by silence to fill the grid slot, preventing
characters from becoming dead/idle between cycles.

### Pad Structure (24 slots)
```
Slots  0– 4  → Beats 1–5
Slots  5– 7  → Melodies 1–3       (game melody-0..melody-2)
Slot   8     → FX 1               (game effect-0)
Slot   9     → FX 2               (game effect-1)
Slot  10     → FX 3               (game effect-2)
Slot  11     → Transition 1       (game effect-3)
Slot  12     → Melody 4           (game melody-3)
Slot  13     → Atmosphere 1       (game melody-4)
Slots 14–17  → Bass 1–4           (game percussion-0..percussion-3)
Slot  18     → Transition 2       (game percussion-4)
Slots 19–21  → Vocals 1–3        (game voice-0..voice-2)
Slot  22     → Transition 3       (game voice-3)
Slot  23     → Atmosphere 2       (game voice-4)
```

---

## Archive Status — Older Packs

| Pack | Status | Source Files | Pack Config | Audio Assets | Reports | Gameplay Menu |
|---|---|---|---|---|---|---|
| Cyberpunk Pack 1 | ARCHIVED | ✓ preserved | ✓ preserved | ✓ preserved | ✓ preserved | Archive group |
| Core Mix Pack Alpha | ARCHIVED | ✓ preserved | ✓ preserved | ✓ preserved | ✓ preserved | Archive group |
| New Pack Alpha | ARCHIVED | ✓ preserved | ✓ preserved | ✓ preserved | ✓ preserved | Archive group |
| Bravo Pack | ARCHIVED | ✓ preserved | ✓ preserved | ✓ preserved | ✓ preserved | Archive group |
| **Delta Pack** | **ACTIVE** | ✓ preserved | ✓ preserved | ✓ preserved | ✓ preserved | **Curated Packs** |

Archived packs remain fully loadable and playable at runtime.  Any shared mix URL
that references an archived pack will continue to work without modification.

---

## Future Pack Build Workflow

```
1. Place source stems in:  ~/Documents/<new-source-folder>/
2. Scan:    npm run pack:scan    -- --source=<folder> --template=delta
3. Review:  reports/<pack>-scan.md  —  verify BPM, bars, categories
4. Preview: npm run pack:preview -- --template=delta
5. Listen:  <folder>/recommended-audio-preview/demo-preview-mix.wav
6. Build:   npm run pack:build-delta-template -- --name=<PackName>
7. Validate: reports/<pack>-final-build.md  —  confirm 24 pads, no drift
8. Register: src/generated/audioPacks/<packName>.ts  (auto-generated)
9. Auto-patch: App.tsx + packRegistry.ts  (add to ActivePackId + PACK_MENU)
```

All build commands will consume `defaultDeltaTemplate.ts` as the authoritative
specification for BPM, bar lengths, volume targets, playback rules, and
mixability thresholds.

---

## Validation

```
npm run build  →  exit 0, 0 TypeScript errors
```

- Delta Pack appears at the top of the "Curated Packs" dropdown
- Archive packs appear in a separate "Archive" group below
- All 24 Delta Pack pads remain fully playable
- Shared URLs referencing archived packs continue to load correctly
- `defaultDeltaTemplate.ts` is exported from `src/packBuilder/index.ts`

---

## Files Changed

| File | Change |
|---|---|
| `src/App.tsx` | `PACK_MENU` restructured — archived 4 packs, Delta promoted to top |
| `src/packBuilder/defaultDeltaTemplate.ts` | **NEW** — canonical Delta template |
| `src/packBuilder/index.ts` | Re-exports all `defaultDeltaTemplate` symbols |
| `reports/delta-foundation-architecture.md` | **NEW** — this report |
