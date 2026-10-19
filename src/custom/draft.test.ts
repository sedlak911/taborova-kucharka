// src/custom/draft.test.ts
import { loadContent } from '@/content/loadContent'
import { customRecipe } from '@/test/customRecipe'
import { draftFromRecipe, draftToRecipe, emptyDraft, formatStepLine, lineErrorKey, newLine, parseDecimal, parseStepLine, parseSteps, STEP_MINUTES_MAX, type RecipeDraft } from './draft'

const { ingredients } = loadContent()
const ctx = { id: 'vlastni-test-0000', ingredients }

function filled(over: Partial<RecipeDraft> = {}): RecipeDraft {
  return {
    ...emptyDraft('snidane-a-pecivo'),
    title: '  Vaječná omeleta ',
    baseServings: '2',
    timeMinutes: '15',
    lines: [
      { ...newLine(), ingredientId: 'vejce', query: 'Vejce', amount: '3', unit: 'ks', note: ' rozšlehaná ' },
      { ...newLine(), ingredientId: 'sul', query: 'Sůl', amount: '', unit: 'spetka', note: '' },
      newLine(),
    ],
    steps: '1. Rozšlehej vejce.\n\n2) Osmaž na pánvi.\n',
    ...over,
  }
}

describe('parseDecimal', () => {
  test.each([['250', 250], ['1,5', 1.5], [' 1.5 ', 1.5], ['1/2', 0.5], ['1 1/2', 1.5], ['1 000', 1000]])('%j → %d', (text, n) => expect(parseDecimal(text)).toBe(n))
  test.each(['', 'abc', '1,5,2', '-3', '1/0', '1 1', ',5', '1 1/0'])('%j → NaN', (text) => expect(parseDecimal(text)).toBeNaN())
})

test('emptyDraft: 4 porce, tři prázdné řádky s jedinečnými klíči', () => {
  const d = emptyDraft()
  expect(d.chapter).toBe('z-jednoho-hrnce')
  expect(d.baseServings).toBe('4')
  expect(new Set(d.lines.map((l) => l.key)).size).toBe(3)
})

test('platný draft → recept (trim, špetka = 1, prázdné řádky pryč, alergeny ze surovin)', () => {
  expect(draftToRecipe(filled(), ctx)).toEqual({
    ok: true,
    recipe: {
      id: 'vlastni-test-0000',
      title: 'Vaječná omeleta',
      chapter: 'snidane-a-pecivo',
      baseServings: 2,
      timeMinutes: 15,
      difficulty: 1,
      tags: [],
      equipment: [],
      allergens: ['vejce'],
      ingredients: [
        { ingredientId: 'vejce', amount: 3, unit: 'ks', note: 'rozšlehaná' },
        { ingredientId: 'sul', amount: 1, unit: 'spetka' },
      ],
      steps: [{ text: 'Rozšlehej vejce.' }, { text: 'Osmaž na pánvi.' }],
      source: { book: 'vlastni' },
      verified: true,
    },
  })
})

test('štítky, vybavení a poznámka', () => {
  const r = draftToRecipe(filled({ tags: ['tabor', 'levne'], equipment: ['plotna'], note: ' Na kotlíku taky. ' }), ctx)
  if (!r.ok) throw new Error('mělo projít')
  expect(r.recipe.tags).toEqual(['levne', 'tabor'])
  expect(r.recipe.equipment).toEqual(['plotna'])
  expect(r.recipe.modernNote).toBe('Na kotlíku taky.')
})

test('prázdný formulář: české hlášky u názvu, času, surovin a postupu', () => {
  const r = draftToRecipe(emptyDraft(), ctx)
  if (r.ok) throw new Error('mělo selhat')
  expect(r.errors).toEqual({
    title: 'Napiš název receptu',
    timeMinutes: 'Zadej čas v minutách',
    lines: 'Přidej aspoň jednu surovinu',
    steps: 'Napiš aspoň jeden krok postupu',
  })
})

test('chyby řádku surovin mají klíč řádku', () => {
  const d = filled()
  const [vejce, sul] = d.lines
  const r = draftToRecipe({ ...d, lines: [{ ...vejce, ingredientId: null, query: 'vajíčk' }, { ...sul, unit: 'g', amount: '0' }] }, ctx)
  if (r.ok) throw new Error('mělo selhat')
  expect(r.errors[lineErrorKey(vejce.key, 'ingredientId')]).toBe('Vyber surovinu z nabídky')
  expect(r.errors[lineErrorKey(sul.key, 'amount')]).toBe('Množství musí být větší než nula')
})

