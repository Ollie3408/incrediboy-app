# Core Mix Pack Alpha — Audit (2026-05-20)

## Duplicates found (before fix)

| Issue | Pads affected | Root cause |
|-------|---------------|------------|
| Identical WAV file | `cma-beat-01` + `cma-beat-04` | `beat_04.wav` was a copy of `beat_01.wav` |
| Identical WAV file | `cma-atmo-01` + `cma-atmo-02` | `atmosphere_02.wav` copied from `atmosphere_01.wav` |
| Same audio path | `cma-melody-02` + `cma-melody-04` | Both pointed at `melody/melody_02.wav` |
| Same audio path | `cma-bass-01` + `cma-bass-04` | Both pointed at `bass/bass_01.wav` |
| Same audio path | `cma-vox-01` + `cma-vox-aux` | Both pointed at `vocals/vocal_01.wav` |
| Same audio path | `cma-fx-01` + `cma-fx-aux-02` | Both pointed at `fx/fx_01.wav` |
| Same audio path | `cma-fx-aux-01`, `cma-trans-perc`, `cma-trans-vox` | All used `transitions/transition_02.wav` (also same bytes as `fx/fx_02`) |

## Pads replaced (audio + config)

| Pad | New file | Source |
|-----|----------|--------|
| `cma-beat-04` | `beats/beat_04.wav` | MMP 110 BPM Drum Loop 01 Beat V1 |
| `cma-melody-04` | `melody/melody_04.wav` | MMP C 105 Synth Loop 17 (Wet) |
| `cma-atmo-02` | `atmospheres/atmosphere_02.wav` | MMP A 93 BPM Synth Loop 20 V2 (Wet) |
| `cma-bass-04` | `bass/bass_04.wav` | MMP C 105 Bass Loop 10 V2 (Wet) |
| `cma-vox-aux` | `vocals/vocal_03.wav` | MMP C 93 Synth Loop 21 V1 (Wet) |
| `cma-fx-aux-01` | `fx/fx_03.wav` | MMP FX Reverse One Shot 06 |
| `cma-fx-aux-02` | `fx/fx_04.wav` | MMP FX Buildup One Shot 08 |
| `cma-trans-perc` | `transitions/transition_03.wav` | MMP FX One Shot 03 |
| `cma-trans-vox` | `transitions/transition_02.wav` | MMP FX One Shot 02 (distinct from fx_02) |

## Loop issues (cause)

- **Duplicate files**: Two pads sharing one WAV sounded like “no second layer” or identical characters.
- **Wrong playbackMode**: Not the issue — all loop pads were already `playbackMode: 'loop'`; runtime sets `audio.loop = true` for non–one-shot pads.
- **Off-spine loops** (still valid native loops, but phase vs 105 BPM master): `cma-beat-04` (110 BPM, 8.73s), vocals/atmo-02 (93 BPM, 20.67s). These repeat continuously but drift against the 9.14s spine.

## Validation

```bash
npm run validate:core-mix
```

Checks: 24 pads, unique URLs, unique MD5, files on disk, loop/one-shot modes.

## Final pad table

