// src/styles/book.test.ts
/// <reference types="node" />
import { readFileSync } from 'node:fs'

const css = readFileSync('src/styles/book.css', 'utf8')
const body = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}
const layers = (decl: string) => (decl.match(/box-shadow:([^;]*);/)?.[1] ?? '').split(/,(?![^(]*\))/).length

test('kniha leží na stole: vrstvený stín pod knihou (desky + kontakt + měkký stín)', () => {
  expect(layers(body('.book__spread'))).toBeGreaterThanOrEqual(4)
})

test('na mobilu je stín menší (vlastní pravidlo)', () => {
  expect(layers(body('.book--single .book__spread'))).toBeGreaterThanOrEqual(3)
})

test('na mobilu je nahoře rezerva pro pevné .book-controls (stránka je nepřekrývá)', () => {
  expect(body('.book--single')).toMatch(/padding:\s*3\.5rem /)
  expect(body('.book--single .book__spread')).toMatch(/calc\(\(100dvh - 8\.5rem\) \/ 1\.414\)/)
})

test('měřicí slot má rozměr jedné stránky, je neviditelný a mimo hit-testing', () => {
  expect(body('.book__measure')).toMatch(/position:\s*absolute/)
  expect(body('.book__measure')).toMatch(/width:\s*50%/)
  expect(body('.book__measure')).toMatch(/height:\s*100%/)
  expect(body('.book__measure')).toMatch(/visibility:\s*hidden/)
  expect(body('.book__measure')).toMatch(/pointer-events:\s*none/)
  expect(body('.book--single .book__measure')).toMatch(/width:\s*100%/)
})
