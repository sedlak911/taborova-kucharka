import { formatProposalTable, formatStepsBlock, parseStepTimesArgs, proposeMinutes, proposeStep, replaceStepsBlock } from './step-times'
import type { Step } from '../src/domain/types'

describe('proposeMinutes (ruling R10)', () => {
  it.each([
    ['Hrnec pevně přikryj a na mírném ohni duš 20–25 minut. Nemíchej.', 25],
    ['Vař 5 až 10 minut, dokud omáčka nezhoustne.', 10],
    ['Vař asi 10 minut.', 10],
    ['Přiveď k varu, přikryj a vař asi 1 hodinu za častého míchání.', 60],
    ['Duš 1,5 hodiny.', 90],
    ['Vař asi půl hodiny.', 30],
    ['Peč asi hodinu.', 60],
    ['Sniž plamen, přikryj a duš 1 hodinu 40 minut, dokud maso nezměkne.', 100],
    ['Přidej maso a vař asi 45 minut až 1 hodinu.', 60],
    ['Opékej 1,5–2 minuty.', 2],
    ['Míchej 45 sekund.', 1],
    ['Opeč 5 minut, pak duš 30 minut.', 35],
    ['Peč 75 min.', 75],
    ['Peč v pomalé troubě při 150 °C 3 až 4 hodiny.', 240],
    ['Vař do měkka asi 3 hodiny (vepřové maso jen asi 2 hodiny).', 180],
    ['Fazole namoč přes noc do studené vody.', 0],
    ['Nech 6–8 hodin namočit, pak slij.', 0],
    ['Zalij je studenou vodou a nech asi 6 hodin namáčet.', 0],
    ['Namočené fazole slij, zalij čistou vodou a vař 2 hodiny.', 120],
    ['Vyndej bobkové listy.', 0],
    ['Za pár minut zamíchej.', 0],
    ['Nech kynout 12 hodin.', 0],
  ])('%j → %d', (text, minutes) => expect(proposeMinutes(text)).toBe(minutes))
})

describe('proposeStep', () => {
  it('řetězec → návrh minut; „Mezitím“ na začátku → parallel; bez času → jen text', () => {
    expect(proposeStep('Vař 10 minut.')).toEqual({ text: 'Vař 10 minut.', minutes: 10 })
    expect(proposeStep('Mezitím uvař těstoviny 10 až 12 minut.')).toEqual({ text: 'Mezitím uvař těstoviny 10 až 12 minut.', minutes: 12, parallel: true })
    expect(proposeStep('Vyndej bobkové listy.')).toEqual({ text: 'Vyndej bobkové listy.' })
  })

  it('krok, který už je objekt, zůstane beze změny (ruční úpravy se nepřepíšou)', () => {
    const edited: Step = { text: 'Vař 10 minut.', minutes: 15 }
    const noTime: Step = { text: 'Vař 10 minut.' }
    expect(proposeStep(edited)).toBe(edited)
    expect(proposeStep(noTime)).toBe(noTime)
  })
})

const file = [
  '{',
  '  "id": "x",',
  '  "ingredients": [',
  '    { "ingredientId": "voda", "amount": 1, "unit": "g" }',
  '  ],',
  '  "steps": [',
  '    "Vař 10 minut.",',
  '    "Podávej [teplé]."',
  '  ],',
  '  "source": { "book": "afrs-2003" }',
  '}',
  '',
].join('\n')

describe('replaceStepsBlock', () => {
  it('přepíše jen pole steps (jeden krok na řádek, pořadí klíčů text, minutes, parallel), ostatní řádky beze změny', () => {
    const steps: Step[] = [{ text: 'Vař 10 minut.', minutes: 10 }, { text: 'Podávej [teplé].', parallel: true }]
    expect(replaceStepsBlock(file, steps)).toBe(
      [
        '{',
        '  "id": "x",',
        '  "ingredients": [',
        '    { "ingredientId": "voda", "amount": 1, "unit": "g" }',
        '  ],',
        '  "steps": [',
        '    { "text": "Vař 10 minut.", "minutes": 10 },',
        '    { "text": "Podávej [teplé].", "parallel": true }',
        '  ],',
        '  "source": { "book": "afrs-2003" }',
        '}',
        '',
      ].join('\n'),
    )
  })

  it('kroky na jednom řádku, uvozovky a závorky v textu', () => {
    const one = '{\n  "id": "x",\n  "steps": ["Řekni \\"hotovo\\".", "Peč ]"],\n  "verified": true\n}\n'
    const steps: Step[] = [{ text: 'Řekni "hotovo".' }, { text: 'Peč ]', minutes: 5 }]
    const out = replaceStepsBlock(one, steps)
    expect(JSON.parse(out)).toEqual({ id: 'x', steps, verified: true })
    expect(out).toContain('    { "text": "Peč ]", "minutes": 5 }\n  ],\n  "verified": true')
  })

  it('bez pole steps na úrovni 2 mezer je chyba', () => {
    expect(() => replaceStepsBlock('{\n  "id": "x"\n}\n', [])).toThrow('nenalezeno')
  })

  it('formatStepsBlock: prázdné minuty a parallel se nevypisují', () => {
    expect(formatStepsBlock([{ text: 'a' }])).toBe('"steps": [\n    { "text": "a" }\n  ]')
  })
})

describe('výpis a argumenty', () => {
  it('tabulka krok | návrh | text', () => {
    expect(formatProposalTable('x', [{ text: 'Vař 10 minut.', minutes: 10 }, { text: 'Mezitím uvař rýži.', parallel: true }, { text: 'Osol.' }])).toBe(
      ['x', 'krok | návrh | text', '1 | 10 min | Vař 10 minut.', '2 | mezitím | Mezitím uvař rýži.', '3 | — | Osol.'].join('\n'),
    )
  })

  it('id z cesty i s příponou, --write; neznámý přepínač je chyba', () => {
    expect(parseStepTimesArgs(['data/recipes/a.json', 'b', '--write'])).toEqual({ ids: ['a', 'b'], write: true })
    expect(parseStepTimesArgs([])).toEqual({ ids: [], write: false })
    expect(() => parseStepTimesArgs(['--wirte'])).toThrow('neznámý přepínač --wirte')
  })
})
