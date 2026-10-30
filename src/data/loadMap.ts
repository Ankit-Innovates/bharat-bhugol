import type { MapData, MapDistrict, MapDivision } from '../game/types'
import {
  fail,
  fetchMapFile,
  firstDuplicate,
  isList,
  isObject,
  isPath,
  isPositive,
  readRegion,
} from './validate'

export const DIVISION_COUNT = 10
export const DISTRICT_COUNT = 55

/** Fetches public/mp-map.json (Madhya Pradesh) and checks it before the game uses it. */
export async function loadMap(fetchFn: typeof fetch = fetch): Promise<MapData> {
  return parseMapData(await fetchMapFile('mp-map.json', fetchFn))
}

/** Checks the shape and contents of the MP map file; throws a readable error if anything is wrong. */
export function parseMapData(json: unknown): MapData {
  if (!isObject(json)) fail('it is not a JSON object')
  const { w, h, state, divisions, districts, credit } = json
  if (!isPositive(w) || !isPositive(h)) fail('the map size is missing')
  if (!isPath(state)) fail('the state outline is missing')
  if (typeof credit !== 'string' || credit === '') fail('the data credit is missing')
  if (!isList(divisions) || !isList(districts)) fail('the region lists are missing')

  const map: MapData = {
    w,
    h,
    state,
    credit,
    divisions: divisions.map((value, index) => readDivision(value, index)),
    districts: districts.map((value, index) => readDistrict(value, index)),
  }

  if (map.divisions.length !== DIVISION_COUNT) {
    fail(`expected ${DIVISION_COUNT} divisions, found ${map.divisions.length}`)
  }
  if (map.districts.length !== DISTRICT_COUNT) {
    fail(`expected ${DISTRICT_COUNT} districts, found ${map.districts.length}`)
  }
  const duplicate = firstDuplicate(map.divisions) ?? firstDuplicate(map.districts)
  if (duplicate) fail(`the name "${duplicate}" is used twice`)

  const divisionNames = new Set(map.divisions.map((r) => r.name))
  const orphan = map.districts.find((r) => !divisionNames.has(r.div))
  if (orphan) fail(`${orphan.name} belongs to an unknown division "${orphan.div}"`)

  return map
}

function readDivision(value: unknown, index: number): MapDivision {
  const { region, raw } = readRegion(value, index)
  if (!isPositive(raw.n)) fail(`division ${region.name} has no district count`)
  return { ...region, n: raw.n }
}

function readDistrict(value: unknown, index: number): MapDistrict {
  const { region, raw } = readRegion(value, index)
  if (typeof raw.div !== 'string' || raw.div === '') {
    fail(`district ${region.name} has no division`)
  }
  return { ...region, div: raw.div }
}
