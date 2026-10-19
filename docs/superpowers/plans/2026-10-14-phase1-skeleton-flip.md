# Fáze 1: Skeleton + prototyp otáčení stránek – implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Založit Vite + React + TypeScript projekt a postavit izolovaný prototyp knihy s vlastním CSS 3D otáčením stránek (dvoustrana na desktopu, jedna strana + swipe na mobilu), s papírovou texturou a stínováním, na prázdných stránkách bez obsahu.

**Architecture:** Model knihy je čistá funkce nad polem stránek (`book/model.ts`): počítá, které stránky tvoří aktuální dvoustranu v režimu `spread` (desktop) nebo `single` (mobil). Komponenta `Book` vykresluje stránky absolutně nad sebou uvnitř kontejneru s `perspective`; animaci řídí stav `flip` (směr, průběh 0–1), který plní buď pointer drag z rohu (`useFlipDrag`), nebo tlačítka/klávesy/swipe (animace přes `requestAnimationFrame`). Obsah stránky je běžný React, flip nezachytává události uvnitř stránky.

**Tech Stack:** Node 25, npm 11, Vite 8.3, React 19.3, TypeScript 7.0, Vitest 5.0, @testing-library/react, jsdom. Žádná UI knihovna, žádná flip knihovna.

**Spec:** `docs/superpowers/specs/2026-10-14-cookbook-design.md` (oddíly 2 a 6).

## Global Constraints

- Jazyk UI a komentářů: čeština s diakritikou. Identifikátory v kódu anglicky.
- Vlastní CSS 3D flip, žádná knihovna na otáčení stránek (spec §2).
- Desktop = dvoustrana, mobil (šířka < 768 px nebo `orientation: portrait`) = jedna stránka se swipem (spec §2).
- Drag jen z rohu/okraje stránky; inputy, tlačítka a scroll uvnitř stránky fungují nativně (spec §2).
- `prefers-reduced-motion: reduce` → bez animace, okamžité přepnutí (spec §2).
- Neaktivní stránky mají `inert` a `aria-hidden` (spec §2).
- Repo je soukromé, nic se nenasazuje (spec §6). Commitovat po každém tasku.
- Fonty self-hosted s českou diakritikou (spec §2) – ve fázi 1 jen systémový serif jako placeholder, fonty přijdou ve fázi 4.

## Review Focus

1. Drag z rohu začatý a puštěný před polovinou musí stránku vrátit zpět, ne dokončit otočení. Test v Task 4 (`finishFlip` s progress 0,3 → `cancelled`).
2. Na poslední dvoustraně nesmí jít listovat dál, na obálce zpět; tlačítka jsou `disabled`. Test v Task 2 (`canGoNext/canGoPrev`).
3. Přepnutí z `spread` na `single` (otočení telefonu) musí zachovat aktuální stránku, ne skočit na začátek. Test v Task 2 (`clampIndex` + `firstVisible`).
4. Klik na tlačítko uvnitř stránky nesmí spustit flip (pointer event uvnitř obsahu). Test v Task 5 (`isDragStartAllowed` vrací false pro cíl uvnitř `.page-content`).
5. Lichý počet stránek: poslední dvoustrana má vpravo prázdný list, ne crash. Test v Task 2.

---

### Task 1: Skeleton projektu (Vite + React + TS + Vitest)

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/test/setup.ts`, `src/App.test.tsx`
- Modify: `.gitignore` (už existuje, zkontrolovat `node_modules/`, `dist/`)

**Interfaces:**
- Produces: `npm run dev`, `npm test`, `npm run build`, alias `@/` → `src/`.

- [ ] **Step 1: Vytvořit projekt**

```bash
cd /Users/dominik/git/personal-projects/cookbook
npm create vite@latest . -- --template react-ts   # při dotazu na existující soubory zvolit „Ignore files and continue“
npm install
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Nastavit Vite + Vitest + alias**

`vite.config.ts`:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    css: false,
  },
})
```

`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
```

Do `tsconfig.json` (resp. `tsconfig.app.json`, pokud šablona dělí) přidat do `compilerOptions`:
```json
"baseUrl": ".",
"paths": { "@/*": ["src/*"] },
"types": ["vitest/globals", "@testing-library/jest-dom"]
```

Do `package.json` scripts přidat `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 3: Nahradit šablonu minimální aplikací**

`src/App.tsx`:
```tsx
export function App() {
  return <h1 lang="cs">Kuchařka</h1>
}
export default App
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/styles/global.css`:
```css
*, *::before, *::after { box-sizing: border-box; }
html, body, #root { margin: 0; height: 100%; }
body { background: #2b2420; font-family: Georgia, 'Times New Roman', serif; color: #2a2118; }
```

Smazat `src/App.css`, `src/index.css`, `src/assets/react.svg`, `public/vite.svg`. V `index.html` nastavit `<html lang="cs">` a `<title>Kuchařka</title>`.

- [ ] **Step 4: Napsat test, že se aplikace vykreslí**

`src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import App from './App'

test('vykreslí nadpis', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Kuchařka' })).toBeInTheDocument()
})
```

- [ ] **Step 5: Spustit testy a build**

Run: `npm test` → Expected: 1 passed.
Run: `npm run build` → Expected: build bez chyb, `dist/` vznikne.

- [ ] **Step 6: Commit (včetně dosavadních podkladů)**

```bash
git add -A
git commit -m "chore: skeleton Vite+React+TS+Vitest, spec, extrahované texty a analýzy kuchařek"
```

---

### Task 2: Model knihy (čisté funkce)

**Files:**
- Create: `src/book/model.ts`, `src/book/model.test.ts`

