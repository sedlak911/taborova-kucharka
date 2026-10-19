/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BOOKS } from '../domain/schema'

// `?raw` import by vrátil prázdný řetězec (vitest má css: false), proto čteme soubor přímo
const css = readFileSync('src/styles/themes.css', 'utf8')

describe('themes.css', () => {
  it.each(BOOKS)('obsahuje selektor .era--%s', (book) => {
    expect(css).toContain(`.era--${book}`)
  })
})

describe('themes.css – papír epoch', () => {
  it.each(BOOKS)('.era--%s nastavuje --paper', (book) => {
    expect(css).toMatch(new RegExp(`\\.era--${book}\\s*\\{[^}]*--paper:`))
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
