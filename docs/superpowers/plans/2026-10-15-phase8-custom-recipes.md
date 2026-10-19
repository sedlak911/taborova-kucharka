# Fáze 8: Vlastní recepty – ručně psaný list, formulář, export a import JSON – implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uživatel si napíše vlastní recept ve formuláři, který vypadá jako vložený ručně psaný linkovaný list. Recept se uloží do `UserState.customRecipes` a zařadí na konec zvolené kapitoly. V knize vypadá jako natočený ručně psaný list, jde upravit a smazat, funguje s košíkem, nákupním seznamem, nutricí, hledáním i tiskem. Vlastní recepty jdou exportovat do JSON ve formátu `data/recipes/*.json` a zase naimportovat.

**Architecture:** Vlastní recept je obyčejný `Recipe` (`source.book = 'vlastni'`, id `vlastni-<slug>-<suffix>`), takže doména (`recipeScale`, nutrice, nákupní seznam, tisk) se nemění. Jen schéma povolí vlastním receptům jiný `baseServings` než 4. `UserState.customRecipes` se při načtení validuje zodem (neplatné položky se zahodí s `console.warn`). `App` sloučí statické a vlastní recepty čistou funkcí `mergeRecipes` a z výsledku staví layout, obsah, hledání, košík i tisk. Formulář je dialog nad knihou (`#/novy-recept`, `#/recept/<id>/upravit`), ne stránka layoutu. `useHashRoute` po každé změně layoutu najde stránku znovu podle hashe, protože přidání nebo smazání receptu posune indexy stránek. Export a import jsou v tiráži v sekci „Vlastní recepty“.

**Tech Stack:** Vite 8, React 19, TypeScript 6, zod 4.6, Vitest 4 + Testing Library + user-event 14 (jsdom, `css: false`, `globals: true`), oxlint. Bez UI knihovny, bez nové npm závislosti (Caveat 700 je v už nainstalovaném `@fontsource/caveat`). Ruční kontrola skillem `agent-browser`.

**Spec:** `docs/superpowers/specs/2026-10-14-cookbook-design.md`: §2 („Vlastní recept: formulář vypadá jako vložený ručně psaný list, jiný papír (linkovaný), lehce natočený“, 5. styl „ručně psaný vložený list“, ručně psaný font Caveat), §5.1 (schéma receptu, kapitoly, tagy, vybavení), §5.2 (`customRecipes []` v `UserState`), §8 bod 8, §1 (osobní projekt, jednoduché). Uživatel chtěl: „možnost přidat vlastní recept + export do JSON“, „vlastní recept jako vložený ručně psaný list“. Navazuje na plán fáze 6 `docs/superpowers/plans/2026-10-15-phase6-print.md` (Global Constraints níže jsou jeho aktualizace) a **implementuje se až po fázi 7** (StorageAdapter, server, export/import celého stavu).

## Global Constraints

- Čeština s diakritikou v UI, identifikátory anglicky. Bez UI knihovny. Žádná nová npm závislost.
- **Fáze 7 je hotová dřív:** neplatí žádné předpoklady o jejím API, jen že `UserState.customRecipes` se ukládá a načítá přes `UserStateProvider` stejně jako ostatní pole. Validace `customRecipes` (Task 2) patří tam, kudy prochází **každý** načtený stav (dnes `sanitize` v `loadUserState`). Pokud fáze 7 přidala další vstupy (načtení ze serveru, import celého stavu), musí jít přes totéž místo. Nová tlačítka v tiráži jsou v samostatné sekci „Vlastní recepty“ a s exportem celého stavu z fáze 7 nekolidují. Kde plán ukazuje kontext souborů `userState.ts`, `UserStateProvider.tsx`, `SettingsPage.tsx` a `App.tsx`, platí stav z HEAD `c3cb555`; po fázi 7 se změna vloží na stejné logické místo.
- **Vlastní recept = `Recipe`** podle `RecipeSchema` s `source: { book: 'vlastni' }`, `verified: true`, id `vlastni-<slug>-<4 znaky base36>` (kebab-case), `baseServings` celé číslo 1–50 (knižní recepty dál přesně 4), `allergens` odvozené ze surovin, `tags` jen z `FORM_TAGS` (`levne`, `tabor`, `kotlik`, `pripravit-predem`), suroviny jen z `data/ingredients.json`. Id se při úpravě nemění.
- **Zařazení:** vlastní recept je dvoustrana na **konci zvolené kapitoly** (mezi sebou podle názvu, `localeCompare('cs')`). `buildLayout` a pravidla parity se nemění. Vlastní recept s id knižního receptu, s jinou knihou než `vlastni` nebo s neznámou surovinou se do knihy nezařadí (`console.warn`, nic nespadne).
- **Vzhled (spec §2):** stránka vlastního receptu má `tone: 'note'` (linkovaný papír `page--note`) a třídu `era--vlastni` na `.page` i na `.recipe-page`, písmo Caveat (`--font-hand`, řezy 400 a 700). **Natočení `rotate(-0.6deg)` se nikdy nedává na `.page` ani `.book__*`** (rozbilo by 3D otáčení a úchyty): natočený je jen vnitřní list `.recipe-page.era--vlastni` a list formuláře `.recipe-form`. Stránka a překryv formuláře mají `overflow-x: hidden`.
- **Formulář** je dialog (`role="dialog"`, `aria-modal`, nadpis „Nový recept“ / „Upravit recept“) nad knihou, ne stránka layoutu. Je to vložený ručně psaný linkovaný list s červenou linkou okraje, natočený. Hash routy `#/novy-recept` a `#/recept/<id>/upravit`. Pod formulářem po načtení z hashe leží obsah (nový recept) nebo upravovaný recept. `<main>` je během otevřeného formuláře `inert`. Escape a „Zrušit“ zavřou formulář; když je rozepsaný, zeptají se `window.confirm('Zahodit rozepsaný recept?')`. Escape v otevřeném našeptávači zavře jen návrhy.
- **Potvrzení přes nativní `window.confirm`** (osobní projekt, spec §1): smazání receptu, přepsání duplicit při importu, zahození rozepsaného formuláře. Žádné vlastní modály.
- **Hash routy** (`src/app/route.ts`) kromě nových dvou beze změny. `useHashRoute` po změně layoutu přečte stránku znovu z hashe. Hash proto musí před změnou `customRecipes` ukazovat na cíl: uložení → `#/recept/<id>`, smazání → `#/kapitola/<kapitola>` (nebo `#/obsah`), import → `#/nastaveni`.
- **Export:** soubor `vlastni-recepty-YYYY-MM-DD.json` (místní datum), obsahem pole `Recipe[]` jako `JSON.stringify(recipes, null, 2) + '\n'`. Každý prvek má tvar souboru `data/recipes/<id>.json` (projde `RecipeSchema` i `npm run validate`, když se uloží do repa). **Import** přijme pole i jeden objekt. Validuje zodem a pravidly zařazení. Duplicitní id se po jednom dotazu buď přepíšou, nebo přeskočí. Výsledek se vypíše v `role="status"`.
- Tisk, košík, nákupní seznam, nutrice a hledání se nemění. Dostanou sloučený seznam receptů. `scripts/validate.ts` ani `data/` se nemění.
- Soubory v `src/domain/` importují jen relativně (beze změny). Nový kód vlastních receptů: čisté funkce v `src/content/customRecipes.ts`, `src/custom/*.ts`, komponenty v `src/custom/*.tsx`, CSS v `src/styles/custom.css`, testovací recept `src/test/customRecipe.ts`. Podle oxlint `react/only-export-components` patří ne-komponentové exporty do `.ts` souborů.
- Přístupnost: každé pole formuláře má přístupné jméno (`<label htmlFor>` nebo `aria-label`). Chyby se navazují přes `aria-invalid` a `aria-describedby` a souhrn chyb má `role="alert"`. Našeptávač je ARIA combobox s listboxem (`aria-activedescendant`). Ikony mají `aria-hidden`.
- Mobil: žádný vodorovný scroll (`scrollWidth === innerWidth` při 390 i 320 px) na stránce vlastního receptu ani s otevřeným formulářem. Pole formuláře mají písmo ≥ 16 px (iOS nezoomuje).
- Testy Vitest + Testing Library pro každou čistou funkci a komponentu. jsdom nemá `URL.createObjectURL` a `window.confirm` jen ohlásí „not implemented“, proto se v testech mockují. Po každém tasku musí `npm test`, `npm run build` a `npm run lint` projít čistě (v Tasku 11 i `npm run validate`). Commit po každém tasku, zpráva česky s diakritikou, explicitní `git add <soubory>` (nikdy `-A`).

## Review Focus

1. **Poškozený nebo zastaralý vlastní recept v uloženém stavu** (ručně upravený localStorage, starší tvar, surovina odstraněná z `ingredients.json`, id, které mezitím dostal knižní recept). Kniha se musí načíst a zahodit jen ten jeden recept s varováním. Ostatní vlastní recepty, košík a oblíbené zůstanou. Testy: Task 2 („platné se načtou, neplatné a cizí se zahodí“), Task 1 (`mergeRecipes` vynechá neznámou surovinu).
2. **Smazání nebo úprava receptu, který je v košíku nebo oblíbených, a otevřená stránka po změně počtu stran.** Košík nesmí ukazovat duchy, seznam se musí přepočítat. Kniha nesmí zůstat na posunutém indexu (cizí stránka) ani na neexistujícím receptu. Testy: Task 2 (`deleteCustomRecipe` čistí košík, oblíbené, uvařené), Task 3 (nový layout → stránka podle hashe), Task 4 (smazání → kapitola), Task 9 (uložení → otevře se nový recept), Task 10 (import na tiráži zůstane na tiráži).
3. **Jednotka bez převodu na gramy a česky psaná čísla:** „2 ks“ hladké mouky, lžíce u suroviny bez `units.lzice`, „1,5“, „1/2“, „2,5 porce“. Formulář nesmí uložit řádek, u kterého by nutrice počítala 0 a nákupní seznam hádal objem. Desetinnou čárku a zlomek musí přijmout. Testy: Task 6 (`parseDecimal`, chyba jednotky, celé porce), Task 8 (hláška u řádku v UI).
4. **Import cizího nebo vadného souboru:** poškozený JSON, recept z `data/recipes/` (kniha ≠ `vlastni`), recept s id knižního receptu, duplicitní id v souboru, recept, který už v knize je. Nic se nesmí přepsat bez dotazu, kniha nespadne a uživatel uvidí, co se nenačetlo a proč. Testy: Task 10 (`parseCustomRecipesFile`, `CustomRecipesSettings`).
5. **Klávesnice v rozepsaném formuláři:** Escape v našeptávači, Enter v našeptávači, šipky na tlačítku v dialogu, Zpět v prohlížeči. Escape v návrzích zavře jen návrhy. Enter vybere surovinu a formulář neodešle. Escape s rozepsanými daty se zeptá. Šipky nelistují knihou (`Book` ignoruje klávesy při otevřeném `[role="dialog"]`). Zpět formulář zavře. Testy: Task 7 (Escape a Enter v pickeru), Task 8 (confirm při Escape), Task 9 (Escape vrátí hash, `main` je `inert`).

## Rozhodnutí fáze 8 (rulings)

- **R1 – `baseServings` vlastního receptu 1–50:** `RecipeSchema` má `baseServings: z.number().int().min(1).max(50)` a `.refine`, že jinou hodnotu než 4 smí mít jen `source.book === 'vlastni'`. Knižní recepty a validátor tedy dál vyžadují 4 (spec §5.1). Doména už počítá obecně (`recipeScale = P × násobek / baseServings`, `recipeMacrosPerServing` dělí `baseServings`, `IngredientTable` i `buildShoppingList` používají `recipe.baseServings`). Task 1 to pojistí testy s `baseServings: 2`.
- **R2 – `verified: true`** u vlastních receptů: čísla jsou uživatelova, ne odhad z digitalizace, takže dovětek „čísla odhadnuta“ v patičce nedává smysl. `allergens` se při uložení odvodí ze surovin (sjednocení v pořadí `ALLERGENS`). Formulář nabízí jen ruční štítky `FORM_TAGS` (`rychle` se odvozuje z času, `bez-masa`/`sladke` nahrazují kapitoly – spec §5.1 [R1]). Volitelná pole `titleOriginal`, `quote`, `original`, `group` formulář nenabízí a neukládá.
- **R3 – id `vlastni-<slug>-<suffix>`:** slug = název bez diakritiky v kebab-case (nejvýš 40 znaků, prázdný → `recept`), suffix 4 znaky base36 z `Math.random`. Při kolizi se losuje znovu a po 20 pokusech se přidá pořadí, aby cyklus vždy skončil. Při úpravě se id nemění (i když se změní název), takže odkazy z košíku, oblíbených a uvařených platí dál.
- **R4 – zařazení do zvolené kapitoly, na konec:** žádná samostatná kapitola „Vlastní“. Vlastní recepty jsou za knižními recepty své kapitoly, mezi sebou podle názvu. Filtr „Zdroj“ v obsahu nabídne „Vlastní“, jen když nějaký vlastní recept existuje (jako u vybavení).
- **R5 – validace při načtení ve dvou vrstvách:** `loadUserState` zahodí položky, které neprojdou `RecipeSchema`, nemají `book: 'vlastni'` nebo mají duplicitní id. `mergeRecipes` vynechá recepty, které nejdou zařadit (id knižního receptu, neznámá surovina). Neznámá surovina se hlídá až při sloučení, protože `userState.ts` nezná obsah knihy. V obou případech se vypíše `console.warn`.
- **R6 – jednotka bez převodu se neuloží:** `ks`, `lzice`, `lzicka` a `hrnek` vyžadují odpovídající `ingredient.units[unit]`, jinak hláška „<Surovina>: pro jednotku „ks“ chybí převod na gramy – zvol g nebo ml“. `g` a `ml` jdou vždy. `spetka` má množství vždy 1 (pole se zakáže). Prázdné řádky surovin se při uložení vynechají. Množství přijme „1,5“, „1.5“, „1/2“ i „1 000“. Postup: každý neprázdný řádek je krok, ruční číslování „1. “ a „2) “ se odstraní.
- **R7 – formulář je dialog nad knihou, ne stránka layoutu** (jinak by se při psaní měnil počet stran). Tlačítko formulář otevře přes `history.pushState('#/novy-recept')`, ale index knihy se nemění, takže kniha pod formulářem zůstane, kde byla. Při načtení stránky s hashem formuláře `routeToIndex` vrátí obsah (nový recept) nebo upravovaný recept (úprava). Zavření přepíše hash (`replaceState`) na routu aktuální stránky. Uložení přepíše hash na `#/recept/<id>` a recept se otevře. Zpět v prohlížeči formulář zavře (`hashchange`).
- **R8 – `useHashRoute` po změně layoutu znovu vyhodnotí hash** (dřív jen po prvním načtení). Hash vždy nese routu aktuální stránky (`setIndex`/`jumpTo` ho přepisují), takže je to spolehlivý klíč i po posunu indexů. Důsledek: kdo stojí na pravé polovině receptu nebo na úvodní dvoustraně, po změně layoutu přejde na levou polovinu receptu nebo na obal. Layout se mění jen při uložení, smazání nebo importu vlastního receptu.
- **R9 – natočení jen na vnitřním listu:** `.era--vlastni` dřív nesla `transform: rotate`, a proto `App` u vlastních receptů vynechával třídu na `.page`. Nově `.era--vlastni` nastavuje jen `--paper`, `--rule` a písmo. Třída se dává na `.page` stejně jako u ostatních epoch. Natočený je `.recipe-page.era--vlastni` (`transform-origin` nahoře uprostřed) a `.page--note > .page-content` má `overflow-x: hidden`, protože rohy natočeného listu přesahují.
- **R10 – smazání:** tlačítka „Upravit“ a „Smazat“ jsou jen na levé straně vlastního receptu. „Smazat“ se zeptá `window.confirm('Smazat recept „X“? Zmizí i z košíku a oblíbených.')`. Recept zmizí i z košíku, oblíbených a uvařených a kniha přejde na úvod jeho kapitoly, nebo na obsah, když kapitola zůstane prázdná.
- **R11 – export a import jen vlastních receptů** v sekci tiráže „Vlastní recepty“ (Nový recept · Exportovat · Importovat). Export celého stavu je věc fáze 7. Import duplicit: jeden dotaz pro všechny („OK = přepsat, Zrušit = ponechat současné“). Recept z knihy (`book ≠ vlastni`) se odmítne, nepřevádí se.
- **R12 – obsah:** vlastní recept má za názvem ikonu pera (`PenIcon`, skrytý text „(vlastní)“). Tlačítko „Nový recept“ je pilulka v řádku filtru „Moje“ (jen na první stránce obsahu). Kvůli ní a možnému zalomení na 320 px se `TOC_FIRST_PAGE_UNITS` snižuje ze 7 na 6. `tocRowUnits` počítá u vlastního receptu název o 2 znaky delší (ikona).
- **R13 – texty vlastního receptu:** patička „Vlastní recept · zapsaný pro N porcí“ (bez roku a stránky). Poznámka (`modernNote`) má nadpis „Poznámka“ místo „Poznámka k modernizaci“. Kniha v údajích zůstává `bookLabel` = „Vlastní recepty“.
- **R14 – nový recept předvyplní kapitolu** stránky, ze které se formulář otevřel (`layout.entries[index].chapter`), jinak „Z jednoho hrnce“. Porce jsou předvyplněné na 4 a formulář má tři prázdné řádky surovin.

## Struktura souborů

| Soubor | Odpovědnost | Task |
|---|---|---|
| `src/domain/schema.ts` | `CUSTOM_SERVINGS_MAX`, `baseServings` 1–50 jen pro vlastní | 1 |
| `src/content/customRecipes.ts` (nový) | `isCustomRecipe`, `slugify`, `newCustomRecipeId`, `deriveAllergens`, `customRecipeProblem`, `mergeRecipes` | 1 |
| `src/test/customRecipe.ts` (nový) | testovací vlastní recept `customRecipe(over)` | 1 |
| `src/state/userState.ts`, `src/state/UserStateProvider.tsx` | `customRecipes: Recipe[]`, `validCustomRecipes`, `upsertCustomRecipe`, `deleteCustomRecipe`, `importCustomRecipes` | 2 |
| `src/app/route.ts`, `src/app/useHashRoute.ts` | routy `new-recipe`/`edit-recipe`, `editorRouteFromHash`, nové vyhledání stránky po změně layoutu | 3 |
| `src/styles/themes.css`, `src/styles/paper.css`, `src/styles/custom.css` (nový), `src/main.tsx` | ručně psaný list bez natočení `.page`, Caveat 700, styly vlastních receptů | 4, 5, 8, 10 |
| `src/pages/recipeText.ts`, `src/pages/RecipePage.tsx`, `src/App.tsx` | patička, Upravit/Smazat, sloučení receptů, smazání | 4 |
| `src/content/search.ts`, `src/pages/TocPages.tsx`, `src/pages/icons.tsx` | značka „vlastní“, filtr „Vlastní“, Nový recept | 5 |
| `src/custom/draft.ts` (nový) | rozepsaný recept, `parseDecimal`, `parseSteps`, validace zod → `Recipe` | 6 |
| `src/custom/ingredientSuggest.ts`, `src/custom/IngredientPicker.tsx` (nové) | našeptávač surovin | 7 |
| `src/custom/RecipeForm.tsx` (nový) | formulář jako dialog | 8 |
| `src/App.tsx` | otevření/zavření/uložení formuláře | 9 |
| `src/custom/recipesFile.ts`, `src/custom/CustomRecipesSettings.tsx` (nové), `src/pages/SettingsPage.tsx`, `src/App.tsx` | export/import JSON, sekce tiráže | 10 |

---

### Task 1: Datový model vlastního receptu

**Files:**
- Modify: `src/domain/schema.ts:61-82` (`RecipeSchema`)
- Create: `src/content/customRecipes.ts`
- Create: `src/test/customRecipe.ts`
- Test: `src/domain/schema.test.ts`, `src/content/customRecipes.test.ts` (nový), `src/domain/nutrition.test.ts`, `src/domain/shopping.test.ts`, `src/pages/IngredientTable.test.tsx`

**Interfaces:**
- Consumes: `normalize` ze `src/content/search.ts`; `ALLERGENS`, `CHAPTERS` ze `src/domain/schema.ts`.
- Produces:
```ts
// src/domain/schema.ts
export const CUSTOM_SERVINGS_MAX = 50
// Recipe['baseServings']: number (dřív literál 4)
// src/content/customRecipes.ts
export const CUSTOM_ID_PREFIX = 'vlastni-'
export function isCustomRecipe(recipe: Pick<Recipe, 'source'>): boolean
export function slugify(title: string): string
export function newCustomRecipeId(title: string, taken: ReadonlySet<string>, random?: () => number): string
export function deriveAllergens(lines: readonly Pick<IngredientLine, 'ingredientId'>[], ingredients: ReadonlyMap<string, Ingredient>): Allergen[]
export function customRecipeProblem(recipe: Recipe, ingredients: ReadonlyMap<string, Ingredient>, staticIds: ReadonlySet<string>): string | null
export function mergeRecipes(staticRecipes: readonly Recipe[], custom: readonly Recipe[], ingredients: ReadonlyMap<string, Ingredient>): Recipe[]
// src/test/customRecipe.ts
export const OWN_ID = 'vlastni-babicciny-livance-ab12'
export function customRecipe(over?: Partial<Recipe>): Recipe
```

