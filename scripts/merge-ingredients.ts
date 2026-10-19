// Sloučení kurátorských dávek data/ingredients/*.json do data/ingredients.json.
// Spuštění: npm run build:ingredients
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { IngredientSchema } from '../src/domain/schema'
import type { Ingredient } from '../src/domain/types'

export type MergeResult = { ok: true; items: Ingredient[] } | { ok: false; errors: string[] }

/** Zvaliduje položky, ohlídá duplicitní id, názvy a aliasy (bez ohledu na velikost písmen) a seřadí podle id. */
export function mergeIngredients(lists: unknown[][]): MergeResult {
  const errors: string[] = []
  const items: Ingredient[] = []
  const ids = new Set<string>()
  const names = new Map<string, string>()
  for (const list of lists) {
    for (const raw of list) {
      const rawId = (raw as { id?: unknown } | null)?.id
      const label = typeof rawId === 'string' ? rawId : '(bez id)'
      const parsed = IngredientSchema.safeParse(raw)
      if (!parsed.success) {
        for (const issue of parsed.error.issues) errors.push(`${label}: ${issue.path.join('.') || '(kořen)'}: ${issue.message}`)
        continue
      }
      const item = parsed.data
      if (ids.has(item.id)) { errors.push(`${item.id}: duplicitní id`); continue }
      ids.add(item.id)
      const key = item.name.toLowerCase()
      const other = names.get(key)
      if (other !== undefined) errors.push(`${item.id}: duplicitní název „${item.name}“ (již má ${other})`)
      else names.set(key, item.id)
      items.push(item)
    }
  }
  // alias nesmí odpovídat názvu ani aliasu jiné suroviny (jinak by mapování nebylo jednoznačné)
  const owners = new Map<string, string>()
  for (const item of items) owners.set(item.name.toLowerCase(), item.id)
  for (const item of items) {
    for (const alias of item.aliases) {
      const key = alias.toLowerCase()
      const owner = owners.get(key)
      if (owner !== undefined && owner !== item.id) errors.push(`${item.id}: alias „${alias}“ už patří surovině ${owner}`)
      else owners.set(key, item.id)
    }
  }
  if (errors.length > 0) return { ok: false, errors }
  items.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return { ok: true, items }
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const dir = path.join(root, 'data', 'ingredients')
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort()
  const lists: unknown[][] = []
  const errors: string[] = []
  for (const f of files) {
    try {
      const data: unknown = JSON.parse(await readFile(path.join(dir, f), 'utf8'))
      if (Array.isArray(data)) lists.push(data)
      else errors.push(`${f}: očekáváno pole`)
    } catch (e) {
      errors.push(`${f}: ${(e as Error).message}`)
    }
  }
  const result = errors.length > 0 ? { ok: false as const, errors } : mergeIngredients(lists)
  if (!result.ok) {
    console.error(`Chyby při slučování (${files.join(', ')}):`)
    for (const e of result.errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  await writeFile(path.join(root, 'data', 'ingredients.json'), JSON.stringify(result.items, null, 2) + '\n')
  console.log(`Zapsáno ${result.items.length} surovin z ${files.length} souborů.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
