import { BOOK_META } from '@/content/books'
import { BOOKS } from '@/domain/schema'
import type { Recipe } from '@/domain/types'
import type { Route } from '@/app/route'
import { Divider, Vignette } from './ornaments'

// od nejnovější knihy po nejstarší
const SOURCE_BOOKS = BOOKS.filter((b) => b !== 'vlastni' && b !== 'overene').sort((a, b) => BOOK_META[b].year - BOOK_META[a].year)

export function AboutLeft({ onNavigate }: { onNavigate: (route: Route) => void }) {
  return (
    <article className="about-page">
      <h2>O této knize</h2>
      <Vignette />
      <p>
        Tahle kuchařka sbírá jednoduché, vydatné a levné recepty ze starých kuchařek – skoro devět stovek jídel
        z deseti knih: od anglické klasiky z roku 1747 a Domácí kuchařky M. D. Rettigové přes viktoriánské pekařské
        příručky a italskou kuchařku pro americké domácnosti až po vojenské kuchařky druhé světové války,
        československé receptury pro jídelny a sbírku americké armády. Všechny jsou přeložené, převedené na gramy
        a mililitry a zmenšené na čtyři porce.
      </p>
      <p>
        Knihy jsou vybrané tak, aby se na ně (snad) nevztahovala autorská práva: staré knihy už jsou volné,
        americké vojenské kuchařky jsou díla federální vlády USA a recept jako takový (seznam surovin a postup)
        chráněný není – texty jsou navíc přepsané vlastními slovy. Nečekej proto moderní kuchyni, ale poctivá
        jídla na tábor, na výlet a na levné vaření.
      </p>
      <p>
        U receptu nastavíš počet strávníků a množství se přepočítá; kroky mají stopky. V obsahu můžeš filtrovat
        podle štítků, vybavení a knihy, oblíbené si označíš srdíčkem. Recepty přidáváš do košíku, ze kterého
        vznikne společný nákupní seznam – a do knihy můžeš dopsat i vlastní recepty.
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
