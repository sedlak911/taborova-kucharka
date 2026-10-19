import { renderHook, act } from '@testing-library/react'
import { useHashRoute } from './useHashRoute'
import type { LayoutLike } from './route'

const layout: LayoutLike = {
  entries: [
    { kind: 'cover' }, { kind: 'about' }, { kind: 'about' }, { kind: 'toc' },
    { kind: 'chapter', chapter: 'polevky' },
    { kind: 'recipe', recipeId: 'kulajda', chapter: 'polevky' },
  ],
  recipeIndex: new Map([['kulajda', 5]]),
  chapterIndex: new Map([['polevky', 4]]),
  tocIndex: 3,
  cartIndex: 6,
  listIndex: 7,
  settingsIndex: 8,
}

beforeEach(() => { history.replaceState(null, '', '/') })

test('při startu čte hash', () => {
  history.replaceState(null, '', '#/recept/kulajda')
  const { result } = renderHook(() => useHashRoute(layout))
  expect(result.current.index).toBe(5)
})

test('hashchange přesune na kapitolu', () => {
  const { result } = renderHook(() => useHashRoute(layout))
  expect(result.current.index).toBe(0)
  act(() => {
    location.hash = '#/kapitola/polevky'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  expect(result.current.index).toBe(4)
})

test('neznámý hash → index 0 a hash vyčištěn', () => {
  history.replaceState(null, '', '#/recept/neexistuje')
  const { result } = renderHook(() => useHashRoute(layout))
  expect(result.current.index).toBe(0)
  expect(location.hash).toBe('')
})

test.each(['#/nesmysl', '#/kapitola/neexistuje'])('neplatný hash %s → index 0 a hash vyčištěn', (h) => {
  history.replaceState(null, '', h)
  const { result } = renderHook(() => useHashRoute(layout))
  expect(result.current.index).toBe(0)
  expect(location.hash).toBe('')
})

test.each(['', '#/'])('prázdný hash / obal (%j) se nečistí', (h) => {
  history.replaceState(null, '', '/' + h)
  const replace = vi.spyOn(history, 'replaceState')
  const { result } = renderHook(() => useHashRoute(layout))
  expect(result.current.index).toBe(0)
  expect(replace).not.toHaveBeenCalled()
  replace.mockRestore()
})

test('prázdný layout hash nemaže a po načtení layoutu ho vyhodnotí', () => {
  history.replaceState(null, '', '#/recept/kulajda')
  const empty: LayoutLike = { ...layout, entries: [], recipeIndex: new Map(), chapterIndex: new Map() }
  const { result, rerender } = renderHook(({ l }) => useHashRoute(l), { initialProps: { l: empty } })
  expect(result.current.index).toBe(0)
  expect(location.hash).toBe('#/recept/kulajda')
  rerender({ l: layout })
  expect(result.current.index).toBe(5)
  expect(location.hash).toBe('#/recept/kulajda')
})

test('setIndex zapíše hash přes replaceState, ne pushState', () => {
  const push = vi.spyOn(history, 'pushState')
  const { result } = renderHook(() => useHashRoute(layout))
  act(() => result.current.setIndex(5))
  expect(result.current.index).toBe(5)
  expect(location.hash).toBe('#/recept/kulajda')
  expect(push).not.toHaveBeenCalled()
  push.mockRestore()
})

test('jumpTo zapíše do historie (zpět vrátí), setIndex ne', () => {
  history.replaceState(null, '', '#/obsah')
  const start = history.length
  const { result } = renderHook(() => useHashRoute(layout))
  act(() => result.current.setIndex(4))
  expect(history.length).toBe(start)
  act(() => result.current.jumpTo(5))
  expect(result.current.index).toBe(5)
  expect(location.hash).toBe('#/recept/kulajda')
  expect(history.length).toBe(start + 1)
})

test('jumpTo na již aktuální hash nepřidává záznam', () => {
  history.replaceState(null, '', '#/recept/kulajda')
  const { result } = renderHook(() => useHashRoute(layout))
  const start = history.length
  act(() => result.current.jumpTo(5))
  expect(history.length).toBe(start)
})

test('#/kosik otevře stránku košíku', () => {
  history.replaceState(null, '', '#/kosik')
  const { result } = renderHook(() => useHashRoute(layout))
  expect(result.current.index).toBe(6)
  expect(location.hash).toBe('#/kosik')
})

const own = { kind: 'recipe', recipeId: 'vlastni-kase-ab12', chapter: 'polevky' as const }
const shifted: LayoutLike = {
  ...layout,
  entries: [...layout.entries.slice(0, 5), own, own, layout.entries[5]],
  recipeIndex: new Map([['vlastni-kase-ab12', 5], ['kulajda', 7]]),
}

test('změna layoutu (přidaný recept posunul indexy) najde stránku znovu podle hashe', () => {
  history.replaceState(null, '', '#/recept/kulajda')
  const { result, rerender } = renderHook(({ l }) => useHashRoute(l), { initialProps: { l: layout } })
  expect(result.current.index).toBe(5)
  rerender({ l: shifted })
  expect(result.current.index).toBe(7)
  expect(location.hash).toBe('#/recept/kulajda')
})

test('nový objekt layoutu se stejnými entries index nemění; posunuté entries ho přepočtou podle hashe', () => {
  const { result, rerender } = renderHook(({ l }) => useHashRoute(l), { initialProps: { l: layout } })
  act(() => result.current.setIndex(4))
  history.replaceState(null, '', '#/obsah') // kdyby se hash četl znovu, index by skočil na obsah
  rerender({ l: { ...layout, entries: layout.entries.map((e) => ({ ...e })) } })
  expect(result.current.index).toBe(4)
  history.replaceState(null, '', '#/recept/kulajda')
  rerender({ l: shifted })
  expect(result.current.index).toBe(7)
})

test('#/novy-recept: pod formulářem obsah; #/recept/<id>/upravit: upravovaný recept', () => {
  history.replaceState(null, '', '#/novy-recept')
  expect(renderHook(() => useHashRoute(layout)).result.current.index).toBe(3)
  expect(location.hash).toBe('#/novy-recept')
  history.replaceState(null, '', '#/recept/kulajda/upravit')
  expect(renderHook(() => useHashRoute(layout)).result.current.index).toBe(5)
  expect(location.hash).toBe('#/recept/kulajda/upravit')
})
