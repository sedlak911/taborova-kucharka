// src/print/BookletPrint.test.tsx
import { render, within } from '@testing-library/react'
import { COOKBOOK_TITLE } from '@/content/books'
import { loadContent } from '@/content/loadContent'
import { buildShoppingList } from '@/domain/shopping'
import { BOOKLET_PAGE_CSS } from './booklet'
import { bookletBlocks } from './bookletBlocks'
import { BookletPrint } from './BookletPrint'

const { recipes, ingredients } = loadContent()
const byId = new Map(recipes.map((r) => [r.id, r]))
const portions = { people: { adults: 6, children: 18 }, childCoef: 0.8, dayFactor: 1 }
const cart = [{ recipeId: 'michana-vejce', multiplier: 2 }, { recipeId: 'hovezi-gulas', multiplier: 1 }]
const groups = buildShoppingList(cart, byId, ingredients, { persons: 20.4, historical: false })
const date = new Date(2026, 9, 15)
const renderBooklet = (c = cart, g = groups) =>
  render(<BookletPrint blocks={bookletBlocks(c, byId, g)} ingredients={ingredients} portions={portions} historical={false} date={date} />)
const page = (container: HTMLElement, n: number) => container.querySelector<HTMLElement>(`[data-page="${n}"]`)!
const pageOrder = (container: HTMLElement) =>
  [...container.querySelectorAll('.booklet-sheet')].map((s) => [...s.querySelectorAll('.booklet-page')].map((p) => Number(p.getAttribute('data-page'))))

test('titul + 2 recepty + seznam = 4 strany = 1 list: přední [4, 1], zadní [2, 3]; měřicí sloupec zmizí', () => {
  const { container } = renderBooklet()
  expect(pageOrder(container)).toEqual([[4, 1], [2, 3]])
  expect(container.querySelector('.booklet-measure')).toBeNull()
})

test('titulní strana: název kuchařky, počet osob, datum, počet receptů – bez obsahu', () => {
  const { container } = renderBooklet()
  const title = page(container, 1)
  expect(title).toHaveTextContent(COOKBOOK_TITLE)
  expect(title).toHaveTextContent('Pro 24 osob (18 dětí + 6 dospělých)')
  expect(title).toHaveTextContent('15. 10. 2026')
  expect(title).toHaveTextContent('2 recepty · nákupní seznam na konci')
  expect(title).not.toHaveTextContent('Hovězí guláš')
  expect(title.querySelector('.booklet-page__number')).toBeNull()
})

test('recept na vlastní straně přepočtený na P × násobek; seznam na poslední straně bez interakce', () => {
  const { container } = renderBooklet()
  const eggsPage = page(container, 2)
  expect(within(eggsPage).getByRole('heading', { level: 2, name: 'Míchaná vejce' })).toBeInTheDocument()
  expect(within(eggsPage).getByText('Pro 24 osob (18 dětí + 6 dospělých) · ×2')).toBeInTheDocument()
  expect(within(eggsPage).getByRole('columnheader', { name: 'Pro 24 osob ×2' })).toBeInTheDocument()
  expect(within(eggsPage.querySelector('tbody')!).getByText('Vejce').closest('tr')).toHaveTextContent('74 ks')
  expect(eggsPage.querySelector('.booklet-page__number')).toHaveTextContent('2')
  expect(within(page(container, 3)).getByRole('heading', { level: 2, name: 'Hovězí guláš' })).toBeInTheDocument()
  const list = page(container, 4)
  expect(within(list).getByRole('heading', { level: 2, name: 'Nákupní seznam' })).toBeInTheDocument()
  expect(list).toHaveTextContent('15. 10. 2026')
  expect(container.querySelectorAll('button, input, select, textarea')).toHaveLength(0)
})

test('5 stran se doplní prázdnými do 8; pořadí listů 8,1 | 2,7 | 6,3 | 4,5; prázdné strany bez čísla', () => {
  const { container } = renderBooklet([...cart, { recipeId: 'chilli-con-carne', multiplier: 1 }])
  expect(pageOrder(container)).toEqual([[8, 1], [2, 7], [6, 3], [4, 5]])
  for (const n of [6, 7, 8]) expect(page(container, n)).toBeEmptyDOMElement()
})

test('měření: bloky, které se na stranu A5 nevejdou, přetečou celé na další stranu (ne ořez)', () => {
  const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const height = this.classList.contains('booklet-page__body') ? 100 : this.classList.contains('booklet-block') ? 40 : 0
    return { height, width: 0, top: 0, left: 0, right: 0, bottom: height, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
  })
  try {
    // míchaná vejce = hlavní blok, 3 kroky, poznámka, zdroj = 6 bloků po 40 → 2 na stranu = 3 strany;
    // titul + 3 + hlavička prázdného seznamu = 5 stran → 8
    const { container } = renderBooklet([{ recipeId: 'michana-vejce', multiplier: 1 }], [])
    expect(container.querySelectorAll('.booklet-sheet')).toHaveLength(4)
    for (const n of [2, 3, 4]) expect(page(container, n).querySelectorAll('.booklet-block')).toHaveLength(2)
    expect(within(page(container, 5)).getByRole('heading', { level: 2, name: 'Nákupní seznam' })).toBeInTheDocument()
  } finally {
    spy.mockRestore()
  }
})

test('vloží @page pro A4 na šířku bez okrajů', () => {
  const { container } = renderBooklet()
  expect(container.querySelector('style')!.textContent).toBe(BOOKLET_PAGE_CSS)
})
