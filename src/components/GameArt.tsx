import { useMemo, type CSSProperties, type ReactNode } from 'react'
import type { MapRegion } from '../game/types'
import type { Atlas, GameId, UpcomingGame } from '../games'
import { PHOTOS } from '../photos'
import { mosaic } from './mosaic'
import Photo from './Photo'
import styles from './GameArt.module.css'

interface GameArtProps {
  game: GameId
  atlas: Atlas | null // null while the map loads: the tinted background alone
  large?: boolean // the big picture on a game's own page, rather than a card's
}

/**
 * The picture on a game's card, made from the game itself: its own map coloured in, with a marker
 * as in play; for the monuments, their photos; for the quiz, a few of its clues.
 */
export default function GameArt({ game, atlas, large = false }: Readonly<GameArtProps>) {
  let picture: ReactNode = null
  if (game === 'architecture') picture = <Collage large={large} />
  else if (game === 'quiz') picture = <QuizSheet />
  else if (atlas && game === 'india') picture = <StatesArt atlas={atlas} />
  else if (atlas && game === 'mp') picture = <DistrictsArt atlas={atlas} />
  else if (atlas && game === 'rivers') picture = <RiversArt atlas={atlas} />
  else if (atlas && game === 'capitals') picture = <CapitalsArt atlas={atlas} />
  else if (atlas && game === 'dams') picture = <DamsArt atlas={atlas} />
  return (
    <div className={`${styles.art} ${styles[game]}`} aria-hidden="true">
      {picture}
    </div>
  )
}

/** The drawing on a card for a game still to come. */
export function SoonArt({ icon }: Readonly<{ icon: UpcomingGame['icon'] }>) {
  return (
    <div className={`${styles.art} ${styles.soon}`} aria-hidden="true">
      <svg className={styles.icon} viewBox="0 0 48 48">
        {ICONS[icon]}
      </svg>
    </div>
  )
}

/** A map sized to its box's height, with markers placed over it by the map's own coordinates. */
function MapBox({
  atlas,
  children,
  markers,
}: Readonly<{ atlas: Atlas; children: ReactNode; markers?: ReactNode }>) {
  return (
    <div className={styles.mapBox} style={{ '--ratio': atlas.w / atlas.h } as CSSProperties}>
      <svg viewBox={`0 0 ${atlas.w} ${atlas.h}`}>{children}</svg>
      {markers}
    </div>
  )
}

/** A "?" marker at a point of the map, as the game shows places still to answer. */
function Ask({ atlas, region }: Readonly<{ atlas: Atlas; region: MapRegion | undefined }>) {
  if (!region) return null
  const at: CSSProperties = {
    left: `${(region.lx / atlas.w) * 100}%`,
    top: `${(region.ly / atlas.h) * 100}%`,
  }
  return (
    <span className={styles.ask} style={at}>
      ?
    </span>
  )
}

function StatesArt({ atlas }: Readonly<{ atlas: Atlas }>) {
  const tints = useMemo(() => mosaic(atlas.borders), [atlas])
  return (
    <MapBox
      atlas={atlas}
      markers={
        <Ask atlas={atlas} region={atlas.borders.find((r) => r.name === 'Madhya Pradesh')} />
      }
    >
      {atlas.borders.map((region) => (
        <path key={region.name} className={styles[`t${tints.get(region.name)}`]} d={region.d} />
      ))}
      <path className={styles.edge} d={atlas.silhouette} />
    </MapBox>
  )
}

function DistrictsArt({ atlas }: Readonly<{ atlas: Atlas }>) {
  const board = atlas.boards.districts
  const tints = useMemo(() => mosaic(board.regions), [board])
  return (
    <MapBox
      atlas={atlas}
      markers={<Ask atlas={atlas} region={board.regions.find((r) => r.name === 'Sagar')} />}
    >
      {board.regions.map((region) => (
        <path key={region.name} className={styles[`t${tints.get(region.name)}`]} d={region.d} />
      ))}
      {board.overlay.map((division) => (
        <path key={division.name} className={styles.division} d={division.d} />
      ))}
      <path className={styles.edge} d={atlas.silhouette} />
    </MapBox>
  )
}

// On the capitals card: three states with their capitals shown, and one lit up to be answered.
const CAPITALS_SHOWN = new Set(['Rajasthan', 'West Bengal', 'Karnataka'])
const CAPITAL_ASKED = 'Madhya Pradesh'

function CapitalsArt({ atlas }: Readonly<{ atlas: Atlas }>) {
  const at = (region: MapRegion): CSSProperties => ({
    left: `${(region.lx / atlas.w) * 100}%`,
    top: `${(region.ly / atlas.h) * 100}%`,
  })
  return (
    <MapBox
      atlas={atlas}
      markers={
        <>
          {atlas.borders
            .filter((region) => CAPITALS_SHOWN.has(region.name))
            .map((region) => (
              <span key={region.name} className={styles.capital} style={at(region)}>
                ★ {region.short}
              </span>
            ))}
          <Ask atlas={atlas} region={atlas.borders.find((r) => r.name === CAPITAL_ASKED)} />
        </>
      }
    >
      {atlas.borders.map((region) => {
        let tone = styles.capitalLand
        if (CAPITALS_SHOWN.has(region.name)) tone = styles.capitalShown
        if (region.name === CAPITAL_ASKED) tone = styles.capitalAsked
        return <path key={region.name} className={tone} d={region.d} />
      })}
      <path className={styles.edge} d={atlas.silhouette} />
    </MapBox>
  )
}