- [ ] **Step 1: Testovací recept (pomocný soubor pro testy všech tasků)**

```ts
// src/test/customRecipe.ts
import type { Recipe } from '@/domain/types'

export const OWN_ID = 'vlastni-babicciny-livance-ab12'

/** Platný vlastní recept pro testy: 2 porce, suroviny z data/ingredients.json, alergeny odvozené ze surovin. */
export function customRecipe(over: Partial<Recipe> = {}): Recipe {
  return {
    id: OWN_ID,
    title: 'Babiččiny lívance',
    chapter: 'snidane-a-pecivo',
    baseServings: 2,
    timeMinutes: 30,
    difficulty: 1,
    tags: [],
    equipment: ['plotna'],
    allergens: ['lepek', 'vejce'],
    ingredients: [
      { ingredientId: 'hladka-mouka', amount: 125, unit: 'g' },
      { ingredientId: 'vejce', amount: 1, unit: 'ks' },
      { ingredientId: 'sul', amount: 1, unit: 'spetka' },
    ],
    steps: ['Smíchej mouku s vejcem a solí.', 'Peč na pánvi dozlatova.'],
    source: { book: 'vlastni' },
    verified: true,
    ...over,
  }
}
```

- [ ] **Step 2: Napsat failing testy**

V `src/domain/schema.test.ts` nahradit řádek `test('baseServings musí být 4', …)` (fixture `recipe` má `source: { book: 'vlastni' }`):

```ts
test('knižní recept musí mít baseServings 4', () =>
  expect(RecipeSchema.safeParse({ ...recipe, baseServings: 6, source: { book: 'afrs-2003' } }).success).toBe(false))
test('vlastní recept smí mít 1–50 celých porcí', () => {
  expect(RecipeSchema.safeParse({ ...recipe, baseServings: 6 }).success).toBe(true)
  expect(RecipeSchema.safeParse({ ...recipe, baseServings: 1 }).success).toBe(true)
  for (const b of [0, 51, 2.5]) expect(RecipeSchema.safeParse({ ...recipe, baseServings: b }).success).toBe(false)
})
```

Nový `src/content/customRecipes.test.ts`:

```ts
import { RecipeSchema } from '@/domain/schema'
import { customRecipe } from '@/test/customRecipe'
import { customRecipeProblem, deriveAllergens, isCustomRecipe, mergeRecipes, newCustomRecipeId, slugify } from './customRecipes'
import { loadContent } from './loadContent'

const { recipes, ingredients } = loadContent()
const staticIds = new Set(recipes.map((r) => r.id))

describe('slugify', () => {
  test.each([
    ['Babiččiny lívance', 'babicciny-livance'],
    ['  Guláš (pro 10!) ', 'gulas-pro-10'],
    ['Žluťoučký kůň úpěl ďábelské ódy a ještě mnohem delší název', 'zlutoucky-kun-upel-dabelske-ody-a-jeste'],
    ['???', 'recept'],
  ])('%j → %s', (title, slug) => expect(slugify(title)).toBe(slug))
})

describe('newCustomRecipeId', () => {
  test('tvar vlastni-<slug>-<4 znaky> a platné id receptu', () => {
    const id = newCustomRecipeId('Babiččiny lívance', new Set())
    expect(id).toMatch(/^vlastni-babicciny-livance-[a-z0-9]{4}$/)
    expect(RecipeSchema.safeParse(customRecipe({ id })).success).toBe(true)
  })
  test('při kolizi losuje znovu', () => {
    const values = [0, 0.5]
    expect(newCustomRecipeId('X', new Set(['vlastni-x-0000']), () => values.shift()!)).toBe('vlastni-x-i000')
  })
  test('i se zaseknutou náhodou cyklus skončí (po 20 pokusech přidá pořadí)', () =>
    expect(newCustomRecipeId('X', new Set(['vlastni-x-0000']), () => 0)).toBe('vlastni-x-0000k'))
})

test('isCustomRecipe podle knihy', () => {
  expect(isCustomRecipe(customRecipe())).toBe(true)
  expect(isCustomRecipe(recipes[0])).toBe(false)
})

test('deriveAllergens: sjednocení alergenů surovin v pořadí ALLERGENS', () => {
  expect(deriveAllergens([{ ingredientId: 'vejce' }, { ingredientId: 'hladka-mouka' }, { ingredientId: 'sul' }], ingredients)).toEqual(['lepek', 'vejce'])
  expect(deriveAllergens([{ ingredientId: 'sul' }], ingredients)).toEqual([])
  expect(deriveAllergens([{ ingredientId: 'neexistuje' }], ingredients)).toEqual([])
})

describe('customRecipeProblem', () => {
  test('platný vlastní recept → null', () => expect(customRecipeProblem(customRecipe(), ingredients, staticIds)).toBeNull())
  test('knižní recept', () =>
    expect(customRecipeProblem(recipes[0], ingredients, staticIds)).toBe('není vlastní recept (source.book musí být „vlastni“)'))
  test('id knižního receptu', () =>
    expect(customRecipeProblem(customRecipe({ id: 'brownies' }), ingredients, staticIds)).toBe('id „brownies“ už má recept z knihy'))
  test('neznámá surovina', () =>
    expect(customRecipeProblem(customRecipe({ ingredients: [{ ingredientId: 'neexistuje', amount: 1, unit: 'g' }] }), ingredients, staticIds)).toBe(
      'neznámá surovina „neexistuje“',
    ))
})

describe('mergeRecipes', () => {
  test('vlastní recept je na konci své kapitoly, knižní pořadí se nemění', () => {
    const own = customRecipe()
    const merged = mergeRecipes(recipes, [own], ingredients)
    expect(merged).toHaveLength(recipes.length + 1)
    expect(merged.filter((r) => r.chapter === own.chapter).at(-1)).toBe(own)
    expect(merged.filter((r) => r.id !== own.id)).toEqual(recipes)
  })
  test('vlastní recepty mezi sebou podle názvu', () => {
    const a = customRecipe({ id: 'vlastni-a-0001', title: 'Žemlovka' })
    const b = customRecipe({ id: 'vlastni-b-0002', title: 'Čočkové placky' })
    const chapter = mergeRecipes(recipes, [a, b], ingredients).filter((r) => r.chapter === a.chapter)
    expect(chapter.slice(-2).map((r) => r.title)).toEqual(['Čočkové placky', 'Žemlovka'])
  })
  test('nezařaditelný vlastní recept se vynechá s varováním', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bad = customRecipe({ ingredients: [{ ingredientId: 'neexistuje', amount: 1, unit: 'g' }] })
    expect(mergeRecipes(recipes, [bad], ingredients)).toEqual(recipes)
    expect(warn).toHaveBeenCalledWith('Vlastní recept „Babiččiny lívance“ vynechán: neznámá surovina „neexistuje“')
    warn.mockRestore()
  })
  test('bez vlastních receptů beze změny', () => expect(mergeRecipes(recipes, [], ingredients)).toEqual(recipes))
})
```

Do `src/domain/shopping.test.ts` (na konec, používá místní `recipe`, `ingredients`, `modern`):

```ts
test('recept napsaný pro 2 porce se přepočítá z baseServings (P = 4 → dvojnásobek)', () => {
  const dvePorce: Recipe = { ...recipe('dve-porce', 'Dvě porce', [{ ingredientId: 'mouka', amount: 100, unit: 'g' }]), baseServings: 2 }
  const [group] = buildShoppingList([{ recipeId: 'dve-porce', multiplier: 1 }], new Map([[dvePorce.id, dvePorce]]), ingredients, modern)
  expect(group.items[0]).toMatchObject({ ingredientId: 'mouka', amount: 200, unit: 'g' })
})
```

Do `src/domain/nutrition.test.ts` (na konec, místní `recipe`, `ingredients`):

```ts
test('recipeMacrosPerServing dělí baseServings (vlastní recept pro 2 porce)', () => {
  const pul: Recipe = { ...recipe('pul', [{ ingredientId: 'mrkev', amount: 400, unit: 'g' }]), baseServings: 2 }
  expect(recipeMacrosPerServing(pul, ingredients, false).kcal).toBeCloseTo(82) // 400 g × 41 kcal/100 g / 2
})
```

Do `src/pages/IngredientTable.test.tsx` (uvnitř `describe('IngredientTable')`, import `import { customRecipe } from '@/test/customRecipe'`):

```ts
  it('vlastní recept pro 2 porce: 4 osoby = dvojnásobek (k = P / baseServings)', () => {
    render(<IngredientTable recipe={customRecipe()} ingredients={ingredients} portions={portions(4, 0)} historical={false} />)
    expect(within(screen.getByText('Hladká mouka').closest('tr')!).getByText('250 g')).toBeInTheDocument()
    expect(within(screen.getByText('Vejce').closest('tr')!).getByText('2 ks')).toBeInTheDocument()
    expect(screen.getByText('přepočteno na 4 porce')).toBeInTheDocument()
  })
```

- [ ] **Step 3: Spustit testy – musí selhat**

Run: `npx vitest run src/domain/schema.test.ts src/content/customRecipes.test.ts src/domain/nutrition.test.ts src/domain/shopping.test.ts src/pages/IngredientTable.test.tsx`
Expected: FAIL – `customRecipes.test.ts` (`Failed to resolve import "./customRecipes"`) a `schema.test.ts` („vlastní recept smí mít 1–50 celých porcí“). Nové testy v `nutrition`, `shopping` a `IngredientTable` projdou už teď, protože doména počítá s `recipe.baseServings` obecně. Pojišťují to do budoucna. Jejich typovou chybu (`baseServings: 2` není literál `4`) Vitest nehlásí, ukáže ji až `npm run build`, a ta po Stepu 4 zmizí.

- [ ] **Step 4: Implementace**

`src/domain/schema.ts` – nad `RecipeSchema`:

```ts
/** Nejvyšší počet porcí, pro který smí být napsaný vlastní recept (formulář „pro kolik porcí je recept napsaný“). */
export const CUSTOM_SERVINGS_MAX = 50
```

V `RecipeSchema` nahradit `baseServings: z.literal(4),` za:

```ts
  baseServings: z.number().int().min(1).max(CUSTOM_SERVINGS_MAX),
```

a konec definice `}).strict()` za:

```ts
})
  .strict()
  // knižní recepty jsou přepočtené na 4 porce (spec §5.1); jiný základ smí mít jen vlastní recept
  .refine((r) => r.baseServings === 4 || r.source.book === 'vlastni', {
    message: 'baseServings musí být 4 (jiný počet porcí smí mít jen vlastní recept)',
    path: ['baseServings'],
  })
```

Nový `src/content/customRecipes.ts`:

```ts
import { ALLERGENS, CHAPTERS } from '@/domain/schema'
import type { Allergen, Ingredient, IngredientLine, Recipe } from '@/domain/types'
import { normalize } from './search'

/** Prefix id vlastních receptů (`vlastni-<slug>-<suffix>`). */
export const CUSTOM_ID_PREFIX = 'vlastni-'
const SLUG_MAX = 40

export function isCustomRecipe(recipe: Pick<Recipe, 'source'>): boolean {
  return recipe.source.book === 'vlastni'
}

/** Název → kebab-case bez diakritiky (nejvýš 40 znaků); bez písmen a číslic → „recept“. */
export function slugify(title: string): string {
  const slug = normalize(title).replace(/[^a-z0-9]+/g, '-').slice(0, SLUG_MAX).replace(/^-+|-+$/g, '')
  return slug || 'recept'
}

/**
 * Nové id vlastního receptu: `vlastni-<slug>-<4 znaky base36>`.
 * Při kolizi losuje znovu; po 20 pokusech přidá pořadí pokusu, aby cyklus skončil i se zaseknutou náhodou.
 */
export function newCustomRecipeId(title: string, taken: ReadonlySet<string>, random: () => number = Math.random): string {
  const slug = slugify(title)
  for (let attempt = 0; ; attempt++) {
    const suffix = Math.floor(random() * 36 ** 4).toString(36).padStart(4, '0') + (attempt >= 20 ? attempt.toString(36) : '')
    const id = `${CUSTOM_ID_PREFIX}${slug}-${suffix}`
    if (!taken.has(id)) return id
  }
}

/** Alergeny receptu = sjednocení alergenů jeho surovin v pořadí `ALLERGENS` (ruling R2). */
export function deriveAllergens(lines: readonly Pick<IngredientLine, 'ingredientId'>[], ingredients: ReadonlyMap<string, Ingredient>): Allergen[] {
  return ALLERGENS.filter((a) => lines.some((l) => ingredients.get(l.ingredientId)?.allergens.includes(a)))
}

/** Proč vlastní recept nejde zařadit do knihy (null = jde). Sdílí sloučení obsahu i import (ruling R5). */
export function customRecipeProblem(recipe: Recipe, ingredients: ReadonlyMap<string, Ingredient>, staticIds: ReadonlySet<string>): string | null {
  if (!isCustomRecipe(recipe)) return 'není vlastní recept (source.book musí být „vlastni“)'
  if (staticIds.has(recipe.id)) return `id „${recipe.id}“ už má recept z knihy`
  const unknown = recipe.ingredients.find((l) => !ingredients.has(l.ingredientId))
  if (unknown) return `neznámá surovina „${unknown.ingredientId}“`
  return null
}

/**
 * Recepty knihy: knižní v původním pořadí, vlastní na konci své kapitoly, mezi sebou podle názvu (ruling R4).
 * Vlastní recept, který nejde zařadit, se vynechá s varováním v konzoli.
 */
export function mergeRecipes(staticRecipes: readonly Recipe[], custom: readonly Recipe[], ingredients: ReadonlyMap<string, Ingredient>): Recipe[] {
  const staticIds = new Set(staticRecipes.map((r) => r.id))
  const usable = custom.filter((r) => {
    const problem = customRecipeProblem(r, ingredients, staticIds)
    if (problem) console.warn(`Vlastní recept „${r.title}“ vynechán: ${problem}`)
    return problem === null
  })
  const sorted = [...usable].sort((a, b) => a.title.localeCompare(b.title, 'cs'))
  return CHAPTERS.flatMap((chapter) => [
    ...staticRecipes.filter((r) => r.chapter === chapter),
    ...sorted.filter((r) => r.chapter === chapter),
  ])
}
```

- [ ] **Step 5: Spustit testy – musí projít**

Run: `npx vitest run src/domain/schema.test.ts src/content/customRecipes.test.ts src/domain/nutrition.test.ts src/domain/shopping.test.ts src/pages/IngredientTable.test.tsx`
Expected: PASS.

- [ ] **Step 6: Ověřit celek a commit**

Run: `npm test && npm run build && npm run lint && npm run validate`
Expected: vše zelené. `validate` dál vyžaduje 4 porce u knižních receptů.

```bash
git add src/domain/schema.ts src/domain/schema.test.ts src/content/customRecipes.ts src/content/customRecipes.test.ts src/test/customRecipe.ts src/domain/nutrition.test.ts src/domain/shopping.test.ts src/pages/IngredientTable.test.tsx
git commit -m "feat(vlastní recepty): datový model – id, alergeny, zařazení do kapitoly, porce ≠ 4"
```

---

### Task 2: Vlastní recepty v uživatelském stavu

**Files:**
- Modify: `src/state/userState.ts` (`UserState.customRecipes`, schéma, `sanitize`, nové funkce)
- Modify: `src/state/UserStateProvider.tsx` (API)
- Test: `src/state/userState.test.ts`, `src/state/UserStateProvider.test.tsx`

**Interfaces:**
- Consumes: `RecipeSchema` (Task 1), `customRecipe`, `OWN_ID` ze `src/test/customRecipe.ts`.
- Produces:
```ts
// src/state/userState.ts
interface UserState { /* … */ customRecipes: Recipe[] }
export function validCustomRecipes(raw: readonly unknown[]): Recipe[]
export function upsertCustomRecipe(s: UserState, recipe: Recipe): UserState
export function deleteCustomRecipe(s: UserState, id: string): UserState
export function importCustomRecipes(s: UserState, recipes: readonly Recipe[], overwrite: boolean): UserState
// useUserState()
saveCustomRecipe(recipe: Recipe): void
deleteCustomRecipe(id: string): void
importCustomRecipes(recipes: readonly Recipe[], overwrite: boolean): void
```

- [ ] **Step 1: Napsat failing testy**

Do `src/state/userState.test.ts` (import doplnit o `vi` z `vitest`, `deleteCustomRecipe`, `importCustomRecipes`, `upsertCustomRecipe` z `./userState` a `import { OWN_ID, customRecipe } from '@/test/customRecipe';`):

```ts
describe('vlastní recepty', () => {
  const storageWith = (value: unknown) => ({ getItem: () => JSON.stringify(value) });

  it('platné se načtou, neplatné, cizí a duplicitní se zahodí s varováním', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ok = customRecipe();
    const s = loadUserState(storageWith({
      version: 1,
      favorites: ['a'],
      customRecipes: [ok, { id: 'rozbity' }, customRecipe({ id: 'vlastni-cizi-0001', baseServings: 4, source: { book: 'afrs-2003' } }), customRecipe()],
    }));
    expect(s.customRecipes).toEqual([ok]);
    expect(s.favorites).toEqual(['a']);
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });

  it('customRecipes jiného typu než pole → prázdné', () => {
    expect(loadUserState(storageWith({ version: 1, customRecipes: 'x' })).customRecipes).toEqual([]);
  });

  it('round-trip přes saveUserState zachová vlastní recept', () => {
    let stored = '';
    const s = upsertCustomRecipe(DEFAULT_USER_STATE, customRecipe());
    saveUserState({ setItem: (_k, v) => (stored = v) }, s);
    expect(loadUserState({ getItem: () => stored })).toEqual(s);
  });

  it('upsertCustomRecipe přidá nový na konec a existující nahradí na místě', () => {
    const a = customRecipe();
    const b = customRecipe({ id: 'vlastni-kase-0001', title: 'Kaše' });
    const s = upsertCustomRecipe(upsertCustomRecipe(DEFAULT_USER_STATE, a), b);
    expect(s.customRecipes.map((r) => r.id)).toEqual([OWN_ID, 'vlastni-kase-0001']);
    const edited = upsertCustomRecipe(s, { ...a, title: 'Lívance' });
    expect(edited.customRecipes.map((r) => r.title)).toEqual(['Lívance', 'Kaše']);
    expect(DEFAULT_USER_STATE.customRecipes).toEqual([]);
  });

  it('deleteCustomRecipe odebere recept i z košíku, oblíbených a uvařených', () => {
    const s = toggleCooked(toggleFavorite(toggleCart(upsertCustomRecipe(DEFAULT_USER_STATE, customRecipe()), OWN_ID), OWN_ID), OWN_ID);
    const d = deleteCustomRecipe(toggleFavorite(s, 'brownies'), OWN_ID);
    expect(d.customRecipes).toEqual([]);
    expect(d.cart).toEqual([]);
    expect(d.favorites).toEqual(['brownies']);
    expect(d.cooked).toEqual([]);
  });

  it('importCustomRecipes: nové přidá, existující přepíše jen s overwrite', () => {
    const s = upsertCustomRecipe(DEFAULT_USER_STATE, customRecipe());
    const incoming = [customRecipe({ title: 'Z jiného zařízení' }), customRecipe({ id: 'vlastni-kase-0001', title: 'Kaše' })];
    expect(importCustomRecipes(s, incoming, false).customRecipes.map((r) => r.title)).toEqual(['Babiččiny lívance', 'Kaše']);
    expect(importCustomRecipes(s, incoming, true).customRecipes.map((r) => r.title)).toEqual(['Z jiného zařízení', 'Kaše']);
  });
});
```

Do `src/state/UserStateProvider.test.tsx` (import `renderHook` z `@testing-library/react`, `customRecipe` z `@/test/customRecipe`):

```tsx
describe('vlastní recepty v provideru', () => {
  it('uloží, upraví, naimportuje a smaže vlastní recept a změnu zapíše do úložiště', () => {
    vi.useFakeTimers();
    const storage = makeStorage();
    const { result } = renderHook(() => useUserState(), {
      wrapper: ({ children }) => <UserStateProvider storage={storage}>{children}</UserStateProvider>,
    });
    const r = customRecipe();
    act(() => result.current.saveCustomRecipe(r));
    expect(result.current.state.customRecipes).toEqual([r]);
    act(() => result.current.saveCustomRecipe({ ...r, title: 'Lívance II' }));
    expect(result.current.state.customRecipes.map((x) => x.title)).toEqual(['Lívance II']);
    act(() => result.current.importCustomRecipes([r, customRecipe({ id: 'vlastni-jine-0001' })], false));
    expect(result.current.state.customRecipes.map((x) => [x.id, x.title])).toEqual([
      [r.id, 'Lívance II'],
      ['vlastni-jine-0001', 'Babiččiny lívance'],
    ]);
    act(() => result.current.deleteCustomRecipe(r.id));
    expect(result.current.state.customRecipes.map((x) => x.id)).toEqual(['vlastni-jine-0001']);
    act(() => vi.advanceTimersByTime(300));
    expect(JSON.parse(storage.setItem.mock.lastCall![1]).customRecipes).toHaveLength(1);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/state/userState.test.ts src/state/UserStateProvider.test.tsx`
