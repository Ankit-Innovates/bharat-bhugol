import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { CAPITALS } from '../src/data/capitals'
import { INDIA_QUIZ } from '../src/data/indiaQuiz'

interface Region {
  name: string
  lx: number
  ly: number
}
interface Size {
  w: number
  h: number
}

const read = <T>(file: string): T => JSON.parse(readFileSync(resolve(file), 'utf8')) as T
const mp = read<Size & { divisions: Region[]; districts: Region[] }>('public/mp-map.json')
const india = read<Size & { regions: Region[] }>('public/india-map.json')
const rivers = read<Size & { rivers: Array<Region & { major: boolean }> }>('public/rivers-map.json')
const majorRivers = rivers.rivers.filter((r) => r.major)
const monuments = read<{
  monuments: Array<{ name: string; city: string; state: string }>
}>('public/monuments-map.json').monuments

/** The monument whose photo is showing: its file is named by its number in the data. */
async function shownMonument(page: Page) {
  const src = await page.getByTestId('photo-card').locator('img').first().getAttribute('src')
  const number = Number(/arch-(\d+)-/.exec(src ?? '')?.[1])
  return monuments[number - 1]
}

/** From a game's setup screen to a running round: choose, Start, then Play game. */
async function startGame(
  page: Page,
  game: 'mp' | 'india' | 'rivers' | 'capitals' | 'dams',
  mode: 'Click on map' | 'Type names' | 'Name it',
  level?:
    | 'Divisions'
    | 'Districts'
    | 'Major rivers'
    | 'All rivers'
    | 'States'
    | 'States & UTs'
    | 'Major dams'
    | 'All dams',
) {
  await page.goto(`./#/${game}`)
  if (level) await page.getByRole('button', { name: level, exact: true }).click()
  await page.getByRole('button', { name: mode, exact: true }).click()
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: 'Play game' }).click()
}

/** The on-screen position of a region's label point, from the SVG's bounding box. */
async function labelPoint(page: Page, size: Size, region: Region): Promise<[number, number]> {
  const box = await page.getByRole('img', { name: /Blank map of/ }).boundingBox()
  if (!box) throw new Error('The map is not on screen.')
  return [box.x + (region.lx / size.w) * box.width, box.y + (region.ly / size.h) * box.height]
}

async function clickRegion(page: Page, size: Size, region: Region) {
  const [x, y] = await labelPoint(page, size, region)
  await page.mouse.click(x, y)
}

/** What is drawn at a region's label point: a map region, or something covering it. */
async function whatIsAt(page: Page, region: Region): Promise<string> {
  const point = await labelPoint(page, mp, region)
  return page.evaluate(([x, y]) => {
    const hit = document.elementFromPoint(x, y)
    return hit?.closest('[data-region]')?.getAttribute('data-region') ?? 'covered'
  }, point)
}

function named(regions: Region[], name: string): Region {
  const region = regions.find((r) => r.name === name)
  if (!region) throw new Error(`The game asked for an unknown region: "${name}"`)
  return region
}

/** Clicks whatever the game asks for until the round ends. */
async function findAll(page: Page, size: Size, regions: Region[]) {
  const prompt = page.getByTestId('prompt')
  for (let i = 1; i <= regions.length; i += 1) {
    await clickRegion(page, size, named(regions, (await prompt.textContent()) ?? ''))
    await expect(page.getByTestId('score')).toHaveText(`${i}/${regions.length}`)
  }
}

