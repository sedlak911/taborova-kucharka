import { CartIcon, HeartIcon } from './icons'

interface Props {
  favorite: boolean
  onToggleFavorite: () => void
  /** Název receptu do přístupného jména (v obsahu je takových tlačítek mnoho). */
  label?: string
  compact?: boolean
  /** Košík: tlačítko se vykreslí jen s `onToggleCart` (stránka receptu, řádek obsahu). */
  inCart?: boolean
  onToggleCart?: () => void
}

/** Srdíčko (oblíbené) a košík – na stránce receptu i u řádku obsahu. */
export function RecipeMarks({ favorite, onToggleFavorite, label, compact = false, inCart = false, onToggleCart }: Props) {
  const suffix = label ? `: ${label}` : ''
  return (
    <span className={`recipe-marks${compact ? ' recipe-marks--compact' : ''}`}>
      <button
        type="button"
        className="mark mark--favorite"
        aria-pressed={favorite}
        aria-label={`Oblíbené${suffix}`}
        title={favorite ? 'V oblíbených' : 'Přidat do oblíbených'}
        onClick={onToggleFavorite}
      >
        <HeartIcon filled={favorite} />
      </button>
      {onToggleCart && (
        <button
          type="button"
          className="mark mark--cart"
          aria-pressed={inCart}
          aria-label={`Do košíku${suffix}`}
          title={inCart ? 'V košíku – kliknutím odebrat' : 'Přidat do košíku'}
          onClick={onToggleCart}
        >
          <CartIcon filled={inCart} />
        </button>
      )}
    </span>
  )
}
