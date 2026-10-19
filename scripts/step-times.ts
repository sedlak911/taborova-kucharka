// Návrh časů kroků z textu (spec §5.1 [R3], fáze 10 ruling R10).
// Spuštění: npm run step-times -- [<id>…] [--write]   (bez id = všechny recepty v data/recipes)
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { stepStartLabel } from '../src/domain/steps'
import type { Step } from '../src/domain/types'

/** Delší návrh (kynutí, namáčení) se nezapisuje – rozhodne člověk nebo agent. */
const PROPOSAL_MAX_MINUTES = 600

const NUM = String.raw`\d+(?:,\d+)?`
/**
 * Doba v textu: [dolní mez – | až] číslo | půl | čtvrt (nebo nic: „hodinu“) + jednotka.
 * Skupiny: 1 dolní mez (ignoruje se, platí horní), 2 množství, 3 jednotka.
 */
const DURATION = new RegExp(
  String.raw`(?:(${NUM})\s*(?:–|-|až)\s*)?(${NUM}|půl|čtvrt)?\s*(?<!\p{L})(hodin[a-z]*|minut[a-z]*|min\.?(?![a-zá-ž])|sekund[a-z]*)`,
  'giu',
)
/** Namáčení a „přes noc“ se do času vaření nepočítají („Namočené fazole…“ ano – to už se vaří). */
const SOAK = /přes noc|namáč|namoč(?!en)/iu
const RANGE_GAP = /^\s*(?:–|-|až)\s*$/u
const PARALLEL_START = /^\s*mezitím\b/iu

interface Duration {
  start: number
  end: number
  minutes: number
}

function durations(text: string): Duration[] {
  const out: Duration[] = []
  for (const m of text.matchAll(DURATION)) {
    const amount = m[2]?.toLowerCase()
    const unit = m[3].toLowerCase()
    const factor = unit.startsWith('hodin') ? 60 : unit.startsWith('sekund') ? 1 / 60 : 1
    const value =
      amount === undefined ? (factor === 60 ? 1 : 0) : amount === 'půl' ? 0.5 : amount === 'čtvrt' ? 0.25 : Number(amount.replace(',', '.'))
    out.push({ start: m.index, end: m.index + m[0].length, minutes: value * factor })
  }
  return out
}

/**
 * Navržená doba kroku z textu (ruling R10): rozsah → horní mez, více dob se sčítá, „45 minut až 1 hodinu“ → 60,
 * text v závorce se ignoruje, sekundy nahoru na minuty. 0 = bez `minutes` (žádná doba, namáčení, přes noc, nad 600 min).
 */
export function proposeMinutes(text: string): number {
  const plain = text.replace(/\([^)]*\)/g, ' ')
  if (SOAK.test(plain)) return 0
  let total = 0
  let last: Duration | null = null
  for (const d of durations(plain)) {
    if (last && RANGE_GAP.test(plain.slice(last.end, d.start))) {
      // rozsah přes dvě jednotky: počítá se jen horní mez
      total += Math.max(0, d.minutes - last.minutes)
      last = { ...d, minutes: Math.max(d.minutes, last.minutes) }
    } else {
      total += d.minutes
      last = d
    }
  }
  const minutes = Math.max(0, Math.ceil(total - 1e-9)) // max: Math.ceil(-1e-9) je -0
  return minutes > PROPOSAL_MAX_MINUTES ? 0 : minutes
}

/** Krok z dat → krok s návrhem. Krok, který už je objekt, se vrací beze změny (ruční úpravy se nepřepisují). */
export function proposeStep(step: string | Step): Step {
  if (typeof step !== 'string') return step
  const minutes = proposeMinutes(step)
  return { text: step, ...(minutes > 0 ? { minutes } : {}), ...(PARALLEL_START.test(step) ? { parallel: true as const } : {}) }
}

const stepJson = (s: Step) =>
  `{ "text": ${JSON.stringify(s.text)}${s.minutes !== undefined ? `, "minutes": ${s.minutes}` : ''}${s.parallel ? ', "parallel": true' : ''} }`

/** Pole kroků ve stylu data/recipes: jeden krok na řádek, 4 mezery, klíče text, minutes, parallel. */
export function formatStepsBlock(steps: readonly Step[]): string {
  return `"steps": [\n${steps.map((s) => `    ${stepJson(s)}`).join(',\n')}\n  ]`
}

/** Nahradí v textu souboru jen pole "steps" (ostatní řádky bajtově beze změny); výsledek ověří přes JSON.parse. */
export function replaceStepsBlock(fileText: string, steps: readonly Step[]): string {
  const key = fileText.indexOf('\n  "steps": [')
  if (key === -1) throw new Error('pole "steps" nenalezeno na úrovni 2 mezer')
  const open = fileText.indexOf('[', key)
  let depth = 0
  let inString = false
  let close = -1
  for (let i = open; i < fileText.length && close === -1; i++) {
    const ch = fileText[i]
    if (inString) {
      if (ch === '\\') i++
      else if (ch === '"') inString = false
    } else if (ch === '"') inString = true
    else if (ch === '[' || ch === '{') depth++
    else if (ch === ']' || ch === '}') {
      depth--
      if (depth === 0) close = i
    }
  }
  if (close === -1) throw new Error('pole "steps" není uzavřené')
  const out = `${fileText.slice(0, key + 3)}${formatStepsBlock(steps)}${fileText.slice(close + 1)}`
  const expected = { ...(JSON.parse(fileText) as Record<string, unknown>), steps }
  if (!isDeepStrictEqual(JSON.parse(out), expected)) throw new Error('po nahrazení kroků se změnilo jiné pole')
  return out
}

export function formatProposalTable(id: string, steps: readonly Step[]): string {
  const out = [id, 'krok | návrh | text']
  steps.forEach((s, i) => {
    const proposal = [s.parallel ? stepStartLabel(null) : '', s.minutes !== undefined ? `${s.minutes} min` : ''].filter(Boolean).join(' ') || '—'
    out.push(`${i + 1} | ${proposal} | ${s.text}`)
  })
  return out.join('\n')
}

export function parseStepTimesArgs(argv: string[]): { ids: string[]; write: boolean } {
  for (const a of argv) if (a.startsWith('--') && a !== '--write') throw new Error(`neznámý přepínač ${a} (použití: npm run step-times -- [<id>…] [--write])`)
  return {
    ids: argv.filter((a) => a !== '--write').map((a) => a.replace(/\.json$/, '').replace(/^.*\//, '')),
    write: argv.includes('--write'),
  }
}

async function main() {
  const { ids, write } = parseStepTimesArgs(process.argv.slice(2))
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const dir = path.join(root, 'data', 'recipes')
  const files = ids.length > 0 ? ids.map((id) => `${id}.json`) : (await readdir(dir)).filter((f) => f.endsWith('.json')).sort()
  for (const file of files) {
    const text = await readFile(path.join(dir, file), 'utf8').catch((e: NodeJS.ErrnoException) => {
      if (e.code === 'ENOENT') throw new Error(`recept ${file.replace(/\.json$/, '')} nenalezen`)
      throw e
    })
    const data = JSON.parse(text) as { id: string; steps: (string | Step)[] }
    const steps = data.steps.map(proposeStep)
    console.log(`${formatProposalTable(data.id, steps)}\n`)
    if (write) await writeFile(path.join(dir, file), replaceStepsBlock(text, steps))
  }
  if (write) console.log(`Zapsáno ${files.length} souborů. Zkontroluj: npm run validate`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`CHYBA: ${(e as Error).message}`); process.exit(1) })
}
