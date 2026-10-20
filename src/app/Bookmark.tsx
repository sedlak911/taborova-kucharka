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
  /** Skok na stránku nastavení na konci knihy. */
  onOpenSettings?: () => void
}

/** Papírová stužka vyčnívající z knihy (vlevo nahoře, vždy viditelná): osoby, náročnost dne, počet receptů, skok do košíku. */
export function Bookmark({ people, dayFactor, cartCount, onPeopleChange, onDayFactorChange, onOpenCart, onOpenSettings }: Props) {
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
        <span className="bookmark__sep" aria-hidden="true" />
        <svg className="bookmark__people-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19.5c0-3.2 2.5-5.5 5.5-5.5s5.5 2.3 5.5 5.5" />
          <circle cx="17" cy="9" r="2.4" />
          <path d="M16.2 14.2c2.6 0 4.6 2 4.6 4.8" />
        </svg>
        <span className="bookmark__people">{peopleCount}</span>
      </button>
      {open && (
        <div className="bookmark__panel" id={panelId} role="group" aria-label="Počet osob a košík">
          <p className="bookmark__title">Kolik nás vaří</p>
          <NumberField stepper label="Dospělí" value={people.adults} min={0} max={PEOPLE_MAX} onCommit={(adults) => onPeopleChange({ adults })} />
          <NumberField stepper label="Děti" value={people.children} min={0} max={PEOPLE_MAX} onCommit={(children) => onPeopleChange({ children })} />
          <label className="bookmark__range">
            <span>Náročnost dne</span>
            <output>×{formatDecimal(dayFactor, 2)}</output>
            <input
              aria-label="Náročnost dne"
              type="range"
              min={DAY_FACTOR_MIN}
              max={DAY_FACTOR_MAX}
              step={DAY_FACTOR_STEP}
              value={dayFactor}
              onChange={(e) => onDayFactorChange(Number(e.currentTarget.value))}
            />
            <span className="bookmark__scale" aria-hidden="true">
              <span>odpočinek</span>
              <span>celodenní túra</span>
            </span>
          </label>
          <button
            type="button"
            className="bookmark__go"
            onClick={() => {
              setOpen(false)
              onOpenCart()
            }}
          >
            <CartIcon filled={cartCount > 0} />
            Otevřít košík ({recipesText})
          </button>
          {onOpenSettings && (
            <button
              type="button"
              className="bookmark__settings"
              onClick={() => {
                setOpen(false)
                onOpenSettings()
              }}
            >
              Nastavení knihy →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
