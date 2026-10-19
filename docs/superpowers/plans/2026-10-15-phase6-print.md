# Fáze 6: Tisk – recept A4, nákupní seznam, obsah a brožurka z košíku – implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ctrl+P i tlačítka tisku vytisknou podle aktuální stránky čistý A4 recept (přepočtený na aktuální počet osob), A4 nákupní seznam nebo obsah, a z košíku sešitek A5 na A4 na šířku ve správném pořadí stran pro přeložení a sešití uprostřed.

**Architecture:** Kniha se netiskne. Tisk vykreslí samostatný tiskový strom `PrintRoot` (`.print-root`, mimo `<main>`) jen po dobu tisku: hook `usePrintJob` na `beforeprint` (Ctrl+P, menu prohlížeče) nebo v `print(job)` (tlačítko) synchronně (`flushSync`) vykreslí úlohu `PrintJob` a nastaví `<html data-print="recipe|list|booklet|toc">`, `afterprint` (nebo přechod na jinou stránku) uklidí. `print.css` v tisku s `data-print` skryje `main` a ukáže strom. Brožurka vykreslí bloky obsahu do měřicího sloupce o šířce strany A5, v `useLayoutEffect` je změří, rozdělí na strany (`packBlocks`), doplní do násobku 4 a vysází po listech v pořadí `bookletOrder` – vše ještě před `window.print()`.

**Tech Stack:** Vite 8, React 19 (`flushSync` z `react-dom`), TypeScript 6, Vitest 4 + Testing Library (jsdom, `css: false`, `globals: true`), oxlint. Bez UI knihovny, bez nové npm závislosti. Ruční kontrola skillem `agent-browser` + vlastní CDP skript (`Page.printToPDF`) a `pdfinfo`/`pdftotext` (poppler, je nainstalovaný).

**Spec:** `docs/superpowers/specs/2026-10-14-cookbook-design.md` – §4 Tisk (celý, včetně **[R1]** brožurky), §3 (košík: tlačítka „Tisknout brožurku“ a „Tisknout jen nákupní seznam“; nákupní seznam podle kategorií s rozpadem po receptech, bez interakce), §2 (recept = dvoustrana; „tisk Ctrl+P tiskne celý recept, ne jen viditelnou část“), §8 bod 6. Navazuje na plán fáze 5 `docs/superpowers/plans/2026-10-15-phase5-cart-shopping.md` (Global Constraints níže jsou jeho aktualizace).

## Global Constraints

- Čeština s diakritikou v UI, identifikátory anglicky. Bez UI knihovny. Žádný server. Žádná nová npm závislost.
- **Co tiskne Ctrl+P (spec §4):** stránka receptu (levá i pravá polovina) → čistý A4 recept; nákupní seznam **a košík** → A4 nákupní seznam; jinde (obal, „O této knize“, obsah, úvody kapitol, tiráž/nastavení, prázdná strana) → obsah. **Celá kniha se nikdy netiskne.** Brožurka jen tlačítkem „Tisknout brožurku“ v košíku. Mapování dělá výhradně `printJobForRoute(indexToRoute(index, layout))`.
- **Tiskový strom:** `PrintRoot` (`<div class="print-root print-root--<kind>">`) existuje v DOM jen během tisku (`usePrintJob`): `beforeprint` → úloha podle aktuální stránky; tlačítko → `print(job)` vykreslí úlohu a označí `<html data-print>` **dřív**, než zavolá `window.print()`, a vynucená úloha platí až do `afterprint` nebo do změny indexu stránky. Vykreslení přes `flushSync` (ne rAF – prohlížeč stránkuje hned po `beforeprint`). Mimo tisk v DOM žádné duplikáty obsahu.
- **CSS tisku (`src/styles/print.css`, importovaný jako poslední):** `@page { size: A4; margin: 15mm; }`. Na obrazovce `.print-root` `position: fixed; left: -10000px; visibility: hidden; pointer-events: none` – rozložený (brožurka měří), neviditelný, mimo přístupnostní strom, bez posuvníku; **nikdy `display: none`**. V `@media print`: `html[data-print] main { display: none !important }`, `html[data-print] .print-root { position: static; visibility: visible }`. Bez `data-print` platí záloha z fáze 4b (viditelné stránky knihy bez knižních efektů).
- **Brožurka:** `@page { size: A4 landscape; margin: 0; }` (`BOOKLET_PAGE_CSS`) vkládá strom brožurky jako `<style>`. List A4 na šířku = `297mm × 209.5mm` (o 0,5 mm nižší kvůli zaokrouhlení, aby nevznikaly prázdné listy), dvě strany A5 `148.5mm` vedle sebe, okraje strany `12mm 12mm 14mm`, tělo strany `183.5mm` vysoké a `124.5mm` široké; měřicí sloupec má přesně šířku těla (měření = tisk, rozměry v mm a písmo v pt mimo `@media print`). Pořadí stran: pro N stran zaokrouhlených nahoru na násobek 4 list i má přední stranu `[N − 2i, 2i + 1]` a zadní `[2i + 2, N − 2i − 1]` (první list přední `[N, 1]`, zadní `[2, N − 1]`). Obsah: titulní strana (název kuchařky, počet osob, datum, počet receptů – **bez obsahu**), každý recept od nové strany přepočtený na `P × násobek` z košíku, na konci nákupní seznam; přetečení po celých blocích na další stranu (nikdy ořez), prázdné strany do násobku 4. Čísla stran dole uprostřed kromě titulní a prázdných. Duplex řeší prohlížeč (nápověda „oboustranně, překlápět po krátké straně“); tiskárny bez duplexu = backlog.
- **Přepočet v tisku:** žádná druhá implementace – A4 recept používá `IngredientTable` (×1, aktuální `P`), brožurka `IngredientTable` s `multiplier`, seznam `buildShoppingList` (už počítá s násobky). Přepínač historických surovin a náročnost dne platí v tisku stejně jako na obrazovce.
- **Texty:** hlavička osob `peopleHeading(people)` = „Pro 24 osob (18 dětí + 6 dospělých)“; datum `formatDate(d)` = „15. 10. 2026“ (hlavička tištěného seznamu a titul brožurky); A4 recept má sloupce „Pro N osob“ a „Na 1 osobu“. Nápověda u každého tlačítka tisku přesně `PRINT_HINT` = „V dialogu tisku vypněte „Záhlaví a zápatí“.“, u brožurky navíc `BOOKLET_HINT`. Bez modálů.
- **Bez interakce v tisku:** uvnitř `.print-root` nesmí být `button`, `input`, `select`, `textarea`. **Změna proti fázi 5:** stránka nákupního seznamu na obrazovce má jediné tlačítko „Tisknout nákupní seznam“ (jen s neprázdným seznamem); jinak zůstává bez interakce.
- **Tlačítka tisku:** stránka receptu = ikona tiskárny v hlavičce vedle srdíčka/hrnce/košíku (`mark mark--print`, přístupné jméno „Tisknout recept“) + viditelný řádek nápovědy; stránka seznamu = „Tisknout nákupní seznam“; košík = „Tisknout brožurku“ a „Tisknout jen nákupní seznam“ (od fáze 6 tiskne přímo, nepřechází na `#/seznam`).
- Pořadí stránek, parita, hash routy, záložka, meze stavu a `UserState` beze změny (viz plán fáze 5).
- Soubory v `src/domain/` importují jen relativně (beze změny). Tiskový kód je v `src/print/`: čisté funkce v `.ts`, komponenty v `.tsx`. oxlint `react/only-export-components` → ne-komponentové exporty (funkce) patří do `.ts` souborů (`src/pages/recipeText.ts`, `src/pages/labels.ts`, `src/print/*.ts`); konstanty v `.tsx` smějí zůstat.
- Přístupnost: ikony `aria-hidden`, přístupné jméno nese tlačítko, nápověda přes `aria-describedby`, id přes `useId()`.
- Mobil: žádný vodorovný scroll (`scrollWidth === innerWidth` při 390 i 320 px) ani svislý posuv dokumentu, ani když je tiskový strom připojený.
- Testy Vitest + Testing Library pro každou čistou funkci a komponentu; jsdom nemá `window.print` → v testech `window.print = vi.fn()`. Po každém tasku `npm test`, `npm run build`, `npm run lint` čisté (Task 10 i `npm run validate`). Commit po každém tasku, zpráva česky s diakritikou, explicitní `git add <soubory>` (nikdy `-A`).

## Review Focus

1. **Tisk tlačítkem bez následného `afterprint`** (Chrome na Androidu vrací z `window.print()` hned, PDF přes CDP, prohlížeč, který `afterprint` nepošle) a pak Ctrl+P na jiné stránce – musí se tisknout nová stránka, ne stará vynucená úloha; vynucená úloha naopak musí přežít `beforeprint`, který přijde až po návratu z `window.print()`. Testy: Task 2 („vynucená úloha platí i pro pozdní beforeprint“, „přechod na jinou stránku vynucenou úlohu zapomene“).
2. **Recept delší než strana A5** (Koláče: 14 kroků, 1 830 znaků postupu; Zeleninové kari: 20 surovin) – brožurka ho rozdělí po celých blocích na další stranu, nic se neořízne a blok vyšší než strana dostane stranu sám (žádná nekonečná smyčka). Testy: Task 1 (`packBlocks`), Task 8 (měření s maketou výšek), Task 10 (měření `scrollHeight − clientHeight` těla každé strany v prohlížeči).
3. **Košík s receptem, který už neexistuje, nebo s jediným receptem** – brožurka nespadne, titul počítá jen existující recepty, počet stran je vždy násobek 4 (3 strany → 4, 5 → 8). Testy: Task 1 (`bookletPageCount`, `bookletOrder(5)`), Task 7 (přeskočení neznámého receptu), Task 8 (5 stran → 8, prázdné strany bez čísla).
4. **Tiskový strom zůstane připojený na obrazovce** (zrušený dialog bez `afterprint`, stub `window.print`) – kniha musí jít dál normálně používat: strom neviditelný, mimo přístupnostní strom, bez posuvníku a bez zachytávání kliků. Testy: Task 6 (CSS: `position: fixed`, `visibility: hidden`, ne `display: none`), Task 10 (měření `scrollWidth`/`scrollHeight` s připojeným stromem).
5. **Tisk při historických surovinách, náročnosti dne ≠ 1 a násobku ×2** – vytištěná čísla musí být stejná jako na obrazovce (tatáž varianta suroviny a tentýž faktor). Testy: Task 3 (`IngredientTable` s `multiplier` = 74 ks), Task 6 (`PrintRoot` s `historical` ukazuje „dnes: …“), Task 8 (brožurka 74 ks u ×2).

## Rozhodnutí fáze 6 (rulings)

- **R1 – tiskový strom na vyžádání, ne trvale v DOM s `display: none`:** trvalý strom by při každé změně stavu přepočítával obsah celé knihy i brožurky, v testech (jsdom, `css: false`) by zdvojil nadpisy a texty (rozbil by `getByRole`/`getByText` v existujících testech) a brožurka s `display: none` nejde změřit. Strom se proto vykreslí synchronně (`flushSync`) v `beforeprint` nebo před `window.print()` a po `afterprint` zmizí.
- **R2 – `flushSync`, ne dvojitý rAF:** `beforeprint` je synchronní a prohlížeč stránkuje hned po něm; rAF by se před stránkováním nespustil. `flushSync` zapíše DOM okamžitě (stejný princip už používá `useViewMode`). Aktualizace stavu v `useLayoutEffect` (měření brožurky) React provede také synchronně v rámci téhož `flushSync`.
- **R3 – vynucená úloha tlačítka platí do `afterprint` nebo změny stránky** (ne jen po dobu volání `window.print()`), viz Review Focus 1.
- **R4 – Ctrl+P na košíku tiskne nákupní seznam; na tiráži/nastavení obsah:** košík a seznam tvoří na desktopu jednu dvoustranu a tisk stránky košíku s tlačítky nemá smysl; „na nastavení nic zvláštního (výchozí)“ = výchozí pravidlo specu „Jinde: obsah“ (spec zakazuje tisk celé knihy).
- **R5 – stránkování brožurky měřením v prohlížeči:** stránky A5 se skládají vedle sebe na list, takže obsah nemůže přetékat přirozeně (`break-inside` sám nestačí – za stranou 1 na listu je strana N). Bloky (titul; hlavička + tabulka surovin; každý krok; poznámka k modernizaci; patička zdroje; hlavička seznamu; každá položka seznamu – první položka kategorie nese nadpis kategorie) se změří a rozdělí čistou funkcí `packBlocks`. Recept, titul a seznam začínají novou stranou. Bez layoutu (jsdom) je kapacita 0 = dělí se jen podle začátků.
- **R6 – `@page` brožurky vložený `<style>` elementem**, ne pojmenovanou stránkou (`page:` vlastnost) – funguje ve všech prohlížečích s `@page size`, platí jen po dobu existence stromu brožurky a jde otestovat v jsdom.
- **R7 – A4 recept obsahuje i řádek údajů** (čas, obtížnost, vybavení, alergeny – alergeny jsou pro tábor důležité); bez nutrice, srdíčka, štítků. Pořadí sloupců jako na obrazovce: Surovina | Pro N osob | Na 1 osobu.
- **R8 – brožurka bez sloupce „na osobu“** (úzká A5), hlavička sloupce „Pro 24 osob ×2“ a pod tabulkou „přepočteno na 40,8 porce“ při násobku ×2.
- **R9 – tištěný obsah ignoruje filtry obsahu**, obsahuje všechny kapitoly (s číslem strany úvodu) a recepty (číslo levé strany), ve dvou sloupcích.
- **R10 – tlačítko na stránce receptu je ikona** (`mark mark--print`, vedle značek) kvůli šířce hlavičky na mobilu (390 px: název + 4 ikony); nápověda je samostatný drobný řádek pod původním názvem.
- **R11 – titulní strana brožurky:** název kuchařky (`COOKBOOK_TITLE`), „Pro 24 osob (…)“, datum tisku, „N receptů · nákupní seznam na konci“; bez volného textu akce (žádné nové pole stavu).
- **R12 – ruční kontrola PDF vlastním CDP skriptem:** `agent-browser pdf` (Playwright `page.pdf`) bez `preferCSSPageSize` tiskne na Letter a ignoruje `@page size`; skript volá `Page.printToPDF` s `preferCSSPageSize: true`, `displayHeaderFooter: false`.

## Struktura souborů

| Soubor | Odpovědnost | Task |
|---|---|---|
| `src/print/booklet.ts` (nový) | `bookletPageCount`, `bookletOrder`, `bookletSequence`, `packBlocks`, `BOOKLET_PAGE_CSS` | 1 |
| `src/print/printJob.ts` (nový) | `PrintJob`, `printJobForRoute` | 2 |
| `src/print/usePrintJob.ts` (nový) | `beforeprint`/`afterprint`, `print(job)`, `data-print` | 2 |
| `src/pages/recipeText.ts` (nový) | `originalTitle`, `bookLabel`, `sourceLine`, `metaLine` | 3 |
| `src/pages/labels.ts` | `formatDate`, `PRINT_HINT`, `BOOKLET_HINT` | 3 |
| `src/pages/IngredientTable.tsx`, `src/pages/RecipePage.tsx` | `multiplier`, `perPersonLabel`; refaktor na `recipeText` | 3 |
| `src/print/RecipePrint.tsx` (nový) | `PrintRecipe` + části (`RecipePrintHead`, `RecipePrintStep`, `RecipePrintNote`, `RecipePrintSource`) | 4 |
| `src/print/PrintToc.tsx` (nový), `src/pages/ShoppingListPage.tsx` | tištěný obsah; `ShoppingListHead` s datem, `ShoppingItemRow` | 5 |
| `src/print/PrintRoot.tsx` (nový), `src/styles/print.css`, `src/App.tsx` | tiskový strom, CSS tisku, Ctrl+P | 6 |
| `src/print/bookletBlocks.ts` (nový) | bloky obsahu brožurky | 7 |
| `src/print/BookletPrint.tsx` (nový), `src/content/books.ts`, `src/pages/CoverPage.tsx`, `src/pages/CartPage.tsx` | brožurka (měření + sazba), `COOKBOOK_TITLE`, tlačítko brožurky | 8 |
| `src/pages/icons.tsx`, `src/pages/RecipePage.tsx`, `src/pages/ShoppingListPage.tsx`, `src/pages/CartPage.tsx`, `src/styles/paper.css` | tlačítka tisku s nápovědou | 9 |

---

### Task 1: Pořadí stran brožurky a rozdělení bloků na strany

**Files:**
- Create: `src/print/booklet.ts`
- Test: `src/print/booklet.test.ts`

