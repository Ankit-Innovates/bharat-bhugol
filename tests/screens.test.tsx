// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import { CAPITALS } from '../src/data/capitals'
import { findGame, UPCOMING, type Game } from '../src/games'
import SetupScreen from '../src/screens/SetupScreen'
import { fakeFetch, india, monuments } from './fixtures'

function game(id: string): Game {
  const found = findGame(id)
  if (!found) throw new Error(`no game ${id}`)
  return found
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(fakeFetch))
  vi.stubGlobal('scrollTo', vi.fn())
  window.location.hash = ''
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('SetupScreen', () => {
  it('starts the chosen level and mode, with counts taken from the map data', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    const mp = game('mp')
    render(
      <SetupScreen
        game={mp}
        atlas={await mp.load()}
        level="divisions"
        mode="click"
        onStart={onStart}
      />,
    )

    const divisions = screen.getByRole('button', { name: 'Divisions' })
    const districts = screen.getByRole('button', { name: 'Districts' })
    // Each level says how many places it has, counted from the data, and its time limit.
    expect(districts).toHaveAccessibleDescription('55 districts · 5 min')
    expect(divisions).toHaveAttribute('aria-pressed', 'true')
    expect(districts).toHaveAttribute('aria-pressed', 'false')

    await user.click(districts)
    await user.click(screen.getByRole('button', { name: 'Type names' }))
    expect(districts).toHaveAttribute('aria-pressed', 'true')
    expect(divisions).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(onStart).toHaveBeenCalledExactlyOnceWith('districts', 'type')
  })

  it('asks only for the mode when a game has one level', async () => {
    const indiaGame = game('india')
    render(
      <SetupScreen
        game={indiaGame}
        atlas={await indiaGame.load()}
        level="states"
        mode="click"
        onStart={vi.fn()}
      />,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'States and UTs of India' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Level' })).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Mode' })).toBeInTheDocument()
  })
})

