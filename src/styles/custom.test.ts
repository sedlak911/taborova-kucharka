// src/styles/custom.test.ts
/// <reference types="node" />
import { readFileSync } from 'node:fs'

const css = readFileSync('src/styles/custom.css', 'utf8')
const body = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}

test('formulář je natočený ručně psaný list na linkovaném papíře', () => {
  const sheet = body('.recipe-form')
  expect(sheet).toMatch(/transform:\s*rotate\(-0\.6deg\)/)
  expect(sheet).toMatch(/font-family:\s*var\(--font-hand\)/)
  expect(sheet).toMatch(/repeating-linear-gradient/)
  expect(sheet).toMatch(/background-color:\s*var\(--note-paper\)/)
})

test('překryv formuláře scrolluje svisle, vodorovně ne (natočený list přesahuje)', () => {
  expect(body('.recipe-form-overlay')).toMatch(/overflow-y:\s*auto/)
  expect(body('.recipe-form-overlay')).toMatch(/overflow-x:\s*hidden/)
  expect(body('.recipe-form-overlay')).toMatch(/position:\s*fixed/)
})

test('písmo formuláře má aspoň 16 px (iOS při psaní nezoomuje)', () => {
  expect(body('.recipe-form')).toMatch(/font-size:\s*1\.25rem/)
})

test('nápověda pod polem Postup je drobná tiskacím písmem (R3)', () => {
  const hint = body('.recipe-form__hint')
  expect(hint).toMatch(/font-family:\s*var\(--font-table\)/)
  expect(hint).toMatch(/font-size:\s*0\.8rem/)
})
