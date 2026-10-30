import { useEffect, useId, useRef, type CSSProperties, type Dispatch } from 'react'
import { currentName, endTitle, formatTime, score, total } from '../game/engine'
import type { Action, GameState } from '../game/types'
import type { Level } from '../games'
import styles from './TopBar.module.css'

interface TopBarProps {
  state: GameState
  level: Level
  title: string // what the round is called, shown above Play game
  dispatch: Dispatch<Action>
  onPlayAgain: () => void
  popupOpen: boolean // the end-of-round popup holds focus until it's closed
}

export default function TopBar({
  state,
  level,
  title,
  dispatch,
  onPlayAgain,
  popupOpen,
}: Readonly<TopBarProps>) {
  const { mode, phase } = state
  const finished = phase === 'finished'
  const paused = phase === 'paused'
  const inputId = useId()
  const endId = useId()
  const playRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const playAgainRef = useRef<HTMLButtonElement>(null)

  // Keyboard flow: Play game → the answer box (Type mode, also after Resume) → Play again.
  useEffect(() => {
    if (phase === 'ready') playRef.current?.focus()
    if (phase === 'playing' && mode !== 'click') inputRef.current?.focus()
  }, [mode, phase])

  useEffect(() => {
    if (finished && !popupOpen) playAgainRef.current?.focus()
  }, [finished, popupOpen])

  // A prompt's {name} and {hint} stand for the place asked now: "Capital of {name}:".
  const asked = state.quiz.regions.find((region) => region.name === currentName(state))
  const fill = (text: string) =>
    text.replace('{name}', asked?.name ?? '').replace('{hint}', asked?.hint ?? '')

  let prompt
  if (phase === 'ready') {
    prompt = (
      <div className={styles.prompt}>
        <span className={styles.promptLabel}>{title}</span>
        <button
          ref={playRef}
          className={`${styles.play} ${styles.wide}`}
          type="button"
          onClick={() => dispatch({ type: 'play' })}
        >
          Play game
        </button>
      </div>
    )
  } else if (finished) {
    prompt = (
      <div className={styles.prompt}>
        <span className={styles.promptLabel} id={endId}>
          {endTitle(state)}
        </span>
        <button
          ref={playAgainRef}
          className={`${styles.play} ${styles.wide}`}
          type="button"
          aria-describedby={endId}
          onClick={onPlayAgain}
        >
          Play again
        </button>
      </div>
    )
  } else if (mode === 'click') {
    prompt = (
      <div className={styles.prompt}>
        <span className={styles.promptLabel}>Click on:</span>
        <div className={styles.promptRow}>
          <div className={styles.box} aria-live="polite" data-testid="prompt">
            <span
              className={styles.boxText}
              style={{ '--chars': currentName(state)?.length ?? 1 } as CSSProperties}
            >
              {currentName(state)}
            </span>
          </div>
          <button
            className={styles.link}
            type="button"
            disabled={paused || state.queue.length < 2}
            onClick={() => dispatch({ type: 'skip' })}
          >
            Skip
          </button>
        </div>
      </div>
    )
  } else if (mode === 'name') {
    prompt = (
      <div className={styles.prompt}>
        <label className={styles.promptLabel} htmlFor={inputId}>
          {fill(level.prompt?.name ?? `Name this ${level.one}:`)}
        </label>
        <div className={styles.promptRow}>
          <input
            ref={inputRef}
            id={inputId}
            className={`${styles.answer} ${styles.answerShort}`}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={state.typed}
            disabled={paused}
            onChange={(event) => dispatch({ type: 'type', text: event.target.value })}
          />
          <button
            className={styles.link}
            type="button"
            disabled={paused || state.queue.length < 2}
            onClick={() => {
              dispatch({ type: 'skip' })
              inputRef.current?.focus()
            }}
          >
            Skip
          </button>
        </div>
      </div>
    )
  } else {
    prompt = (
      <div className={styles.prompt}>
        <label className={styles.promptLabel} htmlFor={inputId}>
          {fill(level.prompt?.type ?? `Enter ${level.one}:`)}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          className={styles.answer}
          type="text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={state.typed}
          disabled={paused}
          onChange={(event) => dispatch({ type: 'type', text: event.target.value })}
        />
      </div>
    )
  }

  const lowOnTime = state.secondsLeft < 60 && !finished
  const inRound = phase === 'playing' || paused

  return (
    <div className={styles.top}>
      {prompt}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Score</span>
          <span className={styles.big} data-testid="score">
            {score(state)}/{total(state)}
          </span>
        </div>
        <button
          className={paused ? `${styles.icon} ${styles.resume}` : styles.icon}
          type="button"
          aria-label={paused ? 'Resume' : 'Pause'}
          disabled={!inRound}
          onClick={() => dispatch({ type: paused ? 'resume' : 'pause' })}
        >
          {paused ? (
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 2.5l9 5.5-9 5.5z" fill="currentColor" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M4.5 2.5v11M11.5 2.5v11"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Timer</span>
          <span
            className={lowOnTime ? `${styles.big} ${styles.low}` : styles.big}
            data-testid="timer"
          >
            {formatTime(state.secondsLeft)}
          </span>
          <button
            className={styles.link}
            type="button"
            disabled={!inRound}
            onClick={() => dispatch({ type: 'giveUp' })}
          >
            Give up
          </button>
        </div>
      </div>
    </div>
  )
}
