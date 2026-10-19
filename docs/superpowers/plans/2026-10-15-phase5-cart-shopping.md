# Fáze 5: Košík, přepočty, nákupní seznam a nutrice – implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jeden košík receptů s násobky, přepočet surovin na aktuální počet osob (osoby-ekvivalent × náročnost dne), sloučený nákupní seznam podle kategorií obchodu s rozpadem po receptech, orientační nutrice na porci a v košíku, záložka (stužka) s osobami a skokem do košíku a tiráž s koeficientem dítěte, cílem kcal a přepínačem historických surovin.

**Architecture:** Veškerý výpočet je v čistých funkcích v `src/domain/` (`portions.ts` – P, k, varianta suroviny; `shopping.ts` – převod jednotek, sloučení, seskupení; `nutrition.ts` – jedlá část, makra na porci a v košíku), které znovu používají `scaleAmount`/`scaleLine`/`roundAmount`/`toGrams` ze `src/domain/scaling.ts`. Uživatelský stav (`src/state/userState.ts`) dostane čisté operace košíku/osob/nastavení s mezemi a sanitizaci při načtení; `UserStateProvider` je vystaví. `buildLayout()` přidá stránku košíku (vlevo) před nákupní seznam (vpravo); `App.tsx` jen skládá stránky (`CartPage`, `ShoppingListPage`, `SettingsPage`), záložku `Bookmark` a předává `Portions` stránce receptu.

**Tech Stack:** Vite 8, React 19, TypeScript 6, zod 4, Vitest 4 + Testing Library (jsdom, `css: false`, `globals: true`), oxlint. Bez UI knihovny, bez nové npm závislosti. Ruční kontrola skillem `agent-browser`.

**Spec:** `docs/superpowers/specs/2026-10-14-cookbook-design.md` – §3 Košík a přepočty (celý, včetně [R1]), §5.2 Uživatelský stav, §2 (záložka, hash `#/kosik` a `#/seznam`, pořadí stránek: košík před nákupním seznamem na konci knihy, tiráž = nastavení), §8 bod 5. Podněty: `docs/superpowers/specs/2026-10-14-phase5-backlog-notes.md`. Tisk (tlačítka, A4, brožurka) je fáze 6, export/import a režim ukládání fáze 7 – sem nepatří.

## Global Constraints

- Čeština s diakritikou v UI, identifikátory anglicky. Bez UI knihovny. Žádný server. Žádná nová npm závislost.
- **Pořadí stránek** (spec §2, aktualizace pro fázi 5): obal (index 0, vpravo) → „O této knize“ (indexy 1–2) → obsah (`tocPageCount(recipes)` stránek od indexu 3) → kapitoly v pořadí `CHAPTERS` → **košík** (`kind: 'cart'`, id `cart`) → **nákupní seznam** (`kind: 'list'`, id `list`) → tiráž/nastavení (`kind: 'settings'`, id `settings`, poslední).
- **Parita (rozhodnutí fáze 5):** úvod kapitoly je vždy na pravé straně (sudý index), recept je dvoustrana (levá lichá + pravá sudá). **Košík je vždy na levé straně (lichý index) a nákupní seznam hned za ním na pravé (sudý index)** – na desktopu tvoří košík + seznam jednu dvoustranu; tiráž následuje (lichý index, sama vlevo). Prázdná stránka (`blank`) se vkládá jen bezprostředně před úvod kapitoly nebo před košík. Pravidlo „seznam na pravé straně“ z fáze 4 platí dál.
- Hash routy: `#/recept/<id>`, `#/kapitola/<id>`, `#/obsah`, `#/kosik` (**od fáze 5 má stránku**), `#/seznam`, `#/nastaveni`; prázdný hash a `#/` = obal. Listování mění hash přes `history.replaceState`, skok odkazem (obsah, hledání, domů, záložka, košík) přes `history.pushState`.
- **Přepočet (spec §3):** `P = (adults + children × childCoef) × dayFactor` (`personEquivalent` ze `src/domain/scaling.ts`); `k = P × multiplier / baseServings`; množství `amount × k^p` podle třídy (`SCALING_EXPONENT`; přepsání `line.scaling` má přednost); zaokrouhlení výhradně přes existující `roundAmount`/`scaleLine` (g/ml na 1 do 20, 5 do 200, 10 nad; ks/lžíce/hrnek nahoru na 0,5; pod 1 g „špetka“). Žádná druhá implementace škálování ani zaokrouhlení.
- Stránka receptu ukazuje množství pro aktuální `P` s násobkem 1 (násobek ×2… platí jen v košíku a seznamu); šedý sloupec „Na osobu“ = jedna dospělá osoba: `k₁ = dayFactor / baseServings`. Hlavička sloupce „Pro N osob“ (N = adults + children, český tvar 1 osobu / 2–4 osoby / 5+ osob), pod tabulkou „18 dětí + 6 dospělých · přepočteno na 20,4 porce“.
- **Varianta suroviny:** `settings.historicalIngredients` (výchozí `false` = modernizované) řídí tabulku receptu, nákupní seznam i nutrici stejnou funkcí `effectiveLine(line, historical)` – historicky se použije `original` (ingredientId, amount, unit), přepsání `scaling`, `group`, `note` zůstávají. U řádku s `original` drobná poznámka: modernizovaně „původně: <název> <množství>“, historicky „dnes: <název> <množství>“.
- **Nákupní seznam:** převod každého řádku na základní jednotku `g`/`ml`/`ks` (`ml` u lžíce/lžičky/hrnku, má-li surovina `densityGPerMl`, jinak `g`; špetka = `PINCH_GRAMS` g); sloučení podle `ingredientId` napříč recepty; když se jednotky téže suroviny liší, vše na gramy (`ml × densityGPerMl ?? 1`, `ks × units.ks`); součet se zaokrouhlí z nezaokrouhlených hodnot přes `roundAmount`; rozpad „z kterých receptů kolik“ = jeden záznam na recept (víc řádků téhož receptu se sečte). Skupiny v pořadí `CATEGORIES` ze `src/domain/schema.ts`, položky podle názvu (`localeCompare(…, 'cs')`). Surovina `voda` se nekupuje (`NOT_PURCHASED`) – v seznamu není, na stránce receptu zůstává. Řádek se třídou `vessel` má v tabulce i v rozpadu poznámku „(podle nádoby)“. Seznam je jen k tisku: žádná tlačítka, inputy ani checkboxy.
- **Nutrice (orientační, označeno „orientačně“):** kcal/bílkoviny/sacharidy/tuky na porci = součet řádků / `baseServings`, lineárně (bez exponentů), ze `nutritionPer100g`; jedlá část podle rozhodnutí R1 níže; řádky třídy `vessel` se nezapočítávají. V košíku na dospělého `Σ porce × multiplier × dayFactor`; cíl `(settings.kcalTarget ?? 2300) × dayFactor`; „pokrývá cca X % denního příjmu“, `X = round(kcal / cíl × 100)`.
- Uživatelský stav `UserState` (spec §5.2) beze změny tvaru a klíče (`kucharka.userState.v1`, `version: 1`): `people {adults, children}`, `dayFactor`, `cart [{recipeId, multiplier}]`, `favorites`, `cooked`, `customRecipes`, `settings {childCoef, kcalTarget?, historicalIngredients}`. **Meze** (vynucené v operacích i při načtení): `adults`, `children` celá čísla 0–500 a součet ≥ 1 (jinak `adults = 1`); `dayFactor` 0,8–1,3 po 0,05 (výchozí 1); `multiplier` celé číslo 1–10; `childCoef` 0,3–1,0 po 0,05 (výchozí 0,8); `kcalTarget` 1000–6000 po 50 nebo nepřítomný (= výchozí 2300); duplicitní `recipeId` v košíku se při načtení sloučí (první vyhrává).
- Soubory v `src/domain/` importují jen relativně (`./scaling`, `./types`) – `tsconfig.scripts.json` je kompiluje bez aliasu `@` a validátor z nich importuje. Doménové testy používají syntetické suroviny/recepty, ne `loadContent()` (to stojí na `import.meta.glob`).
- **Záložka:** pevný prvek vlevo nahoře (`.bookmark`, `position: fixed; top: 0; left: 0.9rem`, mimo stránky, viditelný z každé strany na desktopu i mobilu), papírová stužka s ikonou košíku, počtem receptů a počtem osob; po kliknutí panel: dospělí, děti, náročnost dne (`input type="range"` 0,8–1,3, krok 0,05), „Otevřít košík“. Escape a klik mimo panel ho zavřou. Ovládání knihy (domů, celá obrazovka, lupa) zůstává vpravo nahoře beze změny.
- **Tisk je fáze 6:** na stránce košíku „Tisknout brožurku“ je `disabled` s viditelnou poznámkou, „Tisknout jen nákupní seznam“ jen skočí na stránku seznamu (`#/seznam`). `print.css` skrývá `.bookmark`.
- Tiráž = nastavení: koeficient dítěte, denní cíl kcal (s návratem na výchozí), přepínač historických surovin; text „Export a import dat a režim ukládání přibudou ve fázi 7.“
- Styl stránky podle epochy (`era--…`) a typografie beze změny; nové stránky (košík, seznam, tiráž) jsou `tone: 'aged'` bez epochy, tabulkové údaje písmem `var(--font-table)`.
- Obsah bez ořezu: ikona košíku v řádku obsahu zúží místo pro název, proto `TOC_LONG_TITLE_CHARS` klesne z 22 na 18 (Task 7); při 1390×800 a 390×844 musí platit `scrollHeight <= clientHeight` pro `.page-content` každé stránky obsahu (měří Task 12).
- Přístupnost: ikony `aria-hidden`, přístupné jméno nese tlačítko; přepínací tlačítka `aria-pressed`; neaktivní stránky `inert` (beze změny); id prvků přes `useId()` (stránka se při otáčení může vykreslit dvakrát).
- Mobil: žádný vodorovný scroll (`document.documentElement.scrollWidth === window.innerWidth` při 390 i 320 px, i s otevřeným panelem záložky); záložka nepřekrývá `.book-controls` ani stránku.
- Testy Vitest + Testing Library pro každou čistou funkci a komponentu; po každém tasku `npm test`, `npm run build`, `npm run lint` čisté (u tasků 3 a 12 i `npm run validate`). Commit po každém tasku, zpráva česky s diakritikou, explicitní `git add <soubory>` (nikdy `-A`).

## Review Focus

1. **Košík z localStorage s receptem, který už neexistuje, nebo s poškozeným násobkem** (0, −2, 2,6, duplicitní `recipeId`) – košík, seznam ani nutrice nesmí spadnout ani ukázat NaN: neznámý recept se přeskočí, násobek se upne na 1–10, duplicity se sloučí. Testy: Task 2 (`buildShoppingList` přeskočí), Task 3 (`cartMacrosPerAdult` přeskočí), Task 4 (sanitizace při načtení), Task 9 (neznámý recept se nevykreslí).
2. **Nulový nebo smazaný počet osob** (0 dospělých + 0 dětí, prázdné pole při psaní, 600) – `P` nesmí být 0 (všechna množství by byla „špetka“ a pokrytí 0 %): součet osob ≥ 1, celá čísla 0–500, prázdné pole se nepotvrdí. Testy: Task 4 (`setPeople`), Task 8 (`NumberField` nepotvrdí prázdnou hodnotu).
3. **Stejná surovina v různých jednotkách** (ks + g, lžíce + ml, hrnek + g; i dva řádky soli v jednom receptu) – jeden řádek seznamu se správným převodem a jedním záznamem rozpadu na recept, ne dva řádky ani NaN. Testy v Task 2.
4. **Historické suroviny u řádku, jehož `original` je jiná surovina v jiné jednotce a kategorii** (vejce 1 ks ↔ vejce mražená 50 g) – tabulka, seznam i nutrice musí použít tutéž variantu a poznámka ukazuje tu druhou. Testy: Task 1 (`effectiveLine`), Task 2 (kategorie `mrazene`), Task 3 (kcal), Task 6 (poznámka „původně“/„dnes“), Task 11 (přepínač v aplikaci).
5. **Velké skupiny** (500 osob × ×10 = tisíce gramů) – množství se ukáže čitelně v kg/l, ne „125000 g“; drobné množství po sečtení pod 1 g zůstane „špetka“. Testy: Task 6 (`formatAmount` ≥ 1000), Task 2 (součet špetky).

## Rozhodnutí fáze 5 (rulings)

- **R1 – `ediblePortion` (backlog bod 1, ve fázi 5 ANO):** data: `units` jsou gramy jedlé části (spec §5.1), gramy v receptech jsou podle pravidla skillu recipe-digitize sloupec AFRS *Weight* = jedlá část (EP); výjimkou jsou suroviny s kostí/odpadem vážené v nákupní hmotnosti (`cele-kure` „množství v g včetně kostí“, `jehneci-maso`, `uzene-koleno`, `veprova-plec`, kuřecí díly). Pravidlo: `edibleGrams` násobí `ediblePortion` **jen u řádků v g/ml surovin kategorie `maso`, `ryby`, `uzeniny`**; kusové a lžícové jednotky ani ostatní kategorie se nekrátí (zelenina v g je už očištěná). Validátor (`npm run validate`) přejde na stejnou funkci `recipeMacrosPerServing`, takže kcal varování a UI počítají shodně (kure-na-lovecky ~827 → ~590 kcal/porci). Nákupní seznam ukazuje množství z receptu (bez přepočtu na nákupní hmotnost zeleniny – mimo rozsah).
- **R2 – koncentráty a `baseServings` (backlog bod 2, ve fázi 5 NE):** `baseServings` je ve schématu `z.literal(4)`; změna = migrace schématu skriptem (spec §5.1) mimo rozsah fáze 5. Kompenzace v UI: stránka košíku ukazuje u každého receptu kcal na porci, takže džem/sirup (≈ 670 kcal/porci) je v součtu vidět. Zůstává v backlog poznámkách.
- **R3 – užší kritérium `levne` (backlog bod 3, ve fázi 5 NE):** vyžaduje odhad Kč/porci, tj. ceny surovin – spec §7 má ceny v backlogu. Filtr `levne` zůstává ruční tag.
- **R4 – voda se nekupuje:** surovina `voda` není v nákupním seznamu (ani slévaná, ani do pokrmu); sůl/olej třídy `vessel` v seznamu jsou s poznámkou „(podle nádoby)“.
- **R5 – nutrice bez `vessel` řádků a lineárně:** tuk na smažení a voda/sůl do slévané vody se do nutrice nepočítají; nutrice na porci se nemění s počtem osob (exponenty škálování jsou kuchařská korekce, ne změna porce).
- **R6 – „na osobu-ekvivalent“ v košíku = na dospělého:** dospělý sní `multiplier × dayFactor` porcí každého receptu; porovnává se s cílem `kcalTarget × dayFactor`, takže procento nezávisí na počtu dětí ani na náročnosti.
- **R7 – tlačítka tisku:** „Tisknout brožurku“ `disabled` + poznámka „Tisk brožurky a tisk tlačítkem přibudou ve fázi 6…“; „Tisknout jen nákupní seznam“ skočí na `#/seznam` (Ctrl+P tam vytiskne viditelné stránky).
- **R8 – jednotky v seznamu a v tabulce:** množství ≥ 1000 g/ml se zobrazí v kg/l (`formatAmount`), zaokrouhlení zůstává v `roundAmount`.
- **R9 – meze vstupů:** viz Global Constraints („Meze“); `setPeople` s 0 + 0 nastaví 1 dospělého.

## Struktura souborů

| Soubor | Odpovědnost | Task |
|---|---|---|
| `src/domain/portions.ts` (nový) | `People`, `Portions`, `CartLine`, `persons`, `recipeScale`, `onePersonScale`, `effectiveLine`, meze náročnosti, `DEFAULT_KCAL_TARGET` | 1 |
| `src/domain/shopping.ts` (nový) | převod na g/ml/ks, sloučení, seskupení podle kategorie, rozpad po receptech | 2 |
| `src/domain/nutrition.ts` (nový) | jedlá část, makra řádku/porce/košíku, cíl kcal, pokrytí | 3 |
| `scripts/validate.ts`, `scripts/validate.test.ts` | kcal varování přes `recipeMacrosPerServing` | 3 |
| `src/state/userState.ts`, `src/state/UserStateProvider.tsx` | operace košíku/osob/nastavení s mezemi, sanitizace při načtení | 4 |
| `src/content/buildPages.ts`, `src/app/route.ts` | stránka košíku v layoutu, `cartIndex`, routa `cart` | 5 |
| `src/pages/labels.ts` | tvary podle počtu, popis osob, desetinná čísla, kg/l, makra, kategorie | 6, 10 |
| `src/pages/IngredientTable.tsx`, `src/pages/NutritionFacts.tsx` (nový), `src/pages/RecipePage.tsx` | tabulka pro aktuální P, varianta suroviny, „podle nádoby“, nutrice na porci | 6 |
| `src/pages/icons.tsx`, `src/pages/RecipeMarks.tsx`, `src/pages/TocPages.tsx`, `src/content/search.ts` | ikona a tlačítko „Do košíku“ na receptu i v obsahu, kapacita obsahu | 7 |
| `src/pages/NumberField.tsx` (nový), `src/app/Bookmark.tsx` (nový) | číselné pole s rozpracovanou hodnotou, záložka | 8 |
| `src/pages/CartPage.tsx` (nový) | stránka košíku | 9 |
| `src/pages/ShoppingListPage.tsx` (nový) | stránka nákupního seznamu | 10 |
| `src/pages/SettingsPage.tsx` (nový) | tiráž = nastavení | 11 |
| `src/styles/paper.css`, `src/styles/print.css` | styly nových prvků, skrytí záložky v tisku | 6–11 |
| `src/App.tsx`, `src/App.test.tsx` | zapojení | 5–11 |

---

### Task 1: Osoby-ekvivalent, faktor receptu a varianta suroviny

**Files:**
- Create: `src/domain/portions.ts`, `src/domain/portions.test.ts`

**Interfaces:**
- Consumes: `personEquivalent(adults, children, childCoef, dayFactor)` ze `src/domain/scaling.ts`; typ `IngredientLine` ze `src/domain/types.ts`.
- Produces:
```ts
export const DAY_FACTOR_MIN = 0.8
export const DAY_FACTOR_MAX = 1.3
export const DAY_FACTOR_STEP = 0.05
export const DEFAULT_KCAL_TARGET = 2300
export interface People { adults: number; children: number }
export interface Portions { people: People; childCoef: number; dayFactor: number }
export interface CartLine { recipeId: string; multiplier: number }
export function persons(p: Portions): number
export function recipeScale(P: number, multiplier: number, baseServings: number): number
export function onePersonScale(p: Portions, baseServings: number): number
export function effectiveLine(line: IngredientLine, historical: boolean): IngredientLine
```

- [ ] **Step 1: Napsat failing testy**

```ts
// src/domain/portions.test.ts
import { DAY_FACTOR_MAX, DAY_FACTOR_MIN, DAY_FACTOR_STEP, DEFAULT_KCAL_TARGET, effectiveLine, onePersonScale, persons, recipeScale } from './portions'
import type { IngredientLine } from './types'

const portions = (adults: number, children: number, dayFactor = 1, childCoef = 0.8) => ({ people: { adults, children }, childCoef, dayFactor })

describe('persons', () => {
  test('18 dětí + 6 dospělých při 0,8 = 20,4', () => expect(persons(portions(6, 18))).toBeCloseTo(20.4))
  test('náročnost dne násobí', () => expect(persons(portions(2, 0, 1.25))).toBeCloseTo(2.5))
  test('vlastní koeficient dítěte', () => expect(persons(portions(0, 10, 1, 0.5))).toBeCloseTo(5))
})

describe('recipeScale', () => {
  test('k = P × násobek / baseServings', () => expect(recipeScale(20.4, 2, 4)).toBeCloseTo(10.2))
  test('4 osoby a ×1 = 1', () => expect(recipeScale(4, 1, 4)).toBe(1))
  test('jedna dospělá osoba při náročnosti 1,2 = 0,3', () => expect(onePersonScale(portions(6, 18, 1.2), 4)).toBeCloseTo(0.3))
})

test('meze náročnosti a výchozí cíl kcal ze specu', () => {
  expect([DAY_FACTOR_MIN, DAY_FACTOR_MAX, DAY_FACTOR_STEP]).toEqual([0.8, 1.3, 0.05])
  expect(DEFAULT_KCAL_TARGET).toBe(2300)
})

describe('effectiveLine', () => {
  const line: IngredientLine = {
    ingredientId: 'vejce', amount: 3.9, unit: 'ks', group: 'Těsto',
    original: { ingredientId: 'vejce-mrazena', amount: 195, unit: 'g' },
  }
  test('modernizovaně vrátí tentýž řádek', () => expect(effectiveLine(line, false)).toBe(line))
  test('historicky použije original a zachová skupinu', () =>
    expect(effectiveLine(line, true)).toEqual({ ingredientId: 'vejce-mrazena', amount: 195, unit: 'g', group: 'Těsto' }))
  test('řádek bez original zůstane i historicky', () => {
    const plain: IngredientLine = { ingredientId: 'sul', amount: 2, unit: 'g' }
    expect(effectiveLine(plain, true)).toBe(plain)
  })
  test('přepsání třídy vessel zůstane i u historické varianty', () =>
    expect(effectiveLine({ ...line, scaling: 'vessel' }, true).scaling).toBe('vessel'))
})
```

