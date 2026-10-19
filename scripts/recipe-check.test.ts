import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { checkRecipe, formatCheck, formatStepTimeline, parseCheckArgs } from './recipe-check'
import { RecipeSchema } from '../src/domain/schema'
import type { Ingredient, Recipe } from '../src/domain/types'

const fx = (f: string) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(`./fixtures/${f}`)), 'utf8'))
const voda: Ingredient = {
  id: 'voda', name: 'Voda', aliases: [], category: 'napoje', scaling: 'linear',
  nutritionPer100g: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }, units: {}, ediblePortion: 1, allergens: [], sources: { nutrition: 'test' },
}
const byId = new Map<string, Ingredient>([...(fx('ingredients.json') as Ingredient[]), voda].map((i) => [i.id, i]))
const base: Recipe = RecipeSchema.parse(fx('recipe-valid.json'))
const recipe = (lines: Recipe['ingredients'], extra: Partial<Recipe> = {}): Recipe => ({ ...base, ...extra, ingredients: lines })

describe('checkRecipe', () => {
  it('spočítá gramy, kcal a hodnoty na porci; vessel řádky nepočítá', () => {
    const r = checkRecipe(recipe([
      { ingredientId: 'veprove', amount: 600, unit: 'g' },
      { ingredientId: 'sul', amount: 6, unit: 'g' },
      { ingredientId: 'voda', amount: 2000, unit: 'ml', scaling: 'vessel' },
    ]), byId)
    expect(r.rows.map((x) => x.grams)).toEqual([600, 6, 2000])
    expect(r.perPortion.massG).toBe(151.5)
    expect(r.perPortion.meatG).toBe(150)
    expect(r.perPortion.saltG).toBe(1.5)
    expect(r.perPortion.kcal).toBe(360)
    expect(r.flags).toEqual([])
  })

  it('dvě vody bez vessel = nález (voda na vaření vedená jako jídlo)', () => {
    const r = checkRecipe(recipe([
      { ingredientId: 'veprove', amount: 600, unit: 'g' },
      { ingredientId: 'voda', amount: 500, unit: 'ml' },
      { ingredientId: 'voda', amount: 1500, unit: 'ml' },
    ]), byId)
    expect(r.flags.some((f) => f.includes('voda je 2×'))).toBe(true)
  })

  it('bilance proti porci zdroje: 2× těžší porce je nález', () => {
    const lines: Recipe['ingredients'] = [{ ingredientId: 'veprove', amount: 600, unit: 'g' }, { ingredientId: 'voda', amount: 2000, unit: 'ml' }]
    expect(checkRecipe(recipe(lines), byId, { sourcePortion: '1-1/4 cup' }).flags.some((f) => f.startsWith('bilance'))).toBe(true)
    expect(checkRecipe(recipe(lines), byId, { sourcePortion: '2-1/2 cup' }).flags.some((f) => f.startsWith('bilance'))).toBe(false)
  })

  it('kcal vs. karta nad 25 % je nález; do 25 % ne', () => {
    const lines: Recipe['ingredients'] = [{ ingredientId: 'veprove', amount: 600, unit: 'g' }]
    expect(checkRecipe(recipe(lines), byId, { sourceKcal: 200 }).flags.some((f) => f.includes('vs. zdroj 200'))).toBe(true)
    expect(checkRecipe(recipe(lines), byId, { sourceKcal: 330 }).flags.some((f) => f.includes('vs. zdroj'))).toBe(false)
  })

  it('sůl, maso a polévka mimo rozsah', () => {
    const r = checkRecipe(recipe([
      { ingredientId: 'veprove', amount: 100, unit: 'g' },
      { ingredientId: 'sul', amount: 20, unit: 'g' },
      { ingredientId: 'voda', amount: 200, unit: 'ml' },
    ], { chapter: 'polevky' }), byId)
    expect(r.flags.some((f) => f.startsWith('sůl'))).toBe(true)
    expect(r.flags.some((f) => f.startsWith('maso'))).toBe(false)
    expect(r.flags.some((f) => f.startsWith('polévka'))).toBe(true)
    const stew = checkRecipe(recipe([{ ingredientId: 'veprove', amount: 100, unit: 'g' }], { chapter: 'z-jednoho-hrnce' }), byId)
    expect(stew.flags.some((f) => f.startsWith('maso'))).toBe(true)
  })

  it('méně než 1 g u suroviny, která není koření, je nález; neznámá surovina také', () => {
    const r = checkRecipe(recipe([{ ingredientId: 'mouka', amount: 0.5, unit: 'g' }, { ingredientId: 'x', amount: 1, unit: 'g' }]), byId)
    expect(r.flags.some((f) => f.includes('méně než 1 g'))).toBe(true)
    expect(r.flags.some((f) => f.includes('není v katalogu'))).toBe(true)
  })

  it('výpis obsahuje tabulku, řádek na porci a nálezy', () => {
    const rec = recipe([{ ingredientId: 'veprove', amount: 600, unit: 'g', original: { ingredientId: 'veprove', amount: 500, unit: 'g' } }])
    const text = formatCheck(rec, checkRecipe(rec, byId))
    expect(text).toContain('veprove | 600 g | 600,0 | linear | 1440 | veprove 500 g')
    expect(text).toContain('na porci: 150 g')
    expect(text).toContain('KONTROLA: bez nálezů')
    expect(text).toContain('hotovo: 0:00 (0 min; timeMinutes 30)')
  })
})

describe('parseCheckArgs', () => {
  it('id z cesty i s příponou, --portion a --kcal', () => {
    expect(parseCheckArgs(['data/recipes/chili-makarony.json', '--portion', '1-1/4 cup', '--kcal', '330']))
      .toEqual({ id: 'chili-makarony', opts: { sourcePortion: '1-1/4 cup', sourceKcal: 330 } })
    expect(() => parseCheckArgs([])).toThrow('Použití')
  })
})

describe('formatStepTimeline (R3)', () => {
  it('začátek každého kroku, mezitím, minuty, hotovo a timeMinutes', () => {
    const r = recipe(base.ingredients, {
      steps: [
        { text: 'Smíchej těsto.', minutes: 5 },
        { text: 'Mezitím rozehřej pánev.', minutes: 3, parallel: true },
        { text: 'Peč palačinky po jedné.', minutes: 20 },
        { text: 'Podávej.' },
      ],
    })
    expect(formatStepTimeline(r)).toEqual([
      'krok | začátek | min | text',
      '1 | 0:00 | 5 | Smíchej těsto.',
      '2 | mezitím | 3 | Mezitím rozehřej pánev.',
      '3 | 5:00 | 20 | Peč palačinky po jedné.',
      '4 | 25:00 | – | Podávej.',
      'hotovo: 25:00 (25 min; timeMinutes 30)',
    ])
  })

  it('dlouhý text kroku se zkrátí na 60 znaků', () => {
    const long = 'x'.repeat(80)
    expect(formatStepTimeline(recipe(base.ingredients, { steps: [{ text: long, minutes: 70 }] }))[1]).toBe(`1 | 0:00 | 70 | ${'x'.repeat(59)}…`)
  })
})
