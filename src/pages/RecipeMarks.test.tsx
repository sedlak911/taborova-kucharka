import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecipeMarks } from './RecipeMarks'

function setup(over: Partial<React.ComponentProps<typeof RecipeMarks>> = {}) {
  const props = { favorite: false, onToggleFavorite: vi.fn(), ...over }
  return { ...render(<RecipeMarks {...props} />), props }
}

test('srdíčko odráží stav přes aria-pressed a hrnec „uvařeno“ už není', () => {
  setup({ favorite: true })
  expect(screen.getByRole('button', { name: 'Oblíbené' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.queryByRole('button', { name: /Uvařeno/ })).toBeNull()
})

test('klik na srdíčko volá callback', async () => {
  const { props } = setup()
  await userEvent.click(screen.getByRole('button', { name: 'Oblíbené' }))
  expect(props.onToggleFavorite).toHaveBeenCalledTimes(1)
})

test('label se připojí k přístupnému jménu, ikony jsou skryté', () => {
  const { container } = setup({ label: 'Čočková polévka', compact: true, onToggleCart: vi.fn() })
  expect(screen.getByRole('button', { name: 'Oblíbené: Čočková polévka' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Do košíku: Čočková polévka' })).toBeInTheDocument()
  expect(container.querySelector('.recipe-marks--compact')).not.toBeNull()
  container.querySelectorAll('svg').forEach((svg) => expect(svg).toHaveAttribute('aria-hidden', 'true'))
})

test('vyplněná ikona odpovídá stavu', () => {
  const { container } = setup({ favorite: true })
  expect(container.querySelector('.mark--favorite svg')).toHaveAttribute('fill', 'currentColor')
  expect(container.querySelector('.mark--cooked')).toBeNull()
})

test('košík je jen s onToggleCart, odráží stav a volá callback', async () => {
  setup()
  expect(screen.queryByRole('button', { name: /Do košíku/ })).toBeNull()
  const onToggleCart = vi.fn()
  setup({ inCart: true, onToggleCart, label: 'Hovězí guláš', compact: true })
  const btn = screen.getByRole('button', { name: 'Do košíku: Hovězí guláš' })
  expect(btn).toHaveAttribute('aria-pressed', 'true')
  expect(btn.querySelector('svg path')).toHaveAttribute('fill', 'currentColor')
  await userEvent.click(btn)
  expect(onToggleCart).toHaveBeenCalledTimes(1)
})