- [ ] **Step 2: Spustit test a ověřit, že selže**

Run: `npx vitest run src/domain/portions.test.ts`
Expected: FAIL – `Failed to resolve import "./portions"`

- [ ] **Step 3: Implementace**

```ts
// src/domain/portions.ts
import { personEquivalent } from './scaling'
import type { IngredientLine } from './types'

/** Náročnost dne (posuvník v záložce, spec §3). */
export const DAY_FACTOR_MIN = 0.8
export const DAY_FACTOR_MAX = 1.3
export const DAY_FACTOR_STEP = 0.05
/** Výchozí denní cíl dospělého při náročnosti 1,0 (spec §3). */
export const DEFAULT_KCAL_TARGET = 2300

export interface People { adults: number; children: number }

/** Vstupy přepočtu ze stavu uživatele (záložka + tiráž). */
export interface Portions { people: People; childCoef: number; dayFactor: number }

/** Položka košíku (shodná s `UserState.cart`). */
export interface CartLine { recipeId: string; multiplier: number }

/** Osoby-ekvivalent P = (dospělí + děti × koeficient dítěte) × náročnost dne. */
export function persons(p: Portions): number {
  return personEquivalent(p.people.adults, p.people.children, p.childCoef, p.dayFactor)
}

/** Škálovací faktor receptu k = P × násobek / baseServings. */
export function recipeScale(P: number, multiplier: number, baseServings: number): number {
  return (P * multiplier) / baseServings
}

/** k pro jednu dospělou osobu (šedý sloupec „Na osobu“). */
export function onePersonScale(p: Portions, baseServings: number): number {
  return recipeScale(p.dayFactor, 1, baseServings)
}

/** Řádek podle přepínače historických surovin: historicky se použije `original`; skupina, poznámka a přepsání třídy zůstávají. */
export function effectiveLine(line: IngredientLine, historical: boolean): IngredientLine {
  if (!historical || !line.original) return line
  const { original, ...rest } = line
  return { ...rest, ingredientId: original.ingredientId, amount: original.amount, unit: original.unit }
}
```

- [ ] **Step 4: Spustit testy**

Run: `npx vitest run src/domain/portions.test.ts && npm run build && npm run lint`
Expected: PASS, build i lint čisté.

- [ ] **Step 5: Commit**

```bash
git add src/domain/portions.ts src/domain/portions.test.ts
git commit -m "feat(domain): osoby-ekvivalent, faktor receptu a historická varianta suroviny"
```

---

### Task 2: Nákupní seznam – převod jednotek, sloučení, kategorie, rozpad po receptech

**Files:**
- Create: `src/domain/shopping.ts`, `src/domain/shopping.test.ts`

**Interfaces:**
- Consumes: `CATEGORIES` (`./schema`), `PINCH_GRAMS`, `scaleAmount`, `roundAmount` (`./scaling`), `effectiveLine`, `recipeScale`, `CartLine` (`./portions`, Task 1), typy `Category`, `Ingredient`, `Recipe`, `Unit`.
- Produces:
```ts
export type BaseUnit = 'g' | 'ml' | 'ks'
export type ShoppingUnit = BaseUnit | 'spetka'
export interface Quantity { amount: number; unit: BaseUnit }
export interface ShoppingSource { recipeId: string; title: string; amount: number; unit: ShoppingUnit; vessel: boolean }
export interface ShoppingItem { ingredientId: string; name: string; amount: number; unit: ShoppingUnit; sources: ShoppingSource[] }
export interface ShoppingGroup { category: Category; items: ShoppingItem[] }
export const NOT_PURCHASED: ReadonlySet<string>
export function toBaseQuantity(amount: number, unit: Unit, ing: Ingredient): Quantity
export function buildShoppingList(
  cart: readonly CartLine[],
  recipes: ReadonlyMap<string, Recipe>,
  ingredients: ReadonlyMap<string, Ingredient>,
  opts: { persons: number; historical: boolean },
): ShoppingGroup[]
```

- [ ] **Step 1: Napsat failing testy**

```ts
// src/domain/shopping.test.ts
import { NOT_PURCHASED, buildShoppingList, toBaseQuantity, type ShoppingGroup } from './shopping'
import type { Ingredient, Recipe } from './types'

const base: Ingredient = {
  id: 'x', name: 'X', aliases: [], category: 'ostatni', scaling: 'linear',
  nutritionPer100g: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }, units: {}, ediblePortion: 1, allergens: [], sources: { nutrition: 'test' },
}
const vejce: Ingredient = { ...base, id: 'vejce', name: 'Vejce', category: 'mlecne-a-vejce', units: { ks: 50 } }
const vejceMrazena: Ingredient = { ...base, id: 'vejce-mrazena', name: 'Vejce mražená', category: 'mrazene' }
const sul: Ingredient = { ...base, id: 'sul', name: 'Sůl', category: 'koreni', scaling: 'seasoning', units: { lzicka: 6, lzice: 18 } }
const olej: Ingredient = { ...base, id: 'olej', name: 'Olej', category: 'tuky-a-oleje', scaling: 'fat', densityGPerMl: 0.92, units: { lzice: 14, lzicka: 4.6 } }
const voda: Ingredient = { ...base, id: 'voda', name: 'Voda', category: 'napoje', densityGPerMl: 1, units: { lzice: 15 } }
const mouka: Ingredient = { ...base, id: 'mouka', name: 'Mouka', category: 'trvanlive', units: { hrnek: 140 } }
const ingredients = new Map([vejce, vejceMrazena, sul, olej, voda, mouka].map((i) => [i.id, i]))

const recipe = (id: string, title: string, lines: Recipe['ingredients']): Recipe => ({
  id, title, chapter: 'polevky', baseServings: 4, timeMinutes: 10, difficulty: 1, tags: [], equipment: [], allergens: [],
  ingredients: lines, steps: ['x'], source: { book: 'vlastni' }, verified: true,
})
const omeleta = recipe('omeleta', 'Omeleta', [
  { ingredientId: 'vejce', amount: 6, unit: 'ks', original: { ingredientId: 'vejce-mrazena', amount: 300, unit: 'g' } },
  { ingredientId: 'sul', amount: 2, unit: 'g' },
  { ingredientId: 'olej', amount: 1, unit: 'lzice' },
])
const testo = recipe('testo', 'Těsto', [
  { ingredientId: 'vejce', amount: 2, unit: 'ks' },
  { ingredientId: 'mouka', amount: 1, unit: 'hrnek' },
  { ingredientId: 'mouka', amount: 60, unit: 'g' },
  { ingredientId: 'olej', amount: 20, unit: 'ml' },
])
const knedle = recipe('knedle', 'Knedlíky', [
  { ingredientId: 'voda', amount: 2000, unit: 'ml', scaling: 'vessel' },
  { ingredientId: 'sul', amount: 10, unit: 'g', scaling: 'vessel' },
  { ingredientId: 'sul', amount: 1, unit: 'spetka' },
])
const stipek = recipe('stipek', 'Štípek', [{ ingredientId: 'sul', amount: 1, unit: 'spetka' }])
const vazeni = recipe('vazeni', 'Vážená vejce', [{ ingredientId: 'vejce', amount: 100, unit: 'g' }])
const recipes = new Map([omeleta, testo, knedle, stipek, vazeni].map((r) => [r.id, r]))
const modern = { persons: 4, historical: false }

const items = (groups: ShoppingGroup[]) => groups.flatMap((g) => g.items)
const item = (groups: ShoppingGroup[], id: string) => items(groups).find((i) => i.ingredientId === id)

describe('toBaseQuantity', () => {
  test('g, ml a ks zůstávají', () => {
    expect(toBaseQuantity(5, 'g', sul)).toEqual({ amount: 5, unit: 'g' })
    expect(toBaseQuantity(5, 'ml', olej)).toEqual({ amount: 5, unit: 'ml' })
    expect(toBaseQuantity(2, 'ks', vejce)).toEqual({ amount: 2, unit: 'ks' })
  })
  test('lžíce tekutiny s hustotou → ml', () => {
    const q = toBaseQuantity(1, 'lzice', olej)
    expect(q.unit).toBe('ml')
    expect(q.amount).toBeCloseTo(14 / 0.92)
  })
  test('lžička bez hustoty → g', () => expect(toBaseQuantity(2, 'lzicka', sul)).toEqual({ amount: 12, unit: 'g' }))
  test('špetka → 0,3 g', () => expect(toBaseQuantity(1, 'spetka', sul)).toEqual({ amount: 0.3, unit: 'g' }))
  test('hrnek bez převodu v units → pojistka 250 ml', () => expect(toBaseQuantity(1, 'hrnek', sul)).toEqual({ amount: 250, unit: 'ml' }))
})

describe('buildShoppingList', () => {
  test('vejce ze dvou receptů se sečtou a mají rozpad po receptech', () => {
    const v = item(buildShoppingList([{ recipeId: 'omeleta', multiplier: 1 }, { recipeId: 'testo', multiplier: 1 }], recipes, ingredients, modern), 'vejce')!
    expect(v).toMatchObject({ name: 'Vejce', amount: 8, unit: 'ks' })
    expect(v.sources).toEqual([
      { recipeId: 'omeleta', title: 'Omeleta', amount: 6, unit: 'ks', vessel: false },
      { recipeId: 'testo', title: 'Těsto', amount: 2, unit: 'ks', vessel: false },
    ])
  })

  test('18 dětí + 6 dospělých (P = 20,4, k = 5,1): součet se zaokrouhlí z nezaokrouhlených hodnot', () => {
    const v = item(buildShoppingList([{ recipeId: 'omeleta', multiplier: 1 }, { recipeId: 'testo', multiplier: 1 }], recipes, ingredients, { persons: 20.4, historical: false }), 'vejce')!
    expect(v.amount).toBe(41) // 8 × 5,1 = 40,8 → nahoru na 0,5
    expect(v.sources.map((s) => s.amount)).toEqual([31, 10.5]) // 30,6 a 10,2
  })

  test('násobek ×2 zdvojnásobí lineární suroviny', () => {
    expect(item(buildShoppingList([{ recipeId: 'omeleta', multiplier: 2 }], recipes, ingredients, modern), 'vejce')!.amount).toBe(12)
  })

  test('hrnek mouky a gramy mouky v jednom receptu = jeden řádek a jeden záznam rozpadu', () => {
    const m = item(buildShoppingList([{ recipeId: 'testo', multiplier: 1 }], recipes, ingredients, modern), 'mouka')!
    expect(m).toMatchObject({ amount: 200, unit: 'g' })
    expect(m.sources).toHaveLength(1)
  })

  test('lžíce oleje (fat) a mililitry oleje se sečtou v ml', () => {
    const o = item(buildShoppingList([{ recipeId: 'omeleta', multiplier: 1 }, { recipeId: 'testo', multiplier: 1 }], recipes, ingredients, modern), 'olej')!
    expect(o).toMatchObject({ amount: 35, unit: 'ml' }) // 15,2 ml + 20 ml = 35,2 → 35
  })

  test('kusy a gramy téže suroviny se sečtou v gramech přes units.ks', () => {
    const v = item(buildShoppingList([{ recipeId: 'omeleta', multiplier: 1 }, { recipeId: 'vazeni', multiplier: 1 }], recipes, ingredients, modern), 'vejce')!
    expect(v).toMatchObject({ amount: 400, unit: 'g' }) // 6 × 50 g + 100 g
    expect(v.sources.map((s) => s.unit)).toEqual(['ks', 'g'])
  })

  test('historické suroviny: vejce mražená v kategorii mražené místo vajec', () => {
    const groups = buildShoppingList([{ recipeId: 'omeleta', multiplier: 1 }], recipes, ingredients, { persons: 4, historical: true })
    expect(item(groups, 'vejce')).toBeUndefined()
    expect(item(groups, 'vejce-mrazena')).toMatchObject({ amount: 300, unit: 'g' })
    expect(groups.find((g) => g.category === 'mrazene')).toBeDefined()
  })

  test('voda se nekupuje, sůl do vody je „podle nádoby“ a oba řádky soli jsou jeden záznam', () => {
    expect(NOT_PURCHASED.has('voda')).toBe(true)
    const groups = buildShoppingList([{ recipeId: 'knedle', multiplier: 1 }], recipes, ingredients, modern)
    expect(item(groups, 'voda')).toBeUndefined()
    const s = item(groups, 'sul')!
    expect(s).toMatchObject({ amount: 10, unit: 'g' }) // 10 g + špetka 0,3 g
    expect(s.sources).toEqual([{ recipeId: 'knedle', title: 'Knedlíky', amount: 10, unit: 'g', vessel: true }])
  })

  test('samotná špetka zůstane špetkou', () => {
    expect(item(buildShoppingList([{ recipeId: 'stipek', multiplier: 1 }], recipes, ingredients, modern), 'sul')!.unit).toBe('spetka')
  })

  test('skupiny v pořadí CATEGORIES, položky podle názvu', () => {
    const groups = buildShoppingList(
      [{ recipeId: 'omeleta', multiplier: 1 }, { recipeId: 'testo', multiplier: 1 }, { recipeId: 'knedle', multiplier: 1 }],
      recipes, ingredients, modern,
    )
    expect(groups.map((g) => g.category)).toEqual(['mlecne-a-vejce', 'koreni', 'tuky-a-oleje', 'trvanlive'])
  })

  test('neznámý recept a násobek 0 se přeskočí, prázdný košík = prázdný seznam', () => {
    expect(buildShoppingList([{ recipeId: 'neexistuje', multiplier: 1 }, { recipeId: 'omeleta', multiplier: 0 }], recipes, ingredients, modern)).toEqual([])
    expect(buildShoppingList([], recipes, ingredients, modern)).toEqual([])
  })
})
```

- [ ] **Step 2: Spustit test a ověřit, že selže**

Run: `npx vitest run src/domain/shopping.test.ts`
Expected: FAIL – `Failed to resolve import "./shopping"`

- [ ] **Step 3: Implementace**

```ts
// src/domain/shopping.ts
import { CATEGORIES } from './schema'
import { PINCH_GRAMS, roundAmount, scaleAmount } from './scaling'
import { effectiveLine, recipeScale, type CartLine } from './portions'
import type { Category, Ingredient, Recipe, Unit } from './types'

export type BaseUnit = 'g' | 'ml' | 'ks'
export type ShoppingUnit = BaseUnit | 'spetka'
export interface Quantity { amount: number; unit: BaseUnit }
export interface ShoppingSource { recipeId: string; title: string; amount: number; unit: ShoppingUnit; vessel: boolean }
export interface ShoppingItem { ingredientId: string; name: string; amount: number; unit: ShoppingUnit; sources: ShoppingSource[] }
export interface ShoppingGroup { category: Category; items: ShoppingItem[] }

/** Suroviny, které se nekupují (voda z kohoutku): na stránce receptu zůstávají, v seznamu ne. */
export const NOT_PURCHASED: ReadonlySet<string> = new Set(['voda'])

/** Objem kuchyňské jednotky, když ji surovina nemá v `units` (pojistka – validátor to hlásí jako chybu). */
const FALLBACK_ML = { lzice: 15, lzicka: 5, hrnek: 250 } as const

/** Množství v základní jednotce: g, ml nebo ks; lžíce/lžička/hrnek přes `units` (tekutina s hustotou → ml). */
export function toBaseQuantity(amount: number, unit: Unit, ing: Ingredient): Quantity {
  switch (unit) {
    case 'g':
    case 'ml':
    case 'ks':
      return { amount, unit }
    case 'spetka':
      return { amount: amount * PINCH_GRAMS, unit: 'g' }
    default: {
      const perUnit = ing.units[unit]
      if (perUnit === undefined) return { amount: amount * FALLBACK_ML[unit], unit: 'ml' }
      const grams = amount * perUnit
      return ing.densityGPerMl ? { amount: grams / ing.densityGPerMl, unit: 'ml' } : { amount: grams, unit: 'g' }
    }
  }
}

function gramsOf(q: Quantity, ing: Ingredient): number {
  if (q.unit === 'g') return q.amount
  if (q.unit === 'ml') return q.amount * (ing.densityGPerMl ?? 1)
  return q.amount * (ing.units.ks ?? 0) // ks bez units.ks hlásí validátor jako chybu
}

/** Součet: stejná jednotka se sčítá přímo, různé jednotky téže suroviny v gramech. */
function sum(qs: Quantity[], ing: Ingredient): Quantity {
  const unit = qs[0].unit
  if (qs.every((q) => q.unit === unit)) return { amount: qs.reduce((s, q) => s + q.amount, 0), unit }
  return { amount: qs.reduce((s, q) => s + gramsOf(q, ing), 0), unit: 'g' }
}

const rounded = (q: Quantity) => roundAmount(q.amount, q.unit) as { amount: number; unit: ShoppingUnit }

interface SourceAcc { title: string; qs: Quantity[]; vessel: boolean }

/** Nákupní seznam z košíku: přepočet na P × násobek, sloučení podle suroviny, skupiny podle kategorie obchodu. */
export function buildShoppingList(
  cart: readonly CartLine[],
  recipes: ReadonlyMap<string, Recipe>,
  ingredients: ReadonlyMap<string, Ingredient>,
  opts: { persons: number; historical: boolean },
): ShoppingGroup[] {
  const acc = new Map<string, Map<string, SourceAcc>>()
  for (const entry of cart) {
    const recipe = recipes.get(entry.recipeId)
    if (!recipe || !(entry.multiplier > 0)) continue
    const k = recipeScale(opts.persons, entry.multiplier, recipe.baseServings)
    for (const raw of recipe.ingredients) {
      const line = effectiveLine(raw, opts.historical)
      const ing = ingredients.get(line.ingredientId)
      if (!ing || NOT_PURCHASED.has(ing.id)) continue
      const scaling = line.scaling ?? ing.scaling
      const q = toBaseQuantity(scaleAmount(line.amount, k, scaling), line.unit, ing)
      const byRecipe = acc.get(ing.id) ?? new Map<string, SourceAcc>()
      acc.set(ing.id, byRecipe)
      const src = byRecipe.get(recipe.id) ?? { title: recipe.title, qs: [], vessel: false }
      src.qs.push(q)
      src.vessel = src.vessel || scaling === 'vessel'
      byRecipe.set(recipe.id, src)
    }
  }

  const byCategory = new Map<Category, ShoppingItem[]>()
  for (const [id, byRecipe] of acc) {
    const ing = ingredients.get(id)!
    const total = rounded(sum([...byRecipe.values()].flatMap((s) => s.qs), ing))
    const sources = [...byRecipe].map(([recipeId, s]) => ({ recipeId, title: s.title, ...rounded(sum(s.qs, ing)), vessel: s.vessel }))
    const list = byCategory.get(ing.category) ?? []
    list.push({ ingredientId: id, name: ing.name, ...total, sources })
    byCategory.set(ing.category, list)
  }
  return CATEGORIES.filter((c) => byCategory.has(c)).map((category) => ({
    category,
    items: byCategory.get(category)!.sort((a, b) => a.name.localeCompare(b.name, 'cs')),
  }))
}
```

- [ ] **Step 4: Spustit testy**

Run: `npx vitest run src/domain/shopping.test.ts && npm run build && npm run lint`
Expected: PASS, build i lint čisté.

- [ ] **Step 5: Commit**

```bash
git add src/domain/shopping.ts src/domain/shopping.test.ts
git commit -m "feat(domain): nákupní seznam – převod jednotek, sloučení a rozpad po receptech"
```

---

### Task 3: Nutrice s jedlým podílem (ruling R1) a validátor na stejném výpočtu

**Files:**
- Create: `src/domain/nutrition.ts`, `src/domain/nutrition.test.ts`
- Modify: `scripts/validate.ts` (import + výpočet kcal na porci), `scripts/validate.test.ts` (2 testy)

**Interfaces:**
- Consumes: `toGrams` (`./scaling`), `effectiveLine`, `DEFAULT_KCAL_TARGET`, `CartLine` (`./portions`, Task 1), typy `Category`, `Ingredient`, `IngredientLine`, `Recipe`.
- Produces:
```ts
export interface Macros { kcal: number; protein: number; carbs: number; fat: number }
export const ZERO_MACROS: Macros
export const WEIGHED_WITH_REFUSE: ReadonlySet<Category> // maso, ryby, uzeniny
export function edibleGrams(line: IngredientLine, ing: Ingredient): number | null
export function lineMacros(line: IngredientLine, ing: Ingredient): Macros
export function recipeMacrosPerServing(recipe: Recipe, ingredients: ReadonlyMap<string, Ingredient>, historical: boolean): Macros
export function cartMacrosPerAdult(
  cart: readonly CartLine[], recipes: ReadonlyMap<string, Recipe>, ingredients: ReadonlyMap<string, Ingredient>,
  opts: { historical: boolean; dayFactor: number },
): Macros
export function dailyKcalTarget(kcalTarget: number | undefined, dayFactor: number): number
export function coveragePercent(kcal: number, target: number): number
```

