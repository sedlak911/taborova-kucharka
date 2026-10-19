// src/pages/NumberField.test.tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { NumberField } from './NumberField'

test('potvrdí platné číslo, prázdné nepotvrdí a po opuštění ukáže uloženou (upnutou) hodnotu', () => {
  const onCommit = vi.fn()
  const field = (value: number) => <NumberField label="Děti" value={value} min={0} max={500} onCommit={onCommit} />
  const { rerender } = render(field(2))
  const input = screen.getByRole('spinbutton', { name: 'Děti' })
  expect(input).toHaveValue(2)
  fireEvent.change(input, { target: { value: '' } })
  expect(onCommit).not.toHaveBeenCalled()
  expect(input).toHaveValue(null)
  fireEvent.change(input, { target: { value: '18' } })
  expect(onCommit).toHaveBeenLastCalledWith(18)
  fireEvent.change(input, { target: { value: '600' } })
  expect(onCommit).toHaveBeenLastCalledWith(600)
  rerender(field(500)) // rodič hodnotu upnul
  expect(input).toHaveValue(600) // rozepsaná hodnota zůstává, dokud pole nemá focus pryč
  fireEvent.blur(input)
  expect(input).toHaveValue(500)
})
