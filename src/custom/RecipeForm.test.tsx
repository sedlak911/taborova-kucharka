// src/custom/RecipeForm.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loadContent } from '@/content/loadContent'
import { customRecipe } from '@/test/customRecipe'
import { STEPS_HINT } from './draft'
import { RecipeForm } from './RecipeForm'

const { ingredients } = loadContent()

function setup(over: Partial<React.ComponentProps<typeof RecipeForm>> = {}) {
  const props = { ingredients, makeId: vi.fn(() => 'vlastni-test-0000'), onSave: vi.fn(), onCancel: vi.fn(), ...over }
  render(<RecipeForm {...props} />)
  return { props, user: userEvent.setup() }
}

beforeEach(() => {
  window.confirm = vi.fn(() => true)
})

test('nový recept: dialog s nadpisem, fokus v poli Název, předvyplněná kapitola', () => {
  setup({ defaultChapter: 'polevky' })
  expect(screen.getByRole('dialog', { name: 'Nový recept' })).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Název' })).toHaveFocus()
  expect(screen.getByRole('combobox', { name: 'Kapitola' })).toHaveValue('polevky')
  expect(screen.getByRole('textbox', { name: 'Pro kolik porcí je recept napsaný' })).toHaveValue('4')
})

test('vyplnění a uložení vytvoří vlastní recept', async () => {
  const { props, user } = setup({ defaultChapter: 'snidane-a-pecivo' })
  await user.type(screen.getByRole('textbox', { name: 'Název' }), 'Vaječná omeleta')
  const servings = screen.getByRole('textbox', { name: 'Pro kolik porcí je recept napsaný' })
  await user.clear(servings)
  await user.type(servings, '2')
  await user.type(screen.getByRole('textbox', { name: 'Čas (minuty)' }), '15')
  await user.type(screen.getByRole('combobox', { name: 'Surovina 1' }), 'vejce{Enter}')
  await user.type(screen.getByRole('textbox', { name: 'Množství 1' }), '3')
  await user.selectOptions(screen.getByRole('combobox', { name: 'Jednotka 1' }), 'ks')
  await user.type(screen.getByRole('textbox', { name: 'Postup (každý krok na nový řádek)' }), 'Rozšlehej vejce.{Enter}5 min: Osmaž na pánvi.')
  await user.click(screen.getByRole('checkbox', { name: 'levné' }))
  await user.click(screen.getByRole('button', { name: 'Uložit recept' }))
  expect(props.makeId).toHaveBeenCalledWith('Vaječná omeleta')
  expect(props.onSave).toHaveBeenCalledWith({
    id: 'vlastni-test-0000',
    title: 'Vaječná omeleta',
    chapter: 'snidane-a-pecivo',
    baseServings: 2,
    timeMinutes: 15,
    difficulty: 1,
    tags: ['levne'],
    equipment: [],
    allergens: ['vejce'],
    ingredients: [{ ingredientId: 'vejce', amount: 3, unit: 'ks' }],
    steps: [{ text: 'Rozšlehej vejce.' }, { text: 'Osmaž na pánvi.', minutes: 5 }],
    source: { book: 'vlastni' },
    verified: true,
  })
})

test('neplatný formulář: souhrn, hlášky u polí a fokus na první chybné pole', async () => {
  const { props, user } = setup()
  await user.click(screen.getByRole('button', { name: 'Uložit recept' }))
  expect(props.onSave).not.toHaveBeenCalled()
  expect(screen.getByRole('alert')).toHaveTextContent('Recept zatím nejde uložit – oprav označená pole.')
  const title = screen.getByRole('textbox', { name: 'Název' })
  expect(title).toHaveAttribute('aria-invalid', 'true')
  expect(title).toHaveAccessibleDescription('Napiš název receptu')
  expect(title).toHaveFocus()
  expect(screen.getByRole('combobox', { name: 'Surovina 1' })).toHaveAccessibleDescription('Přidej aspoň jednu surovinu')
  expect(screen.getByRole('textbox', { name: 'Postup (každý krok na nový řádek)' })).toHaveAccessibleDescription(/^Napiš aspoň jeden krok postupu/)
})

test('jednotka bez převodu na gramy: hláška u jednotky řádku', async () => {
  const { user } = setup()
  await user.type(screen.getByRole('combobox', { name: 'Surovina 1' }), 'mouka{Enter}')
  await user.type(screen.getByRole('textbox', { name: 'Množství 1' }), '2')
  await user.selectOptions(screen.getByRole('combobox', { name: 'Jednotka 1' }), 'ks')
  await user.click(screen.getByRole('button', { name: 'Uložit recept' }))
  expect(screen.getByRole('combobox', { name: 'Jednotka 1' })).toHaveAccessibleDescription(
    'Hladká mouka: pro jednotku „ks“ chybí převod na gramy – zvol g nebo ml',
  )
})

test('špetka: množství je 1 a pole je zakázané', async () => {
  const { user } = setup()
  await user.selectOptions(screen.getByRole('combobox', { name: 'Jednotka 1' }), 'spetka')
  expect(screen.getByRole('textbox', { name: 'Množství 1' })).toBeDisabled()
  expect(screen.getByRole('textbox', { name: 'Množství 1' })).toHaveValue('1')
})

test('řádky surovin: přidat a odebrat', async () => {
  const { user } = setup()
  const lines = () => screen.getAllByRole('combobox', { name: /^Surovina \d+$/ })
  expect(lines()).toHaveLength(3)
  await user.click(screen.getByRole('button', { name: '+ Přidat surovinu' }))
  expect(lines()).toHaveLength(4)
  await user.click(screen.getByRole('button', { name: 'Odebrat surovinu 1' }))
  expect(lines()).toHaveLength(3)
})

