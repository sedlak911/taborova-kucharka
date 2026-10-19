import type { ReactNode } from 'react'
import { CHAPTER_META } from '@/content/chapters'
import { BOOK_META } from '@/content/books'
import { FILTER_TAGS, FILTER_TAG_LABEL } from '@/content/derivedTags'
import {
  buildTocRows, filterRecipes, paginateTocRows, tocPageCount, tocRowKey, tocRowsForPage,
  type Filter, type TocMetrics, type TocRow,
} from '@/content/search'
import { EQUIPMENT } from '@/domain/schema'
import type { Book, Ingredient, Recipe } from '@/domain/types'
import type { Route } from '@/app/route'
import { isCustomRecipe } from '@/content/customRecipes'
import { HeartIcon, PenIcon } from './icons'
import { EQUIPMENT_LABEL } from './labels'
import { RecipeMarks } from './RecipeMarks'

const FILTER_BOOKS: Book[] = ['glasse-1747', 'rettigova-1868', 'hauptmann-1877', 'wells-1890', 'italian-1919', 'feldkochbuch-1940', 'navy-1944', 'army-baker-1945', 'receptury-1983', 'afrs-2003']

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

interface TocPagesProps {
  /** Všechny recepty (nefiltrované). */
  recipes: Recipe[]
  ingredients: Map<string, Ingredient>
  filter: Filter
  onFilterChange: (filter: Filter) => void
  favorites: Set<string>
  /** Číslo stránky knihy pro každý recept (id → index stránky receptu v aktuálním režimu). */
  pageNumbers: Map<string, number>
  /** Index stránky obsahu (0 = první, s panelem filtrů). */
  page: number
  onNavigate: (route: Route) => void
  onToggleFavorite: (id: string) => void
  inCart: Set<string>
  onToggleCart: (id: string) => void
  /** Otevře formulář nového vlastního receptu (pilulka v řádku „Moje“ na první stránce). */
  onNewRecipe?: () => void
  /** Naměřené výšky (TocProbe); bez nich platí odhad v jednotkách. */
  metrics?: TocMetrics | null
}

function Pill({ label, pressed, onClick, icon }: { label: string; pressed: boolean; onClick: () => void; icon?: ReactNode }) {
  return (
    <button type="button" className={`toc-pill${pressed ? ' toc-pill--on' : ''}`} aria-pressed={pressed} onClick={onClick}>
      {icon}
      {label}
    </button>
  )
}

interface HeadProps {
  recipes: Recipe[]
  filter: Filter
  onFilterChange: (filter: Filter) => void
  onNewRecipe?: () => void
}

function FilterPanel({ recipes, filter, onFilterChange, onNewRecipe }: HeadProps) {
  // jen vybavení, které některý recept opravdu uvádí (pilulka bez receptů by vždy vrátila „Nic nenalezeno“)
  const equipment = EQUIPMENT.filter((e) => recipes.some((r) => r.equipment.includes(e)))
  // „Vlastní“ jen když nějaký vlastní recept existuje (pilulka bez receptů by vždy vrátila „Nic nenalezeno“)
  const sourceBooks = FILTER_BOOKS.filter((b) => recipes.some((r) => r.source.book === b))
  const books: Book[] = recipes.some(isCustomRecipe) ? [...sourceBooks, 'vlastni'] : sourceBooks
  return (
    <div className="toc-filters">
      <fieldset>
        <legend>Štítky</legend>
        {FILTER_TAGS.map((t) => (
          <Pill key={t} label={FILTER_TAG_LABEL[t]} pressed={filter.tags.includes(t)} onClick={() => onFilterChange({ ...filter, tags: toggle(filter.tags, t) })} />
        ))}
      </fieldset>
      <fieldset>
        <legend>Vybavení</legend>
        {equipment.map((e) => (
          <Pill key={e} label={EQUIPMENT_LABEL[e]} pressed={filter.equipment.includes(e)} onClick={() => onFilterChange({ ...filter, equipment: toggle(filter.equipment, e) })} />
        ))}
      </fieldset>
      <fieldset>
        <legend>Zdroj</legend>
        {books.map((b) => (
          <Pill key={b} label={BOOK_META[b].shortTitle} pressed={filter.books.includes(b)} onClick={() => onFilterChange({ ...filter, books: toggle(filter.books, b) })} />
        ))}
      </fieldset>
      <fieldset>
        <legend>Moje</legend>
        <Pill icon={<HeartIcon filled={filter.favoritesOnly} />} label="Jen oblíbené" pressed={filter.favoritesOnly} onClick={() => onFilterChange({ ...filter, favoritesOnly: !filter.favoritesOnly })} />
        {onNewRecipe && (
          <button type="button" className="toc-pill toc-pill--new" onClick={onNewRecipe}>
            <span aria-hidden="true">+ </span>Nový recept
          </button>
        )}
      </fieldset>
    </div>
  )
}

