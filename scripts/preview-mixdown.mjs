#!/usr/bin/env node
/**
 * Preview Mixdown Generator
 * ─────────────────────────
 * Builds a single demo WAV from ~/Documents/new-pack-alpha/recommended-audio-preview/
 *
 * Usage:
 *   npm run pack:preview-mixdown
 *   npm run pack:preview-mixdown -- --dir ~/Documents/new-pack-alpha/recommended-audio-preview
 *   npm run pack:preview-mixdown -- --bpm 105
 *
 * Does NOT modify source WAVs, App.tsx, or pack configs.
 */

import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
} from 'node:fs'
import { join, basename, resolve, dirname, extname } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { execSync, spawnSync } from 'node:child_process'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dir, '..')
const REPORTS_DIR = join(ROOT, 'reports')

const DEFAULT_PREVIEW_DIR = join(
  homedir(),
  'Documents',
  'new-pack-alpha',
  'recommended-audio-preview',
)
const OUTPUT_NAME = 'demo-preview-mix.wav'
const README_NAME = 'README-MIXDOWN.md'

const BARS_PER_SECTION = 4
const TOTAL_BARS = 32

/** When each category enters the mix (in bars). */
const ENTRY_BARS = {
  beats: 0,
  bass: 4,
  melody: 8,
  atmospheres: 12,
  vocals: 16,
}

/** FX/transition one-shots fire at these bar positions. */
const FX_TRIGGER_BARS = [4, 8, 12, 16, 20, 24]

const CATEGORY_VOLUME = {
  beats: 0.48,
  bass: 0.60,
  melody: 0.50,
  atmospheres: 0.40,
  vocals: 0.44,
  fx: 0.52,
  transitions: 0.52,
}

const FOLDER_ORDER = [
  'beats',
  'bass',
  'melody',
  'atmospheres',
  'vocals',
  'fx',
  'transitions',
]

// ─── helpers ─────────────────────────────────────────────────────────────────

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

function hasFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: ['pipe', 'pipe', 'pipe'] })
    return true
  } catch {
    return false
  }
}

function ffprobeDuration(path) {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${path}"`,
      { encoding: 'utf8' },
    )
    const v = parseFloat(out.trim())
    return isNaN(v) ? null : v
  } catch {
    return null
  }
}

function parseBpmFromFilename(name) {
  const patterns = [
    /(\d{2,3})\s*bpm/i,
    /(\d{2,3})\s*bmp/i,
    /[-_](\d{2,3})[-_]bpm/i,
    /[-_](\d{2,3})[-_]bmp/i,
    /(\d{2,3})-bpm/i,
  ]
  for (const re of patterns) {
    const m = name.match(re)
    if (m) return parseInt(m[1], 10)
  }
  return null
}

function barDurationSec(bpm) {
  return (4 * 60) / bpm
}

function barsToMs(bars, bpm) {
  return Math.round(bars * barDurationSec(bpm) * 1000)
}

function barsToSec(bars, bpm) {
  return bars * barDurationSec(bpm)
}

function resolveLatestSelectionBpm() {
  try {
    const entries = readdirSync(REPORTS_DIR)
      .filter((f) => f.startsWith('pack-selection-') && f.endsWith('.json'))
      .sort()
    if (entries.length === 0) return null
    const sel = JSON.parse(readFileSync(join(REPORTS_DIR, entries.at(-1)), 'utf8'))
    return sel.spineAnalysis?.suggestedBpm ?? null
  } catch {
    return null
  }
}

function scanPreviewFolder(previewDir) {
  const byFolder = {}
  const missingCategories = []

  for (const folder of FOLDER_ORDER) {
    const folderPath = join(previewDir, folder)
    if (!existsSync(folderPath)) {
      if (ENTRY_BARS[folder] != null || folder === 'fx' || folder === 'transitions') {
        missingCategories.push(folder)
      }
      continue
    }
    const wavs = readdirSync(folderPath)
      .filter((f) => extname(f).toLowerCase() === '.wav')
      .sort()
      .map((f) => join(folderPath, f))

    byFolder[folder] = wavs
    if (wavs.length === 0 && (ENTRY_BARS[folder] != null || folder === 'fx' || folder === 'transitions')) {
      missingCategories.push(folder)
    }
  }

  return { byFolder, missingCategories }
}