**Interfaces:**
- Produces:
```ts
export type ViewMode = 'spread' | 'single'
export interface BookPosition { index: number }   // index první viditelné stránky (0 = obal)
export function pageStep(mode: ViewMode): number          // 2 pro spread, 1 pro single
export function clampIndex(index: number, pageCount: number, mode: ViewMode): number
export function visiblePages(index: number, pageCount: number, mode: ViewMode): (number | null)[]  // [left, right] nebo [single]; null = prázdný list
export function canGoNext(index: number, pageCount: number, mode: ViewMode): boolean
export function canGoPrev(index: number): boolean
export function nextIndex(index: number, pageCount: number, mode: ViewMode): number
export function prevIndex(index: number, mode: ViewMode): number
```
Konvence: v režimu `spread` je obal (index 0) sám vpravo (vlevo `null`), další dvoustrany jsou liché indexy vlevo: [1,2], [3,4] … Index dvoustrany je vždy lichý nebo 0. V režimu `single` je index libovolný.

- [ ] **Step 1: Napsat testy**

`src/book/model.test.ts`:
```ts
import { visiblePages, clampIndex, canGoNext, canGoPrev, nextIndex, prevIndex } from './model'

describe('visiblePages spread', () => {
  test('obal je sám vpravo', () => expect(visiblePages(0, 10, 'spread')).toEqual([null, 0]))
  test('první dvoustrana', () => expect(visiblePages(1, 10, 'spread')).toEqual([1, 2]))
  test('lichý počet stránek: vpravo prázdný list', () => expect(visiblePages(9, 10, 'spread')).toEqual([9, null]))
  test('sudý index se zarovná na lichý', () => expect(visiblePages(2, 10, 'spread')).toEqual([1, 2]))
})

describe('visiblePages single', () => {
  test('jedna stránka', () => expect(visiblePages(4, 10, 'single')).toEqual([4]))
})

describe('navigace', () => {
  test('z obalu na první dvoustranu', () => expect(nextIndex(0, 10, 'spread')).toBe(1))
  test('dál po dvou', () => expect(nextIndex(1, 10, 'spread')).toBe(3))
  test('zpět na obal', () => expect(prevIndex(1, 'spread')).toBe(0))
  test('single po jedné', () => expect(nextIndex(3, 10, 'single')).toBe(4))
  test('na konci nelze dál (spread, 10 stran)', () => expect(canGoNext(9, 10, 'spread')).toBe(false))
  test('na konci nelze dál (single)', () => expect(canGoNext(9, 10, 'single')).toBe(false))
  test('na obalu nelze zpět', () => expect(canGoPrev(0)).toBe(false))
  test('nextIndex nepřeteče', () => expect(nextIndex(9, 10, 'spread')).toBe(9))
})

describe('clampIndex při změně režimu', () => {
  test('single 4 → spread zarovná na 3 (stránka 4 zůstane vidět)', () => expect(clampIndex(4, 10, 'spread')).toBe(3))
  test('spread 3 → single zůstane 3', () => expect(clampIndex(3, 10, 'single')).toBe(3))
  test('záporný index → 0', () => expect(clampIndex(-2, 10, 'single')).toBe(0))
  test('přes konec → poslední', () => expect(clampIndex(40, 10, 'single')).toBe(9))
})
```

- [ ] **Step 2: Spustit, ověřit selhání**

Run: `npm test -- src/book/model.test.ts` → Expected: FAIL, modul neexistuje.

- [ ] **Step 3: Implementace**

`src/book/model.ts`:
```ts
export type ViewMode = 'spread' | 'single'

export function pageStep(mode: ViewMode): number {
  return mode === 'spread' ? 2 : 1
}

/** V režimu spread je platný index 0 (obal) nebo lichý. */
function alignSpread(index: number): number {
  if (index <= 0) return 0
  return index % 2 === 1 ? index : index - 1
}

export function clampIndex(index: number, pageCount: number, mode: ViewMode): number {
  if (pageCount <= 0) return 0
  const max = pageCount - 1
  const i = Math.min(Math.max(index, 0), max)
  return mode === 'spread' ? alignSpread(i) : i
}

export function visiblePages(index: number, pageCount: number, mode: ViewMode): (number | null)[] {
  const i = clampIndex(index, pageCount, mode)
  if (mode === 'single') return [i]
  if (i === 0) return [null, 0]
  const right = i + 1 < pageCount ? i + 1 : null
  return [i, right]
}

export function canGoPrev(index: number): boolean {
  return index > 0
}

export function canGoNext(index: number, pageCount: number, mode: ViewMode): boolean {
  const i = clampIndex(index, pageCount, mode)
  const last = clampIndex(pageCount - 1, pageCount, mode)
  return i < last
}

export function nextIndex(index: number, pageCount: number, mode: ViewMode): number {
  const i = clampIndex(index, pageCount, mode)
  if (!canGoNext(i, pageCount, mode)) return i
  if (mode === 'single') return i + 1
  return i === 0 ? 1 : i + 2
}

export function prevIndex(index: number, mode: ViewMode): number {
  if (index <= 0) return 0
  if (mode === 'single') return index - 1
  return index === 1 ? 0 : index - 2
}
```

- [ ] **Step 4: Spustit testy**

Run: `npm test -- src/book/model.test.ts` → Expected: všechny PASS.

- [ ] **Step 5: Commit**

```bash
git add src/book/model.ts src/book/model.test.ts
git commit -m "feat(book): model dvoustrany a navigace"
```

---

### Task 3: Papírový vzhled a komponenta `Page`

**Files:**
- Create: `src/styles/paper.css`, `src/book/Page.tsx`, `src/book/Page.test.tsx`
- Modify: `src/main.tsx` (import `./styles/paper.css`)

**Interfaces:**
- Produces: `<Page side="left" | "right" | "single" tone="aged" | "cover" | "note" pageNumber?: number>{children}</Page>`; renderuje `<section class="page page--left page--aged">` s `.page-content` (scroll) a `.page-number`. CSS proměnné pro barvy papíru a stíny v `paper.css`.

