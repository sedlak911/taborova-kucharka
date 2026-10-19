import { CHAPTERS, BOOKS } from '@/domain/schema'
import { CHAPTER_META } from './chapters'
import { BOOK_META } from './books'

test('každá kapitola má kompletní metadata', () => {
  for (const c of CHAPTERS) {
    const m = CHAPTER_META[c]
    expect(m.title.length).toBeGreaterThan(0)
    expect(m.quote.length).toBeGreaterThan(0)
    expect(m.quoteSource.length).toBeGreaterThan(0)
    expect(m.intro.length).toBeGreaterThan(0)
  }
})

test('každá kniha má metadata', () => {
  for (const b of BOOKS) {
    const m = BOOK_META[b]
    expect(m.title.length).toBeGreaterThan(0)
    expect(m.shortTitle.length).toBeGreaterThan(0)
    expect(m.description.length).toBeGreaterThan(0)
    expect(m.year).toBeGreaterThan(1700)
  }
})
