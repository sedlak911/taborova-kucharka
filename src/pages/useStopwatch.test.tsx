import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetStopwatchStore, useStopwatch } from './useStopwatch'

describe('useStopwatch – jedny stopky pro aplikaci mimo stránku', () => {
  beforeEach(() => {
    resetStopwatchStore()
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })
  const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })

  it('po odpojení a připojení se stejným id běží čas dál (dopočítá se z hodin)', () => {
    const first = renderHook(() => useStopwatch('a'))
    act(() => first.result.current.start())
    advance(5000)
    first.unmount()
    advance(10_000) // stránka je odpojená, žádný interval neběží
    expect(vi.getTimerCount()).toBe(0)
    const second = renderHook(() => useStopwatch('a'))
    expect(second.result.current.running).toBe(true)
    expect(second.result.current.elapsedSeconds).toBe(15)
    advance(1000)
    expect(second.result.current.elapsedSeconds).toBe(16)
  })

  it('pozastavený čas se také zachová', () => {
    const first = renderHook(() => useStopwatch('a'))
    act(() => first.result.current.start())
    advance(7000)
    act(() => first.result.current.pause())
    first.unmount()
    advance(5000)
    const second = renderHook(() => useStopwatch('a'))
    expect(second.result.current).toMatchObject({ running: false, elapsedSeconds: 7 })
  })

  it('jiný recept vidí stojící 0:00 a uložený stav nemění', () => {
    const a = renderHook(() => useStopwatch('a'))
    act(() => a.result.current.start())
    advance(3000)
    const b = renderHook(() => useStopwatch('b'))
    expect(b.result.current).toMatchObject({ running: false, elapsedSeconds: 0 })
    act(() => b.result.current.reset())
    act(() => b.result.current.pause())
    expect(a.result.current).toMatchObject({ running: true, elapsedSeconds: 3 })
  })

  it('start na jiném receptu uložený stav nahradí (nikdy neběží víc časovačů)', () => {
    const a = renderHook(() => useStopwatch('a'))
    act(() => a.result.current.start())
    advance(3000)
    const b = renderHook(() => useStopwatch('b'))
    act(() => b.result.current.start())
    expect(b.result.current).toMatchObject({ running: true, elapsedSeconds: 0 })
    expect(a.result.current).toMatchObject({ running: false, elapsedSeconds: 0 })
    a.unmount()
    advance(2000)
    expect(b.result.current.elapsedSeconds).toBe(2)
    expect(vi.getTimerCount()).toBe(1)
  })

  it('Vynulovat zapomene stav pro všechna připojení', () => {
    const first = renderHook(() => useStopwatch('a'))
    act(() => first.result.current.start())
    advance(4000)
    act(() => first.result.current.reset())
    first.unmount()
    const second = renderHook(() => useStopwatch('a'))
    expect(second.result.current).toMatchObject({ running: false, elapsedSeconds: 0 })
  })
})
