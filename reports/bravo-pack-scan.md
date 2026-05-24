# Bravo Pack — Full Scan Report
Generated: 2026-05-23  
Source: `~/Documents/bravo/`

---

## 1. Spine Analysis

| | |
|---|---|
| Dominant BPM | **120** |
| BPM Range Found | 100–128 BPM |
| Suggested Key | **C** (majority of files) |
| Files scanned | 53 total |
| Duplicate pairs (MD5) | 2 |
| "Copy" files excluded | 4 |
| Too-long rejects (>30s) | 9 |
| Net viable candidates | 36 |

> ⚠️ **CRITICAL: BPM INCOMPATIBILITY WITH INCREDIBOY SPINE**  
> IncrediBoy's current game spine is **105 BPM**. The Bravo folder is a **120 BPM collection**.  
> This is a Δ15 BPM difference → **14.3% tempo gap** — far beyond the ±2% safe correction threshold.  
> A Bravo Pack must either: (a) run at its own 120 BPM spine, or (b) have all audio tempo-shifted.  
> **This analysis treats Bravo as a 120 BPM pack independent of existing packs.**

---

## 2. Full File Inventory

### Auto-Rejected Files

| File | Reason |
|------|--------|
| `freesound_community-interstate-synth-stabs-32382.mp3` | Too long (37.5s) — likely full arrangement |
| `kamhunt-ultimatum-120bpm-orchestra-loop-325053.mp3` | Too long (34.0s) — full orchestral loop |
| `freesound_community-cabbage-pancake-beat-27525.mp3` | Too long (46.3s) |
| `freesound_community-dirt-beat-120-53928.mp3` | Too long (67.6s) |
| `freesound_community-bass-loops-003-with-drums-long-loop-120-bpm-24371.mp3` | Too long (128.1s) — full song section |
| `freesound_community-bass-loops-004-with-drums-long-loop-120-bpm-59055.mp3` | Too long (128.1s) |
| `freesound_community-bass-loops-005-with-drums-long-loop-120-bpm-58998.mp3` | Too long (128.1s) |
| `freesound_community-bass-loops-006-with-drums-long-loop-120-bpm-6111.mp3` | Too long (127.5s) + DUPLICATE MD5 (see below) |
| `freesound_community-bass-loops-008-long-loop-120-bpm-59051.mp3` | Too long (128.1s) |
| `freesound_community-005786_background-melody-4wav-61344.mp3` | Too long (253.1s) — full song, not a loop |
| `freesound_community-120-juice-demo-sound-57384.mp3` | Too long (103.7s) |

### Duplicate Files Detected (Same MD5 Hash)

| MD5 | File A | File B |
|-----|--------|--------|
| `1c65a1b2...` | `bass/freesound_community-bass-drum-loop-made-in-vcv-rack-1198-bpm-98847.mp3` | `percussion/freesound_community-bass-drum-loop-made-in-vcv-rack-1198-bpm-98847.mp3` |
| `9a7525a4...` | `bass/freesound_community-bass-loops-006-with-drums-long-loop-120-bpm-6111.mp3` | `beats/freesound_community-bass-loops-006-with-drums-long-loop-120-bpm-6111.mp3` |

### "Copy" Files Excluded

| File | Reason |
|------|--------|
| `beats/freesound_community-060289_beat-120bpm-89119 copy.mp3` | Duplicate of original |
| `beats/freesound_community-120-static-noise-beat-80907 copy.mp3` | Duplicate of original |
| `beats/freesound_community-drumbeat1-84753 copy.mp3` | Duplicate of original |

### Empty Folders

| Folder | Status |
|--------|--------|
| `Transitions/` | **EMPTY** — zero audio files found |
| `percussion/` | 3 files (1 duplicate rejected, 1 too long) → net 1 usable |

---

## 3. Bar-Alignment Analysis (All Viable Files)

