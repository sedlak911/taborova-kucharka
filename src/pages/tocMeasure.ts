import { usableMetrics, type TocMetrics } from '@/content/search'

const px = (v: string) => Number.parseFloat(v) || 0

/**
 * Změří měřicí stránku obsahu (TocProbe): kapacitu těla `.page-content` bez svislého paddingu,
 * výšku hlavičky `.toc-head` a každého řádku `[data-toc-key]`. Bez rozložení (nuly) vrací null.
 */
export function measureToc(root: HTMLElement): TocMetrics | null {
  const content = root.querySelector<HTMLElement>('.page-content')
  if (!content) return null
  const style = getComputedStyle(content)
  const capacity = content.clientHeight - px(style.paddingTop) - px(style.paddingBottom)
  const head = root.querySelector<HTMLElement>('.toc-head')?.getBoundingClientRect().height ?? 0
  const rows = new Map<string, number>()
  root.querySelectorAll<HTMLElement>('[data-toc-key]').forEach((el) => {
    rows.set(el.dataset.tocKey ?? '', el.getBoundingClientRect().height)
  })
  const metrics: TocMetrics = { capacity, head, rows }
  return usableMetrics(metrics) ? metrics : null
}

/** Stejné měření (na půl pixelu): nové měření se stejnými čísly nepřestaví layout (žádná smyčka měření ↔ layout). */
export function sameMetrics(a: TocMetrics | null, b: TocMetrics | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  const near = (x: number, y: number) => Math.abs(x - y) < 0.5
  if (!near(a.capacity, b.capacity) || !near(a.head, b.head) || a.rows.size !== b.rows.size) return false
  for (const [key, h] of a.rows) {
    const other = b.rows.get(key)
    if (other === undefined || !near(h, other)) return false
  }
  return true
}

/**
 * Číslo strany pro měřicí stránku: samé osmičky se stejným počtem číslic, jaké mají největší čísla stran v knize
 * (ruční kontrola fáze 9: pevné „888“ zalamovalo řádky, které se na mobilu s dvouciferným číslem vejdou, a stránky obsahu zůstaly poloprázdné).
 * Zpětná vazba nekmitá: s víc číslicemi se obsah jen prodlouží, takže počet stran s nimi neklesne.
 */
export function probeNumberFor(pageCount: number): number {
  return Number('8'.repeat(String(Math.max(1, Math.trunc(pageCount))).length))
}
