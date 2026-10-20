import type { Ingredient, IngredientLine, ScalingClass, Unit } from './types'

/** Exponenty škálování podle třídy suroviny (spec §3). */
export const SCALING_EXPONENT: Record<ScalingClass, number> = {
  linear: 1, seasoning: 0.85, aromatic: 0.92, leavening: 0.8, fat: 0.9, vessel: 0.6,
}
export const DEFAULT_CHILD_COEF = 0.8
/** Hmotnost jedné špetky v gramech pro nutriční odhad. */
export const PINCH_GRAMS = 0.3

export function personEquivalent(adults: number, children: number, childCoef = DEFAULT_CHILD_COEF, dayFactor = 1): number {
  return (adults + children * childCoef) * dayFactor
}

export function scaleFactor(k: number, scaling: ScalingClass): number {
  if (!(k > 0)) return 0
  return Math.pow(k, SCALING_EXPONENT[scaling])
}

export function scaleAmount(amount: number, k: number, scaling: ScalingClass): number {
  return amount * scaleFactor(k, scaling)
}

const roundTo = (v: number, step: number) => Math.round(v / step) * step
const ceilTo = (v: number, step: number) => Math.ceil(v / step - 1e-9) * step

export function roundAmount(amount: number, unit: Unit): { amount: number; unit: Unit } {
  if (unit === 'spetka') return { amount: 1, unit }
  if (unit === 'g' || unit === 'ml') {
    if (amount < 1) return { amount: 1, unit: 'spetka' }
    if (amount <= 20) return { amount: Math.max(1, Math.round(amount)), unit }
    if (amount <= 200) return { amount: roundTo(amount, 5), unit }
    return { amount: roundTo(amount, 10), unit }
  }
  // ks, lzice, lzicka, hrnek: nahoru na 0,5
  return { amount: ceilTo(amount, 0.5), unit }
}

export function toGrams(line: IngredientLine, ingredient: Ingredient): number | null {
  switch (line.unit) {
    case 'g': return line.amount
    case 'ml': return line.amount * (ingredient.densityGPerMl ?? 1)
    case 'spetka': return PINCH_GRAMS
    default: {
      const perUnit = ingredient.units[line.unit]
      return perUnit === undefined ? null : perUnit * line.amount
    }
  }
}

export function scaleLine(line: IngredientLine, ingredient: Ingredient, k: number): { amount: number; unit: Unit } {
  if (line.unit === 'spetka') return { amount: 1, unit: 'spetka' }
  const scaled = scaleAmount(line.amount, k, line.scaling ?? ingredient.scaling)
  // malé množství ve lžících/hrncích převést na gramy, aby šlo poznat „špetku“; kusy (ks) zůstávají kusy
  if (line.unit !== 'g' && line.unit !== 'ml' && line.unit !== 'ks') {
    const perUnit = ingredient.units[line.unit]
    if (perUnit !== undefined && scaled * perUnit < 1) return { amount: 1, unit: 'spetka' }
  }
  // méně než půl kusu by se zaokrouhlilo nahoru na ½ ks pro libovolný počet osob; těžší kus (vejce) proto v gramech
  if (line.unit === 'ks' && scaled < 0.5) {
    const perUnit = ingredient.units.ks
    if (perUnit !== undefined && scaled * perUnit >= 1) return roundAmount(scaled * perUnit, 'g')
  }
  return roundAmount(scaled, line.unit)
}
