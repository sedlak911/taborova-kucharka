import { render, screen } from '@testing-library/react'
import { BOOK_META } from '@/content/books'
import { CoverPage } from './CoverPage'

test('obal obsahuje výchozí titul, názvy všech knih a výzvu k otočení', () => {
  render(<CoverPage />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Recepty na vejlety, tábory a nebo když je do vejplaty daleko')
  for (const b of ['afrs-2003', 'navy-1944', 'italian-1919', 'feldkochbuch-1940', 'glasse-1747', 'rettigova-1868', 'hauptmann-1877', 'wells-1890', 'army-baker-1945', 'receptury-1983'] as const) {
    expect(screen.getByText(new RegExp(BOOK_META[b].title))).toBeInTheDocument()
  }
  expect(screen.getByText('Otoč stránku →')).toBeInTheDocument()
  expect(screen.getByText('Přejeď prstem')).toBeInTheDocument()
})

test('titul je konfigurovatelný', () => {
  render(<CoverPage title="Kuchařka" />)
  expect(screen.getByRole('heading', { level: 1, name: 'Kuchařka' })).toBeInTheDocument()
})

test('zlatý rám je u okrajů: čtyři rohy a čtyři ornamenty hran, skrytý před čtečkami, nic se nedeformuje', () => {
  const { container } = render(<CoverPage />)
  const frame = container.querySelector('.cover-frame')!
  expect(frame).toHaveAttribute('aria-hidden', 'true')
  for (const c of ['tl', 'tr', 'bl', 'br']) expect(frame.querySelector(`.cover-frame__corner--${c}`)).not.toBeNull()
  for (const e of ['top', 'bottom', 'left', 'right']) expect(frame.querySelector(`.cover-frame__edge--${e}`)).not.toBeNull()
  expect(container.querySelector('svg[preserveAspectRatio]')).toBeNull()
})