**Interfaces:**
- Consumes: nic.
- Produces:
```ts
export const BOOKLET_PAGE_CSS: string // '@page { size: A4 landscape; margin: 0; }'
export function bookletPageCount(n: number): number
export interface BookletSheet { front: [number, number]; back: [number, number] }
export function bookletOrder(n: number): BookletSheet[]
export function bookletSequence(n: number): number[]
export interface PackableBlock { startsPage: boolean }
export function packBlocks(blocks: readonly PackableBlock[], heights: readonly number[], capacity: number): number[][]
```

- [ ] **Step 1: Napsat failing testy**

```ts
// src/print/booklet.test.ts
import { BOOKLET_PAGE_CSS, bookletOrder, bookletPageCount, bookletSequence, packBlocks } from './booklet'

describe('bookletPageCount', () => {
  test.each([[0, 0], [1, 4], [3, 4], [4, 4], [5, 8], [8, 8], [9, 12]])('%i stran → %i', (n, total) => expect(bookletPageCount(n)).toBe(total))
})

describe('bookletOrder', () => {
  test('4 strany = 1 list: přední [4, 1], zadní [2, 3]', () =>
    expect(bookletOrder(4)).toEqual([{ front: [4, 1], back: [2, 3] }]))
  test('8 stran: list 1 [8, 1] / [2, 7], list 2 [6, 3] / [4, 5]', () =>
    expect(bookletOrder(8)).toEqual([
      { front: [8, 1], back: [2, 7] },
      { front: [6, 3], back: [4, 5] },
    ]))
  test('5 stran se doplní na 8 (strany 6–8 jsou prázdné)', () => expect(bookletOrder(5)).toEqual(bookletOrder(8)))
  test('0 stran = žádný list', () => expect(bookletOrder(0)).toEqual([]))
  test.each([4, 8, 12, 16, 40])('%i stran: každá strana právě jednou, protilehlé poloviny dávají součet N + 1', (n) => {
    expect([...bookletSequence(n)].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i + 1))
    for (const s of bookletOrder(n)) {
      expect(s.front[0] + s.front[1]).toBe(n + 1)
      expect(s.back[0] + s.back[1]).toBe(n + 1)
    }
  })
  test('za stranou 1 (vpravo vpředu) je strana 2 (vlevo vzadu) – překlápění po krátké straně', () => {
    const [first] = bookletOrder(12)
    expect(first.front[1]).toBe(1)
    expect(first.back[0]).toBe(2)
  })
  test('pořadí do tiskárny pro 12 stran', () =>
    expect(bookletSequence(12)).toEqual([12, 1, 2, 11, 10, 3, 4, 9, 8, 5, 6, 7]))
})

describe('packBlocks', () => {
  const b = (startsPage: boolean) => ({ startsPage })
  test('startsPage začíná novou stranou', () =>
    expect(packBlocks([b(true), b(true), b(false), b(true)], [10, 10, 10, 10], 100)).toEqual([[0], [1, 2], [3]]))
  test('blok, který se nevejde, jde celý na další stranu', () =>
    expect(packBlocks([b(true), b(false), b(false), b(false)], [40, 40, 30, 10], 100)).toEqual([[0, 1], [2, 3]]))
  test('blok přesně do kapacity zůstane na straně', () =>
    expect(packBlocks([b(true), b(false)], [60, 40], 100)).toEqual([[0, 1]]))
  test('blok vyšší než celá strana dostane stranu sám a nic dalšího se k němu nepřilepí', () =>
    expect(packBlocks([b(true), b(false), b(false)], [20, 250, 20], 100)).toEqual([[0], [1], [2]]))
  test('kapacita 0 (bez layoutu) dělí jen podle startsPage', () =>
    expect(packBlocks([b(true), b(false), b(false), b(true)], [0, 0, 0, 0], 0)).toEqual([[0, 1, 2], [3]]))
  test('první blok bez startsPage založí stranu', () => expect(packBlocks([b(false)], [5], 100)).toEqual([[0]]))
  test('chybějící výška se bere jako 0', () => expect(packBlocks([b(true), b(false)], [10], 100)).toEqual([[0, 1]]))
  test('prázdný vstup', () => expect(packBlocks([], [], 100)).toEqual([]))
})

test('brožurka se tiskne na A4 na šířku bez okrajů prohlížeče', () => {
  expect(BOOKLET_PAGE_CSS).toMatch(/size:\s*A4 landscape/)
  expect(BOOKLET_PAGE_CSS).toMatch(/margin:\s*0/)
})
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/print/booklet.test.ts`
Expected: FAIL – `Failed to resolve import "./booklet"`.

- [ ] **Step 3: Implementace**

```ts
// src/print/booklet.ts
/** Sešitek A5 na A4 na šířku: 2 strany na list, přeložit a sešít uprostřed (booklet imposition, spec §4 [R1]). */

/** `@page` brožurky; vkládá ho BookletPrint jako <style> – výchozí tisk je A4 na výšku s okraji 15 mm. */
export const BOOKLET_PAGE_CSS = '@page { size: A4 landscape; margin: 0; }'

/** Počet stran zaokrouhlený nahoru na násobek 4 (jeden list = 4 strany). */
export function bookletPageCount(n: number): number {
  return n <= 0 ? 0 : Math.ceil(n / 4) * 4
}

/** Jeden list: přední a zadní strana, každá [levá polovina, pravá polovina]; čísla stran od 1. */
export interface BookletSheet { front: [number, number]; back: [number, number] }

/**
 * Pořadí stran sešitku z `n` stran (doplní se do násobku 4 N; strany > n jsou prázdné).
 * List i: přední [N − 2i, 2i + 1], zadní [2i + 2, N − 2i − 1].
 * Při oboustranném tisku s překlápěním po krátké straně je za stranou 1 strana 2.
 */
export function bookletOrder(n: number): BookletSheet[] {
  const total = bookletPageCount(n)
  const sheets: BookletSheet[] = []
  for (let i = 0; i < total / 4; i++) {
    sheets.push({ front: [total - 2 * i, 2 * i + 1], back: [2 * i + 2, total - 2 * i - 1] })
  }
  return sheets
}

/** Strany v pořadí, jak jdou do tiskárny (přední, zadní, přední, …). */
export function bookletSequence(n: number): number[] {
  return bookletOrder(n).flatMap((s) => [...s.front, ...s.back])
}

/** Blok obsahu brožurky: `startsPage` = začíná novou stranou (titul, recept, nákupní seznam). */
export interface PackableBlock { startsPage: boolean }

/**
 * Rozdělí bloky na strany podle naměřených výšek: blok, který se na stranu nevejde, jde celý na další.
 * Blok vyšší než celá strana dostane stranu sám (nikdy se nezacyklí).
 * `capacity <= 0` (jsdom bez layoutu) = bez omezení výšky, dělí se jen podle `startsPage`.
 * Vrací indexy bloků po stranách.
 */
export function packBlocks(blocks: readonly PackableBlock[], heights: readonly number[], capacity: number): number[][] {
  const pages: number[][] = []
  let used = 0
  blocks.forEach((block, i) => {
    const h = heights[i] ?? 0
    const current = pages.at(-1)
    const overflow = capacity > 0 && current !== undefined && used + h > capacity
    if (!current || block.startsPage || overflow) {
      pages.push([i])
      used = h
    } else {
      current.push(i)
      used += h
    }
  })
  return pages
}
```

- [ ] **Step 4: Spustit testy – musí projít**

Run: `npx vitest run src/print/booklet.test.ts`
Expected: PASS (všechny testy).

- [ ] **Step 5: Ověřit celek a commit**

Run: `npm test && npm run build && npm run lint`
Expected: vše zelené.

```bash
git add src/print/booklet.ts src/print/booklet.test.ts
git commit -m "feat(tisk): pořadí stran brožurky a rozdělení bloků na strany A5"
```

---

### Task 2: Tisková úloha podle stránky a hook `usePrintJob`

**Files:**
- Create: `src/print/printJob.ts`, `src/print/usePrintJob.ts`
- Test: `src/print/printJob.test.ts`, `src/print/usePrintJob.test.tsx`

**Interfaces:**
- Consumes: `Route`, `indexToRoute(index, layout)` ze `src/app/route.ts`; `buildLayout` ze `src/content/buildPages.ts` (jen v testu).
- Produces:
```ts
// src/print/printJob.ts
export type PrintJob = { kind: 'recipe'; recipeId: string } | { kind: 'list' } | { kind: 'booklet' } | { kind: 'toc' }
export type PrintKind = PrintJob['kind']
export function printJobForRoute(route: Route): PrintJob
// src/print/usePrintJob.ts
export const PRINT_ATTRIBUTE = 'data-print'
export function usePrintJob(current: () => PrintJob, resetKey: unknown): { job: PrintJob | null; print: (job: PrintJob) => void }
```

- [ ] **Step 1: Napsat failing testy**

```ts
// src/print/printJob.test.ts
import { indexToRoute, type Route } from '@/app/route'
import { buildLayout } from '@/content/buildPages'
import { loadContent } from '@/content/loadContent'
import { tocPageCount } from '@/content/search'
import { printJobForRoute, type PrintJob } from './printJob'

test.each([
  [{ kind: 'recipe', id: 'hovezi-gulas' }, { kind: 'recipe', recipeId: 'hovezi-gulas' }],
  [{ kind: 'list' }, { kind: 'list' }],
  [{ kind: 'cart' }, { kind: 'list' }],
  [{ kind: 'toc' }, { kind: 'toc' }],
  [{ kind: 'cover' }, { kind: 'toc' }],
  [{ kind: 'chapter', id: 'polevky' }, { kind: 'toc' }],
  [{ kind: 'settings' }, { kind: 'toc' }],
] as [Route, PrintJob][])('%o → %o', (route, job) => expect(printJobForRoute(route)).toEqual(job))

test('pravá polovina receptu (postup, na mobilu samostatná stránka) tiskne tentýž recept', () => {
  const { recipes } = loadContent()
  const layout = buildLayout(recipes, { tocPageCount: tocPageCount(recipes) })
  const left = layout.recipeIndex.get('hovezi-gulas')!
  expect(printJobForRoute(indexToRoute(left + 1, layout))).toEqual({ kind: 'recipe', recipeId: 'hovezi-gulas' })
})
```

```tsx
// src/print/usePrintJob.test.tsx
import { act, renderHook } from '@testing-library/react'
import type { PrintJob } from './printJob'
import { usePrintJob } from './usePrintJob'

const fire = (type: 'beforeprint' | 'afterprint') => act(() => { window.dispatchEvent(new Event(type)) })
const attr = () => document.documentElement.getAttribute('data-print')

afterEach(() => document.documentElement.removeAttribute('data-print'))

test('Ctrl+P: beforeprint vykreslí úlohu aktuální stránky, afterprint uklidí', () => {
  const { result } = renderHook(() => usePrintJob(() => ({ kind: 'recipe', recipeId: 'gulas' }), 0))
  expect(result.current.job).toBeNull()
  fire('beforeprint')
  expect(result.current.job).toEqual({ kind: 'recipe', recipeId: 'gulas' })
  expect(attr()).toBe('recipe')
  fire('afterprint')
  expect(result.current.job).toBeNull()
  expect(attr()).toBeNull()
})

test('beforeprint čte stránku platnou v okamžiku tisku', () => {
  let current: PrintJob = { kind: 'toc' }
  const { result, rerender } = renderHook(() => usePrintJob(() => current, 0))
  current = { kind: 'list' }
  rerender()
  fire('beforeprint')
  expect(result.current.job).toEqual({ kind: 'list' })
})

test('tlačítko: úloha je vykreslená a označená dřív, než se zavolá window.print, a beforeprint ji nepřepíše', () => {
  const seen: (string | null)[] = []
  window.print = vi.fn(() => {
    seen.push(attr())
    window.dispatchEvent(new Event('beforeprint'))
    seen.push(attr())
  })
  const { result } = renderHook(() => usePrintJob(() => ({ kind: 'toc' }), 0))
  act(() => result.current.print({ kind: 'booklet' }))
  expect(window.print).toHaveBeenCalledTimes(1)
  expect(seen).toEqual(['booklet', 'booklet'])
  expect(result.current.job).toEqual({ kind: 'booklet' })
  fire('afterprint')
  expect(result.current.job).toBeNull()
  expect(attr()).toBeNull()
})

test('vynucená úloha platí i pro beforeprint, který přijde až po návratu z window.print (mobil, PDF)', () => {
  window.print = vi.fn()
  const { result } = renderHook(() => usePrintJob(() => ({ kind: 'toc' }), 0))
  act(() => result.current.print({ kind: 'list' }))
  fire('beforeprint')
  expect(result.current.job).toEqual({ kind: 'list' })
})

test('bez afterprint: přechod na jinou stránku vynucenou úlohu zapomene a strom odpojí', () => {
  window.print = vi.fn()
  let key = 1
  const { result, rerender } = renderHook(() => usePrintJob(() => ({ kind: 'toc' }), key))
  act(() => result.current.print({ kind: 'booklet' }))
  key = 2
  rerender()
  expect(result.current.job).toBeNull()
  expect(attr()).toBeNull()
  fire('beforeprint')
  expect(result.current.job).toEqual({ kind: 'toc' })
})

test('odmontování smaže data-print', () => {
  const { unmount } = renderHook(() => usePrintJob(() => ({ kind: 'toc' }), 0))
  fire('beforeprint')
  unmount()
  expect(attr()).toBeNull()
})
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/print/printJob.test.ts src/print/usePrintJob.test.tsx`
Expected: FAIL – nelze načíst `./printJob` a `./usePrintJob`.

- [ ] **Step 3: Implementace**

```ts
// src/print/printJob.ts
import type { Route } from '@/app/route'

/** Co se tiskne. `kind` jde do `data-print` na <html>; print.css podle něj skryje knihu. */
export type PrintJob =
  | { kind: 'recipe'; recipeId: string }
  | { kind: 'list' }
  | { kind: 'booklet' }
  | { kind: 'toc' }
export type PrintKind = PrintJob['kind']

/**
 * Ctrl+P podle aktuální stránky (spec §4): recept → recept, nákupní seznam a košík → seznam, jinde obsah.
 * Celá kniha se netiskne; brožurka jen tlačítkem v košíku.
 */
export function printJobForRoute(route: Route): PrintJob {
  switch (route.kind) {
    case 'recipe':
      return { kind: 'recipe', recipeId: route.id }
    case 'list':
    case 'cart':
      return { kind: 'list' }
    default:
      return { kind: 'toc' }
  }
}
```

```ts
// src/print/usePrintJob.ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { PrintJob } from './printJob'

export const PRINT_ATTRIBUTE = 'data-print'

function markDocument(job: PrintJob | null) {
  const root = document.documentElement
  if (job) root.setAttribute(PRINT_ATTRIBUTE, job.kind)
  else root.removeAttribute(PRINT_ATTRIBUTE)
}

/**
 * Tiskový režim. Ctrl+P / menu prohlížeče: `beforeprint` vykreslí úlohu aktuální stránky (`current`).
 * Tlačítko: `print(job)` úlohu vykreslí a označí dřív, než zavolá `window.print()`; vynucená úloha platí,
 * dokud nepřijde `afterprint` nebo se nezmění `resetKey` (index stránky) – některé prohlížeče (Android, PDF přes CDP)
 * pošlou `beforeprint` až po návratu z `window.print()` a jiné `afterprint` vůbec.
 * Vykreslení je synchronní (`flushSync`): prohlížeč stránkuje hned po `beforeprint`, na rAF by nečekal.
 */
export function usePrintJob(current: () => PrintJob, resetKey: unknown): { job: PrintJob | null; print: (job: PrintJob) => void } {
  const [job, setJob] = useState<PrintJob | null>(null)
  const currentRef = useRef(current)
  const forcedRef = useRef<PrintJob | null>(null)
  useEffect(() => {
    currentRef.current = current
  })

  const apply = useCallback((next: PrintJob | null) => {
    flushSync(() => setJob(next))
    markDocument(next)
  }, [])

  useEffect(() => {
    const before = () => apply(forcedRef.current ?? currentRef.current())
    const after = () => {
      forcedRef.current = null
      apply(null)
    }
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
      markDocument(null)
    }
  }, [apply])

  // přechod na jinou stránku zapomene nedokončený tisk tlačítkem
  useEffect(() => {
    forcedRef.current = null
    setJob(null)
    markDocument(null)
  }, [resetKey])

  const print = useCallback(
    (next: PrintJob) => {
      forcedRef.current = next
      apply(next)
      window.print()
    },
    [apply],
  )

  return { job, print }
}
```

- [ ] **Step 4: Spustit testy – musí projít**

