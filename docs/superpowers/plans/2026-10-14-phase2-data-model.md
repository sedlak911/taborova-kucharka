# Fáze 2: Datový model, surovinová databáze a skill pro digitalizaci receptů – implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vytvořit typy a validaci pro recepty a suroviny, škálovací engine, centrální `data/ingredients.json` (~300 českých surovin s makry, jednotkami, odpadem a škálovací třídou, odvozených z USDA a open-tandoor-data), skill `recipe-digitize` pro agenty a validační skript, a ověřit pipeline na třech pilotních receptech.

**Architecture:** Doména je čistý TypeScript v `src/domain/` (typy jako zod schémata, škálování, zaokrouhlování) sdílený aplikací i skripty. Obsah žije v `data/` (tracked): `data/ingredients.json`, `data/recipes/*.json`, `data/sources/usda-index.json` (vygenerovaný výtah z USDA pro agenty). Skripty v `scripts/*.ts` běží přes `tsx`. Uživatelský stav bude později v `userdata/` (ignorován), ne v `data/`.

**Tech Stack:** TypeScript, zod 4, tsx 4, Vitest. Zdrojová data ve `vendor/` (gitignored, popsáno v `vendor/README.md`): USDA SR Legacy CSV 2018 (CC0), USDA SR28 `FOOD_DES.txt`/`WEIGHT.txt`/`FD_GROUP.txt`, open-tandoor-data `food.json`/`conversion.json`.

**Spec:** `docs/superpowers/specs/2026-10-14-cookbook-design.md` (§3 přepočty, §5 data).

## Global Constraints

- Identifikátory anglicky, komentáře a UI texty česky s diakritikou. Názvy surovin a receptů česky.
- `baseServings` každého receptu je 4 (spec §5.1). Suroviny v receptu jsou v metrických jednotkách: `g`, `ml`, `ks`, `lzice`, `lzicka`, `hrnek`, `spetka` (spec §2, §5).
- Škálovací třídy a exponenty přesně: `linear` 1,0; `seasoning` 0,85; `aromatic` 0,92; `leavening` 0,80; `fat` 0,90; `vessel` 0,60 (spec §3).
- Zaokrouhlování: g/ml na 1 (do 20), na 5 (do 200), na 10 (nad 200); `ks` nahoru na 0,5; pod 1 g → „špetka“ (spec §3).
- Koeficient dítěte výchozí 0,8; osoby-ekvivalent `P = adults + children × childCoef`, násobeno náročností dne (spec §3).
- Tagy (pevná sada): `levne`, `tabor`, `kotlik`, `rychle`, `bez-masa`, `sladke`, `pripravit-predem`. Vybavení: `trouba`, `plotna`, `kotlik`, `gril`. Kapitoly: `polevky`, `z-jednoho-hrnce`, `maso-a-ryby`, `bezmasa`, `prilohy-a-zelenina`, `testoviny-a-ryze`, `snidane-a-pecivo`, `sladke`, `napoje` (spec §5.1).
- Nákupní kategorie surovin (pevná sada): `pecivo`, `mlecne-a-vejce`, `maso`, `ryby`, `uzeniny`, `zelenina`, `ovoce`, `lustěniny-a-obiloviny` → zapisuj jako `lusteniny-a-obiloviny`, `testoviny-a-ryze`, `koreni`, `tuky-a-oleje`, `konzervy`, `trvanlive`, `napoje`, `mrazene`, `ostatni`.
- Alergeny (EU 14, kódy): `lepek`, `korysi`, `vejce`, `ryby`, `arasidy`, `soja`, `mleko`, `orechy`, `celer`, `horcice`, `sezam`, `siricitany`, `vlci-bob`, `mekkysi`.
- Nutriční hodnoty jsou na 100 g jedlé části; `units` suroviny udávají gramy jedlé části na jednotku; `ediblePortion` 0–1 (spec: rešerše nutričních dat).
- Žádná data nesmí pocházet z Kalorických tabulek ani NutriDatabaze (licence). Zdroj uvádět v `sources`.
- Commitovat po každém tasku. Testy a `npm run build` čisté.

## Review Focus

1. Recept s nulovým nebo záporným množstvím suroviny musí validátor odmítnout. Test v Task 6.
2. Recept odkazující na neexistující `ingredientId` musí validátor odmítnout s názvem receptu i surovinou. Test v Task 6.
3. Škálování z 4 na 100 porcí u koření nesmí být lineární (k=25 → faktor ≈ 15,4 při p=0,85), z 4 na 1 porci u koření pod 1 g dá „špetka“. Testy v Task 2.
4. Surovina bez `units.ks` použitá v receptu v jednotce `ks` musí validátor odmítnout (nelze převést na gramy). Test v Task 6.
5. Surovina v `ingredients.json` s nesmyslnými makry (součet bílkovin+sacharidů+tuků > 100 g, nebo kcal mimo 0–900) musí validátor odmítnout. Test v Task 6.

---

### Task 1: Doménové typy a zod schémata

**Files:**
- Create: `src/domain/types.ts`, `src/domain/schema.ts`, `src/domain/schema.test.ts`
- Modify: `package.json` (dependencies: `zod`; devDependencies: `tsx`)

