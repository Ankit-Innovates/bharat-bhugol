import { matchName, normalise, spellings } from './matcher'
import type { Action, EndReason, GameState, MapRegion, Mode, Quiz, Tail } from './types'

/** A fresh round, waiting for Play. `order` is the shuffled ask order, chosen by the caller. */
export function startState(quiz: Quiz, mode: Mode, order: string[]): GameState {
  return {
    quiz,
    mode,
    phase: 'ready',
    queue: [...order],
    found: [],
    missed: [],
    flash: null,
    typed: '',
    tails: [],
    secondsLeft: quiz.seconds,
    showMarkers: true,
    endReason: null,
    lastEvent: null,
  }
}

/** The whole game: every rule lives here. Pure — no timers, randomness or DOM. */
export function reduce(state: GameState, action: Action): GameState {
  if (action.type === 'start') return startState(action.quiz, action.mode, action.order)
  if (state.phase === 'finished') return state

  switch (action.type) {
    case 'play':
      return state.phase === 'ready' ? { ...state, phase: 'playing' } : state
    case 'click':
      return click(state, action.name)
    case 'type':
      return type(state, action.text)
    case 'skip':
      return skip(state)
    case 'tick':
      return tick(state)
    case 'pause':
      return state.phase === 'playing' ? { ...state, phase: 'paused' } : state
    case 'resume':
      return state.phase === 'paused' ? { ...state, phase: 'playing' } : state
    case 'giveUp':
      return finish(state, 'gaveUp')
    case 'clearFlash':
      return state.flash === null ? state : { ...state, flash: null }
    case 'toggleMarkers':
      return { ...state, showMarkers: !state.showMarkers }
  }
}

function click(state: GameState, name: string): GameState {
  // Only while playing; regions already found (or not on this map) do nothing.
  if (state.mode !== 'click' || state.phase !== 'playing' || !state.queue.includes(name)) {
    return state
  }
  const asked = state.queue[0]
  if (name === asked) {
    const queue = state.queue.slice(1)
    const next: GameState = {
      ...state,
      queue,
      found: [...state.found, asked],
      lastEvent: { kind: 'correct', name: asked },
    }
    return queue.length === 0 ? finish(next, 'all') : next
  }
  // A wrong click only flashes the region: try again as often as you like, or skip.
  return { ...state, flash: name, lastEvent: { kind: 'wrong', name: asked, clicked: name } }
}

function type(state: GameState, text: string): GameState {
  if (state.mode === 'click' || state.phase !== 'playing') return state

  // Type mode takes any name still unanswered; name mode only the one lit up on the map.
  const candidates =
    state.mode === 'name'
      ? state.quiz.regions.filter((region) => region.name === state.queue[0])
      : state.quiz.regions.filter((region) => state.queue.includes(region.name))
  // A name is taken the moment it is complete, so typing can run on into the rest of a longer
  // spelling ("Agar" + " Malwa", "Khajuraho" + " Temple"). The text is tried as typed first, then
  // without such a run-on start, so the next answer counts even if it comes straight after.
  const key = normalise(text)
  const own = state.tails.filter((tail) => tail.place === null)
  const runOn = Math.max(0, ...own.map((tail) => sharedLength(tail.rest, key)))
  const cuts = [0, ...Array.from({ length: runOn }, (_, i) => runOn - i)] // longest run-on first
  for (const cut of cuts) {
    const name = matchName(key.slice(cut), candidates)
    const hit = candidates.find((region) => region.name === name)
    if (hit) return take(state, hit, key.slice(cut))
  }
  // In a quiz, one answer can begin another ("Indian", "Indian Ocean"): typing on from the first
  // into the rest of the second answers that one too.
  const onward = state.tails.find((tail) => tail.place !== null && tail.rest === key)
  const second = onward && candidates.find((region) => region.name === onward.place)
  if (onward && second) return take(state, second, onward.spelling)
  // Once the run-on is the whole rest of a longer spelling, the box quietly clears, unless it could
  // still grow, or be the start of a name to come ("Penna" + "r" is Pennar, but "R" starts Ravi).
  const longer = state.tails.some(
    (tail) => tail.rest.length > key.length && tail.rest.startsWith(key),
  )
  const starts = candidates.some((region) =>
    spellings(region).some((spelling) => normalise(spelling).startsWith(key)),
  )
  if (own.some((tail) => tail.rest === key) && !longer && !starts) {
    return { ...state, typed: '', tails: [] }
  }
  return { ...state, typed: text }
}