| File | Duration | Best BPM | Bars | Drift % | Quality | Status |
|------|----------|----------|------|---------|---------|--------|
| `bass-f-e-dd-120bpm-10-69591.mp3` | 16.06s | 120 | 8 | 0.35% | ✅ EXCELLENT | Bass (in FX folder) |
| `clickers-120-89793.mp3` | 2.06s | 116 | 1 | 0.24% | ✅ EXCELLENT | Rhythmic clicker |
| `sine-loop-120-bpm-105847.mp3` | 8.05s | 120 | 4 | 0.57% | 🟢 GOOD | Sine texture |
| `11325622-scratch-hit-120bpm-240471.mp3` | 1.54s | — | — | — | ⚠️ NO ALIGNMENT | One-shot hit |
| `farran_ez-midwest-emo-guitar-...` | 10.24s | — | — | — | ⚠️ NO ALIGNMENT | B minor guitar |
| `120-distressed-break-105192.mp3` | 8.06s | 120 | 4 | 0.80% | 🟢 GOOD | Break |
| `120bpm1lambda8sd-85646.mp3` | 8.06s | 120 | 4 | 0.80% | 🟢 GOOD | Textural (unidentified) |
| `120bpm2lambda8sd-104448.mp3` | 8.06s | 120 | 4 | 0.80% | 🟢 GOOD | Textural (unidentified) |
| `120bpm3lambda8sd-104449.mp3` | 6.14s | 118 | 3 | 0.69% | 🟢 GOOD | Textural (unidentified) |
| `earth-orbiter-76626.mp3` | 18.05s | 120 | 9 | 0.27% | ✅ EXCELLENT | Space atmosphere |
| `11325622-mega-bass-sub-drop-...` | 1.38s | — | — | — | ⚠️ NO ALIGNMENT | Sub drop one-shot |
| `bass-loop-007-dry-120-bpm-pbass-pick-95494.mp3` | 4.06s | 118 | 2 | 0.29% | ✅ EXCELLENT | Dry pick bass |
| `bass-loops-011-short-loop-120-bpm-25900.mp3` | 16.06s | 120 | 8 | 0.35% | ✅ EXCELLENT | Bass loop |
| `e_pop-120bpm-29802.mp3` | 16.06s | 120 | 8 | 0.35% | ✅ EXCELLENT | Pop bass |
| `energy-001-91283.mp3` | 3.62s | 128 | 2 | 3.36% | 🟠 POOR | Unusable at 120 BPM |
| `plingers-delight-106506.mp3` | 7.70s | 125 | 4 | 0.31% | ✅ EXCELLENT | Melodic bass (125 BPM!) |
| `subbass-wobble-106579.mp3` | 7.73s | 124 | 4 | 0.18% | ✅ EXCELLENT | Sub wobble (124 BPM!) |
| `thnwfx-the-flying-crow-bass-section-master-...` | 4.62s | 105 | 2 | 1.15% | 🟢 GOOD | ⚠️ MASTERED track |
| `056670_matt39s-beatbox-loop-100bpm-87492.mp3` | 9.65s | 100 | 4 | 0.50% | 🟢 GOOD | Beatbox (100 BPM!) |
| `060289_beat-120bpm-89119.mp3` | 8.04s | 120 | 4 | 0.50% | ✅ EXCELLENT | Main beat |
| `120-static-noise-beat-80907.mp3` | 7.94s | 120 | 4 | 0.70% | 🟢 GOOD | Static noise beat |
| `capoeirabeat-91343.mp3` | 2.45s | 100 | 1 | 2.00% | 🟡 FAIR | Short capoeira hit |
| `deep_kick_solo-120bpm-96472.mp3` | 8.05s | 120 | 4 | 0.57% | 🟢 GOOD | Kick solo |
| `drum_kit_acoustic120-81800.mp3` | 3.62s | 128 | 2 | 3.36% | 🟠 POOR | Unusable at 120 BPM |
| `drumbeat1-84753.mp3` | 4.37s | 110 | 2 | 0.10% | ✅ EXCELLENT | 110 BPM drum (mismatch!) |
| `guitar-loops-011-short-stereo-120-bpm-reverb-95564.mp3` | 9.55s | 100 | 4 | 0.50% | 🟢 GOOD | Guitar reverb (100 BPM!) |
| `kick-closed-hat-loop-120bpm-02-100556.mp3` | 8.18s | 118 | 4 | 0.59% | 🟢 GOOD | Kick + hat |
| `loop120-93177.mp3` | 2.06s | 116 | 1 | 0.24% | ✅ EXCELLENT | Short loop |
| `taiko-drumloop-001-120-97780.mp3` | 8.06s | 120 | 4 | 0.80% | 🟢 GOOD | Taiko drums |
| `glassy-synth-melody-120bpm-30149.mp3` | 16.06s | 120 | 8 | 0.35% | ✅ EXCELLENT | Glassy synth |
| `summertime-stab-106499.mp3` | 8.06s | 120 | 4 | 0.80% | 🟢 GOOD | Stab texture |
| `idoberg-relaxing-guitar-loop-v5-245859.mp3` | 18.31s | 118 | 9 | 0.04% | ✅ PERFECT | Guitar loop |
| `u_ayhid6h0jf-synth-loop-120bpm-449798.mp3` | 4.05s | 118 | 2 | 0.46% | ✅ EXCELLENT | Short synth |
| `wiss_1-92590.mp3` | 1.92s | 125 | 1 | 0.00% | ✅ PERFECT | Percussion hit |
| `amsleybeats-female-vocals-120bpm-a-minor-277705.mp3` | 20.04s | 120 | 10 | 0.18% | ✅ EXCELLENT | Female vocals A min |
| `faultycrimal1-f-major-120bpm-vocal-samples-470636.mp3` | 14.92s | 128 | 8 | 0.56% | 🟢 GOOD | F major vocal samples |

