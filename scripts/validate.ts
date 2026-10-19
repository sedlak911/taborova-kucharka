// Validátor obsahu: suroviny a recepty. Spuštění: npm run validate
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { IngredientSchema, RecipeSchema } from '../src/domain/schema'
import { recipeMacrosPerServing } from '../src/domain/nutrition'
import { isStepTotalPlausible, stepTimeline } from '../src/domain/steps'
import type { Ingredient, Recipe } from '../src/domain/types'
import { QUICK_MAX_MINUTES, isQuick } from '../src/content/derivedTags'

export interface ValidationResult {
  errors: string[]
  warnings: string[]
  stats: { ingredients: number; recipes: number }
}

const MEAT_CATEGORIES = new Set(['maso', 'ryby', 'uzeniny'])
const COUNTED_UNITS = ['ks', 'lzice', 'lzicka', 'hrnek'] as const

/** Maso podle kategorie, nebo surovina s příznakem containsMeat (masový vývar). */
const isMeat = (ing: Ingredient) => MEAT_CATEGORIES.has(ing.category) || ing.containsMeat === true

/** Časování kroků (spec §5.1 [R3], ruling R9): kroky s minutami, součet proti timeMinutes, souběžný první krok. */
export function stepTimingWarnings(r: Recipe): string[] {
  const out: string[] = []
  if (!r.steps.some((s) => s.minutes !== undefined)) {
    if (r.source.book !== 'vlastni') out.push(`žádný krok nemá minutes (časování kroků; návrh: npm run step-times -- ${r.id})`)
    return out
  }
  const { total } = stepTimeline(r.steps)
  if (!isStepTotalPlausible(total, r.timeMinutes)) {
    out.push(total > r.timeMinutes
      ? `součet minut kroků ${total} je větší než timeMinutes ${r.timeMinutes}`
      : `součet minut kroků ${total} je menší než polovina timeMinutes ${r.timeMinutes}`)
  }
  if (r.steps[0].parallel) out.push('první krok má parallel, ale nemá předchozí krok (počítá se jako běžný)')
  return out
}

