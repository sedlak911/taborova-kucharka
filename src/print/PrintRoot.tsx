// src/print/PrintRoot.tsx
import type { ReactNode } from 'react'
import type { CartLine, Portions } from '@/domain/portions'
import type { ShoppingGroup } from '@/domain/shopping'
import type { Chapter, Ingredient, Recipe } from '@/domain/types'
import { ShoppingListPage } from '@/pages/ShoppingListPage'
import type { PrintJob } from './printJob'
import { BookletPrint } from './BookletPrint'
import { bookletBlocks } from './bookletBlocks'
import { PrintRecipe } from './RecipePrint'
import { PrintToc } from './PrintToc'

/** Data pro tiskové stromy (z App, beze změny výpočtů). */
export interface PrintData {
  recipes: Recipe[]
  recipeById: ReadonlyMap<string, Recipe>
  ingredients: Map<string, Ingredient>
  portions: Portions
  historical: boolean
  shoppingList: ShoppingGroup[]
  recipePages: ReadonlyMap<string, number>
  chapterPages: ReadonlyMap<Chapter, number>
  /** Košík (brožurka: recepty a násobky). */
  cart: readonly CartLine[]
  /** Datum tisku do hlaviček. */
  date: Date
}

function renderJob(job: PrintJob, d: PrintData): ReactNode {
  switch (job.kind) {
    case 'recipe': {
      const recipe = d.recipeById.get(job.recipeId)
      return recipe ? <PrintRecipe recipe={recipe} ingredients={d.ingredients} portions={d.portions} historical={d.historical} /> : null
    }
    case 'list':
      return <ShoppingListPage groups={d.shoppingList} people={d.portions.people} historical={d.historical} dayFactor={d.portions.dayFactor} date={d.date} />
    case 'toc':
      return <PrintToc recipes={d.recipes} recipePages={d.recipePages} chapterPages={d.chapterPages} />
    case 'booklet':
      return (
        <BookletPrint
          key={JSON.stringify([d.cart, d.portions.people, d.portions.dayFactor, d.historical])}
          blocks={bookletBlocks(d.cart, d.recipeById, d.shoppingList)}
          ingredients={d.ingredients}
          portions={d.portions}
          historical={d.historical}
          date={d.date}
        />
      )
  }
}

/** Tiskový strom mimo knihu: na obrazovce neviditelný, v tisku (html[data-print]) jediný obsah. */
export function PrintRoot({ job, data }: { job: PrintJob; data: PrintData }) {
  return <div className={`print-root print-root--${job.kind}`}>{renderJob(job, data)}</div>
}