function buildTracks(byFolder, masterBpm) {
  const tracks = []
  const bpmWarnings = []

  for (const [folder, files] of Object.entries(byFolder)) {
    if (!files?.length) continue

    const entryBar = ENTRY_BARS[folder]
    const isOneShot = folder === 'fx' || folder === 'transitions'
    const baseVol = CATEGORY_VOLUME[folder] ?? 0.5
    const perFileVol = baseVol / Math.sqrt(files.length)

    if (isOneShot) {
      files.forEach((path, i) => {
        const triggerBar = FX_TRIGGER_BARS[i % FX_TRIGGER_BARS.length]
        const fileBpm = parseBpmFromFilename(basename(path))
        if (fileBpm && Math.abs(fileBpm - masterBpm) / masterBpm > 0.03) {
          bpmWarnings.push({
            file: basename(path),
            folder,
            fileBpm,
            masterBpm,
            note: 'one-shot — timing is event-based, not loop-synced',
          })
        }
        tracks.push({
          path,
          folder,
          filename: basename(path),
          entryBar: triggerBar,
          delayMs: barsToMs(triggerBar, masterBpm),
          volume: perFileVol,
          loop: false,
          duration: ffprobeDuration(path),
          fileBpm,
        })
      })
    } else {
      files.forEach((path) => {
        const fileBpm = parseBpmFromFilename(basename(path))
        if (fileBpm && Math.abs(fileBpm - masterBpm) / masterBpm > 0.03) {
          bpmWarnings.push({
            file: basename(path),
            folder,
            fileBpm,
            masterBpm,
            note: 'NOT time-stretched — may phase against mix grid',
          })
        }
        tracks.push({
          path,
          folder,
          filename: basename(path),
          entryBar: entryBar ?? 0,
          delayMs: barsToMs(entryBar ?? 0, masterBpm),
          volume: perFileVol,
          loop: true,
          duration: ffprobeDuration(path),
          fileBpm,
        })
      })
    }
  }

  return { tracks, bpmWarnings }
}

function renderMixdownReadme({
  previewDir,
  masterBpm,
  totalSec,
  tracks,
  bpmWarnings,
  missingCategories,
  clippingWarnings,
  outputPath,
}) {
  const trackRows = tracks.map((t) => {
    const bpm = t.fileBpm ?? '—'
    const entry = `bar ${t.entryBar} (${(t.delayMs / 1000).toFixed(2)}s)`
    const mode = t.loop ? 'loop' : 'one-shot'
    return `| ${t.folder} | \`${t.filename}\` | ${entry} | ${mode} | ${bpm} | ${t.volume.toFixed(3)} |`
  })

  const bpmRows =
    bpmWarnings.length === 0
      ? '_(none — all detected BPMs match master or BPM unknown)_'
      : bpmWarnings
          .map(
            (w) =>
              `| \`${w.file}\` | ${w.folder} | ${w.fileBpm} | ${w.masterBpm} | ${w.note} |`,
          )
          .join('\n')

  const missingList =
    missingCategories.length === 0
      ? '_(none)_'
      : missingCategories.map((c) => `- \`${c}/\` — no WAV files exported`).join('\n')

  const clipSection =
    clippingWarnings.length === 0
      ? 'No clipping detected (peak within safe limit).'
      : clippingWarnings.map((w) => `- ⚠ ${w}`).join('\n')

  return `# Preview Mixdown

Auto-generated demo mix for quick audition of recommended pack selections.

## Output

| | |
|---|---|
| **Mix file** | \`${outputPath}\` |
| **Master BPM** | ${masterBpm} (grid reference — files are NOT time-stretched) |
| **Duration** | ${totalSec.toFixed(2)}s (${TOTAL_BARS} bars @ ${masterBpm} BPM) |
| **Generated** | ${new Date().toISOString()} |

## Mix structure

| Bars | Section |
|------|---------|
| 0–4 | Beats only |
| 4–8 | + Bass |
| 8–12 | + Melody |
| 12–16 | + Atmosphere |
| 16–32 | + Vocals |
| 4, 8, 12, 16… | FX / transition one-shots (if present) |

## Tracks used

| Folder | File | Entry | Mode | File BPM | Volume |
|--------|------|-------|------|----------|--------|
${trackRows.join('\n')}

## BPM mismatches (warnings only — no auto stretch)

| File | Folder | File BPM | Master BPM | Note |
|------|--------|----------|------------|------|
${bpmRows}

## Missing categories

${missingList}

## Clipping / loudness

${clipSection}

## Notes

- Source WAVs in category subfolders were **not modified**.
- Loops are repeated via ffmpeg \`-stream_loop\`; one-shots play once at section boundaries.
- Re-run: \`npm run pack:preview-mixdown\`
`
}

function detectClipping(outputPath) {
  const warnings = []
  try {
    const stderr = execSync(
      `ffmpeg -hide_banner -i "${outputPath}" -af volumedetect -f null - 2>&1`,
      { encoding: 'utf8' },
    )
    const maxMatch = stderr.match(/max_volume:\s*([-\d.]+)\s*dB/)
    if (maxMatch) {
      const maxDb = parseFloat(maxMatch[1])
      if (maxDb >= -0.3) {
        warnings.push(`Peak level ${maxDb} dBFS — near or at clipping`)
      } else if (maxDb >= -1.0) {
        warnings.push(`Peak level ${maxDb} dBFS — hot but within limiter target`)
      }
    }
  } catch (err) {
    warnings.push(`Could not analyse loudness: ${err.message}`)
  }
  return warnings
}