test('The home page offers the games as cards; the Games page adds those to come', async ({
  page,
}) => {
  await page.goto('./')
  await expect(page).toHaveTitle('Bharat Bhugol · Geography games')
  await expect(page.getByRole('link', { name: 'Bharat Bhugol' })).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Learn the map of India' }),
  ).toBeVisible()
  // The home page shows the featured games; the rest are on the Games page.
  const cards = page.getByRole('main')
  await expect(
    cards.getByRole('link', { name: 'States and UTs of India', exact: true }),
  ).toBeVisible()
  await expect(cards.getByRole('link', { name: 'State capitals', exact: true })).toBeVisible()
  await expect(
    cards.getByRole('link', { name: 'Districts/Divisions of MP', exact: true }),
  ).toHaveCount(0)
  await expect(cards.getByText('Coming soon', { exact: true })).toHaveCount(0)

  await cards.getByRole('link', { name: 'State capitals', exact: true }).click()
  await expect(page).toHaveURL(/#\/capitals$/)
  await expect(page.getByRole('heading', { level: 1, name: 'State capitals' })).toBeVisible()
  await page.goBack()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Learn the map of India' }),
  ).toBeVisible()
  // The Games tab lists every game, and Home goes back, from any screen.
  const nav = page.getByRole('navigation', { name: 'Main' })
  await nav.getByRole('link', { name: 'Games' }).click()
  await expect(page).toHaveURL(/#\/games$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Games' })).toBeVisible()
  await expect(page.getByRole('main').getByText('Coming soon', { exact: true })).toHaveCount(3)
  await page
    .getByRole('main')
    .getByRole('link', { name: 'Districts/Divisions of MP', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Districts/Divisions of MP' }),
  ).toBeVisible()
  await nav.getByRole('link', { name: 'Games' }).click()
  await page.getByRole('main').getByRole('link', { name: 'Rivers of India' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Rivers of India' })).toBeVisible()
  await nav.getByRole('link', { name: 'Home' }).click()
  await expect(page).toHaveURL(/#\/$/)
})

test('The home page shows photos of monuments, each one credited', async ({ page }) => {
  await page.goto('./')
  const photos = page.locator('img')
  // Three on the Famous architecture card, and one beside the game window at the top.
  await expect(photos).toHaveCount(4)
  // Every photo must load from the built site, the lazy ones too once scrolled to.
  for (const photo of await photos.all()) {
    await photo.scrollIntoViewIfNeeded()
    await expect
      .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0)
  }

  await page.getByText('Photo credits').click()
  // One for each monument: the game shows them all.
  await expect(page.locator('footer li')).toHaveCount(monuments.length)
  await expect(page.getByRole('link', { name: 'Taj Mahal, Agra' })).toBeVisible()
})

test('India · Click: clicking each asked state or UT at its label point finds all 36', async ({
  page,
}) => {
  await startGame(page, 'india', 'Click on map')
  await findAll(page, india, india.regions)
  const popup = page.getByRole('dialog', { name: 'You won!' })
  await expect(popup).toContainText(/You found all 36 states and UTs with \d\d:\d\d left\./)
})

test('India · Type: typing every state and UT, short spellings included, wins', async ({
  page,
}) => {
  await startGame(page, 'india', 'Type names')
  const box = page.getByLabel('Enter state or UT:')
  await expect(box).toBeFocused()
  for (const region of india.regions) {
    await page.keyboard.type(region.name)
    // Long names are accepted at a shorter spelling ("Andaman and Nicobar"); the rest typed after
    // it must not be left behind in the box.
    if (region !== india.regions.at(-1)) await expect(box).toHaveValue('')
  }
  await expect(page.getByRole('dialog', { name: 'You won!' })).toContainText('all 36 states')
})

test('Rivers · Name it: naming each river as it lights up names all 15 major rivers', async ({
  page,
}) => {
  await startGame(page, 'rivers', 'Name it', 'Major rivers')
  await expect(page.getByLabel('Name this river:')).toBeFocused()
  for (let i = 1; i <= majorRivers.length; i += 1) {
    const name = await page.locator('[data-current]').getAttribute('data-line')
    await page.keyboard.type(name ?? '')
    await expect(page.getByTestId('score')).toHaveText(`${i}/${majorRivers.length}`)
  }
  const popup = page.getByRole('dialog', { name: 'You won!' })
  await expect(popup).toContainText(/You named all 15 rivers with \d\d:\d\d left\./)
})

test('Rivers · Click: clicking each asked river on its line finds all 15', async ({ page }) => {
  await startGame(page, 'rivers', 'Click on map', 'Major rivers')
  await findAll(page, rivers, majorRivers)
  await expect(page.getByRole('dialog', { name: 'You won!' })).toContainText('all 15 rivers')
})

test('Rivers · All rivers: at the end every name is readable, none covering another', async ({
  page,
}) => {
  await startGame(page, 'rivers', 'Type names', 'All rivers')
  await page.getByRole('button', { name: 'Give up' }).click()
  await page.getByRole('button', { name: 'See answers' }).click()
  const labels = page.locator('[data-label]')
  await expect(labels).toHaveCount(rivers.rivers.length)
  const overlaps = () =>
    labels.evaluateAll((els) => {
      const boxes = els.map((el) => el.getBoundingClientRect())
      return boxes.flatMap((a, i) =>
        boxes
          .slice(i + 1)
          .filter(
            (b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom,
          )
          .map(() => i),
      ).length
    })
  await expect.poll(overlaps).toBe(0)
})

test('Famous architecture · naming each monument from its photo names all 21', async ({ page }) => {
  await page.goto('./#/architecture')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: 'Play game' }).click()
  await expect(page.getByLabel('Name this monument:')).toBeFocused()
  for (let i = 1; i <= monuments.length; i += 1) {
    await page.keyboard.type((await shownMonument(page)).name)
    await expect(page.getByTestId('score')).toHaveText(`${i}/${monuments.length}`)
  }
  await expect(page.getByRole('dialog', { name: 'You won!' })).toContainText('all 21 monuments')
  await page.getByRole('button', { name: 'See the map' }).click()
  await expect(page.locator('[data-point]')).toHaveCount(monuments.length)
  await expect(page.locator('[data-label]')).toHaveCount(monuments.length)
})

test('Famous architecture · Name the place: a city or a state counts', async ({ page }) => {
  await page.goto('./#/architecture')
  await page.getByRole('button', { name: /^Name the place/ }).click()
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: 'Play game' }).click()
  await expect(page.getByLabel('Where is it? City or state:')).toBeFocused()
  for (let i = 1; i <= monuments.length; i += 1) {
    const monument = await shownMonument(page)
    // The name is shown with the photo; the answer is where it is.
    await expect(page.getByTestId('photo-card')).toContainText(monument.name)
    await page.keyboard.type(i % 2 ? monument.city : monument.state)
    await expect(page.getByTestId('score')).toHaveText(`${i}/${monuments.length}`)
  }
  await expect(page.getByRole('dialog', { name: 'You won!' })).toBeVisible()
})

