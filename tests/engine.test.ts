import { describe, expect, it } from 'vitest'
import {
  announcement,
  currentName,
  endTitle,
  formatTime,
  lossSummary,
  reduce,
  roundWon,
  score,
  startState,
  total,
  winSummary,
} from '../src/game/engine'
import { normalise, spellings } from '../src/game/matcher'
import { shuffle } from '../src/game/shuffle'
import type { Action, GameState, Mode } from '../src/game/types'
import { india, map, QUIZZES, seeded } from './fixtures'

type QuizName = keyof typeof QUIZZES

/** A fresh round, still waiting for Play. */
function ready(quiz: QuizName = 'divisions', mode: Mode = 'click', seed = 1): GameState {
  const { regions } = QUIZZES[quiz]
  const order = shuffle(
    regions.map((r) => r.name),
    seeded(seed),
  )
  return startState(QUIZZES[quiz], mode, order)
}

/** A round after Play was pressed. */
const playing = (quiz: QuizName = 'divisions', mode: Mode = 'click', seed = 1): GameState =>
  reduce(ready(quiz, mode, seed), { type: 'play' })

const play = (state: GameState, ...actions: Action[]): GameState =>
  actions.reduce((s, action) => reduce(s, action), state)

const click = (name: string): Action => ({ type: 'click', name })
const type = (text: string): Action => ({ type: 'type', text })

/** Types `text` one character at a time, as a player would. */
const typeOut = (state: GameState, text: string): GameState =>
  [...text].reduce((s, _, i) => reduce(s, type(s.typed + text[i])), state)

/** A region that is still unresolved but is not the one being asked. */
const wrongFor = (state: GameState): string => state.queue[1]

describe('start', () => {
  it.each(Object.keys(QUIZZES) as QuizName[])('sets up a ready %s round', (name) => {
    const quiz = QUIZZES[name]
    const order = quiz.regions.map((r) => r.name).reverse()
    const s = reduce(playing(), { type: 'start', quiz, mode: 'type', order })
    expect(s).toEqual({
      quiz,
      mode: 'type',
      phase: 'ready',
      queue: order,
      found: [],
      missed: [],
      flash: null,
      typed: '',
      tails: [],
      secondsLeft: quiz.seconds,
      showMarkers: true,
      endReason: null,
      lastEvent: null,
    })
    expect(s.queue).not.toBe(order) // a copy, so the caller's array is never changed
    expect(total(s)).toBe(quiz.regions.length)
  })
})

describe('Play', () => {
  it('starts the round from ready', () => {
    expect(reduce(ready(), { type: 'play' }).phase).toBe('playing')
  })

  it('does nothing once the round has started', () => {
    const s = playing()
    expect(reduce(s, { type: 'play' })).toBe(s)
    const paused = reduce(s, { type: 'pause' })
    expect(reduce(paused, { type: 'play' })).toBe(paused)
  })

  it('is needed before clicks, typing or Skip count', () => {
    const clicking = ready()
    expect(reduce(clicking, click(clicking.queue[0]))).toBe(clicking)
    expect(reduce(clicking, { type: 'skip' })).toBe(clicking)
    const typing = ready('divisions', 'type')
    expect(reduce(typing, type('Rewa'))).toBe(typing)
  })
})

