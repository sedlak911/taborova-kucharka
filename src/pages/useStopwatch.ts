// src/pages/useStopwatch.ts – stopky nad postupem (spec §2 [R3], ruling R7 + [Final fix]):
// jedny stopky pro celou aplikaci, stav v paměti mimo stránku (ne localStorage, ne UserState)
import { useEffect, useState, useSyncExternalStore } from 'react'

const STOPWATCH_TICK_MS = 1000

export interface Stopwatch {
  elapsedSeconds: number
  running: boolean
  start: () => void
  pause: () => void
  /** Zastaví a vynuluje. */
  reset: () => void
}

interface Entry {
  recipeId: string
  /** Čas naměřený před poslední pauzou. */
  accumulatedMs: number
  /** `Date.now()` při spuštění; null = stojí. */
  startedAt: number | null
}

let store: Entry | null = null
const listeners = new Set<() => void>()

function setStore(next: Entry | null) {
  store = next
  listeners.forEach((l) => l())
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const getStore = () => store

/** Jen pro testy: zapomene uložené stopky. */
export function resetStopwatchStore() {
  setStore(null)
}

/**
 * Uplynulý čas se počítá z hodin (`Date.now()`), tik jen překresluje: v tabu na pozadí nebo po uspání telefonu
 * prohlížeč tiká řidčeji, ale stopky po návratu ukážou skutečný čas (při návratu na kartu hned, ne až na dalším tiku).
 * Stav je jeden pro aplikaci a patří receptu `recipeId`; jiný recept vidí stojící 0:00 a `start` stav nahradí.
 * Stopky tak přežijí odpojení stránky (nedokončený tah, přepnutí režimu, odlistování).
 */
export function useStopwatch(recipeId: string): Stopwatch {
  const snapshot = useSyncExternalStore(subscribe, getStore)
  const mine = snapshot !== null && snapshot.recipeId === recipeId ? snapshot : null
  const startedAt = mine?.startedAt ?? null
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (startedAt === null) return
    const id = window.setInterval(() => setNow(Date.now()), STOPWATCH_TICK_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(Date.now())
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [startedAt])

  const runningMs = startedAt === null ? 0 : Math.max(0, now - startedAt)
  return {
    elapsedSeconds: Math.floor(((mine?.accumulatedMs ?? 0) + runningMs) / 1000),
    running: startedAt !== null,
    start: () => {
      const t = Date.now()
      setNow(t)
      const cur = store !== null && store.recipeId === recipeId ? store : null
      if (cur === null) setStore({ recipeId, accumulatedMs: 0, startedAt: t })
      else if (cur.startedAt === null) setStore({ ...cur, startedAt: t })
    },
    pause: () => {
      const t = Date.now()
      if (store === null || store.recipeId !== recipeId || store.startedAt === null) return
      setStore({ ...store, accumulatedMs: store.accumulatedMs + Math.max(0, t - store.startedAt), startedAt: null })
    },
    reset: () => {
      if (store !== null && store.recipeId === recipeId) setStore(null)
    },
  }
}
