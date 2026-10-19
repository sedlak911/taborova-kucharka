import { visiblePages, clampIndex, canGoNext, canGoPrev, nextIndex, prevIndex } from './model'

describe('visiblePages spread', () => {
  test('obal je sám vpravo', () => expect(visiblePages(0, 10, 'spread')).toEqual([null, 0]))
  test('první dvoustrana', () => expect(visiblePages(1, 10, 'spread')).toEqual([1, 2]))
  test('lichý počet stránek: vpravo prázdný list', () => expect(visiblePages(9, 10, 'spread')).toEqual([9, null]))
  test('sudý index se zarovná na lichý', () => expect(visiblePages(2, 10, 'spread')).toEqual([1, 2]))
})

describe('visiblePages single', () => {
  test('jedna stránka', () => expect(visiblePages(4, 10, 'single')).toEqual([4]))
})

describe('navigace', () => {
  test('z obalu na první dvoustranu', () => expect(nextIndex(0, 10, 'spread')).toBe(1))
  test('dál po dvou', () => expect(nextIndex(1, 10, 'spread')).toBe(3))
  test('zpět na obal', () => expect(prevIndex(1, 'spread')).toBe(0))
  test('prevIndex zarovná sudý index ve spread', () => expect(prevIndex(4, 'spread')).toBe(1))
  test('single po jedné', () => expect(nextIndex(3, 10, 'single')).toBe(4))
  test('na konci nelze dál (spread, 10 stran)', () => expect(canGoNext(9, 10, 'spread')).toBe(false))
  test('na konci nelze dál (single)', () => expect(canGoNext(9, 10, 'single')).toBe(false))
  test('na obalu nelze zpět', () => expect(canGoPrev(0)).toBe(false))
  test('nextIndex nepřeteče', () => expect(nextIndex(9, 10, 'spread')).toBe(9))
})

describe('clampIndex při změně režimu', () => {
  test('single 4 → spread zarovná na 3 (stránka 4 zůstane vidět)', () => expect(clampIndex(4, 10, 'spread')).toBe(3))
  test('spread 3 → single zůstane 3', () => expect(clampIndex(3, 10, 'single')).toBe(3))
  test('záporný index → 0', () => expect(clampIndex(-2, 10, 'single')).toBe(0))
  test('přes konec → poslední', () => expect(clampIndex(40, 10, 'single')).toBe(9))
})
