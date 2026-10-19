// Relativní importy: soubor používá i scripts/validate.ts (tsconfig.scripts.json nemá alias @).
import type { Recipe } from '../domain/types'
import { BOOK_META } from './books'

/** Recept je „rychlý“, když trvá nejvýš tolik minut (spec §5.1 [R1]). */
export const QUICK_MAX_MINUTES = 45
/** Recept je „historický“, když jeho kniha vyšla před tímto rokem (všechny kromě AFRS 2003 a vlastních). */
export const HISTORIC_BEFORE_YEAR = 1950

/** Štítky filtru v obsahu (pořadí = pořadí pilulek). `bez-masa` a `sladke` chybí záměrně – duplikují kapitoly. */
export const FILTER_TAGS = ['levne', 'rychle', 'historicke', 'tabor', 'kotlik', 'pripravit-predem'] as const
export type FilterTag = (typeof FILTER_TAGS)[number]

export const FILTER_TAG_LABEL: Record<FilterTag, string> = {
  levne: 'levné',
  rychle: 'rychlé',
  historicke: 'historické',
  tabor: 'táborové',
  kotlik: 'do kotlíku',
  'pripravit-predem': 'připravit předem',
}

export function isQuick(recipe: Pick<Recipe, 'timeMinutes'>): boolean {
  return recipe.timeMinutes <= QUICK_MAX_MINUTES
}

export function isHistoric(recipe: Pick<Recipe, 'source'>): boolean {
  return BOOK_META[recipe.source.book].year < HISTORIC_BEFORE_YEAR
}

/** Má recept štítek filtru? `rychle` a `historicke` se odvozují, ostatní se čtou z `recipe.tags`. */
export function hasFilterTag(recipe: Recipe, tag: FilterTag): boolean {
  if (tag === 'rychle') return isQuick(recipe)
  if (tag === 'historicke') return isHistoric(recipe)
  return recipe.tags.includes(tag)
}

export function recipeFilterTags(recipe: Recipe): FilterTag[] {
  return FILTER_TAGS.filter((t) => hasFilterTag(recipe, t))
}