- [ ] **Step 1: Napsat failing testy**

```ts
// src/domain/nutrition.test.ts
import {
  WEIGHED_WITH_REFUSE, cartMacrosPerAdult, coveragePercent, dailyKcalTarget, edibleGrams, lineMacros, recipeMacrosPerServing,
} from './nutrition'
import type { Ingredient, Recipe } from './types'

const base: Ingredient = {
  id: 'x', name: 'X', aliases: [], category: 'ostatni', scaling: 'linear',
  nutritionPer100g: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }, units: {}, ediblePortion: 1, allergens: [], sources: { nutrition: 'test' },
}
const kure: Ingredient = { ...base, id: 'kure', name: 'Celé kuře', category: 'maso', ediblePortion: 0.68, nutritionPer100g: { kcal: 215, protein: 18.6, carbs: 0, fat: 15, fiber: 0 } }
const mrkev: Ingredient = { ...base, id: 'mrkev', name: 'Mrkev', category: 'zelenina', ediblePortion: 0.89, nutritionPer100g: { kcal: 41, protein: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8 } }
const olej: Ingredient = { ...base, id: 'olej', name: 'Olej', category: 'tuky-a-oleje', scaling: 'fat', densityGPerMl: 0.92, nutritionPer100g: { kcal: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 } }
const vejce: Ingredient = { ...base, id: 'vejce', name: 'Vejce', category: 'mlecne-a-vejce', ediblePortion: 0.88, units: { ks: 50 }, nutritionPer100g: { kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5, fiber: 0 } }
const vejceMrazena: Ingredient = { ...base, id: 'vejce-mrazena', name: 'Vejce mražená', category: 'mrazene', nutritionPer100g: { kcal: 150, protein: 12, carbs: 1, fat: 10, fiber: 0 } }
const ingredients = new Map([kure, mrkev, olej, vejce, vejceMrazena].map((i) => [i.id, i]))

const recipe = (id: string, lines: Recipe['ingredients']): Recipe => ({
  id, title: id, chapter: 'maso-a-ryby', baseServings: 4, timeMinutes: 60, difficulty: 1, tags: [], equipment: [], allergens: [],
  ingredients: lines, steps: ['x'], source: { book: 'vlastni' }, verified: true,
})
const dusene = recipe('dusene', [
  { ingredientId: 'kure', amount: 1000, unit: 'g' },
  { ingredientId: 'mrkev', amount: 400, unit: 'g' },
  { ingredientId: 'olej', amount: 20, unit: 'ml', scaling: 'vessel' },
])
const vajicka = recipe('vajicka', [{ ingredientId: 'vejce', amount: 2, unit: 'ks', original: { ingredientId: 'vejce-mrazena', amount: 100, unit: 'g' } }])
const recipes = new Map([dusene, vajicka].map((r) => [r.id, r]))

describe('edibleGrams (ruling R1)', () => {
  test('maso v g se krátí na jedlý podíl (kosti)', () => expect(edibleGrams({ ingredientId: 'kure', amount: 1000, unit: 'g' }, kure)).toBeCloseTo(680))
  test('zelenina v g je už očištěná (AFRS Weight = EP)', () => expect(edibleGrams({ ingredientId: 'mrkev', amount: 100, unit: 'g' }, mrkev)).toBe(100))
  test('kusy jsou gramy jedlé části z units', () => expect(edibleGrams({ ingredientId: 'vejce', amount: 2, unit: 'ks' }, vejce)).toBe(100))
  test('kategorie vážené s odpadem', () => expect([...WEIGHED_WITH_REFUSE].sort()).toEqual(['maso', 'ryby', 'uzeniny']))
  test('ks bez převodu → null a makra 0', () => {
    expect(edibleGrams({ ingredientId: 'mrkev', amount: 2, unit: 'ks' }, mrkev)).toBeNull()
    expect(lineMacros({ ingredientId: 'mrkev', amount: 2, unit: 'ks' }, mrkev).kcal).toBe(0)
  })
})

describe('recipeMacrosPerServing', () => {
  test('součet řádků / baseServings, bez vessel tuku', () => {
    const m = recipeMacrosPerServing(dusene, ingredients, false)
    expect(m.kcal).toBeCloseTo(406.5) // (680 × 2,15 + 400 × 0,41) / 4
    expect(m.protein).toBeCloseTo(32.52)
    expect(m.carbs).toBeCloseTo(9.6)
    expect(m.fat).toBeCloseTo(25.7)
  })
  test('historické suroviny počítají s original', () => {
    expect(recipeMacrosPerServing(vajicka, ingredients, false).kcal).toBeCloseTo(35.75)
    expect(recipeMacrosPerServing(vajicka, ingredients, true).kcal).toBeCloseTo(37.5)
  })
})

describe('košík', () => {
  test('na dospělého = porce × násobek × náročnost', () => {
    expect(cartMacrosPerAdult([{ recipeId: 'dusene', multiplier: 2 }], recipes, ingredients, { historical: false, dayFactor: 1.2 }).kcal).toBeCloseTo(975.6)
  })
  test('neznámý recept a násobek 0 se přeskočí', () => {
    const m = cartMacrosPerAdult([{ recipeId: 'neni', multiplier: 1 }, { recipeId: 'dusene', multiplier: 0 }], recipes, ingredients, { historical: false, dayFactor: 1 })
    expect(m).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
  })
  test('cíl = (vlastní nebo 2300) × náročnost, pokrytí v celých procentech', () => {
    expect(dailyKcalTarget(undefined, 1.2)).toBeCloseTo(2760)
    expect(dailyKcalTarget(2000, 1)).toBe(2000)
    expect(coveragePercent(1150, 2300)).toBe(50)
    expect(coveragePercent(975.6, 2760)).toBe(35)
    expect(coveragePercent(100, 0)).toBe(0)
  })
})
```

- [ ] **Step 2: Spustit test a ověřit, že selže**

Run: `npx vitest run src/domain/nutrition.test.ts`
Expected: FAIL – `Failed to resolve import "./nutrition"`

- [ ] **Step 3: Implementace**

```ts
// src/domain/nutrition.ts
import { DEFAULT_KCAL_TARGET, effectiveLine, type CartLine } from './portions'
import { toGrams } from './scaling'
import type { Category, Ingredient, IngredientLine, Recipe } from './types'

export interface Macros { kcal: number; protein: number; carbs: number; fat: number }
export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

/**
 * Kategorie, u kterých recepty uvádějí g/ml v nákupní hmotnosti včetně kostí a odpadu (celé kuře, koleno…).
 * Ostatní gramy jsou jedlá část (AFRS Weight = EP) a `units` jsou gramy jedlé části (spec §5.1).
 */
export const WEIGHED_WITH_REFUSE: ReadonlySet<Category> = new Set<Category>(['maso', 'ryby', 'uzeniny'])

export function edibleGrams(line: IngredientLine, ing: Ingredient): number | null {
  const g = toGrams(line, ing)
  if (g === null) return null
  const weighed = line.unit === 'g' || line.unit === 'ml'
  return weighed && WEIGHED_WITH_REFUSE.has(ing.category) ? g * ing.ediblePortion : g
}

const scaled = (m: Macros, f: number): Macros => ({ kcal: m.kcal * f, protein: m.protein * f, carbs: m.carbs * f, fat: m.fat * f })
const plus = (a: Macros, b: Macros): Macros => ({ kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat })

export function lineMacros(line: IngredientLine, ing: Ingredient): Macros {
  const g = edibleGrams(line, ing)
  if (g === null) return ZERO_MACROS
  const n = ing.nutritionPer100g
  return scaled({ kcal: n.kcal, protein: n.protein, carbs: n.carbs, fat: n.fat }, g / 100)
}

/** Makra na jednu porci (recept / baseServings), lineárně; řádky třídy vessel (slévaná voda, tuk na smažení) se nepočítají. */
export function recipeMacrosPerServing(recipe: Recipe, ingredients: ReadonlyMap<string, Ingredient>, historical: boolean): Macros {
  let total = ZERO_MACROS
  for (const raw of recipe.ingredients) {
    const line = effectiveLine(raw, historical)
    const ing = ingredients.get(line.ingredientId)
    if (!ing || (line.scaling ?? ing.scaling) === 'vessel') continue
    total = plus(total, lineMacros(line, ing))
  }
  return scaled(total, 1 / recipe.baseServings)
}

/** Co sní jeden dospělý z celého košíku: Σ porce × násobek × náročnost dne. */
export function cartMacrosPerAdult(
  cart: readonly CartLine[],
  recipes: ReadonlyMap<string, Recipe>,
  ingredients: ReadonlyMap<string, Ingredient>,
  opts: { historical: boolean; dayFactor: number },
): Macros {
  let total = ZERO_MACROS
  for (const entry of cart) {
    const recipe = recipes.get(entry.recipeId)
    if (!recipe || !(entry.multiplier > 0)) continue
    total = plus(total, scaled(recipeMacrosPerServing(recipe, ingredients, opts.historical), entry.multiplier * opts.dayFactor))
  }
  return total
}

export function dailyKcalTarget(kcalTarget: number | undefined, dayFactor: number): number {
  return (kcalTarget ?? DEFAULT_KCAL_TARGET) * dayFactor
}

export function coveragePercent(kcal: number, target: number): number {
  return target > 0 ? Math.round((kcal / target) * 100) : 0
}
```

- [ ] **Step 4: Spustit testy nutrice**

Run: `npx vitest run src/domain/nutrition.test.ts`
Expected: PASS

- [ ] **Step 5: Failing testy validátoru (kosti se nepočítají do kcal)**

Do `scripts/validate.test.ts` za test `'kcal na porci 20 je varování'` (uvnitř `describe('validateContent')`) přidat:

```ts
  const kure = { ...vyvar, id: 'kure', name: 'Kuře', category: 'maso', containsMeat: undefined, allergens: [], ediblePortion: 0.5, nutritionPer100g: { kcal: 200, protein: 20, carbs: 0, fat: 10, fiber: 0 } }

  it('kcal se u masa s kostí počítají z jedlé části (4000 g × 0,5 → 1000 kcal/porci, bez varování)', () => {
    const r = validateContent([...ings, kure], rec(withLines([{ ingredientId: 'kure', amount: 4000, unit: 'g' }], { tags: [] })))
    expect(r.errors).toEqual([])
    expect(r.warnings.some((w) => w.includes('kcal'))).toBe(false)
  })

  it('bez odpadu by stejné maso překročilo 1500 kcal/porci (kontrola testu)', () => {
    const r = validateContent([...ings, { ...kure, ediblePortion: 1 }], rec(withLines([{ ingredientId: 'kure', amount: 4000, unit: 'g' }], { tags: [] })))
    expect(r.warnings.some((w) => w.includes('2000 kcal'))).toBe(true)
  })
```

Run: `npx vitest run scripts/validate.test.ts`
Expected: FAIL – první nový test najde varování „2000 kcal na porci je mimo rozsah 50–1500“.

- [ ] **Step 6: Validátor na `recipeMacrosPerServing`**

V `scripts/validate.ts`:
- řádek 6 `import { toGrams } from '../src/domain/scaling'` nahradit `import { recipeMacrosPerServing } from '../src/domain/nutrition'`;
- smazat `let kcal = 0` (za `const errorsBefore = errors.length`);
- v cyklu řádků smazat dva řádky
```ts
        const g = toGrams(line, ing)
        if (g !== null) kcal += (g * ing.nutritionPer100g.kcal) / 100
```
- `const perPortion = kcal / r.baseServings` nahradit
```ts
    // stejný výpočet jako v aplikaci: jedlá část u masa s kostí, bez řádků vessel (ruling R1, R5)
    const perPortion = recipeMacrosPerServing(r, byId, false).kcal
```

- [ ] **Step 7: Testy, validace dat, build**

Run: `npx vitest run scripts/validate.test.ts src/domain && npm run validate && npm run build && npm run lint`
Expected: PASS; `npm run validate` končí `OK: … surovin, 78 receptů, … varování.` bez chyb (počet varování se smí změnit – zapsat do zprávy commitu, pokud kcal varování ubyla/přibyla).

- [ ] **Step 8: Commit**

```bash
git add src/domain/nutrition.ts src/domain/nutrition.test.ts scripts/validate.ts scripts/validate.test.ts
git commit -m "feat(domain): nutrice z jedlé části a validátor kcal na stejném výpočtu"
```

---

### Task 4: Uživatelský stav – košík, osoby, náročnost a nastavení s mezemi

**Files:**
- Modify: `src/state/userState.ts`, `src/state/userState.test.ts`, `src/state/UserStateProvider.tsx`, `src/state/UserStateProvider.test.tsx`

**Interfaces:**
- Consumes: `DEFAULT_CHILD_COEF` (`@/domain/scaling`), `DAY_FACTOR_MIN`, `DAY_FACTOR_MAX`, `DAY_FACTOR_STEP`, `People` (`@/domain/portions`, Task 1).
- Produces (`src/state/userState.ts`):
```ts
export const MULTIPLIER_MAX = 10
export const PEOPLE_MAX = 500
export const CHILD_COEF_MIN = 0.3
export const CHILD_COEF_MAX = 1
export const KCAL_TARGET_MIN = 1000
export const KCAL_TARGET_MAX = 6000
export function clampPeople(p: People): People
export function clampDayFactor(v: number): number
export function clampMultiplier(v: number): number
export function isInCart(s: UserState, recipeId: string): boolean
export function toggleCart(s: UserState, recipeId: string): UserState
export function setCartMultiplier(s: UserState, recipeId: string, multiplier: number): UserState
export function removeFromCart(s: UserState, recipeId: string): UserState
export function setPeople(s: UserState, patch: Partial<People>): UserState
export function setDayFactor(s: UserState, value: number): UserState
export function updateSettings(s: UserState, patch: Partial<UserState['settings']>): UserState
```
- Produces (`useUserState()` navíc): `toggleCart(id)`, `setCartMultiplier(id, m)`, `removeFromCart(id)`, `setPeople(patch)`, `setDayFactor(v)`, `updateSettings(patch)` – všechny `void`.

- [ ] **Step 1: Failing testy čistých operací**

V `src/state/userState.test.ts` rozšířit import:

```ts
import {
  DEFAULT_USER_STATE,
  KCAL_TARGET_MAX,
  MULTIPLIER_MAX,
  PEOPLE_MAX,
  isInCart,
  loadUserState,
  removeFromCart,
  saveUserState,
  setCartMultiplier,
  setDayFactor,
  setPeople,
  toggleCart,
  toggleCooked,
  toggleFavorite,
  updateSettings,
} from './userState';
```

V existujícím testu `'zachová platná pole vedle neplatných'` změnit `"dayFactor":2` na `"dayFactor":1.2` a `expect(s.dayFactor).toBe(2)` na `expect(s.dayFactor).toBe(1.2)` (2 je nově mimo meze). Na konec souboru přidat:

```ts
describe('košík', () => {
  it('toggleCart přidá recept s násobkem 1 a podruhé ho odebere', () => {
    const s = toggleCart(DEFAULT_USER_STATE, 'a');
    expect(s.cart).toEqual([{ recipeId: 'a', multiplier: 1 }]);
    expect(isInCart(s, 'a')).toBe(true);
    expect(toggleCart(s, 'a').cart).toEqual([]);
    expect(DEFAULT_USER_STATE.cart).toEqual([]);
  });

  it('setCartMultiplier upne na celé číslo 1–10 a ostatní recepty nemění', () => {
    const s = toggleCart(toggleCart(DEFAULT_USER_STATE, 'a'), 'b');
    expect(setCartMultiplier(s, 'a', 3).cart).toEqual([{ recipeId: 'a', multiplier: 3 }, { recipeId: 'b', multiplier: 1 }]);
    expect(setCartMultiplier(s, 'a', 0).cart[0].multiplier).toBe(1);
    expect(setCartMultiplier(s, 'a', 2.6).cart[0].multiplier).toBe(3);
    expect(setCartMultiplier(s, 'a', 99).cart[0].multiplier).toBe(MULTIPLIER_MAX);
    expect(setCartMultiplier(s, 'neni', 3).cart).toEqual(s.cart);
  });

  it('removeFromCart odebere jen daný recept', () => {
    const s = toggleCart(toggleCart(DEFAULT_USER_STATE, 'a'), 'b');
    expect(removeFromCart(s, 'a').cart).toEqual([{ recipeId: 'b', multiplier: 1 }]);
  });
});

describe('osoby a náročnost dne', () => {
  it('setPeople: celá čísla 0–500 a vždy aspoň jedna osoba', () => {
    expect(setPeople(DEFAULT_USER_STATE, { adults: 6, children: 18 }).people).toEqual({ adults: 6, children: 18 });
    expect(setPeople(DEFAULT_USER_STATE, { adults: 0, children: 5 }).people).toEqual({ adults: 0, children: 5 });
    expect(setPeople(DEFAULT_USER_STATE, { adults: -3 }).people).toEqual({ adults: 1, children: 0 });
    expect(setPeople(DEFAULT_USER_STATE, { adults: Number.NaN }).people).toEqual({ adults: 1, children: 0 });
    expect(setPeople(DEFAULT_USER_STATE, { children: 600.4 }).people.children).toBe(PEOPLE_MAX);
    expect(setPeople(DEFAULT_USER_STATE, { children: 2.4 }).people.children).toBe(2);
  });

  it('setDayFactor: 0,8–1,3 po 0,05', () => {
    expect(setDayFactor(DEFAULT_USER_STATE, 1.17).dayFactor).toBe(1.15);
    expect(setDayFactor(DEFAULT_USER_STATE, 2).dayFactor).toBe(1.3);
    expect(setDayFactor(DEFAULT_USER_STATE, 0.5).dayFactor).toBe(0.8);
    expect(setDayFactor(DEFAULT_USER_STATE, Number.NaN).dayFactor).toBe(1);
  });
});

describe('updateSettings', () => {
  it('koeficient dítěte 0,3–1 po 0,05', () => {
    expect(updateSettings(DEFAULT_USER_STATE, { childCoef: 0.73 }).settings.childCoef).toBe(0.75);
    expect(updateSettings(DEFAULT_USER_STATE, { childCoef: 0.1 }).settings.childCoef).toBe(0.3);
  });

  it('cíl kcal 1000–6000 po 50, undefined = výchozí (klíč chybí)', () => {
    expect(updateSettings(DEFAULT_USER_STATE, { kcalTarget: 2512 }).settings.kcalTarget).toBe(2500);
    expect(updateSettings(DEFAULT_USER_STATE, { kcalTarget: 200 }).settings.kcalTarget).toBe(1000);
    const reset = updateSettings(updateSettings(DEFAULT_USER_STATE, { kcalTarget: 2000 }), { kcalTarget: undefined });
    expect('kcalTarget' in reset.settings).toBe(false);
  });

  it('historické suroviny se přepnou a ostatní nastavení zůstanou', () => {
    const s = updateSettings(DEFAULT_USER_STATE, { historicalIngredients: true });
    expect(s.settings).toEqual({ childCoef: 0.8, historicalIngredients: true });
  });
});

describe('loadUserState – meze', () => {
  const storageWith = (value: string | null) => ({ getItem: () => value });

  it('poškozený košík, osoby, náročnost a nastavení se upnou, duplicity v košíku sloučí', () => {
    const s = loadUserState(storageWith(JSON.stringify({
      version: 1,
      cart: [{ recipeId: 'a', multiplier: 0 }, { recipeId: 'a', multiplier: 5 }, { recipeId: 'b', multiplier: -2 }],
      people: { adults: 0, children: 0 },
      dayFactor: 9,
      settings: { childCoef: 5, historicalIngredients: true, kcalTarget: 99999 },
    })));
    expect(s.cart).toEqual([{ recipeId: 'a', multiplier: 1 }, { recipeId: 'b', multiplier: 1 }]);
    expect(s.people).toEqual({ adults: 1, children: 0 });
    expect(s.dayFactor).toBe(1.3);
    expect(s.settings).toEqual({ childCoef: 1, historicalIngredients: true, kcalTarget: KCAL_TARGET_MAX });
  });
});
```

- [ ] **Step 2: Spustit a ověřit selhání**

Run: `npx vitest run src/state/userState.test.ts`
Expected: FAIL – `toggleCart is not a function` (a další chybějící exporty).

- [ ] **Step 3: Implementace operací a sanitizace**

V `src/state/userState.ts` doplnit import a za `toggleCooked` přidat (styl souboru: středníky):

```ts
import { DAY_FACTOR_MAX, DAY_FACTOR_MIN, DAY_FACTOR_STEP, type People } from '@/domain/portions';
```

