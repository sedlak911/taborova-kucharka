import { DAY_FACTOR_MAX, DAY_FACTOR_MIN, DAY_FACTOR_STEP, DEFAULT_KCAL_TARGET, effectiveLine, onePersonScale, persons, recipeScale } from './portions'
import type { IngredientLine } from './types'

const portions = (adults: number, children: number, dayFactor = 1, childCoef = 0.8) => ({ people: { adults, children }, childCoef, dayFactor })

describe('persons', () => {
  test('18 dětí + 6 dospělých při 0,8 = 20,4', () => expect(persons(portions(6, 18))).toBeCloseTo(20.4))
  test('náročnost dne násobí', () => expect(persons(portions(2, 0, 1.25))).toBeCloseTo(2.5))
  test('vlastní koeficient dítěte', () => expect(persons(portions(0, 10, 1, 0.5))).toBeCloseTo(5))
})

describe('recipeScale', () => {
  test('k = P × násobek / baseServings', () => expect(recipeScale(20.4, 2, 4)).toBeCloseTo(10.2))
  test('4 osoby a ×1 = 1', () => expect(recipeScale(4, 1, 4)).toBe(1))
  test('jedna dospělá osoba při náročnosti 1,2 = 0,3', () => expect(onePersonScale(portions(6, 18, 1.2), 4)).toBeCloseTo(0.3))
})

test('meze náročnosti a výchozí cíl kcal ze specu', () => {
  expect([DAY_FACTOR_MIN, DAY_FACTOR_MAX, DAY_FACTOR_STEP]).toEqual([0.8, 1.3, 0.05])
  expect(DEFAULT_KCAL_TARGET).toBe(2300)
})

describe('effectiveLine', () => {
  const line: IngredientLine = {
    ingredientId: 'vejce', amount: 3.9, unit: 'ks', group: 'Těsto',
    original: { ingredientId: 'vejce-mrazena', amount: 195, unit: 'g' },
  }
  test('modernizovaně vrátí tentýž řádek', () => expect(effectiveLine(line, false)).toBe(line))
  test('historicky použije original a zachová skupinu', () =>
    expect(effectiveLine(line, true)).toEqual({ ingredientId: 'vejce-mrazena', amount: 195, unit: 'g', group: 'Těsto' }))
  test('řádek bez original zůstane i historicky', () => {
    const plain: IngredientLine = { ingredientId: 'sul', amount: 2, unit: 'g' }
    expect(effectiveLine(plain, true)).toBe(plain)
  })
  test('přepsání třídy vessel zůstane i u historické varianty', () =>
    expect(effectiveLine({ ...line, scaling: 'vessel' }, true).scaling).toBe('vessel'))
})
