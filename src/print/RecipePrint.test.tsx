// src/print/RecipePrint.test.tsx
import { render, screen } from '@testing-library/react'
import { loadContent } from '@/content/loadContent'
import { metaLine, sourceLine } from '@/pages/recipeText'
import { PrintRecipe, RecipePrintHead, RecipePrintNote, RecipePrintStep } from './RecipePrint'

const { recipes, ingredients } = loadContent()
const gulas = recipes.find((r) => r.id === 'hovezi-gulas')!
const portions = { people: { adults: 6, children: 18 }, childCoef: 0.8, dayFactor: 1 }
const setup = () => render(<PrintRecipe recipe={gulas} ingredients={ingredients} portions={portions} historical={false} />)

test('A4 recept: název, původní název + kniha, „Pro 24 osob (…)“, údaje, sloupce Pro N osob a Na 1 osobu', () => {
  setup()
  expect(screen.getByRole('heading', { level: 2, name: 'Hovězí guláš' })).toBeInTheDocument()
  expect(screen.getByText('Hungarian Goulash · Armed Forces Recipe Service, 2003')).toBeInTheDocument()
  expect(screen.getByText('Pro 24 osob (18 dětí + 6 dospělých)')).toBeInTheDocument()
  expect(screen.getByText(metaLine(gulas))).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: 'Pro 24 osob' })).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: 'Na 1 osobu' })).toBeInTheDocument()
})

test('celý postup číslovaný od 1, poznámka k modernizaci a patička zdroje', () => {
  const { container } = setup()
  expect(screen.getByRole('heading', { level: 3, name: 'Postup' })).toBeInTheDocument()
  const lists = [...container.querySelectorAll('.print-recipe__steps')]
  expect(lists.map((ol) => ol.getAttribute('start'))).toEqual(gulas.steps.map((_, i) => String(i + 1)))
  // data mají časy (Task 8): každý krok má značku před textem a „Hotovo“ je právě u posledního kroku
  const items = [...container.querySelectorAll('.print-recipe__steps li')]
  expect(items.map((li) => li.textContent?.replace(li.querySelector('.step-time')?.textContent ?? '', ''))).toEqual(gulas.steps.map((s) => s.text))
  expect(container.querySelectorAll('.print-recipe__steps .step-time')).toHaveLength(gulas.steps.length)
  expect(container.querySelectorAll('.print-recipe__total')).toHaveLength(1)
  expect(gulas.modernNote).toBeTruthy()
  expect(screen.getByText(gulas.modernNote!)).toBeInTheDocument()
  expect(screen.getByText(sourceLine(gulas))).toBeInTheDocument()
})

test('bez interakce a bez knižních prvků (značky, nutrice, číslo strany)', () => {
  const { container } = setup()
  expect(container.querySelectorAll('button, input, select, textarea')).toHaveLength(0)
  expect(container.querySelector('.recipe-marks, .nutrition-facts, .page-number')).toBeNull()
})

test('hlavička s násobkem (brožurka)', () => {
  render(<RecipePrintHead recipe={gulas} people={{ adults: 4, children: 0 }} multiplier={2} />)
  expect(screen.getByText('Pro 4 osoby · ×2')).toBeInTheDocument()
})

test('recept bez poznámky k modernizaci nic nevykreslí', () => {
  const { container } = render(<RecipePrintNote recipe={{ ...gulas, modernNote: undefined }} />)
  expect(container).toBeEmptyDOMElement()
})

const timedSteps = [
  { text: 'Nakrájej cibuli.', minutes: 5 },
  { text: 'Osmaž cibuli.', minutes: 10 },
  { text: 'Osol.' },
  { text: 'Duš pod pokličkou.', minutes: 35 },
  { text: 'Mezitím uvař rýži.', minutes: 20, parallel: true as const },
]
const timedGulas = { ...gulas, steps: timedSteps }

test('A4: značka stopek u každého kroku a „Hotovo“ za posledním krokem (R3)', () => {
  const { container } = render(<PrintRecipe recipe={timedGulas} ingredients={ingredients} portions={portions} historical={false} />)
  expect([...container.querySelectorAll('.print-recipe__steps .step-time')].map((m) => m.textContent)).toEqual(['0:00', '5:00', '15:00', '15:00', 'mezitím'])
  const total = container.querySelector('.print-recipe__total')!
  expect(total.textContent).toBe('Hotovo: 50:00')
  const lists = container.querySelectorAll('.print-recipe__steps')
  expect(lists[lists.length - 1].compareDocumentPosition(total) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(container.querySelectorAll('.print-recipe__total')).toHaveLength(1)
})

test('brožurka: „Hotovo“ je v bloku posledního kroku, ne u ostatních', () => {
  const last = render(<RecipePrintStep recipe={timedGulas} index={4} />)
  expect(last.container.querySelector('.print-recipe__total')).toHaveTextContent('Hotovo: 50:00')
  last.unmount()
  const middle = render(<RecipePrintStep recipe={timedGulas} index={1} />)
  expect(middle.container.querySelector('.print-recipe__total')).toBeNull()
  expect(middle.container.querySelector('.step-time')).toHaveTextContent('5:00')
})

test('tisk receptu bez časů: bez značek a bez „Hotovo“', () => {
  const untimed = { ...gulas, steps: gulas.steps.map((s) => ({ text: s.text })) }
  const { container } = render(<PrintRecipe recipe={untimed} ingredients={ingredients} portions={portions} historical={false} />)
  expect(container.querySelector('.step-time, .print-recipe__total')).toBeNull()
})