```ts
export const MULTIPLIER_MAX = 10;
export const PEOPLE_MAX = 500;
export const CHILD_COEF_MIN = 0.3;
export const CHILD_COEF_MAX = 1;
export const KCAL_TARGET_MIN = 1000;
export const KCAL_TARGET_MAX = 6000;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
/** Na krok a dvě desetinná místa (bez binárního šumu 1.1500000000000001). */
const toStep = (v: number, step: number) => Number((Math.round(v / step) * step).toFixed(2));
const count = (v: number) => (Number.isFinite(v) ? clamp(Math.round(v), 0, PEOPLE_MAX) : 0);

/** Celá čísla 0–500; když by nezbyla žádná osoba, je to jeden dospělý (P nesmí být 0). */
export function clampPeople(p: People): People {
  const adults = count(p.adults);
  const children = count(p.children);
  return adults + children === 0 ? { adults: 1, children: 0 } : { adults, children };
}

export function clampDayFactor(v: number): number {
  return Number.isFinite(v) ? clamp(toStep(v, DAY_FACTOR_STEP), DAY_FACTOR_MIN, DAY_FACTOR_MAX) : 1;
}

export function clampMultiplier(v: number): number {
  return Number.isFinite(v) ? clamp(Math.round(v), 1, MULTIPLIER_MAX) : 1;
}

function clampChildCoef(v: number): number {
  return Number.isFinite(v) ? clamp(toStep(v, 0.05), CHILD_COEF_MIN, CHILD_COEF_MAX) : DEFAULT_CHILD_COEF;
}

function clampKcalTarget(v: number | undefined): number | undefined {
  if (v === undefined || !Number.isFinite(v)) return undefined;
  return clamp(Math.round(v / 50) * 50, KCAL_TARGET_MIN, KCAL_TARGET_MAX);
}

export function isInCart(s: UserState, recipeId: string): boolean {
  return s.cart.some((e) => e.recipeId === recipeId);
}

export function toggleCart(s: UserState, recipeId: string): UserState {
  return isInCart(s, recipeId)
    ? { ...s, cart: s.cart.filter((e) => e.recipeId !== recipeId) }
    : { ...s, cart: [...s.cart, { recipeId, multiplier: 1 }] };
}

export function setCartMultiplier(s: UserState, recipeId: string, multiplier: number): UserState {
  return { ...s, cart: s.cart.map((e) => (e.recipeId === recipeId ? { ...e, multiplier: clampMultiplier(multiplier) } : e)) };
}

export function removeFromCart(s: UserState, recipeId: string): UserState {
  return { ...s, cart: s.cart.filter((e) => e.recipeId !== recipeId) };
}

export function setPeople(s: UserState, patch: Partial<People>): UserState {
  return { ...s, people: clampPeople({ ...s.people, ...patch }) };
}

export function setDayFactor(s: UserState, value: number): UserState {
  return { ...s, dayFactor: clampDayFactor(value) };
}

/** `kcalTarget: undefined` vrací výchozí cíl (klíč se odstraní). */
export function updateSettings(s: UserState, patch: Partial<UserState['settings']>): UserState {
  const next = { ...s.settings, ...patch };
  const settings: UserState['settings'] = {
    childCoef: clampChildCoef(next.childCoef),
    historicalIngredients: next.historicalIngredients,
  };
  const kcalTarget = clampKcalTarget(next.kcalTarget);
  return { ...s, settings: kcalTarget === undefined ? settings : { ...settings, kcalTarget } };
}

/** Meze a deduplikace košíku pro stav načtený z úložiště (ručně upravený nebo starý JSON). */
function sanitize(s: UserState): UserState {
  const cart: UserState['cart'] = [];
  for (const e of s.cart) {
    if (cart.some((c) => c.recipeId === e.recipeId)) continue; // duplicita: první vyhrává
    cart.push({ recipeId: e.recipeId, multiplier: clampMultiplier(e.multiplier) });
  }
  return updateSettings({ ...s, cart, people: clampPeople(s.people), dayFactor: clampDayFactor(s.dayFactor) }, {});
}
```

V `loadUserState` nahradit závěrečné

```ts
    const { kcalTarget, ...settings } = result.data.settings;
    return {
      ...result.data,
      settings: kcalTarget === undefined ? settings : { ...settings, kcalTarget },
    };
```

za

```ts
    return sanitize(result.data);
```

(`updateSettings` uvnitř `sanitize` už nepřítomný `kcalTarget` vynechá.) `sanitize` musí být definovaná nad `loadUserState`, nebo jako `function` deklarace (hoisting) – použít `function`, jak je výše.

- [ ] **Step 4: Spustit testy stavu**

Run: `npx vitest run src/state/userState.test.ts`
Expected: PASS (včetně původních testů round-trip a „neplatné typy“).

- [ ] **Step 5: Failing test provideru**

Do `src/state/UserStateProvider.test.tsx` přidat komponentu a test (uvnitř `describe('UserStateProvider')`):

```tsx
function CartProbe() {
  const { state, toggleCart, setCartMultiplier, removeFromCart, setPeople, setDayFactor, updateSettings } = useUserState();
  return (
    <div>
      <span data-testid="cart">{JSON.stringify(state.cart)}</span>
      <span data-testid="people">{JSON.stringify(state.people)}</span>
      <span data-testid="day">{state.dayFactor}</span>
      <span data-testid="hist">{String(state.settings.historicalIngredients)}</span>
      <button onClick={() => toggleCart('r1')}>cart</button>
      <button onClick={() => setCartMultiplier('r1', 3)}>x3</button>
      <button onClick={() => removeFromCart('r1')}>remove</button>
      <button onClick={() => setPeople({ adults: 6, children: 18 })}>people</button>
      <button onClick={() => setDayFactor(1.2)}>day</button>
      <button onClick={() => updateSettings({ historicalIngredients: true })}>hist</button>
    </div>
  );
}
```

```tsx
  it('košík, osoby, náročnost a nastavení se mění přes API a uloží se', () => {
    const storage = makeStorage();
    render(
      <UserStateProvider storage={storage}>
        <CartProbe />
      </UserStateProvider>,
    );
    act(() => screen.getByText('cart').click());
    act(() => screen.getByText('x3').click());
    act(() => screen.getByText('people').click());
    act(() => screen.getByText('day').click());
    act(() => screen.getByText('hist').click());
    expect(screen.getByTestId('cart').textContent).toBe('[{"recipeId":"r1","multiplier":3}]');
    expect(screen.getByTestId('people').textContent).toBe('{"adults":6,"children":18}');
    expect(screen.getByTestId('day').textContent).toBe('1.2');
    expect(screen.getByTestId('hist').textContent).toBe('true');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const json = (storage.setItem.mock.calls.at(-1) as unknown as string[])[1];
    expect(json).toContain('"multiplier":3');
    expect(json).toContain('"dayFactor":1.2');
    act(() => screen.getByText('remove').click());
    expect(screen.getByTestId('cart').textContent).toBe('[]');
  });
```

Run: `npx vitest run src/state/UserStateProvider.test.tsx`
Expected: FAIL – `toggleCart is not a function`.

- [ ] **Step 6: Rozšířit provider**

V `src/state/UserStateProvider.tsx` rozšířit import z `./userState` o `removeFromCart as removeFromCartFn`, `setCartMultiplier as setCartMultiplierFn`, `setDayFactor as setDayFactorFn`, `setPeople as setPeopleFn`, `toggleCart as toggleCartFn`, `updateSettings as updateSettingsFn`; přidat `import type { People } from '@/domain/portions';`. Rozhraní:

```ts
interface UserStateApi {
  state: UserState;
  toggleFavorite(id: string): void;
  toggleCooked(id: string): void;
  toggleCart(id: string): void;
  setCartMultiplier(id: string, multiplier: number): void;
  removeFromCart(id: string): void;
  setPeople(patch: Partial<People>): void;
  setDayFactor(value: number): void;
  updateSettings(patch: Partial<UserState['settings']>): void;
  /** Mělké sloučení nejvyšší úrovně: vnořené objekty (people, settings) se nahrazují celé. */
  update(patch: Partial<Omit<UserState, 'version'>>): void;
}
```

Za `toggleCooked` přidat:

```ts
  const toggleCart = useCallback((id: string) => setState((s) => toggleCartFn(s, id)), []);
  const setCartMultiplier = useCallback(
    (id: string, multiplier: number) => setState((s) => setCartMultiplierFn(s, id, multiplier)),
    [],
  );
  const removeFromCart = useCallback((id: string) => setState((s) => removeFromCartFn(s, id)), []);
  const setPeople = useCallback((patch: Partial<People>) => setState((s) => setPeopleFn(s, patch)), []);
  const setDayFactor = useCallback((value: number) => setState((s) => setDayFactorFn(s, value)), []);
  const updateSettings = useCallback(
    (patch: Partial<UserState['settings']>) => setState((s) => updateSettingsFn(s, patch)),
    [],
  );
```

a `value`:

```ts
  const value = useMemo(
    () => ({ state, toggleFavorite, toggleCooked, toggleCart, setCartMultiplier, removeFromCart, setPeople, setDayFactor, updateSettings, update }),
    [state, toggleFavorite, toggleCooked, toggleCart, setCartMultiplier, removeFromCart, setPeople, setDayFactor, updateSettings, update],
  );
```

- [ ] **Step 7: Spustit testy**

Run: `npx vitest run src/state && npm run build && npm run lint`
Expected: PASS, build i lint čisté.

- [ ] **Step 8: Commit**

```bash
git add src/state/userState.ts src/state/userState.test.ts src/state/UserStateProvider.tsx src/state/UserStateProvider.test.tsx
git commit -m "feat(state): košík s násobky, osoby, náročnost dne a nastavení s mezemi"
```

---

### Task 5: Layout a routa – košík vlevo, nákupní seznam vpravo, `#/kosik`

**Files:**
- Modify: `src/content/buildPages.ts`, `src/content/buildPages.test.ts`, `src/app/route.ts`, `src/app/route.test.ts`, `src/app/useHashRoute.test.tsx:14-15`, `src/App.tsx` (zástupná stránka košíku + `describePage`), `src/App.test.tsx`

**Interfaces:**
- Consumes: nic nového.
- Produces: `PageKind` obsahuje `'cart'`; `BookLayout.cartIndex: number` (lichý); `LayoutLike.cartIndex: number` (povinné); `routeToIndex({ kind: 'cart' }, layout) === layout.cartIndex`; `indexToRoute(cartIndex, layout)` vrací `{ kind: 'cart' }`. V `App.tsx` je `case 'cart'` (v tomto tasku zástupná stránka s nadpisem „Košík“, Task 9 ji nahradí `CartPage`).

- [ ] **Step 1: Failing testy layoutu**

V `src/content/buildPages.test.ts`:

1. Test `'obal 0, úvod 1–2, kapitoly na pravé straně'` přejmenovat na `'obal 0, úvod 1–2, kapitoly vpravo, košík vlevo a seznam vpravo, tiráž poslední'` a jeho poslední tři řádky
```ts
    expect(layout.listIndex % 2).toBe(0)
    expect(layout.settingsIndex).toBe(layout.entries.length - 1)
    expect(layout.settingsIndex).toBe(layout.listIndex + 1)
```
nahradit
```ts
    expect(layout.cartIndex % 2).toBe(1)
    expect(layout.entries[layout.cartIndex]).toMatchObject({ id: 'cart', kind: 'cart' })
    expect(layout.listIndex).toBe(layout.cartIndex + 1)
    expect(layout.listIndex % 2).toBe(0)
    expect(layout.settingsIndex).toBe(layout.listIndex + 1)
    expect(layout.settingsIndex).toBe(layout.entries.length - 1)
```
2. Test `'prázdné stránky jen před kapitolou nebo seznamem'` přejmenovat na `'prázdné stránky jen před kapitolou nebo košíkem'` a `['chapter', 'list']` změnit na `['chapter', 'cart']`.
3. Do `describe.each` přidat:
```ts
  test('košík, seznam a tiráž mají své routy', () => {
    const layout = buildLayout(data, { tocPageCount: 2 })
    expect(routeToIndex({ kind: 'cart' }, layout)).toBe(layout.cartIndex)
    expect(indexToRoute(layout.cartIndex, layout)).toEqual({ kind: 'cart' })
    expect(indexToRoute(layout.listIndex, layout)).toEqual({ kind: 'list' })
    expect(indexToRoute(layout.settingsIndex, layout)).toEqual({ kind: 'settings' })
  })
```
4. Test `'syntetický layout: přesné pořadí'` – očekávané pole nahradit:
```ts
  expect(layout.entries.map((e) => e.id)).toEqual([
    'cover', 'about-left', 'about-right', 'toc-0',
    'chapter-polevky', 'recipe-a', 'recipe-a:postup', 'recipe-b', 'recipe-b:postup',
    'blank-0', 'chapter-sladke', 'recipe-c', 'recipe-c:postup',
    'cart', 'list', 'settings',
  ])
```
5. Na konec souboru:
```ts
test('kniha bez receptů: prázdná stránka posune košík na levou stranu', () => {
  const layout = buildLayout([], { tocPageCount: 1 })
  expect(layout.entries.map((e) => e.id)).toEqual(['cover', 'about-left', 'about-right', 'toc-0', 'blank-0', 'cart', 'list', 'settings'])
  expect(layout.cartIndex).toBe(5)
})
```

- [ ] **Step 2: Failing testy routy**

V `src/app/route.test.ts`:
- komentář nad `layout` změnit na `// ručně sestavený layout: 0 obal, 1–2 o knize, 3 obsah, 4 kapitola polévky, 5–6 recepty, 7 košík, 8 seznam, 9 nastavení`;
- v `entries` nahradit `{ kind: 'blank' }, { kind: 'list' }, { kind: 'settings' },` za `{ kind: 'cart' }, { kind: 'list' }, { kind: 'settings' },`;
- za `tocIndex: 3,` přidat `cartIndex: 7,`;
- v testu `'routeToHash je inverzí parseRoute'` přidat do pole `'#/kosik'`;
- v testu `'indexToRoute'` řádek `expect(indexToRoute(7, layout)).toEqual({ kind: 'recipe', id: 'kulajda' })` nahradit `expect(indexToRoute(7, layout)).toEqual({ kind: 'cart' })`;
- test `'rezervovaná routa košíku #/kosik'` celý nahradit:
```ts
test('routa košíku #/kosik má stránku', () => {
  expect(parseRoute('#/kosik')).toEqual({ kind: 'cart' })
  expect(routeToHash({ kind: 'cart' })).toBe('#/kosik')
  expect(routeToIndex({ kind: 'cart' }, layout)).toBe(7)
})
```

V `src/app/useHashRoute.test.tsx` řádky `listIndex: 6,` a `settingsIndex: 7,` nahradit `cartIndex: 6,`, `listIndex: 7,`, `settingsIndex: 8,`.

Run: `npx vitest run src/content/buildPages.test.ts src/app`
Expected: FAIL (chybí `cartIndex`, `indexToRoute(7)` vrací recept).

- [ ] **Step 3: Implementace layoutu a routy**

`src/content/buildPages.ts`:
```ts
export type PageKind = 'cover' | 'about' | 'toc' | 'chapter' | 'recipe' | 'blank' | 'cart' | 'list' | 'settings'
```
do `BookLayout` za `tocIndex: number` přidat:
```ts
  /** Košík: vždy levá strana (lichý index), nákupní seznam hned za ním vpravo. */
  cartIndex: number
```
dokumentační komentář funkce doplnit větou „Košík je na levé (liché) straně a nákupní seznam vedle něj na pravé – na desktopu jedna dvoustrana; tiráž je poslední.“; za `alignToRight` přidat
```ts
  const alignToLeft = () => {
    if (entries.length % 2 === 0) push({ id: `blank-${blankCount++}`, kind: 'blank' })
  }
```
a konec funkce nahradit:
```ts
  alignToLeft()
  const cartIndex = push({ id: 'cart', kind: 'cart' })
  const listIndex = push({ id: 'list', kind: 'list' })
  const settingsIndex = push({ id: 'settings', kind: 'settings' })

  return { entries, recipeIndex, chapterIndex, tocIndex, cartIndex, listIndex, settingsIndex }
```

`src/app/route.ts`: v `LayoutLike` nahradit
```ts
  /** Stránka košíku – přibude ve fázi 5. */
  cartIndex?: number
```
za
```ts
  cartIndex: number
```
v `routeToIndex` `case 'cart': return layout.cartIndex ?? null` → `case 'cart': return layout.cartIndex`; v `indexToRoute` za řádek s `toc` přidat
```ts
    if (e.kind === 'cart') return { kind: 'cart' }
```

- [ ] **Step 4: Zástupná stránka košíku v aplikaci + failing test**

Do `src/App.test.tsx` přidat:
```tsx
test('#/kosik otevře stránku košíku a aria-live ji hlásí', () => {
  history.replaceState(null, '', '#/kosik')
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Košík' })).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent(/– Košík$/)
})
```
V `src/App.tsx` do `renderEntry` před `case 'list':` přidat
```tsx
        case 'cart':
          return { id: entry.id, render: () => <Placeholder title="Košík" /> }
```
a do `describePage` před `case 'list':`
```ts
    case 'cart': name = 'Košík'; break
```

- [ ] **Step 5: Spustit testy**

Run: `npm test && npm run build && npm run lint`
Expected: PASS, build i lint čisté.

- [ ] **Step 6: Commit**

```bash
git add src/content/buildPages.ts src/content/buildPages.test.ts src/app/route.ts src/app/route.test.ts src/app/useHashRoute.test.tsx src/App.tsx src/App.test.tsx
git commit -m "feat(layout): stránka košíku vlevo před nákupním seznamem a routa #/kosik"
```

---

### Task 6: Stránka receptu – množství pro aktuální počet osob, varianta suroviny, nutrice na porci

**Files:**
- Modify: `src/pages/labels.ts`, `src/pages/labels.test.ts`, `src/pages/IngredientTable.tsx`, `src/pages/IngredientTable.test.tsx`, `src/pages/RecipePage.tsx`, `src/pages/RecipePage.test.tsx`, `src/App.tsx`, `src/styles/paper.css`
- Create: `src/pages/NutritionFacts.tsx`

**Interfaces:**
- Consumes: `Portions`, `People`, `persons`, `recipeScale`, `onePersonScale`, `effectiveLine` (Task 1); `Macros`, `recipeMacrosPerServing` (Task 3); `scaleLine` (`@/domain/scaling`).
- Produces (`src/pages/labels.ts`):
```ts
export function plural(n: number, one: string, few: string, many: string): string
export function peopleLabel(n: number): string            // „1 osobu“, „2 osoby“, „24 osob“
export function peopleBreakdown(p: People): string        // „18 dětí + 6 dospělých“, '' bez dětí
export function peopleHeading(p: People): string          // „Pro 24 osob (18 dětí + 6 dospělých)“
export function formatDecimal(n: number, digits?: number): string  // 20.4 → „20,4“
export function formatInteger(n: number): string           // 2300 → „2 300“ (U+00A0)
export function formatMacros(m: Macros): string            // „407 kcal · bílkoviny 33 g · sacharidy 10 g · tuky 25 g“
// formatAmount: ≥ 1000 g → kg, ≥ 1000 ml → l
```
- Produces: `IngredientTable` props `{ recipe, ingredients, portions: Portions, historical: boolean, perPerson?: boolean }`; `NutritionFacts` props `{ macros: Macros }`; `RecipeLeft` props navíc `portions: Portions`, `historical: boolean`.

- [ ] **Step 1: Failing testy popisků**

`src/pages/labels.test.ts` – import rozšířit na `import { difficultyDots, formatAmount, formatDecimal, formatInteger, formatMacros, peopleBreakdown, peopleHeading, peopleLabel, plural } from './labels'` a do `describe('labels')` přidat:
```ts
  it('český tvar podle počtu (desetinné číslo = tvar pro 2–4)', () => {
    expect(plural(1, 'osobu', 'osoby', 'osob')).toBe('osobu')
    expect(plural(3, 'osobu', 'osoby', 'osob')).toBe('osoby')
    expect(plural(5, 'osobu', 'osoby', 'osob')).toBe('osob')
    expect(plural(0, 'osobu', 'osoby', 'osob')).toBe('osob')
    expect(plural(20.4, 'porci', 'porce', 'porcí')).toBe('porce')
  })
  it('popis osob', () => {
    expect(peopleLabel(1)).toBe('1 osobu')
    expect(peopleLabel(24)).toBe('24 osob')
    expect(peopleBreakdown({ adults: 6, children: 18 })).toBe('18 dětí + 6 dospělých')
    expect(peopleBreakdown({ adults: 1, children: 2 })).toBe('2 děti + 1 dospělý')
    expect(peopleBreakdown({ adults: 0, children: 1 })).toBe('1 dítě')
    expect(peopleBreakdown({ adults: 2, children: 0 })).toBe('')
    expect(peopleHeading({ adults: 6, children: 18 })).toBe('Pro 24 osob (18 dětí + 6 dospělých)')
    expect(peopleHeading({ adults: 2, children: 0 })).toBe('Pro 2 osoby')
  })
  it('desetinná a velká čísla, kg a l', () => {
    expect(formatDecimal(20.4)).toBe('20,4')
    expect(formatDecimal(1.15, 2)).toBe('1,15')
    expect(formatDecimal(4)).toBe('4')
    expect(formatInteger(2300)).toBe('2\u00a0300')
    expect(formatInteger(975.6)).toBe('976')
    expect(formatAmount(999, 'g')).toBe('999 g')
    expect(formatAmount(1230, 'g')).toBe('1,23 kg')
    expect(formatAmount(6900, 'ml')).toBe('6,9 l')
    expect(formatAmount(125000, 'g')).toBe('125 kg')
  })
  it('makra na porci', () => {
    expect(formatMacros({ kcal: 406.5, protein: 32.52, carbs: 9.6, fat: 25.7 })).toBe('407 kcal · bílkoviny 33 g · sacharidy 10 g · tuky 26 g')
  })
```

