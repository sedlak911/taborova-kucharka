import { BOOK_META } from '@/content/books'
import type { Recipe } from '@/domain/types'
import { ALLERGEN_LABEL, DIFFICULTY_LABEL, EQUIPMENT_LABEL, plural } from './labels'

/** Původní název (z receptu, jinak ze zdroje). */
export function originalTitle(recipe: Recipe): string | undefined {
  return recipe.titleOriginal ?? recipe.source.titleOriginal
}

/** Kniha s rokem vydání; vlastní recepty bez roku. */
export function bookLabel(recipe: Recipe): string {
  const meta = BOOK_META[recipe.source.book]
  return recipe.source.book === 'vlastni' ? meta.title : `${meta.title}, ${meta.year}`
}

/** Patička se zdrojem (stránka receptu i tisk); vlastní recept: počet porcí, na který je napsaný (ruling R13). */
export function sourceLine(recipe: Recipe): string {
  if (recipe.source.book === 'vlastni') {
    const n = recipe.baseServings
    return `Vlastní recept · zapsaný pro ${n} ${plural(n, 'porci', 'porce', 'porcí')}`
  }
  const meta = BOOK_META[recipe.source.book]
  return (
    [`Zdroj: ${meta.title}, ${meta.year}${recipe.source.page ? `, s. ${recipe.source.page} (PDF)` : ''}`, originalTitle(recipe)]
      .filter(Boolean)
      .join(' · ') + (recipe.verified ? '' : ' · čísla odhadnuta')
  )
}

/** Údaje receptu na jeden řádek (tisk): čas, obtížnost, vybavení, alergeny. */
export function metaLine(recipe: Recipe): string {
  return [
    `${recipe.timeMinutes} min`,
    `obtížnost ${DIFFICULTY_LABEL[recipe.difficulty]}`,
    recipe.equipment.length ? recipe.equipment.map((e) => EQUIPMENT_LABEL[e]).join(', ') : null,
    recipe.allergens.length ? `alergeny: ${recipe.allergens.map((a) => ALLERGEN_LABEL[a]).join(', ')}` : 'bez alergenů',
  ]
    .filter(Boolean)
    .join(' · ')
}