test('úprava: předvyplněno, uložení vrátí recept se stejným id', async () => {
  const own = customRecipe()
  const { props, user } = setup({ recipe: own })
  expect(screen.getByRole('dialog', { name: 'Upravit recept' })).toBeInTheDocument()
  const title = screen.getByRole('textbox', { name: 'Název' })
  expect(title).toHaveValue('Babiččiny lívance')
  expect(screen.getByRole('combobox', { name: 'Surovina 1' })).toHaveValue('Hladká mouka')
  expect(screen.getByRole('textbox', { name: 'Množství 1' })).toHaveValue('125')
  expect(screen.getByRole('textbox', { name: 'Množství 3' })).toBeDisabled()
  await user.clear(title)
  await user.type(title, 'Lívance')
  await user.click(screen.getByRole('button', { name: 'Uložit recept' }))
  expect(props.makeId).not.toHaveBeenCalled()
  expect(props.onSave).toHaveBeenCalledWith({ ...own, title: 'Lívance' })
})

test('Escape bez změn zavře hned', async () => {
  const { props, user } = setup()
  await user.keyboard('{Escape}')
  expect(props.onCancel).toHaveBeenCalledOnce()
  expect(window.confirm).not.toHaveBeenCalled()
})

test('rozepsaný recept: Escape i Zrušit se zeptají, odmítnutí formulář nechá', async () => {
  const { props, user } = setup()
  vi.mocked(window.confirm).mockReturnValue(false)
  await user.type(screen.getByRole('textbox', { name: 'Název' }), 'Kaše')
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: 'Zrušit' }))
  expect(window.confirm).toHaveBeenCalledTimes(2)
  expect(window.confirm).toHaveBeenCalledWith('Zahodit rozepsaný recept?')
  expect(props.onCancel).not.toHaveBeenCalled()
  vi.mocked(window.confirm).mockReturnValue(true)
  await user.click(screen.getByRole('button', { name: 'Zrušit' }))
  expect(props.onCancel).toHaveBeenCalledOnce()
})

test('neplatný formulář nelosuje id', async () => {
  const { props, user } = setup()
  await user.click(screen.getByRole('button', { name: 'Uložit recept' }))
  expect(props.makeId).not.toHaveBeenCalled()
})

test('Escape v otevřeném našeptávači zavře jen návrhy, ne formulář', async () => {
  const { props, user } = setup()
  await user.type(screen.getByRole('combobox', { name: 'Surovina 1' }), 'mou')
  expect(screen.getByRole('listbox')).toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  expect(props.onCancel).not.toHaveBeenCalled()
})

test('po zavření se fokus vrátí na prvek, který formulář otevřel', () => {
  const opener = document.createElement('button')
  document.body.append(opener)
  const { unmount } = render(<RecipeForm ingredients={ingredients} makeId={vi.fn()} onSave={vi.fn()} onCancel={vi.fn()} returnFocusTo={opener} />)
  expect(opener).not.toHaveFocus()
  unmount()
  expect(opener).toHaveFocus()
  opener.remove()
})

test('po odebrání řádku suroviny zůstane fokus v dialogu a Escape funguje', async () => {
  const { props, user } = setup()
  await user.click(screen.getByRole('button', { name: 'Odebrat surovinu 2' }))
  const dialog = screen.getByRole('dialog')
  expect(dialog).toContainElement(document.activeElement as HTMLElement)
  expect(screen.getByRole('combobox', { name: 'Surovina 2' })).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(props.onCancel).toHaveBeenCalledOnce()
})

test('odebrání posledního zbylého řádku přesune fokus na Přidat surovinu', async () => {
  const { user } = setup()
  for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Odebrat surovinu 1' }))
  expect(screen.getByRole('button', { name: '+ Přidat surovinu' })).toHaveFocus()
})

test('klik na pozadí mimo list vrátí fokus do dialogu a Escape funguje', async () => {
  const { props, user } = setup()
  await user.click(screen.getByRole('dialog'))
  expect(screen.getByRole('dialog')).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(props.onCancel).toHaveBeenCalledOnce()
})

test('onDirtyChange hlásí rozepsanost formuláře a po zavření false', async () => {
  const onDirtyChange = vi.fn()
  const { user } = setup({ onDirtyChange })
  expect(onDirtyChange).toHaveBeenLastCalledWith(false)
  await user.type(screen.getByRole('textbox', { name: 'Název' }), 'x')
  expect(onDirtyChange).toHaveBeenLastCalledWith(true)
})

test('pole Postup má nápovědu k prefixu času a „mezitím“ (R3)', () => {
  setup()
  const steps = screen.getByRole('textbox', { name: 'Postup (každý krok na nový řádek)' })
  expect(steps).toHaveAccessibleDescription(STEPS_HINT)
  const hint = document.getElementById(steps.getAttribute('aria-describedby') ?? '')
  expect(hint).toHaveTextContent(/15 min:/)
  expect(hint).toHaveTextContent(/mezitím/)
})

test('chybná doba kroku: hláška u pole Postup', async () => {
  const { props, user } = setup()
  await user.type(screen.getByRole('textbox', { name: 'Postup (každý krok na nový řádek)' }), '0 min: Duš.')
  await user.click(screen.getByRole('button', { name: 'Uložit recept' }))
  expect(props.onSave).not.toHaveBeenCalled()
  expect(screen.getByRole('textbox', { name: 'Postup (každý krok na nový řádek)' })).toHaveAccessibleDescription(/^Krok 1: doba musí být 1–600 minut/)
})