- [ ] **Step 1: Test**

`src/book/Page.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { Page } from './Page'

test('vykreslí obsah, stranu a číslo', () => {
  render(<Page side="left" tone="aged" pageNumber={12}>Ahoj</Page>)
  const sec = screen.getByText('Ahoj').closest('section')!
  expect(sec).toHaveClass('page', 'page--left', 'page--aged')
  expect(screen.getByText('12')).toHaveClass('page-number')
})

test('bez čísla stránky číslo nevykreslí', () => {
  render(<Page side="right" tone="cover">Obal</Page>)
  expect(document.querySelector('.page-number')).toBeNull()
})
```

- [ ] **Step 2: Spustit, ověřit selhání**

Run: `npm test -- src/book/Page.test.tsx` → Expected: FAIL.

- [ ] **Step 3: Implementace**

`src/book/Page.tsx`:
```tsx
import type { ReactNode } from 'react'

export type PageSide = 'left' | 'right' | 'single'
export type PageTone = 'aged' | 'cover' | 'note'

interface PageProps {
  side: PageSide
  tone?: PageTone
  pageNumber?: number
  children?: ReactNode
}

export function Page({ side, tone = 'aged', pageNumber, children }: PageProps) {
  return (
    <section className={`page page--${side} page--${tone}`}>
      <div className="page-content">{children}</div>
      {pageNumber !== undefined && <span className="page-number">{pageNumber}</span>}
    </section>
  )
}
```

`src/styles/paper.css`:
```css
:root {
  --paper: #f3e9d2;
  --paper-dark: #e4d5b4;
  --paper-edge: #cdbb94;
  --ink: #2a2118;
  --ink-soft: #5a4a38;
  --cover: #5b2a1f;
  --cover-dark: #3e1a13;
  --note-paper: #fbf7ee;
  --shadow-gutter: rgba(60, 40, 20, 0.35);
}

.page {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: var(--ink);
  background-color: var(--paper);
  /* jemné zrno papíru + zažloutlé okraje */
  background-image:
    radial-gradient(ellipse at center, transparent 55%, rgba(120, 90, 40, 0.18) 100%),
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.25 0 0 0 0 0.1 0 0 0 0.08 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}

/* stín u hřbetu */
.page--left::after,
.page--right::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.page--left::after  { background: linear-gradient(to left,  var(--shadow-gutter), transparent 12%); }
.page--right::after { background: linear-gradient(to right, var(--shadow-gutter), transparent 12%); }

.page--cover {
  background-color: var(--cover);
  background-image: radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.08), transparent 60%);
  color: #f3e9d2;
}

.page--note {
  background-color: var(--note-paper);
  background-image: repeating-linear-gradient(to bottom, transparent 0 27px, rgba(90,120,180,0.25) 27px 28px);
}

.page-content {
  position: relative;
  height: 100%;
  overflow-y: auto;
  touch-action: pan-y;
  padding: 6% 8%;
}

.page-number {
  position: absolute;
  bottom: 3%;
  left: 0; right: 0;
  text-align: center;
  font-size: 0.8rem;
  color: var(--ink-soft);
  pointer-events: none;
}
```

- [ ] **Step 4: Spustit testy, commit**

Run: `npm test` → Expected: PASS.
```bash
git add src/book/Page.tsx src/book/Page.test.tsx src/styles/paper.css src/main.tsx
git commit -m "feat(book): komponenta Page s papírovou texturou a stínem hřbetu"
```

---

### Task 4: Stav otáčení (čistá logika flipu)

**Files:**
- Create: `src/book/flip.ts`, `src/book/flip.test.ts`

**Interfaces:**
- Produces:
```ts
export type FlipDirection = 'next' | 'prev'
export interface FlipState { direction: FlipDirection; progress: number; dragging: boolean }  // progress 0..1
export function progressFromPointer(startX: number, currentX: number, pageWidth: number, direction: FlipDirection): number
export function finishFlip(progress: number, velocityPxPerMs: number): 'complete' | 'cancelled'
export function flipTransform(progress: number, direction: FlipDirection): string   // CSS transform otáčené stránky
export function flipShadowOpacity(progress: number): number
```

- [ ] **Step 1: Testy**

`src/book/flip.test.ts`:
```ts
import { progressFromPointer, finishFlip, flipTransform, flipShadowOpacity } from './flip'

describe('progressFromPointer', () => {
  test('next: tažení doleva o celou šířku = 1', () => expect(progressFromPointer(800, 0, 800, 'next')).toBe(1))
  test('next: tažení doleva o polovinu = 0.5', () => expect(progressFromPointer(800, 400, 800, 'next')).toBeCloseTo(0.5))
  test('next: tažení doprava = 0', () => expect(progressFromPointer(800, 900, 800, 'next')).toBe(0))
  test('prev: tažení doprava o celou šířku = 1', () => expect(progressFromPointer(0, 800, 800, 'prev')).toBe(1))
  test('nepřeteče přes 1', () => expect(progressFromPointer(800, -500, 800, 'next')).toBe(1))
})

describe('finishFlip', () => {
  test('přes polovinu dokončí', () => expect(finishFlip(0.6, 0)).toBe('complete'))
  test('pod polovinou vrátí', () => expect(finishFlip(0.3, 0)).toBe('cancelled'))
  test('rychlé švihnutí dokončí i pod polovinou', () => expect(finishFlip(0.2, 1.2)).toBe('complete'))
  test('rychlé švihnutí zpět zruší i nad polovinou', () => expect(finishFlip(0.8, -1.2)).toBe('cancelled'))
})

describe('flipTransform', () => {
  test('next na začátku 0°', () => expect(flipTransform(0, 'next')).toBe('rotateY(0deg)'))
  test('next na konci -180°', () => expect(flipTransform(1, 'next')).toBe('rotateY(-180deg)'))
  test('prev na konci 180°', () => expect(flipTransform(1, 'prev')).toBe('rotateY(180deg)'))
})

test('stín je nejsilnější uprostřed otáčení', () => {
  expect(flipShadowOpacity(0)).toBe(0)
  expect(flipShadowOpacity(0.5)).toBe(1)
  expect(flipShadowOpacity(1)).toBe(0)
})
```

