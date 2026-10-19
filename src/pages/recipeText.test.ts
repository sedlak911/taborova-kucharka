import { loadContent } from '@/content/loadContent'
import { customRecipe } from '@/test/customRecipe'
import { bookLabel, metaLine, originalTitle, sourceLine } from './recipeText'

const { recipes } = loadContent()
const byId = (id: string) => recipes.find((r) => r.id === id)!
const chilli = byId('chilli-con-carne')

test('původní název a kniha s rokem', () => {
  expect(originalTitle(chilli)).toBe('Chili Con Carne')
  expect(bookLabel(chilli)).toBe('Armed Forces Recipe Service, 2003')
  expect(bookLabel({ ...chilli, source: { ...chilli.source, book: 'vlastni' } })).toBe('Vlastní recepty')
})

test('patička zdroje: kniha, rok, strana PDF a původní název', () => {
  expect(sourceLine(byId('hovezi-gulas'))).toMatch(/^Zdroj: Armed Forces Recipe Service, 2003, s\. 808 \(PDF\) · Hungarian Goulash( · čísla odhadnuta)?$/)
  expect(sourceLine({ ...chilli, verified: false })).toMatch(/ · čísla odhadnuta$/)
})

test('řádek údajů: čas, obtížnost, vybavení, alergeny', () => {
  expect(metaLine(chilli)).toBe('90 min · obtížnost snadné · plotna · bez alergenů')
  expect(metaLine({ ...chilli, equipment: [], allergens: ['lepek', 'mleko'] })).toBe('90 min · obtížnost snadné · alergeny: lepek, mléko')
})

test('vlastní recept: kniha bez roku, patička s počtem porcí', () => {
  expect(bookLabel(customRecipe())).toBe('Vlastní recepty')
  expect(sourceLine(customRecipe())).toBe('Vlastní recept · zapsaný pro 2 porce')
  expect(sourceLine(customRecipe({ baseServings: 6 }))).toBe('Vlastní recept · zapsaný pro 6 porcí')
})
