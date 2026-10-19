import { CHAPTERS } from '@/domain/schema'
import type { Book, Chapter, Equipment, Ingredient, Recipe } from '@/domain/types'
import { hasFilterTag, type FilterTag } from './derivedTags'

export interface Filter {
  /** Štítky filtru (ruční + odvozené `rychle`/`historicke`), všechny musí platit. */
  tags: FilterTag[]
  equipment: Equipment[]
  books: Book[]
  favoritesOnly: boolean
  query: string
}

export const EMPTY_FILTER: Filter = { tags: [], equipment: [], books: [], favoritesOnly: false, query: '' }

/** Filtr něco omezuje (pak platí i pro listování knihou a hledání). */
export function isFilterActive(filter: Filter): boolean {
  return filter.tags.length > 0 || filter.equipment.length > 0 || filter.books.length > 0 || filter.favoritesOnly || filter.query.trim() !== ''
}

/** Značky uživatele u receptů (srdíčko, hrnec). */
export interface UserMarks {
  favorites: ReadonlySet<string>
}

export const NO_MARKS: UserMarks = { favorites: new Set() }

/** Malá písmena bez diakritiky (pro hledání bez ohledu na háčky a čárky). */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/** Normalizovaný text, ve kterém se hledá: názvy receptu a názvy + aliasy jeho surovin. */
export function searchHaystack(recipe: Recipe, ingredients: Map<string, Ingredient>): string {
  const parts = [recipe.title, recipe.titleOriginal ?? '', recipe.source.titleOriginal ?? '']
  for (const line of recipe.ingredients) {
    const ing = ingredients.get(line.ingredientId)
    if (ing) parts.push(ing.name, ...ing.aliases)
  }
  return normalize(parts.join('\n'))
}

export function filterRecipes(
  recipes: Recipe[],
  ingredients: Map<string, Ingredient>,
  filter: Filter,
  marks: UserMarks = NO_MARKS,
): Recipe[] {
  const query = normalize(filter.query.trim())
  return recipes.filter((r) => {
    if (filter.favoritesOnly && !marks.favorites.has(r.id)) return false
    if (!filter.tags.every((t) => hasFilterTag(r, t))) return false
    if (!filter.equipment.every((e) => r.equipment.includes(e))) return false
    if (filter.books.length > 0 && !filter.books.includes(r.source.book)) return false
    return query === '' || searchHaystack(r, ingredients).includes(query)
  })
}

export type TocRow = { kind: 'chapter'; chapter: Chapter } | { kind: 'recipe'; recipe: Recipe }

export function buildTocRows(recipes: Recipe[]): TocRow[] {
  const rows: TocRow[] = []
  for (const chapter of CHAPTERS) {
    const inChapter = recipes.filter((r) => r.chapter === chapter)
    if (inChapter.length === 0) continue
    rows.push({ kind: 'chapter', chapter })
    for (const recipe of inChapter) rows.push({ kind: 'recipe', recipe })
  }
  return rows
}

/**
 * Záložní odhad kapacity stránky obsahu v „jednotkách“ (1 jednotka = řádek receptu 23 px) – platí, dokud
 * prohlížeč stránku nezměří (jsdom, první vykreslení). Naměřené výšky viz `TocMetrics` (R9).
 */
export const TOC_PAGE_UNITS = 16
/** První stránka nese nadpis „Obsah“, panel filtrů a tlačítko „Nový recept“ (≈ 230 px; na 320 px se řádek „Moje“ zalomí). */
export const TOC_FIRST_PAGE_UNITS = 6
/** Delší název se na mobilu zalomí na dva řádky (odhad; při měření se použije skutečná výška). */
export const TOC_LONG_TITLE_CHARS = 18

/** Ikona „vlastní“ za názvem zabere asi dva znaky. */
const OWN_MARK_CHARS = 2

export function tocRowUnits(row: TocRow): number {
  if (row.kind === 'chapter') return 2 // nadpis s okrajem a linkou (35 px)
  const chars = row.recipe.title.length + (row.recipe.source.book === 'vlastni' ? OWN_MARK_CHARS : 0)
  return chars > TOC_LONG_TITLE_CHARS ? 2 : 1
}

