import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseDamsMap } from '../src/data/loadDamsMap'
import { parseIndiaMap } from '../src/data/loadIndiaMap'
import { parseMapData } from '../src/data/loadMap'
import { parseMonumentsMap } from '../src/data/loadMonumentsMap'
import { parseRiversMap } from '../src/data/loadRiversMap'
import type { MapRegion, Quiz } from '../src/game/types'

/** public/mp-map.json exactly as shipped, read from disk. */
export const raw: unknown = JSON.parse(readFileSync(resolve('public/mp-map.json'), 'utf8'))

/** The same file after loadMap's checks. */
export const map = parseMapData(raw)

/** public/india-map.json exactly as shipped, and after its checks. */
export const indiaRaw: unknown = JSON.parse(readFileSync(resolve('public/india-map.json'), 'utf8'))
export const india = parseIndiaMap(indiaRaw)

/** public/rivers-map.json exactly as shipped, and after its checks. */
export const riversRaw: unknown = JSON.parse(
  readFileSync(resolve('public/rivers-map.json'), 'utf8'),
)
export const rivers = parseRiversMap(riversRaw)

/** public/monuments-map.json exactly as shipped, and after its checks. */
export const monumentsRaw: unknown = JSON.parse(
  readFileSync(resolve('public/monuments-map.json'), 'utf8'),
)
export const monuments = parseMonumentsMap(monumentsRaw)

/** public/dams-map.json exactly as shipped, and after its checks. */
export const damsRaw: unknown = JSON.parse(readFileSync(resolve('public/dams-map.json'), 'utf8'))
export const dams = parseDamsMap(damsRaw)

// The monuments as the Famous architecture game asks them: by name, or by place (city or state).
const stateSpellings = new Map(india.regions.map((r) => [r.name, [r.name, ...r.alt]]))
const monumentPoints: MapRegion[] = monuments.monuments.map((m) => ({
  name: m.name,
  d: '',
  lx: m.lx,
  ly: m.ly,
  alt: m.alt,
}))
const monumentPlaces: MapRegion[] = monuments.monuments.map((m, i) => ({
  ...monumentPoints[i],
  answers: [m.city, ...m.cityAlt, ...(stateSpellings.get(m.state) ?? [])],
}))

/** The quizzes the games play, built the way games.ts builds them. */
export const QUIZZES = {
  divisions: { regions: map.divisions, seconds: 300, one: 'division', many: 'divisions' },
  districts: { regions: map.districts, seconds: 900, one: 'district', many: 'districts' },
  india: { regions: india.regions, seconds: 600, one: 'state or UT', many: 'states and UTs' },
  majorRivers: {
    regions: rivers.rivers.filter((river) => river.major),
    seconds: 300,
    one: 'river',
    many: 'rivers',
  },
  rivers: { regions: rivers.rivers, seconds: 600, one: 'river', many: 'rivers' },
  monuments: { regions: monumentPoints, seconds: 420, one: 'monument', many: 'monuments' },
  places: { regions: monumentPlaces, seconds: 420, one: 'monument', many: 'monuments' },
} satisfies Record<string, Quiz>

/** A fetch that serves the map files from disk, for screen tests. */
export async function fakeFetch(url: string | URL | Request): Promise<Response> {
  const file = String(url)
  let body = raw
  if (file.endsWith('india-map.json')) body = indiaRaw
  if (file.endsWith('rivers-map.json')) body = riversRaw
  if (file.endsWith('monuments-map.json')) body = monumentsRaw
  if (file.endsWith('dams-map.json')) body = damsRaw
  return new Response(JSON.stringify(body))
}

/** A small seeded random number generator (mulberry32), for repeatable shuffles. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
