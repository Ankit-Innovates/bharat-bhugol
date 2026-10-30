/** Fisher–Yates shuffle into a new array. `rng` returns a number in [0, 1), like Math.random. */
export function shuffle<T>(names: readonly T[], rng: () => number): T[] {
  const out = names.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const swap = out[i]
    out[i] = out[j]
    out[j] = swap
  }
  return out
}
