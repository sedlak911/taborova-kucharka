import { render, screen } from '@testing-library/react'
import { buildLayout } from '@/content/buildPages'
import { CHAPTER_META } from '@/content/chapters'
import { loadContent } from '@/content/loadContent'
import { buildTocRows, tocPageCount } from '@/content/search'
import { PrintToc } from './PrintToc'

const { recipes } = loadContent()
const layout = buildLayout(recipes, { tocPageCount: tocPageCount(recipes) })
const setup = () => render(<PrintToc recipes={recipes} recipePages={layout.recipeIndex} chapterPages={layout.chapterIndex} />)

test('všechny kapitoly a recepty s čísly stran knihy, bez filtrů a interakce', () => {
  const { container } = setup()
  expect(screen.getByRole('heading', { level: 2, name: 'Obsah' })).toBeInTheDocument()
  expect(container.querySelectorAll('.print-toc__recipe')).toHaveLength(recipes.length)
  expect(container.querySelectorAll('.print-toc__chapter')).toHaveLength(layout.chapterIndex.size)
  expect(container.querySelectorAll('button, input, select, textarea')).toHaveLength(0)
})

test('číslo strany receptu a kapitoly odpovídá knize', () => {
  const { container } = setup()
  const gulas = [...container.querySelectorAll('.print-toc__recipe')].find((li) => li.querySelector('.print-toc__title')?.textContent === 'Hovězí guláš')!
  expect(gulas.querySelector('.print-toc__page')).toHaveTextContent(String(layout.recipeIndex.get('hovezi-gulas')))
  const first = buildTocRows(recipes)[0]
  if (first.kind !== 'chapter') throw new Error('obsah má začínat kapitolou')
  const chapter = container.querySelector('.print-toc__chapter')!
  expect(chapter.querySelector('.print-toc__title')).toHaveTextContent(CHAPTER_META[first.chapter].title)
  expect(chapter.querySelector('.print-toc__page')).toHaveTextContent(String(layout.chapterIndex.get(first.chapter)))
})
