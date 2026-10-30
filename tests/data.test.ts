import { describe, expect, it } from 'vitest'
import { loadDamsMap, parseDamsMap } from '../src/data/loadDamsMap'
import { loadIndiaMap, parseIndiaMap } from '../src/data/loadIndiaMap'
import { loadMap, parseMapData } from '../src/data/loadMap'
import { loadMonumentsMap, parseMonumentsMap } from '../src/data/loadMonumentsMap'
import { loadRiversMap, parseRiversMap } from '../src/data/loadRiversMap'
import { outerEdge } from '../src/data/outline'
import { normalise } from '../src/game/matcher'
import type { MapRegion } from '../src/game/types'
import { MONUMENT_PHOTOS } from '../src/photos'
import {
  dams,
  damsRaw,
  india,
  indiaRaw,
  map,
  monuments,
  monumentsRaw,
  raw,
  rivers,
  riversRaw,
} from './fixtures'

// India's 28 states and 8 union territories (since 26 January 2020).
const STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
]
const UNION_TERRITORIES = [
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
]

// The current divisions and districts of Madhya Pradesh (brief, section 5).
const TABLE: Record<string, string[]> = {
  Bhopal: ['Bhopal', 'Raisen', 'Rajgarh', 'Sehore', 'Vidisha'],
  Chambal: ['Bhind', 'Morena', 'Sheopur'],
  Gwalior: ['Ashoknagar', 'Datia', 'Guna', 'Gwalior', 'Shivpuri'],
  Indore: ['Alirajpur', 'Barwani', 'Burhanpur', 'Dhar', 'Indore', 'Jhabua', 'Khandwa', 'Khargone'],
  Jabalpur: [
    'Balaghat',
    'Chhindwara',
    'Dindori',
    'Jabalpur',
    'Katni',
    'Mandla',
    'Narsinghpur',
    'Pandhurna',
    'Seoni',
  ],
  Narmadapuram: ['Betul', 'Harda', 'Narmadapuram'],
  Rewa: ['Maihar', 'Mauganj', 'Rewa', 'Satna', 'Sidhi', 'Singrauli'],
  Sagar: ['Chhatarpur', 'Damoh', 'Niwari', 'Panna', 'Sagar', 'Tikamgarh'],
  Shahdol: ['Anuppur', 'Shahdol', 'Umaria'],
  Ujjain: ['Agar Malwa', 'Dewas', 'Mandsaur', 'Neemuch', 'Ratlam', 'Shajapur', 'Ujjain'],
}

// The rivers of the Rivers of India game: the major ones, then the rest of the All rivers level.
const MAJOR_RIVERS = [
  'Indus',
  'Sutlej',
  'Ganga',
  'Yamuna',
  'Ghaghara',
  'Kosi',
  'Brahmaputra',
  'Chambal',
  'Son',
  'Narmada',
  'Tapi',
  'Mahanadi',
  'Godavari',
  'Krishna',
  'Kaveri',
]
const OTHER_RIVERS = [
  'Jhelum',
  'Chenab',
  'Ravi',
  'Beas',
  'Gandak',
  'Teesta',
  'Betwa',
  'Mahi',
  'Brahmani',
  'Wainganga',
  'Indravati',
  'Bhima',
  'Tungabhadra',
  'Penner',
]

type Point = [number, number]

/** Parses the map's path format: absolute `M x y`, then relative `l dx dy …`, closed by `z`. */
function parseRings(d: string): Point[][] {
  return parsePath(d, true)
}

/** The same format for open lines (rivers): each `M` starts a new line, and nothing is closed. */
function parseLines(d: string): Point[][] {
  return parsePath(d, false)
}

