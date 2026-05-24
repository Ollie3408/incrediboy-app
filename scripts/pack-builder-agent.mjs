#!/usr/bin/env node
/**
 * IncrediBoy Music Pack Builder Agent
 * ─────────────────────────────────────
 * Two-phase, approval-gated pack creation tool.
 *
 * Phase 1 — SCAN (read-only):
 *   Walks a sample folder, analyses every audio file, scores candidates,
 *   suggests a 24-pad selection, and writes a Markdown report + JSON
 *   selection file.  Nothing is copied or modified.
 *
 * Phase 2 — BUILD (requires human approval):
 *   Reads the selection JSON, verifies `approved: true`, checks for
 *   duplicates, copies + renames files into the target pack folder, and
 *   generates the TypeScript pack config.  Existing packs are never touched.
 *
 * Usage:
 *   npm run pack:scan  [-- --source <dir>] [--bpm <n>] [--key <K>] [--out <dir>] [--depth <n>]
 *   npm run pack:build -- --selection <reports/pack-selection-TIMESTAMP.json>
 *
 * SAFETY GUARANTEES:
 *   - scan   is 100% read-only; only writes to reports/
 *   - build  refuses to run until selection.approved === true
 *   - build  never writes to public/audio/cyberpunk-pack-1/
 *   - build  never writes to public/audio/core-mix-pack-alpha/
 *   - build  never copies the same file hash to two pads
 *   - build  validates all files exist before touching anything
 */

import { createHash } from 'node:crypto'
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
  statSync,
  rmSync,
} from 'node:fs'
import { join, basename, extname, resolve, dirname } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dir, '..')
const REPORTS_DIR = join(ROOT, 'reports')
const AUDIO_PUBLIC = join(ROOT, 'public', 'audio')

// ─── PROTECTED FOLDERS (never write here) ────────────────────────────────────
const PROTECTED_PACK_DIRS = new Set([
  join(AUDIO_PUBLIC, 'cyberpunk-pack-1'),
  join(AUDIO_PUBLIC, 'core-mix-pack-alpha'),
])

// ─── AUDIO FILE EXTENSIONS ───────────────────────────────────────────────────
const AUDIO_EXTS = new Set(['.wav', '.mp3', '.aiff', '.aif', '.flac', '.ogg'])

// ─── CATEGORY KEYWORD TABLES ─────────────────────────────────────────────────
const CATEGORY_KEYWORDS = {
  beat:       ['drum', 'beat', 'kick', 'snare', 'hat', 'cymbal', 'groove', 'perc', 'clap', 'tom'],
  bass:       ['bass', 'sub_', 'sub-', ' sub ', 'wobble', 'low_end'],
  melody:     ['lead_loop', 'guitar_loop', 'melody', 'lead', 'arp', 'arpegg', 'piano', 'keys', 'pluck', 'guitar', 'mallet', 'chord', 'riff', 'motif', 'hook'],
  voice:      ['vox_loop', 'vocal', 'vox', 'voice', 'choir', 'sing', 'chant', 'spoken', 'rap'],
  atmosphere: ['pad_loop', 'synth_loop', 'seq_loop', 'pad', 'atmos', 'ambient', 'air_', 'air ', 'drone', 'texture', 'wash', 'space', 'lush'],
  fx:         ['fx_', '_fx', ' fx', 'riser', 'buildup', 'build_up', 'sweep', 'reverse', 'whoosh', 'noise', 'impact', 'one_shot', 'oneshot'],
  transition: ['transition', 'crash', 'roll', 'drop_', 'downnoise', 'down_noise', 'upsweep', 'down_sweep'],
}

const LOOP_KEYWORDS     = ['loop', '_lp_', '-lp-', 'lp.']
const ONESHOT_KEYWORDS  = ['one_shot', 'oneshot', 'one-shot', 'shot_', 'stab', 'hit_', '_hit.', 'riser', 'buildup', 'sweep', 'reverse', 'noise']

// Density penalizers (full mixes / masters — bad for layering)
const DENSITY_FLAGS = ['full', 'complete', 'master', 'mix', 'stem_mix', 'mashup']
// Simplicity boosters (isolated stems — good for layering)
const SIMPLICITY_FLAGS = ['dry', 'isolated', 'stem', 'layer', 'stripped', 'clean', 'top', 'beat', 'bass']

// ─── KEY / BPM PARSING ───────────────────────────────────────────────────────
const BPM_RE = /[_\-\s]?(\d{2,3})\s*bpm[_\-\s]?/i
const KEY_TOKENS = ['C#','Db','D#','Eb','F#','Gb','G#','Ab','A#','Bb','Am','Bm','Cm','Dm','Em','Fm','Gm','C','D','E','F','G','A','B']
const KEY_TO_HARMONIC_GROUP = {
  C: 'tonic', D: 'supertonic', E: 'mediant', F: 'subdominant',
  G: 'dominant', A: 'relative', B: 'leading',
  'A#': 'dominant', Bb: 'dominant', 'C#': 'tonic', Db: 'tonic',
  'D#': 'supertonic', Eb: 'supertonic', 'F#': 'subdominant', Gb: 'subdominant',
  'G#': 'dominant', Ab: 'dominant', Am: 'relative',
}

// ─── 24-PAD SLOT LAYOUT ───────────────────────────────────────────────────────
// Mirrors the game grid (beat-0..beat-4, melody-0..4, effect-0..3, percussion-0..4, voice-0..4)
const PAD_SLOTS = [
  // Row A — beats + melody
  { slot:  0, role: 'beat-01',    category: 'beat',       label: 'Beat 1',         targetFile: 'beats/beat_01.wav',               gameSlot: 'beat-0' },
  { slot:  1, role: 'beat-02',    category: 'beat',       label: 'Beat 2',         targetFile: 'beats/beat_02.wav',               gameSlot: 'beat-1' },
  { slot:  2, role: 'beat-03',    category: 'beat',       label: 'Beat 3',         targetFile: 'beats/beat_03.wav',               gameSlot: 'beat-2' },
  { slot:  3, role: 'beat-04',    category: 'beat',       label: 'Beat 4',         targetFile: 'beats/beat_04.wav',               gameSlot: 'beat-3' },
  { slot:  4, role: 'trans-01',   category: 'transition', label: 'Sweep',          targetFile: 'transitions/transition_01.wav',   gameSlot: 'beat-4',       auxiliary: true },
  { slot:  5, role: 'melody-01',  category: 'melody',     label: 'Melody 1',       targetFile: 'melody/melody_01.wav',            gameSlot: 'melody-0' },
  { slot:  6, role: 'melody-02',  category: 'melody',     label: 'Melody 2',       targetFile: 'melody/melody_02.wav',            gameSlot: 'melody-1' },
  { slot:  7, role: 'melody-03',  category: 'melody',     label: 'Melody 3',       targetFile: 'melody/melody_03.wav',            gameSlot: 'melody-2' },
  // Row A — FX + aux melody
  { slot:  8, role: 'fx-01',      category: 'fx',         label: 'FX 1',           targetFile: 'fx/fx_01.wav',                    gameSlot: 'effect-0' },
  { slot:  9, role: 'fx-02',      category: 'fx',         label: 'FX 2',           targetFile: 'fx/fx_02.wav',                    gameSlot: 'effect-1' },
  { slot: 10, role: 'fx-03',      category: 'fx',         label: 'FX 3',           targetFile: 'fx/fx_03.wav',                    gameSlot: 'effect-2',     auxiliary: true },
  { slot: 11, role: 'fx-04',      category: 'fx',         label: 'FX 4',           targetFile: 'fx/fx_04.wav',                    gameSlot: 'effect-3',     auxiliary: true },
  { slot: 12, role: 'atmo-01',    category: 'atmosphere', label: 'Atmosphere 1',   targetFile: 'atmospheres/atmosphere_01.wav',   gameSlot: 'melody-3' },
  { slot: 13, role: 'melody-04',  category: 'melody',     label: 'Melody 4',       targetFile: 'melody/melody_04.wav',            gameSlot: 'melody-4',     auxiliary: true },
  // Row B — bass
  { slot: 14, role: 'bass-01',    category: 'bass',       label: 'Bass 1',         targetFile: 'bass/bass_01.wav',                gameSlot: 'percussion-0' },
  { slot: 15, role: 'bass-02',    category: 'bass',       label: 'Bass 2',         targetFile: 'bass/bass_02.wav',                gameSlot: 'percussion-1' },
  { slot: 16, role: 'bass-03',    category: 'bass',       label: 'Bass 3',         targetFile: 'bass/bass_03.wav',                gameSlot: 'percussion-2' },
  { slot: 17, role: 'bass-04',    category: 'bass',       label: 'Bass 4',         targetFile: 'bass/bass_04.wav',                gameSlot: 'percussion-3', auxiliary: true },
  { slot: 18, role: 'trans-02',   category: 'transition', label: 'Hit',            targetFile: 'transitions/transition_02.wav',   gameSlot: 'percussion-4', auxiliary: true },
  // Row B — vocals
  { slot: 19, role: 'vocal-01',   category: 'voice',      label: 'Vocal 1',        targetFile: 'vocals/vocal_01.wav',             gameSlot: 'voice-0' },
  { slot: 20, role: 'vocal-02',   category: 'voice',      label: 'Vocal 2',        targetFile: 'vocals/vocal_02.wav',             gameSlot: 'voice-1' },
  { slot: 21, role: 'vocal-03',   category: 'voice',      label: 'Vocal 3',        targetFile: 'vocals/vocal_03.wav',             gameSlot: 'voice-2',      auxiliary: true },
  { slot: 22, role: 'trans-03',   category: 'transition', label: 'Stab',           targetFile: 'transitions/transition_03.wav',   gameSlot: 'voice-3',      auxiliary: true },
  { slot: 23, role: 'atmo-02',    category: 'atmosphere', label: 'Atmosphere 2',   targetFile: 'atmospheres/atmosphere_02.wav',   gameSlot: 'voice-4' },
]

