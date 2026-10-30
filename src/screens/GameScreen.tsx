import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import MapView from '../components/MapView'
import PhotoCard from '../components/PhotoCard'
import QuizBoard from '../components/QuizBoard'
import ResultPopup from '../components/ResultPopup'
import Switch from '../components/Switch'
import TopBar from '../components/TopBar'
import {
  announcement,
  currentName,
  lossSummary,
  reduce,
  roundWon,
  startState,
  winSummary,
} from '../game/engine'
import { shuffle } from '../game/shuffle'
import type { Mode, Quiz } from '../game/types'
import { useTimer } from '../game/useTimer'
import type { Board, Level } from '../games'
import { MONUMENT_PHOTOS } from '../photos'
import styles from './GameScreen.module.css'

/** How long a wrongly clicked region stays red before fading back. */
const FLASH_MS = 700

interface GameScreenProps {
  board: Board
  level: Level
  mode: Mode
  title: string // what the round is called, e.g. "Districts · Type names"
  setupHref: string // the game's setup screen, for "Change mode"
  canChange?: boolean // whether that screen has a level or mode to change; if not, the link is "Back"
}

export default function GameScreen({
  board,
  level,
  mode,
  title,
  setupHref,
  canChange = true,
}: Readonly<GameScreenProps>) {
  const quiz = useMemo<Quiz>(
    () => ({ regions: board.regions, seconds: level.seconds, one: level.one, many: level.many }),
    [board, level],
  )
  const newOrder = () =>
    shuffle(
      quiz.regions.map((r) => r.name),
      Math.random,
    )

  const [state, dispatch] = useReducer(reduce, null, () => startState(quiz, mode, newOrder()))
  useTimer(state.phase, dispatch)

  // Each wrong click flashes the clicked region for FLASH_MS, then clears it.
  const { lastEvent } = state
  const wrongClick = lastEvent?.kind === 'wrong' ? lastEvent : null
  const flashTimer = useRef(0)
  useEffect(() => {
    if (!wrongClick) return
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => dispatch({ type: 'clearFlash' }), FLASH_MS)
  }, [wrongClick])
  useEffect(() => () => window.clearTimeout(flashTimer.current), [])

  // Every round ends with a popup: "You won!", or "You lost", where the answers stay hidden
  // until it is closed.
  const [popupClosed, setPopupClosed] = useState(false)
  const popupOpen = state.phase === 'finished' && !popupClosed
  const won = roundWon(state)

  const playAgain = () => {
    setPopupClosed(false)
    dispatch({ type: 'start', quiz, mode, order: newOrder() })
    dispatch({ type: 'play' })
  }

  // Fit the whole screen in the window: the map gets the height everything else leaves.
  // --chrome is the height of everything but the map, the site header above this screen included;
  // CSS turns the rest into the map's width.
  const screenRef = useRef<HTMLElement>(null)
  const mapBoxRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const screen = screenRef.current
    const mapBox = mapBoxRef.current
    if (!screen || !mapBox || typeof ResizeObserver === 'undefined') return
    const fit = () => {
      const top = screen.getBoundingClientRect().top + window.scrollY
      const chrome = `${Math.ceil(top) + screen.offsetHeight - mapBox.offsetHeight}px`
      if (screen.style.getPropertyValue('--chrome') !== chrome) {
        screen.style.setProperty('--chrome', chrome)
      }
    }
    fit()
    // Re-measure on the next frame, so resizing the map never happens inside the observer.
    let frame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(fit)
    })
    observer.observe(screen)
    observer.observe(document.body) // the header's height can change without this screen's
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  const finished = state.phase === 'finished'
  const paused = state.phase === 'paused'

  // Points (monuments) are asked with their photo; the map with every answer comes at the end.
  // A quiz with no map shows its clues instead.
  const pictures = board.kind === 'points' && board.photos === true && !finished
  const list = board.kind === 'list'
  const asked = state.phase === 'ready' ? null : currentName(state)
  const photoOf = (name: string | null | undefined) =>
    name ? (MONUMENT_PHOTOS[name] ?? null) : null

  const cover = paused && (
    <div className={styles.cover} data-testid="paused">
      <svg className={styles.pausedIcon} viewBox="0 0 16 16" aria-hidden="true">
        <path d="M5 3v10M11 3v10" />
      </svg>
      <p className={styles.pausedTitle}>Paused</p>
      <p className={styles.pausedHint}>
        <span>The game is frozen. Press</span>
        <span className={styles.key} aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 16 16">
            <path d="M4 2.5l9 5.5-9 5.5z" fill="currentColor" />
          </svg>
        </span>
        <span className="sr-only"> Resume </span>
        <span>above to carry on.</span>
      </p>
    </div>
  )

  return (
    <main
      ref={screenRef}
      className={list ? `${styles.screen} ${styles.wide}` : styles.screen}
      style={{ '--map-ratio': pictures ? 4 / 3 : list ? 4 : board.w / board.h } as CSSProperties}
    >
      <div className={styles.head}>
        <TopBar
          state={state}
          level={level}
          title={title}
          dispatch={dispatch}
          onPlayAgain={playAgain}
          popupOpen={popupOpen}
        />
      </div>

      <div className={styles.board}>
        <div ref={mapBoxRef}>
          {pictures ? (
            <PhotoCard
              asked={board.regions.find((region) => region.name === asked) ?? null}
              photo={photoOf(asked)}
              next={photoOf(state.phase === 'ready' ? state.queue[0] : state.queue[1])}
            >
              {cover}
            </PhotoCard>
          ) : list ? (
            <QuizBoard
              regions={board.regions}
              found={state.found}
              missed={popupOpen ? [] : state.missed}
            >
              {cover}
            </QuizBoard>
          ) : (
            <MapView
              board={board}
              found={state.found}
              missed={popupOpen ? [] : state.missed}
              flash={state.flash}
              markers={
                mode === 'type' && state.showMarkers && board.kind !== 'points' ? state.queue : []
              }
              highlight={mode === 'name' && state.phase === 'playing' ? currentName(state) : null}
              clickable={mode === 'click' && state.phase === 'playing'}
              onRegionClick={
                mode === 'click' ? (name) => dispatch({ type: 'click', name }) : undefined
              }
              label={
                board.kind !== 'areas'
                  ? `Blank map of ${board.area} with ${board.regions.length} ${level.many}`
                  : `Blank map of ${board.area} divided into ${board.regions.length} ${level.many}`
              }
            >
              {cover}
            </MapView>
          )}
        </div>

        <div className={styles.bottom}>
          <a className={styles.back} href={setupHref}>
            {canChange ? '← Change mode' : '← Back'}
          </a>
          {mode === 'type' && (board.kind === 'areas' || board.kind === 'lines') && (
            <Switch
              label="Answer locations"
              checked={state.showMarkers}
              disabled={finished}
              onChange={() => dispatch({ type: 'toggleMarkers' })}
            />
          )}
        </div>
      </div>

      <div className="sr-only" aria-live="polite" data-testid="announcer">
        {announcement(state)}
      </div>

      {popupOpen && (
        <ResultPopup
          won={won}
          message={won ? winSummary(state) : lossSummary(state)}
          onClose={() => setPopupClosed(true)}
          onPlayAgain={playAgain}
        />
      )}
    </main>
  )
}
