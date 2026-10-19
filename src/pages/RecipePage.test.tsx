import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadContent } from '@/content/loadContent'
import { recipeMacrosPerServing } from '@/domain/nutrition'
import { customRecipe } from '@/test/customRecipe'
import { RecipeLeft, RecipeRight, RecipeSingle } from './RecipePage'
import { resetStopwatchStore } from './useStopwatch'
import { TAG_LABEL, formatInteger } from './labels'

const { recipes, ingredients } = loadContent()
const chilli = recipes.find((r) => r.id === 'chilli-con-carne')!
const portions = { people: { adults: 4, children: 0 }, childCoef: 0.8, dayFactor: 1 }
const actions = () => ({ favorite: false, inCart: false, onToggleFavorite: vi.fn(), onToggleCart: vi.fn() })

function setupLeft(over: Partial<React.ComponentProps<typeof RecipeLeft>> = {}) {
  const props = { recipe: chilli, ingredients, portions, historical: false, ...over }
  return { ...render(<RecipeLeft {...props} />), props }
}
function setupRight(over: Partial<React.ComponentProps<typeof RecipeRight>> = {}) {
  const props = { recipe: chilli, ...actions(), ...over }
  return { ...render(<RecipeRight {...props} />), props }
}
function setupSingle(over: Partial<React.ComponentProps<typeof RecipeSingle>> = {}) {
  const props = { recipe: chilli, ingredients, portions, historical: false, ...actions(), ...over }
  return { ...render(<RecipeSingle {...props} />), props }
}
const following = (a: Node, b: Node) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0

/** Syntetické kroky s časy (testy nezávisí na datech receptů, ta dostanou časy až v Tasku 8). */
const timedSteps = [
  { text: 'Nakrájej cibuli.', minutes: 5 },
  { text: 'Osmaž cibuli.', minutes: 10 },
  { text: 'Osol.' },
  { text: 'Duš pod pokličkou.', minutes: 35 },
  { text: 'Mezitím uvař rýži.', minutes: 20, parallel: true as const },
]
const timed = { ...chilli, steps: timedSteps }
const untimed = { ...chilli, steps: chilli.steps.map((s) => ({ text: s.text })) }
const marks = (root: ParentNode) => [...root.querySelectorAll('.recipe-steps li')].map((li) => li.querySelector('.step-time')?.textContent ?? null)

describe('RecipeLeft', () => {
  it('nese název, knihu, čas, obtížnost, vybavení, alergeny a všech 12 surovin', () => {
    const { container } = setupLeft()
    expect(screen.getByRole('heading', { level: 2, name: chilli.title })).toBeInTheDocument()
    expect(container.querySelector('.recipe-book')).toHaveTextContent('Armed Forces Recipe Service, 2003')
    expect(screen.getByText('90 min')).toBeInTheDocument()
    expect(screen.getByText('●○○')).toBeInTheDocument()
    expect(screen.getByText('plotna')).toBeInTheDocument()
    expect(screen.getByText('bez alergenů')).toBeInTheDocument()
    expect(chilli.ingredients).toHaveLength(12)
    expect(screen.getAllByRole('row')).toHaveLength(13)
  })

  it('nemá štítky ani postup', () => {
    const { container } = setupLeft()
    expect(container.querySelector('.pill, .recipe-labels')).toBeNull()
    for (const t of chilli.tags) expect(screen.queryByText(TAG_LABEL[t])).toBeNull()
    expect(container.querySelector('.recipe-steps')).toBeNull()
  })

  it('nemá srdíčko, košík ani tisk – nic nezasahuje do názvu (R2)', () => {
    const { container } = setupLeft()
    for (const name of ['Oblíbené', 'Do košíku', 'Tisknout recept']) expect(screen.queryByRole('button', { name })).toBeNull()
    expect(container.querySelector('.print-hint, .recipe-actions, .mark--print')).toBeNull()
  })

  it('vlastní recept: era--vlastni a kniha bez roku', () => {
    const { container } = setupLeft({ recipe: { ...chilli, source: { book: 'vlastni' } } })
    expect(container.querySelector('.era--vlastni')).not.toBeNull()
    expect(container.querySelector('.recipe-book')).toHaveTextContent(/^Vlastní recepty$/)
  })

  it('pod tabulkou je orientační nutrice na porci', () => {
    setupLeft()
    // getByText normalizuje nezlomitelnou mezeru v textu uzlu na obyčejnou
    const kcal = formatInteger(recipeMacrosPerServing(chilli, ingredients, false).kcal).replace(/\s/g, ' ')
    expect(screen.getByText('Na porci (orientačně):')).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`^${kcal} kcal · bílkoviny`))).toBeInTheDocument()
  })

  it('tabulka ukazuje množství pro předané osoby', () => {
    setupLeft({ portions: { people: { adults: 6, children: 18 }, childCoef: 0.8, dayFactor: 1 } })
    expect(screen.getByRole('columnheader', { name: 'Pro 24 osob' })).toBeInTheDocument()
  })
})