const CORE_CATEGORIES = { beat: 4, bass: 3, melody: 3, fx: 2, atmosphere: 2, voice: 2 }

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function md5File(path) {
  return createHash('md5').update(readFileSync(path)).digest('hex')
}

function getFileDuration(path) {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${path}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
    )
    const v = parseFloat(out.trim())
    return isNaN(v) ? null : v
  } catch {
    return null
  }
}

function walkDir(dir, maxDepth = 6, _depth = 0, results = []) {
  if (_depth > maxDepth || !existsSync(dir)) return results
  let entries
  try { entries = readdirSync(dir) } catch { return results }
  for (const name of entries) {
    if (name.startsWith('.')) continue
    const full = join(dir, name)
    let stat
    try { stat = statSync(full) } catch { continue }
    if (stat.isDirectory()) {
      walkDir(full, maxDepth, _depth + 1, results)
    } else if (AUDIO_EXTS.has(extname(name).toLowerCase())) {
      results.push(full)
    }
  }
  return results
}

function parseBpm(name) {
  const m = name.match(BPM_RE)
  return m ? parseInt(m[1], 10) : null
}

function parseKey(name) {
  const upper = name.replace(/[_\-]/g, ' ')
  for (const tok of KEY_TOKENS) {
    // word-boundary style match
    const re = new RegExp(`(?<![A-Za-z])${tok}(?![A-Za-z#])`, 'i')
    if (re.test(upper)) return tok
  }
  return null
}

function guessCategory(name) {
  const low = name.toLowerCase()
  const scores = {}
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[cat] = keywords.filter((kw) => low.includes(kw)).length
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  return best[1] > 0 ? best[0] : 'unknown'
}

function guessIsLoop(name, category, durationSec) {
  const low = name.toLowerCase()
  if (ONESHOT_KEYWORDS.some((kw) => low.includes(kw))) return false
  if (LOOP_KEYWORDS.some((kw) => low.includes(kw))) return true
  if (category === 'fx' || category === 'transition') return false
  if (durationSec !== null && durationSec > 3) return true
  return null // unknown
}

function expectedLoopDuration(bpm, bars = 4) {
  return (60 / bpm) * 4 * bars
}

function isLoopDurationCompatible(dur, bpm, tolerancePct = 0.05) {
  if (!dur || !bpm) return null
  for (const bars of [2, 4, 8, 16]) {
    const expected = expectedLoopDuration(bpm, bars)
    if (Math.abs(dur - expected) / expected <= tolerancePct) return { bars, expected }
  }
  return false
}

function isBpmCompatible(fileBpm, targetBpm, tol = BPM_COMPAT_TOLERANCE) {
  if (!fileBpm || !targetBpm) return null
  return Math.abs(fileBpm - targetBpm) / targetBpm <= tol
}

function guessHarmonicGroup(key, category) {
  if (category === 'beat') return 'percussive'
  if (category === 'fx' || category === 'transition') return 'atonal'
  if (!key) return 'unknown'
  return KEY_TO_HARMONIC_GROUP[key] ?? 'unknown'
}

function guessVolume(category) {
  const map = {
    beat: 0.85, bass: 0.70, melody: 0.68, atmosphere: 0.48,
    voice: 0.52, fx: 0.58, transition: 0.58,
  }
  return map[category] ?? 0.70
}

function guessEnergy(category) {
  const map = {
    beat: 0.70, bass: 0.55, melody: 0.50, atmosphere: 0.28,
    voice: 0.42, fx: 0.65, transition: 0.65,
  }
  return map[category] ?? 0.50
}

function guessLowEndWeight(category) {
  const map = {
    beat: 0.50, bass: 0.75, melody: 0.04, atmosphere: 0.05,
    voice: 0.03, fx: 0.08, transition: 0.10,
  }
  return map[category] ?? 0.10
}

function guessTransientDensity(category) {
  const map = {
    beat: 0.72, bass: 0.32, melody: 0.40, atmosphere: 0.15,
    voice: 0.33, fx: 0.55, transition: 0.50,
  }
  return map[category] ?? 0.40
}

function defaultQuantization(category, isLoop) {
  if (!isLoop) return category === 'fx' ? 'immediate' : 'beat'
  if (category === 'voice') return 'beat'
  return 'bar'
}

// ─── SCORING ─────────────────────────────────────────────────────────────────
/**
 * Score a file 0–100 for its suitability in an IncrediBoy-style pack.
 * Higher = better candidate.
 */
function scoreFile(analysis, targetBpm, targetKey) {
  let score = 50 // neutral start
  const low = analysis.filename.toLowerCase()
  const { category, bpm, key, duration, isLoop } = analysis

  // BPM match (0–25 pts)
  if (bpm && targetBpm) {
    const ratio = Math.abs(bpm - targetBpm) / targetBpm
    if (ratio === 0)        score += 25
    else if (ratio <= 0.01) score += 22
    else if (ratio <= 0.03) score += 15
    else if (ratio <= 0.05) score += 8
    else                    score -= 15
  } else if (!bpm) {
    score += 0 // neutral — BPM unknown
  }

  // Loop duration cleanness (0–15 pts)
  if (isLoop !== false && duration && targetBpm) {
    const compat = isLoopDurationCompatible(duration, targetBpm)
    if (compat)    score += 15
    else if (isLoopDurationCompatible(duration, targetBpm, 0.10)) score += 6
    else if (isLoop) score -= 10 // loop marker but bad length
  }

  // Key match (0–10 pts)
  if (key && targetKey) {
    if (key.toUpperCase() === targetKey.toUpperCase()) score += 10
    else {
      // Compatible keys: I/IV/V/VII cluster
      const compatible = { C: ['F', 'G', 'A#', 'Bb'], F: ['C', 'A#', 'Bb'], G: ['C', 'F'] }
      const compat = compatible[targetKey] ?? []
      if (compat.some((k) => k.toUpperCase() === key.toUpperCase())) score += 5
      else score -= 5
    }
  }

  // Category confidence (0–10 pts)
  const catScore = Object.values(CATEGORY_KEYWORDS).find((kws) =>
    kws.filter((kw) => low.includes(kw)).length > 0,
  )
  if (category !== 'unknown') score += 10

  // Simplicity (−15 to +8 pts)
  for (const flag of DENSITY_FLAGS) {
    if (low.includes(flag)) { score -= 15; break }
  }
  for (const flag of SIMPLICITY_FLAGS) {
    if (low.includes(flag)) { score += 4; break }
  }

  // Duration sanity (−10 to 0)
  if (duration !== null) {
    if (isLoop !== false && duration < 1.5) score -= 15
    if (isLoop !== false && duration > 60)  score -= 10
    if (!isLoop && duration > 30)           score -= 5
  }

  // One-shot marker for FX/transition
  if ((category === 'fx' || category === 'transition') && isLoop === false) score += 5

  return Math.max(0, Math.min(100, Math.round(score)))
}

