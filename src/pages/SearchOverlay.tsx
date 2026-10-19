import { useEffect, useMemo, useRef, useState } from 'react'
import { BOOK_META } from '@/content/books'
import { CHAPTER_META } from '@/content/chapters'
import { filterRecipes, normalize, EMPTY_FILTER } from '@/content/search'
import type { Ingredient, Recipe } from '@/domain/types'
import type { Route } from '@/app/route'

export const MAX_SEARCH_RESULTS = 20

interface SearchOverlayProps {
  recipes: Recipe[]
  ingredients: Map<string, Ingredient>
  onNavigate: (route: Route) => void
}

export function SearchOverlay({ recipes, ingredients, onNavigate }: SearchOverlayProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const openerRef = useRef<HTMLButtonElement>(null)

  const results = useMemo(() => {
    if (query.trim() === '') return []
    const q = normalize(query.trim())
    const hits = filterRecipes(recipes, ingredients, { ...EMPTY_FILTER, query })
    // shoda v názvu receptu má přednost před shodou v surovinách (Enter pak míří na nejlepší výsledek);
    // řazení je stabilní, uvnitř skupin zůstává pořadí knihy, a předchází ořezu limitu před shodou v názvu
    const rank = (r: Recipe) => (normalize(r.title).includes(q) ? 0 : 1)
    return [...hits].sort((a, b) => rank(a) - rank(b)).slice(0, MAX_SEARCH_RESULTS)
  }, [recipes, ingredients, query])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const close = () => {
    setOpen(false)
    setQuery('')
    openerRef.current?.focus()
  }

  const go = (id: string) => {
    onNavigate({ kind: 'recipe', id })
    close()
  }

  return (
    <>
      <button ref={openerRef} type="button" className="book-control search-opener" aria-label="Hledat" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="10" cy="10" r="6" />
          <path d="M15 15l6 6" />
        </svg>
      </button>
      {open && (
        <div
          className="search-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Hledání receptů"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              close()
            }
          }}
        >
          <input
            ref={inputRef}
            type="search"
            className="search-input"
            placeholder="Hledat recept nebo surovinu"
            aria-label="Hledat recept nebo surovinu"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              // preventDefault: fokus se po zavření vrací na lupu a Enter by ji hned znovu aktivoval
              e.preventDefault()
              if (results[0]) go(results[0].id)
            }}
          />
          {query.trim() !== '' && results.length === 0 && <p className="search-empty">Nic nenalezeno.</p>}
          <ul className="search-results">
            {results.map((r) => (
              <li key={r.id}>
                <button type="button" className="search-result" onClick={() => go(r.id)}>
                  <span className="search-result-title">{r.title}</span>
                  <span className="search-result-meta">
                    {CHAPTER_META[r.chapter].title} · {BOOK_META[r.source.book].shortTitle}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="search-close" onClick={close}>
            Zavřít
          </button>
        </div>
      )}
    </>
  )
}
