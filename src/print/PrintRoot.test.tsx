// src/print/PrintRoot.test.tsx
import { render, screen, within } from '@testing-library/react'
import { buildLayout } from '@/content/buildPages'
import { loadContent } from '@/content/loadContent'
import { tocPageCount } from '@/content/search'
import { buildShoppingList } from '@/domain/shopping'
import { PrintRoot, type PrintData } from './PrintRoot'

const { recipes, ingredients } = loadContent()
const recipeById = new Map(recipes.map((r) => [r.id, r]))
const layout = buildLayout(recipes, { tocPageCount: tocPageCount(recipes) })
const portions = { people: { adults: 6, children: 18 }, childCoef: 0.8, dayFactor: 1 }
const cart = [{ recipeId: 'michana-vejce', multiplier: 1 }]
const data = (over: Partial<PrintData> = {}): PrintData => ({
  recipes,
  recipeById,
  ingredients,
  portions,
  historical: false,
  cart,
  shoppingList: buildShoppingList(cart, recipeById, ingredients, { persons: 20.4, historical: false }),
  recipePages: layout.recipeIndex,
  chapterPages: layout.chapterIndex,
  date: new Date(2026, 9, 15),
  ...over,
})

test('recept: jen čistý A4 recept, bez tlačítek', () => {
  const { container } = render(<PrintRoot job={{ kind: 'recipe', recipeId: 'michana-vejce' }} data={data()} />)
  const root = container.querySelector<HTMLElement>('.print-root.print-root--recipe')!
  expect(within(root).getByRole('heading', { level: 2, name: 'Míchaná vejce' })).toBeInTheDocument()
  expect(root.querySelectorAll('button, input, select, textarea')).toHaveLength(0)
})

test('historické suroviny platí i v tisku', () => {
  render(<PrintRoot job={{ kind: 'recipe', recipeId: 'americke-palacinky' }} data={data({ historical: true })} />)
  expect(screen.getByText('dnes: Vejce 1 ks (na 4 porce)')).toBeInTheDocument()
})

test('nákupní seznam s počtem osob a datem, bez interakce', () => {
  const { container } = render(<PrintRoot job={{ kind: 'list' }} data={data()} />)
  expect(screen.getByText('Pro 24 osob (18 dětí + 6 dospělých) · 15. 10. 2026')).toBeInTheDocument()
  expect(container.querySelectorAll('button, input, select, textarea')).toHaveLength(0)
})

test('obsah', () => {
  const { container } = render(<PrintRoot job={{ kind: 'toc' }} data={data()} />)
  expect(container.querySelectorAll('.print-root--toc .print-toc__recipe')).toHaveLength(recipes.length)
})

test('neznámý recept → prázdný tiskový strom, nespadne', () => {
  const { container } = render(<PrintRoot job={{ kind: 'recipe', recipeId: 'neexistuje' }} data={data()} />)
  expect(container.querySelector('.print-root')).toBeEmptyDOMElement()
})

test('brožurka: listy A5 na A4 z košíku', () => {
  const { container } = render(<PrintRoot job={{ kind: 'booklet' }} data={data()} />)
  // titul + míchaná vejce + seznam = 3 strany → 4 = jeden list (přední a zadní strana)
  expect(container.querySelectorAll('.print-root--booklet .booklet-sheet')).toHaveLength(2)
})