// ─── FILE ANALYSIS ────────────────────────────────────────────────────────────
function analyzeFile(path) {
  const name = basename(path)
  const ext  = extname(name).toLowerCase().slice(1)
  const bpm  = parseBpm(name)
  const key  = parseKey(name)
  const cat  = guessCategory(name)
  const dur  = getFileDuration(path)
  const isLp = guessIsLoop(name, cat, dur)
  const loopCompat = dur && bpm ? isLoopDurationCompatible(dur, bpm) : null
  const bars = loopCompat ? loopCompat.bars : null
  const low  = name.toLowerCase()

  const densityFlags  = DENSITY_FLAGS.filter((f) => low.includes(f))
  const hasSuitable   = densityFlags.length === 0

  const warnings = []
  if (densityFlags.length)          warnings.push(`density flag: ${densityFlags.join(', ')}`)
  if (dur && isLp && dur < 1.5)     warnings.push('very short for a loop')
  if (dur && isLp && !loopCompat && bpm) warnings.push(`duration ${dur?.toFixed(3)}s not bar-aligned at ${bpm} BPM`)

  return {
    path,
    filename: name,
    ext,
    duration: dur,
    bpm,
    key,
    bars,
    category: cat,
    isLoop: isLp,
    harmonicGroup: guessHarmonicGroup(key, cat),
    energy: guessEnergy(cat),
    lowEndWeight: guessLowEndWeight(cat),
    transientDensity: guessTransientDensity(cat),
    volume: guessVolume(cat),
    suitable: hasSuitable,
    warnings,
  }
}

// ─── CANDIDATE ASSEMBLY ──────────────────────────────────────────────────────
/**
 * Group analysed files by category and score them.
 * Returns sorted candidates per category + top BPM/key suggestion.
 */
