// Kontrola hotového receptu pro digitalizaci: gramy na porci, kcal, maso, sůl, tekutina, bilance proti porci zdroje.
// Spuštění: npm run check:recipe -- <id> [--portion "1-1/4 cup" | --portion "8 oz"] [--kcal 330]
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { edibleGrams, recipeMacrosPerServing } from '../src/domain/nutrition'
import { IngredientSchema, RecipeSchema } from '../src/domain/schema'
import { formatStopwatch, stepStartLabel, stepTimeline } from '../src/domain/steps'
import type { Ingredient, Recipe, ScalingClass } from '../src/domain/types'
import { parseQuantity } from './recipe-convert'

const MEAT_CATEGORIES = new Set(['maso', 'ryby', 'uzeniny'])

/** Orientační rozsahy na porci (SKILL.md §kontrola): signál chyby převodu, ne cíl. */
export const RANGES = {
  kcal: [50, 1500],
  saltG: [0.5, 2.5],
  meatG: [80, 250],
  soupMl: [250, 450],
  /** poměr hmotnost porce z receptu / porce zdroje */
  portionRatio: [0.6, 1.6],
} as const

export interface CheckRow {
  ingredientId: string
  amount: number
  unit: string
  grams: number | null
  scaling: ScalingClass
  kcal: number
  original?: string
}

export interface CheckResult {
  rows: CheckRow[]
  perPortion: { massG: number; kcal: number; kcalHistorical: number; protein: number; meatG: number; saltG: number; liquidMl: number }
  flags: string[]
}

export interface CheckOptions {
  /** Porce zdroje („1-1/4 cup“, „8 oz“) – objem ≈ hmotnost. */
  sourcePortion?: string
  /** kcal na porci z karty zdroje. */
  sourceKcal?: number
}

export function checkRecipe(recipe: Recipe, byId: ReadonlyMap<string, Ingredient>, opts: CheckOptions = {}): CheckResult {
  const rows: CheckRow[] = []
  const flags: string[] = []
  let massG = 0
  let meatG = 0
  let saltG = 0
  let liquidMl = 0
  let waterLines = 0

  for (const line of recipe.ingredients) {
    const ing = byId.get(line.ingredientId)
    if (!ing) {
      flags.push(`surovina ${line.ingredientId} není v katalogu`)
      continue
    }
    const scaling = line.scaling ?? ing.scaling
    const grams = edibleGrams(line, ing)
    const kcal = grams === null || scaling === 'vessel' ? 0 : (ing.nutritionPer100g.kcal * grams) / 100
    rows.push({
      ingredientId: line.ingredientId, amount: line.amount, unit: line.unit, grams, scaling, kcal,
      original: line.original ? `${line.original.ingredientId} ${line.original.amount} ${line.original.unit}` : undefined,
    })
    if (scaling === 'vessel' || grams === null) continue
    massG += grams
    if (MEAT_CATEGORIES.has(ing.category)) meatG += grams
    if (ing.id === 'sul') saltG += grams
    if (ing.id === 'voda') waterLines++
    if (line.unit === 'ml' || ing.id === 'voda') liquidMl += grams
    if (grams < 1 && ing.scaling !== 'seasoning' && ing.scaling !== 'aromatic') {
      flags.push(`${ing.id}: ${line.amount} ${line.unit} je méně než 1 g u suroviny, která není koření – chyba převodu?`)
    }
  }

  const n = recipe.baseServings
  const macros = recipeMacrosPerServing(recipe, byId, false)
  const macrosHist = recipeMacrosPerServing(recipe, byId, true)
  const perPortion = {
    massG: massG / n, kcal: macros.kcal, kcalHistorical: macrosHist.kcal, protein: macros.protein,
    meatG: meatG / n, saltG: saltG / n, liquidMl: liquidMl / n,
  }

  if (perPortion.kcal < RANGES.kcal[0] || perPortion.kcal > RANGES.kcal[1]) {
    flags.push(`${Math.round(perPortion.kcal)} kcal na porci je mimo ${RANGES.kcal[0]}–${RANGES.kcal[1]} – zkontroluj převod jednotek (oz × lb, Issue místo Weight)`)
  }
  if (opts.sourceKcal !== undefined && opts.sourceKcal > 0) {
    const diff = (perPortion.kcal - opts.sourceKcal) / opts.sourceKcal
    if (Math.abs(diff) > 0.25) {
      flags.push(`kcal na porci ${Math.round(perPortion.kcal)} vs. zdroj ${opts.sourceKcal} (${diff > 0 ? '+' : ''}${Math.round(diff * 100)} %) – odchylka nad 25 %: chybná surovina, jednotka nebo modernizace`)
    }
  }
  if (saltG > 0 && (perPortion.saltG < RANGES.saltG[0] || perPortion.saltG > RANGES.saltG[1])) {
    flags.push(`sůl ${perPortion.saltG.toFixed(2)} g na porci je mimo ${RANGES.saltG[0]}–${RANGES.saltG[1]} g – sůl do slévané vody má mít scaling vessel; jinak zkontroluj oz`)
  }
  const meatChapter = recipe.chapter === 'maso-a-ryby' || recipe.chapter === 'z-jednoho-hrnce'
  if (meatChapter && meatG > 0 && (perPortion.meatG < RANGES.meatG[0] || perPortion.meatG > RANGES.meatG[1])) {
    flags.push(`maso ${Math.round(perPortion.meatG)} g na porci je mimo ${RANGES.meatG[0]}–${RANGES.meatG[1]} g – sedí-li s kartou (Weight × 0,04), ponech a zapiš do modernNote`)
  }
  if (recipe.chapter === 'polevky' && (perPortion.massG < RANGES.soupMl[0] || perPortion.massG > RANGES.soupMl[1])) {
    flags.push(`polévka: ${Math.round(perPortion.massG)} g na porci je mimo ${RANGES.soupMl[0]}–${RANGES.soupMl[1]} – voda v polévce škáluje linear (ne vessel); porce zdroje vítězí`)
  }
  if (waterLines > 1) {
    flags.push(`voda je ${waterLines}× bez scaling vessel – jeden z řádků bývá voda na vaření těstovin/brambor (vessel, domácí hodnota), ne součást jídla`)
  }
  if (opts.sourcePortion) {
    const portion = parseQuantity(opts.sourcePortion).value
    const ratio = perPortion.massG / portion
    if (ratio < RANGES.portionRatio[0] || ratio > RANGES.portionRatio[1]) {
      flags.push(`bilance: ${Math.round(perPortion.massG)} g na porci vs. porce zdroje ${Math.round(portion)} g/ml (poměr ${ratio.toFixed(2)}) – nad 1,6: v jídle je voda na vaření nebo chybí ×k; pod 0,6: chybí surovina nebo vsáknutá voda je vessel`)
    }
  }
  return { rows, perPortion, flags }
}

