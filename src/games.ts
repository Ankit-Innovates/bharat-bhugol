import { CAPITALS } from './data/capitals'
import { quizRegions } from './data/indiaQuiz'
import { loadDamsMap } from './data/loadDamsMap'
import { loadIndiaMap } from './data/loadIndiaMap'
import { loadMap } from './data/loadMap'
import { loadMonumentsMap } from './data/loadMonumentsMap'
import { loadRiversMap } from './data/loadRiversMap'
import { outerEdge } from './data/outline'
import { normalise } from './game/matcher'
import type {
  DamsMapData,
  GridLine,
  IndiaMapData,
  MapData,
  MapRegion,
  Mode,
  MonumentsMapData,
  RiversMapData,
} from './game/types'

export type GameId = 'india' | 'capitals' | 'mp' | 'rivers' | 'dams' | 'architecture' | 'quiz'

export const MODE_NAME: Record<Mode, string> = {
  click: 'Click on map',
  type: 'Type names',
  name: 'Name it',
}

/** What a round is called on its screen: the level, and the mode when the game has a choice. */
export function roundName(game: Game, level: Level, mode: Mode): string {
  return game.modes.length > 1 ? `${level.label} · ${MODE_NAME[mode]}` : level.label
}

/** One quiz inside a game, e.g. the districts of Madhya Pradesh. */
export interface Level {
  id: string // in the address: 'states', 'divisions', 'districts'
  label: string // 'States & UTs'
  one: string // what one region is called: 'state or UT'
  many: string // and several: 'states and UTs'
  seconds: number // time limit
  /**
   * The label over the answer box, by mode, when it isn't "Name this <one>:" (name) or
   * "Enter <one>:" (type). {name} stands for the place asked, {hint} for its hint.
   */
  prompt?: Partial<Record<Mode, string>>
}

/**
 * What a board's regions are: areas (states, districts), lines (rivers), points (monuments, each
 * one asked with its photo), or a list of clues with no map (the India Quiz).
 */
export type BoardKind = 'areas' | 'lines' | 'points' | 'list'

/** Everything the game screen draws for one level. */
export interface Board {
  area: string // 'India', for the map's accessible name
  w: number
  h: number
  outline: string // the whole area, drawn under the regions
  regions: MapRegion[]
  overlay: MapRegion[] // outlines drawn thicker on top, e.g. MP's divisions at district level
  dense: boolean // many regions: smaller labels and markers
  kind: BoardKind
  backdrop: MapRegion[] // drawn faintly under everything for bearings, e.g. the states under rivers
  waters?: MapRegion[] // rivers drawn faintly for bearings, e.g. behind the dams
  photos?: boolean // points asked with their photo rather than on the map (monuments)
  spread?: boolean // long names on an areas map (capitals): spread out with lines, as on points maps
}

/** A game's map once loaded. */
export interface Atlas {
  w: number
  h: number
  silhouette: string // outer edge only, for the setup screen
  borders: MapRegion[] // the regions shown in thumbnails (states / divisions)
  lines: MapRegion[] // lines drawn over them in thumbnails (rivers)
  points: MapRegion[] // and points (monuments)
  boards: Record<string, Board> // by level id
  graticule: GridLine[] // latitude and longitude lines, when the map has them
}

/** A game's map while it loads. */
export type AtlasState =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; atlas: Atlas }

export interface Game {
  id: GameId
  name: string // 'States and UTs of India'
  intro: string // the line under the title on the setup screen
  levels: Level[]
  modes: readonly Mode[] // the first is the one offered first
  isNew?: boolean // one of the newest games, with a "New" badge on its card
  featured?: boolean // on the home page; every game is on the Games page
  load: () => Promise<Atlas>
}

