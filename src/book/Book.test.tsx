import { render, screen, fireEvent, act } from '@testing-library/react'
import { Book, type BookPageDef } from './Book'
import { resetStopwatchStore, useStopwatch } from '@/pages/useStopwatch'

const pages: BookPageDef[] = Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, render: () => <p>Strana {i}</p> }))

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: q.includes('reduced-motion'), addEventListener() {}, removeEventListener() {} })) as never
})

test('začíná na obalu, vlevo prázdno', () => {
  render(<Book pages={pages} />)
  expect(screen.getByText('Strana 0')).toBeInTheDocument()
  expect(screen.queryByText('Strana 1')).toBeNull()
  expect(screen.getByRole('button', { name: 'Předchozí strana' })).toBeDisabled()
})

test('tlačítko Další otočí na dvoustranu 1–2', () => {
  render(<Book pages={pages} />)
  fireEvent.click(screen.getByRole('button', { name: 'Další strana' }))
  expect(screen.getByText('Strana 1')).toBeInTheDocument()
  expect(screen.getByText('Strana 2')).toBeInTheDocument()
})

test('šipky na klávesnici listují', () => {
  const onIndexChange = vi.fn()
  render(<Book pages={pages} onIndexChange={onIndexChange} />)
  fireEvent.keyDown(window, { key: 'ArrowRight' })
  expect(onIndexChange).toHaveBeenLastCalledWith(1)
  fireEvent.keyDown(window, { key: 'ArrowLeft' })
  expect(onIndexChange).toHaveBeenLastCalledWith(0)
})

test('na poslední dvoustraně je Další disabled', () => {
  render(<Book pages={pages} initialIndex={5} />)
  expect(screen.getByText('Strana 5')).toBeInTheDocument()
  expect(screen.getByText('Strana 6')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Další strana' })).toBeDisabled()
})

test('dotaz na režim single platí jen pro obrazovku (v tisku se tiskne celá dvoustrana)', () => {
  const queries: string[] = []
  window.matchMedia = vi.fn().mockImplementation((q: string) => {
    queries.push(q)
    return { matches: false, addEventListener() {}, removeEventListener() {} }
  }) as never
  render(<Book pages={pages} initialIndex={3} />)
  const viewMode = queries.find((q) => q.includes('max-width'))!
  expect(viewMode.split(',').every((part) => part.trim().startsWith('screen and'))).toBe(true)
})

test('tisk režim nemění: single zůstane single (layout a čísla stran se během tisku nepřestaví)', () => {
  let listener: () => void = () => {}
  let printing = false
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    // v tisku dotaz `screen and …` neplatí, `print` ano
    get matches() { return q === 'print' ? printing : !printing },
    addEventListener(_: string, l: () => void) { listener = l },
    removeEventListener() {},
  })) as never
  render(<Book pages={pages} initialIndex={3} />)
  expect(screen.queryByText('Strana 4')).toBeNull()
  printing = true
  act(() => {
    window.dispatchEvent(new Event('beforeprint'))
    listener()
  })
  expect(screen.getByText('Strana 3')).toBeInTheDocument()
  expect(screen.queryByText('Strana 4')).toBeNull()
})

test('tiskový strom (data-print na <html>) změnu dotazu také ignoruje', () => {
  let listener: () => void = () => {}
  let single = true
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    get matches() { return q === 'print' ? false : single },
    addEventListener(_: string, l: () => void) { listener = l },
    removeEventListener() {},
  })) as never
  render(<Book pages={pages} initialIndex={3} />)
  document.documentElement.setAttribute('data-print', 'recipe')
  try {
    single = false
    act(() => listener())
    expect(screen.queryByText('Strana 4')).toBeNull()
  } finally {
    document.documentElement.removeAttribute('data-print')
  }
})

test('režim z rodiče (prop mode) má přednost před vlastním dotazem', () => {
  render(<Book pages={pages} initialIndex={3} mode="single" />)
  expect(screen.getByText('Strana 3')).toBeInTheDocument()
  expect(screen.queryByText('Strana 4')).toBeNull()
})

