import { renderHook, act } from '@testing-library/react'
import { SWIPE_SLOP_PX, classifySwipe, isDragStartAllowed, isSwipeStartAllowed, useFlipDrag } from './useFlipDrag'

function edge(side: 'left' | 'right') {
  const el = document.createElement('div')
  el.className = `page-edge page-edge--${side}`
  return el
}
const rightEdge = edge('right')

describe('isDragStartAllowed', () => {
  test('úchyt vpravo → next', () => expect(isDragStartAllowed(rightEdge)).toBe('next'))
  test('úchyt vlevo → prev', () => expect(isDragStartAllowed(edge('left'))).toBe('prev'))
  test('potomek úchytu → směr úchytu', () => {
    const e = edge('right'); const child = document.createElement('span'); e.appendChild(child)
    expect(isDragStartAllowed(child)).toBe('next')
  })
  test('mimo úchyt → null', () => expect(isDragStartAllowed(document.body)).toBeNull())
  test('obsah stránky → null', () => {
    const content = document.createElement('div'); content.className = 'page-content'
    const p = document.createElement('p'); content.appendChild(p)
    expect(isDragStartAllowed(p)).toBeNull()
  })
  test('interaktivní prvek uvnitř úchytu → null', () => {
    const e = edge('right'); const btn = document.createElement('button'); e.appendChild(btn)
    expect(isDragStartAllowed(btn)).toBeNull()
  })
  test('cíl, který není element → null', () => expect(isDragStartAllowed(null)).toBeNull())
})

function pointer(_type: string, x: number, extra: Partial<PointerEvent> = {}) {
  return { clientX: x, clientY: 500, pointerId: 1, target: rightEdge, currentTarget: document.body, ...extra } as unknown as React.PointerEvent
}

describe('useFlipDrag', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never  // reduced motion → bez rAF
    Element.prototype.setPointerCapture = vi.fn()
    Element.prototype.releasePointerCapture = vi.fn()
  })

  test('drag z pravého okraje přes polovinu zavolá onComplete(next)', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useFlipDrag({ pageWidth: 800, canNext: true, canPrev: true, onComplete }))
    act(() => result.current.handlers.onPointerDown(pointer('down', 790)))
    act(() => result.current.handlers.onPointerMove(pointer('move', 200)))
    expect(result.current.flip?.progress).toBeCloseTo(0.7375)
    act(() => result.current.handlers.onPointerUp(pointer('up', 200)))
    expect(onComplete).toHaveBeenCalledWith('next')
    expect(result.current.flip).toBeNull()
  })

  test('drag puštěný pod polovinou se zruší', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useFlipDrag({ pageWidth: 800, canNext: true, canPrev: true, onComplete }))
    act(() => result.current.handlers.onPointerDown(pointer('down', 790)))
    act(() => result.current.handlers.onPointerMove(pointer('move', 700)))
    act(() => result.current.handlers.onPointerUp(pointer('up', 700)))
    expect(onComplete).not.toHaveBeenCalled()
    expect(result.current.flip).toBeNull()
  })

  test('canNext=false → drag z pravého okraje nic nedělá', () => {
    const { result } = renderHook(() => useFlipDrag({ pageWidth: 800, canNext: false, canPrev: true, onComplete: vi.fn() }))
    act(() => result.current.handlers.onPointerDown(pointer('down', 790)))
    expect(result.current.flip).toBeNull()
  })

  function setup(onComplete = vi.fn()) {
    return { onComplete, ...renderHook(() => useFlipDrag({ pageWidth: 800, canNext: true, canPrev: true, onComplete })) }
  }

  test('pointerdown mimo úchyt nic nespustí', () => {
    const { result } = setup()
    act(() => result.current.handlers.onPointerDown(pointer('down', 790, { target: document.body } as never)))
    expect(result.current.flip).toBeNull()
  })

  test('start(next) bez animace (reduced motion) rovnou zavolá onComplete', () => {
    const { result, onComplete } = setup()
    act(() => result.current.start('next'))
    expect(onComplete).toHaveBeenCalledWith('next')
    expect(result.current.flip).toBeNull()
  })

  test('start ve zakázaném směru nic nedělá', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useFlipDrag({ pageWidth: 800, canNext: true, canPrev: false, onComplete }))
    act(() => result.current.start('prev'))
    expect(onComplete).not.toHaveBeenCalled()
    expect(result.current.flip).toBeNull()
  })

  test('start během tažení nic nedělá', () => {
    const { result, onComplete } = setup()
    act(() => result.current.handlers.onPointerDown(pointer('down', 790)))
    act(() => result.current.start('next'))
    expect(onComplete).not.toHaveBeenCalled()
    expect(result.current.flip?.dragging).toBe(true)
  })

  test('start animuje přes rAF a po doběhnutí zavolá onComplete', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.push(cb); return frames.length })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const now = vi.spyOn(performance, 'now').mockReturnValue(0)
    try {
      const { result, onComplete } = setup()
      act(() => result.current.start('next'))
      expect(result.current.flip).toEqual({ direction: 'next', progress: 0, dragging: false })
      act(() => frames.shift()!(100))
      expect(result.current.flip?.progress).toBeGreaterThan(0)
      expect(result.current.flip?.progress).toBeLessThan(1)
      act(() => result.current.start('next'))  // během animace se ignoruje
      act(() => frames.shift()!(1000))
      expect(frames).toHaveLength(0)
      expect(result.current.flip).toBeNull()
      expect(onComplete).toHaveBeenCalledTimes(1)
      expect(onComplete).toHaveBeenCalledWith('next')
    } finally {
      now.mockRestore()
      vi.unstubAllGlobals()
    }
  })

  test('pointercancel po tažení přes polovinu nezavolá onComplete', () => {
    const { result, onComplete } = setup()
    act(() => result.current.handlers.onPointerDown(pointer('down', 790)))
    act(() => result.current.handlers.onPointerMove(pointer('move', 200)))
    act(() => result.current.handlers.onPointerCancel(pointer('cancel', 0)))
    expect(onComplete).not.toHaveBeenCalled()
    expect(result.current.flip).toBeNull()
  })

  test('událost s jiným pointerId se ignoruje', () => {
    const { result } = setup()
    act(() => result.current.handlers.onPointerDown(pointer('down', 790)))
    act(() => result.current.handlers.onPointerMove(pointer('move', 600)))
    const before = result.current.flip?.progress
    act(() => result.current.handlers.onPointerMove(pointer('move', 100, { pointerId: 2 })))
    expect(result.current.flip?.progress).toBe(before)
  })

  test('zastaralá rychlost při puštění se ignoruje', () => {
    const now = vi.spyOn(performance, 'now')
    const { result, onComplete } = setup()
    now.mockReturnValue(0)
    act(() => result.current.handlers.onPointerDown(pointer('down', 790)))
    now.mockReturnValue(20)
    act(() => result.current.handlers.onPointerMove(pointer('move', 700)))  // 4.5 px/ms = švih
    now.mockReturnValue(500)
    act(() => result.current.handlers.onPointerUp(pointer('up', 700)))
    expect(onComplete).not.toHaveBeenCalled()
    now.mockRestore()
  })

  test('odmontování zruší běžící animaci', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never
    vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(42))
    const cancel = vi.fn()
    vi.stubGlobal('cancelAnimationFrame', cancel)
    const { result, unmount } = setup()
    act(() => result.current.handlers.onPointerDown(pointer('down', 790)))
    act(() => result.current.handlers.onPointerUp(pointer('up', 700)))
    unmount()
    expect(cancel).toHaveBeenCalledWith(42)
    vi.unstubAllGlobals()
  })
})