**Interfaces:**
- Produces:
```ts
// src/domain/schema.ts
export const UNITS = ['g','ml','ks','lzice','lzicka','hrnek','spetka'] as const
export const SCALING_CLASSES = ['linear','seasoning','aromatic','leavening','fat','vessel'] as const
export const TAGS = ['levne','tabor','kotlik','rychle','bez-masa','sladke','pripravit-predem'] as const
export const EQUIPMENT = ['trouba','plotna','kotlik','gril'] as const
export const CHAPTERS = ['polevky','z-jednoho-hrnce','maso-a-ryby','bezmasa','prilohy-a-zelenina','testoviny-a-ryze','snidane-a-pecivo','sladke','napoje'] as const
export const CATEGORIES = ['pecivo','mlecne-a-vejce','maso','ryby','uzeniny','zelenina','ovoce','lusteniny-a-obiloviny','testoviny-a-ryze','koreni','tuky-a-oleje','konzervy','trvanlive','napoje','mrazene','ostatni'] as const
export const ALLERGENS = ['lepek','korysi','vejce','ryby','arasidy','soja','mleko','orechy','celer','horcice','sezam','siricitany','vlci-bob','mekkysi'] as const
export const BOOKS = ['afrs-2003','navy-1944','italian-1919','feldkochbuch-1940','vlastni'] as const
export const IngredientSchema, RecipeSchema, IngredientLineSchema  // zod
// src/domain/types.ts: export type Unit, ScalingClass, Tag, Equipment, Chapter, Category, Allergen, Book, Ingredient, IngredientLine, Recipe (z.infer)
```
Tvar `Ingredient`: `{ id: kebab, name, aliases: string[], category, scaling, nutritionPer100g: {kcal, protein, carbs, fat, fiber}, densityGPerMl?: number, units: { ks?: number, lzice?: number, lzicka?: number, hrnek?: number }, ediblePortion: number (0<x<=1), allergens: Allergen[], sources: { nutrition: string, units?: string, refuse?: string } }`.
Tvar `IngredientLine`: `{ ingredientId, amount: number>0, unit: Unit, note?: string, group?: string, original?: { ingredientId: string, amount: number, unit: Unit }, optional?: boolean }`. Pro `unit === 'spetka'` je `amount` povinně 1.
Tvar `Recipe`: `{ id: kebab, title, titleOriginal?, chapter, baseServings: literal 4, originalYield?: number, timeMinutes: int>0, difficulty: 1|2|3, tags: Tag[], equipment: Equipment[], allergens: Allergen[], ingredients: IngredientLine[] (min 1), steps: string[] (min 1), modernNote?, source: { book: Book, page?: number, code?: string, titleOriginal?: string }, verified: boolean, quote?: string, image?: string }`.

