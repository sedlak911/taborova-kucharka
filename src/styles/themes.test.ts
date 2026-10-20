/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BOOKS } from '../domain/schema'
import { BOOK_META } from '../content/books'

// `?raw` import by vrátil prázdný řetězec (vitest má css: false), proto čteme soubor přímo
const css = readFileSync('src/styles/themes.css', 'utf8')
// epocha (vzhled) knihy; „Ověřené recepty“ sdílí papírek s vlastními recepty
const ERAS = [...new Set(BOOKS.map((b) => BOOK_META[b].era))]

describe('themes.css', () => {
  it.each(ERAS)('obsahuje selektor .era--%s', (era) => {
    expect(css).toContain(`.era--${era}`)
  })
})

describe('themes.css – papír epoch', () => {
  it.each(ERAS)('.era--%s nastavuje --paper', (era) => {
    expect(css).toMatch(new RegExp(`\\.era--${era}\\s*\\{[^}]*--paper:`))
  })
})

describe('themes.css – ručně psaný list', () => {
  it('.era--vlastni nenatáčí (třída je i na .page – natočení by rozbilo otáčení stránky)', () => {
    expect(css.match(/\.era--vlastni\s*\{([^}]*)\}/)?.[1]).not.toMatch(/transform/)
  })
  it('natočený je vnitřní list receptu', () => {
    expect(css).toMatch(/\.recipe-page\.era--vlastni\s*\{[^}]*transform:\s*rotate\(-0\.6deg\)/)
  })
})
