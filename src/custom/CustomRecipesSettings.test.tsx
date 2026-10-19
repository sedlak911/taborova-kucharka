import { useState, type ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loadContent } from '@/content/loadContent'
import { MAX_BACKUP_BYTES, readFileText } from '@/state/backup'
import { customRecipe } from '@/test/customRecipe'
import { CustomRecipesSettings } from './CustomRecipesSettings'

const { recipes, ingredients } = loadContent()
const staticIds = new Set(recipes.map((r) => r.id))
const jsonFile = (data: unknown) =>
  new File([typeof data === 'string' ? data : JSON.stringify(data)], 'recepty.json', { type: 'application/json' })

type Props = Omit<ComponentProps<typeof CustomRecipesSettings>, 'message' | 'onMessage'>

// hlášku drží rodič (viz Props), v testu ji nahrazuje tento obal
function Host(props: Props) {
  const [message, setMessage] = useState('')
  return <CustomRecipesSettings {...props} message={message} onMessage={setMessage} />
}

function setup(over: Partial<Props> = {}) {
  const props = { recipes: [], ingredients, staticIds, onNewRecipe: vi.fn(), onImport: vi.fn(), now: () => new Date(2026, 9, 15), ...over }
  render(<Host {...props} />)
  return { props, user: userEvent.setup() }
}

let confirm: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:recepty')
  URL.revokeObjectURL = vi.fn()
  confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
})

afterEach(() => {
  vi.restoreAllMocks()
})

test('bez vlastních receptů: nadpis sekce, export zakázaný, Nový recept funguje', async () => {
  const { props, user } = setup()
  expect(screen.getByRole('heading', { name: 'Vlastní recepty' })).toBeInTheDocument()
  expect(screen.getByText(/Zatím žádný vlastní recept\./)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Exportovat vlastní recepty (JSON)' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Nový recept' }))
  expect(props.onNewRecipe).toHaveBeenCalledOnce()
})

test('export stáhne vlastni-recepty-2026-10-15.json s polem receptů', async () => {
  let downloaded = ''
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloaded = this.download
  })
  const own = customRecipe()
  const { user } = setup({ recipes: [own] })
  expect(screen.getByText(/Vlastní recepty v knize: 1\./)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Exportovat vlastní recepty (JSON)' }))
  expect(downloaded).toBe('vlastni-recepty-2026-10-15.json')
  const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob
  expect(blob.type).toBe('application/json')
  expect(JSON.parse(await readFileText(blob))).toEqual([own])
})

test('import: nové přidá, duplicitní po odmítnutí přeskočí, nenačtené vypíše', async () => {
  const own = customRecipe()
  const other = customRecipe({ id: 'vlastni-kase-0001', title: 'Kaše' })
  const { props, user } = setup({ recipes: [own] })
  await user.upload(screen.getByLabelText('Importovat vlastní recepty'), jsonFile([own, other, { title: 'Rozbitý' }]))
  expect(
    await screen.findByText('Přidáno: 1, přeskočeno (už v knize): 1, nenačteno: 1 (Rozbitý – neodpovídá schématu receptu).'),
  ).toBeInTheDocument()
  expect(confirm).toHaveBeenCalledWith('1 z importovaných receptů už v knize je (Babiččiny lívance). Přepsat? OK = přepsat, Zrušit = ponechat současné.')
  expect(props.onImport).toHaveBeenCalledWith([own, other], false)
})

test('import s potvrzeným přepsáním', async () => {
  confirm.mockReturnValue(true)
  const own = customRecipe()
  const { props, user } = setup({ recipes: [own] })
  await user.upload(screen.getByLabelText('Importovat vlastní recepty'), jsonFile([{ ...own, title: 'Lívance II' }]))
  expect(await screen.findByText('Přidáno: 0, přepsáno: 1.')).toBeInTheDocument()
  expect(props.onImport).toHaveBeenCalledWith([{ ...own, title: 'Lívance II' }], true)
})

test('poškozený soubor: hláška a nic se neimportuje', async () => {
  const { props, user } = setup()
  await user.upload(screen.getByLabelText('Importovat vlastní recepty'), jsonFile('{nejson'))
  expect(await screen.findByText('Soubor není platný JSON.')).toBeInTheDocument()
  expect(props.onImport).not.toHaveBeenCalled()
  expect(confirm).not.toHaveBeenCalled()
})

test('příliš velký soubor se odmítne dřív, než se přečte', async () => {
  const { props, user } = setup()
  const big = new File(['x'], 'velky.json', { type: 'application/json' })
  Object.defineProperty(big, 'size', { value: MAX_BACKUP_BYTES + 1 })
  await user.upload(screen.getByLabelText('Importovat vlastní recepty'), big)
  expect(await screen.findByText('Soubor je příliš velký (nejvýš 1 MB).')).toBeInTheDocument()
  expect(props.onImport).not.toHaveBeenCalled()
})
