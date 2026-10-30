import { useEffect, useState } from 'react'
import { GameTile } from '../components/GameTile'
import HeroDemo from '../components/HeroDemo'
import { GAMES, type AtlasState, type GameId } from '../games'
import { playsMotion } from '../motion'
import { PHOTOS, type PhotoInfo } from '../photos'
import styles from './HomeScreen.module.css'

// The word that changes in the title, one for each kind of game.
const TOPICS = ['map', 'states', 'rivers', 'monuments']
const TOPIC_MS = 2400

// The picture plays the States and UTs game, against that game's own clock.
const DEMO_SECONDS = GAMES.find((game) => game.id === 'india')?.levels[0].seconds ?? 0

interface HomeScreenProps {
  atlases: Record<GameId, AtlasState>
}

/**
 * The home page: a big title beside a round of the States game playing itself, then a card for
 * each game. Games to come are on the Games page.
 */
export default function HomeScreen({ atlases }: Readonly<HomeScreenProps>) {
  const india = atlases.india
  return (
    <main className={styles.home}>
      <div className={styles.content}>
        <section className={styles.hero}>
          <div className={styles.intro}>
            <h1 className={styles.title}>
              <span className="sr-only">Learn the map of India</span>
              <span aria-hidden="true">
                <span className={styles.line}>Learn the</span>
                <Topic />
                <span className={styles.line}>of India</span>
              </span>
            </h1>
            <p className={styles.lead}>
              Find every state, district, river and monument on a blank map, before the clock runs
              out.
            </p>
          </div>
          <HeroDemo atlas={india.status === 'ready' ? india.atlas : null} seconds={DEMO_SECONDS} />
        </section>

        <ul className={styles.tiles}>
          {GAMES.filter((game) => game.featured).map((game, i) => (
            <GameTile key={game.id} game={game} atlas={atlases[game.id]} index={i} />
          ))}
        </ul>
      </div>

      <footer className={styles.footer}>
        <details className={styles.credits}>
          <summary>Photo credits</summary>
          <ul>
            {Object.values(PHOTOS).map((photo: PhotoInfo) => (
              <li key={photo.id}>
                <a href={photo.source}>{photo.place}</a>: {photo.author},{' '}
                {photo.licenceUrl ? (
                  <a href={photo.licenceUrl} rel="license">
                    {photo.licence}
                  </a>
                ) : (
                  photo.licence
                )}
              </li>
            ))}
          </ul>
          <p>From Wikimedia Commons, resized for this site.</p>
        </details>
      </footer>
    </main>
  )
}

/** The title's middle word, changing every few seconds: map, states, rivers, monuments. */
function Topic() {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (!playsMotion()) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % TOPICS.length), TOPIC_MS)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <span className={styles.topic}>
      <span key={index} className={styles.word}>
        {TOPICS[index]}
      </span>
    </span>
  )
}
