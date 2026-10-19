import { IngredientSchema, IngredientLineSchema, RecipeSchema } from './schema'

const ingredient = {
  id: 'vejce', name: 'Vejce', aliases: ['vajíčko'], category: 'mlecne-a-vejce', scaling: 'linear',
  nutritionPer100g: { kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5, fiber: 0 },
  units: { ks: 50 }, ediblePortion: 0.88, allergens: ['vejce'], sources: { nutrition: 'USDA SR Legacy 171287' },
}
const recipe = {
  id: 'michana-vejce', title: 'Míchaná vejce', chapter: 'snidane-a-pecivo', baseServings: 4, timeMinutes: 10, difficulty: 1,
  tags: ['rychle', 'levne'], equipment: ['plotna'], allergens: ['vejce', 'mleko'],
  ingredients: [{ ingredientId: 'vejce', amount: 8, unit: 'ks' }, { ingredientId: 'sul', amount: 1, unit: 'spetka' }],
  steps: ['Rozšlehej vejce.', 'Opékej na másle.'], source: { book: 'vlastni' }, verified: true,
}

test('platná surovina projde', () => expect(IngredientSchema.safeParse(ingredient).success).toBe(true))
test('surovina s ediblePortion > 1 neprojde', () => expect(IngredientSchema.safeParse({ ...ingredient, ediblePortion: 1.2 }).success).toBe(false))
test('surovina s neznámou kategorií neprojde', () => expect(IngredientSchema.safeParse({ ...ingredient, category: 'x' }).success).toBe(false))
test('id musí být kebab-case', () => expect(IngredientSchema.safeParse({ ...ingredient, id: 'Vejce 1' }).success).toBe(false))
test('platný recept projde', () => expect(RecipeSchema.safeParse(recipe).success).toBe(true))
test('knižní recept musí mít baseServings 4', () =>
  expect(RecipeSchema.safeParse({ ...recipe, baseServings: 6, source: { book: 'afrs-2003' } }).success).toBe(false))
test('vlastní recept smí mít 1–50 celých porcí', () => {
  expect(RecipeSchema.safeParse({ ...recipe, baseServings: 6 }).success).toBe(true)
  expect(RecipeSchema.safeParse({ ...recipe, baseServings: 1 }).success).toBe(true)
  for (const b of [0, 51, 2.5]) expect(RecipeSchema.safeParse({ ...recipe, baseServings: b }).success).toBe(false)
})
test('množství musí být kladné', () => expect(RecipeSchema.safeParse({ ...recipe, ingredients: [{ ingredientId: 'vejce', amount: 0, unit: 'ks' }] }).success).toBe(false))
test('špetka má amount 1', () => expect(RecipeSchema.safeParse({ ...recipe, ingredients: [{ ingredientId: 'sul', amount: 2, unit: 'spetka' }] }).success).toBe(false))
test('neznámý tag neprojde', () => expect(RecipeSchema.safeParse({ ...recipe, tags: ['bio'] }).success).toBe(false))
test('recept bez kroků neprojde', () => expect(RecipeSchema.safeParse({ ...recipe, steps: [] }).success).toBe(false))

