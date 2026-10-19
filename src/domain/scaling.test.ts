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
  test('scaleAmount násobí faktorem', () => expect(scaleAmount(100, 2, 'linear')).toBe(200))
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
  test('sůl 1 lžička ze 4 na 1 porci → půl lžičky', () => expect(scaleLine({ ingredientId: 'sul', amount: 1, unit: 'lzicka' }, sul, 0.25)).toEqual({ amount: 0.5, unit: 'lzicka' }))
  test('sůl 1/4 lžičky ze 4 na 1 porci → špetka', () => expect(scaleLine({ ingredientId: 'sul', amount: 0.25, unit: 'lzicka' }, sul, 0.25)).toEqual({ amount: 1, unit: 'spetka' }))
  test('vejce 8 ks ze 4 na 20,4 osob', () => expect(scaleLine({ ingredientId: 'vejce', amount: 8, unit: 'ks' }, vejce, 20.4 / 4)).toEqual({ amount: 41, unit: 'ks' }))
  test('mléko 500 ml ze 4 na 100', () => expect(scaleLine({ ingredientId: 'mleko', amount: 500, unit: 'ml' }, mleko, 25)).toEqual({ amount: 12500, unit: 'ml' }))
  const bobek: Ingredient = { ...sul, id: 'bobkovy-list', name: 'Bobkový list', units: { ks: 0.2 } }
  test('bobkový list 1,15 ks při k = 5,1 (0,92 g) zůstane v kusech: 5 ks, ne špetka', () =>
    expect(scaleLine({ ingredientId: 'bobkovy-list', amount: 1.15, unit: 'ks' }, bobek, 5.1)).toEqual({ amount: 5, unit: 'ks' }))
  test('lžička pod 1 g pořád dává špetku, kus ne', () => {
    expect(scaleLine({ ingredientId: 'sul', amount: 0.1, unit: 'lzicka' }, sul, 1)).toEqual({ amount: 1, unit: 'spetka' })
    expect(scaleLine({ ingredientId: 'bobkovy-list', amount: 1, unit: 'ks' }, bobek, 1)).toEqual({ amount: 1, unit: 'ks' })
  })
  const voda: Ingredient = { ...mleko, id: 'voda', name: 'Voda', scaling: 'linear', densityGPerMl: undefined }
  test('voda s přepsáním vessel: 1000 ml, k = 25 → 6900 ml', () => expect(scaleLine({ ingredientId: 'voda', amount: 1000, unit: 'ml', scaling: 'vessel' }, voda, 25)).toEqual({ amount: 6900, unit: 'ml' }))
  test('voda bez přepsání (linear): 1000 ml, k = 25 → 25000 ml', () => expect(scaleLine({ ingredientId: 'voda', amount: 1000, unit: 'ml' }, voda, 25)).toEqual({ amount: 25000, unit: 'ml' }))
})