function runMixdown(previewDir, masterBpm) {
  const { byFolder, missingCategories } = scanPreviewFolder(previewDir)
  const { tracks, bpmWarnings } = buildTracks(byFolder, masterBpm)

  if (tracks.length === 0) {
    console.error('No WAV files found in preview folder. Run pack:preview-documents first.')
    process.exit(1)
  }

  const totalSec = barsToSec(TOTAL_BARS, masterBpm)
  const outputPath = join(previewDir, OUTPUT_NAME)

  console.log('=== Preview Mixdown Generator ===\n')
  console.log(`Preview dir:  ${previewDir}`)
  console.log(`Master BPM:   ${masterBpm} (grid only — no time-stretch)`)
  console.log(`Duration:     ${totalSec.toFixed(2)}s (${TOTAL_BARS} bars)`)
  console.log(`Tracks:       ${tracks.length}`)
  console.log()

  if (bpmWarnings.length) {
    console.log('BPM mismatch warnings:')
    for (const w of bpmWarnings) {
      console.log(
        `  ⚠ ${w.file} (${w.fileBpm} BPM vs master ${w.masterBpm}) — ${w.note}`,
      )
    }
    console.log()
  }

  if (missingCategories.length) {
    console.log('Missing categories (no files in preview):')
    for (const c of missingCategories) console.log(`  • ${c}/`)
    console.log()
  }

  // Build ffmpeg command
  const inputArgs = []
  const filterParts = []
  const mixLabels = []

  tracks.forEach((track, i) => {
    if (track.loop) {
      inputArgs.push('-stream_loop', '-1', '-i', track.path)
    } else {
      inputArgs.push('-i', track.path)
    }
    const label = `t${i}`
    filterParts.push(
      `[${i}:a]adelay=${track.delayMs}|${track.delayMs},volume=${track.volume.toFixed(4)},asetpts=PTS-STARTPTS[${label}]`,
    )
    mixLabels.push(`[${label}]`)
  })

  const mixCount = mixLabels.length
  filterParts.push(
    `${mixLabels.join('')}amix=inputs=${mixCount}:duration=longest:dropout_transition=0:normalize=0[mix]`,
  )
  filterParts.push(
    '[mix]alimiter=limit=0.95:level=disabled:attack=5:release=50[out]',
  )

  const filterComplex = filterParts.join(';')

  const ffmpegArgs = [
    '-hide_banner',
    '-y',
    ...inputArgs,
    '-filter_complex',
    filterComplex,
    '-map',
    '[out]',
    '-t',
    String(totalSec),
    '-ar',
    '44100',
    '-ac',
    '2',
    '-c:a',
    'pcm_s16le',
    outputPath,
  ]

  console.log('Rendering mixdown with ffmpeg...')
  const result = spawnSync('ffmpeg', ffmpegArgs, { encoding: 'utf8' })

  if (result.status !== 0) {
    console.error('ffmpeg failed:')
    console.error(result.stderr?.slice(-2000) ?? result.error)
    process.exit(1)
  }

  const outStat = statSync(outputPath)
  const clippingWarnings = detectClipping(outputPath)

  if (clippingWarnings.length) {
    console.log('Clipping / loudness warnings:')
    for (const w of clippingWarnings) console.log(`  ⚠ ${w}`)
    console.log()
  }

  const readmePath = join(previewDir, README_NAME)
  writeFileSync(
    readmePath,
    renderMixdownReadme({
      previewDir,
      masterBpm,
      totalSec,
      tracks,
      bpmWarnings,
      missingCategories,
      clippingWarnings,
      outputPath,
    }),
    'utf8',
  )

  console.log('══════════════════════════════════════════════════════')
  console.log('MIXDOWN COMPLETE')
  console.log('══════════════════════════════════════════════════════')
  console.log(`Demo mix:     ${outputPath}`)
  console.log(`Size:         ${(outStat.size / 1024 / 1024).toFixed(2)} MB`)
  console.log(`Duration:     ${totalSec.toFixed(2)}s`)
  console.log(`Tracks mixed: ${tracks.length}`)
  console.log(`Missing cats: ${missingCategories.length ? missingCategories.join(', ') : 'none'}`)
  console.log(`BPM warnings: ${bpmWarnings.length}`)
  console.log(`Readme:       ${readmePath}`)
  console.log('══════════════════════════════════════════════════════\n')
}

// ─── entry ───────────────────────────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2))

if (!hasFfmpeg()) {
  console.error('ffmpeg is required but not found. Install ffmpeg and retry.')
  process.exit(1)
}

const previewDir = args['--dir']
  ? resolve(args['--dir'])
  : DEFAULT_PREVIEW_DIR

if (!existsSync(previewDir)) {
  console.error(`Preview folder not found: ${previewDir}`)
  console.error('Run: npm run pack:preview-documents')
  process.exit(1)
}

const masterBpm = args['--bpm']
  ? Number(args['--bpm'])
  : resolveLatestSelectionBpm() ?? 105

runMixdown(previewDir, masterBpm)
