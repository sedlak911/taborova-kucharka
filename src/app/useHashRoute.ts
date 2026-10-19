import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { indexToRoute, parseRoute, routeToHash, routeToIndex, type LayoutLike } from './route'

function clearHash() {
  history.replaceState(null, '', location.pathname + location.search)
}

/**
 * Přečte aktuální hash; neznámý/neplatný cíl → 0 a hash se vyčistí.
 * Prázdný layout (ještě nenačtený) hash nemaže, aby se neztratil odkaz na recept.
 */
function readIndex(layout: LayoutLike): number {
  if (layout.entries.length === 0) return 0
  const route = parseRoute(location.hash)
  const idx = route ? routeToIndex(route, layout) : null
  if (idx === null) {
    clearHash()
    return 0
  }
  return idx
}

function layoutKeyOf(layout: LayoutLike): string {
  // klíč OBSAHU layoutu: nový objekt se stejnými stránkami (např. stav převzatý ze serveru) index nemění
  return layout.entries.map((e) => `${e.kind}:${e.recipeId ?? ''}:${e.chapter ?? ''}`).join('|')
}

export function useHashRoute(layout: LayoutLike): { index: number; setIndex: (i: number) => void; jumpTo: (i: number) => void } {
  const layoutKey = useMemo(() => layoutKeyOf(layout), [layout])
  // index se ukládá spolu s klíčem layoutu, pro který platí
  const [stored, setStored] = useState(() => ({ key: layoutKey, index: readIndex(layout) }))
  const layoutRef = useRef(layout)
  const keyRef = useRef(layoutKey)
  // Změnil se obsah layoutu (načtení knihy, uložený/smazaný/importovaný vlastní recept) a posunul indexy stránek:
  // stránka se najde znovu podle hashe, který vždy nese routu aktuální stránky (ruling R8).
  // Odvozuje se při renderu, aby Book dostal rovnou správný index a jeho oprava indexu mimo rozsah
  // nepřepsala hash podle starého layoutu dřív, než ho přečteme. Zastaralý uložený index se zahodí.
  const fresh = stored.key === layoutKey
  const index = fresh ? stored.index : readIndex(layout)
  if (!fresh) setStored({ key: layoutKey, index })
  // layout effect: událost nesmí přečíst starý layout mezi commitem a pasivními efekty
  useLayoutEffect(() => {
    layoutRef.current = layout
    keyRef.current = layoutKey
  }, [layout, layoutKey])

  const setIndexState = useCallback((i: number) => setStored({ key: keyRef.current, index: i }), [])

  useEffect(() => {
    const onHash = () => setIndexState(readIndex(layoutRef.current))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [setIndexState])

  const setIndex = useCallback((i: number) => {
    setIndexState(i)
    history.replaceState(null, '', routeToHash(indexToRoute(i, layoutRef.current)))
  }, [setIndexState])

  /** Skok přes odkaz (obsah, hledání): na rozdíl od listování zapíše do historie, aby „zpět“ vrátilo na původní stránku. */
  const jumpTo = useCallback((i: number) => {
    setIndexState(i)
    const hash = routeToHash(indexToRoute(i, layoutRef.current))
    if (hash === (location.hash || '#/')) return
    history.pushState(null, '', hash)
  }, [setIndexState])

  return { index, setIndex, jumpTo }
}
