import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { mergeIngredients } from './merge-ingredients'

const fx = (f: string) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(`./fixtures/${f}`)), 'utf8'))
const ings: Record<string, unknown>[] = fx('ingredients.json')

describe('mergeIngredients', () => {
  it('sloučí a seřadí podle id', () => {
    const r = mergeIngredients([[ings[2], ings[0]], [ings[3], ings[1]]])
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.items.map((i) => i.id)).toEqual(['mouka', 'sul', 'vejce', 'veprove'])
  })

  it('duplicitní id je chyba', () => {
    const r = mergeIngredients([[ings[0]], [{ ...ings[0], name: 'Jiná' }]])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join('\n')).toContain('mouka')
  })

  it('duplicitní název (bez ohledu na velikost písmen) je chyba', () => {
    const r = mergeIngredients([[ings[0], { ...ings[0], id: 'mouka-2', name: 'MOUKA' }]])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.some((e) => e.includes('mouka-2') && e.includes('mouka'))).toBe(true)
  })

  it('nevalidní položka vrátí chybu s id', () => {
    const r = mergeIngredients([[{ ...ings[0], category: 'nesmysl' }]])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0]).toContain('mouka')
  })

  it('alias shodný s názvem jiné suroviny je chyba', () => {
    const r = mergeIngredients([[ings[0], { ...ings[1], aliases: ['MOUKA'] }]])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.some((e) => e.includes('veprove') && e.includes('mouka'))).toBe(true)
  })

  it('alias shodný s aliasem jiné suroviny je chyba', () => {
    const r = mergeIngredients([[{ ...ings[0], aliases: ['bílá'] }, { ...ings[1], aliases: ['Bílá'] }]])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.some((e) => e.includes('Bílá'))).toBe(true)
  })

  it('alias shodný s vlastním názvem chybou není', () => {
    const r = mergeIngredients([[{ ...ings[0], aliases: ['mouka'] }]])
    expect(r.ok).toBe(true)
  })
})