function parsePath(d: string, closed: boolean): Point[][] {
  const tokens = d.match(/[Mlz]|[+-]?(?:\d+(?:\.\d*)?|\.\d+)/g) ?? []
  if (d.replace(/[Mlz]|[+-]?(?:\d+(?:\.\d*)?|\.\d+)|[\s,]/g, '') !== '') {
    throw new Error(`unexpected characters in path: ${d.slice(0, 40)}…`)
  }
  const rings: Point[][] = []
  let ring: Point[] = []
  let command = ''
  let x = 0
  let y = 0
  for (let i = 0; i < tokens.length;) {
    const token = tokens[i]
    if (token === 'M' || token === 'l' || token === 'z') {
      command = token
      i += 1
      if (token === 'z') {
        rings.push(ring)
        ring = []
      }
      continue
    }
    const a = Number(tokens[i])
    const b = Number(tokens[i + 1])
    i += 2
    if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error('odd number of coordinates')
    if (command === 'M') {
      if (!closed && ring.length > 0) rings.push(ring)
      x = a
      y = b
      ring = [[x, y]]
      command = 'l-only' // the format never has implicit line-tos after M
    } else if (command === 'l') {
      x += a
      y += b
      ring.push([x, y])
    } else {
      throw new Error(`coordinates without a command near token ${i}`)
    }
  }
  if (closed && ring.length > 0) throw new Error('path does not end with z')
  if (!closed && d.includes('z')) throw new Error('a line should not be closed')
  if (!closed && ring.length > 0) rings.push(ring)
  return rings
}

/** The distance from p to the segment a–b. */
function segmentDistance([px, py]: Point, [ax, ay]: Point, [bx, by]: Point): number {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** Even-odd ray casting over every ring, so holes and multi-part regions both work. */
function contains(rings: Point[][], [px, py]: Point): boolean {
  let inside = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const [xi, yi] = ring[i]
      const [xj, yj] = ring[j]
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
    }
  }
  return inside
}

describe('public/mp-map.json', () => {
  it('has exactly the 10 divisions and 55 districts in the table', () => {
    expect(map.divisions).toHaveLength(10)
    expect(map.districts).toHaveLength(55)
    expect(map.divisions.map((r) => r.name).sort()).toEqual(Object.keys(TABLE).sort())
    expect(map.districts.map((r) => r.name).sort()).toEqual(Object.values(TABLE).flat().sort())
  })

  it('puts every district in its division', () => {
    for (const district of map.districts) {
      expect(TABLE[district.div], `${district.name} → ${district.div}`).toContain(district.name)
    }
    for (const division of map.divisions) {
      expect(division.n, division.name).toBe(TABLE[division.name].length)
    }
  })

  it('uses the current district names', () => {
    const names = map.districts.map((r) => r.name)
    expect(names).toEqual(expect.arrayContaining(['Maihar', 'Mauganj', 'Pandhurna']))
    expect(names).not.toContain('Hoshangabad')
    expect(names).not.toContain('Narsimhapur')
    expect(map.divisions.map((r) => r.name)).not.toContain('Hoshangabad')
  })

  it('has paths in the expected format', () => {
    for (const region of [...map.divisions, ...map.districts]) {
      const rings = parseRings(region.d)
      expect(rings.length, region.name).toBeGreaterThan(0)
      for (const ring of rings) expect(ring.length, region.name).toBeGreaterThanOrEqual(3)
    }
    expect(parseRings(map.state).length).toBeGreaterThan(0)
  })

  const levels: Array<[string, MapRegion[]]> = [
    ['division', map.divisions],
    ['district', map.districts],
    ['Indian state and UT', india.regions],
  ]
  it.each(levels)('puts every %s label point inside its own region and no other', (_, regions) => {
    const shapes = regions.map((r) => ({ name: r.name, rings: parseRings(r.d) }))
    for (const region of regions) {
      const point: Point = [region.lx, region.ly]
      const hits = shapes.filter((s) => contains(s.rings, point)).map((s) => s.name)
      expect(hits, `label point of ${region.name}`).toEqual([region.name])
    }
  })

  it('stays inside its own viewBox', () => {
    for (const region of [...map.divisions, ...map.districts]) {
      expect(region.lx).toBeGreaterThan(0)
      expect(region.lx).toBeLessThan(map.w)
      expect(region.ly).toBeGreaterThan(0)
      expect(region.ly).toBeLessThan(map.h)
    }
  })
})

