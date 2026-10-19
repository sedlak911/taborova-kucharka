import { BOOKLET_PAGE_CSS, bookletOrder, bookletPageCount, bookletSequence, packBlocks } from './booklet'

describe('bookletPageCount', () => {
  test.each([[0, 0], [1, 4], [3, 4], [4, 4], [5, 8], [8, 8], [9, 12]])('%i stran → %i', (n, total) => expect(bookletPageCount(n)).toBe(total))
})

describe('bookletOrder', () => {
  test('4 strany = 1 list: přední [4, 1], zadní [2, 3]', () =>
    expect(bookletOrder(4)).toEqual([{ front: [4, 1], back: [2, 3] }]))
  test('8 stran: list 1 [8, 1] / [2, 7], list 2 [6, 3] / [4, 5]', () =>
    expect(bookletOrder(8)).toEqual([
      { front: [8, 1], back: [2, 7] },
      { front: [6, 3], back: [4, 5] },
    ]))
  test('5 stran se doplní na 8 (strany 6–8 jsou prázdné)', () => expect(bookletOrder(5)).toEqual(bookletOrder(8)))
  test('0 stran = žádný list', () => expect(bookletOrder(0)).toEqual([]))
  test.each([4, 8, 12, 16, 40])('%i stran: každá strana právě jednou, protilehlé poloviny dávají součet N + 1', (n) => {
    expect([...bookletSequence(n)].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i + 1))
    for (const s of bookletOrder(n)) {
      expect(s.front[0] + s.front[1]).toBe(n + 1)
      expect(s.back[0] + s.back[1]).toBe(n + 1)
    }
  })
  test('za stranou 1 (vpravo vpředu) je strana 2 (vlevo vzadu) – překlápění po krátké straně', () => {
    const [first] = bookletOrder(12)
    expect(first.front[1]).toBe(1)
    expect(first.back[0]).toBe(2)
  })
  test('pořadí do tiskárny pro 12 stran', () =>
    expect(bookletSequence(12)).toEqual([12, 1, 2, 11, 10, 3, 4, 9, 8, 5, 6, 7]))
})

describe('packBlocks', () => {
  const b = (startsPage: boolean) => ({ startsPage })
  test('startsPage začíná novou stranou', () =>
    expect(packBlocks([b(true), b(true), b(false), b(true)], [10, 10, 10, 10], 100)).toEqual([[0], [1, 2], [3]]))
  test('blok, který se nevejde, jde celý na další stranu', () =>
    expect(packBlocks([b(true), b(false), b(false), b(false)], [40, 40, 30, 10], 100)).toEqual([[0, 1], [2, 3]]))
  test('blok přesně do kapacity zůstane na straně', () =>
    expect(packBlocks([b(true), b(false)], [60, 40], 100)).toEqual([[0, 1]]))
  test('blok vyšší než celá strana dostane stranu sám a nic dalšího se k němu nepřilepí', () =>
    expect(packBlocks([b(true), b(false), b(false)], [20, 250, 20], 100)).toEqual([[0], [1], [2]]))
  test('kapacita 0 (bez layoutu) dělí jen podle startsPage', () =>
    expect(packBlocks([b(true), b(false), b(false), b(true)], [0, 0, 0, 0], 0)).toEqual([[0, 1, 2], [3]]))
  test('první blok bez startsPage založí stranu', () => expect(packBlocks([b(false)], [5], 100)).toEqual([[0]]))
  test('chybějící výška se bere jako 0', () => expect(packBlocks([b(true), b(false)], [10], 100)).toEqual([[0, 1]]))
  test('prázdný vstup', () => expect(packBlocks([], [], 100)).toEqual([]))
})

test('brožurka se tiskne na A4 na šířku bez okrajů prohlížeče', () => {
  expect(BOOKLET_PAGE_CSS).toMatch(/size:\s*A4 landscape/)
  expect(BOOKLET_PAGE_CSS).toMatch(/margin:\s*0/)
})

test('packBlocks: NaN výška se bere jako 0 a nevypne dělení stran', () => {
  const blocks = [{ startsPage: true }, { startsPage: false }, { startsPage: false }]
  expect(packBlocks(blocks, [NaN, 60, 60], 100)).toEqual([[0, 1], [2]])
})