Run: `npx vitest run src/print/printJob.test.ts src/print/usePrintJob.test.tsx`
Expected: PASS.

- [ ] **Step 5: Ověřit celek a commit**

Run: `npm test && npm run build && npm run lint`

```bash
git add src/print/printJob.ts src/print/printJob.test.ts src/print/usePrintJob.ts src/print/usePrintJob.test.tsx
git commit -m "feat(tisk): tisková úloha podle stránky a hook usePrintJob (beforeprint, tlačítko, afterprint)"
```

---

### Task 3: Texty receptu, datum, nápovědy a tabulka surovin s násobkem

**Files:**
- Create: `src/pages/recipeText.ts`, `src/pages/recipeText.test.ts`
- Modify: `src/pages/labels.ts` (konec souboru), `src/pages/labels.test.ts`, `src/pages/IngredientTable.tsx`, `src/pages/IngredientTable.test.tsx`, `src/pages/RecipePage.tsx`

**Interfaces:**
- Consumes: `BOOK_META` ze `src/content/books.ts`; `ALLERGEN_LABEL`, `DIFFICULTY_LABEL`, `EQUIPMENT_LABEL` z `labels.ts`.
- Produces:
```ts
// src/pages/recipeText.ts
export function originalTitle(recipe: Recipe): string | undefined
export function bookLabel(recipe: Recipe): string          // 'Armed Forces Recipe Service, 2003' | 'Vlastní recepty'
export function sourceLine(recipe: Recipe): string         // patička zdroje (stejný text jako dosud v RecipeRight)
export function metaLine(recipe: Recipe): string           // '90 min · obtížnost snadné · plotna · bez alergenů'
// src/pages/labels.ts
export function formatDate(d: Date): string                // '15. 10. 2026'
export const PRINT_HINT = 'V dialogu tisku vypněte „Záhlaví a zápatí“.'
export const BOOKLET_HINT = 'Brožurka A5 na A4 na šířku: tiskněte oboustranně s překlápěním po krátké straně a měřítkem 100 %, pak listy přeložte a sešijte uprostřed.'
// IngredientTable – nové volitelné props
multiplier?: number        // výchozí 1; násobek z košíku (brožurka)
perPersonLabel?: string    // výchozí 'Na osobu'; tisk A4 'Na 1 osobu'
```

- [ ] **Step 1: Napsat failing testy**

```ts
// src/pages/recipeText.test.ts
import { loadContent } from '@/content/loadContent'
import { bookLabel, metaLine, originalTitle, sourceLine } from './recipeText'

const { recipes } = loadContent()
const byId = (id: string) => recipes.find((r) => r.id === id)!
const chilli = byId('chilli-con-carne')

test('původní název a kniha s rokem', () => {
  expect(originalTitle(chilli)).toBe('Chili Con Carne')
  expect(bookLabel(chilli)).toBe('Armed Forces Recipe Service, 2003')
  expect(bookLabel({ ...chilli, source: { ...chilli.source, book: 'vlastni' } })).toBe('Vlastní recepty')
})

test('patička zdroje: kniha, rok, strana PDF a původní název', () => {
  expect(sourceLine(byId('hovezi-gulas'))).toMatch(/^Zdroj: Armed Forces Recipe Service, 2003, s\. 808 \(PDF\) · Hungarian Goulash( · čísla odhadnuta)?$/)
  expect(sourceLine({ ...chilli, verified: false })).toMatch(/ · čísla odhadnuta$/)
})

test('řádek údajů: čas, obtížnost, vybavení, alergeny', () => {
  expect(metaLine(chilli)).toBe('90 min · obtížnost snadné · plotna · bez alergenů')
  expect(metaLine({ ...chilli, equipment: [], allergens: ['lepek', 'mleko'] })).toBe('90 min · obtížnost snadné · alergeny: lepek, mléko')
})
```

Do `src/pages/labels.test.ts` přidat (import `formatDate, PRINT_HINT` doplnit do existujícího importu z `./labels`):

```ts
test('formatDate: „15. 10. 2026“', () => {
  expect(formatDate(new Date(2026, 9, 15))).toBe('15. 10. 2026')
  expect(formatDate(new Date(2026, 0, 3))).toBe('3. 1. 2026')
})

test('nápověda k záhlaví a zápatí (Chrome)', () => expect(PRINT_HINT).toBe('V dialogu tisku vypněte „Záhlaví a zápatí“.'))
```

Do `src/pages/IngredientTable.test.tsx` do `describe('IngredientTable', …)` přidat:

```tsx
  it('násobek z košíku (brožurka): ×2 zdvojí faktor, hlavička a popis to uvádějí', () => {
    render(<IngredientTable recipe={byId('michana-vejce')} ingredients={ingredients} portions={portions(6, 18)} historical={false} multiplier={2} />)
    expect(screen.getByRole('columnheader', { name: 'Pro 24 osob ×2' })).toBeInTheDocument()
    expect(screen.getByText('18 dětí + 6 dospělých · přepočteno na 40,8 porce')).toBeInTheDocument()
    const row = screen.getByText('Vejce').closest('tr')!
    expect(within(row).getByText('74 ks')).toBeInTheDocument() // k = 20,4 × 2 / 4 = 10,2: 7,25 × 10,2 = 73,95 → nahoru 74
    expect(within(row).getByText('2 ks')).toBeInTheDocument() // na osobu se násobek nepromítá
  })

  it('vlastní popisek šedého sloupce (tisk A4: „Na 1 osobu“)', () => {
    render(<IngredientTable recipe={byId('michana-vejce')} ingredients={ingredients} portions={portions(6, 18)} historical={false} perPersonLabel="Na 1 osobu" />)
    expect(screen.getByRole('columnheader', { name: 'Na 1 osobu' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Pro 24 osob' })).toBeInTheDocument()
  })
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/pages/recipeText.test.ts src/pages/labels.test.ts src/pages/IngredientTable.test.tsx`
Expected: FAIL – chybí `./recipeText`, `formatDate`, `PRINT_HINT`; sloupec „Pro 24 osob ×2“ nenalezen.

- [ ] **Step 3: Implementace**

```ts
// src/pages/recipeText.ts
import { BOOK_META } from '@/content/books'
import type { Recipe } from '@/domain/types'
import { ALLERGEN_LABEL, DIFFICULTY_LABEL, EQUIPMENT_LABEL } from './labels'

/** Původní název (z receptu, jinak ze zdroje). */
export function originalTitle(recipe: Recipe): string | undefined {
  return recipe.titleOriginal ?? recipe.source.titleOriginal
}

/** Kniha s rokem vydání; vlastní recepty bez roku. */
export function bookLabel(recipe: Recipe): string {
  const meta = BOOK_META[recipe.source.book]
  return recipe.source.book === 'vlastni' ? meta.title : `${meta.title}, ${meta.year}`
}

/** Patička se zdrojem (stránka receptu i tisk). */
export function sourceLine(recipe: Recipe): string {
  const meta = BOOK_META[recipe.source.book]
  return (
    [`Zdroj: ${meta.title}, ${meta.year}${recipe.source.page ? `, s. ${recipe.source.page} (PDF)` : ''}`, originalTitle(recipe)]
      .filter(Boolean)
      .join(' · ') + (recipe.verified ? '' : ' · čísla odhadnuta')
  )
}

/** Údaje receptu na jeden řádek (tisk): čas, obtížnost, vybavení, alergeny. */
export function metaLine(recipe: Recipe): string {
  return [
    `${recipe.timeMinutes} min`,
    `obtížnost ${DIFFICULTY_LABEL[recipe.difficulty]}`,
    recipe.equipment.length ? recipe.equipment.map((e) => EQUIPMENT_LABEL[e]).join(', ') : null,
    recipe.allergens.length ? `alergeny: ${recipe.allergens.map((a) => ALLERGEN_LABEL[a]).join(', ')}` : 'bez alergenů',
  ]
    .filter(Boolean)
    .join(' · ')
}
```

Na konec `src/pages/labels.ts`:

```ts
/** Datum v hlavičce tisku: „15. 10. 2026“. */
export function formatDate(d: Date): string {
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`
}

/** Nápověda u tlačítek tisku (Chrome: „Headers and footers“ / „Záhlaví a zápatí“). */
export const PRINT_HINT = 'V dialogu tisku vypněte „Záhlaví a zápatí“.'

/** Nápověda u brožurky (spec §4 [R1]): duplex řeší prohlížeč, aplikace dodá jen pořadí stran. */
export const BOOKLET_HINT = 'Brožurka A5 na A4 na šířku: tiskněte oboustranně s překlápěním po krátké straně a měřítkem 100 %, pak listy přeložte a sešijte uprostřed.'
```

`src/pages/IngredientTable.tsx` – props a výpočet:

```tsx
interface Props {
  recipe: Recipe
  ingredients: Map<string, Ingredient>
  /** Osoby, koeficient dítěte a náročnost dne (záložka + tiráž). */
  portions: Portions
  /** Přepínač historických surovin (tiráž). */
  historical: boolean
  perPerson?: boolean
  /** Násobek z košíku (brožurka); stránka receptu i tisk A4 ukazují ×1. */
  multiplier?: number
  /** Hlavička šedého sloupce (tisk A4: „Na 1 osobu“). */
  perPersonLabel?: string
}
```

```tsx
export function IngredientTable({ recipe, ingredients, portions, historical, perPerson = true, multiplier = 1, perPersonLabel = 'Na osobu' }: Props) {
  const P = persons(portions)
  const k = recipeScale(P, multiplier, recipe.baseServings)
  const total = P * multiplier
  const kOne = onePersonScale(portions, recipe.baseServings)
```

V JSX nahradit hlavičky sloupců a popis pod tabulkou:

```tsx
            <th scope="col">{`Pro ${peopleLabel(portions.people.adults + portions.people.children)}${multiplier > 1 ? ` ×${multiplier}` : ''}`}</th>
            {perPerson && <th scope="col" className="ingredient-per-person">{perPersonLabel}</th>}
```

```tsx
      <p className="ingredient-scale-note">
        {`${breakdown ? `${breakdown} · ` : ''}přepočteno na ${formatDecimal(total)} ${plural(Math.round(total * 10) / 10, 'porci', 'porce', 'porcí')}${day}`}
      </p>
```

`src/pages/RecipePage.tsx` – nahradit lokální `originalTitle`, výpočet knihy a zdroje funkcemi z `recipeText.ts` (beze změny výstupu; hlídají to existující testy `RecipePage.test.tsx`):

```tsx
import { BOOK_META } from '@/content/books'
import { recipeMacrosPerServing } from '@/domain/nutrition'
import type { Portions } from '@/domain/portions'
import type { Ingredient, Recipe } from '@/domain/types'
import { IngredientTable } from './IngredientTable'
import { ALLERGEN_LABEL, DIFFICULTY_LABEL, EQUIPMENT_LABEL, difficultyDots } from './labels'
import { NutritionFacts } from './NutritionFacts'
import { RecipeMarks } from './RecipeMarks'
import { bookLabel, originalTitle, sourceLine } from './recipeText'

const eraClass = (recipe: Recipe) => `era--${BOOK_META[recipe.source.book].era}`
```

V `RecipeLeft` místo `const meta = …`, `const original = originalTitle(recipe)` a `const book = …` jen:

```tsx
  const original = originalTitle(recipe)
  const book = bookLabel(recipe)
```

V `RecipeRight` místo `const meta = …` a `const source = […]…`:

```tsx
  const source = sourceLine(recipe)
```

- [ ] **Step 4: Spustit testy – musí projít**

Run: `npx vitest run src/pages`
Expected: PASS (nové i stávající testy `RecipePage`, `IngredientTable`, `labels`).

- [ ] **Step 5: Ověřit celek a commit**

Run: `npm test && npm run build && npm run lint`

```bash
git add src/pages/recipeText.ts src/pages/recipeText.test.ts src/pages/labels.ts src/pages/labels.test.ts src/pages/IngredientTable.tsx src/pages/IngredientTable.test.tsx src/pages/RecipePage.tsx
git commit -m "feat(tisk): texty receptu pro tisk, datum, nápovědy a tabulka surovin s násobkem"
```

---

### Task 4: Čistý A4 recept (`PrintRecipe`)

**Files:**
- Create: `src/print/RecipePrint.tsx`
- Test: `src/print/RecipePrint.test.tsx`

**Interfaces:**
- Consumes: `IngredientTable` (`multiplier`, `perPersonLabel`, `perPerson`) a `originalTitle`, `bookLabel`, `metaLine`, `sourceLine` z Task 3; `peopleHeading` z `labels.ts`; `People`, `Portions` z `src/domain/portions.ts`.
- Produces:
```tsx
export function RecipePrintHead(props: { recipe: Recipe; people: People; multiplier?: number }): JSX.Element
export function RecipePrintStep(props: { recipe: Recipe; index: number }): JSX.Element // první krok nese nadpis „Postup“
export function RecipePrintNote(props: { recipe: Recipe }): JSX.Element | null
export function RecipePrintSource(props: { recipe: Recipe }): JSX.Element
export function PrintRecipe(props: { recipe: Recipe; ingredients: Map<string, Ingredient>; portions: Portions; historical: boolean }): JSX.Element
```
Třídy: `.print-recipe`, `.print-recipe__head`, `__origin`, `__people`, `__meta`, `__steps-title`, `__steps`, `__source`; poznámka `.modern-note`.

- [ ] **Step 1: Napsat failing testy**

```tsx
// src/print/RecipePrint.test.tsx
import { render, screen } from '@testing-library/react'
import { loadContent } from '@/content/loadContent'
import { metaLine, sourceLine } from '@/pages/recipeText'
import { PrintRecipe, RecipePrintHead, RecipePrintNote } from './RecipePrint'

const { recipes, ingredients } = loadContent()
const gulas = recipes.find((r) => r.id === 'hovezi-gulas')!
const portions = { people: { adults: 6, children: 18 }, childCoef: 0.8, dayFactor: 1 }
const setup = () => render(<PrintRecipe recipe={gulas} ingredients={ingredients} portions={portions} historical={false} />)

test('A4 recept: název, původní název + kniha, „Pro 24 osob (…)“, údaje, sloupce Pro N osob a Na 1 osobu', () => {
  setup()
  expect(screen.getByRole('heading', { level: 2, name: 'Hovězí guláš' })).toBeInTheDocument()
  expect(screen.getByText('Hungarian Goulash · Armed Forces Recipe Service, 2003')).toBeInTheDocument()
  expect(screen.getByText('Pro 24 osob (18 dětí + 6 dospělých)')).toBeInTheDocument()
  expect(screen.getByText(metaLine(gulas))).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: 'Pro 24 osob' })).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: 'Na 1 osobu' })).toBeInTheDocument()
})

test('celý postup číslovaný od 1, poznámka k modernizaci a patička zdroje', () => {
  const { container } = setup()
  expect(screen.getByRole('heading', { level: 3, name: 'Postup' })).toBeInTheDocument()
  const lists = [...container.querySelectorAll('.print-recipe__steps')]
  expect(lists.map((ol) => ol.getAttribute('start'))).toEqual(gulas.steps.map((_, i) => String(i + 1)))
  expect(lists.map((ol) => ol.textContent)).toEqual(gulas.steps)
  expect(gulas.modernNote).toBeTruthy()
  expect(screen.getByText(gulas.modernNote!)).toBeInTheDocument()
  expect(screen.getByText(sourceLine(gulas))).toBeInTheDocument()
})

test('bez interakce a bez knižních prvků (značky, nutrice, číslo strany)', () => {
  const { container } = setup()
  expect(container.querySelectorAll('button, input, select, textarea')).toHaveLength(0)
  expect(container.querySelector('.recipe-marks, .nutrition-facts, .page-number')).toBeNull()
})

test('hlavička s násobkem (brožurka)', () => {
  render(<RecipePrintHead recipe={gulas} people={{ adults: 4, children: 0 }} multiplier={2} />)
  expect(screen.getByText('Pro 4 osoby · ×2')).toBeInTheDocument()
})

test('recept bez poznámky k modernizaci nic nevykreslí', () => {
  const { container } = render(<RecipePrintNote recipe={{ ...gulas, modernNote: undefined }} />)
  expect(container).toBeEmptyDOMElement()
})
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/print/RecipePrint.test.tsx`
Expected: FAIL – nelze načíst `./RecipePrint`.

- [ ] **Step 3: Implementace**

```tsx
// src/print/RecipePrint.tsx
import type { People, Portions } from '@/domain/portions'
import type { Ingredient, Recipe } from '@/domain/types'
import { IngredientTable } from '@/pages/IngredientTable'
import { peopleHeading } from '@/pages/labels'
import { bookLabel, metaLine, originalTitle, sourceLine } from '@/pages/recipeText'

