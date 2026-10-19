import { CATEGORIES } from './schema'
import { PINCH_GRAMS, roundAmount, scaleAmount } from './scaling'
import { effectiveLine, recipeScale, type CartLine } from './portions'
import type { Category, Ingredient, Recipe, Unit } from './types'

export type BaseUnit = 'g' | 'ml' | 'ks'
export type ShoppingUnit = BaseUnit | 'spetka'
export interface Quantity { amount: number; unit: BaseUnit }
export interface ShoppingSource { recipeId: string; title: string; amount: number; unit: ShoppingUnit; vessel: boolean }
export interface ShoppingItem { ingredientId: string; name: string; amount: number; unit: ShoppingUnit; sources: ShoppingSource[] }
export interface ShoppingGroup { category: Category; items: ShoppingItem[] }

/** Suroviny, které se nekupují (voda z kohoutku): na stránce receptu zůstávají, v seznamu ne. */
export const NOT_PURCHASED: ReadonlySet<string> = new Set(['voda'])

/** Objem kuchyňské jednotky, když ji surovina nemá v `units` (pojistka – validátor to hlásí jako chybu). */
const FALLBACK_ML = { lzice: 15, lzicka: 5, hrnek: 250 } as const

/** Množství v základní jednotce: g, ml nebo ks; lžíce/lžička/hrnek přes `units` (tekutina s hustotou → ml). */
export function toBaseQuantity(amount: number, unit: Unit, ing: Ingredient): Quantity {
  switch (unit) {
    case 'g':
    case 'ml':
    case 'ks':
      return { amount, unit }
    case 'spetka':
      return { amount: amount * PINCH_GRAMS, unit: 'g' }
    default: {
      const perUnit = ing.units[unit]
      if (perUnit === undefined) return { amount: amount * FALLBACK_ML[unit], unit: 'ml' }
      const grams = amount * perUnit
      return ing.densityGPerMl ? { amount: grams / ing.densityGPerMl, unit: 'ml' } : { amount: grams, unit: 'g' }
    }
  }
}

function gramsOf(q: Quantity, ing: Ingredient): number {
  if (q.unit === 'g') return q.amount
  if (q.unit === 'ml') return q.amount * (ing.densityGPerMl ?? 1)
  return q.amount * (ing.units.ks ?? 0) // ks bez units.ks hlásí validátor jako chybu
}

/** Součet: stejná jednotka se sčítá přímo, různé jednotky téže suroviny v gramech. */
function sum(qs: Quantity[], ing: Ingredient): Quantity {
  const unit = qs[0].unit
  if (qs.every((q) => q.unit === unit)) return { amount: qs.reduce((s, q) => s + q.amount, 0), unit }
  return { amount: qs.reduce((s, q) => s + gramsOf(q, ing), 0), unit: 'g' }
}

const rounded = (q: Quantity) => roundAmount(q.amount, q.unit) as { amount: number; unit: ShoppingUnit }

interface SourceAcc { title: string; qs: Quantity[]; vessel: boolean }

/** Nákupní seznam z košíku: přepočet na P × násobek, sloučení podle suroviny, skupiny podle kategorie obchodu. */
export function buildShoppingList(
  cart: readonly CartLine[],
  recipes: ReadonlyMap<string, Recipe>,
  ingredients: ReadonlyMap<string, Ingredient>,
  opts: { persons: number; historical: boolean },
): ShoppingGroup[] {
  const acc = new Map<string, Map<string, SourceAcc>>()
  for (const entry of cart) {
    const recipe = recipes.get(entry.recipeId)
    if (!recipe || !(entry.multiplier > 0)) continue
    const k = recipeScale(opts.persons, entry.multiplier, recipe.baseServings)
    for (const raw of recipe.ingredients) {
      const line = effectiveLine(raw, opts.historical)
      const ing = ingredients.get(line.ingredientId)
      if (!ing || NOT_PURCHASED.has(ing.id)) continue
      const scaling = line.scaling ?? ing.scaling
      const q = toBaseQuantity(scaleAmount(line.amount, k, scaling), line.unit, ing)
      const byRecipe = acc.get(ing.id) ?? new Map<string, SourceAcc>()
      acc.set(ing.id, byRecipe)
      const src = byRecipe.get(recipe.id) ?? { title: recipe.title, qs: [], vessel: false }
      src.qs.push(q)
      src.vessel = src.vessel || scaling === 'vessel'
      byRecipe.set(recipe.id, src)
    }
  }

  const byCategory = new Map<Category, ShoppingItem[]>()
  for (const [id, byRecipe] of acc) {
    const ing = ingredients.get(id)!
    const total = rounded(sum([...byRecipe.values()].flatMap((s) => s.qs), ing))
    const sources = [...byRecipe].map(([recipeId, s]) => ({ recipeId, title: s.title, ...rounded(sum(s.qs, ing)), vessel: s.vessel }))
    const list = byCategory.get(ing.category) ?? []
    list.push({ ingredientId: id, name: ing.name, ...total, sources })
    byCategory.set(ing.category, list)
  }
  return CATEGORIES.filter((c) => byCategory.has(c)).map((category) => ({
    category,
    items: byCategory.get(category)!.sort((a, b) => a.name.localeCompare(b.name, 'cs')),
  }))
}
