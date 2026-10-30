import type { MapRegion } from './types'

/** Lowercase, strip accents (NFKD), and remove everything except a–z and digits (for "28"). */
export function normalise(s: string): string {
  return s
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Everything that counts as naming `region`: its name and other accepted spellings, or its
 * answers, for regions that have them (such as a monument asked for its city).
 */
export function spellings(region: MapRegion): readonly string[] {
  return region.answers ?? [region.name, ...region.alt]
}

/**
 * The name of the region in `remaining` that the whole of `text` spells, by one of its
 * spellings; null if none does. No prefix or fuzzy matching.
 */
export function matchName(text: string, remaining: readonly MapRegion[]): string | null {
  const key = normalise(text)
  if (key === '') return null
  const hit = remaining.find((region) =>
    spellings(region).some((spelling) => normalise(spelling) === key),
  )
  return hit ? hit.name : null
}
