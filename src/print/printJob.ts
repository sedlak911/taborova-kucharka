import type { Route } from '@/app/route'

/** Co se tiskne. `kind` jde do `data-print` na <html>; print.css podle něj skryje knihu. */
export type PrintJob =
  | { kind: 'recipe'; recipeId: string }
  | { kind: 'list' }
  | { kind: 'booklet' }
  | { kind: 'toc' }
export type PrintKind = PrintJob['kind']

/**
 * Ctrl+P podle aktuální stránky (spec §4): recept → recept, nákupní seznam a košík → seznam, jinde obsah.
 * Celá kniha se netiskne; brožurka jen tlačítkem v košíku.
 */
export function printJobForRoute(route: Route): PrintJob {
  switch (route.kind) {
    case 'recipe':
      return { kind: 'recipe', recipeId: route.id }
    case 'list':
    case 'cart':
      return { kind: 'list' }
    default:
      return { kind: 'toc' }
  }
}

/** Přístupné jméno tlačítka tisku mimo knihu: co se vytiskne (spec §2 [R2]). Brožurka se tiskne jen z košíku. */
export const PRINT_JOB_LABEL: Record<PrintKind, string> = {
  recipe: 'Tisk: recept (A4)',
  list: 'Tisk: nákupní seznam (A4)',
  toc: 'Tisk: obsah (A4)',
  booklet: 'Tisk: brožurka (A5)',
}
