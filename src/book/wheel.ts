import type { FlipDirection } from './flip'

/** Akumulovaný vodorovný posun, od kterého gesto otočí stránku. */
export const WHEEL_THRESHOLD_PX = 40
/** Pauza bez událostí, po které začíná nové gesto (debounce). */
export const WHEEL_GESTURE_GAP_MS = 400

const LINE_PX = 16
const PAGE_PX = 800

/** Nové gesto uprostřed doběhu: delta musí po poklesu znovu narůst aspoň na dvojnásobek minima a o tolik px. */
const REARM_RISE_PX = 6
/** Nejmenší delta, která se počítá jako nový tah prstů (ne šum dobíhající setrvačnosti). */
const REARM_MIN_PX = 8

export interface WheelGesture {
  lastT: number
  accX: number
  fired: boolean
  /** Největší |deltaX| od otočení (setrvačnost nejdřív dorůstá, pak klesá). */
  peak: number
  /** Nejmenší |deltaX| po vrcholu; Infinity = delta ještě neklesla. */
  trough: number
}

export interface WheelSample {
  deltaX: number
  deltaY: number
  /** WheelEvent.deltaMode: 0 = px, 1 = řádky, 2 = stránky. */
  deltaMode: number
  t: number
}

const freshGesture = (t: number): WheelGesture => ({ lastT: t, accX: 0, fired: false, peak: 0, trough: Number.POSITIVE_INFINITY })

/**
 * Jeden krok gesta vodorovného scrollu: sčítá deltaX, po překročení prahu otočí právě jednou;
 * dobíhající setrvačnost (momentum) stejného gesta už neotáčí. Převážně svislé události gesto jen prodlouží.
 * Setrvačnost trackpadu na macOS trvá i přes sekundu bez pauzy mezi událostmi, takže nové gesto se pozná
 * i bez pauzy: delta během doběhu klesá, a když znovu prudce naroste, položil uživatel prsty a táhne znovu.
 */
export function stepWheel(
  gesture: WheelGesture | null,
  s: WheelSample,
): { gesture: WheelGesture; fire: FlipDirection | null; horizontal: boolean } {
  const scale = s.deltaMode === 1 ? LINE_PX : s.deltaMode === 2 ? PAGE_PX : 1
  const dx = s.deltaX * scale
  const dy = s.deltaY * scale
  const abs = Math.abs(dx)
  const horizontal = abs > Math.abs(dy)
  let base: WheelGesture =
    gesture === null || s.t - gesture.lastT > WHEEL_GESTURE_GAP_MS ? freshGesture(s.t) : { ...gesture, lastT: s.t }
  if (!horizontal) return { gesture: base, fire: null, horizontal }
  if (base.fired) {
    const decayed = base.trough <= base.peak / 2
    const rearm = decayed && abs >= REARM_MIN_PX && abs >= base.trough * 2 && abs >= base.trough + REARM_RISE_PX
    if (rearm) base = freshGesture(s.t)
    else if (abs > base.peak && !decayed) base = { ...base, peak: abs, trough: Number.POSITIVE_INFINITY }
    else if (abs < base.peak) base = { ...base, trough: Math.min(base.trough, abs) }
  }
  const accX = base.accX + dx
  if (!base.fired && Math.abs(accX) >= WHEEL_THRESHOLD_PX) {
    return { gesture: { ...base, accX, fired: true, peak: abs, trough: Number.POSITIVE_INFINITY }, fire: accX > 0 ? 'next' : 'prev', horizontal }
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
