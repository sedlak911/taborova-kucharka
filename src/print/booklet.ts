/** Sešitek A5 na A4 na šířku: 2 strany na list, přeložit a sešít uprostřed (booklet imposition, spec §4 [R1]). */

/** `@page` brožurky; vkládá ho BookletPrint jako <style> – výchozí tisk je A4 na výšku s okraji 15 mm. */
export const BOOKLET_PAGE_CSS = '@page { size: A4 landscape; margin: 0; }'

/** Počet stran zaokrouhlený nahoru na násobek 4 (jeden list = 4 strany). */
export function bookletPageCount(n: number): number {
  return n <= 0 ? 0 : Math.ceil(n / 4) * 4
}

/** Jeden list: přední a zadní strana, každá [levá polovina, pravá polovina]; čísla stran od 1. */
export interface BookletSheet { front: [number, number]; back: [number, number] }

/**
 * Pořadí stran sešitku z `n` stran (doplní se do násobku 4 N; strany > n jsou prázdné).
 * List i: přední [N − 2i, 2i + 1], zadní [2i + 2, N − 2i − 1].
 * Při oboustranném tisku s překlápěním po krátké straně je za stranou 1 strana 2.
 */
export function bookletOrder(n: number): BookletSheet[] {
  const total = bookletPageCount(n)
  const sheets: BookletSheet[] = []
  for (let i = 0; i < total / 4; i++) {
    sheets.push({ front: [total - 2 * i, 2 * i + 1], back: [2 * i + 2, total - 2 * i - 1] })
  }
  return sheets
}

/** Strany v pořadí, jak jdou do tiskárny (přední, zadní, přední, …). */
export function bookletSequence(n: number): number[] {
  return bookletOrder(n).flatMap((s) => [...s.front, ...s.back])
}

/** Blok obsahu brožurky: `startsPage` = začíná novou stranou (titul, recept, nákupní seznam). */
export interface PackableBlock { startsPage: boolean }

/**
 * Rozdělí bloky na strany podle naměřených výšek: blok, který se na stranu nevejde, jde celý na další.
 * Blok vyšší než celá strana dostane stranu sám (nikdy se nezacyklí).
 * `capacity <= 0` (jsdom bez layoutu) = bez omezení výšky, dělí se jen podle `startsPage`.
 * Vrací indexy bloků po stranách.
 */
export function packBlocks(blocks: readonly PackableBlock[], heights: readonly number[], capacity: number): number[][] {
  const pages: number[][] = []
  let used = 0
  blocks.forEach((block, i) => {
    const raw = heights[i] ?? 0
    const h = Number.isFinite(raw) ? raw : 0
    const current = pages.at(-1)
    const overflow = capacity > 0 && current !== undefined && used + h > capacity
    if (!current || block.startsPage || overflow) {
      pages.push([i])
      used = h
    } else {
      current.push(i)
      used += h
    }
  })
  return pages
}
