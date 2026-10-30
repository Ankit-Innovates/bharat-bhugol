// Photos of the monuments in the Famous architecture game, which also make up its card and the
// home page's picture. All from Wikimedia Commons under free licences. Each one is saved in
// public/photos/ as <id>-<width>.webp at every width in PHOTO_WIDTHS, and credited on the home
// page. The files have plain numbered names, so a file's address never gives the answer away. They
// carry no alt text: on the home page they are decoration, and in the game the photo is the question.

export interface PhotoInfo {
  id: string
  /** Where it was taken, for the credits. */
  place: string
  /** The part of the photo to keep in view when a card crops it (CSS object-position). */
  focus?: string
  /** The credit, as the author asks for it. */
  author: string
  licence: string
  /** The licence's text; none for photos in the public domain. */
  licenceUrl?: string
  /** The photo's page on Wikimedia Commons. */
  source: string
}

export const PHOTO_WIDTHS = [480, 960, 1440] as const

const COMMONS = 'https://commons.wikimedia.org/wiki/File:'
const BY_SA_4 = {
  licence: 'CC BY-SA 4.0',
  licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
}
const BY_SA_3 = {
  licence: 'CC BY-SA 3.0',
  licenceUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
}
const PUBLIC = { licence: 'Public domain' }

export const PHOTOS = {
  ...monument(
    '01',
    'tajMahal',
    'Taj Mahal, Agra',
    '© Asitjain / Wikimedia Commons',
    BY_SA_3,
    'Taj_Mahal_N-UP-A28-a.jpg',
    '50% 40%',
  ),
  ...monument(
    '02',
    'qutubMinar',
    'Qutub Minar, Delhi',
    'Shankey007',
    BY_SA_4,
    'QUTB_MINAR_DSC_0655.jpg',
  ),
  ...monument(
    '03',
    'redFort',
    'Red Fort, Delhi',
    'Lucky181993',
    BY_SA_4,
    'Lahori_Gate_(Red_Fort),_Delhi,_India_(2017).jpg',
  ),
  ...monument(
    '04',
    'hawaMahal',
    'Hawa Mahal, Jaipur',
    'Wander-earth',
    BY_SA_4,
    'Hawa_Mahal_in_Jaipur_India.jpg',
  ),
  ...monument(
    '05',
    'mehrangarh',
    'Mehrangarh Fort, Jodhpur',
    'Knowledge Seeker',
    PUBLIC,
    'Mehrangarh_Fort.jpg',
  ),
  ...monument(
    '06',
    'goldenTemple',
    'Golden Temple, Amritsar',
    'Oleg Yunakov',
    BY_SA_3,
    'Hamandir_Sahib_(Golden_Temple).jpg',
  ),
  ...monument(
    '07',
    'gatewayOfIndia',
    'Gateway of India, Mumbai',
    'SriSriChinmaya',
    BY_SA_4,
    'Gateway_of_India_in_the_evening,_Mumbai,_India.jpg',
  ),
  ...monument(
    '08',
    'ellora',
    'Kailasa Temple, Ellora Caves',
    'Shishirdasika',
    BY_SA_4,
    'Kailasa_Ellora.jpg',
  ),
  ...monument(
    '09',
    'charminar',
    'Charminar, Hyderabad',
    'Ravi Dwivedi',
    BY_SA_4,
    'Iconic_Charminar_in_Hyderabad,_India.jpg',
  ),
  ...monument(
    '10',
    'victoriaMemorial',
    'Victoria Memorial, Kolkata',
    'Bernard Gagnon',
    BY_SA_3,
    'Victoria_Memorial,_Kolkata_-_West_facade_01.jpg',
  ),
  ...monument(
    '11',
    'mysorePalace',
    'Mysore Palace, Mysuru',
    'Whistleraja',
    BY_SA_4,
    'Mysore_Palace_-_Amba_Vilas_Palace.jpg',
  ),
  ...monument(
    '12',
    'hampi',
    'Stone chariot, Hampi',
    'Ajayreddykalavalli',
    BY_SA_4,
    'Stone_Chariot,_Hampi_2.jpg',
  ),
  ...monument(
    '13',
    'konark',
    'Sun Temple, Konark',
    'Joydeep Chakraborty',
    BY_SA_4,
    'Konark_Sun_Temple_Puri_district,_Odisha,_India_3.jpg',
  ),
  ...monument(
    '14',
    'meenakshi',
    'Meenakshi Temple, Madurai',
    'Madhuranthakan Jagadeesan',
    BY_SA_4,
    'S-TN-34_Meenakshi_Amman_Temple_South_Gopuram_enriched_with_delicate_Stucco_works.jpg',
  ),
  ...monument(
    '15',
    'brihadeeswarar',
    'Brihadeeswarar Temple, Thanjavur',
    'Cafeskool',
    BY_SA_4,
    'Brihadeeswarar_temple_evening,_Thanjavur,_Tamilnadu.jpg',
  ),
  ...monument(
    '16',
    'khajuraho',
    'Kandariya Mahadeva Temple, Khajuraho',
    'Taru23',
    BY_SA_4,
    'The_Kandariya_Mahadeva_Temple,_Khajuraho,_Madhya_Pradesh.jpg',
  ),
  ...monument(
    '17',
    'sanchi',
    'Great Stupa, Sanchi',
    'Suyash Dwivedi',
    BY_SA_4,
    'Great_Sanchi_Stupa_(3).jpg',
  ),
  ...monument(
    '18',
    'mahabodhi',
    'Mahabodhi Temple, Bodh Gaya',
    'Rohit Sharma',
    BY_SA_4,
    'Mahabodhi_temple_complex,_Bodhgaya_23.jpg',
  ),
  ...monument(
    '19',
    'raniKiVav',
    'Rani ki Vav, Patan',
    'Bernard Gagnon',
    BY_SA_3,
    'Rani_ki_vav_12.jpg',
  ),
  ...monument(
    '20',
    'bomJesus',
    'Basilica of Bom Jesus, Old Goa',
    'iMahesh',
    BY_SA_4,
    'Front_Elevation_of_Basilica_of_Bom_Jesus.jpg',
  ),
  ...monument(
    '21',
    'kamakhya',
    'Kamakhya Temple, Guwahati',
    'JyotiPN',
    BY_SA_4,
    'The_Kamakhya_Temple,_Guwahati,_Assam.jpg',
  ),
} satisfies Record<string, PhotoInfo>

