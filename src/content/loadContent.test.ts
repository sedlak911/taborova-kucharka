import { loadContent } from './loadContent'
import { CHAPTERS } from '@/domain/schema'

test('načte všechny recepty a suroviny', () => {
  const { recipes, ingredients } = loadContent()
  expect(recipes.length).toBeGreaterThanOrEqual(78)
  expect(ingredients.size).toBeGreaterThanOrEqual(340)
  for (const r of recipes) for (const l of r.ingredients) expect(ingredients.has(l.ingredientId)).toBe(true)
})

test('recepty jsou seřazené podle kapitol a názvu', () => {
  const { recipes } = loadContent()
  const order = recipes.map((r) => CHAPTERS.indexOf(r.chapter))
  expect([...order].sort((a, b) => a - b)).toEqual(order)
})