/** Hlavička tištěného receptu: název, původní název + kniha, pro kolik osob, údaje. */
export function RecipePrintHead({ recipe, people, multiplier = 1 }: { recipe: Recipe; people: People; multiplier?: number }) {
  return (
    <header className="print-recipe__head">
      <h2>{recipe.title}</h2>
      <p className="print-recipe__origin">{[originalTitle(recipe), bookLabel(recipe)].filter(Boolean).join(' · ')}</p>
      <p className="print-recipe__people">{peopleHeading(people) + (multiplier > 1 ? ` · ×${multiplier}` : '')}</p>
      <p className="print-recipe__meta">{metaLine(recipe)}</p>
    </header>
  )
}

/** Jeden krok postupu ve vlastním <ol start> (v brožurce jde postup rozdělit mezi strany); první krok nese nadpis. */
export function RecipePrintStep({ recipe, index }: { recipe: Recipe; index: number }) {
  return (
    <>
      {index === 0 && <h3 className="print-recipe__steps-title">Postup</h3>}
      <ol className="print-recipe__steps" start={index + 1}>
        <li>{recipe.steps[index]}</li>
      </ol>
    </>
  )
}

export function RecipePrintNote({ recipe }: { recipe: Recipe }) {
  if (!recipe.modernNote) return null
  return (
    <aside className="modern-note">
      <strong>Poznámka k modernizaci</strong>
      <p>{recipe.modernNote}</p>
    </aside>
  )
}

export function RecipePrintSource({ recipe }: { recipe: Recipe }) {
  return <footer className="print-recipe__source">{sourceLine(recipe)}</footer>
}

interface Props {
  recipe: Recipe
  ingredients: Map<string, Ingredient>
  portions: Portions
  historical: boolean
}

/** Čistý A4 recept (Ctrl+P na receptu, tlačítko „Tisknout recept“): bez papíru, stínů, ovládání a záložky. */
export function PrintRecipe({ recipe, ingredients, portions, historical }: Props) {
  return (
    <article className="print-recipe">
      <RecipePrintHead recipe={recipe} people={portions.people} />
      <IngredientTable recipe={recipe} ingredients={ingredients} portions={portions} historical={historical} perPersonLabel="Na 1 osobu" />
      {recipe.steps.map((_, i) => (
        <RecipePrintStep key={i} recipe={recipe} index={i} />
      ))}
      <RecipePrintNote recipe={recipe} />
      <RecipePrintSource recipe={recipe} />
    </article>
  )
}
```

- [ ] **Step 4: Spustit testy – musí projít**

Run: `npx vitest run src/print/RecipePrint.test.tsx`
Expected: PASS.

- [ ] **Step 5: Ověřit celek a commit**

Run: `npm test && npm run build && npm run lint`

```bash
git add src/print/RecipePrint.tsx src/print/RecipePrint.test.tsx
git commit -m "feat(tisk): čistý A4 recept s přepočtem na aktuální počet osob"
```

---

### Task 5: Tištěný obsah a hlavička nákupního seznamu s datem

**Files:**
- Create: `src/print/PrintToc.tsx`, `src/print/PrintToc.test.tsx`
- Modify: `src/pages/ShoppingListPage.tsx` (celý soubor), `src/pages/ShoppingListPage.test.tsx`

**Interfaces:**
- Consumes: `buildTocRows` ze `src/content/search.ts`, `CHAPTER_META`; `formatDate` z Task 3.
- Produces:
```tsx
export function PrintToc(props: { recipes: Recipe[]; recipePages: ReadonlyMap<string, number>; chapterPages: ReadonlyMap<Chapter, number> }): JSX.Element
// src/pages/ShoppingListPage.tsx
export function ShoppingListHead(props: { people: People; historical: boolean; dayFactor?: number; date?: Date }): JSX.Element // <h2>Nákupní seznam</h2> + .shopping-people
export function ShoppingItemRow(props: { item: ShoppingItem }): JSX.Element                // <li class="shopping-item">
export function ShoppingListPage(props: { groups: ShoppingGroup[]; people: People; historical: boolean; dayFactor?: number; date?: Date }): JSX.Element
```
Třídy obsahu: `.print-toc`, `.print-toc__list`, `.print-toc__chapter`, `.print-toc__recipe`, `.print-toc__title`, `.print-toc__dots`, `.print-toc__page`.

- [ ] **Step 1: Napsat failing testy**

```tsx
// src/print/PrintToc.test.tsx
import { render, screen } from '@testing-library/react'
import { buildLayout } from '@/content/buildPages'
import { CHAPTER_META } from '@/content/chapters'
import { loadContent } from '@/content/loadContent'
import { buildTocRows, tocPageCount } from '@/content/search'
import { PrintToc } from './PrintToc'

const { recipes } = loadContent()
const layout = buildLayout(recipes, { tocPageCount: tocPageCount(recipes) })
const setup = () => render(<PrintToc recipes={recipes} recipePages={layout.recipeIndex} chapterPages={layout.chapterIndex} />)

test('všechny kapitoly a recepty s čísly stran knihy, bez filtrů a interakce', () => {
  const { container } = setup()
  expect(screen.getByRole('heading', { level: 2, name: 'Obsah' })).toBeInTheDocument()
  expect(container.querySelectorAll('.print-toc__recipe')).toHaveLength(recipes.length)
  expect(container.querySelectorAll('.print-toc__chapter')).toHaveLength(layout.chapterIndex.size)
  expect(container.querySelectorAll('button, input, select, textarea')).toHaveLength(0)
})

test('číslo strany receptu a kapitoly odpovídá knize', () => {
  const { container } = setup()
  const gulas = [...container.querySelectorAll('.print-toc__recipe')].find((li) => li.querySelector('.print-toc__title')?.textContent === 'Hovězí guláš')!
  expect(gulas.querySelector('.print-toc__page')).toHaveTextContent(String(layout.recipeIndex.get('hovezi-gulas')))
  const first = buildTocRows(recipes)[0]
  if (first.kind !== 'chapter') throw new Error('obsah má začínat kapitolou')
  const chapter = container.querySelector('.print-toc__chapter')!
  expect(chapter.querySelector('.print-toc__title')).toHaveTextContent(CHAPTER_META[first.chapter].title)
  expect(chapter.querySelector('.print-toc__page')).toHaveTextContent(String(layout.chapterIndex.get(first.chapter)))
})
```

Do `src/pages/ShoppingListPage.test.tsx` přidat (import `ShoppingItemRow, ShoppingListHead` z `./ShoppingListPage`):

```tsx
test('tisková hlavička nese datum (Task 6 ji použije v tisku A4)', () => {
  render(<ShoppingListPage groups={groups} people={people} historical={false} dayFactor={1.2} date={new Date(2026, 9, 15)} />)
  expect(screen.getByText('Pro 24 osob (18 dětí + 6 dospělých) · náročnost dne 1,2 · 15. 10. 2026')).toBeInTheDocument()
})

test('hlavička a položka jdou vykreslit samostatně (brožurka)', () => {
  const eggs = groups.flatMap((g) => g.items).find((i) => i.name === 'Vejce')!
  const { container } = render(
    <>
      <ShoppingListHead people={people} historical={false} />
      <ul><ShoppingItemRow item={eggs} /></ul>
    </>,
  )
  expect(screen.getByRole('heading', { level: 2, name: 'Nákupní seznam' })).toBeInTheDocument()
  expect(container.querySelector('.shopping-item__amount')).toHaveTextContent('51 ks')
})
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/print/PrintToc.test.tsx src/pages/ShoppingListPage.test.tsx`
Expected: FAIL – chybí `./PrintToc`, `ShoppingItemRow`, `ShoppingListHead`; text s datem nenalezen.

- [ ] **Step 3: Implementace**

```tsx
// src/print/PrintToc.tsx
import { CHAPTER_META } from '@/content/chapters'
import { buildTocRows } from '@/content/search'
import type { Chapter, Recipe } from '@/domain/types'

interface Props {
  /** Všechny recepty – tištěný obsah ignoruje filtry obsahu na obrazovce. */
  recipes: Recipe[]
  /** Číslo strany knihy: recept → levá strana dvoustrany. */
  recipePages: ReadonlyMap<string, number>
  /** Číslo strany úvodu kapitoly. */
  chapterPages: ReadonlyMap<Chapter, number>
}

/** Tištěný obsah (Ctrl+P na obalu, obsahu, kapitole, tiráži): kapitoly a recepty s čísly stran. */
export function PrintToc({ recipes, recipePages, chapterPages }: Props) {
  return (
    <article className="print-toc">
      <h2>Obsah</h2>
      <ul className="print-toc__list">
        {buildTocRows(recipes).map((row) =>
          row.kind === 'chapter' ? (
            <li key={`c-${row.chapter}`} className="print-toc__chapter">
              <span className="print-toc__title">{CHAPTER_META[row.chapter].title}</span>
              <span className="print-toc__dots" aria-hidden="true" />
              <span className="print-toc__page">{chapterPages.get(row.chapter)}</span>
            </li>
          ) : (
            <li key={row.recipe.id} className="print-toc__recipe">
              <span className="print-toc__title">{row.recipe.title}</span>
              <span className="print-toc__dots" aria-hidden="true" />
              <span className="print-toc__page">{recipePages.get(row.recipe.id)}</span>
            </li>
          ),
        )}
      </ul>
    </article>
  )
}
```

```tsx
// src/pages/ShoppingListPage.tsx
import type { People } from '@/domain/portions'
import type { ShoppingGroup, ShoppingItem } from '@/domain/shopping'
import { CATEGORY_LABEL, formatAmount, formatDate, formatDecimal, peopleHeading } from './labels'

interface HeadProps {
  people: People
  historical: boolean
  /** Náročnost dne; v hlavičce se uvede jen když není 1. */
  dayFactor?: number
  /** Datum tisku (tištěný seznam a brožurka); stránka knihy ho nemá. */
  date?: Date
}

/** Nadpis a hlavička seznamu – stránka knihy, tisk A4 i brožurka. */
export function ShoppingListHead({ people, historical, dayFactor = 1, date }: HeadProps) {
  const parts = [
    peopleHeading(people),
    dayFactor !== 1 ? `náročnost dne ${formatDecimal(dayFactor, 2)}` : null,
    historical ? 'historické suroviny' : null,
    date ? formatDate(date) : null,
  ].filter(Boolean)
  return (
    <>
      <h2>Nákupní seznam</h2>
      <p className="shopping-people">{parts.join(' · ')}</p>
    </>
  )
}

/** Položka seznamu: název, množství a rozpad „z kterých receptů kolik“. */
export function ShoppingItemRow({ item }: { item: ShoppingItem }) {
  return (
    <li className="shopping-item">
      <span className="shopping-item__name">{item.name}</span>
      <span className="shopping-item__dots" aria-hidden="true" />
      <span className="shopping-item__amount">{formatAmount(item.amount, item.unit)}</span>
      <small className="shopping-item__sources">
        {item.sources.map((s) => `${s.title} ${formatAmount(s.amount, s.unit)}${s.vessel ? ' (podle nádoby)' : ''}`).join(' · ')}
      </small>
    </li>
  )
}

interface Props extends HeadProps {
  groups: ShoppingGroup[]
}

/** Nákupní seznam z košíku: podle kategorií obchodu, u položky rozpad po receptech. Bez interakce. */
export function ShoppingListPage({ groups, ...head }: Props) {
  return (
    <article className="shopping-page">
      <ShoppingListHead {...head} />
      {groups.length === 0 ? (
        <p className="shopping-empty">Seznam je prázdný – sestaví se z receptů v košíku.</p>
      ) : (
        groups.map((group) => (
          <section key={group.category} className="shopping-group">
            <h3>{CATEGORY_LABEL[group.category]}</h3>
            <ul>
              {group.items.map((item) => (
                <ShoppingItemRow key={item.ingredientId} item={item} />
              ))}
            </ul>
          </section>
        ))
      )}
    </article>
  )
}
```

- [ ] **Step 4: Spustit testy – musí projít**

Run: `npx vitest run src/print/PrintToc.test.tsx src/pages/ShoppingListPage.test.tsx`
Expected: PASS (včetně stávajících testů seznamu – texty hlavičky bez data se nezměnily).

- [ ] **Step 5: Ověřit celek a commit**

Run: `npm test && npm run build && npm run lint`

```bash
git add src/print/PrintToc.tsx src/print/PrintToc.test.tsx src/pages/ShoppingListPage.tsx src/pages/ShoppingListPage.test.tsx
git commit -m "feat(tisk): tištěný obsah s čísly stran a hlavička nákupního seznamu s datem"
```

---

### Task 6: Tiskový strom `PrintRoot`, `print.css` a Ctrl+P podle stránky

**Files:**
- Create: `src/print/PrintRoot.tsx`, `src/print/PrintRoot.test.tsx`
- Modify: `src/styles/print.css` (celý soubor), `src/styles/print.test.ts`, `src/App.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `PrintJob`, `printJobForRoute` a `usePrintJob` (Task 2); `PrintRecipe` (Task 4); `PrintToc`, `ShoppingListPage` s `date` (Task 5); `indexToRoute` ze `src/app/route.ts`.
- Produces:
```tsx
export interface PrintData {
  recipes: Recipe[]
  recipeById: ReadonlyMap<string, Recipe>
  ingredients: Map<string, Ingredient>
  portions: Portions
  historical: boolean
  shoppingList: ShoppingGroup[]
  recipePages: ReadonlyMap<string, number>
  chapterPages: ReadonlyMap<Chapter, number>
  date: Date
}
export function PrintRoot(props: { job: PrintJob; data: PrintData }): JSX.Element // <div class="print-root print-root--<kind>">
```
V `App.tsx`: `const { job: printJob } = usePrintJob(currentPrintJob, index)` (Task 8 si přidá `print`).

- [ ] **Step 1: Napsat failing testy**

```tsx
// src/print/PrintRoot.test.tsx
import { render, screen, within } from '@testing-library/react'
import { buildLayout } from '@/content/buildPages'
import { loadContent } from '@/content/loadContent'
import { tocPageCount } from '@/content/search'
import { buildShoppingList } from '@/domain/shopping'
import { PrintRoot, type PrintData } from './PrintRoot'

const { recipes, ingredients } = loadContent()
const recipeById = new Map(recipes.map((r) => [r.id, r]))
const layout = buildLayout(recipes, { tocPageCount: tocPageCount(recipes) })
const portions = { people: { adults: 6, children: 18 }, childCoef: 0.8, dayFactor: 1 }
const cart = [{ recipeId: 'michana-vejce', multiplier: 1 }]
const data = (over: Partial<PrintData> = {}): PrintData => ({
  recipes,
  recipeById,
  ingredients,
  portions,
  historical: false,
  shoppingList: buildShoppingList(cart, recipeById, ingredients, { persons: 20.4, historical: false }),
  recipePages: layout.recipeIndex,
  chapterPages: layout.chapterIndex,
  date: new Date(2026, 9, 15),
  ...over,
})

test('recept: jen čistý A4 recept, bez tlačítek', () => {
  const { container } = render(<PrintRoot job={{ kind: 'recipe', recipeId: 'michana-vejce' }} data={data()} />)
  const root = container.querySelector<HTMLElement>('.print-root.print-root--recipe')!
  expect(within(root).getByRole('heading', { level: 2, name: 'Míchaná vejce' })).toBeInTheDocument()
  expect(root.querySelectorAll('button, input, select, textarea')).toHaveLength(0)
})

test('historické suroviny platí i v tisku', () => {
  render(<PrintRoot job={{ kind: 'recipe', recipeId: 'americke-palacinky' }} data={data({ historical: true })} />)
  expect(screen.getByText('dnes: Vejce 1 ks (na 4 porce)')).toBeInTheDocument()
})

test('nákupní seznam s počtem osob a datem, bez interakce', () => {
  const { container } = render(<PrintRoot job={{ kind: 'list' }} data={data()} />)
  expect(screen.getByText('Pro 24 osob (18 dětí + 6 dospělých) · 15. 10. 2026')).toBeInTheDocument()
  expect(container.querySelectorAll('button, input, select, textarea')).toHaveLength(0)
})

test('obsah', () => {
  const { container } = render(<PrintRoot job={{ kind: 'toc' }} data={data()} />)
  expect(container.querySelectorAll('.print-root--toc .print-toc__recipe')).toHaveLength(recipes.length)
})

test('neznámý recept → prázdný tiskový strom, nespadne', () => {
  const { container } = render(<PrintRoot job={{ kind: 'recipe', recipeId: 'neexistuje' }} data={data()} />)
  expect(container.querySelector('.print-root')).toBeEmptyDOMElement()
})
```

