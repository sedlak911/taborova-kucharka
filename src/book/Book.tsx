import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Page, type PageSide, type PageTone } from './Page'
import { canStep, clampIndex, stepIndex, visiblePages, type ViewMode } from './model'
import { flipShadowOpacity, flipTransform, type FlipDirection } from './flip'
import { useFlipDrag } from './useFlipDrag'
import { useViewMode } from './useViewMode'
import { inHorizontalScroller, stepWheel, type WheelGesture } from './wheel'

export interface BookPageDef {
  id: string
  tone?: PageTone
  /** Třída přidaná na samotnou stránku (např. epocha receptu, aby její `--paper` obarvila celý papír). */
  className?: string
  render: () => ReactNode
}

/** Stránka s memoizovaným obsahem: při překreslování během otáčení se `render()` nevolá znovu, dokud se nezmění definice stránky. */
const BookPage = memo(function BookPage({ def, side, pageNumber }: { def: BookPageDef; side: PageSide; pageNumber?: number }) {
  return (
    <Page side={side} tone={def.tone} className={def.className} pageNumber={pageNumber}>
      {def.render()}
    </Page>
  )
})

interface BookProps {
  pages: BookPageDef[]
  initialIndex?: number
  /** Řízený index: když je zadán, je zdrojem pravdy (interní stav se s ním synchronizuje). */
  index?: number
  onIndexChange?: (index: number) => void
  /** Režim z rodiče (App staví layout podle režimu); bez něj si ho kniha zjistí sama. */
  mode?: ViewMode
  /** Neviditelný obsah o rozměru jedné stránky pro měření (obsah knihy, R9); aria-hidden a inert. */
  measure?: ReactNode
  /** Stránky, které listování přeskakuje (recepty mimo filtr obsahu); skok na ně odkazem dál funguje. */
  hidden?: (page: number) => boolean
}

