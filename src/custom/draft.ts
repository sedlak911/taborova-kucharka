// src/custom/draft.ts
import { z } from 'zod'
import { deriveAllergens } from '@/content/customRecipes'
import { CHAPTERS, CUSTOM_SERVINGS_MAX, EQUIPMENT, RecipeSchema, UNITS } from '@/domain/schema'
import type { Chapter, Equipment, Ingredient, IngredientLine, Recipe, Step, Tag, Unit } from '@/domain/types'
import { UNIT_LABEL } from '@/pages/labels'

/** Ruční štítky formuláře: `rychle` se odvozuje z času, `bez-masa` a `sladke` nahrazují kapitoly (spec §5.1 [R1]). */
export const FORM_TAGS = ['levne', 'tabor', 'kotlik', 'pripravit-predem'] as const satisfies readonly Tag[]
export const TITLE_MAX = 80
export const TIME_MAX_MINUTES = 1440
/** Nejdelší doba jednoho kroku ve formuláři (10 hodin); v datech schéma horní mez nemá (ruling R1). */
export const STEP_MINUTES_MAX = 600
export const STEPS_HINT = 'Řádek může začínat dobou kroku a slovem „mezitím“ pro souběžný krok, např. „15 min: Duš pod pokličkou.“ nebo „mezitím 10 min: Uvař rýži.“'
export const STEPS_PLACEHOLDER = '5 min: Nakrájej cibuli.\n10 min: Osmaž cibuli dozlatova.\nmezitím 20 min: Uvař brambory.'
/** Nový formulář začíná třemi prázdnými řádky surovin; prázdné řádky se při uložení vynechají. */
const EMPTY_LINES = 3

export interface DraftLine {
  /** Stabilní klíč řádku (React key a klíč chyby). */
  key: string
  /** Vybraná surovina z kanonického seznamu; null = text bez výběru z nabídky. */
  ingredientId: string | null
  /** Text v poli suroviny (po výběru název suroviny). */
  query: string
  amount: string
  unit: Unit
  note: string
}

export interface RecipeDraft {
  title: string
  chapter: Chapter
  baseServings: string
  timeMinutes: string
  difficulty: 1 | 2 | 3
  tags: Tag[]
  equipment: Equipment[]
  lines: DraftLine[]
  /** Postup: každý neprázdný řádek je jeden krok. */
  steps: string
  /** Volitelná poznámka (`modernNote`). */
  note: string
}

/** Chyby podle pole: `title`, `baseServings`, `timeMinutes`, `lines`, `steps` a `lineErrorKey(klíč, pole)`. */
export type DraftErrors = Record<string, string>
export type DraftResult = { ok: true; recipe: Recipe } | { ok: false; errors: DraftErrors }

let lineSeq = 0
export function newLine(): DraftLine {
  lineSeq += 1
  return { key: `l${lineSeq}`, ingredientId: null, query: '', amount: '', unit: 'g', note: '' }
}

export function lineErrorKey(key: string, field: 'ingredientId' | 'amount' | 'unit'): string {
  return `line:${key}:${field}`
}

export function emptyDraft(chapter: Chapter = 'z-jednoho-hrnce'): RecipeDraft {
  return {
    title: '',
    chapter,
    baseServings: '4',
    timeMinutes: '',
    difficulty: 1,
    tags: [],
    equipment: [],
    lines: Array.from({ length: EMPTY_LINES }, newLine),
    steps: '',
    note: '',
  }
}

export function draftFromRecipe(recipe: Recipe, ingredients: ReadonlyMap<string, Ingredient>): RecipeDraft {
  return {
    title: recipe.title,
    chapter: recipe.chapter,
    baseServings: String(recipe.baseServings),
    timeMinutes: String(recipe.timeMinutes),
    difficulty: recipe.difficulty,
    tags: recipe.tags.filter((t) => (FORM_TAGS as readonly Tag[]).includes(t)),
    equipment: [...recipe.equipment],
    lines: recipe.ingredients.map((l) => ({
      ...newLine(),
      ingredientId: l.ingredientId,
      query: ingredients.get(l.ingredientId)?.name ?? l.ingredientId,
      amount: String(l.amount).replace('.', ','),
      unit: l.unit,
      note: l.note ?? '',
    })),
    steps: recipe.steps.map(formatStepLine).join('\n'),
    note: recipe.modernNote ?? '',
  }
}