test('Book s prop mode nezaregistruje vlastní listener změny dotazu', () => {
  const add = vi.fn()
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: q.includes('reduced-motion'), addEventListener: add, removeEventListener() {} })) as never
  render(<Book pages={pages} initialIndex={3} mode="spread" />)
  expect(add.mock.calls.filter(([type]) => type === 'change').length).toBe(0)
})

test('režim single zobrazí jen jednu stránku', () => {
  window.matchMedia = vi.fn().mockImplementation(() => ({ matches: true, addEventListener() {}, removeEventListener() {} })) as never
  render(<Book pages={pages} initialIndex={3} />)
  expect(screen.getByText('Strana 3')).toBeInTheDocument()
  expect(screen.queryByText('Strana 4')).toBeNull()
})

describe('otáčení tažením a klávesy', () => {
  const rect = { left: 0, right: 800, top: 0, bottom: 1000, width: 800, height: 1000, x: 0, y: 0, toJSON() {} }
  beforeEach(() => {
    Element.prototype.getBoundingClientRect = () => rect as DOMRect
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  })
  const startFlip = (container: HTMLElement) => {
    const spread = container.querySelector('.book__spread')!
    fireEvent.pointerDown(container.querySelector('.page-edge--right')!, { clientX: 790, clientY: 500, pointerId: 1 })
    fireEvent.pointerMove(spread, { clientX: 400, clientY: 500, pointerId: 1 })
    return spread
  }

  test('šipka uvnitř inputu nelistuje', () => {
    const onIndexChange = vi.fn()
    const withInput: BookPageDef[] = [{ id: 'a', render: () => <input aria-label="pozn" /> }, ...pages]
    render(<Book pages={withInput} onIndexChange={onIndexChange} />)
    fireEvent.keyDown(screen.getByLabelText('pozn'), { key: 'ArrowRight' })
    expect(onIndexChange).not.toHaveBeenCalled()
  })

  test('během otáčení jsou sloty inert a flipper nese přední a zadní stranu', () => {
    const { container } = render(<Book pages={pages} />)
    const spread = startFlip(container)
    const flipper = container.querySelector('.book__flipper')!
    expect(flipper).toHaveAttribute('aria-hidden', 'true')
    container.querySelectorAll('.book__slot').forEach((slot) => {
      expect(slot).toHaveAttribute('inert')
      expect(slot).toHaveAttribute('aria-hidden', 'true')
    })
    expect(flipper.querySelector('.book__face--front')).toHaveTextContent('Strana 0')
    expect(flipper.querySelector('.book__face--back')).toHaveTextContent('Strana 1')
    fireEvent.pointerUp(spread, { clientX: 400, clientY: 500, pointerId: 1 })
    expect(container.querySelector('.book__flipper')).toBeNull()
    expect(screen.getByText('Strana 1')).toBeInTheDocument()
    expect(screen.getByText('Strana 2')).toBeInTheDocument()
  })

  test('šipka během otáčení nic nedělá', () => {
    const onIndexChange = vi.fn()
    const { container } = render(<Book pages={pages} onIndexChange={onIndexChange} />)
    startFlip(container)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(onIndexChange).not.toHaveBeenCalled()
  })

  test('pointerdown na úchytu okraje spustí otáčení', () => {
    const { container } = render(<Book pages={pages} />)
    fireEvent.pointerDown(container.querySelector('.page-edge--right')!, { clientX: 790, clientY: 500, pointerId: 1 })
    expect(container.querySelector('.book__flipper')).not.toBeNull()
  })

  test('pointerdown na obsahu stránky otáčení nespustí', () => {
    const { container } = render(<Book pages={pages} />)
    fireEvent.pointerDown(screen.getByText('Strana 0'), { clientX: 790, clientY: 500, pointerId: 1 })
    expect(container.querySelector('.book__flipper')).toBeNull()
  })

  test('při otáčení vpřed zůstává levý slot na aktuální stránce', () => {
    const { container } = render(<Book pages={pages} initialIndex={1} />)
    startFlip(container)
    expect(container.querySelector('.book__slot--left')).toHaveTextContent('Strana 1')
    expect(container.querySelector('.book__slot--right')).toHaveTextContent('Strana 4')
    const flipper = container.querySelector('.book__flipper')!
    expect(flipper.querySelector('.book__face--front')).toHaveTextContent('Strana 2')
    expect(flipper.querySelector('.book__face--back')).toHaveTextContent('Strana 3')
    // žádná stránka se nevykreslí dvakrát
    expect(screen.getAllByText(/Strana \d/)).toHaveLength(4)
  })

  test('při otáčení zpět zůstává pravý slot na aktuální stránce', () => {
    const { container } = render(<Book pages={pages} initialIndex={3} />)
    const spread = container.querySelector('.book__spread')!
    fireEvent.pointerDown(container.querySelector('.page-edge--left')!, { clientX: 10, clientY: 500, pointerId: 1 })
    fireEvent.pointerMove(spread, { clientX: 400, clientY: 500, pointerId: 1 })
    expect(container.querySelector('.book__slot--left')).toHaveTextContent('Strana 1')
    expect(container.querySelector('.book__slot--right')).toHaveTextContent('Strana 4')
    const flipper = container.querySelector('.book__flipper')!
    expect(flipper.querySelector('.book__face--front')).toHaveTextContent('Strana 3')
    expect(flipper.querySelector('.book__face--back')).toHaveTextContent('Strana 2')
  })

  test('strany na flipperu nesou číslo stránky', () => {
    const { container } = render(<Book pages={pages} initialIndex={1} />)
    startFlip(container)
    const flipper = container.querySelector('.book__flipper')!
    expect(flipper.querySelector('.book__face--front .page-number')).toHaveTextContent('2')
    expect(flipper.querySelector('.book__face--back .page-number')).toHaveTextContent('3')
  })
})

