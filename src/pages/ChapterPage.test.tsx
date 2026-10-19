import { render, screen } from '@testing-library/react'
import { CHAPTERS } from '@/domain/schema'
import { CHAPTER_META } from '@/content/chapters'
import { loadContent } from '@/content/loadContent'
import { ChapterPage } from './ChapterPage'

const { recipes } = loadContent()
const inChapter = (c: (typeof CHAPTERS)[number]) => recipes.filter((r) => r.chapter === c)
const pageOf = (id: string) => recipes.findIndex((r) => r.id === id) + 10

test('úvod polévek obsahuje název, citát, zdroj, úvod a názvy všech receptů se stranou', () => {
  const list = inChapter('polevky')
  expect(list.length).toBeGreaterThan(0)
  render(<ChapterPage chapter="polevky" recipes={list} pageNumberOf={pageOf} />)
  const meta = CHAPTER_META.polevky
  expect(screen.getByRole('heading', { level: 1, name: meta.title })).toBeInTheDocument()
  expect(screen.getByText(meta.quote)).toBeInTheDocument()
  expect(screen.getByText(meta.quoteSource)).toBeInTheDocument()
  expect(screen.getByText(meta.intro)).toBeInTheDocument()
  for (const r of list) {
    // stejný název může mít recept z víc knih (Zeleninová polévka z Navy i AFRS), odkaz se proto hledá podle cíle
    const link = screen.getAllByRole('link', { name: r.title }).find((a) => a.getAttribute('href') === `#/recept/${encodeURIComponent(r.id)}`)
    expect(link).toBeDefined()
    expect(link!.closest('li')).toHaveTextContent(String(pageOf(r.id)))
  }
})

test.each(CHAPTERS)('kapitola %s má právě jednu dekorativní ilustraci', (chapter) => {
  const { container } = render(<ChapterPage chapter={chapter} recipes={inChapter(chapter)} pageNumberOf={pageOf} />)
  const svgs = container.querySelectorAll('svg')
  expect(svgs).toHaveLength(1)
  expect(svgs[0]).toHaveAttribute('aria-hidden', 'true')
  expect(svgs[0]).toHaveAttribute('viewBox', '0 0 100 100')
})
