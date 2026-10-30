import type { CSSProperties } from 'react'
import { timeLimit, type AtlasState, type Game, type UpcomingGame } from '../games'
import GameArt, { SoonArt } from './GameArt'
import GameName from './GameName'
import styles from './GameTile.module.css'

interface GameTileProps {
  game: Game
  atlas: AtlasState
  index: number // place in the list, so the cards rise in one after another
}

/** A game's card: a picture of the game with its time limit, and its name. The whole card is the link. */
export function GameTile({ game, atlas, index }: Readonly<GameTileProps>) {
  return (
    <li className={styles.tile} style={{ '--i': index } as CSSProperties}>
      <article className={styles.card}>
        <div className={styles.cover}>
          <GameArt game={game.id} atlas={atlas.status === 'ready' ? atlas.atlas : null} />
          {game.isNew && <span className={styles.new}>New</span>}
          <span className={styles.time}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="8" cy="8" r="6.2" />
              <path d="M8 4.6V8l2.3 1.6" />
            </svg>
            {timeLimit(game)}
          </span>
        </div>
        <div className={styles.body}>
          <h2 className={styles.title}>
            <a className={styles.link} href={`#/${game.id}`}>
              <GameName name={game.name} />
            </a>
          </h2>
          <span className={styles.arrow} aria-hidden="true">
            <svg viewBox="0 0 16 16">
              <path d="M3 8h9.5M8.5 3.5 13 8l-4.5 4.5" />
            </svg>
          </span>
        </div>
      </article>
    </li>
  )
}

/** A placeholder for a game still to come: its picture and name, and no link. */
export function SoonTile({ game, index }: Readonly<{ game: UpcomingGame; index: number }>) {
  return (
    <li className={styles.tile} style={{ '--i': index } as CSSProperties}>
      <article className={`${styles.card} ${styles.soon}`}>
        <div className={styles.cover}>
          <SoonArt icon={game.icon} />
          <span className={styles.badge}>Coming soon</span>
        </div>
        <div className={styles.body}>
          <h2 className={styles.title}>{game.name}</h2>
        </div>
      </article>
    </li>
  )
}
