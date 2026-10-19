// src/domain/steps.test.ts
import { currentStepIndex, formatClock, formatStopwatch, isParallelStep, isStepTotalPlausible, STEP_TOTAL_MIN_RATIO, stepStartLabel, stepTimeline } from './steps'
import type { Step } from './types'

const steps: Step[] = [
  { text: 'Nakrájej cibuli.', minutes: 5 },
  { text: 'Osmaž cibuli.', minutes: 10 },
  { text: 'Osol.' },
  { text: 'Duš pod pokličkou.', minutes: 35 },
  { text: 'Mezitím uvař rýži.', minutes: 20, parallel: true },
]

describe('stepTimeline (spec §5.1 [R3])', () => {
  it('začátek = součet minut předchozích nesouběžných kroků; krok bez minut nic nepřidá; souběžný má null', () => {
    expect(stepTimeline(steps)).toEqual({
      steps: [{ startMinutes: 0 }, { startMinutes: 5 }, { startMinutes: 15 }, { startMinutes: 15 }, { startMinutes: null }],
      total: 50,
    })
  })

  it('souběžný krok uprostřed nesmaže čas dalších kroků', () => {
    const r = stepTimeline([{ text: 'a', minutes: 10 }, { text: 'b', minutes: 99, parallel: true }, { text: 'c', minutes: 5 }])
    expect(r.steps.map((s) => s.startMinutes)).toEqual([0, null, 10])
    expect(r.total).toBe(15)
  })

  it('parallel u prvního kroku se ignoruje (nemá předchozí krok)', () => {
    const r = stepTimeline([{ text: 'a', minutes: 5, parallel: true }, { text: 'b', minutes: 5 }])
    expect(r.steps.map((s) => s.startMinutes)).toEqual([0, 5])
    expect(r.total).toBe(10)
    expect(isParallelStep({ text: 'a', parallel: true }, 0)).toBe(false)
    expect(isParallelStep({ text: 'a', parallel: true }, 1)).toBe(true)
  })

  it('recept bez časů: všechny kroky začínají v 0, total 0', () => {
    expect(stepTimeline([{ text: 'a' }, { text: 'b' }])).toEqual({ steps: [{ startMinutes: 0 }, { startMinutes: 0 }], total: 0 })
  })
})

describe('formát stopek', () => {
  it.each([
    [0, '0:00'],
    [5, '5:00'],
    [35, '35:00'],
    [59, '59:00'],
    [60, '1:00:00'],
    [70, '1:10:00'],
    [600, '10:00:00'],
  ])('formatStopwatch(%d) = %s', (minutes, text) => expect(formatStopwatch(minutes)).toBe(text))

  it.each([
    [0, '0:00'],
    [1, '0:01'],
    [65, '1:05'],
    [59.9, '0:59'],
    [3605, '1:00:05'],
    [-3, '0:00'],
    [Number.NaN, '0:00'],
    [Number.POSITIVE_INFINITY, '0:00'],
    [Number.NEGATIVE_INFINITY, '0:00'],
  ])('formatClock(%d) = %s', (seconds, text) => expect(formatClock(seconds)).toBe(text))
})

describe('stepStartLabel', () => {
  it('null (souběžný krok) = „mezitím“, jinak značka stopek', () => {
    expect(stepStartLabel(null)).toBe('mezitím')
    expect(stepStartLabel(0)).toBe('0:00')
    expect(stepStartLabel(70)).toBe('1:10:00')
  })
})

describe('isStepTotalPlausible', () => {
  it('součet kroků musí ležet v intervalu [timeMinutes / 2, timeMinutes]', () => {
    expect(STEP_TOTAL_MIN_RATIO).toBe(0.5)
    expect(isStepTotalPlausible(30, 60)).toBe(true)
    expect(isStepTotalPlausible(60, 60)).toBe(true)
    expect(isStepTotalPlausible(29, 60)).toBe(false)
    expect(isStepTotalPlausible(61, 60)).toBe(false)
  })
})

describe('currentStepIndex (zvýraznění podle stopek)', () => {
  // začátky: 0, 5, 15 (Osol. bez minut), 15, mezitím; Hotovo 50
  it.each([
    [0, 0],
    [299, 0],
    [300, 1],
    [899, 1],
    [900, 3], // „Osol.“ nemá minuty – nezvýrazní se, běží „Duš“
    [2999, 3],
    [3000, null], // Hotovo
    [99999, null],
  ])('po %d s → krok %s', (seconds, index) => expect(currentStepIndex(steps, seconds)).toBe(index))

  it('souběžný krok se nezvýrazní nikdy; recept bez časů nic', () => {
    for (let s = 0; s < 3000; s += 60) expect(currentStepIndex(steps, s)).not.toBe(4)
    expect(currentStepIndex([{ text: 'a' }, { text: 'b' }], 10)).toBeNull()
  })
})
