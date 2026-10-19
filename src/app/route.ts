import { CHAPTERS } from '@/domain/schema'
import type { Chapter } from '@/domain/types'

export type Route =
  | { kind: 'cover' }
  | { kind: 'recipe'; id: string }
  | { kind: 'chapter'; id: Chapter }
  | { kind: 'toc' }
  | { kind: 'list' }
  | { kind: 'settings' }
  | { kind: 'cart' }
  | { kind: 'new-recipe' }
  | { kind: 'edit-recipe'; id: string }

/** Routy formuláře vlastního receptu: dialog nad knihou, ne stránka layoutu (ruling R7). */
export type EditorRoute = Extract<Route, { kind: 'new-recipe' | 'edit-recipe' }>

/** Minimální strukturální podoba BookLayout (kompatibilní s content/buildPages). */
export interface LayoutLike {
  entries: { kind: string; recipeId?: string; chapter?: Chapter }[]
  recipeIndex: Map<string, number>
  chapterIndex: Map<Chapter, number>
  tocIndex: number
  listIndex: number
  settingsIndex: number
  cartIndex: number
}

const isChapter = (s: string): s is Chapter => (CHAPTERS as readonly string[]).includes(s)

/** Hash → routa; prázdný hash a `#/` = obal, cokoli nerozpoznaného = null. */
export function parseRoute(hash: string): Route | null {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  if (parts.length === 0) return { kind: 'cover' }
  const [head, arg] = parts
  try {
    if (head === 'recept' && arg) {
      const id = decodeURIComponent(arg)
      return parts[2] === 'upravit' ? { kind: 'edit-recipe', id } : { kind: 'recipe', id }
    }
    if (head === 'kapitola' && arg) {
      const id = decodeURIComponent(arg)
      return isChapter(id) ? { kind: 'chapter', id } : null
    }
  } catch {
    return null
  }
  if (head === 'obsah') return { kind: 'toc' }
  if (head === 'seznam') return { kind: 'list' }
  if (head === 'nastaveni') return { kind: 'settings' }
  if (head === 'kosik') return { kind: 'cart' }
  if (head === 'novy-recept') return { kind: 'new-recipe' }
  return null
}

export function routeToHash(route: Route): string {
  switch (route.kind) {
    case 'recipe': return `#/recept/${encodeURIComponent(route.id)}`
    case 'chapter': return `#/kapitola/${route.id}`
    case 'toc': return '#/obsah'
    case 'list': return '#/seznam'
    case 'settings': return '#/nastaveni'
    case 'cart': return '#/kosik'
    case 'new-recipe': return '#/novy-recept'
    case 'edit-recipe': return `#/recept/${encodeURIComponent(route.id)}/upravit`
    default: return '#/'
  }
}

/** Index stránky pro routu; null = neznámý recept/kapitola. */
export function routeToIndex(route: Route, layout: LayoutLike): number | null {
  switch (route.kind) {
    case 'cover': return 0
    case 'recipe': return layout.recipeIndex.get(route.id) ?? null
    case 'chapter': return layout.chapterIndex.get(route.id) ?? null
    case 'toc': return layout.tocIndex
    case 'list': return layout.listIndex
    case 'settings': return layout.settingsIndex
    case 'cart': return layout.cartIndex
    // formulář je dialog nad knihou: pod novým receptem leží obsah, pod úpravou upravovaný recept
    case 'new-recipe': return layout.tocIndex
    case 'edit-recipe': return layout.recipeIndex.get(route.id) ?? null
  }
}

/** Routa pro index: nejbližší významná stránka od indexu směrem doleva (o knize → obal). */
export function indexToRoute(index: number, layout: LayoutLike): Route {
  // prázdná levá strana před úvodem kapitoly patří ke kapitole (dvoustrana [prázdná | kapitola]), ne k předchozímu receptu
  const next = layout.entries[index + 1]
  if (layout.entries[index]?.kind === 'blank' && next?.kind === 'chapter' && next.chapter) return { kind: 'chapter', id: next.chapter }
  for (let i = Math.min(index, layout.entries.length - 1); i >= 0; i--) {
    const e = layout.entries[i]
    if (e.kind === 'recipe' && e.recipeId) return { kind: 'recipe', id: e.recipeId }
    if (e.kind === 'chapter' && e.chapter) return { kind: 'chapter', id: e.chapter }
    if (e.kind === 'toc') return { kind: 'toc' }
    if (e.kind === 'cart') return { kind: 'cart' }
    if (e.kind === 'list') return { kind: 'list' }
    if (e.kind === 'settings') return { kind: 'settings' }
    if (e.kind === 'cover') return { kind: 'cover' }
  }
  return { kind: 'cover' }
}

/** Routa formuláře vlastního receptu z hashe; null = formulář je zavřený. */
export function editorRouteFromHash(hash: string): EditorRoute | null {
  const route = parseRoute(hash)
  return route?.kind === 'new-recipe' || route?.kind === 'edit-recipe' ? route : null
}
