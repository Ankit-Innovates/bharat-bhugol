import type { ReactNode } from 'react'
import type { MapRegion } from '../game/types'
import type { PhotoInfo } from '../photos'
import Photo from './Photo'
import styles from './PhotoCard.module.css'

interface PhotoCardProps {
  /** The place asked now, or null before the round starts. */
  asked: MapRegion | null
  photo: PhotoInfo | null
  /** The next place's photo, fetched early so it shows at once when its turn comes. */
  next: PhotoInfo | null
  children?: ReactNode // drawn over the whole card, e.g. the pause cover
}

/**
 * The question in a picture round: the monument's photo. When the answer is its place rather than
 * its name, the name is shown on the photo.
 */
export default function PhotoCard({ asked, photo, next, children }: Readonly<PhotoCardProps>) {
  return (
    <div className={styles.card} data-testid="photo-card">
      {asked && photo ? (
        <>
          <Photo
            key={photo.id}
            className={styles.photo}
            photo={photo}
            sizes="(max-width: 760px) 100vw, 720px"
            load="first"
          />
          {asked.answers && <p className={styles.caption}>{asked.name}</p>}
          <p className={styles.credit}>
            Photo: {photo.author} · {photo.licence}
          </p>
        </>
      ) : (
        <p className={styles.waiting}>The first photo appears when you press Play game.</p>
      )}
      {next && (
        <Photo
          className={styles.early}
          photo={next}
          sizes="(max-width: 760px) 100vw, 720px"
          load="now"
        />
      )}
      {children}
    </div>
  )
}
