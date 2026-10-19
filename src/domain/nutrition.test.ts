// src/domain/nutrition.test.ts
import {
  WEIGHED_WITH_REFUSE, cartMacrosPerAdult, coveragePercent, dailyKcalTarget, edibleGrams, lineMacros, recipeMacrosPerServing,
} from './nutrition'
import type { Ingredient, Recipe } from './types'

const base: Ingredient = {
  id: 'x', name: 'X', aliases: [], category: 'ostatni', scaling: 'linear',
  nutritionPer100g: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }, units: {}, ediblePortion: 1, allergens: [], sources: { nutrition: 'test' },
}
const kure: Ingredient = { ...base, id: 'kure', name: 'Celé kuře', category: 'maso', ediblePortion: 0.68, nutritionPer100g: { kcal: 215, protein: 18.6, carbs: 0, fat: 15, fiber: 0 } }
const mrkev: Ingredient = { ...base, id: 'mrkev', name: 'Mrkev', category: 'zelenina', ediblePortion: 0.89, nutritionPer100g: { kcal: 41, protein: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8 } }
const olej: Ingredient = { ...base, id: 'olej', name: 'Olej', category: 'tuky-a-oleje', scaling: 'fat', densityGPerMl: 0.92, nutritionPer100g: { kcal: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 } }
const vejce: Ingredient = { ...base, id: 'vejce', name: 'Vejce', category: 'mlecne-a-vejce', ediblePortion: 0.88, units: { ks: 50 }, nutritionPer100g: { kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5, fiber: 0 } }
const vejceMrazena: Ingredient = { ...base, id: 'vejce-mrazena', name: 'Vejce mražená', category: 'mrazene', nutritionPer100g: { kcal: 150, protein: 12, carbs: 1, fat: 10, fiber: 0 } }
const ingredients = new Map([kure, mrkev, olej, vejce, vejceMrazena].map((i) => [i.id, i]))

const recipe = (id: string, lines: Recipe['ingredients']): Recipe => ({
  id, title: id, chapter: 'maso-a-ryby', baseServings: 4, timeMinutes: 60, difficulty: 1, tags: [], equipment: [], allergens: [],
  ingredients: lines, steps: [{ text: 'x' }], source: { book: 'vlastni' }, verified: true,
})
const dusene = recipe('dusene', [
  { ingredientId: 'kure', amount: 1000, unit: 'g' },
  { ingredientId: 'mrkev', amount: 400, unit: 'g' },
  { ingredientId: 'olej', amount: 20, unit: 'ml', scaling: 'vessel' },
])
const vajicka = recipe('vajicka', [{ ingredientId: 'vejce', amount: 2, unit: 'ks', original: { ingredientId: 'vejce-mrazena', amount: 100, unit: 'g' } }])
const recipes = new Map([dusene, vajicka].map((r) => [r.id, r]))

describe('edibleGrams (ruling R1)', () => {
  test('maso v g se krátí na jedlý podíl (kosti)', () => expect(edibleGrams({ ingredientId: 'kure', amount: 1000, unit: 'g' }, kure)).toBeCloseTo(680))
  test('zelenina v g je už očištěná (AFRS Weight = EP)', () => expect(edibleGrams({ ingredientId: 'mrkev', amount: 100, unit: 'g' }, mrkev)).toBe(100))
  test('kusy jsou gramy jedlé části z units', () => expect(edibleGrams({ ingredientId: 'vejce', amount: 2, unit: 'ks' }, vejce)).toBe(100))
  test('kategorie vážené s odpadem', () => expect([...WEIGHED_WITH_REFUSE].sort()).toEqual(['maso', 'ryby', 'uzeniny']))
  test('ks bez převodu → null a makra 0', () => {
    expect(edibleGrams({ ingredientId: 'mrkev', amount: 2, unit: 'ks' }, mrkev)).toBeNull()
    expect(lineMacros({ ingredientId: 'mrkev', amount: 2, unit: 'ks' }, mrkev).kcal).toBe(0)
  })
})

describe('recipeMacrosPerServing', () => {
  test('součet řádků / baseServings, bez vessel tuku', () => {
    const m = recipeMacrosPerServing(dusene, ingredients, false)
    expect(m.kcal).toBeCloseTo(406.5) // (680 × 2,15 + 400 × 0,41) / 4
    expect(m.protein).toBeCloseTo(32.52)
    expect(m.carbs).toBeCloseTo(9.6)
    expect(m.fat).toBeCloseTo(25.7)
  })
  test('historické suroviny počítají s original', () => {
    expect(recipeMacrosPerServing(vajicka, ingredients, false).kcal).toBeCloseTo(35.75)
    expect(recipeMacrosPerServing(vajicka, ingredients, true).kcal).toBeCloseTo(37.5)
  })
})

describe('košík', () => {
  test('na dospělého = porce × násobek × náročnost', () => {
    expect(cartMacrosPerAdult([{ recipeId: 'dusene', multiplier: 2 }], recipes, ingredients, { historical: false, dayFactor: 1.2 }).kcal).toBeCloseTo(975.6)
  })
  test('neznámý recept a násobek 0 se přeskočí', () => {
    const m = cartMacrosPerAdult([{ recipeId: 'neni', multiplier: 1 }, { recipeId: 'dusene', multiplier: 0 }], recipes, ingredients, { historical: false, dayFactor: 1 })
    expect(m).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
  })
  test('cíl = (vlastní nebo 2300) × náročnost, pokrytí v celých procentech', () => {
    expect(dailyKcalTarget(undefined, 1.2)).toBeCloseTo(2760)
    expect(dailyKcalTarget(2000, 1)).toBe(2000)
    expect(coveragePercent(1150, 2300)).toBe(50)
    expect(coveragePercent(975.6, 2760)).toBe(35)
    expect(coveragePercent(100, 0)).toBe(0)
  })
})

test('recipeMacrosPerServing dělí baseServings (vlastní recept pro 2 porce)', () => {
  const pul: Recipe = { ...recipe('pul', [{ ingredientId: 'mrkev', amount: 400, unit: 'g' }]), baseServings: 2 }
  expect(recipeMacrosPerServing(pul, ingredients, false).kcal).toBeCloseTo(82) // 400 g × 41 kcal/100 g / 2
})
