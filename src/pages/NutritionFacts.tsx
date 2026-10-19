import type { Macros } from '@/domain/nutrition'
import { formatMacros } from './labels'

/** Orientační nutrice na jednu porci receptu (spec §3). */
export function NutritionFacts({ macros }: { macros: Macros }) {
  return (
    <p className="nutrition-facts">
      <span className="nutrition-facts__label">Na porci (orientačně):</span> {formatMacros(macros)}
    </p>
  )
}
