// Where to put names on a map so they don't cover each other: each name tries its own point
// first, then the nearest free spot around it. A name that moves gets a line back to its point.
// Pure geometry in screen pixels; MapView measures the names and draws the result.

/** A name to place: its point on the map (ax, ay) and its size, all in pixels. */
export interface LabelBox {
  id: string
  ax: number
  ay: number
  w: number
  h: number
}

/** Where a name's centre goes, with its size. */
export interface Spot {
  x: number
  y: number
  w: number
  h: number
}

export interface Bounds {
  left: number
  top: number
  right: number
  bottom: number
}

const GAP = 3 // between two names, in pixels
const DOT = 4 // by default, other names' points are kept clear of this much around them
const NEAR = 10 // a name this close to its point needs no line back to it
const STEP_X = 6
const STEP_Y = 4
const REACH_X = 240 // how far a name may move, sideways and up or down
const REACH_Y = 160

// Moves to try, nearest first. Moving up or down counts a little more than sideways, so a name
// leaves a crowd along the same line of text where it can.
const MOVES: ReadonlyArray<readonly [number, number]> = (() => {
  const moves: Array<[number, number]> = []
  for (let dx = -REACH_X; dx <= REACH_X; dx += STEP_X) {
    for (let dy = -REACH_Y; dy <= REACH_Y; dy += STEP_Y) moves.push([dx, dy])
  }
  return moves.sort(([ax, ay], [bx, by]) => Math.hypot(ax, ay * 1.5) - Math.hypot(bx, by * 1.5))
})()

export interface LayoutOptions {
  /** How much room to keep clear around each point, in pixels: half the mark drawn there. */
  dot?: number
  /** Keep each name off its own point too, for points drawn as dots that must stay in sight. */
  ownDot?: boolean
}

/**
 * A spot for every name. Names placed before (`keep`) stay put while their spot is still free;
 * the rest go least crowded first, so names with room stay on their points and crowded ones
 * move out to the nearest free space. If no free spot is in reach, a name takes the one where
 * it covers least.
 */
export function layoutLabels(
  boxes: readonly LabelBox[],
  bounds: Bounds,
  keep: ReadonlyMap<string, Spot> = new Map(),
  { dot = DOT, ownDot = false }: LayoutOptions = {},
): Map<string, Spot> {
  const crowding = (a: LabelBox) =>
    boxes.filter(
      (b) =>
        b !== a &&
        Math.abs(b.ax - a.ax) * 2 < a.w + b.w + 2 * GAP &&
        Math.abs(b.ay - a.ay) * 2 < a.h + b.h + 2 * GAP,
    ).length
  const order = [...boxes].sort(
    (a, b) => Number(keep.has(b.id)) - Number(keep.has(a.id)) || crowding(a) - crowding(b),
  )

  const spots = new Map<string, Spot>()
  for (const box of order) {
    // How bad a centre at (x, y) would be: Infinity outside the map, 0 when it covers nothing.
    const cost = (x: number, y: number): number => {
      const left = x - box.w / 2
      const top = y - box.h / 2
      const right = left + box.w
      const bottom = top + box.h
      if (
        left < bounds.left ||
        top < bounds.top ||
        right > bounds.right ||
        bottom > bounds.bottom
      ) {
        return Infinity
      }
      let covered = 0
      for (const spot of spots.values()) {
        const across = Math.min(right, spot.x + spot.w / 2) - Math.max(left, spot.x - spot.w / 2)
        const down = Math.min(bottom, spot.y + spot.h / 2) - Math.max(top, spot.y - spot.h / 2)
        if (across > -GAP && down > -GAP) covered += (across + GAP) * (down + GAP)
      }
      for (const other of boxes) {
        if (other === box && !ownDot) continue
        const near =
          other.ax > left - dot &&
          other.ax < right + dot &&
          other.ay > top - dot &&
          other.ay < bottom + dot
        if (near) covered += 4 * dot * dot
      }
      return covered
    }

    const kept = keep.get(box.id)
    if (kept && kept.w === box.w && kept.h === box.h && cost(kept.x, kept.y) === 0) {
      spots.set(box.id, kept)
      continue
    }
    let best: [number, number] = [box.ax, box.ay]
    let bestCost = Infinity
    for (const [dx, dy] of MOVES) {
      const c = cost(box.ax + dx, box.ay + dy)
      if (c < bestCost) {
        best = [box.ax + dx, box.ay + dy]
        bestCost = c
        if (c === 0) break
      }
    }
    spots.set(box.id, { x: best[0], y: best[1], w: box.w, h: box.h })
  }
  return spots
}

/** Where the line from a moved name meets it: the nearest point of its box to its own point. */
export function leaderEnd(spot: Spot, ax: number, ay: number): [number, number] | null {
  const left = spot.x - spot.w / 2
  const top = spot.y - spot.h / 2
  const x = Math.min(Math.max(ax, left), left + spot.w)
  const y = Math.min(Math.max(ay, top), top + spot.h)
  // A name still over its own point, or right beside it, needs no line.
  return Math.hypot(x - ax, y - ay) <= NEAR ? null : [x, y]
}
