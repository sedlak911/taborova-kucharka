import { loadContent } from '@/content/loadContent'
import { SUGGEST_LIMIT, exactIngredient, suggestIngredients } from './ingredientSuggest'

const all = [...loadContent().ingredients.values()]

test('bez diakritiky: „vajicko“ najde Vejce přes alias', () => expect(suggestIngredients('vajicko', all)[0].id).toBe('vejce'))
test('přesný název první: „vejce“ → Vejce před Vejce mražená', () =>
  expect(suggestIngredients('vejce', all).map((i) => i.id).slice(0, 2)).toEqual(['vejce', 'vejce-mrazena']))
test('přesný alias „mouka“ (Hladká mouka) před ostatními moukami, ty pak abecedně', () =>
  expect(suggestIngredients('mouka', all).map((i) => i.id).slice(0, 3)).toEqual(['hladka-mouka', 'celozrnna-mouka', 'hruba-mouka']))
test('nejvýš 8 návrhů, prázdný dotaz nic', () => {
  expect(suggestIngredients('a', all)).toHaveLength(SUGGEST_LIMIT)
  expect(suggestIngredients('  ', all)).toEqual([])
})
test('exactIngredient: přesný název, pak alias', () => {
  expect(exactIngredient('Sůl', all)?.id).toBe('sul')
  expect(exactIngredient('psenicna mouka', all)?.id).toBe('hladka-mouka')
  expect(exactIngredient('vejc', all)).toBeUndefined()
})
