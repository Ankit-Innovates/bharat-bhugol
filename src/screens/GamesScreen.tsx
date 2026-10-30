import { GameTile, SoonTile } from '../components/GameTile'
import { GAMES, UPCOMING, type AtlasState, type GameId } from '../games'
import styles from './GamesScreen.module.css'

interface GamesScreenProps {
  atlases: Record<GameId, AtlasState>
}

/** The Games tab: a card for every game, then placeholders for the games to come. */
export default function GamesScreen({ atlases }: Readonly<GamesScreenProps>) {
  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>Games</h1>
      <p className={styles.lead}>
        {GAMES.length} games to play, and {UPCOMING.length} more on the way.
      </p>

      <ul className={styles.grid}>
        {GAMES.map((game, i) => (
          <GameTile key={game.id} game={game} atlas={atlases[game.id]} index={i} />
        ))}
        {UPCOMING.map((game, i) => (
          <SoonTile key={game.id} game={game} index={GAMES.length + i} />
        ))}
      </ul>
    </main>
  )
}
