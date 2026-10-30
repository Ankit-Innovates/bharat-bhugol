// Colouring a map as a mosaic, for the pictures on the game cards.

import type { MapRegion } from '../game/types'

const TINTS = 5

/**
 * A tint for every region, 0 to 4, for a mosaic: each region avoids the tints of its nearest
 * neighbours (judged by their label points) and takes the least used of the rest, so the colours
 * spread evenly over the map.
 */
export function mosaic(regions: readonly MapRegion[]): Map<string, number> {
  const tints = new Map<string, number>()
  const used = Array.from({ length: TINTS }, () => 0)
  const all = used.map((_, t) => t)
  const order = [...regions].sort((a, b) => a.ly - b.ly || a.lx - b.lx)
  for (const region of order) {
    const distance = (other: MapRegion) => Math.hypot(other.lx - region.lx, other.ly - region.ly)
    const near = new Set(
      order
        .filter((other) => tints.has(other.name))
        .sort((a, b) => distance(a) - distance(b))
        .slice(0, 4)
        .map((other) => tints.get(other.name)),
    )
    const free = all.filter((t) => !near.has(t))
    const pick = (free.length > 0 ? free : all).reduce((best, t) =>
      used[t] < used[best] ? t : best,
    )
    tints.set(region.name, pick)
    used[pick] += 1
  }
  return tints
}
