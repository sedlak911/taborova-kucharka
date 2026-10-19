// src/pages/CartPage.tsx
import { useId } from 'react'
import type { Route } from '@/app/route'
import { cartMacrosPerAdult, coveragePercent, dailyKcalTarget, recipeMacrosPerServing } from '@/domain/nutrition'
import { DEFAULT_KCAL_TARGET, persons, type CartLine, type People, type Portions } from '@/domain/portions'
import type { Ingredient, Recipe } from '@/domain/types'
import { MULTIPLIER_MAX, PEOPLE_MAX } from '@/state/userState'
import { BOOKLET_HINT, PRINT_HINT, formatDecimal, formatInteger, formatMacros, peopleHeading, plural } from './labels'
import { NumberField } from './NumberField'

interface CartPageProps {
  cart: CartLine[]
  recipes: ReadonlyMap<string, Recipe>
  ingredients: Map<string, Ingredient>
  portions: Portions
  kcalTarget: number | undefined
  historical: boolean
  onPeopleChange: (patch: Partial<People>) => void
  onMultiplierChange: (recipeId: string, multiplier: number) => void
  onRemove: (recipeId: string) => void
  onNavigate: (route: Route) => void
  onPrintBooklet: () => void
  onPrintList: () => void
}

/** Stránka košíku na konci knihy (vlevo, vedle nákupního seznamu). */
export function CartPage({ cart, recipes, ingredients, portions, kcalTarget, historical, onPeopleChange, onMultiplierChange, onRemove, onNavigate, onPrintBooklet, onPrintList }: CartPageProps) {
  const bookletNoteId = useId()
  const printNoteId = useId()
  const items = cart.flatMap((entry) => {
    const recipe = recipes.get(entry.recipeId)
    return recipe ? [{ entry, recipe }] : []
  })
  const P = persons(portions)
  const day = formatDecimal(portions.dayFactor, 2)
  const perAdult = cartMacrosPerAdult(cart, recipes, ingredients, { historical, dayFactor: portions.dayFactor })
  const target = dailyKcalTarget(kcalTarget, portions.dayFactor)
  const pct = coveragePercent(perAdult.kcal, target)

  return (
    <article className="cart-page">
      <h2>Košík</h2>
      <p className="cart-people">
        {`${peopleHeading(portions.people)} · náročnost dne ${day} · ×1 = ${formatDecimal(P)} ${plural(Math.round(P * 10) / 10, 'porce', 'porce', 'porcí')}`}
      </p>
      <div className="cart-people-fields">
        <NumberField label="Dospělí" value={portions.people.adults} min={0} max={PEOPLE_MAX} onCommit={(adults) => onPeopleChange({ adults })} />
        <NumberField label="Děti" value={portions.people.children} min={0} max={PEOPLE_MAX} onCommit={(children) => onPeopleChange({ children })} />
      </div>

      {items.length === 0 ? (
        <div className="cart-empty">
          <p>Košík je prázdný. Recept přidáš ikonou košíku v obsahu nebo na stránce receptu.</p>
          <button type="button" className="cart-button" onClick={() => onNavigate({ kind: 'toc' })}>Do obsahu</button>
        </div>
      ) : (
        <>
          <ul className="cart-list">
            {items.map(({ entry, recipe }) => (
              <li key={recipe.id} className="cart-item">
                <button type="button" className="cart-item__title" onClick={() => onNavigate({ kind: 'recipe', id: recipe.id })}>
                  {recipe.title}
                </button>
                <span className="cart-item__kcal">{`${formatInteger(recipeMacrosPerServing(recipe, ingredients, historical).kcal)} kcal/porce`}</span>
                <span className="cart-item__multiplier">
                  <button type="button" aria-label={`Méně: ${recipe.title}`} disabled={entry.multiplier <= 1} onClick={() => onMultiplierChange(recipe.id, entry.multiplier - 1)}>−</button>
                  <output>{`×${entry.multiplier}`}</output>
                  <button type="button" aria-label={`Více: ${recipe.title}`} disabled={entry.multiplier >= MULTIPLIER_MAX} onClick={() => onMultiplierChange(recipe.id, entry.multiplier + 1)}>+</button>
                </span>
                <button type="button" className="cart-item__remove" aria-label={`Odebrat: ${recipe.title}`} title="Odebrat z košíku" onClick={() => onRemove(recipe.id)}>✕</button>
              </li>
            ))}
          </ul>

          <section className="cart-nutrition" aria-label="Výživa na dospělého">
            <h3>Výživa na dospělého <small>(orientačně)</small></h3>
            <p className="cart-nutrition__macros">{formatMacros(perAdult)}</p>
            <p className="cart-nutrition__coverage">
              {`Pokrývá cca ${pct} % denního příjmu (cíl ${formatInteger(target)} kcal = ${formatInteger(kcalTarget ?? DEFAULT_KCAL_TARGET)} × ${day}).`}
            </p>
            <div className="cart-coverage" aria-hidden="true"><span style={{ width: `${Math.min(pct, 100)}%` }} /></div>
            <p className="cart-nutrition__note">Odhad z tabulek USDA, ne výživové poradenství.</p>
          </section>

          <div className="cart-actions">
            <button type="button" className="cart-button" aria-describedby={`${bookletNoteId} ${printNoteId}`} onClick={onPrintBooklet}>
              Tisknout brožurku
            </button>
            <button type="button" className="cart-button" aria-describedby={printNoteId} onClick={onPrintList}>Tisknout jen nákupní seznam</button>
            <p id={bookletNoteId} className="cart-actions__note">{BOOKLET_HINT}</p>
            <p id={printNoteId} className="cart-actions__note">{PRINT_HINT}</p>
          </div>
        </>
      )}
    </article>
  )
}