- [ ] **Step 2: Spustit, ověřit selhání**

Run: `npm test -- src/book/flip.test.ts` → Expected: FAIL.

- [ ] **Step 3: Implementace**

`src/book/flip.ts`:
```ts
export type FlipDirection = 'next' | 'prev'

export interface FlipState {
  direction: FlipDirection
  progress: number
  dragging: boolean
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Průběh otáčení 0..1 podle vodorovného posunu ukazatele. */
export function progressFromPointer(
  startX: number,
  currentX: number,
  pageWidth: number,
  direction: FlipDirection,
): number {
  const delta = currentX - startX
  const signed = direction === 'next' ? -delta : delta
  return clamp01(signed / pageWidth)
}

/** Švih rychlejší než 0,8 px/ms rozhodne bez ohledu na polohu. */
export function finishFlip(progress: number, velocityPxPerMs: number): 'complete' | 'cancelled' {
  const FLICK = 0.8
  if (velocityPxPerMs >= FLICK) return 'complete'
  if (velocityPxPerMs <= -FLICK) return 'cancelled'
  return progress >= 0.5 ? 'complete' : 'cancelled'
}

export function flipTransform(progress: number, direction: FlipDirection): string {
  const deg = 180 * clamp01(progress) * (direction === 'next' ? -1 : 1)
  return `rotateY(${deg}deg)`
}

export function flipShadowOpacity(progress: number): number {
  const p = clamp01(progress)
  return 1 - Math.abs(p - 0.5) * 2
}
```
Pozn.: `velocityPxPerMs` je kladná ve směru dokončení otáčení (hook v Task 5 ji takto normalizuje).

- [ ] **Step 4: Spustit testy, commit**

Run: `npm test -- src/book/flip.test.ts` → Expected: PASS.
```bash
git add src/book/flip.ts src/book/flip.test.ts
git commit -m "feat(book): čistá logika průběhu otáčení"
```

---

### Task 5: Hook `useFlipDrag` (pointer události z rohu stránky)

**Files:**
- Create: `src/book/useFlipDrag.ts`, `src/book/useFlipDrag.test.tsx`

**Interfaces:**
- Consumes: `progressFromPointer`, `finishFlip` z `flip.ts`.
- Produces:
```ts
export function isDragStartAllowed(target: EventTarget | null, x: number, pageRect: DOMRect, zone: number): FlipDirection | null
// vrací 'next' je-li x v pravém okraji (pageRect.right - zone .. right), 'prev' je-li v levém, null pokud target je uvnitř .page-content nebo mimo zóny
export function useFlipDrag(opts: {
  containerRef: React.RefObject<HTMLElement | null>
  pageWidth: number
  canNext: boolean
  canPrev: boolean
  onComplete: (dir: FlipDirection) => void
  zone?: number  // px, výchozí 56
}): { flip: FlipState | null; handlers: { onPointerDown: React.PointerEventHandler; onPointerMove: React.PointerEventHandler; onPointerUp: React.PointerEventHandler; onPointerCancel: React.PointerEventHandler } }
```
Během dragu je `flip.dragging === true`; po puštění nastaví `dragging=false` a animuje `progress` na 1 (complete, pak volá `onComplete`) nebo 0 (cancelled) přes `requestAnimationFrame` (délka 350 ms, easing `1 - (1-t)^3`). Pokud `matchMedia('(prefers-reduced-motion: reduce)').matches`, přeskočí animaci.

- [ ] **Step 1: Testy**

`src/book/useFlipDrag.test.tsx`:
```tsx
import { renderHook, act } from '@testing-library/react'
import { isDragStartAllowed, useFlipDrag } from './useFlipDrag'

const rect = { left: 0, right: 800, top: 0, bottom: 1000, width: 800, height: 1000, x: 0, y: 0, toJSON() {} } as DOMRect

describe('isDragStartAllowed', () => {
  test('pravý okraj → next', () => expect(isDragStartAllowed(document.body, 790, rect, 56)).toBe('next'))
  test('levý okraj → prev', () => expect(isDragStartAllowed(document.body, 10, rect, 56)).toBe('prev'))
  test('střed → null', () => expect(isDragStartAllowed(document.body, 400, rect, 56)).toBeNull())
  test('cíl uvnitř .page-content → null i v okraji', () => {
    const content = document.createElement('div'); content.className = 'page-content'
    const btn = document.createElement('button'); content.appendChild(btn); document.body.appendChild(content)
    expect(isDragStartAllowed(btn, 790, rect, 56)).toBeNull()
  })
})

function pointer(type: string, x: number, extra: Partial<PointerEvent> = {}) {
  return { clientX: x, clientY: 500, pointerId: 1, target: document.body, currentTarget: document.body, ...extra } as unknown as React.PointerEvent
}

describe('useFlipDrag', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never  // reduced motion → bez rAF
    Element.prototype.setPointerCapture = vi.fn()
    Element.prototype.releasePointerCapture = vi.fn()
  })

  test('drag z pravého okraje přes polovinu zavolá onComplete(next)', () => {
    const onComplete = vi.fn()
    const el = document.createElement('div'); el.getBoundingClientRect = () => rect
    const { result } = renderHook(() => useFlipDrag({ containerRef: { current: el }, pageWidth: 800, canNext: true, canPrev: true, onComplete }))
    act(() => result.current.handlers.onPointerDown(pointer('down', 790)))
    act(() => result.current.handlers.onPointerMove(pointer('move', 200)))
    expect(result.current.flip?.progress).toBeCloseTo(0.7375)
    act(() => result.current.handlers.onPointerUp(pointer('up', 200)))
    expect(onComplete).toHaveBeenCalledWith('next')
    expect(result.current.flip).toBeNull()
  })

  test('drag puštěný pod polovinou se zruší', () => {
    const onComplete = vi.fn()
    const el = document.createElement('div'); el.getBoundingClientRect = () => rect
    const { result } = renderHook(() => useFlipDrag({ containerRef: { current: el }, pageWidth: 800, canNext: true, canPrev: true, onComplete }))
    act(() => result.current.handlers.onPointerDown(pointer('down', 790)))
    act(() => result.current.handlers.onPointerMove(pointer('move', 700)))
    act(() => result.current.handlers.onPointerUp(pointer('up', 700)))
    expect(onComplete).not.toHaveBeenCalled()
    expect(result.current.flip).toBeNull()
  })

  test('canNext=false → drag z pravého okraje nic nedělá', () => {
    const el = document.createElement('div'); el.getBoundingClientRect = () => rect
    const { result } = renderHook(() => useFlipDrag({ containerRef: { current: el }, pageWidth: 800, canNext: false, canPrev: true, onComplete: vi.fn() }))
    act(() => result.current.handlers.onPointerDown(pointer('down', 790)))
    expect(result.current.flip).toBeNull()
  })
})
```