test('stav stránky (input) nepřeteče na jinou stránku po otočení', () => {
  const withInputs: BookPageDef[] = Array.from({ length: 7 }, (_, i) => ({
    id: `p${i}`,
    render: () => <p><label>Poznámka {i}: <input type="text" /></label></p>,
  }))
  render(<Book pages={withInputs} initialIndex={3} />)
  fireEvent.change(screen.getByLabelText('Poznámka 3:'), { target: { value: 'ahoj' } })
  expect(screen.getByLabelText('Poznámka 3:')).toHaveValue('ahoj')
  fireEvent.keyDown(window, { key: 'ArrowRight' })
  expect(screen.getByLabelText('Poznámka 5:')).toHaveValue('')
  expect(screen.getByLabelText('Poznámka 6:')).toHaveValue('')
})

test('tlačítko Další otáčí animovaně (bez reduced motion)', () => {
  window.matchMedia = vi.fn().mockImplementation(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as never
  const frames: FrameRequestCallback[] = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.push(cb); return frames.length })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  const now = vi.spyOn(performance, 'now').mockReturnValue(0)
  try {
    const onIndexChange = vi.fn()
    const { container } = render(<Book pages={pages} onIndexChange={onIndexChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Další strana' }))
    expect(container.querySelector('.book__flipper')).not.toBeNull()
    act(() => frames.shift()!(100))
    // uprostřed animace: list se otáčí, index se ještě nezměnil
    expect(container.querySelector('.book__flipper')).not.toBeNull()
    expect(onIndexChange).not.toHaveBeenCalled()
    let t = 100
    while (frames.length) { t += 100; const cb = frames.shift()!; act(() => cb(t)) }
    expect(container.querySelector('.book__flipper')).toBeNull()
    expect(onIndexChange).toHaveBeenCalledTimes(1)
    expect(onIndexChange).toHaveBeenCalledWith(1)
    expect(screen.getByText('Strana 1')).toBeInTheDocument()
  } finally {
    now.mockRestore()
    vi.unstubAllGlobals()
  }
})

test('změna prop index přerenderuje stránku', () => {
  const { rerender } = render(<Book pages={pages} index={0} />)
  expect(screen.getByText('Strana 0')).toBeInTheDocument()
  rerender(<Book pages={pages} index={3} />)
  expect(screen.getByText('Strana 3')).toBeInTheDocument()
  expect(screen.getByText('Strana 4')).toBeInTheDocument()
  expect(screen.queryByText('Strana 0')).toBeNull()
})

test('render() stránek se při překreslení rodiče se stejnými pages nevolá znovu', () => {
  const renderSpy = vi.fn(() => <p>Obsah</p>)
  const memoPages: BookPageDef[] = [{ id: 'a', render: renderSpy }, { id: 'b', render: () => null }, { id: 'c', render: () => null }]
  const { rerender } = render(<Book pages={memoPages} />)
  const calls = renderSpy.mock.calls.length
  rerender(<Book pages={memoPages} />)
  expect(renderSpy.mock.calls.length).toBe(calls)
})

test('změna režimu zarovnává jen zobrazení; rodiči se index neoznamuje (single→spread→single)', () => {
  let listener: () => void = () => {}
  let single = true
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    get matches() { return q.includes('reduced-motion') ? true : q === 'print' ? false : single },
    addEventListener(_: string, l: () => void) { listener = l },
    removeEventListener() {},
  })) as never
  const onIndexChange = vi.fn()
  render(<Book pages={pages} index={4} onIndexChange={onIndexChange} />)
  single = false
  act(() => listener())
  expect(onIndexChange).not.toHaveBeenCalled()
  // zobrazí se dvoustrana 3–4, logický index 4 zůstává rodiči
  expect(screen.getByText('Strana 3')).toBeInTheDocument()
  expect(screen.getByText('Strana 4')).toBeInTheDocument()
  single = true
  act(() => listener())
  expect(onIndexChange).not.toHaveBeenCalled()
  expect(screen.getByText('Strana 4')).toBeInTheDocument()
  expect(screen.queryByText('Strana 3')).toBeNull()
})