| Pad id | Label | Category | Audio URL | Source file | Mode | Quantize | Vol | Duration (s) | Loops | Dup |
|--------|-------|----------|-----------|-------------|------|----------|-----|--------------|-------|-----|
| cma-beat-01 | Kick/Snare | beat | `/audio/core-mix-pack-alpha/beats/beat_01.wav` | Drum_Loop_04_(Beat) | loop | bar | 0.86 | 9.143 | yes | no |
| cma-beat-02 | Hi-Hats | beat | `.../beats/beat_02.wav` | Drum_Loop_04_(Top) | loop | bar | 0.62 | 9.143 | yes | no |
| cma-beat-03 | Soft Kit | beat | `.../beats/beat_03.wav` | Drum_Loop_04_(Full) | loop | bar | 0.58 | 9.143 | yes | no |
| cma-beat-04 | Alt Beat | beat | `.../beats/beat_04.wav` | Drum_Loop_01_(Beat)_V1 110bpm | loop | bar | 0.52 | 8.727 | yes | no |
| cma-trans-beat | Sweep | transition | `.../transitions/transition_01.wav` | FX_Downnoise_07 | one-shot | beat | 0.58 | 8.000 | no | no |
| cma-melody-01 | Hook F | melody | `.../melody/melody_01.wav` | Synth_Loop_18_V1 F | loop | bar | 0.68 | 9.143 | yes | no |
| cma-melody-02 | Motif C | melody | `.../melody/melody_02.wav` | Synth_Loop_19_V1 C | loop | bar | 0.64 | 9.143 | yes | no |
| cma-melody-03 | Motif C2 | melody | `.../melody/melody_03.wav` | Synth_Loop_19_V2 C | loop | bar | 0.60 | 9.143 | yes | no |
| cma-fx-01 | Reverse | fx | `.../fx/fx_01.wav` | FX_Reverse_05 | one-shot | immediate | 0.58 | 1.333 | no | no |
| cma-fx-02 | Impact | fx | `.../fx/fx_02.wav` | FX_One_Shot_01 | one-shot | immediate | 0.55 | 4.364 | no | no |
| cma-fx-aux-01 | Reverse B | fx | `.../fx/fx_03.wav` | FX_Reverse_06 | one-shot | beat | 0.42 | 1.333 | no | no |
| cma-fx-aux-02 | Build | fx | `.../fx/fx_04.wav` | FX_Buildup_08 | one-shot | bar | 0.38 | 12.647 | no | no |
| cma-atmo-01 | Air | atmosphere | `.../atmospheres/atmosphere_01.wav` | Synth_Loop_18_V2 A# | loop | bar | 0.48 | 9.143 | yes | no |
| cma-melody-04 | Lead C | melody | `.../melody/melody_04.wav` | Synth_Loop_17 C | loop | bar | 0.44 | 9.143 | yes | no |
| cma-bass-01 | Bass | bass | `.../bass/bass_01.wav` | Bass_Loop_09_V1 | loop | bar | 0.68 | 9.143 | yes | no |
| cma-bass-02 | Bass Alt | bass | `.../bass/bass_02.wav` | Bass_Loop_09_V2 | loop | bar | 0.62 | 9.143 | yes | no |
| cma-bass-03 | Sub Pulse | bass | `.../bass/bass_03.wav` | Bass_Loop_10_V1 | loop | bar | 0.56 | 9.143 | yes | no |
| cma-bass-04 | Sub Deep | bass | `.../bass/bass_04.wav` | Bass_Loop_10_V2 | loop | bar | 0.40 | 9.143 | yes | no |
| cma-trans-perc | Hit | transition | `.../transitions/transition_03.wav` | FX_One_Shot_03 | one-shot | beat | 0.52 | 13.091 | no | no |
| cma-vox-01 | Chop A | voice | `.../vocals/vocal_01.wav` | Vox_Loop_22_V1 E | loop | beat | 0.52 | 20.667 | yes | no |
| cma-vox-02 | Chop B | voice | `.../vocals/vocal_02.wav` | Vox_Loop_22_V2 G | loop | beat | 0.48 | 20.667 | yes | no |
| cma-vox-aux | Synth Vox | voice | `.../vocals/vocal_03.wav` | Synth_Loop_21_V1 C | loop | beat | 0.36 | 20.667 | yes | no |
| cma-trans-vox | Stab | transition | `.../transitions/transition_02.wav` | FX_One_Shot_02 | one-shot | beat | 0.45 | 4.364 | no | no |
| cma-atmo-02 | Wide Pad | atmosphere | `.../atmospheres/atmosphere_02.wav` | Synth_Loop_20_V2 A | loop | bar | 0.42 | 20.667 | yes | no |

## Remaining `needsSource` (better material later)

| Pad | Why |
|-----|-----|
| `cma-beat-04` | Only 3× 105 BPM drum loops exist in MMP EP8; slot uses **110 BPM** alt — loops natively but **phases** vs 105 spine. Needs a **4th 105 BPM** isolated drum stem if one is produced. |
| `cma-vox-01`, `cma-vox-02`, `cma-vox-aux` | **93 BPM / 20.67s** — no 105 BPM vocal chops in pack; loops OK, rhythmic glue is approximate. |
| `cma-atmo-02` | **93 BPM / 20.67s** wide pad — same drift note as vocals. |
