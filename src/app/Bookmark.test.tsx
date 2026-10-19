// src/app/Bookmark.test.tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { Bookmark } from './Bookmark'

function setup(over: Partial<React.ComponentProps<typeof Bookmark>> = {}) {
  const props = {
    people: { adults: 6, children: 18 }, dayFactor: 1, cartCount: 3,
    onPeopleChange: vi.fn(), onDayFactorChange: vi.fn(), onOpenCart: vi.fn(),
    ...over,
  }
  return { ...render(<Bookmark {...props} />), props }
}
const tab = () => screen.getByRole('button', { name: /^Košík:/ })

test('zavřená záložka ukazuje počet receptů a osob', () => {
  setup()
  expect(screen.getByRole('button', { name: 'Košík: 3 recepty · 24 os.' })).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByRole('spinbutton')).toBeNull()
})

test('tvar slova recept podle počtu', () => {
  setup({ cartCount: 1, people: { adults: 2, children: 0 } })
  expect(screen.getByRole('button', { name: 'Košík: 1 recept · 2 os.' })).toBeInTheDocument()
})

test('panel: dospělí, děti, náročnost dne a skok do košíku', () => {
  const { props } = setup()
  fireEvent.click(tab())
  expect(tab()).toHaveAttribute('aria-expanded', 'true')
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Děti' }), { target: { value: '20' } })
  expect(props.onPeopleChange).toHaveBeenCalledWith({ children: 20 })
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Dospělí' }), { target: { value: '4' } })
  expect(props.onPeopleChange).toHaveBeenCalledWith({ adults: 4 })
  const slider = screen.getByRole('slider', { name: /Náročnost dne/ })
  expect(slider).toHaveAttribute('min', '0.8')
  expect(slider).toHaveAttribute('max', '1.3')
  fireEvent.change(slider, { target: { value: '1.2' } })
  expect(vi.mocked(props.onDayFactorChange).mock.calls[0][0]).toBeCloseTo(1.2)
  fireEvent.click(screen.getByRole('button', { name: /Otevřít košík/ }))
  expect(props.onOpenCart).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('spinbutton')).toBeNull()
})

test('Escape vrátí fokus na záložku, klik mimo panel ho zavře, klik dovnitř ne', () => {
  setup()
  fireEvent.click(tab())
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(tab()).toHaveAttribute('aria-expanded', 'false')
  expect(tab()).toHaveFocus()
  fireEvent.click(tab())
  fireEvent.pointerDown(screen.getByRole('spinbutton', { name: 'Děti' }))
  expect(tab()).toHaveAttribute('aria-expanded', 'true')
  fireEvent.pointerDown(document.body)
  expect(tab()).toHaveAttribute('aria-expanded', 'false')
})
