import { NOT_PURCHASED, buildShoppingList, toBaseQuantity, type ShoppingGroup } from './shopping'
import type { Ingredient, Recipe } from './types'

const base: Ingredient = {
  id: 'x', name: 'X', aliases: [], category: 'ostatni', scaling: 'linear',
  nutritionPer100g: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }, units: {}, ediblePortion: 1, allergens: [], sources: { nutrition: 'test' },
}
const vejce: Ingredient = { ...base, id: 'vejce', name: 'Vejce', category: 'mlecne-a-vejce', units: { ks: 50 } }
const vejceMrazena: Ingredient = { ...base, id: 'vejce-mrazena', name: 'Vejce mražená', category: 'mrazene' }
const sul: Ingredient = { ...base, id: 'sul', name: 'Sůl', category: 'koreni', scaling: 'seasoning', units: { lzicka: 6, lzice: 18 } }
const olej: Ingredient = { ...base, id: 'olej', name: 'Olej', category: 'tuky-a-oleje', scaling: 'fat', densityGPerMl: 0.92, units: { lzice: 14, lzicka: 4.6 } }
const voda: Ingredient = { ...base, id: 'voda', name: 'Voda', category: 'napoje', densityGPerMl: 1, units: { lzice: 15 } }
const mouka: Ingredient = { ...base, id: 'mouka', name: 'Mouka', category: 'trvanlive', units: { hrnek: 140 } }
const ingredients = new Map([vejce, vejceMrazena, sul, olej, voda, mouka].map((i) => [i.id, i]))

const recipe = (id: string, title: string, lines: Recipe['ingredients']): Recipe => ({
  id, title, chapter: 'polevky', baseServings: 4, timeMinutes: 10, difficulty: 1, tags: [], equipment: [], allergens: [],
  ingredients: lines, steps: [{ text: 'x' }], source: { book: 'vlastni' }, verified: true,
})
const omeleta = recipe('omeleta', 'Omeleta', [
  { ingredientId: 'vejce', amount: 6, unit: 'ks', original: { ingredientId: 'vejce-mrazena', amount: 300, unit: 'g' } },
  { ingredientId: 'sul', amount: 2, unit: 'g' },
  { ingredientId: 'olej', amount: 1, unit: 'lzice' },
])
const testo = recipe('testo', 'Těsto', [
  { ingredientId: 'vejce', amount: 2, unit: 'ks' },
  { ingredientId: 'mouka', amount: 1, unit: 'hrnek' },
  { ingredientId: 'mouka', amount: 60, unit: 'g' },
  { ingredientId: 'olej', amount: 20, unit: 'ml' },
])
const knedle = recipe('knedle', 'Knedlíky', [
  { ingredientId: 'voda', amount: 2000, unit: 'ml', scaling: 'vessel' },
  { ingredientId: 'sul', amount: 10, unit: 'g', scaling: 'vessel' },
  { ingredientId: 'sul', amount: 1, unit: 'spetka' },
])
const stipek = recipe('stipek', 'Štípek', [{ ingredientId: 'sul', amount: 1, unit: 'spetka' }])
const vazeni = recipe('vazeni', 'Vážená vejce', [{ ingredientId: 'vejce', amount: 100, unit: 'g' }])
const recipes = new Map([omeleta, testo, knedle, stipek, vazeni].map((r) => [r.id, r]))
const modern = { persons: 4, historical: false }

const items = (groups: ShoppingGroup[]) => groups.flatMap((g) => g.items)
const item = (groups: ShoppingGroup[], id: string) => items(groups).find((i) => i.ingredientId === id)

describe('toBaseQuantity', () => {
  test('g, ml a ks zůstávají', () => {
    expect(toBaseQuantity(5, 'g', sul)).toEqual({ amount: 5, unit: 'g' })
    expect(toBaseQuantity(5, 'ml', olej)).toEqual({ amount: 5, unit: 'ml' })
    expect(toBaseQuantity(2, 'ks', vejce)).toEqual({ amount: 2, unit: 'ks' })
  })
  test('lžíce tekutiny s hustotou → ml', () => {
    const q = toBaseQuantity(1, 'lzice', olej)
    expect(q.unit).toBe('ml')
    expect(q.amount).toBeCloseTo(14 / 0.92)
  })
  test('lžička bez hustoty → g', () => expect(toBaseQuantity(2, 'lzicka', sul)).toEqual({ amount: 12, unit: 'g' }))
  test('špetka → 0,3 g', () => expect(toBaseQuantity(1, 'spetka', sul)).toEqual({ amount: 0.3, unit: 'g' }))
  test('hrnek bez převodu v units → pojistka 250 ml', () => expect(toBaseQuantity(1, 'hrnek', sul)).toEqual({ amount: 250, unit: 'ml' }))
})

