import { useEffect, useState, type ReactNode } from 'react'
import SiteHeader, { type Section } from './components/SiteHeader'
import type { Mode } from './game/types'
import { GAMES, findGame, roundName, type AtlasState, type GameId } from './games'
import { hrefFor, useRoute, type Route } from './route'
import GameScreen from './screens/GameScreen'
import GamesScreen from './screens/GamesScreen'
import HomeScreen from './screens/HomeScreen'
import SetupScreen from './screens/SetupScreen'
import styles from './App.module.css'

const SITE = 'Bharat Bhugol'

interface Choice {
  level: string
  mode: Mode
}

export default function App() {
  const route = useRoute()
  const atlases = useAtlases()
  // The level and mode last chosen for each game, so Change mode keeps them.
  const [choices, setChoices] = useState<Record<GameId, Choice>>({
    india: { level: 'states', mode: 'click' },
    capitals: { level: 'states', mode: 'name' },
    mp: { level: 'divisions', mode: 'click' },
    rivers: { level: 'major', mode: 'name' },
    dams: { level: 'major', mode: 'name' },
    architecture: { level: 'monuments', mode: 'name' },
    quiz: { level: 'all', mode: 'type' },
  })

  useEffect(() => {
    document.title = titleOf(route)
    window.scrollTo({ top: 0 })
  }, [route])

  const current: Section =
    route.screen === 'home' ? 'home' : route.screen === 'games' ? 'games' : 'game'
  return (
    <div className={styles.app}>
      <SiteHeader current={current} />
      <Screen route={route} atlases={atlases} choices={choices} setChoices={setChoices} />
    </div>
  )
}

interface ScreenProps {
  route: Route
  atlases: Record<GameId, AtlasState>
  choices: Record<GameId, Choice>
  setChoices: (update: (all: Record<GameId, Choice>) => Record<GameId, Choice>) => void
}

function Screen({ route, atlases, choices, setChoices }: Readonly<ScreenProps>): ReactNode {
  if (route.screen === 'home') return <HomeScreen atlases={atlases} />
  if (route.screen === 'games') return <GamesScreen atlases={atlases} />

  const game = findGame(route.game)
  const loaded = atlases[route.game]
  if (!game || loaded.status === 'loading') {
    return (
      <main className={styles.status}>
        <p>Loading the map…</p>
      </main>
    )
  }
  if (loaded.status === 'error') {
    return (
      <main className={styles.status}>
        <p role="alert">Sorry, the map could not be loaded. {loaded.message}</p>
        <p>
          <a href="#/">← All maps</a>
        </p>
      </main>
    )
  }

  if (route.screen === 'setup') {
    const choice = choices[game.id]
    return (
      <SetupScreen
        key={game.id}
        game={game}
        atlas={loaded.atlas}
        level={choice.level}
        mode={choice.mode}
        onStart={(level, mode) => {
          setChoices((all) => ({ ...all, [game.id]: { level, mode } }))
          goTo(hrefFor({ screen: 'play', game: game.id, level, mode }))
        }}
      />
    )
  }

  const level = game.levels.find((l) => l.id === route.level) ?? game.levels[0]
  return (
    <GameScreen
      key={`${game.id}/${level.id}/${route.mode}`}
      board={loaded.atlas.boards[level.id]}
      level={level}
      mode={route.mode}
      title={roundName(game, level, route.mode)}
      setupHref={hrefFor({ screen: 'setup', game: game.id })}
      canChange={game.levels.length > 1 || game.modes.length > 1}
    />
  )
}

/** Loads every game's map at start-up, so the home page's pictures and the games are ready. */
function useAtlases(): Record<GameId, AtlasState> {
  const [atlases, setAtlases] = useState<Record<GameId, AtlasState>>({
    india: { status: 'loading' },
    capitals: { status: 'loading' },
    mp: { status: 'loading' },
    rivers: { status: 'loading' },
    dams: { status: 'loading' },
    architecture: { status: 'loading' },
    quiz: { status: 'loading' },
  })
  useEffect(() => {
    let cancelled = false
    for (const game of GAMES) {
      game.load().then(
        (atlas) => {
          if (!cancelled) setAtlases((all) => ({ ...all, [game.id]: { status: 'ready', atlas } }))
        },
        (error: unknown) => {
          const message = error instanceof Error ? error.message : String(error)
          if (!cancelled) setAtlases((all) => ({ ...all, [game.id]: { status: 'error', message } }))
        },
      )
    }
    return () => {
      cancelled = true
    }
  }, [])
  return atlases
}

/** Opens another screen, as following a link would. */
function goTo(hash: string) {
  window.location.hash = hash
}

function titleOf(route: Route): string {
  if (route.screen === 'home') return `${SITE} · Geography games`
  if (route.screen === 'games') return `Games · ${SITE}`
  const game = findGame(route.game)
  return game ? `${game.name} · ${SITE}` : SITE
}
