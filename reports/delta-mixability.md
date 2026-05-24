# Delta Pack — Mixability Report

**BPM:** 128  |  **Pack identity:** Digital/Synth Electro  
**Harmonic keys:** C#min · Gmin · Amin · A#min · Fmin

---

## Mixability Scores by Pad

| Pad ID              | Label         | Score | Category    | Key    | Risk      |
|---------------------|---------------|-------|-------------|--------|-----------|
| deltaPack-beat-01   | Byte Groove   | 94    | beat        | —      | ✅ Safest |
| deltaPack-beat-04   | Byte Top      | 90    | beat        | —      | ✅ Safe   |
| deltaPack-beat-02   | Byte Hat      | 91    | beat        | —      | ✅ Safe   |
| deltaPack-beat-03   | Byte Full     | 89    | beat        | —      | ✅ Safe   |
| deltaPack-beat-05   | Byte Accent   | 88    | beat        | —      | ✅ Safe   |
| deltaPack-trans-01  | Byte Fill A   | 92    | transition  | —      | ✅ Safe   |
| deltaPack-trans-02  | Byte Fill B   | 91    | transition  | —      | ✅ Safe   |
| deltaPack-atmo-01   | Byte Atmos C# | 88    | atmosphere  | C#     | ✅ Safe   |
| deltaPack-atmo-02   | Byte Atmos Am | 87    | atmosphere  | A      | ✅ Safe   |
| deltaPack-fx-01     | Byte Impact   | 90    | fx          | —      | ✅ Safe   |
| deltaPack-fx-02     | Byte Uplift   | 87    | fx          | —      | ✅ Safe   |
| deltaPack-fx-03     | Byte Riser    | 84    | fx          | C      | 🟡 Watch  |
| deltaPack-bass-04   | Byte Bass A#  | 84    | bass        | A#     | ✅ Safe   |
| deltaPack-bass-01   | Byte Bass C#  | 85    | bass        | C#     | ✅ Safe   |
| deltaPack-bass-02   | Byte Bass G   | 83    | bass        | G      | ✅ Safe   |
| deltaPack-bass-03   | Byte Bass Am  | 82    | bass        | A      | ✅ Safe   |
| deltaPack-melody-01 | Byte Lead C#  | 86    | melody      | C#     | ✅ Safe   |
| deltaPack-melody-02 | Byte Lead G   | 84    | melody      | G      | ✅ Safe   |
| deltaPack-melody-03 | Byte Lead Am  | 82    | melody      | A      | ✅ Safe   |
| deltaPack-melody-04 | Byte Lead A#  | 80    | melody      | A#     | 🟡 Watch  |
| deltaPack-vocal-01  | VCT Chop C#   | 82    | vocal       | C#     | ✅ Safe   |
| deltaPack-vocal-02  | VCT Chop G    | 81    | vocal       | G      | ✅ Safe   |
| deltaPack-trans-03  | Byte Drop     | 85    | transition  | —      | ✅ Safe   |
| deltaPack-vocal-03  | VCT Chop Fm   | 78    | vocal       | F      | 🟠 Chromatic |

---

## Harmonic Compatibility Matrix

```
         C#min  Gmin   Amin   A#min  Fmin
C#min  [  ✅  ][ 🟡  ][  ✅  ][ ✅  ][ 🟠 ]
Gmin   [ 🟡  ][  ✅  ][ 🟡  ][ ✅  ][ ✅ ]
Amin   [  ✅  ][ 🟡  ][  ✅  ][ 🟡  ][ 🟡 ]
A#min  [  ✅  ][ ✅  ][ 🟡  ][ ✅  ][ ✅ ]
Fmin   [ 🟠  ][ ✅  ][ 🟡  ][ ✅  ][ ✅ ]
```

**Legend:** ✅ Compatible · 🟡 Possible tension · 🟠 Chromatic clash risk

### Safest Key Combinations
1. **C#min stack** (bass-01 + melody-01 + atmo-01 + vocal-01) — fully stem-matched, all from Loop 001
2. **Gmin stack** (bass-02 + melody-02 + vocal-02) — Loop 002 stems, clean internal harmony
3. **Amin stack** (bass-03 + melody-03 + atmo-02) — Loop 003 stems, moody/dark

### Compatible Cross-Key Pairs
- C#min + A#min: enharmonically related (Db minor ↔ Bb minor — share Db/C# root)
- Gmin + A#min: relative key relationship (Bb minor → Db major → C# overlap)
- Fmin: most chromatic; works with Gmin/A#min but avoid mixing with C#min melody simultaneously

---

## Gameplay Stack Recommendations

| Stack Name   | Pads                                       | Harmony | Fatigue |
|-------------|---------------------------------------------|---------|---------|
| C# Core     | beat-01 + bass-01 + melody-01 + atmo-01    | ✅      | Low     |
| G Dark      | beat-01 + bass-02 + melody-02 + vocal-02   | ✅      | Low     |
| A Minor Dub | beat-01 + bass-03 + melody-03 + atmo-02    | ✅      | Low     |
| Full Byte   | beat-01 + beat-02 + bass-01 + melody-01    | ✅      | Med     |
| Key Journey | C# stack → Gmin → Amin (swap keys)         | 🟡 gradual | Low  |
| Danger Zone | melody-01 + melody-03 + vocal-03           | 🟠 clash | High   |

---

## Rhythmic Stability

All loop pads align to 128 BPM confirmed:
- Beat pads: 4/8/16 bar standard loops — perfect grid lock
- Bass/melody/atmo stems: 17/18/19 bar patterns — extended variation cycles, no timing issues
- Vocal chops: 4/8 bar — fast quantization response

**No drift correction required on any pad.**

---

## Fatigue Risk Assessment

| Category    | Active Pads | Fatigue Risk | Notes |
|-------------|-------------|--------------|-------|
| Beats       | 1–2         | Very Low     | Hat loops add density without frequency overlap |
| Bass        | 1           | Low          | Bass stems isolated — no low-end stacking safe |
| Bass        | 2+          | Medium       | C#min + A#min bass together risks sub-frequency mud |
| Melody      | 1–2         | Low          | Stem sourced from same loops — frequency-aware |
| Melody      | 3+          | High         | All 4 leads simultaneously = frequency saturation |
| Atmosphere  | 1–2         | Very Low     | Low-energy texture layers — minimal fatigue |
| Vocals      | 1–2         | Low          | Short chop patterns, not fatiguing |
| Vocals      | 3           | Medium       | Fmin vocal adds chromatic tension |

---

## Pack Identity

**Delta Pack** has a distinct **digital electro / future bass** identity driven by the Stickz Byte aesthetic:
- Crisp, punchy 128 BPM percussion backbone
- Layered synth stems with inherent harmonic coherence per loop set
- Vocal chops from VCT add rhythmic vocal texture
- FX/transition library enables clean section building

**Compared to Bravo Pack (120 BPM):** Delta is faster, more electronic, with higher transient density. Bravo is warmer and more varied; Delta is tighter and more cohesive per key group.
