// Vyhledání v data/sources/usda-index.jsonl podle části anglického popisu.
// Spuštění: npm run usda -- "peppers, sweet, green"
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { UsdaFood } from './build-usda-index'

export const MAX_RESULTS = 20

/** Záznamy, jejichž popis obsahuje hledaný řetězec (bez ohledu na velikost písmen), nejvýše `limit`. */
export function searchUsda(records: UsdaFood[], query: string, limit = MAX_RESULTS): UsdaFood[] {
  const q = query.trim().toLowerCase()
  if (q === '') return []
  return records.filter((r) => r.description.toLowerCase().includes(q)).slice(0, limit)
}

/** Jeden kompaktní řádek: fdcId, popis, kcal/P/C/F/vláknina na 100 g, odpad, první 3 porce. */
export function formatUsda(r: UsdaFood): string {
  const portions = r.portions.slice(0, 3).map((p) => `${p.desc} = ${p.grams} g`).join('; ')
  const refuse = r.refusePct > 0 ? `odpad ${r.refusePct} %${r.refuseDesc ? ` (${r.refuseDesc})` : ''}` : 'odpad 0 %'
  return `fdc:${r.fdcId} | ${r.description} | ${r.kcal} kcal, P ${r.protein}, C ${r.carbs}, F ${r.fat}, vl. ${r.fiber} | ${refuse} | ${portions || 'bez porcí'}`
}

export function parseJsonLines(text: string): UsdaFood[] {
  return text.split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l) as UsdaFood)
}

async function main() {
  const query = process.argv.slice(2).join(' ')
  if (query.trim() === '') {
    console.error('Použití: npm run usda -- "<část popisu>"   (např. npm run usda -- "beef, chuck")')
    process.exit(1)
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const records = parseJsonLines(await readFile(path.join(root, 'data', 'sources', 'usda-index.jsonl'), 'utf8'))
  const found = searchUsda(records, query)
  for (const r of found) console.log(formatUsda(r))
  const total = records.filter((r) => r.description.toLowerCase().includes(query.trim().toLowerCase())).length
  console.log(total > found.length ? `(zobrazeno ${found.length} z ${total}, upřesni dotaz)` : `(nalezeno ${total})`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`CHYBA: ${(e as Error).message}`); process.exit(1) })
}
