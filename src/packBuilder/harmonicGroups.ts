/**
 * harmonicGroups.ts — key → harmonic group mapping and pairwise compatibility.
 */

import type { HarmonicGroup } from './types'

/** Normalize key strings from filenames / pack configs. */
export function normalizeKey(key: string | null | undefined): string | null {
  if (!key) return null
  const k = key.trim().toUpperCase().replace('♯', '#').replace('♭', 'b')
  const map: Record<string, string> = {
    DB: 'C#',
    EB: 'D#',
    GB: 'F#',
    AB: 'G#',
    BB: 'A#',
  }
  return map[k] ?? k
}

/**
 * Map a key to its harmonic group relative to a pack tonic key.
 * Simplified Incredibox-style: tonic cluster + IV + VII + relatives.
 */
export function keyToHarmonicGroup(key: string | null, tonicKey: string): HarmonicGroup {
  const k = normalizeKey(key)
  const tonic = normalizeKey(tonicKey)
  if (!k) return 'atonal'
  if (!tonic) return 'modal'
  if (k === tonic) return 'tonic'

  const semitone = (note: string): number => {
    const table: Record<string, number> = {
      C: 0, 'C#': 1, DB: 1, D: 2, 'D#': 3, EB: 3, E: 4, F: 5,
      'F#': 6, GB: 6, G: 7, 'G#': 8, AB: 8, A: 9, 'A#': 10, BB: 10, B: 11,
    }
    return table[note] ?? 0
  }

  const interval = (semitone(k) - semitone(tonic) + 12) % 12
  if (interval === 0) return 'tonic'
  if (interval === 5) return 'subdominant' // perfect fourth (F over C)
  if (interval === 10) return 'dominant' // minor seventh / VII (Bb over C)
  if (interval === 9) return 'dominant' // major sixth / relative major territory
  if (interval === 3 || interval === 8) return 'relative'
  return 'modal'
}

/**
 * Pairwise harmonic compatibility 0–100.
 * Percussive/atonal layers are neutral-positive (designed to stack).
 */
export function harmonicCompatibilityPercent(
  groupA: HarmonicGroup,
  groupB: HarmonicGroup,
  keyA: string | null,
  keyB: string | null,
): number {
  if (groupA === 'percussive' || groupB === 'percussive') return 95
  if (groupA === 'atonal' || groupB === 'atonal') return 90
  if (groupA === groupB) return 100

  const pair = `${groupA}:${groupB}`
  const scores: Record<string, number> = {
    'tonic:subdominant': 92,
    'subdominant:tonic': 92,
    'tonic:dominant': 88,
    'dominant:tonic': 88,
    'tonic:relative': 85,
    'relative:tonic': 85,
    'subdominant:dominant': 80,
    'dominant:subdominant': 80,
    'tonic:modal': 72,
    'modal:tonic': 72,
    'subdominant:modal': 75,
    'modal:subdominant': 75,
    'dominant:modal': 70,
    'modal:dominant': 70,
    'modal:modal': 78,
    'relative:subdominant': 82,
    'subdominant:relative': 82,
    'relative:dominant': 78,
    'dominant:relative': 78,
  }

  if (scores[pair] !== undefined) return scores[pair]

  // Same letter key fallback
  if (keyA && keyB && normalizeKey(keyA) === normalizeKey(keyB)) return 100
  return 65
}

/** Average harmonic match of one pad against a set of other keys/groups. */
export function averageHarmonicMatch(
  group: HarmonicGroup,
  key: string | null,
  others: Array<{ group: HarmonicGroup; key: string | null }>,
): number {
  if (others.length === 0) return 100
  const sum = others.reduce(
    (acc, o) => acc + harmonicCompatibilityPercent(group, o.group, key, o.key),
    0,
  )
  return sum / others.length
}
