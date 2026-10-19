import type { Macros } from '@/domain/nutrition'
import type { People } from '@/domain/portions'
import type { Allergen, Category, Equipment, Tag, Unit } from '@/domain/types'
import type { StorageMode } from '@/state/storage'

export const TAG_LABEL: Record<Tag, string> = {
  levne: 'levné',
  tabor: 'táborové',
  kotlik: 'kotlík',
  rychle: 'rychlé',
  'bez-masa': 'bez masa',
  sladke: 'sladké',
  'pripravit-predem': 'připravit předem',
}

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  trouba: 'trouba',
  plotna: 'plotna',
  kotlik: 'kotlík',
  gril: 'gril',
}

export const ALLERGEN_LABEL: Record<Allergen, string> = {
  lepek: 'lepek',
  korysi: 'korýši',
  vejce: 'vejce',
  ryby: 'ryby',
  arasidy: 'arašídy',
  soja: 'soja',
  mleko: 'mléko',
  orechy: 'ořechy',
  celer: 'celer',
  horcice: 'hořčice',
  sezam: 'sezam',
  siricitany: 'siřičitany',
  'vlci-bob': 'vlčí bob',
  mekkysi: 'měkkýši',
}

export const UNIT_LABEL: Record<Unit, string> = {
  g: 'g',
  ml: 'ml',
  ks: 'ks',
  lzice: 'lžíce',
  lzicka: 'lžička',
  hrnek: 'hrnek',
  spetka: 'špetka',
}

/** Kategorie obchodu (nákupní seznam), pořadí určuje `CATEGORIES`. */
export const CATEGORY_LABEL: Record<Category, string> = {
  pecivo: 'Pečivo',
  'mlecne-a-vejce': 'Mléčné výrobky a vejce',
  maso: 'Maso',
  ryby: 'Ryby',
  uzeniny: 'Uzeniny',
  zelenina: 'Zelenina',
  ovoce: 'Ovoce',
  'lusteniny-a-obiloviny': 'Luštěniny a obiloviny',
  'testoviny-a-ryze': 'Těstoviny a rýže',
  koreni: 'Koření',
  'tuky-a-oleje': 'Tuky a oleje',
  konzervy: 'Konzervy',
  trvanlive: 'Trvanlivé potraviny',
  napoje: 'Nápoje',
  mrazene: 'Mražené',
  ostatni: 'Ostatní',
}

export const DIFFICULTY_LABEL: Record<1 | 2 | 3, string> = { 1: 'snadné', 2: 'střední', 3: 'náročné' }

/** Obtížnost jako „●●○“. */
export function difficultyDots(difficulty: 1 | 2 | 3): string {
  return '●'.repeat(difficulty) + '○'.repeat(3 - difficulty)
}

function formatNumber(n: number): string {
  const whole = Math.floor(n)
  const frac = n - whole
  if (Math.abs(frac - 0.5) < 1e-9) return whole === 0 ? '½' : `${whole}½`
  return String(Math.round(n * 100) / 100).replace('.', ',')
}

/** Naformátuje množství pro zobrazení (bez zaokrouhlení – to dělá volající); od 1000 g/ml v kg/l. */
export function formatAmount(amount: number, unit: Unit): string {
  if (unit === 'spetka') return UNIT_LABEL.spetka
  if ((unit === 'g' || unit === 'ml') && amount >= 1000) return `${formatDecimal(amount / 1000, 2)} ${unit === 'g' ? 'kg' : 'l'}`
  return `${formatNumber(amount)} ${UNIT_LABEL[unit]}`
}

/** Český tvar podle počtu: 1 → one, 2–4 → few, jinak many; desetinné číslo → few („20,4 porce“). */
export function plural(n: number, one: string, few: string, many: string): string {
  if (!Number.isInteger(n)) return few
  if (n === 1) return one
  return n >= 2 && n <= 4 ? few : many
}

export function peopleLabel(n: number): string {
  return `${n} ${plural(n, 'osobu', 'osoby', 'osob')}`
}

export function peopleBreakdown(p: People): string {
  if (p.children === 0) return ''
  const parts = [`${p.children} ${plural(p.children, 'dítě', 'děti', 'dětí')}`]
  if (p.adults > 0) parts.push(`${p.adults} ${plural(p.adults, 'dospělý', 'dospělí', 'dospělých')}`)
  return parts.join(' + ')
}

export function peopleHeading(p: People): string {
  const breakdown = peopleBreakdown(p)
  return `Pro ${peopleLabel(p.adults + p.children)}${breakdown ? ` (${breakdown})` : ''}`
}

export function formatDecimal(n: number, digits = 1): string {
  const f = 10 ** digits
  return String(Math.round(n * f) / f).replace('.', ',')
}

/** Celé číslo s nezlomitelnou mezerou mezi tisíci. */
export function formatInteger(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')
}

export function formatMacros(m: Macros): string {
  return `${formatInteger(m.kcal)} kcal · bílkoviny ${Math.round(m.protein)} g · sacharidy ${Math.round(m.carbs)} g · tuky ${Math.round(m.fat)} g`
}

/** Datum v hlavičce tisku: „15. 10. 2026“. */
export function formatDate(d: Date): string {
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`
}

/** Nápověda u tlačítek tisku (Chrome: „Headers and footers“ / „Záhlaví a zápatí“). */
export const PRINT_HINT = 'V dialogu tisku vypněte „Záhlaví a zápatí“.'

/** Nápověda u brožurky (spec §4 [R1]): duplex řeší prohlížeč, aplikace dodá jen pořadí stran. */
export const BOOKLET_HINT = 'Brožurka A5 na A4 na šířku: tiskněte oboustranně s překlápěním po krátké straně a měřítkem 100 %, pak listy přeložte a sešijte uprostřed.'

/** Režim ukládání v tiráži (spec §5.2). */
export const STORAGE_MODE_LABEL: Record<StorageMode, string> = {
  local: 'jen v tomto prohlížeči',
  server: 'server (soubor userdata/user-state.json)',
  'server-unavailable': 'server nedostupný – ukládá se jen v tomto prohlížeči',
}

export const STORAGE_MODE_HINT: Record<StorageMode, string> = {
  local: 'Na jiném zařízení data neuvidíte. Pro sdílení s telefonem spusťte na počítači „npm run serve“ a otevřete adresu, kterou vypíše.',
  server: 'Změny se ukládají na počítač se serverem a zároveň do tohoto prohlížeče.',
  'server-unavailable': 'Změny zůstávají v tomto prohlížeči a na server se odešlou při další změně, po návratu na tuto stránku nebo po kliknutí na „Zkusit server znovu“.',
}

/** Odznak mimo tiráž, když server přestal odpovídat (ruling R10). */
export const STORAGE_OFFLINE_BADGE = 'Server nedostupný – ukládá se jen sem'

/** Formát stopek (spec §2 [R3]) – definovaný v doméně, protože ho potřebují i skripty (ruling R3). */
export { formatClock, formatStopwatch } from '@/domain/steps'