Expected: FAIL. `upsertCustomRecipe`, `deleteCustomRecipe` a `importCustomRecipes` nejsou exportované a `saveCustomRecipe is not a function`.

- [ ] **Step 3: Implementace**

`src/state/userState.ts`:

```ts
import { RecipeSchema } from '@/domain/schema';
import type { Recipe } from '@/domain/types';
```

V `interface UserState` nahradit `customRecipes: unknown[];` za:

```ts
  /** Vlastní recepty (spec §5.2): `Recipe` s `source.book = 'vlastni'`, validované při načtení. */
  customRecipes: Recipe[];
```

Schéma `customRecipes: z.array(z.unknown()).catch([]),` zůstává (validace po položkách je až v `sanitize`, aby jedna vadná položka nezahodila všechny). Pod `userStateSchema` přidat typ a funkci:

```ts
type ParsedUserState = z.infer<typeof userStateSchema>;

/** Vlastní recepty z úložiště: neplatné (schéma, cizí kniha, duplicitní id) se zahodí s varováním (ruling R5). */
export function validCustomRecipes(raw: readonly unknown[]): Recipe[] {
  const out: Recipe[] = [];
  raw.forEach((item, i) => {
    const parsed = RecipeSchema.safeParse(item);
    if (!parsed.success) {
      console.warn(`Vlastní recept č. ${i + 1} neodpovídá schématu a byl zahozen.`, parsed.error.issues);
      return;
    }
    if (parsed.data.source.book !== 'vlastni') {
      console.warn(`Vlastní recept „${parsed.data.title}“ nemá source.book „vlastni“ a byl zahozen.`);
      return;
    }
    if (out.some((r) => r.id === parsed.data.id)) {
      console.warn(`Vlastní recept „${parsed.data.id}“ je uložený dvakrát, ponechán první.`);
      return;
    }
    out.push(parsed.data);
  });
  return out;
}
```

`sanitize` přijme výsledek schématu a vrátí `UserState`:

```ts
/** Meze a deduplikace pro stav načtený z úložiště (ručně upravený nebo starý JSON); vlastní recepty se validují. */
function sanitize(s: ParsedUserState): UserState {
  const cart: UserState['cart'] = [];
  for (const e of s.cart) {
    if (cart.some((c) => c.recipeId === e.recipeId)) continue; // duplicita: první vyhrává
    cart.push({ recipeId: e.recipeId, multiplier: clampMultiplier(e.multiplier) });
  }
  return updateSettings(
    { ...s, cart, people: clampPeople(s.people), dayFactor: clampDayFactor(s.dayFactor), customRecipes: validCustomRecipes(s.customRecipes) },
    {},
  );
}
```

Za `removeFromCart` přidat:

```ts
/** Nový vlastní recept na konec, existující (stejné id) nahradí na místě. */
export function upsertCustomRecipe(s: UserState, recipe: Recipe): UserState {
  const exists = s.customRecipes.some((r) => r.id === recipe.id);
  return {
    ...s,
    customRecipes: exists ? s.customRecipes.map((r) => (r.id === recipe.id ? recipe : r)) : [...s.customRecipes, recipe],
  };
}

/** Smaže vlastní recept a všechny odkazy na něj (košík, oblíbené, uvařené) – ruling R10. */
export function deleteCustomRecipe(s: UserState, id: string): UserState {
  return {
    ...s,
    customRecipes: s.customRecipes.filter((r) => r.id !== id),
    cart: s.cart.filter((e) => e.recipeId !== id),
    favorites: s.favorites.filter((x) => x !== id),
    cooked: s.cooked.filter((x) => x !== id),
  };
}

/** Import: nové recepty přidá, existující id přepíše jen s `overwrite` (ruling R11). */
export function importCustomRecipes(s: UserState, recipes: readonly Recipe[], overwrite: boolean): UserState {
  let next = s;
  for (const r of recipes) {
    if (!overwrite && next.customRecipes.some((x) => x.id === r.id)) continue;
    next = upsertCustomRecipe(next, r);
  }
  return next;
}
```

`src/state/UserStateProvider.tsx`: import rozšířit o `deleteCustomRecipe as deleteCustomRecipeFn`, `importCustomRecipes as importCustomRecipesFn`, `upsertCustomRecipe as upsertCustomRecipeFn` a `import type { Recipe } from '@/domain/types';`. Do `interface UserStateApi` přidat:

```ts
  /** Uloží nový nebo upravený vlastní recept (podle id). */
  saveCustomRecipe(recipe: Recipe): void;
  /** Smaže vlastní recept včetně záznamů v košíku, oblíbených a uvařených. */
  deleteCustomRecipe(id: string): void;
  /** Přidá importované vlastní recepty; existující id přepíše jen s `overwrite`. */
  importCustomRecipes(recipes: readonly Recipe[], overwrite: boolean): void;
```

V `UserStateProvider` za `updateSettings`:

```ts
  const saveCustomRecipe = useCallback((recipe: Recipe) => setState((s) => upsertCustomRecipeFn(s, recipe)), []);
  const deleteCustomRecipe = useCallback((id: string) => setState((s) => deleteCustomRecipeFn(s, id)), []);
  const importCustomRecipes = useCallback(
    (recipes: readonly Recipe[], overwrite: boolean) => setState((s) => importCustomRecipesFn(s, recipes, overwrite)),
    [],
  );
```

a všechny tři doplnit do objektu i závislostí `useMemo` hodnoty kontextu.

- [ ] **Step 4: Spustit testy – musí projít**

Run: `npx vitest run src/state/userState.test.ts src/state/UserStateProvider.test.tsx`
Expected: PASS.

- [ ] **Step 5: Ověřit celek a commit**

Run: `npm test && npm run build && npm run lint`
Expected: vše zelené.

```bash
git add src/state/userState.ts src/state/userState.test.ts src/state/UserStateProvider.tsx src/state/UserStateProvider.test.tsx
git commit -m "feat(vlastní recepty): uložení v uživatelském stavu se zod validací při načtení"
```

---

### Task 3: Hash routy formuláře a stránka podle hashe po změně layoutu

**Files:**
- Modify: `src/app/route.ts`
- Modify: `src/app/useHashRoute.ts:25-33` (efekt na `layout`)
- Test: `src/app/route.test.ts`, `src/app/useHashRoute.test.tsx`

**Interfaces:**
- Consumes: nic nového.
- Produces:
```ts
type Route = … | { kind: 'new-recipe' } | { kind: 'edit-recipe'; id: string }
export type EditorRoute = Extract<Route, { kind: 'new-recipe' | 'edit-recipe' }>
export function editorRouteFromHash(hash: string): EditorRoute | null
// routeToHash: '#/novy-recept', '#/recept/<id>/upravit'
// routeToIndex: new-recipe → tocIndex, edit-recipe → recipeIndex.get(id) ?? null
// useHashRoute: po změně layoutu index = readIndex(nový layout)
```

- [ ] **Step 1: Napsat failing testy**

Do `src/app/route.test.ts` (import doplnit o `editorRouteFromHash`):

```ts
test('routy formuláře vlastního receptu', () => {
  expect(parseRoute('#/novy-recept')).toEqual({ kind: 'new-recipe' })
  expect(parseRoute('#/recept/vlastni-kase-ab12/upravit')).toEqual({ kind: 'edit-recipe', id: 'vlastni-kase-ab12' })
  expect(parseRoute('#/recept/vlastni-kase-ab12')).toEqual({ kind: 'recipe', id: 'vlastni-kase-ab12' })
  expect(routeToHash({ kind: 'new-recipe' })).toBe('#/novy-recept')
  expect(routeToHash({ kind: 'edit-recipe', id: 'kulajda' })).toBe('#/recept/kulajda/upravit')
  expect(routeToIndex({ kind: 'new-recipe' }, layout)).toBe(layout.tocIndex)
  expect(routeToIndex({ kind: 'edit-recipe', id: 'kulajda' }, layout)).toBe(6)
  expect(routeToIndex({ kind: 'edit-recipe', id: 'neni' }, layout)).toBeNull()
})

test('editorRouteFromHash: jen routy formuláře', () => {
  expect(editorRouteFromHash('#/novy-recept')).toEqual({ kind: 'new-recipe' })
  expect(editorRouteFromHash('#/recept/kulajda/upravit')).toEqual({ kind: 'edit-recipe', id: 'kulajda' })
  expect(editorRouteFromHash('#/recept/kulajda')).toBeNull()
  expect(editorRouteFromHash('#/nesmysl')).toBeNull()
  expect(editorRouteFromHash('')).toBeNull()
})
```

Do `src/app/useHashRoute.test.tsx`:

```tsx
test('změna layoutu (přidaný recept posunul indexy) najde stránku znovu podle hashe', () => {
  history.replaceState(null, '', '#/recept/kulajda')
  const { result, rerender } = renderHook(({ l }) => useHashRoute(l), { initialProps: { l: layout } })
  expect(result.current.index).toBe(5)
  const own = { kind: 'recipe', recipeId: 'vlastni-kase-ab12', chapter: 'polevky' as const }
  const shifted: LayoutLike = {
    ...layout,
    entries: [...layout.entries.slice(0, 5), own, own, layout.entries[5]],
    recipeIndex: new Map([['vlastni-kase-ab12', 5], ['kulajda', 7]]),
  }
  rerender({ l: shifted })
  expect(result.current.index).toBe(7)
  expect(location.hash).toBe('#/recept/kulajda')
})

test('stejný layout při překreslení index nemění', () => {
  const { result, rerender } = renderHook(({ l }) => useHashRoute(l), { initialProps: { l: layout } })
  act(() => result.current.setIndex(4))
  history.replaceState(null, '', '#/obsah') // kdyby se hash četl znovu, index by skočil na obsah
  rerender({ l: layout })
  expect(result.current.index).toBe(4)
})

test('#/novy-recept: pod formulářem obsah; #/recept/<id>/upravit: upravovaný recept', () => {
  history.replaceState(null, '', '#/novy-recept')
  expect(renderHook(() => useHashRoute(layout)).result.current.index).toBe(3)
  expect(location.hash).toBe('#/novy-recept')
  history.replaceState(null, '', '#/recept/kulajda/upravit')
  expect(renderHook(() => useHashRoute(layout)).result.current.index).toBe(5)
  expect(location.hash).toBe('#/recept/kulajda/upravit')
})
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/app/route.test.ts src/app/useHashRoute.test.tsx`
Expected: FAIL. `editorRouteFromHash` není exportovaný, `#/novy-recept` se vyhodnotí jako neznámý (index 0) a posunutý layout nechá index 5.

- [ ] **Step 3: Implementace**

`src/app/route.ts` – `Route` rozšířit a přidat typ:

```ts
export type Route =
  | { kind: 'cover' }
  | { kind: 'recipe'; id: string }
  | { kind: 'chapter'; id: Chapter }
  | { kind: 'toc' }
  | { kind: 'list' }
  | { kind: 'settings' }
  | { kind: 'cart' }
  | { kind: 'new-recipe' }
  | { kind: 'edit-recipe'; id: string }

/** Routy formuláře vlastního receptu: dialog nad knihou, ne stránka layoutu (ruling R7). */
export type EditorRoute = Extract<Route, { kind: 'new-recipe' | 'edit-recipe' }>
```

V `parseRoute` nahradit řádek s `head === 'recept'` za:

```ts
    if (head === 'recept' && arg) {
      const id = decodeURIComponent(arg)
      return parts[2] === 'upravit' ? { kind: 'edit-recipe', id } : { kind: 'recipe', id }
    }
```

a za `if (head === 'kosik') …` přidat `if (head === 'novy-recept') return { kind: 'new-recipe' }`.

`routeToHash` – nové větve:

```ts
    case 'new-recipe': return '#/novy-recept'
    case 'edit-recipe': return `#/recept/${encodeURIComponent(route.id)}/upravit`
```

`routeToIndex` – nové větve:

```ts
    // formulář je dialog nad knihou: pod novým receptem leží obsah, pod úpravou upravovaný recept
    case 'new-recipe': return layout.tocIndex
    case 'edit-recipe': return layout.recipeIndex.get(route.id) ?? null
```

Na konec souboru:

```ts
/** Routa formuláře vlastního receptu z hashe; null = formulář je zavřený. */
export function editorRouteFromHash(hash: string): EditorRoute | null {
  const route = parseRoute(hash)
  return route?.kind === 'new-recipe' || route?.kind === 'edit-recipe' ? route : null
}
```

`src/app/useHashRoute.ts` – efekt na `layout` nahradit:

```ts
  const layoutRef = useRef(layout)
  useEffect(() => {
    if (layoutRef.current === layout) return
    layoutRef.current = layout
    // nový layout (načtení obsahu, uložený/smazaný/importovaný vlastní recept) posouvá indexy stránek:
    // stránka se najde znovu podle hashe, který vždy nese routu aktuální stránky (ruling R8)
    setIndexState(readIndex(layout))
  }, [layout])
```

- [ ] **Step 4: Spustit testy – musí projít**

Run: `npx vitest run src/app/route.test.ts src/app/useHashRoute.test.tsx`
Expected: PASS, včetně původního testu „prázdný layout hash nemaže a po načtení layoutu ho vyhodnotí“.

- [ ] **Step 5: Ověřit celek a commit**

Run: `npm test && npm run build && npm run lint`
Expected: vše zelené (`printJobForRoute` má `default` → nové routy tisknou obsah, `indexToRoute` je nikdy nevrací).

```bash
git add src/app/route.ts src/app/route.test.ts src/app/useHashRoute.ts src/app/useHashRoute.test.tsx
git commit -m "feat(vlastní recepty): hash routy formuláře a stránka podle hashe po změně layoutu"
```

---

### Task 4: Stránka vlastního receptu – ručně psaný list v knize, Upravit a Smazat

**Files:**
- Modify: `src/styles/themes.css` (blok `.era--vlastni`), `src/styles/paper.css` (za `.page--note`)
- Create: `src/styles/custom.css`
- Modify: `src/main.tsx` (Caveat 700, `custom.css`)
- Modify: `src/pages/recipeText.ts` (`sourceLine`), `src/pages/RecipePage.tsx`
- Modify: `src/App.tsx` (sloučení receptů, třída epochy, smazání)
- Test: `src/styles/themes.test.ts`, `src/styles/paper.test.ts`, `src/pages/recipeText.test.ts`, `src/pages/RecipePage.test.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `mergeRecipes`, `isCustomRecipe` (Task 1); `deleteCustomRecipe` z `useUserState` (Task 2); `routeToHash` (Task 3); `customRecipe`, `OWN_ID`.
- Produces:
```ts
// RecipeLeft – nové volitelné props
onEdit?: () => void   // tlačítko „Upravit“ (zapojí Task 9)
onDelete?: () => void // tlačítko „Smazat“ s window.confirm
// App: recipes = mergeRecipes(staticRecipes, state.customRecipes, ingredients)
```

- [ ] **Step 1: Napsat failing testy**

`src/styles/themes.test.ts` – druhý `describe` přepsat na všechny knihy a přidat testy natočení:

```ts
describe('themes.css – papír epoch', () => {
  it.each(BOOKS)('.era--%s nastavuje --paper', (book) => {
    expect(css).toMatch(new RegExp(`\\.era--${book}\\s*\\{[^}]*--paper:`))
  })
})

describe('themes.css – ručně psaný list', () => {
  it('.era--vlastni nenatáčí (třída je i na .page – natočení by rozbilo otáčení stránky)', () => {
    expect(css.match(/\.era--vlastni\s*\{([^}]*)\}/)?.[1]).not.toMatch(/transform/)
  })
  it('natočený je vnitřní list receptu', () => {
    expect(css).toMatch(/\.recipe-page\.era--vlastni\s*\{[^}]*transform:\s*rotate\(-0\.6deg\)/)
  })
})
```

`src/styles/paper.test.ts`:

```ts
test('linkovaný list nemá vodorovný scroll (natočený vnitřní list přesahuje rohy)', () => {
  expect(body('.page--note > .page-content')).toMatch(/overflow-x:\s*hidden/)
})
```

`src/pages/recipeText.test.ts` (import `import { customRecipe } from '@/test/customRecipe'`):

```ts
test('vlastní recept: kniha bez roku, patička s počtem porcí', () => {
  expect(bookLabel(customRecipe())).toBe('Vlastní recepty')
  expect(sourceLine(customRecipe())).toBe('Vlastní recept · zapsaný pro 2 porce')
  expect(sourceLine(customRecipe({ baseServings: 6 }))).toBe('Vlastní recept · zapsaný pro 6 porcí')
})
```

`src/pages/RecipePage.test.tsx` (import `customRecipe`):

```tsx
describe('vlastní recept', () => {
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
    confirm.mockRestore()
  })

  it('knižní recept tlačítka Upravit a Smazat nemá', () => {
    setupLeft()
    expect(screen.queryByRole('button', { name: 'Upravit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Smazat' })).toBeNull()
  })

  it('pravá strana: „Poznámka“ místo „Poznámka k modernizaci“ a patička bez roku', () => {
    render(<RecipeRight recipe={customRecipe({ modernNote: 'Podávej s povidly.' })} />)
    expect(screen.getByText('Poznámka')).toBeInTheDocument()
    expect(screen.queryByText('Poznámka k modernizaci')).toBeNull()
    expect(screen.getByText('Vlastní recept · zapsaný pro 2 porce')).toBeInTheDocument()
  })
})
```

`src/App.test.tsx` – importy `import { DEFAULT_USER_STATE, STORAGE_KEY, type UserState } from '@/state/userState'` a `import { OWN_ID, customRecipe } from '@/test/customRecipe'`, pomocná funkce pod `beforeEach` a testy:

```tsx
/** Uloží stav s vlastním receptem dřív, než se App načte (provider čte localStorage při startu). */
function seedCustom(extra: Partial<UserState> = {}) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULT_USER_STATE, customRecipes: [customRecipe()], ...extra }))
}

test('vlastní recept je ručně psaný list: era--vlastni na stránce i listu, linkovaný papír', () => {
  seedCustom()
  history.replaceState(null, '', `#/recept/${OWN_ID}`)
  const { container } = render(<App />)
  expect(screen.getAllByRole('heading', { name: 'Babiččiny lívance' }).length).toBeGreaterThan(0)
  const article = container.querySelector('.recipe-page--left')!
  expect(article).toHaveClass('era--vlastni')
  expect(article.closest('.page')).toHaveClass('era--vlastni', 'page--note')
})

test('vlastní recept v košíku se promítne do nákupního seznamu', () => {
  seedCustom({ cart: [{ recipeId: OWN_ID, multiplier: 1 }] })
  history.replaceState(null, '', '#/seznam')
  render(<App />)
  expect(screen.getByText('Hladká mouka')).toBeInTheDocument()
})

test('Smazat po potvrzení odstraní recept a vrátí na úvod kapitoly', () => {
  seedCustom({ favorites: [OWN_ID] })
  window.confirm = vi.fn(() => true)
  history.replaceState(null, '', `#/recept/${OWN_ID}`)
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Smazat' }))
  expect(window.confirm).toHaveBeenCalled()
  expect(location.hash).toBe('#/kapitola/snidane-a-pecivo')
  expect(screen.getByRole('status')).toHaveTextContent(/– Snídaně a pečivo$/)
  expect(screen.queryByRole('heading', { name: 'Babiččiny lívance' })).toBeNull()
})
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/styles/themes.test.ts src/styles/paper.test.ts src/pages/recipeText.test.ts src/pages/RecipePage.test.tsx src/App.test.tsx`
Expected: FAIL. `.era--vlastni` nemá `--paper` a obsahuje `transform`, patička je „Zdroj: Vlastní recepty, 2026“, tlačítka chybí a App vlastní recept nezná (hash se vyčistí).

- [ ] **Step 3: Implementace – CSS a písmo**

`src/styles/themes.css` – blok `.era--vlastni` až `.recipe-page.era--vlastni .source` nahradit:

```css
/* vlastní recept = ručně psaný vložený list (spec §2): linkovaný papír (`page--note`), Caveat.
   Třída je i na `.page` (papír a písmo celé stránky), proto tu nesmí být transform –
   natočený je až vnitřní list `.recipe-page` (ruling R9). */
.era--vlastni {
  --paper: var(--note-paper);
  --rule: 1px solid rgba(90, 120, 180, 0.45);
  font-family: var(--font-hand);
}
.era--vlastni h1,
.era--vlastni h2,
.era--vlastni h3,
.era--vlastni table { font-family: var(--font-hand); }

