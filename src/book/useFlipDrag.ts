import { useCallback, useEffect, useRef, useState } from 'react'
import type React from 'react'
import { finishFlip, progressFromPointer, type FlipDirection, type FlipState } from './flip'
import { inHorizontalScroller } from './wheel'

const INTERACTIVE = 'input, textarea, select, button, a, label, [contenteditable]'
const FORM_FIELD = 'input, textarea, select, [contenteditable]'

/**
 * Myš: otáčení smí začít jen z úchytu `.page-edge` na vnějším okraji stránky,
 * nikdy z interaktivního prvku. Směr určuje třída úchytu.
 */
export function isDragStartAllowed(target: EventTarget | null): FlipDirection | null {
  if (!(target instanceof Element)) return null
  if (target.closest(INTERACTIVE)) return null
  const edge = target.closest('.page-edge')
  if (!edge) return null
  if (edge.classList.contains('page-edge--right')) return 'next'
  if (edge.classList.contains('page-edge--left')) return 'prev'
  return null
}

/** Šířka úchytu `.page-edge` (výchozí `--edge-zone`); během animace list úchyt zakrývá, tak se pozná podle polohy. */
export const EDGE_ZONE_PX = 56

/** Úchyt podle polohy ukazatele u vnějšího okraje knihy (pro tah zahájený během animace otočení). */
export function edgeFromPoint(clientX: number, rect: { left: number; right: number }): FlipDirection | null {
  if (clientX >= rect.right - EDGE_ZONE_PX && clientX <= rect.right) return 'next'
  if (clientX <= rect.left + EDGE_ZONE_PX && clientX >= rect.left) return 'prev'
  return null
}

/** Prst se musí posunout aspoň o tolik px, než se rozhodne, zda jde o švih (listování), nebo o scroll. */
export const SWIPE_SLOP_PX = 10
/** Švih je vodorovný, když |dx| ≥ 1,2 × |dy|; jinak patří svislému scrollu stránky. */
export const SWIPE_HORIZONTAL_RATIO = 1.2
/** Jak dlouho po švihu se spolkne klik (prst skončil na tlačítku nebo řádku obsahu). */
export const SWIPE_CLICK_GUARD_MS = 400

export type SwipeIntent = FlipDirection | 'vertical' | null

/** Rozpozná gesto prstu podle posunu od začátku: null = ještě nerozhodnuto, `next` = švih doleva, `prev` = doprava. */
export function classifySwipe(dx: number, dy: number): SwipeIntent {
  if (Math.hypot(dx, dy) < SWIPE_SLOP_PX) return null
  if (Math.abs(dx) < Math.abs(dy) * SWIPE_HORIZONTAL_RATIO) return 'vertical'
  return dx < 0 ? 'next' : 'prev'
}

/**
 * Švih prstem smí začít kdekoli na stránce – i na tlačítku nebo řádku obsahu (klepnutí dál funguje, rozhoduje až pohyb),
 * jen ne ve formulářovém poli a ve vodorovně scrollujícím prvku (široká tabulka), kde vodorovný tah patří jim.
 */
export function isSwipeStartAllowed(target: EventTarget | null, boundary: Element): boolean {
  if (!(target instanceof Element)) return false
  if (!target.closest('.page')) return false
  if (target.closest(FORM_FIELD)) return false
  return !inHorizontalScroller(target, boundary)
}

const isTouch = (e: React.PointerEvent) => e.pointerType === 'touch' || e.pointerType === 'pen'

const DURATION_MS = 350
const MIN_SAMPLE_MS = 8
const STALE_VELOCITY_MS = 100
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

interface Options {
  pageWidth: number
  canNext: boolean
  canPrev: boolean
  onComplete: (dir: FlipDirection) => void
}

