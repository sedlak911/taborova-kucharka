import { act, fireEvent, render, screen } from '@testing-library/react'
import { BookControls } from './BookControls'
import { PRINT_HINT } from '@/pages/labels'

const props = (over: Partial<React.ComponentProps<typeof BookControls>> = {}) => ({
  onHome: vi.fn(),
  onPrint: vi.fn(),
  printLabel: 'Tisk: recept (A4)',
  onOpenCart: vi.fn(),
  cartCount: 0,
  ...over,
})

let fsElement: Element | null = null

function enableFullscreen(request: () => Promise<void> = vi.fn(() => Promise.resolve())) {
  const exit = vi.fn(() => Promise.resolve())
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fsElement })
  Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exit })
  Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: request })
  return { request, exit }
}

afterEach(() => {
  fsElement = null
  for (const k of ['fullscreenEnabled', 'fullscreenElement', 'exitFullscreen']) delete (document as unknown as Record<string, unknown>)[k]
  delete (document.documentElement as unknown as Record<string, unknown>).requestFullscreen
})

test('Domů volá onHome a vykreslí i předané děti (lupu)', () => {
  const onHome = vi.fn()
  render(<BookControls {...props({ onHome })}><button aria-label="Hledat" /></BookControls>)
  fireEvent.click(screen.getByRole('button', { name: 'Domů' }))
  expect(onHome).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('navigation', { name: 'Ovládání knihy' })).toContainElement(screen.getByRole('button', { name: 'Hledat' }))
})

test('Domů vede na obsah (title) a volá onHome', () => {
  const onHome = vi.fn()
  render(<BookControls {...props({ onHome })} />)
  const home = screen.getByRole('button', { name: 'Domů' })
  expect(home).toHaveAttribute('title', 'Domů – na obsah')
  fireEvent.click(home)
  expect(onHome).toHaveBeenCalledTimes(1)
})

test('tisk mimo knihu: jméno podle úlohy, nápověda k záhlaví a zápatí jako popis', () => {
  const onPrint = vi.fn()
  render(<BookControls {...props({ onPrint, printLabel: 'Tisk: obsah (A4)' })} />)
  const btn = screen.getByRole('button', { name: 'Tisk: obsah (A4)' })
  expect(btn).toHaveAccessibleDescription(PRINT_HINT)
  expect(btn).toHaveAttribute('title', `Tisk: obsah (A4) – ${PRINT_HINT}`)
  fireEvent.click(btn)
  expect(onPrint).toHaveBeenCalledTimes(1)
})

test('košík mimo knihu: skok na stránku košíku, odznak jen s recepty', () => {
  const onOpenCart = vi.fn()
  const { container, rerender } = render(<BookControls {...props({ onOpenCart })} />)
  expect(screen.getByRole('button', { name: 'Jít na košík (0 receptů)' })).toBeInTheDocument()
  expect(container.querySelector('.book-control__badge')).toBeNull()
  rerender(<BookControls {...props({ onOpenCart, cartCount: 2 })} />)
  const btn = screen.getByRole('button', { name: 'Jít na košík (2 recepty)' })
  expect(btn.querySelector('.book-control__badge')).toHaveTextContent('2')
  expect(btn.querySelector('.book-control__badge')).toHaveAttribute('aria-hidden', 'true')
  fireEvent.click(btn)
  expect(onOpenCart).toHaveBeenCalledTimes(1)
})

test('pořadí: Domů, Tisk, Košík, pak předané děti (lupa)', () => {
  render(<BookControls {...props()}><button aria-label="Hledat" /></BookControls>)
  const names = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))
  expect(names).toEqual(['Domů', 'Tisk: recept (A4)', 'Jít na košík (0 receptů)', 'Hledat'])
})

test('bez Fullscreen API (iPhone Safari) se tlačítko nezobrazí', () => {
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: undefined })
  render(<BookControls {...props()} />)
  expect(screen.queryByRole('button', { name: 'Celá obrazovka' })).toBeNull()
})

test('celá obrazovka: zapnutí, aria-pressed podle fullscreenchange, vypnutí', () => {
  const { request, exit } = enableFullscreen()
  render(<BookControls {...props()} />)
  const btn = screen.getByRole('button', { name: 'Celá obrazovka' })
  expect(btn).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(btn)
  expect(request).toHaveBeenCalledTimes(1)
  fsElement = document.documentElement
  act(() => { document.dispatchEvent(new Event('fullscreenchange')) })
  expect(btn).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(btn)
  expect(exit).toHaveBeenCalledTimes(1)
})

test('odmítnutý requestFullscreen nevyhodí nezachycenou chybu', async () => {
  enableFullscreen(vi.fn(() => Promise.reject(new Error('denied'))))
  render(<BookControls {...props()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Celá obrazovka' }))
  await new Promise((r) => setTimeout(r, 0))
  expect(screen.getByRole('button', { name: 'Celá obrazovka' })).toHaveAttribute('aria-pressed', 'false')
})