describe('public/india-map.json', () => {
  const names = (kind: 'state' | 'ut') =>
    india.regions
      .filter((r) => r.kind === kind)
      .map((r) => r.name)
      .sort()

  it('has exactly the 28 states and 8 union territories of today', () => {
    expect(india.regions).toHaveLength(36)
    expect(names('state')).toEqual(STATES)
    expect(names('ut')).toEqual(UNION_TERRITORIES)
  })

  it('uses current names, keeping old ones only as accepted spellings', () => {
    const shown = india.regions.map((r) => r.name)
    for (const old of ['Orissa', 'Pondicherry', 'Uttaranchal', 'Daman and Diu']) {
      expect(shown).not.toContain(old)
    }
    const spellings = india.regions.flatMap((r) => r.alt)
    expect(spellings).toEqual(expect.arrayContaining(['orissa', 'pondicherry', 'uttaranchal']))
  })

  it('has paths in the expected format', () => {
    for (const region of india.regions) {
      const rings = parseRings(region.d)
      expect(rings.length, region.name).toBeGreaterThan(0)
      for (const ring of rings) expect(ring.length, region.name).toBeGreaterThanOrEqual(3)
      expect(region.lx).toBeGreaterThan(0)
      expect(region.lx).toBeLessThan(india.w)
      expect(region.ly).toBeGreaterThan(0)
      expect(region.ly).toBeLessThan(india.h)
    }
    expect(parseRings(india.outline).length).toBeGreaterThan(0)
  })

  it('gives the regions too small to click a click ring', () => {
    const small = india.regions.filter((r) => r.small).map((r) => r.name)
    expect(small).toEqual(
      expect.arrayContaining([
        'Chandigarh',
        'Dadra and Nagar Haveli and Daman and Diu',
        'Delhi',
        'Lakshadweep',
        'Puducherry',
      ]),
    )
    for (const big of ['Rajasthan', 'Madhya Pradesh', 'Uttar Pradesh', 'Kerala', 'Tripura']) {
      expect(small).not.toContain(big)
    }
  })

  it('has short map labels for the longest names', () => {
    const short = Object.fromEntries(india.regions.map((r) => [r.name, r.short]))
    expect(short['Dadra and Nagar Haveli and Daman and Diu']).toBe('DNH & DD')
    expect(short['Andaman and Nicobar Islands']).toBe('Andaman & Nicobar')
  })

  it('has latitude and longitude lines every 5 degrees', () => {
    expect(india.graticule.map((g) => g.label)).toEqual([
      '10°N',
      '15°N',
      '20°N',
      '25°N',
      '30°N',
      '35°N',
      '70°E',
      '75°E',
      '80°E',
      '85°E',
      '90°E',
      '95°E',
    ])
  })
})

describe('public/rivers-map.json', () => {
  /** How far p is from the nearest point of a river. */
  const distance = (p: Point, river: MapRegion) =>
    Math.min(
      ...parseLines(river.d).flatMap((line) =>
        line.slice(1).map((q, i) => segmentDistance(p, line[i], q)),
      ),
    )

  it('has the 15 major rivers and 14 more, in the same coordinates as the India map', () => {
    const names = (major: boolean) =>
      rivers.rivers.filter((r) => r.major === major).map((r) => r.name)
    expect(names(true)).toEqual(MAJOR_RIVERS)
    expect(names(false).sort()).toEqual([...OTHER_RIVERS].sort())
    expect([rivers.w, rivers.h]).toEqual([india.w, india.h])
  })

  it('draws every river as open lines inside the map', () => {
    for (const river of rivers.rivers) {
      const lines = parseLines(river.d)
      expect(lines.length, river.name).toBeGreaterThan(0)
      for (const [x, y] of lines.flat()) {
        expect(x >= 0 && x <= rivers.w && y >= 0 && y <= rivers.h, river.name).toBe(true)
      }
    }
  })

  it('puts each label point on its own river, well clear of every other', () => {
    for (const river of rivers.rivers) {
      const p: Point = [river.lx, river.ly]
      expect(distance(p, river), river.name).toBeLessThan(0.2)
      for (const other of rivers.rivers) {
        if (other === river) continue
        expect(distance(p, other), `${river.name} is near ${other.name}`).toBeGreaterThan(15)
      }
    }
  })

  it('keeps every label point inside India', () => {
    const outline = parseRings(india.outline)
    for (const river of rivers.rivers) {
      expect(contains(outline, [river.lx, river.ly]), river.name).toBe(true)
    }
  })
})

describe('public/monuments-map.json', () => {
  it('has 21 monuments, each with its photo, whose file is named by its number', () => {
    expect(monuments.monuments).toHaveLength(21)
    monuments.monuments.forEach((m, i) => {
      expect(MONUMENT_PHOTOS[m.name]?.id, m.name).toBe(`arch-${String(i + 1).padStart(2, '0')}`)
    })
  })

  it('puts every monument inside its own state, on the India map', () => {
    expect([monuments.w, monuments.h]).toEqual([india.w, india.h])
    for (const m of monuments.monuments) {
      const state = india.regions.find((r) => r.name === m.state)
      expect(state, `${m.name}: ${m.state}`).toBeDefined()
      if (state) expect(contains(parseRings(state.d), [m.lx, m.ly]), m.name).toBe(true)
    }
  })
})