- [ ] **Step 2: Spustit, ověřit selhání**

Run: `npm test -- src/book/useFlipDrag.test.tsx` → Expected: FAIL.

- [ ] **Step 3: Implementace**

`src/book/useFlipDrag.ts`:
```ts
import { useCallback, useRef, useState } from 'react'
import type React from 'react'
import { finishFlip, progressFromPointer, type FlipDirection, type FlipState } from './flip'

export function isDragStartAllowed(
  target: EventTarget | null,
  x: number,
  pageRect: DOMRect,
  zone: number,
): FlipDirection | null {
  if (target instanceof Element && target.closest('.page-content')) return null
  if (x >= pageRect.right - zone && x <= pageRect.right) return 'next'
  if (x >= pageRect.left && x <= pageRect.left + zone) return 'prev'
  return null
}

const DURATION_MS = 350
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

interface Options {
  containerRef: React.RefObject<HTMLElement | null>
  pageWidth: number
  canNext: boolean
  canPrev: boolean
  onComplete: (dir: FlipDirection) => void
  zone?: number
}

export function useFlipDrag({ containerRef, pageWidth, canNext, canPrev, onComplete, zone = 56 }: Options) {
  const [flip, setFlip] = useState<FlipState | null>(null)
  const drag = useRef<{ startX: number; lastX: number; lastT: number; velocity: number; direction: FlipDirection } | null>(null)
  const raf = useRef<number | null>(null)

  const animateTo = useCallback(
    (from: number, to: number, direction: FlipDirection, done: () => void) => {
      if (reducedMotion()) { done(); return }
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION_MS)
        const p = from + (to - from) * easeOut(t)
        setFlip({ direction, progress: p, dragging: false })
        if (t < 1) raf.current = requestAnimationFrame(tick)
        else done()
      }
      raf.current = requestAnimationFrame(tick)
    },
    [],
  )

  const onPointerDown = useCallback<React.PointerEventHandler>(
    (e) => {
      const el = containerRef.current
      if (!el || drag.current) return
      const direction = isDragStartAllowed(e.target, e.clientX, el.getBoundingClientRect(), zone)
      if (!direction) return
      if (direction === 'next' && !canNext) return
      if (direction === 'prev' && !canPrev) return
      drag.current = { startX: e.clientX, lastX: e.clientX, lastT: performance.now(), velocity: 0, direction }
      ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
      setFlip({ direction, progress: 0, dragging: true })
    },
    [containerRef, canNext, canPrev, zone],
  )

  const onPointerMove = useCallback<React.PointerEventHandler>((e) => {
    const d = drag.current
    if (!d) return
    const now = performance.now()
    const dt = Math.max(1, now - d.lastT)
    const dx = e.clientX - d.lastX
    // rychlost kladná ve směru dokončení otáčení
    d.velocity = (d.direction === 'next' ? -dx : dx) / dt
    d.lastX = e.clientX
    d.lastT = now
    setFlip({ direction: d.direction, progress: progressFromPointer(d.startX, e.clientX, pageWidth, d.direction), dragging: true })
  }, [pageWidth])

  const release = useCallback<React.PointerEventHandler>(
    (e) => {
      const d = drag.current
      if (!d) return
      drag.current = null
      ;(e.currentTarget as Element).releasePointerCapture?.(e.pointerId)
      const progress = progressFromPointer(d.startX, e.clientX, pageWidth, d.direction)
      const result = finishFlip(progress, d.velocity)
      const target = result === 'complete' ? 1 : 0
      animateTo(progress, target, d.direction, () => {
        setFlip(null)
        if (result === 'complete') onComplete(d.direction)
      })
    },
    [pageWidth, animateTo, onComplete],
  )

  return {
    flip,
    handlers: { onPointerDown, onPointerMove, onPointerUp: release, onPointerCancel: release },
  }
}
```

- [ ] **Step 4: Spustit testy, commit**

Run: `npm test` → Expected: PASS.
```bash
git add src/book/useFlipDrag.ts src/book/useFlipDrag.test.tsx
git commit -m "feat(book): drag z okraje stránky s dokončením/zrušením otáčení"
```

---

### Task 6: Komponenta `Book` (3D scéna, tlačítka, klávesy, režim zobrazení)

