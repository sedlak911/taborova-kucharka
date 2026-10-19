import { convertRow, drainedWaterMl, jsonValue, parseArgs, parseFraction, parseQuantity, formatRow } from './recipe-convert'

describe('parseFraction', () => {
  it('smíšená čísla a zlomky', () => {
    expect(parseFraction('1-1/2')).toBe(1.5)
    expect(parseFraction('1 1/2')).toBe(1.5)
    expect(parseFraction('3/4')).toBe(0.75)
    expect(parseFraction('1-7/8')).toBe(1.875)
    expect(parseFraction('2,5')).toBe(2.5)
    expect(parseFraction('1½')).toBe(1.5)
    expect(parseFraction('½')).toBe(0.5)
  })
  it('nesmysl je chyba', () => expect(() => parseFraction('abc')).toThrow('nerozumím'))
})

describe('parseQuantity', () => {
  it('hmotnost složená z lb a oz', () => {
    expect(parseQuantity('1 lbs 8 oz')).toEqual({ value: 453.6 + 8 * 28.35, kind: 'g' })
    expect(parseQuantity('8-1/2 lbs').value).toBeCloseTo(3855.6)
    expect(parseQuantity('1/2 oz').value).toBeCloseTo(14.175)
  })
  it('objem složený z gal a qt, cup a tbsp', () => {
    expect(parseQuantity('1 gal 1-1/4 qts')).toEqual({ value: 3785 + 1.25 * 946, kind: 'ml' })
    expect(parseQuantity('1/4 cup 1/3 tbsp').value).toBeCloseTo(59.25 + 5)
    expect(parseQuantity('1 tsp')).toEqual({ value: 5, kind: 'ml' })
  })
  it('metrické a německá libra', () => {
    expect(parseQuantity('1,5 kg')).toEqual({ value: 1500, kind: 'g' })
    expect(parseQuantity('2 l')).toEqual({ value: 2000, kind: 'ml' })
    expect(parseQuantity('1 Pfund')).toEqual({ value: 500, kind: 'g' })
  })
  it('neznámá jednotka a míchání hmotnosti s objemem jsou chyby', () => {
    expect(() => parseQuantity('3 cans')).toThrow('neznámá jednotka')
    expect(() => parseQuantity('1 lb 1 cup')).toThrow('míchání')
    expect(() => parseQuantity('')).toThrow('nerozumím množství')
  })
})

describe('convertRow', () => {
  it('Steamed Rice E 005 00: rýže, voda, sůl, olej (afrs-card.md)', () => {
    expect(convertRow('8-1/2 lbs:linear', 100).rounded).toBe(155)
    expect(convertRow('23 lbs:linear', 100).rounded).toBe(420)
    expect(convertRow('1-7/8 oz:seasoning', 100).rounded).toBe(3)
    expect(convertRow('1-1/2 oz:fat', 100).rounded).toBe(2)
  })
  it('vessel pro slévanou vodu a výtěžek 1 (Feldkochbuch je Kopf)', () => {
    expect(convertRow('8 gal:vessel', 100).factor).toBeCloseTo(0.145, 3)
    expect(convertRow('100 g:linear', 1).rounded).toBe(400)
    expect(convertRow('5 g:seasoning', 1).rounded).toBe(16)
  })
  it('kusy z gramů: vejce 50 g, zaokrouhleno na 0,05', () => {
    const r = convertRow('10 lbs:linear:ks=50', 100)
    expect(r.rounded).toBe(180)
    expect(r.pieces).toBeCloseTo(3.65)
  })
  it('koření v lžičkách přes hmotnost lžičky suroviny; pod 1 g se ukládá přesně', () => {
    const r = convertRow('1 tsp:seasoning:tsp=2.3', 100)
    expect(r.gramsViaUnit?.grams).toBeCloseTo(0.149, 2)
    expect(r.exact).toBe(true)
    expect(formatRow(r)).toContain('DO JSON: 0,15 g')
    expect(jsonValue(convertRow('3/8 oz:seasoning', 100))).toEqual({ amount: 0.69, unit: 'g' })
    expect(jsonValue(convertRow('10 lbs:linear:ks=50', 100))).toEqual({ amount: 3.65, unit: 'ks' })
    expect(convertRow('3 tbsp:seasoning:tbsp=6.9', 100).gramsViaUnit?.rounded).toBe(1)
    expect(() => convertRow('1 lb:seasoning:tsp=2.3', 100)).toThrow('jde jen z objemu')
    expect(() => convertRow('1 cup:linear:ks=50', 100)).toThrow('jde jen z hmotnosti')
  })

  it('špatná třída nebo třetí část je chyba', () => {
    expect(() => convertRow('1 lb:kg', 100)).toThrow('třída')
    expect(() => convertRow('1 lb:linear:foo', 100)).toThrow('ks=')
  })
  it('formátovaný řádek obsahuje zdroj, g, třídu, faktor a výsledek', () => {
    const line = formatRow(convertRow('8-1/2 lbs:linear', 100))
    expect(line).toContain('8-1/2 lbs | 3855,6 g | linear ×0.0400 | 154,22 g | DO JSON: 155 g')
  })
})

describe('drainedWaterMl', () => {
  it('těstoviny 1 l / 100 g na 0,5 l, polovina nahoru, minimum 1 l; brambory 1 l / kg', () => {
    expect(drainedWaterMl(220, 'pasta')).toBe(2000)
    expect(drainedWaterMl(165, 'pasta')).toBe(1500)
    expect(drainedWaterMl(175, 'pasta')).toBe(2000)
    expect(drainedWaterMl(73, 'pasta')).toBe(1000)
    expect(drainedWaterMl(600, 'potatoes')).toBe(1000)
    expect(drainedWaterMl(1800, 'potatoes')).toBe(2000)
  })
})

describe('parseArgs', () => {
  it('--yield, --pasta a specifikace', () => {
    expect(parseArgs(['--yield', '50', '1 lb:linear', '--pasta', '220'])).toEqual({ originalYield: 50, specs: ['1 lb:linear'], drained: [{ kind: 'pasta', grams: 220 }] })
    expect(parseArgs(['1 lb:linear']).originalYield).toBe(100)
    expect(() => parseArgs(['--yield', '0'])).toThrow('--yield')
  })
})