describe('Click mode', () => {
  it.each(['districts', 'india'] as const)(
    'scores a correct click and advances, never asking a name twice (%s)',
    (quiz) => {
      let s = playing(quiz)
      const asked: string[] = []
      while (s.phase !== 'finished') {
        const name = currentName(s)
        if (name === null) throw new Error('no name asked before the end')
        asked.push(name)
        const before = score(s)
        s = reduce(s, click(name))
        expect(score(s)).toBe(before + 1)
        expect(s.lastEvent).toEqual({ kind: 'correct', name })
      }
      const n = QUIZZES[quiz].regions.length
      expect(asked).toHaveLength(n)
      expect(new Set(asked).size).toBe(n)
      expect(s.found).toEqual(asked)
      expect(s.missed).toEqual([])
      expect(s.endReason).toBe('all')
      expect(endTitle(s)).toBe('Finished!')
      expect(roundWon(s)).toBe(true)
    },
  )

  it('describes a win with the time left', () => {
    let s = playing('districts')
    while (s.phase !== 'finished') s = reduce(s, click(s.queue[0]))
    expect(winSummary(s)).toBe('You found all 55 districts with 15:00 left.')
    let t = playing('india')
    while (t.phase !== 'finished') t = reduce(t, click(t.queue[0]))
    expect(winSummary({ ...t, secondsLeft: 192 })).toBe(
      'You found all 36 states and UTs with 03:12 left.',
    )
  })

  it('flashes the clicked region on a wrong click without naming it', () => {
    const s0 = playing()
    const asked = s0.queue[0]
    const wrong = wrongFor(s0)
    const s1 = reduce(s0, click(wrong))
    expect(s1.flash).toBe(wrong)
    expect(s1.queue).toEqual(s0.queue)
    expect(s1.lastEvent).toEqual({ kind: 'wrong', name: asked, clicked: wrong })
    expect(announcement(s1)).toBe('Wrong — try again')
    expect(announcement(s1)).not.toContain(wrong)
  })

  it('keeps asking the same name however many wrong clicks there are', () => {
    const s0 = playing()
    const others = s0.queue.slice(1)
    const s = play(s0, ...others.map(click), ...others.map(click))
    expect(currentName(s)).toBe(s0.queue[0])
    expect(s.queue).toEqual(s0.queue)
    expect(s.missed).toEqual([])
    expect(score(s)).toBe(0)
    expect(reduce(s, click(s0.queue[0])).found).toEqual([s0.queue[0]])
  })

  it('does nothing when a found region, or one not on this map, is clicked', () => {
    const s0 = playing()
    const found = reduce(s0, click(s0.queue[0]))
    expect(reduce(found, click(s0.queue[0]))).toBe(found)
    expect(reduce(found, click('Atlantis'))).toBe(found)
  })

  it('ignores clicks while paused and in Type mode', () => {
    const paused = play(playing(), { type: 'pause' })
    expect(reduce(paused, click(paused.queue[0]))).toBe(paused)
    const typing = playing('divisions', 'type')
    expect(reduce(typing, click(typing.queue[0]))).toBe(typing)
  })
})

describe('Skip', () => {
  it('moves the current name to the back of the queue', () => {
    const s0 = playing()
    const s1 = play(s0, click(wrongFor(s0)), { type: 'skip' })
    expect(s1.queue).toEqual([...s0.queue.slice(1), s0.queue[0]])
    expect(s1.lastEvent).toEqual({ kind: 'skipped', name: s0.queue[0] })
    expect(announcement(s1)).toBe(`Skipped ${s0.queue[0]}`)
  })

  it('does nothing with one name left', () => {
    let s = playing()
    while (s.queue.length > 1) s = reduce(s, click(s.queue[0]))
    expect(reduce(s, { type: 'skip' })).toBe(s)
  })

  it('does nothing while paused or in Type mode', () => {
    const paused = play(playing(), { type: 'pause' })
    expect(reduce(paused, { type: 'skip' })).toBe(paused)
    const typing = playing('divisions', 'type')
    expect(reduce(typing, { type: 'skip' })).toBe(typing)
  })
})