Do `src/styles/print.test.ts` přidat (pod stávající konstanty `css`, `main`, `print`):

```ts
const screenCss = css.slice(0, css.indexOf('@media print'))
/** Tělo pravidla pro přesný selektor (ne pro selektor, který ho jen obsahuje). */
const rule = (src: string, selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return src.match(new RegExp(`(?:^|\\n|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}

test('stránka A4 s okraji 15 mm', () => {
  expect(css).toMatch(/@page\s*\{[^}]*size:\s*A4;[^}]*margin:\s*15mm/)
})

test('na obrazovce je tiskový strom neviditelný a bez posuvníku, ale rozložený (ne display: none – brožurka měří bloky)', () => {
  const r = rule(screenCss, '.print-root')
  expect(r).toMatch(/visibility:\s*hidden/)
  expect(r).toMatch(/position:\s*fixed/)
  expect(r).toMatch(/left:\s*-10000px/)
  expect(r).toMatch(/pointer-events:\s*none/)
  expect(r).not.toMatch(/display:\s*none/)
})

test('v tisku s data-print se kniha skryje a ukáže se tiskový strom', () => {
  expect(rule(print, 'html[data-print] main')).toMatch(/display:\s*none/)
  const r = rule(print, 'html[data-print] .print-root')
  expect(r).toMatch(/visibility:\s*visible/)
  expect(r).toMatch(/position:\s*static/)
})
```

Do `src/App.test.tsx`: do `beforeEach` přidat řádek `window.print = vi.fn()` (jsdom `window.print` neimplementuje) a na konec souboru:

```tsx
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
  expect(container.querySelector('.print-root .shopping-people')!.textContent).toMatch(/^Pro 2 osoby · \d{1,2}\. \d{1,2}\. \d{4}$/)
  printEvent('afterprint')
})
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/print/PrintRoot.test.tsx src/styles/print.test.ts src/App.test.tsx`
Expected: FAIL – chybí `./PrintRoot`, CSS pravidla `.print-root` a `html[data-print] …`, `data-print` se po `beforeprint` nenastaví.

- [ ] **Step 3: Implementace – `PrintRoot`**

```tsx
// src/print/PrintRoot.tsx
import type { ReactNode } from 'react'
import type { Portions } from '@/domain/portions'
import type { ShoppingGroup } from '@/domain/shopping'
import type { Chapter, Ingredient, Recipe } from '@/domain/types'
import { ShoppingListPage } from '@/pages/ShoppingListPage'
import type { PrintJob } from './printJob'
import { PrintRecipe } from './RecipePrint'
import { PrintToc } from './PrintToc'

/** Data pro tiskové stromy (z App, beze změny výpočtů). */
export interface PrintData {
  recipes: Recipe[]
  recipeById: ReadonlyMap<string, Recipe>
  ingredients: Map<string, Ingredient>
  portions: Portions
  historical: boolean
  shoppingList: ShoppingGroup[]
  recipePages: ReadonlyMap<string, number>
  chapterPages: ReadonlyMap<Chapter, number>
  /** Datum tisku do hlaviček. */
  date: Date
}

function renderJob(job: PrintJob, d: PrintData): ReactNode {
  switch (job.kind) {
    case 'recipe': {
      const recipe = d.recipeById.get(job.recipeId)
      return recipe ? <PrintRecipe recipe={recipe} ingredients={d.ingredients} portions={d.portions} historical={d.historical} /> : null
    }
    case 'list':
      return <ShoppingListPage groups={d.shoppingList} people={d.portions.people} historical={d.historical} dayFactor={d.portions.dayFactor} date={d.date} />
    case 'toc':
      return <PrintToc recipes={d.recipes} recipePages={d.recipePages} chapterPages={d.chapterPages} />
    case 'booklet':
      return null // strom brožurky přidá Task 8 (BookletPrint)
  }
}

/** Tiskový strom mimo knihu: na obrazovce neviditelný, v tisku (html[data-print]) jediný obsah. */
export function PrintRoot({ job, data }: { job: PrintJob; data: PrintData }) {
  return <div className={`print-root print-root--${job.kind}`}>{renderJob(job, data)}</div>
}
```

- [ ] **Step 4: Implementace – `src/styles/print.css` (celý soubor)**

```css
/* src/styles/print.css – tisk (spec §4, fáze 6).
   Ctrl+P i tlačítka tisku vykreslí tiskový strom `.print-root` (src/print/usePrintJob.ts) a nastaví
   <html data-print="recipe|list|booklet|toc">; v tisku se kniha skryje a tiskne se jen strom.
   Bez data-print (prohlížeč bez události beforeprint) platí záloha z fáze 4b: viditelné stránky bez knižních efektů. */
@page { size: A4; margin: 15mm; }

/* ===== tiskový strom ===== */
/* na obrazovce mimo viewport a neviditelný, ale rozložený (ne display: none): brožurka měří výšky bloků;
   position: fixed nepřidá posuvník, visibility: hidden ho vyřadí z přístupnostního stromu */
.print-root {
  position: fixed; top: 0; left: -10000px; width: 180mm;
  visibility: hidden; pointer-events: none;
  --ink: #000; --ink-soft: #444;
  color: #000; background: #fff;
  font-family: var(--font-body); font-size: 11pt; line-height: 1.35;
}
.print-root h2 { margin: 0 0 0.2em; font-size: 18pt; line-height: 1.15; }
.print-root h3 { margin: 0.9em 0 0.3em; font-size: 12pt; }

/* recept A4 */
.print-recipe__origin { margin: 0; font-style: italic; }
.print-recipe__people { margin: 0.5em 0 0; font-family: var(--font-table); font-weight: 600; }
.print-recipe__meta { margin: 0.2em 0 0.8em; font-family: var(--font-table); font-size: 9pt; color: var(--ink-soft); }
.print-root .ingredient-table { font-size: 10pt; }
.print-root .ingredient-table tr { break-inside: avoid; }
.print-recipe__steps-title { break-after: avoid; }
.print-recipe__steps { margin: 0 0 0.35em; padding-left: 1.8em; break-inside: avoid; }
.print-root .modern-note { margin: 0.8em 0; padding: 0.4em 0.7em; border: 1px solid var(--ink-soft); font-size: 10pt; break-inside: avoid; }
.print-root .modern-note p { margin: 0.2em 0 0; }
.print-recipe__source { margin-top: 1em; font-family: var(--font-typewriter); font-size: 8.5pt; color: var(--ink-soft); }

/* nákupní seznam A4 (znovupoužitá ShoppingListPage) */
.print-root .shopping-group h3 { break-after: avoid; }
.print-root .shopping-item { break-inside: avoid; }

/* obsah */
.print-toc__list { list-style: none; margin: 0; padding: 0; columns: 2; column-gap: 10mm; font-size: 10pt; }
.print-toc__chapter, .print-toc__recipe { display: flex; align-items: baseline; gap: 0.3em; break-inside: avoid; }
.print-toc__chapter { margin-top: 0.8em; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; break-after: avoid; }
.print-toc__title { min-width: 0; }
.print-toc__dots { flex: 1; min-width: 1em; border-bottom: 1px dotted var(--ink-soft); transform: translateY(-0.25em); }
.print-toc__page { font-variant-numeric: tabular-nums; }

