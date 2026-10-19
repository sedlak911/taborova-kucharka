import { act, renderHook } from '@testing-library/react'
import type { PrintJob } from './printJob'
import { usePrintJob } from './usePrintJob'

const fire = (type: 'beforeprint' | 'afterprint') => act(() => { window.dispatchEvent(new Event(type)) })
const attr = () => document.documentElement.getAttribute('data-print')

const originalPrint = window.print
afterEach(() => {
  document.documentElement.removeAttribute('data-print')
  window.print = originalPrint
})

test('Ctrl+P: beforeprint vykreslí úlohu aktuální stránky, afterprint uklidí', () => {
  const { result } = renderHook(() => usePrintJob(() => ({ kind: 'recipe', recipeId: 'gulas' }), 0))
  expect(result.current.job).toBeNull()
  fire('beforeprint')
  expect(result.current.job).toEqual({ kind: 'recipe', recipeId: 'gulas' })
  expect(attr()).toBe('recipe')
  fire('afterprint')
  expect(result.current.job).toBeNull()
  expect(attr()).toBeNull()
})

test('beforeprint čte stránku platnou v okamžiku tisku', () => {
  let current: PrintJob = { kind: 'toc' }
  const { result, rerender } = renderHook(() => usePrintJob(() => current, 0))
  current = { kind: 'list' }
  rerender()
  fire('beforeprint')
  expect(result.current.job).toEqual({ kind: 'list' })
})

test('tlačítko: úloha je vykreslená a označená dřív, než se zavolá window.print, a beforeprint ji nepřepíše', () => {
  const seen: (string | null)[] = []
  window.print = vi.fn(() => {
    seen.push(attr())
    window.dispatchEvent(new Event('beforeprint'))
    seen.push(attr())
  })
  const { result } = renderHook(() => usePrintJob(() => ({ kind: 'toc' }), 0))
  act(() => result.current.print({ kind: 'booklet' }))
  expect(window.print).toHaveBeenCalledTimes(1)
  expect(seen).toEqual(['booklet', 'booklet'])
  expect(result.current.job).toEqual({ kind: 'booklet' })
  fire('afterprint')
  expect(result.current.job).toBeNull()
  expect(attr()).toBeNull()
})

test('vynucená úloha platí i pro beforeprint, který přijde až po návratu z window.print (mobil, PDF)', () => {
  window.print = vi.fn()
  const { result } = renderHook(() => usePrintJob(() => ({ kind: 'toc' }), 0))
  act(() => result.current.print({ kind: 'list' }))
  fire('beforeprint')
  expect(result.current.job).toEqual({ kind: 'list' })
})

test('bez afterprint: přechod na jinou stránku vynucenou úlohu zapomene a strom odpojí', () => {
  window.print = vi.fn()
  let key = 1
  const { result, rerender } = renderHook(() => usePrintJob(() => ({ kind: 'toc' }), key))
  act(() => result.current.print({ kind: 'booklet' }))
  key = 2
  rerender()
  expect(result.current.job).toBeNull()
  expect(attr()).toBeNull()
  fire('beforeprint')
  expect(result.current.job).toEqual({ kind: 'toc' })
})

test('odmontování smaže data-print', () => {
  const { unmount } = renderHook(() => usePrintJob(() => ({ kind: 'toc' }), 0))
  fire('beforeprint')
  unmount()
  expect(attr()).toBeNull()
})

test('po připojení stáhne písma tisku (brožurka je měří při kliknutí)', () => {
  const load = vi.fn(() => Promise.resolve([]))
  Object.defineProperty(document, 'fonts', { value: { load }, configurable: true })
  renderHook(() => usePrintJob(() => ({ kind: 'toc' }), 0))
  Reflect.deleteProperty(document, 'fonts')
  expect(load).toHaveBeenCalled()
})
