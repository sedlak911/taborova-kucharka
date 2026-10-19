import { parseSr28Line, parseCsvLine, buildIndex, toJsonLines } from './build-usda-index'

test('parseSr28Line rozdělí ^ a odstraní ~', () => {
  expect(parseSr28Line('~01001~^~0100~^~Butter, salted~^~BUTTER~^~~^~~^~Y~^~~^0^~~^6.38^4.27^8.79^3.87')).toEqual(['01001', '0100', 'Butter, salted', 'BUTTER', '', '', 'Y', '', '0', '', '6.38', '4.27', '8.79', '3.87'])
})
test('parseCsvLine zvládne uvozovky s čárkou', () => {
  expect(parseCsvLine('"167512","sr_legacy_food","Pillsbury, Biscuits","18"')).toEqual(['167512', 'sr_legacy_food', 'Pillsbury, Biscuits', '18'])
})
test('parseCsvLine zvládne zdvojené uvozovky', () => {
  expect(parseCsvLine('"1","say ""hi""",""')).toEqual(['1', 'say "hi"', ''])
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

describe('toJsonLines', () => {
  it('jeden záznam na řádek, končí novým řádkem', () => {
    const out = toJsonLines([{ a: 1 }, { b: 'x' }])
    expect(out).toBe('{"a":1}\n{"b":"x"}\n')
  })
})