---

## 4. Category Coverage Assessment

| Category | Files Found | Usable | Target | Coverage |
|----------|-------------|--------|--------|----------|
| Beats | 17 (folder) | 8 | 4 | ✅ Good |
| Bass | 11 (folder) | 5 | 4 | ✅ Good |
| Melody | 5 (folder) | 4 | 4 | ✅ Sufficient |
| Atmospheres | 8 (folder) | 3 | 2 | ✅ Sufficient |
| Vocals | 2 (folder) | 2 | 3 | ⚠️ Short (need 1 more) |
| FX | 4 (FX folder) | 3 | 4 | ⚠️ Need repurposing |
| Transitions | 0 (empty!) | 0 | 3 | ❌ **NONE** — repurposing required |

### Notable Gaps

1. **Zero transitions** — `Transitions/` folder is completely empty. Three files repurposed as transitions: distressed break, wiss hit, capoeira hit.
2. **Only 2 vocal files** — beatbox loop from beats folder repurposed as vocal-03.
3. **No atmosphere-labeled atmospheres** — the `atmospheres/` folder contains mixed percussion, breaks, and ambient content. Earth orbiter and B minor guitar selected.
4. **FX folder mislabeled** — contains bass lines and synth loops rather than traditional one-shot FX. Only 2 one-shots available (`clickers`, `sine-loop`). Two one-shots sourced from other folders.

---

## 5. BPM Coherence Warning

The Bravo collection is **not internally consistent at 120 BPM**. Detected BPMs across the collection:

| Detected BPM | Files |
|---|---|
| 100 | beatbox loop, guitar reverb loop, capoeirabeat |
| 105 | flying-crow bass (mastered — suspect) |
| 110 | drumbeat1 |
| 116 | clickers, loop120 |
| 118 | bass-loop-007-dry, synth-loop, kick-closed-hat, relaxing guitar |
| 120 | majority of files (beat-89119, kick solo, taiko, e_pop, bass-011, glassy synth, summertime stab, earth orbiter, female vocals) |
| 124 | subbass wobble |
| 125 | plingers-delight, wiss hit |
| 128 | f-major vocal samples, energy-001 |

