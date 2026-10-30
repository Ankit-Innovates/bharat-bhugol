import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CAPITALS } from '../src/data/capitals'
import { currentName, reduce, startState } from '../src/game/engine'
import { spellings } from '../src/game/matcher'
import type { GameState, Mode, Quiz } from '../src/game/types'
import { findGame, type Atlas } from '../src/games'
import { fakeFetch, india } from './fixtures'

beforeEach(() => {
  vi.stubGlobal('fetch', fakeFetch)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function atlasOf(id: string): Promise<Atlas> {
  const game = findGame(id)
  if (!game) throw new Error(`no game ${id}`)
  return game.load()
}

/** A round of one board, playing, asking places in `order` (the board's own order if none). */
function round(atlas: Atlas, board: string, mode: Mode, order?: string[]): GameState {
  const quiz: Quiz = { regions: atlas.boards[board].regions, seconds: 300, one: 'x', many: 'xs' }
  return reduce(startState(quiz, mode, order ?? quiz.regions.map((r) => r.name)), {
    type: 'play',
  })
}

/** Types `text` one character at a time, as a player would. */
const typeOut = (state: GameState, text: string): GameState =>
  [...text].reduce((s, _, i) => reduce(s, { type: 'type', text: s.typed + text[i] }), state)

describe('State capitals', () => {
  it('has a capital for every state and union territory, and no other', () => {
    expect(Object.keys(CAPITALS).sort()).toEqual(india.regions.map((r) => r.name).sort())
    for (const { capital } of Object.values(CAPITALS)) expect(capital.trim()).not.toBe('')
  })

  it('asks the 28 states, or all 36 with the union territories, each showing its capital', async () => {
    const atlas = await atlasOf('capitals')
    expect(atlas.boards.states.regions).toHaveLength(28)
    expect(atlas.boards.all.regions).toHaveLength(36)
    const rajasthan = atlas.boards.all.regions.find((r) => r.name === 'Rajasthan')
    expect(rajasthan?.short).toBe('Jaipur')
  })

  it('takes only the capital of the state lit up, in any of its spellings', async () => {
    const atlas = await atlasOf('capitals')
    const asking = (first: string) => {
      const names = atlas.boards.all.regions.map((r) => r.name)
      return round(atlas, 'all', 'name', [first, ...names.filter((n) => n !== first)])
    }
    expect(currentName(asking('Rajasthan'))).toBe('Rajasthan')
    expect(typeOut(asking('Rajasthan'), 'Rajasthan').found).toEqual([])
    expect(typeOut(asking('Rajasthan'), 'Bhopal').found).toEqual([])
    expect(typeOut(asking('Rajasthan'), 'Jaipur').found).toEqual(['Rajasthan'])
    expect(typeOut(asking('Karnataka'), 'Bangalore').found).toEqual(['Karnataka'])
    expect(typeOut(asking('Andaman and Nicobar Islands'), 'Port Blair').found).toEqual([
      'Andaman and Nicobar Islands',
    ])
  })

  it('takes every capital, in every spelling, when typing them in any order', async () => {
    const atlas = await atlasOf('capitals')
    for (const region of atlas.boards.all.regions) {
      for (const spelling of spellings(region)) {
        const s = typeOut(round(atlas, 'all', 'type', [region.name]), spelling)
        expect(s.found, `${spelling} → ${region.name}`).toEqual([region.name])
      }
    }
  })

  it('takes Chandigarh once for each of its three places', async () => {
    const atlas = await atlasOf('capitals')
    let s = round(atlas, 'all', 'type')
    for (let i = 0; i < 3; i += 1) s = typeOut(s, 'Chandigarh')
    expect([...s.found].sort()).toEqual(['Chandigarh', 'Haryana', 'Punjab'])
  })
})

describe('Dams of India', () => {
  it('asks 12 major dams, or all 24', async () => {
    const atlas = await atlasOf('dams')
    expect(atlas.boards.major.regions).toHaveLength(12)
    expect(atlas.boards.all.regions).toHaveLength(24)
  })

  it('gives each dam its river as the clue, or its state when it is named after its river', async () => {
    const atlas = await atlasOf('dams')
    const hint = (name: string) => atlas.boards.all.regions.find((r) => r.name === name)?.hint
    expect(hint('Bhakra Nangal Dam')).toBe('on the Sutlej')
    expect(hint('Hirakud Dam')).toBe('on the Mahanadi')
    expect(hint('Koyna Dam')).toBe('in Maharashtra')
    expect(hint('Tungabhadra Dam')).toBe('in Karnataka')
  })

  it('takes a dam by its name or other names, with or without "Dam"', async () => {
    const atlas = await atlasOf('dams')
    for (const text of ['Bhakra Nangal Dam', 'Bhakra', 'KRS', 'Krishna Raja Sagara']) {
      const s = round(atlas, 'all', 'type')
      expect(typeOut(s, text).found.length, text).toBe(1)
    }
  })
})