- [ ] **Step 1: Instalace**
```bash
npm install zod@4.6.7 && npm install -D tsx@4.23.15
```
- [ ] **Step 2: Testy** `src/domain/schema.test.ts`:
```ts
import { IngredientSchema, RecipeSchema } from './schema'

const ingredient = {
  id: 'vejce', name: 'Vejce', aliases: ['vajíčko'], category: 'mlecne-a-vejce', scaling: 'linear',
  nutritionPer100g: { kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5, fiber: 0 },
  units: { ks: 50 }, ediblePortion: 0.88, allergens: ['vejce'], sources: { nutrition: 'USDA SR Legacy 171287' },
}
const recipe = {
  id: 'michana-vejce', title: 'Míchaná vejce', chapter: 'snidane-a-pecivo', baseServings: 4, timeMinutes: 10, difficulty: 1,
  tags: ['rychle', 'levne'], equipment: ['plotna'], allergens: ['vejce', 'mleko'],
  ingredients: [{ ingredientId: 'vejce', amount: 8, unit: 'ks' }, { ingredientId: 'sul', amount: 1, unit: 'spetka' }],
  steps: ['Rozšlehej vejce.', 'Opékej na másle.'], source: { book: 'vlastni' }, verified: true,
}

test('platná surovina projde', () => expect(IngredientSchema.safeParse(ingredient).success).toBe(true))
test('surovina s ediblePortion > 1 neprojde', () => expect(IngredientSchema.safeParse({ ...ingredient, ediblePortion: 1.2 }).success).toBe(false))
test('surovina s neznámou kategorií neprojde', () => expect(IngredientSchema.safeParse({ ...ingredient, category: 'x' }).success).toBe(false))
test('id musí být kebab-case', () => expect(IngredientSchema.safeParse({ ...ingredient, id: 'Vejce 1' }).success).toBe(false))
test('platný recept projde', () => expect(RecipeSchema.safeParse(recipe).success).toBe(true))
test('baseServings musí být 4', () => expect(RecipeSchema.safeParse({ ...recipe, baseServings: 6 }).success).toBe(false))
test('množství musí být kladné', () => expect(RecipeSchema.safeParse({ ...recipe, ingredients: [{ ingredientId: 'vejce', amount: 0, unit: 'ks' }] }).success).toBe(false))
test('špetka má amount 1', () => expect(RecipeSchema.safeParse({ ...recipe, ingredients: [{ ingredientId: 'sul', amount: 2, unit: 'spetka' }] }).success).toBe(false))
test('neznámý tag neprojde', () => expect(RecipeSchema.safeParse({ ...recipe, tags: ['bio'] }).success).toBe(false))
test('recept bez kroků neprojde', () => expect(RecipeSchema.safeParse({ ...recipe, steps: [] }).success).toBe(false))
```
- [ ] **Step 3: RED** `npm test -- src/domain/schema.test.ts` → FAIL.
- [ ] **Step 4: Implementace** `src/domain/schema.ts` (zod 4 API: `z.object`, `z.enum`, `z.literal`, `.refine`):
```ts
import { z } from 'zod'

export const UNITS = ['g', 'ml', 'ks', 'lzice', 'lzicka', 'hrnek', 'spetka'] as const
export const SCALING_CLASSES = ['linear', 'seasoning', 'aromatic', 'leavening', 'fat', 'vessel'] as const
export const TAGS = ['levne', 'tabor', 'kotlik', 'rychle', 'bez-masa', 'sladke', 'pripravit-predem'] as const
export const EQUIPMENT = ['trouba', 'plotna', 'kotlik', 'gril'] as const
export const CHAPTERS = ['polevky', 'z-jednoho-hrnce', 'maso-a-ryby', 'bezmasa', 'prilohy-a-zelenina', 'testoviny-a-ryze', 'snidane-a-pecivo', 'sladke', 'napoje'] as const
export const CATEGORIES = ['pecivo', 'mlecne-a-vejce', 'maso', 'ryby', 'uzeniny', 'zelenina', 'ovoce', 'lusteniny-a-obiloviny', 'testoviny-a-ryze', 'koreni', 'tuky-a-oleje', 'konzervy', 'trvanlive', 'napoje', 'mrazene', 'ostatni'] as const
export const ALLERGENS = ['lepek', 'korysi', 'vejce', 'ryby', 'arasidy', 'soja', 'mleko', 'orechy', 'celer', 'horcice', 'sezam', 'siricitany', 'vlci-bob', 'mekkysi'] as const
export const BOOKS = ['afrs-2003', 'navy-1944', 'italian-1919', 'feldkochbuch-1940', 'vlastni'] as const

/** kebab-case bez diakritiky: a-z, 0-9, pomlčky */
const kebab = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'id musí být kebab-case bez diakritiky')

export const NutritionSchema = z.object({
  kcal: z.number().min(0).max(900),
  protein: z.number().min(0).max(100),
  carbs: z.number().min(0).max(100),
  fat: z.number().min(0).max(100),
  fiber: z.number().min(0).max(100),
})

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
  }),
  ediblePortion: z.number().gt(0).max(1),
  allergens: z.array(z.enum(ALLERGENS)),
  sources: z.object({ nutrition: z.string().min(1), units: z.string().optional(), refuse: z.string().optional() }),
})

const OriginalSchema = z.object({ ingredientId: kebab, amount: z.number().positive(), unit: z.enum(UNITS) })

export const IngredientLineSchema = z
  .object({
    ingredientId: kebab,
    amount: z.number().positive(),
    unit: z.enum(UNITS),
    note: z.string().optional(),
    group: z.string().optional(),
    original: OriginalSchema.optional(),
    optional: z.boolean().optional(),
  })
  .refine((l) => l.unit !== 'spetka' || l.amount === 1, { message: 'špetka má vždy amount 1' })

export const RecipeSchema = z.object({
  id: kebab,
  title: z.string().min(1),
  titleOriginal: z.string().optional(),
  chapter: z.enum(CHAPTERS),
  baseServings: z.literal(4),
  originalYield: z.number().positive().optional(),
  timeMinutes: z.number().int().positive(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  tags: z.array(z.enum(TAGS)),
  equipment: z.array(z.enum(EQUIPMENT)),
  allergens: z.array(z.enum(ALLERGENS)),
  ingredients: z.array(IngredientLineSchema).min(1),
  steps: z.array(z.string().min(1)).min(1),
  modernNote: z.string().optional(),
  source: z.object({ book: z.enum(BOOKS), page: z.number().int().positive().optional(), code: z.string().optional(), titleOriginal: z.string().optional() }),
  verified: z.boolean(),
  quote: z.string().optional(),
  image: z.string().optional(),
})
```
`src/domain/types.ts`:
```ts
import type { z } from 'zod'
import type { IngredientSchema, IngredientLineSchema, RecipeSchema, NutritionSchema, UNITS, SCALING_CLASSES, TAGS, EQUIPMENT, CHAPTERS, CATEGORIES, ALLERGENS, BOOKS } from './schema'

export type Unit = (typeof UNITS)[number]
export type ScalingClass = (typeof SCALING_CLASSES)[number]
export type Tag = (typeof TAGS)[number]
export type Equipment = (typeof EQUIPMENT)[number]
export type Chapter = (typeof CHAPTERS)[number]
export type Category = (typeof CATEGORIES)[number]
export type Allergen = (typeof ALLERGENS)[number]
export type Book = (typeof BOOKS)[number]
export type Nutrition = z.infer<typeof NutritionSchema>
export type Ingredient = z.infer<typeof IngredientSchema>
export type IngredientLine = z.infer<typeof IngredientLineSchema>
export type Recipe = z.infer<typeof RecipeSchema>
```
- [ ] **Step 5: GREEN** `npm test` → PASS; `npm run build` čistý.
- [ ] **Step 6: Commit** `git add package.json package-lock.json src/domain && git commit -m "feat(domain): zod schémata receptů a surovin"`

---

### Task 2: Škálovací engine

**Files:**
- Create: `src/domain/scaling.ts`, `src/domain/scaling.test.ts`

**Interfaces:**
- Consumes: `ScalingClass`, `Unit`, `Ingredient`, `IngredientLine` z Task 1.
- Produces:
```ts
export const SCALING_EXPONENT: Record<ScalingClass, number>  // linear 1, seasoning 0.85, aromatic 0.92, leavening 0.8, fat 0.9, vessel 0.6
export const DEFAULT_CHILD_COEF = 0.8
export function personEquivalent(adults: number, children: number, childCoef?: number, dayFactor?: number): number  // (adults + children*childCoef) * dayFactor, dayFactor výchozí 1
export function scaleFactor(k: number, scaling: ScalingClass): number   // k^p, k>0
export function scaleAmount(amount: number, k: number, scaling: ScalingClass): number  // amount * scaleFactor
export function roundAmount(amount: number, unit: Unit): { amount: number; unit: Unit }  // pravidla zaokrouhlení; g/ml pod 1 → {1,'spetka'}
export function toGrams(line: IngredientLine, ingredient: Ingredient): number | null  // g: amount; ml: densityGPerMl*amount (bez hustoty 1 g/ml); ks/lzice/lzicka/hrnek: units[unit]*amount, chybí → null; spetka → 0.3
export function scaleLine(line: IngredientLine, ingredient: Ingredient, k: number): { amount: number; unit: Unit }  // scaleAmount + roundAmount
```