/** „250“, „1,5“, „1.5“, „1/2“, „1 1/2“, „1 000“ → číslo; prázdné, záporné nebo nesmysl → NaN (ruling R6). */
export function parseDecimal(text: string): number {
  const t = text.trim()
  const mixed = /^(\d+) (\d+)\/(\d+)$/.exec(t)
  if (mixed) return Number(mixed[3]) === 0 ? Number.NaN : Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
  const fraction = /^(\d+)\/(\d+)$/.exec(t)
  if (fraction) return Number(fraction[2]) === 0 ? Number.NaN : Number(fraction[1]) / Number(fraction[2])
  // mezera uvnitř čísla jen jako oddělovač tisíců („1 000“)
  const plain = (/^\d{1,3}( \d{3})+$/.test(t) ? t.replace(/ /g, '') : t).replace(',', '.')
  return /^\d+(\.\d+)?$/.test(plain) ? Number(plain) : Number.NaN
}

/**
 * Prefix kroku: „mezitím“ a/nebo „N min“ (též „minut/minuty/minutu/min.“, „mezitim“), vždy ukončený dvojtečkou.
 * Bez dvojtečky se nic neuznává („10 minut vař do měkka.“, „Mezitím uvař rýži.“ zůstávají textem).
 */
const STEP_PREFIX = /^(?:(mezit[ií]m)\s*)?(?:(\d+(?:[.,]\d+)?)\s*min(?:ut[auy]?)?\.?\s*)?:\s*/iu

/** Jeden řádek postupu → krok (spec §5.1 [R3], ruling R8, PF1): prefix „mezitím“ a/nebo „N min“ + dvojtečka. */
export function parseStepLine(line: string): Step {
  const m = STEP_PREFIX.exec(line)
  if (!m || (!m[1] && !m[2])) return { text: line }
  return {
    text: line.slice(m[0].length).trim(),
    // desetinná doba (1,5) projde jako neceločíselná a validace ji odmítne hláškou „v celých minutách“
    ...(m[2] ? { minutes: Number(m[2].replace(',', '.')) } : {}),
    ...(m[1] ? { parallel: true as const } : {}),
  }
}

/** Krok → řádek textového pole (opak `parseStepLine`): „mezitím 10 min: Uvař rýži.“ */
export function formatStepLine(step: Step): string {
  const prefix = [step.parallel ? 'mezitím' : '', step.minutes ? `${step.minutes} min` : ''].filter(Boolean).join(' ')
  return prefix ? `${prefix}: ${step.text}` : step.text
}

/** Postup z textového pole: řádek = krok; prázdné řádky a ruční číslování („1. “, „2) “) pryč, pak prefix času. */
export function parseSteps(text: string): Step[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim().replace(/^\d+[.)]\s+/, '').trim())
    .filter((s) => s !== '')
    .map(parseStepLine)
}

type ConvertedUnit = keyof Ingredient['units']
const CONVERTED_UNITS: readonly Unit[] = ['ks', 'lzice', 'lzicka', 'hrnek']
const needsConversion = (u: Unit): u is ConvertedUnit => CONVERTED_UNITS.includes(u)

const isBlankLine = (l: DraftLine) => l.query.trim() === '' && l.amount.trim() === '' && l.note.trim() === ''

