import type { Monument, MonumentsMapData } from '../game/types'
import {
  fail,
  fetchMapFile,
  isList,
  isNumber,
  isObject,
  isPositive,
  isStringList,
} from './validate'

export const MONUMENT_COUNT = 21

/** Fetches public/monuments-map.json and checks it before the game uses it. */
export async function loadMonumentsMap(fetchFn: typeof fetch = fetch): Promise<MonumentsMapData> {
  return parseMonumentsMap(await fetchMapFile('monuments-map.json', fetchFn))
}

/** Checks the monuments file; throws a readable error if anything is wrong. */
export function parseMonumentsMap(json: unknown): MonumentsMapData {
  if (!isObject(json)) fail('it is not a JSON object')
  const { w, h, monuments, credit } = json
  if (!isPositive(w) || !isPositive(h)) fail('the map size is missing')
  if (typeof credit !== 'string' || credit === '') fail('the data credit is missing')
  if (!isList(monuments)) fail('the monument list is missing')

  const map: MonumentsMapData = { w, h, credit, monuments: monuments.map(readMonument) }
  if (map.monuments.length !== MONUMENT_COUNT) {
    fail(`expected ${MONUMENT_COUNT} monuments, found ${map.monuments.length}`)
  }
  const names = new Set(map.monuments.map((m) => m.name))
  if (names.size !== map.monuments.length) fail('a monument is listed twice')
  return map
}

function readMonument(value: unknown, index: number): Monument {
  if (!isObject(value)) fail(`monument #${index + 1} is not an object`)
  const { name, alt, city, cityAlt, state, lx, ly } = value
  if (typeof name !== 'string' || name === '') fail(`monument #${index + 1} has no name`)
  if (!isStringList(alt) || !isStringList(cityAlt)) fail(`${name} has no lists of other names`)
  if (typeof city !== 'string' || city === '') fail(`${name} has no city`)
  if (typeof state !== 'string' || state === '') fail(`${name} has no state`)
  if (!isNumber(lx) || !isNumber(ly)) fail(`${name} has no place on the map`)
  return { name, alt, city, cityAlt, state, lx, ly }
}
