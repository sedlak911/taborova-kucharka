import { render, screen, act, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { loadContent } from '@/content/loadContent'
import { installFakeLayout } from '@/test/fakeLayout'
import { OWN_ID, customRecipe } from '@/test/customRecipe'
import { seedUserState } from '@/test/seedState'
import { DEFAULT_USER_STATE, STORAGE_KEY, type UserState } from '@/state/userState'

// celá kniha má v jsdom ~11 000 uzlů a dotazy podle role ji procházejí; v prohlížeči tytéž kroky trvají milisekundy
vi.setConfig({ testTimeout: 60_000 })

beforeEach(() => {
  // stav se ukládá i při odmontování a nesmí prosakovat mezi testy (Node 25 podstrkuje rozbitý globální localStorage)
  try { window.localStorage.clear() } catch { /* úložiště nedostupné = nic neprosakuje */ }
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: q.includes('reduced-motion'), addEventListener() {}, removeEventListener() {} })) as never
  window.print = vi.fn()
  history.replaceState(null, '', '/')
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('vykreslí knihu s obalem', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /Recepty na vejlety/ })).toBeInTheDocument()
})

test('hash #/recept/hovezi-gulas zobrazí recept a aria-live ho hlásí', () => {
  history.replaceState(null, '', '#/recept/hovezi-gulas')
  render(<App />)
  expect(screen.getAllByRole('heading', { name: 'Hovězí guláš' }).length).toBeGreaterThan(0)
  expect(screen.getByRole('status')).toHaveTextContent(/Strana \d+ z \d+ – Hovězí guláš/)
})

test('změna hashe přepne stránku', () => {
  render(<App />)
  act(() => {
    location.hash = '#/seznam'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  expect(screen.getByRole('heading', { level: 2, name: 'Nákupní seznam' })).toBeInTheDocument()
})

test('recept dostane třídu epochy na samotné stránce (papír)', () => {
  history.replaceState(null, '', '#/recept/hovezi-gulas')
  const { container } = render(<App />)
  const article = container.querySelector('.recipe-page')!
  const era = [...article.classList].find((c) => c.startsWith('era--'))!
  expect(article.closest('.page')).toHaveClass(era)
})

test('přepnutí single→spread→single zachová hash receptu', () => {
  let listener: () => void = () => {}
  let single = true
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    get matches() { return q.includes('reduced-motion') ? true : q === 'print' ? false : single },
    addEventListener(_: string, l: () => void) { listener = l },
    removeEventListener() {},
  })) as never
  history.replaceState(null, '', '#/recept/hovezi-gulas')
  render(<App />)
  expect(screen.getByRole('status')).toHaveTextContent(/– Hovězí guláš$/)
  single = false
  act(() => listener())
  expect(screen.getByRole('status')).toHaveTextContent(/– Hovězí guláš$/)
  expect(document.querySelector('.book__slot--left .recipe-page--left')).not.toBeNull()
  single = true
  act(() => listener())
  expect(location.hash).toBe('#/recept/hovezi-gulas')
  expect(document.querySelector('.book__slot--single .recipe-page--single')).not.toBeNull()
})

const singleMode = () => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes('reduced-motion') || q.includes('max-width'),
    addEventListener() {},
    removeEventListener() {},
  })) as never
}

test('mobil: recept je jedna stránka – údaje a suroviny, pak postup, tlačítka v ní', () => {
  singleMode()
  history.replaceState(null, '', '#/recept/hovezi-gulas')
  const { container } = render(<App />)
  const page = container.querySelector<HTMLElement>('.book__slot--single .recipe-page--single')!
  expect(page.querySelector('.ingredient-table')).not.toBeNull()
  expect(page.querySelector('.recipe-steps')).not.toBeNull()
  expect(within(page).getByRole('button', { name: 'Do košíku' })).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent(/– Hovězí guláš$/)
})

