import { PRINT_FONT_FACES, preloadPrintFonts } from './fonts'

afterEach(() => {
  Reflect.deleteProperty(document, 'fonts')
})

test('preloadPrintFonts načte všechny řezy písem tisku včetně kurzívy', async () => {
  const load = vi.fn((_face: string, _text: string) => Promise.resolve([]))
  Object.defineProperty(document, 'fonts', { value: { load }, configurable: true })
  await preloadPrintFonts()
  expect(load.mock.calls.map((c) => c[0])).toEqual(PRINT_FONT_FACES)
  expect(PRINT_FONT_FACES).toContain('italic 400 1em "EB Garamond"')
  expect(load.mock.calls.every((c) => /ě/.test(String(c[1])))).toBe(true)
})

test('bez document.fonts (jsdom) nic nehodí; chyba načtení se spolkne', async () => {
  await expect(preloadPrintFonts()).resolves.toBeUndefined()
  Object.defineProperty(document, 'fonts', { value: { load: () => Promise.reject(new Error('x')) }, configurable: true })
  await expect(preloadPrintFonts()).resolves.toBeUndefined()
})
