import { useId } from 'react'
import type { People } from '@/domain/portions'
import type { ShoppingGroup, ShoppingItem } from '@/domain/shopping'
import { CATEGORY_LABEL, formatAmount, formatDate, formatDecimal, PRINT_HINT, peopleHeading } from './labels'

interface HeadProps {
  people: People
  historical: boolean
  /** Náročnost dne; v hlavičce se uvede jen když není 1. */
  dayFactor?: number
  /** Datum tisku (tištěný seznam a brožurka); stránka knihy ho nemá. */
  date?: Date
}

/** Nadpis a hlavička seznamu – stránka knihy, tisk A4 i brožurka. */
export function ShoppingListHead({ people, historical, dayFactor = 1, date }: HeadProps) {
  const parts = [
    peopleHeading(people),
    dayFactor !== 1 ? `náročnost dne ${formatDecimal(dayFactor, 2)}` : null,
    historical ? 'historické suroviny' : null,
    date ? formatDate(date) : null,
  ].filter(Boolean)
  return (
    <>
      <h2>Nákupní seznam</h2>
      <p className="shopping-people">{parts.join(' · ')}</p>
    </>
  )
}

/** Položka seznamu: název, množství a rozpad „z kterých receptů kolik“. */
export function ShoppingItemRow({ item }: { item: ShoppingItem }) {
  return (
    <li className="shopping-item">
      <span className="shopping-item__name">{item.name}</span>
      <span className="shopping-item__dots" aria-hidden="true" />
      <span className="shopping-item__amount">{formatAmount(item.amount, item.unit)}</span>
      <small className="shopping-item__sources">
        {item.sources.map((s) => `${s.title} ${formatAmount(s.amount, s.unit)}${s.vessel ? ' (podle nádoby)' : ''}`).join(' · ')}
      </small>
    </li>
  )
}

interface Props extends HeadProps {
  groups: ShoppingGroup[]
  /** Tisk A4 seznamu; tlačítko je jen na obrazovce (tiskový strom ho nedostane). */
  onPrint?: () => void
}

/** Nákupní seznam z košíku: podle kategorií obchodu, u položky rozpad po receptech. Bez interakce kromě tlačítka tisku. */
export function ShoppingListPage({ groups, onPrint, ...head }: Props) {
  const hintId = useId()
  return (
    <article className="shopping-page">
      <ShoppingListHead {...head} />
      {onPrint && groups.length > 0 && (
        <div className="print-action">
          <button type="button" className="cart-button" aria-describedby={hintId} onClick={onPrint}>Tisknout nákupní seznam</button>
          <small id={hintId} className="print-action__hint">{PRINT_HINT}</small>
        </div>
      )}
      {groups.length === 0 ? (
        <p className="shopping-empty">Seznam je prázdný – sestaví se z receptů v košíku.</p>
      ) : (
        groups.map((group) => (
          <section key={group.category} className="shopping-group">
            <h3>{CATEGORY_LABEL[group.category]}</h3>
            <ul>
              {group.items.map((item) => (
                <ShoppingItemRow key={item.ingredientId} item={item} />
              ))}
            </ul>
          </section>
        ))
      )}
    </article>
  )
}