test('index mimo rozsah (méně stránek) se oznámí rodiči', () => {
  const onIndexChange = vi.fn()
  const { rerender } = render(<Book pages={pages} index={6} onIndexChange={onIndexChange} />)
  rerender(<Book pages={pages.slice(0, 4)} index={6} onIndexChange={onIndexChange} />)
  expect(onIndexChange).toHaveBeenLastCalledWith(3)
})

test('šipky nelistují, když je otevřený dialog', () => {
  const onIndexChange = vi.fn()
  render(<><div role="dialog" aria-label="Hledání"><button>x</button></div><Book pages={pages} onIndexChange={onIndexChange} /></>)
  fireEvent.keyDown(screen.getByText('x'), { key: 'ArrowRight', bubbles: true })
  expect(onIndexChange).not.toHaveBeenCalled()
})

describe('listování vodorovným scrollem', () => {
  let now = 0
  beforeEach(() => {
    now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
  })
  afterEach(() => vi.restoreAllMocks())
  const wheel = (el: Element, deltaX: number, deltaY = 0, at = now, init: WheelEventInit = {}) => {
    now = at
    fireEvent.wheel(el, { deltaX, deltaY, ...init })
  }

  test('vodorovné gesto otočí právě o jednu dvoustranu', () => {
    const onIndexChange = vi.fn()
    const { container } = render(<Book pages={pages} onIndexChange={onIndexChange} />)
    const spread = container.querySelector('.book__spread')!
    for (let i = 0; i < 6; i++) wheel(spread, 20, 0, i * 16)
    expect(onIndexChange).toHaveBeenCalledTimes(1)
    expect(onIndexChange).toHaveBeenCalledWith(1)
  })

  test('nové gesto po pauze otočí znovu, záporné deltaX vrací', () => {
    const onIndexChange = vi.fn()
    const { container } = render(<Book pages={pages} onIndexChange={onIndexChange} />)
    const spread = container.querySelector('.book__spread')!
    wheel(spread, 60, 0, 0)
    wheel(spread, 60, 0, 100)
    wheel(spread, 60, 0, 600)
    wheel(spread, -60, 0, 1200)
    expect(onIndexChange.mock.calls.map((c) => c[0])).toEqual([1, 3, 1])
  })

  test('svislý scroll ani pinch zoom (ctrlKey) neotáčí', () => {
    const onIndexChange = vi.fn()
    const { container } = render(<Book pages={pages} onIndexChange={onIndexChange} />)
    const spread = container.querySelector('.book__spread')!
    wheel(spread, 10, 80, 0)
    wheel(spread, 80, 0, 1000, { ctrlKey: true })
    expect(onIndexChange).not.toHaveBeenCalled()
  })

  test('uvnitř vodorovně scrollujícího obsahu (široká tabulka) neotáčí', () => {
    const onIndexChange = vi.fn()
    const wide: BookPageDef[] = [{ id: 'w', render: () => <div data-testid="wide" style={{ overflowX: 'auto' }}>tabulka</div> }, ...pages.slice(1)]
    render(<Book pages={wide} onIndexChange={onIndexChange} />)
    const el = screen.getByTestId('wide')
    Object.defineProperty(el, 'scrollWidth', { configurable: true, value: 600 })
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: 300 })
    wheel(el, 80, 0, 0)
    expect(onIndexChange).not.toHaveBeenCalled()
  })

  test('při otevřeném dialogu (hledání) neotáčí', () => {
    const onIndexChange = vi.fn()
    const { container } = render(<><div role="dialog" aria-label="Hledání" /><Book pages={pages} onIndexChange={onIndexChange} /></>)
    wheel(container.querySelector('.book__spread')!, 80, 0, 0)
    expect(onIndexChange).not.toHaveBeenCalled()
  })

  test('vodorovné gesto zruší výchozí akci (gesto zpět v prohlížeči), svislé ne', () => {
    const { container } = render(<Book pages={pages} />)
    const spread = container.querySelector('.book__spread')!
    const horizontal = new WheelEvent('wheel', { deltaX: 80, bubbles: true, cancelable: true })
    spread.dispatchEvent(horizontal)
    expect(horizontal.defaultPrevented).toBe(true)
    now = 2000
    const vertical = new WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true })
    spread.dispatchEvent(vertical)
    expect(vertical.defaultPrevented).toBe(false)
  })
})