**Files:**
- Create: `src/book/Book.tsx`, `src/book/Book.test.tsx`, `src/book/useViewMode.ts`, `src/styles/book.css`
- Modify: `src/main.tsx` (import `./styles/book.css`)

**Interfaces:**
- Consumes: `model.ts`, `flip.ts`, `useFlipDrag`, `Page`.
- Produces:
```ts
export interface BookPageDef { id: string; tone?: PageTone; render: () => ReactNode }
export function Book(props: { pages: BookPageDef[]; initialIndex?: number; onIndexChange?: (i: number) => void }): JSX.Element
export function useViewMode(): ViewMode   // matchMedia('(max-width: 767px), (orientation: portrait)') → 'single'
```
Rozvržení: `.book` (perspective 2400px) obsahuje `.book__spread` s `.book__slot--left` a `.book__slot--right` (v režimu single jen `--single`). Při flipu `next` se vykreslí `.book__flipper` s přední stranou = aktuální pravá stránka a zadní stranou = následující levá stránka, `transform-origin: left center`, transform z `flipTransform`. Při `prev` zrcadlově. Pod flipperem už jsou vidět cílové stránky. Tlačítka `‹ ›` s `aria-label="Předchozí strana"/"Další strana"`, klávesy ArrowLeft/ArrowRight. Neviditelné stránky nejsou v DOM; stránky pod flipperem mají `inert` během animace.

- [ ] **Step 1: Testy**

`src/book/Book.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Book, type BookPageDef } from './Book'

const pages: BookPageDef[] = Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, render: () => <p>Strana {i}</p> }))

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: q.includes('reduced-motion'), addEventListener() {}, removeEventListener() {} })) as never
})

test('začíná na obalu, vlevo prázdno', () => {
  render(<Book pages={pages} />)
  expect(screen.getByText('Strana 0')).toBeInTheDocument()
  expect(screen.queryByText('Strana 1')).toBeNull()
  expect(screen.getByRole('button', { name: 'Předchozí strana' })).toBeDisabled()
})

test('tlačítko Další otočí na dvoustranu 1–2', () => {
  render(<Book pages={pages} />)
  fireEvent.click(screen.getByRole('button', { name: 'Další strana' }))
  expect(screen.getByText('Strana 1')).toBeInTheDocument()
  expect(screen.getByText('Strana 2')).toBeInTheDocument()
})

test('šipky na klávesnici listují', () => {
  const onIndexChange = vi.fn()
  render(<Book pages={pages} onIndexChange={onIndexChange} />)
  fireEvent.keyDown(window, { key: 'ArrowRight' })
  expect(onIndexChange).toHaveBeenLastCalledWith(1)
  fireEvent.keyDown(window, { key: 'ArrowLeft' })
  expect(onIndexChange).toHaveBeenLastCalledWith(0)
})

test('na poslední dvoustraně je Další disabled a vpravo prázdný list', () => {
  render(<Book pages={pages} initialIndex={5} />)
  expect(screen.getByText('Strana 5')).toBeInTheDocument()
  expect(screen.getByText('Strana 6')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Další strana' })).toBeDisabled()
})

test('režim single zobrazí jen jednu stránku', () => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: true, addEventListener() {}, removeEventListener() {} })) as never
  render(<Book pages={pages} initialIndex={3} />)
  expect(screen.getByText('Strana 3')).toBeInTheDocument()
  expect(screen.queryByText('Strana 4')).toBeNull()
})
```

- [ ] **Step 2: Spustit, ověřit selhání**

Run: `npm test -- src/book/Book.test.tsx` → Expected: FAIL.

- [ ] **Step 3: Implementace `useViewMode`**

`src/book/useViewMode.ts`:
```ts
import { useEffect, useState } from 'react'
import type { ViewMode } from './model'

const QUERY = '(max-width: 767px), (orientation: portrait)'

export function useViewMode(): ViewMode {
  const get = (): ViewMode => (window.matchMedia?.(QUERY).matches ? 'single' : 'spread')
  const [mode, setMode] = useState<ViewMode>(get)
  useEffect(() => {
    const mq = window.matchMedia?.(QUERY)
    if (!mq) return
    const handler = () => setMode(get())
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])
  return mode
}
```

- [ ] **Step 4: Implementace `Book`**

