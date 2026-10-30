import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PHOTO_WIDTHS, PHOTOS } from '../src/photos'

const photos = Object.values(PHOTOS)

describe('photos', () => {
  it('has a file in public/photos for every width of every photo, and no other files', () => {
    const wanted = photos.flatMap((p) => PHOTO_WIDTHS.map((w) => `${p.id}-${w}.webp`)).sort()
    expect(readdirSync(resolve('public/photos')).sort()).toEqual(wanted)
  })

  it('credits every photo: author, licence and its page on Commons', () => {
    expect(new Set(photos.map((p) => p.id)).size).toBe(photos.length)
    for (const photo of photos) {
      const licenceUrl: string | undefined = 'licenceUrl' in photo ? photo.licenceUrl : undefined
      expect(photo.author.trim(), photo.id).not.toBe('')
      expect(photo.place.trim(), photo.id).not.toBe('')
      expect(photo.source, photo.id).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
      if (photo.licence === 'Public domain') {
        expect(licenceUrl, photo.id).toBeUndefined()
      } else {
        expect(photo.licence, photo.id).toMatch(/^CC BY-SA [34]\.0$/)
        expect(licenceUrl, photo.id).toMatch(/^https:\/\/creativecommons\.org\/.+\/$/)
      }
    }
  })
})
