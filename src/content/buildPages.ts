import { CHAPTERS } from '@/domain/schema'
import type { Chapter, Recipe } from '@/domain/types'
import type { ViewMode } from '@/book/model'

export type PageKind = 'cover' | 'about' | 'toc' | 'chapter' | 'recipe' | 'blank' | 'cart' | 'list' | 'settings'
export type RecipeHalf = 'left' | 'right' | 'full'

export interface PageEntry {
  id: string
  kind: PageKind
  recipeId?: string
  chapter?: Chapter
  tocPage?: number
  /** Část receptu: levá = údaje a suroviny, pravá = postup, full = celý recept na jedné stránce (mobil). */
  half?: RecipeHalf
}

export interface BookLayout {
  entries: PageEntry[]
  /** Index stránky receptu: levé poloviny (spread, lichý) nebo celé stránky (single). */
  recipeIndex: Map<string, number>
  chapterIndex: Map<Chapter, number>
  tocIndex: number
  /** Košík: vždy levá strana (lichý index), nákupní seznam hned za ním vpravo. */
  cartIndex: number
  listIndex: number
  settingsIndex: number
}

/**
 * Čistá funkce: z receptů sestaví pořadí stránek knihy pro režim `mode` (výchozí `spread`).
 * Spread (desktop): index 0 je obal (vpravo), sudé indexy jsou pravé strany, liché levé; úvod kapitoly a seznam
 * začínají vždy vpravo, recept je dvoustrana (levá lichá + pravá sudá), košík vlevo a seznam vedle něj vpravo.
 * Single (mobil, spec §2 [R2]): recept je jedna stránka a prázdné stránky se nevkládají (parita nemá smysl).
 * Číslo strany = index, takže obsah ukazuje čísla aktuálního režimu. Tiráž je poslední.
 */
export function buildLayout(recipes: Recipe[], opts: { tocPageCount: number; mode?: ViewMode }): BookLayout {
  const single = opts.mode === 'single'
  const entries: PageEntry[] = []
  const recipeIndex = new Map<string, number>()
  const chapterIndex = new Map<Chapter, number>()
  let blankCount = 0

  const push = (entry: PageEntry): number => entries.push(entry) - 1
  const alignToRight = () => {
    if (!single && entries.length % 2 !== 0) push({ id: `blank-${blankCount++}`, kind: 'blank' })
  }

  const alignToLeft = () => {
    if (!single && entries.length % 2 === 0) push({ id: `blank-${blankCount++}`, kind: 'blank' })
  }

  push({ id: 'cover', kind: 'cover' })
  push({ id: 'about-left', kind: 'about' })
  push({ id: 'about-right', kind: 'about' })

  const tocIndex = entries.length
  const tocPageCount = Math.max(1, opts.tocPageCount)
  for (let i = 0; i < tocPageCount; i++) push({ id: `toc-${i}`, kind: 'toc', tocPage: i })

  for (const chapter of CHAPTERS) {
    const inChapter = recipes.filter((r) => r.chapter === chapter)
    if (inChapter.length === 0) continue
    alignToRight()
    chapterIndex.set(chapter, push({ id: `chapter-${chapter}`, kind: 'chapter', chapter }))
    for (const r of inChapter) {
      if (single) {
        recipeIndex.set(r.id, push({ id: `recipe-${r.id}`, kind: 'recipe', recipeId: r.id, chapter, half: 'full' }))
        continue
      }
      // kapitola je na sudém indexu → levá polovina receptu na lichém; dvojice drží paritu
      recipeIndex.set(r.id, push({ id: `recipe-${r.id}`, kind: 'recipe', recipeId: r.id, chapter, half: 'left' }))
      // dvojtečka není v kebab-case id, takže id pravé poloviny nekoliduje s jiným receptem
      push({ id: `recipe-${r.id}:postup`, kind: 'recipe', recipeId: r.id, chapter, half: 'right' })
    }
  }

  alignToLeft()
  const cartIndex = push({ id: 'cart', kind: 'cart' })
  const listIndex = push({ id: 'list', kind: 'list' })
  const settingsIndex = push({ id: 'settings', kind: 'settings' })

  return { entries, recipeIndex, chapterIndex, tocIndex, cartIndex, listIndex, settingsIndex }
}