- [ ] **Step 1: Testy** `src/domain/scaling.test.ts`:
```ts
import { personEquivalent, scaleFactor, scaleAmount, roundAmount, toGrams, scaleLine, SCALING_EXPONENT } from './scaling'
import type { Ingredient, IngredientLine } from './types'

const sul: Ingredient = { id: 'sul', name: 'Sůl', aliases: [], category: 'koreni', scaling: 'seasoning', nutritionPer100g: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }, units: { lzicka: 6, lzice: 18 }, ediblePortion: 1, allergens: [], sources: { nutrition: 'test' } }
const vejce: Ingredient = { ...sul, id: 'vejce', name: 'Vejce', category: 'mlecne-a-vejce', scaling: 'linear', units: { ks: 50 }, allergens: ['vejce'] }
const mleko: Ingredient = { ...sul, id: 'mleko', name: 'Mléko', scaling: 'linear', densityGPerMl: 1.03, units: {} }

describe('personEquivalent', () => {
  test('18 dětí + 6 dospělých při 0,8', () => expect(personEquivalent(6, 18)).toBeCloseTo(20.4))
  test('náročnost dne násobí', () => expect(personEquivalent(2, 0, 0.8, 1.25)).toBeCloseTo(2.5))
})

describe('scaleFactor', () => {
  test('lineární 4→100 je 25', () => expect(scaleFactor(25, 'linear')).toBe(25))
  test('koření 4→100 je ~15,4', () => expect(scaleFactor(25, 'seasoning')).toBeCloseTo(15.4, 0))
  test('koření 4→8 je ~1,8', () => expect(scaleFactor(2, 'seasoning')).toBeCloseTo(1.8, 1))
  test('k=1 je vždy 1', () => expect(scaleFactor(1, 'leavening')).toBe(1))
  test('exponenty dle spec', () => expect(SCALING_EXPONENT).toEqual({ linear: 1, seasoning: 0.85, aromatic: 0.92, leavening: 0.8, fat: 0.9, vessel: 0.6 }))
})

describe('roundAmount', () => {
  test('g do 20 na 1', () => expect(roundAmount(13.4, 'g')).toEqual({ amount: 13, unit: 'g' }))
  test('g do 200 na 5', () => expect(roundAmount(123, 'g')).toEqual({ amount: 125, unit: 'g' }))
  test('ml nad 200 na 10', () => expect(roundAmount(1234, 'ml')).toEqual({ amount: 1230, unit: 'ml' }))
  test('g pod 1 → špetka', () => expect(roundAmount(0.4, 'g')).toEqual({ amount: 1, unit: 'spetka' }))
  test('ks nahoru na 0,5', () => expect(roundAmount(2.1, 'ks')).toEqual({ amount: 2.5, unit: 'ks' }))
  test('lžíce na 0,5', () => expect(roundAmount(1.3, 'lzice')).toEqual({ amount: 1.5, unit: 'lzice' }))
  test('špetka zůstane', () => expect(roundAmount(3, 'spetka')).toEqual({ amount: 1, unit: 'spetka' }))
})

describe('toGrams', () => {
  const line = (amount: number, unit: IngredientLine['unit'], ingredientId = 'x'): IngredientLine => ({ ingredientId, amount, unit })
  test('g', () => expect(toGrams(line(120, 'g'), vejce)).toBe(120))
  test('ks přes units', () => expect(toGrams(line(3, 'ks'), vejce)).toBe(150))
  test('ks bez units.ks → null', () => expect(toGrams(line(3, 'ks'), sul)).toBeNull())
  test('ml s hustotou', () => expect(toGrams(line(100, 'ml'), mleko)).toBeCloseTo(103))
  test('ml bez hustoty = 1', () => expect(toGrams(line(100, 'ml'), sul)).toBe(100))
  test('lžička soli', () => expect(toGrams(line(2, 'lzicka'), sul)).toBe(12))
  test('špetka = 0,3 g', () => expect(toGrams(line(1, 'spetka'), sul)).toBeCloseTo(0.3))
})

describe('scaleLine', () => {
  test('sůl 1 lžička ze 4 na 1 porci → špetka', () => expect(scaleLine({ ingredientId: 'sul', amount: 1, unit: 'lzicka' }, sul, 0.25)).toEqual({ amount: 1, unit: 'spetka' }))
  test('vejce 8 ks ze 4 na 20,4 osob', () => expect(scaleLine({ ingredientId: 'vejce', amount: 8, unit: 'ks' }, vejce, 20.4 / 4)).toEqual({ amount: 41, unit: 'ks' }))
  test('mléko 500 ml ze 4 na 100', () => expect(scaleLine({ ingredientId: 'mleko', amount: 500, unit: 'ml' }, mleko, 25)).toEqual({ amount: 12500, unit: 'ml' }))
})
```
- [ ] **Step 2: RED** → FAIL.
- [ ] **Step 3: Implementace** `src/domain/scaling.ts`:
```ts
import type { Ingredient, IngredientLine, ScalingClass, Unit } from './types'

/** Exponenty škálování podle třídy suroviny (spec §3). */
export const SCALING_EXPONENT: Record<ScalingClass, number> = {
  linear: 1, seasoning: 0.85, aromatic: 0.92, leavening: 0.8, fat: 0.9, vessel: 0.6,
}
export const DEFAULT_CHILD_COEF = 0.8
/** Hmotnost jedné špetky v gramech pro nutriční odhad. */
export const PINCH_GRAMS = 0.3

export function personEquivalent(adults: number, children: number, childCoef = DEFAULT_CHILD_COEF, dayFactor = 1): number {
  return (adults + children * childCoef) * dayFactor
}

export function scaleFactor(k: number, scaling: ScalingClass): number {
  if (!(k > 0)) return 0
  return Math.pow(k, SCALING_EXPONENT[scaling])
}

export function scaleAmount(amount: number, k: number, scaling: ScalingClass): number {
  return amount * scaleFactor(k, scaling)
}

const roundTo = (v: number, step: number) => Math.round(v / step) * step
const ceilTo = (v: number, step: number) => Math.ceil(v / step - 1e-9) * step

export function roundAmount(amount: number, unit: Unit): { amount: number; unit: Unit } {
  if (unit === 'spetka') return { amount: 1, unit }
  if (unit === 'g' || unit === 'ml') {
    if (amount < 1) return { amount: 1, unit: 'spetka' }
    if (amount <= 20) return { amount: Math.max(1, Math.round(amount)), unit }
    if (amount <= 200) return { amount: roundTo(amount, 5), unit }
    return { amount: roundTo(amount, 10), unit }
  }
  // ks, lzice, lzicka, hrnek: nahoru na 0,5
  return { amount: ceilTo(amount, 0.5), unit }
}

export function toGrams(line: IngredientLine, ingredient: Ingredient): number | null {
  switch (line.unit) {
    case 'g': return line.amount
    case 'ml': return line.amount * (ingredient.densityGPerMl ?? 1)
    case 'spetka': return PINCH_GRAMS
    default: {
      const perUnit = ingredient.units[line.unit]
      return perUnit === undefined ? null : perUnit * line.amount
    }
  }
}

export function scaleLine(line: IngredientLine, ingredient: Ingredient, k: number): { amount: number; unit: Unit } {
  if (line.unit === 'spetka') return { amount: 1, unit: 'spetka' }
  const scaled = scaleAmount(line.amount, k, ingredient.scaling)
  // malé množství v kusových/lžícových jednotkách převést na gramy, aby šlo poznat „špetku“
  if (line.unit !== 'g' && line.unit !== 'ml') {
    const perUnit = ingredient.units[line.unit]
    if (perUnit !== undefined && scaled * perUnit < 1) return { amount: 1, unit: 'spetka' }
  }
  return roundAmount(scaled, line.unit)
}
```
- [ ] **Step 4: GREEN**, commit `feat(domain): škálovací engine a zaokrouhlování`.