test('mobil: čísla stran v obsahu odpovídají jednostránkovému layoutu', () => {
  singleMode()
  history.replaceState(null, '', '#/obsah')
  const { container } = render(<App />)
  const row = container.querySelector<HTMLButtonElement>('.book__slot--single .toc-row')!
  const number = row.querySelector('.toc-row-page')!.textContent
  fireEvent.click(row)
  expect(screen.getByRole('status')).toHaveTextContent(new RegExp(`^Strana ${number} z `))
  expect(container.querySelector('.book__slot--single .recipe-page--single')).not.toBeNull()
})

test('recept je dvoustrana: vlevo suroviny, vpravo postup', () => {
  history.replaceState(null, '', '#/recept/hovezi-gulas')
  const { container } = render(<App />)
  expect(container.querySelector('.book__slot--left .recipe-page--left .ingredient-table')).not.toBeNull()
  expect(container.querySelector('.book__slot--right .recipe-page--right .recipe-steps')).not.toBeNull()
  expect(container.querySelector('.book__slot--right .page')).toHaveClass(
    [...container.querySelector('.recipe-page--right')!.classList].find((c) => c.startsWith('era--'))!,
  )
  // tlačítka receptu jsou vpravo (R2), levá strana je nemá
  expect(container.querySelector('.book__slot--right .recipe-actions .mark--favorite')).not.toBeNull()
  expect(container.querySelector('.book__slot--left .mark')).toBeNull()
})