describe('RecipeRight', () => {
  it('nese postup, poznámku k modernizaci a patičku zdroje', () => {
    const { container } = setupRight()
    expect(container.querySelectorAll('.recipe-steps li')).toHaveLength(chilli.steps.length)
    expect(container.querySelector('.modern-note')).toHaveTextContent(chilli.modernNote!)
    const footer = container.querySelector('footer.source')!
    expect(footer.textContent).toContain('Zdroj: Armed Forces Recipe Service, 2003')
    expect(footer.textContent).toContain('(PDF)')
    expect(container.querySelector('.recipe-running-head')).toHaveTextContent(chilli.title)
  })

  it('má nadpis h2 s názvem receptu před h3 „Postup“ (bez přeskočené úrovně)', () => {
    const { container } = setupRight()
    expect([...container.querySelectorAll('h2, h3')].map((h) => h.tagName)).toEqual(['H2', 'H3'])
    expect(container.querySelector('h2')).toHaveTextContent(chilli.title)
  })

  it('nemá tabulku surovin ani štítky', () => {
    const { container } = setupRight()
    expect(container.querySelector('table, .pill')).toBeNull()
  })

  it('srdíčko a košík jsou v samostatném řádku nad živým záhlavím, mimo nadpis (R2)', async () => {
    const { props, container } = setupRight({ favorite: true })
    const heart = screen.getByRole('button', { name: 'Oblíbené' })
    const cart = screen.getByRole('button', { name: 'Do košíku' })
    expect(heart).toHaveAttribute('aria-pressed', 'true')
    expect(cart).toHaveAttribute('aria-pressed', 'false')
    const row = container.querySelector('.recipe-actions')!
    expect(row).toContainElement(heart)
    expect(row).toContainElement(cart)
    expect(heart.closest('h2, h3, header')).toBeNull()
    expect(following(row, container.querySelector('.recipe-running-head')!)).toBe(true)
    await userEvent.click(heart)
    await userEvent.click(cart)
    expect(props.onToggleFavorite).toHaveBeenCalledTimes(1)
    expect(props.onToggleCart).toHaveBeenCalledTimes(1)
  })

  it('nemá tlačítko tisku', () => {
    setupRight()
    expect(screen.queryByRole('button', { name: /Tisk/ })).toBeNull()
  })
})

describe('RecipeSingle (mobil: recept na jedné stránce)', () => {
  it('údaje a suroviny, pak postup – jedna stránka s epochou', () => {
    const { container } = setupSingle()
    const page = container.querySelector('.recipe-page--single')!
    expect([...page.classList].some((c) => c.startsWith('era--'))).toBe(true)
    const table = page.querySelector('.ingredient-table')!
    const steps = page.querySelector('.recipe-steps')!
    expect(following(table, steps)).toBe(true)
    expect(steps.querySelectorAll('li')).toHaveLength(chilli.steps.length)
    expect(page.querySelector('footer.source')).toHaveTextContent('Zdroj: Armed Forces Recipe Service, 2003')
  })

  it('jeden nadpis h2 (název), postup h3, bez živého záhlaví', () => {
    const { container } = setupSingle()
    expect([...container.querySelectorAll('h2, h3')].map((h) => h.tagName)).toEqual(['H2', 'H3'])
    expect(container.querySelector('h2')).toHaveTextContent(chilli.title)
    expect(container.querySelector('.recipe-running-head')).toBeNull()
  })

  it('srdíčko a košík v samostatném řádku nad názvem, mimo nadpis', async () => {
    const { props, container } = setupSingle({ inCart: true })
    const row = container.querySelector('.recipe-actions')!
    const cart = screen.getByRole('button', { name: 'Do košíku' })
    expect(row).toContainElement(cart)
    expect(cart).toHaveAttribute('aria-pressed', 'true')
    expect(cart.closest('h2, header')).toBeNull()
    expect(following(row, container.querySelector('h2')!)).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'Oblíbené' }))
    expect(props.onToggleFavorite).toHaveBeenCalledTimes(1)
  })

  it('vlastní recept: Upravit a Smazat i na jedné stránce', () => {
    setupSingle({ recipe: customRecipe(), onEdit: vi.fn(), onDelete: vi.fn() })
    expect(screen.getByRole('button', { name: 'Upravit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Smazat' })).toBeInTheDocument()
  })
})

