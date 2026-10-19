import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { loadContent } from '@/content/loadContent'
import { IngredientPicker } from './IngredientPicker'

const all = [...loadContent().ingredients.values()]

function Harness() {
  const [value, setValue] = useState<{ query: string; id: string | null }>({ query: '', id: null })
  return (
    <>
      <IngredientPicker id="p1" label="Surovina 1" ingredients={all} query={value.query} selectedId={value.id} onChange={(query, id) => setValue({ query, id })} />
      <output data-testid="selected">{value.id ?? '–'}</output>
      <button type="button">jinam</button>
    </>
  )
}

test('psaní ukáže návrhy, šipka a Enter vyberou surovinu', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  const input = screen.getByRole('combobox', { name: 'Surovina 1' })
  expect(input).not.toHaveAttribute('aria-controls')
  await user.type(input, 'mouka')
  expect(input).toHaveAttribute('aria-expanded', 'true')
  expect(input).toHaveAttribute('aria-controls', screen.getByRole('listbox').id)
  const options = screen.getAllByRole('option')
  expect(options[0]).toHaveTextContent('Hladká mouka')
  expect(options[0]).toHaveAttribute('aria-selected', 'true')
  expect(input).toHaveAttribute('aria-activedescendant', options[0].id)
  await user.keyboard('{ArrowDown}{Enter}')
  expect(screen.getByTestId('selected')).toHaveTextContent('bramborova-mouka')
  expect(input).toHaveValue('Bramborová mouka')
  expect(screen.queryByRole('listbox')).toBeNull()
})

test('klik na návrh vybere surovinu', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  await user.type(screen.getByRole('combobox', { name: 'Surovina 1' }), 'vajic')
  await user.click(screen.getByRole('option', { name: 'Vejce' }))
  expect(screen.getByTestId('selected')).toHaveTextContent('vejce')
})

test('přepsání textu výběr zruší', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  const input = screen.getByRole('combobox', { name: 'Surovina 1' })
  await user.type(input, 'vajic{Enter}')
  expect(screen.getByTestId('selected')).toHaveTextContent('vejce')
  await user.type(input, 'x')
  expect(screen.getByTestId('selected')).toHaveTextContent('–')
})

test('opuštění pole s přesným názvem vybere surovinu samo', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  await user.type(screen.getByRole('combobox', { name: 'Surovina 1' }), 'sůl')
  await user.click(screen.getByRole('button', { name: 'jinam' }))
  expect(screen.getByTestId('selected')).toHaveTextContent('sul')
})

test('Escape zavře jen návrhy a nepropadne do dialogu', async () => {
  const user = userEvent.setup()
  const onOuterEscape = vi.fn()
  render(
    <div onKeyDown={(e) => { if (e.key === 'Escape') onOuterEscape() }}>
      <Harness />
    </div>,
  )
  await user.type(screen.getByRole('combobox', { name: 'Surovina 1' }), 'vajic')
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('listbox')).toBeNull()
  expect(onOuterEscape).not.toHaveBeenCalled()
  await user.keyboard('{Escape}')
  expect(onOuterEscape).toHaveBeenCalledOnce()
})

test('ArrowDown po Escape znovu otevře návrhy', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  const input = screen.getByRole('combobox', { name: 'Surovina 1' })
  await user.type(input, 'vajic')
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('listbox')).toBeNull()
  await user.keyboard('{ArrowDown}')
  expect(screen.getByRole('listbox')).toBeInTheDocument()
  expect(screen.getAllByRole('option')[0]).toHaveTextContent('Vejce')
  await user.keyboard('{Enter}')
  expect(screen.getByTestId('selected')).toHaveTextContent('vejce')
})

test('Enter s otevřenými návrhy neodešle formulář', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
  render(<form onSubmit={onSubmit}><Harness /></form>)
  await user.type(screen.getByRole('combobox', { name: 'Surovina 1' }), 'vajic{Enter}')
  expect(onSubmit).not.toHaveBeenCalled()
})