test('proklik z pravé stránky obsahu otevře recept od levé strany', () => {
  history.replaceState(null, '', '#/obsah')
  const { container } = render(<App />)
  const row = container.querySelector<HTMLButtonElement>('.book__slot--right .toc-row')!
  const title = row.querySelector('.toc-row-title')!.textContent!
  fireEvent.click(row)
  expect(location.hash).toMatch(/^#\/recept\//)
  expect(container.querySelector('.book__slot--left .recipe-page--left h2')).toHaveTextContent(title)
})

test('tlačítko Domů vrátí na obsah a zapíše krok do historie', () => {
  history.replaceState(null, '', '#/recept/hovezi-gulas')
  render(<App />)
  const push = vi.spyOn(history, 'pushState')
  fireEvent.click(screen.getByRole('button', { name: 'Domů' }))
  expect(push).toHaveBeenCalledWith(null, '', '#/obsah')
  expect(screen.getByRole('heading', { level: 2, name: 'Obsah' })).toBeInTheDocument()
  push.mockRestore()
})

test('tlačítko tisku mimo knihu tiskne podle stránky jako Ctrl+P (recept, obsah, košík → seznam)', () => {
  history.replaceState(null, '', '#/recept/hovezi-gulas')
  const { container } = render(<App />)
  const seen: (string | null)[] = []
  window.print = vi.fn(() => { seen.push(document.documentElement.getAttribute('data-print')) })
  const controls = screen.getByRole('navigation', { name: 'Ovládání knihy' })
  fireEvent.click(within(controls).getByRole('button', { name: 'Tisk: recept (A4)' }))
  expect(container.querySelector('.print-root .print-recipe h2')).toHaveTextContent('Hovězí guláš')
  act(() => { window.dispatchEvent(new Event('afterprint')) })
  act(() => {
    location.hash = '#/obsah'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  fireEvent.click(within(controls).getByRole('button', { name: 'Tisk: obsah (A4)' }))
  act(() => { window.dispatchEvent(new Event('afterprint')) })
  act(() => {
    location.hash = '#/kosik'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  fireEvent.click(within(controls).getByRole('button', { name: 'Tisk: nákupní seznam (A4)' }))
  act(() => { window.dispatchEvent(new Event('afterprint')) })
  expect(seen).toEqual(['recipe', 'toc', 'list'])
})

test('tlačítko košíku mimo knihu skočí na stránku košíku', () => {
  history.replaceState(null, '', '#/recept/hovezi-gulas')
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Do košíku' }))
  fireEvent.click(screen.getByRole('button', { name: 'Jít na košík (1 recept)' }))
  expect(location.hash).toBe('#/kosik')
  expect(screen.getByRole('heading', { name: 'Košík' })).toBeInTheDocument()
})

test('#/kosik otevře stránku košíku a aria-live ji hlásí', () => {
  history.replaceState(null, '', '#/kosik')
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Košík' })).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent(/– Košík$/)
})

test('Do košíku na stránce receptu přidá recept', () => {
  history.replaceState(null, '', '#/recept/hovezi-gulas')
  render(<App />)
  const btn = screen.getByRole('button', { name: 'Do košíku' })
  fireEvent.click(btn)
  expect(btn).toHaveAttribute('aria-pressed', 'true')
})

test('záložka ukazuje počet receptů v košíku a skočí na košík', () => {
  history.replaceState(null, '', '#/recept/hovezi-gulas')
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Do košíku' }))
  fireEvent.click(screen.getByRole('button', { name: /^Košík: 1 recept ·/ }))
  fireEvent.click(screen.getByRole('button', { name: /Otevřít košík/ }))
  expect(location.hash).toBe('#/kosik')
  expect(screen.getByRole('heading', { name: 'Košík' })).toBeInTheDocument()
})

test('stránka košíku: násobek a odebrání receptu se projeví', () => {
  history.replaceState(null, '', '#/recept/hovezi-gulas')
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Do košíku' }))
  act(() => {
    location.hash = '#/kosik'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  fireEvent.click(screen.getByRole('button', { name: 'Více: Hovězí guláš' }))
  expect(screen.getByText('×2')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Odebrat: Hovězí guláš' }))
  expect(screen.getByText(/^Košík je prázdný\./)).toBeInTheDocument()
})

test('nákupní seznam sečte vejce ze dvou receptů pro 18 dětí + 6 dospělých', () => {
  const goTo = (hash: string) => act(() => {
    location.hash = hash
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  history.replaceState(null, '', '#/recept/michana-vejce')
  const { container } = render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Do košíku' }))
  goTo('#/recept/francouzske-topinky')
  fireEvent.click(screen.getByRole('button', { name: 'Do košíku' }))
  goTo('#/kosik')
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Dospělí' }), { target: { value: '6' } })
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Děti' }), { target: { value: '18' } })
  goTo('#/seznam')
  const eggs = [...container.querySelectorAll('.shopping-item')].find((li) => li.querySelector('.shopping-item__name')?.textContent === 'Vejce')!
  expect(eggs.querySelector('.shopping-item__amount')).toHaveTextContent('51 ks')
})

test('přepínač historických surovin v tiráži změní tabulku receptu', () => {
  history.replaceState(null, '', '#/nastaveni')
  render(<App />)
  fireEvent.click(screen.getByRole('checkbox', { name: /Historické suroviny/ }))
  act(() => {
    location.hash = '#/recept/americke-palacinky'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  expect(screen.getByText('dnes: Vejce 1 ks (na 4 porce)')).toBeInTheDocument()
})

test('záložka nepočítá položku košíku s neexistujícím receptem (poškozený stav)', () => {
  const data = new Map<string, string>([
    ['kucharka.userState.v1', JSON.stringify({ version: 1, cart: [{ recipeId: 'neexistuje', multiplier: 0 }], people: { adults: 0, children: 0 } })],
  ])
  const fake = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k), clear: () => data.clear() }
  const original = Object.getOwnPropertyDescriptor(window, 'localStorage')
  Object.defineProperty(window, 'localStorage', { configurable: true, value: fake })
  try {
    render(<App />)
    expect(screen.getByRole('button', { name: /^Košík: 0 receptů · 1 os\./ })).toBeInTheDocument()
  } finally {
    if (original) Object.defineProperty(window, 'localStorage', original)
    else delete (window as { localStorage?: unknown }).localStorage
  }
})

const printEvent = (type: 'beforeprint' | 'afterprint') => act(() => { window.dispatchEvent(new Event(type)) })
const printMode = () => document.documentElement.getAttribute('data-print')

test('Ctrl+P na receptu vytiskne jen recept (čistý A4 strom), afterprint uklidí', () => {
  history.replaceState(null, '', '#/recept/hovezi-gulas')
  const { container } = render(<App />)
  expect(container.querySelector('.print-root')).toBeNull()
  printEvent('beforeprint')
  expect(printMode()).toBe('recipe')
  const root = container.querySelector('.print-root')!
  expect(root.querySelector('.print-recipe h2')).toHaveTextContent('Hovězí guláš')
  expect(root.querySelectorAll('button, input')).toHaveLength(0)
  printEvent('afterprint')
  expect(printMode()).toBeNull()
  expect(container.querySelector('.print-root')).toBeNull()
})

test.each([
  ['#/seznam', 'list', '.shopping-page'],
  ['#/kosik', 'list', '.shopping-page'],
  ['#/obsah', 'toc', '.print-toc'],
  ['#/', 'toc', '.print-toc'],
  ['#/kapitola/polevky', 'toc', '.print-toc'],
  ['#/nastaveni', 'toc', '.print-toc'],
])('Ctrl+P na %s tiskne %s', (hash, mode, selector) => {
  history.replaceState(null, '', hash)
  const { container } = render(<App />)
  printEvent('beforeprint')
  expect(printMode()).toBe(mode)
  expect(container.querySelector(`.print-root ${selector}`)).not.toBeNull()
  printEvent('afterprint')
})

test('tištěný nákupní seznam má hlavičku s počtem osob a datem', () => {
  history.replaceState(null, '', '#/seznam')
  const { container } = render(<App />)
  printEvent('beforeprint')
  expect(container.querySelector('.print-root .shopping-people')!.textContent).toMatch(/^Pro 4 osoby · \d{1,2}\. \d{1,2}\. \d{4}$/)
  printEvent('afterprint')
})

test('Tisknout brožurku v košíku vysází brožurku místo knihy; afterprint uklidí', () => {
  history.replaceState(null, '', '#/recept/hovezi-gulas')
  const { container } = render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Do košíku' }))
  act(() => {
    location.hash = '#/kosik'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  const seen: (string | null)[] = []
  window.print = vi.fn(() => { seen.push(document.documentElement.getAttribute('data-print')) })
  fireEvent.click(screen.getByRole('button', { name: 'Tisknout brožurku' }))
  expect(window.print).toHaveBeenCalledTimes(1)
  expect(seen).toEqual(['booklet'])
  // titul + guláš + seznam = 3 strany → 4 = jeden list (přední + zadní strana)
  expect(container.querySelectorAll('.print-root .booklet-sheet')).toHaveLength(2)
  act(() => { window.dispatchEvent(new Event('afterprint')) })
  expect(container.querySelector('.print-root')).toBeNull()
})

test('brožurka zůstala připojená (bez afterprint): odebrání receptu z košíku aplikaci nesloží', () => {
  history.replaceState(null, '', '#/recept/hovezi-gulas')
  const { container } = render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Do košíku' }))
  act(() => {
    location.hash = '#/recept/bramborova-kase'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  fireEvent.click(screen.getByRole('button', { name: 'Do košíku' }))
  act(() => {
    location.hash = '#/kosik'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  window.print = vi.fn()
  fireEvent.click(screen.getByRole('button', { name: 'Tisknout brožurku' }))
  expect(container.querySelector('.print-root .booklet-sheet')).not.toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Odebrat: Hovězí guláš' }))
  expect(screen.getByRole('heading', { name: 'Košík' })).toBeInTheDocument()
  expect(container.querySelector('.print-root .booklet-sheet')).not.toBeNull()
  expect(container.querySelector('.print-root')).not.toHaveTextContent('Hovězí guláš')
})

test('„Tisknout nákupní seznam“ na stránce seznamu i „Tisknout jen nákupní seznam“ v košíku tisknou seznam', () => {
  history.replaceState(null, '', '#/recept/michana-vejce')
  const { container } = render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Do košíku' }))
  act(() => {
    location.hash = '#/kosik'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  const seen: (string | null)[] = []
  window.print = vi.fn(() => { seen.push(document.documentElement.getAttribute('data-print')) })
  fireEvent.click(screen.getByRole('button', { name: 'Tisknout jen nákupní seznam' }))
  expect(location.hash).toBe('#/kosik')
  expect(container.querySelector('.print-root .shopping-page')).not.toBeNull()
  act(() => { window.dispatchEvent(new Event('afterprint')) })
  // desktop: košík (vlevo) a seznam (vpravo) jsou na jedné dvoustraně
  fireEvent.click(screen.getByRole('button', { name: 'Tisknout nákupní seznam' }))
  expect(seen).toEqual(['list', 'list'])
  act(() => { window.dispatchEvent(new Event('afterprint')) })
})

function fakeServerFetch(stored: unknown, putStatus = 204) {
  const puts: unknown[] = []
  const reply = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    if (input === '/api/health') return reply(200, { ok: true })
    if (input === '/api/state' && init?.method === 'PUT') {
      puts.push(JSON.parse(String(init.body)))
      return reply(putStatus, null)
    }
    if (input === '/api/state') return reply(200, stored)
    return reply(404, null)
  })
  return { fetchMock, puts }
}

test('se serverem tiráž ukazuje režim server a stav ze serveru', async () => {
  const { fetchMock } = fakeServerFetch({ version: 1, settings: { childCoef: 0.5, historicalIngredients: true } })
  vi.stubGlobal('fetch', fetchMock)
  history.replaceState(null, '', '#/nastaveni')
  render(<App />)
  expect(await screen.findByText('server (soubor userdata/user-state.json)')).toBeInTheDocument()
  expect(screen.getByRole('spinbutton', { name: 'Koeficient dítěte' })).toHaveValue(0.5)
  expect(screen.getByRole('checkbox', { name: /Historické suroviny/ })).toBeChecked()
  expect(screen.queryByText('Server nedostupný – ukládá se jen sem')).toBeNull()
})

test('bez serveru tiráž ukazuje lokální režim a aplikace se ptá jen na /api/health', async () => {
  history.replaceState(null, '', '#/nastaveni')
  render(<App />)
  await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/health', expect.anything()))
  expect(screen.getByText('jen v tomto prohlížeči')).toBeInTheDocument()
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(screen.queryByText('Server nedostupný – ukládá se jen sem')).toBeNull()
})

test('server nepřijme data: odznak „server nedostupný“ a změny zůstanou v prohlížeči', async () => {
  const { fetchMock, puts } = fakeServerFetch(null, 503)
  vi.stubGlobal('fetch', fetchMock)
  // localStorage v tomto Node nefunguje spolehlivě: náhrada v paměti umožní ověřit, co se do prohlížeče uložilo
  const mem = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
    clear: () => mem.clear(),
  })
  history.replaceState(null, '', '#/nastaveni')
  render(<App />)
  expect(await screen.findByText('Server nedostupný – ukládá se jen sem')).toBeInTheDocument()
  expect(puts).toHaveLength(1)
  expect(screen.getByText('server nedostupný – ukládá se jen v tomto prohlížeči')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('checkbox', { name: /Historické suroviny/ }))
  await waitFor(() => expect(mem.get('kucharka.userState.v1')).toContain('"historicalIngredients":true'))
})

test('vlastní recept je ručně psaný list: era--vlastni na stránce i listu, linkovaný papír', () => {
  seedUserState({ customRecipes: [customRecipe()] })
  history.replaceState(null, '', `#/recept/${OWN_ID}`)
  const { container } = render(<App />)
  expect(screen.getAllByRole('heading', { name: 'Babiččiny lívance' }).length).toBeGreaterThan(0)
  const article = container.querySelector('.recipe-page--left')!
  expect(article).toHaveClass('era--vlastni')
  expect(article.closest('.page')).toHaveClass('era--vlastni', 'page--note')
})

test('vlastní recept v košíku se promítne do nákupního seznamu', () => {
  seedUserState({ customRecipes: [customRecipe()], cart: [{ recipeId: OWN_ID, multiplier: 1 }] })
  history.replaceState(null, '', '#/seznam')
  render(<App />)
  expect(screen.getByText('Hladká mouka')).toBeInTheDocument()
})

test('Smazat po potvrzení odstraní recept a vrátí na úvod kapitoly', () => {
  seedUserState({ customRecipes: [customRecipe()], favorites: [OWN_ID] })
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
  history.replaceState(null, '', `#/recept/${OWN_ID}`)
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Smazat' }))
  expect(confirm).toHaveBeenCalled()
  expect(location.hash).toBe('#/kapitola/snidane-a-pecivo')
  expect(screen.getByRole('status')).toHaveTextContent(/– Snídaně a pečivo$/)
  expect(screen.queryByRole('heading', { name: 'Babiččiny lívance' })).toBeNull()
  confirm.mockRestore()
})

describe('formulář vlastního receptu', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  test('Nový recept v obsahu otevře dialog nad knihou, Escape ho zavře a vrátí hash obsahu', async () => {
    const user = userEvent.setup()
    seedUserState()
    history.replaceState(null, '', '#/obsah')
    const { container } = render(<App />)
    const opener = screen.getByRole('button', { name: 'Nový recept' })
    await user.click(opener)
    expect(screen.getByRole('dialog', { name: 'Nový recept' })).toBeInTheDocument()
    expect(location.hash).toBe('#/novy-recept')
    expect(container.querySelector('main')).toHaveAttribute('inert')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Nový recept' })).toBeNull()
    await waitFor(() => expect(location.hash).toBe('#/obsah'))
    expect(container.querySelector('main')).not.toHaveAttribute('inert')
    // fokus se vrací na tlačítko, které formulář otevřelo
    expect(opener).toHaveFocus()
  })

  test('zavření formuláře otevřeného z hashe nepřidá záznam do historie, jen přepíše hash na stránku knihy', async () => {
    const user = userEvent.setup()
    seedUserState()
    history.replaceState(null, '', '#/novy-recept')
    render(<App />)
    const push = vi.spyOn(history, 'pushState')
    const back = vi.spyOn(history, 'back')
    await user.click(screen.getByRole('button', { name: 'Zrušit' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(location.hash).toBe('#/obsah')
    expect(push).not.toHaveBeenCalled()
    expect(back).not.toHaveBeenCalled()
  })

  test('#/novy-recept po načtení otevře formulář; uložení zařadí recept do knihy a otevře ho', async () => {
    const user = userEvent.setup()
    seedUserState()
    history.replaceState(null, '', '#/novy-recept')
    render(<App />)
    const dialog = screen.getByRole('dialog', { name: 'Nový recept' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Název' }), 'Táborová kaše')
    await user.type(within(dialog).getByRole('textbox', { name: 'Čas (minuty)' }), '20')
    await user.type(within(dialog).getByRole('combobox', { name: 'Surovina 1' }), 'vejce{Enter}')
    await user.type(within(dialog).getByRole('textbox', { name: 'Množství 1' }), '2')
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Jednotka 1' }), 'ks')
    await user.type(within(dialog).getByRole('textbox', { name: 'Postup (každý krok na nový řádek)' }), 'Uvař.')
    await user.click(within(dialog).getByRole('button', { name: 'Uložit recept' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(location.hash).toMatch(/^#\/recept\/vlastni-taborova-kase-[a-z0-9]{4}$/)
    expect(screen.getAllByRole('heading', { name: 'Táborová kaše' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('status')).toHaveTextContent(/– Táborová kaše$/)
  })

  test('Upravit na stránce vlastního receptu otevře předvyplněný formulář a uloží změnu', async () => {
    const user = userEvent.setup()
    seedUserState({ customRecipes: [customRecipe()] })
    history.replaceState(null, '', `#/recept/${OWN_ID}`)
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Upravit' }))
    expect(location.hash).toBe(`#/recept/${OWN_ID}/upravit`)
    const dialog = screen.getByRole('dialog', { name: 'Upravit recept' })
    const title = within(dialog).getByRole('textbox', { name: 'Název' })
    expect(title).toHaveValue('Babiččiny lívance')
    await user.clear(title)
    await user.type(title, 'Lívance od babičky')
    await user.click(within(dialog).getByRole('button', { name: 'Uložit recept' }))
    expect(location.hash).toBe(`#/recept/${OWN_ID}`)
    expect(screen.getAllByRole('heading', { name: 'Lívance od babičky' }).length).toBeGreaterThan(0)
  })

  test('#/recept/<knižní>/upravit ani neznámé id formulář neotevře', () => {
    seedUserState()
    history.replaceState(null, '', '#/recept/hovezi-gulas/upravit')
    render(<App />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getAllByRole('heading', { name: 'Hovězí guláš' }).length).toBeGreaterThan(0)
  })

  test('Zpět v prohlížeči (hashchange) formulář zavře', () => {
    seedUserState()
    history.replaceState(null, '', '#/novy-recept')
    render(<App />)
    act(() => {
      location.hash = '#/obsah'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('šipky při otevřeném formuláři knihu neotáčejí', async () => {
    const user = userEvent.setup()
    seedUserState()
    history.replaceState(null, '', '#/obsah')
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Nový recept' }))
    const status = screen.getByRole('status').textContent
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('status').textContent).toBe(status)
  })

  test('po smazání posledního vlastního receptu zmizí pilulka Vlastní i její filtr', () => {
    seedUserState({ customRecipes: [customRecipe()] })
    history.replaceState(null, '', '#/obsah')
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Vlastní' }))
    expect(screen.getByRole('button', { name: 'Vlastní' })).toHaveAttribute('aria-pressed', 'true')
    act(() => {
      location.hash = `#/recept/${OWN_ID}`
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    fireEvent.click(screen.getByRole('button', { name: 'Smazat' }))
    act(() => {
      location.hash = '#/obsah'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.queryByRole('button', { name: 'Vlastní' })).toBeNull()
    expect(screen.queryByText(/Nic nenalezeno/)).toBeNull()
    expect(container.querySelectorAll('.toc-row').length).toBeGreaterThan(0)
  })

  test('tiráž: import vlastního receptu ho přidá a kniha zůstane na tiráži, Nový recept otevře formulář', async () => {
    const user = userEvent.setup()
    seedUserState()
    history.replaceState(null, '', '#/nastaveni')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Vlastní recepty' })).toBeInTheDocument()
    const file = new File([JSON.stringify([customRecipe()])], 'recepty.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText('Importovat vlastní recepty'), file)
    expect(await screen.findByText('Přidáno: 1.')).toBeInTheDocument()
    expect(location.hash).toBe('#/nastaveni')
    expect(screen.getByRole('heading', { level: 2, name: 'Tiráž a nastavení' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Data a ukládání' })).toBeInTheDocument()
    expect(screen.getByText(/Vlastní recepty v knize: 1\./)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Nový recept' }))
    expect(screen.getByRole('dialog', { name: 'Nový recept' })).toBeInTheDocument()
  })
})

describe('layout se zmenší, zatímco kniha stojí na tiráži', () => {
  for (const n of [1, 2]) {
    test(`import zálohy bez ${n} vlastních receptů nechá knihu na tiráži`, async () => {
      const user = userEvent.setup()
      const own = Array.from({ length: 3 }, (_, i) => customRecipe({ id: `vlastni-test-${i}aaa`, title: `Test ${i}`, chapter: 'napoje' }))
      seedUserState({ customRecipes: own })
      history.replaceState(null, '', '#/nastaveni')
      render(<App />)
      const backup = { ...DEFAULT_USER_STATE, customRecipes: own.slice(0, 3 - n) }
      await user.upload(screen.getByLabelText('Importovat data…'), new File([JSON.stringify(backup)], 'z.json', { type: 'application/json' }))
      const group = await screen.findByRole('group', { name: 'Potvrzení importu' })
      await user.click(group.querySelectorAll('button')[0] as HTMLElement)
      expect(location.hash).toBe('#/nastaveni')
      expect(screen.getByRole('heading', { level: 2, name: 'Tiráž a nastavení' })).toBeInTheDocument()
    })
  }
})

describe('Zpět v prohlížeči s rozepsaným formulářem', () => {
  async function openDirty() {
    const user = userEvent.setup()
    seedUserState()
    history.replaceState(null, '', '#/obsah')
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Nový recept' }))
    await user.type(within(screen.getByRole('dialog', { name: 'Nový recept' })).getByRole('textbox', { name: 'Název' }), 'Rozepsaný')
  }
  const goBack = () =>
    act(() => {
      history.replaceState(null, '', '#/obsah')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })

  test('odmítnutí potvrzení nechá formulář otevřený a vrátí jeho hash', async () => {
    await openDirty()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    goBack()
    expect(confirm).toHaveBeenCalledWith('Zahodit rozepsaný recept?')
    expect(screen.getByRole('dialog', { name: 'Nový recept' })).toBeInTheDocument()
    expect(location.hash).toBe('#/novy-recept')
  })

  test('souhlas formulář zavře', async () => {
    await openDirty()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    goBack()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('nerozepsaný formulář se zavře bez dotazu', async () => {
    const user = userEvent.setup()
    seedUserState()
    history.replaceState(null, '', '#/obsah')
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Nový recept' }))
    const confirm = vi.spyOn(window, 'confirm')
    goBack()
    expect(confirm).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

test('uložený stav s „uvařeno“ se načte (oblíbené zůstanou) a po další změně se „cooked“ už neuloží', () => {
  const mem = seedUserState({ favorites: ['hovezi-gulas'], cooked: ['hovezi-gulas'] } as Partial<UserState>)
  history.replaceState(null, '', '#/recept/hovezi-gulas')
  const { unmount } = render(<App />)
  expect(screen.getByRole('button', { name: 'Oblíbené' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.queryByRole('button', { name: /Uvařeno/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Do košíku' }))
  unmount() // provider při odmontování uloží neodložený stav
  const saved = JSON.parse(mem.get(STORAGE_KEY)!)
  expect(saved.favorites).toEqual(['hovezi-gulas'])
  expect(saved.cart).toEqual([{ recipeId: 'hovezi-gulas', multiplier: 1 }])
  expect(saved).not.toHaveProperty('cooked')
})

test('naměřená kapacita stránky: celý obsah se vejde na jednu stránku a layout se přestaví bez smyčky', () => {
  const restore = installFakeLayout({ content: 100_000, head: 20, chapter: 20, recipe: 20 })
  try {
    history.replaceState(null, '', '#/obsah')
    const { container } = render(<App />)
    expect(container.querySelectorAll('.book__slot--left .toc-recipe')).toHaveLength(loadContent().recipes.length)
    expect(container.querySelector('.book__slot--right .toc-page')).toBeNull() // jediná stránka obsahu
    expect(location.hash).toBe('#/obsah')
  } finally {
    restore()
  }
})