@media print {
  html, body, #root, main { height: auto !important; background: #fff !important; }

  /* tiskový strom místo knihy */
  html[data-print] main { display: none !important; }
  html[data-print] .print-root { position: static; left: auto; width: auto; visibility: visible; }

  /* záloha bez data-print: viditelné stránky knihy bez knižních efektů */
  .book-controls, .bookmark, .book__nav, .page-edge, .page-more, .page-number, .search-overlay, .recipe-marks { display: none !important; }
  .book, .book--single { display: block; height: auto; padding: 0; perspective: none; }
  .book__spread, .book--single .book__spread {
    display: block; width: auto; height: auto; aspect-ratio: auto;
    box-shadow: none; border-radius: 0; transform: none;
  }
  .book__slot { height: auto; overflow: visible; }
  .page { height: auto; overflow: visible; background: none !important; color: #000; }
  .page--left::after, .page--right::after { display: none; }
  .page-content,
  .page--numbered > .page-content { height: auto; overflow: visible; padding: 0 0 6mm; }
}
```

- [ ] **Step 5: Implementace – zapojení v `src/App.tsx`**

Importy (úprava řádku s `route` a nové importy):

```tsx
import { indexToRoute, routeToIndex, type Route } from '@/app/route'
import { PrintRoot } from '@/print/PrintRoot'
import { printJobForRoute } from '@/print/printJob'
import { usePrintJob } from '@/print/usePrintJob'
```

Hned za `const { index, setIndex, jumpTo } = useHashRoute(layout)`:

```tsx
  // Ctrl+P tiskne podle aktuální stránky (spec §4); index je zároveň klíč, který zapomene nedokončený tisk tlačítkem
  const currentPrintJob = useCallback(() => printJobForRoute(indexToRoute(index, layout)), [index, layout])
  const { job: printJob } = usePrintJob(currentPrintJob, index)
```

`return` komponenty `Library` obalit fragmentem a za `</main>` přidat strom:

```tsx
  return (
    <>
      <main style={{ height: '100%' }}>
        {/* … obsah main beze změny … */}
      </main>
      {printJob && (
        <PrintRoot
          job={printJob}
          data={{
            recipes,
            recipeById,
            ingredients,
            portions,
            historical,
            shoppingList,
            recipePages: layout.recipeIndex,
            chapterPages: layout.chapterIndex,
            date: new Date(),
          }}
        />
      )}
    </>
  )
```

- [ ] **Step 6: Spustit testy – musí projít**

Run: `npx vitest run src/print src/styles src/App.test.tsx`
Expected: PASS (včetně stávajících testů zálohy v `print.test.ts`).

- [ ] **Step 7: Ověřit celek a commit**

Run: `npm test && npm run build && npm run lint`

```bash
git add src/print/PrintRoot.tsx src/print/PrintRoot.test.tsx src/styles/print.css src/styles/print.test.ts src/App.tsx src/App.test.tsx
git commit -m "feat(tisk): tiskový strom místo knihy a Ctrl+P podle stránky (recept, seznam, obsah)"
```

---

### Task 7: Bloky obsahu brožurky

**Files:**
- Create: `src/print/bookletBlocks.ts`
- Test: `src/print/bookletBlocks.test.ts`

**Interfaces:**
- Consumes: `PackableBlock` (Task 1); `CartLine` ze `src/domain/portions.ts`; `ShoppingGroup` ze `src/domain/shopping.ts`.
- Produces:
```ts
export type BookletBlock = PackableBlock & (
  | { kind: 'title'; recipeCount: number }
  | { kind: 'recipe-main'; recipe: Recipe; multiplier: number }   // hlavička + tabulka surovin
  | { kind: 'recipe-step'; recipe: Recipe; step: number }         // step 0 nese nadpis „Postup“
  | { kind: 'recipe-note'; recipe: Recipe }
  | { kind: 'recipe-source'; recipe: Recipe }
  | { kind: 'list-head' }
  | { kind: 'list-item'; group: ShoppingGroup; item: number }     // item 0 nese nadpis kategorie
)
export function bookletBlocks(cart: readonly CartLine[], recipes: ReadonlyMap<string, Recipe>, groups: readonly ShoppingGroup[]): BookletBlock[]
```

- [ ] **Step 1: Napsat failing testy**

```ts
// src/print/bookletBlocks.test.ts
import { loadContent } from '@/content/loadContent'
import { buildShoppingList } from '@/domain/shopping'
import { bookletBlocks } from './bookletBlocks'

const { recipes, ingredients } = loadContent()
const byId = new Map(recipes.map((r) => [r.id, r]))
const eggs = byId.get('michana-vejce')!
const cart = [{ recipeId: 'michana-vejce', multiplier: 2 }]
const groups = buildShoppingList(cart, byId, ingredients, { persons: 4, historical: false })

test('titul, recept od nové strany (hlavní blok, kroky, poznámka, zdroj), nákupní seznam na konci; bez obsahu', () => {
  expect(eggs.steps).toHaveLength(3)
  expect(eggs.modernNote).toBeTruthy()
  const blocks = bookletBlocks(cart, byId, groups)
  expect(blocks.map((b) => b.kind)).toEqual([
    'title',
    'recipe-main', 'recipe-step', 'recipe-step', 'recipe-step', 'recipe-note', 'recipe-source',
    'list-head', ...groups.flatMap((g) => g.items.map(() => 'list-item')),
  ])
  expect(blocks.filter((b) => b.startsPage).map((b) => b.kind)).toEqual(['title', 'recipe-main', 'list-head'])
  expect(blocks[0]).toMatchObject({ kind: 'title', recipeCount: 1 })
  expect(blocks[1]).toMatchObject({ kind: 'recipe-main', multiplier: 2 })
  expect(blocks.flatMap((b) => (b.kind === 'recipe-step' ? [b.step] : []))).toEqual([0, 1, 2])
})

test('neexistující recept se přeskočí a nepočítá; pořadí receptů podle košíku', () => {
  const blocks = bookletBlocks(
    [{ recipeId: 'hovezi-gulas', multiplier: 1 }, { recipeId: 'neexistuje', multiplier: 1 }, { recipeId: 'michana-vejce', multiplier: 1 }],
    byId,
    [],
  )
  expect(blocks.flatMap((b) => (b.kind === 'recipe-main' ? [b.recipe.id] : []))).toEqual(['hovezi-gulas', 'michana-vejce'])
  expect(blocks[0]).toMatchObject({ kind: 'title', recipeCount: 2 })
})

test('položky seznamu: první položka každé kategorie má index 0 (nese nadpis)', () => {
  const blocks = bookletBlocks(cart, byId, groups)
  const items = blocks.flatMap((b) => (b.kind === 'list-item' ? [{ category: b.group.category, item: b.item }] : []))
  expect(items).toHaveLength(groups.reduce((s, g) => s + g.items.length, 0))
  for (const g of groups) expect(items.find((i) => i.category === g.category)!.item).toBe(0)
})

test('prázdný košík: jen titul a hlavička seznamu', () => {
  expect(bookletBlocks([], byId, []).map((b) => b.kind)).toEqual(['title', 'list-head'])
})
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/print/bookletBlocks.test.ts`
Expected: FAIL – nelze načíst `./bookletBlocks`.

- [ ] **Step 3: Implementace**

```ts
// src/print/bookletBlocks.ts
import type { CartLine } from '@/domain/portions'
import type { ShoppingGroup } from '@/domain/shopping'
import type { Recipe } from '@/domain/types'
import type { PackableBlock } from './booklet'

/** Blok obsahu brožurky – nejmenší kus, který se při stránkování nedělí. */
export type BookletBlock = PackableBlock &
  (
    | { kind: 'title'; recipeCount: number }
    | { kind: 'recipe-main'; recipe: Recipe; multiplier: number }
    | { kind: 'recipe-step'; recipe: Recipe; step: number }
    | { kind: 'recipe-note'; recipe: Recipe }
    | { kind: 'recipe-source'; recipe: Recipe }
    | { kind: 'list-head' }
    | { kind: 'list-item'; group: ShoppingGroup; item: number }
  )

/**
 * Obsah brožurky (spec §4 [R1]): titulní strana, každý recept od nové strany (hlavička s tabulkou surovin,
 * kroky, poznámka k modernizaci, zdroj), na konci nákupní seznam (hlavička, pak jednotlivé položky;
 * první položka kategorie nese její nadpis). Bez obsahu. Recept, který už v knize není, se přeskočí.
 */
export function bookletBlocks(cart: readonly CartLine[], recipes: ReadonlyMap<string, Recipe>, groups: readonly ShoppingGroup[]): BookletBlock[] {
  const items = cart.flatMap((entry) => {
    const recipe = recipes.get(entry.recipeId)
    return recipe ? [{ recipe, multiplier: entry.multiplier }] : []
  })
  const blocks: BookletBlock[] = [{ kind: 'title', recipeCount: items.length, startsPage: true }]
  for (const { recipe, multiplier } of items) {
    blocks.push({ kind: 'recipe-main', recipe, multiplier, startsPage: true })
    recipe.steps.forEach((_, step) => blocks.push({ kind: 'recipe-step', recipe, step, startsPage: false }))
    if (recipe.modernNote) blocks.push({ kind: 'recipe-note', recipe, startsPage: false })
    blocks.push({ kind: 'recipe-source', recipe, startsPage: false })
  }
  blocks.push({ kind: 'list-head', startsPage: true })
  for (const group of groups) {
    group.items.forEach((_, item) => blocks.push({ kind: 'list-item', group, item, startsPage: false }))
  }
  return blocks
}
```

- [ ] **Step 4: Spustit testy – musí projít**

Run: `npx vitest run src/print/bookletBlocks.test.ts`
Expected: PASS.

- [ ] **Step 5: Ověřit celek a commit**

Run: `npm test && npm run build && npm run lint`

```bash
git add src/print/bookletBlocks.ts src/print/bookletBlocks.test.ts
git commit -m "feat(tisk): bloky obsahu brožurky (titul, recepty, nákupní seznam)"
```

---

### Task 8: Brožurka – měření, sazba listů a tlačítko „Tisknout brožurku“

**Files:**
- Create: `src/print/BookletPrint.tsx`, `src/print/BookletPrint.test.tsx`
- Modify: `src/content/books.ts` (nová konstanta), `src/pages/CoverPage.tsx:11`, `src/print/PrintRoot.tsx`, `src/print/PrintRoot.test.tsx`, `src/styles/print.css` (sekce brožurky před `@media print`), `src/styles/print.test.ts`, `src/pages/CartPage.tsx`, `src/pages/CartPage.test.tsx`, `src/styles/paper.css` (sekce košíku), `src/App.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `BOOKLET_PAGE_CSS`, `bookletOrder`, `packBlocks` (Task 1); `usePrintJob().print` (Task 2); `BOOKLET_HINT`, `PRINT_HINT`, `formatDate` a `IngredientTable` s `multiplier` (Task 3); `RecipePrintHead`, `RecipePrintStep`, `RecipePrintNote`, `RecipePrintSource` (Task 4); `ShoppingListHead`, `ShoppingItemRow` (Task 5); `PrintRoot`/`PrintData` (Task 6); `bookletBlocks`, `BookletBlock` (Task 7).
- Produces:
```tsx
// src/content/books.ts
export const COOKBOOK_TITLE = 'Kuchařka pro tábory, výlety a hubené měsíce'
// src/print/BookletPrint.tsx
export function BookletPrint(props: { blocks: BookletBlock[]; ingredients: Map<string, Ingredient>; portions: Portions; historical: boolean; date: Date }): JSX.Element
// listy: .booklet > .booklet-sheet > .booklet-page[data-page=n] > .booklet-page__body.booklet-flow > .booklet-block; číslo .booklet-page__number
// PrintData: nové pole cart: readonly CartLine[]
// CartPage: nový prop onPrintBooklet: () => void
```

- [ ] **Step 1: Napsat failing testy**

```tsx
// src/print/BookletPrint.test.tsx
import { render, within } from '@testing-library/react'
import { COOKBOOK_TITLE } from '@/content/books'
import { loadContent } from '@/content/loadContent'
import { buildShoppingList } from '@/domain/shopping'
import { BOOKLET_PAGE_CSS } from './booklet'
import { bookletBlocks } from './bookletBlocks'
import { BookletPrint } from './BookletPrint'

const { recipes, ingredients } = loadContent()
const byId = new Map(recipes.map((r) => [r.id, r]))
const portions = { people: { adults: 6, children: 18 }, childCoef: 0.8, dayFactor: 1 }
const cart = [{ recipeId: 'michana-vejce', multiplier: 2 }, { recipeId: 'hovezi-gulas', multiplier: 1 }]
const groups = buildShoppingList(cart, byId, ingredients, { persons: 20.4, historical: false })
const date = new Date(2026, 9, 15)
const renderBooklet = (c = cart, g = groups) =>
  render(<BookletPrint blocks={bookletBlocks(c, byId, g)} ingredients={ingredients} portions={portions} historical={false} date={date} />)
const page = (container: HTMLElement, n: number) => container.querySelector<HTMLElement>(`[data-page="${n}"]`)!
const pageOrder = (container: HTMLElement) =>
  [...container.querySelectorAll('.booklet-sheet')].map((s) => [...s.querySelectorAll('.booklet-page')].map((p) => Number(p.getAttribute('data-page'))))

test('titul + 2 recepty + seznam = 4 strany = 1 list: přední [4, 1], zadní [2, 3]; měřicí sloupec zmizí', () => {
  const { container } = renderBooklet()
  expect(pageOrder(container)).toEqual([[4, 1], [2, 3]])
  expect(container.querySelector('.booklet-measure')).toBeNull()
})

test('titulní strana: název kuchařky, počet osob, datum, počet receptů – bez obsahu', () => {
  const { container } = renderBooklet()
  const title = page(container, 1)
  expect(title).toHaveTextContent(COOKBOOK_TITLE)
  expect(title).toHaveTextContent('Pro 24 osob (18 dětí + 6 dospělých)')
  expect(title).toHaveTextContent('15. 10. 2026')
  expect(title).toHaveTextContent('2 recepty · nákupní seznam na konci')
  expect(title).not.toHaveTextContent('Hovězí guláš')
  expect(title.querySelector('.booklet-page__number')).toBeNull()
})

test('recept na vlastní straně přepočtený na P × násobek; seznam na poslední straně bez interakce', () => {
  const { container } = renderBooklet()
  const eggsPage = page(container, 2)
  expect(within(eggsPage).getByRole('heading', { level: 2, name: 'Míchaná vejce' })).toBeInTheDocument()
  expect(within(eggsPage).getByText('Pro 24 osob (18 dětí + 6 dospělých) · ×2')).toBeInTheDocument()
  expect(within(eggsPage).getByRole('columnheader', { name: 'Pro 24 osob ×2' })).toBeInTheDocument()
  expect(within(eggsPage.querySelector('tbody')!).getByText('Vejce').closest('tr')).toHaveTextContent('74 ks')
  expect(eggsPage.querySelector('.booklet-page__number')).toHaveTextContent('2')
  expect(within(page(container, 3)).getByRole('heading', { level: 2, name: 'Hovězí guláš' })).toBeInTheDocument()
  const list = page(container, 4)
  expect(within(list).getByRole('heading', { level: 2, name: 'Nákupní seznam' })).toBeInTheDocument()
  expect(list).toHaveTextContent('15. 10. 2026')
  expect(container.querySelectorAll('button, input, select, textarea')).toHaveLength(0)
})

test('5 stran se doplní prázdnými do 8; pořadí listů 8,1 | 2,7 | 6,3 | 4,5; prázdné strany bez čísla', () => {
  const { container } = renderBooklet([...cart, { recipeId: 'chilli-con-carne', multiplier: 1 }])
  expect(pageOrder(container)).toEqual([[8, 1], [2, 7], [6, 3], [4, 5]])
  for (const n of [6, 7, 8]) expect(page(container, n)).toBeEmptyDOMElement()
})

test('měření: bloky, které se na stranu A5 nevejdou, přetečou celé na další stranu (ne ořez)', () => {
  const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const height = this.classList.contains('booklet-page__body') ? 100 : this.classList.contains('booklet-block') ? 40 : 0
    return { height, width: 0, top: 0, left: 0, right: 0, bottom: height, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
  })
  try {
    // míchaná vejce = hlavní blok, 3 kroky, poznámka, zdroj = 6 bloků po 40 → 2 na stranu = 3 strany;
    // titul + 3 + hlavička prázdného seznamu = 5 stran → 8
    const { container } = renderBooklet([{ recipeId: 'michana-vejce', multiplier: 1 }], [])
    expect(container.querySelectorAll('.booklet-sheet')).toHaveLength(4)
    for (const n of [2, 3, 4]) expect(page(container, n).querySelectorAll('.booklet-block')).toHaveLength(2)
    expect(within(page(container, 5)).getByRole('heading', { level: 2, name: 'Nákupní seznam' })).toBeInTheDocument()
  } finally {
    spy.mockRestore()
  }
})

test('vloží @page pro A4 na šířku bez okrajů', () => {
  const { container } = renderBooklet()
  expect(container.querySelector('style')!.textContent).toBe(BOOKLET_PAGE_CSS)
})
```

Do `src/print/PrintRoot.test.tsx`: do helperu `data()` přidat pole `cart,` (za `historical: false,`) a na konec:

```tsx
test('brožurka: listy A5 na A4 z košíku', () => {
  const { container } = render(<PrintRoot job={{ kind: 'booklet' }} data={data()} />)
  // titul + míchaná vejce + seznam = 3 strany → 4 = jeden list (přední a zadní strana)
  expect(container.querySelectorAll('.print-root--booklet .booklet-sheet')).toHaveLength(2)
})
```

Do `src/styles/print.test.ts`:

```ts
test('brožurka: měřicí sloupec má přesně rozměry těla strany A5 (měření = tisk)', () => {
  const mm = (selector: string, prop: string) => Number(rule(screenCss, selector).match(new RegExp(`(?:^|;|\\s)${prop}:\\s*([\\d.]+)mm`))![1])
  const [top, side, bottom] = rule(screenCss, '.booklet-page').match(/padding:\s*([\d.]+)mm ([\d.]+)mm ([\d.]+)mm/)!.slice(1).map(Number)
  expect(rule(screenCss, '.booklet-sheet')).toMatch(/width:\s*297mm/)
  expect(rule(screenCss, '.booklet-sheet')).toMatch(/grid-template-columns:\s*148\.5mm 148\.5mm/)
  expect(mm('.booklet-measure', 'width')).toBe(148.5 - 2 * side)
  expect(mm('.booklet-page__body', 'height')).toBe(mm('.booklet-sheet', 'height') - top - bottom)
  expect(rule(screenCss, '.booklet-sheet')).toMatch(/break-after:\s*page/)
})
```

V `src/pages/CartPage.test.tsx`: do `setup` přidat `onPrintBooklet: vi.fn(),`, na začátek importů `import { BOOKLET_HINT, PRINT_HINT, formatInteger, formatMacros } from './labels'` (nahradí stávající import z `./labels`) a test `'tisk je fáze 6: brožurka zakázaná s poznámkou, „jen nákupní seznam“ otevře seznam'` nahradit:

```tsx
test('Tisknout brožurku spustí tisk brožurky; nápověda k oboustrannému tisku a záhlaví', () => {
  const { props } = setup()
  const booklet = screen.getByRole('button', { name: 'Tisknout brožurku' })
  expect(booklet).toBeEnabled()
  expect(booklet).toHaveAccessibleDescription(`${BOOKLET_HINT} ${PRINT_HINT}`)
  fireEvent.click(booklet)
  expect(props.onPrintBooklet).toHaveBeenCalledTimes(1)
})

test('„Tisknout jen nákupní seznam“ zatím otevře seznam', () => {
  const { props } = setup()
  fireEvent.click(screen.getByRole('button', { name: 'Tisknout jen nákupní seznam' }))
  expect(props.onNavigate).toHaveBeenCalledWith({ kind: 'list' })
})
```

Do `src/App.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/print src/styles/print.test.ts src/pages/CartPage.test.tsx src/App.test.tsx`
Expected: FAIL – chybí `./BookletPrint`, `COOKBOOK_TITLE`, CSS brožurky, `onPrintBooklet`; tlačítko brožurky je zakázané.

- [ ] **Step 3: Implementace – název kuchařky**

`src/content/books.ts` (za importy):

```ts
/** Název kuchařky (obal, titulní strana brožurky). */
export const COOKBOOK_TITLE = 'Kuchařka pro tábory, výlety a hubené měsíce'
```

`src/pages/CoverPage.tsx`: `import { BOOK_META, COOKBOOK_TITLE } from '@/content/books'` a `export function CoverPage({ title = COOKBOOK_TITLE }: CoverPageProps) {`.

- [ ] **Step 4: Implementace – `BookletPrint`**

```tsx
// src/print/BookletPrint.tsx
import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import { COOKBOOK_TITLE } from '@/content/books'
import type { Portions } from '@/domain/portions'
import type { Ingredient } from '@/domain/types'
import { IngredientTable } from '@/pages/IngredientTable'
import { CATEGORY_LABEL, formatDate, peopleHeading, plural } from '@/pages/labels'
import { ShoppingItemRow, ShoppingListHead } from '@/pages/ShoppingListPage'
import { BOOKLET_PAGE_CSS, bookletOrder, packBlocks } from './booklet'
import type { BookletBlock } from './bookletBlocks'
import { RecipePrintHead, RecipePrintNote, RecipePrintSource, RecipePrintStep } from './RecipePrint'

interface Context {
  ingredients: Map<string, Ingredient>
  portions: Portions
  historical: boolean
  date: Date
}

interface Props extends Context {
  blocks: BookletBlock[]
}

function Block({ block, ingredients, portions, historical, date }: { block: BookletBlock } & Context) {
  switch (block.kind) {
    case 'title':
      return (
        <div className="booklet-title">
          <h2>{COOKBOOK_TITLE}</h2>
          <p className="booklet-title__people">{peopleHeading(portions.people)}</p>
          <p className="booklet-title__date">{formatDate(date)}</p>
          <p className="booklet-title__contents">{`${block.recipeCount} ${plural(block.recipeCount, 'recept', 'recepty', 'receptů')} · nákupní seznam na konci`}</p>
        </div>
      )
    case 'recipe-main':
      return (
        <>
          <RecipePrintHead recipe={block.recipe} people={portions.people} multiplier={block.multiplier} />
          <IngredientTable recipe={block.recipe} ingredients={ingredients} portions={portions} historical={historical} perPerson={false} multiplier={block.multiplier} />
        </>
      )
    case 'recipe-step':
      return <RecipePrintStep recipe={block.recipe} index={block.step} />
    case 'recipe-note':
      return <RecipePrintNote recipe={block.recipe} />
    case 'recipe-source':
      return <RecipePrintSource recipe={block.recipe} />
    case 'list-head':
      return <ShoppingListHead people={portions.people} historical={historical} dayFactor={portions.dayFactor} date={date} />
    case 'list-item':
      return (
        <section className="shopping-group">
          {block.item === 0 && <h3>{CATEGORY_LABEL[block.group.category]}</h3>}
          <ul>
            <ShoppingItemRow item={block.group.items[block.item]} />
          </ul>
        </section>
      )
  }
}

/**
 * Brožurka A5 na A4 na šířku (spec §4 [R1]) ve dvou fázích téhož synchronního vykreslení (flushSync v usePrintJob):
 * 1. bloky se vykreslí do měřicího sloupce o šířce těla strany A5 a změří se;
 * 2. rozdělí se na strany (packBlocks), doplní do násobku 4 a vysází po listech v pořadí pro skládání (bookletOrder).
 * Aktualizaci stavu z useLayoutEffect React provede synchronně, takže window.print() už vidí vysázené listy.
 */
export function BookletPrint({ blocks, ...ctx }: Props) {
  const measureRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<number[][] | null>(null)

  useLayoutEffect(() => {
    const root = measureRef.current
    if (pages !== null || !root) return
    const heights = [...root.querySelectorAll<HTMLElement>(':scope > .booklet-flow > .booklet-block')].map((el) => el.getBoundingClientRect().height)
    const capacity = root.querySelector<HTMLElement>(':scope > .booklet-page__body')?.getBoundingClientRect().height ?? 0
    setPages(packBlocks(blocks, heights, capacity))
  }, [blocks, pages])

  const renderBlock = (i: number) => (
    <div key={i} className="booklet-block">
      <Block block={blocks[i]} {...ctx} />
    </div>
  )

  if (pages === null) {
    return (
      <div className="booklet-measure" ref={measureRef}>
        {/* prázdné tělo strany: jeho výška je kapacita strany */}
        <div className="booklet-page__body" />
        <div className="booklet-flow">{blocks.map((_, i) => renderBlock(i))}</div>
      </div>
    )
  }

  const half = (n: number) => (
    <div key={n} className="booklet-page" data-page={n}>
      {n <= pages.length && (
        <>
          <div className="booklet-page__body booklet-flow">{pages[n - 1].map(renderBlock)}</div>
          {n > 1 && <span className="booklet-page__number">{n}</span>}
        </>
      )}
    </div>
  )

  return (
    <div className="booklet">
      <style>{BOOKLET_PAGE_CSS}</style>
      {bookletOrder(pages.length).map((sheet, i) => (
        <Fragment key={i}>
          <div className="booklet-sheet">{sheet.front.map(half)}</div>
          <div className="booklet-sheet">{sheet.back.map(half)}</div>
        </Fragment>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Implementace – `PrintRoot` větev brožurky**

V `src/print/PrintRoot.tsx` přidat importy `import type { CartLine, Portions } from '@/domain/portions'` (nahradí import `Portions`), `import { BookletPrint } from './BookletPrint'`, `import { bookletBlocks } from './bookletBlocks'`; do `PrintData` přidat pole:

```ts
  /** Košík (brožurka: recepty a násobky). */
  cart: readonly CartLine[]
```

a větev `booklet` nahradit:

```tsx
    case 'booklet':
      return (
        <BookletPrint
          blocks={bookletBlocks(d.cart, d.recipeById, d.shoppingList)}
          ingredients={d.ingredients}
          portions={d.portions}
          historical={d.historical}
          date={d.date}
        />
      )
```

- [ ] **Step 6: Implementace – CSS brožurky**

Do `src/styles/print.css` vložit **před** řádek `@media print {`:

```css
/* ===== brožurka: A5 na A4 na šířku (spec §4 [R1]) =====
   rozměry v mm a písmo v pt platí na obrazovce i v tisku: měřicí sloupec (.booklet-measure) má šířku těla strany,
   takže změřené výšky bloků platí i na papíře. List je o 0,5 mm nižší než A4, aby zaokrouhlení nepřidalo prázdný list. */
.print-root--booklet { width: 297mm; }
.booklet-sheet { display: grid; grid-template-columns: 148.5mm 148.5mm; width: 297mm; height: 209.5mm; overflow: hidden; break-after: page; }
.booklet-sheet:last-child { break-after: auto; }
.booklet-page { position: relative; padding: 12mm 12mm 14mm; }
.booklet-page__body { height: 183.5mm; }
.booklet-measure { width: 124.5mm; }
.booklet-flow { font-size: 9.5pt; line-height: 1.3; }
.booklet-flow h2 { font-size: 14pt; }
.booklet-flow .ingredient-table { font-size: 9pt; }
.booklet-block { display: flow-root; }
.booklet-page__number { position: absolute; left: 0; right: 0; bottom: 6mm; text-align: center; font-size: 8pt; color: var(--ink-soft); }
.booklet-title { display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 3mm; min-height: 150mm; text-align: center; }
.booklet-title h2 { font-size: 20pt; }
.booklet-title p { margin: 0; }
```

- [ ] **Step 7: Implementace – košík a `App`**

`src/pages/CartPage.tsx`: import `import { BOOKLET_HINT, PRINT_HINT, formatDecimal, formatInteger, formatMacros, peopleHeading, plural } from './labels'`; do `CartPageProps` přidat `onPrintBooklet: () => void` (a do destrukturalizace); `const noteId = useId()` nahradit:

```tsx
  const bookletNoteId = useId()
  const printNoteId = useId()
```

a blok `<div className="cart-actions">…</div>` nahradit:

```tsx
          <div className="cart-actions">
            <button type="button" className="cart-button" aria-describedby={`${bookletNoteId} ${printNoteId}`} onClick={onPrintBooklet}>
              Tisknout brožurku
            </button>
            <button type="button" className="cart-button" onClick={() => onNavigate({ kind: 'list' })}>Tisknout jen nákupní seznam</button>
            <p id={bookletNoteId} className="cart-actions__note">{BOOKLET_HINT}</p>
            <p id={printNoteId} className="cart-actions__note">{PRINT_HINT}</p>
          </div>
```

`src/styles/paper.css` – za řádek `.cart-actions { … }` přidat:

```css
.cart-actions__note { flex-basis: 100%; margin: 0; }
```

`src/App.tsx`: `const { job: printJob, print } = usePrintJob(currentPrintJob, index)`; v `case 'cart'` přidat prop `onPrintBooklet={() => print({ kind: 'booklet' })}`; do `useMemo` závislostí `pages` přidat `print`; do `data` pro `PrintRoot` přidat `cart: state.cart,`.

- [ ] **Step 8: Spustit testy – musí projít**

Run: `npx vitest run src/print src/styles src/pages src/App.test.tsx`
Expected: PASS.

- [ ] **Step 9: Ověřit celek a commit**

Run: `npm test && npm run build && npm run lint`

```bash
git add src/print/BookletPrint.tsx src/print/BookletPrint.test.tsx src/print/PrintRoot.tsx src/print/PrintRoot.test.tsx src/content/books.ts src/pages/CoverPage.tsx src/styles/print.css src/styles/print.test.ts src/styles/paper.css src/pages/CartPage.tsx src/pages/CartPage.test.tsx src/App.tsx src/App.test.tsx
git commit -m "feat(tisk): brožurka A5 na A4 z košíku – měření, přetečení po blocích a pořadí stran"
```

---

### Task 9: Tlačítka tisku na receptu, nákupním seznamu a v košíku

**Files:**
- Modify: `src/pages/icons.tsx` (nová ikona), `src/pages/RecipePage.tsx`, `src/pages/RecipePage.test.tsx`, `src/pages/ShoppingListPage.tsx`, `src/pages/ShoppingListPage.test.tsx`, `src/pages/CartPage.tsx`, `src/pages/CartPage.test.tsx`, `src/styles/paper.css`, `src/styles/print.css`, `src/styles/print.test.ts`, `src/App.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `PRINT_HINT` (Task 3), `usePrintJob().print` (Task 2, v `App` od Task 8).
- Produces:
```tsx
export function PrinterIcon(): JSX.Element                    // src/pages/icons.tsx
// RecipeLeft: nový povinný prop onPrint: () => void – tlačítko „Tisknout recept“ (ikona) v .recipe-head
// ShoppingListPage: nový prop onPrint?: () => void – tlačítko „Tisknout nákupní seznam“ (jen s neprázdným seznamem)
// CartPage: nový prop onPrintList: () => void – „Tisknout jen nákupní seznam“ tiskne přímo
```

- [ ] **Step 1: Napsat failing testy**

`src/pages/RecipePage.test.tsx`: v `setupLeft` doplnit do výchozích props `onPrint: vi.fn(),`, do importu z `./labels` přidat `PRINT_HINT` a do `describe('RecipeLeft', …)`:

```tsx
  it('tlačítko tisku je vedle značek a má nápovědu k záhlaví a zápatí', async () => {
    const { props } = setupLeft()
    const btn = screen.getByRole('button', { name: 'Tisknout recept' })
    expect(btn.closest('.recipe-head')).not.toBeNull()
    expect(btn).toHaveAccessibleDescription(PRINT_HINT)
    expect(screen.getByText(PRINT_HINT)).toBeInTheDocument()
    await userEvent.click(btn)
    expect(props.onPrint).toHaveBeenCalledTimes(1)
  })
```

`src/pages/ShoppingListPage.test.tsx` (import `fireEvent` z `@testing-library/react`, `PRINT_HINT` z `./labels`):

```tsx
test('stránka seznamu má jediné tlačítko „Tisknout nákupní seznam“ s nápovědou; prázdný seznam ho nemá', () => {
  const onPrint = vi.fn()
  const { container, rerender } = render(<ShoppingListPage groups={groups} people={people} historical={false} onPrint={onPrint} />)
  const btn = screen.getByRole('button', { name: 'Tisknout nákupní seznam' })
  expect(btn).toHaveAccessibleDescription(PRINT_HINT)
  fireEvent.click(btn)
  expect(onPrint).toHaveBeenCalledTimes(1)
  expect(container.querySelectorAll('button, input, select, textarea')).toHaveLength(1)
  rerender(<ShoppingListPage groups={[]} people={people} historical={false} onPrint={onPrint} />)
  expect(screen.queryByRole('button')).toBeNull()
})
```

`src/pages/CartPage.test.tsx`: do `setup` přidat `onPrintList: vi.fn(),` a test `'„Tisknout jen nákupní seznam“ zatím otevře seznam'` nahradit:

```tsx
test('„Tisknout jen nákupní seznam“ tiskne seznam rovnou, bez přechodu na stránku seznamu', () => {
  const { props } = setup()
  const btn = screen.getByRole('button', { name: 'Tisknout jen nákupní seznam' })
  expect(btn).toHaveAccessibleDescription(PRINT_HINT)
  fireEvent.click(btn)
  expect(props.onPrintList).toHaveBeenCalledTimes(1)
  expect(props.onNavigate).not.toHaveBeenCalled()
})
```

`src/styles/print.test.ts` – v testu `'v tisku se skryjí ovládací prvky a indikátor pokračování'` rozšířit seznam selektorů o `'.mark--print', '.print-hint', '.print-action', '.cart-actions'`.

`src/App.test.tsx`:

```tsx
test('tlačítko „Tisknout recept“ vykreslí recept do tiskového stromu dřív, než se otevře dialog', () => {
  history.replaceState(null, '', '#/recept/hovezi-gulas')
  const { container } = render(<App />)
  const seen: (string | null)[] = []
  window.print = vi.fn(() => {
    seen.push(document.documentElement.getAttribute('data-print'))
    seen.push(container.querySelector('.print-root .print-recipe h2')?.textContent ?? null)
  })
  fireEvent.click(screen.getByRole('button', { name: 'Tisknout recept' }))
  expect(seen).toEqual(['recipe', 'Hovězí guláš'])
  act(() => { window.dispatchEvent(new Event('afterprint')) })
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
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/pages src/styles/print.test.ts src/App.test.tsx`
Expected: FAIL – tlačítka „Tisknout recept“ a „Tisknout nákupní seznam“ neexistují, `onPrintList` se nevolá, CSS selektory chybí.

- [ ] **Step 3: Implementace – ikona a stránka receptu**

`src/pages/icons.tsx` – na konec:

```tsx
export function PrinterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 9V3.5h10V9" />
      <rect x="3" y="9" width="18" height="8" rx="1.5" />
      <path d="M7 14h10v6.5H7z" />
    </svg>
  )
}
```

`src/pages/RecipePage.tsx`: importy `import { useId } from 'react'`, `import { PrinterIcon } from './icons'`, `PRINT_HINT` do importu z `./labels`; do `LeftProps` přidat:

```tsx
  /** Tisk čistého A4 receptu (usePrintJob). */
  onPrint: () => void
```

do destrukturalizace `RecipeLeft` přidat `onPrint`, na začátek těla `const hintId = useId()` a hlavičku + řádek původního názvu nahradit:

```tsx
      <header className="recipe-head">
        <h2>{recipe.title}</h2>
        <RecipeMarks favorite={favorite} cooked={cooked} onToggleFavorite={onToggleFavorite} onToggleCooked={onToggleCooked} inCart={inCart} onToggleCart={onToggleCart} />
        <button type="button" className="mark mark--print" aria-label="Tisknout recept" aria-describedby={hintId} title="Tisknout recept (A4)" onClick={onPrint}>
          <PrinterIcon />
        </button>
      </header>
      {original && <small className="recipe-original-title">{original}</small>}
      <small id={hintId} className="print-hint">{PRINT_HINT}</small>
```

- [ ] **Step 4: Implementace – stránka seznamu a košík**

`src/pages/ShoppingListPage.tsx`: `import { useId } from 'react'`, `PRINT_HINT` do importu z `./labels`; `Props` a komponenta:

```tsx
interface Props extends HeadProps {
  groups: ShoppingGroup[]
  /** Tisk A4 seznamu; tlačítko je jen na obrazovce (tiskový strom ho nedostane). */
  onPrint?: () => void
}

/** Nákupní seznam z košíku: podle kategorií obchodu, u položky rozpad po receptech. Bez interakce kromě tlačítka tisku. */
export function ShoppingListPage({ groups, onPrint, ...head }: Props) {
  const hintId = useId()
  return (
    <article className="shopping-page">
      <ShoppingListHead {...head} />
      {onPrint && groups.length > 0 && (
        <div className="print-action">
          <button type="button" className="cart-button" aria-describedby={hintId} onClick={onPrint}>Tisknout nákupní seznam</button>
          <small id={hintId} className="print-action__hint">{PRINT_HINT}</small>
        </div>
      )}
      {groups.length === 0 ? (
```

(zbytek JSX beze změny).

`src/pages/CartPage.tsx`: do `CartPageProps` přidat `onPrintList: () => void` (a do destrukturalizace) a druhé tlačítko nahradit:

```tsx
            <button type="button" className="cart-button" aria-describedby={printNoteId} onClick={onPrintList}>Tisknout jen nákupní seznam</button>
```

- [ ] **Step 5: Implementace – styly a App**

`src/styles/paper.css` – za blok značek (za `.recipe-marks--compact .mark[aria-pressed="false"] { … }`):

```css
/* tisk: ikona vedle značek a nápověda k záhlaví a zápatí (spec §4 [R1]) */
.mark--print { flex: none; }
.print-hint { display: block; margin: 0.15em 0 0; font-family: var(--font-table); font-size: 0.7em; color: var(--ink-soft); }
.print-action { display: flex; flex-wrap: wrap; align-items: center; gap: 0.2rem 0.6rem; margin: 0 0 0.6em; }
.print-action__hint { font-family: var(--font-table); font-size: 0.75em; color: var(--ink-soft); }
```

`src/styles/print.css` – v záloze (`@media print`) rozšířit řádek se skrytím ovládání:

```css
  .book-controls, .bookmark, .book__nav, .page-edge, .page-more, .page-number, .search-overlay, .recipe-marks,
  .mark--print, .print-hint, .print-action, .cart-actions { display: none !important; }
```

`src/App.tsx`: v `RecipeLeft` přidat `onPrint={() => print({ kind: 'recipe', recipeId: recipe.id })}`; v `CartPage` přidat `onPrintList={() => print({ kind: 'list' })}`; v `case 'list'`:

```tsx
          return {
            id: entry.id,
            render: () => (
              <ShoppingListPage groups={shoppingList} people={state.people} historical={historical} dayFactor={state.dayFactor} onPrint={() => print({ kind: 'list' })} />
            ),
          }
```

- [ ] **Step 6: Spustit testy – musí projít**

Run: `npx vitest run src/pages src/styles src/App.test.tsx`
Expected: PASS (stávající test „skupiny v pořadí kategorií obchodu a žádná interakce“ dál platí – bez `onPrint` žádné tlačítko).

- [ ] **Step 7: Ověřit celek a commit**

Run: `npm test && npm run build && npm run lint`

```bash
git add src/pages/icons.tsx src/pages/RecipePage.tsx src/pages/RecipePage.test.tsx src/pages/ShoppingListPage.tsx src/pages/ShoppingListPage.test.tsx src/pages/CartPage.tsx src/pages/CartPage.test.tsx src/styles/paper.css src/styles/print.css src/styles/print.test.ts src/App.tsx src/App.test.tsx
git commit -m "feat(tisk): tlačítka tisku na receptu, nákupním seznamu a v košíku s nápovědou k záhlaví"
```

---

### Task 10: Ruční kontrola tisku do PDF (agent-browser + CDP) a opravy nálezů

**Files:** podle nálezů; zápis do tohoto plánu pod „Nálezy z ruční kontroly“ (na konec souboru). Pomocné soubory jen ve scratchpadu (`…/scratchpad/t10/`), ne v repu.

Implementátor použije skill `agent-browser` (nejdřív `agent-browser skills get core`). Vlastní dev server `npm run dev -- --port <volný port> --strictPort` na pozadí, po skončení zastavit (`agent-browser close`, ukončit vite). Interakce vždy **reálným vstupem** (`agent-browser click`, `fill`/`type`, `press`); `eval` jen na čtení DOM, měření, náhradu `window.print` a vyslání událostí `beforeprint`/`afterprint` (tytéž události posílá prohlížeč, nejde o hit-testing). Před kliknutím na prvek u okraje stránky ověřit `document.elementFromPoint(střed)` === cílový prvek. Zapnout `agent-browser set media light reduced-motion` (rAF v tabu na pozadí stojí). Desktop `set viewport 1390 800`, mobil `390 844` a `320 568`, po změně viewportu `reload`. Na začátku `eval "localStorage.clear()"` + `reload`.

PDF se tiskne vlastním skriptem přes CDP `Page.printToPDF` s `preferCSSPageSize: true` (ruling R12; `agent-browser pdf` tiskne přes Playwright na Letter a `@page size` ignoruje – jednou to ověřit `pdfinfo` a zapsat do „Naměřeno“). PDF číst `pdfinfo`, `pdftotext` a vizuálně nástrojem Read (umí PDF).

- [ ] **Step 1: CDP skript**

```js
// …/scratchpad/t10/print-pdf.mjs – Page.printToPDF přes CDP (velikost stránky z CSS @page, bez záhlaví a zápatí)
// použití: node print-pdf.mjs "$(agent-browser get cdp-url)" <výstup.pdf>
import { writeFileSync } from 'node:fs'

const [wsUrl, out] = process.argv.slice(2)
const ws = new WebSocket(wsUrl)
let seq = 0
const pending = new Map()
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  const p = pending.get(msg.id)
  if (!p) return
  pending.delete(msg.id)
  if (msg.error) p.reject(new Error(msg.error.message))
  else p.resolve(msg.result)
}
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = ++seq
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
  })
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
let sessionId
if (wsUrl.includes('/devtools/browser/')) {
  const { targetInfos } = await send('Target.getTargets')
  const page = targetInfos.find((t) => t.type === 'page' && t.url.startsWith('http://localhost'))
  if (!page) throw new Error('Nenalezena stránka na localhostu')
  ;({ sessionId } = await send('Target.attachToTarget', { targetId: page.targetId, flatten: true }))
}
const { data } = await send('Page.printToPDF', { preferCSSPageSize: true, printBackground: false, displayHeaderFooter: false }, sessionId)
writeFileSync(out, Buffer.from(data, 'base64'))
ws.close()
console.log(`PDF: ${out}`)
```

- [ ] **Step 2: Příprava košíku** – desktop 1390×800: v panelu záložky reálně Děti = 18, Dospělí = 6; do košíku přidat (ikona košíku na stránce receptu) „Míchaná vejce“, „Hovězí guláš“, „Špagety s máslem a sýrem“ a „Koláče (sladké pečivo)“ (`#/recept/kolace` – nejdelší postup, 14 kroků); v košíku u Míchaných vajec „Více“ → ×2.

- [ ] **Step 3: Spouští `Page.printToPDF` události tisku?** – `#/recept/hovezi-gulas`, bez přípravy spustit skript → `recept-bez-udalosti.pdf`; `pdftotext recept-bez-udalosti.pdf - | grep -c "Na 1 osobu"`. Výsledek (> 0 = Chrome pošle `beforeprint`, 0 = ne) zapsat do „Naměřeno“. Je-li 0, v dalších krocích „Ctrl+P“ = `eval "dispatchEvent(new Event('beforeprint'))"` → skript → `eval "dispatchEvent(new Event('afterprint'))"`.

- [ ] **Step 4: Recept A4 (Ctrl+P)** – `#/recept/hovezi-gulas`, „Ctrl+P“ podle kroku 3 → `recept.pdf`. Ověřit: `pdfinfo` → `Page size: 595.28 x 841.89 pts (A4)`; `pdftotext -layout recept.pdf -` obsahuje „Hovězí guláš“, „Hungarian Goulash · Armed Forces Recipe Service, 2003“, „Pro 24 osob (18 dětí + 6 dospělých)“, sloupce „Pro 24 osob“ a „Na 1 osobu“, všech 5 kroků postupu (1.–5.), „Poznámka k modernizaci“, patičku „Zdroj: Armed Forces Recipe Service, 2003, s. 808 (PDF)“; **neobsahuje** „Košík:“, „pokračuje“, „Tisknout“, „Strana“, URL ani datum záhlaví prohlížeče. Okraj 15 mm: `pdftotext -bbox -f 1 -l 1 recept.pdf - | grep -m1 '<word'` → `xMin` ≈ 42,5 pt (± 3). Read PDF: bez papíru, stínů a ovládání, tabulka čitelná. Totéž z pravé poloviny (postup) – výsledek je tentýž recept.

- [ ] **Step 5: Recept tlačítkem** – `eval "window.print = () => {}"`, reálný klik na ikonu „Tisknout recept“ (`elementFromPoint` ve středu ikony = tlačítko); `eval "document.documentElement.dataset.print"` → `recipe`; s připojeným tiskovým stromem `eval "[document.documentElement.scrollWidth === innerWidth, document.documentElement.scrollHeight === innerHeight, getComputedStyle(document.querySelector('.print-root')).visibility]"` → `[true, true, "hidden"]`, kniha jde dál listovat (`press ArrowRight`). PDF skriptem → shodné s krokem 4. `eval "dispatchEvent(new Event('afterprint'))"` → `data-print` zmizí, `.print-root` není v DOM. Nápověda „V dialogu tisku vypněte „Záhlaví a zápatí“.“ je pod názvem vidět (screenshot).

- [ ] **Step 6: Nákupní seznam** – `#/seznam` „Ctrl+P“ → `seznam.pdf`: A4, „Nákupní seznam“, „Pro 24 osob (18 dětí + 6 dospělých) · <dnešní datum>“, kategorie v pořadí `CATEGORIES`, „Vejce“ s rozpadem po receptech (vejce z ×2), bez „Tisknout nákupní seznam“. Totéž reálným klikem na „Tisknout nákupní seznam“ (stub `window.print`) a v `#/kosik` na „Tisknout jen nákupní seznam“ (hash zůstane `#/kosik`, `data-print` = `list`); Ctrl+P na `#/kosik` → seznam.

- [ ] **Step 7: Brožurka** – `#/kosik`, `eval "window.print = () => {}"`, reálný klik na „Tisknout brožurku“. Změřit:
  - `eval "[...document.querySelectorAll('.booklet-sheet')].map(s => [...s.querySelectorAll('.booklet-page')].map(p => p.dataset.page).join(','))"` → počet stran N (největší číslo) je násobek 4, první list `"N,1"`, druhý `"2,N-1"`, každá strana právě jednou;
  - přetečení: `eval "[...document.querySelectorAll('.booklet-page__body')].map(b => b.scrollHeight - b.clientHeight)"` → všechny ≤ 0; Koláče zabírají 2 strany (druhá začíná krokem, ne uprostřed kroku), žádný text uříznutý;
  - `brozurka.pdf` skriptem: `pdfinfo` → `Page size: 841.89 x 595.28 pts` (A4 na šířku) a `Pages` = N / 2 (žádný prázdný list navíc); pravá polovina 1. stránky PDF `pdftotext -f 1 -l 1 -x 421 -y 0 -W 421 -H 595 brozurka.pdf -` obsahuje „Kuchařka pro tábory, výlety a hubené měsíce“, „Pro 24 osob (18 dětí + 6 dospělých)“, datum a „4 recepty · nákupní seznam na konci“; levá polovina 2. stránky PDF (`-f 2 -l 2 -x 0 -W 421`) obsahuje „Míchaná vejce“, „Pro 24 osob ×2“ a číslo strany 2; poslední obsahové strany = „Nákupní seznam“; prázdné strany do násobku 4 jsou bez čísla. Read PDF: dvě A5 strany vedle sebe, čísla dole uprostřed.
  - Ruční zkouška skládání (zapsat): z pořadí listů ověřit, že po oboustranném tisku s překlápěním po krátké straně a přeložení jdou strany 1, 2, 3 … N za sebou.
  - `eval "dispatchEvent(new Event('afterprint'))"` → strom zmizí.

- [ ] **Step 8: Obsah** – Ctrl+P na `#/`, `#/obsah`, `#/kapitola/polevky`, `#/nastaveni` → `data-print` = `toc`; `obsah.pdf`: A4, „Obsah“, všech 9 kapitol, 78 receptů (`pdftotext obsah.pdf - | grep -c …` pro několik názvů, ruční kontrola čísel stran 3 receptů proti `layout`/obsahu na obrazovce), dva sloupce, žádné filtry ani ikony.

- [ ] **Step 9: Mobil 390×844 a 320×568** – `#/recept/michana-vejce`: ikona tisku i nápověda vidět, `elementFromPoint` ve středu ikony = tlačítko, název receptu není zúžený pod 100 px (`eval "document.querySelector('.book__slot .recipe-head h2').getBoundingClientRect().width"`), `scrollWidth === innerWidth`; „Ctrl+P“ → `data-print` = `recipe` → `recept-mobil.pdf` = A4 recept (shodný obsah jako krok 4). Pak šipkou na postup (pravá polovina) → „Ctrl+P“ → stále recept. `#/seznam` a `#/kosik` při 320: tlačítka tisku se zalomí, žádný vodorovný scroll.

- [ ] **Step 10: Opravy a zápis** – každý nález opravit s testem tam, kde to jde (CSS-only opravy ověřit PDF/screenshotem), a zapsat pod „Nálezy z ruční kontroly“ ve formátu z plánu fáze 5 (číslo, nález, soubor, oprava, ověření) + sekce „Odloženo (s důvodem)“ a „Naměřeno“ (výsledek kroku 3, `agent-browser pdf` vs. CDP, rozměry a počty stran PDF, přetečení stran brožurky, okraj 15 mm). Nakonec `npm test && npm run build && npm run lint && npm run validate`.

- [ ] **Step 11: Commit**

```bash
git add <změněné soubory> docs/superpowers/plans/2026-10-15-phase6-print.md
git commit -m "fix(tisk): nálezy z ruční kontroly fáze 6"
```

## Pokrytí specu (self-review)

| Požadavek | Task |
|---|---|
| §4 Ctrl+P podle stránky: recept (A4, bez knižních efektů) | 2, 4, 6 |
| §4 Recept: množství na 1 osobu i na N osob, hlavička „Pro 24 osob (18 dětí + 6 dospělých)“ | 3, 4 |
| §2 Ctrl+P tiskne celý recept, ne jen viditelnou část (obě poloviny dvoustrany) | 2 (pravá polovina), 4, 6 |
| §4 Nákupní seznam (A4, podle kategorií) s rozpadem a hlavičkou osob + datum, bez interakce | 5, 6, 9 |
| §4 Jinde: obsah; celá kniha ne | 2, 5, 6 (R4) |
| §4 [R1] Tlačítko tisku na stránce (recept, košík) + na seznamu | 8, 9 |
| §4 [R1] Nápověda k vypnutí záhlaví/zápatí u tlačítka, bez modálu | 3, 8, 9 |
| §4 [R1] `@page { margin }` pro čistý tisk (A4, 15 mm) | 6 |
| §4 [R1] Brožurka A5 na A4, 2 strany na list, pořadí pro přeložení a sešití | 1, 7, 8 |
| §4 [R1] Titulní strana (název, datum, počet osob), recepty přepočtené (P × násobek), seznam na konci, bez obsahu | 7, 8 |
| Recept delší než A5 přeteče na další stranu, ne ořez; prázdné strany do násobku 4 | 1, 8, 10 |
| Oboustranný tisk: instrukce „překlápět po krátké straně“ | 3, 8 |
| §3 Košík: „Tisknout brožurku“ a „Tisknout jen nákupní seznam“ (dosud zástupně) | 8, 9 |
| §8 bod 6 | 1–10 |
| Ruční kontrola PDF (recept, seznam, brožurka, obsah, mobil 390) | 10 |

Mimo fázi 6: tisk brožurky pro tiskárny bez duplexu (backlog); volný text akce na titulní straně (nové pole stavu – neřešeno, R11); export/import a režim ukládání (fáze 7); vlastní recepty (fáze 8).

## Nálezy z ruční kontroly

Kontrola v prohlížeči (agent-browser, reálný vstup: click, press, scroll; `eval` jen na čtení, měření a události `afterprint`/`beforeprint`), PDF přes CDP `Page.printToPDF` (`preferCSSPageSize`), viewporty 1390×800, 390×844, 320×568. Podrobnosti: `.superpowers/sdd/2026-10-15-phase6-print/task-10-report.md`.

| # | Nález | Soubor | Oprava | Ověření |
|---|---|---|---|---|
| 1 | Brožurka měří výšky bloků při kliknutí na tlačítko, ale řezy písem se načítají líně: po čerstvém načtení `#/kosik` nebyla načtená kurzíva EB Garamond (používá ji podtitul receptu v brožurce) a načetla se až po kliknutí (načtených řezů 10 → 12). Měření tak mohlo proběhnout záložním písmem a strany by se rozdělily jinak než při tisku. | `src/print/fonts.ts` (nový), `src/print/usePrintJob.ts` | `preloadPrintFonts()` při připojení tiskového hooku stáhne všech 6 řezů (včetně latin-ext znaků). | `src/print/fonts.test.ts`, test v `usePrintJob.test.tsx`; po reloadu `#/kosik` je před kliknutím načteno 12 z 14 řezů (zbylé 2 = Caveat), brožurka po kliknutí `12,1 2,11 10,3 4,9 8,5 6,7`. |
| 2 | Při 320 px zúžily čtyři ikony v hlavičce receptu název „Míchaná vejce“ na 98,3 px (zadání: ≥ 100 px). | `src/styles/paper.css` | `@media (max-width: 340px)`: `.recipe-head` mezera 0,3 rem, `.recipe-marks` mezera 0,1 rem. | Změřeno na 320 px: název 109,5 px, `scrollWidth === innerWidth`; ikony drží plochu 33,6 px. |

Všechny ostatní scénáře kroků 3–9 vyšly bez nálezu (viz Naměřeno).

### Odloženo (s důvodem)

- Sloupec „Na 1 osobu“ u řádků „podle nádoby“ (voda na nudle 650 ml, sůl 4 g u 24 osob) ukazuje stejné hodnoty jako obrazovka (zdědilo se z fáze 3/5, tisk jen používá `IngredientTable`); mimo rozsah tisku, k posouzení v samostatném úkolu.
- Tištěný obsah: nadpis kapitoly „Přílohy a zelenina“ je na konci 1. sloupce jen s jednou položkou. Čistě kosmetické, obsah se vejde na jednu stranu A4.
- Brožurka: seznam má dvě strany (8–9) a poslední 3 strany jsou prázdné (doplnění do násobku 4) – dle návrhu.
- Velikost stránky v PDF z Chrome je `594.96 x 841.92 pts` místo `595.28 x 841.89` (zaokrouhlení Chrome na 1/100 palce); pdfinfo to přesto hlásí jako A4.

### Naměřeno

- Krok 3: `Page.printToPDF` spouští `beforeprint` (recept bez přípravy: „Na 1 osobu“ nalezeno 1×) → v dalších krocích „Ctrl+P“ = přímo skript. `agent-browser pdf` (Playwright) tiskne na Letter: `612 x 792 pts (letter)`, CDP skript A4 `594.96 x 841.92 pts (A4)` (ruling R12 potvrzen).
- A4 recept Hovězí guláš: 1 strana, okraj levého textu `xMin` = 42,75 pt (15 mm = 42,5), bez „Košík:“, „pokračuje“, „Tisknout“, „Strana“, URL; PDF z tlačítka, z Ctrl+P a z mobilu (390, levá i pravá polovina) mají shodný text. Koláče (14 kroků) = 2 strany A4, zlom mezi kroky 14 a poznámkou. Po `afterprint` `data-print` zmizí a `.print-root` není v DOM; hash i strana beze změny (Koláče, strana 143, režim `book--spread`).
- Seznam (24 osob, 4 recepty, Míchaná vejce ×2): A4, 1 strana, „Pro 24 osob (18 dětí + 6 dospělých) · 15. 10. 2026“, kategorie v pořadí `CATEGORIES`, Vejce 76 ks („Míchaná vejce 74 ks · Koláče 2 ks“), bez „Tisknout“; tlačítko na `#/seznam`, „Tisknout jen nákupní seznam“ a Ctrl+P na `#/kosik` dávají shodný text, hash zůstává, `data-print` = `list`.
- Brožurka: N = 12 stran, 6 listů `12,1 | 2,11 | 10,3 | 4,9 | 8,5 | 6,7`, každá strana právě jednou, přetečení všech těl stran `0` (9 neprázdných), PDF `841.92 x 594.96 pts`, 6 stran PDF (= N/2), bez prázdného listu navíc; titul (pravá polovina 1. stránky) „Kuchařka pro tábory…“, „Pro 24 osob (18 dětí + 6 dospělých)“, „15. 10. 2026“, „4 recepty · nákupní seznam na konci“; strana 2 Míchaná vejce „Pro 24 osob ×2“ (74 ks) s číslem 2; Hovězí guláš 3–4 (krok 5 a poznámka na straně 4), Koláče 5–6 (strana 6 začíná krokem 6), seznam 8–9, prázdné 1, 10–12 bez čísla. Skládání: po oboustranném tisku s překlápěním po krátké straně a přeložení jdou listy `[N−2i, 2i+1]` / `[2i+2, N−2i−1]` = 12,1 / 2,11 / 10,3 / 4,9 / 8,5 / 6,7 → strany 1…12 za sebou. Při 320 px stejný výsledek (PDF shodné velikosti, přetečení 0).
- Obsah: `#/`, `#/obsah`, `#/kapitola/polevky`, `#/nastaveni` dávají shodný PDF text (`data-print` = `toc`), A4, 1 strana, 9 kapitol + 78 receptů (87 čísel stran), dva sloupce, čísla Hovězí guláš 41, Míchaná vejce 151, Koláče 143 souhlasí s knihou.
- Mobil: 390×844 a 320×568: ikona tisku `elementFromPoint` = tlačítko, nápověda vidět, `scrollWidth === innerWidth`, `scrollHeight === innerHeight` i s připojeným tiskovým stromem (recept, seznam, brožurka; `.print-root` `visibility: hidden`); tlačítka tisku v košíku se na 320 zalomí (dva řádky, 129 a 186 px), po scrollu v obsahu stránky jdou kliknout reálně.
- Fonty a `afterprint`: viz nález 1; po `beforeprint`/`afterprint` se kniha vrátí do původního stavu (hash, režim, strana, `main` viditelný).
