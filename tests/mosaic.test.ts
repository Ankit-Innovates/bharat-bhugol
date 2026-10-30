import { describe, expect, it } from 'vitest'
import { mosaic } from '../src/components/mosaic'
import { india, map } from './fixtures'

describe('mosaic', () => {
  it.each([
    ['India', india.regions],
    ['MP', map.districts],
  ])('tints every region of %s, spreading all five tints evenly', (_, regions) => {
    const tints = mosaic(regions)
    expect([...tints.keys()].sort()).toEqual(regions.map((r) => r.name).sort())
    const counts = [0, 1, 2, 3, 4].map((t) => [...tints.values()].filter((v) => v === t).length)
    expect(counts.every((n) => n > 0)).toBe(true)
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(2)
  })

  it('gives each region a tint other than its nearest neighbour', () => {
    const tints = mosaic(map.districts)
    for (const a of map.districts) {
      const nearest = map.districts
        .filter((b) => b !== a)
        .reduce((best, b) =>
          Math.hypot(b.lx - a.lx, b.ly - a.ly) < Math.hypot(best.lx - a.lx, best.ly - a.ly)
            ? b
            : best,
        )
      expect(tints.get(a.name), `${a.name} and ${nearest.name}`).not.toBe(tints.get(nearest.name))
    }
  })
})
