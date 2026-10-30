import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react'
import type { MapRegion } from '../game/types'
import type { Board } from '../games'
import { layoutLabels, leaderEnd, type Spot } from './labelLayout'
import styles from './MapView.module.css'

type Status = 'found' | 'missed' | 'wrong'

// A wrong click only flashes red; it never shows a name, so the map gives nothing away.
type Labelled = 'found' | 'missed'

/** A name's spot, with the point on the map it belongs to (both in pixels). */
type Placed = Spot & { ax: number; ay: number }

interface MapViewProps {
  board: Board
  found?: readonly string[]
  missed?: readonly string[]
  flash?: string | null // region flashing after a wrong click
  markers?: readonly string[] // regions that show a ? marker
  highlight?: string | null // the region lit up to be named (name mode): a state, river or point
  clickable?: boolean // click mode while playing: unanswered regions get hover + pointer
  onRegionClick?: (name: string) => void
  label: string // accessible name for the map
  children?: ReactNode // drawn over the whole map box, e.g. the pause cover
}

// Only one map is on screen at a time, so a fixed id is safe.
const HATCH_ID = 'map-hatch'

// In click mode on a points map, a click counts for the nearest open point this close (pixels).
const POINT_REACH = 22

// On point maps each place is a dot that names must leave in sight: half a dot, and a little more.
const POINT_LAYOUT = { dot: 7, ownDot: true }

const STATUS_CLASS: Record<Status, string> = {
  found: styles.found,
  missed: styles.missed,
  wrong: styles.wrong,
}

const LINE_CLASS: Record<Status, string> = {
  found: styles.riverFound,
  missed: styles.riverMissed,
  wrong: styles.riverWrong,
}

const RING_CLASS: Record<Status, string> = {
  found: styles.ringFound,
  missed: styles.ringMissed,
  wrong: styles.ringWrong,
}

const DOT_CLASS: Record<Status, string> = {
  found: styles.dotFound,
  missed: styles.dotMissed,
  wrong: styles.dotWrong,
}

const LABEL_CLASS: Record<Labelled, string> = {
  found: styles.label,
  missed: `${styles.label} ${styles.labelAlert}`,
}

