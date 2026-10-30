import { describe, expect, it } from 'vitest'
import { INDIA_QUIZ, QUIZ_ANSWER_COUNT, quizRegions } from '../src/data/indiaQuiz'
import { reduce, startState } from '../src/game/engine'
import { normalise, spellings } from '../src/game/matcher'
import type { GameState, Quiz } from '../src/game/types'

const quiz: Quiz = { regions: quizRegions(), seconds: 360, one: 'answer', many: 'answers' }

/** A fresh round of the quiz, every answer still to give. */
const fresh = (): GameState =>
  reduce(
    startState(
      quiz,
      'type',
      quiz.regions.map((r) => r.name),
    ),
    { type: 'play' },
  )

/** Types `text` one character at a time, as a player would. */
const typeOut = (state: GameState, text: string): GameState =>
  [...text].reduce((s, _, i) => reduce(s, { type: 'type', text: s.typed + text[i] }), state)

describe('The India Quiz: its facts', () => {
  it('has 51 answers, 17 in each part, each with a clue', () => {
    expect(QUIZ_ANSWER_COUNT).toBe(51)
    for (const section of ['nation', 'land', 'people']) {
      expect(INDIA_QUIZ.filter((f) => f.section === section)).toHaveLength(17)
    }
    for (const fact of INDIA_QUIZ) expect(fact.hint.trim(), fact.answer).not.toBe('')
  })

  it('never lets two answers share a spelling', () => {
    const owner = new Map<string, string>()
    for (const region of quiz.regions) {
      for (const key of new Set(spellings(region).map(normalise))) {
        expect(key, region.name).not.toBe('')
        expect(owner.get(key), `"${key}" is both ${owner.get(key)} and ${region.name}`).toBe(
          undefined,
        )
        owner.set(key, region.name)
      }
    }
  })

  it('has the corrected facts', () => {
    const answer = (hint: string) => INDIA_QUIZ.filter((f) => f.hint === hint).map((f) => f.answer)
    expect(answer('Lowest point')).toEqual(['Kuttanad'])
    expect(answer('4th largest city')).toEqual(['Hyderabad'])
    expect(answer('5th largest city')).toEqual(['Ahmedabad'])
    expect(answer('Bordering country')).toHaveLength(7)
    expect(answer('Bordering country')).toContain('Afghanistan')
  })
})

describe('The India Quiz: typing the answers', () => {
  it('takes every answer, in every accepted spelling, from a fresh start', () => {
    for (const region of quiz.regions) {
      for (const spelling of spellings(region)) {
        expect(typeOut(fresh(), spelling).found, `${spelling} → ${region.name}`).toContain(
          region.name,
        )
      }
    }
  })

  it('takes both answers when one begins the other: "Indian" + " Ocean"', () => {
    const s = typeOut(fresh(), 'Indian Ocean')
    expect(s.found).toEqual(['Indian', 'Indian Ocean'])
    expect(s.typed).toBe('')
    expect(typeOut(fresh(), 'Bengaluru').found).toEqual(['Bay of Bengal', 'Bengaluru'])
  })

  it('takes "Indian Ocean" on its own once "Indian" is answered', () => {
    const s = typeOut(typeOut(fresh(), 'Indian'), 'Indian Ocean')
    expect(s.found).toEqual(['Indian', 'Indian Ocean'])
  })

  it('takes numbers and dates as people write them', () => {
    expect(typeOut(fresh(), '28').found).toEqual(['28'])
    expect(typeOut(fresh(), 'eighteen').found).toEqual(['18'])
    for (const date of ['26 January', 'January 26th', '26/01/1950', 'Jan 26, 1950']) {
      expect(typeOut(fresh(), date).found, date).toEqual(['January 26, 1950'])
    }
  })

  it('is won by giving every answer', () => {
    let s = fresh()
    for (const fact of INDIA_QUIZ) s = typeOut(s, fact.answer)
    expect(s.phase).toBe('finished')
    expect(s.endReason).toBe('all')
    expect(s.found).toHaveLength(51)
  })
})
