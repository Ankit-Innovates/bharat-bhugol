// The India Quiz: 51 facts about India, each a clue and its answer, in three parts. Typed answers
// match whole words, ignoring case, spaces and punctuation; `alt` lists other answers that count.
// Checked October 2026; the President and Prime Minister will need updating when they change.

import type { MapRegion } from '../game/types'

export type QuizSection = 'nation' | 'land' | 'people'

export interface QuizFact {
  section: QuizSection
  hint: string
  answer: string
  alt?: string[]
}

export const SECTION_TITLE: Record<QuizSection, string> = {
  nation: 'The nation',
  land: 'Land and water',
  people: 'People and places',
}

// Republic Day in the ways people write it: 26 January, January 26th, 26/01/1950…
const REPUBLIC_DAY = [
  ...['26', '26th'].flatMap((day) =>
    ['january', 'jan'].flatMap((month) =>
      ['', ' 1950'].flatMap((year) => [`${day} ${month}${year}`, `${month} ${day}${year}`]),
    ),
  ),
  '26/01/1950',
  '26/1/1950',
]

export const INDIA_QUIZ: readonly QuizFact[] = [
  // The nation
  {
    section: 'nation',
    hint: 'Official name',
    answer: 'Republic of India',
    alt: ['bharat', 'bharat ganarajya'],
  },
  { section: 'nation', hint: 'Capital city', answer: 'New Delhi' },
  { section: 'nation', hint: 'Colour of the flag', answer: 'Saffron', alt: ['kesari', 'orange'] },
  { section: 'nation', hint: 'Colour of the flag', answer: 'White' },
  { section: 'nation', hint: 'Colour of the flag', answer: 'Green', alt: ['india green'] },
  {
    section: 'nation',
    hint: 'National motto',
    answer: 'Truth Alone Triumphs',
    alt: ['satyameva jayate', 'satyamev jayate'],
  },
  { section: 'nation', hint: 'National anthem', answer: 'Jana Gana Mana', alt: ['jan gan man'] },
  { section: 'nation', hint: 'Nationality', answer: 'Indian' },
  { section: 'nation', hint: 'Republic Day', answer: 'January 26, 1950', alt: REPUBLIC_DAY },
  {
    section: 'nation',
    hint: 'Independence from',
    answer: 'United Kingdom',
    alt: ['uk', 'britain', 'great britain', 'england', 'the british', 'british empire'],
  },
  {
    section: 'nation',
    hint: 'Currency',
    answer: 'Indian Rupee',
    alt: ['rupee', 'rupees', 'inr', 'indian rupee inr'],
  },
  {
    section: 'nation',
    hint: 'President',
    answer: 'Droupadi Murmu',
    alt: ['murmu', 'draupadi murmu'],
  },
  { section: 'nation', hint: 'Prime Minister', answer: 'Narendra Modi', alt: ['modi'] },
  {
    section: 'nation',
    hint: 'Father of the Nation',
    answer: 'Mahatma Gandhi',
    alt: ['gandhi', 'gandhiji', 'mohandas gandhi', 'mohandas karamchand gandhi', 'bapu'],
  },
  { section: 'nation', hint: 'Official language', answer: 'Hindi' },
  { section: 'nation', hint: 'Official language', answer: 'English' },
  {
    section: 'nation',
    hint: 'Largest religion',
    answer: 'Hinduism',
    alt: ['hindu', 'hindus', 'hindu dharma', 'sanatana dharma', 'sanatan dharma'],
  },

  // Land and water
  { section: 'land', hint: 'Continent', answer: 'Asia', alt: ['south asia'] },
  { section: 'land', hint: 'Bordering country', answer: 'Pakistan' },
  { section: 'land', hint: 'Bordering country', answer: 'China' },
  { section: 'land', hint: 'Bordering country', answer: 'Nepal' },
  { section: 'land', hint: 'Bordering country', answer: 'Bhutan' },
  { section: 'land', hint: 'Bordering country', answer: 'Bangladesh' },
  { section: 'land', hint: 'Bordering country', answer: 'Myanmar', alt: ['burma'] },
  // On India's official map (and in NCERT textbooks) India also borders Afghanistan.
  { section: 'land', hint: 'Bordering country', answer: 'Afghanistan' },
  { section: 'land', hint: 'Bordering ocean', answer: 'Indian Ocean' },
  { section: 'land', hint: 'Bay of…', answer: 'Bay of Bengal', alt: ['bengal'] },
  { section: 'land', hint: 'Bordering sea', answer: 'Arabian Sea', alt: ['arabian'] },
  { section: 'land', hint: 'Bordering sea', answer: 'Andaman Sea', alt: ['andaman'] },
  {
    section: 'land',
    hint: 'Bordering sea',
    answer: 'Laccadive Sea',
    alt: ['laccadive', 'lakshadweep sea', 'lakshadweep'],
  },
  // Kangchenjunga (8,586 m) is the usual answer; India's official map puts K2 (8,611 m) inside it.
  {
    section: 'land',
    hint: 'Highest peak',
    answer: 'Kangchenjunga',
    alt: ['kanchenjunga', 'kanchanjunga', 'khangchendzonga', 'kangchendzonga', 'k2'],
  },
  // Not the Indian Ocean: Kuttanad, in Kerala, lies about 2 m below sea level.
  { section: 'land', hint: 'Lowest point', answer: 'Kuttanad', alt: ['kuttanadu'] },
  {
    section: 'land',
    hint: 'Longest river',
    answer: 'Ganga',
    alt: ['ganges', 'ganga river', 'ganges river'],
  },
  {
    section: 'land',
    hint: 'Highest mountain range',
    answer: 'Himalayas',
    alt: ['himalaya', 'the himalayas'],
  },

  // People and places (cities by population in the 2011 census, the latest)
  { section: 'people', hint: 'Largest city', answer: 'Mumbai', alt: ['bombay'] },
  { section: 'people', hint: '2nd largest city', answer: 'Delhi' },
  { section: 'people', hint: '3rd largest city', answer: 'Bengaluru', alt: ['bangalore'] },
  { section: 'people', hint: '4th largest city', answer: 'Hyderabad' },
  { section: 'people', hint: '5th largest city', answer: 'Ahmedabad', alt: ['amdavad'] },
  { section: 'people', hint: 'Largest state', answer: 'Rajasthan' },
  { section: 'people', hint: 'Smallest state', answer: 'Goa' },
  { section: 'people', hint: 'Number of states', answer: '28', alt: ['twenty eight'] },
  { section: 'people', hint: 'Voting age', answer: '18', alt: ['eighteen'] },
  {
    section: 'people',
    hint: 'Largest desert',
    answer: 'Thar Desert',
    alt: ['thar', 'great indian desert'],
  },
  {
    section: 'people',
    hint: 'National animal',
    answer: 'Tiger',
    alt: ['bengal tiger', 'royal bengal tiger'],
  },
  {
    section: 'people',
    hint: 'National bird',
    answer: 'Indian Peafowl',
    alt: ['peacock', 'peafowl', 'indian peacock'],
  },
  { section: 'people', hint: 'Most popular sport', answer: 'Cricket' },
  // India has never named a national game; hockey is the one usually called that.
  { section: 'people', hint: 'Called the national game', answer: 'Hockey', alt: ['field hockey'] },
  { section: 'people', hint: 'Famous mausoleum', answer: 'Taj Mahal', alt: ['taj'] },
  {
    section: 'people',
    hint: 'Fort in the capital',
    answer: 'Red Fort',
    alt: ['lal qila', 'lal quila', 'lal kila'],
  },
  { section: 'people', hint: 'Cars drive on the…', answer: 'Left' },
]

export const QUIZ_ANSWER_COUNT = INDIA_QUIZ.length

/** The facts as the game's places: each answer named, with its clue and part of the quiz. */
export function quizRegions(): MapRegion[] {
  return INDIA_QUIZ.map((fact) => ({
    name: fact.answer,
    alt: fact.alt ?? [],
    hint: fact.hint,
    section: fact.section,
    d: '',
    lx: 0,
    ly: 0,
  }))
}
