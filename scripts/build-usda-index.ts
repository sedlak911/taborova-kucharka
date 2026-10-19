// Výtah z USDA SR Legacy (FDC CSV + SR28 ASCII) a seed surovin z open-tandoor-data.
// Spuštění: npm run build:usda  (vstupy v vendor/, výstupy data/sources/usda-index.jsonl a tandoor-seed.json)
import { createReadStream } from 'node:fs'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export interface Portion { desc: string; grams: number }
export interface UsdaFood {
  fdcId: number; ndb: string; description: string; group: string
  kcal: number; protein: number; carbs: number; fat: number; fiber: number
  refusePct: number; refuseDesc: string; portions: Portion[]
}
export interface FoodRow { fdcId: number; description: string; categoryId: string }
export interface NutrientRow { fdcId: number; nutrientId: number; amount: number }

/** Řádek SR28: pole oddělená `^`, textové hodnoty v `~`. */
export function parseSr28Line(line: string): string[] {
  return line.split('^').map((v) => v.replace(/^~|~$/g, ''))
}

/** Řádek CSV: jednoduchý stavový automat pro uvozovky (`""` = uvozovka v hodnotě). */
export function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } else inQuotes = false
      } else cur += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out
}

export interface BuildInput {
  foods: FoodRow[]
  ndbByFdc: Map<number, string>
  nutrients: NutrientRow[]
  refuse: Map<string, { pct: number; desc: string }>
  groups: Map<string, string>
  groupByNdb: Map<string, string>
  portions: Map<string, Portion[]>
  /** Záložní názvy skupin podle food_category_id (pro potraviny novější než SR28). */
  categories?: Map<string, string>
}

const NUTRIENT_KEY: Record<number, 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber'> = {
  1008: 'kcal', 1003: 'protein', 1005: 'carbs', 1004: 'fat', 1079: 'fiber',
}

export function buildIndex(input: BuildInput): UsdaFood[] {
  const byFdc = new Map<number, Partial<Record<'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber', number>>>()
  for (const n of input.nutrients) {
    const key = NUTRIENT_KEY[n.nutrientId]
    if (!key) continue
    const rec = byFdc.get(n.fdcId) ?? {}
    rec[key] = n.amount
    byFdc.set(n.fdcId, rec)
  }
  return input.foods.map((f) => {
    const ndb = input.ndbByFdc.get(f.fdcId) ?? ''
    const nut = byFdc.get(f.fdcId) ?? {}
    const ref = input.refuse.get(ndb)
    return {
      fdcId: f.fdcId,
      ndb,
      description: f.description,
      group: input.groups.get(input.groupByNdb.get(ndb) ?? '') ?? input.categories?.get(f.categoryId) ?? '',
      kcal: nut.kcal ?? 0,
      protein: nut.protein ?? 0,
      carbs: nut.carbs ?? 0,
      fat: nut.fat ?? 0,
      fiber: nut.fiber ?? 0,
      refusePct: ref?.pct ?? 0,
      refuseDesc: ref?.desc ?? '',
      portions: input.portions.get(ndb) ?? [],
    }
  })
}

/** Záznamy jako JSON Lines (jeden JSON objekt na řádek, na konci nový řádek). */
export function toJsonLines(records: unknown[]): string {
  return records.map((r) => JSON.stringify(r)).join('\n') + '\n'
}

// ---------- vstupně-výstupní část (jen pro main) ----------

async function eachLine(file: string, encoding: BufferEncoding, cb: (line: string) => void) {
  const rl = createInterface({ input: createReadStream(file, { encoding }), crlfDelay: Infinity })
  for await (const line of rl) if (line.length > 0) cb(line)
}

const NUTRIENT_IDS = new Set(Object.keys(NUTRIENT_KEY).map(Number))
const padNdb = (s: string) => s.padStart(5, '0')