export const GAMES: readonly Game[] = [
  {
    id: 'india',
    name: 'States and UTs of India',
    intro: 'Find the 28 states and 8 union territories of India on a blank map.',
    levels: [
      {
        id: 'states',
        label: 'States & UTs',
        one: 'state or UT',
        many: 'states and UTs',
        seconds: 240,
      },
    ],
    modes: ['click', 'type'],
    featured: true,
    load: async () => indiaAtlas(await loadIndiaMap()),
  },
  {
    id: 'capitals',
    name: 'State capitals',
    intro:
      'Name the capital of each state and union territory as it lights up, or type them all in any order.',
    levels: [
      {
        id: 'states',
        label: 'States',
        one: 'capital',
        many: 'capitals',
        seconds: 180,
        prompt: { name: 'Capital of {name}:' },
      },
      {
        id: 'all',
        label: 'States & UTs',
        one: 'capital',
        many: 'capitals',
        seconds: 240,
        prompt: { name: 'Capital of {name}:' },
      },
    ],
    modes: ['name', 'type'],
    isNew: true,
    featured: true,
    load: async () => capitalsAtlas(await loadIndiaMap()),
  },
  {
    id: 'mp',
    name: 'Districts/Divisions of MP',
    intro: 'Find the divisions and districts of Madhya Pradesh on a blank map.',
    levels: [
      { id: 'divisions', label: 'Divisions', one: 'division', many: 'divisions', seconds: 300 },
      { id: 'districts', label: 'Districts', one: 'district', many: 'districts', seconds: 300 },
    ],
    modes: ['click', 'type'],
    load: async () => mpAtlas(await loadMap()),
  },
  {
    id: 'rivers',
    name: 'Rivers of India',
    intro: 'Name each river as it lights up on the map, or find it by clicking.',
    levels: [
      { id: 'major', label: 'Major rivers', one: 'river', many: 'rivers', seconds: 120 },
      { id: 'all', label: 'All rivers', one: 'river', many: 'rivers', seconds: 240 },
    ],
    modes: ['name', 'click', 'type'],
    featured: true,
    load: async () => {
      const [rivers, india] = await Promise.all([loadRiversMap(), loadIndiaMap()])
      return riversAtlas(rivers, india)
    },
  },
  {
    id: 'dams',
    name: 'Dams of India',
    intro:
      'Name each dam as it lights up, with its river as the clue, find it on the map, or type them all.',
    levels: [
      {
        id: 'major',
        label: 'Major dams',
        one: 'dam',
        many: 'dams',
        seconds: 120,
        prompt: { name: 'Name this dam, {hint}:' },
      },
      {
        id: 'all',
        label: 'All dams',
        one: 'dam',
        many: 'dams',
        seconds: 240,
        prompt: { name: 'Name this dam, {hint}:' },
      },
    ],
    modes: ['name', 'click', 'type'],
    isNew: true,
    load: async () => {
      const [dams, india, rivers] = await Promise.all([
        loadDamsMap(),
        loadIndiaMap(),
        loadRiversMap(),
      ])
      return damsAtlas(dams, india, rivers)
    },
  },
  {
    id: 'architecture',
    name: 'Famous architecture',
    intro: 'Name each monument from its photo, or say where in India it is.',
    levels: [
      {
        id: 'monuments',
        label: 'Name the monument',
        one: 'monument',
        many: 'monuments',
        seconds: 180,
      },
      {
        id: 'places',
        label: 'Name the place',
        one: 'monument',
        many: 'monuments',
        seconds: 180,
        prompt: { name: 'Where is it? City or state:' },
      },
    ],
    modes: ['name'],
    featured: true,
    load: async () => {
      const [monuments, india] = await Promise.all([loadMonumentsMap(), loadIndiaMap()])
      return architectureAtlas(monuments, india)
    },
  },
  {
    id: 'quiz',
    name: 'The India Quiz',
    intro:
      'Fifty-one facts about India, from its flag to its highest peak. Type the answers in any order.',
    levels: [
      {
        id: 'all',
        label: 'Facts about India',
        one: 'answer',
        many: 'answers',
        seconds: 360,
        prompt: { type: 'Type an answer:' },
      },
    ],
    modes: ['type'],
    featured: true,
    load: () => Promise.resolve(quizAtlas()),
  },
]

/** A game still to come: a placeholder card on the Games page, with no page of its own yet. */
export interface UpcomingGame {
  id: string
  name: string
  icon: 'park' | 'peak' | 'lake' // the drawing on its card
}

export const UPCOMING: readonly UpcomingGame[] = [
  {
    id: 'parks',
    name: 'National parks',
    icon: 'park',
  },
  {
    id: 'peaks',
    name: 'Mountain peaks',
    icon: 'peak',
  },
  {
    id: 'lakes',
    name: 'Lakes of India',
    icon: 'lake',
  },
]

export function findGame(id: string): Game | undefined {
  return GAMES.find((game) => game.id === id)
}

/** A game's time limit: '10 min', or '5–15 min' when its levels differ. */
export function timeLimit(game: Game): string {
  const minutes = [...new Set(game.levels.map((l) => l.seconds / 60))]
  return minutes.length > 1 ? `${minutes[0]}–${minutes.at(-1)} min` : `${minutes[0]} min`
}

function indiaAtlas(map: IndiaMapData): Atlas {
  const board: Board = {
    area: 'India',
    w: map.w,
    h: map.h,
    outline: map.outline,
    regions: map.regions,
    overlay: [],
    dense: true,
    kind: 'areas',
    backdrop: [],
  }
  return {
    w: map.w,
    h: map.h,
    silhouette: outerEdge(map.outline),
    borders: map.regions,
    lines: [],
    points: [],
    boards: { states: board },
    graticule: map.graticule,
  }
}

function mpAtlas(map: MapData): Atlas {
  const base = {
    area: 'Madhya Pradesh',
    w: map.w,
    h: map.h,
    outline: map.state,
    kind: 'areas' as const,
    backdrop: [],
  }
  return {
    w: map.w,
    h: map.h,
    silhouette: outerEdge(map.state),
    borders: map.divisions,
    lines: [],
    points: [],
    boards: {
      divisions: { ...base, regions: map.divisions, overlay: [], dense: false },
      districts: {
        ...base,
        regions: map.districts,
        overlay: map.divisions,
        dense: true,
      },
    },
    graticule: [],
  }
}

