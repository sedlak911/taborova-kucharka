import { indexToRoute, routeToIndex } from '@/app/route'
import { buildLayout } from './buildPages'
import { loadContent } from './loadContent'
import type { Recipe } from '@/domain/types'

const { recipes } = loadContent()
const stub = (id: string, chapter: Recipe['chapter']) => ({ id, chapter }) as Recipe
const synthetic = [stub('a', 'polevky'), stub('b', 'polevky'), stub('c', 'sladke')]

describe.each([
  ['skutečná data', recipes],
  ['syntetická data', synthetic],
])('buildLayout (%s)', (_name, data) => {
  test('obal 0, úvod 1–2, kapitoly vpravo, košík vlevo a seznam vpravo, tiráž poslední', () => {
    const layout = buildLayout(data, { tocPageCount: 2 })
    expect(layout.entries[0].kind).toBe('cover')
    expect(layout.entries[1].kind).toBe('about')
    expect(layout.entries[2].kind).toBe('about')
    expect(layout.tocIndex).toBe(3)
    for (const idx of layout.chapterIndex.values()) expect(idx % 2).toBe(0)
    expect(layout.cartIndex % 2).toBe(1)
    expect(layout.entries[layout.cartIndex]).toMatchObject({ id: 'cart', kind: 'cart' })
    expect(layout.listIndex).toBe(layout.cartIndex + 1)
    expect(layout.listIndex % 2).toBe(0)
    expect(layout.settingsIndex).toBe(layout.listIndex + 1)
    expect(layout.settingsIndex).toBe(layout.entries.length - 1)
  })

  test('každý recept je dvoustrana: levá na lichém indexu, pravá hned za ní', () => {
    const layout = buildLayout(data, { tocPageCount: 2 })
    expect(layout.recipeIndex.size).toBe(data.length)
    expect(layout.entries.filter((e) => e.kind === 'recipe').length).toBe(2 * data.length)
    for (const [id, idx] of layout.recipeIndex) {
      expect(idx % 2).toBe(1)
      expect(layout.entries[idx]).toMatchObject({ kind: 'recipe', recipeId: id, half: 'left' })
      expect(layout.entries[idx + 1]).toMatchObject({ kind: 'recipe', recipeId: id, half: 'right' })
    }
  })

  test('pravá polovina má routu svého receptu a routa vede na levou (reload na pravé straně)', () => {
    const layout = buildLayout(data, { tocPageCount: 2 })
    for (const [id, left] of layout.recipeIndex) {
      expect(indexToRoute(left + 1, layout)).toEqual({ kind: 'recipe', id })
      expect(routeToIndex({ kind: 'recipe', id }, layout)).toBe(left)
    }
  })

  test('prázdné stránky jen před kapitolou nebo košíkem', () => {
    const layout = buildLayout(data, { tocPageCount: 3 })
    layout.entries.forEach((e, i) => {
      if (e.kind === 'blank') expect(['chapter', 'cart']).toContain(layout.entries[i + 1].kind)
    })
  })

  test('košík, seznam a tiráž mají své routy', () => {
    const layout = buildLayout(data, { tocPageCount: 2 })
    expect(routeToIndex({ kind: 'cart' }, layout)).toBe(layout.cartIndex)
    expect(indexToRoute(layout.cartIndex, layout)).toEqual({ kind: 'cart' })
    expect(indexToRoute(layout.listIndex, layout)).toEqual({ kind: 'list' })
    expect(indexToRoute(layout.settingsIndex, layout)).toEqual({ kind: 'settings' })
  })

  test('id stránek jsou unikátní', () => {
    const layout = buildLayout(data, { tocPageCount: 2 })
    const ids = layout.entries.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('tocPageCount se ořízne na minimálně 1', () => {
    const layout = buildLayout(data, { tocPageCount: 0 })
    expect(layout.entries.filter((e) => e.kind === 'toc').length).toBe(1)
  })
})

test('syntetický layout: přesné pořadí', () => {
  const layout = buildLayout(synthetic, { tocPageCount: 1 })
  expect(layout.entries.map((e) => e.id)).toEqual([
    'cover', 'about-left', 'about-right', 'toc-0',
    'chapter-polevky', 'recipe-a', 'recipe-a:postup', 'recipe-b', 'recipe-b:postup',
    'blank-0', 'chapter-sladke', 'recipe-c', 'recipe-c:postup',
    'cart', 'list', 'settings',
  ])
})

test('kniha bez receptů: prázdná stránka posune košík na levou stranu', () => {
  const layout = buildLayout([], { tocPageCount: 1 })
  expect(layout.entries.map((e) => e.id)).toEqual(['cover', 'about-left', 'about-right', 'toc-0', 'blank-0', 'cart', 'list', 'settings'])
  expect(layout.cartIndex).toBe(5)
})

describe('buildLayout v režimu single (mobil)', () => {
  const layout = buildLayout(recipes, { tocPageCount: 3, mode: 'single' })

  test('recept je jedna stránka (half full) a prázdné stránky nejsou', () => {
    expect(layout.entries.filter((e) => e.kind === 'blank')).toEqual([])
    expect(layout.entries.filter((e) => e.kind === 'recipe')).toHaveLength(recipes.length)
    for (const [id, idx] of layout.recipeIndex) {
      expect(layout.entries[idx]).toMatchObject({ id: `recipe-${id}`, kind: 'recipe', recipeId: id, half: 'full' })
    }
  })

  test('pořadí: obal, úvod, obsah, kapitola a hned její recepty, na konci košík, seznam, tiráž', () => {
    expect(layout.entries.slice(0, 6).map((e) => e.kind)).toEqual(['cover', 'about', 'about', 'toc', 'toc', 'toc'])
    expect(layout.tocIndex).toBe(3)
    const [chapter, idx] = [...layout.chapterIndex][0]
    expect(idx).toBe(6)
    expect(layout.entries[idx + 1]).toMatchObject({ kind: 'recipe', chapter, half: 'full' })
    expect(layout.entries.slice(-3).map((e) => e.kind)).toEqual(['cart', 'list', 'settings'])
    expect([layout.cartIndex, layout.listIndex, layout.settingsIndex]).toEqual([layout.entries.length - 3, layout.entries.length - 2, layout.entries.length - 1])
  })

  test('routa stránky receptu vede zpět na ni', () => {
    for (const [id, idx] of layout.recipeIndex) {
      expect(indexToRoute(idx, layout)).toEqual({ kind: 'recipe', id })
      expect(routeToIndex({ kind: 'recipe', id }, layout)).toBe(idx)
    }
  })

  test('id stránek jsou unikátní', () => {
    const ids = layout.entries.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('bez režimu je layout dvoustranný (spread)', () => {
    const spread = buildLayout(recipes, { tocPageCount: 3 })
    expect(spread.entries.filter((e) => e.half === 'left')).toHaveLength(recipes.length)
    expect(spread.entries.filter((e) => e.half === 'full')).toHaveLength(0)
  })
})
