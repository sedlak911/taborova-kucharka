import { describe, expect, it } from 'vitest'
import { difficultyDots, formatAmount, formatDate, formatDecimal, formatInteger, formatMacros, formatStopwatch, peopleBreakdown, peopleHeading, peopleLabel, plural, PRINT_HINT } from './labels'

describe('labels', () => {
  it('formatuje půlky a špetku', () => {
    expect(formatAmount(0.5, 'ks')).toBe('½ ks')
    expect(formatAmount(1.5, 'lzice')).toBe('1½ lžíce')
    expect(formatAmount(1, 'spetka')).toBe('špetka')
    expect(formatAmount(250, 'g')).toBe('250 g')
  })
  it('obtížnost jako tečky', () => {
    expect(difficultyDots(2)).toBe('●●○')
  })
  it('český tvar podle počtu (desetinné číslo = tvar pro 2–4)', () => {
    expect(plural(1, 'osobu', 'osoby', 'osob')).toBe('osobu')
    expect(plural(3, 'osobu', 'osoby', 'osob')).toBe('osoby')
    expect(plural(5, 'osobu', 'osoby', 'osob')).toBe('osob')
    expect(plural(0, 'osobu', 'osoby', 'osob')).toBe('osob')
    expect(plural(20.4, 'porci', 'porce', 'porcí')).toBe('porce')
  })
  it('popis osob', () => {
    expect(peopleLabel(1)).toBe('1 osobu')
    expect(peopleLabel(24)).toBe('24 osob')
    expect(peopleBreakdown({ adults: 6, children: 18 })).toBe('18 dětí + 6 dospělých')
    expect(peopleBreakdown({ adults: 1, children: 2 })).toBe('2 děti + 1 dospělý')
    expect(peopleBreakdown({ adults: 0, children: 1 })).toBe('1 dítě')
    expect(peopleBreakdown({ adults: 2, children: 0 })).toBe('')
    expect(peopleHeading({ adults: 6, children: 18 })).toBe('Pro 24 osob (18 dětí + 6 dospělých)')
    expect(peopleHeading({ adults: 2, children: 0 })).toBe('Pro 2 osoby')
  })
  it('desetinná a velká čísla, kg a l', () => {
    expect(formatDecimal(20.4)).toBe('20,4')
    expect(formatDecimal(1.15, 2)).toBe('1,15')
    expect(formatDecimal(4)).toBe('4')
    expect(formatInteger(2300)).toBe('2\u00a0300')
    expect(formatInteger(975.6)).toBe('976')
    expect(formatAmount(999, 'g')).toBe('999 g')
    expect(formatAmount(1230, 'g')).toBe('1,23 kg')
    expect(formatAmount(6900, 'ml')).toBe('6,9 l')
    expect(formatAmount(125000, 'g')).toBe('125 kg')
  })
  it('makra na porci', () => {
    expect(formatMacros({ kcal: 406.5, protein: 32.52, carbs: 9.6, fat: 25.7 })).toBe('407 kcal · bílkoviny 33 g · sacharidy 10 g · tuky 26 g')
  })
})

test('formatDate: „15. 10. 2026“', () => {
  expect(formatDate(new Date(2026, 9, 15))).toBe('15. 10. 2026')
  expect(formatDate(new Date(2026, 0, 3))).toBe('3. 1. 2026')
})

test('nápověda k záhlaví a zápatí (Chrome)', () => expect(PRINT_HINT).toBe('V dialogu tisku vypněte „Záhlaví a zápatí“.'))

test('labels re-exportuje formát stopek z domény (R3)', () => expect(formatStopwatch(70)).toBe('1:10:00'))
