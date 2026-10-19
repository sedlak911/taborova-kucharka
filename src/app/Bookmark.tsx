// src/app/Bookmark.tsx
import { useEffect, useId, useRef, useState } from 'react'
import { DAY_FACTOR_MAX, DAY_FACTOR_MIN, DAY_FACTOR_STEP, type People } from '@/domain/portions'
import { PEOPLE_MAX } from '@/state/userState'
import { CartIcon } from '@/pages/icons'
import { formatDecimal, plural } from '@/pages/labels'
import { NumberField } from '@/pages/NumberField'

interface Props {
  people: People
  dayFactor: number
  cartCount: number
  onPeopleChange: (patch: Partial<People>) => void
  onDayFactorChange: (value: number) => void
  onOpenCart: () => void
}

/** Papírová stužka vyčnívající z knihy (vlevo nahoře, vždy viditelná): osoby, náročnost dne, počet receptů, skok do košíku. */
export function Bookmark({ people, dayFactor, cartCount, onPeopleChange, onDayFactorChange, onOpenCart }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const tabRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const peopleCount = people.adults + people.children
  const recipesText = `${cartCount} ${plural(cartCount, 'recept', 'recepty', 'receptů')}`

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: Event) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      tabRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="bookmark" ref={rootRef}>
      <button
        ref={tabRef}
        type="button"
        className="bookmark__tab"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Košík: ${recipesText} · ${peopleCount} os.`}
        title="Počet osob a košík"
        onClick={() => setOpen((o) => !o)}
      >
        <CartIcon filled={cartCount > 0} />
        <span className="bookmark__count">{cartCount}</span>
        <span className="bookmark__people">{`${peopleCount} os.`}</span>
      </button>
      {open && (
        <div className="bookmark__panel" id={panelId} role="group" aria-label="Počet osob a košík">
          <NumberField label="Dospělí" value={people.adults} min={0} max={PEOPLE_MAX} onCommit={(adults) => onPeopleChange({ adults })} />
          <NumberField label="Děti" value={people.children} min={0} max={PEOPLE_MAX} onCommit={(children) => onPeopleChange({ children })} />
          <label className="bookmark__range">
            <span>Náročnost dne</span>
            <input
              type="range"
              min={DAY_FACTOR_MIN}
              max={DAY_FACTOR_MAX}
              step={DAY_FACTOR_STEP}
              value={dayFactor}
              onChange={(e) => onDayFactorChange(Number(e.currentTarget.value))}
            />
            <output>{formatDecimal(dayFactor, 2)}</output>
          </label>
          <button
            type="button"
            className="bookmark__go"
            onClick={() => {
              setOpen(false)
              onOpenCart()
            }}
          >
            Otevřít košík ({recipesText})
          </button>
        </div>
      )}
    </div>
  )
}
