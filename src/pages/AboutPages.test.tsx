import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BOOK_META } from '@/content/books'
import { loadContent } from '@/content/loadContent'
import { AboutLeft, AboutRight } from './AboutPages'

const { recipes } = loadContent()

test('pravá strana obsahuje knihy s recepty s rokem a popisem', () => {
  render(<AboutRight recipes={recipes} />)
  for (const b of ['afrs-2003', 'navy-1944', 'italian-1919', 'feldkochbuch-1940'] as const) {
    const meta = BOOK_META[b]
    expect(screen.getByRole('heading', { level: 3, name: new RegExp(`${meta.title}.*${meta.year}`) })).toBeInTheDocument()
    expect(screen.getByText(meta.description)).toBeInTheDocument()
  }
})

test('zdroje jsou seřazené od nejnovější knihy po nejstarší', () => {
  render(<AboutRight recipes={recipes} />)
  const years = screen.getAllByRole('heading', { level: 3 }).map((h) => Number(h.textContent!.match(/\((\d{4})\)/)![1]))
  expect(years).toEqual([...years].sort((a, b) => b - a))
})

test('kniha bez receptu se mezi zdroji neukáže', () => {
  render(<AboutRight recipes={recipes.filter((r) => r.source.book === 'navy-1944')} />)
  expect(screen.getByRole('heading', { level: 3, name: new RegExp(BOOK_META['navy-1944'].title) })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { level: 3, name: new RegExp(BOOK_META['afrs-2003'].title) })).toBeNull()
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