test('množství, které není číslo', () => {
  const d = filled()
  const r = draftToRecipe({ ...d, lines: [{ ...d.lines[0], amount: 'hrst' }] }, ctx)
  expect(r.ok ? null : r.errors[lineErrorKey(d.lines[0].key, 'amount')]).toBe('Zadej množství číslem (např. 250 nebo 1,5)')
})

test('jednotka bez převodu na gramy (hladká mouka v ks) neprojde', () => {
  const line = { ...newLine(), ingredientId: 'hladka-mouka', query: 'Hladká mouka', amount: '2', unit: 'ks' as const }
  const r = draftToRecipe(filled({ lines: [line] }), ctx)
  expect(r.ok ? null : r.errors[lineErrorKey(line.key, 'unit')]).toBe('Hladká mouka: pro jednotku „ks“ chybí převod na gramy – zvol g nebo ml')
})

test.each([
  ['baseServings', '0', 'Aspoň 1 porce'],
  ['baseServings', '2,5', 'Počet porcí musí být celé číslo'],
  ['baseServings', '51', 'Nejvýš 50 porcí'],
  ['timeMinutes', 'hodinu', 'Zadej čas v minutách'],
  ['timeMinutes', '2000', 'Nejvýš 1440 minut (24 hodin)'],
] as const)('%s = %j → %s', (field, value, message) => {
  const r = draftToRecipe(filled(field === 'baseServings' ? { baseServings: value } : { timeMinutes: value }), ctx)
  expect(r.ok ? null : r.errors[field]).toBe(message)
})

test('úprava: draftFromRecipe → draftToRecipe vrátí tentýž recept', () => {
  const own = customRecipe({ modernNote: 'Podávej s povidly.', tags: ['levne'] })
  const draft = draftFromRecipe(own, ingredients)
  expect(draft.lines.map((l) => l.query)).toEqual(['Hladká mouka', 'Vejce', 'Sůl'])
  expect(draft.steps).toBe(own.steps.map(formatStepLine).join('\n'))
  expect(draft.baseServings).toBe('2')
  expect(draftToRecipe(draft, { id: own.id, ingredients })).toEqual({ ok: true, recipe: own })
})

test('úprava receptu s časy: draftFromRecipe → draftToRecipe vrátí tentýž recept', () => {
  const own = customRecipe({ steps: [{ text: 'Smíchej těsto.', minutes: 5 }, { text: 'Rozehřej pánev.', minutes: 2, parallel: true }, { text: 'Peč.', minutes: 20 }] })
  expect(draftToRecipe(draftFromRecipe(own, ingredients), { id: own.id, ingredients })).toEqual({ ok: true, recipe: own })
})

test('parseSteps: řádek = krok, bez prázdných řádků a ručního číslování', () => {
  expect(parseSteps('1. Rozšlehej vejce.\n\n2) Osmaž.\r\n  Podávej  \n')).toEqual([{ text: 'Rozšlehej vejce.' }, { text: 'Osmaž.' }, { text: 'Podávej' }])
  expect(parseSteps('1.5 l vody přiveď k varu.')).toEqual([{ text: '1.5 l vody přiveď k varu.' }])
})

test('parseSteps: číslování pryč, pak prefix času a souběžnosti', () => {
  expect(parseSteps('1. 5 min: Nakrájej.\n2) mezitím 10 min: Uvař.\n  Podávej  ')).toEqual([
    { text: 'Nakrájej.', minutes: 5 },
    { text: 'Uvař.', minutes: 10, parallel: true },
    { text: 'Podávej' },
  ])
})

