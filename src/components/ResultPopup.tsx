import { useEffect, useId, useRef, type CSSProperties } from 'react'
import styles from './ResultPopup.module.css'

const CONFETTI_COLOURS = ['#bf4b0c', '#2c5da3', '#bcd0ec', '#f2b134', '#18211d']

// 28 pieces with spread-out positions, delays and colours; fixed so renders stay stable.
const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  delay: `${(i % 7) * 0.08}s`,
  drift: `${((i * 53) % 120) - 60}px`,
  spin: `${(i * 97) % 720}deg`,
  colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
}))

interface ResultPopupProps {
  won: boolean
  message: string
  onClose: () => void // after a loss, closing reveals the answers
  onPlayAgain: () => void
}

/** A modal over the game screen at the end of a round: "You won!" or "You lost". */
export default function ResultPopup({
  won,
  message,
  onClose,
  onPlayAgain,
}: Readonly<ResultPopupProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  // Focus starts on the title, not a button: keys still being typed when the last answer ends the
  // round (the rest of its name, a space, Enter) then press nothing. Tab reaches the buttons.
  const titleRef = useRef<HTMLHeadingElement>(null)
  const titleId = useId()
  const messageId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    titleRef.current?.focus()
  }, [])

  const closeButton = (
    <button className={won ? styles.secondary : styles.primary} type="button" onClick={onClose}>
      {won ? 'See the map' : 'See answers'}
    </button>
  )
  const playAgainButton = (
    <button className={won ? styles.primary : styles.secondary} type="button" onClick={onPlayAgain}>
      Play again
    </button>
  )

  return (
    <dialog
      ref={dialogRef}
      className={won ? `${styles.dialog} ${styles.won}` : styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(event) => {
        // Esc closes it like the buttons do, through the parent's state.
        event.preventDefault()
        onClose()
      }}
    >
      {won && (
        <>
          <div className={styles.confetti} aria-hidden="true">
            {CONFETTI.map((piece, i) => (
              <span
                key={i}
                style={
                  {
                    left: piece.left,
                    background: piece.colour,
                    animationDelay: piece.delay,
                    '--drift': piece.drift,
                    '--spin': piece.spin,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <div className={styles.party} aria-hidden="true">
            🎉
          </div>
        </>
      )}
      <h2 ref={titleRef} id={titleId} className={styles.title} tabIndex={-1}>
        {won ? 'You won!' : 'You lost'}
      </h2>
      <p id={messageId} className={styles.message}>
        {message}
      </p>
      <div className={styles.actions}>
        {won ? playAgainButton : closeButton}
        {won ? closeButton : playAgainButton}
      </div>
      <button className={styles.close} type="button" aria-label="Close" onClick={onClose}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M3.5 3.5l9 9M12.5 3.5l-9 9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </dialog>
  )
}
