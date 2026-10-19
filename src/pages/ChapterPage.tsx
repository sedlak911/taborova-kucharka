import { CHAPTER_META } from '@/content/chapters'
import { routeToHash } from '@/app/route'
import type { Chapter, Recipe } from '@/domain/types'
import { ChapterIllustration } from './illustrations'

interface ChapterPageProps {
  chapter: Chapter
  /** Recepty této kapitoly v pořadí v knize. */
  recipes: Recipe[]
  /** Číslo strany receptu (mini-obsah). */
  pageNumberOf: (recipeId: string) => number | undefined
}

export function ChapterPage({ chapter, recipes, pageNumberOf }: ChapterPageProps) {
  const meta = CHAPTER_META[chapter]
  return (
    <article className="chapter-page" style={{ textAlign: 'center' }}>
      <h1 style={{ fontSize: '2.4rem', margin: '0.4em 0 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{meta.title}</h1>
      <div className="ornament" role="presentation" />
      <blockquote style={{ margin: '0 auto', maxWidth: '30em' }}>
        <p style={{ fontStyle: 'italic', margin: 0 }}>{meta.quote}</p>
        <footer style={{ fontFamily: 'var(--font-typewriter)', fontSize: '0.8rem', marginTop: '0.5em' }}>
          {meta.quoteSource}
        </footer>
      </blockquote>
      <div style={{ width: '6rem', margin: '1em auto' }}>
        <ChapterIllustration chapter={chapter} />
      </div>
      <p style={{ textAlign: 'left' }}>{meta.intro}</p>
      <nav aria-label={`Recepty kapitoly ${meta.title}`} style={{ textAlign: 'left' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {recipes.map((r) => {
            const page = pageNumberOf(r.id)
            return (
              <li key={r.id} style={{ display: 'flex', gap: '0.5em' }}>
                <a href={routeToHash({ kind: 'recipe', id: r.id })} style={{ flex: 1, color: 'inherit' }}>
                  {r.title}
                </a>
                {page !== undefined && <span>{page}</span>}
              </li>
            )
          })}
        </ul>
      </nav>
    </article>
  )
}
