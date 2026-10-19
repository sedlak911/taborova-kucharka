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