.recipe-page.era--vlastni {
  font-size: 1.15em;
  transform: rotate(-0.6deg);
  transform-origin: 50% 0;
}
.recipe-page.era--vlastni .source { font-family: var(--font-hand); }
```

`src/styles/paper.css` – hned za blok `.page--note { … }`:

```css
/* natočený vnitřní list (vlastní recept) přesahuje rohy do stran – vodorovně se neposouvá */
.page--note > .page-content { overflow-x: hidden; }
```

Nový `src/styles/custom.css`:

```css
/* ===== vlastní recepty (fáze 8) ===== */
.recipe-own-actions { display: flex; gap: 0.5rem; margin: 0.4em 0 0.2em; }
.recipe-own-button {
  font: inherit; font-size: 0.9em; padding: 0 0.8em; cursor: pointer;
  color: var(--ink); background: none; border: 1px solid var(--ink-soft); border-radius: 999px;
}
.recipe-own-button:focus-visible { outline: 2px solid var(--ink); }
```

`src/main.tsx` – za `import '@fontsource/caveat/latin-ext-400.css'`:

```ts
import '@fontsource/caveat/latin-700.css'
import '@fontsource/caveat/latin-ext-700.css'
```

a za `import './styles/themes.css'` (před `print.css`):

```ts
import './styles/custom.css'
```

- [ ] **Step 4: Implementace – texty a stránka receptu**

`src/pages/recipeText.ts` – import `plural` z `./labels` a začátek `sourceLine`:

```ts
/** Patička se zdrojem (stránka receptu i tisk); vlastní recept: počet porcí, na který je napsaný (ruling R13). */
export function sourceLine(recipe: Recipe): string {
  if (recipe.source.book === 'vlastni') {
    const n = recipe.baseServings
    return `Vlastní recept · zapsaný pro ${n} ${plural(n, 'porci', 'porce', 'porcí')}`
  }
  const meta = BOOK_META[recipe.source.book]
  // … původní tělo beze změny
```

`src/pages/RecipePage.tsx` – do `LeftProps`:

```ts
  /** Vlastní recept: otevře formulář úpravy. */
  onEdit?: () => void
  /** Vlastní recept: smaže ho po potvrzení. */
  onDelete?: () => void
```

`RecipeLeft` přijme `onEdit, onDelete` a hned za `<small id={hintId} className="print-hint">…</small>` vykreslí:

```tsx
      {(onEdit || onDelete) && (
        <div className="recipe-own-actions">
          {onEdit && (
            <button type="button" className="recipe-own-button" onClick={onEdit}>
              Upravit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="recipe-own-button"
              onClick={() => {
                if (window.confirm(`Smazat recept „${recipe.title}“? Zmizí i z košíku a oblíbených.`)) onDelete()
              }}
            >
              Smazat
            </button>
          )}
        </div>
      )}
```

V `RecipeRight` nahradit `<strong>Poznámka k modernizaci</strong>` za:

```tsx
          <strong>{recipe.source.book === 'vlastni' ? 'Poznámka' : 'Poznámka k modernizaci'}</strong>
```

- [ ] **Step 5: Implementace – App**

`src/App.tsx` – importy `import { isCustomRecipe, mergeRecipes } from '@/content/customRecipes'`, `import type { Recipe } from '@/domain/types'`, `routeToHash` z `@/app/route`. Začátek `Library`:

```tsx
function Library() {
  const { recipes: staticRecipes, ingredients } = useMemo(() => loadContent(), [])
  const { state, toggleFavorite, toggleCooked, toggleCart, setCartMultiplier, removeFromCart, setPeople, setDayFactor, updateSettings, deleteCustomRecipe } = useUserState()
  // vlastní recepty patří do knihy jako ostatní: layout, obsah, hledání, košík i tisk dostanou sloučený seznam
  const recipes = useMemo(() => mergeRecipes(staticRecipes, state.customRecipes, ingredients), [staticRecipes, state.customRecipes, ingredients])
  const layout = useMemo(() => buildLayout(recipes, { tocPageCount: tocPageCount(recipes) }), [recipes])
```

(původní řádek `const { state, … } = useUserState()` níže smazat). Za `navigate`:

```tsx
  // smazání: hash nejdřív na kapitolu (obsah, když v ní nic nezbude) – po změně layoutu na ni useHashRoute přejde (ruling R8, R10)
  const removeCustomRecipe = useCallback(
    (recipe: Recipe) => {
      const left = recipes.some((r) => r.chapter === recipe.chapter && r.id !== recipe.id)
      history.replaceState(null, '', routeToHash(left ? { kind: 'chapter', id: recipe.chapter } : { kind: 'toc' }))
      deleteCustomRecipe(recipe.id)
    },
    [recipes, deleteCustomRecipe],
  )
```

Větev `case 'recipe'`:

```tsx
        case 'recipe': {
          const recipe = recipeById.get(entry.recipeId!)!
          const own = isCustomRecipe(recipe)
          return {
            id: entry.id,
            tone: own ? 'note' : 'aged',
            // epocha na samotné stránce: `--paper` a písmo platí tam, kde se papír kreslí (obě poloviny);
            // vlastní recept se natáčí jen uvnitř (.recipe-page), ne celá .page (ruling R9)
            className: `era--${BOOK_META[recipe.source.book].era}`,
            render: () =>
              entry.half === 'right' ? (
                <RecipeRight recipe={recipe} />
              ) : (
                <RecipeLeft
                  /* … dosavadní props beze změny … */
                  onDelete={own ? () => removeCustomRecipe(recipe) : undefined}
                />
              ),
          }
        }
```

Do závislostí `useMemo` stránek přidat `removeCustomRecipe`.

- [ ] **Step 6: Spustit testy – musí projít**

Run: `npx vitest run src/styles/themes.test.ts src/styles/paper.test.ts src/pages/recipeText.test.ts src/pages/RecipePage.test.tsx src/App.test.tsx`
Expected: PASS.

- [ ] **Step 7: Ověřit celek a commit**

Run: `npm test && npm run build && npm run lint`
Expected: vše zelené.

```bash
git add src/styles/themes.css src/styles/themes.test.ts src/styles/paper.css src/styles/paper.test.ts src/styles/custom.css src/main.tsx src/pages/recipeText.ts src/pages/recipeText.test.ts src/pages/RecipePage.tsx src/pages/RecipePage.test.tsx src/App.tsx src/App.test.tsx
git commit -m "feat(vlastní recepty): stránka vlastního receptu jako natočený ručně psaný list, Upravit a Smazat"
```

---

### Task 5: Vlastní recepty v obsahu – značka, filtr „Vlastní“, tlačítko Nový recept

**Files:**
- Modify: `src/content/search.ts` (`tocRowUnits`, `TOC_FIRST_PAGE_UNITS`)
- Modify: `src/pages/icons.tsx` (`PenIcon`), `src/pages/TocPages.tsx`
- Modify: `src/styles/custom.css`
- Test: `src/content/search.test.ts`, `src/pages/TocPages.test.tsx`

**Interfaces:**
- Consumes: `isCustomRecipe`, `mergeRecipes` (Task 1), `customRecipe`.
- Produces:
```ts
export function PenIcon(): JSX.Element
// TocPages – nový volitelný prop (zapojí Task 9)
onNewRecipe?: () => void
// TOC_FIRST_PAGE_UNITS = 6
```

- [ ] **Step 1: Napsat failing testy**

`src/content/search.test.ts` (import `customRecipe`):

```ts
test('vlastní recept: ikona za názvem prodlouží řádek o 2 znaky', () => {
  const title = 'x'.repeat(TOC_LONG_TITLE_CHARS - 1)
  expect(tocRowUnits({ kind: 'recipe', recipe: customRecipe({ title }) })).toBe(2)
  expect(tocRowUnits({ kind: 'recipe', recipe: { ...customRecipe({ title }), baseServings: 4, source: { book: 'afrs-2003' } } })).toBe(1)
})

test('první stránka obsahu nese 6 jednotek (nadpis, filtry a tlačítko Nový recept)', () => expect(TOC_FIRST_PAGE_UNITS).toBe(6))
```

`src/pages/TocPages.test.tsx` (importy `import { mergeRecipes } from '@/content/customRecipes'` a `import { customRecipe } from '@/test/customRecipe'`):

```tsx
test('vlastní recept: ikona pera u řádku a pilulka Zdroj „Vlastní“', () => {
  const all = mergeRecipes(recipes, [customRecipe()], ingredients)
  const { container } = setup({ recipes: all, filter: { ...EMPTY_FILTER, books: ['vlastni'] } })
  expect(screen.getByRole('button', { name: 'Vlastní' })).toHaveAttribute('aria-pressed', 'true')
  const row = screen.getByRole('button', { name: /^Babiččiny lívance \(vlastní\)/ })
  expect(row.querySelector('.toc-row-own svg')).not.toBeNull()
  expect(container.querySelectorAll('.toc-row-own')).toHaveLength(1)
})

test('bez vlastních receptů pilulka „Vlastní“ chybí', () => {
  setup()
  expect(screen.queryByRole('button', { name: 'Vlastní' })).toBeNull()
})

test('Nový recept je v řádku Moje na první stránce obsahu', () => {
  const { props } = setup({ onNewRecipe: vi.fn() })
  fireEvent.click(screen.getByRole('button', { name: 'Nový recept' }))
  expect(props.onNewRecipe).toHaveBeenCalledOnce()
})

test('Nový recept není na další stránce obsahu ani bez handleru', () => {
  setup({ onNewRecipe: vi.fn(), page: 1 })
  expect(screen.queryByRole('button', { name: 'Nový recept' })).toBeNull()
})
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/content/search.test.ts src/pages/TocPages.test.tsx`
Expected: FAIL. `TOC_FIRST_PAGE_UNITS` je 7, chybí pilulka „Vlastní“, ikona i tlačítko.

- [ ] **Step 3: Implementace**

`src/content/search.ts`:

```ts
/** První stránka nese nadpis „Obsah“, panel filtrů a tlačítko „Nový recept“ (≈ 230 px; na 320 px se řádek „Moje“ zalomí). */
export const TOC_FIRST_PAGE_UNITS = 6
/** Ikona „vlastní“ za názvem zabere asi dva znaky. */
const OWN_MARK_CHARS = 2

export function tocRowUnits(row: TocRow): number {
  if (row.kind === 'chapter') return 2 // nadpis s okrajem a linkou (35 px)
  const chars = row.recipe.title.length + (row.recipe.source.book === 'vlastni' ? OWN_MARK_CHARS : 0)
  return chars > TOC_LONG_TITLE_CHARS ? 2 : 1
}
```

(`search.ts` neimportuje `customRecipes.ts`, který importuje `normalize` ze `search.ts` – žádný kruh.)

`src/pages/icons.tsx`:

```tsx
/** Pero: značka vlastního (ručně psaného) receptu v obsahu. */
export function PenIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20l1-4.5L16.5 4a2.1 2.1 0 0 1 3 3L8 18.5z" />
      <path d="M14.5 6l3 3" />
    </svg>
  )
}
```

`src/pages/TocPages.tsx` – importy `isCustomRecipe` z `@/content/customRecipes` a `PenIcon` z `./icons`. Do `TocPagesProps`:

```ts
  /** Otevře formulář nového vlastního receptu (pilulka v řádku „Moje“ na první stránce). */
  onNewRecipe?: () => void
```

`FilterPanel` přijme `onNewRecipe` (`Pick<TocPagesProps, 'recipes' | 'filter' | 'onFilterChange' | 'onNewRecipe'>`). Knihy filtru:

```tsx
  // „Vlastní“ jen když nějaký vlastní recept existuje (pilulka bez receptů by vždy vrátila „Nic nenalezeno“)
  const books: Book[] = recipes.some(isCustomRecipe) ? [...FILTER_BOOKS, 'vlastni'] : FILTER_BOOKS
```

Ve fieldsetu „Zdroj“ mapovat `books` místo `FILTER_BOOKS`. Ve fieldsetu „Moje“ za pilulku „Jen uvařené“:

```tsx
        {onNewRecipe && (
          <button type="button" className="toc-pill toc-pill--new" onClick={onNewRecipe}>
            <span aria-hidden="true">+ </span>Nový recept
          </button>
        )}
```

`TocPages` předá `onNewRecipe={onNewRecipe}` do `FilterPanel`. V řádku receptu za `<span className="toc-row-title">…</span>`:

```tsx
                {isCustomRecipe(row.recipe) && (
                  <span className="toc-row-own" title="Vlastní recept">
                    <PenIcon />
                    <span className="visually-hidden"> (vlastní)</span>
                  </span>
                )}
```

`src/styles/custom.css` – připsat:

```css
.toc-row-own { flex: none; display: inline-flex; align-self: center; color: #3b5b9a; }
.toc-row-own svg { width: 0.95em; height: 0.95em; }
.toc-pill--new { border-style: dashed; font-family: var(--font-hand); font-size: 1.15em; line-height: 1.2; }
```

- [ ] **Step 4: Spustit testy – musí projít**

Run: `npx vitest run src/content/search.test.ts src/pages/TocPages.test.tsx`
Expected: PASS, včetně původního „stránky obsahu nepřekročí kapacitu“.

- [ ] **Step 5: Ověřit celek a commit**

Run: `npm test && npm run build && npm run lint`
Expected: vše zelené.

```bash
git add src/content/search.ts src/content/search.test.ts src/pages/icons.tsx src/pages/TocPages.tsx src/pages/TocPages.test.tsx src/styles/custom.css
git commit -m "feat(vlastní recepty): značka v obsahu, filtr „Vlastní“ a tlačítko Nový recept"
```

---

### Task 6: Rozepsaný recept a validace zod s českými hláškami

**Files:**
- Create: `src/custom/draft.ts`
- Test: `src/custom/draft.test.ts`

**Interfaces:**
- Consumes: `deriveAllergens` (Task 1), `RecipeSchema`, `CUSTOM_SERVINGS_MAX`, `CHAPTERS`, `EQUIPMENT`, `UNITS` (schema), `UNIT_LABEL` (`src/pages/labels.ts`).
- Produces:
```ts
export const FORM_TAGS: readonly ['levne', 'tabor', 'kotlik', 'pripravit-predem']
export const TITLE_MAX = 80
export const TIME_MAX_MINUTES = 1440
export interface DraftLine { key: string; ingredientId: string | null; query: string; amount: string; unit: Unit; note: string }
export interface RecipeDraft { title: string; chapter: Chapter; baseServings: string; timeMinutes: string; difficulty: 1 | 2 | 3; tags: Tag[]; equipment: Equipment[]; lines: DraftLine[]; steps: string; note: string }
export type DraftErrors = Record<string, string>
export type DraftResult = { ok: true; recipe: Recipe } | { ok: false; errors: DraftErrors }
export function newLine(): DraftLine
export function lineErrorKey(key: string, field: 'ingredientId' | 'amount' | 'unit'): string
export function emptyDraft(chapter?: Chapter): RecipeDraft
export function draftFromRecipe(recipe: Recipe, ingredients: ReadonlyMap<string, Ingredient>): RecipeDraft
export function parseDecimal(text: string): number
export function parseSteps(text: string): string[]
export function draftToRecipe(draft: RecipeDraft, ctx: { id: string; ingredients: ReadonlyMap<string, Ingredient> }): DraftResult
```

- [ ] **Step 1: Napsat failing testy**

```ts
// src/custom/draft.test.ts
import { loadContent } from '@/content/loadContent'
import { customRecipe } from '@/test/customRecipe'
import { draftFromRecipe, draftToRecipe, emptyDraft, lineErrorKey, newLine, parseDecimal, parseSteps, type RecipeDraft } from './draft'

const { ingredients } = loadContent()
const ctx = { id: 'vlastni-test-0000', ingredients }

function filled(over: Partial<RecipeDraft> = {}): RecipeDraft {
  return {
    ...emptyDraft('snidane-a-pecivo'),
    title: '  Vaječná omeleta ',
    baseServings: '2',
    timeMinutes: '15',
    lines: [
      { ...newLine(), ingredientId: 'vejce', query: 'Vejce', amount: '3', unit: 'ks', note: ' rozšlehaná ' },
      { ...newLine(), ingredientId: 'sul', query: 'Sůl', amount: '', unit: 'spetka', note: '' },
      newLine(),
    ],
    steps: '1. Rozšlehej vejce.\n\n2) Osmaž na pánvi.\n',
    ...over,
  }
}

describe('parseDecimal', () => {
  test.each([['250', 250], ['1,5', 1.5], [' 1.5 ', 1.5], ['1/2', 0.5], ['1 000', 1000]])('%j → %d', (text, n) => expect(parseDecimal(text)).toBe(n))
  test.each(['', 'abc', '1,5,2', '-3', '1/0'])('%j → NaN', (text) => expect(parseDecimal(text)).toBeNaN())
})

test('parseSteps: řádek = krok, bez prázdných řádků a ručního číslování', () => {
  expect(parseSteps('1. Rozšlehej vejce.\n\n2) Osmaž.\r\n  Podávej  \n')).toEqual(['Rozšlehej vejce.', 'Osmaž.', 'Podávej'])
  expect(parseSteps('1.5 l vody přiveď k varu.')).toEqual(['1.5 l vody přiveď k varu.'])
})

test('emptyDraft: 4 porce, tři prázdné řádky s jedinečnými klíči', () => {
  const d = emptyDraft()
  expect(d.chapter).toBe('z-jednoho-hrnce')
  expect(d.baseServings).toBe('4')
  expect(new Set(d.lines.map((l) => l.key)).size).toBe(3)
})

test('platný draft → recept (trim, špetka = 1, prázdné řádky pryč, alergeny ze surovin)', () => {
  expect(draftToRecipe(filled(), ctx)).toEqual({
    ok: true,
    recipe: {
      id: 'vlastni-test-0000',
      title: 'Vaječná omeleta',
      chapter: 'snidane-a-pecivo',
      baseServings: 2,
      timeMinutes: 15,
      difficulty: 1,
      tags: [],
      equipment: [],
      allergens: ['vejce'],
      ingredients: [
        { ingredientId: 'vejce', amount: 3, unit: 'ks', note: 'rozšlehaná' },
        { ingredientId: 'sul', amount: 1, unit: 'spetka' },
      ],
      steps: ['Rozšlehej vejce.', 'Osmaž na pánvi.'],
      source: { book: 'vlastni' },
      verified: true,
    },
  })
})

test('štítky, vybavení a poznámka', () => {
  const r = draftToRecipe(filled({ tags: ['tabor', 'levne'], equipment: ['plotna'], note: ' Na kotlíku taky. ' }), ctx)
  if (!r.ok) throw new Error('mělo projít')
  expect(r.recipe.tags).toEqual(['levne', 'tabor'])
  expect(r.recipe.equipment).toEqual(['plotna'])
  expect(r.recipe.modernNote).toBe('Na kotlíku taky.')
})

test('prázdný formulář: české hlášky u názvu, času, surovin a postupu', () => {
  const r = draftToRecipe(emptyDraft(), ctx)
  if (r.ok) throw new Error('mělo selhat')
  expect(r.errors).toEqual({
    title: 'Napiš název receptu',
    timeMinutes: 'Zadej čas v minutách',
    lines: 'Přidej aspoň jednu surovinu',
    steps: 'Napiš aspoň jeden krok postupu',
  })
})

test('chyby řádku surovin mají klíč řádku', () => {
  const d = filled()
  const [vejce, sul] = d.lines
  const r = draftToRecipe({ ...d, lines: [{ ...vejce, ingredientId: null, query: 'vajíčk' }, { ...sul, unit: 'g', amount: '0' }] }, ctx)
  if (r.ok) throw new Error('mělo selhat')
  expect(r.errors[lineErrorKey(vejce.key, 'ingredientId')]).toBe('Vyber surovinu z nabídky')
  expect(r.errors[lineErrorKey(sul.key, 'amount')]).toBe('Množství musí být větší než nula')
})

test('množství, které není číslo', () => {
  const d = filled()
  const r = draftToRecipe({ ...d, lines: [{ ...d.lines[0], amount: 'hrst' }] }, ctx)
  expect(r.ok ? null : r.errors[lineErrorKey(d.lines[0].key, 'amount')]).toBe('Zadej množství číslem (např. 250 nebo 1,5)')
})

test('jednotka bez převodu na gramy (hladká mouka v ks) neprojde', () => {
  const line = { ...newLine(), ingredientId: 'hladka-mouka', query: 'Hladká mouka', amount: '2', unit: 'ks' as const }
  const r = draftToRecipe(filled({ lines: [line] }), ctx)
  expect(r.ok ? null : r.errors[lineErrorKey(line.key, 'unit')]).toBe('Hladká mouka: pro jednotku „ks“ chybí převod na gramy – zvol g nebo ml')
})

test.each([
  ['baseServings', '0', 'Aspoň 1 porce'],
  ['baseServings', '2,5', 'Počet porcí musí být celé číslo'],
  ['baseServings', '51', 'Nejvýš 50 porcí'],
  ['timeMinutes', 'hodinu', 'Zadej čas v minutách'],
  ['timeMinutes', '2000', 'Nejvýš 1440 minut (24 hodin)'],
] as const)('%s = %j → %s', (field, value, message) => {
  const r = draftToRecipe(filled(field === 'baseServings' ? { baseServings: value } : { timeMinutes: value }), ctx)
  expect(r.ok ? null : r.errors[field]).toBe(message)
})

test('úprava: draftFromRecipe → draftToRecipe vrátí tentýž recept', () => {
  const own = customRecipe({ modernNote: 'Podávej s povidly.', tags: ['levne'] })
  const draft = draftFromRecipe(own, ingredients)
  expect(draft.lines.map((l) => l.query)).toEqual(['Hladká mouka', 'Vejce', 'Sůl'])
  expect(draft.steps).toBe(own.steps.join('\n'))
  expect(draft.baseServings).toBe('2')
  expect(draftToRecipe(draft, { id: own.id, ingredients })).toEqual({ ok: true, recipe: own })
})
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/custom/draft.test.ts`
Expected: FAIL – `Failed to resolve import "./draft"`.

- [ ] **Step 3: Implementace**

```ts
// src/custom/draft.ts
import { z } from 'zod'
import { deriveAllergens } from '@/content/customRecipes'
import { CHAPTERS, CUSTOM_SERVINGS_MAX, EQUIPMENT, RecipeSchema, UNITS } from '@/domain/schema'
import type { Chapter, Equipment, Ingredient, IngredientLine, Recipe, Tag, Unit } from '@/domain/types'
import { UNIT_LABEL } from '@/pages/labels'

/** Ruční štítky formuláře: `rychle` se odvozuje z času, `bez-masa` a `sladke` nahrazují kapitoly (spec §5.1 [R1]). */
export const FORM_TAGS = ['levne', 'tabor', 'kotlik', 'pripravit-predem'] as const satisfies readonly Tag[]
export const TITLE_MAX = 80
export const TIME_MAX_MINUTES = 1440
/** Nový formulář začíná třemi prázdnými řádky surovin; prázdné řádky se při uložení vynechají. */
const EMPTY_LINES = 3

export interface DraftLine {
  /** Stabilní klíč řádku (React key a klíč chyby). */
  key: string
  /** Vybraná surovina z kanonického seznamu; null = text bez výběru z nabídky. */
  ingredientId: string | null
  /** Text v poli suroviny (po výběru název suroviny). */
  query: string
  amount: string
  unit: Unit
  note: string
}

export interface RecipeDraft {
  title: string
  chapter: Chapter
  baseServings: string
  timeMinutes: string
  difficulty: 1 | 2 | 3
  tags: Tag[]
  equipment: Equipment[]
  lines: DraftLine[]
  /** Postup: každý neprázdný řádek je jeden krok. */
  steps: string
  /** Volitelná poznámka (`modernNote`). */
  note: string
}

/** Chyby podle pole: `title`, `baseServings`, `timeMinutes`, `lines`, `steps` a `lineErrorKey(klíč, pole)`. */
export type DraftErrors = Record<string, string>
export type DraftResult = { ok: true; recipe: Recipe } | { ok: false; errors: DraftErrors }

let lineSeq = 0
export function newLine(): DraftLine {
  lineSeq += 1
  return { key: `l${lineSeq}`, ingredientId: null, query: '', amount: '', unit: 'g', note: '' }
}

export function lineErrorKey(key: string, field: 'ingredientId' | 'amount' | 'unit'): string {
  return `line:${key}:${field}`
}

export function emptyDraft(chapter: Chapter = 'z-jednoho-hrnce'): RecipeDraft {
  return {
    title: '',
    chapter,
    baseServings: '4',
    timeMinutes: '',
    difficulty: 1,
    tags: [],
    equipment: [],
    lines: Array.from({ length: EMPTY_LINES }, newLine),
    steps: '',
    note: '',
  }
}

export function draftFromRecipe(recipe: Recipe, ingredients: ReadonlyMap<string, Ingredient>): RecipeDraft {
  return {
    title: recipe.title,
    chapter: recipe.chapter,
    baseServings: String(recipe.baseServings),
    timeMinutes: String(recipe.timeMinutes),
    difficulty: recipe.difficulty,
    tags: recipe.tags.filter((t) => (FORM_TAGS as readonly Tag[]).includes(t)),
    equipment: [...recipe.equipment],
    lines: recipe.ingredients.map((l) => ({
      ...newLine(),
      ingredientId: l.ingredientId,
      query: ingredients.get(l.ingredientId)?.name ?? l.ingredientId,
      amount: String(l.amount).replace('.', ','),
      unit: l.unit,
      note: l.note ?? '',
    })),
    steps: recipe.steps.join('\n'),
    note: recipe.modernNote ?? '',
  }
}

/** „250“, „1,5“, „1.5“, „1/2“, „1 000“ → číslo; prázdné, záporné nebo nesmysl → NaN (ruling R6). */
export function parseDecimal(text: string): number {
  const t = text.replace(/\s+/g, '').replace(',', '.')
  const fraction = /^(\d+)\/(\d+)$/.exec(t)
  if (fraction) return Number(fraction[2]) === 0 ? Number.NaN : Number(fraction[1]) / Number(fraction[2])
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : Number.NaN
}

/** Postup z textového pole: řádek = krok; prázdné řádky a ruční číslování („1. “, „2) “) pryč. */
export function parseSteps(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim().replace(/^\d+[.)]\s+/, '').trim())
    .filter((s) => s !== '')
}