---

### Task 3: Skript pro výtah z USDA (`data/sources/usda-index.json`) a seed surovin

**Files:**
- Create: `scripts/build-usda-index.ts`, `scripts/build-usda-index.test.ts`, `vendor/README.md`, `data/sources/usda-index.json` (generovaný, commitovaný), `data/sources/tandoor-seed.json` (generovaný)
- Modify: `.gitignore` (přidat `vendor/`, odebrat `data/`, přidat `userdata/`), `package.json` (script `"build:usda": "tsx scripts/build-usda-index.ts"`)

**Interfaces:**
- Produces `data/sources/usda-index.json`: pole záznamů `{ fdcId: number, ndb: string, description: string, group: string, kcal: number, protein: number, carbs: number, fat: number, fiber: number, refusePct: number, refuseDesc: string, portions: { desc: string, grams: number }[] }` pro všech ~7 800 SR Legacy potravin (odhad 2–3 MB, nepatří do bundlu aplikace, jen pro agenty a skripty).
- Produces `data/sources/tandoor-seed.json`: pole `{ tandoorId, name, storeCategory, fdcId, macros: {kcal?,protein?,carbs?,fat?}, usda?: záznam z indexu (když fdcId je v SR Legacy), conversions: {baseAmount, baseUnit, convertedAmount, convertedUnit}[] }` pro všech 391 Tandoor položek.
- Čtení vstupů: `vendor/usda/sr_legacy/food.csv` (fdc_id, description, food_category_id), `sr_legacy_food.csv` (fdc_id→NDB_number), `food_nutrient.csv` (fdc_id, nutrient_id ∈ {1008,1003,1005,1004,1079}, amount), `vendor/usda/FOOD_DES.txt` (pole oddělená `^`, hodnoty v `~`; sloupce: NDB_No, FdGrp_Cd, Long_Desc, Shrt_Desc, ComName, ManufacName, Survey, Ref_desc, Refuse, …), `WEIGHT.txt` (NDB_No, Seq, Amount, Msre_Desc, Gm_Wgt), `FD_GROUP.txt` (FdGrp_Cd, FdGrp_Desc). Soubory SR28 jsou v latin-1, číst s `latin1`.

