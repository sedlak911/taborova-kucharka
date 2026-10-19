/** Falešné rozložení pro jsdom (ten nemá layout): výšky těla stránky a řádků/hlavičky obsahu podle tříd. Vrací obnovu – volat v afterEach. */
interface FakeLayout {
  /** clientHeight těla stránky `.page-content` */
  content: number
  /** výška `.toc-head` */
  head: number
  /** výška `.toc-chapter` */
  chapter: number
  /** výška `.toc-recipe` */
  recipe: number
}

const rect = (h: number) => ({ height: h, width: 0, top: 0, left: 0, right: 0, bottom: h, x: 0, y: 0, toJSON() {} }) as DOMRect

export function installFakeLayout({ content, head, chapter, recipe }: FakeLayout): () => void {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('page-content') ? content : 0
    },
  })
  const spy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const c = this.classList
    return rect(c.contains('toc-head') ? head : c.contains('toc-chapter') ? chapter : c.contains('toc-recipe') ? recipe : 0)
  })
  return () => {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight
    spy.mockRestore()
  }
}
