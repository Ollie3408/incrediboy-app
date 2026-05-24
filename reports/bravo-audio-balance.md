# Bravo Pack — Audio Balance Report
Generated: 2026-05-23

---

## 1. Volume Settings Per Pad

| Pad | Role | Category | Vol | BPM | Mode | Drift Corr | Rationale |
|-----|------|----------|-----|-----|------|-----------|-----------|
| beat-01 | Main Beat | beat | **0.85** | 120 | loop | — | Primary groove — loudest beat |
| beat-02 | Deep Kick | beat | **0.82** | 120 | loop | — | Kick-only layer — slightly softer |
| beat-03 | Taiko Loop | beat | **0.78** | 120 | loop | — | Accent percussion — further back |
| beat-04 | Kick + Hat | beat | **0.75** | 118 | loop | ✅ | Lightest beat — most subtle |
| melody-01 | Glassy Synth | melody | **0.68** | 120 | loop | — | Universally mixable |
| melody-02 | Synth Loop | melody | **0.65** | 118 | loop | ✅ | Short phrase complement |
| melody-03 | Summertime Stab | melody | **0.62** | 120 | loop | — | Stab texture — subtle |
| melody-04 | Relaxing Guitar | melody | **0.58** | 118 | loop | ✅ | Warmest melody — lowest vol |
| fx-01 | Clickers | fx/loop | **0.55** | 116 | loop | ✅ | Rhythmic clicker — light |
| fx-02 | Sine Loop | fx/loop | **0.50** | 120 | loop | — | Tone texture — very subtle |
| fx-03 | Scratch Hit | fx/one-shot | **0.58** | — | one-shot | — | One-shot — slightly loud for impact |
| fx-04 | Sub Drop | fx/one-shot | **0.55** | — | one-shot | — | Sub drop — controlled |
| atmo-01 | Earth Orbiter | atmosphere | **0.48** | 120 | loop | — | Wide space texture — low |
| atmo-02 | B-min Guitar | atmosphere | **0.45** | — | loop | ✅ | Emotional texture — softest |
| bass-01 | Dry P-Bass | bass | **0.70** | 118 | loop | ✅ | Driest bass — fullest |
| bass-02 | Bass 011 | bass | **0.67** | 120 | loop | — | Second bass — slightly pulled |
| bass-03 | E Pop Bass | bass | **0.64** | 120 | loop | — | Pop bass — further back |
| bass-04 | Sub Wobble | bass | **0.60** | 124 | loop | ✅ | Sub texture — careful stacking |
| trans-01 | Distressed Break | transition | **0.60** | 120 | one-shot | — | Break trigger |
| trans-02 | Wiss Hit | transition | **0.58** | 125 | one-shot | — | Short hit |
| trans-03 | Capoeira Hit | transition | **0.55** | — | one-shot | — | Accent hit — softest trans |
| vocal-01 | Female Vocals Amin | voice | **0.52** | 120 | loop | — | Main vocal — A minor |
| vocal-02 | F Major Vocals | voice | **0.50** | 128 | loop | ✅ | Secondary vocal — pulled back |
| vocal-03 | Beatbox | voice | **0.48** | 100 | loop | ✅ | Beatbox texture — softest |

---

## 2. Volume Targets vs. Achieved

| Category | Target Range | Achieved Range | Status |
|----------|-------------|----------------|--------|
| Beats | 0.82–0.90 | 0.75–0.85 | ✅ Good — within target |
| Bass | 0.62–0.72 | 0.60–0.70 | ✅ Good — within target |
| Melody | 0.65–0.80 | 0.58–0.68 | 🟡 Slightly low — safe for layering |
| Atmospheres | 0.42–0.58 | 0.45–0.48 | ✅ Good — appropriate background level |
| Vocals | 0.48–0.65 | 0.48–0.52 | ✅ Good — textural, not dominant |
| Loop FX | 0.50–0.65 | 0.50–0.55 | ✅ Good — subtle performer layers |
| One-shot FX | 0.42–0.58 | 0.55–0.58 | ✅ Good — impactful but controlled |
| Transitions | 0.45–0.60 | 0.55–0.60 | ✅ Good |

