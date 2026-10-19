import { useCallback, useEffect, useState, type RefObject } from 'react'

/** Tolerance subpixelového zaokrouhlení na konci scrollu. */
export const OVERFLOW_EPSILON_PX = 4

export function hasMoreBelow(el: Pick<HTMLElement, 'scrollHeight' | 'scrollTop' | 'clientHeight'>): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight > OVERFLOW_EPSILON_PX
}

/** Sleduje, zda scrollující prvek skrývá obsah pod spodním okrajem (scroll, změna velikosti, nový obsah). */
export function useOverflowHint(ref: RefObject<HTMLElement | null>): boolean {
  const [more, setMore] = useState(false)
  const update = useCallback(() => {
    const el = ref.current
    if (el) setMore(hasMoreBelow(el))
  }, [ref])

  // po každém renderu: obsah stránky se mohl změnit (filtr obsahu, jiný recept)
  useEffect(update)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.addEventListener('scroll', update, { passive: true })
    // načtení fontů nebo změna okna mění výšku bez renderu
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    ro?.observe(el)
    if (el.firstElementChild) ro?.observe(el.firstElementChild)
    return () => {
      el.removeEventListener('scroll', update)
      ro?.disconnect()
    }
  }, [ref, update])

  return more
}