describe('parseStepLine (R3, ruling R8, PF1: jen s dvojtečkou)', () => {
  test.each([
    ['15 min: Duš pod pokličkou.', { text: 'Duš pod pokličkou.', minutes: 15 }],
    ['15 min Duš pod pokličkou.', { text: '15 min Duš pod pokličkou.' }],
    ['15min:Duš.', { text: 'Duš.', minutes: 15 }],
    ['15 MIN : Duš.', { text: 'Duš.', minutes: 15 }],
    ['20 minut: Peč.', { text: 'Peč.', minutes: 20 }],
    ['1 minutu: Míchej.', { text: 'Míchej.', minutes: 1 }],
    ['2 minuty: Míchej.', { text: 'Míchej.', minutes: 2 }],
    ['5 min.: Osol.', { text: 'Osol.', minutes: 5 }],
    ['mezitím: Uvař rýži.', { text: 'Uvař rýži.', parallel: true }],
    ['Mezitím 10 min: Uvař rýži.', { text: 'Uvař rýži.', minutes: 10, parallel: true }],
    ['MEZITÍM 10 MIN : Uvař rýži.', { text: 'Uvař rýži.', minutes: 10, parallel: true }],
    ['mezitim : Uvař rýži.', { text: 'Uvař rýži.', parallel: true }],
    ['mezitím 10 min Uvař rýži.', { text: 'mezitím 10 min Uvař rýži.' }],
    ['10 minut vař do měkka.', { text: '10 minut vař do měkka.' }],
    ['Mezitím uvař rýži.', { text: 'Mezitím uvař rýži.' }],
    ['Mezitím 2 vejce rozšlehej.', { text: 'Mezitím 2 vejce rozšlehej.' }],
    ['1,5 l vody přiveď k varu.', { text: '1,5 l vody přiveď k varu.' }],
    ['Pozor: horké.', { text: 'Pozor: horké.' }],
    ['15 min', { text: '15 min' }],
    ['15 min:', { text: '', minutes: 15 }],
    ['1,5 min: Opeč.', { text: 'Opeč.', minutes: 1.5 }],
    ['2.5 min: Opeč.', { text: 'Opeč.', minutes: 2.5 }],
    ['Mezitím 1,5 minuty: Opeč.', { text: 'Opeč.', minutes: 1.5, parallel: true }],
    ['1,5 min Opeč.', { text: '1,5 min Opeč.' }],
  ])('%j', (line, step) => expect(parseStepLine(line)).toEqual(step))
})

test('formatStepLine ↔ parseStepLine: zpáteční cesta', () => {
  const steps = [
    { text: 'Nakrájej cibuli.' },
    { text: 'Osmaž cibuli.', minutes: 10 },
    { text: 'Uvař rýži.', parallel: true as const },
    { text: 'Uvař těstoviny.', minutes: 12, parallel: true as const },
    { text: 'Mezitím uvař rýži.' },
  ]
  expect(steps.map(formatStepLine)).toEqual(['Nakrájej cibuli.', '10 min: Osmaž cibuli.', 'mezitím: Uvař rýži.', 'mezitím 12 min: Uvař těstoviny.', 'Mezitím uvař rýži.'])
  for (const s of steps) expect(parseStepLine(formatStepLine(s))).toEqual(s)
})

test.each([
  ['0 min: Duš.', `Krok 1: doba musí být 1–${STEP_MINUTES_MAX} minut`],
  ['Osol.\n601 min: Duš.', `Krok 2: doba musí být 1–${STEP_MINUTES_MAX} minut`],
  ['0 min:', `Krok 1: doba musí být 1–${STEP_MINUTES_MAX} minut`],
  ['1,5 min: Opeč.', 'Krok 1: dobu zadej v celých minutách'],
  ['Osol.\n2.5 min: Opeč.', 'Krok 2: dobu zadej v celých minutách'],
  ['mezitím 0,5 min: Opeč.', 'Krok 1: dobu zadej v celých minutách'],
  ['15 min:', 'Krok 1: chybí text kroku'],
  ['Osol.\nmezitím:', 'Krok 2: chybí text kroku'],
])('chybný krok %j → hláška u pole Postup', (steps, message) => {
  expect(draftToRecipe(filled({ steps }), ctx)).toEqual({ ok: false, errors: { steps: message } })
})

test('desetinná hodnota mimo prefix zůstává textem kroku', () => {
  const r = draftToRecipe(filled({ steps: '1,5 l vody přiveď k varu.' }), ctx)
  if (!r.ok) throw new Error('mělo projít')
  expect(r.recipe.steps).toEqual([{ text: '1,5 l vody přiveď k varu.' }])
})

test('600 min projde; draft s časy → kroky jako objekty a úprava je vrátí do textu', () => {
  expect(draftToRecipe(filled({ steps: '600 min: Peč.' }), ctx).ok).toBe(true)
  const text = '5 min: Rozšlehej vejce.\nmezitím 3 min: Rozehřej pánev.\n10 min: Osmaž.'
  const r = draftToRecipe(filled({ steps: text }), ctx)
  if (!r.ok) throw new Error('mělo projít')
  expect(r.recipe.steps).toEqual([
    { text: 'Rozšlehej vejce.', minutes: 5 },
    { text: 'Rozehřej pánev.', minutes: 3, parallel: true },
    { text: 'Osmaž.', minutes: 10 },
  ])
  expect(draftFromRecipe(r.recipe, ingredients).steps).toBe(text)
})