Run: `npx vitest run src/pages/labels.test.ts`
Expected: FAIL – `plural is not a function`.

- [ ] **Step 2: Implementace popisků**

V `src/pages/labels.ts` rozšířit importy:
```ts
import type { Macros } from '@/domain/nutrition'
import type { People } from '@/domain/portions'
```
`formatAmount` nahradit a za něj přidat:
```ts
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
```

Run: `npx vitest run src/pages/labels.test.ts`
Expected: PASS

- [ ] **Step 3: Failing testy tabulky surovin**

`src/pages/IngredientTable.test.tsx` celý nahradit:
```tsx
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { loadContent } from '@/content/loadContent'
import { scaleLine } from '@/domain/scaling'
import { IngredientTable } from './IngredientTable'
import { formatAmount } from './labels'

const { recipes, ingredients } = loadContent()
const byId = (id: string) => recipes.find((r) => r.id === id)!
const portions = (adults: number, children: number, dayFactor = 1) => ({ people: { adults, children }, childCoef: 0.8, dayFactor })

describe('IngredientTable', () => {
  it('4 dospělí: hlavička „Pro 4 osoby“, všechny řádky a šedá hodnota na osobu', () => {
    const recipe = byId('chilli-con-carne')
    render(<IngredientTable recipe={recipe} ingredients={ingredients} portions={portions(4, 0)} historical={false} />)
    expect(screen.getAllByRole('row')).toHaveLength(recipe.ingredients.length + 1)
    expect(screen.getByRole('columnheader', { name: 'Pro 4 osoby' })).toBeInTheDocument()
    const line = recipe.ingredients.find((l) => l.ingredientId === 'sul')!
    const one = scaleLine(line, ingredients.get('sul')!, 0.25)
    const row = screen.getByText(ingredients.get('sul')!.name).closest('tr')!
    expect(within(row).getAllByText(formatAmount(one.amount, one.unit)).length).toBeGreaterThan(0)
  })

  it('18 dětí + 6 dospělých: P = 20,4, k = 5,1 – vejce 7,25 ks → 37 ks, na osobu 2 ks', () => {
    render(<IngredientTable recipe={byId('michana-vejce')} ingredients={ingredients} portions={portions(6, 18)} historical={false} />)
    expect(screen.getByRole('columnheader', { name: 'Pro 24 osob' })).toBeInTheDocument()
    expect(screen.getByText('18 dětí + 6 dospělých · přepočteno na 20,4 porce')).toBeInTheDocument()
    const row = screen.getByText('Vejce').closest('tr')!
    expect(within(row).getByText('37 ks')).toBeInTheDocument()
    expect(within(row).getByText('2 ks')).toBeInTheDocument()
  })

  it('náročnost dne se promítne do popisu i množství', () => {
    render(<IngredientTable recipe={byId('michana-vejce')} ingredients={ingredients} portions={portions(4, 0, 1.25)} historical={false} />)
    expect(screen.getByText('přepočteno na 5 porcí (náročnost dne 1,25)')).toBeInTheDocument()
    const row = screen.getByText('Vejce').closest('tr')!
    expect(within(row).getByText('9½ ks')).toBeInTheDocument() // P = 5, k = 1,25: 7,25 × 1,25 = 9,06 → nahoru 9½
  })

  it('historické suroviny: řádek z original a poznámka s dnešní variantou', () => {
    const recipe = byId('americke-palacinky')
    const frozen = ingredients.get('vejce-mrazena')!.name
    const { rerender } = render(<IngredientTable recipe={recipe} ingredients={ingredients} portions={portions(4, 0)} historical={false} />)
    expect(screen.getByText(`původně: ${frozen} 50 g`)).toBeInTheDocument()
    rerender(<IngredientTable recipe={recipe} ingredients={ingredients} portions={portions(4, 0)} historical />)
    expect(screen.getByText(frozen)).toBeInTheDocument()
    expect(screen.getByText('dnes: Vejce 1 ks')).toBeInTheDocument()
  })

  it('slévaná voda (vessel) má poznámku „podle nádoby“', () => {
    render(<IngredientTable recipe={byId('spagety-s-maslem-a-syrem')} ingredients={ingredients} portions={portions(4, 0)} historical={false} />)
    const row = screen.getByText('Voda').closest('tr')!
    expect(within(row).getByText('(podle nádoby)')).toBeInTheDocument()
  })
})
```

Run: `npx vitest run src/pages/IngredientTable.test.tsx`
Expected: FAIL (props `portions`/`historical` neexistují, hlavička „Pro 4 porce“).

- [ ] **Step 4: Implementace tabulky a nutrice**

`src/pages/IngredientTable.tsx` celý nahradit:
```tsx
import type { ReactNode } from 'react'
import { effectiveLine, onePersonScale, persons, recipeScale, type Portions } from '@/domain/portions'
import { scaleLine } from '@/domain/scaling'
import type { Ingredient, IngredientLine, Recipe } from '@/domain/types'
import { formatAmount, formatDecimal, peopleBreakdown, peopleLabel, plural } from './labels'

interface Props {
  recipe: Recipe
  ingredients: Map<string, Ingredient>
  /** Osoby, koeficient dítěte a náročnost dne (záložka + tiráž). */
  portions: Portions
  /** Přepínač historických surovin (tiráž). */
  historical: boolean
  perPerson?: boolean
}

/** Drobná poznámka u nahrazené suroviny: druhá varianta než ta, která je v řádku. */
function variantNote(raw: IngredientLine, historical: boolean, ingredients: Map<string, Ingredient>): ReactNode {
  if (!raw.original) return null
  const other = historical ? { ingredientId: raw.ingredientId, amount: raw.amount, unit: raw.unit } : raw.original
  const name = ingredients.get(other.ingredientId)?.name ?? other.ingredientId
  return (
    <small className="ingredient-original">
      {historical ? 'dnes' : 'původně'}: {name} {formatAmount(other.amount, other.unit)}
    </small>
  )
}

export function IngredientTable({ recipe, ingredients, portions, historical, perPerson = true }: Props) {
  const P = persons(portions)
  const k = recipeScale(P, 1, recipe.baseServings)
  const kOne = onePersonScale(portions, recipe.baseServings)
  const breakdown = peopleBreakdown(portions.people)
  const rows: ReactNode[] = []
  let lastGroup: string | undefined
  recipe.ingredients.forEach((raw, i) => {
    const line = effectiveLine(raw, historical)
    const ing = ingredients.get(line.ingredientId)
    if (!ing) return
    if (line.group && line.group !== lastGroup) {
      rows.push(
        <tr key={`g${i}`} className="ingredient-group">
          <th colSpan={perPerson ? 3 : 2} scope="colgroup">{line.group}</th>
        </tr>,
      )
    }
    lastGroup = line.group
    const full = scaleLine(line, ing, k)
    const one = scaleLine(line, ing, kOne)
    const vessel = (line.scaling ?? ing.scaling) === 'vessel'
    rows.push(
      <tr key={i}>
        <td>
          {ing.name}
          {line.note && <span className="ingredient-note">, {line.note}</span>}
          {line.optional && <span className="ingredient-note"> (volitelné)</span>}
          {vessel && <span className="ingredient-note"> (podle nádoby)</span>}
          {variantNote(raw, historical, ingredients)}
        </td>
        <td className="ingredient-amount">{formatAmount(full.amount, full.unit)}</td>
        {perPerson && <td className="ingredient-per-person">{formatAmount(one.amount, one.unit)}</td>}
      </tr>,
    )
  })
  const day = portions.dayFactor !== 1 ? ` (náročnost dne ${formatDecimal(portions.dayFactor, 2)})` : ''
  return (
    <>
      <table className="ingredient-table">
        <thead>
          <tr>
            <th scope="col">Surovina</th>
            <th scope="col">Pro {peopleLabel(portions.people.adults + portions.people.children)}</th>
            {perPerson && <th scope="col" className="ingredient-per-person">Na osobu</th>}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
      <p className="ingredient-scale-note">
        {`${breakdown ? `${breakdown} · ` : ''}přepočteno na ${formatDecimal(P)} ${plural(P, 'porci', 'porce', 'porcí')}${day}`}
      </p>
    </>
  )
}
```
(Text poznámky je jeden řetězec – jeden textový uzel, aby ho `getByText` našel celý.)

`src/pages/NutritionFacts.tsx`:
```tsx
import type { Macros } from '@/domain/nutrition'
import { formatMacros } from './labels'

/** Orientační nutrice na jednu porci receptu (spec §3). */
export function NutritionFacts({ macros }: { macros: Macros }) {
  return (
    <p className="nutrition-facts">
      <span className="nutrition-facts__label">Na porci (orientačně):</span> {formatMacros(macros)}
    </p>
  )
}
```

- [ ] **Step 5: Failing test levé strany receptu**

`src/pages/RecipePage.test.tsx`: přidat importy `import { recipeMacrosPerServing } from '@/domain/nutrition'` a do importu z `./labels` doplnit `formatInteger`; v `setupLeft` rozšířit `props` o `portions: { people: { adults: 4, children: 0 }, childCoef: 0.8, dayFactor: 1 }, historical: false,` (před `...over`); do `describe('RecipeLeft')` přidat:
```tsx
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
```

Run: `npx vitest run src/pages/RecipePage.test.tsx`
Expected: FAIL – text „Na porci (orientačně):“ nenalezen.

- [ ] **Step 6: Levá strana receptu a aplikace**

`src/pages/RecipePage.tsx`: importy doplnit
```tsx
import { recipeMacrosPerServing } from '@/domain/nutrition'
import type { Portions } from '@/domain/portions'
import { NutritionFacts } from './NutritionFacts'
```
do `LeftProps` přidat
```ts
  portions: Portions
  historical: boolean
```
destrukturovat `portions, historical` v `RecipeLeft` a řádek s tabulkou nahradit:
```tsx
      <IngredientTable recipe={recipe} ingredients={ingredients} portions={portions} historical={historical} perPerson />
      <NutritionFacts macros={recipeMacrosPerServing(recipe, ingredients, historical)} />
```

`src/App.tsx`: import `import type { Portions } from '@/domain/portions'`; za `const { state, toggleFavorite, toggleCooked } = useUserState()` přidat
```tsx
  const portions = useMemo<Portions>(
    () => ({ people: state.people, childCoef: state.settings.childCoef, dayFactor: state.dayFactor }),
    [state.people, state.settings.childCoef, state.dayFactor],
  )
  const historical = state.settings.historicalIngredients
```
v `<RecipeLeft … />` přidat `portions={portions}` a `historical={historical}`; do závislostí `useMemo` stránek přidat `portions, historical`.

`src/styles/paper.css` za `.ingredient-per-person { … }`:
```css
.ingredient-scale-note { margin: 0.3em 0 0; font-family: var(--font-table); font-size: 0.75em; color: var(--ink-soft); }
.nutrition-facts { margin: 0.6em 0 0; font-family: var(--font-table); font-size: 0.8em; }
.nutrition-facts__label { font-style: italic; color: var(--ink-soft); }
```

- [ ] **Step 7: Spustit testy**

Run: `npm test && npm run build && npm run lint`
Expected: PASS, build i lint čisté.

- [ ] **Step 8: Commit**

```bash
git add src/pages/labels.ts src/pages/labels.test.ts src/pages/IngredientTable.tsx src/pages/IngredientTable.test.tsx src/pages/NutritionFacts.tsx src/pages/RecipePage.tsx src/pages/RecipePage.test.tsx src/App.tsx src/styles/paper.css
git commit -m "feat(recept): množství pro aktuální počet osob, historická varianta a nutrice na porci"
```

---

### Task 7: Tlačítko „Do košíku“ na stránce receptu a v řádku obsahu

**Files:**
- Modify: `src/pages/icons.tsx`, `src/pages/RecipeMarks.tsx`, `src/pages/RecipeMarks.test.tsx`, `src/pages/RecipePage.tsx`, `src/pages/RecipePage.test.tsx`, `src/pages/TocPages.tsx`, `src/pages/TocPages.test.tsx`, `src/content/search.ts:105-106`, `src/App.tsx`, `src/App.test.tsx`, `src/styles/paper.css`

**Interfaces:**
- Consumes: `toggleCart(id)` a `state.cart` z `useUserState()` (Task 4).
- Produces: `CartIcon({ filled?: boolean })` v `src/pages/icons.tsx`; `RecipeMarks` volitelné props `inCart?: boolean`, `onToggleCart?: () => void` (třetí tlačítko `.mark.mark--cart`, `aria-label` „Do košíku“ / „Do košíku: <název>“, `aria-pressed`); `RecipeLeft` props navíc `inCart: boolean`, `onToggleCart: () => void`; `TocPages` props navíc `inCart: Set<string>`, `onToggleCart: (id: string) => void`; `TOC_LONG_TITLE_CHARS = 18`.

- [ ] **Step 1: Failing testy**

`src/pages/RecipeMarks.test.tsx` – přidat:
```tsx
test('košík je jen s onToggleCart, odráží stav a volá callback', async () => {
  setup()
  expect(screen.queryByRole('button', { name: /Do košíku/ })).toBeNull()
  const onToggleCart = vi.fn()
  setup({ inCart: true, onToggleCart, label: 'Hovězí guláš', compact: true })
  const btn = screen.getByRole('button', { name: 'Do košíku: Hovězí guláš' })
  expect(btn).toHaveAttribute('aria-pressed', 'true')
  expect(btn.querySelector('svg path')).toHaveAttribute('fill', 'currentColor')
  await userEvent.click(btn)
  expect(onToggleCart).toHaveBeenCalledTimes(1)
})
```

`src/pages/RecipePage.test.tsx` – v `setupLeft` do `props` přidat `inCart: false, onToggleCart: vi.fn(),` a do `describe('RecipeLeft')`:
```tsx
  it('tlačítko Do košíku je vedle srdíčka a hrnce', async () => {
    const { props } = setupLeft()
    const btn = screen.getByRole('button', { name: 'Do košíku' })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    expect(btn.closest('.recipe-head')).not.toBeNull()
    await userEvent.click(btn)
    expect(props.onToggleCart).toHaveBeenCalledTimes(1)
  })
```

`src/pages/TocPages.test.tsx` – v `setup` do `props` přidat `inCart: new Set<string>(), onToggleCart: vi.fn(),` a přidat:
```tsx
test('ikona košíku v řádku přepne košík a neotevře recept', () => {
  const first = recipes[0]
  const { props } = setup({ inCart: new Set([first.id]) })
  const btn = screen.getByRole('button', { name: `Do košíku: ${first.title}` })
  expect(btn).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(btn)
  expect(props.onToggleCart).toHaveBeenCalledWith(first.id)
  expect(props.onNavigate).not.toHaveBeenCalled()
})
```

`src/App.test.tsx` – do `beforeEach` přidat první řádek `localStorage.clear()` (stav se ukládá i při odmontování a nesmí prosakovat mezi testy) a přidat:
```tsx
test('Do košíku na stránce receptu přidá recept', () => {
  history.replaceState(null, '', '#/recept/hovezi-gulas')
  render(<App />)
  const btn = screen.getByRole('button', { name: 'Do košíku' })
  fireEvent.click(btn)
  expect(btn).toHaveAttribute('aria-pressed', 'true')
})
```

Run: `npx vitest run src/pages src/App.test.tsx`
Expected: FAIL – tlačítko „Do košíku“ neexistuje.

- [ ] **Step 2: Ikona a tlačítko**

`src/pages/icons.tsx` – přidat:
```tsx
export function CartIcon({ filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8h14.5l-1.7 6.6a1.6 1.6 0 0 1-1.6 1.2H9a1.6 1.6 0 0 1-1.6-1.3z" fill={filled ? 'currentColor' : 'none'} />
      <path d="M2.5 4h2.6L7.4 14.5" />
      <circle cx="9.5" cy="19.5" r="1.4" />
      <circle cx="17" cy="19.5" r="1.4" />
    </svg>
  )
}
```

`src/pages/RecipeMarks.tsx` – import `import { CartIcon, HeartIcon, PotIcon } from './icons'`; do `Props` přidat
```ts
  /** Košík: tlačítko se vykreslí jen s `onToggleCart` (stránka receptu, řádek obsahu). */
  inCart?: boolean
  onToggleCart?: () => void
```
destrukturovat `inCart = false, onToggleCart` a za tlačítko hrnce přidat:
```tsx
      {onToggleCart && (
        <button
          type="button"
          className="mark mark--cart"
          aria-pressed={inCart}
          aria-label={`Do košíku${suffix}`}
          title={inCart ? 'V košíku – kliknutím odebrat' : 'Přidat do košíku'}
          onClick={onToggleCart}
        >
          <CartIcon filled={inCart} />
        </button>
      )}
```

`src/pages/RecipePage.tsx` – do `LeftProps` přidat `inCart: boolean` a `onToggleCart: () => void`, destrukturovat a `RecipeMarks` rozšířit o `inCart={inCart} onToggleCart={onToggleCart}`.

`src/pages/TocPages.tsx` – do `TocPagesProps` přidat
```ts
  inCart: Set<string>
  onToggleCart: (id: string) => void
```
destrukturovat v `TocPages` a `RecipeMarks` v řádku rozšířit o
```tsx
                inCart={inCart.has(row.recipe.id)}
                onToggleCart={() => onToggleCart(row.recipe.id)}
```

`src/content/search.ts` – konstantu a komentář nahradit:
```ts
/** Delší název se na mobilu zalomí na dva řádky (při 320 px; tři značky v řádku – srdíčko, hrnec, košík – mají 80 px). */
export const TOC_LONG_TITLE_CHARS = 18
```

`src/App.tsx` – `const { state, toggleFavorite, toggleCooked, toggleCart } = useUserState()`; za `cooked` přidat
```tsx
  const inCart = useMemo(() => new Set(state.cart.map((e) => e.recipeId)), [state.cart])
```
`TocPages` dostane `inCart={inCart}` a `onToggleCart={toggleCart}`, `RecipeLeft` dostane `inCart={inCart.has(recipe.id)}` a `onToggleCart={() => toggleCart(recipe.id)}`; do závislostí `useMemo` stránek přidat `inCart, toggleCart`.

`src/styles/paper.css` za `.mark--cooked[aria-pressed="true"] { … }`:
```css
.mark--cart[aria-pressed="true"] { color: var(--ink); }
```

- [ ] **Step 3: Spustit testy**

Run: `npm test && npm run build && npm run lint`
Expected: PASS (testy stránkování obsahu v `search.test.ts` používají konstantu, nová hodnota je projde), build i lint čisté.

- [ ] **Step 4: Commit**

```bash
git add src/pages/icons.tsx src/pages/RecipeMarks.tsx src/pages/RecipeMarks.test.tsx src/pages/RecipePage.tsx src/pages/RecipePage.test.tsx src/pages/TocPages.tsx src/pages/TocPages.test.tsx src/content/search.ts src/App.tsx src/App.test.tsx src/styles/paper.css
git commit -m "feat(košík): tlačítko Do košíku na stránce receptu a v obsahu"
```

---

### Task 8: Záložka – stužka s osobami, náročností dne a skokem do košíku

**Files:**
- Create: `src/pages/NumberField.tsx`, `src/pages/NumberField.test.tsx`, `src/app/Bookmark.tsx`, `src/app/Bookmark.test.tsx`
- Modify: `src/App.tsx`, `src/App.test.tsx`, `src/styles/paper.css`, `src/styles/print.css`, `src/styles/print.test.ts`

**Interfaces:**
- Consumes: `DAY_FACTOR_MIN/MAX/STEP`, `People` (Task 1); `PEOPLE_MAX` (Task 4); `setPeople`, `setDayFactor` z `useUserState()` (Task 4); `CartIcon` (Task 7); `plural`, `formatDecimal` (Task 6).
- Produces:
```ts
// src/pages/NumberField.tsx – číselné pole; rozepsanou hodnotu drží lokálně, prázdnou/neplatnou nepotvrdí, po blur ukáže `value`
export function NumberField(props: { label: string; value: number; min: number; max: number; step?: number; onCommit: (value: number) => void }): JSX.Element
// src/app/Bookmark.tsx
export function Bookmark(props: {
  people: People; dayFactor: number; cartCount: number
  onPeopleChange: (patch: Partial<People>) => void
  onDayFactorChange: (value: number) => void
  onOpenCart: () => void
}): JSX.Element
```

- [ ] **Step 1: Failing test číselného pole**

```tsx
// src/pages/NumberField.test.tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { NumberField } from './NumberField'

test('potvrdí platné číslo, prázdné nepotvrdí a po opuštění ukáže uloženou (upnutou) hodnotu', () => {
  const onCommit = vi.fn()
  const field = (value: number) => <NumberField label="Děti" value={value} min={0} max={500} onCommit={onCommit} />
  const { rerender } = render(field(2))
  const input = screen.getByRole('spinbutton', { name: 'Děti' })
  expect(input).toHaveValue(2)
  fireEvent.change(input, { target: { value: '' } })
  expect(onCommit).not.toHaveBeenCalled()
  expect(input).toHaveValue(null)
  fireEvent.change(input, { target: { value: '18' } })
  expect(onCommit).toHaveBeenLastCalledWith(18)
  fireEvent.change(input, { target: { value: '600' } })
  expect(onCommit).toHaveBeenLastCalledWith(600)
  rerender(field(500)) // rodič hodnotu upnul
  expect(input).toHaveValue(600) // rozepsaná hodnota zůstává, dokud pole nemá focus pryč
  fireEvent.blur(input)
  expect(input).toHaveValue(500)
})
```