export async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const sr = path.join(root, 'vendor/usda/sr_legacy')
  const usda = path.join(root, 'vendor/usda')

  // food.csv: jen sr_legacy_food (fdc_id, data_type, description, food_category_id)
  const foods: FoodRow[] = []
  let first = true
  await eachLine(path.join(sr, 'food.csv'), 'utf8', (l) => {
    if (first) { first = false; return }
    const [id, type, description, cat] = parseCsvLine(l)
    if (type === 'sr_legacy_food') foods.push({ fdcId: Number(id), description, categoryId: cat })
  })

  const ndbByFdc = new Map<number, string>()
  first = true
  await eachLine(path.join(sr, 'sr_legacy_food.csv'), 'utf8', (l) => {
    if (first) { first = false; return }
    const [id, ndb] = parseCsvLine(l)
    ndbByFdc.set(Number(id), padNdb(ndb))
  })

  // food_nutrient.csv (~650k řádků): streamujeme a držíme jen potřebné živiny
  const nutrients: NutrientRow[] = []
  first = true
  await eachLine(path.join(sr, 'food_nutrient.csv'), 'utf8', (l) => {
    if (first) { first = false; return }
    const c = parseCsvLine(l)
    const nutrientId = Number(c[2])
    if (NUTRIENT_IDS.has(nutrientId)) nutrients.push({ fdcId: Number(c[1]), nutrientId, amount: Number(c[3]) })
  })

  // SR28: FOOD_DES (odpad, skupina), FD_GROUP, WEIGHT (porce) – latin-1
  const refuse = new Map<string, { pct: number; desc: string }>()
  const groupByNdb = new Map<string, string>()
  await eachLine(path.join(usda, 'FOOD_DES.txt'), 'latin1', (l) => {
    const c = parseSr28Line(l)
    groupByNdb.set(c[0], c[1])
    refuse.set(c[0], { pct: Number(c[8]) || 0, desc: c[7] })
  })
  const groups = new Map<string, string>()
  await eachLine(path.join(usda, 'FD_GROUP.txt'), 'latin1', (l) => {
    const c = parseSr28Line(l)
    groups.set(c[0], c[1])
  })
  const portions = new Map<string, Portion[]>()
  await eachLine(path.join(usda, 'WEIGHT.txt'), 'latin1', (l) => {
    const c = parseSr28Line(l)
    const amount = Number(c[2])
    const desc = amount !== 1 ? `${c[2]} ${c[3]}` : c[3]
    const list = portions.get(c[0]) ?? []
    list.push({ desc, grams: Number(c[4]) })
    portions.set(c[0], list)
  })

  const categories = new Map<string, string>()
  first = true
  await eachLine(path.join(sr, 'food_category.csv'), 'utf8', (l) => {
    if (first) { first = false; return }
    const c = parseCsvLine(l)
    categories.set(c[0], c[2])
  })

  const index = buildIndex({ foods, ndbByFdc, nutrients, refuse, groups, groupByNdb, portions, categories })
  const outDir = path.join(root, 'data/sources')
  await mkdir(outDir, { recursive: true })
  // JSON Lines: jeden záznam na řádek, aby šel prohledávat grepem i číst po částech
  await writeFile(path.join(outDir, 'usda-index.jsonl'), toJsonLines(index), 'utf8')

  // Tandoor seed
  const tandoorDir = path.join(root, 'vendor/open-tandoor-data')
  const readJson = async (f: string) => JSON.parse(await readFile(path.join(tandoorDir, f), 'utf8'))
  const foodJson = (await readJson('food.json')).data as Record<string, any>
  const propJson = (await readJson('property.json')).data as Record<string, { fdc_id: number }>
  const convJson = (await readJson('conversion.json')).data as Record<string, any>
  const macroKey: Record<number, string> = { 1008: 'kcal', 1003: 'protein', 1005: 'carbs', 1004: 'fat' }
  const byFdc = new Map(index.map((f) => [f.fdcId, f]))

  const convByFood = new Map<string, unknown[]>()
  for (const c of Object.values(convJson)) {
    const list = convByFood.get(c.food) ?? []
    list.push({ baseAmount: c.base_amount, baseUnit: c.base_unit, convertedAmount: c.converted_amount, convertedUnit: c.converted_unit })
    convByFood.set(c.food, list)
  }

  const seed = Object.entries(foodJson).map(([tandoorId, f]) => {
    const macros: Record<string, number> = {}
    for (const tv of f.properties?.type_values ?? []) {
      const key = macroKey[propJson[tv.property_type]?.fdc_id]
      if (key) macros[key] = tv.property_value
    }
    const usdaRec = byFdc.get(f.fdc_id)
    return {
      tandoorId,
      name: f.name,
      storeCategory: f.store_category ?? null,
      fdcId: f.fdc_id ?? null,
      macros,
      ...(usdaRec ? { usda: usdaRec } : {}),
      conversions: convByFood.get(tandoorId) ?? [],
    }
  })
  await writeFile(path.join(outDir, 'tandoor-seed.json'), JSON.stringify(seed), 'utf8')

  console.log(`Potravin v indexu: ${index.length}`)
  console.log(`Tandoor položek: ${seed.length}`)
  console.log(`z toho s usda: ${seed.filter((s) => 'usda' in s).length}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
