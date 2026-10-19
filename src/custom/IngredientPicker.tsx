import { useMemo, useState } from 'react'
import type { Ingredient } from '@/domain/types'
import { exactIngredient, suggestIngredients } from './ingredientSuggest'

interface Props {
  id: string
  label: string
  ingredients: readonly Ingredient[]
  query: string
  /** Vybraná surovina; null = text bez výběru z nabídky. */
  selectedId: string | null
  invalid?: boolean
  describedBy?: string
  /** Nový text a vybraná surovina (null = text bez výběru). */
  onChange: (query: string, ingredientId: string | null) => void
}

/** Pole suroviny s našeptávačem (ARIA combobox + listbox): jen suroviny z kanonického seznamu. */
export function IngredientPicker({ id, label, ingredients, query, selectedId, invalid = false, describedBy, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const suggestions = useMemo(() => (open ? suggestIngredients(query, ingredients) : []), [open, query, ingredients])
  const shown = suggestions.length > 0
  const listId = `${id}-navrhy`
  const activeIndex = Math.min(active, suggestions.length - 1)

  const choose = (ing: Ingredient) => {
    onChange(ing.name, ing.id)
    setOpen(false)
  }

  return (
    <div className="ingredient-picker">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={shown}
        aria-controls={shown ? listId : undefined}
        aria-activedescendant={shown ? `${listId}-${activeIndex}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        placeholder="surovina"
        value={query}
        onChange={(e) => {
          onChange(e.currentTarget.value, null)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false)
          if (selectedId !== null) return
          const exact = exactIngredient(query, ingredients)
          if (exact) onChange(exact.name, exact.id)
        }}
        onKeyDown={(e) => {
          if (!shown) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault() // po Escape se návrhy znovu otevřou šipkou
              setOpen(true)
            }
            return
          }
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            const step = e.key === 'ArrowDown' ? 1 : -1
            setActive((a) => (Math.min(a, suggestions.length - 1) + step + suggestions.length) % suggestions.length)
          } else if (e.key === 'Enter') {
            e.preventDefault() // výběr suroviny, ne odeslání formuláře
            choose(suggestions[activeIndex])
          } else if (e.key === 'Escape') {
            e.stopPropagation() // zavře jen návrhy; formulář se zavírá až dalším Escape
            setOpen(false)
          }
        }}
      />
      {shown && (
        <ul id={listId} role="listbox" aria-label={`Návrhy: ${label}`} className="ingredient-picker__list">
          {suggestions.map((ing, i) => (
            <li
              key={ing.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className="ingredient-picker__option"
              onMouseDown={(e) => e.preventDefault()} // fokus zůstane v poli (žádný blur před klikem)
              onClick={() => choose(ing)}
            >
              {ing.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
