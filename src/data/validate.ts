import type { MapRegion } from '../game/types'

/** Fetches a map file from public/ and parses it as JSON, with readable errors. */
export async function fetchMapFile(file: string, fetchFn: typeof fetch): Promise<unknown> {
  const response = await fetchFn(`${import.meta.env.BASE_URL}${file}`)
  if (!response.ok) {
    throw new Error(`The map file could not be downloaded (HTTP ${response.status}).`)
  }
  try {
    return await response.json()
  } catch {
    throw new Error('The map file is not valid JSON.')
  }
}

export function fail(reason: string): never {
  throw new Error(`The map file failed its checks: ${reason}.`)
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isList(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

export function isStringList(value: unknown): value is string[] {
  return isList(value) && value.every((item) => typeof item === 'string')
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function isPositive(value: unknown): value is number {
  return isNumber(value) && value > 0
}

export function isPath(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('M')
}

/** Checks the fields every region has. Returns the region and the raw object, for extra fields. */
export function readRegion(
  value: unknown,
  index: number,
): { region: MapRegion; raw: Record<string, unknown> } {
  if (!isObject(value)) fail(`region #${index + 1} is not an object`)
  const { name, d, lx, ly, alt, short, small } = value
  if (typeof name !== 'string' || name === '') fail(`region #${index + 1} has no name`)
  if (!isPath(d)) fail(`${name} has no outline`)
  if (!isNumber(lx) || !isNumber(ly)) fail(`${name} has no label point`)
  if (!isStringList(alt)) fail(`${name} has no list of other spellings`)
  if (short !== undefined && typeof short !== 'string') fail(`${name} has a bad short label`)
  if (small !== undefined && typeof small !== 'boolean') fail(`${name} has a bad small flag`)

  const region: MapRegion = { name, d, lx, ly, alt }
  if (short !== undefined) region.short = short
  if (small) region.small = true
  return { region, raw: value }
}

export function firstDuplicate(regions: readonly MapRegion[]): string | undefined {
  const seen = new Set<string>()
  for (const { name } of regions) {
    if (seen.has(name)) return name
    seen.add(name)
  }
  return undefined
}
