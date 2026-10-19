// src/print/bookletBlocks.test.ts
import { loadContent } from '@/content/loadContent'
import { buildShoppingList } from '@/domain/shopping'
import { bookletBlocks } from './bookletBlocks'

const { recipes, ingredients } = loadContent()
const byId = new Map(recipes.map((r) => [r.id, r]))
const eggs = byId.get('michana-vejce')!
const cart = [{ recipeId: 'michana-vejce', multiplier: 2 }]
const groups = buildShoppingList(cart, byId, ingredients, { persons: 4, historical: false })

test('titul, recept od nové strany (hlavní blok, kroky, poznámka, zdroj), nákupní seznam na konci; bez obsahu', () => {
  expect(eggs.steps).toHaveLength(3)
  expect(eggs.modernNote).toBeTruthy()
  const blocks = bookletBlocks(cart, byId, groups)
  expect(blocks.map((b) => b.kind)).toEqual([
    'title',
    'recipe-main', 'recipe-step', 'recipe-step', 'recipe-step', 'recipe-note', 'recipe-source',
    'list-head', ...groups.flatMap((g) => g.items.map(() => 'list-item')),
  ])
  expect(blocks.filter((b) => b.startsPage).map((b) => b.kind)).toEqual(['title', 'recipe-main', 'list-head'])
  expect(blocks[0]).toMatchObject({ kind: 'title', recipeCount: 1 })
  expect(blocks[1]).toMatchObject({ kind: 'recipe-main', multiplier: 2 })
  expect(blocks.flatMap((b) => (b.kind === 'recipe-step' ? [b.step] : []))).toEqual([0, 1, 2])
})

test('neexistující recept se přeskočí a nepočítá; pořadí receptů podle košíku', () => {
  const blocks = bookletBlocks(
    [{ recipeId: 'hovezi-gulas', multiplier: 1 }, { recipeId: 'neexistuje', multiplier: 1 }, { recipeId: 'michana-vejce', multiplier: 1 }],
    byId,
    [],
  )
  expect(blocks.flatMap((b) => (b.kind === 'recipe-main' ? [b.recipe.id] : []))).toEqual(['hovezi-gulas', 'michana-vejce'])
  expect(blocks[0]).toMatchObject({ kind: 'title', recipeCount: 2 })
})

test('položky seznamu: první položka každé kategorie má index 0 (nese nadpis)', () => {
  const blocks = bookletBlocks(cart, byId, groups)
  const items = blocks.flatMap((b) => (b.kind === 'list-item' ? [{ category: b.group.category, item: b.item }] : []))
  expect(items).toHaveLength(groups.reduce((s, g) => s + g.items.length, 0))
  for (const g of groups) expect(items.find((i) => i.category === g.category)!.item).toBe(0)
})

test('prázdný košík: jen titul a hlavička seznamu', () => {
  expect(bookletBlocks([], byId, []).map((b) => b.kind)).toEqual(['title', 'list-head'])
})
