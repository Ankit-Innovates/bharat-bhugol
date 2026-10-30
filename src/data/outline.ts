/**
 * The outer edge of a map path, without its holes.
 *
 * Paths in mp-map.json are sub-paths of the form `M x y l dx dy … z`. Merging regions leaves a few
 * tiny holes where their borders don't quite meet, and holes wind the opposite way to outer
 * edges, so only the sub-paths that wind like the largest one are kept.
 */
export function outerEdge(d: string): string {
  const subpaths = d.match(/M[^M]+/g) ?? []
  const areas = subpaths.map(signedArea)
  const largest = areas.reduce(
    (best, area, i) => (Math.abs(area) > Math.abs(areas[best]) ? i : best),
    0,
  )
  const winding = Math.sign(areas[largest])
  return subpaths.filter((_, i) => Math.sign(areas[i]) === winding).join('')
}

/** Shoelace area of one sub-path: an absolute start point followed by relative steps. */
function signedArea(subpath: string): number {
  const n = (subpath.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)/g) ?? []).map(Number)
  let [x, y] = n
  let twice = 0
  for (let i = 2; i + 1 < n.length; i += 2) {
    const nx = x + n[i]
    const ny = y + n[i + 1]
    twice += x * ny - nx * y
    x = nx
    y = ny
  }
  twice += x * n[1] - n[0] * y // close back to the start
  return twice / 2
}