describe('buildShoppingList', () => {
  test('vejce ze dvou receptů se sečtou a mají rozpad po receptech', () => {
    const v = item(buildShoppingList([{ recipeId: 'omeleta', multiplier: 1 }, { recipeId: 'testo', multiplier: 1 }], recipes, ingredients, modern), 'vejce')!
    expect(v).toMatchObject({ name: 'Vejce', amount: 8, unit: 'ks' })
    expect(v.sources).toEqual([
      { recipeId: 'omeleta', title: 'Omeleta', amount: 6, unit: 'ks', vessel: false },
      { recipeId: 'testo', title: 'Těsto', amount: 2, unit: 'ks', vessel: false },
    ])
  })

  test('18 dětí + 6 dospělých (P = 20,4, k = 5,1): součet se zaokrouhlí z nezaokrouhlených hodnot', () => {
    const v = item(buildShoppingList([{ recipeId: 'omeleta', multiplier: 1 }, { recipeId: 'testo', multiplier: 1 }], recipes, ingredients, { persons: 20.4, historical: false }), 'vejce')!
    expect(v.amount).toBe(41) // 8 × 5,1 = 40,8 → nahoru na 0,5
    expect(v.sources.map((s) => s.amount)).toEqual([31, 10.5]) // 30,6 a 10,2
  })

  test('násobek ×2 zdvojnásobí lineární suroviny', () => {
    expect(item(buildShoppingList([{ recipeId: 'omeleta', multiplier: 2 }], recipes, ingredients, modern), 'vejce')!.amount).toBe(12)
  })

  test('hrnek mouky a gramy mouky v jednom receptu = jeden řádek a jeden záznam rozpadu', () => {
    const m = item(buildShoppingList([{ recipeId: 'testo', multiplier: 1 }], recipes, ingredients, modern), 'mouka')!
    expect(m).toMatchObject({ amount: 200, unit: 'g' })
    expect(m.sources).toHaveLength(1)
  })

  test('lžíce oleje (fat) a mililitry oleje se sečtou v ml', () => {
    const o = item(buildShoppingList([{ recipeId: 'omeleta', multiplier: 1 }, { recipeId: 'testo', multiplier: 1 }], recipes, ingredients, modern), 'olej')!
    expect(o).toMatchObject({ amount: 35, unit: 'ml' }) // 15,2 ml + 20 ml = 35,2 → 35
  })

  test('kusy a gramy téže suroviny se sečtou v gramech přes units.ks', () => {
    const v = item(buildShoppingList([{ recipeId: 'omeleta', multiplier: 1 }, { recipeId: 'vazeni', multiplier: 1 }], recipes, ingredients, modern), 'vejce')!
    expect(v).toMatchObject({ amount: 400, unit: 'g' }) // 6 × 50 g + 100 g
    expect(v.sources.map((s) => s.unit)).toEqual(['ks', 'g'])
  })

  test('historické suroviny: vejce mražená v kategorii mražené místo vajec', () => {
    const groups = buildShoppingList([{ recipeId: 'omeleta', multiplier: 1 }], recipes, ingredients, { persons: 4, historical: true })
    expect(item(groups, 'vejce')).toBeUndefined()
    expect(item(groups, 'vejce-mrazena')).toMatchObject({ amount: 300, unit: 'g' })
    expect(groups.find((g) => g.category === 'mrazene')).toBeDefined()
  })

  test('voda se nekupuje, sůl do vody je „podle nádoby“ a oba řádky soli jsou jeden záznam', () => {
    expect(NOT_PURCHASED.has('voda')).toBe(true)
    const groups = buildShoppingList([{ recipeId: 'knedle', multiplier: 1 }], recipes, ingredients, modern)
    expect(item(groups, 'voda')).toBeUndefined()
    const s = item(groups, 'sul')!
    expect(s).toMatchObject({ amount: 10, unit: 'g' }) // 10 g + špetka 0,3 g
    expect(s.sources).toEqual([{ recipeId: 'knedle', title: 'Knedlíky', amount: 10, unit: 'g', vessel: true }])
  })

  test('samotná špetka zůstane špetkou', () => {
    expect(item(buildShoppingList([{ recipeId: 'stipek', multiplier: 1 }], recipes, ingredients, modern), 'sul')!.unit).toBe('spetka')
  })

  test('skupiny v pořadí CATEGORIES, položky podle názvu', () => {
    const groups = buildShoppingList(
      [{ recipeId: 'omeleta', multiplier: 1 }, { recipeId: 'testo', multiplier: 1 }, { recipeId: 'knedle', multiplier: 1 }],
      recipes, ingredients, modern,
    )
    expect(groups.map((g) => g.category)).toEqual(['mlecne-a-vejce', 'koreni', 'tuky-a-oleje', 'trvanlive'])
  })

  test('neznámý recept a násobek 0 se přeskočí, prázdný košík = prázdný seznam', () => {
    expect(buildShoppingList([{ recipeId: 'neexistuje', multiplier: 1 }, { recipeId: 'omeleta', multiplier: 0 }], recipes, ingredients, modern)).toEqual([])
    expect(buildShoppingList([], recipes, ingredients, modern)).toEqual([])
  })
})

test('recept napsaný pro 2 porce se přepočítá z baseServings (P = 4 → dvojnásobek)', () => {
  const dvePorce: Recipe = { ...recipe('dve-porce', 'Dvě porce', [{ ingredientId: 'mouka', amount: 100, unit: 'g' }]), baseServings: 2 }
  const [group] = buildShoppingList([{ recipeId: 'dve-porce', multiplier: 1 }], new Map([[dvePorce.id, dvePorce]]), ingredients, modern)
  expect(group.items[0]).toMatchObject({ ingredientId: 'mouka', amount: 200, unit: 'g' })
})
