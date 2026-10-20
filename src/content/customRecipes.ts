import { ALLERGENS, CHAPTERS } from '@/domain/schema'
import type { Allergen, Ingredient, IngredientLine, Recipe } from '@/domain/types'
import { normalize } from './search'

/** Prefix id vlastních receptů (`vlastni-<slug>-<suffix>`). */
export const CUSTOM_ID_PREFIX = 'vlastni-'
const SLUG_MAX = 40

export function isCustomRecipe(recipe: Pick<Recipe, 'source'>): boolean {
  return recipe.source.book === 'vlastni'
}

/** Název → kebab-case bez diakritiky (nejvýš 40 znaků); bez písmen a číslic → „recept“. */
export function slugify(title: string): string {
  const slug = normalize(title).replace(/[^a-z0-9]+/g, '-').slice(0, SLUG_MAX).replace(/^-+|-+$/g, '')
  return slug || 'recept'
}

/**
 * Nové id vlastního receptu: `vlastni-<slug>-<4 znaky base36>`.
 * Při kolizi losuje znovu; po 20 pokusech přidá pořadí pokusu, aby cyklus skončil i se zaseknutou náhodou.
 */
export function newCustomRecipeId(title: string, taken: ReadonlySet<string>, random: () => number = Math.random): string {
  const slug = slugify(title)
  for (let attempt = 0; ; attempt++) {
    const suffix = Math.floor(random() * 36 ** 4).toString(36).padStart(4, '0') + (attempt >= 20 ? attempt.toString(36) : '')
    const id = `${CUSTOM_ID_PREFIX}${slug}-${suffix}`
    if (!taken.has(id)) return id
  }
}

/** Alergeny receptu = sjednocení alergenů jeho surovin v pořadí `ALLERGENS` (ruling R2). */
export function deriveAllergens(lines: readonly Pick<IngredientLine, 'ingredientId'>[], ingredients: ReadonlyMap<string, Ingredient>): Allergen[] {
  return ALLERGENS.filter((a) => lines.some((l) => ingredients.get(l.ingredientId)?.allergens.includes(a)))
}

/** Proč vlastní recept nejde zařadit do knihy (null = jde). Sdílí sloučení obsahu i import (ruling R5). */
export function customRecipeProblem(recipe: Recipe, ingredients: ReadonlyMap<string, Ingredient>, staticIds: ReadonlySet<string>): string | null {
  if (!isCustomRecipe(recipe)) return 'není vlastní recept (source.book musí být „vlastni“)'
  if (staticIds.has(recipe.id)) return `id „${recipe.id}“ už má recept z knihy`
  const unknown = recipe.ingredients.find((l) => !ingredients.has(l.ingredientId))
  if (unknown) return `neznámá surovina „${unknown.ingredientId}“`
  return null
}

/**
 * Recepty knihy: knižní v původním pořadí, vlastní na konci své kapitoly, mezi sebou podle názvu (ruling R4).
 * Vlastní recept, který nejde zařadit, se vynechá s varováním v konzoli.
 */
export function mergeRecipes(staticRecipes: readonly Recipe[], custom: readonly Recipe[], ingredients: ReadonlyMap<string, Ingredient>): Recipe[] {
  const staticIds = new Set(staticRecipes.map((r) => r.id))
  const usable = custom.filter((r) => {
    const problem = customRecipeProblem(r, ingredients, staticIds)
    if (problem) console.warn(`Vlastní recept „${r.title}“ vynechán: ${problem}`)
    return problem === null
  })
  const sorted = [...usable].sort((a, b) => a.title.localeCompare(b.title, 'cs'))
  return CHAPTERS.flatMap((chapter) => [
    ...staticRecipes.filter((r) => r.chapter === chapter),
    ...sorted.filter((r) => r.chapter === chapter),
  ])
}

/**
 * Vlastní recept → kniha „Ověřené recepty“ (`overene`): id ze slugu názvu (při kolizi s příponou `-overene`),
 * zdroj `overene` s volitelným původem. Knižní recept musí mít 4 porce (schéma), jiný počet se odmítne.
 */
export function promoteToVerified(recipe: Recipe, takenIds: ReadonlySet<string>, origin?: string): Recipe {
  if (!isCustomRecipe(recipe)) throw new Error(`„${recipe.title}“ není vlastní recept`)
  if (recipe.baseServings !== 4) throw new Error(`„${recipe.title}“ je pro ${recipe.baseServings} porcí, kniha potřebuje 4 porce`)
  const slug = slugify(recipe.title)
  let id = slug
  for (let n = 1; takenIds.has(id); n++) id = n === 1 ? `${slug}-overene` : `${slug}-overene-${n}`
  const source: Recipe['source'] = { book: 'overene' }
  if (recipe.source.titleOriginal) source.titleOriginal = recipe.source.titleOriginal
  if (origin ?? recipe.source.origin) source.origin = origin ?? recipe.source.origin
  return { ...recipe, id, source }
}