Run: `npx vitest run src/pages/NumberField.test.tsx`
Expected: FAIL – `Failed to resolve import "./NumberField"`.

- [ ] **Step 2: Implementace `NumberField`**

```tsx
// src/pages/NumberField.tsx
import { useState } from 'react'

interface Props {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onCommit: (value: number) => void
}

/** Číselné pole: rozepsaný text drží lokálně (lze smazat a psát znovu), platné číslo hned potvrdí, po opuštění ukáže uloženou hodnotu. */
export function NumberField({ label, value, min, max, step = 1, onCommit }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <label className="number-field">
      <span className="number-field__label">{label}</span>
      <input
        type="number"
        inputMode={step < 1 ? 'decimal' : 'numeric'}
        min={min}
        max={max}
        step={step}
        value={draft ?? String(value)}
        onChange={(e) => {
          const text = e.currentTarget.value
          setDraft(text)
          const n = Number(text)
          if (text.trim() !== '' && Number.isFinite(n)) onCommit(n)
        }}
        onBlur={() => setDraft(null)}
      />
    </label>
  )
}
```

Run: `npx vitest run src/pages/NumberField.test.tsx`
Expected: PASS

- [ ] **Step 3: Failing testy záložky**

```tsx
// src/app/Bookmark.test.tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { Bookmark } from './Bookmark'

function setup(over: Partial<React.ComponentProps<typeof Bookmark>> = {}) {
  const props = {
    people: { adults: 6, children: 18 }, dayFactor: 1, cartCount: 3,
    onPeopleChange: vi.fn(), onDayFactorChange: vi.fn(), onOpenCart: vi.fn(),
    ...over,
  }
  return { ...render(<Bookmark {...props} />), props }
}
const tab = () => screen.getByRole('button', { name: /^Košík:/ })

test('zavřená záložka ukazuje počet receptů a osob', () => {
  setup()
  expect(screen.getByRole('button', { name: 'Košík: 3 recepty · 24 os.' })).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByRole('spinbutton')).toBeNull()
})

test('tvar slova recept podle počtu', () => {
  setup({ cartCount: 1, people: { adults: 2, children: 0 } })
  expect(screen.getByRole('button', { name: 'Košík: 1 recept · 2 os.' })).toBeInTheDocument()
})

test('panel: dospělí, děti, náročnost dne a skok do košíku', () => {
  const { props } = setup()
  fireEvent.click(tab())
  expect(tab()).toHaveAttribute('aria-expanded', 'true')
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Děti' }), { target: { value: '20' } })
  expect(props.onPeopleChange).toHaveBeenCalledWith({ children: 20 })
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Dospělí' }), { target: { value: '4' } })
  expect(props.onPeopleChange).toHaveBeenCalledWith({ adults: 4 })
  const slider = screen.getByRole('slider', { name: /Náročnost dne/ })
  expect(slider).toHaveAttribute('min', '0.8')
  expect(slider).toHaveAttribute('max', '1.3')
  fireEvent.change(slider, { target: { value: '1.2' } })
  expect(props.onDayFactorChange.mock.calls[0][0]).toBeCloseTo(1.2)
  fireEvent.click(screen.getByRole('button', { name: /Otevřít košík/ }))
  expect(props.onOpenCart).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('spinbutton')).toBeNull()
})

test('Escape vrátí fokus na záložku, klik mimo panel ho zavře, klik dovnitř ne', () => {
  setup()
  fireEvent.click(tab())
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(tab()).toHaveAttribute('aria-expanded', 'false')
  expect(tab()).toHaveFocus()
  fireEvent.click(tab())
  fireEvent.pointerDown(screen.getByRole('spinbutton', { name: 'Děti' }))
  expect(tab()).toHaveAttribute('aria-expanded', 'true')
  fireEvent.pointerDown(document.body)
  expect(tab()).toHaveAttribute('aria-expanded', 'false')
})
```

Run: `npx vitest run src/app/Bookmark.test.tsx`
Expected: FAIL – `Failed to resolve import "./Bookmark"`.

- [ ] **Step 4: Implementace záložky**

```tsx
// src/app/Bookmark.tsx
import { useEffect, useId, useRef, useState } from 'react'
import { DAY_FACTOR_MAX, DAY_FACTOR_MIN, DAY_FACTOR_STEP, type People } from '@/domain/portions'
import { PEOPLE_MAX } from '@/state/userState'
import { CartIcon } from '@/pages/icons'
import { formatDecimal, plural } from '@/pages/labels'
import { NumberField } from '@/pages/NumberField'

interface Props {
  people: People
  dayFactor: number
  cartCount: number
  onPeopleChange: (patch: Partial<People>) => void
  onDayFactorChange: (value: number) => void
  onOpenCart: () => void
}

/** Papírová stužka vyčnívající z knihy (vlevo nahoře, vždy viditelná): osoby, náročnost dne, počet receptů, skok do košíku. */
export function Bookmark({ people, dayFactor, cartCount, onPeopleChange, onDayFactorChange, onOpenCart }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const tabRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const recipesText = `${cartCount} ${plural(cartCount, 'recept', 'recepty', 'receptů')}`

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: Event) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      tabRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="bookmark" ref={rootRef}>
      <button
        ref={tabRef}
        type="button"
        className="bookmark__tab"
        aria-expanded={open}
        aria-controls={panelId}
        title="Počet osob a košík"
        onClick={() => setOpen((o) => !o)}
      >
        <CartIcon filled={cartCount > 0} />
        <span className="visually-hidden">{'Košík: '}</span>
        <span className="bookmark__count">{cartCount}</span>
        <span className="visually-hidden">{` ${plural(cartCount, 'recept', 'recepty', 'receptů')} · `}</span>
        <span className="bookmark__people">{`${people.adults + people.children} os.`}</span>
      </button>
      {open && (
        <div className="bookmark__panel" id={panelId} role="group" aria-label="Počet osob a košík">
          <NumberField label="Dospělí" value={people.adults} min={0} max={PEOPLE_MAX} onCommit={(adults) => onPeopleChange({ adults })} />
          <NumberField label="Děti" value={people.children} min={0} max={PEOPLE_MAX} onCommit={(children) => onPeopleChange({ children })} />
          <label className="bookmark__range">
            <span>Náročnost dne</span>
            <input
              type="range"
              min={DAY_FACTOR_MIN}
              max={DAY_FACTOR_MAX}
              step={DAY_FACTOR_STEP}
              value={dayFactor}
              onChange={(e) => onDayFactorChange(Number(e.currentTarget.value))}
            />
            <output>{formatDecimal(dayFactor, 2)}</output>
          </label>
          <button
            type="button"
            className="bookmark__go"
            onClick={() => {
              setOpen(false)
              onOpenCart()
            }}
          >
            Otevřít košík ({recipesText})
          </button>
        </div>
      )}
    </div>
  )
}
```

Run: `npx vitest run src/app/Bookmark.test.tsx`
Expected: PASS

- [ ] **Step 5: Zapojení, styly, tisk**

Failing test do `src/App.test.tsx`:
```tsx
test('záložka ukazuje počet receptů v košíku a skočí na košík', () => {
  localStorage.setItem('kucharka.userState.v1', JSON.stringify({ version: 1, cart: [{ recipeId: 'hovezi-gulas', multiplier: 1 }] }))
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /^Košík: 1 recept ·/ }))
  fireEvent.click(screen.getByRole('button', { name: /Otevřít košík/ }))
  expect(location.hash).toBe('#/kosik')
  expect(screen.getByRole('heading', { name: 'Košík' })).toBeInTheDocument()
})
```
a do `src/styles/print.test.ts` v testu `'v tisku se skryjí ovládací prvky…'` přidat `'.bookmark'` do pole selektorů.

Run: `npx vitest run src/App.test.tsx src/styles/print.test.ts`
Expected: FAIL.

`src/App.tsx`: import `import { Bookmark } from '@/app/Bookmark'`; `useUserState()` rozšířit o `setPeople, setDayFactor`; v `return` před `<BookControls …>` vložit:
```tsx
      <Bookmark
        people={state.people}
        dayFactor={state.dayFactor}
        cartCount={state.cart.length}
        onPeopleChange={setPeople}
        onDayFactorChange={setDayFactor}
        onOpenCart={() => navigate({ kind: 'cart' })}
      />
```

`src/styles/print.css`: do seznamu skrytých prvků (`.book-controls, .book__nav, …`) přidat `.bookmark`.

`src/styles/paper.css` za blok `.book-control[aria-pressed="true"] { … }`:
```css
/* záložka: papírová stužka vlevo nahoře, mimo stránky (na mobilu v pruhu nad knihou, vpravo jsou .book-controls) */
.bookmark { position: fixed; top: 0; left: 0.9rem; z-index: 25; font-family: var(--font-table); filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.45)); }
.bookmark__tab {
  display: flex; align-items: center; gap: 0.35rem; min-height: 2.9rem; padding: 0.55rem 0.75rem 1rem;
  font: inherit; font-size: 0.85rem; color: var(--paper); background: #8c2a22; border: 0; cursor: pointer;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 0.45rem), 0 100%);
}
.bookmark__tab svg { width: 1.15rem; height: 1.15rem; }
.bookmark__tab:focus-visible { outline: 2px solid var(--paper); outline-offset: -4px; }
.bookmark__count { font-weight: 600; }
.bookmark__panel {
  position: absolute; top: calc(100% + 0.3rem); left: 0; width: min(17rem, calc(100vw - 1.8rem));
  display: grid; gap: 0.6rem; padding: 0.8rem; color: var(--ink); background: var(--paper);
  border: 1px solid var(--paper-edge); border-radius: 3px;
}
.number-field { display: grid; grid-template-columns: 1fr 5.5rem; align-items: center; gap: 0.5rem; }
.number-field input { width: 100%; font: inherit; padding: 0.25em 0.4em; color: var(--ink); background: var(--note-paper); border: 1px solid var(--ink-soft); border-radius: 3px; }
.bookmark__range { display: grid; grid-template-columns: 1fr auto; gap: 0.2rem 0.5rem; align-items: center; }
.bookmark__range input { grid-column: 1 / -1; width: 100%; accent-color: #8c2a22; }
.bookmark__range output { grid-row: 1; grid-column: 2; font-variant-numeric: tabular-nums; }
.bookmark__go { font: inherit; padding: 0.4em 0.8em; color: var(--paper); background: var(--cover-dark); border: 0; border-radius: 3px; cursor: pointer; }
```

- [ ] **Step 6: Spustit testy**

Run: `npm test && npm run build && npm run lint`
Expected: PASS, build i lint čisté.

- [ ] **Step 7: Commit**

```bash
git add src/pages/NumberField.tsx src/pages/NumberField.test.tsx src/app/Bookmark.tsx src/app/Bookmark.test.tsx src/App.tsx src/App.test.tsx src/styles/paper.css src/styles/print.css src/styles/print.test.ts
git commit -m "feat(košík): záložka se stužkou – osoby, náročnost dne a skok do košíku"
```

---

### Task 9: Stránka košíku – recepty s násobky, osoby, nutriční souhrn, tlačítka tisku (zástupně)

**Files:**
- Create: `src/pages/CartPage.tsx`, `src/pages/CartPage.test.tsx`
- Modify: `src/App.tsx`, `src/App.test.tsx`, `src/styles/paper.css`

**Interfaces:**
- Consumes: `persons`, `Portions`, `People`, `CartLine`, `DEFAULT_KCAL_TARGET` (Task 1); `cartMacrosPerAdult`, `recipeMacrosPerServing`, `dailyKcalTarget`, `coveragePercent` (Task 3); `MULTIPLIER_MAX`, `PEOPLE_MAX` (Task 4); `setPeople`, `setCartMultiplier`, `removeFromCart` z `useUserState()`; `NumberField` (Task 8); `formatDecimal`, `formatInteger`, `formatMacros`, `peopleHeading`, `plural` (Task 6); `Route` (`@/app/route`).
- Produces:
```ts
export function CartPage(props: {
  cart: CartLine[]
  recipes: ReadonlyMap<string, Recipe>
  ingredients: Map<string, Ingredient>
  portions: Portions
  kcalTarget: number | undefined
  historical: boolean
  onPeopleChange: (patch: Partial<People>) => void
  onMultiplierChange: (recipeId: string, multiplier: number) => void
  onRemove: (recipeId: string) => void
  onNavigate: (route: Route) => void
}): JSX.Element
```

- [ ] **Step 1: Failing testy**

```tsx
// src/pages/CartPage.test.tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { loadContent } from '@/content/loadContent'
import { cartMacrosPerAdult, coveragePercent, dailyKcalTarget } from '@/domain/nutrition'
import { CartPage } from './CartPage'
import { formatInteger, formatMacros } from './labels'

const { recipes, ingredients } = loadContent()
const recipeById = new Map(recipes.map((r) => [r.id, r]))
const title = (id: string) => recipeById.get(id)!.title
const cart = [{ recipeId: 'michana-vejce', multiplier: 1 }, { recipeId: 'hovezi-gulas', multiplier: 2 }]
/** getByText normalizuje text uzlu (\s+ → mezera, včetně U+00A0), řetězec dotazu ne – očekávání normalizujeme stejně. */
const norm = (s: string) => s.replace(/\s+/g, ' ')

function setup(over: Partial<React.ComponentProps<typeof CartPage>> = {}) {
  const props = {
    cart,
    recipes: recipeById,
    ingredients,
    portions: { people: { adults: 6, children: 18 }, childCoef: 0.8, dayFactor: 1 },
    kcalTarget: undefined,
    historical: false,
    onPeopleChange: vi.fn(),
    onMultiplierChange: vi.fn(),
    onRemove: vi.fn(),
    onNavigate: vi.fn(),
    ...over,
  }
  return { ...render(<CartPage {...props} />), props }
}

test('recepty s násobky, +/− a odebrání, proklik na recept', () => {
  const { props } = setup()
  expect(screen.getByRole('heading', { level: 2, name: 'Košík' })).toBeInTheDocument()
  expect(screen.getByText('Pro 24 osob (18 dětí + 6 dospělých) · náročnost dne 1 · ×1 = 20,4 porce')).toBeInTheDocument()
  expect(screen.getByText('×2')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: `Méně: ${title('michana-vejce')}` })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: `Více: ${title('michana-vejce')}` }))
  expect(props.onMultiplierChange).toHaveBeenCalledWith('michana-vejce', 2)
  fireEvent.click(screen.getByRole('button', { name: `Méně: ${title('hovezi-gulas')}` }))
  expect(props.onMultiplierChange).toHaveBeenCalledWith('hovezi-gulas', 1)
  fireEvent.click(screen.getByRole('button', { name: `Odebrat: ${title('hovezi-gulas')}` }))
  expect(props.onRemove).toHaveBeenCalledWith('hovezi-gulas')
  fireEvent.click(screen.getByRole('button', { name: title('michana-vejce') }))
  expect(props.onNavigate).toHaveBeenCalledWith({ kind: 'recipe', id: 'michana-vejce' })
})

test('Více je zakázané na násobku 10', () => {
  setup({ cart: [{ recipeId: 'michana-vejce', multiplier: 10 }] })
  expect(screen.getByRole('button', { name: `Více: ${title('michana-vejce')}` })).toBeDisabled()
})

test('počet osob jde změnit i na stránce košíku', () => {
  const { props } = setup()
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Děti' }), { target: { value: '10' } })
  expect(props.onPeopleChange).toHaveBeenCalledWith({ children: 10 })
})

test('nutriční souhrn na dospělého vs. cíl × náročnost', () => {
  const portions = { people: { adults: 6, children: 18 }, childCoef: 0.8, dayFactor: 1.2 }
  setup({ portions })
  const m = cartMacrosPerAdult(cart, recipeById, ingredients, { historical: false, dayFactor: 1.2 })
  const target = dailyKcalTarget(undefined, 1.2)
  expect(screen.getByText(norm(formatMacros(m)))).toBeInTheDocument()
  expect(screen.getByText(norm(`Pokrývá cca ${coveragePercent(m.kcal, target)} % denního příjmu (cíl ${formatInteger(target)} kcal = 2\u00a0300 × 1,2).`))).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 3, name: /Výživa na dospělého/ })).toHaveTextContent('orientačně')
})

test('prázdný košík: nápověda, odkaz do obsahu, bez souhrnu a tisku', () => {
  const { props } = setup({ cart: [] })
  expect(screen.getByText(/^Košík je prázdný\./)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Do obsahu' }))
  expect(props.onNavigate).toHaveBeenCalledWith({ kind: 'toc' })
  expect(screen.queryByText(/Pokrývá cca/)).toBeNull()
  expect(screen.queryByRole('button', { name: 'Tisknout brožurku' })).toBeNull()
})

test('recept, který už neexistuje, se nevykreslí', () => {
  setup({ cart: [{ recipeId: 'neexistuje', multiplier: 1 }] })
  expect(screen.getByText(/^Košík je prázdný\./)).toBeInTheDocument()
})

test('tisk je fáze 6: brožurka zakázaná s poznámkou, „jen nákupní seznam“ otevře seznam', () => {
  const { props } = setup()
  const booklet = screen.getByRole('button', { name: 'Tisknout brožurku' })
  expect(booklet).toBeDisabled()
  expect(booklet).toHaveAccessibleDescription(/fázi 6/)
  fireEvent.click(screen.getByRole('button', { name: 'Tisknout jen nákupní seznam' }))
  expect(props.onNavigate).toHaveBeenCalledWith({ kind: 'list' })
})
```

Run: `npx vitest run src/pages/CartPage.test.tsx`
Expected: FAIL – `Failed to resolve import "./CartPage"`.

- [ ] **Step 2: Implementace**

```tsx
// src/pages/CartPage.tsx
import { useId } from 'react'
import type { Route } from '@/app/route'
import { cartMacrosPerAdult, coveragePercent, dailyKcalTarget, recipeMacrosPerServing } from '@/domain/nutrition'
import { DEFAULT_KCAL_TARGET, persons, type CartLine, type People, type Portions } from '@/domain/portions'
import type { Ingredient, Recipe } from '@/domain/types'
import { MULTIPLIER_MAX, PEOPLE_MAX } from '@/state/userState'
import { formatDecimal, formatInteger, formatMacros, peopleHeading, plural } from './labels'
import { NumberField } from './NumberField'

interface CartPageProps {
  cart: CartLine[]
  recipes: ReadonlyMap<string, Recipe>
  ingredients: Map<string, Ingredient>
  portions: Portions
  kcalTarget: number | undefined
  historical: boolean
  onPeopleChange: (patch: Partial<People>) => void
  onMultiplierChange: (recipeId: string, multiplier: number) => void
  onRemove: (recipeId: string) => void
  onNavigate: (route: Route) => void
}

/** Stránka košíku na konci knihy (vlevo, vedle nákupního seznamu). */
export function CartPage({ cart, recipes, ingredients, portions, kcalTarget, historical, onPeopleChange, onMultiplierChange, onRemove, onNavigate }: CartPageProps) {
  const noteId = useId()
  const items = cart.flatMap((entry) => {
    const recipe = recipes.get(entry.recipeId)
    return recipe ? [{ entry, recipe }] : []
  })
  const P = persons(portions)
  const day = formatDecimal(portions.dayFactor, 2)
  const perAdult = cartMacrosPerAdult(cart, recipes, ingredients, { historical, dayFactor: portions.dayFactor })
  const target = dailyKcalTarget(kcalTarget, portions.dayFactor)
  const pct = coveragePercent(perAdult.kcal, target)

  return (
    <article className="cart-page">
      <h2>Košík</h2>
      <p className="cart-people">
        {`${peopleHeading(portions.people)} · náročnost dne ${day} · ×1 = ${formatDecimal(P)} ${plural(P, 'porce', 'porce', 'porcí')}`}
      </p>
      <div className="cart-people-fields">
        <NumberField label="Dospělí" value={portions.people.adults} min={0} max={PEOPLE_MAX} onCommit={(adults) => onPeopleChange({ adults })} />
        <NumberField label="Děti" value={portions.people.children} min={0} max={PEOPLE_MAX} onCommit={(children) => onPeopleChange({ children })} />
      </div>

      {items.length === 0 ? (
        <div className="cart-empty">
          <p>Košík je prázdný. Recept přidáš ikonou košíku v obsahu nebo na stránce receptu.</p>
          <button type="button" className="cart-button" onClick={() => onNavigate({ kind: 'toc' })}>Do obsahu</button>
        </div>
      ) : (
        <>
          <ul className="cart-list">
            {items.map(({ entry, recipe }) => (
              <li key={recipe.id} className="cart-item">
                <button type="button" className="cart-item__title" onClick={() => onNavigate({ kind: 'recipe', id: recipe.id })}>
                  {recipe.title}
                </button>
                <span className="cart-item__kcal">{`${formatInteger(recipeMacrosPerServing(recipe, ingredients, historical).kcal)} kcal/porce`}</span>
                <span className="cart-item__multiplier">
                  <button type="button" aria-label={`Méně: ${recipe.title}`} disabled={entry.multiplier <= 1} onClick={() => onMultiplierChange(recipe.id, entry.multiplier - 1)}>−</button>
                  <output>{`×${entry.multiplier}`}</output>
                  <button type="button" aria-label={`Více: ${recipe.title}`} disabled={entry.multiplier >= MULTIPLIER_MAX} onClick={() => onMultiplierChange(recipe.id, entry.multiplier + 1)}>+</button>
                </span>
                <button type="button" className="cart-item__remove" aria-label={`Odebrat: ${recipe.title}`} title="Odebrat z košíku" onClick={() => onRemove(recipe.id)}>✕</button>
              </li>
            ))}
          </ul>

          <section className="cart-nutrition" aria-label="Výživa na dospělého">
            <h3>Výživa na dospělého <small>(orientačně)</small></h3>
            <p className="cart-nutrition__macros">{formatMacros(perAdult)}</p>
            <p className="cart-nutrition__coverage">
              {`Pokrývá cca ${pct} % denního příjmu (cíl ${formatInteger(target)} kcal = ${formatInteger(kcalTarget ?? DEFAULT_KCAL_TARGET)} × ${day}).`}
            </p>
            <div className="cart-coverage" aria-hidden="true"><span style={{ width: `${Math.min(pct, 100)}%` }} /></div>
            <p className="cart-nutrition__note">Odhad z tabulek USDA, ne výživové poradenství.</p>
          </section>

          <div className="cart-actions">
            <button type="button" className="cart-button" disabled aria-describedby={noteId}>Tisknout brožurku</button>
            <button type="button" className="cart-button" onClick={() => onNavigate({ kind: 'list' })}>Tisknout jen nákupní seznam</button>
            <p id={noteId} className="cart-actions__note">
              Tisk brožurky a tisk tlačítkem přibudou ve fázi 6. Zatím „Tisknout jen nákupní seznam“ otevře seznam a vytiskneš ho přes Ctrl+P.
            </p>
          </div>
        </>
      )}
    </article>
  )
}
```

