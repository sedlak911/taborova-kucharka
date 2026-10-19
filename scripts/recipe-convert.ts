// Převod množství ze zdroje (lb, oz, gal, qt, pt, cup, tbsp, tsp, g, kg, l, ml) na g/ml
// a přepočet na 4 porce mocninnou funkcí podle škálovací třídy (spec §3).
// Spuštění: npm run convert -- [--yield 100] "8-1/2 lbs:linear" "23 lbs:linear" "1-7/8 oz:seasoning" "3 tbsp:seasoning:lzice=6.9"
import { pathToFileURL } from 'node:url'
import { roundAmount, scaleFactor } from '../src/domain/scaling'
import { SCALING_CLASSES } from '../src/domain/schema'
import type { ScalingClass } from '../src/domain/types'

export const BASE_SERVINGS = 4

/** Převody na g (hmotnost) a ml (objem). US avoirdupois / US customary; metrické; německá libra. */
export const WEIGHT_G: Record<string, number> = {
  lb: 453.6, lbs: 453.6, pound: 453.6, pounds: 453.6,
  oz: 28.35, ounce: 28.35, ounces: 28.35,
  g: 1, kg: 1000, pfund: 500, pfd: 500,
}
export const VOLUME_ML: Record<string, number> = {
  gal: 3785, gallon: 3785, gallons: 3785,
  qt: 946, qts: 946, quart: 946, quarts: 946,
  pt: 473, pts: 473, pint: 473, pints: 473,
  cup: 237, cups: 237,
  floz: 29.6,
  tbsp: 15, tablespoon: 15, tablespoons: 15,
  tsp: 5, teaspoon: 5, teaspoons: 5,
  ml: 1, l: 1000, liter: 1000, litre: 1000,
}

const UNICODE_FRACTIONS: Record<string, number> = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 }

/** „1-1/2“, „1 1/2“, „3/4“, „1½“, „2,5“ → číslo. */
export function parseFraction(text: string): number {
  let t = text.trim().replace(',', '.')
  let total = 0
  for (const [sym, val] of Object.entries(UNICODE_FRACTIONS)) {
    if (t.includes(sym)) {
      total += val
      t = t.replace(sym, '').trim()
    }
  }
  if (t === '') return total
  const parts = t.split(/[-\s]+/).filter(Boolean)
  for (const p of parts) {
    const frac = p.match(/^(\d+)\/(\d+)$/)
    if (frac) total += Number(frac[1]) / Number(frac[2])
    else if (/^\d+(\.\d+)?$/.test(p)) total += Number(p)
    else throw new Error(`nerozumím číslu „${text}“`)
  }
  return total
}

export interface Quantity { value: number; kind: 'g' | 'ml' }

/** „1 lbs 8 oz“ → 680,4 g; „1 gal 1-1/4 qts“ → 4 967,5 ml; „1/4 cup 1/3 tbsp“ → 64,25 ml. */
export function parseQuantity(text: string): Quantity {
  const norm = text.trim().toLowerCase().replace(/fl\.?\s*oz/g, 'floz').replace(/([a-z])\./g, '$1')
  const re = /([\d½⅓⅔¼¾⅛⅜⅝⅞][\d\s\-/.,½⅓⅔¼¾⅛⅜⅝⅞]*?)\s*([a-z]+)/g
  let kind: Quantity['kind'] | null = null
  let value = 0
  let matched = false
  for (const m of norm.matchAll(re)) {
    matched = true
    const n = parseFraction(m[1])
    const unit = m[2]
    const w = WEIGHT_G[unit]
    const v = VOLUME_ML[unit]
    if (w === undefined && v === undefined) throw new Error(`neznámá jednotka „${unit}“ v „${text}“`)
    const k: Quantity['kind'] = w !== undefined ? 'g' : 'ml'
    if (kind && kind !== k) throw new Error(`míchání hmotnosti a objemu v „${text}“`)
    kind = k
    value += n * (w ?? v!)
  }
  if (!matched || !kind) throw new Error(`nerozumím množství „${text}“ (čekám např. „8-1/2 lbs“, „2 gal 3 qts“)`)
  return { value, kind }
}

export interface ConversionRow {
  input: string
  base: Quantity
  scaling: ScalingClass
  factor: number
  scaled: number
  rounded: number
  /** Kusy (vejce 50 g, bobkový list 0,2 g…) z gramů, zaokrouhlené na 0,05. */
  pieces?: number
  /** Gramy z objemu koření přes hmotnost lžičky/lžíce/hrnku suroviny (units v katalogu). */
  gramsViaUnit?: { grams: number; rounded: number; unit: string }
  /** Pod 1 g se do JSON ukládá přesná hodnota, ne zaokrouhlení. */
  exact: boolean
}

/** Objem jednotky zdroje v ml pro `tsp=`, `tbsp=`, `cup=` (g na lžičku/lžíci/hrnek suroviny). */
const UNIT_ML: Record<string, number> = { tsp: 5, tbsp: 15, cup: 237, hrnek: 250 }