describe('Type mode', () => {
  it('accepts a name the moment the text matches, with no Enter', () => {
    const s1 = play(playing('divisions', 'type'), type('R'), type('Re'), type('Rew'))
    expect(s1.typed).toBe('Rew')
    expect(score(s1)).toBe(0)
    const s2 = reduce(s1, type('Rewa'))
    expect(s2.typed).toBe('')
    expect(s2.found).toEqual(['Rewa'])
    expect(s2.queue).not.toContain('Rewa')
    expect(s2.lastEvent).toEqual({ kind: 'correct', name: 'Rewa' })
    expect(announcement(s2)).toBe('Correct — Rewa')
  })

  it('ignores a name that is already answered, leaving the text in the box', () => {
    const s1 = play(playing('divisions', 'type'), type('Rewa'))
    const s2 = reduce(s1, type('rewa'))
    expect(s2.typed).toBe('rewa')
    expect(s2.found).toEqual(['Rewa'])
  })

  it('accepts other spellings', () => {
    const s = play(playing('districts', 'type'), type('Hoshangabad'), type('west nimar'))
    expect(s.found).toEqual(['Narmadapuram', 'Khargone'])
    const t = play(playing('india', 'type'), type('Orissa'), type('Pondicherry'), type('New Delhi'))
    expect(t.found).toEqual(['Odisha', 'Puducherry', 'Delhi'])
  })

  it('quietly takes in the rest of a name that a shorter spelling already answered', () => {
    // "Agar" is enough for Agar Malwa; typing on to the full name must not leave " Malwa" behind.
    let s = typeOut(playing('districts', 'type'), 'Agar')
    expect(s.found).toEqual(['Agar Malwa'])
    expect(s.typed).toBe('')
    s = typeOut(s, ' Malw')
    expect(s.typed).toBe(' Malw')
    s = typeOut(s, 'a')
    expect(s.typed).toBe('')
    expect(s.found).toEqual(['Agar Malwa'])

    // The same for "Andaman and Nicobar" + " Islands", and with punctuation in between.
    let t = typeOut(playing('india', 'type'), 'Andaman and Nicobar')
    expect(t.found).toEqual(['Andaman and Nicobar Islands'])
    t = typeOut(t, '-Islands')
    expect(t.typed).toBe('')
  })

  it('forgets the rest of a name once another one is answered', () => {
    const s = typeOut(typeOut(typeOut(playing('districts', 'type'), 'Agar'), 'Rewa'), 'Malwa')
    expect(s.found).toEqual(['Agar Malwa', 'Rewa'])
    expect(s.typed).toBe('Malwa')
  })

  it('ends the round when every region is named, with nothing lost', () => {
    let s = playing('divisions', 'type')
    for (const region of map.divisions) s = reduce(s, type(region.name.toUpperCase()))
    expect(s.phase).toBe('finished')
    expect(s.endReason).toBe('all')
    expect(s.missed).toEqual([])
    expect(endTitle(s)).toBe('Finished!')
    expect(roundWon(s)).toBe(true)
    expect(winSummary({ ...s, secondsLeft: 192 })).toBe(
      'You named all 10 divisions with 03:12 left.',
    )
  })

  it('names all 36 states and union territories, typed one character at a time', () => {
    let s = playing('india', 'type')
    for (const region of india.regions) s = typeOut(s, region.name)
    expect(s.phase).toBe('finished')
    expect(score(s)).toBe(36)
    expect(roundWon(s)).toBe(true)
  })

  it('ignores typing while paused and in Click mode', () => {
    const paused = play(playing('divisions', 'type'), type('x'), { type: 'pause' })
    expect(reduce(paused, type('Rewa'))).toBe(paused)
    const clicking = playing()
    expect(reduce(clicking, type('Rewa'))).toBe(clicking)
  })

  it('clears the box when the text is deleted', () => {
    const s = play(playing('divisions', 'type'), type('Re'), type(''))
    expect(s.typed).toBe('')
    expect(s.phase).toBe('playing')
  })
})

describe('Name mode', () => {
  /** The river lit up on the map, to be named. */
  const lit = (s: GameState): string => currentName(s) ?? ''

  it('lights up one river at a time and takes only its name', () => {
    const s0 = playing('majorRivers', 'name')
    expect(lit(s0)).toBe(s0.queue[0])

    // Another river's name is no answer here: it just stays in the box.
    const other = s0.queue[1]
    const s1 = typeOut(s0, other)
    expect(s1.found).toEqual([])
    expect(s1.typed).toBe(other)

    // Its own name is taken the moment it is complete, and the next river lights up.
    const s2 = typeOut(reduce(s1, type('')), lit(s0))
    expect(s2.found).toEqual([s0.queue[0]])
    expect(s2.typed).toBe('')
    expect(lit(s2)).toBe(s0.queue[1])
    expect(announcement(s2)).toBe(`Correct — ${s0.queue[0]}`)
  })

  it('takes other spellings of the lit-up river', () => {
    const names = QUIZZES.majorRivers.regions.map((r) => r.name)
    const order = ['Ganga', ...names.filter((n) => n !== 'Ganga')]
    const s0 = reduce(startState(QUIZZES.majorRivers, 'name', order), { type: 'play' })
    const s1 = typeOut(s0, 'Ganges')
    expect(s1.found).toEqual(['Ganga'])
    expect(lit(s1)).toBe(order[1])
  })

  it('Skip sends the lit-up river to the back and empties the box', () => {
    const s0 = playing('majorRivers', 'name')
    const s1 = play(typeOut(s0, 'Nil'), { type: 'skip' })
    expect(s1.queue).toEqual([...s0.queue.slice(1), s0.queue[0]])
    expect(s1.typed).toBe('')
    expect(lit(s1)).toBe(s0.queue[1])
    expect(announcement(s1)).toBe(`Skipped ${s0.queue[0]}`)
  })

  it('is won by naming every river', () => {
    let s = playing('rivers', 'name')
    while (s.phase !== 'finished') s = typeOut(s, lit(s))
    expect(roundWon(s)).toBe(true)
    expect(score(s)).toBe(29)
    expect(winSummary(s)).toMatch(/^You named all 29 rivers with \d\d:\d\d left\.$/)
  })

  it('ignores clicks', () => {
    const s0 = playing('majorRivers', 'name')
    expect(reduce(s0, click(s0.queue[0]))).toBe(s0)
  })

  it('says what is left to name when the round is lost', () => {
    const s = reduce(playing('majorRivers', 'name'), { type: 'giveUp' })
    expect(lit(s)).toBe('')
    expect(lossSummary(s)).toBe('You gave up with 15 rivers still to name.')
  })
})