const f1 = (x: number) => x.toFixed(1).replace('.', ',')

/** Časová osa kroků (spec §5.1 [R3]): začátek | min | text, na konci „hotovo“ proti timeMinutes. */
export function formatStepTimeline(recipe: Recipe): string[] {
  const { steps, total } = stepTimeline(recipe.steps)
  const out = ['krok | začátek | min | text']
  recipe.steps.forEach((s, i) => {
    const text = s.text.length > 60 ? `${s.text.slice(0, 59)}…` : s.text
    out.push(`${i + 1} | ${stepStartLabel(steps[i].startMinutes)} | ${s.minutes ?? '–'} | ${text}`)
  })
  out.push(`hotovo: ${formatStopwatch(total)} (${total} min; timeMinutes ${recipe.timeMinutes})`)
  return out
}

export function formatCheck(recipe: Recipe, result: CheckResult): string {
  const out: string[] = [`${recipe.id} (${recipe.source.book}${recipe.source.code ? ` ${recipe.source.code}` : ''}, ${recipe.baseServings} porce, verified: ${recipe.verified})`]
  out.push('surovina | množství | g jedlé | třída | kcal | original')
  for (const r of result.rows) {
    out.push(`${r.ingredientId} | ${r.amount} ${r.unit} | ${r.grams === null ? '?' : f1(r.grams)} | ${r.scaling} | ${Math.round(r.kcal)} | ${r.original ?? ''}`)
  }
  const p = result.perPortion
  out.push(`na porci: ${Math.round(p.massG)} g (bez vessel) | ${Math.round(p.kcal)} kcal (historické suroviny ${Math.round(p.kcalHistorical)}) | bílkoviny ${Math.round(p.protein)} g | maso ${Math.round(p.meatG)} g | sůl ${p.saltG.toFixed(2)} g | tekutina ${Math.round(p.liquidMl)} ml`)
  out.push(...formatStepTimeline(recipe))
  if (result.flags.length === 0) out.push('KONTROLA: bez nálezů')
  for (const fl of result.flags) out.push(`NÁLEZ: ${fl}`)
  return out.join('\n')
}

export function parseCheckArgs(argv: string[]): { id: string; opts: CheckOptions } {
  let id = ''
  const opts: CheckOptions = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--portion') opts.sourcePortion = argv[++i]
    else if (argv[i] === '--kcal') opts.sourceKcal = Number(argv[++i])
    else id = argv[i].replace(/\.json$/, '').replace(/^.*\//, '')
  }
  if (!id) throw new Error('Použití: npm run check:recipe -- <id> [--portion "1-1/4 cup"] [--kcal 330]')
  return { id, opts }
}

async function main() {
  const { id, opts } = parseCheckArgs(process.argv.slice(2))
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const rawIngredients = JSON.parse(await readFile(path.join(root, 'data', 'ingredients.json'), 'utf8')) as unknown[]
  const byId = new Map<string, Ingredient>()
  for (const raw of rawIngredients) {
    const parsed = IngredientSchema.safeParse(raw)
    if (parsed.success) byId.set(parsed.data.id, parsed.data)
  }
  const rawRecipe = JSON.parse(await readFile(path.join(root, 'data', 'recipes', `${id}.json`), 'utf8')) as unknown
  const parsed = RecipeSchema.safeParse(rawRecipe)
  if (!parsed.success) {
    for (const i of parsed.error.issues) console.error(`CHYBA: ${i.path.join('.') || '(kořen)'}: ${i.message}`)
    process.exit(1)
  }
  console.log(formatCheck(parsed.data, checkRecipe(parsed.data, byId, opts)))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`CHYBA: ${(e as Error).message}`); process.exit(1) })
}
