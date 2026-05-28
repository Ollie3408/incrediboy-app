# Alpha Pack — Mixability Report

**Pack ID**: `alpha-pack`  
**BPM**: 128  
**Style**: Cleaner, smoother, lower fatigue than Delta Pack

---

## Harmonic Identity Map

| Pad              | File          | Key   | harmonicGroup | mixabilityScore |
|------------------|---------------|-------|---------------|-----------------|
| beat-0 to beat-4 | beats/*       | —     | neutral       | 89–93           |
| melody-01        | melody-01.wav | Amin  | Amin          | 90              |
| melody-02        | melody-02.wav | Gmin  | Gmin          | 87              |
| melody-03        | melody-03.wav | A#min | A#min         | 85              |
| melody-04        | melody-04.wav | C#min | C#min         | 82              |
| atmo-01          | atmo-01.wav   | Amin  | Amin          | 89              |
| atmo-02          | atmo-02.wav   | Amin  | Amin          | 88              |
| bass-01          | bass-01.wav   | C#min | C#min         | 86              |
| bass-02          | bass-02.wav   | Gmin  | Gmin          | 84              |
| bass-03          | bass-03.wav   | Amin  | Amin          | 83              |
| bass-04          | bass-04.wav   | A#min | A#min         | 82              |
| vocal-01         | vocal-01.wav  | C#min | C#min         | 86              |
| vocal-02         | vocal-02.wav  | Emin  | Emin          | 83              |
| vocal-03         | vocal-03.wav  | Fmin  | Fmin          | 84              |
| vocal-04         | vocal-04.wav  | Gmin  | Gmin          | 83              |
| vocal-05         | vocal-05.wav  | Bmin  | Bmin          | 82              |
| fx-01            | fx-01.wav     | —     | neutral       | 88              |
| fx-02            | fx-02.wav     | —     | neutral       | 86              |
| trans-01         | trans-01.wav  | —     | neutral       | 91              |
| trans-02         | trans-02.wav  | —     | neutral       | 90              |

---

## Harmonic Compatibility Table

| Harmonic Group | Compatible With         | Pairs Well With                   |
|----------------|-------------------------|-----------------------------------|
| C#min          | C#min, Fmin, A#min*     | bass-01 ↔ melody-04, vocal-01     |
| Gmin           | Gmin, A#min, D#min*     | bass-02 ↔ melody-02, vocal-04     |
| Amin           | Amin, Cmin, Emin*       | bass-03 ↔ melody-01, atmo-01, atmo-02 |
| A#min          | A#min, C#min, Fmin*     | bass-04 ↔ melody-03               |
| Emin           | Emin, Gmin, Bmin*       | vocal-02 ↔ melody-02, vocal-04    |
| Fmin           | Fmin, C#min, A#min*     | vocal-03 ↔ bass-01, melody-04     |
| Bmin           | Bmin, Dmin, F#min*      | vocal-05 ↔ (bridge between keys)  |
| neutral        | all                     | beats, fx, transitions freely     |

\* Relative/parallel minor relationships.

Note: Bmin (vocal-05) is the only key in Alpha Pack with no direct harmonic partner pad. It functions as a "floating" vocal over any combination.

---

## Recommended Layering Combos

### Combo A — "Amin Groove" (4 pads)
`beat-0` + `bass-03` + `melody-01` + `atmo-01`
- Full drum groove anchors rhythm
- Break bass stabs underpin melody
- Lead Supersaw sustains melody line
- Atmos FX adds ambient shimmer

**Estimated energy**: medium. **Fatigue score**: low (sustained melody, sparse bass).

---

### Combo B — "Gmin Float" (4 pads)
`beat-1` + `bass-02` + `melody-02` + `vocal-04`
- Single hi-hat loop keeps rhythmic texture light
- Resampled bass Gmin provides grounded low-end
- Lead Reverses adds reversed atmospheric texture
- VCT Legacy 12 Gmin vocal chops ride the harmony

**Estimated energy**: medium-low. **Fatigue score**: very low (reversed melody is non-attacking).

---

### Combo C — "C#min Full Layer" (5 pads)
`beat-0` + `bass-01` + `melody-04` + `atmo-01` + `vocal-01`
- Full groove + resampled bass + full-mix Loop 001 C#min
- All three pad voices in C#min alignment
- Atmos FX and vocal chop both in Amin/C#min range

**Estimated energy**: medium-high. **Fatigue score**: medium (full-mix Loop 001 includes multiple voices).

---

### Combo D — "Minimal Hat Stack" (3 pads)
`beat-2` + `beat-3` + `atmo-02`
- Two hi-hat patterns layered create subtle polyrhythm
- Atmos Vox breathes underneath with no melodic conflict
- Good as intro layer before adding melody/bass

**Estimated energy**: low. **Fatigue score**: minimal.

---

### Combo E — "FX Accent" (3 pads)
`beat-0` + `trans-01` + `fx-01`
- Full groove foundation
- Fill 003 retriggers every 4 bars as section marker
- Impact 002 punctuates every 8 bars

**Estimated energy**: medium. **Fatigue score**: medium (transient-heavy FX).

---

### Combo F — "Cross-Key Vocal Stack" (5 pads)
`vocal-01` + `vocal-02` + `vocal-03` + `vocal-04` + `vocal-05`
- All 5 vocal chops simultaneously
- Spread across C#min, Emin, Fmin, Gmin, Bmin
- Intentional poly-harmonic vocal chaos effect
- Works over neutral beat grid

**Estimated energy**: high. **Fatigue score**: medium (short 4-bar loops, active t=0).

---

## Estimated Fatigue Score Per Pad

Fatigue score = subjective sustained listening endurance (1–10 scale, 10 = most fatiguing).

| Pad              | Fatigue Score | Reason                                      |
|------------------|---------------|---------------------------------------------|
| beat-0           | 5/10          | Full drum groove — moderate transient load  |
| beat-1 to beat-4 | 2–3/10        | Hi-hat only — minimal fatigue               |
| melody-01        | 2/10          | Smooth supersaw, sustained, no attack       |
| melody-02        | 1/10          | Reversed phrases, zero attacking transients |
| melody-03        | 3/10          | Response phrase, some melodic complexity    |
| melody-04        | 4/10          | Full-mix with multiple voices               |
| atmo-01          | 1/10          | Digital shimmer, negligible transients      |
| atmo-02          | 1/10          | Airy vocal texture, near-zero transients    |
| bass-01          | 3/10          | Resampled bass, light low-end               |
| bass-02          | 3/10          | Warm resampled, moderate sub-presence       |
| bass-03          | 4/10          | Break bass stabs, some rhythmic impact      |
| bass-04          | 4/10          | Growl layers, more aggressive               |
| vocal-01 to 05   | 3–4/10        | Vocal chops, active rhythm, short loops     |
| fx-01            | 6/10          | Impact hit — spiky transient every 8 bars   |
| fx-02            | 3/10          | Gentle sweep, long decay                    |
| trans-01/02      | 5/10          | Fill hit every 4 bars — periodic punch      |

**Pack average fatigue score**: ~3.2/10  
**Delta Pack average**: ~4.1/10  
**Alpha improvement**: ~22% lower estimated fatigue

---

## Key Assignment Summary

Alpha Pack covers 7 harmonic keys across its pitched content:

| Key   | Pads using this key                                  | Count |
|-------|------------------------------------------------------|-------|
| Amin  | melody-01, atmo-01, atmo-02, bass-03                | 4     |
| C#min | melody-04, bass-01, vocal-01                         | 3     |
| Gmin  | melody-02, bass-02, vocal-04                         | 3     |
| A#min | melody-03, bass-04                                   | 2     |
| Emin  | vocal-02                                             | 1     |
| Fmin  | vocal-03                                             | 1     |
| Bmin  | vocal-05                                             | 1     |
| —     | beat-0 to beat-4, fx-01, fx-02, trans-01, trans-02  | 9     |

**Amin is the harmonic spine** of Alpha Pack — 4 pads share this key, making it the most natural tonal center for mixing. C#min and Gmin are secondary clusters.

---

## Cross-Pack Compatibility: Alpha vs Delta

Because both packs are 128 BPM, the game clock aligns perfectly. Alpha and Delta can be compared for future multi-pack scenarios.

Harmonically overlapping keys: C#min, Gmin, Amin, A#min (all present in both packs). Any Alpha bass/melody pad harmonically pairs with the corresponding Delta pad in the same key.

Alpha's fresh keys (Emin, Fmin, Bmin for vocals) introduce new harmonic variety absent from Delta.