export function useFlipDrag({ pageWidth, canNext, canPrev, onComplete }: Options) {
  const [flip, setFlip] = useState<FlipState | null>(null)
  const drag = useRef<{ pointerId: number; startX: number; lastX: number; lastT: number; velocity: number; direction: FlipDirection } | null>(null)
  // dotyk, u kterého se ještě nerozhodlo, zda je to švih, nebo scroll
  const pending = useRef<{ pointerId: number; startX: number; startY: number } | null>(null)
  // do kdy se spolkne klik po švihu (Infinity = švih právě běží)
  const clickGuardUntil = useRef(0)
  const raf = useRef<number | null>(null)
  // dokončení běžící animace (jen když vede k otočení stránky); nový švih ho provede okamžitě
  const pendingCommit = useRef<(() => void) | null>(null)

  const cancelAnimation = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current)
    raf.current = null
    pendingCommit.current = null
  }, [])

  // při odmontování zrušíme běžící animaci
  useEffect(() => cancelAnimation, [cancelAnimation])

  const animateTo = useCallback(
    (from: number, to: number, direction: FlipDirection, done: () => void) => {
      if (reducedMotion()) { done(); return }
      pendingCommit.current = to === 1 ? done : null
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION_MS)
        const p = from + (to - from) * easeOut(t)
        setFlip({ direction, progress: p, dragging: false })
        if (t < 1) {
          raf.current = requestAnimationFrame(tick)
        } else {
          raf.current = null
          pendingCommit.current = null
          done()
        }
      }
      raf.current = requestAnimationFrame(tick)
    },
    [],
  )

  /**
   * Začne tažení listu. Dobíhající animace se zastaví; když vedla k otočení, stránka se otočí hned
   * (rychlé švihy za sebou listují dál, předchozí otočení se neztratí), návrat listu se jen zahodí.
   */
  const beginDrag = useCallback(
    (e: React.PointerEvent, startX: number, direction: FlipDirection) => {
      const commit = pendingCommit.current
      cancelAnimation()
      commit?.()
      drag.current = { pointerId: e.pointerId, startX, lastX: e.clientX, lastT: performance.now(), velocity: 0, direction }
      ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
      setFlip({ direction, progress: progressFromPointer(startX, e.clientX, pageWidth, direction), dragging: true })
    },
    [cancelAnimation, pageWidth],
  )

  const onPointerDown = useCallback<React.PointerEventHandler>(
    (e) => {
      if (drag.current || pending.current) return
      // během animace otočení jsou stránky inert a cílem je samotná kniha – i tak smí začít další tah (rychlé listování)
      const animating = raf.current !== null
      if (isTouch(e)) {
        // dotyk: úchyt na okraji displeje koliduje se systémovým gestem zpět – švih kdekoli na stránce, směr určí pohyb (R14)
        if (isSwipeStartAllowed(e.target, e.currentTarget as Element) || animating) {
          pending.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY }
        }
        return
      }
      const direction = isDragStartAllowed(e.target) ?? (animating ? edgeFromPoint(e.clientX, (e.currentTarget as Element).getBoundingClientRect()) : null)
      if (!direction) return
      if (direction === 'next' && !canNext) return
      if (direction === 'prev' && !canPrev) return
      beginDrag(e, e.clientX, direction)
    },
    [canNext, canPrev, beginDrag],
  )

  const onPointerMove = useCallback<React.PointerEventHandler>(
    (e) => {
      const p = pending.current
      if (p && e.pointerId === p.pointerId) {
        const intent = classifySwipe(e.clientX - p.startX, e.clientY - p.startY)
        if (intent === null) return
        pending.current = null
        if (intent === 'vertical') return // svislý tah patří scrollu stránky (touch-action: pan-y)
        if ((intent === 'next' && !canNext) || (intent === 'prev' && !canPrev)) return
        clickGuardUntil.current = Number.POSITIVE_INFINITY
        beginDrag(e, p.startX, intent)
        return
      }
      const d = drag.current
      if (!d || e.pointerId !== d.pointerId) return
      const now = performance.now()
      const dt = now - d.lastT
      // příliš krátké intervaly dávají nespolehlivou rychlost – vzorek přeskočíme a necháme dx narůst
      if (dt >= MIN_SAMPLE_MS) {
        const dx = e.clientX - d.lastX
        // rychlost kladná ve směru dokončení otáčení
        d.velocity = (d.direction === 'next' ? -dx : dx) / dt
        d.lastX = e.clientX
        d.lastT = now
      }
      setFlip({ direction: d.direction, progress: progressFromPointer(d.startX, e.clientX, pageWidth, d.direction), dragging: true })
    },
    [pageWidth, canNext, canPrev, beginDrag],
  )

  const release = useCallback(
    (e: React.PointerEvent, cancelled: boolean) => {
      // klepnutí nebo nerozhodnutý dotyk: nic se neotáčí, klik projde
      if (pending.current && pending.current.pointerId === e.pointerId) {
        pending.current = null
        return
      }
      const d = drag.current
      if (!d || e.pointerId !== d.pointerId) return
      drag.current = null
      // D8: po pointercancel (prohlížeč převzal gesto) se klik nespolkne
      if (clickGuardUntil.current === Number.POSITIVE_INFINITY) {
        clickGuardUntil.current = cancelled ? 0 : performance.now() + SWIPE_CLICK_GUARD_MS
      }
      ;(e.currentTarget as Element).releasePointerCapture?.(e.pointerId)
      // při pointercancel je clientX nespolehlivý – použijeme poslední známou polohu
      const x = cancelled ? d.lastX : e.clientX
      const progress = progressFromPointer(d.startX, x, pageWidth, d.direction)
      // zastaralá rychlost (ukazatel dlouho stál) se ignoruje
      const velocity = performance.now() - d.lastT > STALE_VELOCITY_MS ? 0 : d.velocity
      const result = cancelled ? 'cancelled' : finishFlip(progress, velocity)
      const target = result === 'complete' ? 1 : 0
      animateTo(progress, target, d.direction, () => {
        setFlip(null)
        if (result === 'complete') onComplete(d.direction)
      })
    },
    [pageWidth, animateTo, onComplete],
  )

  /** Animované otočení bez tažení (tlačítka, klávesy). Během tažení či animace nic nedělá. */
  const start = useCallback(
    (direction: FlipDirection) => {
      if (drag.current || raf.current !== null) return
      if (direction === 'next' && !canNext) return
      if (direction === 'prev' && !canPrev) return
      setFlip({ direction, progress: 0, dragging: false })
      animateTo(0, 1, direction, () => {
        setFlip(null)
        onComplete(direction)
      })
    },
    [canNext, canPrev, animateTo, onComplete],
  )

  const onPointerUp = useCallback<React.PointerEventHandler>((e) => release(e, false), [release])
  const onPointerCancel = useCallback<React.PointerEventHandler>((e) => release(e, true), [release])

  /** Klik na konci švihu (prst skončil na řádku obsahu nebo tlačítku) se spolkne – švih nemá nic otevřít. */
  const onClickCapture = useCallback<React.MouseEventHandler>((e) => {
    if (performance.now() > clickGuardUntil.current) return
    clickGuardUntil.current = 0
    e.preventDefault()
    e.stopPropagation()
  }, [])

  return {
    flip,
    start,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture },
  }
}
