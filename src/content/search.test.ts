import { loadContent } from './loadContent'
import { FILTER_TAGS } from './derivedTags'
import {
  EMPTY_FILTER, TOC_FIRST_PAGE_UNITS, TOC_LONG_TITLE_CHARS, TOC_PAGE_UNITS, TOC_SAFETY_PX,
  buildTocRows, filterRecipes, isFilterActive, normalize, paginateTocRows, tocPageCount, tocRowKey, tocRowUnits, tocRowsForPage, usableMetrics,
  type Filter, type TocMetrics, type TocRow,
} from './search'
import { BOOKS, EQUIPMENT } from '@/domain/schema'
import { customRecipe } from '@/test/customRecipe'

const { recipes, ingredients } = loadContent()
const ids = (f: Partial<Filter>, marks: { fav?: string[] } = {}) =>
  filterRecipes(recipes, ingredients, { ...EMPTY_FILTER, ...f }, { favorites: new Set(marks.fav) }).map((r) => r.id)

test('normalize odstraní diakritiku a velká písmena', () => {
  expect(normalize('Čočková polévka')).toBe('cockova polevka')
})

test('prázdný filtr vrací vše; bez značek (výchozí NO_MARKS) taky', () => {
  expect(ids({})).toHaveLength(recipes.length)
  expect(filterRecipes(recipes, ingredients, EMPTY_FILTER)).toHaveLength(recipes.length)
})

test('query bez diakritiky najde recept podle názvu', () => {
  expect(ids({ query: 'cocka' })).toContain('cockova-polevka')
})

test('query najde recept přes název suroviny', () => {
  expect(ids({ query: 'treska' })).toContain('pecena-ryba')
})

test('favoritesOnly s prázdnými oblíbenými vrací []', () => {
  expect(ids({ favoritesOnly: true })).toEqual([])
  expect(ids({ favoritesOnly: true }, { fav: ['cockova-polevka'] })).toEqual(['cockova-polevka'])
})

test('filtr nemá „jen uvařené“', () => expect(Object.keys(EMPTY_FILTER).sort()).toEqual(['books', 'equipment', 'favoritesOnly', 'query', 'tags']))

test('štítek a kniha tvoří průnik', () => {
  const both = ids({ tags: ['levne'], books: ['navy-1944'] })
  expect(both.length).toBeGreaterThan(0)
  for (const id of both) {
    const r = recipes.find((x) => x.id === id)!
    expect(r.tags).toContain('levne')
    expect(r.source.book).toBe('navy-1944')
  }
})

test('rychlé je odvozené z času, ne z ručního tagu', () => {
  const quick = ids({ tags: ['rychle'] })
  expect(quick).toHaveLength(recipes.filter((r) => r.timeMinutes <= 45).length)
  expect(quick.length).toBeGreaterThan(recipes.filter((r) => r.tags.includes('rychle')).length)
})

test('historické = knihy vydané před rokem 1950 (ne AFRS 2003 ani Receptury 1983)', () => {
  const hist = ids({ tags: ['historicke'] })
  expect(hist.length).toBeGreaterThan(0)
  expect(hist).toHaveLength(recipes.filter((r) => !['afrs-2003', 'receptury-1983', 'vlastni'].includes(r.source.book)).length)
})

const units = (rows: TocRow[]) => rows.reduce((s, r) => s + tocRowUnits(r), 0)

test('jednotky řádků: kapitola 2, dlouhý název 2, jinak 1', () => {
  const short = recipes.find((r) => r.title.length <= TOC_LONG_TITLE_CHARS)!
  const long = recipes.find((r) => r.title.length > TOC_LONG_TITLE_CHARS)!
  expect(tocRowUnits({ kind: 'chapter', chapter: 'polevky' })).toBe(2)
  expect(tocRowUnits({ kind: 'recipe', recipe: short })).toBe(1)
  expect(tocRowUnits({ kind: 'recipe', recipe: long })).toBe(2)
})

test('žádná stránka obsahu nepřekročí kapacitu a každý recept je tam právě jednou', () => {
  const pages = paginateTocRows(buildTocRows(recipes))
  pages.forEach((p, i) => expect(units(p)).toBeLessThanOrEqual(i === 0 ? TOC_FIRST_PAGE_UNITS : TOC_PAGE_UNITS))
  const ids = pages.flat().flatMap((r) => (r.kind === 'recipe' ? [r.recipe.id] : []))
  expect([...ids].sort()).toEqual(recipes.map((r) => r.id).sort())
  expect(tocPageCount(recipes)).toBe(pages.length)
})

test('nadpis kapitoly nezůstane sám na konci stránky', () => {
  for (const p of paginateTocRows(buildTocRows(recipes))) expect(p.at(-1)?.kind).toBe('recipe')
})

test('prázdný seznam má jednu (prázdnou) stránku', () => {
  expect(paginateTocRows([])).toEqual([[]])
  expect(tocPageCount([])).toBe(1)
})

test('každý jednotlivý filtr se vejde do počtu stránek nefiltrovaného obsahu', () => {
  const total = tocPageCount(recipes)
  const filters: Partial<Filter>[] = [
    ...FILTER_TAGS.map((t) => ({ tags: [t] })),
    ...EQUIPMENT.map((e) => ({ equipment: [e] })),
    ...BOOKS.map((b) => ({ books: [b] })),
  ]
  for (const f of filters) {
    const filtered = filterRecipes(recipes, ingredients, { ...EMPTY_FILTER, ...f })
    expect(paginateTocRows(buildTocRows(filtered)).length).toBeLessThanOrEqual(total)
  }
})

