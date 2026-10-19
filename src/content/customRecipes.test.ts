import { RecipeSchema } from '@/domain/schema'
import { customRecipe } from '@/test/customRecipe'
import { customRecipeProblem, deriveAllergens, isCustomRecipe, mergeRecipes, newCustomRecipeId, slugify } from './customRecipes'
import { loadContent } from './loadContent'

const { recipes, ingredients } = loadContent()
const staticIds = new Set(recipes.map((r) => r.id))

describe('slugify', () => {
  test.each([
    ['Babiččiny lívance', 'babicciny-livance'],
    ['  Guláš (pro 10!) ', 'gulas-pro-10'],
    ['Žluťoučký kůň úpěl ďábelské ódy a ještě mnohem delší název', 'zlutoucky-kun-upel-dabelske-ody-a-jeste'],
    ['???', 'recept'],
  ])('%j → %s', (title, slug) => expect(slugify(title)).toBe(slug))
})

describe('newCustomRecipeId', () => {
  test('tvar vlastni-<slug>-<4 znaky> a platné id receptu', () => {
    const id = newCustomRecipeId('Babiččiny lívance', new Set())
    expect(id).toMatch(/^vlastni-babicciny-livance-[a-z0-9]{4}$/)
    expect(RecipeSchema.safeParse(customRecipe({ id })).success).toBe(true)
  })
  test('při kolizi losuje znovu', () => {
    const values = [0, 0.5]
    expect(newCustomRecipeId('X', new Set(['vlastni-x-0000']), () => values.shift()!)).toBe('vlastni-x-i000')
  })
  test('i se zaseknutou náhodou cyklus skončí (po 20 pokusech přidá pořadí)', () =>
    expect(newCustomRecipeId('X', new Set(['vlastni-x-0000']), () => 0)).toBe('vlastni-x-0000k'))
})

test('isCustomRecipe podle knihy', () => {
  expect(isCustomRecipe(customRecipe())).toBe(true)
  expect(isCustomRecipe(recipes[0])).toBe(false)
})

test('deriveAllergens: sjednocení alergenů surovin v pořadí ALLERGENS', () => {
  expect(deriveAllergens([{ ingredientId: 'vejce' }, { ingredientId: 'hladka-mouka' }, { ingredientId: 'sul' }], ingredients)).toEqual(['lepek', 'vejce'])
  expect(deriveAllergens([{ ingredientId: 'sul' }], ingredients)).toEqual([])
  expect(deriveAllergens([{ ingredientId: 'neexistuje' }], ingredients)).toEqual([])
})

describe('customRecipeProblem', () => {
  test('platný vlastní recept → null', () => expect(customRecipeProblem(customRecipe(), ingredients, staticIds)).toBeNull())
  test('knižní recept', () =>
    expect(customRecipeProblem(recipes[0], ingredients, staticIds)).toBe('není vlastní recept (source.book musí být „vlastni“)'))
  test('id knižního receptu', () =>
    expect(customRecipeProblem(customRecipe({ id: 'brownies' }), ingredients, staticIds)).toBe('id „brownies“ už má recept z knihy'))
  test('neznámá surovina', () =>
    expect(customRecipeProblem(customRecipe({ ingredients: [{ ingredientId: 'neexistuje', amount: 1, unit: 'g' }] }), ingredients, staticIds)).toBe(
      'neznámá surovina „neexistuje“',
    ))
})

describe('mergeRecipes', () => {
  test('vlastní recept je na konci své kapitoly, knižní pořadí se nemění', () => {
    const own = customRecipe()
    const merged = mergeRecipes(recipes, [own], ingredients)
    expect(merged).toHaveLength(recipes.length + 1)
    expect(merged.filter((r) => r.chapter === own.chapter).at(-1)).toBe(own)
    expect(merged.filter((r) => r.id !== own.id)).toEqual(recipes)
  })
  test('vlastní recepty mezi sebou podle názvu', () => {
    const a = customRecipe({ id: 'vlastni-a-0001', title: 'Žemlovka' })
    const b = customRecipe({ id: 'vlastni-b-0002', title: 'Čočkové placky' })
    const chapter = mergeRecipes(recipes, [a, b], ingredients).filter((r) => r.chapter === a.chapter)
    expect(chapter.slice(-2).map((r) => r.title)).toEqual(['Čočkové placky', 'Žemlovka'])
  })
  test('nezařaditelný vlastní recept se vynechá s varováním', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bad = customRecipe({ ingredients: [{ ingredientId: 'neexistuje', amount: 1, unit: 'g' }] })
    expect(mergeRecipes(recipes, [bad], ingredients)).toEqual(recipes)
    expect(warn).toHaveBeenCalledWith('Vlastní recept „Babiččiny lívance“ vynechán: neznámá surovina „neexistuje“')
    warn.mockRestore()
  })
  test('bez vlastních receptů beze změny', () => expect(mergeRecipes(recipes, [], ingredients)).toEqual(recipes))
})
