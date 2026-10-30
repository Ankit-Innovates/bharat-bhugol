import type { ReactNode } from 'react'
import { SECTION_TITLE, type QuizSection } from '../data/indiaQuiz'
import type { MapRegion } from '../game/types'
import styles from './QuizBoard.module.css'

interface QuizBoardProps {
  regions: readonly MapRegion[] // the answers, each with its clue and section, in order
  found: readonly string[] // in the order they were given
  missed: readonly string[]
  children?: ReactNode // drawn over the whole board, e.g. the pause cover
}

interface Slot {
  key: string
  hint: string
  repeat: boolean // the same clue as the row above
  answer: string | null
  status: 'found' | 'missed' | null
}

/**
 * The board of a quiz with no map: its clues in three parts, each with a slot for its answer. An
 * answer fills the first free slot of its clue, so the order of clues asked more than once
 * ("Bordering country") gives nothing away. Answers missed show after the round.
 */
export default function QuizBoard({ regions, found, missed, children }: Readonly<QuizBoardProps>) {
  const sections = [...new Set(regions.map((r) => r.section ?? ''))]
  return (
    <div className={styles.board} data-testid="quiz-board">
      {sections.map((section) => (
        <section key={section} className={`${styles.section} ${styles[section]}`}>
          <h2 className={styles.heading}>{SECTION_TITLE[section as QuizSection] ?? section}</h2>
          <ol className={styles.rows}>
            {slots(
              regions.filter((r) => (r.section ?? '') === section),
              found,
              missed,
            ).map((slot) => (
              <li key={slot.key} className={styles.row}>
                <span className={slot.repeat ? `${styles.hint} ${styles.repeat}` : styles.hint}>
                  {slot.hint}
                </span>
                <span
                  className={
                    slot.status ? `${styles.answer} ${styles[slot.status]}` : styles.answer
                  }
                  data-answer={slot.status ?? 'open'}
                >
                  {slot.answer ?? <span className="sr-only">not answered</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}
      {children}
    </div>
  )
}

/** A section's rows: under each clue, its answers found (in that order), then missed, then free. */
function slots(
  regions: readonly MapRegion[],
  found: readonly string[],
  missed: readonly string[],
): Slot[] {
  const hints = [...new Set(regions.map((r) => r.hint ?? ''))]
  return hints.flatMap((hint) => {
    const names = new Set(regions.filter((r) => (r.hint ?? '') === hint).map((r) => r.name))
    const given = [
      ...found.filter((n) => names.has(n)).map((n) => ({ answer: n, status: 'found' as const })),
      ...missed.filter((n) => names.has(n)).map((n) => ({ answer: n, status: 'missed' as const })),
    ]
    return [...names].map((_, i) => ({
      key: `${hint}-${i}`,
      hint,
      repeat: i > 0,
      answer: given[i]?.answer ?? null,
      status: given[i]?.status ?? null,
    }))
  })
}