test('švih prstem po obsahu stránky listuje (single, bez úchytu na okraji)', () => {
  window.matchMedia = vi.fn().mockImplementation(() => ({ matches: true, addEventListener() {}, removeEventListener() {} })) as never
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  const onIndexChange = vi.fn()
  const { container } = render(<Book pages={pages} initialIndex={2} onIndexChange={onIndexChange} />)
  const spread = container.querySelector('.book__spread')!
  fireEvent.pointerDown(screen.getByText('Strana 2'), { pointerId: 3, pointerType: 'touch', clientX: 350, clientY: 300 })
  // otáčení přeskládá sloty – další události jdou na .book__spread (tam jsou handlery)
  fireEvent.pointerMove(spread, { pointerId: 3, pointerType: 'touch', clientX: 330, clientY: 302 })
  fireEvent.pointerMove(spread, { pointerId: 3, pointerType: 'touch', clientX: -100, clientY: 305 })
  fireEvent.pointerUp(spread, { pointerId: 3, pointerType: 'touch', clientX: -100, clientY: 305 })
  expect(onIndexChange).toHaveBeenLastCalledWith(3)
})

test('měřicí slot (measure) je ve dvoustraně, mimo sloty stránek, skrytý před čtečkami i ovládáním', () => {
  const { container } = render(<Book pages={pages} measure={<p>měření</p>} />)
  const slot = container.querySelector('.book__measure')!
  expect(slot).toHaveAttribute('aria-hidden', 'true')
  expect(slot).toHaveAttribute('inert')
  expect(slot.parentElement).toHaveClass('book__spread')
  expect(slot.closest('.book__slot')).toBeNull()
  expect(slot).toHaveTextContent('měření')
})