export function validateContent(ingredients: unknown[], recipes: { file: string; data: unknown }[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const byId = new Map<string, Ingredient>()

  for (const raw of ingredients) {
    const parsed = IngredientSchema.safeParse(raw)
    const rawId = (raw as { id?: unknown } | null)?.id
    const label = typeof rawId === 'string' ? rawId : '(bez id)'
    if (!parsed.success) {
      for (const i of parsed.error.issues) errors.push(`surovina ${label}: ${i.path.join('.') || '(kořen)'}: ${i.message}`)
      continue
    }
    const ing = parsed.data
    if (byId.has(ing.id)) { errors.push(`surovina ${ing.id}: duplicitní id`); continue }
    byId.set(ing.id, ing)
    const n = ing.nutritionPer100g
    if (n.protein + n.carbs + n.fat > 100) {
      errors.push(`surovina ${ing.id}: protein + sacharidy + tuk = ${n.protein + n.carbs + n.fat} g na 100 g (max 100)`)
    }
  }

  let unverified = 0
  const recipeIds = new Set<string>()
  for (const { file, data } of recipes) {
    const parsed = RecipeSchema.safeParse(data)
    if (!parsed.success) {
      for (const i of parsed.error.issues) errors.push(`recept ${file}: ${i.path.join('.') || '(kořen)'}: ${i.message}`)
      continue
    }
    const r = parsed.data
    const stem = path.basename(file).replace(/\.json$/, '')
    if (stem !== r.id) errors.push(`recept ${r.id}: id neodpovídá názvu souboru ${file} (očekáváno ${r.id}.json)`)
    if (recipeIds.has(r.id)) {
      errors.push(`recept ${r.id}: duplicitní id (soubor ${file})`)
      continue
    }
    recipeIds.add(r.id)
    if (!r.verified) unverified++
    if (r.tags.includes('rychle') && !isQuick(r)) {
      warnings.push(`recept ${r.id}: ruční tag rychle neodpovídá času ${r.timeMinutes} min (rychle = nejvýš ${QUICK_MAX_MINUTES} min a odvozuje se z timeMinutes)`)
    }
    for (const w of stepTimingWarnings(r)) warnings.push(`recept ${r.id}: ${w}`)
    const errorsBefore = errors.length
    let hasMeat = false
    const usedAllergens = new Set<string>()
    const isBezMasa = r.tags.includes('bez-masa')

    /** Kontroly společné pro řádek i jeho `original`: jednotky, hustota u ml, alergeny. */
    const checkUse = (use: { ingredientId: string; unit: string }, ing: Ingredient, label: string) => {
      if ((COUNTED_UNITS as readonly string[]).includes(use.unit) && ing.units[use.unit as (typeof COUNTED_UNITS)[number]] === undefined) {
        errors.push(`recept ${r.id}: ${label}surovina ${ing.id} nemá definovanou jednotku ${use.unit} (units)`)
      }
      if (use.unit === 'ml' && ing.densityGPerMl === undefined && ing.id !== 'voda') {
        warnings.push(`recept ${r.id}: ${label}surovina ${ing.id} je v ml, ale nemá densityGPerMl (počítá se 1 g/ml)`)
      }
      for (const a of ing.allergens) usedAllergens.add(a)
    }

    for (const line of r.ingredients) {
      const ing = byId.get(line.ingredientId)
      if (!ing) {
        errors.push(`recept ${r.id}: surovina ${line.ingredientId} neexistuje`)
      } else {
        checkUse(line, ing, '')
        if (isMeat(ing)) {
          hasMeat = true
          if (isBezMasa) errors.push(`recept ${r.id}: má tag bez-masa, ale surovina ${ing.id} je maso, ryba, uzenina nebo obsahuje maso`)
        }
      }
      if (line.original) {
        const orig = byId.get(line.original.ingredientId)
        if (!orig) errors.push(`recept ${r.id}: original.ingredientId ${line.original.ingredientId} neexistuje`)
        else checkUse(line.original, orig, 'original: ')
      }
    }
    const declared = new Set<string>(r.allergens)
    for (const a of [...usedAllergens].sort()) {
      if (!declared.has(a)) errors.push(`recept ${r.id}: chybí alergen ${a} (obsahuje ho některá surovina)`)
    }
    for (const a of r.allergens) {
      if (!usedAllergens.has(a)) warnings.push(`recept ${r.id}: alergen ${a} je uvedený, ale žádná surovina ho neobsahuje`)
    }
    if (!isBezMasa && !hasMeat) {
      warnings.push(`recept ${r.id}: chybí tag bez-masa, ale žádná surovina není maso, ryba, uzenina ani neobsahuje maso`)
    }
    // stejný výpočet jako v aplikaci: jedlá část u masa s kostí, bez řádků vessel (ruling R1, R5)
    const perPortion = recipeMacrosPerServing(r, byId, false).kcal
    if (errors.length === errorsBefore && (perPortion < 50 || perPortion > 1500)) {
      warnings.push(`recept ${r.id}: ${Math.round(perPortion)} kcal na porci je mimo rozsah 50–1500`)
    }
  }
  if (unverified > 0) warnings.push(`receptů s verified: false: ${unverified}`)

  return { errors, warnings, stats: { ingredients: byId.size, recipes: recipes.length } }
}

async function readJsonFile(file: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as unknown
  } catch (e) {
    throw new Error(`${file}: ${(e as Error).message}`)
  }
}

async function readJsonDir(dir: string): Promise<{ file: string; data: unknown }[]> {
  let files: string[]
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort()
  } catch {
    return []
  }
  return Promise.all(files.map(async (file) => ({ file, data: await readJsonFile(path.join(dir, file)) })))
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const ingredients = (await readJsonFile(path.join(root, 'data', 'ingredients.json'))) as unknown[]
  const recipes = await readJsonDir(path.join(root, 'data', 'recipes'))
  const { errors, warnings, stats } = validateContent(ingredients, recipes)
  for (const w of warnings) console.warn(`VAROVÁNÍ: ${w}`)
  for (const e of errors) console.error(`CHYBA: ${e}`)
  if (errors.length > 0) {
    console.error(`Nalezeno ${errors.length} chyb.`)
    process.exit(1)
  }
  console.log(`OK: ${stats.ingredients} surovin, ${stats.recipes} receptů, ${warnings.length} varování.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`CHYBA: ${(e as Error).message}`); process.exit(1) })
}
