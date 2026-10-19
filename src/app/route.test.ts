import { editorRouteFromHash, parseRoute, routeToHash, routeToIndex, indexToRoute, type LayoutLike } from './route'

// ručně sestavený layout: 0 obal, 1–2 o knize, 3 obsah, 4 kapitola polévky, 5–6 recepty, 7 košík, 8 seznam, 9 nastavení
const layout: LayoutLike = {
  entries: [
    { kind: 'cover' }, { kind: 'about' }, { kind: 'about' }, { kind: 'toc' },
    { kind: 'chapter', chapter: 'polevky' },
    { kind: 'recipe', recipeId: 'hovezi-gulas', chapter: 'polevky' },
    { kind: 'recipe', recipeId: 'kulajda', chapter: 'polevky' },
    { kind: 'cart' }, { kind: 'list' }, { kind: 'settings' },
  ],
  recipeIndex: new Map([['hovezi-gulas', 5], ['kulajda', 6]]),
  chapterIndex: new Map([['polevky', 4]]),
  tocIndex: 3,
  cartIndex: 7,
  listIndex: 8,
  settingsIndex: 9,
}

test('parseRoute', () => {
  expect(parseRoute('#/recept/hovezi-gulas')).toEqual({ kind: 'recipe', id: 'hovezi-gulas' })
  expect(parseRoute('#/kapitola/polevky')).toEqual({ kind: 'chapter', id: 'polevky' })
  expect(parseRoute('#/obsah')).toEqual({ kind: 'toc' })
  expect(parseRoute('#/seznam')).toEqual({ kind: 'list' })
  expect(parseRoute('#/nastaveni')).toEqual({ kind: 'settings' })
  expect(parseRoute('')).toEqual({ kind: 'cover' })
  expect(parseRoute('#')).toEqual({ kind: 'cover' })
  expect(parseRoute('#/')).toEqual({ kind: 'cover' })
})

test('parseRoute vrací null pro neplatný hash', () => {
  expect(parseRoute('#/nesmysl')).toBeNull()
  expect(parseRoute('#/kapitola/neexistuje')).toBeNull()
  expect(parseRoute('#/kapitola')).toBeNull()
  expect(parseRoute('#/recept')).toBeNull()
  expect(parseRoute('#/recept/%E0%A4%A')).toBeNull()
})

test('routeToHash je inverzí parseRoute', () => {
  for (const h of ['#/recept/kulajda', '#/kapitola/polevky', '#/obsah', '#/kosik', '#/seznam', '#/nastaveni']) {
    expect(routeToHash(parseRoute(h)!)).toBe(h)
  }
})

test('routeToIndex', () => {
  expect(routeToIndex({ kind: 'cover' }, layout)).toBe(0)
  expect(routeToIndex({ kind: 'recipe', id: 'kulajda' }, layout)).toBe(6)
  expect(routeToIndex({ kind: 'recipe', id: 'neexistuje' }, layout)).toBeNull()
  expect(routeToIndex({ kind: 'chapter', id: 'polevky' }, layout)).toBe(4)
  expect(routeToIndex({ kind: 'chapter', id: 'sladke' }, layout)).toBeNull()
  expect(routeToIndex({ kind: 'toc' }, layout)).toBe(3)
  expect(routeToIndex({ kind: 'list' }, layout)).toBe(8)
  expect(routeToIndex({ kind: 'settings' }, layout)).toBe(9)
})

test('indexToRoute', () => {
  expect(indexToRoute(0, layout)).toEqual({ kind: 'cover' })
  expect(indexToRoute(2, layout)).toEqual({ kind: 'cover' })
  expect(indexToRoute(3, layout)).toEqual({ kind: 'toc' })
  expect(indexToRoute(4, layout)).toEqual({ kind: 'chapter', id: 'polevky' })
  expect(indexToRoute(6, layout)).toEqual({ kind: 'recipe', id: 'kulajda' })
  expect(indexToRoute(7, layout)).toEqual({ kind: 'cart' })
  expect(indexToRoute(8, layout)).toEqual({ kind: 'list' })
  expect(indexToRoute(9, layout)).toEqual({ kind: 'settings' })
})

test('routa košíku #/kosik má stránku', () => {
  expect(parseRoute('#/kosik')).toEqual({ kind: 'cart' })
  expect(routeToHash({ kind: 'cart' })).toBe('#/kosik')
  expect(routeToIndex({ kind: 'cart' }, layout)).toBe(7)
})

test('routy formuláře vlastního receptu', () => {
  expect(parseRoute('#/novy-recept')).toEqual({ kind: 'new-recipe' })
  expect(parseRoute('#/recept/vlastni-kase-ab12/upravit')).toEqual({ kind: 'edit-recipe', id: 'vlastni-kase-ab12' })
  expect(parseRoute('#/recept/vlastni-kase-ab12')).toEqual({ kind: 'recipe', id: 'vlastni-kase-ab12' })
  expect(routeToHash({ kind: 'new-recipe' })).toBe('#/novy-recept')
  expect(routeToHash({ kind: 'edit-recipe', id: 'kulajda' })).toBe('#/recept/kulajda/upravit')
  expect(routeToIndex({ kind: 'new-recipe' }, layout)).toBe(layout.tocIndex)
  expect(routeToIndex({ kind: 'edit-recipe', id: 'kulajda' }, layout)).toBe(6)
  expect(routeToIndex({ kind: 'edit-recipe', id: 'neni' }, layout)).toBeNull()
})

test('editorRouteFromHash: jen routy formuláře', () => {
  expect(editorRouteFromHash('#/novy-recept')).toEqual({ kind: 'new-recipe' })
  expect(editorRouteFromHash('#/recept/kulajda/upravit')).toEqual({ kind: 'edit-recipe', id: 'kulajda' })
  expect(editorRouteFromHash('#/recept/kulajda')).toBeNull()
  expect(editorRouteFromHash('#/nesmysl')).toBeNull()
  expect(editorRouteFromHash('')).toBeNull()
})

test('indexToRoute: prázdná strana před kapitolou ukazuje na kapitolu (dvoustrana [prázdná | kapitola])', () => {
  const withBlank: LayoutLike = {
    ...layout,
    entries: [
      { kind: 'cover' }, { kind: 'toc' },
      { kind: 'chapter', chapter: 'polevky' }, { kind: 'recipe', recipeId: 'kulajda', chapter: 'polevky' }, { kind: 'recipe', recipeId: 'kulajda', chapter: 'polevky' },
      { kind: 'blank' }, { kind: 'chapter', chapter: 'sladke' }, { kind: 'cart' },
    ],
  }
  expect(indexToRoute(5, withBlank)).toEqual({ kind: 'chapter', id: 'sladke' })
  expect(indexToRoute(4, withBlank)).toEqual({ kind: 'recipe', id: 'kulajda' })
})