/** A monument's photo for the Famous architecture game, saved as arch-<number>. */
function monument<K extends string>(
  number: string,
  key: K,
  place: string,
  author: string,
  licence: { licence: string; licenceUrl?: string },
  file: string,
  focus?: string,
): Record<K, PhotoInfo> {
  const photo: PhotoInfo = {
    id: `arch-${number}`,
    place,
    author,
    ...licence,
    source: `${COMMONS}${file}`,
  }
  if (focus) photo.focus = focus
  return { [key]: photo } as Record<K, PhotoInfo>
}

/** Each monument's photo, by the monument's name in monuments-map.json. */
export const MONUMENT_PHOTOS: Readonly<Record<string, PhotoInfo>> = {
  'Taj Mahal': PHOTOS.tajMahal,
  'Qutub Minar': PHOTOS.qutubMinar,
  'Red Fort': PHOTOS.redFort,
  'Hawa Mahal': PHOTOS.hawaMahal,
  'Mehrangarh Fort': PHOTOS.mehrangarh,
  'Golden Temple': PHOTOS.goldenTemple,
  'Gateway of India': PHOTOS.gatewayOfIndia,
  'Ellora Caves': PHOTOS.ellora,
  Charminar: PHOTOS.charminar,
  'Victoria Memorial': PHOTOS.victoriaMemorial,
  'Mysore Palace': PHOTOS.mysorePalace,
  Hampi: PHOTOS.hampi,
  'Konark Sun Temple': PHOTOS.konark,
  'Meenakshi Temple': PHOTOS.meenakshi,
  'Brihadeeswarar Temple': PHOTOS.brihadeeswarar,
  'Khajuraho Temples': PHOTOS.khajuraho,
  'Sanchi Stupa': PHOTOS.sanchi,
  'Mahabodhi Temple': PHOTOS.mahabodhi,
  'Rani ki Vav': PHOTOS.raniKiVav,
  'Basilica of Bom Jesus': PHOTOS.bomJesus,
  'Kamakhya Temple': PHOTOS.kamakhya,
}

/** The address of a photo's file at one of its widths. */
export function photoUrl(photo: PhotoInfo, width: number): string {
  return `${import.meta.env.BASE_URL}photos/${photo.id}-${width}.webp`
}
