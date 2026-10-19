import { indexToRoute, type Route } from '@/app/route'
import { buildLayout } from '@/content/buildPages'
import { loadContent } from '@/content/loadContent'
import { tocPageCount } from '@/content/search'
import { PRINT_JOB_LABEL, printJobForRoute, type PrintJob } from './printJob'

test.each([
  [{ kind: 'recipe', id: 'hovezi-gulas' }, { kind: 'recipe', recipeId: 'hovezi-gulas' }],
  [{ kind: 'list' }, { kind: 'list' }],
  [{ kind: 'cart' }, { kind: 'list' }],
  [{ kind: 'toc' }, { kind: 'toc' }],
  [{ kind: 'cover' }, { kind: 'toc' }],
  [{ kind: 'chapter', id: 'polevky' }, { kind: 'toc' }],
  [{ kind: 'settings' }, { kind: 'toc' }],
] as [Route, PrintJob][])('%o → %o', (route, job) => expect(printJobForRoute(route)).toEqual(job))

test('pravá polovina receptu (postup, na mobilu samostatná stránka) tiskne tentýž recept', () => {
  const { recipes } = loadContent()
  const layout = buildLayout(recipes, { tocPageCount: tocPageCount(recipes) })
  const left = layout.recipeIndex.get('hovezi-gulas')!
  expect(printJobForRoute(indexToRoute(left + 1, layout))).toEqual({ kind: 'recipe', recipeId: 'hovezi-gulas' })
})

test('přístupné jméno tlačítka tisku říká, co se vytiskne', () => {
  expect(PRINT_JOB_LABEL).toEqual({
    recipe: 'Tisk: recept (A4)',
    list: 'Tisk: nákupní seznam (A4)',
    toc: 'Tisk: obsah (A4)',
    booklet: 'Tisk: brožurka (A5)',
  })
})
