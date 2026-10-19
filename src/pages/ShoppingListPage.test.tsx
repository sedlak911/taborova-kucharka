import { fireEvent, render, screen } from '@testing-library/react'
import { loadContent } from '@/content/loadContent'
import { buildShoppingList } from '@/domain/shopping'
import { CATEGORY_LABEL, PRINT_HINT } from './labels'
import { ShoppingItemRow, ShoppingListHead, ShoppingListPage } from './ShoppingListPage'

const { recipes, ingredients } = loadContent()
const recipeById = new Map(recipes.map((r) => [r.id, r]))
const people = { adults: 6, children: 18 }
const groups = buildShoppingList(
  [{ recipeId: 'michana-vejce', multiplier: 1 }, { recipeId: 'francouzske-topinky', multiplier: 1 }],
  recipeById, ingredients, { persons: 20.4, historical: false },
)
const itemRow = (container: HTMLElement, name: string) =>
  [...container.querySelectorAll('.shopping-item')].find((li) => li.querySelector('.shopping-item__name')?.textContent === name)!

test('vejce ze dvou receptů pro 18 dětí + 6 dospělých: 51 ks s rozpadem 37 + 14', () => {
  const { container } = render(<ShoppingListPage groups={groups} people={people} historical={false} />)
  expect(screen.getByRole('heading', { level: 2, name: 'Nákupní seznam' })).toBeInTheDocument()
  expect(screen.getByText('Pro 24 osob (18 dětí + 6 dospělých)')).toBeInTheDocument()
  const eggs = itemRow(container, 'Vejce')
  expect(eggs.querySelector('.shopping-item__amount')).toHaveTextContent('51 ks')
  expect(eggs.querySelector('.shopping-item__sources')).toHaveTextContent(
    `${recipeById.get('michana-vejce')!.title} 37 ks · ${recipeById.get('francouzske-topinky')!.title} 14 ks`,
  )
})

test('skupiny v pořadí kategorií obchodu a žádná interakce', () => {
  const { container } = render(<ShoppingListPage groups={groups} people={people} historical={false} />)
  expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(groups.map((g) => CATEGORY_LABEL[g.category]))
  expect(screen.getByRole('heading', { level: 3, name: 'Mléčné výrobky a vejce' })).toBeInTheDocument()
  expect(container.querySelectorAll('button, input, select, textarea')).toHaveLength(0)
})

test('voda se nekupuje, sůl do slévané vody je „podle nádoby“', () => {
  const g = buildShoppingList([{ recipeId: 'spagety-s-maslem-a-syrem', multiplier: 1 }], recipeById, ingredients, { persons: 4, historical: false })
  const { container } = render(<ShoppingListPage groups={g} people={{ adults: 4, children: 0 }} historical={false} />)
  expect(screen.queryByText('Voda')).toBeNull()
  expect(itemRow(container, 'Sůl').querySelector('.shopping-item__sources')).toHaveTextContent('(podle nádoby)')
})

test('prázdný seznam a poznámka o historických surovinách', () => {
  render(<ShoppingListPage groups={[]} people={people} historical />)
  expect(screen.getByText('Seznam je prázdný – sestaví se z receptů v košíku.')).toBeInTheDocument()
  expect(screen.getByText('Pro 24 osob (18 dětí + 6 dospělých) · historické suroviny')).toBeInTheDocument()
})

test('hlavička uvádí náročnost dne jen když se liší od 1', () => {
  const { rerender } = render(<ShoppingListPage groups={groups} people={people} historical={false} />)
  expect(screen.queryByText(/náročnost dne/)).toBeNull()
  rerender(<ShoppingListPage groups={groups} people={people} historical={false} dayFactor={1.2} />)
  expect(screen.getByText('Pro 24 osob (18 dětí + 6 dospělých) · náročnost dne 1,2')).toBeInTheDocument()
})

test('tisková hlavička nese datum (Task 6 ji použije v tisku A4)', () => {
  render(<ShoppingListPage groups={groups} people={people} historical={false} dayFactor={1.2} date={new Date(2026, 9, 15)} />)
  expect(screen.getByText('Pro 24 osob (18 dětí + 6 dospělých) · náročnost dne 1,2 · 15. 10. 2026')).toBeInTheDocument()
})

test('hlavička a položka jdou vykreslit samostatně (brožurka)', () => {
  const eggs = groups.flatMap((g) => g.items).find((i) => i.name === 'Vejce')!
  const { container } = render(
    <>
      <ShoppingListHead people={people} historical={false} />
      <ul><ShoppingItemRow item={eggs} /></ul>
    </>,
  )
  expect(screen.getByRole('heading', { level: 2, name: 'Nákupní seznam' })).toBeInTheDocument()
  expect(container.querySelector('.shopping-item__amount')).toHaveTextContent('51 ks')
})

test('stránka seznamu má jediné tlačítko „Tisknout nákupní seznam“ s nápovědou; prázdný seznam ho nemá', () => {
  const onPrint = vi.fn()
  const { container, rerender } = render(<ShoppingListPage groups={groups} people={people} historical={false} onPrint={onPrint} />)
  const btn = screen.getByRole('button', { name: 'Tisknout nákupní seznam' })
  expect(btn).toHaveAccessibleDescription(PRINT_HINT)
  fireEvent.click(btn)
  expect(onPrint).toHaveBeenCalledTimes(1)
  expect(container.querySelectorAll('button, input, select, textarea')).toHaveLength(1)
  rerender(<ShoppingListPage groups={[]} people={people} historical={false} onPrint={onPrint} />)
  expect(screen.queryByRole('button')).toBeNull()
})