describe('Name the place (answers other than the name)', () => {
  /** A places round with the given monument asked first. */
  const asking = (first: string) => {
    const names = QUIZZES.places.regions.map((r) => r.name)
    const order = [first, ...names.filter((n) => n !== first)]
    return reduce(startState(QUIZZES.places, 'name', order), { type: 'play' })
  }

  it("takes the monument's city or its state, but not its own name", () => {
    expect(typeOut(asking('Hawa Mahal'), 'Hawa Mahal').found).toEqual([])
    expect(typeOut(asking('Hawa Mahal'), 'Jaipur').found).toEqual(['Hawa Mahal'])
    expect(typeOut(asking('Hawa Mahal'), 'Rajasthan').found).toEqual(['Hawa Mahal'])
  })

  it('takes other spellings of the city and of the state', () => {
    expect(typeOut(asking('Gateway of India'), 'Bombay').found).toEqual(['Gateway of India'])
    expect(typeOut(asking('Konark Sun Temple'), 'Orissa').found).toEqual(['Konark Sun Temple'])
  })

  it('is won by placing every monument', () => {
    let s = asking('Taj Mahal')
    const states = new Map(QUIZZES.places.regions.map((r) => [r.name, r.answers?.at(-1) ?? '']))
    while (s.phase !== 'finished') s = typeOut(s, states.get(currentName(s) ?? '') ?? '')
    expect(roundWon(s)).toBe(true)
    expect(winSummary(s)).toMatch(/^You named all 21 monuments/)
  })
})

