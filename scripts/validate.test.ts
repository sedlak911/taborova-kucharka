import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { validateContent } from './validate'

const fx = (f: string) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(`./fixtures/${f}`)), 'utf8'))
const ings: unknown[] = fx('ingredients.json')
const valid = fx('recipe-valid.json')
const rec = (data: { id: string }, file = `${data.id}.json`) => [{ file, data }]
const vyvar = {
  id: 'vyvar', name: 'Vývar', aliases: [], category: 'konzervy', scaling: 'linear', containsMeat: true,
  nutritionPer100g: { kcal: 10, protein: 1, carbs: 1, fat: 0.5, fiber: 0 },
  units: {}, ediblePortion: 1, allergens: ['celer'], sources: { nutrition: 'test' },
}
const voda = { ...vyvar, id: 'voda', name: 'Voda', category: 'napoje', containsMeat: undefined, allergens: [], nutritionPer100g: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 } }
const ings2 = [...ings, vyvar, voda]
const withLines = (lines: unknown[], extra: object = {}) => ({ ...valid, ...extra, ingredients: lines })

describe('validateContent', () => {
  it('platný obsah nemá chyby', () => {
    const r = validateContent(ings, rec(valid))
    expect(r.errors).toEqual([])
    expect(r.stats).toEqual({ ingredients: 4, recipes: 1 })
  })

  it('neznámá surovina: chyba obsahuje id receptu i suroviny', () => {
    const r = validateContent(ings, rec(fx('recipe-unknown-ingredient.json')))
    expect(r.errors.some((e) => e.includes('gulas') && e.includes('neexistuje'))).toBe(true)
  })

  it('verified:false dává varování', () => {
    const r = validateContent(ings, rec(fx('recipe-unknown-ingredient.json')))
    expect(r.warnings.some((w) => w.includes('verified'))).toBe(true)
  })

  it('ks u suroviny bez units.ks je chyba', () => {
    const r = validateContent(ings, rec(withLines([{ ingredientId: 'mouka', amount: 2, unit: 'ks' }])))
    expect(r.errors.some((e) => e.includes('palacinky') && e.includes('mouka') && e.includes('ks'))).toBe(true)
  })

  it('original.ingredientId, který neexistuje, je chyba', () => {
    const r = validateContent(ings, rec(withLines([{ ingredientId: 'mouka', amount: 200, unit: 'g', original: { ingredientId: 'nic', amount: 1, unit: 'g' } }])))
    expect(r.errors.some((e) => e.includes('nic'))).toBe(true)
  })

  it('makra se součtem nad 100 jsou chyba', () => {
    const r = validateContent([...ings, fx('ingredient-bad-macros.json')], [])
    expect(r.errors.some((e) => e.includes('spatna-makra'))).toBe(true)
  })

  it('duplicitní id suroviny je chyba', () => {
    const r = validateContent([...ings, ings[0]], [])
    expect(r.errors.some((e) => e.includes('mouka') && e.includes('duplicit'))).toBe(true)
  })

  it.each([0, -5])('množství %s je chyba (schéma) zmiňující řádek a amount', (amount) => {
    const r = validateContent(ings, rec(withLines([{ ingredientId: 'mouka', amount, unit: 'g' }])))
    expect(r.errors.some((e) => e.includes('ingredients.0.amount'))).toBe(true)
  })

  it('duplicitní id receptu je chyba se jménem souboru', () => {
    const r = validateContent(ings, [{ file: 'a.json', data: valid }, { file: 'b.json', data: valid }])
    expect(r.errors.some((e) => e.includes('palacinky') && e.includes('duplicitní') && e.includes('b.json'))).toBe(true)
  })

  it('kcal varování se u receptu s chybou nevypisuje', () => {
    const r = validateContent(ings, rec(withLines([{ ingredientId: 'mouka', amount: 22, unit: 'g' }, { ingredientId: 'nic', amount: 1, unit: 'g' }])))
    expect(r.errors.length).toBeGreaterThan(0)
    expect(r.warnings.some((w) => w.includes('kcal'))).toBe(false)
  })

  it('kcal na porci 20 je varování', () => {
    const r = validateContent(ings, rec(withLines([{ ingredientId: 'mouka', amount: 22, unit: 'g' }])))
    expect(r.warnings.some((w) => w.includes('kcal'))).toBe(true)
  })

  const kure = { ...vyvar, id: 'kure', name: 'Kuře', category: 'maso', containsMeat: undefined, allergens: [], ediblePortion: 0.5, nutritionPer100g: { kcal: 200, protein: 20, carbs: 0, fat: 10, fiber: 0 } }

  it('kcal se u masa s kostí počítají z jedlé části (4000 g × 0,5 → 1000 kcal/porci, bez varování)', () => {
    const r = validateContent([...ings, kure], rec(withLines([{ ingredientId: 'kure', amount: 4000, unit: 'g' }], { tags: [] })))
    expect(r.errors).toEqual([])
    expect(r.warnings.some((w) => w.includes('kcal'))).toBe(false)
  })

  it('bez odpadu by stejné maso překročilo 1500 kcal/porci (kontrola testu)', () => {
    const r = validateContent([...ings, { ...kure, ediblePortion: 1 }], rec(withLines([{ ingredientId: 'kure', amount: 4000, unit: 'g' }], { tags: [] })))
    expect(r.warnings.some((w) => w.includes('2000 kcal'))).toBe(true)
  })

  it('bez tagu bez-masa a bez masa je varování', () => {
    const r = validateContent(ings, rec(withLines([{ ingredientId: 'mouka', amount: 400, unit: 'g' }], { tags: [] })))
    expect(r.warnings.some((w) => w.includes('bez-masa'))).toBe(true)
  })

  it('id receptu různé od názvu souboru je chyba', () => {
    const r = validateContent(ings, [{ file: 'jine.json', data: valid }])
    expect(r.errors.some((e) => e.includes('palacinky') && e.includes('jine.json'))).toBe(true)
  })

  it('chybějící alergen suroviny je chyba se jménem receptu a alergenu', () => {
    const r = validateContent(ings, rec({ ...valid, allergens: ['lepek'] }))
    expect(r.errors.some((e) => e.includes('palacinky') && e.includes('alergen vejce'))).toBe(true)
  })

  it('alergen z original řádku se také vyžaduje', () => {
    const r = validateContent(ings, rec(withLines([{ ingredientId: 'mouka', amount: 400, unit: 'g', original: { ingredientId: 'vejce', amount: 2, unit: 'ks' } }], { allergens: ['lepek'] })))
    expect(r.errors.some((e) => e.includes('alergen vejce'))).toBe(true)
  })

  it('alergen uvedený navíc je varování', () => {
    const r = validateContent(ings, rec({ ...valid, allergens: ['lepek', 'vejce', 'mleko'] }))
    expect(r.errors).toEqual([])
    expect(r.warnings.some((w) => w.includes('palacinky') && w.includes('alergen mleko'))).toBe(true)
  })

  it('tag bez-masa s masem je chyba', () => {
    const r = validateContent(ings, rec(withLines([{ ingredientId: 'veprove', amount: 500, unit: 'g' }], { allergens: [] })))
    expect(r.errors.some((e) => e.includes('bez-masa') && e.includes('veprove'))).toBe(true)
  })

  it('tag bez-masa se surovinou containsMeat je chyba', () => {
    const r = validateContent(ings2, rec(withLines([{ ingredientId: 'mouka', amount: 400, unit: 'g' }, { ingredientId: 'vyvar', amount: 1000, unit: 'ml' }], { allergens: ['lepek', 'celer'] })))
    expect(r.errors.some((e) => e.includes('bez-masa') && e.includes('vyvar'))).toBe(true)
  })

  it('masový vývar (containsMeat) ruší varování o chybějícím bez-masa', () => {
    const r = validateContent(ings2, rec(withLines([{ ingredientId: 'mouka', amount: 400, unit: 'g' }, { ingredientId: 'vyvar', amount: 1000, unit: 'ml' }], { tags: [], allergens: ['lepek', 'celer'] })))
    expect(r.errors).toEqual([])
    expect(r.warnings.some((w) => w.includes('bez-masa'))).toBe(false)
  })

  it('jednotka ks v original u suroviny bez units.ks je chyba', () => {
    const r = validateContent(ings, rec(withLines([{ ingredientId: 'mouka', amount: 400, unit: 'g', original: { ingredientId: 'mouka', amount: 2, unit: 'ks' } }], { allergens: ['lepek'] })))
    expect(r.errors.some((e) => e.includes('original') && e.includes('mouka') && e.includes('ks'))).toBe(true)
  })

  it('ml u suroviny bez densityGPerMl je varování, u vody ne', () => {
    const r = validateContent(ings2, rec(withLines([
      { ingredientId: 'mouka', amount: 400, unit: 'g' },
      { ingredientId: 'vyvar', amount: 500, unit: 'ml' },
      { ingredientId: 'voda', amount: 500, unit: 'ml' },
    ], { tags: [], allergens: ['lepek', 'celer'] })))
    expect(r.warnings.some((w) => w.includes('vyvar') && w.includes('densityGPerMl'))).toBe(true)
    expect(r.warnings.some((w) => w.includes('voda') && w.includes('densityGPerMl'))).toBe(false)
  })

  it('ruční tag rychle u receptu nad 45 min je varování (ne chyba)', () => {
    const r = validateContent(ings, rec({ ...valid, timeMinutes: 60, tags: ['bez-masa', 'sladke', 'rychle'] }))
    expect(r.errors).toEqual([])
    expect(r.warnings.some((w) => w.includes('palacinky') && w.includes('rychle') && w.includes('60 min'))).toBe(true)
  })

  it('ruční tag rychle u receptu do 45 min varování nedává', () => {
    const r = validateContent(ings, rec({ ...valid, timeMinutes: 45, tags: ['bez-masa', 'sladke', 'rychle'] }))
    expect(r.warnings.some((w) => w.includes('rychle'))).toBe(false)
  })

  it('tag tabor u receptu s vybavením lednice je varování', () => {
    const r = validateContent(ings, rec({ ...valid, tags: ['bez-masa', 'sladke', 'tabor'], equipment: ['plotna', 'lednice'] }))
    expect(r.errors).toEqual([])
    expect(r.warnings.some((w) => w.includes('palacinky') && w.includes('lednice'))).toBe(true)
  })

  const book = (steps: unknown[], extra: object = {}) => ({ ...valid, source: { book: 'afrs-2003' }, steps, ...extra })
  const timingWarnings = (data: { id: string }) => validateContent(ings, rec(data)).warnings.filter((w) => /minut|minutes|parallel/.test(w))

  it('knižní recept bez minut u kroků je varování, vlastní recept ne (R3)', () => {
    expect(timingWarnings(book(['Smíchat těsto.', 'Péct na pánvi.']))).toEqual([
      'recept palacinky: žádný krok nemá minutes (časování kroků; návrh: npm run step-times -- palacinky)',
    ])
    expect(timingWarnings(valid)).toEqual([])
  })

  it('součet minut kroků nad timeMinutes je varování', () => {
    expect(timingWarnings(book([{ text: 'Smíchat těsto.', minutes: 20 }, { text: 'Péct.', minutes: 15 }]))).toEqual([
      'recept palacinky: součet minut kroků 35 je větší než timeMinutes 30',
    ])
  })

  it('součet minut kroků pod polovinou timeMinutes je varování', () => {
    expect(timingWarnings(book([{ text: 'Smíchat těsto.', minutes: 10 }, { text: 'Péct.', minutes: 4 }]))).toEqual([
      'recept palacinky: součet minut kroků 14 je menší než polovina timeMinutes 30',
    ])
  })

  it('součet v rozsahu ½–1× timeMinutes je bez varování; souběžný krok se nepočítá', () => {
    expect(timingWarnings(book([{ text: 'a', minutes: 20 }, { text: 'b', minutes: 10 }, { text: 'c', minutes: 25, parallel: true }]))).toEqual([])
    expect(timingWarnings(book([{ text: 'a', minutes: 15 }]))).toEqual([])
  })

  it('souběžný první krok je varování', () => {
    expect(timingWarnings(book([{ text: 'a', minutes: 20, parallel: true }, { text: 'b', minutes: 5 }]))).toEqual([
      'recept palacinky: první krok má parallel, ale nemá předchozí krok (počítá se jako běžný)',
    ])
  })
})
