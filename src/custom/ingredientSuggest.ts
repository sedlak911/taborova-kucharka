import { normalize } from '@/content/search'
import type { Ingredient } from '@/domain/types'

export const SUGGEST_LIMIT = 8

/**
 * Pořadí shody (menší = lepší, -1 = žádná): přesný název nebo alias, začátek názvu, začátek aliasu,
 * začátek slova v názvu, kdekoli v názvu, kdekoli v aliasu.
 */
function matchRank(ing: Ingredient, q: string): number {
  const name = normalize(ing.name)
  const aliases = ing.aliases.map(normalize)
  if (name === q || aliases.includes(q)) return 0
  if (name.startsWith(q)) return 1
  if (aliases.some((a) => a.startsWith(q))) return 2
  if (name.split(/[\s-]+/).some((w) => w.startsWith(q))) return 3
  if (name.includes(q)) return 4
  if (aliases.some((a) => a.includes(q))) return 5
  return -1
}

/** Návrhy surovin pro našeptávač podle názvu a aliasů, bez ohledu na diakritiku a velikost písmen. */
export function suggestIngredients(query: string, ingredients: Iterable<Ingredient>, limit = SUGGEST_LIMIT): Ingredient[] {
  const q = normalize(query.trim())
  if (q === '') return []
  const hits: { ing: Ingredient; rank: number }[] = []
  for (const ing of ingredients) {
    const rank = matchRank(ing, q)
    if (rank >= 0) hits.push({ ing, rank })
  }
  hits.sort((a, b) => a.rank - b.rank || a.ing.name.localeCompare(b.ing.name, 'cs'))
  return hits.slice(0, limit).map((h) => h.ing)
}

/** Surovina, jejíž název (přednostně) nebo alias přesně odpovídá textu – výběr bez kliknutí do nabídky. */
export function exactIngredient(query: string, ingredients: Iterable<Ingredient>): Ingredient | undefined {
  const q = normalize(query.trim())
  if (q === '') return undefined
  const list = [...ingredients]
  return list.find((i) => normalize(i.name) === q) ?? list.find((i) => i.aliases.some((a) => normalize(a) === q))
}
