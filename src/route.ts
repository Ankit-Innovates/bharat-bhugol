import { useEffect, useState } from 'react'
import type { Mode } from './game/types'
import { findGame, type GameId } from './games'

/** Which screen to show. It lives in the address's #hash, so links, Back and reloads all work. */
export type Route =
  | { screen: 'home' }
  | { screen: 'games' }
  | { screen: 'setup'; game: GameId }
  | { screen: 'play'; game: GameId; level: string; mode: Mode }

/**
 * '#/' → home, '#/games' → the list of games, '#/india' → setup, '#/mp/districts/type' → play.
 * Anything unknown goes home.
 */
export function parseRoute(hash: string): Route {
  const [gameId, levelId, mode, ...extra] = hash.replace(/^#\/?/, '').split('/')
  if (gameId === 'games' && levelId === undefined) return { screen: 'games' }
  const game = findGame(gameId)
  if (!game) return { screen: 'home' }
  const level = game.levels.find((l) => l.id === levelId)
  const playMode = game.modes.find((m) => m === mode)
  if (level && playMode && extra.length === 0) {
    return { screen: 'play', game: game.id, level: level.id, mode: playMode }
  }
  return { screen: 'setup', game: game.id }
}

export function hrefFor(route: Route): string {
  if (route.screen === 'home') return '#/'
  if (route.screen === 'games') return '#/games'
  if (route.screen === 'setup') return `#/${route.game}`
  return `#/${route.game}/${route.level}/${route.mode}`
}

/** The current route, kept in step with the address bar. */
export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))
  useEffect(() => {
    const update = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  return route
}
