import { z } from 'zod'

export const UNITS = ['g', 'ml', 'ks', 'lzice', 'lzicka', 'hrnek', 'spetka'] as const
export const SCALING_CLASSES = ['linear', 'seasoning', 'aromatic', 'leavening', 'fat', 'vessel'] as const
export const TAGS = ['levne', 'tabor', 'kotlik', 'rychle', 'bez-masa', 'sladke', 'pripravit-predem'] as const
/** `lednice` = recept bez ní nejde (tuhne, mrazí se, leží syrové hodiny v chladu). Kotlík je štítek, ne vybavení. */
export const EQUIPMENT = ['trouba', 'plotna', 'gril', 'lednice'] as const
export const CHAPTERS = ['polevky', 'z-jednoho-hrnce', 'maso-a-ryby', 'bezmasa', 'prilohy-a-zelenina', 'testoviny-a-ryze', 'snidane-a-pecivo', 'sladke', 'napoje'] as const
export const CATEGORIES = ['pecivo', 'mlecne-a-vejce', 'maso', 'ryby', 'uzeniny', 'zelenina', 'ovoce', 'lusteniny-a-obiloviny', 'testoviny-a-ryze', 'koreni', 'tuky-a-oleje', 'konzervy', 'trvanlive', 'napoje', 'mrazene', 'ostatni'] as const
export const ALLERGENS = ['lepek', 'korysi', 'vejce', 'ryby', 'arasidy', 'soja', 'mleko', 'orechy', 'celer', 'horcice', 'sezam', 'siricitany', 'vlci-bob', 'mekkysi'] as const
export const BOOKS = ['afrs-2003', 'navy-1944', 'italian-1919', 'feldkochbuch-1940', 'glasse-1747', 'rettigova-1868', 'hauptmann-1877', 'wells-1890', 'army-baker-1945', 'receptury-1983', 'vlastni'] as const

/** kebab-case bez diakritiky: a-z, 0-9, pomlčky */
const kebab = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'id musí být kebab-case bez diakritiky')

export const NutritionSchema = z.object({
  kcal: z.number().min(0).max(900),
  protein: z.number().min(0).max(100),
  carbs: z.number().min(0).max(100),
  fat: z.number().min(0).max(100),
  fiber: z.number().min(0).max(100),
}).strict()

export const IngredientSchema = z.object({
  id: kebab,
  name: z.string().min(1),
  aliases: z.array(z.string().min(1)),
  category: z.enum(CATEGORIES),
  scaling: z.enum(SCALING_CLASSES),
  nutritionPer100g: NutritionSchema,
  densityGPerMl: z.number().positive().optional(),
  units: z.object({
    ks: z.number().positive().optional(),
    lzice: z.number().positive().optional(),
    lzicka: z.number().positive().optional(),
    hrnek: z.number().positive().optional(),
  }).strict(),
  ediblePortion: z.number().gt(0).max(1),
  allergens: z.array(z.enum(ALLERGENS)),
  /** Obsahuje maso, i když kategorie není maso/ryby/uzeniny (např. masový vývar). */
  containsMeat: z.boolean().optional(),
  sources: z.object({ nutrition: z.string().min(1), units: z.string().optional(), refuse: z.string().optional() }).strict(),
}).strict()

const OriginalSchema = z.object({ ingredientId: kebab, amount: z.number().positive(), unit: z.enum(UNITS) }).strict()

export const IngredientLineSchema = z
  .object({
    ingredientId: kebab,
    amount: z.number().positive(),
    unit: z.enum(UNITS),
    note: z.string().optional(),
    group: z.string().optional(),
    original: OriginalSchema.optional(),
    optional: z.boolean().optional(),
    /** Přepsání škálovací třídy suroviny na tomto řádku (např. vessel pro slévanou vodu). */
    scaling: z.enum(SCALING_CLASSES).optional(),
  })
  .strict()
  .refine((l) => l.unit !== 'spetka' || l.amount === 1, { message: 'špetka má vždy amount 1' })

/**
 * Krok postupu (spec §5.1 [R3]): `minutes` = doba od začátku kroku do začátku dalšího (aktivní + pasivní),
 * `parallel` = krok běží souběžně s předchozím a čas nepřidává. Krok bez `minutes` čas nepřidává (pokyn).
 */
export const StepSchema = z
  .object({
    text: z.string().min(1),
    minutes: z.number().int().min(1).optional(),
    parallel: z.literal(true).optional(),
  })
  .strict()

/** Data mají kroky jako objekty; prostý řetězec (starší vlastní recepty, import, export) se normalizuje na `{ text }`. */
export const StepsSchema = z
  .array(z.union([z.string().min(1), StepSchema]))
  .min(1)
  .transform((steps) => steps.map((s): z.infer<typeof StepSchema> => (typeof s === 'string' ? { text: s } : s)))

/** Nejvyšší počet porcí, pro který smí být napsaný vlastní recept (formulář „pro kolik porcí je recept napsaný“). */
export const CUSTOM_SERVINGS_MAX = 50

/**
 * Starší vlastní recept (úložiště, soubor exportu) mohl mít vybavení `kotlik`, které je dnes štítek:
 * vybavení se převede na štítek, aby se recept při načtení nezahodil. Jiné hodnoty projdou beze změny.
 */
export function upgradeLegacyRecipe(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('equipment' in raw) || !Array.isArray(raw.equipment) || !raw.equipment.includes('kotlik')) return raw
  const tags = 'tags' in raw && Array.isArray(raw.tags) ? raw.tags : []
  return { ...raw, equipment: raw.equipment.filter((e) => e !== 'kotlik'), tags: tags.includes('kotlik') ? tags : [...tags, 'kotlik'] }
}

export const RecipeSchema = z.object({
  id: kebab,
  title: z.string().min(1),
  titleOriginal: z.string().optional(),
  chapter: z.enum(CHAPTERS),
  baseServings: z.number().int().min(1).max(CUSTOM_SERVINGS_MAX),
  originalYield: z.number().positive().optional(),
  timeMinutes: z.number().int().positive(),
  difficulty: z.literal([1, 2, 3]),
  tags: z.array(z.enum(TAGS)),
  equipment: z.array(z.enum(EQUIPMENT)),
  allergens: z.array(z.enum(ALLERGENS)),
  ingredients: z.array(IngredientLineSchema).min(1),
  steps: StepsSchema,
  modernNote: z.string().optional(),
  source: z.object({ book: z.enum(BOOKS), page: z.number().int().positive().optional(), code: z.string().optional(), titleOriginal: z.string().optional() }).strict(),
  verified: z.boolean(),
  quote: z.string().optional(),
  image: z.string().optional(),
})
  .strict()
  // knižní recepty jsou přepočtené na 4 porce (spec §5.1); jiný základ smí mít jen vlastní recept
  .refine((r) => r.baseServings === 4 || r.source.book === 'vlastni', {
    message: 'baseServings musí být 4 (jiný počet porcí smí mít jen vlastní recept)',
    path: ['baseServings'],
  })
