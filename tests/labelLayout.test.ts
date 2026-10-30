import { describe, expect, it } from 'vitest'
import { layoutLabels, leaderEnd, type LabelBox, type Spot } from '../src/components/labelLayout'

const bounds = { left: 0, top: 0, right: 600, bottom: 400 }

const spotOf = (spots: ReadonlyMap<string, Spot>, id: string): Spot => {
  const spot = spots.get(id)
  if (!spot) throw new Error(`no spot for ${id}`)
  return spot
}

const overlap = (a: Spot, b: Spot) =>
  Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h

describe('layoutLabels', () => {
  it('leaves a name on its own point when nothing is in the way', () => {
    const spots = layoutLabels([{ id: 'Ganga', ax: 300, ay: 200, w: 50, h: 16 }], bounds)
    expect(spotOf(spots, 'Ganga')).toEqual({ x: 300, y: 200, w: 50, h: 16 })
    expect(leaderEnd(spotOf(spots, 'Ganga'), 300, 200)).toBeNull()
  })

  it('spreads out names whose points crowd together, keeping them on the map', () => {
    // Five rivers side by side, like those of Punjab.
    const boxes: LabelBox[] = ['Jhelum', 'Chenab', 'Ravi', 'Beas', 'Sutlej'].map((id, i) => ({
      id,
      ax: 60 + i * 4,
      ay: 40 + i * 9,
      w: 52,
      h: 16,
    }))
    const spots = layoutLabels(boxes, bounds)
    const all = boxes.map((b) => spotOf(spots, b.id))
    all.forEach((a, i) => all.slice(i + 1).forEach((b) => expect(overlap(a, b)).toBe(false)))
    for (const s of all) {
      expect(s.x - s.w / 2 >= bounds.left && s.x + s.w / 2 <= bounds.right).toBe(true)
      expect(s.y - s.h / 2 >= bounds.top && s.y + s.h / 2 <= bounds.bottom).toBe(true)
    }
    // Those that had to move get a line back to their river, ending on their box.
    const moved = boxes.filter((b) => leaderEnd(spotOf(spots, b.id), b.ax, b.ay) !== null)
    expect(moved.length).toBeGreaterThan(0)
  })

  it('can keep a dot in sight, with its name just above it and no line', () => {
    const box = { id: 'Hampi', ax: 300, ay: 200, w: 50, h: 16 }
    const spot = spotOf(layoutLabels([box], bounds, new Map(), { dot: 7, ownDot: true }), 'Hampi')
    expect(spot.x).toBe(300)
    expect(spot.y + spot.h / 2).toBeLessThanOrEqual(200 - 7)
    expect(leaderEnd(spot, 300, 200)).toBeNull()
  })

  it('keeps a name where it was while that spot stays free', () => {
    const first = layoutLabels([{ id: 'Son', ax: 100, ay: 100, w: 30, h: 16 }], bounds)
    const keep = new Map([['Son', { ...spotOf(first, 'Son'), x: 140 }]])
    const next = layoutLabels(
      [
        { id: 'Son', ax: 100, ay: 100, w: 30, h: 16 },
        { id: 'Kosi', ax: 300, ay: 300, w: 34, h: 16 },
      ],
      bounds,
      keep,
    )
    expect(spotOf(next, 'Son').x).toBe(140)
    expect(spotOf(next, 'Kosi')).toEqual({ x: 300, y: 300, w: 34, h: 16 })
  })
})