- [ ] **Step 3: Zapojení do aplikace**

Failing test do `src/App.test.tsx`:
```tsx
test('stránka košíku: násobek a odebrání receptu se projeví', () => {
  localStorage.setItem('kucharka.userState.v1', JSON.stringify({ version: 1, cart: [{ recipeId: 'hovezi-gulas', multiplier: 1 }] }))
  history.replaceState(null, '', '#/kosik')
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Více: Hovězí guláš' }))
  expect(screen.getByText('×2')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Odebrat: Hovězí guláš' }))
  expect(screen.getByText(/^Košík je prázdný\./)).toBeInTheDocument()
})
```

`src/App.tsx`: import `import { CartPage } from '@/pages/CartPage'`; `useUserState()` rozšířit o `setCartMultiplier, removeFromCart`; `case 'cart'` nahradit:
```tsx
        case 'cart':
          return {
            id: entry.id,
            render: () => (
              <CartPage
                cart={state.cart}
                recipes={recipeById}
                ingredients={ingredients}
                portions={portions}
                kcalTarget={state.settings.kcalTarget}
                historical={historical}
                onPeopleChange={setPeople}
                onMultiplierChange={setCartMultiplier}
                onRemove={removeFromCart}
                onNavigate={navigate}
              />
            ),
          }
```
a do závislostí `useMemo` stránek přidat `state.cart, state.settings.kcalTarget, setPeople, setCartMultiplier, removeFromCart`.

`src/styles/paper.css` (nová sekce na konec):
```css
/* ===== košík ===== */
.cart-page h2 { margin-top: 0; }
.cart-people { margin: 0 0 0.5em; font-family: var(--font-table); font-size: 0.8em; color: var(--ink-soft); }
.cart-people-fields { display: grid; gap: 0.3rem; max-width: 16rem; margin-bottom: 0.8em; font-family: var(--font-table); font-size: 0.85em; }
.cart-list { list-style: none; margin: 0 0 1em; padding: 0; font-family: var(--font-table); font-size: 0.9em; }
.cart-item { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; grid-template-areas: "title mult remove" "kcal mult remove"; align-items: center; gap: 0 0.5rem; padding: 0.3em 0; border-bottom: 1px dotted var(--ink-soft); }
.cart-item__title { grid-area: title; min-width: 0; overflow-wrap: anywhere; text-align: left; font: inherit; color: var(--ink); background: none; border: 0; padding: 0; cursor: pointer; text-decoration: underline; }
.cart-item__kcal { grid-area: kcal; font-size: 0.8em; color: var(--ink-soft); }
.cart-item__multiplier { grid-area: mult; display: inline-flex; align-items: center; gap: 0.3rem; }
.cart-item__multiplier button, .cart-item__remove { width: 1.75rem; height: 1.75rem; padding: 0; font: inherit; color: var(--ink); background: none; border: 1px solid var(--ink-soft); border-radius: 50%; cursor: pointer; }
.cart-item__multiplier button:disabled { opacity: 0.35; cursor: default; }
.cart-item__multiplier output { min-width: 2.2em; text-align: center; font-variant-numeric: tabular-nums; }
.cart-item__remove { grid-area: remove; border-color: transparent; }
.cart-nutrition { margin: 0.8em 0; padding: 0.5em 0.8em; border: 1px solid var(--ink-soft); font-family: var(--font-table); font-size: 0.85em; }
.cart-nutrition h3 { margin: 0 0 0.3em; font-size: 1em; }
.cart-nutrition p { margin: 0.2em 0; }
.cart-nutrition__note, .cart-actions__note { font-size: 0.85em; color: var(--ink-soft); }
.cart-coverage { height: 0.4rem; background: var(--paper-dark); border-radius: 2px; overflow: hidden; }
.cart-coverage span { display: block; height: 100%; background: var(--ink); }
.cart-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
.cart-button { font: inherit; font-size: 0.9em; padding: 0.35em 0.8em; color: var(--paper); background: var(--cover-dark); border: 0; border-radius: 3px; cursor: pointer; }
.cart-button:disabled { opacity: 0.5; cursor: not-allowed; }
.cart-empty p { font-style: italic; color: var(--ink-soft); }
```

- [ ] **Step 4: Spustit testy**

Run: `npm test && npm run build && npm run lint`
Expected: PASS, build i lint čisté.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CartPage.tsx src/pages/CartPage.test.tsx src/App.tsx src/App.test.tsx src/styles/paper.css
git commit -m "feat(košík): stránka košíku s násobky, osobami a nutričním souhrnem"
```

---

### Task 10: Stránka nákupního seznamu

**Files:**
- Create: `src/pages/ShoppingListPage.tsx`, `src/pages/ShoppingListPage.test.tsx`
- Modify: `src/pages/labels.ts` (`CATEGORY_LABEL`), `src/App.tsx`, `src/App.test.tsx`, `src/styles/paper.css`

**Interfaces:**
- Consumes: `buildShoppingList`, `ShoppingGroup` (Task 2); `persons`, `People` (Task 1); `formatAmount`, `peopleHeading` (Task 6).
- Produces: `CATEGORY_LABEL: Record<Category, string>` v `src/pages/labels.ts`; `ShoppingListPage(props: { groups: ShoppingGroup[]; people: People; historical: boolean })`.

- [ ] **Step 1: Failing testy**

```tsx
// src/pages/ShoppingListPage.test.tsx
import { render, screen } from '@testing-library/react'
import { loadContent } from '@/content/loadContent'
import { buildShoppingList } from '@/domain/shopping'
import { CATEGORY_LABEL } from './labels'
import { ShoppingListPage } from './ShoppingListPage'

const { recipes, ingredients } = loadContent()
const recipeById = new Map(recipes.map((r) => [r.id, r]))
const people = { adults: 6, children: 18 }
const groups = buildShoppingList(
  [{ recipeId: 'michana-vejce', multiplier: 1 }, { recipeId: 'francouzske-topinky', multiplier: 1 }],
  recipeById, ingredients, { persons: 20.4, historical: false },
)
const itemRow = (container: HTMLElement, name: string) =>
  [...container.querySelectorAll('.shopping-item')].find((li) => li.querySelector('.shopping-item__name')?.textContent === name)!

test('vejce ze dvou receptů pro 18 dětí + 6 dospělých: 51 ks s rozpadem 37 + 14', () => {
  const { container } = render(<ShoppingListPage groups={groups} people={people} historical={false} />)
  expect(screen.getByRole('heading', { level: 2, name: 'Nákupní seznam' })).toBeInTheDocument()
  expect(screen.getByText('Pro 24 osob (18 dětí + 6 dospělých)')).toBeInTheDocument()
  const eggs = itemRow(container, 'Vejce')
  expect(eggs.querySelector('.shopping-item__amount')).toHaveTextContent('51 ks')
  expect(eggs.querySelector('.shopping-item__sources')).toHaveTextContent(
    `${recipeById.get('michana-vejce')!.title} 37 ks · ${recipeById.get('francouzske-topinky')!.title} 14 ks`,
  )
})

test('skupiny v pořadí kategorií obchodu a žádná interakce', () => {
  const { container } = render(<ShoppingListPage groups={groups} people={people} historical={false} />)
  expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(groups.map((g) => CATEGORY_LABEL[g.category]))
  expect(screen.getByRole('heading', { level: 3, name: 'Mléčné výrobky a vejce' })).toBeInTheDocument()
  expect(container.querySelectorAll('button, input, select, textarea')).toHaveLength(0)
})

test('voda se nekupuje, sůl do slévané vody je „podle nádoby“', () => {
  const g = buildShoppingList([{ recipeId: 'spagety-s-maslem-a-syrem', multiplier: 1 }], recipeById, ingredients, { persons: 4, historical: false })
  const { container } = render(<ShoppingListPage groups={g} people={{ adults: 4, children: 0 }} historical={false} />)
  expect(screen.queryByText('Voda')).toBeNull()
  expect(itemRow(container, 'Sůl').querySelector('.shopping-item__sources')).toHaveTextContent('(podle nádoby)')
})

test('prázdný seznam a poznámka o historických surovinách', () => {
  render(<ShoppingListPage groups={[]} people={people} historical />)
  expect(screen.getByText('Seznam je prázdný – sestaví se z receptů v košíku.')).toBeInTheDocument()
  expect(screen.getByText('Pro 24 osob (18 dětí + 6 dospělých) · historické suroviny')).toBeInTheDocument()
})
```

Run: `npx vitest run src/pages/ShoppingListPage.test.tsx`
Expected: FAIL – `Failed to resolve import "./ShoppingListPage"`.

- [ ] **Step 2: Implementace**

`src/pages/labels.ts` – import typu rozšířit na `import type { Allergen, Category, Equipment, Tag, Unit } from '@/domain/types'` a přidat:
```ts
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
```

```tsx
// src/pages/ShoppingListPage.tsx
import type { People } from '@/domain/portions'
import type { ShoppingGroup } from '@/domain/shopping'
import { CATEGORY_LABEL, formatAmount, peopleHeading } from './labels'

interface Props {
  groups: ShoppingGroup[]
  people: People
  historical: boolean
}

