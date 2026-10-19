// src/print/RecipePrint.tsx
import type { People, Portions } from '@/domain/portions'
import type { Ingredient, Recipe } from '@/domain/types'
import { stepTimeline } from '@/domain/steps'
import { IngredientTable } from '@/pages/IngredientTable'
import { peopleHeading } from '@/pages/labels'
import { StepTime, StepsTotal } from '@/pages/StepTime'
import { bookLabel, metaLine, originalTitle, sourceLine } from '@/pages/recipeText'

/** Hlavička tištěného receptu: název, původní název + kniha, pro kolik osob, údaje. */
export function RecipePrintHead({ recipe, people, multiplier = 1 }: { recipe: Recipe; people: People; multiplier?: number }) {
  return (
    <header className="print-recipe__head">
      <h2>{recipe.title}</h2>
      <p className="print-recipe__origin">{[originalTitle(recipe), bookLabel(recipe)].filter(Boolean).join(' · ')}</p>
      <p className="print-recipe__people">{peopleHeading(people) + (multiplier > 1 ? ` · ×${multiplier}` : '')}</p>
      <p className="print-recipe__meta">{metaLine(recipe)}</p>
    </header>
  )
}

/**
 * Jeden krok postupu ve vlastním <ol start> (v brožurce jde postup rozdělit mezi strany); první krok nese nadpis.
 * Značka stopek jako v knize; poslední krok nese „Hotovo“, aby v brožurce zůstalo ve stejném bloku (ruling R6).
 */
export function RecipePrintStep({ recipe, index }: { recipe: Recipe; index: number }) {
  const timeline = stepTimeline(recipe.steps)
  const timed = timeline.total > 0
  return (
    <>
      {index === 0 && <h3 className="print-recipe__steps-title">Postup</h3>}
      <ol className="print-recipe__steps" start={index + 1}>
        <li>
          {timed && <StepTime start={timeline.steps[index].startMinutes} />}
          {recipe.steps[index].text}
        </li>
      </ol>
      {timed && index === recipe.steps.length - 1 && <StepsTotal total={timeline.total} className="print-recipe__total" />}
    </>
  )
}

export function RecipePrintNote({ recipe }: { recipe: Recipe }) {
  if (!recipe.modernNote) return null
  return (
    <aside className="modern-note">
      <strong>Poznámka k modernizaci</strong>
      <p>{recipe.modernNote}</p>
    </aside>
  )
}

export function RecipePrintSource({ recipe }: { recipe: Recipe }) {
  return <footer className="print-recipe__source">{sourceLine(recipe)}</footer>
}

interface Props {
  recipe: Recipe
  ingredients: Map<string, Ingredient>
  portions: Portions
  historical: boolean
}

/** Čistý A4 recept (Ctrl+P na receptu, tlačítko „Tisknout recept“): bez papíru, stínů, ovládání a záložky. */
export function PrintRecipe({ recipe, ingredients, portions, historical }: Props) {
  return (
    <article className="print-recipe">
      <RecipePrintHead recipe={recipe} people={portions.people} />
      <IngredientTable recipe={recipe} ingredients={ingredients} portions={portions} historical={historical} perPersonLabel="Na 1 osobu" />
      {recipe.steps.map((_, i) => (
        <RecipePrintStep key={i} recipe={recipe} index={i} />
      ))}
      <RecipePrintNote recipe={recipe} />
      <RecipePrintSource recipe={recipe} />
    </article>
  )
}
