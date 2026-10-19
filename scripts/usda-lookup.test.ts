import { searchUsda, formatUsda, parseJsonLines, MAX_RESULTS } from './usda-lookup'
import type { UsdaFood } from './build-usda-index'

const food = (fdcId: number, description: string): UsdaFood => ({
  fdcId, ndb: '', description, group: '', kcal: 20, protein: 0.86, carbs: 4.64, fat: 0.17, fiber: 1.7,
  refusePct: 18, refuseDesc: 'Stem ends, seeds and core',
  portions: [{ desc: 'cup, chopped', grams: 149 }, { desc: 'cup, sliced', grams: 92 }, { desc: 'tbsp', grams: 9.3 }, { desc: 'large', grams: 164 }],
})

describe('usda-lookup', () => {
  it('hledá podřetězec bez ohledu na velikost písmen', () => {
    const r = searchUsda([food(1, 'Peppers, sweet, green, raw'), food(2, 'Onions, raw')], 'SWEET, GREEN')
    expect(r.map((x) => x.fdcId)).toEqual([1])
  })

  it('vrátí nejvýše 20 výsledků', () => {
    const many = Array.from({ length: 30 }, (_, i) => food(i, `Beef ${i}`))
    expect(searchUsda(many, 'beef')).toHaveLength(MAX_RESULTS)
  })

  it('prázdný dotaz nic nevrátí', () => expect(searchUsda([food(1, 'x')], '  ')).toEqual([]))

  it('řádek obsahuje fdcId, makra, odpad a jen první 3 porce', () => {
    const line = formatUsda(food(170427, 'Peppers, sweet, green, raw'))
    expect(line).toContain('fdc:170427')
    expect(line).toContain('20 kcal, P 0.86, C 4.64, F 0.17, vl. 1.7')
    expect(line).toContain('odpad 18 %')
    expect(line).toContain('tbsp = 9.3 g')
    expect(line).not.toContain('large')
  })

  it('parseJsonLines přeskočí prázdné řádky', () => {
    expect(parseJsonLines('{"fdcId":1}\n\n{"fdcId":2}\n')).toHaveLength(2)
  })
})