export function convertRow(spec: string, originalYield: number): ConversionRow {
  const [qty, cls, extra] = spec.split(':').map((s) => s.trim())
  if (!cls || !(SCALING_CLASSES as readonly string[]).includes(cls)) {
    throw new Error(`„${spec}“: za dvojtečkou musí být třída ${SCALING_CLASSES.join('|')}`)
  }
  const scaling = cls as ScalingClass
  const base = parseQuantity(qty)
  const factor = scaleFactor(BASE_SERVINGS / originalYield, scaling)
  const scaled = base.value * factor
  const row: ConversionRow = { input: qty, base, scaling, factor, scaled, rounded: roundAmount(scaled, base.kind).amount, exact: scaled < 1 }
  if (extra) {
    const m = extra.match(/^(ks|tsp|tbsp|cup|hrnek)=([\d.]+)$/)
    if (!m) throw new Error(`„${spec}“: třetí část musí být ks=<g na kus> nebo tsp=|tbsp=|cup=<g na jednotku>`)
    const per = Number(m[2])
    if (m[1] === 'ks') {
      if (base.kind !== 'g') throw new Error(`„${spec}“: ks= jde jen z hmotnosti`)
      row.pieces = Math.round((scaled / per) * 20) / 20
    } else {
      if (base.kind !== 'ml') throw new Error(`„${spec}“: ${m[1]}= jde jen z objemu`)
      const grams = (scaled / UNIT_ML[m[1]]) * per
      row.gramsViaUnit = { grams, rounded: roundAmount(grams, 'g').amount, unit: m[1] }
      row.exact = grams < 1
    }
  }
  return row
}

const fmt = (n: number, d = 1) => n.toFixed(d).replace('.', ',')

/** Hodnota, která se zapíše do JSON (zaokrouhlená; pod 1 g přesná na 2 desetinná místa; kusy, je-li ks=). */
export function jsonValue(r: ConversionRow): { amount: number; unit: string } {
  if (r.pieces !== undefined) return { amount: r.pieces, unit: 'ks' }
  if (r.gramsViaUnit) return { amount: r.exact ? Math.round(r.gramsViaUnit.grams * 100) / 100 : r.gramsViaUnit.rounded, unit: 'g' }
  return { amount: r.exact ? Math.round(r.scaled * 100) / 100 : r.rounded, unit: r.base.kind }
}

export function formatRow(r: ConversionRow): string {
  const unit = r.base.kind
  const j = jsonValue(r)
  let tail = `DO JSON: ${String(j.amount).replace('.', ',')} ${j.unit}`
  if (r.gramsViaUnit) tail = `${fmt(r.gramsViaUnit.grams, 2)} g přes ${r.gramsViaUnit.unit} | ${tail}`
  if (r.pieces !== undefined) tail += ` (${r.rounded} g)`
  if (r.exact) tail += ' (pod 1 g: přesně, ne špetka)'
  return `${r.input} | ${fmt(r.base.value)} ${unit} | ${r.scaling} ×${r.factor.toFixed(4)} | ${fmt(r.scaled, 2)} ${unit} | ${tail}`
}

/** Domácí slévaná voda (scaling vessel): těstoviny 1 l / 100 g, brambory a luštěniny 1 l / 1 kg; na 0,5 l, polovina nahoru, nejméně 1 l. */
export function drainedWaterMl(grams: number, kind: 'pasta' | 'potatoes'): number {
  const raw = kind === 'pasta' ? grams * 10 : grams
  return Math.max(1000, Math.round(raw / 500 + 1e-9) * 500)
}

export function parseArgs(argv: string[]): { originalYield: number; specs: string[]; drained: { kind: 'pasta' | 'potatoes'; grams: number }[] } {
  let originalYield = 100
  const specs: string[] = []
  const drained: { kind: 'pasta' | 'potatoes'; grams: number }[] = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--yield') {
      originalYield = parseFraction(argv[++i] ?? '')
      if (!(originalYield > 0)) throw new Error('--yield musí být kladné číslo')
    } else if (argv[i] === '--pasta' || argv[i] === '--potatoes') {
      drained.push({ kind: argv[i] === '--pasta' ? 'pasta' : 'potatoes', grams: parseFraction(argv[++i] ?? '') })
    } else specs.push(argv[i])
  }
  return { originalYield, specs, drained }
}

function main() {
  const { originalYield, specs, drained } = parseArgs(process.argv.slice(2))
  if (specs.length === 0 && drained.length === 0) {
    console.error('Použití: npm run convert -- [--yield 100] "<množství>:<třída>[:ks=<g/kus>|tsp=<g>|tbsp=<g>|cup=<g>]" … [--pasta <g suchých>] [--potatoes <g>]\n  např. npm run convert -- --yield 100 "8-1/2 lbs:linear" "1-7/8 oz:seasoning" "10 lbs:linear:ks=50" "1 tsp:seasoning:tsp=2.3" --pasta 220')
    process.exit(1)
  }
  if (specs.length > 0) console.log(`k = ${BASE_SERVINGS}/${originalYield}; sloupce: zdroj | g/ml | třída × faktor | 4 porce přesně | DO JSON`)
  for (const s of specs) {
    try {
      console.log(formatRow(convertRow(s, originalYield)))
    } catch (e) {
      console.log(`CHYBA: ${(e as Error).message}`)
    }
  }
  for (const d of drained) {
    console.log(`slévaná voda na ${d.grams} g ${d.kind === 'pasta' ? 'těstovin' : 'brambor/luštěnin'}: ${drainedWaterMl(d.grams, d.kind)} ml, "scaling": "vessel" (+ sůl 2 g na 1 l, vessel)`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