function assembleCandidates(files, targetBpm, targetKey) {
  const scored = files.map((f) => ({
    ...f,
    score: scoreFile(f, targetBpm, targetKey),
  }))

  const byCat = {}
  for (const f of scored) {
    if (!byCat[f.category]) byCat[f.category] = []
    byCat[f.category].push(f)
  }
  for (const cat of Object.keys(byCat)) {
    byCat[cat].sort((a, b) => b.score - a.score)
  }

  // Infer spine BPM from most common BPM across beat + bass + melody candidates
  const bpmCounts = {}
  for (const cat of ['beat', 'bass', 'melody']) {
    for (const f of (byCat[cat] ?? [])) {
      if (f.bpm) bpmCounts[f.bpm] = (bpmCounts[f.bpm] ?? 0) + 1
    }
  }
  const suggestedBpm = targetBpm ??
    (Object.keys(bpmCounts).length
      ? Number(Object.entries(bpmCounts).sort((a, b) => b[1] - a[1])[0][0])
      : null)

  // Infer spine key from melody/bass candidates
  const keyCounts = {}
  for (const cat of ['melody', 'bass', 'atmosphere']) {
    for (const f of (byCat[cat] ?? [])) {
      if (f.key) keyCounts[f.key] = (keyCounts[f.key] ?? 0) + 1
    }
  }
  const suggestedKey = targetKey ??
    (Object.keys(keyCounts).length
      ? Object.entries(keyCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null)

  return { byCat, scored, suggestedBpm, suggestedKey }
}

/**
 * Pick the top N unique-hash candidates for a category.
 * Deduplicates by MD5 (computed on-demand and cached).
 */
function pickUnique(candidates, n, hashCache) {
  const seen = new Set()
  const result = []
  for (const c of candidates) {
    if (result.length >= n) break
    if (!existsSync(c.path)) continue
    const hash = hashCache.get(c.path) ?? md5File(c.path)
    hashCache.set(c.path, hash)
    if (seen.has(hash)) continue
    seen.add(hash)
    result.push({ ...c, hash })
  }
  return result
}

/**
 * Suggest a 24-pad selection (16 core + 8 auxiliary) from scored candidates.
 * Returns an array with one entry per PAD_SLOTS entry, or null if no candidate.
 */
function suggestSelection(byCat, suggestedBpm, suggestedKey) {
  const hashCache = new Map()

  // How many of each category we need at most
  const needed = { beat: 4, melody: 4, fx: 4, transition: 3, atmosphere: 2, bass: 4, voice: 3 }
  const pools  = {}
  for (const [cat, n] of Object.entries(needed)) {
    pools[cat] = pickUnique(byCat[cat] ?? [], n, hashCache)
  }

  const catCounters = {}
  const selection   = []

  for (const slot of PAD_SLOTS) {
    const cat     = slot.category
    const catList = cat === 'voice' ? pools.voice : (pools[cat] ?? [])
    const idx     = catCounters[cat] ?? 0
    catCounters[cat] = idx + 1
    const chosen  = catList[idx] ?? null
    selection.push({ ...slot, candidate: chosen })
  }

  return selection
}

// ─── REPORT GENERATOR ────────────────────────────────────────────────────────
function renderMarkdownReport(sourceDir, scored, selection, meta) {
  const { suggestedBpm, suggestedKey, totalFiles, scanDate } = meta
  const rejected = scored.filter((f) => !selection.some((s) => s.candidate?.path === f.path))
  const selected = selection.filter((s) => s.candidate !== null)

  const rows = selection.map((s) => {
    const c = s.candidate
    if (!c) {
      return `| ${s.role.padEnd(12)} | ${s.category.padEnd(11)} | _(no candidate)_ | — | — | — | — |`
    }
    const mode = c.isLoop === false ? 'one-shot' : 'loop'
    const bpmStr = c.bpm ? String(c.bpm) : '?'
    const keyStr = c.key ?? '?'
    const durStr = c.duration != null ? c.duration.toFixed(2) + 's' : '?'
    return `| ${s.role.padEnd(12)} | ${s.category.padEnd(11)} | \`${c.filename}\` | ${bpmStr} | ${keyStr} | ${durStr} | ${mode} | ${c.score} |`
  })

  const rejectedRows = rejected
    .sort((a, b) => b.score - a.score)
    .slice(0, 40)
    .map((f) => {
      const reason = f.score < 40 ? 'low score' : f.warnings.join('; ') || 'not needed'
      return `| \`${f.filename}\` | ${f.category} | ${f.score} | ${reason} |`
    })

  return `# Music Pack Builder — Scan Report
Generated: ${scanDate}
Source: \`${sourceDir}\`

## Spine Analysis
| | |
|---|---|
| Suggested BPM | **${suggestedBpm ?? '(unknown — set --bpm)'}** |
| Suggested Key  | **${suggestedKey ?? '(unknown — set --key)'}** |
| Files scanned  | ${totalFiles} |
| With audio duration | ${scored.filter((f) => f.duration !== null).length} |

## Suggested 24-Pad Selection

> Review this table carefully. Only the 16 non-auxiliary slots are required.
> Edit the generated \`pack-selection-*.json\` to adjust or replace candidates,
> then set \`approved: true\` before running \`npm run pack:build\`.

| Slot | Category | File | BPM | Key | Duration | Mode | Score |
|------|----------|------|-----|-----|----------|------|-------|
${rows.join('\n')}

## Rejected / Unused Files

| File | Category | Score | Reason |
|------|----------|-------|--------|
${rejectedRows.join('\n')}

## Volume Recommendations

| Category | Suggested Volume | Notes |
|----------|-----------------|-------|
| beat | 0.82–0.88 | Primary groove — loudest layer |
| bass | 0.65–0.72 | Strong but below beats |
| melody | 0.60–0.70 | Midrange; watch for muddiness |
| atmosphere | 0.42–0.52 | Background — very low |
| voice | 0.48–0.56 | Textural; quantize to beat |
| fx | 0.52–0.62 | One-shot accents |
| transition | 0.52–0.65 | Short events |

## Playback Mode Recommendations

| Category | playbackMode | playbackQuantization |
|----------|-------------|----------------------|
| beat | loop | bar |
| bass | loop | bar |
| melody | loop | bar |
| atmosphere | loop | bar |
| voice | loop | beat |
| fx | one-shot | immediate |
| transition | one-shot | beat |

## Next Steps

1. Review this report and the generated \`pack-selection-*.json\`
2. Replace any unsuitable candidates by editing the JSON \`sourcePath\` fields
3. Set \`approved: true\` in the JSON
4. Run: \`npm run pack:build -- --selection reports/pack-selection-*.json\`
`
}

function renderSelectionJson(selection, meta) {
  const { suggestedBpm, suggestedKey, sourceDir, scanDate, packId, packName } = meta

  const pads = selection.map((s) => {
    const c = s.candidate
    const isLoop = c ? (c.isLoop !== false) : true
    return {
      slot: s.slot,
      role: s.role,
      padId: `${packId.replace(/-/g, '_').replace(/[^a-z0-9_]/g, '')}-${s.role}`,
      label: c ? c.filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').trim() : s.label,
      category: s.category,
      auxiliary: s.auxiliary ?? false,
      sourcePath: c?.path ?? null,
      targetFile: s.targetFile,
      gameSlot: s.gameSlot,
      volume: c?.volume ?? guessVolume(s.category),
      playbackMode: isLoop ? 'loop' : 'one-shot',
      playbackQuantization: defaultQuantization(s.category, isLoop),
      bpm: c?.bpm ?? null,
      key: c?.key ?? null,
      bars: c?.bars ?? null,
      harmonicGroup: c?.harmonicGroup ?? guessHarmonicGroup(null, s.category),
      energy: c?.energy ?? guessEnergy(s.category),
      lowEndWeight: c?.lowEndWeight ?? guessLowEndWeight(s.category),
      transientDensity: c?.transientDensity ?? guessTransientDensity(s.category),
      mixabilityScore: c?.score ?? 50,
      allowDriftCorrection: false,
      score: c?.score ?? null,
      warnings: c?.warnings ?? [],
      needsSource: c === null,
    }
  })

  return {
    packId,
    packName,
    targetDir: `public/audio/${packId}`,
    configPath: `src/generated/audioPacks/${camelize(packId)}.ts`,
    sourceDir,
    scanDate,
    spineAnalysis: { suggestedBpm, suggestedKey },
    approved: false,
    _instructions:
      'Review each pad. Edit sourcePath to replace candidates. Set approved:true. Then run: npm run pack:build -- --selection <this-file>',
    pads,
  }
}

function camelize(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}

// ─── SCAN COMMAND ─────────────────────────────────────────────────────────────
async function commandScan(args) {
  const sourceArg = args['--source']
  const targetBpm = args['--bpm'] ? Number(args['--bpm']) : null
  const targetKey = args['--key'] ?? null
  const maxDepth  = args['--depth'] ? Number(args['--depth']) : 6
  const outDir    = args['--out'] ?? REPORTS_DIR
  const packId    = args['--pack-id'] ?? 'new-pack-alpha'
  const packName  = args['--pack-name'] ?? 'New Pack Alpha'

  // Default source directories
  const sourceDirs = sourceArg
    ? [sourceArg]
    : [join(homedir(), 'Downloads'), join(homedir(), 'Documents')]

  console.log('=== IncrediBoy Pack Builder — SCAN ===\n')
  console.log('Source dirs:', sourceDirs.join(', '))
  if (targetBpm) console.log('Target BPM:', targetBpm)
  if (targetKey) console.log('Target key:', targetKey)
  console.log()

  let allFiles = []
  for (const dir of sourceDirs) {
    if (!existsSync(dir)) { console.log(`  (skip — not found: ${dir})`); continue }
    console.log(`Scanning ${dir} ...`)
    const found = walkDir(dir, maxDepth)
    console.log(`  Found ${found.length} audio files`)
    allFiles = allFiles.concat(found)
  }

  if (allFiles.length === 0) {
    console.error('No audio files found. Use --source <dir> to specify a sample folder.')
    process.exit(1)
  }

  console.log(`\nAnalysing ${allFiles.length} files (this may take a moment)...`)

  const analysed = []
  for (let i = 0; i < allFiles.length; i++) {
    const f = allFiles[i]
    if ((i + 1) % 20 === 0) process.stdout.write(`  ${i + 1}/${allFiles.length}\r`)
    try {
      analysed.push(analyzeFile(f))
    } catch (err) {
      console.warn(`  Warning: could not analyse ${basename(f)}: ${err.message}`)
    }
  }
  console.log(`  Analysed ${analysed.length} files`)

  const { byCat, scored, suggestedBpm, suggestedKey } = assembleCandidates(
    analysed,
    targetBpm,
    targetKey,
  )
  const effectiveBpm = suggestedBpm
  const effectiveKey = suggestedKey

  console.log(`\nSpine suggestion: BPM=${effectiveBpm ?? '?'}, Key=${effectiveKey ?? '?'}`)

  const selection = suggestSelection(byCat, effectiveBpm, effectiveKey)

  // Per-category counts
  const cats = Object.keys(CORE_CATEGORIES)
  for (const cat of cats) {
    const cands = byCat[cat]?.length ?? 0
    const used  = selection.filter((s) => s.category === cat && s.candidate).length
    const req   = CORE_CATEGORIES[cat]
    const ok    = used >= req ? '✓' : '✗'
    console.log(`  ${ok} ${cat.padEnd(12)}: ${cands} candidates → ${used} selected (need ${req})`)
  }

  const scanDate = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
  const mdPath   = join(outDir, `pack-scan-${scanDate}.md`)
  const jsonPath = join(outDir, `pack-selection-${scanDate}.json`)

  mkdirSync(outDir, { recursive: true })

  const md = renderMarkdownReport(sourceDirs.join(', '), scored, selection, {
    suggestedBpm: effectiveBpm,
    suggestedKey: effectiveKey,
    totalFiles: allFiles.length,
    scanDate,
  })
  writeFileSync(mdPath, md, 'utf8')

  const selJson = renderSelectionJson(selection, {
    suggestedBpm: effectiveBpm,
    suggestedKey: effectiveKey,
    sourceDir: sourceDirs.join(', '),
    scanDate,
    packId,
    packName,
  })
  writeFileSync(jsonPath, JSON.stringify(selJson, null, 2), 'utf8')

  console.log('\n✓ Report written:')
  console.log(`  ${mdPath}`)
  console.log(`  ${jsonPath}`)
  console.log('\nNext: review the report and JSON, edit candidates if needed,')
  console.log('      set approved:true in the JSON, then run:')
  console.log(`      npm run pack:build -- --selection ${jsonPath}`)
}

// ─── BUILD COMMAND ─────────────────────────────────────────────────────────────
async function commandBuild(args) {
  const selFile = args['--selection']
  if (!selFile || !existsSync(selFile)) {
    console.error(`Error: --selection <file> required. File not found: ${selFile}`)
    process.exit(1)
  }

  const sel = JSON.parse(readFileSync(selFile, 'utf8'))

  // ── Safety gate ──────────────────────────────────────────────────────────
  if (!sel.approved) {
    console.error(
      'BLOCKED: selection.approved is false.\n' +
      'Review the selection JSON, make any edits, then set approved:true.',
    )
    process.exit(1)
  }

  const targetDir = join(ROOT, sel.targetDir)
  if (PROTECTED_PACK_DIRS.has(targetDir)) {
    console.error('BLOCKED: target directory is a protected pack folder.')
    process.exit(1)
  }

  console.log('=== IncrediBoy Pack Builder — BUILD ===\n')
  console.log(`Pack:       ${sel.packName} (${sel.packId})`)
  console.log(`Target dir: ${targetDir}`)
  console.log(`Config:     ${sel.configPath}\n`)

  // ── Pre-flight validation ─────────────────────────────────────────────────
  const errors   = []
  const hashes   = new Map()
  const urlsSeen = new Set()

  for (const pad of sel.pads) {
    if (!pad.sourcePath) {
      if (!pad.needsSource) errors.push(`Pad ${pad.role}: sourcePath is null`)
      continue
    }
    if (!existsSync(pad.sourcePath)) {
      errors.push(`Pad ${pad.role}: file not found: ${pad.sourcePath}`)
      continue
    }
    const targetAbs = join(targetDir, pad.targetFile)
    const url = `/${sel.targetDir}/${pad.targetFile}`
    if (urlsSeen.has(url)) {
      errors.push(`Pad ${pad.role}: duplicate targetFile ${pad.targetFile}`)
    }
    urlsSeen.add(url)

    const hash = md5File(pad.sourcePath)
    for (const [otherRole, otherHash] of hashes) {
      if (otherHash === hash) {
        errors.push(`Pads ${pad.role} and ${otherRole} have identical audio content`)
      }
    }
    hashes.set(pad.role, hash)
  }

  // Check loop pads have loop mode; FX/transition are one-shot
  for (const pad of sel.pads) {
    if (['beat','bass','melody','atmosphere'].includes(pad.category) && pad.playbackMode !== 'loop') {
      errors.push(`Pad ${pad.role} (${pad.category}) should be playbackMode "loop"`)
    }
    if (pad.category === 'transition' && pad.playbackMode !== 'one-shot') {
      errors.push(`Pad ${pad.role} (${pad.category}) should be playbackMode "one-shot"`)
    }
    // FX pads may be one-shot (cinematic) or loop (rhythmic texture performer).
    // Looping FX are valid when explicitly set in the selection JSON.
  }

  if (errors.length > 0) {
    console.error('Validation errors — build aborted:')
    errors.forEach((e) => console.error(`  ✗ ${e}`))
    process.exit(1)
  }

  console.log('✓ Validation passed\n')

  // ── Create folder structure ───────────────────────────────────────────────
  for (const sub of ['beats', 'bass', 'melody', 'fx', 'atmospheres', 'vocals', 'transitions']) {
    mkdirSync(join(targetDir, sub), { recursive: true })
  }

  // ── Copy files ────────────────────────────────────────────────────────────
  const copied = []
  for (const pad of sel.pads) {
    if (!pad.sourcePath || !existsSync(pad.sourcePath)) {
      console.log(`  ⚠  ${pad.role.padEnd(14)} (no source — skip)`)
      continue
    }
    const dest = join(targetDir, pad.targetFile)
    copyFileSync(pad.sourcePath, dest)
    console.log(`  ✓  ${pad.role.padEnd(14)} → ${pad.targetFile}`)
    copied.push(pad)
  }

  // ── Generate TS config ────────────────────────────────────────────────────
  const configPath = join(ROOT, sel.configPath)
  mkdirSync(dirname(configPath), { recursive: true })
  const ts = generatePackConfig(sel, copied)
  writeFileSync(configPath, ts, 'utf8')
  console.log(`\n✓ Pack config written: ${sel.configPath}`)

  // ── Registration snippet ──────────────────────────────────────────────────
  const snippetPath = join(REPORTS_DIR, `pack-registration-${sel.packId}.txt`)
  writeFileSync(snippetPath, registrationSnippet(sel), 'utf8')

  console.log('\n══════════════════════════════════════════════════════')
  console.log('BUILD COMPLETE — one manual step remains:')
  console.log(`  Register the pack in src/App.tsx — snippet saved to:`)
  console.log(`  ${snippetPath}`)
  console.log('\nOr run: npm run pack:register -- --pack-id ' + sel.packId)
  console.log('══════════════════════════════════════════════════════\n')
}

// ─── PACK CONFIG TEMPLATE ─────────────────────────────────────────────────────
function generatePackConfig(sel, copiedPads) {
  const id     = sel.packId
  const name   = sel.packName
  const spine  = sel.spineAnalysis
  const bpm    = spine.suggestedBpm ?? 105
  const key    = spine.suggestedKey ?? 'C'
  const base   = `/audio/${id}`
  const varId  = camelize(id)

  const padLines = sel.pads.map((pad) => {
    const bpmVal  = pad.bpm  != null ? String(pad.bpm)  : 'null'
    const keyStr  = pad.key  != null ? `'${pad.key}'`   : 'null'
    const barVal  = pad.bars != null ? String(pad.bars) : 'null'
    const quantize = pad.playbackQuantization
      ? `  playbackQuantization: '${pad.playbackQuantization}',`
      : ''
    return `  {
    id: '${varId}-${pad.role}', category: '${pad.category}' as NewPackCategory,
    label: '${pad.label}',
    audioFile: '${pad.targetFile}',
    sourceFile: '${pad.sourcePath ? basename(pad.sourcePath) : 'needs-source'}',
    bpm: ${bpmVal}, bars: ${barVal}, key: ${keyStr},
    notes: '${pad.warnings?.join('; ') || ''}',
    volume: ${pad.volume},
    playbackMode: '${pad.playbackMode}' as const,
${quantize}
    allowDriftCorrection: false,
    energy: ${pad.energy},
    harmonicGroup: '${pad.harmonicGroup}',
    transientDensity: ${pad.transientDensity},
    lowEndWeight: ${pad.lowEndWeight},
    mixabilityScore: ${pad.mixabilityScore},${pad.needsSource ? '\n    needsSource: true,' : ''}
  }`
  }).join(',\n')

  return `/**
 * ${name} — generated by pack-builder-agent.mjs
 *
 * BPM spine: ${bpm}  ·  Key: ${key}
 * Pads: 24 (matches ALL_PADS grid indices 0–23)
 *
 * To register in App.tsx see reports/pack-registration-${id}.txt
 */

import type { QuantizeMode } from '../../musicClock'
import type { CompatibleAudioPack, CompatiblePackPad } from '../../packBuilder/types'

export type NewPackCategory =
  | 'beat' | 'bass' | 'melody' | 'fx' | 'voice' | 'transition' | 'atmosphere'

export type NewPackPadConfig = {
  id: string
  category: NewPackCategory
  label: string
  audioFile: string
  sourceFile: string
  bpm: number | null
  bars: number | null
  key: string | null
  notes: string
  volume: number
  playbackMode: 'loop' | 'one-shot'
  playbackQuantization?: QuantizeMode
  allowDriftCorrection: boolean
  energy: number
  harmonicGroup: string
  transientDensity: number
  lowEndWeight: number
  mixabilityScore: number
  needsSource?: boolean
}

const B = '${base}'
const SPINE_BPM = ${bpm}
const SPINE_KEY = '${key}'
const SPINE_BARS = 4

export const ${varId}Pads: NewPackPadConfig[] = [
${padLines}
]

export const ${varId} = {
  id: '${id}',
  name: '${name}',
  bpm: SPINE_BPM,
  description: '${name} — generated by Pack Builder Agent.',
  pads: ${varId}Pads,
  audioUrls: buildAudioUrls(B),
}

function buildAudioUrls(base: string): Record<string, string> {
  const paths = new Set<string>()
  for (const pad of ${varId}Pads) paths.add(pad.audioFile)
  return Object.fromEntries([...paths].map((p) => [\`\${base}/\${p}\`, \`\${base}/\${p}\`]))
}

export function build${varId.charAt(0).toUpperCase() + varId.slice(1)}CompatiblePack(): CompatibleAudioPack {
  const pads: CompatiblePackPad[] = ${varId}Pads.map((p) => ({
    id: p.id,
    label: p.label,
    audioFile: p.audioFile,
    sourceFile: p.sourceFile,
    gameCategory: (p.category === 'voice' ? 'voice' : p.category) as CompatiblePackPad['gameCategory'],
    volume: p.volume,
    notes: p.notes,
    compatibility: {
      bpm: p.bpm,
      key: p.key,
      bars: p.bars,
      energy: p.energy,
      category: p.category as CompatiblePackPad['compatibility']['category'],
      harmonicGroup: p.harmonicGroup as CompatiblePackPad['compatibility']['harmonicGroup'],
      transientDensity: p.transientDensity,
      lowEndWeight: p.lowEndWeight,
      mixabilityScore: p.mixabilityScore,
      playbackQuantization: (p.playbackQuantization ?? (p.playbackMode === 'one-shot' ? 'immediate' : 'bar')) as QuantizeMode,
      oneShot: p.playbackMode === 'one-shot',
    },
  }))
  return {
    id: ${varId}.id,
    name: ${varId}.name,
    description: ${varId}.description,
    philosophy: '${id}',
    spine: { bpm: SPINE_BPM, key: SPINE_KEY, bars: SPINE_BARS, harmonicTonic: 'tonic' },
    pads,
    audioBasePath: B,
    audioUrls: ${varId}.audioUrls,
  }
}

export const ${varId}Compatible = build${varId.charAt(0).toUpperCase() + varId.slice(1)}CompatiblePack()
`
}

// ─── APP.TSX REGISTRATION SNIPPET ────────────────────────────────────────────
function registrationSnippet(sel) {
  const id   = sel.packId
  const name = sel.packName
  const varId = camelize(id)
  const Cap  = varId.charAt(0).toUpperCase() + varId.slice(1)

  return `=== App.tsx Registration for: ${name} (${id}) ===

-- 1. ADD IMPORT at top of App.tsx (after cyberpunk import):
import { ${varId} } from './generated/audioPacks/${varId}'

-- 2. ADD TO ActivePackId union type:
  | '${id}'

-- 3. ADD TO AUDIO_PACKS (after cyberpunk-pack-1 entry):
  '${id}': {
    id: ${varId}.id as ActivePackId,
    name: ${varId}.name,
    pads: ${varId}.pads.map((pad) => ({
      id: pad.id,
      category: pad.category as PackAudioCategory,
      audioFile: pad.audioFile,
      sourceFile: pad.sourceFile,
      volume: pad.volume,
      playbackMode: pad.playbackMode,
      playbackQuantization: pad.playbackQuantization,
      allowDriftCorrection: pad.allowDriftCorrection,
      bpm: pad.bpm,
      bars: pad.bars,
    })),
    audioUrls: ${varId}.audioUrls,
  },

-- 4. ADD TO CURATED_PACK_IDS set:
  '${id}',

-- 5. ADD TO PACK_MENU curated group packs array:
  '${id}',

-- 6. ADD PAD ROWS CONSTANT (after CORE_MIX_PAD_ROWS):
const ${id.replace(/-/g,'_').toUpperCase()}_PAD_ROWS: { groups: CyberpunkPadGroup[] }[] = [
  {
    groups: [
      { label: 'BEATS',  color: '#9b4dca', padIds: ['beat-0','beat-1','beat-2','beat-3'] },
      { label: 'BASS',   color: '#d47a1a', padIds: ['percussion-0','percussion-1','percussion-2','percussion-3'] },
      { label: 'MELODY', color: '#3b8fe0', padIds: ['melody-0','melody-1','melody-2','melody-4'] },
    ],
  },
  {
    groups: [
      { label: 'FX',         color: '#3cb878', padIds: ['effect-0','effect-1','effect-2','effect-3'] },
      { label: 'VOCALS',     color: '#e04545', padIds: ['voice-0','voice-1','voice-2'] },
      { label: 'ACCENTS',    color: '#6b8f71', padIds: ['beat-4','percussion-4','voice-3'] },
      { label: 'ATMOSPHERE', color: '#6b7fd4', padIds: ['melody-3','voice-4'] },
    ],
  },
]

-- 7. UPDATE groupedPadRowsForPack() function to add:
  if (packId === '${id}') return ${id.replace(/-/g,'_').toUpperCase()}_PAD_ROWS

-- 8. UPDATE GROUPED_CURATED_PACK_IDS set:
  '${id}',

-- 9. UPDATE packRegistry.ts to include:
import { ${varId}Compatible } from '../generated/audioPacks/${varId}'
COMPATIBLE_PACKS['${id}'] = ${varId}Compatible

=== END SNIPPET ===
`
}

// ─── REGISTER COMMAND (auto-applies snippet to App.tsx) ──────────────────────
async function commandRegister(args) {
  const packId = args['--pack-id']
  if (!packId) { console.error('--pack-id required'); process.exit(1) }

  const snippetPath = join(REPORTS_DIR, `pack-registration-${packId}.txt`)
  if (!existsSync(snippetPath)) {
    console.error(`Snippet file not found: ${snippetPath}\nRun pack:build first.`)
    process.exit(1)
  }

  // Check the TypeScript config was generated
  const varId = camelize(packId)
  const configPath = join(ROOT, `src/generated/audioPacks/${varId}.ts`)
  if (!existsSync(configPath)) {
    console.error(`Pack config not found: ${configPath}\nRun pack:build first.`)
    process.exit(1)
  }

  const appTsxPath = join(ROOT, 'src/App.tsx')
  let src = readFileSync(appTsxPath, 'utf8')
  const name = packId.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')

  const patchLog = []

  // 1. Import
  const importLine = `import { ${varId} } from './generated/audioPacks/${varId}'`
  if (!src.includes(importLine)) {
    src = src.replace(
      "import { cyberpunkPack1 }",
      `${importLine}\nimport { cyberpunkPack1 }`,
    )
    patchLog.push('added import')
  }

  // 2. ActivePackId union
  const idLiteral = `  | '${packId}'`
  if (!src.includes(idLiteral)) {
    src = src.replace(
      "  | 'core-mix-pack-alpha'",
      `  | '${packId}'\n  | 'core-mix-pack-alpha'`,
    )
    patchLog.push('added ActivePackId union member')
  }

  // 3. AUDIO_PACKS entry
  const audioPackEntry = `  '${packId}': {`
  if (!src.includes(audioPackEntry)) {
    const padMapLines = [
      `  '${packId}': {`,
      `    id: ${varId}.id as ActivePackId,`,
      `    name: ${varId}.name,`,
      `    pads: ${varId}.pads.map((pad) => ({`,
      `      id: pad.id,`,
      `      category: pad.category as PackAudioCategory,`,
      `      audioFile: pad.audioFile,`,
      `      sourceFile: pad.sourceFile,`,
      `      volume: pad.volume,`,
      `      playbackMode: pad.playbackMode,`,
      `      playbackQuantization: pad.playbackQuantization,`,
      `      allowDriftCorrection: pad.allowDriftCorrection,`,
      `      bpm: pad.bpm,`,
      `      bars: pad.bars,`,
      `    })),`,
      `    audioUrls: ${varId}.audioUrls,`,
      `  },`,
    ].join('\n')

    src = src.replace(
      "  'core-mix-pack-alpha': {",
      `${padMapLines}\n  'core-mix-pack-alpha': {`,
    )
    patchLog.push('added AUDIO_PACKS entry')
  }

  // 4. CURATED_PACK_IDS
  if (!src.includes(`'${packId}',`)) {
    src = src.replace(
      "  'core-mix-pack-alpha',",
      `  '${packId}',\n  'core-mix-pack-alpha',`,
    )
    patchLog.push('added to CURATED_PACK_IDS')
  }

  // 5. PACK_MENU
  if (!src.includes(`'${packId}',\n      'core-mix-pack-alpha'`)) {
    src = src.replace(
      "      'core-mix-pack-alpha',",
      `      '${packId}',\n      'core-mix-pack-alpha',`,
    )
    patchLog.push('added to PACK_MENU')
  }

  // 6. PAD ROWS constant
  const rowsConst = `${packId.replace(/-/g,'_').toUpperCase()}_PAD_ROWS`
  if (!src.includes(rowsConst)) {
    const rowsBlock = [
      ``,
      `const ${rowsConst}: { groups: CyberpunkPadGroup[] }[] = [`,
      `  {`,
      `    groups: [`,
      `      { label: 'BEATS',  color: '#9b4dca', padIds: ['beat-0','beat-1','beat-2','beat-3'] },`,
      `      { label: 'BASS',   color: '#d47a1a', padIds: ['percussion-0','percussion-1','percussion-2','percussion-3'] },`,
      `      { label: 'MELODY', color: '#3b8fe0', padIds: ['melody-0','melody-1','melody-2','melody-4'] },`,
      `    ],`,
      `  },`,
      `  {`,
      `    groups: [`,
      `      { label: 'FX',         color: '#3cb878', padIds: ['effect-0','effect-1','effect-2','effect-3'] },`,
      `      { label: 'VOCALS',     color: '#e04545', padIds: ['voice-0','voice-1','voice-2'] },`,
      `      { label: 'ACCENTS',    color: '#6b8f71', padIds: ['beat-4','percussion-4','voice-3'] },`,
      `      { label: 'ATMOSPHERE', color: '#6b7fd4', padIds: ['melody-3','voice-4'] },`,
      `    ],`,
      `  },`,
      `]`,
    ].join('\n')
    src = src.replace(
      '\nconst GROUPED_CURATED_PACK_IDS',
      `${rowsBlock}\n\nconst GROUPED_CURATED_PACK_IDS`,
    )
    patchLog.push('added PAD ROWS constant')
  }

  // 7. groupedPadRowsForPack
  const fnEntry = `  if (packId === '${packId}') return ${rowsConst}`
  if (!src.includes(fnEntry)) {
    src = src.replace(
      "  if (packId === 'core-mix-pack-alpha') return CORE_MIX_PAD_ROWS",
      `${fnEntry}\n  if (packId === 'core-mix-pack-alpha') return CORE_MIX_PAD_ROWS`,
    )
    patchLog.push('added groupedPadRowsForPack branch')
  }

  // 8. GROUPED_CURATED_PACK_IDS
  if (!src.includes(`'${packId}',\n  'cyberpunk-pack-1'`)) {
    src = src.replace(
      "  'cyberpunk-pack-1',",
      `  '${packId}',\n  'cyberpunk-pack-1',`,
    )
    patchLog.push('added to GROUPED_CURATED_PACK_IDS')
  }

  if (patchLog.length === 0) {
    console.log(`Pack '${packId}' is already registered in App.tsx — nothing to do.`)
    return
  }

  writeFileSync(appTsxPath, src, 'utf8')
  console.log(`✓ App.tsx patched (${patchLog.length} changes):`)
  patchLog.forEach((l) => console.log(`  + ${l}`))

  // Update packRegistry.ts
  const registryPath = join(ROOT, 'src/packBuilder/packRegistry.ts')
  let reg = readFileSync(registryPath, 'utf8')
  const regImport = `import { ${varId}Compatible } from '../generated/audioPacks/${varId}'`
  if (!reg.includes(regImport)) {
    reg = reg.replace(
      `import { coreMixPackAlphaCompatible }`,
      `${regImport}\nimport { coreMixPackAlphaCompatible }`,
    )
    reg = reg.replace(
      `  [coreMixPackAlphaCompatible.id]: coreMixPackAlphaCompatible,`,
      `  [${varId}Compatible.id]: ${varId}Compatible,\n  [coreMixPackAlphaCompatible.id]: coreMixPackAlphaCompatible,`,
    )
    writeFileSync(registryPath, reg, 'utf8')
    console.log('✓ packRegistry.ts updated')
  }

  console.log('\nRun: npm run build  to verify')
}

// ─── PREVIEW COMMANDS ────────────────────────────────────────────────────────
/**
 * Shared preview copy. Copies each recommended candidate with numbered filenames.
 * Does NOT touch public/audio/, App.tsx, pack configs, or approved status.
 */
function runPreviewCopy(selFile, previewDir, { title = 'PREVIEW' } = {}) {
  if (!selFile) {
    console.error('No selection file found. Pass --selection <file> or run pack:scan first.')
    process.exit(1)
  }

  console.log(`=== IncrediBoy Pack Builder — ${title} ===\n`)
  console.log(`Selection: ${selFile}`)

  const sel = JSON.parse(readFileSync(selFile, 'utf8'))
  mkdirSync(previewDir, { recursive: true })

  const copied = []
  const skipped = []
  let order = 1

  for (const pad of sel.pads) {
    if (!pad.sourcePath) {
      skipped.push({ pad, reason: 'no sourcePath (needsSource)' })
      continue
    }
    if (!existsSync(pad.sourcePath)) {
      skipped.push({ pad, reason: `file not found: ${pad.sourcePath}` })
      continue
    }

    const ext = extname(pad.sourcePath).toLowerCase()
    const origName = basename(pad.sourcePath, ext)
    const safe = toSafeFilename(origName)
    const num = String(order).padStart(2, '0')
    const destName = `${num}-${pad.category}-${toSafeFilename(pad.role)}-${safe}${ext}`
    const dest = join(previewDir, destName)

    copyFileSync(pad.sourcePath, dest)
    console.log(`  ✓ ${destName}`)
    copied.push({ order, pad, destName, destPath: dest })
    order++
  }

  const readmePath = join(previewDir, 'README.md')
  writeFileSync(
    readmePath,
    renderPreviewReadme(sel, copied, skipped, selFile, previewDir),
    'utf8',
  )
  console.log('\n✓ README.md written')
  console.log(`\nPreview folder: ${previewDir}`)
  console.log(`  ${copied.length} files copied, ${skipped.length} skipped`)
  console.log('\nApproval status is UNCHANGED. Edit the JSON and set approved:true when ready.')

  return { sel, copied, skipped, previewDir }
}

/** Project reports/ preview (for in-repo review). */
async function commandPreview(args) {
  const selFile = resolveLatestSelection(args['--selection'])
  runPreviewCopy(selFile, join(ROOT, 'reports', 'recommended-audio-preview'))
}

/** Finder-friendly preview in ~/Documents/new-pack-alpha/recommended-audio-preview/ */
async function commandPreviewDocuments(args) {
  const selFile = resolveLatestSelection(args['--selection'])
  const outDir = (args['--out'] || args['--output'])
    ? resolve(args['--out'] || args['--output'])
    : join(homedir(), 'Documents', 'new-pack-alpha', 'recommended-audio-preview')
  runDocumentsPreviewExport(selFile, outDir)
}

/** Category subfolder names for Documents listening pack. */
const PREVIEW_CATEGORY_FOLDERS = {
  beat: 'beats',
  bass: 'bass',
  melody: 'melody',
  atmosphere: 'atmospheres',
  voice: 'vocals',
  fx: 'fx',
  transition: 'transitions',
}

const PREVIEW_CATEGORY_SINGULAR = {
  beat: 'beat',
  bass: 'bass',
  melody: 'melody',
  atmosphere: 'atmosphere',
  voice: 'vocal',
  fx: 'fx',
  transition: 'transition',
}

/** Listening order: beats → bass → melody → atmosphere → vocals → fx → transitions */
const PREVIEW_CATEGORY_ORDER = [
  'beat',
  'bass',
  'melody',
  'atmosphere',
  'voice',
  'fx',
  'transition',
]

/** Minimum curated stems for a playable 16-pad core (+ optional transitions). */
const PREVIEW_CORE_TARGETS = {
  beat: 4,
  bass: 3,
  melody: 3,
  atmosphere: 2,
  voice: 2,
  fx: 2,
}

const PREVIEW_GRID_TOTAL = 24

/** Wipe preview folder and recreate category subfolders. */
function resetPreviewDirectory(previewDir) {
  if (existsSync(previewDir)) {
    rmSync(previewDir, { recursive: true, force: true })
  }
  mkdirSync(previewDir, { recursive: true })
  for (const folder of Object.values(PREVIEW_CATEGORY_FOLDERS)) {
    mkdirSync(join(previewDir, folder), { recursive: true })
  }
}

/** Strip Looperman IDs; produce a short listening slug from pad label or role. */
function labelToListeningSlug(label, role) {
  let s = String(label ?? '')
    .replace(/^looperman[\s-]*(l[\s-]*)?\d+[\s-]*\d*[\s-]*/i, '')
    .replace(/^looperman[\s-]*/i, '')
    .trim()
  s = toSafeFilename(s)
  if (!s || s.length < 2) {
    s = toSafeFilename(role.replace(/-\d+$/, ''))
  }
  return s.slice(0, 45)
}

/**
 * Documents export: category subfolders, global listening order, clean filenames.
 * Example: beats/01-beat-tlt-style-hype-drums.wav
 */
function runDocumentsPreviewExport(selFile, previewDir) {
  if (!selFile) {
    console.error('No selection file found. Pass --selection <file> or run pack:scan first.')
    process.exit(1)
  }

  console.log('=== IncrediBoy Pack Builder — LISTENING PACK EXPORT ===\n')
  console.log(`Selection: ${selFile}`)

  const sel = JSON.parse(readFileSync(selFile, 'utf8'))
  resetPreviewDirectory(previewDir)

  const skipped = []
  const padsWithSource = []
  const padsMissing = []

  for (const pad of sel.pads) {
    if (!pad.sourcePath) {
      skipped.push({ pad, reason: 'no sourcePath (needsSource)' })
      padsMissing.push(pad)
      continue
    }
    if (!existsSync(pad.sourcePath)) {
      skipped.push({ pad, reason: `file not found: ${pad.sourcePath}` })
      padsMissing.push(pad)
      continue
    }
    padsWithSource.push(pad)
  }

  // Sort by category group, then slot index within group
  const categoryRank = Object.fromEntries(PREVIEW_CATEGORY_ORDER.map((c, i) => [c, i]))
  padsWithSource.sort((a, b) => {
    const ca = categoryRank[a.category] ?? 99
    const cb = categoryRank[b.category] ?? 99
    if (ca !== cb) return ca - cb
    return (a.slot ?? 0) - (b.slot ?? 0)
  })

  const copied = []
  let order = 1
  const usedNames = new Set()

  for (const pad of padsWithSource) {
    const ext = extname(pad.sourcePath).toLowerCase()
    const catSingular = PREVIEW_CATEGORY_SINGULAR[pad.category] ?? pad.category
    const slug = labelToListeningSlug(pad.label, pad.role)
    const num = String(order).padStart(2, '0')
    let baseName = `${num}-${catSingular}-${slug}`
    let destName = `${baseName}${ext}`
    let folder = PREVIEW_CATEGORY_FOLDERS[pad.category] ?? pad.category
    let relPath = `${folder}/${destName}`

    // Avoid collisions within export
    let suffix = 2
    while (usedNames.has(relPath)) {
      destName = `${baseName}-${suffix}${ext}`
      relPath = `${folder}/${destName}`
      suffix++
    }
    usedNames.add(relPath)

    const dest = join(previewDir, folder, destName)
    copyFileSync(pad.sourcePath, dest)
    console.log(`  ✓ ${relPath}`)
    copied.push({
      order,
      pad,
      destName,
      relPath,
      destPath: dest,
      originalFilename: basename(pad.sourcePath),
    })
    order++
  }

  const readmePath = join(previewDir, 'README.md')
  writeFileSync(
    readmePath,
    renderDocumentsPreviewReadme(sel, copied, skipped, selFile, previewDir),
    'utf8',
  )
  console.log('\n✓ README.md written')

  printDocumentsExportSummary(sel, copied, skipped, padsMissing, previewDir)

  return { sel, copied, skipped, previewDir }
}

function printDocumentsExportSummary(sel, copied, skipped, padsMissing, previewDir) {
  const withSource = sel.pads.filter((p) => p.sourcePath && existsSync(p.sourcePath)).length
  const total = sel.pads.length

  console.log('\n══════════════════════════════════════════════════════')
  console.log('EXPORT SUMMARY')
  console.log('══════════════════════════════════════════════════════')
  console.log(`Preview folder: ${previewDir}`)
  console.log(`Files copied:   ${copied.length}`)
  console.log(`Missing/rejected: ${skipped.length}`)
  console.log(`Grid coverage:  ${withSource}/${total} pads have audio sources`)

  console.log('\nBy category (have / need for 16-pad core):')
  for (const cat of PREVIEW_CATEGORY_ORDER) {
    const padsInCat = sel.pads.filter((p) => p.category === cat)
    const have = padsInCat.filter((p) => p.sourcePath && existsSync(p.sourcePath)).length
    const need = PREVIEW_CORE_TARGETS[cat]
    if (need != null) {
      const ok = have >= need ? '✓' : '✗'
      console.log(`  ${ok} ${cat.padEnd(12)} ${have}/${padsInCat.length} selected (${need} required for core)`)
    } else if (padsInCat.length > 0) {
      console.log(`    ${cat.padEnd(12)} ${have}/${padsInCat.length} selected (optional)`)
    }
  }

  const coreHave = PREVIEW_CATEGORY_ORDER.reduce((sum, cat) => {
    const need = PREVIEW_CORE_TARGETS[cat]
    if (need == null) return sum
    const have = sel.pads
      .filter((p) => p.category === cat && p.sourcePath && existsSync(p.sourcePath))
      .length
    return sum + Math.min(have, need)
  }, 0)
  const coreNeed = Object.values(PREVIEW_CORE_TARGETS).reduce((a, b) => a + b, 0)

  const readyCore = coreHave >= coreNeed
  const readyGrid = withSource >= PREVIEW_GRID_TOTAL

  console.log('\nCurated audio readiness:')
  console.log(`  16-pad core: ${coreHave}/${coreNeed} — ${readyCore ? 'READY' : 'NOT ENOUGH (add/replace sources in selection JSON)'}`)
  console.log(`  24-pad grid: ${withSource}/${PREVIEW_GRID_TOTAL} — ${readyGrid ? 'READY' : 'NOT ENOUGH (FX/transitions/aux slots still need sources)'}`)

  if (skipped.length > 0) {
    console.log('\nMissing / rejected pads:')
    for (const { pad, reason } of skipped) {
      console.log(`  ✗ ${pad.role.padEnd(14)} (${pad.category}) — ${reason}`)
    }
  }

  console.log('\nApproval status is UNCHANGED.')
  console.log('Listen in Finder, edit selection JSON if needed, then set approved:true before pack:build.')
  console.log('══════════════════════════════════════════════════════\n')
}

function renderDocumentsPreviewReadme(sel, copied, skipped, selFile, previewDir) {
  const rows = copied.map(({ order, pad, relPath, originalFilename }) => {
    const bpm = pad.bpm != null ? String(pad.bpm) : '—'
    const key = pad.key != null ? pad.key : '—'
    const mix = pad.mixabilityScore ?? pad.score ?? '—'
    return `| ${String(order).padStart(2)} | \`${pad.padId}\` | ${pad.category} | \`${originalFilename}\` | \`${relPath}\` | ${bpm} | ${key} | ${mix} |`
  })

  const skippedRows = skipped.map(({ pad, reason }) =>
    `| \`${pad.role}\` | \`${pad.padId}\` | ${pad.category} | ${reason} |`,
  )

  const selBasename = basename(selFile)
  const withSource = sel.pads.filter((p) => p.sourcePath && existsSync(p.sourcePath)).length

  return `# Recommended Listening Pack

Pack: **${sel.packName}** (\`${sel.packId}\`)
Export folder: \`${previewDir}\`
Selection: \`${selBasename}\`
Spine: BPM ${sel.spineAnalysis?.suggestedBpm ?? '?'} · Key ${sel.spineAnalysis?.suggestedKey ?? '?'}
Approved: **${sel.approved ? 'YES' : 'NO — listening preview only'}**
Files exported: ${copied.length} · Missing: ${skipped.length} · Grid coverage: ${withSource}/24

> Open subfolders in Finder to listen. This export does not modify the game or pack configs.

## Folder layout

\`\`\`
recommended-audio-preview/
├── beats/
├── bass/
├── melody/
├── atmospheres/
├── vocals/
├── fx/
├── transitions/
└── README.md
\`\`\`

## Files (listening order)

| # | Pad ID | Category | Original filename | Copied file | BPM | Key | Mix score |
|---|--------|----------|-------------------|-------------|-----|-----|-----------|
${rows.join('\n')}

## Missing / not exported

| Role | Pad ID | Category | Reason |
|------|--------|----------|--------|
${skippedRows.length ? skippedRows.join('\n') : '_(none)_'}

## Next steps

1. Listen to every exported file above.
2. Replace weak sounds in \`reports/${selBasename}\` (edit \`sourcePath\` per pad).
3. Re-run: \`npm run pack:preview-documents\`
4. When satisfied, set \`approved: true\` and run \`npm run pack:build\`.
`
}

/** Convert a string to a safe filename fragment (lowercase, hyphens only). */
function toSafeFilename(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

/** Return the latest pack-selection JSON from reports/, or the explicit path. */
function resolveLatestSelection(explicit) {
  if (explicit) {
    const p = resolve(explicit)
    return existsSync(p) ? p : null
  }
  let entries
  try {
    entries = readdirSync(REPORTS_DIR)
      .filter((f) => f.startsWith('pack-selection-') && f.endsWith('.json'))
      .sort()
  } catch {
    return null
  }
  if (entries.length === 0) return null
  return join(REPORTS_DIR, entries[entries.length - 1])
}

function renderPreviewReadme(sel, copied, skipped, selFile, previewDir) {
  const rows = copied.map(({ order, pad, destName }) => {
    const bpm = pad.bpm != null ? String(pad.bpm) : '—'
    const key = pad.key != null ? pad.key : '—'
    const scr = pad.score != null ? String(pad.score) : '—'
    const src = pad.sourcePath ?? '—'
    return `| ${String(order).padStart(2)} | \`${pad.padId}\` | ${pad.category} | ${pad.label} | \`${src}\` | \`${destName}\` | ${bpm} | ${key} | ${scr} |`
  })

  const skippedRows = skipped.map(({ pad, reason }) =>
    `| \`${pad.role}\` | ${pad.category} | ${reason} |`,
  )

  const selBasename = basename(selFile)

  return `# Pack Builder — Audio Preview
Pack: **${sel.packName}** (\`${sel.packId}\`)
Preview folder: \`${previewDir}\`
Selection file: \`${selBasename}\`
Spine: BPM ${sel.spineAnalysis.suggestedBpm ?? '?'} · Key ${sel.spineAnalysis.suggestedKey ?? '?'}
Approved: **${sel.approved ? 'YES — ready to build' : 'NO — review before running pack:build'}**
Preview copied: ${copied.length} files
Skipped: ${skipped.length} files

> This folder is for listening only.
> It does not affect public/audio/ or any pack config.
> When ready, set approved:true in the selection JSON and run:
> \`npm run pack:build -- --selection ${selBasename}\`

## Files to review

| # | Pad ID | Category | Label | Original source path | Copied filename | BPM | Key | Score |
|---|--------|----------|-------|----------------------|-----------------|-----|-----|-------|
${rows.join('\n')}

## Skipped (no source)

| Role | Category | Reason |
|------|----------|--------|
${skippedRows.length ? skippedRows.join('\n') : '_(none)_'}

## Approval instructions

1. Listen to every file above (open this folder in Finder).
2. If any sound needs replacing, edit \`${selBasename}\` in the project reports/ folder:
   - Find the pad entry by \`role\`
   - Update \`sourcePath\` to a new absolute file path
   - Re-run \`npm run pack:preview-documents\` to refresh this folder
3. Once happy with all sounds, set \`approved: true\` in the JSON.
4. Run: \`npm run pack:build -- --selection reports/${selBasename}\`
`
}

// ─── CLI PARSER ───────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      args[argv[i]] = argv[i + 1] ?? true
      if (argv[i + 1] && !argv[i + 1].startsWith('--')) i++
    }
  }
  return args
}

// ─── ENTRY ────────────────────────────────────────────────────────────────────
const [,, command, ...rest] = process.argv
const args = parseArgs(rest)

switch (command) {
  case 'scan':    await commandScan(args);    break
  case 'build':   await commandBuild(args);   break
  case 'register': await commandRegister(args); break
  case 'preview': await commandPreview(args); break
  case 'preview-documents': await commandPreviewDocuments(args); break
  default:
    console.log(
      'Usage:\n' +
      '  npm run pack:scan              [-- --source <dir>] [--bpm <n>] [--key <K>] [--pack-id <id>] [--pack-name <name>]\n' +
      '  npm run pack:preview           [-- --selection <reports/pack-selection-*.json>]\n' +
      '  npm run pack:preview-documents [-- --selection <reports/pack-selection-*.json>] [--out <dir>]\n' +
      '  npm run pack:build             -- --selection <reports/pack-selection-*.json>\n' +
      '  npm run pack:register          -- --pack-id <id>   (after build, auto-patches App.tsx)\n',
    )
    process.exit(0)
}
