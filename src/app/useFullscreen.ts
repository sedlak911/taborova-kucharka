import { useCallback, useEffect, useState } from 'react'

/** Fullscreen API je k dispozici (iPhone Safari ho nemá → tlačítko se skryje). */
export function fullscreenSupported(): boolean {
  return (
    typeof document !== 'undefined' &&
    document.fullscreenEnabled === true &&
    typeof document.documentElement.requestFullscreen === 'function'
  )
}

export function useFullscreen(): { supported: boolean; active: boolean; toggle: () => void } {
  const [supported] = useState(fullscreenSupported)
  const [active, setActive] = useState(() => typeof document !== 'undefined' && document.fullscreenElement != null)

  useEffect(() => {
    const onChange = () => setActive(document.fullscreenElement != null)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggle = useCallback(() => {
    // volá se synchronně z kliknutí (uživatelské gesto); odmítnutí se tiše ignoruje, stav srovná fullscreenchange
    const result = document.fullscreenElement != null ? document.exitFullscreen?.() : document.documentElement.requestFullscreen()
    result?.catch(() => {})
  }, [])

  return { supported, active, toggle }
}
