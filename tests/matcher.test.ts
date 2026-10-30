import { describe, expect, it } from 'vitest'
import { matchName, normalise } from '../src/game/matcher'
import { india, map } from './fixtures'

describe('normalise', () => {
  it('lowercases, strips accents and keeps only a–z and digits', () => {
    expect(normalise('Agar-Malwa')).toBe('agarmalwa')
    expect(normalise('  Sha hdol ')).toBe('shahdol')
    expect(normalise('Ujjaín')).toBe('ujjain')
    expect(normalise('ＲＥＷＡ')).toBe('rewa') // full-width letters, folded by NFKD
    expect(normalise('January 26, 1950')).toBe('january261950')
    expect(normalise(' !? ')).toBe('')
  })
})

describe('matchName', () => {
  it.each([
    ['hoshangabad', 'Narmadapuram'],
    ['WEST NIMAR', 'Khargone'],
    ['sha hdol', 'Shahdol'],
    ['Agar-Malwa', 'Agar Malwa'],
    ['pandurna', 'Pandhurna'],
    ['Jabal', null],
    ['', null],
  ])('%j → %s', (text, expected) => {
    expect(matchName(text, map.districts)).toBe(expected)
  })

  it('matches division names and their old names', () => {
    expect(matchName('hoshangabad', map.divisions)).toBe('Narmadapuram')
    expect(matchName('REWA', map.divisions)).toBe('Rewa')
    expect(matchName('narsimhapur', map.divisions)).toBeNull()
  })

  it('accepts the other listed spellings', () => {
    expect(matchName('East Nimar', map.districts)).toBe('Khandwa')
    expect(matchName('narsimhapur', map.districts)).toBe('Narsinghpur')
    expect(matchName('Ashok Nagar', map.districts)).toBe('Ashoknagar')
  })

  it('only matches names that are still remaining', () => {
    const remaining = map.districts.filter((r) => r.name !== 'Shahdol')
    expect(matchName('shahdol', remaining)).toBeNull()
    expect(matchName('shahdol', [])).toBeNull()
  })

  it('needs the whole name: no prefixes, extras or near misses', () => {
    expect(matchName('Narmada', map.districts)).toBeNull()
    expect(matchName('Rewa x', map.districts)).toBeNull()
    expect(matchName('Satnaa', map.districts)).toBeNull()
  })

  it('matches Indian states and union territories by their old names and short forms', () => {
    expect(matchName('Orissa', india.regions)).toBe('Odisha')
    expect(matchName('pondicherry', india.regions)).toBe('Puducherry')
    expect(matchName('Uttaranchal', india.regions)).toBe('Uttarakhand')
    expect(matchName('Andaman & Nicobar', india.regions)).toBe('Andaman and Nicobar Islands')
    expect(matchName('Daman and Diu', india.regions)).toBe(
      'Dadra and Nagar Haveli and Daman and Diu',
    )
    expect(matchName('NCT of Delhi', india.regions)).toBe('Delhi')
    expect(matchName('Jammu & Kashmir', india.regions)).toBe('Jammu and Kashmir')
    expect(matchName('An', india.regions)).toBeNull()
    expect(matchName('Pradesh', india.regions)).toBeNull()
  })

  it('ignores text without letters', () => {
    expect(matchName(' - ', map.districts)).toBeNull()
  })
})
