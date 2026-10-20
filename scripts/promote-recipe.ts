// Vlastní recepty z exportu aplikace (JSON) → kniha „Ověřené recepty“ v data/recipes.
// Spuštění: npm run promote -- <vlastni-recepty.json> [--origin "sweden.se (Swedish Institute)"]
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promoteToVerified } from '../src/content/customRecipes'
import { parseCustomRecipesFile } from '../src/custom/recipesFile'
import type { Ingredient } from '../src/domain/types'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const recipesDir = path.join(root, 'data/recipes')

async function main(args: string[]) {
  const originAt = args.indexOf('--origin')
  const origin = originAt >= 0 ? args[originAt + 1] : undefined
  const file = args.find((a, i) => !a.startsWith('--') && (originAt < 0 || i !== originAt + 1))
  if (!file) throw new Error('Použití: npm run promote -- <vlastni-recepty.json> [--origin "<odkud recept je>"]')

  const ingredients: Ingredient[] = JSON.parse(await readFile(path.join(root, 'data/ingredients.json'), 'utf8'))
  const recipeIds = (await readdir(recipesDir)).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5))
  // id receptu nesmí kolidovat s receptem ani se surovinou
  const taken = new Set([...recipeIds, ...ingredients.map((i) => i.id)])
  const parsed = parseCustomRecipesFile(await readFile(file, 'utf8'), {
    ingredients: new Map(ingredients.map((i) => [i.id, i])),
    staticIds: new Set(recipeIds),
  })
  for (const s of parsed.skipped) console.warn(`přeskočeno: ${s.label} – ${s.reason}`)
  for (const recipe of parsed.recipes) {
    const promoted = promoteToVerified(recipe, taken, origin)
    taken.add(promoted.id)
    const out = path.join(recipesDir, `${promoted.id}.json`)
    await writeFile(out, `${JSON.stringify(promoted, null, 2)}\n`)
    console.log(`${recipe.title} → ${path.relative(root, out)}`)
  }
  if (parsed.recipes.length > 0) console.log('Hotovo; zkontroluj `npm run validate`.')
}

main(process.argv.slice(2)).catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