`src/book/Book.tsx`:
```tsx
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Page, type PageTone } from './Page'
import { canGoNext, canGoPrev, clampIndex, nextIndex, prevIndex, visiblePages } from './model'
import { flipShadowOpacity, flipTransform, type FlipDirection } from './flip'
import { useFlipDrag } from './useFlipDrag'
import { useViewMode } from './useViewMode'

export interface BookPageDef {
  id: string
  tone?: PageTone
  render: () => ReactNode
}

interface BookProps {
  pages: BookPageDef[]
  initialIndex?: number
  onIndexChange?: (index: number) => void
}

export function Book({ pages, initialIndex = 0, onIndexChange }: BookProps) {
  const mode = useViewMode()
  const count = pages.length
  const [index, setIndexRaw] = useState(() => clampIndex(initialIndex, count, mode))
  const containerRef = useRef<HTMLDivElement>(null)
  const [pageWidth, setPageWidth] = useState(600)

  const setIndex = useCallback(
    (i: number) => {
      const c = clampIndex(i, count, mode)
      setIndexRaw(c)
      onIndexChange?.(c)
    },
    [count, mode, onIndexChange],
  )

  // změna režimu (otočení telefonu) zachová viditelnou stránku
  useEffect(() => { setIndexRaw((i) => clampIndex(i, count, mode)) }, [mode, count])

  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setPageWidth(mode === 'spread' ? el.clientWidth / 2 : el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [mode])

  const canNext = canGoNext(index, count, mode)
  const canPrev = canGoPrev(index)
  const goNext = useCallback(() => canNext && setIndex(nextIndex(index, count, mode)), [canNext, index, count, mode, setIndex])
  const goPrev = useCallback(() => canPrev && setIndex(prevIndex(index, mode)), [canPrev, index, mode, setIndex])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev])

  const onComplete = useCallback((dir: FlipDirection) => (dir === 'next' ? goNext() : goPrev()), [goNext, goPrev])
  const { flip, handlers } = useFlipDrag({ containerRef, pageWidth, canNext, canPrev, onComplete })

  // stránky, které jsou vidět „pod“ otáčeným listem
  const targetIndex = flip ? (flip.direction === 'next' ? nextIndex(index, count, mode) : prevIndex(index, mode)) : index
  const base = visiblePages(flip ? targetIndex : index, count, mode)
  const current = visiblePages(index, count, mode)

  const renderSlot = (p: number | null, side: 'left' | 'right' | 'single', key: string) => (
    <div className={`book__slot book__slot--${side}`} key={key} inert={flip ? true : undefined}>
      {p !== null && (
        <Page side={side} tone={pages[p].tone} pageNumber={p === 0 ? undefined : p}>
          {pages[p].render()}
        </Page>
      )}
    </div>
  )

  // otáčený list: přední = stránka, která odchází; zadní = stránka, která přichází
  let flipper: ReactNode = null
  if (flip) {
    const front = flip.direction === 'next' ? current[current.length - 1] : current[0]
    const back = flip.direction === 'next' ? base[0] : base[base.length - 1]
    const sideFront = mode === 'single' ? 'single' : flip.direction === 'next' ? 'right' : 'left'
    const sideBack = mode === 'single' ? 'single' : flip.direction === 'next' ? 'left' : 'right'
    flipper = (
      <div
        className={`book__flipper book__flipper--${flip.direction}`}
        style={{ transform: flipTransform(flip.progress, flip.direction), transition: 'none' }}
        aria-hidden
        inert
      >
        <div className="book__face book__face--front">
          {front !== null && front !== undefined && <Page side={sideFront} tone={pages[front].tone}>{pages[front].render()}</Page>}
          <div className="book__face-shade" style={{ opacity: flipShadowOpacity(flip.progress) }} />
        </div>
        <div className="book__face book__face--back">
          {back !== null && back !== undefined && <Page side={sideBack} tone={pages[back].tone}>{pages[back].render()}</Page>}
          <div className="book__face-shade" style={{ opacity: flipShadowOpacity(flip.progress) }} />
        </div>
      </div>
    )
  }

  return (
    <div className={`book book--${mode}`}>
      <button type="button" className="book__nav book__nav--prev" aria-label="Předchozí strana" onClick={goPrev} disabled={!canPrev}>‹</button>
      <div className="book__spread" ref={containerRef} {...handlers}>
        {mode === 'spread'
          ? [renderSlot(base[0], 'left', 'L'), renderSlot(base[1], 'right', 'R')]
          : renderSlot(base[0], 'single', 'S')}
        {flipper}
      </div>
      <button type="button" className="book__nav book__nav--next" aria-label="Další strana" onClick={goNext} disabled={!canNext}>›</button>
    </div>
  )
}
```
Pozn.: `inert` jako React atribut vyžaduje React ≥ 19 (máme 19.3). Pokud by TypeScript hlásil chybu typu, přidat `declare module 'react' { interface HTMLAttributes<T> { inert?: boolean } }` do `src/types/react-inert.d.ts`.

- [ ] **Step 5: Styly**

`src/styles/book.css`:
```css
.book {
  height: 100%;
  display: grid;
  grid-template-columns: 3rem 1fr 3rem;
  align-items: center;
  padding: 2vh 1vw;
  perspective: 2400px;
}

.book__spread {
  position: relative;
  height: min(92vh, 1100px);
  aspect-ratio: 2 / 1.414;           /* dvě A-strany vedle sebe */
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  transform-style: preserve-3d;
  box-shadow: 0 30px 60px rgba(0,0,0,0.5), 0 0 0 6px var(--cover-dark);
  border-radius: 4px;
  touch-action: pan-y;
  user-select: none;
}
.book--single .book__spread {
  aspect-ratio: 1 / 1.414;
  grid-template-columns: 1fr;
  height: min(90vh, 100%);
  max-width: 100%;
}

.book__slot { position: relative; height: 100%; overflow: hidden; }
.book__slot--left  { border-radius: 4px 0 0 4px; }
.book__slot--right { border-radius: 0 4px 4px 0; }

/* otáčený list */
.book__flipper {
  position: absolute;
  top: 0;
  width: 50%;
  height: 100%;
  transform-style: preserve-3d;
  will-change: transform;
  z-index: 2;
}
.book--single .book__flipper { width: 100%; }
.book__flipper--next { left: 50%; transform-origin: left center; }
.book__flipper--prev { left: 0;   transform-origin: right center; }
.book--single .book__flipper--next { left: 0; }

.book__face {
  position: absolute; inset: 0;
  backface-visibility: hidden;
  overflow: hidden;
}
.book__face--back { transform: rotateY(180deg); }
.book__face-shade {
  position: absolute; inset: 0;
  pointer-events: none;
  background: linear-gradient(to right, rgba(0,0,0,0.35), rgba(0,0,0,0) 40%, rgba(0,0,0,0.25));
}

.book__nav {
  font-size: 2.5rem;
  line-height: 1;
  background: none;
  border: 0;
  color: var(--paper-edge);
  cursor: pointer;
}
.book__nav:disabled { opacity: 0.25; cursor: default; }

@media (prefers-reduced-motion: reduce) {
  .book__flipper { transition: none; }
}
```

- [ ] **Step 6: Spustit testy, commit**

Run: `npm test` → Expected: PASS.
```bash
git add src/book/Book.tsx src/book/Book.test.tsx src/book/useViewMode.ts src/styles/book.css src/main.tsx
git commit -m "feat(book): komponenta Book s 3D otáčením, klávesami a režimem single/spread"
```

