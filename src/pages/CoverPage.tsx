import { BOOK_META, COOKBOOK_TITLE } from '@/content/books'
import { BOOKS } from '@/domain/schema'
import { CoverFrame } from './ornaments'

interface CoverPageProps {
  title?: string
}

// chronologicky – s deseti knihami se seznam jinak špatně čte
const SOURCE_BOOKS = BOOKS.filter((b) => b !== 'vlastni' && b !== 'overene').sort((a, b) => BOOK_META[a].year - BOOK_META[b].year)

// cover-page__sources - visually hidden, zatim schvalne kvuli designu
export function CoverPage({ title = COOKBOOK_TITLE }: CoverPageProps) {
  return (
    <article className="cover-page">
      <CoverFrame />
      <div className="cover-page__inner">
        <h1 className="cover-page__title">{title}</h1>
        <p className="cover-page__subtitle">
          Sbírka receptů z historických kuchařek z let {SOURCE_BOOKS.map((b) => BOOK_META[b].year).join(', ')}
        </p>
        <ul className="cover-page__sources, visually-hidden">
          {SOURCE_BOOKS.map((b) => (
            <li key={b}>
              {BOOK_META[b].title} ({BOOK_META[b].year})
            </li>
          ))}
        </ul>
        <p className="cover-page__turn">
          <span className="cover-page__turn--desktop">Otoč stránku →</span>
          <span className="cover-page__turn--mobile">Přejeď prstem</span>
        </p>
      </div>
    </article>
  )
}