test('bez measure se měřicí slot nevykreslí', () => {
  const { container } = render(<Book pages={pages} />)
  expect(container.querySelector('.book__measure')).toBeNull()
})

describe('stopky přežijí nedokončený tah (final fix F1)', () => {
  const rect = { left: 0, right: 800, top: 0, bottom: 1000, width: 800, height: 1000, x: 0, y: 0, toJSON() {} }
  function Probe() {
    const sw = useStopwatch('probe')
    return (
      <div>
        <output aria-label="čas">{sw.elapsedSeconds}</output>
        <button type="button" onClick={sw.start}>Spustit</button>
      </div>
    )
  }
  const probePages: BookPageDef[] = [
    { id: 'p0', render: () => <p>Strana 0</p> },
    { id: 'p1', render: () => <p>Strana 1</p> },
    { id: 'p2', render: () => <Probe /> },
    { id: 'p3', render: () => <p>Strana 3</p> },
    { id: 'p4', render: () => <p>Strana 4</p> },
  ]
  beforeEach(() => {
    resetStopwatchStore()
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
    Element.prototype.getBoundingClientRect = () => rect as DOMRect
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  for (const ending of ['pointerUp pod prahem', 'pointerCancel'] as const) {
    test(`mobil: švih po obsahu zrušený (${ending}): stopky běží dál`, () => {
      window.matchMedia = vi.fn().mockImplementation(() => ({ matches: true, addEventListener() {}, removeEventListener() {} })) as never
      const { container } = render(<Book pages={probePages} initialIndex={2} />)
      fireEvent.click(screen.getByRole('button', { name: 'Spustit' }))
      act(() => { vi.advanceTimersByTime(5000) })
      expect(screen.getByLabelText('čas')).toHaveTextContent('5')
      const spread = container.querySelector('.book__spread')!
      const touch = { pointerId: 3, pointerType: 'touch', clientY: 300 }
      fireEvent.pointerDown(screen.getByLabelText('čas'), { ...touch, clientX: 350 })
      fireEvent.pointerMove(spread, { ...touch, clientX: 330 })
      // druhý posun jen o 3 px: rychlost (px/ms z reálného performance.now) nesmí ani při pomalém běhu testů dosáhnout švihu (FLICK)
      fireEvent.pointerMove(spread, { ...touch, clientX: 327 })
      act(() => { vi.advanceTimersByTime(3000) })
      if (ending === 'pointerCancel') fireEvent.pointerCancel(spread, { ...touch, clientX: 327 })
      else fireEvent.pointerUp(spread, { ...touch, clientX: 327 })
      expect(screen.getByLabelText('čas')).toHaveTextContent('8')
      act(() => { vi.advanceTimersByTime(2000) })
      expect(screen.getByLabelText('čas')).toHaveTextContent('10')
    })
  }

  test('odlistování pryč a zpět: čas pokračuje', () => {
    render(<Book pages={probePages} initialIndex={1} />)
    fireEvent.click(screen.getByRole('button', { name: 'Spustit' }))
    act(() => { vi.advanceTimersByTime(4000) })
    fireEvent.click(screen.getByRole('button', { name: 'Další strana' }))
    expect(screen.queryByLabelText('čas')).toBeNull()
    act(() => { vi.advanceTimersByTime(6000) })
    fireEvent.click(screen.getByRole('button', { name: 'Předchozí strana' }))
    expect(screen.getByLabelText('čas')).toHaveTextContent('10')
  })
})
