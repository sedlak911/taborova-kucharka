import { render, screen, fireEvent } from '@testing-library/react'
import { loadContent } from '@/content/loadContent'
import { FILTER_TAGS, FILTER_TAG_LABEL } from '@/content/derivedTags'
import { EMPTY_FILTER, buildTocRows, tocPageCount, tocRowKey } from '@/content/search'
import { buildLayout } from '@/content/buildPages'
import { routeToIndex, type Route } from '@/app/route'
import { mergeRecipes } from '@/content/customRecipes'
import { customRecipe } from '@/test/customRecipe'
import { TocPages } from './TocPages'

const { recipes, ingredients } = loadContent()
const pageNumbers = new Map(recipes.map((r, i) => [r.id, i + 10]))

function setup(over: Partial<React.ComponentProps<typeof TocPages>> = {}) {
  const props = {
    recipes,
    ingredients,
    filter: EMPTY_FILTER,
    onFilterChange: vi.fn(),
    favorites: new Set<string>(),
    pageNumbers,
    page: 0,
    onNavigate: vi.fn(),
    onToggleFavorite: vi.fn(),
    inCart: new Set<string>(),
    onToggleCart: vi.fn(),
    ...over,
  }
  return { ...render(<TocPages {...props} />), props }
}

test('tocPageCount je alespoň 1 a počítá z nefiltrovaného seznamu', () => {
  expect(tocPageCount([])).toBe(1)
  expect(tocPageCount(recipes)).toBeGreaterThanOrEqual(1)
})