---

### Task 7: Demo prototyp v `App` a ruční vizuální kontrola

**Files:**
- Modify: `src/App.tsx`, `src/App.test.tsx`
- Create: `src/demo/demoPages.tsx`

**Interfaces:**
- Consumes: `Book`, `BookPageDef`.

- [ ] **Step 1: Demo stránky**

`src/demo/demoPages.tsx`:
```tsx
import type { BookPageDef } from '@/book/Book'

const lorem = 'Vezmi hrnec, do něj vodu, sůl a trpělivost. Vař, dokud se kuchař nezačne usmívat. '

export const demoPages: BookPageDef[] = [
  { id: 'cover', tone: 'cover', render: () => (
    <div style={{ textAlign: 'center', marginTop: '30%' }}>
      <h1 style={{ fontSize: '2.4rem', letterSpacing: '0.1em' }}>KUCHAŘKA</h1>
      <p style={{ opacity: 0.8 }}>pro tábory, výlety a hubené měsíce</p>
    </div>
  ) },
  { id: 'about', render: () => (<><h2>O této knize</h2><p>{lorem.repeat(6)}</p></>) },
  { id: 'toc', render: () => (<><h2>Obsah</h2><ol><li>Polévky</li><li>Z jednoho hrnce</li><li>Maso a ryby</li><li>Bezmasá a luštěniny</li></ol></>) },
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `r${i}`,
    render: () => (
      <>
        <h2>Recept č. {i + 1}</h2>
        <p>{lorem.repeat(8)}</p>
        <button type="button" onClick={() => alert('Tlačítko uvnitř stránky funguje')}>Do košíku</button>
        <p><label>Poznámka: <input type="text" placeholder="piš sem" /></label></p>
      </>
    ),
  })),
  { id: 'note', tone: 'note', render: () => (<><h2>Vložený list</h2><p>Tady bude ručně psaný recept.</p></>) },
]
```

- [ ] **Step 2: App**

`src/App.tsx`:
```tsx
import { Book } from '@/book/Book'
import { demoPages } from '@/demo/demoPages'

export function App() {
  return (
    <main style={{ height: '100%' }}>
      <h1 className="visually-hidden">Kuchařka</h1>
      <Book pages={demoPages} />
    </main>
  )
}
export default App
```
Do `src/styles/global.css` přidat:
```css
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
```

`src/App.test.tsx` upravit:
```tsx
import { render, screen } from '@testing-library/react'
import App from './App'

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: q.includes('reduced-motion'), addEventListener() {}, removeEventListener() {} })) as never
})

test('vykreslí knihu s obalem', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'KUCHAŘKA' })).toBeInTheDocument()
})
```

- [ ] **Step 3: Testy a build**

Run: `npm test` → Expected: PASS. Run: `npm run build` → Expected: bez chyb.

- [ ] **Step 4: Ruční kontrola v prohlížeči**

Run: `npm run dev` a otevřít adresu. Zkontrolovat:
1. Obal sám vpravo, stín hřbetu, textura papíru viditelná.
2. Tažení za pravý okraj stránky ohýbá list, puštění za polovinou dokončí, před polovinou vrátí.
3. Klik na „Do košíku“ a psaní do inputu nespustí flip.
4. Šipky a tlačítka listují, na konci je „›“ disabled.
5. Zúžit okno pod 768 px: jedna stránka, swipe funguje, stránka nezmizí při změně režimu.
6. V DevTools zapnout „Emulate prefers-reduced-motion: reduce“: přepnutí bez animace.

Zjištěné vizuální nedostatky zapsat do `docs/superpowers/plans/2026-10-14-phase1-skeleton-flip.md` pod nadpis „Nálezy z ruční kontroly“ jako seznam, neopravovat v tomto tasku.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: demo prototyp knihy s otáčením stránek"
```

## Nálezy z ruční kontroly (2026-10-14, Chrome, 1390×675 + iframe 390×650)

Ověřeno v pořádku: obal sám vpravo se stínem hřbetu a texturou; drag z pravého okraje ohýbá list (3D, přední = odcházející, zadní = přicházející stránka); puštění před polovinou vrátí, za polovinou dokončí; klik na „Do košíku“ a šipka v inputu flip nespustí; šipky a tlačítka listují; na mobilu jedna stránka, swipe funguje, `prefers-reduced-motion` přepne bez animace.

1. **Mobil přetéká na šířku (porušuje „bez vodorovného scrollu“).** V single režimu má `.book__spread` výšku `min(90vh, 100%)` = 581 px a z `aspect-ratio: 1/1.414` plyne šířka 411 px, zatímco viewport má 386 px (`scrollWidth` 511). Grid sloupec `1fr` se roztáhne podle obsahu, `max-width: 100%` nepomůže. Oprava: šířku odvodit z viewportu, např. `.book--single .book__spread { width: min(100%, calc(90vh / 1.414)); height: auto; }` a zúžit krajní sloupce na 2rem; pro spread obdobně `width: min(100%, calc(92vh * 2 / 1.414)); height: auto`.
2. Otáčený list v perspektivě vyčnívá nad a pod obrys knihy (výraznější u 3D natočení kolem 90°). Kosmetické, zvážit menší `perspective` nebo `overflow: visible` jen na flipperu.
3. Číslo stránky na otáčeném listu chybí (flipper nedostává `pageNumber`). Kosmetické, zaznamenáno už v review T6.
4. Konzolový výpis tlačítka „Do košíku“ se v nástroji nezachytil; klik ale prokazatelně nespustil flip. Nepovažuji za nález.
5. rAF animace se v tabu na pozadí zastaví a dobíhá až po zobrazení. Očekávané chování prohlížeče, ne chyba.
