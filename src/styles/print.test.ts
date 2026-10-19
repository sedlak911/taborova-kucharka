// src/styles/print.test.ts
/// <reference types="node" />
import { readFileSync } from 'node:fs'

// vitest má css: false → CSS čteme jako text
const css = readFileSync('src/styles/print.css', 'utf8')
const main = readFileSync('src/main.tsx', 'utf8')
const print = css.slice(css.indexOf('@media print'))

test('print.css je importovaný jako poslední styl', () => {
  const imports = [...main.matchAll(/import '\.\/styles\/([\w-]+)\.css'/g)].map((m) => m[1])
  expect(imports.at(-1)).toBe('print')
})

test('v tisku se obsah stránky neořezává (celý recept)', () => {
  expect(print).toMatch(/\.page-content[^{]*\{[^}]*overflow:\s*visible/)
  expect(print).toMatch(/\.page-content[^{]*\{[^}]*height:\s*auto/)
  expect(print).toMatch(/\.book__slot[^{]*\{[^}]*overflow:\s*visible/)
  expect(print).toMatch(/\.page\s*\{[^}]*overflow:\s*visible/)
})

test('v tisku se skryjí ovládací prvky a indikátor pokračování', () => {
  for (const sel of ['.book-controls', '.bookmark', '.book__nav', '.book__measure', '.page-more', '.page-edge', '.recipe-marks', '.recipe-actions', '.print-action', '.cart-actions', '.step-stopwatch']) expect(print).toContain(sel)
})

const screenCss = css.slice(0, css.indexOf('@media print'))
/** Tělo pravidla pro přesný selektor (ne pro selektor, který ho jen obsahuje). */
const rule = (src: string, selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return src.match(new RegExp(`(?:^|\\n|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}

test('stránka A4 s okraji 15 mm', () => {
  expect(css).toMatch(/@page\s*\{[^}]*size:\s*A4;[^}]*margin:\s*15mm/)
})

test('na obrazovce je tiskový strom neviditelný a bez posuvníku, ale rozložený (ne display: none – brožurka měří bloky)', () => {
  const r = rule(screenCss, '.print-root')
  expect(r).toMatch(/visibility:\s*hidden/)
  expect(r).toMatch(/position:\s*fixed/)
  expect(r).toMatch(/left:\s*-10000px/)
  expect(r).toMatch(/pointer-events:\s*none/)
  expect(r).not.toMatch(/display:\s*none/)
})

test('v tisku s data-print se kniha skryje a ukáže se tiskový strom', () => {
  expect(rule(print, 'html[data-print]:has(.print-root) main')).toMatch(/display:\s*none/)
  const r = rule(print, 'html[data-print] .print-root')
  expect(r).toMatch(/visibility:\s*visible/)
  expect(r).toMatch(/position:\s*static/)
})

test('brožurka: měřicí sloupec má přesně rozměry těla strany A5 (měření = tisk)', () => {
  const mm = (selector: string, prop: string) => Number(rule(screenCss, selector).match(new RegExp(`(?:^|;|\\s)${prop}:\\s*([\\d.]+)mm`))![1])
  const [top, side, bottom] = rule(screenCss, '.booklet-page').match(/padding:\s*([\d.]+)mm ([\d.]+)mm ([\d.]+)mm/)!.slice(1).map(Number)
  expect(rule(screenCss, '.booklet-sheet')).toMatch(/width:\s*297mm/)
  expect(rule(screenCss, '.booklet-sheet')).toMatch(/grid-template-columns:\s*148\.5mm 148\.5mm/)
  expect(mm('.booklet-measure', 'width')).toBe(148.5 - 2 * side)
  expect(mm('.booklet-page__body', 'height')).toBe(mm('.booklet-sheet', 'height') - top - bottom)
  expect(rule(screenCss, '.booklet-sheet')).toMatch(/break-after:\s*page/)
})

test('značka stopek v tisku: menší písmo v pt, „Hotovo“ vpravo (R3)', () => {
  expect(rule(screenCss, '.print-root .step-time')).toMatch(/font-size:\s*8pt/)
  expect(rule(screenCss, '.print-recipe__total')).toMatch(/text-align:\s*right/)
})