- [ ] **Step 1: `vendor/README.md`** – odkud stáhnout (FDC SR Legacy CSV 2018-04: https://fdc.nal.usda.gov/download-datasets, SR28 ASCII: https://www.ars.usda.gov/ARSUserFiles/80400535/DATA/SR/sr28/dnload/sr28asc.zip, open-tandoor-data: https://github.com/TandoorRecipes/open-tandoor-data) a do jakých cest rozbalit (`vendor/usda/sr_legacy/*.csv`, `vendor/usda/FOOD_DES.txt|WEIGHT.txt|FD_GROUP.txt`, `vendor/open-tandoor-data/food.json|conversion.json`). Licence: USDA CC0, Tandoor ODbL/DbCL.
- [ ] **Step 2: `.gitignore`**: nahradit řádek `data/` řádky `userdata/` a `vendor/`.
- [ ] **Step 3: Test** `scripts/build-usda-index.test.ts` (testuje parsovací funkce na vložených řetězcích, ne na vendor datech):
```ts
import { parseSr28Line, parseCsvLine, buildIndex } from './build-usda-index'

test('parseSr28Line rozdělí ^ a odstraní ~', () => {
  expect(parseSr28Line('~01001~^~0100~^~Butter, salted~^~BUTTER~^~~^~~^~Y~^~~^0^~~^6.38^4.27^8.79^3.87')).toEqual(['01001', '0100', 'Butter, salted', 'BUTTER', '', '', 'Y', '', '0', '', '6.38', '4.27', '8.79', '3.87'])
})
test('parseCsvLine zvládne uvozovky s čárkou', () => {
  expect(parseCsvLine('"167512","sr_legacy_food","Pillsbury, Biscuits","18"')).toEqual(['167512', 'sr_legacy_food', 'Pillsbury, Biscuits', '18'])
})
test('buildIndex spojí živiny, odpad a porce', () => {
  const idx = buildIndex({
    foods: [{ fdcId: 1, description: 'Butter, salted', categoryId: '1' }],
    ndbByFdc: new Map([[1, '01001']]),
    nutrients: [{ fdcId: 1, nutrientId: 1008, amount: 717 }, { fdcId: 1, nutrientId: 1003, amount: 0.85 }, { fdcId: 1, nutrientId: 1004, amount: 81.1 }, { fdcId: 1, nutrientId: 1005, amount: 0.06 }],
    refuse: new Map([['01001', { pct: 0, desc: '' }]]),
    groups: new Map([['0100', 'Dairy and Egg Products']]),
    groupByNdb: new Map([['01001', '0100']]),
    portions: new Map([['01001', [{ desc: 'tbsp', grams: 14.2 }]]]),
  })
  expect(idx).toEqual([{ fdcId: 1, ndb: '01001', description: 'Butter, salted', group: 'Dairy and Egg Products', kcal: 717, protein: 0.85, carbs: 0.06, fat: 81.1, fiber: 0, refusePct: 0, refuseDesc: '', portions: [{ desc: 'tbsp', grams: 14.2 }] }])
})
```
- [ ] **Step 4: Implementace** `scripts/build-usda-index.ts` – exportuje `parseSr28Line`, `parseCsvLine`, `buildIndex`, a `main()` spouštěný jen když `import.meta.url` odpovídá `process.argv[1]`. `main()`: načte vendor soubory (CSV streamovat po řádcích přes `node:readline`, `food_nutrient.csv` má 35 MB), vyfiltruje nutrient_id ∈ {1008,1003,1005,1004,1079}, sestaví index, zapíše `data/sources/usda-index.json` (JSON bez odsazení, UTF-8) a `data/sources/tandoor-seed.json` (z `vendor/open-tandoor-data/food.json` + `conversion.json`, `usda` doplní z indexu podle `fdc_id`). Na konci vypíše počty: potravin v indexu, Tandoor položek, kolik z nich má `usda`.
  Parsování: `parseCsvLine` – jednoduchý stavový automat pro uvozovky (`""` = uvozovka v hodnotě). `parseSr28Line` – `line.split('^').map(v => v.replace(/^~|~$/g, ''))`.
- [ ] **Step 5: Spustit** `npm run build:usda` → očekávám ~7 790 potravin, 391 Tandoor položek, z nich ≥ 150 s `usda` (SR Legacy pokrývá jen část Tandoor fdc_id, zbytek jsou Foundation/Branded). Zkontrolovat `grep -o '"description":"Butter, salted"[^}]*' data/sources/usda-index.json` → kcal 717.
- [ ] **Step 6: Commit** `feat(data): výtah USDA SR Legacy a Tandoor seed pro kurátorování surovin` (včetně generovaných JSON a `.gitignore`).

---

### Task 4: Kurátorovaná `data/ingredients.json` – dávka A (seed z Tandoor, položky 1–200)

**Files:**
- Create: `data/ingredients/a.json` (pole `Ingredient` dle Task 1)
- Reference: `data/sources/tandoor-seed.json`, `data/sources/usda-index.json`, `docs/superpowers/plans/2026-10-14-phase2-data-model.md` (Global Constraints – kategorie, alergeny, třídy)

Toto je kurátorský úkol pro agenta (ne kód). Postup pro každou Tandoor položku 1–200 v pořadí seedu:
1. Rozhodni, zda je surovina relevantní pro českou kuchyni / táborové vaření; vynech čistě americké značkové položky (např. „Bisquick“, „ranch dressing mix“). Cíl: z 200 vybrat ≈ 130–160.
2. `id` kebab-case bez diakritiky (`hladka-mouka`, `kureci-prsa`), `name` česky s diakritikou v 1. pádě, `aliases` 1–4 české varianty (`vajíčko`, `vejce slepičí`).
3. `category` z pevné sady; `scaling`: sůl/koření/bylinky/bujón → `seasoning`; česnek, zázvor, chilli, ocet, citronová šťáva → `aromatic`; prášek do pečiva, soda, droždí → `leavening`; olej, máslo, sádlo → `fat`; voda → `vessel`; vše ostatní `linear`.
4. `nutritionPer100g`: z `usda` (přednost) nebo z Tandoor `macros`; chybějící `fiber` dohledat v `usda-index.json` podle anglického popisu (`grep -i`), jinak 0 s poznámkou ve `sources.nutrition`. Kcal musí být v 0–900, součet protein+carbs+fat ≤ 100.
5. `units`: `ks` jen u kusových surovin (vejce 50, cibule 110, brambora 150, citron 80, mrkev 60, rajče 120, paprika 150, banán 120, jablko 150, stroužek česneku 5 — hodnoty z `usda` porcí, Tandoor konverzí, nebo běžné české hodnoty); `lzice` 15 ml × hustota / `lzicka` 5 ml × hustota / `hrnek` 250 ml × hustota pro sypké a tekuté (mouka hrnek 130, cukr hrnek 200, lžíce oleje 14, lžička soli 6, lžíce másla 14, hrnek rýže 200, hrnek mléka 250). `densityGPerMl` u tekutin (mléko 1,03, olej 0,92, med 1,42, voda 1).
6. `ediblePortion`: 1 − refusePct/100 z USDA (vejce 0,88, cibule 0,9, brambory 0,8, banán 0,64), jinak 1.
7. `allergens` podle EU 14 (mouka → `lepek`; mléko, máslo, sýr → `mleko`; vejce → `vejce`; ryby → `ryby`; sójová omáčka → `soja`, `lepek`; hořčice → `horcice`; celer → `celer`; ořechy → `orechy`; arašídy → `arasidy`).
8. `sources.nutrition` např. `"USDA SR Legacy fdc:171287"` nebo `"open-tandoor-data food-butter"`; `sources.units` / `sources.refuse` obdobně.
Výstup: `data/ingredients/a.json` = JSON pole, 2 mezery odsazení, seřazené podle `id`. Ověření: `npx tsx -e "import {IngredientSchema} from './src/domain/schema'; import fs from 'node:fs'; const a=JSON.parse(fs.readFileSync('data/ingredients/a.json','utf8')); let bad=0; for (const i of a){const r=IngredientSchema.safeParse(i); if(!r.success){bad++; console.log(i.id, r.error.issues[0])}} console.log(a.length, 'položek,', bad, 'chyb')"` → 0 chyb; duplicitní `id` žádné.
- [ ] **Step 1: Kurátorovat položky 1–200 seedu do `data/ingredients/a.json`**
- [ ] **Step 2: Ověřit schématem (příkaz výše), opravit chyby**
- [ ] **Step 3: Commit** `data(ingredients): dávka A kurátorovaných surovin`

---

### Task 5: Kurátorovaná `data/ingredients.json` – dávka B (seed 201–391) + české doplňky + sloučení

**Files:**
- Create: `data/ingredients/b.json`, `data/ingredients/cz.json`, `scripts/merge-ingredients.ts`, `data/ingredients.json` (generovaný, commitovaný)
- Modify: `package.json` (script `"build:ingredients": "tsx scripts/merge-ingredients.ts"`)

Postup jako v Task 4 pro seed 201–391 → `b.json`. Navíc `cz.json`: české suroviny, které v seedu chybí a recepty je potřebují (minimálně): `hladka-mouka`, `polohruba-mouka`, `hruba-mouka`, `tvaroh`, `smetana-na-vareni`, `zakysana-smetana`, `kysele-zeli`, `uzene-maso`, `spek`, `klobasa`, `parky`, `veprovy-bok`, `veprova-plec`, `hovezi-zadni`, `hovezi-predni`, `kureci-stehna`, `kureci-ctvrtky`, `majoranka`, `kmin-cely`, `kmin-mlety`, `sladka-paprika`, `palive-paprika`, `bobkovy-list`, `novy-koreni`, `cely-pepr`, `maggi` (→ raději `tekute-koreni`), `bujon-kostka`, `krupky`, `jahly`, `pohanka`, `cocka`, `hrach-puleny`, `fazole-suche`, `knedlikova-mouka` (ne, vynech), `strouhanka`, `rohlik`, `chleb`, `sterilovane-okurky`, `rajcatovy-protlak`, `kecup`, `horcice`, `ocet`, `sadlo`, `piskoty`, `vanilkovy-cukr`, `praskova-cukr`, `kakao`, `mak`, `povidla`, `med`, `dzem`, `sunka`. Nutriční hodnoty hledat v `usda-index.json` nejbližším ekvivalentem (tvaroh ≈ „Cheese, cottage, nonfat“/„quark“ není, použít „Cheese, cottage, lowfat 2 %“ a uvést to v `sources`), česká specifika (majoránka, kmín) jsou v USDA jako „Spices, marjoram, dried“, „Spices, caraway seed“.
`scripts/merge-ingredients.ts`: načte `data/ingredients/*.json`, zvaliduje každou položku `IngredientSchema`, zkontroluje duplicitní `id` a duplicitní `name` (case-insensitive), seřadí podle `id` a zapíše `data/ingredients.json` (2 mezery). Při chybě vypíše soubor, id a problém a skončí s kódem 1. Test `scripts/merge-ingredients.test.ts`: funkce `mergeIngredients(lists: unknown[][]): { ok: true, items: Ingredient[] } | { ok: false, errors: string[] }` – duplicitní id → chyba; nevalidní položka → chyba s id; výsledek seřazený.
- [ ] **Step 1: `b.json`, `cz.json`** (kurátor)
- [ ] **Step 2: Test + `merge-ingredients.ts`** (TDD jako jinde), `npm run build:ingredients` → `data/ingredients.json` ≥ 280 položek, 0 chyb.
- [ ] **Step 3: Commit** `data(ingredients): dávka B, české doplňky a sloučený ingredients.json`

---

### Task 6: Validátor obsahu (`npm run validate`)

**Files:**
- Create: `scripts/validate.ts`, `scripts/validate.test.ts`, `scripts/fixtures/` (3 malé JSONy: platný recept, recept s neznámou surovinou, surovina se špatnými makry)
- Modify: `package.json` (`"validate": "tsx scripts/validate.ts"`)

**Interfaces:**
- Produces: `validateContent(ingredients: unknown[], recipes: { file: string; data: unknown }[]): { errors: string[]; warnings: string[]; stats: { ingredients: number; recipes: number } }`. Chyby (blokující): schéma; duplicitní id; `ingredientId` neexistuje („recept X: surovina Y neexistuje“); jednotka `ks/lzice/lzicka/hrnek` bez odpovídající `units` u suroviny; `original.ingredientId` neexistuje; makra: protein+carbs+fat > 100 nebo kcal mimo 0–900 (schéma už hlídá rozsahy, součet hlídá validátor); recept bez tagu `bez-masa`, ale žádná surovina z kategorie maso/ryby/uzeniny → warning; kcal na porci mimo 50–1500 → warning (výpočet: Σ toGrams × kcal/100 ÷ 4); recept s `verified:false` → warning s počtem.
- `main()`: načte `data/ingredients.json` a všechny `data/recipes/*.json`, vypíše chyby a varování, exit 1 při chybě, jinak vypíše statistiku.

- [ ] **Step 1: Testy** (z fixtures): platný obsah → 0 chyb; neznámá surovina → chyba obsahuje id receptu i suroviny; `ks` u suroviny bez `units.ks` → chyba; makra se součtem 120 → chyba; nulové množství → chyba (schéma); kcal na porci 20 → warning.
- [ ] **Step 2: Implementace**, `npm run validate` na reálných datech (zatím bez receptů) → 0 chyb.
- [ ] **Step 3: Commit** `feat(scripts): validátor surovin a receptů`

---

### Task 7: Skill `recipe-digitize` a pilotní digitalizace tří receptů

**Files:**
- Create: `.claude/skills/recipe-digitize/SKILL.md`, `.claude/skills/recipe-digitize/reference/units.md`, `.claude/skills/recipe-digitize/reference/afrs-card.md`, `.claude/skills/recipe-digitize/reference/example-recipe.json`, `data/recipes/README.md`
- Create (pilot): `data/recipes/dusena-ryze.json` (AFRS E 006 00 Steamed Rice), `data/recipes/hovezi-gulas.json` (AFRS L 065 00 Hungarian Goulash), `data/recipes/cockova-polevka.json` (Navy 1944 Lentil Soup, `verified:false` pokud čísla z OCR nejistá).

**SKILL.md** (frontmatter `name: recipe-digitize`, `description: Přepis receptu z historické kuchařky do data/recipes/*.json – jednotky, přepočet na 4 porce, překlad, modernizace, mapování surovin`) obsahuje:
1. Vstupy: kód/strana receptu, zdrojový text v `extracted/<kniha>.txt` (najít `grep -n "=== PAGE N ==="`), případně stránka PDF jako obrázek pro ověření čísel (`docs/*.pdf`, `pdftoppm -f N -l N -r 150 -png`).
2. Postup: (a) vypsat suroviny s původním množstvím a výtěžkem; (b) převést US jednotky na gramy/ml podle `reference/units.md` (lb 453,6 g; oz 28,35 g; gal 3 785 ml; qt 946 ml; cup 237 ml; tbsp 15 ml; tsp 5 ml; zlomky `1-1/2` = 1,5; „1 lbs 8 oz“ = 680 g; objem sypkých surovin × hustota z `data/ingredients.json` `units.hrnek/250`); (c) přepočet z `originalYield` na 4 porce mocninnou funkcí podle `scaling` suroviny: `amount4 = amountOrig × (4/originalYield)^p` (exponenty linear 1, seasoning 0,85, aromatic 0,92, leavening 0,8, fat 0,9, vessel 0,6); (d) zaokrouhlit pravidly ze spec (g/ml na 1/5/10, ks na 0,5, pod 1 g „špetka“); (e) každou surovinu namapovat na existující `id` z `data/ingredients.json` (`grep '"id": "' data/ingredients.json`), neexistuje-li, přidat do `data/ingredients/cz.json` a spustit `npm run build:ingredients`; (f) modernizace: originální surovina do `original`, moderní do řádku (sušené mléko → mléko, sádlo zůstává, konzervovaná zelenina → čerstvá/mražená s `modernNote`); (g) kroky přeložit do češtiny, krátké imperativní věty, teploty °F → °C (350 °F = 175 °C), vynechat CCP/HACCP řádky; (h) metadata: kapitola, tagy (`levne` když hlavní suroviny jsou brambory/luštěniny/rýže/mouka/zelí; `tabor` když jde uvařit v jednom hrnci/kotlíku bez trouby; `kotlik` když postup je vaření/dušení na ohni), vybavení, alergeny (z surovin), `timeMinutes`, `difficulty`, `source {book, page, code, titleOriginal}`, `verified` (true jen když čísla pocházejí z AFRS nebo byla ověřena proti obrázku stránky), `quote` volitelně; (i) uložit jako `data/recipes/<id>.json`, spustit `npm run validate`, opravit chyby.
3. Pravidla kvality: název česky přirozeně („Hovězí guláš“, ne „Maďarský guláš po americku“); `titleOriginal` anglicky; množství na 4 porce musí vycházet realisticky (maso 120–200 g na porci, rýže 60–90 g suché, těstoviny 80–100 g suché, polévka 300–400 ml); u polévek voda jako `vessel`.
4. Kontrolní seznam před odevzdáním (schéma, kcal/porce rozumné, alergeny odpovídají surovinám, tagy z pevné sady).
`reference/afrs-card.md`: popis karty AFRS (Yield 100, Portion, tabulka Ingredient/Weight/Measure/Issue, Method s kroky, Notes) s příkladem E 006 00 a vysvětlením, že Weight má přednost před Measure.
`reference/example-recipe.json`: kompletní platný recept (dušená rýže) jako vzor.
`data/recipes/README.md`: jak přidat recept, odkaz na skill, `npm run validate`.

- [ ] **Step 1: Napsat skill a reference**
- [ ] **Step 2: Pilot: digitalizovat 3 recepty podle skillu** (dušená rýže AFRS E 006 00 str. ~297; hovězí guláš AFRS L 065 00; čočková polévka Navy 1944 – najít v `extracted/us-navy-cookbook-1944.txt` „LENTIL SOUP“). Každý projde `npm run validate` bez chyb. Doplněné suroviny do `cz.json` + `npm run build:ingredients`.
- [ ] **Step 3: Zapsat do SKILL.md poučení z pilotu** (co bylo nejasné).
- [ ] **Step 4: Commit** `feat(skill): recipe-digitize + 3 pilotní recepty`

---

### Task 8: Aktualizace specifikace

**Files:**
- Modify: `docs/superpowers/specs/2026-10-14-cookbook-design.md` §5.1 (cesty `data/ingredients.json`, `data/recipes/`, `data/sources/`), §5.2 (uživatelský stav v `userdata/user-state.json`), §5.1 pipeline (validátor je `scripts/validate.ts`, ne Python; skill cesta).

- [ ] **Step 1: Upravit spec**, commit `docs(spec): cesty dat a validátor v TypeScriptu`.
