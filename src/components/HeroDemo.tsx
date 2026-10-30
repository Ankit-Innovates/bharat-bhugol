import { useEffect, useState, type CSSProperties } from 'react'
import type { Atlas } from '../games'
import { playsMotion } from '../motion'
import { PHOTOS } from '../photos'
import Photo from './Photo'
import styles from './HeroDemo.module.css'

// The states the demo finds, in turn, spread over the map.
const ASKED = [
  'Rajasthan',
  'Kerala',
  'Assam',
  'Gujarat',
  'Bihar',
  'Karnataka',
  'Punjab',
  'Odisha',
  'Tamil Nadu',
  'Uttar Pradesh',
  'West Bengal',
  'Maharashtra',
]
const BEAT_MS = 900 // the pointer moves to a state on one beat and clicks it on the next
const LOOP = (ASKED.length + 2) * 2 // beats in a round, with a short rest once all are found
const STILL = 13 // the beat shown when nothing moves: six found, the pointer on the seventh
const STATES_AND_UTS = 36

const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

/**
 * The home page's picture: a round of the States and UTs game playing itself. The pointer goes to
 * each state asked and clicks it; the state turns blue, the score goes up and the clock runs down.
 * Around it, a photo and a river hint at the other games, over soft glows in the cards' colours.
 * It is decoration, hidden from screen readers, and holds still for visitors who ask for less motion.
 */
export default function HeroDemo({
  atlas,
  seconds,
}: Readonly<{ atlas: Atlas | null; seconds: number }>) {
  const [beat, setBeat] = useState(() => (playsMotion() ? 0 : STILL))
  useEffect(() => {
    if (!playsMotion()) return
    const timer = window.setInterval(() => setBeat((b) => (b + 1) % LOOP), BEAT_MS)
    return () => window.clearInterval(timer)
  }, [])

  const step = Math.floor(beat / 2)
  const finished = step >= ASKED.length
  const done = finished ? ASKED.length : step + (beat % 2)
  const found = new Set(ASKED.slice(0, done))
  const asked = ASKED[Math.min(step, ASKED.length - 1)]
  const last = done > 0 ? ASKED[done - 1] : null
  const target = atlas?.borders.find((r) => r.name === asked)
  const at = (x: number, y: number): CSSProperties | undefined =>
    atlas ? { left: `${(x / atlas.w) * 100}%`, top: `${(y / atlas.h) * 100}%` } : undefined

  return (
    <div className={styles.demo} aria-hidden="true">
      <span className={`${styles.glow} ${styles.saffron}`} />
      <span className={`${styles.glow} ${styles.green}`} />
      <span className={`${styles.glow} ${styles.blue}`} />

      <figure className={styles.photo}>
        <Photo photo={PHOTOS.tajMahal} sizes="160px" load="now" className={styles.photoImg} />
        <figcaption>Which monument?</figcaption>
      </figure>

      <span className={styles.river}>
        <svg viewBox="0 0 24 12">
          <path d="M1 8c3 0 3-5 6-5s3 5 6 5 3-5 6-5 3 5 4 5" />
        </svg>
        Narmada
      </span>

      <div className={styles.window}>
        <div className={styles.bar}>
          <span className={styles.prompt}>
            {finished ? (
              'All found!'
            ) : (
              <>
                Click on: <b>{asked}</b>
              </>
            )}
          </span>
          <span className={styles.score}>
            {done}/{STATES_AND_UTS}
          </span>
          <span className={styles.clock}>
            {clock(seconds - Math.round((beat * BEAT_MS) / 1000))}
          </span>
        </div>
        <div className={styles.board}>
          {atlas && (
            <div className={styles.mapBox} style={{ aspectRatio: `${atlas.w} / ${atlas.h}` }}>
              <svg className={styles.map} viewBox={`0 0 ${atlas.w} ${atlas.h}`}>
                {atlas.borders.map((region) => (
                  <path
                    key={region.name}
                    className={found.has(region.name) ? styles.found : styles.region}
                    d={region.d}
                  />
                ))}
                <path className={styles.edge} d={atlas.silhouette} />
              </svg>
              {target && !finished && (
                <>
                  {beat % 2 === 1 && (
                    <span key={beat} className={styles.ripple} style={at(target.lx, target.ly)} />
                  )}
                  <svg
                    className={styles.pointer}
                    style={at(target.lx, target.ly)}
                    viewBox="0 0 16 22"
                  >
                    <path d="M1 1v17l4.6-4.3 3 6.6 3-1.4-3-6.4H15z" />
                  </svg>
                </>
              )}
            </div>
          )}
        </div>
        {last && (
          <span key={last} className={styles.toast}>
            <svg viewBox="0 0 16 16">
              <path d="M3.5 8.5l3 3 6-7" />
            </svg>
            {last}
          </span>
        )}
      </div>
    </div>
  )
}
