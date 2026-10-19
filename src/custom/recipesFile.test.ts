import { loadContent } from '@/content/loadContent'
import { RecipeSchema } from '@/domain/schema'
import { customRecipe } from '@/test/customRecipe'
import { customRecipesFileName, parseCustomRecipesFile, serializeCustomRecipes } from './recipesFile'

const { recipes, ingredients } = loadContent()
const ctx = { ingredients, staticIds: new Set(recipes.map((r) => r.id)) }
const brownies = recipes.find((r) => r.id === 'brownies')!

test('název souboru podle místního data', () => {
  expect(customRecipesFileName(new Date(2026, 9, 15))).toBe('vlastni-recepty-2026-10-15.json')
  expect(customRecipesFileName(new Date(2026, 0, 5, 23, 59))).toBe('vlastni-recepty-2026-01-05.json')
})

test('export: pole receptů ve tvaru data/recipes (2 mezery, nový řádek na konci)', () => {
  const text = serializeCustomRecipes([customRecipe()])
  expect(text.endsWith('\n')).toBe(true)
  expect(text).toContain('\n  {\n    "id": "vlastni-babicciny-livance-ab12"')
  const data = JSON.parse(text)
  expect(data).toEqual([customRecipe()])
  for (const r of data) expect(RecipeSchema.safeParse(r).success).toBe(true)
})

test('import přijme export i jeden recept (soubor z data/recipes)', () => {
  expect(parseCustomRecipesFile(serializeCustomRecipes([customRecipe()]), ctx)).toEqual({ recipes: [customRecipe()], skipped: [] })
  expect(parseCustomRecipesFile(JSON.stringify(customRecipe()), ctx).recipes).toEqual([customRecipe()])
})

test('import: neplatné, knižní, kolidující a zdvojené položky se přeskočí s důvodem', () => {
  const text = JSON.stringify([
    { title: 'Rozbitý' },
    42,
    brownies,
    customRecipe({ id: 'brownies', title: 'Moje brownies' }),
    customRecipe({ id: 'vlastni-x-0001', title: 'Neznámá', ingredients: [{ ingredientId: 'neexistuje', amount: 1, unit: 'g' }] }),
    customRecipe(),
    customRecipe(),
  ])
  expect(parseCustomRecipesFile(text, ctx)).toEqual({
    recipes: [customRecipe()],
    skipped: [
      { label: 'Rozbitý', reason: 'neodpovídá schématu receptu' },
      { label: 'položka 2', reason: 'neodpovídá schématu receptu' },
      { label: 'Brownies', reason: 'není vlastní recept (source.book musí být „vlastni“)' },
      { label: 'Moje brownies', reason: 'id „brownies“ už má recept z knihy' },
      { label: 'Neznámá', reason: 'neznámá surovina „neexistuje“' },
      { label: 'Babiččiny lívance', reason: 'v souboru dvakrát' },
    ],
  })
})

test('poškozený JSON vyhodí srozumitelnou chybu', () => {
  expect(() => parseCustomRecipesFile('{nejson', ctx)).toThrow('Soubor není platný JSON.')
})

test('import: kroky jako řetězce (starší export) se převedou na objekty', () => {
  const legacy = { ...customRecipe(), steps: customRecipe().steps.map((s) => s.text) }
  expect(parseCustomRecipesFile(JSON.stringify([legacy]), ctx)).toEqual({ recipes: [customRecipe()], skipped: [] })
})
