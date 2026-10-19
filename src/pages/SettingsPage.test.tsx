import { fireEvent, render, screen } from '@testing-library/react'
import type { UserState } from '@/state/userState'
import { SettingsPage } from './SettingsPage'

function setup(settings: UserState['settings'] = { childCoef: 0.8, historicalIngredients: false }) {
  const onChange = vi.fn()
  render(<SettingsPage settings={settings} onChange={onChange} />)
  return onChange
}

test('koeficient dítěte a denní cíl kcal (výchozí 2300)', () => {
  const onChange = setup()
  expect(screen.getByRole('heading', { level: 2, name: 'Tiráž a nastavení' })).toBeInTheDocument()
  const coef = screen.getByRole('spinbutton', { name: 'Koeficient dítěte' })
  expect(coef).toHaveValue(0.8)
  fireEvent.change(coef, { target: { value: '0.7' } })
  expect(onChange).toHaveBeenLastCalledWith({ childCoef: 0.7 })
  const kcal = screen.getByRole('spinbutton', { name: 'Denní cíl dospělého (kcal)' })
  expect(kcal).toHaveValue(2300)
  fireEvent.change(kcal, { target: { value: '2500' } })
  expect(onChange).toHaveBeenLastCalledWith({ kcalTarget: 2500 })
  expect(screen.queryByRole('button', { name: /^Výchozí cíl/ })).toBeNull()
})

test('vlastní cíl lze vrátit na výchozí', () => {
  const onChange = setup({ childCoef: 0.8, historicalIngredients: false, kcalTarget: 2000 })
  expect(screen.getByRole('spinbutton', { name: 'Denní cíl dospělého (kcal)' })).toHaveValue(2000)
  fireEvent.click(screen.getByRole('button', { name: /^Výchozí cíl/ }))
  expect(onChange).toHaveBeenCalledWith({ kcalTarget: undefined })
})

test('přepínač historických surovin a panel ukládání jako obsah tiráže', () => {
  const onChange = vi.fn()
  render(
    <SettingsPage settings={{ childCoef: 0.8, historicalIngredients: false }} onChange={onChange}>
      <p>panel ukládání</p>
    </SettingsPage>,
  )
  const box = screen.getByRole('checkbox', { name: /Historické suroviny/ })
  expect(box).not.toBeChecked()
  fireEvent.click(box)
  expect(onChange).toHaveBeenCalledWith({ historicalIngredients: true })
  expect(screen.getByText('panel ukládání')).toBeInTheDocument()
  expect(screen.queryByText(/fázi 7/)).toBeNull()
})

test('children (sekce vlastních receptů) jsou před tiráží', () => {
  const { container } = render(
    <SettingsPage settings={{ childCoef: 0.8, historicalIngredients: false }} onChange={vi.fn()}>
      <p>sekce vlastních receptů</p>
    </SettingsPage>,
  )
  const section = screen.getByText('sekce vlastních receptů')
  const colophon = container.querySelector('.settings-colophon')!
  expect(section.compareDocumentPosition(colophon) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})