export default function MapView({
  board,
  found = [],
  missed = [],
  flash = null,
  markers = [],
  highlight = null,
  clickable = false,
  onRegionClick,
  label,
  children,
}: Readonly<MapViewProps>) {
  const { w, h, regions, overlay, dense, kind, backdrop, waters = [] } = board
  // On line maps (rivers), point maps (monuments, dams) and maps of long names (capitals) names
  // crowd together, so they are spread.
  const spread = kind !== 'areas' || board.spread === true
  const foundSet = new Set(found)
  const missedSet = new Set(missed)
  const markerSet = new Set(markers)

  const statusOf = (name: string): Status | null => {
    if (foundSet.has(name)) return 'found'
    if (missedSet.has(name)) return 'missed'
    if (flash === name) return 'wrong'
    return null
  }

  const at = (region: MapRegion): CSSProperties => ({
    left: `${(region.lx / w) * 100}%`,
    top: `${(region.ly / h) * 100}%`,
  })

  const handleClick = (event: MouseEvent<SVGGElement>) => {
    const name = event.target instanceof Element ? event.target.getAttribute('data-region') : null
    if (name && onRegionClick) onRegionClick(name)
  }

  const labelled = regions
    .map((region) => ({ region, status: statusOf(region.name) }))
    .filter(
      (entry): entry is { region: MapRegion; status: Labelled } =>
        entry.status === 'found' || entry.status === 'missed',
    )

  // Spread names go over the whole map box, each with a line back to its place where it had to
  // move. Spots are in pixels; a name keeps its spot while it stays free, and all are worked out
  // again on resize.
  const boxRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const keptRef = useRef<Map<string, Spot>>(new Map())
  const [spots, setSpots] = useState<ReadonlyMap<string, Placed>>(new Map())
  const labelKey = labelled.map(({ region, status }) => `${region.name}:${status}`).join('|')
  useLayoutEffect(() => {
    const box = boxRef.current
    const layer = overlayRef.current
    if (!spread || !box || !layer) return
    const place = () => {
      const area = layer.getBoundingClientRect()
      const frame = box.getBoundingClientRect()
      const names = [...layer.querySelectorAll<HTMLElement>('[data-label]')]
      const boxes = names.map((el) => {
        const region = regions.find((r) => r.name === el.dataset.name)
        return {
          id: el.dataset.name ?? '',
          ax: ((region?.lx ?? 0) / w) * area.width,
          ay: ((region?.ly ?? 0) / h) * area.height,
          w: el.offsetWidth,
          h: el.offsetHeight,
        }
      })
      const next = layoutLabels(
        boxes,
        {
          left: frame.left - area.left + 4,
          top: frame.top - area.top + 4,
          right: frame.right - area.left - 4,
          bottom: frame.bottom - area.top - 4,
        },
        keptRef.current,
        kind === 'points' ? POINT_LAYOUT : {},
      )
      keptRef.current = next
      setSpots(
        new Map(
          boxes.flatMap((b) => {
            const spot = next.get(b.id)
            return spot ? [[b.id, { ...spot, ax: b.ax, ay: b.ay }] as const] : []
          }),
        ),
      )
    }
    place()
    if (typeof ResizeObserver === 'undefined') return
    // A new size moves every point, so nothing is kept.
    let frameId = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(() => {
        keptRef.current = new Map()
        place()
      })
    })
    observer.observe(box)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frameId)
    }
    // labelKey stands for the labelled names and their looks: re-place when they change.
  }, [spread, kind, labelKey, regions, w, h])

  // Click mode on a points map (dams): a click goes to the nearest point still open, within
  // reach, so points close together never take each other's clicks. The pointer shows which.
  const [hovered, setHovered] = useState<string | null>(null)
  const nearestPoint = (event: MouseEvent<HTMLDivElement>): string | null => {
    const box = event.currentTarget.getBoundingClientRect()
    if (box.width === 0) return null
    const scale = box.width / w // pixels per map unit
    const x = (event.clientX - box.left) / scale
    const y = (event.clientY - box.top) / scale
    let nearest: string | null = null
    let reach = POINT_REACH / scale
    for (const region of regions) {
      const status = statusOf(region.name)
      if (status === 'found' || status === 'missed') continue
      const distance = Math.hypot(region.lx - x, region.ly - y)
      if (distance < reach) {
        nearest = region.name
        reach = distance
      }
    }
    return nearest
  }
  const pointClicks = kind === 'points' && clickable

  const labelStyle = (region: MapRegion): CSSProperties => {
    const spot = spread ? spots.get(region.name) : undefined
    return spot ? { left: `${spot.x}px`, top: `${spot.y}px` } : at(region)
  }

  return (
    <div ref={boxRef} className={dense ? `${styles.map} ${styles.dense}` : styles.map}>
      <div className={styles.canvas}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${w} ${h}`}
          width="100%"
          role="img"
          aria-label={label}
        >
          <defs>
            <pattern
              id={HATCH_ID}
              width="7"
              height="7"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect className={styles.hatchBack} width="7" height="7" />
              <rect className={styles.hatchStripe} width="2.5" height="7" />
            </pattern>
          </defs>
          <path className={styles.outline} d={board.outline} />
          {backdrop.length > 0 && (
            <g className={styles.backdrop}>
              {backdrop.map((region) => (
                <path key={region.name} d={region.d} />
              ))}
            </g>
          )}
          {kind === 'lines' && (
            <g onClick={handleClick}>
              {/* The lit-up line last, so it is drawn on top of any it crosses. */}
              {[...regions]
                .sort((a, b) => Number(a.name === highlight) - Number(b.name === highlight))
                .map((region) => {
                  const status = statusOf(region.name)
                  const classes = [styles.river]
                  if (status) classes.push(LINE_CLASS[status])
                  if (region.name === highlight) classes.push(styles.riverCurrent)
                  const canClick = clickable && status !== 'found' && status !== 'missed'
                  return (
                    <g key={region.name} className={canClick ? styles.riverClickable : undefined}>
                      <path
                        className={classes.join(' ')}
                        d={region.d}
                        data-line={region.name}
                        data-current={region.name === highlight ? '' : undefined}
                      />
                      {/* A wide, invisible strip along the line, so it is easy to click. */}
                      {canClick && (
                        <path className={styles.riverHit} d={region.d} data-region={region.name} />
                      )}
                    </g>
                  )
                })}
            </g>
          )}
          {kind === 'areas' && (
            <g onClick={handleClick}>
              {regions.map((region) => {
                const status = statusOf(region.name)
                const classes = [styles.region]
                if (status) classes.push(STATUS_CLASS[status])
                if (region.name === highlight) classes.push(styles.regionCurrent)
                if (clickable && status !== 'found' && status !== 'missed') {
                  classes.push(styles.clickable)
                }
                return (
                  <path
                    key={region.name}
                    className={classes.join(' ')}
                    d={region.d}
                    data-region={region.name}
                  />
                )
              })}
            </g>
          )}
          {waters.length > 0 && (
            <g className={styles.waters}>
              {waters.map((river) => (
                <path key={river.name} d={river.d} />
              ))}
            </g>
          )}
          {overlay.length > 0 && (
            <g className={styles.overlayLines}>
              {overlay.map((region) => (
                <path key={region.name} d={region.d} />
              ))}
            </g>
          )}
        </svg>
        <div ref={overlayRef} className={styles.overlay}>
          {spread && (
            <svg className={styles.leaders} aria-hidden="true">
              {labelled.map(({ region, status }) => {
                const spot = spots.get(region.name)
                const end = spot && leaderEnd(spot, spot.ax, spot.ay)
                if (!spot || !end) return null
                return (
                  <g
                    key={region.name}
                    className={status === 'missed' ? styles.leaderAlert : undefined}
                  >
                    <line x1={spot.ax} y1={spot.ay} x2={end[0]} y2={end[1]} />
                    <circle cx={spot.ax} cy={spot.ay} r={2.6} />
                  </g>
                )
              })}
            </svg>
          )}
          {kind === 'points' &&
            regions.map((region) => {
              const status = statusOf(region.name)
              const classes = [styles.dot]
              if (status) classes.push(DOT_CLASS[status])
              if (region.name === highlight) classes.push(styles.dotCurrent)
              if (pointClicks && region.name === hovered) classes.push(styles.dotHover)
              return (
                <span
                  key={region.name}
                  className={classes.join(' ')}
                  style={at(region)}
                  data-point={region.name}
                  aria-hidden="true"
                />
              )
            })}
          {pointClicks && (
            <div
              className={styles.pointHits}
              aria-hidden="true"
              onClick={(event) => {
                const name = nearestPoint(event)
                if (name && onRegionClick) onRegionClick(name)
              }}
              onMouseMove={(event) => setHovered(nearestPoint(event))}
              onMouseLeave={() => setHovered(null)}
            />
          )}
          {regions
            .filter((region) => region.small)
            .map((region) => {
              const status = statusOf(region.name)
              const classes = [styles.ring]
              if (status) classes.push(RING_CLASS[status])
              const canClick = clickable && status !== 'found' && status !== 'missed'
              if (canClick) classes.push(styles.ringClickable)
              if (region.name === highlight) classes.push(styles.ringCurrent)
              return (
                <span
                  key={region.name}
                  className={classes.join(' ')}
                  style={at(region)}
                  data-ring={region.name}
                  aria-hidden="true"
                  onClick={canClick && onRegionClick ? () => onRegionClick(region.name) : undefined}
                />
              )
            })}
          {labelled.map(({ region, status }) => (
            <span
              key={region.name}
              className={LABEL_CLASS[status]}
              style={labelStyle(region)}
              data-label={status}
              data-name={region.name}
            >
              {region.short ?? region.name}
            </span>
          ))}
          {regions
            .filter((region) => markerSet.has(region.name) && statusOf(region.name) === null)
            .map((region) => (
              <span
                key={region.name}
                className={styles.marker}
                style={at(region)}
                data-marker={region.name}
                aria-hidden="true"
              >
                ?
              </span>
            ))}
        </div>
      </div>
      {children}
    </div>
  )
}