test('tocRowsForPage: přebytek filtrovaných stránek dostane poslední stránka obsahu', () => {
  const r = (n: number): TocRow => ({ kind: 'recipe', recipe: recipes[n] })
  const pages = [[r(0)], [r(1)], [r(2)], [r(3)]]
  expect(tocRowsForPage(pages, 0, 2)).toEqual([r(0)])
  expect(tocRowsForPage(pages, 1, 2)).toEqual([r(1), r(2), r(3)])
  expect(tocRowsForPage([[r(0)]], 1, 3)).toEqual([])
})

test('vlastní recept: ikona za názvem prodlouží řádek o 2 znaky', () => {
  const title = 'x'.repeat(TOC_LONG_TITLE_CHARS - 1)
  expect(tocRowUnits({ kind: 'recipe', recipe: customRecipe({ title }) })).toBe(2)
  expect(tocRowUnits({ kind: 'recipe', recipe: { ...customRecipe({ title }), baseServings: 4, source: { book: 'afrs-2003' } } })).toBe(1)
})

test('první stránka obsahu nese 6 jednotek (nadpis, filtry a tlačítko Nový recept)', () => expect(TOC_FIRST_PAGE_UNITS).toBe(6))

const allRows = buildTocRows(recipes)
// výšky jako v prohlížeči: kapitola 40 px, recept 24 px, dvouřádkový název 46 px
const sizes = new Map(allRows.map((row) => [tocRowKey(row), row.kind === 'chapter' ? 40 : row.recipe.title.length > 30 ? 46 : 24]))
const desktop: TocMetrics = { capacity: 640, head: 230, rows: sizes }
const height = (rows: TocRow[]) => rows.reduce((s, r) => s + sizes.get(tocRowKey(r))!, 0)

test('tocRowKey je jednoznačný pro kapitoly i recepty', () => {
  const keys = allRows.map(tocRowKey)
  expect(new Set(keys).size).toBe(keys.length)
  expect(tocRowKey({ kind: 'chapter', chapter: 'polevky' })).toBe('c:polevky')
  expect(tocRowKey({ kind: 'recipe', recipe: recipes[0] })).toBe(`r:${recipes[0].id}`)
})

test('naměřené výšky: žádná stránka nepřeteče a každá je zaplněná (další řádek by se nevešel)', () => {
  const pages = paginateTocRows(allRows, desktop)
  pages.forEach((page, i) => {
    const cap = (i === 0 ? desktop.capacity - desktop.head : desktop.capacity) - TOC_SAFETY_PX
    expect(height(page)).toBeLessThanOrEqual(cap)
    const next = pages[i + 1]
    if (!next) return
    const need = sizes.get(tocRowKey(next[0]))! + (next[0].kind === 'chapter' ? sizes.get(tocRowKey(next[1]))! : 0)
    expect(height(page) + need).toBeGreaterThan(cap)
  })
  expect(pages.flat()).toHaveLength(allRows.length)
})

test('kapitoly navazují na téže stránce a nadpis kapitoly nezůstane sám na konci', () => {
  const pages = paginateTocRows(allRows, desktop)
  // kapitola nezačíná novou stránkou: aspoň jeden nadpis kapitoly stojí pod recepty předchozí kapitoly
  expect(pages.some((p) => p.slice(1).some((r) => r.kind === 'chapter'))).toBe(true)
  for (const p of pages) if (p.length) expect(p.at(-1)?.kind).toBe('recipe')
})

test('naměřená kapacita dává méně stránek než odhad v jednotkách (stránky se skutečně využijí)', () => {
  expect(paginateTocRows(allRows, desktop).length).toBeLessThan(paginateTocRows(allRows).length)
  expect(tocPageCount(recipes, desktop)).toBe(paginateTocRows(allRows, desktop).length)
})

test('hlavička vyšší než stránka: první stránka zůstane jen s filtry, řádky začnou na druhé', () => {
  const pages = paginateTocRows(allRows, { capacity: 300, head: 400, rows: sizes })
  expect(pages[0]).toEqual([])
  expect(pages[1][0].kind).toBe('chapter')
  expect(pages.flat()).toHaveLength(allRows.length)
})

test('nepoužitelné měření (nuly z jsdom nebo skryté knihy) → odhad v jednotkách', () => {
  const zero = new Map([...sizes.keys()].map((k) => [k, 0]))
  expect(usableMetrics({ capacity: 0, head: 0, rows: sizes })).toBe(false)
  expect(usableMetrics({ capacity: 640, head: 0, rows: zero })).toBe(false)
  expect(usableMetrics({ capacity: 640, head: 0, rows: new Map() })).toBe(false)
  expect(usableMetrics(null)).toBe(false)
  expect(usableMetrics(desktop)).toBe(true)
  expect(paginateTocRows(allRows, { capacity: 640, head: 0, rows: zero })).toEqual(paginateTocRows(allRows))
})

test('isFilterActive: prázdný filtr ne, cokoli zapnutého ano', () => {
  expect(isFilterActive(EMPTY_FILTER)).toBe(false)
  expect(isFilterActive({ ...EMPTY_FILTER, query: '  ' })).toBe(false)
  expect(isFilterActive({ ...EMPTY_FILTER, tags: ['levne'] })).toBe(true)
  expect(isFilterActive({ ...EMPTY_FILTER, equipment: ['lednice'] })).toBe(true)
  expect(isFilterActive({ ...EMPTY_FILTER, books: ['navy-1944'] })).toBe(true)
  expect(isFilterActive({ ...EMPTY_FILTER, favoritesOnly: true })).toBe(true)
})
