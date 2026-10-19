import { BOOK_META } from '@/content/books'
import { BOOKS } from '@/domain/schema'
import type { Recipe } from '@/domain/types'
import type { Route } from '@/app/route'
import { Divider, Vignette } from './ornaments'

// od nejnovější knihy po nejstarší
const SOURCE_BOOKS = BOOKS.filter((b) => b !== 'vlastni').sort((a, b) => BOOK_META[b].year - BOOK_META[a].year)

export function AboutLeft({ onNavigate }: { onNavigate: (route: Route) => void }) {
  return (
    <article className="about-page">
      <h2>O této knize</h2>
      <Vignette />
      <p>
        Tahle kuchařka sbírá jednoduché, vydatné a levné recepty ze starých kuchařek: od anglické klasiky
        z roku 1747 a české Rettigové přes pekařské příručky a polní kuchařky armád druhé světové války
        až po československé receptury pro jídelny a americkou armádní sbírku. Jsou přeložené, převedené na moderní jednotky a zmenšené na čtyři porce, aby se daly uvařit na táboře,
        na výletě i v hubených měsících.
      </p>
      <p>
        Počet osob a „denní faktor“ (kolik kdo sní) nastavíš u receptu a množství surovin se přepočítá.
        Recepty můžeš přidávat do nákupního košíku a z něj sestavit společný nákupní seznam.
      </p>
      <p>
        <button type="button" className="about-page__link" onClick={() => onNavigate({ kind: 'toc' })}>
          Přejít na obsah
        </button>
      </p>
    </article>
  )
}

export function AboutRight({ recipes }: { recipes: Recipe[] }) {
  return (
    <article className="about-page">
      <h2>Zdroje</h2>
      <Divider />
      <ul className="about-sources">
        {SOURCE_BOOKS.filter((b) => recipes.some((r) => r.source.book === b)).map((b) => {
          const meta = BOOK_META[b]
          const quote = recipes.find((r) => r.source.book === b && r.quote)?.quote
          return (
            <li key={b} className={`about-source era--${meta.era}`}>
              <h3>
                {meta.title} <span className="about-source__year">({meta.year})</span>
              </h3>
              <p>{meta.description}</p>
              {quote && <blockquote className="about-source__quote">{quote}</blockquote>}
            </li>
          )
        })}
      </ul>
    </article>
  )
}
