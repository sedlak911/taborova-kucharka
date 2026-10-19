// src/print/BookletPrint.tsx
import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import { COOKBOOK_TITLE } from '@/content/books'
import type { Portions } from '@/domain/portions'
import type { Ingredient } from '@/domain/types'
import { IngredientTable } from '@/pages/IngredientTable'
import { CATEGORY_LABEL, formatDate, peopleHeading, plural } from '@/pages/labels'
import { ShoppingItemRow, ShoppingListHead } from '@/pages/ShoppingListPage'
import { BOOKLET_PAGE_CSS, bookletOrder, packBlocks } from './booklet'
import type { BookletBlock } from './bookletBlocks'
import { RecipePrintHead, RecipePrintNote, RecipePrintSource, RecipePrintStep } from './RecipePrint'

interface Context {
  ingredients: Map<string, Ingredient>
  portions: Portions
  historical: boolean
  date: Date
}

interface Props extends Context {
  blocks: BookletBlock[]
}

function Block({ block, ingredients, portions, historical, date }: { block: BookletBlock } & Context) {
  switch (block.kind) {
    case 'title':
      return (
        <div className="booklet-title">
          <h2>{COOKBOOK_TITLE}</h2>
          <p className="booklet-title__people">{peopleHeading(portions.people)}</p>
          <p className="booklet-title__date">{formatDate(date)}</p>
          <p className="booklet-title__contents">{`${block.recipeCount} ${plural(block.recipeCount, 'recept', 'recepty', 'receptů')} · nákupní seznam na konci`}</p>
        </div>
      )
    case 'recipe-main':
      return (
        <>
          <RecipePrintHead recipe={block.recipe} people={portions.people} multiplier={block.multiplier} />
          <IngredientTable recipe={block.recipe} ingredients={ingredients} portions={portions} historical={historical} perPerson={false} multiplier={block.multiplier} />
        </>
      )
    case 'recipe-step':
      return <RecipePrintStep recipe={block.recipe} index={block.step} />
    case 'recipe-note':
      return <RecipePrintNote recipe={block.recipe} />
    case 'recipe-source':
      return <RecipePrintSource recipe={block.recipe} />
    case 'list-head':
      return <ShoppingListHead people={portions.people} historical={historical} dayFactor={portions.dayFactor} date={date} />
    case 'list-item':
      return (
        <section className="shopping-group">
          {block.item === 0 && <h3>{CATEGORY_LABEL[block.group.category]}</h3>}
          <ul>
            <ShoppingItemRow item={block.group.items[block.item]} />
          </ul>
        </section>
      )
  }
}

/**
 * Brožurka A5 na A4 na šířku (spec §4 [R1]) ve dvou fázích téhož synchronního vykreslení (flushSync v usePrintJob):
 * 1. bloky se vykreslí do měřicího sloupce o šířce těla strany A5 a změří se;
 * 2. rozdělí se na strany (packBlocks), doplní do násobku 4 a vysází po listech v pořadí pro skládání (bookletOrder).
 * Aktualizaci stavu z useLayoutEffect React provede synchronně, takže window.print() už vidí vysázené listy.
 */
export function BookletPrint({ blocks, ...ctx }: Props) {
  const measureRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<number[][] | null>(null)

  useLayoutEffect(() => {
    const root = measureRef.current
    if (pages !== null || !root) return
    const heights = [...root.querySelectorAll<HTMLElement>(':scope > .booklet-flow > .booklet-block')].map((el) => el.getBoundingClientRect().height)
    const capacity = root.querySelector<HTMLElement>(':scope > .booklet-page__body')?.getBoundingClientRect().height ?? 0
    setPages(packBlocks(blocks, heights, capacity))
  }, [blocks, pages])

  const renderBlock = (i: number) => {
    const block = blocks[i]
    // pojistka: index ze starého stránkování mimo rozsah (bloky se mezitím změnily) se přeskočí
    if (!block) return null
    return (
      <div key={i} className="booklet-block">
        <Block block={block} {...ctx} />
      </div>
    )
  }

  if (pages === null) {
    return (
      <div className="booklet-measure" ref={measureRef}>
        {/* prázdné tělo strany: jeho výška je kapacita strany */}
        <div className="booklet-page__body" />
        <div className="booklet-flow">{blocks.map((_, i) => renderBlock(i))}</div>
      </div>
    )
  }

  const half = (n: number) => (
    <div key={n} className="booklet-page" data-page={n}>
      {n <= pages.length && (
        <>
          <div className="booklet-page__body booklet-flow">{pages[n - 1].map(renderBlock)}</div>
          {n > 1 && <span className="booklet-page__number">{n}</span>}
        </>
      )}
    </div>
  )

  return (
    <div className="booklet">
      <style>{BOOKLET_PAGE_CSS}</style>
      {bookletOrder(pages.length).map((sheet, i) => (
        <Fragment key={i}>
          <div className="booklet-sheet">{sheet.front.map(half)}</div>
          <div className="booklet-sheet">{sheet.back.map(half)}</div>
        </Fragment>
      ))}
    </div>
  )
}
