import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loadContent } from '@/content/loadContent'
import { SearchOverlay } from './SearchOverlay'

const { recipes, ingredients } = loadContent()

function setup() {
  const onNavigate = vi.fn()
  render(<SearchOverlay recipes={recipes} ingredients={ingredients} onNavigate={onNavigate} />)
  return onNavigate
}

test('lupa otevře dialog s fokusovaným inputem', () => {
  setup()
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Hledat' }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(screen.getByRole('searchbox')).toHaveFocus()
})

test('Escape dialog zavře', () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: 'Hledat' }))
  fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' })
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('Enter naviguje na první výsledek a zavře', async () => {
  const onNavigate = setup()
  fireEvent.click(screen.getByRole('button', { name: 'Hledat' }))
  await userEvent.type(screen.getByRole('searchbox'), 'cocka{Enter}')
  expect(onNavigate).toHaveBeenCalledWith({ kind: 'recipe', id: 'cockova-polevka' })
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('klik na výsledek ukáže kapitolu a knihu a naviguje', async () => {
  const onNavigate = setup()
  fireEvent.click(screen.getByRole('button', { name: 'Hledat' }))
  await userEvent.type(screen.getByRole('searchbox'), 'treska')
  const hit = screen.getAllByRole('button', { name: /Maso a ryby · Italian 1919/ })[0]
  fireEvent.click(hit)
  expect(onNavigate).toHaveBeenCalledWith({ kind: 'recipe', id: expect.any(String) })
})

test('bez shody ukáže „Nic nenalezeno.“', async () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: 'Hledat' }))
  await userEvent.type(screen.getByRole('searchbox'), 'zzzqqq')
  expect(screen.getByText('Nic nenalezeno.')).toBeInTheDocument()
})

test('shoda v názvu receptu je před shodou v surovinách', async () => {
  const onNavigate = setup()
  fireEvent.click(screen.getByRole('button', { name: 'Hledat' }))
  await userEvent.type(screen.getByRole('searchbox'), 'gulas{Enter}')
  expect(onNavigate).toHaveBeenCalledWith({ kind: 'recipe', id: 'hovezi-gulas' })
})
