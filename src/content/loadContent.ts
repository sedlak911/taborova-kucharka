import { RecipeSchema, IngredientSchema, CHAPTERS } from '@/domain/schema'
import type { Recipe, Ingredient } from '@/domain/types'

const recipeModules = import.meta.glob('../../data/recipes/*.json', { eager: true, import: 'default' }) as Record<string, unknown>
const ingredientModules = import.meta.glob('../../data/ingredients.json', { eager: true, import: 'default' }) as Record<string, unknown[]>

export interface Content {
  recipes: Recipe[]
  ingredients: Map<string, Ingredient>
}

let cache: Content | null = null

/** Načte a zvaliduje všechny recepty a suroviny (výsledek se cachuje). */
export function loadContent(): Content {
  if (cache) return cache
  const recipes = Object.values(recipeModules).map((m) => RecipeSchema.parse(m))
  recipes.sort((a, b) => CHAPTERS.indexOf(a.chapter) - CHAPTERS.indexOf(b.chapter) || a.title.localeCompare(b.title, 'cs'))
  const ingredients = new Map<string, Ingredient>()
  for (const raw of Object.values(ingredientModules).flat()) {
    const i = IngredientSchema.parse(raw)
    ingredients.set(i.id, i)
  }
  cache = { recipes, ingredients }
  return cache
}
