import { describe, expect, it } from 'vitest'
import { hrefFor, parseRoute, type Route } from '../src/route'

describe('routes in the address hash', () => {
  it.each<[string, Route]>([
    ['', { screen: 'home' }],
    ['#/', { screen: 'home' }],
    ['#/narnia', { screen: 'home' }],
    ['#/games', { screen: 'games' }],
    ['#/games/india', { screen: 'home' }],
    ['#/india', { screen: 'setup', game: 'india' }],
    ['#/mp', { screen: 'setup', game: 'mp' }],
    ['#/rivers', { screen: 'setup', game: 'rivers' }],
    ['#/rivers/major/name', { screen: 'play', game: 'rivers', level: 'major', mode: 'name' }],
    ['#/rivers/all/click', { screen: 'play', game: 'rivers', level: 'all', mode: 'click' }],
    ['#/india/states/name', { screen: 'setup', game: 'india' }], // India has no name mode
    ['#/architecture', { screen: 'setup', game: 'architecture' }],
    [
      '#/architecture/places/name',
      { screen: 'play', game: 'architecture', level: 'places', mode: 'name' },
    ],
    ['#/architecture/places/click', { screen: 'setup', game: 'architecture' }], // name mode only
    ['#/india/states/click', { screen: 'play', game: 'india', level: 'states', mode: 'click' }],
    ['#/mp/districts/type', { screen: 'play', game: 'mp', level: 'districts', mode: 'type' }],
    ['#/mp/states/type', { screen: 'setup', game: 'mp' }], // no such level in MP
    ['#/mp/districts/fly', { screen: 'setup', game: 'mp' }],
    ['#/mp/districts/type/extra', { screen: 'setup', game: 'mp' }],
  ])('%j → %j', (hash, route) => {
    expect(parseRoute(hash)).toEqual(route)
  })

  it('writes every route back to the same hash', () => {
    for (const hash of [
      '#/',
      '#/games',
      '#/rivers',
      '#/rivers/all/name',
      '#/architecture',
      '#/architecture/monuments/name',
      '#/india',
      '#/mp',
      '#/india/states/type',
      '#/mp/divisions/click',
    ]) {
      expect(hrefFor(parseRoute(hash))).toBe(hash)
    }
  })
})