describe('Typing on after a name taken at a shorter spelling', () => {
  /** A round of `quiz` that asks `first` names in this order (name mode) or takes any (type). */
  const round = (quiz: QuizName, mode: Mode, first: string[]) => {
    const names = QUIZZES[quiz].regions.map((r) => r.name)
    const order = [...first, ...names.filter((n) => !first.includes(n))]
    return reduce(startState(QUIZZES[quiz], mode, order), { type: 'play' })
  }

  it('takes in the rest of any longer spelling, and the next name straight after it', () => {
    let s = round('monuments', 'name', [
      'Khajuraho Temples',
      'Konark Sun Temple',
      'Meenakshi Temple',
      'Taj Mahal',
    ])
    // "Khajuraho" is enough, and "Temple" is only the start of the rest ("Temples"), so it stays
    // in the box; the next answer still counts when it follows.
    s = typeOut(s, 'Khajuraho Temple')
    expect(s.found).toEqual(['Khajuraho Temples'])
    expect(s.typed).toBe(' Temple')
    s = typeOut(s, 'Konark')
    expect(s.found).toEqual(['Khajuraho Temples', 'Konark Sun Temple'])
    // " Temple" finishes another of its spellings, "Konark Temple", so the box clears.
    s = typeOut(s, ' Temple')
    expect(s.typed).toBe('')
    s = typeOut(s, 'Meenakshi Amman Temple')
    expect(s.found.at(-1)).toBe('Meenakshi Temple')
    expect(s.typed).toBe('')
  })

  it('never stands in the way of a name that starts like the rest', () => {
    // "Agar" leaves " Malwa" to come; "Mandla" begins the same way but is a name of its own.
    const s = typeOut(typeOut(round('districts', 'type', []), 'Agar'), 'Mandla')
    expect(s.found).toEqual(['Agar Malwa', 'Mandla'])
    expect(s.typed).toBe('')

    // "Penna" leaves only "r" of "Pennar", so the R of Ravi must not be taken for it.
    const t = typeOut(typeOut(round('rivers', 'name', ['Penner', 'Ravi']), 'Penna'), 'Ravi')
    expect(t.found).toEqual(['Penner', 'Ravi'])
  })

  // Every place with a spelling that starts a longer one of its own, then every other place:
  // the next name counts whether or not the rest of the longer spelling was typed first.
  const quizzes: Array<[QuizName, Mode]> = [
    ['divisions', 'type'],
    ['districts', 'type'],
    ['india', 'type'],
    ['rivers', 'name'],
    ['monuments', 'name'],
    ['places', 'name'],
  ]
  it.each(quizzes)('works for every such spelling in %s', (quiz, mode) => {
    const regions = QUIZZES[quiz].regions
    for (const first of regions) {
      const keys = spellings(first).map(normalise)
      for (const short of keys) {
        for (const long of keys.filter((k) => k.length > short.length && k.startsWith(short))) {
          for (const next of regions.filter((r) => r !== first)) {
            for (const rest of ['', long.slice(short.length)]) {
              const s = typeOut(round(quiz, mode, [first.name, next.name]), short + rest)
              const t = typeOut(s, spellings(next)[0])
              expect(t.found, `${short} + ${rest} + ${next.name}`).toEqual([first.name, next.name])
            }
          }
        }
      }
    }
  })
})

describe('Timer, pause and give up', () => {
  it('only counts down while playing', () => {
    const waiting = ready()
    expect(reduce(waiting, { type: 'tick' })).toBe(waiting)
    const s = reduce(waiting, { type: 'play' })
    expect(reduce(s, { type: 'tick' }).secondsLeft).toBe(299)
    const paused = reduce(s, { type: 'pause' })
    expect(reduce(paused, { type: 'tick' })).toBe(paused)
  })

  it('ends the round with "time" when a tick lands on 0:00', () => {
    const s0 = play(playing('districts', 'type'), type('Rewa'))
    const s = reduce({ ...s0, secondsLeft: 1 }, { type: 'tick' })
    expect(s.phase).toBe('finished')
    expect(s.endReason).toBe('time')
    expect(s.secondsLeft).toBe(0)
    expect(s.found).toEqual(['Rewa'])
    expect(s.missed).toEqual(s0.queue)
    expect(endTitle(s)).toBe('Time’s up')
    expect(roundWon(s)).toBe(false)
    expect(lossSummary(s)).toBe('Time ran out with 54 districts still to name.')
  })

  it('pauses only from playing and resumes only from paused', () => {
    const waiting = ready()
    expect(reduce(waiting, { type: 'pause' })).toBe(waiting)
    expect(reduce(waiting, { type: 'resume' })).toBe(waiting)
    const s = reduce(waiting, { type: 'play' })
    expect(reduce(s, { type: 'resume' })).toBe(s)
    const paused = reduce(s, { type: 'pause' })
    expect(paused.phase).toBe('paused')
    expect(reduce(paused, { type: 'pause' })).toBe(paused)
    expect(reduce(paused, { type: 'resume' }).phase).toBe('playing')
  })

  it.each([
    ['ready', [] as Action[]],
    ['playing', [{ type: 'play' }, click('Rewa')] as Action[]],
    ['paused', [{ type: 'play' }, click('Rewa'), { type: 'pause' }] as Action[]],
  ])('gives up from %s, marking every unresolved name missed', (_, actions) => {
    const before = play(ready('divisions', 'click', 7), ...actions)
    const s = reduce(before, { type: 'giveUp' })
    expect(s.phase).toBe('finished')
    expect(s.endReason).toBe('gaveUp')
    expect(s.missed).toEqual(before.queue)
    expect(s.found).toEqual(before.found)
    expect(s.found.length + s.missed.length).toBe(10)
    expect(s.queue).toEqual([])
    expect(endTitle(s)).toBe('Game over')
    expect(roundWon(s)).toBe(false)
  })

  it('describes a lost round in the right words', () => {
    const gaveUp = reduce(playing('districts', 'click'), { type: 'giveUp' })
    expect(lossSummary(gaveUp)).toBe('You gave up with 55 districts still to find.')
    let oneLeft = playing('divisions', 'type')
    for (const region of map.divisions.slice(1)) oneLeft = reduce(oneLeft, type(region.name))
    const timedOut = reduce({ ...oneLeft, secondsLeft: 1 }, { type: 'tick' })
    expect(lossSummary(timedOut)).toBe('Time ran out with 1 division still to name.')
    let lastState = playing('india', 'type')
    for (const region of india.regions.slice(1)) lastState = typeOut(lastState, region.name)
    const lastGaveUp = reduce(lastState, { type: 'giveUp' })
    expect(lossSummary(lastGaveUp)).toBe('You gave up with 1 state or UT still to name.')
  })
})