function draftSchema(ingredients: ReadonlyMap<string, Ingredient>) {
  const line = z
    .object({
      ingredientId: z.string('Vyber surovinu z nabídky'),
      amount: z.number('Zadej množství číslem (např. 250 nebo 1,5)').positive('Množství musí být větší než nula'),
      unit: z.enum(UNITS),
      note: z.string(),
    })
    .superRefine((l, ctx) => {
      const ing = ingredients.get(l.ingredientId)
      if (!ing) {
        ctx.addIssue({ code: 'custom', path: ['ingredientId'], message: 'Vyber surovinu z nabídky' })
        return
      }
      // bez převodu na gramy by nutrice počítala 0 a nákupní seznam odhadoval objem (ruling R6)
      if (needsConversion(l.unit) && ing.units[l.unit] === undefined) {
        ctx.addIssue({ code: 'custom', path: ['unit'], message: `${ing.name}: pro jednotku „${UNIT_LABEL[l.unit]}“ chybí převod na gramy – zvol g nebo ml` })
      }
    })
  return z.object({
    title: z.string().trim().min(1, 'Napiš název receptu').max(TITLE_MAX, `Název je moc dlouhý (nejvýš ${TITLE_MAX} znaků)`),
    chapter: z.enum(CHAPTERS),
    baseServings: z
      .number('Zadej počet porcí číslem')
      .int('Počet porcí musí být celé číslo')
      .min(1, 'Aspoň 1 porce')
      .max(CUSTOM_SERVINGS_MAX, `Nejvýš ${CUSTOM_SERVINGS_MAX} porcí`),
    timeMinutes: z
      .number('Zadej čas v minutách')
      .int('Čas zadej v celých minutách')
      .min(1, 'Čas musí být aspoň 1 minuta')
      .max(TIME_MAX_MINUTES, `Nejvýš ${TIME_MAX_MINUTES} minut (24 hodin)`),
    lines: z.array(line).min(1, 'Přidej aspoň jednu surovinu'),
    steps: z
      .array(z.object({ text: z.string(), minutes: z.number().optional(), parallel: z.literal(true).optional() }))
      .min(1, 'Napiš aspoň jeden krok postupu')
      .superRefine((steps, ctx) => {
        steps.forEach((s, i) => {
          if (s.minutes !== undefined && !Number.isInteger(s.minutes)) {
            ctx.addIssue({ code: 'custom', path: [i, 'minutes'], message: `Krok ${i + 1}: dobu zadej v celých minutách` })
          } else if (s.minutes !== undefined && (s.minutes < 1 || s.minutes > STEP_MINUTES_MAX)) {
            ctx.addIssue({ code: 'custom', path: [i, 'minutes'], message: `Krok ${i + 1}: doba musí být 1–${STEP_MINUTES_MAX} minut` })
          }
          if (s.text === '') ctx.addIssue({ code: 'custom', path: [i, 'text'], message: `Krok ${i + 1}: chybí text kroku` })
        })
      }),
  })
}

/** Rozepsaný recept → platný `Recipe` (vlastní, `verified: true`, alergeny ze surovin), nebo chyby podle polí. */
export function draftToRecipe(draft: RecipeDraft, ctx: { id: string; ingredients: ReadonlyMap<string, Ingredient> }): DraftResult {
  const kept = draft.lines.filter((l) => !isBlankLine(l))
  const parsed = draftSchema(ctx.ingredients).safeParse({
    title: draft.title,
    chapter: draft.chapter,
    baseServings: parseDecimal(draft.baseServings),
    timeMinutes: parseDecimal(draft.timeMinutes),
    lines: kept.map((l) => ({ ingredientId: l.ingredientId, amount: l.unit === 'spetka' ? 1 : parseDecimal(l.amount), unit: l.unit, note: l.note.trim() })),
    steps: parseSteps(draft.steps),
  })
  if (!parsed.success) {
    const errors: DraftErrors = {}
    for (const issue of parsed.error.issues) {
      const [head, index, field] = issue.path
      const key =
        head === 'lines' && typeof index === 'number'
          ? lineErrorKey(kept[index].key, field as 'ingredientId' | 'amount' | 'unit')
          : String(head)
      errors[key] ??= issue.message
    }
    return { ok: false, errors }
  }
  const v = parsed.data
  const lines: IngredientLine[] = v.lines.map((l) => ({ ingredientId: l.ingredientId, amount: l.amount, unit: l.unit, ...(l.note ? { note: l.note } : {}) }))
  const note = draft.note.trim()
  const recipe = RecipeSchema.parse({
    id: ctx.id,
    title: v.title,
    chapter: v.chapter,
    baseServings: v.baseServings,
    timeMinutes: v.timeMinutes,
    difficulty: draft.difficulty,
    tags: FORM_TAGS.filter((t) => draft.tags.includes(t)),
    equipment: EQUIPMENT.filter((e) => draft.equipment.includes(e)),
    allergens: deriveAllergens(lines, ctx.ingredients),
    ingredients: lines,
    steps: v.steps,
    ...(note ? { modernNote: note } : {}),
    source: { book: 'vlastni' },
    verified: true,
  })
  return { ok: true, recipe }
}
