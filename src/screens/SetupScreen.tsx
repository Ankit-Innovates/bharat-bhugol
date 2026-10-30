import { useId, useState, type ReactNode } from 'react'
import GameArt from '../components/GameArt'
import GameName from '../components/GameName'
import type { Mode } from '../game/types'
import { MODE_NAME, type Atlas, type Game } from '../games'
import styles from './SetupScreen.module.css'

// What each mode asks of you, in a few words.
const MODE_HINT: Record<Mode, string> = {
  click: 'Find each place on the map',
  type: 'Type every name, in any order',
  name: 'Name the place that lights up',
}

// A small drawing for each mode, on a 24 × 24 grid.
const MODE_ICON: Record<Mode, ReactNode> = {
  // A mouse pointer
  click: <path d="M6 3.5v15.2l4-3.9 2.9 6.2 2.9-1.3-2.9-6.1h5.6z" />,
  // A keyboard
  type: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14h8" />
    </>
  ),
  // A name tag
  name: (
    <>
      <path d="M3.5 12.4V4.5a1 1 0 0 1 1-1h7.9l8.4 8.4a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0z" />
      <circle cx="8.3" cy="8.3" r="1.4" />
    </>
  ),
}

interface SetupScreenProps {
  game: Game
  atlas: Atlas
  level: string // the level and mode chosen last time
  mode: Mode
  onStart: (level: string, mode: Mode) => void
}

/**
 * A game's own page: its picture, big, beside its name, a choice of level and mode, and Start.
 * The picture shows the chosen level's time limit.
 */
export default function SetupScreen({
  game,
  atlas,
  level,
  mode,
  onStart,
}: Readonly<SetupScreenProps>) {
  const [pickedLevel, setPickedLevel] = useState(level)
  const [pickedMode, setPickedMode] = useState(mode)
  const chosen = game.levels.find((l) => l.id === pickedLevel) ?? game.levels[0]

  return (
    <main className={styles.screen}>
      <a className={styles.back} href="#/games">
        <span aria-hidden="true">←</span> All games
      </a>

      <div className={styles.lobby}>
        <div className={styles.picture}>
          <GameArt game={game.id} atlas={atlas} large />
          <span className={styles.time}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="8" cy="8" r="6.2" />
              <path d="M8 4.6V8l2.3 1.6" />
            </svg>
            {chosen.seconds / 60} min
          </span>
        </div>

        <div className={styles.panel}>
          <div className={styles.titles}>
            <h1 className={styles.title}>
              <GameName name={game.name} />
            </h1>
            <p className={styles.subtitle}>{game.intro}</p>
          </div>

          {game.levels.length > 1 && (
            <Choice
              label="Level"
              value={pickedLevel}
              options={game.levels.map((l) => ({
                value: l.id,
                name: l.label,
                hint: `${atlas.boards[l.id].regions.length} ${l.many} · ${l.seconds / 60} min`,
              }))}
              onChange={setPickedLevel}
            />
          )}
          {game.modes.length > 1 && (
            <Choice
              label="Mode"
              value={pickedMode}
              options={game.modes.map((m) => ({
                value: m,
                name: MODE_NAME[m],
                hint: MODE_HINT[m],
                icon: MODE_ICON[m],
              }))}
              onChange={setPickedMode}
            />
          )}

          <button
            className={styles.start}
            type="button"
            onClick={() => onStart(pickedLevel, pickedMode)}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M5 3.2l8 4.8-8 4.8z" />
            </svg>
            Start
          </button>
        </div>
      </div>
    </main>
  )
}

interface ChoiceOption<T extends string> {
  value: T
  name: string // the button's name
  hint: string // a few words under it, read out as its description
  icon?: ReactNode
}

interface ChoiceProps<T extends string> {
  label: string
  value: T
  options: ReadonlyArray<ChoiceOption<T>>
  onChange: (value: T) => void
}

/** A row of option cards, one chosen at a time; the chosen one is aria-pressed. */
function Choice<T extends string>({ label, value, options, onChange }: Readonly<ChoiceProps<T>>) {
  const id = useId()
  return (
    <div className={styles.field}>
      <span className={styles.label} id={`${id}-label`}>
        {label}
      </span>
      <div
        className={
          options.some((option) => option.icon)
            ? `${styles.options} ${styles.withIcons}`
            : styles.options
        }
        role="group"
        aria-labelledby={`${id}-label`}
      >
        {options.map((option) => (
          <button
            key={option.value}
            className={styles.option}
            type="button"
            aria-pressed={option.value === value}
            aria-describedby={`${id}-${option.value}`}
            onClick={() => onChange(option.value)}
          >
            <span className={styles.optionInner}>
              {option.icon && (
                <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
                  {option.icon}
                </svg>
              )}
              <span className={styles.optionName}>{option.name}</span>
              <span className={styles.hint} id={`${id}-${option.value}`} aria-hidden="true">
                {option.hint}
              </span>
            </span>
            <svg className={styles.tick} viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 8.5l2.6 2.6L12 5.6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}
