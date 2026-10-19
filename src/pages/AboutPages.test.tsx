import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BOOK_META } from '@/content/books'
import { loadContent } from '@/content/loadContent'
import { AboutLeft, AboutRight } from './AboutPages'

const { recipes } = loadContent()

test('pravá strana obsahuje všechny čtyři knihy s rokem a popisem', () => {
  render(<AboutRight recipes={recipes} />)
  for (const b of ['afrs-2003', 'navy-1944', 'italian-1919', 'feldkochbuch-1940'] as const) {
    const meta = BOOK_META[b]
    expect(screen.getByRole('heading', { level: 3, name: new RegExp(`${meta.title}.*${meta.year}`) })).toBeInTheDocument()
    expect(screen.getByText(meta.description)).toBeInTheDocument()
  }
})

test('citát se zobrazí, jen když ho recept dané knihy má', () => {
  const sample = { ...recipes[0], source: { ...recipes[0].source, book: 'navy-1944' as const }, quote: 'Testovací citát' }
  const { container } = render(<AboutRight recipes={[sample]} />)
  expect(screen.getByText('Testovací citát')).toBeInTheDocument()
  expect(container.querySelectorAll('blockquote')).toHaveLength(1)
})

test('tlačítko „Přejít na obsah“ naviguje na obsah', async () => {
  const onNavigate = vi.fn()
  render(<AboutLeft onNavigate={onNavigate} />)
  await userEvent.click(screen.getByRole('button', { name: 'Přejít na obsah' }))
  expect(onNavigate).toHaveBeenCalledWith({ kind: 'toc' })
})