const withNutrition = (n: Record<string, number>) => ({ ...ingredient, nutritionPer100g: { ...ingredient.nutritionPer100g, ...n } })
test('kcal 901 neprojde', () => expect(IngredientSchema.safeParse(withNutrition({ kcal: 901 })).success).toBe(false))
test('kcal 900 projde', () => expect(IngredientSchema.safeParse(withNutrition({ kcal: 900 })).success).toBe(true))
test('protein 101 neprojde', () => expect(IngredientSchema.safeParse(withNutrition({ protein: 101 })).success).toBe(false))
test('fat -1 neprojde', () => expect(IngredientSchema.safeParse(withNutrition({ fat: -1 })).success).toBe(false))
test('ediblePortion 0 neprojde', () => expect(IngredientSchema.safeParse({ ...ingredient, ediblePortion: 0 }).success).toBe(false))
test('ediblePortion 1 projde', () => expect(IngredientSchema.safeParse({ ...ingredient, ediblePortion: 1 }).success).toBe(true))
test('units.ks 0 neprojde', () => expect(IngredientSchema.safeParse({ ...ingredient, units: { ks: 0 } }).success).toBe(false))
test('densityGPerMl -1 neprojde', () => expect(IngredientSchema.safeParse({ ...ingredient, densityGPerMl: -1 }).success).toBe(false))
test('IngredientLine: špetka s amount 1 projde', () => expect(IngredientLineSchema.safeParse({ ingredientId: 'sul', amount: 1, unit: 'spetka' }).success).toBe(true))
test('IngredientLine: špetka s amount 0.5 neprojde', () => expect(IngredientLineSchema.safeParse({ ingredientId: 'sul', amount: 0.5, unit: 'spetka' }).success).toBe(false))
test('timeMinutes 1.5 neprojde', () => expect(RecipeSchema.safeParse({ ...recipe, timeMinutes: 1.5 }).success).toBe(false))
test('timeMinutes 0 neprojde', () => expect(RecipeSchema.safeParse({ ...recipe, timeMinutes: 0 }).success).toBe(false))
test('difficulty 4 neprojde', () => expect(RecipeSchema.safeParse({ ...recipe, difficulty: 4 }).success).toBe(false))
test('neznámá jednotka cup neprojde', () => expect(IngredientLineSchema.safeParse({ ingredientId: 'mouka', amount: 1, unit: 'cup' }).success).toBe(false))
test('neznámá kapitola neprojde', () => expect(RecipeSchema.safeParse({ ...recipe, chapter: 'neexistuje' }).success).toBe(false))
test('neznámý alergen neprojde', () => expect(RecipeSchema.safeParse({ ...recipe, allergens: ['gluten'] }).success).toBe(false))
test('neznámá kniha neprojde', () => expect(RecipeSchema.safeParse({ ...recipe, source: { book: 'neznama-kniha' } }).success).toBe(false))
test('difficulty 2 projde', () => expect(RecipeSchema.safeParse({ ...recipe, difficulty: 2 }).success).toBe(true))
test('IngredientLine: scaling vessel projde', () => expect(IngredientLineSchema.safeParse({ ingredientId: 'voda', amount: 1000, unit: 'ml', scaling: 'vessel' }).success).toBe(true))
test('IngredientLine: neznámá třída scaling neprojde', () => expect(IngredientLineSchema.safeParse({ ingredientId: 'voda', amount: 1000, unit: 'ml', scaling: 'x' }).success).toBe(false))
test('IngredientLine: neznámý klíč (překlep scailng) neprojde', () => expect(IngredientLineSchema.safeParse({ ingredientId: 'voda', amount: 1000, unit: 'ml', scailng: 'vessel' }).success).toBe(false))
test('Recept: neznámý klíč (překlep scailng) neprojde', () => expect(RecipeSchema.safeParse({ ...recipe, scailng: 'vessel' }).success).toBe(false))
test('Surovina: neznámý klíč neprojde', () => expect(IngredientSchema.safeParse({ ...ingredient, scailng: 'linear' }).success).toBe(false))
test('Surovina: containsMeat projde', () => expect(IngredientSchema.safeParse({ ...ingredient, containsMeat: true }).success).toBe(true))

test('kroky: řetězec se normalizuje na { text }, objekt s minutes a parallel projde beze změny (R3)', () => {
  const r = RecipeSchema.parse({
    ...recipe,
    steps: ['Rozšlehej vejce.', { text: 'Opékej na másle.', minutes: 5 }, { text: 'Mezitím opeč chléb.', minutes: 3, parallel: true }],
  })
  expect(r.steps).toEqual([
    { text: 'Rozšlehej vejce.' },
    { text: 'Opékej na másle.', minutes: 5 },
    { text: 'Mezitím opeč chléb.', minutes: 3, parallel: true },
  ])
})

test.each([
  ['minutes 0', { text: 'x', minutes: 0 }],
  ['minutes 2.5', { text: 'x', minutes: 2.5 }],
  ['parallel false', { text: 'x', parallel: false }],
  ['prázdný text', { text: '' }],
  ['neznámý klíč', { text: 'x', seconds: 30 }],
  ['prázdný řetězec', ''],
])('krok s %s neprojde', (_, step) => expect(RecipeSchema.safeParse({ ...recipe, steps: [step] }).success).toBe(false))
