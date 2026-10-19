export type FlipDirection = 'next' | 'prev'

export interface FlipState {
  direction: FlipDirection
  progress: number
  dragging: boolean
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Průběh otáčení 0..1 podle vodorovného posunu ukazatele. */
export function progressFromPointer(
  startX: number,
  currentX: number,
  pageWidth: number,
  direction: FlipDirection,
): number {
  if (!(pageWidth > 0)) return 0
  const delta = currentX - startX
  const signed = direction === 'next' ? -delta : delta
  return clamp01(signed / pageWidth)
}

/**
 * Rozhodne o dokončení otáčení. `velocityPxPerMs` je kladná ve směru, který otáčení dokončí.
 * Švih o rychlosti nejméně 0,8 px/ms rozhodne bez ohledu na polohu.
 */
export function finishFlip(progress: number, velocityPxPerMs: number): 'complete' | 'cancelled' {
  const FLICK = 0.8
  if (velocityPxPerMs >= FLICK) return 'complete'
  if (velocityPxPerMs <= -FLICK) return 'cancelled'
  return progress >= 0.5 ? 'complete' : 'cancelled'
}

export function flipTransform(progress: number, direction: FlipDirection): string {
  const deg = 180 * clamp01(progress) * (direction === 'next' ? -1 : 1)
  return `rotateY(${deg}deg)`
}

export function flipShadowOpacity(progress: number): number {
  const p = clamp01(progress)
  return 1 - Math.abs(p - 0.5) * 2
}
