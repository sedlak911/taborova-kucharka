import { measureToc, probeNumberFor, sameMetrics } from './tocMeasure'

const rect = (h: number) => ({ height: h, width: 0, top: 0, left: 0, right: 0, bottom: h, x: 0, y: 0, toJSON() {} }) as DOMRect

function probeDom(content: number, head: number, rows: [string, number][]) {
  const root = document.createElement('div')
  root.innerHTML = `<section class="page"><div class="page-content"><div class="toc-page"><div class="toc-head"></div><ul class="toc-list">${rows
    .map(([k]) => `<li data-toc-key="${k}"></li>`)
    .join('')}</ul></div></div></section>`
  Object.defineProperty(root.querySelector('.page-content')!, 'clientHeight', { value: content })
  root.querySelector<HTMLElement>('.toc-head')!.getBoundingClientRect = () => rect(head)
  root.querySelectorAll<HTMLElement>('[data-toc-key]').forEach((el, i) => {
    el.getBoundingClientRect = () => rect(rows[i][1])
  })
  document.body.append(root)
  return root
}

afterEach(() => { document.body.innerHTML = '' })

test('změří kapacitu těla stránky (bez svislého paddingu), hlavičku a každý řádek', () => {
  const root = probeDom(640, 230, [['c:polevky', 40], ['r:hovezi-gulas', 24]])
  root.querySelector<HTMLElement>('.page-content')!.style.padding = '20px 8px 10px'
  expect(measureToc(root)).toEqual({ capacity: 610, head: 230, rows: new Map([['c:polevky', 40], ['r:hovezi-gulas', 24]]) })
})

test('bez rozložení (nulové výšky) vrátí null', () => {
  expect(measureToc(probeDom(0, 0, [['c:polevky', 0]]))).toBeNull()
  expect(measureToc(probeDom(640, 230, [['c:polevky', 0]]))).toBeNull()
  expect(measureToc(document.createElement('div'))).toBeNull()
})

test('sameMetrics: rozdíl pod půl pixelu je totéž měření, jinak ne', () => {
  const a = { capacity: 610, head: 230, rows: new Map([['c:polevky', 40]]) }
  expect(sameMetrics(a, { capacity: 610.3, head: 229.8, rows: new Map([['c:polevky', 40.2]]) })).toBe(true)
  expect(sameMetrics(a, { ...a, capacity: 611 })).toBe(false)
  expect(sameMetrics(a, { ...a, rows: new Map([['c:polevky', 46]]) })).toBe(false)
  expect(sameMetrics(a, { ...a, rows: new Map([['c:sladke', 40]]) })).toBe(false)
  expect(sameMetrics(a, null)).toBe(false)
  expect(sameMetrics(null, null)).toBe(true)
})

test('měřicí číslo strany má tolik číslic jako největší číslo strany v knize', () => {
  expect(probeNumberFor(7)).toBe(8)
  expect(probeNumberFor(99)).toBe(88)
  expect(probeNumberFor(100)).toBe(888)
  expect(probeNumberFor(182)).toBe(888)
  expect(probeNumberFor(0)).toBe(8)
})