/** Naměřené rozměry obsahu v px (TocProbe): kapacita těla stránky, hlavička první stránky, výška každého řádku podle `tocRowKey`. */
export interface TocMetrics {
  capacity: number
  head: number
  rows: ReadonlyMap<string, number>
}

/** Rezerva proti subpixelovému zaokrouhlení: stránka se plní nejvýš do kapacity minus 2 px. */
export const TOC_SAFETY_PX = 2

/** Klíč řádku obsahu pro měření (`data-toc-key`) i pro React. */
export function tocRowKey(row: TocRow): string {
  return row.kind === 'chapter' ? `c:${row.chapter}` : `r:${row.recipe.id}`
}

/** Měření je použitelné, jen když prohlížeč stránku opravdu rozložil (jsdom a skrytá kniha dávají nuly). */
export function usableMetrics(m: TocMetrics | null | undefined): m is TocMetrics {
  if (!m || !(m.capacity > 0) || !Number.isFinite(m.capacity) || !(m.head >= 0) || !Number.isFinite(m.head) || m.rows.size === 0) return false
  for (const h of m.rows.values()) if (!(h > 0) || !Number.isFinite(h)) return false
  return true
}

interface Sizing {
  first: number
  rest: number
  size: (row: TocRow) => number
}

function sizing(metrics: TocMetrics | null | undefined): Sizing {
  if (!usableMetrics(metrics)) return { first: TOC_FIRST_PAGE_UNITS, rest: TOC_PAGE_UNITS, size: tocRowUnits }
  // řádek, který se neměřil (nemělo by nastat), dostane výšku nejvyššího změřeného – raději víc místa než přetečení
  const fallback = Math.max(...metrics.rows.values())
  return {
    first: metrics.capacity - metrics.head - TOC_SAFETY_PX,
    rest: metrics.capacity - TOC_SAFETY_PX,
    size: (row) => metrics.rows.get(tocRowKey(row)) ?? fallback,
  }
}

/**
 * Rozdělí řádky obsahu na stránky: podle naměřených výšek, jinak podle odhadu v jednotkách (R9, R10).
 * Kapitoly navazují na téže stránce; nadpis kapitoly drží pohromadě s prvním receptem.
 * První stránka smí zůstat jen s hlavičkou (filtry vyšší než stránka); na další stránce se řádek umístí vždy.
 */
export function paginateTocRows(rows: TocRow[], metrics?: TocMetrics | null): TocRow[][] {
  const { first, rest, size } = sizing(metrics)
  const pages: TocRow[][] = [[]]
  let used = 0
  rows.forEach((row, i) => {
    const current = pages[pages.length - 1]
    const cap = pages.length === 1 ? first : rest
    const own = size(row)
    const next = rows[i + 1]
    const need = row.kind === 'chapter' && next?.kind === 'recipe' ? own + size(next) : own
    const emptyFirst = pages.length === 1 && current.length === 0
    if (used + need > cap && (current.length > 0 || emptyFirst)) {
      pages.push([row])
      used = own
    } else {
      current.push(row)
      used += own
    }
  })
  return pages
}

/**
 * Řádky pro stránku obsahu `page` z `total` (počet stránek je pevný podle nefiltrovaného obsahu).
 * Kdyby filtrovaný obsah potřeboval víc stránek, zbytek se vykreslí na poslední stránce (nic se neztratí).
 */
export function tocRowsForPage(pages: TocRow[][], page: number, total: number): TocRow[] {
  if (page === total - 1) return pages.slice(page).flat()
  return pages[page] ?? []
}

/** Počet stránek obsahu; počítá se z nefiltrovaného seznamu, aby se layout filtrem neměnil. */
export function tocPageCount(recipes: Recipe[], metrics?: TocMetrics | null): number {
  return paginateTocRows(buildTocRows(recipes), metrics).length
}
