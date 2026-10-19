// src/styles/paper.test.ts
/// <reference types="node" />
import { readFileSync } from 'node:fs'

const css = readFileSync('src/styles/paper.css', 'utf8')
const body = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}

test('„pokračuje ↓“: záře jen kolem nápisu v barvě stránky, ne pruh přes celou šířku (R2)', () => {
  const more = body('.page-more')
  expect(more).not.toMatch(/background/)
  expect(more).not.toMatch(/right:\s*0/)
  expect(more).toMatch(/left:\s*50%/)
  expect(more).toMatch(/translateX\(-50%\)/)
  expect(body('.page-more span')).toMatch(/radial-gradient\([^;]*var\(--page-bg, var\(--paper\)\)[^;]*transparent/)
  expect(body('.page--note')).toMatch(/--page-bg:\s*var\(--note-paper\)/)
  expect(body('.page--cover')).toMatch(/--page-bg:\s*var\(--cover\)/)
})

test('obálka: rám u okrajů knihy, roh zrcadlený do všech čtyř rohů, ornamenty uprostřed hran', () => {
  expect(body('.cover-frame')).toMatch(/inset:\s*0\.9rem/)
  expect(body('.cover-frame')).toMatch(/border:\s*1\.5px solid currentColor/)
  expect(body('.cover-frame::before')).toMatch(/border:\s*1px solid currentColor/)
  expect(body('.cover-frame__corner--tr')).toMatch(/scaleX\(-1\)/)
  expect(body('.cover-frame__corner--bl')).toMatch(/scaleY\(-1\)/)
  expect(body('.cover-frame__corner--br')).toMatch(/scale\(-1, -1\)/)
  expect(body('.cover-frame__edge--left')).toMatch(/left:\s*0\.55rem/)
  expect(body('.cover-frame__edge--right')).toMatch(/right:\s*0\.55rem/)
})

test('obálka: boční ornamenty hran se na užší obálce skryjí, aby nezasahovaly do podtitulu a zdrojů (ruční kontrola fáze 9)', () => {
  expect(css).toMatch(/@container \(max-width: 32rem\)\s*\{[^@]*\.cover-frame__edge--left,\s*\.cover-frame__edge--right\s*\{\s*display:\s*none/)
})

test('značky v obsahu mají klikací plochu alespoň 24 px a mezeru alespoň 4 px', () => {
  const rem = (v: string | undefined) => parseFloat(v ?? '0') * 16
  expect(rem(body('.recipe-marks--compact .mark').match(/width:\s*([\d.]+)rem/)?.[1])).toBeGreaterThanOrEqual(24)
  expect(rem(body('.recipe-marks--compact .mark').match(/height:\s*([\d.]+)rem/)?.[1])).toBeGreaterThanOrEqual(24)
  expect(rem(body('.recipe-marks--compact').match(/gap:\s*([\d.]+)rem/)?.[1])).toBeGreaterThanOrEqual(4)
})

test('linkovaný list nemá vodorovný scroll (natočený vnitřní list přesahuje rohy)', () => {
  expect(body('.page--note > .page-content')).toMatch(/overflow-x:\s*hidden/)
  // final review fáze 9: .page-content nesmí počítat overflow-x jako auto (švih by ji bral za vodorovný scroller)
  expect(body('.page-content')).toMatch(/overflow-x:\s*hidden/)
})

test('na úzkém displeji (≤ 380 px) jsou tlačítka ovládání menší, aby se pět tlačítek vešlo vedle záložky', () => {
  expect(css).toMatch(/@media \(max-width: 380px\)\s*\{[^@]*\.book-control\s*\{[^}]*width:\s*2\.1rem/)
  expect(body('.book-control__badge')).toMatch(/position:\s*absolute/)
})

test('obsah: hlavička a nadpis kapitoly drží okraje uvnitř (měřitelná výška), název se láme po slovech', () => {
  expect(body('.toc-head')).toMatch(/display:\s*flow-root/)
  expect(body('.toc-chapter')).toMatch(/display:\s*flow-root/)
  expect(body('.toc-row-text')).toMatch(/overflow-wrap:\s*break-word/)
  expect(body('.toc-row-text')).not.toMatch(/anywhere/)
  // tečky navazují na poslední řádek názvu (ne na šířku nejdelšího řádku) a přesah se ořízne před číslem
  expect(body('.toc-row-text')).toMatch(/overflow:\s*hidden/)
  expect(body('.toc-row-dots')).toMatch(/display:\s*inline-block[^}]*width:\s*0/)
  expect(body('.toc-row')).toMatch(/align-items:\s*last baseline/)
  expect(body('.toc-row-page')).toMatch(/flex:\s*none/)
})

test('značka stopek u kroku: strojopis, malá, nezalomí se; souběžná čárkovaně; „Hotovo“ vpravo (R3)', () => {
  const mark = body('.step-time')
  expect(mark).toMatch(/font-family:\s*var\(--font-typewriter\)/)
  expect(mark).toMatch(/font-size:\s*0\.72em/)
  expect(mark).toMatch(/white-space:\s*nowrap/)
  expect(mark).toMatch(/border:\s*1px solid currentColor/)
  expect(body('.step-time--parallel')).toMatch(/border-style:\s*dashed/)
  expect(body('.recipe-steps-total')).toMatch(/text-align:\s*right/)
})

test('značka „Hotovo“ má stejnou velikost jako značky u kroků (řádek „Hotovo“ je 0,85em, značka bez opravy jen ≈9,8 px)', () => {
  expect(body('.step-time--total')).toMatch(/font-size:\s*0\.85em/)
})

test('stopky: řádek se zalamuje celými prvky, tlačítka aspoň 24 px; běžící krok zvýrazněný (R3)', () => {
  expect(body('.step-stopwatch')).toMatch(/flex-wrap:\s*wrap/)
  expect(body('.step-stopwatch__button')).toMatch(/min-height:\s*1\.8rem/)
  expect(body('.recipe-steps li.is-current')).toMatch(/background:/)
})
