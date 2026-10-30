import type { GridLine, IndiaMapData, IndiaRegion } from '../game/types'
import {
  fail,
  fetchMapFile,
  firstDuplicate,
  isList,
  isNumber,
  isObject,
  isPath,
  isPositive,
  readRegion,
} from './validate'

export const STATE_COUNT = 28
export const UT_COUNT = 8

/** Fetches public/india-map.json and checks it before the game uses it. */
export async function loadIndiaMap(fetchFn: typeof fetch = fetch): Promise<IndiaMapData> {
  return parseIndiaMap(await fetchMapFile('india-map.json', fetchFn))
}

/** Checks the shape and contents of the India map file; throws a readable error if anything is wrong. */
export function parseIndiaMap(json: unknown): IndiaMapData {
  if (!isObject(json)) fail('it is not a JSON object')
  const { w, h, outline, regions, graticule, credit } = json
  if (!isPositive(w) || !isPositive(h)) fail('the map size is missing')
  if (!isPath(outline)) fail('the country outline is missing')
  if (typeof credit !== 'string' || credit === '') fail('the data credit is missing')
  if (!isList(regions)) fail('the region list is missing')
  if (!isList(graticule)) fail('the latitude and longitude lines are missing')

  const map: IndiaMapData = {
    w,
    h,
    outline,
    credit,
    regions: regions.map((value, index) => readStateOrUt(value, index)),
    graticule: graticule.map((value) => readGridLine(value)),
  }

  const states = map.regions.filter((r) => r.kind === 'state').length
  const uts = map.regions.length - states
  if (states !== STATE_COUNT || uts !== UT_COUNT) {
    fail(
      `expected ${STATE_COUNT} states and ${UT_COUNT} union territories, found ${states} and ${uts}`,
    )
  }
  const duplicate = firstDuplicate(map.regions)
  if (duplicate) fail(`the name "${duplicate}" is used twice`)
  return map
}

function readStateOrUt(value: unknown, index: number): IndiaRegion {
  const { region, raw } = readRegion(value, index)
  if (raw.kind !== 'state' && raw.kind !== 'ut') fail(`${region.name} is neither a state nor a UT`)
  return { ...region, kind: raw.kind }
}

function readGridLine(value: unknown): GridLine {
  if (!isObject(value)) fail('a latitude or longitude line is not an object')
  const { label, d, x, y } = value
  if (typeof label !== 'string' || !isPath(d) || !isNumber(x) || !isNumber(y)) {
    fail('a latitude or longitude line is incomplete')
  }
  return { label, d, x, y }
}