describe('classifySwipe', () => {
  test('pod prahem 10 px nerozhodnuto', () => {
    expect(SWIPE_SLOP_PX).toBe(10)
    expect(classifySwipe(-6, 6)).toBeNull()
  })
  test('doleva = vpřed, doprava = zpět', () => {
    expect(classifySwipe(-12, 3)).toBe('next')
    expect(classifySwipe(12, -3)).toBe('prev')
  })
  test('převážně svislý pohyb patří scrollu', () => {
    expect(classifySwipe(5, 20)).toBe('vertical')
    expect(classifySwipe(-11, 10)).toBe('vertical') // 11 < 1,2 × 10
  })
})

describe('isSwipeStartAllowed', () => {
  const page = document.createElement('section')
  page.className = 'page'
  const p = document.createElement('p')
  const btn = document.createElement('button')
  const input = document.createElement('input')
  page.append(p, btn, input)
  document.body.append(page)
  test('kdekoli na stránce, i na tlačítku', () => {
    expect(isSwipeStartAllowed(p, document.body)).toBe(true)
    expect(isSwipeStartAllowed(btn, document.body)).toBe(true)
  })
  test('ne ve formulářovém poli, mimo stránku ani bez elementu', () => {
    expect(isSwipeStartAllowed(input, document.body)).toBe(false)
    expect(isSwipeStartAllowed(document.body, document.body)).toBe(false)
    expect(isSwipeStartAllowed(null, document.body)).toBe(false)
  })
  test('ne ve vodorovně scrollujícím prvku (široká tabulka)', () => {
    const scroller = document.createElement('div')
    scroller.style.overflowX = 'auto'
    Object.defineProperty(scroller, 'scrollWidth', { value: 600 })
    Object.defineProperty(scroller, 'clientWidth', { value: 300 })
    const cell = document.createElement('span')
    scroller.append(cell)
    page.append(scroller)
    expect(isSwipeStartAllowed(cell, document.body)).toBe(false)
  })
})

