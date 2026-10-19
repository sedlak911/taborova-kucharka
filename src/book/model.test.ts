import { visiblePages, clampIndex, canGoNext, canGoPrev, canStep, nextIndex, prevIndex, stepIndex } from './model'

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

describe('listování se skrytými stránkami (filtr)', () => {
  const hiddenSet = (...pages: number[]) => (p: number) => pages.includes(p)
  test('bez skrytých stránek stejné jako nextIndex/prevIndex', () => {
    expect(stepIndex(1, 'next', 10, 'spread')).toBe(3)
    expect(stepIndex(3, 'prev', 10, 'spread')).toBe(1)
    expect(stepIndex(4, 'next', 10, 'single')).toBe(5)
  })
  test('spread: celá skrytá dvoustrana se přeskočí', () => {
    expect(stepIndex(1, 'next', 10, 'spread', hiddenSet(3, 4, 5, 6))).toBe(7)
    expect(stepIndex(7, 'prev', 10, 'spread', hiddenSet(3, 4, 5, 6))).toBe(1)
  })
  test('spread: dvoustrana s jedinou viditelnou stránkou se nepřeskočí', () => {
    expect(stepIndex(1, 'next', 10, 'spread', hiddenSet(3))).toBe(3)
  })
  test('single: skryté stránky se přeskočí oběma směry', () => {
    expect(stepIndex(2, 'next', 10, 'single', hiddenSet(3, 4))).toBe(5)
    expect(stepIndex(5, 'prev', 10, 'single', hiddenSet(3, 4))).toBe(2)
  })
  test('za skrytými stránkami už nic není: zůstane stát a dál nejde', () => {
    expect(stepIndex(6, 'next', 10, 'single', hiddenSet(7, 8, 9))).toBe(6)
    expect(canStep(6, 'next', 10, 'single', hiddenSet(7, 8, 9))).toBe(false)
    expect(canStep(6, 'prev', 10, 'single', hiddenSet(7, 8, 9))).toBe(true)
  })
  test('ze skryté stránky (skok odkazem) se listuje normálně dál', () => {
    expect(stepIndex(3, 'next', 10, 'single', hiddenSet(3, 4))).toBe(5)
  })
})
