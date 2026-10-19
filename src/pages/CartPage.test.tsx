// src/pages/CartPage.test.tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { loadContent } from '@/content/loadContent'
import { cartMacrosPerAdult, coveragePercent, dailyKcalTarget } from '@/domain/nutrition'
import { CartPage } from './CartPage'
import { BOOKLET_HINT, PRINT_HINT, formatInteger, formatMacros } from './labels'

const { recipes, ingredients } = loadContent()
const recipeById = new Map(recipes.map((r) => [r.id, r]))
const title = (id: string) => recipeById.get(id)!.title
const cart = [{ recipeId: 'michana-vejce', multiplier: 1 }, { recipeId: 'hovezi-gulas', multiplier: 2 }]
/** getByText normalizuje text uzlu (\s+ → mezera, včetně U+00A0), řetězec dotazu ne – očekávání normalizujeme stejně. */
const norm = (s: string) => s.replace(/\s+/g, ' ')

function setup(over: Partial<React.ComponentProps<typeof CartPage>> = {}) {
  const props = {
    cart,
    recipes: recipeById,
    ingredients,
    portions: { people: { adults: 6, children: 18 }, childCoef: 0.8, dayFactor: 1 },
    kcalTarget: undefined,
    historical: false,
    onPeopleChange: vi.fn(),
    onMultiplierChange: vi.fn(),
    onRemove: vi.fn(),
    onNavigate: vi.fn(),
    onPrintBooklet: vi.fn(),
    onPrintList: vi.fn(),
    ...over,
  }
  return { ...render(<CartPage {...props} />), props }
}

test('recepty s násobky, +/− a odebrání, proklik na recept', () => {
  const { props } = setup()
  expect(screen.getByRole('heading', { level: 2, name: 'Košík' })).toBeInTheDocument()
  expect(screen.getByText('Pro 24 osob (18 dětí + 6 dospělých) · náročnost dne 1 · ×1 = 20,4 porce')).toBeInTheDocument()
  expect(screen.getByText('×2')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: `Méně: ${title('michana-vejce')}` })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: `Více: ${title('michana-vejce')}` }))
  expect(props.onMultiplierChange).toHaveBeenCalledWith('michana-vejce', 2)
  fireEvent.click(screen.getByRole('button', { name: `Méně: ${title('hovezi-gulas')}` }))
  expect(props.onMultiplierChange).toHaveBeenCalledWith('hovezi-gulas', 1)
  fireEvent.click(screen.getByRole('button', { name: `Odebrat: ${title('hovezi-gulas')}` }))
  expect(props.onRemove).toHaveBeenCalledWith('hovezi-gulas')
  fireEvent.click(screen.getByRole('button', { name: title('michana-vejce') }))
  expect(props.onNavigate).toHaveBeenCalledWith({ kind: 'recipe', id: 'michana-vejce' })
})

test('Více je zakázané na násobku 10', () => {
  setup({ cart: [{ recipeId: 'michana-vejce', multiplier: 10 }] })
  expect(screen.getByRole('button', { name: `Více: ${title('michana-vejce')}` })).toBeDisabled()
})

test('počet osob jde změnit i na stránce košíku', () => {
  const { props } = setup()
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Děti' }), { target: { value: '10' } })
  expect(props.onPeopleChange).toHaveBeenCalledWith({ children: 10 })
})

test('nutriční souhrn na dospělého vs. cíl × náročnost', () => {
  const portions = { people: { adults: 6, children: 18 }, childCoef: 0.8, dayFactor: 1.2 }
  setup({ portions })
  const m = cartMacrosPerAdult(cart, recipeById, ingredients, { historical: false, dayFactor: 1.2 })
  const target = dailyKcalTarget(undefined, 1.2)
  expect(screen.getByText(norm(formatMacros(m)))).toBeInTheDocument()
  expect(screen.getByText(norm(`Pokrývá cca ${coveragePercent(m.kcal, target)} % denního příjmu (cíl ${formatInteger(target)} kcal = 2\u00a0300 × 1,2).`))).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 3, name: /Výživa na dospělého/ })).toHaveTextContent('orientačně')
})

test('prázdný košík: nápověda, odkaz do obsahu, bez souhrnu a tisku', () => {
  const { props } = setup({ cart: [] })
  expect(screen.getByText(/^Košík je prázdný\./)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Do obsahu' }))
  expect(props.onNavigate).toHaveBeenCalledWith({ kind: 'toc' })
  expect(screen.queryByText(/Pokrývá cca/)).toBeNull()
  expect(screen.queryByRole('button', { name: 'Tisknout brožurku' })).toBeNull()
})

test('recept, který už neexistuje, se nevykreslí', () => {
  setup({ cart: [{ recipeId: 'neexistuje', multiplier: 1 }] })
  expect(screen.getByText(/^Košík je prázdný\./)).toBeInTheDocument()
})

test('Tisknout brožurku spustí tisk brožurky; nápověda k oboustrannému tisku a záhlaví', () => {
  const { props } = setup()
  const booklet = screen.getByRole('button', { name: 'Tisknout brožurku' })
  expect(booklet).toBeEnabled()
  expect(booklet).toHaveAccessibleDescription(`${BOOKLET_HINT} ${PRINT_HINT}`)
  fireEvent.click(booklet)
  expect(props.onPrintBooklet).toHaveBeenCalledTimes(1)
})

test('„Tisknout jen nákupní seznam“ tiskne seznam rovnou, bez přechodu na stránku seznamu', () => {
  const { props } = setup()
  const btn = screen.getByRole('button', { name: 'Tisknout jen nákupní seznam' })
  expect(btn).toHaveAccessibleDescription(PRINT_HINT)
  fireEvent.click(btn)
  expect(props.onPrintList).toHaveBeenCalledTimes(1)
  expect(props.onNavigate).not.toHaveBeenCalled()
})

test('počet porcí se skloňuje ze zaokrouhleného čísla (binární šum 7,000000000000001 → „7 porcí“)', () => {
  setup({ portions: { people: { adults: 0, children: 7 }, childCoef: 0.8, dayFactor: 1.25 } })
  expect(screen.getByText(/×1 = 7 porcí$/)).toBeInTheDocument()
})