// On the dams card: the rivers, every dam, and one lit up to be named.
const DAM_ASKED = 'Tehri Dam'

function DamsArt({ atlas }: Readonly<{ atlas: Atlas }>) {
  const asked = atlas.points.find((point) => point.name === DAM_ASKED)
  return (
    <MapBox
      atlas={atlas}
      markers={
        <>
          {atlas.points
            .filter((point) => point !== asked)
            .map((point) => (
              <span
                key={point.name}
                className={styles.dam}
                style={{
                  left: `${(point.lx / atlas.w) * 100}%`,
                  top: `${(point.ly / atlas.h) * 100}%`,
                }}
              />
            ))}
          <Ask atlas={atlas} region={asked} />
        </>
      }
    >
      {atlas.borders.map((region) => (
        <path key={region.name} className={styles.land} d={region.d} />
      ))}
      <path className={styles.edge} d={atlas.silhouette} />
      {atlas.lines.map((line) => (
        <path key={line.name} className={styles.water} d={line.d} />
      ))}
    </MapBox>
  )
}

// The river lit up on the Rivers card, as one is in "Name it".
const LIT_RIVER = 'Ganga'

function RiversArt({ atlas }: Readonly<{ atlas: Atlas }>) {
  const major = new Set(atlas.boards.major.regions.map((r) => r.name))
  const lit = atlas.lines.find((r) => r.name === LIT_RIVER)
  return (
    <MapBox atlas={atlas} markers={<Ask atlas={atlas} region={lit} />}>
      {atlas.borders.map((region) => (
        <path key={region.name} className={styles.land} d={region.d} />
      ))}
      <path className={styles.edge} d={atlas.silhouette} />
      {atlas.lines
        .filter((line) => line !== lit)
        .map((line) => (
          <path
            key={line.name}
            className={major.has(line.name) ? `${styles.river} ${styles.major}` : styles.river}
            d={line.d}
          />
        ))}
      {lit && (
        <>
          <path className={styles.glow} d={lit.d} />
          <path className={styles.lit} d={lit.d} />
        </>
      )}
    </MapBox>
  )
}

// Three of the game's monuments; the first, big one is the one "asked".
const COLLAGE = [PHOTOS.tajMahal, PHOTOS.goldenTemple, PHOTOS.charminar]

function Collage({ large }: Readonly<{ large: boolean }>) {
  return (
    <div className={styles.collage}>
      {COLLAGE.map((photo, i) => (
        <Photo
          key={photo.id}
          className={i === 0 ? styles.big : undefined}
          photo={photo}
          sizes={large ? '(max-width: 900px) 70vw, 460px' : '(max-width: 640px) 60vw, 220px'}
          load="now"
        />
      ))}
      <span className={styles.photoAsk}>?</span>
    </div>
  )
}

// A few of the quiz's clues, two answered (in the colours of their parts of the quiz).
const SHEET: ReadonlyArray<{ hint: string; answer: string | null; tone?: 'saffron' | 'blue' }> = [
  { hint: 'Capital', answer: 'New Delhi', tone: 'saffron' },
  { hint: 'National bird', answer: null },
  { hint: 'Longest river', answer: 'Ganga', tone: 'blue' },
  { hint: 'Highest peak', answer: null },
]

function QuizSheet() {
  return (
    <div className={styles.sheet}>
      <span className={styles.sheetTop}>
        <i />
        <i />
        <i />
      </span>
      {SHEET.map((row) => (
        <span key={row.hint} className={styles.sheetRow}>
          <span className={styles.sheetHint}>{row.hint}</span>
          <span
            className={`${styles.sheetAnswer} ${row.tone ? styles[row.tone] : styles.sheetOpen}`}
          >
            {row.answer ?? '?'}
          </span>
        </span>
      ))}
    </div>
  )
}

// Line drawings for the games to come, on a 48 × 48 grid.
const ICONS: Record<UpcomingGame['icon'], ReactNode> = {
  // A tiger's paw: the national parks
  park: (
    <>
      <ellipse cx="24" cy="31" rx="9" ry="7.5" />
      <circle cx="12.5" cy="20.5" r="3.6" />
      <circle cx="19.5" cy="13" r="3.6" />
      <circle cx="28.5" cy="13" r="3.6" />
      <circle cx="35.5" cy="20.5" r="3.6" />
    </>
  ),
  // Two snowy peaks
  peak: (
    <>
      <path d="M3 40L18 14l15 26z" />
      <path d="M27 29.6L33 20l12 20H32" />
      <path d="M12.2 24.2l3 2.2 2.8-2.6 2.8 2.6 3-2.2" />
    </>
  ),
  // Waves on a lake
  lake: (
    <>
      <path d="M6 17c3 0 3-2.5 6-2.5s3 2.5 6 2.5 3-2.5 6-2.5 3 2.5 6 2.5 3-2.5 6-2.5 3 2.5 6 2.5" />
      <path d="M6 25c3 0 3-2.5 6-2.5s3 2.5 6 2.5 3-2.5 6-2.5 3 2.5 6 2.5 3-2.5 6-2.5 3 2.5 6 2.5" />
      <path d="M6 33c3 0 3-2.5 6-2.5s3 2.5 6 2.5 3-2.5 6-2.5 3 2.5 6 2.5 3-2.5 6-2.5 3 2.5 6 2.5" />
    </>
  ),
}
