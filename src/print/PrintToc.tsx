import { CHAPTER_META } from '@/content/chapters'
import { buildTocRows } from '@/content/search'
import type { Chapter, Recipe } from '@/domain/types'

interface Props {
  /** Všechny recepty – tištěný obsah ignoruje filtry obsahu na obrazovce. */
  recipes: Recipe[]
  /** Číslo strany knihy: recept → levá strana dvoustrany. */
  recipePages: ReadonlyMap<string, number>
  /** Číslo strany úvodu kapitoly. */
  chapterPages: ReadonlyMap<Chapter, number>
}

/** Tištěný obsah (Ctrl+P na obalu, obsahu, kapitole, tiráži): kapitoly a recepty s čísly stran. */
export function PrintToc({ recipes, recipePages, chapterPages }: Props) {
  return (
    <article className="print-toc">
      <h2>Obsah</h2>
      <ul className="print-toc__list">
        {buildTocRows(recipes).map((row) =>
          row.kind === 'chapter' ? (
            <li key={`c-${row.chapter}`} className="print-toc__chapter">
              <span className="print-toc__title">{CHAPTER_META[row.chapter].title}</span>
              <span className="print-toc__dots" aria-hidden="true" />
              <span className="print-toc__page">{chapterPages.get(row.chapter)}</span>
            </li>
          ) : (
            <li key={row.recipe.id} className="print-toc__recipe">
              <span className="print-toc__title">{row.recipe.title}</span>
              <span className="print-toc__dots" aria-hidden="true" />
              <span className="print-toc__page">{recipePages.get(row.recipe.id)}</span>
            </li>
          ),
        )}
      </ul>
    </article>
  )
}
