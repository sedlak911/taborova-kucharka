import { customRecipeProblem } from '@/content/customRecipes'
import { RecipeSchema } from '@/domain/schema'
import type { Ingredient, Recipe } from '@/domain/types'

/** `vlastni-recepty-YYYY-MM-DD.json` podle místního data. */
export function customRecipesFileName(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `vlastni-recepty-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}.json`
}

/** Pole `Recipe[]`; každý prvek má tvar souboru `data/recipes/<id>.json` (2 mezery, nový řádek na konci). */
export function serializeCustomRecipes(recipes: readonly Recipe[]): string {
  return `${JSON.stringify(recipes, null, 2)}\n`
}

export interface ImportSkip {
  label: string
  reason: string
}
export interface ParsedImport {
  recipes: Recipe[]
  skipped: ImportSkip[]
}

function itemLabel(item: unknown, index: number): string {
  return typeof item === 'object' && item !== null && 'title' in item && typeof item.title === 'string' ? item.title : `položka ${index + 1}`
}

/** Import (ruling R11): pole nebo jeden recept; zod + pravidla zařazení; každá přeskočená položka s důvodem. */
export function parseCustomRecipesFile(
  text: string,
  ctx: { ingredients: ReadonlyMap<string, Ingredient>; staticIds: ReadonlySet<string> },
): ParsedImport {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Soubor není platný JSON.')
  }
  const items: unknown[] = Array.isArray(data) ? data : [data]
  const recipes: Recipe[] = []
  const skipped: ImportSkip[] = []
  items.forEach((item, i) => {
    const label = itemLabel(item, i)
    const parsed = RecipeSchema.safeParse(item)
    if (!parsed.success) {
      skipped.push({ label, reason: 'neodpovídá schématu receptu' })
      return
    }
    const problem = customRecipeProblem(parsed.data, ctx.ingredients, ctx.staticIds)
    if (problem) {
      skipped.push({ label, reason: problem })
      return
    }
    if (recipes.some((r) => r.id === parsed.data.id)) {
      skipped.push({ label, reason: 'v souboru dvakrát' })
      return
    }
    recipes.push(parsed.data)
  })
  return { recipes, skipped }
}
