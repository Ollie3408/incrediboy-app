#!/usr/bin/env node
/**
 * Validates Core Mix Pack Alpha assets and pad config.
 * Run: npm run validate:core-mix
 */
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const audioRoot = join(root, 'public/audio/core-mix-pack-alpha')
const configPath = join(root, 'src/generated/audioPacks/coreMixPackAlpha.ts')

const CORE_LOOP_CATEGORIES = new Set(['beat', 'bass', 'melody', 'atmosphere'])
const ONE_SHOT_CATEGORIES = new Set(['fx', 'transition'])

/** Minimal parse: extract pad rows from TS (id, category, audioFile, playbackMode). */
function parsePadsFromConfig(text) {
  const pads = []
  const blockRe =
    /id:\s*'([^']+)'[\s\S]*?category:\s*'([^']+)'[\s\S]*?audioFile:\s*'([^']+)'[\s\S]*?playbackMode:\s*'(loop|one-shot)'/g
  let m
  while ((m = blockRe.exec(text)) !== null) {
    pads.push({ id: m[1], category: m[2], audioFile: m[3], playbackMode: m[4] })
  }
  return pads
}

function md5File(path) {
  return createHash('md5').update(readFileSync(path)).digest('hex')
}

function durationSec(path) {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${path}"`,
      { encoding: 'utf8' },
    )
    return parseFloat(out.trim())
  } catch {
    return null
  }
}

const configText = readFileSync(configPath, 'utf8')
const pads = parsePadsFromConfig(configText)
const errors = []
const warnings = []

if (pads.length !== 24) {
  errors.push(`Expected 24 pads in config, found ${pads.length}`)
}

const urlCounts = new Map()
const md5ByPad = new Map()

for (const pad of pads) {
  const fullPath = join(audioRoot, pad.audioFile)
  const url = `/audio/core-mix-pack-alpha/${pad.audioFile}`

  urlCounts.set(url, [...(urlCounts.get(url) ?? []), pad.id])

  if (!existsSync(fullPath)) {
    errors.push(`Missing file for ${pad.id}: ${fullPath}`)
    continue
  }

  const hash = md5File(fullPath)
  for (const [otherId, otherHash] of md5ByPad) {
    if (otherHash === hash) {
      errors.push(`Duplicate audio content: ${pad.id} and ${otherId} (${pad.audioFile})`)
    }
  }
  md5ByPad.set(pad.id, hash)

  if (CORE_LOOP_CATEGORIES.has(pad.category) && pad.playbackMode !== 'loop') {
    errors.push(`${pad.id} (${pad.category}) must be playbackMode "loop"`)
  }
  if (ONE_SHOT_CATEGORIES.has(pad.category) && pad.playbackMode !== 'one-shot') {
    errors.push(`${pad.id} (${pad.category}) must be playbackMode "one-shot"`)
  }
  if (pad.category === 'voice' && pad.playbackMode !== 'loop' && pad.playbackMode !== 'one-shot') {
    errors.push(`${pad.id} (voice) has invalid playbackMode`)
  }
}

for (const [url, ids] of urlCounts) {
  if (ids.length > 1) {
    errors.push(`Duplicate audio URL ${url}: ${ids.join(', ')}`)
  }
}

const coreIds = [
  'cma-beat-01',
  'cma-beat-02',
  'cma-beat-03',
  'cma-beat-04',
  'cma-bass-01',
  'cma-bass-02',
  'cma-bass-03',
  'cma-melody-01',
  'cma-melody-02',
  'cma-melody-03',
  'cma-fx-01',
  'cma-fx-02',
  'cma-atmo-01',
  'cma-atmo-02',
  'cma-vox-01',
  'cma-vox-02',
]
for (const id of coreIds) {
  if (!pads.find((p) => p.id === id)) {
    errors.push(`Missing core pad id: ${id}`)
  }
}

console.log('Core Mix Pack Alpha validation\n')
console.log(`Pads: ${pads.length}`)
console.log(`Audio root: ${audioRoot}\n`)

if (warnings.length) {
  console.log('Warnings:')
  warnings.forEach((w) => console.log(`  ⚠ ${w}`))
  console.log()
}

if (errors.length) {
  console.log('FAILED:')
  errors.forEach((e) => console.log(`  ✗ ${e}`))
  process.exit(1)
}

console.log('OK — all checks passed')
console.log('\nPad summary:')
for (const pad of pads) {
  const fullPath = join(audioRoot, pad.audioFile)
  const dur = existsSync(fullPath) ? durationSec(fullPath) : null
  const loops = pad.playbackMode === 'loop' ? 'yes' : 'no'
  console.log(
    `  ${pad.id.padEnd(16)} ${pad.category.padEnd(11)} ${loops.padEnd(5)} ${dur?.toFixed(3) ?? '?'}s  ${pad.audioFile}`,
  )
}

process.exit(0)
