import { useId, type ReactNode } from 'react'
import { CartIcon, PrinterIcon } from '@/pages/icons'
import { PRINT_HINT, plural } from '@/pages/labels'
import { useFullscreen } from './useFullscreen'

interface Props {
  /** Domů = obsah (spec §2 [R2]). */
  onHome: () => void
  /** Tisk podle aktuální stránky – stejná úloha jako Ctrl+P (recept → recept, košík a seznam → seznam, jinde obsah). */
  onPrint: () => void
  /** Přístupné jméno tisku: co se vytiskne (`PRINT_JOB_LABEL`). */
  printLabel: string
  /** Skok na stránku košíku. */
  onOpenCart: () => void
  /** Počet receptů v košíku (odznak na tlačítku). */
  cartCount: number
  /** Další ovládací prvky (lupa hledání), vykreslí se za tlačítky. */
  children?: ReactNode
}

/** Pevné ovládání v rohu knihy, mimo stránky (viditelné z každé strany): domů, tisk, košík, celá obrazovka, hledání. */
export function BookControls({ onHome, onPrint, printLabel, onOpenCart, cartCount, children }: Props) {
  const fullscreen = useFullscreen()
  const hintId = useId()
  const recipesText = `${cartCount} ${plural(cartCount, 'recept', 'recepty', 'receptů')}`
  return (
    <nav className="book-controls" aria-label="Ovládání knihy">
      <button type="button" className="book-control" aria-label="Domů" title="Domů – na obsah" onClick={onHome}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10v10h5v-6h3v6h5V10" />
        </svg>
      </button>
      <button type="button" className="book-control" aria-label={printLabel} aria-describedby={hintId} title={`${printLabel} – ${PRINT_HINT}`} onClick={onPrint}>
        <PrinterIcon />
      </button>
      <span id={hintId} className="visually-hidden">{PRINT_HINT}</span>
      <button type="button" className="book-control" aria-label={`Jít na košík (${recipesText})`} title="Košík" onClick={onOpenCart}>
        <CartIcon filled={cartCount > 0} />
        {cartCount > 0 && (
          <span className="book-control__badge" aria-hidden="true">
            {cartCount}
          </span>
        )}
      </button>
      {fullscreen.supported && (
        <button
          type="button"
          className="book-control"
          aria-label="Celá obrazovka"
          aria-pressed={fullscreen.active}
          title={fullscreen.active ? 'Ukončit celou obrazovku' : 'Celá obrazovka'}
          onClick={fullscreen.toggle}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
          </svg>
        </button>
      )}
      {children}
    </nav>
  )
}
