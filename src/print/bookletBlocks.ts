// src/print/bookletBlocks.ts
import type { CartLine } from '@/domain/portions'
import type { ShoppingGroup } from '@/domain/shopping'
import type { Recipe } from '@/domain/types'
import type { PackableBlock } from './booklet'

/** Blok obsahu brožurky – nejmenší kus, který se při stránkování nedělí. */
export type BookletBlock = PackableBlock &
  (
    | { kind: 'title'; recipeCount: number }
    | { kind: 'recipe-main'; recipe: Recipe; multiplier: number }
    | { kind: 'recipe-step'; recipe: Recipe; step: number }
    | { kind: 'recipe-note'; recipe: Recipe }
    | { kind: 'recipe-source'; recipe: Recipe }
    | { kind: 'list-head' }
    | { kind: 'list-item'; group: ShoppingGroup; item: number }
  )

/**
 * Obsah brožurky (spec §4 [R1]): titulní strana, každý recept od nové strany (hlavička s tabulkou surovin,
 * kroky, poznámka k modernizaci, zdroj), na konci nákupní seznam (hlavička, pak jednotlivé položky;
 * první položka kategorie nese její nadpis). Bez obsahu. Recept, který už v knize není, se přeskočí.
 */
export function bookletBlocks(cart: readonly CartLine[], recipes: ReadonlyMap<string, Recipe>, groups: readonly ShoppingGroup[]): BookletBlock[] {
  const items = cart.flatMap((entry) => {
    const recipe = recipes.get(entry.recipeId)
    return recipe ? [{ recipe, multiplier: entry.multiplier }] : []
  })
  const blocks: BookletBlock[] = [{ kind: 'title', recipeCount: items.length, startsPage: true }]
  for (const { recipe, multiplier } of items) {
    blocks.push({ kind: 'recipe-main', recipe, multiplier, startsPage: true })
    recipe.steps.forEach((_, step) => blocks.push({ kind: 'recipe-step', recipe, step, startsPage: false }))
    if (recipe.modernNote) blocks.push({ kind: 'recipe-note', recipe, startsPage: false })
    blocks.push({ kind: 'recipe-source', recipe, startsPage: false })
  }
  blocks.push({ kind: 'list-head', startsPage: true })
  for (const group of groups) {
    group.items.forEach((_, item) => blocks.push({ kind: 'list-item', group, item, startsPage: false }))
  }
  return blocks
}
