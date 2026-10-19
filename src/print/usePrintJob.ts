import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { preloadPrintFonts } from './fonts'
import type { PrintJob } from './printJob'

export const PRINT_ATTRIBUTE = 'data-print'

function markDocument(job: PrintJob | null) {
  const root = document.documentElement
  if (job) root.setAttribute(PRINT_ATTRIBUTE, job.kind)
  else root.removeAttribute(PRINT_ATTRIBUTE)
}

/**
 * Tiskový režim. Ctrl+P / menu prohlížeče: `beforeprint` vykreslí úlohu aktuální stránky (`current`).
 * Tlačítko: `print(job)` úlohu vykreslí a označí dřív, než zavolá `window.print()`; vynucená úloha platí,
 * dokud nepřijde `afterprint` nebo se nezmění `resetKey` (index stránky) – některé prohlížeče (Android, PDF přes CDP)
 * pošlou `beforeprint` až po návratu z `window.print()` a jiné `afterprint` vůbec.
 * Vykreslení je synchronní (`flushSync`): prohlížeč stránkuje hned po `beforeprint`, na rAF by nečekal.
 */
export function usePrintJob(current: () => PrintJob, resetKey: unknown): { job: PrintJob | null; print: (job: PrintJob) => void } {
  const [job, setJob] = useState<PrintJob | null>(null)
  const [seenKey, setSeenKey] = useState(resetKey)
  if (!Object.is(seenKey, resetKey)) {
    // úprava stavu při renderu (podporovaný vzor): jiná stránka = žádná rozpracovaná úloha
    setSeenKey(resetKey)
    setJob(null)
  }
  const currentRef = useRef(current)
  const forcedRef = useRef<PrintJob | null>(null)
  useEffect(() => {
    currentRef.current = current
  })

  // řezy písem se stáhnou předem, ať je brožurka měří stejným písmem, jakým se vytiskne
  useEffect(() => {
    void preloadPrintFonts()
  }, [])

  const apply = useCallback((next: PrintJob | null) => {
    flushSync(() => setJob(next))
    markDocument(next)
  }, [])

  useEffect(() => {
    const before = () => apply(forcedRef.current ?? currentRef.current())
    const after = () => {
      forcedRef.current = null
      apply(null)
    }
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
      markDocument(null)
    }
  }, [apply])

  // přechod na jinou stránku zapomene nedokončený tisk tlačítkem
  useEffect(() => {
    forcedRef.current = null
    markDocument(null)
  }, [resetKey])

  const print = useCallback(
    (next: PrintJob) => {
      forcedRef.current = next
      apply(next)
      window.print()
    },
    [apply],
  )

  return { job, print }
}