/**
 * The state capitals, asked on India's map: each state is answered by its capital (in any of its
 * spellings), which then shows on it. At the States level the union territories are plain land.
 */
function capitalsAtlas(india: IndiaMapData): Atlas {
  const regions = india.regions.map((region) => {
    const { capital, alt = [] } = CAPITALS[region.name] ?? { capital: region.name }
    return { ...region, alt: [], short: capital, answers: [capital, ...alt] }
  })
  const base = {
    area: 'India',
    w: india.w,
    h: india.h,
    outline: india.outline,
    overlay: [],
    dense: true,
    kind: 'areas' as const,
    spread: true,
  }
  return {
    w: india.w,
    h: india.h,
    silhouette: outerEdge(india.outline),
    borders: regions,
    lines: [],
    points: [],
    boards: {
      states: {
        ...base,
        regions: regions.filter((region) => region.kind === 'state'),
        backdrop: india.regions,
      },
      all: { ...base, regions, backdrop: [] },
    },
    graticule: [],
  }
}

/**
 * The dams, as points on India's map, with its rivers drawn faintly behind them. Each one's clue
 * is its river, or its state when the dam is named after its river (the Koyna Dam).
 */
function damsAtlas(map: DamsMapData, india: IndiaMapData, rivers: RiversMapData): Atlas {
  const points: MapRegion[] = map.dams.map((dam) => ({
    name: dam.name,
    d: '',
    lx: dam.lx,
    ly: dam.ly,
    alt: dam.alt,
    hint: normalise(dam.name).startsWith(normalise(dam.river))
      ? `in ${dam.state}`
      : `on the ${dam.river}`,
    ...(dam.short ? { short: dam.short } : {}),
  }))
  const major = new Set(map.dams.filter((dam) => dam.major).map((dam) => dam.name))
  const base = {
    area: 'India',
    w: india.w,
    h: india.h,
    outline: india.outline,
    overlay: [],
    dense: true,
    kind: 'points' as const,
    backdrop: india.regions,
    waters: rivers.rivers,
  }
  return {
    w: india.w,
    h: india.h,
    silhouette: outerEdge(india.outline),
    borders: india.regions,
    lines: rivers.rivers,
    points,
    boards: {
      major: { ...base, regions: points.filter((point) => major.has(point.name)) },
      all: { ...base, regions: points },
    },
    graticule: [],
  }
}

/** The India Quiz: no map, just its list of clues. */
function quizAtlas(): Atlas {
  const board: Board = {
    area: 'India',
    w: 1,
    h: 1,
    outline: '',
    regions: quizRegions(),
    overlay: [],
    dense: false,
    kind: 'list',
    backdrop: [],
  }
  return {
    w: 1,
    h: 1,
    silhouette: '',
    borders: [],
    lines: [],
    points: [],
    boards: { all: board },
    graticule: [],
  }
}

/** The rivers, drawn over India's outline with its states faintly behind them for bearings. */
function riversAtlas(map: RiversMapData, india: IndiaMapData): Atlas {
  const base = {
    area: 'India',
    w: india.w,
    h: india.h,
    outline: india.outline,
    overlay: [],
    dense: true,
    kind: 'lines' as const,
    backdrop: india.regions,
  }
  return {
    w: india.w,
    h: india.h,
    silhouette: outerEdge(india.outline),
    borders: india.regions,
    lines: map.rivers,
    points: [],
    boards: {
      major: { ...base, regions: map.rivers.filter((river) => river.major) },
      all: { ...base, regions: map.rivers },
    },
    graticule: [],
  }
}

/**
 * The monuments, as points on India's map. Asked for its name, a monument takes its name and
 * other names; asked for its place, its city or its state (in any of their spellings).
 */
function architectureAtlas(map: MonumentsMapData, india: IndiaMapData): Atlas {
  const stateSpellings = new Map(india.regions.map((r) => [r.name, [r.name, ...r.alt]]))
  const points: MapRegion[] = map.monuments.map((m) => ({
    name: m.name,
    d: '',
    lx: m.lx,
    ly: m.ly,
    alt: m.alt,
  }))
  const places: MapRegion[] = map.monuments.map((m, i) => ({
    ...points[i],
    answers: [m.city, ...m.cityAlt, ...(stateSpellings.get(m.state) ?? [m.state])],
  }))
  const base = {
    area: 'India',
    w: india.w,
    h: india.h,
    outline: india.outline,
    overlay: [],
    dense: true,
    kind: 'points' as const,
    backdrop: india.regions,
    photos: true,
  }
  return {
    w: india.w,
    h: india.h,
    silhouette: outerEdge(india.outline),
    borders: india.regions,
    lines: [],
    points,
    boards: {
      monuments: { ...base, regions: points },
      places: { ...base, regions: places },
    },
    graticule: [],
  }
}