/** Nákupní seznam z košíku: podle kategorií obchodu, u položky rozpad po receptech. Jen k tisku, bez interakce. */
export function ShoppingListPage({ groups, people, historical }: Props) {
  return (
    <article className="shopping-page">
      <h2>Nákupní seznam</h2>
      <p className="shopping-people">{peopleHeading(people) + (historical ? ' · historické suroviny' : '')}</p>
      {groups.length === 0 ? (
        <p className="shopping-empty">Seznam je prázdný – sestaví se z receptů v košíku.</p>
      ) : (
        groups.map((group) => (
          <section key={group.category} className="shopping-group">
            <h3>{CATEGORY_LABEL[group.category]}</h3>
            <ul>
              {group.items.map((item) => (
                <li key={item.ingredientId} className="shopping-item">
                  <span className="shopping-item__name">{item.name}</span>
                  <span className="shopping-item__dots" aria-hidden="true" />
                  <span className="shopping-item__amount">{formatAmount(item.amount, item.unit)}</span>
                  <small className="shopping-item__sources">
                    {item.sources.map((s) => `${s.title} ${formatAmount(s.amount, s.unit)}${s.vessel ? ' (podle nádoby)' : ''}`).join(' · ')}
                  </small>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </article>
  )
}
```

- [ ] **Step 3: Zapojení do aplikace**

`src/App.test.tsx`: v testu `'změna hashe přepne stránku'` nahradit `expect(screen.getByText('Nákupní seznam – fáze 5')).toBeInTheDocument()` za `expect(screen.getByRole('heading', { level: 2, name: 'Nákupní seznam' })).toBeInTheDocument()` a přidat:
```tsx
test('nákupní seznam sečte vejce ze dvou receptů pro 18 dětí + 6 dospělých', () => {
  localStorage.setItem('kucharka.userState.v1', JSON.stringify({
    version: 1,
    people: { adults: 6, children: 18 },
    cart: [{ recipeId: 'michana-vejce', multiplier: 1 }, { recipeId: 'francouzske-topinky', multiplier: 1 }],
  }))
  history.replaceState(null, '', '#/seznam')
  const { container } = render(<App />)
  const eggs = [...container.querySelectorAll('.shopping-item')].find((li) => li.querySelector('.shopping-item__name')?.textContent === 'Vejce')!
  expect(eggs.querySelector('.shopping-item__amount')).toHaveTextContent('51 ks')
})
```

`src/App.tsx`: importy `import { persons } from '@/domain/portions'` (spojit s existujícím importem typu `Portions`), `import { buildShoppingList } from '@/domain/shopping'`, `import { ShoppingListPage } from '@/pages/ShoppingListPage'`; za `historical` přidat
```tsx
  const shoppingList = useMemo(
    () => buildShoppingList(state.cart, recipeById, ingredients, { persons: persons(portions), historical }),
    [state.cart, recipeById, ingredients, portions, historical],
  )
```
(`recipeById` musí být definovaný výš než tento `useMemo` – přesunout jeho řádek nad `portions`). `case 'list'` nahradit
```tsx
        case 'list':
          return { id: entry.id, render: () => <ShoppingListPage groups={shoppingList} people={state.people} historical={historical} /> }
```
a do závislostí `useMemo` stránek přidat `shoppingList, state.people`.

`src/styles/paper.css` (na konec):
```css
/* ===== nákupní seznam ===== */
.shopping-page h2 { margin-top: 0; }
.shopping-people { margin: 0 0 0.6em; font-family: var(--font-table); font-size: 0.8em; color: var(--ink-soft); }
.shopping-empty { font-style: italic; color: var(--ink-soft); }
.shopping-group h3 { margin: 0.7em 0 0.2em; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid var(--rule, var(--ink-soft)); }
.shopping-group ul { list-style: none; margin: 0; padding: 0; font-family: var(--font-table); font-size: 0.85em; }
.shopping-item { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 0.3em; padding: 0.1em 0; }
.shopping-item__name { min-width: 0; overflow-wrap: anywhere; }
.shopping-item__dots { flex: 1; min-width: 1em; border-bottom: 1px dotted var(--ink-soft); transform: translateY(-0.25em); }
.shopping-item__amount { white-space: nowrap; font-variant-numeric: tabular-nums; }
.shopping-item__sources { flex-basis: 100%; padding-left: 0.8em; font-size: 0.85em; color: var(--ink-soft); }
```

- [ ] **Step 4: Spustit testy**

Run: `npm test && npm run build && npm run lint`
Expected: PASS, build i lint čisté.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ShoppingListPage.tsx src/pages/ShoppingListPage.test.tsx src/pages/labels.ts src/App.tsx src/App.test.tsx src/styles/paper.css
git commit -m "feat(seznam): nákupní seznam podle kategorií s rozpadem po receptech"
```

---

### Task 11: Tiráž = nastavení – koeficient dítěte, cíl kcal, historické suroviny

**Files:**
- Create: `src/pages/SettingsPage.tsx`, `src/pages/SettingsPage.test.tsx`
- Modify: `src/App.tsx` (stránka nastavení, odstranění `Placeholder`), `src/App.test.tsx`, `src/styles/paper.css`

**Interfaces:**
- Consumes: `UserState['settings']`, `CHILD_COEF_MIN/MAX`, `KCAL_TARGET_MIN/MAX`, `updateSettings` z `useUserState()` (Task 4); `DEFAULT_KCAL_TARGET` (Task 1); `NumberField` (Task 8); `formatInteger` (Task 6).
- Produces: `SettingsPage(props: { settings: UserState['settings']; onChange: (patch: Partial<UserState['settings']>) => void })`.

- [ ] **Step 1: Failing testy**

```tsx
// src/pages/SettingsPage.test.tsx
import { fireEvent, render, screen } from '@testing-library/react'
import type { UserState } from '@/state/userState'
import { SettingsPage } from './SettingsPage'

function setup(settings: UserState['settings'] = { childCoef: 0.8, historicalIngredients: false }) {
  const onChange = vi.fn()
  render(<SettingsPage settings={settings} onChange={onChange} />)
  return onChange
}

test('koeficient dítěte a denní cíl kcal (výchozí 2300)', () => {
  const onChange = setup()
  expect(screen.getByRole('heading', { level: 2, name: 'Tiráž a nastavení' })).toBeInTheDocument()
  const coef = screen.getByRole('spinbutton', { name: 'Koeficient dítěte' })
  expect(coef).toHaveValue(0.8)
  fireEvent.change(coef, { target: { value: '0.7' } })
  expect(onChange).toHaveBeenLastCalledWith({ childCoef: 0.7 })
  const kcal = screen.getByRole('spinbutton', { name: 'Denní cíl dospělého (kcal)' })
  expect(kcal).toHaveValue(2300)
  fireEvent.change(kcal, { target: { value: '2500' } })
  expect(onChange).toHaveBeenLastCalledWith({ kcalTarget: 2500 })
  expect(screen.queryByRole('button', { name: /^Výchozí cíl/ })).toBeNull()
})

test('vlastní cíl lze vrátit na výchozí', () => {
  const onChange = setup({ childCoef: 0.8, historicalIngredients: false, kcalTarget: 2000 })
  expect(screen.getByRole('spinbutton', { name: 'Denní cíl dospělého (kcal)' })).toHaveValue(2000)
  fireEvent.click(screen.getByRole('button', { name: /^Výchozí cíl/ }))
  expect(onChange).toHaveBeenCalledWith({ kcalTarget: undefined })
})

test('přepínač historických surovin a zmínka o fázi 7', () => {
  const onChange = setup()
  const box = screen.getByRole('checkbox', { name: /Historické suroviny/ })
  expect(box).not.toBeChecked()
  fireEvent.click(box)
  expect(onChange).toHaveBeenCalledWith({ historicalIngredients: true })
  expect(screen.getByText('Export a import dat a režim ukládání přibudou ve fázi 7.')).toBeInTheDocument()
})
```

Run: `npx vitest run src/pages/SettingsPage.test.tsx`
Expected: FAIL – `Failed to resolve import "./SettingsPage"`.

- [ ] **Step 2: Implementace**

```tsx
// src/pages/SettingsPage.tsx
import { DEFAULT_KCAL_TARGET } from '@/domain/portions'
import { CHILD_COEF_MAX, CHILD_COEF_MIN, KCAL_TARGET_MAX, KCAL_TARGET_MIN, type UserState } from '@/state/userState'
import { formatInteger } from './labels'
import { NumberField } from './NumberField'

interface Props {
  settings: UserState['settings']
  onChange: (patch: Partial<UserState['settings']>) => void
}

/** Tiráž = nastavení (spec §2 bod 6): koeficient dítěte, cílové kalorie, historické suroviny. */
export function SettingsPage({ settings, onChange }: Props) {
  return (
    <article className="settings-page">
      <h2>Tiráž a nastavení</h2>
      <p className="settings-intro">Podle těchto hodnot se přepočítávají recepty, nákupní seznam i výživa v košíku.</p>
      <div className="settings-fields">
        <NumberField label="Koeficient dítěte" value={settings.childCoef} min={CHILD_COEF_MIN} max={CHILD_COEF_MAX} step={0.05} onCommit={(childCoef) => onChange({ childCoef })} />
        <small className="settings-hint">Kolik sní dítě oproti dospělému (0,8 = 80 %).</small>
        <NumberField
          label="Denní cíl dospělého (kcal)"
          value={settings.kcalTarget ?? DEFAULT_KCAL_TARGET}
          min={KCAL_TARGET_MIN}
          max={KCAL_TARGET_MAX}
          step={50}
          onCommit={(kcalTarget) => onChange({ kcalTarget })}
        />
        <small className="settings-hint">
          Násobí se náročností dne.{' '}
          {settings.kcalTarget !== undefined && (
            <button type="button" className="settings-reset" onClick={() => onChange({ kcalTarget: undefined })}>
              {`Výchozí cíl (${formatInteger(DEFAULT_KCAL_TARGET)} kcal)`}
            </button>
          )}
        </small>
        <label className="settings-check">
          <input type="checkbox" checked={settings.historicalIngredients} onChange={(e) => onChange({ historicalIngredients: e.currentTarget.checked })} />
          Historické suroviny – jak je uvádí původní kniha (místo modernizovaných)
        </label>
      </div>
      <p className="settings-later">Export a import dat a režim ukládání přibudou ve fázi 7.</p>
      <footer className="settings-colophon">Kuchařka pro tábory · osobní sbírka receptů ze čtyř historických kuchařek · výživové údaje USDA SR Legacy (CC0).</footer>
    </article>
  )
}
```

- [ ] **Step 3: Zapojení do aplikace**

Failing test do `src/App.test.tsx`:
```tsx
test('přepínač historických surovin v tiráži změní tabulku receptu', () => {
  history.replaceState(null, '', '#/nastaveni')
  render(<App />)
  fireEvent.click(screen.getByRole('checkbox', { name: /Historické suroviny/ }))
  act(() => {
    location.hash = '#/recept/americke-palacinky'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  expect(screen.getByText('dnes: Vejce 1 ks')).toBeInTheDocument()
})
```

`src/App.tsx`: import `import { SettingsPage } from '@/pages/SettingsPage'`; `useUserState()` rozšířit o `updateSettings`; `case 'settings'` nahradit
```tsx
        case 'settings':
          return { id: entry.id, render: () => <SettingsPage settings={state.settings} onChange={updateSettings} /> }
```
do závislostí `useMemo` stránek přidat `state.settings, updateSettings`; funkci `Placeholder` smazat (už se nepoužívá); v `describePage` změnit `case 'settings': name = 'Nastavení'` na `name = 'Tiráž a nastavení'`.

`src/styles/paper.css` (na konec; `.placeholder-page` smazat, pokud ji už nic nepoužívá – ověřit `grep -rn placeholder-page src`):
```css
/* ===== tiráž = nastavení ===== */
.settings-page h2 { margin-top: 0; }
.settings-intro { font-size: 0.9em; }
.settings-fields { display: grid; gap: 0.35rem; max-width: 22rem; font-family: var(--font-table); font-size: 0.85em; }
.settings-hint { color: var(--ink-soft); margin-bottom: 0.4rem; }
.settings-reset { font: inherit; color: var(--ink); background: none; border: 0; padding: 0; text-decoration: underline; cursor: pointer; }
.settings-check { display: flex; gap: 0.5rem; align-items: flex-start; margin-top: 0.4rem; }
.settings-later { font-style: italic; color: var(--ink-soft); font-size: 0.85em; }
.settings-colophon { margin-top: 2em; font-family: var(--font-typewriter); font-size: 0.75em; color: var(--ink-soft); }
```

- [ ] **Step 4: Spustit testy**

Run: `npm test && npm run build && npm run lint`
Expected: PASS, build i lint čisté.

- [ ] **Step 5: Commit**

```bash
git add src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx src/App.tsx src/App.test.tsx src/styles/paper.css
git commit -m "feat(tiráž): nastavení koeficientu dítěte, cíle kcal a historických surovin"
```

---

### Task 12: Ruční kontrola v prohlížeči (agent-browser) a opravy nálezů

**Files:** podle nálezů; zápis do tohoto plánu pod „Nálezy z ruční kontroly“ (na konci souboru).

Implementátor použije skill `agent-browser` (nejdřív `agent-browser skills get core`). Vlastní dev server `npm run dev -- --port <volný port> --strictPort` na pozadí, po skončení zastavit (`agent-browser close`, ukončit vite). Interakce vždy **reálným vstupem** (`agent-browser click`, `fill`/`type`, `press`, `mouse move/down/up`), ne syntetickými událostmi přes `eval` – syntetické události obcházejí hit-testing (`eval` jen na čtení DOM a měření). Před kliknutím na prvek u okraje stránky ověřit `document.elementFromPoint(stred.x, stred.y)` === cílový prvek. Tab na pozadí má pozastavený `requestAnimationFrame`: zapnout `agent-browser set media light reduced-motion` (otočení proběhne hned). Mobil = změna viewportu (`set viewport 390 844`, `set viewport 320 568`), desktop `set viewport 1390 800`. Screenshoty do scratchpadu (`…/scratchpad/t12/`). Na začátku `eval "localStorage.clear()"` + `reload`.

- [ ] **Step 1: Záložka na každé stránce** – pro `#/`, `#/obsah`, `#/recept/michana-vejce`, `#/kosik`, `#/seznam`, `#/nastaveni` při 1390×800, 390×844 a 320×568: `.bookmark__tab` je vidět, `get box` se nepřekrývá s `.book-controls` ani s `.book__spread` (na mobilu leží v horním pruhu nad stránkou), `elementFromPoint` ve středu stužky je stužka. Reálný klik otevře panel (Dospělí, Děti, Náročnost dne, Otevřít košík), druhý klik / Escape / klik mimo ho zavře. Při 320×568 s otevřeným panelem: panel celý ve viewportu a `eval "document.documentElement.scrollWidth === window.innerWidth"` → `true`.

- [ ] **Step 2: Přidat 3 recepty** – `#/obsah`: reálný klik na ikonu košíku u „Míchaná vejce“ a „Francouzské topinky (vajíčkové)“ (najít stránku obsahu, kde řádky jsou; u řádku na pravé stránce ověřit hit-testing kvůli úchytu `.page-edge`): `aria-pressed="true"`, hash zůstává `#/obsah`, recept se neotevře. `#/recept/spagety-s-maslem-a-syrem`: klik na „Do košíku“ vedle srdíčka a hrnce. Stužka ukazuje 3. Mobil 390: totéž tapnutím na ikonu v obsahu – neotevře recept.

- [ ] **Step 3: 18 dětí + 6 dospělých a ruční kontrola přepočtu** – v panelu záložky reálně vyplnit Děti = 18, Dospělí = 6 (`click` do pole, `press Meta+a`/`Control+a`, `type 18`); stužka ukazuje „24 os.“. `#/recept/michana-vejce`: hlavička sloupce „Pro 24 osob“, pod tabulkou „18 dětí + 6 dospělých · přepočteno na 20,4 porce“, řádek Vejce **37 ks** a na osobu **2 ks**. Ruční výpočet zapsat do nálezů: P = 6 + 18 × 0,8 = 20,4; k = 20,4 / 4 = 5,1; 7,25 ks × 5,1 = 36,975 → nahoru na 0,5 → 37 ks; na osobu 7,25 / 4 = 1,81 → 2 ks. Nelineární kontrola `#/recept/spagety-s-maslem-a-syrem`: sůl do vody (vessel, p = 0,6) 25 g × 5,1^0,6 = 25 × 2,658 = 66,4 → **65 g** „(podle nádoby)“, voda 3500 ml × 2,658 = 9303 → **9,3 l** „(podle nádoby)“. Pod tabulkou „Na porci (orientačně): … kcal · bílkoviny … g …“.

- [ ] **Step 4: Náročnost dne** – focus na posuvník v panelu, `press ArrowRight` 4× → výstup „1,2“, stránka knihy se neotočila (Book ignoruje šipky v inputu); na receptu „(náročnost dne 1,2)“ a množství vzrostla (P = 24,48). Vrátit na 1 (`press ArrowLeft` 4×). Totéž s fokusem v číselném poli Děti: šipky nemění stránku knihy.

- [ ] **Step 5: Stránka košíku** – stužka → „Otevřít košík“ → hash `#/kosik`; desktop: košík vlevo a nákupní seznam vpravo na jedné dvoustraně, mobil: košík a šipkou vpravo seznam. Tři recepty s „×1“; „Více“ u Míchaných vajec → „×2“ a v seznamu (vpravo) vejce vzrostou; „Méně“ vrátí; „Odebrat“ a znovu přidat z obsahu. Nutriční souhrn „Výživa na dospělého (orientačně)“ a „Pokrývá cca X % denního příjmu (cíl 2 300 kcal = 2 300 × 1)“; po ×2 u jednoho receptu procento vzroste. „Tisknout brožurku“ je zakázané s poznámkou o fázi 6; „Tisknout jen nákupní seznam“ → `#/seznam`. Klik na název receptu otevře recept, `back` vrátí na košík.

- [ ] **Step 6: Nákupní seznam** – `#/seznam`: nadpisy kategorií v pořadí (Mléčné výrobky a vejce před Kořením atd.), **Vejce 51 ks** s rozpadem „Míchaná vejce 37 ks · Francouzské topinky (vajíčkové) 14 ks“ (ruční součet: (7,25 + 2,7) × 5,1 = 50,7 → 51), žádná položka „Voda“, sůl s „(podle nádoby)“ u špaget, množství nad 1000 g/ml v kg/l. `eval "document.querySelectorAll('.shopping-page button, .shopping-page input').length"` → 0. Při 320×568 se dlouhý rozpad zalomí a stránka scrolluje uvnitř („pokračuje ↓“), žádný vodorovný scroll.

- [ ] **Step 7: Historické suroviny** – `#/nastaveni`: reálný klik na „Historické suroviny…“ → `#/recept/michana-vejce` ukazuje „Vejce mražená (celá)“ s poznámkou „dnes: Vejce …“; `#/seznam` má kategorii „Mražené“ s vejci mraženými (obě snídaně) a vejce v ks zmizí; nutrice na porci se změní. Přepnout zpět → „původně: Vejce mražená (celá) …“.

- [ ] **Step 8: Tiráž** – koeficient dítěte 0,5 → recept „přepočteno na 15 porcí“; cíl 2000 → procento v košíku vzroste a objeví se „Výchozí cíl (2 300 kcal)“, klik ho vrátí. Vrátit koeficient 0,8. Text o fázi 7 je vidět.

- [ ] **Step 9: Reload zachová stav** – `reload` na `#/kosik`: tři recepty s násobky, stužka „3“ a „24 os.“, nastavení beze změny; `eval "localStorage.getItem('kucharka.userState.v1')"` obsahuje `"cart":[` se třemi `recipeId` a `"people":{"adults":6,"children":18}`. Poškozený stav: `eval "localStorage.setItem('kucharka.userState.v1', JSON.stringify({version:1,cart:[{recipeId:'neexistuje',multiplier:0}],people:{adults:0,children:0}}))"`, `reload` → košík prázdný s nápovědou, stužka „0“ a „1 os.“, žádná chyba v konzoli (`agent-browser console`).

- [ ] **Step 10: Obsah bez ořezu po přidání ikony košíku** – pro 1390×800 a 390×844 projít všechny stránky obsahu a změřit `eval "[...document.querySelectorAll('.book__slot .toc-page')].map(t => { const c = t.closest('.page-content'); return c.scrollHeight - c.clientHeight })"` → všechny ≤ 0; při 320×568 hodnoty zapsat (přetečení jen s viditelným „pokračuje ↓“). Když něco přeteče, upravit `TOC_LONG_TITLE_CHARS` / `TOC_PAGE_UNITS` v `src/content/search.ts` a komentář s měřením, zopakovat.

- [ ] **Step 11: Šířka a překryvy** – pro routy z kroku 1 při 390 a 320: `eval "document.documentElement.scrollWidth === window.innerWidth"` → `true`; screenshot desktop (stužka vlevo nahoře mimo knihu) a mobilu.

- [ ] **Step 12: Opravy a zápis** – každý nález opravit s testem tam, kde to jde (CSS-only opravy ověřit screenshotem), a zapsat pod „Nálezy z ruční kontroly“ ve formátu z plánu fáze 4b (číslo, nález, soubor, oprava, ověření) + sekce „Odloženo (s důvodem)“ a „Naměřeno“. Nakonec `npm test && npm run build && npm run lint && npm run validate`.

- [ ] **Step 13: Commit**

```bash
git add <změněné soubory> docs/superpowers/plans/2026-10-15-phase5-cart-shopping.md
git commit -m "fix(košík): nálezy z ruční kontroly fáze 5"
```

## Pokrytí specu (self-review)

| Požadavek | Task |
|---|---|
| §3 Jeden plán, záložka (stužka, vždy viditelná): dospělí, děti, náročnost 0,8–1,3, počet receptů, skok na košík | 8 (stav 4) |
| §3 [R1] Do košíku z obsahu i ze stránky receptu | 7 |
| §3 [R1] Košík = stránka na konci knihy před nákupním seznamem; recepty s násobky, počet osob, tlačítka „Tisknout brožurku“ / „Tisknout jen nákupní seznam“ (zástupně, R7) | 5, 9 |
| §3 Násobek ×1, ×2 … | 4, 9 |
| §3 Koeficient dítěte 0,8 editovatelný v tiráži; P = adults + children × childCoef, × náročnost | 1, 4, 11 |
| §3 Škálování `základ × k^p`, `k = P × násobek / baseServings`, třídy, vessel „podle nádoby“, zaokrouhlení | 1, 2, 6 (znovupoužití `scaling.ts`) |
| §3 Nákupní seznam: sloučení (id + převod na g/ml/ks), kategorie obchodu, rozpad po receptech, bez interakce | 2, 10 |
| §3 Nutrice na porci (orientační), v košíku součet vs. cíl 2300 × náročnost, přepsatelný, „pokrývá cca X %“ | 3, 6, 9, 11 |
| §3 Originál vs. modernizace, globální přepínač (výchozí modernizované), poznámka u nahrazené suroviny | 1, 6, 10, 11 |
| §2 Hash `#/kosik`, `#/seznam`, pořadí stránek, tiráž = nastavení | 5, 10, 11 |
| §2 Levá strana receptu: tabulka pro aktuální počet osob + šedě na osobu | 6 |
| §5.2 UserState `people`, `dayFactor`, `cart`, `settings {childCoef, kcalTarget?, historicalIngredients}` | 4 |
| §8 bod 5 | 1–12 |
| Backlog: `ediblePortion` u masa s kostí | 3 (R1) |
| Backlog: koncentráty / `baseServings`, užší `levne` | mimo fázi 5 (R2, R3) |
| Ruční kontrola agent-browserem | 12 |

Mimo fázi 5: skutečný tisk (tlačítka, A4, brožurka, `@page` pro seznam) – fáze 6; export/import a režim ukládání – fáze 7; vlastní recepty – fáze 8; odškrtávání, „mám doma“, ceny – backlog §7.

## Nálezy z ruční kontroly

Kontrola v prohlížeči (agent-browser, reálný vstup: click, type, press, mouse move/down/up; `eval` jen na čtení a měření), viewporty 1390×800, 390×844, 320×568. Podrobný zápis scénářů a screenshoty: `.superpowers/sdd/2026-10-15-phase5-cart-shopping/task-12-report.md`.

| # | Nález | Soubor | Oprava | Ověření |
|---|---|---|---|---|
| 1 | Poškozený stav s položkou košíku na neexistující recept (`recipeId: 'neexistuje'`) nechal stužku ukazovat „1“ (a „Otevřít košík (1 recept)“), i když stránka košíku je prázdná („Košík je prázdný“). | `src/App.tsx` | `cartCount` se počítá jen z položek, jejichž recept v knize existuje (`recipeById.has`). | Test `záložka nepočítá položku košíku s neexistujícím receptem` v `src/App.test.tsx` (bez opravy padá); v prohlížeči po reloadu „Košík: 0 receptů · 1 os.“, konzole bez chyb. |

Všechny ostatní scénáře kroků 1–11 vyšly bez nálezu (viz Naměřeno).

### Odloženo (s důvodem)

- Po změně viewportu bez reloadu (přes CDP v kartě na pozadí) zůstal `useViewMode` v předchozím režimu (`single` po návratu na 1390 px), dokud se stránka znovu nenačetla. Jde o artefakt emulace (události `change` media query se v pozadí nevyvolají); v běžném okně se `matchMedia` listener volá. Nereprodukováno, neměníme. Měření dělána s reloadem po každé změně viewportu.
- `.page-more` („pokračuje ↓“) po scrollu na konec zmizí až po vykreslení snímku (v kartě na pozadí až po screenshotu); stejný důvod, v běžném okně se aktualizuje hned.
- Poznámka „dnes: Vejce 7,25 ks“ / „původně: … 360 g“ ukazuje množství receptu pro základní porce (ne přepočtené na aktuální osoby), zatímco řádek tabulky je přepočtený. Je to dle zadání (poznámka je informace o původním řádku); případné přepočtení by bylo změna návrhu, ne oprava.

### Naměřeno

- Záložka (všechny routy `#/`, `#/obsah`, `#/recept/michana-vejce`, `#/kosik`, `#/seznam`, `#/nastaveni`): box 14,0–105,46 px; `book-controls` vpravo (1390: x 1252–1380; 390: 252–380; 320: 182–310), nepřekrývá se s ovládáním ani s `.book__spread` (1390: y od 32, 390: y od 156, 320: y od 73); `elementFromPoint` ve středu = stužka; `scrollWidth === innerWidth` pro 390 i 320 na všech routách; panel při 320 v rozsahu x 14–286, y 51–243 (celý ve viewportu), bez vodorovného scrollu. Druhý klik, Escape i klik mimo panel zavřou.
- Obsah: ikona košíku u „Míchaná vejce“ (spread 11|12, vlevo) a „Francouzské topinky“ (spread 9|10, pravá strana, `elementFromPoint` = tlačítko, ne `.page-edge`): `aria-pressed=true`, hash zůstal `#/obsah`. Mobil 390: tap na ikonu stejně.
- Přepočet 18 dětí + 6 dospělých: P = 6 + 18 × 0,8 = 20,4; k = 20,4 / 4 = 5,1; vejce 7,25 × 5,1 = 36,975, nahoru na 0,5 = **37 ks** (naměřeno 37 ks), na osobu 7,25 / 4 = 1,81, nahoru = **2 ks** (naměřeno 2 ks). Hlavička „Pro 24 osob“, „18 dětí + 6 dospělých · přepočteno na 20,4 porce“, stužka „3 / 24 os.“. Špagety: k^0,6 = 5,1^0,6 = 2,658; sůl 25 × 2,658 = 66,4 → **65 g (podle nádoby)**, voda 3500 × 2,658 = 9303 → **9,3 l (podle nádoby)** (naměřeno 65 g a 9,3 l). Na porci špagety 482 kcal · bílkoviny 17 g · sacharidy 68 g · tuky 15 g; míchaná vejce 130 kcal · 11 g · 1 g · 9 g.
- Náročnost dne 4× ArrowRight → „1,2“, kniha se neotočila (zůstala strana 151), receptu „(náročnost dne 1,2)“, P = 24,48 (24,5 porce), vejce 7,25 × 6,12 = 44,37 → 44½ ks (naměřeno), vráceno ArrowLeft 4× na 1. ArrowUp/Down/Left/Right v poli Děti: strana beze změny.
- Košík: 3 recepty ×1; Míchaná vejce ×2 → vejce v seznamu 88 ks (14 + 74), pokrytí 35 % → 41 %, Méně vrátí 51 ks / 35 %; Odebrat → 2 recepty, znovu přidat z obsahu → 3. „Tisknout brožurku“ disabled s poznámkou o fázi 6, „Tisknout jen nákupní seznam“ → `#/seznam`; klik na název receptu otevře recept, `back` vrátí `#/kosik`.
- Seznam: Vejce **51 ks** („Francouzské topinky (vajíčkové) 14 ks · Míchaná vejce 37 ks“; ruční součet (7,25 + 2,7) × 5,1 = 50,7 → 51), kategorie v pořadí Pečivo, Mléčné výrobky a vejce, Těstoviny a rýže, Koření, Tuky a oleje, Trvanlivé potraviny; bez položky Voda; sůl „(podle nádoby)“; těstoviny 1,84 kg; `.shopping-page button, input` = 0.
- Historické suroviny: recept „Vejce mražená (celá) … dnes: Vejce 7,25 ks“, nutrice 130 → 132 kcal na porci, seznam má „Mražené: Vejce mražená (celá) 2,52 kg (topinky 690 g · míchaná 1,84 kg)“ a vejce v ks zmizela; zpět „původně: Vejce mražená (celá) 360 g“.
- Tiráž: koeficient 0,5 → „přepočteno na 15 porcí“; cíl 2000 → 35 % → 41 %, „Výchozí cíl (2 300 kcal)“ vrátí 2300; koeficient vrácen na 0,8; text o fázi 7 viditelný.
- Reload na `#/kosik`: 3 recepty s násobky, stužka „3 / 24 os.“, `localStorage` obsahuje `"cart":[…]` se třemi `recipeId` a `"people":{"adults":6,"children":18}`. Poškozený stav: košík prázdný s nápovědou, „0 receptů · 1 os.“ (po opravě č. 1), v konzoli jen vite/React debug zprávy.
- Obsah bez ořezu (`scrollHeight − clientHeight` všech stránek obsahu 3–12): 1390×800 všude 0, 390×844 všude 0, 320×568 všude 0 (bez přetečení, `TOC_*` konstanty beze změny).
- Košík a seznam s 6 recepty: 320×568 košík 924 / 394 px, seznam 1512 / 394 px; 390×844 košík 800 / 502, seznam 1397 / 502; „pokračuje ↓“ je vidět, scroll uvnitř stránky dojede na konec (scrollTop = max, hint zmizí), vodorovný scroll žádný, dokument vertikálně nescrolluje.

