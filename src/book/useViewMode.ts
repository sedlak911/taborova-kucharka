import { useEffect, useState } from 'react'
import type { ViewMode } from './model'

// jen na obrazovce; v tisku dotaz neplatí a změny se ignorují (viz useViewMode)
export const VIEW_MODE_QUERY = 'screen and (max-width: 767px), screen and (orientation: portrait)'

function current(): ViewMode {
  return window.matchMedia?.(VIEW_MODE_QUERY).matches ? 'single' : 'spread'
}

/** Tiskne se: tiskový dotaz platí, nebo běží tiskový strom (`<html data-print>`). */
function printing(): boolean {
  return window.matchMedia?.('print').matches === true || document.documentElement.hasAttribute('data-print')
}

/**
 * Režim knihy na obrazovce: `single` (mobil, na výšku) nebo `spread` (dvoustrana).
 * Podle režimu staví App layout (recept na jedné stránce vs. dvoustrana) a s ním čísla stran v obsahu,
 * proto se během tisku nemění: v tisku dotaz `screen and …` neplatí a změna by přestavěla knihu i tištěný obsah (R7).
 * `disabled`: režim dodává rodič, takže se neodebírá změna dotazu (jeden odběr).
 */
export function useViewMode(disabled = false): ViewMode {
  const [mode, setMode] = useState<ViewMode>(current)
  useEffect(() => {
    if (disabled) return
    const mq = window.matchMedia?.(VIEW_MODE_QUERY)
    if (!mq) return
    const onChange = () => {
      if (printing()) return
      setMode(current())
    }
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [disabled])
  return mode
}