type ConvertedUnit = keyof Ingredient['units']
const CONVERTED_UNITS: readonly Unit[] = ['ks', 'lzice', 'lzicka', 'hrnek']
const needsConversion = (u: Unit): u is ConvertedUnit => CONVERTED_UNITS.includes(u)

const isBlankLine = (l: DraftLine) => l.query.trim() === '' && l.amount.trim() === '' && l.note.trim() === ''

function draftSchema(ingredients: ReadonlyMap<string, Ingredient>) {
  const line = z
    .object({
      ingredientId: z.string('Vyber surovinu z nabídky'),
      amount: z.number('Zadej množství číslem (např. 250 nebo 1,5)').positive('Množství musí být větší než nula'),
      unit: z.enum(UNITS),
      note: z.string(),
    })
    .superRefine((l, ctx) => {
      const ing = ingredients.get(l.ingredientId)
      if (!ing) {
        ctx.addIssue({ code: 'custom', path: ['ingredientId'], message: 'Vyber surovinu z nabídky' })
        return
      }
      // bez převodu na gramy by nutrice počítala 0 a nákupní seznam odhadoval objem (ruling R6)
      if (needsConversion(l.unit) && ing.units[l.unit] === undefined) {
        ctx.addIssue({ code: 'custom', path: ['unit'], message: `${ing.name}: pro jednotku „${UNIT_LABEL[l.unit]}“ chybí převod na gramy – zvol g nebo ml` })
      }
    })
  return z.object({
    title: z.string().trim().min(1, 'Napiš název receptu').max(TITLE_MAX, `Název je moc dlouhý (nejvýš ${TITLE_MAX} znaků)`),
    chapter: z.enum(CHAPTERS),
    baseServings: z
      .number('Zadej počet porcí číslem')
      .int('Počet porcí musí být celé číslo')
      .min(1, 'Aspoň 1 porce')
      .max(CUSTOM_SERVINGS_MAX, `Nejvýš ${CUSTOM_SERVINGS_MAX} porcí`),
    timeMinutes: z
      .number('Zadej čas v minutách')
      .int('Čas zadej v celých minutách')
      .min(1, 'Čas musí být aspoň 1 minuta')
      .max(TIME_MAX_MINUTES, `Nejvýš ${TIME_MAX_MINUTES} minut (24 hodin)`),
    lines: z.array(line).min(1, 'Přidej aspoň jednu surovinu'),
    steps: z.array(z.string()).min(1, 'Napiš aspoň jeden krok postupu'),
  })
}

/** Rozepsaný recept → platný `Recipe` (vlastní, `verified: true`, alergeny ze surovin), nebo chyby podle polí. */
export function draftToRecipe(draft: RecipeDraft, ctx: { id: string; ingredients: ReadonlyMap<string, Ingredient> }): DraftResult {
  const kept = draft.lines.filter((l) => !isBlankLine(l))
  const parsed = draftSchema(ctx.ingredients).safeParse({
    title: draft.title,
    chapter: draft.chapter,
    baseServings: parseDecimal(draft.baseServings),
    timeMinutes: parseDecimal(draft.timeMinutes),
    lines: kept.map((l) => ({ ingredientId: l.ingredientId, amount: l.unit === 'spetka' ? 1 : parseDecimal(l.amount), unit: l.unit, note: l.note.trim() })),
    steps: parseSteps(draft.steps),
  })
  if (!parsed.success) {
    const errors: DraftErrors = {}
    for (const issue of parsed.error.issues) {
      const [head, index, field] = issue.path
      const key =
        head === 'lines' && typeof index === 'number'
          ? lineErrorKey(kept[index].key, field as 'ingredientId' | 'amount' | 'unit')
          : String(head)
      errors[key] ??= issue.message
    }
    return { ok: false, errors }
  }
  const v = parsed.data
  const lines: IngredientLine[] = v.lines.map((l) => ({ ingredientId: l.ingredientId, amount: l.amount, unit: l.unit, ...(l.note ? { note: l.note } : {}) }))
  const note = draft.note.trim()
  const recipe = RecipeSchema.parse({
    id: ctx.id,
    title: v.title,
    chapter: v.chapter,
    baseServings: v.baseServings,
    timeMinutes: v.timeMinutes,
    difficulty: draft.difficulty,
    tags: FORM_TAGS.filter((t) => draft.tags.includes(t)),
    equipment: EQUIPMENT.filter((e) => draft.equipment.includes(e)),
    allergens: deriveAllergens(lines, ctx.ingredients),
    ingredients: lines,
    steps: v.steps,
    ...(note ? { modernNote: note } : {}),
    source: { book: 'vlastni' },
    verified: true,
  })
  return { ok: true, recipe }
}
```

- [ ] **Step 4: Spustit testy – musí projít**

Run: `npx vitest run src/custom/draft.test.ts`
Expected: PASS.

- [ ] **Step 5: Ověřit celek a commit**

Run: `npm test && npm run build && npm run lint`
Expected: vše zelené.

```bash
git add src/custom/draft.ts src/custom/draft.test.ts
git commit -m "feat(vlastní recepty): rozepsaný recept a validace zod s českými hláškami"
```

---

### Task 7: Našeptávač surovin

**Files:**
- Create: `src/custom/ingredientSuggest.ts`, `src/custom/IngredientPicker.tsx`
- Test: `src/custom/ingredientSuggest.test.ts`, `src/custom/IngredientPicker.test.tsx`

**Interfaces:**
- Consumes: `normalize` (`src/content/search.ts`).
- Produces:
```ts
export const SUGGEST_LIMIT = 8
export function suggestIngredients(query: string, ingredients: Iterable<Ingredient>, limit?: number): Ingredient[]
export function exactIngredient(query: string, ingredients: Iterable<Ingredient>): Ingredient | undefined
// IngredientPicker props
{ id: string; label: string; ingredients: readonly Ingredient[]; query: string; selectedId: string | null; invalid?: boolean; describedBy?: string; onChange: (query: string, ingredientId: string | null) => void }
```

- [ ] **Step 1: Napsat failing testy**

```ts
// src/custom/ingredientSuggest.test.ts
import { loadContent } from '@/content/loadContent'
import { SUGGEST_LIMIT, exactIngredient, suggestIngredients } from './ingredientSuggest'

const all = [...loadContent().ingredients.values()]

test('bez diakritiky: „vajicko“ najde Vejce přes alias', () => expect(suggestIngredients('vajicko', all)[0].id).toBe('vejce'))
test('přesný název první: „vejce“ → Vejce před Vejce mražená', () =>
  expect(suggestIngredients('vejce', all).map((i) => i.id).slice(0, 2)).toEqual(['vejce', 'vejce-mrazena']))
test('přesný alias „mouka“ (Hladká mouka) před ostatními moukami, ty pak abecedně', () =>
  expect(suggestIngredients('mouka', all).map((i) => i.id).slice(0, 3)).toEqual(['hladka-mouka', 'celozrnna-mouka', 'hruba-mouka']))
test('nejvýš 8 návrhů, prázdný dotaz nic', () => {
  expect(suggestIngredients('a', all)).toHaveLength(SUGGEST_LIMIT)
  expect(suggestIngredients('  ', all)).toEqual([])
})
test('exactIngredient: přesný název, pak alias', () => {
  expect(exactIngredient('Sůl', all)?.id).toBe('sul')
  expect(exactIngredient('psenicna mouka', all)?.id).toBe('hladka-mouka')
  expect(exactIngredient('vejc', all)).toBeUndefined()
})
```

```tsx
// src/custom/IngredientPicker.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { loadContent } from '@/content/loadContent'
import { IngredientPicker } from './IngredientPicker'

const all = [...loadContent().ingredients.values()]

function Harness() {
  const [value, setValue] = useState<{ query: string; id: string | null }>({ query: '', id: null })
  return (
    <>
      <IngredientPicker id="p1" label="Surovina 1" ingredients={all} query={value.query} selectedId={value.id} onChange={(query, id) => setValue({ query, id })} />
      <output data-testid="selected">{value.id ?? '–'}</output>
      <button type="button">jinam</button>
    </>
  )
}

test('psaní ukáže návrhy, šipka a Enter vyberou surovinu', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  const input = screen.getByRole('combobox', { name: 'Surovina 1' })
  await user.type(input, 'mouka')
  expect(input).toHaveAttribute('aria-expanded', 'true')
  const options = screen.getAllByRole('option')
  expect(options[0]).toHaveTextContent('Hladká mouka')
  expect(options[0]).toHaveAttribute('aria-selected', 'true')
  expect(input).toHaveAttribute('aria-activedescendant', options[0].id)
  await user.keyboard('{ArrowDown}{Enter}')
  expect(screen.getByTestId('selected')).toHaveTextContent('celozrnna-mouka')
  expect(input).toHaveValue('Celozrnná pšeničná mouka')
  expect(screen.queryByRole('listbox')).toBeNull()
})

test('klik na návrh vybere surovinu', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  await user.type(screen.getByRole('combobox', { name: 'Surovina 1' }), 'vajic')
  await user.click(screen.getByRole('option', { name: 'Vejce' }))
  expect(screen.getByTestId('selected')).toHaveTextContent('vejce')
})

test('přepsání textu výběr zruší', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  const input = screen.getByRole('combobox', { name: 'Surovina 1' })
  await user.type(input, 'vajic{Enter}')
  expect(screen.getByTestId('selected')).toHaveTextContent('vejce')
  await user.type(input, 'x')
  expect(screen.getByTestId('selected')).toHaveTextContent('–')
})

test('opuštění pole s přesným názvem vybere surovinu samo', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  await user.type(screen.getByRole('combobox', { name: 'Surovina 1' }), 'sůl')
  await user.click(screen.getByRole('button', { name: 'jinam' }))
  expect(screen.getByTestId('selected')).toHaveTextContent('sul')
})

test('Escape zavře jen návrhy a nepropadne do dialogu', async () => {
  const user = userEvent.setup()
  const onOuterEscape = vi.fn()
  render(
    <div onKeyDown={(e) => { if (e.key === 'Escape') onOuterEscape() }}>
      <Harness />
    </div>,
  )
  await user.type(screen.getByRole('combobox', { name: 'Surovina 1' }), 'vajic')
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('listbox')).toBeNull()
  expect(onOuterEscape).not.toHaveBeenCalled()
  await user.keyboard('{Escape}')
  expect(onOuterEscape).toHaveBeenCalledOnce()
})