/** Hlavička první stránky obsahu: nadpis a filtry; měří se jako celek (`display: flow-root`). */
export function TocHead(props: HeadProps) {
  return (
    <div className="toc-head">
      <h2 className="toc-title">Obsah</h2>
      <FilterPanel {...props} />
    </div>
  )
}

interface ListItemProps {
  row: TocRow
  pageNumber: number | undefined
  favorite: boolean
  inCart: boolean
  onNavigate: (route: Route) => void
  onToggleFavorite: (id: string) => void
  onToggleCart: (id: string) => void
}

/** Jeden řádek obsahu (nadpis kapitoly nebo recept); `data-toc-key` slouží k měření výšky (TocProbe). */
export function TocListItem({ row, pageNumber, favorite, inCart, onNavigate, onToggleFavorite, onToggleCart }: ListItemProps) {
  if (row.kind === 'chapter') {
    return (
      <li className="toc-chapter" data-toc-key={tocRowKey(row)}>
        <h3>{CHAPTER_META[row.chapter].title}</h3>
      </li>
    )
  }
  const { recipe } = row
  return (
    <li className="toc-recipe" data-toc-key={tocRowKey(row)}>
      {/* značky uvnitř obsahové plochy: mimo úchyt pro otáčení na vnějším okraji stránky */}
      <RecipeMarks
        compact
        label={recipe.title}
        favorite={favorite}
        onToggleFavorite={() => onToggleFavorite(recipe.id)}
        inCart={inCart}
        onToggleCart={() => onToggleCart(recipe.id)}
      />
      <button type="button" className="toc-row" onClick={() => onNavigate({ kind: 'recipe', id: recipe.id })}>
        {/* tečky jsou v toku textu hned za posledním řádkem názvu; přesah ořízne .toc-row-text před číslem */}
        <span className="toc-row-text">
          <span className="toc-row-title">{recipe.title}</span>
          {isCustomRecipe(recipe) && (
            <>
              {/* mezera mezi názvem a skrytým textem pro přístupné jméno tlačítka */}
              {' '}
              <span className="toc-row-own" title="Vlastní recept">
                <PenIcon />
                <span className="visually-hidden">(vlastní)</span>
              </span>
            </>
          )}
          <span className="toc-row-dots" aria-hidden="true" />
        </span>
        <span className="toc-row-page">{pageNumber}</span>
      </button>
    </li>
  )
}

function emptyText(filter: Filter, favorites: Set<string>): string {
  if (filter.favoritesOnly && favorites.size === 0) return 'Zatím žádné oblíbené recepty – označ srdíčko u receptu.'
  return 'Nic nenalezeno.'
}

/** Obsah rozdělený na stránky; komponenta vykreslí jednu stránku (`page`). Stav filtru drží rodič. */
export function TocPages({ recipes, ingredients, filter, onFilterChange, favorites, pageNumbers, page, onNavigate, onToggleFavorite, inCart, onToggleCart, onNewRecipe, metrics }: TocPagesProps) {
  const total = tocPageCount(recipes, metrics)
  const filtered = filterRecipes(recipes, ingredients, filter, { favorites })
  const rows = tocRowsForPage(paginateTocRows(buildTocRows(filtered), metrics), page, total)

  return (
    <div className="toc-page">
      {page === 0 && <TocHead recipes={recipes} filter={filter} onFilterChange={onFilterChange} onNewRecipe={onNewRecipe} />}
      {filtered.length === 0 && page === 0 && <p className="toc-empty">{emptyText(filter, favorites)}</p>}
      {filtered.length > 0 && rows.length === 0 && page > 0 && <p className="toc-empty">Výsledky filtru jsou na předchozích stranách obsahu.</p>}
      <ul className="toc-list">
        {rows.map((row) => (
          <TocListItem
            key={tocRowKey(row)}
            row={row}
            pageNumber={row.kind === 'recipe' ? pageNumbers.get(row.recipe.id) : undefined}
            favorite={row.kind === 'recipe' && favorites.has(row.recipe.id)}
            inCart={row.kind === 'recipe' && inCart.has(row.recipe.id)}
            onNavigate={onNavigate}
            onToggleFavorite={onToggleFavorite}
            onToggleCart={onToggleCart}
          />
        ))}
      </ul>
      <span className="visually-hidden">Strana obsahu {page + 1} z {total}</span>
    </div>
  )
}