describe('public/dams-map.json', () => {
  it('has 24 dams, 12 of them major', () => {
    expect(dams.dams).toHaveLength(24)
    expect(dams.dams.filter((d) => d.major)).toHaveLength(12)
  })

  it('puts every dam inside its own state, on the India map', () => {
    expect([dams.w, dams.h]).toEqual([india.w, india.h])
    for (const d of dams.dams) {
      const state = india.regions.find((r) => r.name === d.state)
      expect(state, `${d.name}: ${d.state}`).toBeDefined()
      if (state) expect(contains(parseRings(state.d), [d.lx, d.ly]), d.name).toBe(true)
    }
  })

  // On a laptop the map shows about 0.4 px per unit: closer dams would be hard to tell apart.
  it('keeps every two dams far enough apart to tell (and click) one from the other', () => {
    for (const [i, a] of dams.dams.entries()) {
      for (const b of dams.dams.slice(i + 1)) {
        expect(Math.hypot(a.lx - b.lx, a.ly - b.ly), `${a.name} / ${b.name}`).toBeGreaterThan(20)
      }
    }
  })
})

describe('loadDamsMap checks', () => {
  type Editable = { dams: Array<Record<string, unknown>> } & Record<string, unknown>
  const clone = (): Editable => structuredClone(damsRaw) as Editable

  it('accepts the real file', async () => {
    const fetchFn = async () => new Response(JSON.stringify(damsRaw))
    await expect(loadDamsMap(fetchFn)).resolves.toEqual(dams)
  })

  it('rejects the wrong number, repeats and malformed dams', () => {
    const short = clone()
    short.dams.pop()
    expect(() => parseDamsMap(short)).toThrow(/expected 24 dams/)
    const twice = clone()
    twice.dams[1] = twice.dams[0]
    expect(() => parseDamsMap(twice)).toThrow(/listed twice/)
    const noRiver = clone()
    noRiver.dams[0].river = ''
    expect(() => parseDamsMap(noRiver)).toThrow(/no river/)
    const nowhere = clone()
    delete nowhere.dams[0].ly
    expect(() => parseDamsMap(nowhere)).toThrow(/no place on the map/)
    const minor = clone()
    minor.dams[0].major = false
    expect(() => parseDamsMap(minor)).toThrow(/expected 12 major dams/)
  })
})

describe('loadMonumentsMap checks', () => {
  type Editable = { monuments: Array<Record<string, unknown>> } & Record<string, unknown>
  const clone = (): Editable => structuredClone(monumentsRaw) as Editable

  it('accepts the real file', async () => {
    const fetchFn = async () => new Response(JSON.stringify(monumentsRaw))
    await expect(loadMonumentsMap(fetchFn)).resolves.toEqual(monuments)
  })

  it('rejects the wrong number, repeats and malformed monuments', () => {
    const short = clone()
    short.monuments.pop()
    expect(() => parseMonumentsMap(short)).toThrow(/expected 21 monuments/)
    const twice = clone()
    twice.monuments[1] = twice.monuments[0]
    expect(() => parseMonumentsMap(twice)).toThrow(/listed twice/)
    const nowhere = clone()
    delete nowhere.monuments[0].lx
    expect(() => parseMonumentsMap(nowhere)).toThrow(/no place on the map/)
    const noCity = clone()
    noCity.monuments[0].city = ''
    expect(() => parseMonumentsMap(noCity)).toThrow(/no city/)
    expect(() => parseMonumentsMap({ ...clone(), monuments: 'x' })).toThrow(/monument list/)
  })
})