export function Book({ pages, initialIndex = 0, index: controlledIndex, onIndexChange, mode: modeProp, measure, hidden }: BookProps) {
  const ownMode = useViewMode(modeProp !== undefined)
  const mode = modeProp ?? ownMode
  const count = pages.length
  const [uncontrolledIndex, setUncontrolledIndex] = useState(initialIndex)
  const rawIndex = controlledIndex ?? uncontrolledIndex
  const index = clampIndex(rawIndex, count, mode)
  const containerRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const wheelGesture = useRef<WheelGesture | null>(null)
  const [pageWidth, setPageWidth] = useState(600)

  const setIndex = useCallback(
    (i: number) => {
      const c = clampIndex(i, count, mode)
      setUncontrolledIndex(c)
      onIndexChange?.(c)
    },
    [count, mode, onIndexChange],
  )

  // Zarovnání na dvoustranu je čistě prezentační (zobrazuje se `index`), rodič si drží logickou stránku;
  // rodiči se oznámí jen oprava indexu mimo rozsah (zmenšil se počet stránek).
  useEffect(() => {
    const inRange = clampIndex(rawIndex, count, 'single')
    if (inRange !== rawIndex) onIndexChange?.(inRange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, count])

  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setPageWidth(mode === 'spread' ? el.clientWidth / 2 : el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [mode])

  const indexRef = useRef(index)
  const flipRef = useRef<unknown>(null)

  const canNext = canStep(index, 'next', count, mode, hidden)
  const canPrev = canStep(index, 'prev', count, mode, hidden)
  // posun vychází z refu (ne z uzavřeného indexu), aby onComplete nikdy neviděl zastaralou hodnotu
  const advance = useCallback(
    (dir: FlipDirection) => {
      const i = indexRef.current
      if (canStep(i, dir, count, mode, hidden)) setIndex(stepIndex(i, dir, count, mode, hidden))
    },
    [count, mode, hidden, setIndex],
  )
  const { flip, start, handlers } = useFlipDrag({ pageWidth, canNext, canPrev, onComplete: advance })
  useEffect(() => {
    indexRef.current = index
    flipRef.current = flip
  })

  // tlačítka a klávesy otáčejí animovaně; během otáčení nedělají nic
  const goNext = useCallback(() => { if (!flipRef.current) start('next') }, [start])
  const goPrev = useCallback(() => { if (!flipRef.current) start('prev') }, [start])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      if (document.querySelector('[role="dialog"]')) return // otevřený dialog (hledání) klávesy neposílá do knihy
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev])

  // vodorovný scroll trackpadu/kolečka listuje: jedno otočení na gesto (práh + debounce v wheel.ts)
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return // pinch zoom
      if (document.querySelector('[role="dialog"]')) return
      if (inHorizontalScroller(e.target, root)) return
      const { gesture, fire, horizontal } = stepWheel(wheelGesture.current, {
        deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode, t: performance.now(),
      })
      wheelGesture.current = gesture
      if (horizontal) e.preventDefault() // jinak Chrome na macOS přejde zpět/vpřed v historii
      if (fire === 'next') goNext()
      if (fire === 'prev') goPrev()
    }
    root.addEventListener('wheel', onWheel, { passive: false })
    return () => root.removeEventListener('wheel', onWheel)
  }, [goNext, goPrev])

  const current = visiblePages(index, count, mode)
  // cílová dvoustrana (kam otáčení vede)
  const targetIndex = flip ? stepIndex(index, flip.direction, count, mode, hidden) : index
  const base = visiblePages(targetIndex, count, mode)
  // stránky ve slotech „pod“ otáčeným listem: neotáčená polovina zůstává, otáčená odkrývá cíl
  const under: (number | null)[] = !flip
    ? current
    : mode === 'single'
      ? base
      : flip.direction === 'next'
        ? [current[0], base[1]]
        : [base[0], current[1]]

  const renderSlot = (p: number | null, side: 'left' | 'right' | 'single', key: string) => (
    <div className={`book__slot book__slot--${side}`} key={key} inert={flip ? true : undefined} aria-hidden={flip ? true : undefined}>
      {p !== null && (
        <BookPage key={pages[p].id} def={pages[p]} side={side} pageNumber={p === 0 ? undefined : p} />
      )}
    </div>
  )

  // otáčený list: přední = stránka, která odchází; zadní = stránka, která přichází
  let flipper: ReactNode = null
  if (flip) {
    const front = flip.direction === 'next' ? current[current.length - 1] : current[0]
    const back = flip.direction === 'next' ? base[0] : base[base.length - 1]
    const sideFront = mode === 'single' ? 'single' : flip.direction === 'next' ? 'right' : 'left'
    const sideBack = mode === 'single' ? 'single' : flip.direction === 'next' ? 'left' : 'right'
    flipper = (
      <div
        className={`book__flipper book__flipper--${flip.direction}`}
        style={{ transform: flipTransform(flip.progress, flip.direction), transition: 'none' }}
        aria-hidden
        inert
      >
        <div className="book__face book__face--front">
          {front !== null && front !== undefined && (
            <BookPage key={pages[front].id} def={pages[front]} side={sideFront} pageNumber={front === 0 ? undefined : front} />
          )}
          <div className="book__face-shade" style={{ opacity: flipShadowOpacity(flip.progress) }} />
        </div>
        <div className="book__face book__face--back">
          {back !== null && back !== undefined && (
            <BookPage key={pages[back].id} def={pages[back]} side={sideBack} pageNumber={back === 0 ? undefined : back} />
          )}
          <div className="book__face-shade" style={{ opacity: flipShadowOpacity(flip.progress) }} />
        </div>
      </div>
    )
  }

  return (
    <div className={`book book--${mode}`} ref={rootRef}>
      <button type="button" className="book__nav book__nav--prev" aria-label="Předchozí strana" onClick={goPrev} disabled={!canPrev}>‹</button>
      <div className="book__spread" ref={containerRef} {...handlers}>
        {mode === 'spread'
          ? [renderSlot(under[0], 'left', 'L'), renderSlot(under[1], 'right', 'R')]
          : renderSlot(under[0], 'single', 'S')}
        {flipper}
        {measure && (
          <div className="book__measure" aria-hidden="true" inert>
            {measure}
          </div>
        )}
      </div>
      <button type="button" className="book__nav book__nav--next" aria-label="Další strana" onClick={goNext} disabled={!canNext}>›</button>
    </div>
  )
}
