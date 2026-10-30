import type { Dam, DamsMapData } from '../game/types'
import {
  fail,
  fetchMapFile,
  isList,
  isNumber,
  isObject,
  isPositive,
  isStringList,
} from './validate'

export const DAM_COUNT = 24
export const MAJOR_DAM_COUNT = 12

/** Fetches public/dams-map.json and checks it before the game uses it. */
export async function loadDamsMap(fetchFn: typeof fetch = fetch): Promise<DamsMapData> {
  return parseDamsMap(await fetchMapFile('dams-map.json', fetchFn))
}

/** Checks the dams file; throws a readable error if anything is wrong. */
export function parseDamsMap(json: unknown): DamsMapData {
  if (!isObject(json)) fail('it is not a JSON object')
  const { w, h, dams, credit } = json
  if (!isPositive(w) || !isPositive(h)) fail('the map size is missing')
  if (typeof credit !== 'string' || credit === '') fail('the data credit is missing')
  if (!isList(dams)) fail('the dam list is missing')

  const map: DamsMapData = { w, h, credit, dams: dams.map(readDam) }
  if (map.dams.length !== DAM_COUNT) fail(`expected ${DAM_COUNT} dams, found ${map.dams.length}`)
  const major = map.dams.filter((d) => d.major).length
  if (major !== MAJOR_DAM_COUNT) fail(`expected ${MAJOR_DAM_COUNT} major dams, found ${major}`)
  if (new Set(map.dams.map((d) => d.name)).size !== map.dams.length) {
    fail('a dam is listed twice')
  }
  return map
}

function readDam(value: unknown, index: number): Dam {
  if (!isObject(value)) fail(`dam #${index + 1} is not an object`)
  const { name, alt, short, river, state, major, lx, ly } = value
  if (typeof name !== 'string' || name === '') fail(`dam #${index + 1} has no name`)
  if (!isStringList(alt)) fail(`${name} has no list of other names`)
  if (short !== undefined && (typeof short !== 'string' || short === '')) {
    fail(`${name} has an empty short name`)
  }
  if (typeof river !== 'string' || river === '') fail(`${name} has no river`)
  if (typeof state !== 'string' || state === '') fail(`${name} has no state`)
  if (typeof major !== 'boolean') fail(`${name} is not marked major or not`)
  if (!isNumber(lx) || !isNumber(ly)) fail(`${name} has no place on the map`)
  const dam: Dam = { name, alt, river, state, major, lx, ly }
  if (short !== undefined) dam.short = short
  return dam
}