describe('App', () => {
  it('goes from the home page into the India game', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Learn the map of India' })).toBeVisible()
    // Just the title and a card for each game; the games to come are only on the Games page.
    expect(
      screen
        .getAllByRole('heading', { level: 2 })
        .map((card) => within(card).getByRole('link').getAttribute('href')),
    ).toEqual(['#/india', '#/capitals', '#/rivers', '#/architecture', '#/quiz'])
    expect(screen.queryByRole('link', { name: 'Play now' })).not.toBeInTheDocument()
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument()

    await user.click(
      within(screen.getByRole('main')).getByRole('link', { name: 'States and UTs of India' }),
    )
    expect(
      await screen.findByRole('heading', { level: 1, name: 'States and UTs of India' }),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Type names' }))
    await user.click(screen.getByRole('button', { name: 'Start' }))

    const playGame = await screen.findByRole('button', { name: 'Play game' })
    expect(window.location.hash).toBe('#/india/states/type')
    expect(playGame).toHaveFocus()
    expect(screen.getByText('States & UTs · Type names')).toBeInTheDocument()
    expect(screen.getByTestId('score')).toHaveTextContent('0/36')
    expect(screen.getByTestId('timer')).toHaveTextContent('04:00')
    expect(document.querySelectorAll('[data-marker]')).toHaveLength(36)
    expect(document.querySelectorAll('[data-ring]')).toHaveLength(
      india.regions.filter((r) => r.small).length,
    )

    await user.click(playGame)
    expect(screen.getByLabelText('Enter state or UT:')).toHaveFocus()
    expect(screen.getByRole('link', { name: '← Change mode' })).toHaveAttribute('href', '#/india')
  })

  it('opens Madhya Pradesh at the chosen level and mode', async () => {
    window.location.hash = '#/mp'
    const user = userEvent.setup()
    render(<App />)

    // The long name may wrap after its slash, rather than run off a phone's screen.
    const title = await screen.findByRole('heading', {
      level: 1,
      name: 'Districts/Divisions of MP',
    })
    expect(title.querySelector('wbr')).not.toBeNull()

    await user.click(await screen.findByRole('button', { name: 'Districts' }))
    await user.click(screen.getByRole('button', { name: 'Type names' }))
    await user.click(screen.getByRole('button', { name: 'Start' }))

    expect(await screen.findByRole('button', { name: 'Play game' })).toHaveFocus()
    expect(screen.getByText('Districts · Type names')).toBeInTheDocument()
    expect(screen.getByTestId('score')).toHaveTextContent('0/55')
    expect(screen.getByTestId('timer')).toHaveTextContent('05:00')
    expect(screen.getByRole('button', { name: 'Give up' })).toBeDisabled()
  })

  it('has two tabs: Home, and Games, a page that lists every game', async () => {
    const user = userEvent.setup()
    render(<App />)
    const nav = within(screen.getByRole('navigation', { name: 'Main' }))
    expect(nav.getAllByRole('link').map((link) => link.textContent)).toEqual(['Home', 'Games'])
    expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')

    await user.click(nav.getByRole('link', { name: 'Games' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Games' })).toBeVisible()
    expect(window.location.hash).toBe('#/games')
    expect(document.title).toBe('Games · Bharat Bhugol')
    expect(nav.getByRole('link', { name: 'Games' })).toHaveAttribute('aria-current', 'page')
    expect(nav.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')

    // Every game, each card a link to it; then the games to come, with no link.
    expect(
      within(screen.getByRole('main'))
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['States and UTs of India', '#/india'],
      ['State capitals', '#/capitals'],
      ['Districts/Divisions of MP', '#/mp'],
      ['Rivers of India', '#/rivers'],
      ['Dams of India', '#/dams'],
      ['Famous architecture', '#/architecture'],
      ['The India Quiz', '#/quiz'],
    ])
    expect(screen.getAllByText('Coming soon')).toHaveLength(UPCOMING.length)
    for (const soon of UPCOMING) {
      expect(screen.getByRole('heading', { level: 2, name: soon.name })).toBeInTheDocument()
    }

    await user.click(
      within(screen.getByRole('main')).getByRole('link', { name: 'Districts/Divisions of MP' }),
    )
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Districts/Divisions of MP' }),
    ).toBeVisible()
    expect(nav.getByRole('link', { name: 'Games' })).not.toHaveAttribute('aria-current')
  })

  it('plays Rivers of India by naming each river as it lights up', async () => {
    window.location.hash = '#/rivers'
    const user = userEvent.setup()
    render(<App />)

    // Two levels, counted from the data, and three modes, Name it first.
    const major = await screen.findByRole('button', { name: 'Major rivers' })
    expect(major).toHaveAttribute('aria-pressed', 'true')
    expect(major).toHaveAccessibleDescription('15 rivers · 2 min')
    const modes = within(screen.getByRole('group', { name: 'Mode' })).getAllByRole('button')
    expect(modes).toHaveLength(3)
    for (const [i, name] of ['Name it', 'Click on map', 'Type names'].entries()) {
      expect(modes[i]).toHaveAccessibleName(name)
    }
    expect(modes[0]).toHaveAttribute('aria-pressed', 'true')

    // The picture shows the time limit of the level chosen.
    expect(screen.getByText('2 min')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'All rivers' }))
    expect(screen.getByText('4 min')).toBeInTheDocument()
    await user.click(major)

    await user.click(screen.getByRole('button', { name: 'Start' }))
    await user.click(await screen.findByRole('button', { name: 'Play game' }))
    expect(window.location.hash).toBe('#/rivers/major/name')
    expect(screen.getByRole('img', { name: 'Blank map of India with 15 rivers' })).toBeVisible()
    expect(document.querySelectorAll('[data-line]')).toHaveLength(15)

    // One river is lit; naming it lights the next.
    const box = screen.getByLabelText('Name this river:')
    expect(box).toHaveFocus()
    const lit = () => document.querySelector('[data-current]')?.getAttribute('data-line') ?? ''
    const first = lit()
    expect(first).not.toBe('')
    await user.type(box, first)
    expect(screen.getByTestId('score')).toHaveTextContent('1/15')
    expect(lit()).not.toBe(first)
    expect(box).toHaveValue('')

    // Skip passes over a river without naming it.
    const second = lit()
    await user.click(screen.getByRole('button', { name: 'Skip' }))
    expect(lit()).not.toBe(second)
    expect(box).toHaveFocus()
  })

  it('plays Famous architecture by naming each monument from its photo', async () => {
    window.location.hash = '#/architecture'
    const user = userEvent.setup()
    render(<App />)

    // Two levels and a single mode, so there is no mode to choose.
    expect(await screen.findByRole('button', { name: 'Name the monument' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Name the place' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Mode' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Start' }))
    // With one mode, the round is called by its level alone.
    expect(screen.getByText('Name the monument', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('The first photo appears when you press Play game.')).toBeVisible()
    await user.click(await screen.findByRole('button', { name: 'Play game' }))
    expect(window.location.hash).toBe('#/architecture/monuments/name')

    // The photo's file is named by the monument's number in the data, never by its name.
    const shown = () => {
      const src = within(screen.getByTestId('photo-card')).getAllByRole('presentation')[0]
      const number = Number(/arch-(\d+)-/.exec(src.getAttribute('src') ?? '')?.[1])
      return monuments.monuments[number - 1].name
    }
    const first = shown()
    // Just the photo: no map that would show where the monument is.
    expect(screen.queryByRole('img', { name: /map/ })).not.toBeInTheDocument()
    const box = screen.getByLabelText('Name this monument:')
    expect(box).toHaveFocus()
    await user.type(box, first)
    expect(screen.getByTestId('score')).toHaveTextContent('1/21')
    expect(shown()).not.toBe(first)
  })

  it('plays State capitals by naming the capital of each state as it lights up', async () => {
    window.location.hash = '#/capitals'
    const user = userEvent.setup()
    render(<App />)

    // Two levels and two modes; Name it first.
    expect(await screen.findByRole('button', { name: 'States' })).toHaveAccessibleDescription(
      '28 capitals · 3 min',
    )
    expect(screen.getByRole('button', { name: 'States & UTs' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Name it' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Start' }))
    await user.click(await screen.findByRole('button', { name: 'Play game' }))
    expect(window.location.hash).toBe('#/capitals/states/name')

    // The prompt names the state lit up; its capital answers it.
    const box = screen.getByLabelText(/^Capital of .+:$/)
    expect(box).toHaveFocus()
    const prompt = screen.getByText(/^Capital of .+:$/).textContent ?? ''
    const state = /^Capital of (.+):$/.exec(prompt)?.[1] ?? ''
    expect(CAPITALS[state]).toBeDefined()
    await user.type(box, CAPITALS[state].capital)
    expect(screen.getByTestId('score')).toHaveTextContent('1/28')
    expect(screen.getByText(/^Capital of .+:$/).textContent).not.toBe(prompt)
  })

  it('plays The India Quiz by typing answers to its clues, in any order', async () => {
    window.location.hash = '#/quiz'
    const user = userEvent.setup()
    render(<App />)

    // One level and one mode: nothing to choose, just Start.
    expect(await screen.findByRole('heading', { level: 1, name: 'The India Quiz' })).toBeVisible()
    expect(screen.queryByRole('group', { name: 'Level' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Mode' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start' }))
    await user.click(await screen.findByRole('button', { name: 'Play game' }))
    expect(window.location.hash).toBe('#/quiz/all/type')
    expect(screen.getByTestId('timer')).toHaveTextContent('06:00')

    // Three parts of clues, every answer slot open.
    const board = screen.getByTestId('quiz-board')
    expect(
      within(board)
        .getAllByRole('heading', { level: 2 })
        .map((h) => h.textContent),
    ).toEqual(['The nation', 'Land and water', 'People and places'])
    expect(board.querySelectorAll('[data-answer="open"]')).toHaveLength(51)

    const box = screen.getByLabelText('Type an answer:')
    expect(box).toHaveFocus()
    await user.type(box, 'New Delhi')
    expect(screen.getByTestId('score')).toHaveTextContent('1/51')
    expect(within(board).getByText('New Delhi')).toHaveAttribute('data-answer', 'found')

    // "Indian Ocean" also answers "Indian", the start of it.
    await user.type(box, 'Indian Ocean')
    expect(screen.getByTestId('score')).toHaveTextContent('3/51')
    expect(screen.queryByRole('switch')).not.toBeInTheDocument() // no map, so no answer markers
    expect(screen.getByRole('link', { name: '← Back' })).toHaveAttribute('href', '#/quiz')
  })

  it('shows a plain error instead of a game whose map fails its checks', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request) =>
        String(url).endsWith('india-map.json')
          ? new Response(JSON.stringify({ ...india, regions: india.regions.slice(1) }))
          : fakeFetch(url),
      ),
    )
    window.location.hash = '#/india'
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/expected 28 states and 8 union/)
    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← All maps' })).toBeInTheDocument()
  })
})
