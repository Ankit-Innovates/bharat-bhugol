import { PHOTO_WIDTHS, photoUrl, type PhotoInfo } from '../photos'

interface PhotoProps {
  photo: PhotoInfo
  /** How wide the photo is shown, so the browser can pick the smallest file that looks sharp. */
  sizes: string
  className?: string
  /**
   * When to fetch the file: "first" for the page's main photo, ahead of everything else; "now" for
   * other photos in view as the page opens; "lazy" for the rest, once they are near the screen.
   */
  load?: 'first' | 'now' | 'lazy'
}

/** A decorative photo from public/photos/, filling its frame (the frame's CSS sets the size). */
export default function Photo({ photo, sizes, className, load = 'lazy' }: Readonly<PhotoProps>) {
  // loading, sizes and srcSet come before src: browsers start fetching as soon as src is set.
  return (
    <img
      className={className}
      alt=""
      loading={load === 'lazy' ? 'lazy' : 'eager'}
      fetchPriority={load === 'first' ? 'high' : 'auto'}
      decoding="async"
      sizes={sizes}
      srcSet={PHOTO_WIDTHS.map((w) => `${photoUrl(photo, w)} ${w}w`).join(', ')}
      src={photoUrl(photo, 960)}
      style={photo.focus ? { objectPosition: photo.focus } : undefined}
    />
  )
}