test('State capitals · Type: typing the capital of every state wins', async ({ page }) => {
  const states = read<{ regions: Array<{ name: string; kind: string }> }>(
    'public/india-map.json',
  ).regions.filter((r) => r.kind === 'state')
  await startGame(page, 'capitals', 'Type names', 'States')
  await expect(page.getByLabel('Enter capital:')).toBeFocused()
  for (const [i, state] of states.entries()) {
    await page.keyboard.type(CAPITALS[state.name].capital)
    await expect(page.getByTestId('score')).toHaveText(`${i + 1}/28`)
  }
  await expect(page.getByRole('dialog', { name: 'You won!' })).toContainText('all 28 capitals')
})

test('Dams of India · Click: clicking each asked dam on the map finds all 12 major dams', async ({
  page,
}) => {
  await startGame(page, 'dams', 'Click on map', 'Major dams')
  for (let i = 1; i <= 12; i += 1) {
    const asked = await page.getByTestId('prompt').textContent()
    // The click lands on the map at the dam's dot; the nearest open dam takes it.
    await page.locator(`[data-point="${asked}"]`).click({ force: true })
    await expect(page.getByTestId('score')).toHaveText(`${i}/12`)
  }
  await expect(page.getByRole('dialog', { name: 'You won!' })).toContainText('all 12 dams')
})

test('The India Quiz · typing every answer, in the order of the clues, wins', async ({ page }) => {
  await page.goto('./#/quiz')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: 'Play game' }).click()
  await expect(page.getByLabel('Type an answer:')).toBeFocused()
  for (const [i, fact] of INDIA_QUIZ.entries()) {
    await page.keyboard.type(fact.answer)
    await expect(page.getByTestId('score')).toHaveText(`${i + 1}/${INDIA_QUIZ.length}`)
  }
  await expect(page.getByRole('dialog', { name: 'You won!' })).toContainText('all 51 answers')
})

test('Divisions · Click: clicking each asked region at its label point finds all 10', async ({
  page,
}) => {
  await startGame(page, 'mp', 'Click on map', 'Divisions')
  await findAll(page, mp, mp.divisions)

  // A perfect round pops up a "You won!" celebration.
  const popup = page.getByRole('dialog', { name: 'You won!' })
  await expect(popup).toBeVisible()
  await expect(popup).toContainText(/You found all 10 divisions with \d\d:\d\d left\./)
  await popup.getByRole('button', { name: 'See the map' }).click()
  await expect(popup).toHaveCount(0)
  await expect(page.getByText('Finished!')).toBeVisible()
})

