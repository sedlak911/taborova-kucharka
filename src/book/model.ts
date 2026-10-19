import type { FlipDirection } from './flip'

export type ViewMode = 'spread' | 'single'

/** V režimu spread je platný index 0 (obal) nebo lichý. */
function alignSpread(index: number): number {
  if (index <= 0) return 0
  return index % 2 === 1 ? index : index - 1
}

export function clampIndex(index: number, pageCount: number, mode: ViewMode): number {
  if (pageCount <= 0) return 0
  const max = pageCount - 1
  const i = Math.min(Math.max(index, 0), max)
  return mode === 'spread' ? alignSpread(i) : i
}

export function visiblePages(index: number, pageCount: number, mode: ViewMode): (number | null)[] {
  const i = clampIndex(index, pageCount, mode)
  if (mode === 'single') return [i]
  if (i === 0) return [null, 0]
  const right = i + 1 < pageCount ? i + 1 : null
  return [i, right]
}

export function canGoPrev(index: number): boolean {
  return index > 0
}

export function canGoNext(index: number, pageCount: number, mode: ViewMode): boolean {
  const i = clampIndex(index, pageCount, mode)
  const last = clampIndex(pageCount - 1, pageCount, mode)
  return i < last
}

export function nextIndex(index: number, pageCount: number, mode: ViewMode): number {
  const i = clampIndex(index, pageCount, mode)
  if (!canGoNext(i, pageCount, mode)) return i
  if (mode === 'single') return i + 1
  return i === 0 ? 1 : i + 2
}

export function prevIndex(index: number, mode: ViewMode): number {
  if (index <= 0) return 0
  if (mode === 'single') return index - 1
  const i = alignSpread(index)
  return i === 1 ? 0 : i - 2
}

/**
 * Krok listování, který přeskočí dvoustrany (single: stránky), na nichž je všechno skryté (filtr obsahu).
 * Když za skrytými stránkami už nic není, zůstane index stát. Bez `hidden` je to obyčejný krok.
 */
export function stepIndex(index: number, dir: FlipDirection, pageCount: number, mode: ViewMode, hidden?: (page: number) => boolean): number {
  const step = (i: number) => (dir === 'next' ? nextIndex(i, pageCount, mode) : prevIndex(i, mode))
  const start = clampIndex(index, pageCount, mode)
  let i = start
  for (;;) {
    const j = step(i)
    if (j === i) return start
    if (!hidden || !visiblePages(j, pageCount, mode).every((p) => p === null || hidden(p))) return j
    i = j
  }
}

export function canStep(index: number, dir: FlipDirection, pageCount: number, mode: ViewMode, hidden?: (page: number) => boolean): boolean {
  return stepIndex(index, dir, pageCount, mode, hidden) !== clampIndex(index, pageCount, mode)
}
