// src/domain/nutrition.ts
import { DEFAULT_KCAL_TARGET, effectiveLine, type CartLine } from './portions'
import { toGrams } from './scaling'
import type { Category, Ingredient, IngredientLine, Recipe } from './types'

export interface Macros { kcal: number; protein: number; carbs: number; fat: number }
export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

/**
 * Kategorie, u kterých recepty uvádějí g/ml v nákupní hmotnosti včetně kostí a odpadu (celé kuře, koleno…).
 * Ostatní gramy jsou jedlá část (AFRS Weight = EP) a `units` jsou gramy jedlé části (spec §5.1).
 */
export const WEIGHED_WITH_REFUSE: ReadonlySet<Category> = new Set<Category>(['maso', 'ryby', 'uzeniny'])

export function edibleGrams(line: IngredientLine, ing: Ingredient): number | null {
  const g = toGrams(line, ing)
  if (g === null) return null
  const weighed = line.unit === 'g' || line.unit === 'ml'
  return weighed && WEIGHED_WITH_REFUSE.has(ing.category) ? g * ing.ediblePortion : g
}

const scaled = (m: Macros, f: number): Macros => ({ kcal: m.kcal * f, protein: m.protein * f, carbs: m.carbs * f, fat: m.fat * f })
const plus = (a: Macros, b: Macros): Macros => ({ kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat })

export function lineMacros(line: IngredientLine, ing: Ingredient): Macros {
  const g = edibleGrams(line, ing)
  if (g === null) return ZERO_MACROS
  const n = ing.nutritionPer100g
  return scaled({ kcal: n.kcal, protein: n.protein, carbs: n.carbs, fat: n.fat }, g / 100)
}

/** Makra na jednu porci (recept / baseServings), lineárně; řádky třídy vessel (slévaná voda, tuk na smažení) se nepočítají. */
export function recipeMacrosPerServing(recipe: Recipe, ingredients: ReadonlyMap<string, Ingredient>, historical: boolean): Macros {
  let total = ZERO_MACROS
  for (const raw of recipe.ingredients) {
    const line = effectiveLine(raw, historical)
    const ing = ingredients.get(line.ingredientId)
    if (!ing || (line.scaling ?? ing.scaling) === 'vessel') continue
    total = plus(total, lineMacros(line, ing))
  }
  return scaled(total, 1 / recipe.baseServings)
}

/** Co sní jeden dospělý z celého košíku: Σ porce × násobek × náročnost dne. */
export function cartMacrosPerAdult(
  cart: readonly CartLine[],
  recipes: ReadonlyMap<string, Recipe>,
  ingredients: ReadonlyMap<string, Ingredient>,
  opts: { historical: boolean; dayFactor: number },
): Macros {
  let total = ZERO_MACROS
  for (const entry of cart) {
    const recipe = recipes.get(entry.recipeId)
    if (!recipe || !(entry.multiplier > 0)) continue
    total = plus(total, scaled(recipeMacrosPerServing(recipe, ingredients, opts.historical), entry.multiplier * opts.dayFactor))
  }
  return total
}

export function dailyKcalTarget(kcalTarget: number | undefined, dayFactor: number): number {
  return (kcalTarget ?? DEFAULT_KCAL_TARGET) * dayFactor
}

export function coveragePercent(kcal: number, target: number): number {
  return target > 0 ? Math.round((kcal / target) * 100) : 0
}
