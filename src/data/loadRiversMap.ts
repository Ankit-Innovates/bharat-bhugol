import type { RiverLine, RiversMapData } from '../game/types'
import {
  fail,
  fetchMapFile,
  firstDuplicate,
  isList,
  isObject,
  isPositive,
  readRegion,
} from './validate'

export const RIVER_COUNT = 29
export const MAJOR_RIVER_COUNT = 15

/** Fetches public/rivers-map.json and checks it before the game uses it. */
export async function loadRiversMap(fetchFn: typeof fetch = fetch): Promise<RiversMapData> {
  return parseRiversMap(await fetchMapFile('rivers-map.json', fetchFn))
}

/** Checks the shape and contents of the rivers file; throws a readable error if anything is wrong. */
export function parseRiversMap(json: unknown): RiversMapData {
  if (!isObject(json)) fail('it is not a JSON object')
  const { w, h, rivers, credit } = json
  if (!isPositive(w) || !isPositive(h)) fail('the map size is missing')
  if (typeof credit !== 'string' || credit === '') fail('the data credit is missing')
  if (!isList(rivers)) fail('the river list is missing')

  const map: RiversMapData = { w, h, credit, rivers: rivers.map(readRiver) }
  const major = map.rivers.filter((river) => river.major).length
  if (map.rivers.length !== RIVER_COUNT || major !== MAJOR_RIVER_COUNT) {
    fail(
      `expected ${RIVER_COUNT} rivers, ${MAJOR_RIVER_COUNT} of them major, ` +
        `found ${map.rivers.length} and ${major}`,
    )
  }
  const duplicate = firstDuplicate(map.rivers)
  if (duplicate) fail(`the name "${duplicate}" is used twice`)
  return map
}

function readRiver(value: unknown, index: number): RiverLine {
  const { region, raw } = readRegion(value, index)
  if (typeof raw.major !== 'boolean') fail(`${region.name} is not marked as major or not`)
  return { ...region, major: raw.major }
}
