import { render } from '@testing-library/react'
import { loadContent } from '@/content/loadContent'
import { buildTocRows, tocRowKey } from '@/content/search'
import { installFakeLayout } from '@/test/fakeLayout'
import { TocProbe } from './TocProbe'

const { recipes } = loadContent()

test('vykreslí hlavičku a všechny řádky obsahu s klíči pro měření a jednotným číslem strany', () => {
  const { container } = render(<TocProbe recipes={recipes} pageNumber={88} onMeasure={vi.fn()} />)
  expect(container.querySelector('.toc-head .toc-filters')).not.toBeNull()
  expect(container.querySelector('.toc-pill--new')).not.toBeNull() // jako na skutečné první stránce
  const keys = [...container.querySelectorAll<HTMLElement>('[data-toc-key]')].map((el) => el.dataset.tocKey)
  expect(keys).toEqual(buildTocRows(recipes).map(tocRowKey))
  const numbers = new Set([...container.querySelectorAll('.toc-row-page')].map((el) => el.textContent))
  expect([...numbers]).toEqual(['88'])
})

test('bez rozložení (jsdom) nic nehlásí – zůstane odhad v jednotkách', () => {
  const onMeasure = vi.fn()
  render(<TocProbe recipes={recipes} pageNumber={888} onMeasure={onMeasure} />)
  expect(onMeasure).not.toHaveBeenCalled()
})

describe('s rozložením', () => {
  let restore: () => void
  beforeEach(() => { restore = installFakeLayout({ content: 640, head: 230, chapter: 40, recipe: 24 }) })
  afterEach(() => restore())

  test('po vykreslení nahlásí kapacitu, hlavičku a výšky všech řádků', () => {
    const onMeasure = vi.fn()
    render(<TocProbe recipes={recipes} pageNumber={888} onMeasure={onMeasure} />)
    expect(onMeasure).toHaveBeenCalled()
    const m = onMeasure.mock.lastCall![0]
    expect(m.capacity).toBe(640)
    expect(m.head).toBe(230)
    expect(m.rows.size).toBe(buildTocRows(recipes).length)
    expect(m.rows.get('c:polevky')).toBe(40)
  })

  test('přeměření při změně velikosti je odložené (debounce), první měření ne', () => {
    vi.useFakeTimers()
    let notify: () => void = () => {}
    // jen pozorovatel měřicí stránky (ostatní komponenty stránky si pozorují vlastní prvky)
    vi.stubGlobal('ResizeObserver', class {
      cb: () => void
      constructor(cb: () => void) { this.cb = cb }
      observe(el: Element) { if (el.classList.contains('toc-probe')) notify = this.cb }
      disconnect() {}
    })
    try {
      const onMeasure = vi.fn()
      render(<TocProbe recipes={recipes} pageNumber={888} onMeasure={onMeasure} />)
      expect(onMeasure).toHaveBeenCalledTimes(1)
      notify(); notify(); notify()
      expect(onMeasure).toHaveBeenCalledTimes(1)
      vi.advanceTimersByTime(100)
      expect(onMeasure).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
      vi.unstubAllGlobals()
    }
  })
})