describe('After the round', () => {
  it('changes nothing once finished', () => {
    const done = play(playing(), click(playing().queue[0]), { type: 'giveUp' })
    const actions: Action[] = [
      { type: 'play' },
      click(done.missed[0]),
      type('Rewa'),
      { type: 'skip' },
      { type: 'tick' },
      { type: 'pause' },
      { type: 'resume' },
      { type: 'giveUp' },
      { type: 'clearFlash' },
      { type: 'toggleMarkers' },
    ]
    for (const action of actions) expect(reduce(done, action), action.type).toBe(done)
  })

  it('starts a fresh round on start', () => {
    const done = reduce(playing(), { type: 'giveUp' })
    const quiz = QUIZZES.divisions
    const order = quiz.regions.map((r) => r.name)
    const s = reduce(done, { type: 'start', quiz, mode: 'click', order })
    expect(s.phase).toBe('ready')
    expect(s.missed).toEqual([])
    expect(s.queue).toEqual(order)
    expect(roundWon(s)).toBe(false)
  })
})

describe('Flash and markers', () => {
  it('clears the flash on clearFlash, and when the round ends', () => {
    const s0 = playing()
    const flashing = reduce(s0, click(wrongFor(s0)))
    expect(reduce(flashing, { type: 'clearFlash' }).flash).toBeNull()
    const calm = reduce(flashing, { type: 'clearFlash' })
    expect(reduce(calm, { type: 'clearFlash' })).toBe(calm)
    expect(reduce(flashing, { type: 'giveUp' }).flash).toBeNull()
  })

  it('toggles the ? markers, also before Play', () => {
    const s = ready('districts', 'type')
    expect(reduce(s, { type: 'toggleMarkers' }).showMarkers).toBe(false)
    expect(play(s, { type: 'toggleMarkers' }, { type: 'toggleMarkers' }).showMarkers).toBe(true)
  })
})

describe('Selectors', () => {
  it('formats the clock as mm:ss', () => {
    expect(formatTime(900)).toBe('15:00')
    expect(formatTime(600)).toBe('10:00')
    expect(formatTime(61.7)).toBe('01:01')
    expect(formatTime(59)).toBe('00:59')
    expect(formatTime(0)).toBe('00:00')
    expect(formatTime(-3)).toBe('00:00')
  })

  it('asks no name in Type mode or after the end', () => {
    expect(currentName(playing('divisions', 'type'))).toBeNull()
    expect(currentName(reduce(playing(), { type: 'giveUp' }))).toBeNull()
  })

  it('announces nothing before the first event', () => {
    expect(announcement(playing())).toBe('')
  })
})

describe('shuffle', () => {
  const names = ['a', 'b', 'c', 'd']

  it('returns a new array with the same names and leaves the input alone', () => {
    const out = shuffle(names, seeded(3))
    expect(out).not.toBe(names)
    expect([...out].sort()).toEqual(names)
    expect(names).toEqual(['a', 'b', 'c', 'd'])
  })

  it('is a Fisher–Yates shuffle driven by the given rng', () => {
    expect(shuffle(names, () => 0)).toEqual(['b', 'c', 'd', 'a'])
    expect(shuffle(names, () => 0.999)).toEqual(names)
    expect(shuffle(names, seeded(42))).toEqual(shuffle(names, seeded(42)))
  })
})