describe('vlastní recept', () => {
  afterEach(() => vi.restoreAllMocks())

  it('Upravit a Smazat (s potvrzením) na levé straně', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    setupLeft({ recipe: customRecipe(), onEdit, onDelete })
    await userEvent.click(screen.getByRole('button', { name: 'Upravit' }))
    expect(onEdit).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: 'Smazat' }))
    expect(onDelete).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Smazat' }))
    expect(confirm).toHaveBeenLastCalledWith('Smazat recept „Babiččiny lívance“? Zmizí i z košíku a oblíbených.')
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('knižní recept tlačítka Upravit a Smazat nemá', () => {
    setupLeft()
    expect(screen.queryByRole('button', { name: 'Upravit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Smazat' })).toBeNull()
  })

  it('pravá strana: „Poznámka“ místo „Poznámka k modernizaci“ a patička bez roku', () => {
    setupRight({ recipe: customRecipe({ modernNote: 'Podávej s povidly.' }) })
    expect(screen.getByText('Poznámka')).toBeInTheDocument()
    expect(screen.queryByText('Poznámka k modernizaci')).toBeNull()
    expect(screen.getByText('Vlastní recept · zapsaný pro 2 porce')).toBeInTheDocument()
  })
})

describe('Značky stopek a „Hotovo“ (R3)', () => {
  it('pravá strana: značka na začátku každého kroku, krok bez minut má začátek dalšího, souběžný „mezitím“', () => {
    const { container } = setupRight({ recipe: timed })
    expect(marks(container)).toEqual(['0:00', '5:00', '15:00', '15:00', 'mezitím'])
    const second = container.querySelectorAll('.recipe-steps li')[1]
    expect(second.firstElementChild).toHaveClass('step-time')
    expect(second.textContent).toBe('5:00Osmaž cibuli.')
    expect(screen.getByRole('img', { name: 'začátek 5:00' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'mezitím, souběžně s předchozím krokem' })).toHaveClass('step-time--parallel')
  })

  it('pod postupem „Hotovo: 50:00“ (souběžný krok se nepočítá)', () => {
    const { container } = setupRight({ recipe: timed })
    const total = container.querySelector('.recipe-steps-total')!
    expect(total.textContent).toBe('Hotovo: 50:00')
    expect(following(container.querySelector('.recipe-steps')!, total)).toBe(true)
  })

  it('od hodiny formát h:mm:ss', () => {
    const { container } = setupRight({ recipe: { ...chilli, steps: [{ text: 'Duš.', minutes: 70 }, { text: 'Dochuť.', minutes: 5 }] } })
    expect(marks(container)).toEqual(['0:00', '1:10:00'])
    expect(container.querySelector('.recipe-steps-total')!.textContent).toBe('Hotovo: 1:15:00')
  })

  it('recept bez časů: žádné značky ani „Hotovo“ (ruling R4)', () => {
    const { container } = setupRight({ recipe: untimed })
    expect(container.querySelector('.step-time, .recipe-steps-total')).toBeNull()
    expect(container.querySelector('.recipe-steps li')!.textContent).toBe(untimed.steps[0].text)
  })

  it('mobil (RecipeSingle) má značky i „Hotovo“, levá strana ne', () => {
    const single = setupSingle({ recipe: timed })
    expect(marks(single.container)).toEqual(['0:00', '5:00', '15:00', '15:00', 'mezitím'])
    expect(single.container.querySelector('.recipe-steps-total')).toHaveTextContent('Hotovo: 50:00')
    single.unmount()
    const left = setupLeft({ recipe: timed })
    expect(left.container.querySelector('.step-time, .recipe-steps-total')).toBeNull()
  })
})