/** Takes `region` as answered by `key`, the normalised text that spelled it. */
function take(state: GameState, region: MapRegion, key: string): GameState {
  const queue = state.queue.filter((name) => name !== region.name)
  // What may follow: the rest of a longer spelling of this answer, and (when any answer counts)
  // of another answer still to give that this one begins.
  const rests = (of: MapRegion, place: string | null): Tail[] =>
    spellings(of)
      .map(normalise)
      .filter((spelling) => spelling.length > key.length && spelling.startsWith(key))
      .map((spelling) => ({ rest: spelling.slice(key.length), spelling, place }))
  const others =
    state.mode === 'type'
      ? state.quiz.regions
          .filter((other) => other !== region && queue.includes(other.name))
          .flatMap((other) => rests(other, other.name))
      : []
  const next: GameState = {
    ...state,
    queue,
    typed: '',
    tails: [...rests(region, null), ...others],
    found: [...state.found, region.name],
    lastEvent: { kind: 'correct', name: region.name },
  }
  return queue.length === 0 ? finish(next, 'all') : next
}

/** How many letters `a` and `b` have in common at the start. */
function sharedLength(a: string, b: string): number {
  let n = 0
  while (n < a.length && n < b.length && a[n] === b[n]) n += 1
  return n
}

function skip(state: GameState): GameState {
  if (state.mode === 'type' || state.phase !== 'playing' || state.queue.length < 2) return state
  const [asked, ...rest] = state.queue
  // In name mode, anything typed for the skipped place goes with it.
  return {
    ...state,
    queue: [...rest, asked],
    typed: '',
    tails: [],
    lastEvent: { kind: 'skipped', name: asked },
  }
}

function tick(state: GameState): GameState {
  if (state.phase !== 'playing') return state
  const secondsLeft = state.secondsLeft - 1
  return secondsLeft <= 0 ? finish({ ...state, secondsLeft: 0 }, 'time') : { ...state, secondsLeft }
}

/** Ends the round: everything still unanswered is marked missed. */
function finish(state: GameState, endReason: EndReason): GameState {
  return {
    ...state,
    phase: 'finished',
    endReason,
    queue: [],
    missed: [...state.missed, ...state.queue],
    flash: null,
    typed: '',
    tails: [],
  }
}

// Selectors

/** The place asked right now (named in click mode, lit up in name mode), or null. */
export function currentName(state: GameState): string | null {
  if (state.mode === 'type' || state.phase === 'finished') return null
  return state.queue[0] ?? null
}

export function score(state: GameState): number {
  return state.found.length
}

export function total(state: GameState): number {
  return state.quiz.regions.length
}

/** "mm:ss" */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

/** The label above Play again once the round is over. */
export function endTitle(state: GameState): string {
  if (state.endReason === 'time') return 'Time’s up'
  if (state.endReason === 'gaveUp') return 'Game over'
  return 'Finished!'
}

/** The round is over with every region answered. */
export function roundWon(state: GameState): boolean {
  return state.phase === 'finished' && score(state) === total(state)
}

/** The line under "You won!". */
export function winSummary(state: GameState): string {
  const verb = state.mode === 'click' ? 'found' : 'named'
  const { many } = state.quiz
  return `You ${verb} all ${total(state)} ${many} with ${formatTime(state.secondsLeft)} left.`
}

/** Why a round was lost (the clock ran out or the player gave up), for the popup. */
export function lossSummary(state: GameState): string {
  const left = state.missed.length
  const noun = left === 1 ? state.quiz.one : state.quiz.many
  const verb = state.mode === 'click' ? 'find' : 'name'
  const why = state.endReason === 'time' ? 'Time ran out' : 'You gave up'
  return `${why} with ${left} ${noun} still to ${verb}.`
}

/** What the screen-reader announcer says about the last event. */
export function announcement(state: GameState): string {
  const event = state.lastEvent
  if (!event) return ''
  switch (event.kind) {
    case 'correct':
      return `Correct — ${event.name}`
    case 'wrong':
      // Never names the region clicked: the map doesn't show it either.
      return 'Wrong — try again'
    case 'skipped':
      return `Skipped ${event.name}`
  }
}