test('klik na řádek volá onNavigate s routou receptu', () => {
  const { props } = setup()
  const first = recipes[0]
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${first.title.replace(/[()]/g, '\\$&')}`) }))
  expect(props.onNavigate).toHaveBeenCalledWith({ kind: 'recipe', id: first.id })
})

test('prázdný výsledek ukáže „Nic nenalezeno.“', () => {
  setup({ filter: { ...EMPTY_FILTER, query: 'zzzzqqq' } })
  expect(screen.getByText('Nic nenalezeno.')).toBeInTheDocument()
})

test('prázdné oblíbené ukážou nápovědu se srdíčkem', () => {
  setup({ filter: { ...EMPTY_FILTER, favoritesOnly: true } })
  expect(screen.getByText('Zatím žádné oblíbené recepty – označ srdíčko u receptu.')).toBeInTheDocument()
})

test('pilulky štítků: jen sada filtru, bez „bez masa“ a „sladké“', () => {
  setup()
  for (const t of FILTER_TAGS) expect(screen.getByRole('button', { name: FILTER_TAG_LABEL[t] })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'bez masa' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'sladké' })).toBeNull()
})

test('pilulka štítku přepne filtr', () => {
  const { props } = setup()
  fireEvent.click(screen.getByRole('button', { name: 'levné' }))
  expect(props.onFilterChange).toHaveBeenCalledWith({ ...EMPTY_FILTER, tags: ['levne'] })
})

test('pilulka „Jen oblíbené“; filtr „Jen uvařené“ je zrušený', () => {
  const { props } = setup()
  fireEvent.click(screen.getByRole('button', { name: 'Jen oblíbené' }))
  expect(props.onFilterChange).toHaveBeenLastCalledWith({ ...EMPTY_FILTER, favoritesOnly: true })
  expect(screen.queryByRole('button', { name: 'Jen uvařené' })).toBeNull()
})

test('řádek nese srdíčko uvnitř řádku, před odkazem; hrnec „uvařeno“ není', () => {
  const r = recipes[0]
  const { props } = setup({ favorites: new Set([r.id]) })
  const heart = screen.getByRole('button', { name: `Oblíbené: ${r.title}` })
  expect(heart).toHaveAttribute('aria-pressed', 'true')
  expect(screen.queryByRole('button', { name: `Uvařeno: ${r.title}` })).toBeNull()
  const li = heart.closest('li.toc-recipe')!
  const row = li.querySelector('.toc-row')!
  expect(heart.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  fireEvent.click(heart)
  expect(props.onToggleFavorite).toHaveBeenCalledWith(r.id)
})

test('každý recept je dosažitelný z některé stránky obsahu a vede na levou stranu dvoustrany', () => {
  const total = tocPageCount(recipes)
  const layout = buildLayout(recipes, { tocPageCount: total })
  const seen = new Set<string>()
  for (let page = 0; page < total; page++) {
    const onNavigate = vi.fn()
    const { container, unmount } = setup({ page, onNavigate, pageNumbers: layout.recipeIndex })
    container.querySelectorAll<HTMLButtonElement>('.toc-row').forEach((btn) => {
      fireEvent.click(btn)
      const route = onNavigate.mock.lastCall![0] as Extract<Route, { kind: 'recipe' }>
      const idx = routeToIndex(route, layout)!
      expect(idx % 2).toBe(1)
      expect(layout.entries[idx]).toMatchObject({ kind: 'recipe', half: 'left', recipeId: route.id })
      expect(btn.querySelector('.toc-row-page')).toHaveTextContent(new RegExp(`^${idx}$`))
      seen.add(route.id)
    })
    unmount()
  }
  expect(seen.size).toBe(recipes.length)
})

test('pilulky vybavení nabízejí jen vybavení, které některý recept uvádí', () => {
  const used = new Set(recipes.flatMap((r) => r.equipment))
  setup()
  const fieldset = screen.getByText('Vybavení').closest('fieldset')!
  const pills = fieldset.querySelectorAll('button')
  expect(pills.length).toBe(used.size)
  expect(pills.length).toBeGreaterThan(0)
})

test('pilulky zdroje nabízejí jen knihy, ze kterých je nějaký recept', () => {
  const used = new Set(recipes.map((r) => r.source.book))
  setup()
  const fieldset = screen.getByText('Zdroj').closest('fieldset')!
  expect(fieldset.querySelectorAll('button').length).toBe(used.size)
})

test('bez receptů s daným vybavením se pilulka nezobrazí', () => {
  setup({ recipes: recipes.map((r) => ({ ...r, equipment: r.equipment.filter((e) => e !== 'trouba') })) })
  expect(screen.queryByRole('button', { name: 'trouba' })).toBeNull()
})

test('ikona košíku v řádku přepne košík a neotevře recept', () => {
  const first = recipes[0]
  const { props } = setup({ inCart: new Set([first.id]) })
  const btn = screen.getByRole('button', { name: `Do košíku: ${first.title}` })
  expect(btn).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(btn)
  expect(props.onToggleCart).toHaveBeenCalledWith(first.id)
  expect(props.onNavigate).not.toHaveBeenCalled()
})

test('vlastní recept: ikona pera u řádku a pilulka Zdroj „Vlastní“', () => {
  const all = mergeRecipes(recipes, [customRecipe()], ingredients)
  const { container } = setup({ recipes: all, filter: { ...EMPTY_FILTER, books: ['vlastni'] } })
  expect(screen.getByRole('button', { name: 'Vlastní' })).toHaveAttribute('aria-pressed', 'true')
  const row = screen.getByRole('button', { name: /^Babiččiny lívance \(vlastní\)/ })
  expect(row.querySelector('.toc-row-own svg')).not.toBeNull()
  expect(container.querySelectorAll('.toc-row-own')).toHaveLength(1)
})

test('bez vlastních receptů pilulka „Vlastní“ chybí', () => {
  setup()
  expect(screen.queryByRole('button', { name: 'Vlastní' })).toBeNull()
})

test('Nový recept je v řádku Moje na první stránce obsahu', () => {
  const { props } = setup({ onNewRecipe: vi.fn() })
  fireEvent.click(screen.getByRole('button', { name: 'Nový recept' }))
  expect(props.onNewRecipe).toHaveBeenCalledOnce()
})

test('Nový recept není na další stránce obsahu ani bez handleru', () => {
  setup({ onNewRecipe: vi.fn(), page: 1 })
  expect(screen.queryByRole('button', { name: 'Nový recept' })).toBeNull()
})

test('hlavička první stránky je jeden měřitelný celek, řádky nesou klíč pro měření', () => {
  const { container } = setup()
  const head = container.querySelector('.toc-head')!
  expect(head.querySelector('h2')).toHaveTextContent('Obsah')
  expect(head.querySelector('.toc-filters')).not.toBeNull()
  const keys = [...container.querySelectorAll<HTMLElement>('.toc-list > li')].map((li) => li.dataset.tocKey ?? '')
  expect(keys.length).toBeGreaterThan(0)
  expect(keys.every((k) => /^(c|r):/.test(k))).toBe(true)
})

test('další stránka obsahu hlavičku nemá', () => {
  const { container } = setup({ page: 1 })
  expect(container.querySelector('.toc-head')).toBeNull()
})

test('s naměřenou kapacitou se celý obsah vejde na první stránku', () => {
  const rows = new Map(buildTocRows(recipes).map((r) => [tocRowKey(r), 20]))
  const { container } = setup({ metrics: { capacity: 100_000, head: 200, rows } })
  expect(container.querySelectorAll('.toc-recipe')).toHaveLength(recipes.length)
  expect(screen.getByText('Strana obsahu 1 z 1')).toBeInTheDocument()
})

test('filtr: prázdná další stránka obsahu odkáže na předchozí strany', () => {
  setup({ page: 1, filter: { ...EMPTY_FILTER, query: 'svedske masove kulicky' } })
  expect(screen.getByText('Výsledky filtru jsou na předchozích stranách obsahu.')).toBeInTheDocument()
})