describe('Stopky nad postupem (R3)', () => {
  beforeEach(() => {
    resetStopwatchStore()
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const items = (root: ParentNode) => [...root.querySelectorAll('.recipe-steps li')]
  const currentIndex = (root: ParentNode) => items(root).findIndex((li) => li.getAttribute('aria-current') === 'step')
  const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
  const timer = () => within(screen.getByRole('group', { name: 'Stopky' })).getByRole('timer')

  it('stojí na 0:00 mezi nadpisem Postup a kroky; Vynulovat zakázané; nic zvýrazněné', () => {
    const { container } = setupRight({ recipe: timed })
    const group = screen.getByRole('group', { name: 'Stopky' })
    expect(timer()).toHaveTextContent('0:00')
    expect(screen.getByRole('button', { name: 'Spustit' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Vynulovat' })).toBeDisabled()
    expect(following(screen.getByRole('heading', { level: 3, name: 'Postup' }), group)).toBe(true)
    expect(following(group, container.querySelector('.recipe-steps')!)).toBe(true)
    expect(container.querySelector('.is-current, [aria-current]')).toBeNull()
  })

  it('běží po sekundách a zvýrazní krok podle značek; po „Hotovo“ nic', () => {
    const { container } = setupRight({ recipe: timed })
    fireEvent.click(screen.getByRole('button', { name: 'Spustit' }))
    expect(screen.getByRole('button', { name: 'Pauza' })).toBeInTheDocument()
    expect(currentIndex(container)).toBe(0)
    advance(1000)
    expect(timer()).toHaveTextContent('0:01')
    advance(299_000)
    expect(timer()).toHaveTextContent('5:00')
    expect(currentIndex(container)).toBe(1)
    expect(items(container)[1]).toHaveClass('is-current')
    advance(10 * 60_000)
    expect(currentIndex(container)).toBe(3)
    advance(35 * 60_000)
    expect(timer()).toHaveTextContent('50:00')
    expect(currentIndex(container)).toBe(-1)
    expect(container.querySelector('.is-current')).toBeNull()
  })

  it('Pauza zastaví čas, Spustit pokračuje, Vynulovat vrátí 0:00 bez zvýraznění', () => {
    const { container } = setupRight({ recipe: timed })
    fireEvent.click(screen.getByRole('button', { name: 'Spustit' }))
    advance(30_000)
    fireEvent.click(screen.getByRole('button', { name: 'Pauza' }))
    advance(60_000)
    expect(timer()).toHaveTextContent('0:30')
    expect(currentIndex(container)).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Spustit' }))
    advance(30_000)
    expect(timer()).toHaveTextContent('1:00')
    fireEvent.click(screen.getByRole('button', { name: 'Vynulovat' }))
    expect(timer()).toHaveTextContent('0:00')
    expect(screen.getByRole('button', { name: 'Spustit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vynulovat' })).toBeDisabled()
    expect(container.querySelector('.is-current')).toBeNull()
    advance(5000)
    expect(timer()).toHaveTextContent('0:00')
  })

  it('čas se počítá z hodin, ne z počtu tiků (tab na pozadí, uspaný telefon)', () => {
    const { container } = setupRight({ recipe: timed })
    fireEvent.click(screen.getByRole('button', { name: 'Spustit' }))
    vi.setSystemTime(Date.now() + 20 * 60_000) // hodiny poskočí, žádný tik mezitím neproběhl
    advance(1000)
    expect(timer()).toHaveTextContent('20:01')
    expect(currentIndex(container)).toBe(3)
  })

  it('po návratu na kartu se čas přepočítá hned, ne až na dalším tiku', () => {
    const { container, unmount } = setupRight({ recipe: timed })
    fireEvent.click(screen.getByRole('button', { name: 'Spustit' }))
    vi.setSystemTime(Date.now() + 20 * 60_000)
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(timer()).toHaveTextContent('20:00')
    expect(currentIndex(container)).toBe(3)
    unmount()
    visibility.mockRestore()
  })

  it('po odchodu ze stránky se interval uklidí', () => {
    const { unmount } = setupRight({ recipe: timed })
    const before = vi.getTimerCount()
    fireEvent.click(screen.getByRole('button', { name: 'Spustit' }))
    expect(vi.getTimerCount()).toBe(before + 1)
    unmount()
    expect(vi.getTimerCount()).toBe(before)
  })

  it('mobil (RecipeSingle): stopky nad postupem a zvýraznění fungují', () => {
    const { container } = setupSingle({ recipe: timed })
    fireEvent.click(screen.getByRole('button', { name: 'Spustit' }))
    advance(6 * 60_000)
    expect(currentIndex(container)).toBe(1)
  })

  it('recept bez časů a levá strana stopky nemají', () => {
    const right = setupRight({ recipe: untimed })
    expect(screen.queryByRole('group', { name: 'Stopky' })).toBeNull()
    right.unmount()
    setupLeft({ recipe: timed })
    expect(screen.queryByRole('group', { name: 'Stopky' })).toBeNull()
  })
})
