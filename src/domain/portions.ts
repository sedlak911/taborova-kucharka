import { personEquivalent } from './scaling'
import type { IngredientLine } from './types'

/** Náročnost dne (posuvník v záložce, spec §3). */
export const DAY_FACTOR_MIN = 0.8
export const DAY_FACTOR_MAX = 1.3
export const DAY_FACTOR_STEP = 0.05
/** Výchozí denní cíl dospělého při náročnosti 1,0 (spec §3). */
export const DEFAULT_KCAL_TARGET = 2300

export interface People { adults: number; children: number }

/** Vstupy přepočtu ze stavu uživatele (záložka + tiráž). */
export interface Portions { people: People; childCoef: number; dayFactor: number }

/** Položka košíku (shodná s `UserState.cart`). */
export interface CartLine { recipeId: string; multiplier: number }

/** Osoby-ekvivalent P = (dospělí + děti × koeficient dítěte) × náročnost dne. */
export function persons(p: Portions): number {
  return personEquivalent(p.people.adults, p.people.children, p.childCoef, p.dayFactor)
}

/** Škálovací faktor receptu k = P × násobek / baseServings. */
export function recipeScale(P: number, multiplier: number, baseServings: number): number {
  return (P * multiplier) / baseServings
}

/** k pro jednu dospělou osobu (šedý sloupec „Na osobu“). */
export function onePersonScale(p: Portions, baseServings: number): number {
  return recipeScale(p.dayFactor, 1, baseServings)
}

/** Řádek podle přepínače historických surovin: historicky se použije `original`; skupina, poznámka a přepsání třídy zůstávají. */
export function effectiveLine(line: IngredientLine, historical: boolean): IngredientLine {
  if (!historical || !line.original) return line
  const { original, ...rest } = line
  return { ...rest, ingredientId: original.ingredientId, amount: original.amount, unit: original.unit }
}
