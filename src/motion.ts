/**
 * Whether the home page's things may move on their own (the game playing itself, the changing
 * word in the title): not for visitors who ask for less motion, nor where that can't be told.
 */
export function playsMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