describe('accepted spellings', () => {
  const sets: Array<[string, MapRegion[]]> = [
    ['division', map.divisions],
    ['district', map.districts],
    ['Indian state or UT', india.regions],
    ['river', rivers.rivers],
    ['dam', dams.dams.map((d) => ({ name: d.name, alt: d.alt, d: '', lx: d.lx, ly: d.ly }))],
  ]
  // Answers are taken the moment they match, so if one region's spelling began another's,
  // the second could never be typed.
  it.each(sets)("never lets one %s's spelling start another's", (_, regions) => {
    const spellings = regions.map((r) => ({
      name: r.name,
      keys: [r.name, ...r.alt].map(normalise),
    }))
    for (const a of spellings) {
      for (const b of spellings) {
        if (a.name === b.name) continue
        for (const ka of a.keys) {
          for (const kb of b.keys) {
            expect(kb.startsWith(ka), `${a.name} ("${ka}") starts ${b.name} ("${kb}")`).toBe(false)
          }
        }
      }
    }
  })
})

describe('loadRiversMap checks', () => {
  type Editable = { rivers: Array<Record<string, unknown>> } & Record<string, unknown>
  const clone = (): Editable => structuredClone(riversRaw) as Editable

  it('accepts the real file', async () => {
    const fetchFn = async () => new Response(JSON.stringify(riversRaw))
    await expect(loadRiversMap(fetchFn)).resolves.toEqual(rivers)
  })

  it('rejects the wrong number of rivers', () => {
    const one = clone()
    one.rivers.pop()
    expect(() => parseRiversMap(one)).toThrow(/expected 29 rivers, 15 of them major/)
    const two = clone()
    two.rivers[0].major = !two.rivers[0].major
    expect(() => parseRiversMap(two)).toThrow(/expected 29 rivers, 15 of them major/)
  })

  it('rejects duplicate names, a missing major flag and malformed files', () => {
    const dup = clone()
    dup.rivers[1].name = dup.rivers[0].name
    expect(() => parseRiversMap(dup)).toThrow(/is used twice/)
    const flag = clone()
    delete flag.rivers[0].major
    expect(() => parseRiversMap(flag)).toThrow(/not marked as major/)
    expect(() => parseRiversMap([])).toThrow(/not a JSON object/)
    expect(() => parseRiversMap({ ...clone(), rivers: 'x' })).toThrow(/river list/)
    expect(() => parseRiversMap({ ...clone(), credit: '' })).toThrow(/credit/)
  })
})

describe('loadIndiaMap checks', () => {
  type Editable = Record<string, unknown> & { regions: unknown[]; graticule: unknown[] }
  const clone = (): Editable => ({ ...structuredClone(india) })

  it('accepts the real file', async () => {
    const fakeFetch = async (url: string | URL | Request) => {
      expect(String(url)).toMatch(/india-map\.json$/)
      return new Response(JSON.stringify(indiaRaw))
    }
    await expect(loadIndiaMap(fakeFetch)).resolves.toEqual(india)
  })

  it('rejects the wrong number of states or union territories', () => {
    const data = clone()
    data.regions = data.regions.slice(1)
    expect(() => parseIndiaMap(data)).toThrow(/expected 28 states and 8 union territories/)
  })

  it('rejects duplicate names and unknown kinds', () => {
    const data = clone()
    data.regions[1] = { ...india.regions[1], name: india.regions[0].name }
    expect(() => parseIndiaMap(data)).toThrow(/used twice/)
    const data2 = clone()
    data2.regions[0] = { ...india.regions[0], kind: 'county' }
    expect(() => parseIndiaMap(data2)).toThrow(/neither a state nor a UT/)
  })

  it('rejects malformed files, regions and grid lines', () => {
    expect(() => parseIndiaMap('India')).toThrow(/not a JSON object/)
    expect(() => parseIndiaMap({ ...clone(), h: -1 })).toThrow(/map size/)
    expect(() => parseIndiaMap({ ...clone(), outline: '' })).toThrow(/country outline/)
    expect(() => parseIndiaMap({ ...clone(), credit: 3 })).toThrow(/credit/)
    expect(() => parseIndiaMap({ ...clone(), regions: {} })).toThrow(/region list/)
    expect(() => parseIndiaMap({ ...clone(), graticule: null })).toThrow(/longitude lines/)

    const data = clone()
    data.graticule[0] = 'grid'
    expect(() => parseIndiaMap(data)).toThrow(/is not an object/)
    const data2 = clone()
    data2.graticule[0] = { label: '10°N', d: 'M0 0', x: 'left', y: 0 }
    expect(() => parseIndiaMap(data2)).toThrow(/incomplete/)
    const data3 = clone()
    data3.regions[0] = { ...india.regions[0], short: 5 }
    expect(() => parseIndiaMap(data3)).toThrow(/bad short label/)
    const data4 = clone()
    data4.regions[0] = { ...india.regions[0], small: 'yes' }
    expect(() => parseIndiaMap(data4)).toThrow(/bad small flag/)
  })
})