test('A wrong click flashes red and never shows the name of the region clicked', async ({
  page,
}) => {
  await page.clock.install()
  await startGame(page, 'mp', 'Click on map', 'Divisions')
  const asked = (await page.getByTestId('prompt').textContent()) ?? ''
  const wrong = mp.divisions.find((r) => r.name !== asked)
  if (!wrong) throw new Error('no other division to click')

  await clickRegion(page, mp, wrong)
  const path = page.locator(`[data-region="${wrong.name}"]`)
  await expect(path).toHaveCSS('fill', 'rgb(217, 45, 32)')
  await expect(page.locator('[data-label]')).toHaveCount(0)
  await expect(page.getByTestId('announcer')).toHaveText('Wrong — try again')
  await expect(page.getByTestId('prompt')).toHaveText(asked)

  await page.clock.runFor(1000)
  await expect(path).not.toHaveCSS('fill', 'rgb(217, 45, 32)')

  // No limit on tries: more wrong clicks never move on or reveal the answer.
  for (let i = 0; i < 4; i += 1) await clickRegion(page, mp, wrong)
  await expect(page.getByTestId('prompt')).toHaveText(asked)
  await expect(page.locator('[data-label]')).toHaveCount(0)
  await expect(page.getByTestId('score')).toHaveText('0/10')
})

test('Divisions · Type: typing all 10 names ends the round without pressing Enter', async ({
  page,
}) => {
  await startGame(page, 'mp', 'Type names', 'Divisions')
  await expect(page.getByLabel('Enter division:')).toBeFocused()
  for (const region of mp.divisions) await page.keyboard.type(region.name)

  // The win popup takes focus on its title, so keys typed on after the last answer (a space, Enter)
  // press none of its buttons; Esc closes it.
  const popup = page.getByRole('dialog', { name: 'You won!' })
  await expect(popup.getByRole('heading', { name: 'You won!' })).toBeFocused()
  await page.keyboard.press('Space')
  await page.keyboard.press('Enter')
  await expect(popup).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(popup.getByRole('button', { name: 'Play again' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(popup).toHaveCount(0)
  await expect(page.getByText('Finished!')).toBeVisible()
  await expect(page.getByTestId('score')).toHaveText('10/10')
  await expect(page.getByRole('button', { name: 'Play again' })).toBeFocused()
})

test('Districts · Type: turning Answer locations off hides every ? marker', async ({ page }) => {
  await startGame(page, 'mp', 'Type names', 'Districts')
  const markers = page.locator('[data-marker]')
  await expect(markers).toHaveCount(55)
  const toggle = page.getByRole('switch', { name: 'Answer locations' })
  await expect(toggle).toBeChecked()
  await page.getByText('Answer locations').click()
  await expect(toggle).not.toBeChecked()
  await expect(markers).toHaveCount(0)
})

test('Pause hides the map; Resume shows it again with the timer unchanged', async ({ page }) => {
  await page.clock.install()
  await startGame(page, 'mp', 'Click on map', 'Divisions') // Play game starts the clock
  const timer = page.getByTestId('timer')
  const asked = named(mp.divisions, (await page.getByTestId('prompt').textContent()) ?? '')
  await page.clock.runFor(3000)
  await expect(timer).toHaveText('04:57')
  expect(await whatIsAt(page, asked)).toBe(asked.name)

  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByTestId('paused')).toContainText('Paused')
  expect(await whatIsAt(page, asked)).toBe('covered')
  await page.clock.runFor(5000)
  await expect(timer).toHaveText('04:57')

  // Only the top bar's button resumes; the grey cover has no button of its own.
  await expect(page.getByTestId('paused').getByRole('button')).toHaveCount(0)
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(page.getByTestId('paused')).toHaveCount(0)
  await expect(timer).toHaveText('04:57')
  expect(await whatIsAt(page, asked)).toBe(asked.name)
  await page.clock.runFor(1000)
  await expect(timer).toHaveText('04:56')
})

test('Losing shows a popup first; the answers appear only after it is closed', async ({ page }) => {
  await startGame(page, 'mp', 'Type names', 'Districts')
  await page.keyboard.type('Bhopal')
  await expect(page.getByTestId('score')).toHaveText('1/55')
  await page.getByRole('button', { name: 'Give up' }).click()

  const popup = page.getByRole('dialog', { name: 'You lost' })
  await expect(popup).toBeVisible()
  await expect(popup).toContainText('You gave up with 54 districts still to name.')
  await expect(page.locator('[data-label="missed"]')).toHaveCount(0)

  await popup.getByRole('button', { name: 'See answers' }).click()
  await expect(popup).toHaveCount(0)
  await expect(page.locator('[data-label="missed"]')).toHaveCount(54)
  await expect(page.getByRole('button', { name: 'Play again' })).toBeFocused()
})
