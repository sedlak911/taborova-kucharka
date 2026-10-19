import { loadContent } from './loadContent'
import {
  FILTER_TAGS, FILTER_TAG_LABEL, HISTORIC_BEFORE_YEAR, QUICK_MAX_MINUTES,
  hasFilterTag, isHistoric, isQuick, recipeFilterTags,
} from './derivedTags'
import { EQUIPMENT_LABEL } from '@/pages/labels'
import type { Recipe } from '@/domain/types'

const { recipes } = loadContent()
const base = recipes.find((r) => r.id === 'chilli-con-carne')!
const withTime = (timeMinutes: number, tags: Recipe['tags'] = []): Recipe => ({ ...base, timeMinutes, tags })
const fromBook = (book: Recipe['source']['book']): Recipe => ({ ...base, source: { ...base.source, book } })

test('rychlé = nejvýš 45 minut', () => {
  expect(QUICK_MAX_MINUTES).toBe(45)
  expect(isQuick(withTime(45))).toBe(true)
  expect(isQuick(withTime(46))).toBe(false)
})

test('ruční tag rychle bez odpovídajícího času se ve filtru neprojeví', () => {
  expect(hasFilterTag(withTime(90, ['rychle']), 'rychle')).toBe(false)
  expect(hasFilterTag(withTime(20), 'rychle')).toBe(true)
})

test('historické = kniha vydaná před rokem 1950', () => {
  expect(HISTORIC_BEFORE_YEAR).toBe(1950)
  expect(isHistoric(fromBook('italian-1919'))).toBe(true)
  expect(isHistoric(fromBook('feldkochbuch-1940'))).toBe(true)
  expect(isHistoric(fromBook('rettigova-1868'))).toBe(true)
  expect(isHistoric(fromBook('glasse-1747'))).toBe(true)
  expect(isHistoric(fromBook('hauptmann-1877'))).toBe(true)
  expect(isHistoric(fromBook('wells-1890'))).toBe(true)
  expect(isHistoric(fromBook('army-baker-1945'))).toBe(true)
  expect(isHistoric(fromBook('receptury-1983'))).toBe(false)
  expect(isHistoric(fromBook('navy-1944'))).toBe(true)
  expect(isHistoric(fromBook('afrs-2003'))).toBe(false)
  expect(isHistoric(fromBook('vlastni'))).toBe(false)
})

test('sada štítků filtru: bez bez-masa a sladké, s popisky', () => {
  expect(FILTER_TAGS).toEqual(['levne', 'rychle', 'historicke', 'tabor', 'kotlik', 'pripravit-predem'])
  for (const t of FILTER_TAGS) expect(FILTER_TAG_LABEL[t]).toBeTruthy()
  // pilulka štítku se nesmí jmenovat stejně jako pilulka vybavení „kotlík“
  expect(FILTER_TAG_LABEL.kotlik).not.toBe(EQUIPMENT_LABEL.kotlik)
})

test('ruční štítky se čtou z dat', () => {
  expect(hasFilterTag({ ...base, tags: ['levne'] }, 'levne')).toBe(true)
  expect(hasFilterTag({ ...base, tags: [] }, 'levne')).toBe(false)
})

test('recipeFilterTags vrací ruční i odvozené štítky v pořadí FILTER_TAGS', () => {
  const r: Recipe = { ...base, timeMinutes: 30, tags: ['levne', 'bez-masa', 'sladke'], source: { ...base.source, book: 'navy-1944' } }
  expect(recipeFilterTags(r)).toEqual(['levne', 'rychle', 'historicke'])
})