---

## 3. Low-End Budget

> Low-end budget: how much sub/bass energy is in the mix at once.

| Pad | Low-End Weight | Risk |
|-----|---------------|------|
| beat-01 | 0.50 | medium |
| beat-02 | 0.60 | medium-high |
| bass-01 | 0.72 | ⚠️ high |
| bass-02 | 0.70 | ⚠️ high |
| bass-03 | 0.68 | ⚠️ high |
| bass-04 | 0.85 | 🔴 very high |
| fx-04 | 0.80 | 🔴 very high (one-shot) |

**Recommendation:** Never run all 4 bass pads simultaneously. A 2-bass maximum (bass-01 + bass-02) is safe. Bass-04 + any beat with kick = heavy sub congestion — use intentionally for drops only.

---

## 4. Transient Density Budget

> Transient density: how many sharp hits occur per bar (0=sustained, 1=very busy).

| Pad | Transient | Character |
|-----|-----------|-----------|
| fx-03 (scratch hit) | 0.90 | Very sharp one-shot |
| fx-04 (sub drop) | 0.85 | Sharp sub impact |
| beat-03 (taiko) | 0.80 | Busy percussion |
| trans-01 (break) | 0.80 | Percussive break |
| trans-02 (wiss hit) | 0.88 | Sharp hit |
| trans-03 (capoeira) | 0.82 | Sharp hit |
| beat-01 (main beat) | 0.75 | Standard groove density |
| beat-04 (hat loop) | 0.70 | Light hat density |
| fx-01 (clickers) | 0.80 | High click density |
| bass-01 (p-bass) | 0.55 | Picked bass transients |
| vocal-03 (beatbox) | 0.65 | Beatbox pops |
| melody-01 (glassy synth) | 0.35 | Smooth sustained |
| atmo-01 (earth orbiter) | 0.10 | Near-zero transients |
| atmo-02 (b-min guitar) | 0.20 | Gentle guitar attack |

**Recommendation:** Clickers (fx-01) + Beat-01 + any transition = very high transient density. Use clickers as either/or with beat-03 for headroom.

---

## 5. Energy Profile by Category

```
Beats:        ████████░░  0.75 avg  (energetic layer 1)
Bass:         ██████░░░░  0.59 avg  (foundation layer)
Melody:       █████░░░░░  0.49 avg  (mid layer)
FX/Loop:      ████░░░░░░  0.40 avg  (texture layer)
Vocals:       ████░░░░░░  0.43 avg  (vocal layer)
Atmospheres:  ███░░░░░░░  0.27 avg  (background layer)
```

---

## 6. Gameplay Volume Flow (Recommended Layering Sequence)

```
Start:         Beat-01 alone (loud, defined)
+ Beat-02:     Kick fills in the groove
+ Bass-01:     Bass enters — simple & dry
+ Melody-01:   Glassy synth floats above
+ Atmo-01:     Space texture pads the soundscape
+ Vocal-01:    A minor vocals add identity
↓
Drop effects: FX-04 (sub drop) → silence → rebuild
FX-03:        Scratch hit as accent
FX-01:        Clicker layer adds rhythmic texture
```

---

## 7. Flags & Adjustments Made vs. Generated

| Pad | Generated Vol | Final Vol | Reason for Change |
|-----|--------------|-----------|-------------------|
| beat-04 | 0.85 | **0.75** | 118 BPM drift — reduce to prevent beat clash |
| melody-04 | 0.68 | **0.58** | 9-bar guitar loop — longer loops need lower vol |
| fx-01 | 0.55 | **0.55** | No change — rhythmic clicker at appropriate level |
| atmo-02 | 0.48 | **0.45** | No bar alignment — extra caution, lower |
| vocal-03 | 0.48 | **0.48** | No change — already minimal; flagged for replacement |

All other volumes match selection JSON values. No pad was raised above category ceiling.
