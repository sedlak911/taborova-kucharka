/** Všechna písma tisku (@fontsource načítá řezy líně, až když je stránka použije). */
export const PRINT_FONT_FACES = [
  '400 1em "EB Garamond"',
  '700 1em "EB Garamond"',
  'italic 400 1em "EB Garamond"',
  '400 1em "IBM Plex Sans"',
  '600 1em "IBM Plex Sans"',
  '400 1em "Special Elite"',
]

/** Znaky z latin i latin-ext, aby se stáhly obě podmnožiny. */
const SAMPLE = 'AaĚěŠšČčŘřŽžÝýÁáÍíÉéŮůŇňŤťĎď'

/**
 * Stáhne řezy písem dřív, než je tisk potřebuje: brožurka měří výšky bloků při kliknutí na tlačítko
 * a řez, který ještě není načtený (např. kurzíva), by se změřil záložním písmem a strany by se rozdělily jinak.
 */
export function preloadPrintFonts(): Promise<unknown> {
  if (typeof document === 'undefined' || !document.fonts?.load) return Promise.resolve()
  return Promise.all(PRINT_FONT_FACES.map((face) => document.fonts.load(face, SAMPLE))).catch(() => undefined)
}