describe('outerEdge (start screen outline)', () => {
  it('keeps the state outline but drops its tiny holes', () => {
    const rings = parseRings(map.state)
    const edge = parseRings(outerEdge(map.state))
    expect(rings.length).toBeGreaterThan(1)
    expect(edge).toEqual([rings[0]])
  })

  it('drops a hole but keeps every separate part', () => {
    const square = 'M0 0l10 0 0 10-10 0z'
    const hole = 'M2 2l0 2 2 0 0-2z'
    const island = 'M20 0l5 0 0 5-5 0z'
    expect(outerEdge(square + hole)).toBe(square)
    expect(outerEdge(hole + square + island)).toBe(square + island)
    expect(outerEdge('')).toBe('')
  })
})

describe('loadMap checks', () => {
  type Editable = Record<string, unknown> & { divisions: unknown[]; districts: unknown[] }
  const clone = (): Editable => ({ ...structuredClone(map) })

  it('accepts the real file', async () => {
    const urls: string[] = []
    const fakeFetch = async (url: string | URL | Request) => {
      urls.push(String(url))
      return new Response(JSON.stringify(raw))
    }
    await expect(loadMap(fakeFetch)).resolves.toEqual(map)
    expect(urls).toHaveLength(1)
    expect(urls[0]).toMatch(/mp-map\.json$/)
  })

  it('reports a failed download', async () => {
    const fakeFetch = async () => new Response('missing', { status: 404 })
    await expect(loadMap(fakeFetch)).rejects.toThrow(/HTTP 404/)
  })

  it('reports a file that is not JSON', async () => {
    const fakeFetch = async () => new Response('<html>')
    await expect(loadMap(fakeFetch)).rejects.toThrow(/not valid JSON/)
  })

  it('rejects the wrong number of regions', () => {
    const data = clone()
    data.districts = data.districts.slice(1)
    expect(() => parseMapData(data)).toThrow(/expected 55 districts, found 54/)
    const data2 = clone()
    data2.divisions = data2.divisions.slice(1)
    expect(() => parseMapData(data2)).toThrow(/expected 10 divisions, found 9/)
  })

  it('rejects duplicate names', () => {
    const data = clone()
    data.districts[1] = { ...map.districts[1], name: map.districts[0].name }
    expect(() => parseMapData(data)).toThrow(/used twice/)
  })

  it('rejects a district in an unknown division', () => {
    const data = clone()
    data.districts[0] = { ...map.districts[0], div: 'Atlantis' }
    expect(() => parseMapData(data)).toThrow(/unknown division "Atlantis"/)
  })

  it('rejects malformed regions and files', () => {
    expect(() => parseMapData(null)).toThrow(/not a JSON object/)
    expect(() => parseMapData([])).toThrow(/not a JSON object/)
    expect(() => parseMapData({ ...clone(), w: 0 })).toThrow(/map size/)
    expect(() => parseMapData({ ...clone(), state: 7 })).toThrow(/state outline/)
    expect(() => parseMapData({ ...clone(), credit: '' })).toThrow(/credit/)
    expect(() => parseMapData({ ...clone(), districts: 'none' })).toThrow(/region lists/)

    const broken: Array<[Record<string, unknown>, RegExp]> = [
      [{ ...map.districts[0], name: '' }, /has no name/],
      [{ ...map.districts[0], d: 'x' }, /has no outline/],
      [{ ...map.districts[0], lx: 'left' }, /has no label point/],
      [{ ...map.districts[0], alt: [1] }, /other spellings/],
      [{ ...map.districts[0], div: undefined }, /has no division/],
    ]
    for (const [region, message] of broken) {
      const data = clone()
      data.districts[0] = region
      expect(() => parseMapData(data)).toThrow(message)
    }
    const data = clone()
    data.divisions[0] = { ...map.divisions[0], n: -1 }
    expect(() => parseMapData(data)).toThrow(/district count/)
    const data2 = clone()
    data2.divisions[0] = 'Bhopal'
    expect(() => parseMapData(data2)).toThrow(/region #1 is not an object/)
  })
})