test('Enter s otevřenými návrhy neodešle formulář', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
  render(<form onSubmit={onSubmit}><Harness /></form>)
  await user.type(screen.getByRole('combobox', { name: 'Surovina 1' }), 'vajic{Enter}')
  expect(onSubmit).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/custom/ingredientSuggest.test.ts src/custom/IngredientPicker.test.tsx`
Expected: FAIL – moduly neexistují.

- [ ] **Step 3: Implementace**

```ts
// src/custom/ingredientSuggest.ts
import { normalize } from '@/content/search'
import type { Ingredient } from '@/domain/types'

export const SUGGEST_LIMIT = 8

/**
 * Pořadí shody (menší = lepší, -1 = žádná): přesný název nebo alias, začátek názvu, začátek aliasu,
 * začátek slova v názvu, kdekoli v názvu, kdekoli v aliasu.
 */
function matchRank(ing: Ingredient, q: string): number {
  const name = normalize(ing.name)
  const aliases = ing.aliases.map(normalize)
  if (name === q || aliases.includes(q)) return 0
  if (name.startsWith(q)) return 1
  if (aliases.some((a) => a.startsWith(q))) return 2
  if (name.split(/[\s-]+/).some((w) => w.startsWith(q))) return 3
  if (name.includes(q)) return 4
  if (aliases.some((a) => a.includes(q))) return 5
  return -1
}

/** Návrhy surovin pro našeptávač podle názvu a aliasů, bez ohledu na diakritiku a velikost písmen. */
export function suggestIngredients(query: string, ingredients: Iterable<Ingredient>, limit = SUGGEST_LIMIT): Ingredient[] {
  const q = normalize(query.trim())
  if (q === '') return []
  const hits: { ing: Ingredient; rank: number }[] = []
  for (const ing of ingredients) {
    const rank = matchRank(ing, q)
    if (rank >= 0) hits.push({ ing, rank })
  }
  hits.sort((a, b) => a.rank - b.rank || a.ing.name.localeCompare(b.ing.name, 'cs'))
  return hits.slice(0, limit).map((h) => h.ing)
}

/** Surovina, jejíž název (přednostně) nebo alias přesně odpovídá textu – výběr bez kliknutí do nabídky. */
export function exactIngredient(query: string, ingredients: Iterable<Ingredient>): Ingredient | undefined {
  const q = normalize(query.trim())
  if (q === '') return undefined
  const list = [...ingredients]
  return list.find((i) => normalize(i.name) === q) ?? list.find((i) => i.aliases.some((a) => normalize(a) === q))
}
```

```tsx
// src/custom/IngredientPicker.tsx
import { useMemo, useState } from 'react'
import type { Ingredient } from '@/domain/types'
import { exactIngredient, suggestIngredients } from './ingredientSuggest'

interface Props {
  id: string
  label: string
  ingredients: readonly Ingredient[]
  query: string
  /** Vybraná surovina; null = text bez výběru z nabídky. */
  selectedId: string | null
  invalid?: boolean
  describedBy?: string
  /** Nový text a vybraná surovina (null = text bez výběru). */
  onChange: (query: string, ingredientId: string | null) => void
}

/** Pole suroviny s našeptávačem (ARIA combobox + listbox): jen suroviny z kanonického seznamu. */
export function IngredientPicker({ id, label, ingredients, query, selectedId, invalid = false, describedBy, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const suggestions = useMemo(() => (open ? suggestIngredients(query, ingredients) : []), [open, query, ingredients])
  const shown = suggestions.length > 0
  const listId = `${id}-navrhy`
  const activeIndex = Math.min(active, suggestions.length - 1)

  const choose = (ing: Ingredient) => {
    onChange(ing.name, ing.id)
    setOpen(false)
  }

  return (
    <div className="ingredient-picker">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={shown}
        aria-controls={listId}
        aria-activedescendant={shown ? `${listId}-${activeIndex}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        placeholder="surovina"
        value={query}
        onChange={(e) => {
          onChange(e.currentTarget.value, null)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false)
          if (selectedId !== null) return
          const exact = exactIngredient(query, ingredients)
          if (exact) onChange(exact.name, exact.id)
        }}
        onKeyDown={(e) => {
          if (!shown) return
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            const step = e.key === 'ArrowDown' ? 1 : -1
            setActive((a) => (Math.min(a, suggestions.length - 1) + step + suggestions.length) % suggestions.length)
          } else if (e.key === 'Enter') {
            e.preventDefault() // výběr suroviny, ne odeslání formuláře
            choose(suggestions[activeIndex])
          } else if (e.key === 'Escape') {
            e.stopPropagation() // zavře jen návrhy; formulář se zavírá až dalším Escape
            setOpen(false)
          }
        }}
      />
      {shown && (
        <ul id={listId} role="listbox" aria-label={`Návrhy: ${label}`} className="ingredient-picker__list">
          {suggestions.map((ing, i) => (
            <li
              key={ing.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className="ingredient-picker__option"
              onMouseDown={(e) => e.preventDefault()} // fokus zůstane v poli (žádný blur před klikem)
              onClick={() => choose(ing)}
            >
              {ing.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Spustit testy – musí projít**

Run: `npx vitest run src/custom/ingredientSuggest.test.ts src/custom/IngredientPicker.test.tsx`
Expected: PASS.

- [ ] **Step 5: Ověřit celek a commit**

Run: `npm test && npm run build && npm run lint`
Expected: vše zelené.

```bash
git add src/custom/ingredientSuggest.ts src/custom/ingredientSuggest.test.ts src/custom/IngredientPicker.tsx src/custom/IngredientPicker.test.tsx
git commit -m "feat(vlastní recepty): našeptávač surovin z kanonického seznamu"
```

---

### Task 8: Formulář vlastního receptu jako ručně psaný list

**Files:**
- Create: `src/custom/RecipeForm.tsx`
- Modify: `src/styles/custom.css`
- Test: `src/custom/RecipeForm.test.tsx`, `src/styles/custom.test.ts` (nový)

**Interfaces:**
- Consumes: `draft.ts` (Task 6), `IngredientPicker` (Task 7), `CHAPTER_META`, `DIFFICULTY_LABEL`, `EQUIPMENT_LABEL`, `TAG_LABEL`, `UNIT_LABEL`.
- Produces:
```tsx
export function RecipeForm(props: {
  ingredients: Map<string, Ingredient>
  recipe?: Recipe            // úprava; bez něj nový
  defaultChapter?: Chapter   // předvyplněná kapitola nového receptu (ruling R14)
  makeId: (title: string) => string
  onSave: (recipe: Recipe) => void
  onCancel: () => void
}): JSX.Element
// přístupná jména polí: „Název“, „Kapitola“, „Pro kolik porcí je recept napsaný“, „Čas (minuty)“,
// „Surovina N“, „Množství N“, „Jednotka N“, „Poznámka N“, „Odebrat surovinu N“, „+ Přidat surovinu“,
// „Postup (každý krok na nový řádek)“, „Poznámka (nepovinná)“, „Uložit recept“, „Zrušit“
```

- [ ] **Step 1: Napsat failing testy**

```tsx
// src/custom/RecipeForm.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loadContent } from '@/content/loadContent'
import { customRecipe } from '@/test/customRecipe'
import { RecipeForm } from './RecipeForm'

const { ingredients } = loadContent()

function setup(over: Partial<React.ComponentProps<typeof RecipeForm>> = {}) {
  const props = { ingredients, makeId: vi.fn(() => 'vlastni-test-0000'), onSave: vi.fn(), onCancel: vi.fn(), ...over }
  render(<RecipeForm {...props} />)
  return { props, user: userEvent.setup() }
}

beforeEach(() => {
  window.confirm = vi.fn(() => true)
})

test('nový recept: dialog s nadpisem, fokus v poli Název, předvyplněná kapitola', () => {
  setup({ defaultChapter: 'polevky' })
  expect(screen.getByRole('dialog', { name: 'Nový recept' })).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Název' })).toHaveFocus()
  expect(screen.getByRole('combobox', { name: 'Kapitola' })).toHaveValue('polevky')
  expect(screen.getByRole('textbox', { name: 'Pro kolik porcí je recept napsaný' })).toHaveValue('4')
})

test('vyplnění a uložení vytvoří vlastní recept', async () => {
  const { props, user } = setup({ defaultChapter: 'snidane-a-pecivo' })
  await user.type(screen.getByRole('textbox', { name: 'Název' }), 'Vaječná omeleta')
  const servings = screen.getByRole('textbox', { name: 'Pro kolik porcí je recept napsaný' })
  await user.clear(servings)
  await user.type(servings, '2')
  await user.type(screen.getByRole('textbox', { name: 'Čas (minuty)' }), '15')
  await user.type(screen.getByRole('combobox', { name: 'Surovina 1' }), 'vejce{Enter}')
  await user.type(screen.getByRole('textbox', { name: 'Množství 1' }), '3')
  await user.selectOptions(screen.getByRole('combobox', { name: 'Jednotka 1' }), 'ks')
  await user.type(screen.getByRole('textbox', { name: 'Postup (každý krok na nový řádek)' }), 'Rozšlehej vejce.{Enter}Osmaž na pánvi.')
  await user.click(screen.getByRole('checkbox', { name: 'levné' }))
  await user.click(screen.getByRole('button', { name: 'Uložit recept' }))
  expect(props.makeId).toHaveBeenCalledWith('Vaječná omeleta')
  expect(props.onSave).toHaveBeenCalledWith({
    id: 'vlastni-test-0000',
    title: 'Vaječná omeleta',
    chapter: 'snidane-a-pecivo',
    baseServings: 2,
    timeMinutes: 15,
    difficulty: 1,
    tags: ['levne'],
    equipment: [],
    allergens: ['vejce'],
    ingredients: [{ ingredientId: 'vejce', amount: 3, unit: 'ks' }],
    steps: ['Rozšlehej vejce.', 'Osmaž na pánvi.'],
    source: { book: 'vlastni' },
    verified: true,
  })
})

test('neplatný formulář: souhrn, hlášky u polí a fokus na první chybné pole', async () => {
  const { props, user } = setup()
  await user.click(screen.getByRole('button', { name: 'Uložit recept' }))
  expect(props.onSave).not.toHaveBeenCalled()
  expect(screen.getByRole('alert')).toHaveTextContent('Recept zatím nejde uložit – oprav označená pole.')
  const title = screen.getByRole('textbox', { name: 'Název' })
  expect(title).toHaveAttribute('aria-invalid', 'true')
  expect(title).toHaveAccessibleDescription('Napiš název receptu')
  expect(title).toHaveFocus()
  expect(screen.getByRole('combobox', { name: 'Surovina 1' })).toHaveAccessibleDescription('Přidej aspoň jednu surovinu')
  expect(screen.getByRole('textbox', { name: 'Postup (každý krok na nový řádek)' })).toHaveAccessibleDescription('Napiš aspoň jeden krok postupu')
})

test('jednotka bez převodu na gramy: hláška u jednotky řádku', async () => {
  const { user } = setup()
  await user.type(screen.getByRole('combobox', { name: 'Surovina 1' }), 'mouka{Enter}')
  await user.type(screen.getByRole('textbox', { name: 'Množství 1' }), '2')
  await user.selectOptions(screen.getByRole('combobox', { name: 'Jednotka 1' }), 'ks')
  await user.click(screen.getByRole('button', { name: 'Uložit recept' }))
  expect(screen.getByRole('combobox', { name: 'Jednotka 1' })).toHaveAccessibleDescription(
    'Hladká mouka: pro jednotku „ks“ chybí převod na gramy – zvol g nebo ml',
  )
})

test('špetka: množství je 1 a pole je zakázané', async () => {
  const { user } = setup()
  await user.selectOptions(screen.getByRole('combobox', { name: 'Jednotka 1' }), 'spetka')
  expect(screen.getByRole('textbox', { name: 'Množství 1' })).toBeDisabled()
  expect(screen.getByRole('textbox', { name: 'Množství 1' })).toHaveValue('1')
})

test('řádky surovin: přidat a odebrat', async () => {
  const { user } = setup()
  const lines = () => screen.getAllByRole('combobox', { name: /^Surovina \d+$/ })
  expect(lines()).toHaveLength(3)
  await user.click(screen.getByRole('button', { name: '+ Přidat surovinu' }))
  expect(lines()).toHaveLength(4)
  await user.click(screen.getByRole('button', { name: 'Odebrat surovinu 1' }))
  expect(lines()).toHaveLength(3)
})

test('úprava: předvyplněno, uložení vrátí recept se stejným id', async () => {
  const own = customRecipe()
  const { props, user } = setup({ recipe: own })
  expect(screen.getByRole('dialog', { name: 'Upravit recept' })).toBeInTheDocument()
  const title = screen.getByRole('textbox', { name: 'Název' })
  expect(title).toHaveValue('Babiččiny lívance')
  expect(screen.getByRole('combobox', { name: 'Surovina 1' })).toHaveValue('Hladká mouka')
  expect(screen.getByRole('textbox', { name: 'Množství 1' })).toHaveValue('125')
  expect(screen.getByRole('textbox', { name: 'Množství 3' })).toBeDisabled()
  await user.clear(title)
  await user.type(title, 'Lívance')
  await user.click(screen.getByRole('button', { name: 'Uložit recept' }))
  expect(props.makeId).not.toHaveBeenCalled()
  expect(props.onSave).toHaveBeenCalledWith({ ...own, title: 'Lívance' })
})

test('Escape bez změn zavře hned', async () => {
  const { props, user } = setup()
  await user.keyboard('{Escape}')
  expect(props.onCancel).toHaveBeenCalledOnce()
  expect(window.confirm).not.toHaveBeenCalled()
})

test('rozepsaný recept: Escape i Zrušit se zeptají, odmítnutí formulář nechá', async () => {
  const { props, user } = setup()
  vi.mocked(window.confirm).mockReturnValue(false)
  await user.type(screen.getByRole('textbox', { name: 'Název' }), 'Kaše')
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: 'Zrušit' }))
  expect(window.confirm).toHaveBeenCalledTimes(2)
  expect(window.confirm).toHaveBeenCalledWith('Zahodit rozepsaný recept?')
  expect(props.onCancel).not.toHaveBeenCalled()
  vi.mocked(window.confirm).mockReturnValue(true)
  await user.click(screen.getByRole('button', { name: 'Zrušit' }))
  expect(props.onCancel).toHaveBeenCalledOnce()
})
```

```ts
// src/styles/custom.test.ts
/// <reference types="node" />
import { readFileSync } from 'node:fs'

const css = readFileSync('src/styles/custom.css', 'utf8')
const body = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}

test('formulář je natočený ručně psaný list na linkovaném papíře', () => {
  const sheet = body('.recipe-form')
  expect(sheet).toMatch(/transform:\s*rotate\(-0\.6deg\)/)
  expect(sheet).toMatch(/font-family:\s*var\(--font-hand\)/)
  expect(sheet).toMatch(/repeating-linear-gradient/)
  expect(sheet).toMatch(/background-color:\s*var\(--note-paper\)/)
})

test('překryv formuláře scrolluje svisle, vodorovně ne (natočený list přesahuje)', () => {
  expect(body('.recipe-form-overlay')).toMatch(/overflow-y:\s*auto/)
  expect(body('.recipe-form-overlay')).toMatch(/overflow-x:\s*hidden/)
  expect(body('.recipe-form-overlay')).toMatch(/position:\s*fixed/)
})

test('písmo formuláře má aspoň 16 px (iOS při psaní nezoomuje)', () => {
  expect(body('.recipe-form')).toMatch(/font-size:\s*1\.25rem/)
})
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/custom/RecipeForm.test.tsx src/styles/custom.test.ts`
Expected: FAIL. `./RecipeForm` neexistuje a `custom.css` nemá blok `.recipe-form`.

- [ ] **Step 3: Implementace komponenty**

```tsx
// src/custom/RecipeForm.tsx
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { CHAPTER_META } from '@/content/chapters'
import { CHAPTERS, EQUIPMENT, UNITS } from '@/domain/schema'
import type { Chapter, Ingredient, Recipe, Unit } from '@/domain/types'
import { DIFFICULTY_LABEL, EQUIPMENT_LABEL, TAG_LABEL, UNIT_LABEL } from '@/pages/labels'
import { FORM_TAGS, TITLE_MAX, draftFromRecipe, draftToRecipe, emptyDraft, lineErrorKey, newLine, type DraftErrors, type DraftLine, type RecipeDraft } from './draft'
import { IngredientPicker } from './IngredientPicker'

interface Props {
  ingredients: Map<string, Ingredient>
  /** Upravovaný vlastní recept; bez něj se zakládá nový. */
  recipe?: Recipe
  /** Kapitola předvyplněná u nového receptu (stránka, ze které se formulář otevřel). */
  defaultChapter?: Chapter
  /** Id nového receptu z názvu (App zná obsazená id). */
  makeId: (title: string) => string
  onSave: (recipe: Recipe) => void
  onCancel: () => void
}

const LINE_FIELDS = ['ingredientId', 'amount', 'unit'] as const

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

/** Formulář vlastního receptu: dialog nad knihou, vypadá jako vložený ručně psaný list (spec §2, ruling R7). */
export function RecipeForm({ ingredients, recipe, defaultChapter, makeId, onSave, onCancel }: Props) {
  const [initial] = useState<RecipeDraft>(() => (recipe ? draftFromRecipe(recipe, ingredients) : emptyDraft(defaultChapter)))
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<DraftErrors>({})
  const formRef = useRef<HTMLFormElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const uid = useId()
  const fid = (name: string) => `${uid}-${name}`
  const errId = (key: string) => `${uid}-chyba-${key}`
  const errorRef = (key: string) => (errors[key] ? errId(key) : undefined)
  // funkce, ne komponenta: při překreslení se nic neodmontuje; `key` kvůli řádkovým chybám vykreslovaným přes map
  const errorText = (key: string) =>
    errors[key] ? (
      <p key={key} id={errId(key)} className="recipe-form__error">
        {errors[key]}
      </p>
    ) : null
  const list = useMemo(() => [...ingredients.values()], [ingredients])

  // fokus do názvu; po zavření zpět na prvek, který formulář otevřel
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    titleRef.current?.focus()
    return () => {
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  // po neúspěšném uložení fokus na první chybné pole
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [errors])

  const set = (patch: Partial<RecipeDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const setLine = (key: string, patch: Partial<DraftLine>) =>
    setDraft((d) => ({ ...d, lines: d.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) }))

  const cancel = () => {
    if (draft === initial || window.confirm('Zahodit rozepsaný recept?')) onCancel()
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const result = draftToRecipe(draft, { id: recipe?.id ?? makeId(draft.title.trim()), ingredients })
    if (result.ok) onSave(result.recipe)
    else setErrors(result.errors)
  }

  const invalid = (key: string) => (errors[key] ? true : undefined)

  return (
    <div
      className="recipe-form-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={fid('nadpis')}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return
        e.stopPropagation()
        cancel()
      }}
    >
      <form ref={formRef} className="recipe-form" noValidate onSubmit={submit}>
        <h2 id={fid('nadpis')} className="recipe-form__title">
          {recipe ? 'Upravit recept' : 'Nový recept'}
        </h2>
        {Object.keys(errors).length > 0 && (
          <p role="alert" className="recipe-form__error recipe-form__summary">
            Recept zatím nejde uložit – oprav označená pole.
          </p>
        )}

        <div className="recipe-form__field">
          <label htmlFor={fid('nazev')}>Název</label>
          <input
            ref={titleRef}
            id={fid('nazev')}
            type="text"
            maxLength={TITLE_MAX}
            value={draft.title}
            aria-invalid={invalid('title')}
            aria-describedby={errorRef('title')}
            onChange={(e) => set({ title: e.currentTarget.value })}
          />
          {errorText('title')}
        </div>

        <div className="recipe-form__row">
          <div className="recipe-form__field">
            <label htmlFor={fid('kapitola')}>Kapitola</label>
            <select id={fid('kapitola')} value={draft.chapter} onChange={(e) => set({ chapter: e.currentTarget.value as Chapter })}>
              {CHAPTERS.map((c) => (
                <option key={c} value={c}>
                  {CHAPTER_META[c].title}
                </option>
              ))}
            </select>
          </div>
          <div className="recipe-form__field">
            <label htmlFor={fid('porce')}>Pro kolik porcí je recept napsaný</label>
            <input
              id={fid('porce')}
              type="text"
              inputMode="numeric"
              value={draft.baseServings}
              aria-invalid={invalid('baseServings')}
              aria-describedby={errorRef('baseServings')}
              onChange={(e) => set({ baseServings: e.currentTarget.value })}
            />
            {errorText('baseServings')}
          </div>
          <div className="recipe-form__field">
            <label htmlFor={fid('cas')}>Čas (minuty)</label>
            <input
              id={fid('cas')}
              type="text"
              inputMode="numeric"
              value={draft.timeMinutes}
              aria-invalid={invalid('timeMinutes')}
              aria-describedby={errorRef('timeMinutes')}
              onChange={(e) => set({ timeMinutes: e.currentTarget.value })}
            />
            {errorText('timeMinutes')}
          </div>
        </div>

        <fieldset className="recipe-form__checks">
          <legend>Obtížnost</legend>
          {([1, 2, 3] as const).map((d) => (
            <label key={d}>
              <input type="radio" name={fid('obtiznost')} checked={draft.difficulty === d} onChange={() => set({ difficulty: d })} /> {DIFFICULTY_LABEL[d]}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Suroviny</legend>
          <ol className="recipe-form__lines">
            {draft.lines.map((line, i) => {
              const n = i + 1
              const key = (field: (typeof LINE_FIELDS)[number]) => lineErrorKey(line.key, field)
              // chyba „přidej aspoň jednu surovinu“ se váže k prvnímu řádku
              const listError = i === 0 && errors.lines !== undefined
              return (
                <li key={line.key} className="recipe-form__line">
                  <IngredientPicker
                    id={fid(`surovina-${line.key}`)}
                    label={`Surovina ${n}`}
                    ingredients={list}
                    query={line.query}
                    selectedId={line.ingredientId}
                    invalid={Boolean(errors[key('ingredientId')]) || listError}
                    describedBy={errorRef(key('ingredientId')) ?? (listError ? errId('lines') : undefined)}
                    onChange={(query, ingredientId) => setLine(line.key, { query, ingredientId })}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    className="recipe-form__amount"
                    aria-label={`Množství ${n}`}
                    placeholder="množství"
                    value={line.unit === 'spetka' ? '1' : line.amount}
                    disabled={line.unit === 'spetka'}
                    aria-invalid={invalid(key('amount'))}
                    aria-describedby={errorRef(key('amount'))}
                    onChange={(e) => setLine(line.key, { amount: e.currentTarget.value })}
                  />
                  <select
                    aria-label={`Jednotka ${n}`}
                    value={line.unit}
                    aria-invalid={invalid(key('unit'))}
                    aria-describedby={errorRef(key('unit'))}
                    onChange={(e) => setLine(line.key, { unit: e.currentTarget.value as Unit })}
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {UNIT_LABEL[u]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="recipe-form__remove"
                    aria-label={`Odebrat surovinu ${n}`}
                    onClick={() => set({ lines: draft.lines.filter((l) => l.key !== line.key) })}
                  >
                    ×
                  </button>
                  <input
                    type="text"
                    className="recipe-form__line-note"
                    aria-label={`Poznámka ${n}`}
                    placeholder="poznámka, např. nakrájená"
                    value={line.note}
                    onChange={(e) => setLine(line.key, { note: e.currentTarget.value })}
                  />
                  {LINE_FIELDS.map((f) => errorText(key(f)))}
                </li>
              )
            })}
          </ol>
          <button type="button" className="recipe-form__add" onClick={() => set({ lines: [...draft.lines, newLine()] })}>
            + Přidat surovinu
          </button>
          {errorText('lines')}
        </fieldset>

        <div className="recipe-form__field">
          <label htmlFor={fid('postup')}>Postup (každý krok na nový řádek)</label>
          <textarea
            id={fid('postup')}
            rows={6}
            value={draft.steps}
            aria-invalid={invalid('steps')}
            aria-describedby={errorRef('steps')}
            onChange={(e) => set({ steps: e.currentTarget.value })}
          />
          {errorText('steps')}
        </div>

        <fieldset className="recipe-form__checks">
          <legend>Štítky</legend>
          {FORM_TAGS.map((t) => (
            <label key={t}>
              <input type="checkbox" checked={draft.tags.includes(t)} onChange={() => set({ tags: toggle(draft.tags, t) })} /> {TAG_LABEL[t]}
            </label>
          ))}
        </fieldset>

        <fieldset className="recipe-form__checks">
          <legend>Vybavení</legend>
          {EQUIPMENT.map((eq) => (
            <label key={eq}>
              <input type="checkbox" checked={draft.equipment.includes(eq)} onChange={() => set({ equipment: toggle(draft.equipment, eq) })} /> {EQUIPMENT_LABEL[eq]}
            </label>
          ))}
        </fieldset>

        <div className="recipe-form__field">
          <label htmlFor={fid('poznamka')}>Poznámka (nepovinná)</label>
          <textarea id={fid('poznamka')} rows={3} value={draft.note} onChange={(e) => set({ note: e.currentTarget.value })} />
        </div>

        <div className="recipe-form__actions">
          <button type="button" className="recipe-form__cancel" onClick={cancel}>
            Zrušit
          </button>
          <button type="submit" className="recipe-form__save">
            Uložit recept
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Implementace CSS**

`src/styles/custom.css` – připsat:

```css
/* ===== formulář vlastního receptu: vložený ručně psaný list (spec §2, ruling R7) ===== */
.recipe-form-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1.5rem 1rem 3rem;
  background: rgba(30, 22, 16, 0.72);
}
.recipe-form {
  position: relative;
  max-width: 36rem;
  margin: 0 auto;
  padding: 1.2rem 1.2rem 1.4rem 2.6rem;
  color: var(--ink);
  font-family: var(--font-hand);
  font-size: 1.25rem;
  line-height: 28px;
  background-color: var(--note-paper);
  background-image:
    linear-gradient(to right, transparent 1.9rem, rgba(190, 70, 60, 0.45) 1.9rem 2rem, transparent 2rem),
    repeating-linear-gradient(to bottom, transparent 0 27px, rgba(90, 120, 180, 0.25) 27px 28px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
  transform: rotate(-0.6deg);
  transform-origin: 50% 0;
}
.recipe-form__title { margin: 0 0 0.3em; font-family: var(--font-hand); font-size: 2rem; }
.recipe-form__field { display: grid; margin-bottom: 0.4rem; min-width: 0; }
.recipe-form__row { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: 0 1rem; }
.recipe-form input,
.recipe-form select,
.recipe-form textarea {
  width: 100%; min-width: 0; padding: 0 0.2em; font: inherit; color: var(--ink);
  background: transparent; border: 0; border-bottom: 1px dashed var(--ink-soft); border-radius: 0;
}
.recipe-form textarea { line-height: 28px; border: 1px dashed var(--ink-soft); resize: vertical; }
.recipe-form input[type="checkbox"],
.recipe-form input[type="radio"] { width: auto; accent-color: #3b5b9a; }
.recipe-form input:disabled { opacity: 0.6; }
.recipe-form input:focus-visible,
.recipe-form select:focus-visible,
.recipe-form textarea:focus-visible,
.recipe-form button:focus-visible { outline: 2px solid #3b5b9a; outline-offset: 1px; }
.recipe-form [aria-invalid="true"] { border-color: #a3322a; border-bottom-style: solid; }
.recipe-form fieldset { min-width: 0; margin: 0.4rem 0; padding: 0; border: 0; }
.recipe-form legend { padding: 0; font-weight: 700; }
.recipe-form__checks { display: flex; flex-wrap: wrap; gap: 0 1rem; }
.recipe-form__checks legend { float: left; width: 100%; }
.recipe-form__checks label { display: inline-flex; align-items: center; gap: 0.3rem; }
.recipe-form__lines { margin: 0; padding: 0 0 0 1.2rem; }
.recipe-form__line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 4.5rem 5.5rem 2rem;
  gap: 0 0.4rem;
  margin-bottom: 0.3rem;
}
.recipe-form__line-note { grid-column: 1 / -1; font-size: 0.85em; }
.recipe-form__line .recipe-form__error { grid-column: 1 / -1; }
.recipe-form__remove,
.recipe-form__add { padding: 0; font: inherit; color: var(--ink); background: none; border: 0; cursor: pointer; }
.recipe-form__remove { width: 2rem; height: 2rem; border-radius: 50%; }
.recipe-form__add { margin: 0.2rem 0 0.4rem; text-decoration: underline; }
.recipe-form__error { margin: 0; font-family: var(--font-table); font-size: 0.8rem; line-height: 1.4; color: #a3322a; }
.recipe-form__summary { margin-bottom: 0.5rem; font-size: 0.9rem; }
.recipe-form__actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.6rem; margin-top: 0.8rem; }
.recipe-form__save,
.recipe-form__cancel { padding: 0.1em 1em; font: inherit; border-radius: 3px; cursor: pointer; }
.recipe-form__save { color: var(--paper); background: var(--cover-dark); border: 0; }
.recipe-form__cancel { color: var(--ink); background: none; border: 1px solid var(--ink-soft); }
.ingredient-picker { position: relative; min-width: 0; }
.ingredient-picker__list {
  position: absolute; z-index: 2; top: 100%; left: 0; right: 0; max-height: 14rem; overflow-y: auto;
  margin: 0; padding: 0; list-style: none; font-family: var(--font-table); font-size: 0.9rem; line-height: 1.4;
  background: var(--paper); border: 1px solid var(--ink-soft); box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
}
.ingredient-picker__option { padding: 0.35em 0.6em; cursor: pointer; }
.ingredient-picker__option[aria-selected="true"] { background: var(--paper-dark); }
@media (hover: hover) { .ingredient-picker__option:hover { background: var(--paper-dark); } }
@media (max-width: 480px) {
  .recipe-form { padding: 1rem 0.8rem 1.2rem 2.2rem; }
  .recipe-form__line { grid-template-columns: minmax(0, 1fr) 5rem 2rem; }
  .recipe-form__line .ingredient-picker { grid-column: 1 / -1; }
}
```

- [ ] **Step 5: Spustit testy – musí projít**

Run: `npx vitest run src/custom/RecipeForm.test.tsx src/styles/custom.test.ts`
Expected: PASS a v konzoli žádné varování Reactu o chybějícím `key`.

- [ ] **Step 6: Ověřit celek a commit**

Run: `npm test && npm run build && npm run lint`
Expected: vše zelené.

```bash
git add src/custom/RecipeForm.tsx src/custom/RecipeForm.test.tsx src/styles/custom.css src/styles/custom.test.ts
git commit -m "feat(vlastní recepty): formulář jako vložený ručně psaný list (dialog, validace, našeptávač)"
```

---

### Task 9: Zapojení formuláře do knihy – Nový recept, Upravit, uložení

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `RecipeForm` (Task 8), `editorRouteFromHash`, `EditorRoute`, `routeToHash`, `indexToRoute` (Task 3), `newCustomRecipeId` (Task 1), `saveCustomRecipe` (Task 2), `onNewRecipe` (`TocPages`, Task 5), `onEdit` (`RecipeLeft`, Task 4).
- Produces: v `Library` funkce `openEditor(route: EditorRoute): void`, kterou Task 10 použije pro „Nový recept“ v tiráži.

- [ ] **Step 1: Napsat failing testy**

`src/App.test.tsx` – importy `import userEvent from '@testing-library/user-event'` a `within` z `@testing-library/react`:

```tsx
describe('formulář vlastního receptu', () => {
  beforeEach(() => {
    window.confirm = vi.fn(() => true)
  })

  test('Nový recept v obsahu otevře dialog nad knihou, Escape ho zavře a vrátí hash obsahu', async () => {
    const user = userEvent.setup()
    history.replaceState(null, '', '#/obsah')
    const { container } = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Nový recept' }))
    expect(screen.getByRole('dialog', { name: 'Nový recept' })).toBeInTheDocument()
    expect(location.hash).toBe('#/novy-recept')
    expect(container.querySelector('main')).toHaveAttribute('inert')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Nový recept' })).toBeNull()
    expect(location.hash).toBe('#/obsah')
    expect(container.querySelector('main')).not.toHaveAttribute('inert')
  })

  test('#/novy-recept po načtení otevře formulář; uložení zařadí recept do knihy a otevře ho', async () => {
    const user = userEvent.setup()
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
    seedCustom()
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

  test('#/recept/<neznámý>/upravit ani úprava knižního receptu formulář neotevře', () => {
    history.replaceState(null, '', '#/recept/hovezi-gulas/upravit')
    render(<App />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getAllByRole('heading', { name: 'Hovězí guláš' }).length).toBeGreaterThan(0)
  })

  test('Zpět v prohlížeči (hashchange) formulář zavře', () => {
    history.replaceState(null, '', '#/novy-recept')
    render(<App />)
    act(() => {
      location.hash = '#/obsah'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL. Tlačítko „Nový recept“ v obsahu chybí (App nepředává `onNewRecipe`) a dialog se nevykreslí.

- [ ] **Step 3: Implementace**

`src/App.tsx` – importy: `useEffect` z `react`, `RecipeForm` z `@/custom/RecipeForm`, `newCustomRecipeId` z `@/content/customRecipes`, `editorRouteFromHash`, `type EditorRoute` z `@/app/route`. Do destrukturalizace `useUserState()` přidat `saveCustomRecipe`. Za `removeCustomRecipe` (Task 4):

```tsx
  // formulář vlastního receptu: dialog nad knihou řízený hashem (ruling R7); Zpět v prohlížeči ho zavře
  const [editor, setEditor] = useState<EditorRoute | null>(() => editorRouteFromHash(location.hash))
  useEffect(() => {
    const onHash = () => setEditor(editorRouteFromHash(location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const customById = useMemo(() => new Map(state.customRecipes.map((r) => [r.id, r])), [state.customRecipes])
  // úprava jen existujícího vlastního receptu; knižní nebo neznámé id formulář neotevře
  const editing = editor?.kind === 'edit-recipe' ? customById.get(editor.id) : undefined
  const formOpen = editor?.kind === 'new-recipe' || editing !== undefined

  // otevření nemění stránku knihy: formulář leží nad stránkou, ze které se otevřel
  const openEditor = useCallback((route: EditorRoute) => {
    history.pushState(null, '', routeToHash(route))
    setEditor(route)
  }, [])
  const closeEditor = useCallback(() => {
    setEditor(null)
    history.replaceState(null, '', routeToHash(indexToRoute(index, layout)))
  }, [index, layout])
  // uložení: hash nejdřív na recept – po změně layoutu na něj useHashRoute přejde (ruling R8)
  const saveRecipe = useCallback(
    (recipe: Recipe) => {
      history.replaceState(null, '', routeToHash({ kind: 'recipe', id: recipe.id }))
      setEditor(null)
      saveCustomRecipe(recipe)
    },
    [saveCustomRecipe],
  )
  const makeId = useCallback((title: string) => newCustomRecipeId(title, new Set(recipes.map((r) => r.id))), [recipes])
```

V `pages`: `TocPages` dostane `onNewRecipe={() => openEditor({ kind: 'new-recipe' })}` a `RecipeLeft` dostane `onEdit={own ? () => openEditor({ kind: 'edit-recipe', id: recipe.id }) : undefined}`. Do závislostí `useMemo` přidat `openEditor`.

V JSX: `<main style={{ height: '100%' }} inert={formOpen}>` a hned za `</main>`:

```tsx
      {formOpen && (
        <RecipeForm
          key={editor?.kind === 'edit-recipe' ? editor.id : 'novy'}
          ingredients={ingredients}
          recipe={editing}
          defaultChapter={layout.entries[index]?.chapter}
          makeId={makeId}
          onSave={saveRecipe}
          onCancel={closeEditor}
        />
      )}
```

(`Book` při otevřeném `[role="dialog"]` šipky ignoruje už od fáze 4b, takže úprava není potřeba.)

- [ ] **Step 4: Spustit testy – musí projít**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS.

- [ ] **Step 5: Ověřit celek a commit**

Run: `npm test && npm run build && npm run lint`
Expected: vše zelené.

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat(vlastní recepty): formulář nad knihou – Nový recept v obsahu, Upravit, uložení otevře recept"
```

---

### Task 10: Export a import vlastních receptů v tiráži

**Files:**
- Create: `src/custom/recipesFile.ts`, `src/custom/CustomRecipesSettings.tsx`
- Modify: `src/pages/SettingsPage.tsx`, `src/App.tsx`, `src/styles/custom.css`
- Test: `src/custom/recipesFile.test.ts`, `src/custom/CustomRecipesSettings.test.tsx`, `src/pages/SettingsPage.test.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `customRecipeProblem` (Task 1), `RecipeSchema`, `importCustomRecipes` (Task 2), `openEditor` (Task 9), `plural` (`labels.ts`).
- Produces:
```ts
export function customRecipesFileName(date: Date): string        // vlastni-recepty-YYYY-MM-DD.json
export function serializeCustomRecipes(recipes: readonly Recipe[]): string
export interface ImportSkip { label: string; reason: string }
export interface ParsedImport { recipes: Recipe[]; skipped: ImportSkip[] }
export function parseCustomRecipesFile(text: string, ctx: { ingredients: ReadonlyMap<string, Ingredient>; staticIds: ReadonlySet<string> }): ParsedImport // vadný JSON → throw Error('Soubor není platný JSON.')
export function downloadTextFile(fileName: string, text: string, type?: string): void
// CustomRecipesSettings props
{ recipes: readonly Recipe[]; ingredients: ReadonlyMap<string, Ingredient>; staticIds: ReadonlySet<string>; onNewRecipe: () => void; onImport: (recipes: Recipe[], overwrite: boolean) => void; now?: () => Date }
// SettingsPage – nový volitelný prop
customRecipes?: ReactNode
```

- [ ] **Step 1: Napsat failing testy**

```ts
// src/custom/recipesFile.test.ts
import { loadContent } from '@/content/loadContent'
import { RecipeSchema } from '@/domain/schema'
import { customRecipe } from '@/test/customRecipe'
import { customRecipesFileName, parseCustomRecipesFile, serializeCustomRecipes } from './recipesFile'

const { recipes, ingredients } = loadContent()
const ctx = { ingredients, staticIds: new Set(recipes.map((r) => r.id)) }
const brownies = recipes.find((r) => r.id === 'brownies')!

test('název souboru podle místního data', () => {
  expect(customRecipesFileName(new Date(2026, 9, 15))).toBe('vlastni-recepty-2026-10-15.json')
  expect(customRecipesFileName(new Date(2026, 0, 5, 23, 59))).toBe('vlastni-recepty-2026-01-05.json')
})

test('export: pole receptů ve tvaru data/recipes (2 mezery, nový řádek na konci)', () => {
  const text = serializeCustomRecipes([customRecipe()])
  expect(text.endsWith('\n')).toBe(true)
  expect(text).toContain('\n  {\n    "id": "vlastni-babicciny-livance-ab12"')
  const data = JSON.parse(text)
  expect(data).toEqual([customRecipe()])
  for (const r of data) expect(RecipeSchema.safeParse(r).success).toBe(true)
})

test('import přijme export i jeden recept (soubor z data/recipes)', () => {
  expect(parseCustomRecipesFile(serializeCustomRecipes([customRecipe()]), ctx)).toEqual({ recipes: [customRecipe()], skipped: [] })
  expect(parseCustomRecipesFile(JSON.stringify(customRecipe()), ctx).recipes).toEqual([customRecipe()])
})

test('import: neplatné, knižní, kolidující a zdvojené položky se přeskočí s důvodem', () => {
  const text = JSON.stringify([
    { title: 'Rozbitý' },
    42,
    brownies,
    customRecipe({ id: 'brownies', title: 'Moje brownies' }),
    customRecipe({ id: 'vlastni-x-0001', title: 'Neznámá', ingredients: [{ ingredientId: 'neexistuje', amount: 1, unit: 'g' }] }),
    customRecipe(),
    customRecipe(),
  ])
  expect(parseCustomRecipesFile(text, ctx)).toEqual({
    recipes: [customRecipe()],
    skipped: [
      { label: 'Rozbitý', reason: 'neodpovídá schématu receptu' },
      { label: 'položka 2', reason: 'neodpovídá schématu receptu' },
      { label: 'Brownies', reason: 'není vlastní recept (source.book musí být „vlastni“)' },
      { label: 'Moje brownies', reason: 'id „brownies“ už má recept z knihy' },
      { label: 'Neznámá', reason: 'neznámá surovina „neexistuje“' },
      { label: 'Babiččiny lívance', reason: 'v souboru dvakrát' },
    ],
  })
})

test('poškozený JSON vyhodí srozumitelnou chybu', () => {
  expect(() => parseCustomRecipesFile('{nejson', ctx)).toThrow('Soubor není platný JSON.')
})
```

```tsx
// src/custom/CustomRecipesSettings.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loadContent } from '@/content/loadContent'
import { customRecipe } from '@/test/customRecipe'
import { CustomRecipesSettings } from './CustomRecipesSettings'

const { recipes, ingredients } = loadContent()
const staticIds = new Set(recipes.map((r) => r.id))
const jsonFile = (data: unknown) =>
  new File([typeof data === 'string' ? data : JSON.stringify(data)], 'recepty.json', { type: 'application/json' })

function setup(over: Partial<React.ComponentProps<typeof CustomRecipesSettings>> = {}) {
  const props = { recipes: [], ingredients, staticIds, onNewRecipe: vi.fn(), onImport: vi.fn(), now: () => new Date(2026, 9, 15), ...over }
  render(<CustomRecipesSettings {...props} />)
  return { props, user: userEvent.setup() }
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:recepty')
  URL.revokeObjectURL = vi.fn()
  window.confirm = vi.fn(() => false)
})

test('bez vlastních receptů: nadpis sekce, export zakázaný, Nový recept funguje', async () => {
  const { props, user } = setup()
  expect(screen.getByRole('heading', { name: 'Vlastní recepty' })).toBeInTheDocument()
  expect(screen.getByText(/Zatím žádný vlastní recept\./)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Exportovat vlastní recepty (JSON)' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Nový recept' }))
  expect(props.onNewRecipe).toHaveBeenCalledOnce()
})

test('export stáhne vlastni-recepty-2026-10-15.json s polem receptů', async () => {
  let downloaded = ''
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloaded = this.download
  })
  const own = customRecipe()
  const { user } = setup({ recipes: [own] })
  expect(screen.getByText(/Vlastní recepty v knize: 1\./)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Exportovat vlastní recepty (JSON)' }))
  expect(downloaded).toBe('vlastni-recepty-2026-10-15.json')
  const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob
  expect(blob.type).toBe('application/json')
  expect(JSON.parse(await blob.text())).toEqual([own])
  click.mockRestore()
})

test('import: nové přidá, duplicitní po odmítnutí přeskočí, nenačtené vypíše', async () => {
  const own = customRecipe()
  const other = customRecipe({ id: 'vlastni-kase-0001', title: 'Kaše' })
  const { props, user } = setup({ recipes: [own] })
  await user.upload(screen.getByLabelText('Importovat vlastní recepty'), jsonFile([own, other, { title: 'Rozbitý' }]))
  expect(
    await screen.findByText('Přidáno: 1, přeskočeno (už v knize): 1, nenačteno: 1 (Rozbitý – neodpovídá schématu receptu).'),
  ).toBeInTheDocument()
  expect(window.confirm).toHaveBeenCalledWith('1 z importovaných receptů už v knize je (Babiččiny lívance). Přepsat? OK = přepsat, Zrušit = ponechat současné.')
  expect(props.onImport).toHaveBeenCalledWith([own, other], false)
})

test('import s potvrzeným přepsáním', async () => {
  window.confirm = vi.fn(() => true)
  const own = customRecipe()
  const { props, user } = setup({ recipes: [own] })
  await user.upload(screen.getByLabelText('Importovat vlastní recepty'), jsonFile([{ ...own, title: 'Lívance II' }]))
  expect(await screen.findByText('Přidáno: 0, přepsáno: 1.')).toBeInTheDocument()
  expect(props.onImport).toHaveBeenCalledWith([{ ...own, title: 'Lívance II' }], true)
})

test('poškozený soubor: hláška a nic se neimportuje', async () => {
  const { props, user } = setup()
  await user.upload(screen.getByLabelText('Importovat vlastní recepty'), jsonFile('{nejson'))
  expect(await screen.findByText('Soubor není platný JSON.')).toBeInTheDocument()
  expect(props.onImport).not.toHaveBeenCalled()
  expect(window.confirm).not.toHaveBeenCalled()
})
```

`src/pages/SettingsPage.test.tsx`:

```tsx
test('sekce vlastních receptů je před tiráží', () => {
  const { container } = render(
    <SettingsPage settings={{ childCoef: 0.8, historicalIngredients: false }} onChange={vi.fn()} customRecipes={<p>sekce vlastních receptů</p>} />,
  )
  const section = screen.getByText('sekce vlastních receptů')
  const colophon = container.querySelector('.settings-colophon')!
  expect(section.compareDocumentPosition(colophon) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})
```

`src/App.test.tsx` (uvnitř `describe('formulář vlastního receptu')`):

```tsx
  test('tiráž: Nový recept otevře formulář; import přidá recept a kniha zůstane na tiráži', async () => {
    const user = userEvent.setup()
    window.confirm = vi.fn(() => false)
    history.replaceState(null, '', '#/nastaveni')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Vlastní recepty' })).toBeInTheDocument()
    const file = new File([JSON.stringify([customRecipe()])], 'recepty.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText('Importovat vlastní recepty'), file)
    expect(await screen.findByText('Přidáno: 1.')).toBeInTheDocument()
    expect(location.hash).toBe('#/nastaveni')
    expect(screen.getByRole('heading', { level: 2, name: 'Tiráž a nastavení' })).toBeInTheDocument()
    expect(screen.getByText(/Vlastní recepty v knize: 1\./)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Nový recept' }))
    expect(screen.getByRole('dialog', { name: 'Nový recept' })).toBeInTheDocument()
  })
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/custom/recipesFile.test.ts src/custom/CustomRecipesSettings.test.tsx src/pages/SettingsPage.test.tsx src/App.test.tsx`
Expected: FAIL – moduly neexistují, `SettingsPage` sekci nevykreslí.

- [ ] **Step 3: Implementace**

```ts
// src/custom/recipesFile.ts
import { customRecipeProblem } from '@/content/customRecipes'
import { RecipeSchema } from '@/domain/schema'
import type { Ingredient, Recipe } from '@/domain/types'

/** `vlastni-recepty-YYYY-MM-DD.json` podle místního data. */
export function customRecipesFileName(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `vlastni-recepty-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}.json`
}

/** Pole `Recipe[]`; každý prvek má tvar souboru `data/recipes/<id>.json` (2 mezery, nový řádek na konci). */
export function serializeCustomRecipes(recipes: readonly Recipe[]): string {
  return `${JSON.stringify(recipes, null, 2)}\n`
}

export interface ImportSkip {
  label: string
  reason: string
}
export interface ParsedImport {
  recipes: Recipe[]
  skipped: ImportSkip[]
}

function itemLabel(item: unknown, index: number): string {
  return typeof item === 'object' && item !== null && 'title' in item && typeof item.title === 'string' ? item.title : `položka ${index + 1}`
}

/** Import (ruling R11): pole nebo jeden recept; zod + pravidla zařazení; každá přeskočená položka s důvodem. */
export function parseCustomRecipesFile(
  text: string,
  ctx: { ingredients: ReadonlyMap<string, Ingredient>; staticIds: ReadonlySet<string> },
): ParsedImport {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Soubor není platný JSON.')
  }
  const items: unknown[] = Array.isArray(data) ? data : [data]
  const recipes: Recipe[] = []
  const skipped: ImportSkip[] = []
  items.forEach((item, i) => {
    const label = itemLabel(item, i)
    const parsed = RecipeSchema.safeParse(item)
    if (!parsed.success) {
      skipped.push({ label, reason: 'neodpovídá schématu receptu' })
      return
    }
    const problem = customRecipeProblem(parsed.data, ctx.ingredients, ctx.staticIds)
    if (problem) {
      skipped.push({ label, reason: problem })
      return
    }
    if (recipes.some((r) => r.id === parsed.data.id)) {
      skipped.push({ label, reason: 'v souboru dvakrát' })
      return
    }
    recipes.push(parsed.data)
  })
  return { recipes, skipped }
}

/** Stáhne text jako soubor (dočasný odkaz s atributem download). */
export function downloadTextFile(fileName: string, text: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
```

(Pokud fáze 7 už přidala obecnou funkci pro stažení souboru, použij ji místo `downloadTextFile` a test exportu ponech beze změny.)

```tsx
// src/custom/CustomRecipesSettings.tsx
import { useId, useState } from 'react'
import type { Ingredient, Recipe } from '@/domain/types'
import { customRecipesFileName, downloadTextFile, parseCustomRecipesFile, serializeCustomRecipes, type ParsedImport } from './recipesFile'

interface Props {
  /** Vlastní recepty uživatele (`UserState.customRecipes`). */
  recipes: readonly Recipe[]
  ingredients: ReadonlyMap<string, Ingredient>
  /** Id knižních receptů (import je nesmí přepsat). */
  staticIds: ReadonlySet<string>
  onNewRecipe: () => void
  onImport: (recipes: Recipe[], overwrite: boolean) => void
  /** Datum do názvu exportu (v testech pevné). */
  now?: () => Date
}

function importSummary(parsed: ParsedImport, duplicates: number, overwrite: boolean): string {
  const parts = [`Přidáno: ${parsed.recipes.length - duplicates}`]
  if (duplicates > 0) parts.push(overwrite ? `přepsáno: ${duplicates}` : `přeskočeno (už v knize): ${duplicates}`)
  if (parsed.skipped.length > 0) {
    parts.push(`nenačteno: ${parsed.skipped.length} (${parsed.skipped.map((s) => `${s.label} – ${s.reason}`).join('; ')})`)
  }
  return `${parts.join(', ')}.`
}

/** Sekce tiráže „Vlastní recepty“: nový recept, export do JSON a import (ruling R11). */
export function CustomRecipesSettings({ recipes, ingredients, staticIds, onNewRecipe, onImport, now = () => new Date() }: Props) {
  const [message, setMessage] = useState('')
  const headingId = useId()

  const importFile = async (file: File) => {
    let parsed: ParsedImport
    try {
      parsed = parseCustomRecipesFile(await file.text(), { ingredients, staticIds })
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Soubor nejde načíst.')
      return
    }
    const existing = new Set(recipes.map((r) => r.id))
    const duplicates = parsed.recipes.filter((r) => existing.has(r.id))
    const overwrite =
      duplicates.length > 0 &&
      window.confirm(
        `${duplicates.length} z importovaných receptů už v knize je (${duplicates.map((r) => r.title).join(', ')}). Přepsat? OK = přepsat, Zrušit = ponechat současné.`,
      )
    if (parsed.recipes.length > 0) onImport(parsed.recipes, overwrite)
    setMessage(importSummary(parsed, duplicates.length, overwrite))
  }

  return (
    <section className="settings-custom" aria-labelledby={headingId}>
      <h3 id={headingId}>Vlastní recepty</h3>
      <p className="settings-hint">
        {recipes.length === 0 ? 'Zatím žádný vlastní recept.' : `Vlastní recepty v knize: ${recipes.length}.`} Export je soubor JSON ve formátu receptů
        knihy – záloha, nebo podklad pro přesun receptu do repozitáře (data/recipes).
      </p>
      <div className="settings-custom__actions">
        <button type="button" className="cart-button" onClick={onNewRecipe}>
          Nový recept
        </button>
        <button
          type="button"
          className="cart-button"
          disabled={recipes.length === 0}
          onClick={() => downloadTextFile(customRecipesFileName(now()), serializeCustomRecipes(recipes))}
        >
          Exportovat vlastní recepty (JSON)
        </button>
        <label className="cart-button settings-custom__import">
          Importovat vlastní recepty
          <input
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0]
              e.currentTarget.value = '' // tentýž soubor jde vybrat znovu
              if (file) void importFile(file)
            }}
          />
        </label>
      </div>
      <p role="status" className="settings-hint">
        {message}
      </p>
    </section>
  )
}
```

`src/pages/SettingsPage.tsx` – `import type { ReactNode } from 'react'`. Do `Props` přidat:

```ts
  /** Sekce „Vlastní recepty“ (fáze 8), vykreslí ji App. */
  customRecipes?: ReactNode
```

a v JSX hned před `<footer className="settings-colophon">` vložit `{customRecipes}`. Zbytek stránky (včetně částí z fáze 7) se nemění.

`src/App.tsx` – import `CustomRecipesSettings` z `@/custom/CustomRecipesSettings`, do destrukturalizace `useUserState()` přidat `importCustomRecipes`. Pod `recipes`:

```tsx
  const staticIds = useMemo(() => new Set(staticRecipes.map((r) => r.id)), [staticRecipes])
```

Větev `case 'settings'`:

```tsx
        case 'settings':
          return {
            id: entry.id,
            render: () => (
              <SettingsPage
                settings={state.settings}
                onChange={updateSettings}
                customRecipes={
                  <CustomRecipesSettings
                    recipes={state.customRecipes}
                    ingredients={ingredients}
                    staticIds={staticIds}
                    onNewRecipe={() => openEditor({ kind: 'new-recipe' })}
                    onImport={importCustomRecipes}
                  />
                }
              />
            ),
          }
```

Do závislostí `useMemo` stránek přidat `state.customRecipes`, `staticIds`, `importCustomRecipes`. (Import nemění hash `#/nastaveni`, takže po změně layoutu zůstane kniha na tiráži. `BookPage` má `key` = id stránky, takže stav sekce s hláškou přežije.)

`src/styles/custom.css` – připsat:

```css
/* ===== tiráž: vlastní recepty ===== */
.settings-custom { max-width: 26rem; margin-top: 1.2em; font-family: var(--font-table); font-size: 0.85em; }
.settings-custom h3 { margin: 0 0 0.3em; font-family: var(--font-hand); font-size: 1.6rem; font-weight: 700; }
.settings-custom__actions { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.settings-custom__import { display: inline-block; }
.settings-custom__import:focus-within { outline: 2px solid var(--ink); outline-offset: 2px; }
```

- [ ] **Step 4: Spustit testy – musí projít**

Run: `npx vitest run src/custom/recipesFile.test.ts src/custom/CustomRecipesSettings.test.tsx src/pages/SettingsPage.test.tsx src/App.test.tsx`
Expected: PASS.

- [ ] **Step 5: Ověřit celek a commit**

Run: `npm test && npm run build && npm run lint`
Expected: vše zelené.

```bash
git add src/custom/recipesFile.ts src/custom/recipesFile.test.ts src/custom/CustomRecipesSettings.tsx src/custom/CustomRecipesSettings.test.tsx src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx src/App.tsx src/App.test.tsx src/styles/custom.css
git commit -m "feat(vlastní recepty): export a import JSON v tiráži (sekce Vlastní recepty)"
```

---

### Task 11: Ruční kontrola v prohlížeči (agent-browser) a opravy nálezů

**Files:** podle nálezů. Zápis do tohoto plánu pod „Nálezy z ruční kontroly“ (na konec souboru). Pomocné soubory jen ve scratchpadu (`…/scratchpad/t11/`), ne v repu.

Implementátor použije skill `agent-browser` (nejdřív `agent-browser skills get core`). Spustí vlastní dev server `npm run dev -- --port <volný port> --strictPort` na pozadí a po skončení ho zastaví (`agent-browser close`, ukončit vite). Interakce vždy **reálným vstupem** (`agent-browser click`, `fill`/`type`, `press`, `upload`). `eval` slouží jen ke čtení DOM, měření a čtení `localStorage`. Před kliknutím na prvek u okraje stránky nebo v natočeném listu ověřit, že `document.elementFromPoint(střed)` je cílový prvek. Zapnout `agent-browser set media light reduced-motion` (rAF v tabu na pozadí stojí). Viewporty: desktop `set viewport 1390 800`, mobil `390 844` a `320 568`, po změně viewportu `reload`. Na začátku `eval "localStorage.clear()"` + `reload`.

- [ ] **Step 1: Založení receptu (desktop 1390×800)** – `#/obsah`, reálný klik na „+ Nový recept“. Ověřit: dialog „Nový recept“, hash `#/novy-recept`, fokus v „Název“ (`eval "document.activeElement.id"`), screenshot formuláře (linkovaný papír, červená linka okraje, Caveat, natočení). Vyplnit:
  - Název „Táborová omeleta se sýrem“, kapitola „Snídaně a pečivo“, porce „2“, čas „15“, obtížnost „snadné“;
  - Surovina 1: napsat „vajic“ a ověřit návrh „Vejce“ (bez diakritiky přes alias), `ArrowDown`/`Enter`, množství „3“, jednotka „ks“;
  - Surovina 2: „mlek“ → kliknout na „Mléko polotučné“, „100“, „ml“;
  - Surovina 3: „eidam“ nebo „sýr“ → vybrat sýr z nabídky, „40“, „g“, poznámka „nastrouhaný“;
  - Postup: tři řádky, jeden s ručním číslováním „1. “; štítky „levné“ a „táborové“, vybavení „plotna“.
  - Nejdřív zkusit uložit s jednotkou „hrnek“ u sýra bez převodu (pokud ho nemá), ověřit hlášku u řádku a fokus, pak opravit na „g“. Uložit.

- [ ] **Step 2: Recept v knize** – hash `#/recept/vlastni-taborova-omeleta-se-syrem-xxxx`, dialog zmizel, `main` už není `inert`. Screenshot dvoustrany: ručně psaný natočený list na linkovaném papíře, levá strana s „Upravit“/„Smazat“, tabulka surovin pro aktuální počet osob (2 dospělí: hodnoty × 1, na osobu ½), pravá strana postup bez „1.“, patička „Vlastní recept · zapsaný pro 2 porce“. Změřit `eval "getComputedStyle(document.querySelector('.book__slot--left .page')).transform"` → `none` (natočený je jen `.recipe-page`) a `eval "[...document.querySelectorAll('.page--note > .page-content')].map(e => e.scrollWidth <= e.clientWidth)"` → všude `true`. Otočit stránku tahem za okraj (reálný drag) – flip funguje.

- [ ] **Step 3: Obsah, filtr, hledání** – `#/obsah`: recept je na konci kapitoly „Snídaně a pečivo“ s ikonou pera a číslem stránky shodným s knihou. Pilulka „Vlastní“ v „Zdroj“ ho vyfiltruje. Lupa: „omeleta“ ho najde s metou „Snídaně a pečivo · Vlastní“. Na první stránce obsahu nic nepřetéká: `eval "(() => { const c = document.querySelector('.toc-page').closest('.page-content'); return c.scrollHeight - c.clientHeight })()"` → ≤ 0 při 1390, 390 i 320.

- [ ] **Step 4: Košík a nákupní seznam** – na stránce receptu ikona košíku. Přidat i „Míchaná vejce“. V záložce Dospělí = 6. `#/seznam`: „Vejce“ je jedna položka s rozpadem na oba recepty. Množství z vlastního receptu = 3 ks × 6/2 = 9 ks, kontrola proti tabulce na stránce receptu. Košík ukazuje kcal na osobu nenulové. Ctrl+P na receptu (`eval "dispatchEvent(new Event('beforeprint'))"` → `eval "document.documentElement.dataset.print"` = `recipe` → `afterprint`) – tiskový strom obsahuje název a „Vlastní recept · zapsaný pro 2 porce“.

- [ ] **Step 5: Úprava** – „Upravit“: hash `…/upravit`, formulář předvyplněný (3 suroviny, postup po řádcích). Změnit název na „Táborová omeleta“ a porce na „3“, uložit. Hash má **stejné** id, recept zůstal v košíku, seznam se přepočítal (vejce 3 × 6/3 = 6 ks). Escape s rozepsanou změnou se zeptá (dialog prohlížeče: `agent-browser` ho odmítne/přijme podle dokumentace skillu), Zpět v prohlížeči formulář zavře.

- [ ] **Step 6: Export a import** – `#/nastaveni`, sekce „Vlastní recepty“: „Exportovat vlastní recepty (JSON)“. Stažený soubor `vlastni-recepty-<dnes>.json` (cesta stahování podle skillu) přečíst. Je to pole s jedním receptem, `source.book` = `vlastni`, `verified: true`, `allergens` ze surovin. Kontrola tvaru: zkopírovat prvek do `…/scratchpad/t11/data/recipes/<id>.json` a spustit `npx tsx -e` se `RecipeSchema.parse` (nebo `node` + `zod`), výsledek zapsat. Smazat recept („Smazat“ → potvrdit): kniha je na „Snídaně a pečivo“, recept zmizel z obsahu i košíku. Importovat stažený soubor (`agent-browser upload`): hláška „Přidáno: 1.“, recept je zpět. Importovat podruhé: dotaz na přepsání, „Zrušit“ → „Přidáno: 0, přeskočeno (už v knize): 1.“. Importovat `data/recipes/brownies.json` → „nenačteno: 1 (Brownies – není vlastní recept …)“.

- [ ] **Step 7: Reload** – `reload`: recept, košík i oblíbené zůstaly (`eval "JSON.parse(localStorage.getItem('kucharka.userState.v1')).customRecipes.length"`, případně klíč úložiště z fáze 7). Přímý odkaz `#/recept/<id>` po reloadu otevře recept, `#/novy-recept` otevře formulář nad obsahem.

- [ ] **Step 8: Mobil 390×844 a 320×568** – stránka vlastního receptu (obě poloviny): `eval "document.documentElement.scrollWidth === innerWidth"` → `true`, tlačítka „Upravit“/„Smazat“ a ikony v hlavičce mají `elementFromPoint` = tlačítko, screenshot. Formulář: otevřít z obsahu, `scrollWidth === innerWidth` i s otevřeným dialogem, řádek suroviny se zalomí (surovina přes celou šířku, pod ní množství/jednotka/×), návrhy našeptávače nejsou uříznuté a jdou vybrat klepnutím, písmo polí ≥ 16 px (`eval "getComputedStyle(document.querySelector('.recipe-form input')).fontSize"`), list jde scrollovat až k „Uložit recept“. Screenshot formuláře na 320.

- [ ] **Step 9: Opravy a zápis** – každý nález opravit s testem tam, kde to jde (CSS-only opravy ověřit screenshotem nebo měřením). Zapsat pod „Nálezy z ruční kontroly“ ve formátu z plánu fáze 6 (číslo, nález, soubor, oprava, ověření) + sekce „Odloženo (s důvodem)“ a „Naměřeno“ (přetečení první stránky obsahu, `scrollWidth` na 390/320, transform `.page`, výsledek kontroly exportu proti `RecipeSchema`). Nakonec `npm test && npm run build && npm run lint && npm run validate`.

- [ ] **Step 10: Commit**

```bash
git add <změněné soubory> docs/superpowers/plans/2026-10-15-phase8-custom-recipes.md
git commit -m "fix(vlastní recepty): nálezy z ruční kontroly fáze 8"
```

## Pokrytí specu (self-review)

| Požadavek | Task |
|---|---|
| §8 bod 8 Vlastní recepty; uživatel: „možnost přidat vlastní recept“ | 6, 7, 8, 9 |
| §2 Formulář vypadá jako vložený ručně psaný list, jiný papír (linkovaný), lehce natočený | 8 |
| §2 5. styl stránky „ručně psaný vložený list“ pro vlastní recepty, Caveat | 4 |
| §2 Recept = dvoustrana (levá suroviny, pravá postup) i pro vlastní recept | 4 (beze změny layoutu) |
| §5.1 Schéma receptu (kapitoly, tagy, vybavení, jednotky, suroviny z `ingredients.json`) | 1, 6, 7 |
| §5.2 `customRecipes []` v `UserState` | 2 |
| Uživatel: „export do JSON“ (+ import, přesun do repa) | 10 |
| §3 Košík, nákupní seznam, nutrice a přepočet pro vlastní recepty (`baseServings` ≠ 4) | 1, 4, 11 |
| §4 Tisk vlastního receptu, brožurka | 4 (sloučený seznam do `PrintRoot`), 11 |
| Obsah, filtr „kniha“ → „Vlastní“, hledání | 5, 11 |
| Upravit, Smazat (s potvrzením) | 4, 8, 9 |
| §1 Osobní projekt, jednoduché (nativní `confirm`, bez modálů a knihoven) | Global Constraints |
| Ruční kontrola (desktop 1390, mobil 390/320, reload, export) | 11 |

Mimo fázi 8: fotky k vlastním receptům (`image` – backlog); skupiny surovin (`group`) a historické varianty (`original`) ve formuláři; přesun receptu do repa skriptem (dělá se ručně zkopírováním prvku exportu do `data/recipes/<id>.json`); synchronizace a export celého stavu (fáze 7).

## Nálezy z ruční kontroly

Ruční kontrola agent-browserem (reálný pointer a klávesnice; dev server i `npm run build` + `npm run serve`; viewporty 1390, 390, 320).

1. **Nález:** po Escape (zavření návrhů) šipka dolů návrhy znovu neotevře; Enter pak odešle formulář (T7 Minor).
   **Soubor:** `src/custom/IngredientPicker.tsx` (+ test v `IngredientPicker.test.tsx`).
   **Oprava:** při zavřených návrzích ArrowDown/ArrowUp návrhy otevře (`preventDefault`).
   **Ověření:** test „ArrowDown po Escape znovu otevře návrhy“ (RED: nenalezen listbox; GREEN 7/7).

### Odloženo (s důvodem)

- Štítek „kotlík“ ve formuláři se jmenuje stejně jako vybavení „kotlík“ (v obsahu je štítek „do kotlíku“); kosmetické, jen jiný popisek štítku by změnil sdílené labels.
- Při filtru, který zkrátí obsah na jednu stranu, zůstává popisek „Strana obsahu 2 z 10“ (počet stran se nepřepočítává; existující chování obsahu, mimo fázi 8).

### Naměřeno

- Formulář: dialog „Nový recept“, hash `#/novy-recept`, fokus v „Název“; návrh „Vejce“ pro „vajic“; chyba „hrnek“ u sýra se ukáže u řádku a fokus je na jednotce.
- Kniha: `.book__slot--left .page` transform `none`; `.recipe-page` natočena (~0,6 deg); `.page--note > .page-content` scrollWidth <= clientWidth. Flip tahem za okraj funguje. Recept je na straně 155 shodně s obsahem, ikona pera.
- Obsah (10 stran po TOC_FIRST_PAGE_UNITS 6): scrollHeight - clientHeight = 0 na všech párech stran při 1390 i 320; nic se neořezává. Filtr „Vlastní“ i hledání „omeleta“ (meta „Snídaně a pečivo · Vlastní“) fungují.
- Košík 6 dospělých: vejce 9 ks (omeleta, 3 × 6/2) + 11 ks, kcal na porci nenulové; po úpravě na 3 porce 6 ks; id receptu zůstalo.
- Tisk (CDP printToPDF, preferCSSPageSize): A4, 1 strana, nenatočený list, bez linek, s patičkou „Vlastní recept · zapsaný pro 2 porce“; s otevřeným formulářem (nový i úprava) se overlay netiskne.
- Export: pole s 1 receptem, `source.book` = `vlastni`, `verified: true`, `allergens` vejce, mleko; `RecipeSchema.safeParse` = úspěch. Import: „Přidáno: 1.“; podruhé s Zrušit „Přidáno: 0, přeskočeno (už v knize): 1.“; brownies „nenačteno: 1 (… source.book musí být „vlastni“)“.
- Import zálohy celého stavu (StoragePanel) ukazuje „vlastní recepty: 1“. Smazání posledního vlastního receptu: pilulka „Vlastní“ zmizí, filtr se vyčistí.
- Escape po odebrání řádku suroviny i po kliku na pozadí formulář zavírá (s dotazem na zahození); posledním odebraným řádkem fokus přejde na „+ Přidat surovinu“.
- 390 a 320: `scrollWidth === innerWidth` (i s dialogem), tlačítka a ikony mají `elementFromPoint` = cíl, pole 20 px, řádek suroviny se zalamuje, návrhy jdou vybrat klepnutím, „Uložit recept“ dosažitelný scrollem.
- Build přes server: uložení do `userdata/user-state.json` funguje (soubor po kontrole smazán, dříve neexistoval).
- Reload: customRecipes, košík i přímé odkazy `#/recept/<id>` a `#/novy-recept` fungují.
