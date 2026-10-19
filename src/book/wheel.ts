import type { FlipDirection } from './flip'

/** Akumulovaný vodorovný posun, od kterého gesto otočí stránku. */
export const WHEEL_THRESHOLD_PX = 40
/** Pauza bez událostí, po které začíná nové gesto (debounce). */
export const WHEEL_GESTURE_GAP_MS = 400

const LINE_PX = 16
const PAGE_PX = 800

export interface WheelGesture {
  lastT: number
  accX: number
  fired: boolean
}

export interface WheelSample {
  deltaX: number
  deltaY: number
  /** WheelEvent.deltaMode: 0 = px, 1 = řádky, 2 = stránky. */
  deltaMode: number
  t: number
}

/**
 * Jeden krok gesta vodorovného scrollu: sčítá deltaX, po překročení prahu otočí právě jednou;
 * dobíhající setrvačnost (momentum) stejného gesta už neotáčí. Převážně svislé události gesto jen prodlouží.
 */
export function stepWheel(
  gesture: WheelGesture | null,
  s: WheelSample,
): { gesture: WheelGesture; fire: FlipDirection | null; horizontal: boolean } {
  const scale = s.deltaMode === 1 ? LINE_PX : s.deltaMode === 2 ? PAGE_PX : 1
  const dx = s.deltaX * scale
  const dy = s.deltaY * scale
  const fresh = gesture === null || s.t - gesture.lastT > WHEEL_GESTURE_GAP_MS
  const base: WheelGesture = fresh ? { lastT: s.t, accX: 0, fired: false } : { ...gesture, lastT: s.t }
  const horizontal = Math.abs(dx) > Math.abs(dy)
  if (!horizontal) return { gesture: base, fire: null, horizontal }
  const accX = base.accX + dx
  if (!base.fired && Math.abs(accX) >= WHEEL_THRESHOLD_PX) {
    return { gesture: { ...base, accX, fired: true }, fire: accX > 0 ? 'next' : 'prev', horizontal }
  }
  return { gesture: { ...base, accX }, fire: null, horizontal }
}

/** Je cíl uvnitř prvku, který sám vodorovně scrolluje (např. široká tabulka)? Pak gesto patří jemu. */
export function inHorizontalScroller(target: EventTarget | null, boundary: Element): boolean {
  let el = target instanceof Element ? target : null
  while (el && el !== boundary) {
    if (el instanceof HTMLElement) {
      const overflowX = getComputedStyle(el).overflowX
      if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1) return true
    }
    el = el.parentElement
  }
  return false
}