**5 pads require drift correction** to align with the 120 BPM spine.  
**vocal-03 (beatbox @ 100 BPM) exceeds safe correction threshold** — flagged for review.

---

## 6. Recommended 24-Pad Selection Summary

| Slot | Role | Source File | BPM | Mode |
|------|------|-------------|-----|------|
| 0 | beat-01 | `060289_beat-120bpm-89119.mp3` | 120 | loop |
| 1 | beat-02 | `deep_kick_solo-120bpm-96472.mp3` | 120 | loop |
| 2 | beat-03 | `taiko-drumloop-001-120-97780.mp3` | 120 | loop |
| 3 | beat-04 | `kick-closed-hat-loop-120bpm-02-100556.mp3` | 118 | loop |
| 4 | trans-01 | `120-distressed-break-105192.mp3` | 120 | one-shot |
| 5 | melody-01 | `glassy-synth-melody-120bpm-30149.mp3` | 120 | loop |
| 6 | melody-02 | `u_ayhid6h0jf-synth-loop-120bpm-449798.mp3` | 118 | loop |
| 7 | melody-03 | `summertime-stab-106499.mp3` | 120 | loop |
| 8 | fx-01 | `clickers-120-89793.mp3` | 116 | loop |
| 9 | fx-02 | `sine-loop-120-bpm-105847.mp3` | 120 | loop |
| 10 | fx-03 | `11325622-scratch-hit-120bpm-240471.mp3` | — | one-shot |
| 11 | fx-04 | `11325622-mega-bass-sub-drop-effect-240472.mp3` | — | one-shot |
| 12 | atmo-01 | `earth-orbiter-76626.mp3` | 120 | loop |
| 13 | melody-04 | `idoberg-relaxing-guitar-loop-v5-245859.mp3` | 118 | loop |
| 14 | bass-01 | `bass-loop-007-dry-120-bpm-pbass-pick-95494.mp3` | 118 | loop |
| 15 | bass-02 | `bass-loops-011-short-loop-120-bpm-25900.mp3` | 120 | loop |
| 16 | bass-03 | `e_pop-120bpm-29802.mp3` | 120 | loop |
| 17 | bass-04 | `subbass-wobble-106579.mp3` | 124 | loop |
| 18 | trans-02 | `wiss_1-92590.mp3` | 125 | one-shot |
| 19 | vocal-01 | `amsleybeats-female-vocals-120bpm-a-minor-277705.mp3` | 120 | loop |
| 20 | vocal-02 | `faultycrimal1-f-major-120bpm-vocal-samples-470636.mp3` | 128 | loop |
| 21 | vocal-03 | `056670_matt39s-beatbox-loop-100bpm-87492.mp3` | 100 | loop |
| 22 | trans-03 | `capoeirabeat-91343.mp3` | — | one-shot |
| 23 | atmo-02 | `farran_ez-midwest-emo-guitar-sample-b-min-clean-120-bpm-448317.mp3` | — | loop |

---

## 7. Preview Export

- **Folder**: `~/Documents/bravo/recommended-audio-preview/`
- **Files**: 24 renamed (category-numbered convention)
- **Demo mix**: `demo-preview-mix.wav` — 32 bars @ 120 BPM, loudnorm -14 LUFS, stereo 44.1kHz

---

## 8. Next Steps

1. **Listen** to `demo-preview-mix.wav` and all category subfolders in Finder
2. **Flag** any sounds that feel wrong, too complex, or don't layer well
3. **Download replacements** for:
   - vocal-03 (beatbox @ 100 BPM — tempo mismatch too large)
   - atmo-02 (no clean bar alignment — listen first)
   - Transitions (all 3 are repurposed — ideally source actual sweep/riser files)
4. **Edit** `reports/bravo-pack-selection.json` `sourcePath` fields if replacing
5. **Set** `"approved": true` when satisfied
6. **Run** `npm run pack:build -- --selection reports/bravo-pack-selection.json`

> Do NOT approve or build until listening review is complete.