describe('švih prstem (touch)', () => {
  const page = document.createElement('section')
  page.className = 'page'
  const text = document.createElement('p')
  const input = document.createElement('input')
  page.append(text, input)
  document.body.append(page)
  const touch = (x: number, y = 500, extra: Record<string, unknown> = {}) =>
    ({ clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', target: text, currentTarget: document.body, ...extra }) as unknown as React.PointerEvent

  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never // reduced motion → bez rAF
    Element.prototype.setPointerCapture = vi.fn()
    Element.prototype.releasePointerCapture = vi.fn()
  })
  const setup = (over: { canNext?: boolean; canPrev?: boolean } = {}) => {
    const onComplete = vi.fn()
    return { onComplete, ...renderHook(() => useFlipDrag({ pageWidth: 800, canNext: true, canPrev: true, onComplete, ...over })) }
  }

  test('švih doleva po obsahu stránky přes polovinu otočí vpřed; rozhoduje až pohyb', () => {
    const { result, onComplete } = setup()
    act(() => result.current.handlers.onPointerDown(touch(700)))
    expect(result.current.flip).toBeNull()
    act(() => result.current.handlers.onPointerMove(touch(690, 498)))
    expect(result.current.flip).toMatchObject({ direction: 'next', dragging: true })
    act(() => result.current.handlers.onPointerMove(touch(200)))
    act(() => result.current.handlers.onPointerUp(touch(200)))
    expect(onComplete).toHaveBeenCalledWith('next')
  })

  test('švih doprava otočí zpět', () => {
    const { result, onComplete } = setup()
    act(() => result.current.handlers.onPointerDown(touch(100)))
    act(() => result.current.handlers.onPointerMove(touch(112)))
    act(() => result.current.handlers.onPointerMove(touch(700)))
    act(() => result.current.handlers.onPointerUp(touch(700)))
    expect(onComplete).toHaveBeenCalledWith('prev')
  })

  test('svislý tah neotáčí (patří scrollu stránky)', () => {
    const { result, onComplete } = setup()
    act(() => result.current.handlers.onPointerDown(touch(400, 500)))
    act(() => result.current.handlers.onPointerMove(touch(402, 530)))
    act(() => result.current.handlers.onPointerMove(touch(100, 540)))
    act(() => result.current.handlers.onPointerUp(touch(100, 540)))
    expect(result.current.flip).toBeNull()
    expect(onComplete).not.toHaveBeenCalled()
  })

  test('klepnutí bez pohybu nic neotočí a klik projde', () => {
    const { result, onComplete } = setup()
    act(() => result.current.handlers.onPointerDown(touch(400)))
    act(() => result.current.handlers.onPointerUp(touch(400)))
    expect(result.current.flip).toBeNull()
    expect(onComplete).not.toHaveBeenCalled()
    const click = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent
    act(() => result.current.handlers.onClickCapture(click))
    expect(click.preventDefault).not.toHaveBeenCalled()
  })

  test('švih ve zakázaném směru nic neudělá', () => {
    const { result } = setup({ canNext: false })
    act(() => result.current.handlers.onPointerDown(touch(700)))
    act(() => result.current.handlers.onPointerMove(touch(600)))
    expect(result.current.flip).toBeNull()
  })

  test('švih nezačne ve formulářovém poli', () => {
    const { result } = setup()
    act(() => result.current.handlers.onPointerDown(touch(700, 500, { target: input })))
    act(() => result.current.handlers.onPointerMove(touch(500, 500, { target: input })))
    expect(result.current.flip).toBeNull()
  })

  test('klik na konci švihu se spolkne (neotevře řádek obsahu), další klik už projde', () => {
    const { result } = setup()
    act(() => result.current.handlers.onPointerDown(touch(700)))
    act(() => result.current.handlers.onPointerMove(touch(680)))
    act(() => result.current.handlers.onPointerMove(touch(200)))
    act(() => result.current.handlers.onPointerUp(touch(200)))
    const first = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent
    act(() => result.current.handlers.onClickCapture(first))
    expect(first.preventDefault).toHaveBeenCalled()
    expect(first.stopPropagation).toHaveBeenCalled()
    const second = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent
    act(() => result.current.handlers.onClickCapture(second))
    expect(second.preventDefault).not.toHaveBeenCalled()
  })

  test('myš na obsahu stránky dál neotáčí (jen úchyt na okraji)', () => {
    const { result } = setup()
    act(() => result.current.handlers.onPointerDown(touch(700, 500, { pointerType: 'mouse' })))
    act(() => result.current.handlers.onPointerMove(touch(200, 500, { pointerType: 'mouse' })))
    expect(result.current.flip).toBeNull()
  })

  test('po pointercancel se klik nespolkne (D8)', () => {
    const { result } = setup()
    act(() => result.current.handlers.onPointerDown(touch(700)))
    act(() => result.current.handlers.onPointerMove(touch(680)))
    act(() => result.current.handlers.onPointerCancel(touch(680)))
    const click = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent
    act(() => result.current.handlers.onClickCapture(click))
    expect(click.preventDefault).not.toHaveBeenCalled()
  })
})
