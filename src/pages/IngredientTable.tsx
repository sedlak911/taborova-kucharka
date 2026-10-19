import type { ReactNode } from 'react'
import { effectiveLine, onePersonScale, persons, recipeScale, type Portions } from '@/domain/portions'
import { scaleLine } from '@/domain/scaling'
import type { Ingredient, IngredientLine, Recipe } from '@/domain/types'
import { formatAmount, formatDecimal, peopleBreakdown, peopleLabel, plural } from './labels'

interface Props {
  recipe: Recipe
  ingredients: Map<string, Ingredient>
  /** Osoby, koeficient dítěte a náročnost dne (záložka + tiráž). */
  portions: Portions
  /** Přepínač historických surovin (tiráž). */
  historical: boolean
  perPerson?: boolean
  /** Násobek z košíku (brožurka); stránka receptu i tisk A4 ukazují ×1. */
  multiplier?: number
  /** Hlavička šedého sloupce (tisk A4: „Na 1 osobu“). */
  perPersonLabel?: string
}

/** Drobná poznámka u nahrazené suroviny: druhá varianta než ta, která je v řádku. */
function variantNote(raw: IngredientLine, historical: boolean, ingredients: Map<string, Ingredient>, baseServings: number): ReactNode {
  if (!raw.original) return null
  const other = historical ? { ingredientId: raw.ingredientId, amount: raw.amount, unit: raw.unit } : raw.original
  const name = ingredients.get(other.ingredientId)?.name ?? other.ingredientId
  return (
    <small className="ingredient-original">
      {historical ? 'dnes' : 'původně'}: {name} {formatAmount(other.amount, other.unit)} (na {baseServings} {plural(baseServings, 'porci', 'porce', 'porcí')})
    </small>
  )
}

export function IngredientTable({ recipe, ingredients, portions, historical, perPerson = true, multiplier = 1, perPersonLabel = 'Na osobu' }: Props) {
  const P = persons(portions)
  const k = recipeScale(P, multiplier, recipe.baseServings)
  const total = P * multiplier
  const kOne = onePersonScale(portions, recipe.baseServings)
  const breakdown = peopleBreakdown(portions.people)
  const rows: ReactNode[] = []
  let lastGroup: string | undefined
  recipe.ingredients.forEach((raw, i) => {
    const line = effectiveLine(raw, historical)
    const ing = ingredients.get(line.ingredientId)
    if (!ing) return
    if (line.group && line.group !== lastGroup) {
      rows.push(
        <tr key={`g${i}`} className="ingredient-group">
          <th colSpan={perPerson ? 3 : 2} scope="colgroup">{line.group}</th>
        </tr>,
      )
    }
    lastGroup = line.group
    const full = scaleLine(line, ing, k)
    const one = scaleLine(line, ing, kOne)
    const vessel = (line.scaling ?? ing.scaling) === 'vessel'
    rows.push(
      <tr key={i}>
        <td>
          {ing.name}
          {line.note && <span className="ingredient-note">, {line.note}</span>}
          {line.optional && <span className="ingredient-note"> (volitelné)</span>}
          {vessel && <span className="ingredient-note"> (podle nádoby)</span>}
          {variantNote(raw, historical, ingredients, recipe.baseServings)}
        </td>
        <td className="ingredient-amount">{formatAmount(full.amount, full.unit)}</td>
        {perPerson && <td className="ingredient-per-person">{formatAmount(one.amount, one.unit)}</td>}
      </tr>,
    )
  })
  const day = portions.dayFactor !== 1 ? ` (náročnost dne ${formatDecimal(portions.dayFactor, 2)})` : ''
  return (
    <>
      <table className="ingredient-table">
        <thead>
          <tr>
            <th scope="col">Surovina</th>
            <th scope="col">{`Pro ${peopleLabel(portions.people.adults + portions.people.children)}${multiplier > 1 ? ` ×${multiplier}` : ''}`}</th>
            {perPerson && <th scope="col" className="ingredient-per-person">{perPersonLabel}</th>}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
      <p className="ingredient-scale-note">
        {`${breakdown ? `${breakdown} · ` : ''}přepočteno na ${formatDecimal(total)} ${plural(Math.round(total * 10) / 10, 'porci', 'porce', 'porcí')}${day}`}
      </p>
    </>
  )
}
