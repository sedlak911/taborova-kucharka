import { useEffect, useLayoutEffect, useRef } from 'react'
import { Page } from '@/book/Page'
import { EMPTY_FILTER, buildTocRows, tocRowKey, type TocMetrics } from '@/content/search'
import type { Recipe } from '@/domain/types'
import { measureToc } from './tocMeasure'
import { TocHead, TocListItem } from './TocPages'

/** Prodleva přeměření po změně velikosti, aby tažení okna nepřestavovalo obsah při každém pixelu. */
const RESIZE_DEBOUNCE_MS = 100
const noop = () => {}

interface Props {
  /** Všechny recepty (nefiltrované) – stejné řádky jako obsah. */
  recipes: Recipe[]
  /** Číslo strany pro všechny řádky (samé osmičky, viz `probeNumberFor`): šířka řádku odpovídá největším číslům v knize. */
  pageNumber: number
  /** Naměřené rozměry; volá se jen s použitelným měřením (ne v jsdom ani se skrytou knihou). */
  onMeasure: (metrics: TocMetrics) => void
}

/**
 * Neviditelná měřicí stránka obsahu (v `measure` slotu knihy má přesně rozměr stránky, R9):
 * hlavička první stránky a všechny řádky obsahu stejnými komponentami jako skutečná stránka.
 * První měření hned po vykreslení a po `document.fonts.ready`; změna velikosti (okno, režim) se přeměřuje s prodlevou.
 */
export function TocProbe({ recipes, pageNumber, onMeasure }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const onMeasureRef = useRef(onMeasure)
  useEffect(() => {
    onMeasureRef.current = onMeasure
  })

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const run = () => {
      if (!alive) return
      const metrics = measureToc(root)
      if (metrics) onMeasureRef.current(metrics)
    }
    const runDebounced = () => {
      clearTimeout(timer)
      timer = setTimeout(run, RESIZE_DEBOUNCE_MS)
    }
    run()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(runDebounced)
    ro?.observe(root)
    const list = root.querySelector('.toc-list')
    if (list) ro?.observe(list)
    void document.fonts?.ready.then(run)
    return () => {
      alive = false
      clearTimeout(timer)
      ro?.disconnect()
    }
  }, [recipes, pageNumber])

  return (
    <div className="toc-probe" ref={rootRef}>
      <Page side="single" pageNumber={pageNumber}>
        <div className="toc-page">
          <TocHead recipes={recipes} filter={EMPTY_FILTER} onFilterChange={noop} onNewRecipe={noop} />
          <ul className="toc-list">
            {buildTocRows(recipes).map((row) => (
              <TocListItem
                key={tocRowKey(row)}
                row={row}
                pageNumber={pageNumber}
                favorite={false}
                inCart={false}
                onNavigate={noop}
                onToggleFavorite={noop}
                onToggleCart={noop}
              />
            ))}
          </ul>
        </div>
      </Page>
    </div>
  )
}
