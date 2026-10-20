import { WHEEL_GESTURE_GAP_MS, WHEEL_THRESHOLD_PX, inHorizontalScroller, stepWheel, type WheelGesture } from './wheel'

/** Přehraje vzorky [deltaX, deltaY, t, deltaMode?] a vrátí směry otočení. */
function run(samples: [number, number, number, number?][]): string[] {
  let g: WheelGesture | null = null
  const fired: string[] = []
  for (const [deltaX, deltaY, t, deltaMode = 0] of samples) {
    const r = stepWheel(g, { deltaX, deltaY, deltaMode, t })
    g = r.gesture
    if (r.fire) fired.push(r.fire)
  }
  return fired
}

test('konstanty', () => {
  expect(WHEEL_THRESHOLD_PX).toBe(40)
  expect(WHEEL_GESTURE_GAP_MS).toBe(400)
})

test('malé delty se sčítají do prahu a jedno gesto otočí jen jednou', () => {
  expect(run([[15, 0, 0], [15, 0, 16], [15, 0, 32], [30, 0, 48], [30, 0, 64]])).toEqual(['next'])
})

test('záporné deltaX = předchozí strana', () => {
  expect(run([[-50, 0, 0]])).toEqual(['prev'])
})

test('pod prahem se neotáčí', () => {
  expect(run([[10, 0, 0], [10, 0, 16]])).toEqual([])
})

test('pauza delší než 400 ms začne nové gesto', () => {
  expect(run([[50, 0, 0], [50, 0, 300], [50, 0, 701]])).toEqual(['next', 'next'])
})

test('převážně svislý scroll se nepočítá', () => {
  expect(run([[30, 60, 0], [30, 60, 16]])).toEqual([])
  expect(stepWheel(null, { deltaX: 5, deltaY: 1, deltaMode: 0, t: 0 }).horizontal).toBe(true)
  expect(stepWheel(null, { deltaX: 1, deltaY: 5, deltaMode: 0, t: 0 }).horizontal).toBe(false)
})

test('deltaMode 1 (řádky, Firefox) se převádí na px', () => {
  expect(run([[3, 0, 0, 1]])).toEqual(['next'])
})

test('inHorizontalScroller: jen prvek s overflow-x auto/scroll a skutečným přetečením', () => {
  const boundary = document.createElement('div')
  const scroller = document.createElement('div')
  const inner = document.createElement('span')
  scroller.style.overflowX = 'auto'
  scroller.append(inner)
  boundary.append(scroller)
  document.body.append(boundary)
  Object.defineProperty(scroller, 'clientWidth', { configurable: true, value: 300 })
  Object.defineProperty(scroller, 'scrollWidth', { configurable: true, value: 300 })
  expect(inHorizontalScroller(inner, boundary)).toBe(false)
  Object.defineProperty(scroller, 'scrollWidth', { configurable: true, value: 600 })
  expect(inHorizontalScroller(inner, boundary)).toBe(true)
  scroller.style.overflowX = 'hidden'
  expect(inHorizontalScroller(inner, boundary)).toBe(false)
  expect(inHorizontalScroller(null, boundary)).toBe(false)
  boundary.remove()
})

/** Průběh jednoho tahu trackpadu: rozjezd, vrchol a dlouhý doběh setrvačnosti bez pauzy, od času t0, události po 16 ms. */
function swipe(t0: number, sign = 1): [number, number, number][] {
  const deltas = [2, 6, 14, 28, 45, 60, 58, 50, 42, 35, 28, 22, 17, 13, 10, 8, 6, 5, 4, 3, 3, 2, 2, 1, 1, 1]
  return deltas.map((d, i) => [sign * d, 0, t0 + i * 16])
}

test('doběh setrvačnosti (bez pauzy, klesající delty) neotočí podruhé', () => {
  expect(run(swipe(0))).toEqual(['next'])
})

test('rozjezd s chvěním delt před vrcholem otočí jen jednou', () => {
  expect(run([[10, 0, 0], [35, 0, 16], [33, 0, 32], [50, 0, 48], [48, 0, 64], [62, 0, 80]])).toEqual(['next'])
})

test('nový tah uprostřed doběhu (delta znovu naroste) otočí hned, bez čekání na konec setrvačnosti', () => {
  const first = swipe(0).slice(0, 16) // doběh zrovna klesl na 8 px
  const second = swipe(16 * 16)
  expect(run([...first, ...second])).toEqual(['next', 'next'])
})

test('nový tah opačným směrem uprostřed doběhu otočí zpět', () => {
  const first = swipe(0).slice(0, 18)
  const second = swipe(18 * 16, -1)
  expect(run([...first, ...second])).toEqual(['next', 'prev'])
})

test('šum na konci doběhu (1–4 px) nové gesto nezačne', () => {
  expect(run([...swipe(0), [3, 0, 420], [1, 0, 436], [4, 0, 452], [2, 0, 468]])).toEqual(['next'])
})
