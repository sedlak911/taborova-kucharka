# Fáze 4: Stránky knihy (obal, úvod, obsah, kapitoly, recept, poznámky, oblíbené) – implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Z demo stránek fáze 1 udělat skutečnou knihu nad 78 recepty z `data/recipes/`: obal, úvodní dvoustrana, obsah s filtry a vyhledáváním, kapitoly s úvodní stránkou a citátem, stránka receptu ve stylu epochy zdroje, oblíbené (oslí ucho + srdíčko), poznámky v okraji, hash routing a self-hosted fonty. Košík, nutrice a přepočet na osoby jsou fáze 5 (stránka receptu zatím ukazuje 4 porce a šedě 1 osobu).

**Architecture:** Obsah se načítá při buildu přes `import.meta.glob` (`src/content/loadContent.ts`) a validuje zod schématy. `buildPages()` převede obsah na lineární seznam `BookPageDef` + mapy pro routing. Uživatelský stav (oblíbené, poznámky) drží jednoduchý store `src/state/userState.ts` s `localStorage` (fáze 7 jen vymění persistenci za `StorageAdapter`). Stránky jsou samostatné komponenty v `src/pages/`; vzhled epoch řeší CSS třídy `era--<book>` v `src/styles/themes.css`; fonty z balíčků `@fontsource/*` (self-hosted). Kniha dostane řízený `index` (hash routing) a drobné odložené opravy z fáze 1.

**Tech Stack:** Vite 8, React 19, TypeScript, zod 4, Vitest 4 + Testing Library, `@fontsource/eb-garamond`, `@fontsource/ibm-plex-sans`, `@fontsource/special-elite`, `@fontsource/caveat`. Kontrola v prohlížeči skillem `agent-browser` (reálný pointer, desktop 1390 px + mobil 390/320 px).

**Spec:** `docs/superpowers/specs/2026-10-14-cookbook-design.md` §2 (kniha), §5.2 (uživatelský stav), §3 jen pro `scaleLine` při zobrazení 1 osoby.

## Global Constraints

- Češtiny s diakritikou v UI, identifikátory anglicky. Bez UI knihovny. Žádný server.
- Pořadí stránek (spec §2): obal → „O této knize“ (dvoustrana) → obsah → kapitoly v pořadí `CHAPTERS` ze `src/domain/schema.ts` (každá úvodní stránka s citátem) → nákupní seznam (zatím zástupná stránka „Nákupní seznam – fáze 5“) → tiráž/nastavení (zástupná stránka „Nastavení – fáze 7“).
- Desktop dvoustrana: obal sám vpravo (index 0), pak lichý index vlevo. `buildPages()` musí vkládat prázdné stránky tak, aby úvodní dvoustrana začínala vlevo (index 1) a každá kapitola začínala na pravé stránce (sudý index), jak je v tištěných knihách.
- Hash routy: `#/recept/<id>`, `#/kapitola/<id>`, `#/seznam`, `#/nastaveni`, `#/obsah`, prázdný hash = obal. Změna stránky listováním aktualizuje hash (bez zápisu do historie při flipu – `history.replaceState`), změna hashe (zpět/vpřed, odkaz) nastaví index.
- Styl stránky podle `source.book`: `era--italian-1919`, `era--feldkochbuch-1940`, `era--navy-1944`, `era--afrs-2003`, `era--vlastni` (ručně psaný list, tone `note`).
- Typografie: tělo EB Garamond, tabulky surovin IBM Plex Sans, patička zdroje Special Elite (strojopis), poznámky Caveat; vše self-hosted přes `@fontsource` (latin-ext subset kvůli diakritice).
- Uživatelský stav `UserState` ve tvaru ze spec §5.2 (`favorites: string[]`, `notes: Record<string,string>`, ostatní pole s výchozími hodnotami, `version: 1`); klíč `localStorage` `kucharka.userState.v1`.
- Přístupnost: inert neaktivní stránky (fáze 1); oslí ucho a srdíčko jsou `<button aria-pressed>`; vyhledávání má `role="dialog"` a zavírá se Escape; hlášení změny stránky přes `aria-live="polite"`.
- Mobil: žádný vodorovný scroll (`document.documentElement.scrollWidth === window.innerWidth` při 390 i 320 px), obsah stránky scrolluje svisle uvnitř stránky.
- Testy Vitest + Testing Library pro každou komponentu a čistou funkci; `npm test`, `npm run build`, `npm run lint` čisté. Commit po každém tasku (explicitní `git add`, nikdy `-A`).

## Review Focus

1. Recept s dlouhým postupem (holubky, 12 kroků) nebo mnoha surovinami (chilli, 15 řádků) nesmí na mobilu 390 px přetéct stránku bez možnosti scrollu ani přetéct okraj knihy – test v Task 7 (render + `page-content` má `overflow-y: auto`) a ruční kontrola v Task 11.
2. Hash `#/recept/neexistuje` nebo `#/kapitola/x` nesmí shodit aplikaci – zůstane obal a hash se vyčistí. Test v Task 3.
3. Poznámka uložená k receptu musí přežít reload (localStorage) a nesmí se smazat při otočení stránky (remount stránky). Test v Task 4 a 7.
4. Filtr „oblíbené“ s prázdnými oblíbenými musí zobrazit text „Zatím žádné oblíbené recepty – ohni roh stránky.“, ne prázdnou stránku. Test v Task 8.
5. Vyhledávání podle suroviny musí najít recept přes `ingredientId` → název suroviny (např. „čočka“ najde čočkovou polévku, „treska“ pečenou rybu) a musí být bez diakritiky i s ní („cocka“). Test v Task 8.

---

### Task 1: Načtení obsahu a metadata kapitol a knih

**Files:**
- Create: `src/content/loadContent.ts`, `src/content/chapters.ts`, `src/content/books.ts`, `src/content/loadContent.test.ts`, `src/content/chapters.test.ts`
- Modify: `tsconfig.app.json` (`resolveJsonModule: true`), `vite.config.ts` (nic, `import.meta.glob` funguje), `src/test/setup.ts` (nic)

**Interfaces:**
- Produces: `loadContent(): { recipes: Recipe[]; ingredients: Map<string, Ingredient> }` (recepty setříděné podle `chapter` v pořadí `CHAPTERS` a pak `title` lokálně `localeCompare('cs')`), `CHAPTER_META: Record<Chapter, { title: string; quote: string; quoteSource: string; intro: string }>`, `BOOK_META: Record<Book, { title: string; year: number; era: string; shortTitle: string; description: string }>`.

- [ ] **Step 1: Test načtení**

```ts
// src/content/loadContent.test.ts
import { loadContent } from './loadContent'
import { CHAPTERS } from '@/domain/schema'

test('načte všechny recepty a suroviny', () => {
  const { recipes, ingredients } = loadContent()
  expect(recipes.length).toBeGreaterThanOrEqual(78)
  expect(ingredients.size).toBeGreaterThanOrEqual(340)
  for (const r of recipes) for (const l of r.ingredients) expect(ingredients.has(l.ingredientId)).toBe(true)
})

test('recepty jsou seřazené podle kapitol a názvu', () => {
  const { recipes } = loadContent()
  const order = recipes.map((r) => CHAPTERS.indexOf(r.chapter))
  expect([...order].sort((a, b) => a - b)).toEqual(order)
})
```

- [ ] **Step 2: Spustit test – musí selhat (modul neexistuje)**

Run: `npx vitest run src/content/loadContent.test.ts`

- [ ] **Step 3: Implementace**

```ts
// src/content/loadContent.ts
import { RecipeSchema, IngredientSchema, CHAPTERS } from '@/domain/schema'
import type { Recipe, Ingredient } from '@/domain/types'

const recipeModules = import.meta.glob('../../data/recipes/*.json', { eager: true, import: 'default' }) as Record<string, unknown>
import ingredientsJson from '../../data/ingredients.json'

let cache: { recipes: Recipe[]; ingredients: Map<string, Ingredient> } | null = null

export function loadContent() {
  if (cache) return cache
  const recipes = Object.values(recipeModules).map((m) => RecipeSchema.parse(m))
  recipes.sort((a, b) => CHAPTERS.indexOf(a.chapter) - CHAPTERS.indexOf(b.chapter) || a.title.localeCompare(b.title, 'cs'))
  const ingredients = new Map<string, Ingredient>()
  for (const raw of ingredientsJson as unknown[]) { const i = IngredientSchema.parse(raw); ingredients.set(i.id, i) }
  cache = { recipes, ingredients }
  return cache
}
```

`src/content/chapters.ts`: `CHAPTER_META` pro všech 9 kapitol – `title` (Polévky, Z jednoho hrnce, Maso a ryby, Bezmasá a luštěniny, Přílohy a zelenina, Těstoviny a rýže, Snídaně a pečivo, Sladké, Nápoje), `quote` + `quoteSource` (citát z jedné ze čtyř knih, česky s originálem v závorce – vyber z `extracted/` úvodních textů nebo z `quote` polí receptů; nic nevymýšlet, u každého citátu uvést knihu a PDF stranu), `intro` (2–3 věty o kapitole).
`src/content/books.ts`: `BOOK_META` – `afrs-2003` („Armed Forces Recipe Service“, 2003, era `afrs-2003`), `navy-1944` („The Cook Book of the United States Navy“, 1944), `italian-1919` („The Italian Cook Book“, Maria Gentile, 1919), `feldkochbuch-1940` („Feldkochbuch“, 1940), `vlastni` („Vlastní recepty“). `description` 2–3 věty historie (z `analysis/*.md`).

Test `chapters.test.ts`: každá kapitola z `CHAPTERS` má meta s neprázdným `title`, `quote`, `quoteSource`; každá kniha z `BOOKS` má meta.

- [ ] **Step 4: Testy zelené, `npm run build`**
- [ ] **Step 5: Commit** `git add src/content tsconfig.app.json && git commit -m "feat(content): načtení receptů a surovin, metadata kapitol a knih"`

### Task 2: Sestavení stránek knihy (`buildPages`)

**Files:**
- Create: `src/content/buildPages.ts`, `src/content/buildPages.test.ts`
- Modify: `src/book/Book.tsx` (export `BookPageDef` beze změny)

**Interfaces:**
- Consumes: `loadContent`, `CHAPTER_META`, `BookPageDef`.
- Produces:
```ts
export type PageKind = 'cover' | 'about' | 'toc' | 'chapter' | 'recipe' | 'blank' | 'list' | 'settings'
export interface PageEntry { id: string; kind: PageKind; recipeId?: string; chapter?: Chapter; tocPage?: number }
export interface BookLayout { entries: PageEntry[]; recipeIndex: Map<string, number>; chapterIndex: Map<Chapter, number>; tocIndex: number; listIndex: number; settingsIndex: number }
export function buildLayout(recipes: Recipe[], opts: { tocPageCount: number }): BookLayout
```
Pravidla: index 0 cover; 1–2 about; pak `tocPageCount` stránek obsahu; před každou kapitolou vložit `blank` tak, aby úvod kapitoly měl sudý index (pravá strana); recepty kapitoly po jednom; na konci `list` (sudý index, blank před) a `settings` (poslední). Rendering (`render`) doplní Task 10 – zde jen layout (čistá funkce).

- [ ] **Step 1: Testy**

```ts
test('obal 0, úvod 1–2, kapitoly na pravé straně', () => {
  const layout = buildLayout(recipes, { tocPageCount: 2 })
  expect(layout.entries[0].kind).toBe('cover')
  expect(layout.entries[1].kind).toBe('about'); expect(layout.entries[2].kind).toBe('about')
  expect(layout.tocIndex).toBe(3)
  for (const idx of layout.chapterIndex.values()) expect(idx % 2).toBe(0)
  expect(layout.listIndex % 2).toBe(0)
  expect(layout.settingsIndex).toBe(layout.entries.length - 1)
})
test('každý recept má právě jednu stránku a index', () => { /* recipeIndex.size === recipes.length; entries.filter(kind==='recipe').length === recipes.length */ })
test('prázdné stránky jen před kapitolou nebo seznamem', () => { /* každá blank je následována chapter/list */ })
```

- [ ] **Step 2–4:** fail → implementace → pass. **Step 5: Commit** `feat(content): layout stránek knihy`.

### Task 3: Hash routing a řízený index knihy

**Files:**
- Create: `src/app/route.ts`, `src/app/route.test.ts`, `src/app/useHashRoute.ts`, `src/app/useHashRoute.test.tsx`
- Modify: `src/book/Book.tsx` (přidat volitelný řízený `index?: number`; když je zadán, interní stav se synchronizuje s ním přes `useEffect`), `src/book/Book.test.tsx` (test řízeného indexu)

**Interfaces:**
- `parseRoute(hash: string): Route` kde `Route = {kind:'cover'} | {kind:'recipe', id} | {kind:'chapter', id: Chapter} | {kind:'toc'} | {kind:'list'} | {kind:'settings'}`; `routeToHash(route): string`; `routeToIndex(route, layout): number | null` (null = neznámý recept/kapitola); `indexToRoute(index, layout): Route` (recept → `recipe`, úvod kapitoly → `chapter`, obsah → `toc`, jinak nejbližší předchozí kapitola/recept vlevo na dvoustraně; obal → `cover`).
- `useHashRoute(layout): { index: number; setIndex(i: number): void }` – čte `location.hash` při startu a na `hashchange`; `setIndex` volá `history.replaceState(null, '', '#' + hash)`.

- [ ] **Step 1: Testy** `parseRoute('#/recept/hovezi-gulas')`, `parseRoute('')`, `parseRoute('#/nesmysl')` → cover; `routeToIndex({kind:'recipe', id:'neexistuje'})` → null; hook: nastavení `location.hash = '#/kapitola/polevky'` + dispatch `hashchange` → index kapitoly; neznámý hash → index 0 a hash vyčištěn.
- [ ] **Step 2–4:** fail → implementace → pass. Book: `index` prop + test „změna prop index přerenderuje stránku“. **Step 5: Commit** `feat(app): hash routing a řízený index knihy`.

### Task 4: Uživatelský stav (oblíbené, poznámky) s localStorage

**Files:**
- Create: `src/state/userState.ts`, `src/state/userState.test.ts`, `src/state/UserStateProvider.tsx`, `src/state/UserStateProvider.test.tsx`

**Interfaces:**
```ts
export interface UserState { version: 1; people: { adults: number; children: number }; dayFactor: number; cart: { recipeId: string; multiplier: number }[]; favorites: string[]; notes: Record<string, string>; customRecipes: unknown[]; settings: { childCoef: number; kcalTarget?: number; historicalIngredients: boolean } }
export const DEFAULT_USER_STATE: UserState
export function loadUserState(storage: Pick<Storage,'getItem'>): UserState   // neplatný/poškozený JSON → default
export function saveUserState(storage: Pick<Storage,'setItem'>, s: UserState): void
export function toggleFavorite(s: UserState, recipeId: string): UserState
export function setNote(s: UserState, recipeId: string, text: string): UserState  // prázdný text smaže klíč
// Provider + hook
export function UserStateProvider({ children, storage = window.localStorage })
export function useUserState(): { state: UserState; toggleFavorite(id): void; setNote(id, text): void; update(patch: Partial<UserState>): void }
```
Ukládání: debounce 300 ms, `try/catch` kolem `localStorage` (soukromý režim).

- [ ] **Step 1: Testy** čisté funkce (immutabilita, toggle 2× = původní, prázdná poznámka maže), load z poškozeného JSON → default, provider: toggle → `storage.setItem` zavoláno s JSON obsahujícím id (fake timers).
- [ ] **Step 2–4:** fail → implementace → pass. **Step 5: Commit** `feat(state): uživatelský stav s localStorage`.

### Task 5: Fonty a styly epoch

**Files:**
- Modify: `package.json` (přidat `@fontsource/eb-garamond`, `@fontsource/ibm-plex-sans`, `@fontsource/special-elite`, `@fontsource/caveat`), `src/main.tsx` (importy CSS fontů: `@fontsource/eb-garamond/latin-ext-400.css`, `…/latin-ext-700.css`, `…/latin-ext-400-italic.css`, `@fontsource/ibm-plex-sans/latin-ext-400.css`, `…/latin-ext-600.css`, `@fontsource/special-elite/latin-400.css`, `@fontsource/caveat/latin-ext-400.css`), `src/styles/global.css` (proměnné `--font-body`, `--font-table`, `--font-typewriter`, `--font-hand`; `body { font-family: var(--font-body) }`)
- Create: `src/styles/themes.css` (třídy `era--*`), `src/styles/typography.css` (nadpisy, ornamentální oddělovač `.ornament` jako inline SVG background, `.small-caps`)
- Test: `src/styles/themes.test.ts` (parsuje CSS soubor jako text a ověří, že existuje selektor pro každou hodnotu `BOOKS`)

Témata (jen CSS, žádné obrázky): `era--italian-1919` (teplejší krémový papír `--paper: #f6ecd4`, nadpisy kurzívou Garamond, tenké dvojité linky), `era--feldkochbuch-1940` (šedavý papír `#ece4cf`, nadpisy velkými písmeny s rozpalem, tučné jednoduché linky), `era--navy-1944` (modrošedý nádech `#e9e6d6`, nadpisy IBM Plex Sans velkými písmeny, tabulka surovin s linkovanými řádky „formulář“), `era--afrs-2003` (bílejší papír `#f4f1e8`, nadpisy IBM Plex Sans, tabulka s hlavičkou), `era--vlastni` (tone `note`, vše Caveat, lehké natočení `rotate(-0.6deg)`).

- [ ] Step 1: test selektorů → fail; Step 2: npm install + CSS; Step 3: pass, `npm run build` (ověřit, že woff2 se dostaly do `dist/assets`); Step 4: Commit `feat(styles): self-hosted fonty a styly epoch`.

### Task 6: Obal a úvodní dvoustrana

**Files:**
- Create: `src/pages/CoverPage.tsx`, `src/pages/AboutPages.tsx`, `src/pages/CoverPage.test.tsx`, `src/pages/AboutPages.test.tsx`, `src/pages/ornaments.tsx` (3 inline SVG: rámeček obalu, vinětka, oddělovač)
- Modify: `src/styles/paper.css` (`.page--cover` zlatý rámeček a titul)

`CoverPage`: název „Kuchařka“ (konfigurovatelný `title` prop, výchozí „Kuchařka pro tábory, výlety a hubené měsíce“), podtitul se čtyřmi zdroji a roky, SVG rámeček, dole „Otoč stránku →“ (na mobilu „Přejeď prstem“). `AboutPages`: `AboutLeft` (co kniha je, jak funguje přepočet osob a košík – 2 odstavce, odkaz-tlačítko „Přejít na obsah“ volající `onNavigate(route)`), `AboutRight` (čtyři zdroje z `BOOK_META` s rokem a popisem, u každého jeden citát – použij `quote` z receptů dané knihy, které ho mají; jinak bez citátu).

- [ ] Testy: render obsahuje názvy všech 4 knih; tlačítko „Přejít na obsah“ volá `onNavigate({kind:'toc'})`. Commit `feat(pages): obal a úvodní dvoustrana`.

### Task 7: Stránka receptu

**Files:**
- Create: `src/pages/RecipePage.tsx`, `src/pages/RecipePage.test.tsx`, `src/pages/IngredientTable.tsx`, `src/pages/IngredientTable.test.tsx`, `src/pages/NoteMargin.tsx`, `src/pages/NoteMargin.test.tsx`, `src/pages/DogEar.tsx`, `src/pages/labels.ts` (české popisky tagů, vybavení, alergenů, jednotek, obtížnosti: `TAG_LABEL`, `EQUIPMENT_LABEL`, `ALLERGEN_LABEL`, `UNIT_LABEL`, `formatAmount(amount, unit)` – `0.5 ks` → „½ ks“, `1.15 ks` → „1 ks“ po zaokrouhlení `roundAmount`, `spetka` → „špetka“), `src/pages/labels.test.ts`
- Modify: `src/styles/paper.css` (okraj pro poznámky `.page--with-margin`), `src/styles/themes.css`

**Interfaces:**
```ts
<RecipePage recipe={Recipe} ingredients={Map} favorite={boolean} note={string} onToggleFavorite={() => void} onNoteChange={(text) => void} mode={'spread'|'single'} />
<IngredientTable recipe ingredients servings={4} perPerson />   // sloupce: surovina, množství pro 4 (roundAmount), šedě „na osobu“ (scaleLine k = 1/4); řádek s `original` + přepínač historických surovin je fáze 5 → zatím zobraz modernizovanou surovinu a pod ní drobně „původně: <název originálu> <množství>“; `group` → mezititulek
<NoteMargin note onChange mode />  // desktop: pruh v okraji (klik → textarea Caveat, blur uloží); mobil: tlačítko tužky pod receptem rozbalí textarea
<DogEar active onToggle />          // pravý horní roh, button aria-pressed, CSS trojúhelník „ohnutý roh“
```
Obsah stránky: `h2` název, `small` původní název, řádek štítků (tagy jako pilulky, vybavení ikonou-textem, obtížnost „●●○“, čas „45 min“), alergeny (řádek „Alergeny: lepek, mléko“ nebo „bez alergenů“), `IngredientTable`, `ol` kroků, `modernNote` v rámečku „Poznámka k modernizaci“, patička `footer.source` strojopisem: „Zdroj: The Cook Book of the United States Navy, 1944, s. 226 (PDF) · Scotch Broth“ + `verified ? '' : ' · čísla odhadnuta'`. Kořen má třídu `era--<book>`.

- [ ] Testy: render chilli-con-carne (z `loadContent`) obsahuje všech 15 surovin, 4 porce i hodnotu na osobu (např. sůl 4 porce 6 g → na osobu ≈ 2 g – vypočti přes `scaleLine` v testu); dog-ear `aria-pressed` odpovídá `favorite` a volá `onToggleFavorite`; poznámka: klik do okraje → textarea s hodnotou `note`, změna + blur → `onNoteChange`; `formatAmount(0.5,'ks')` → „½ ks“, `formatAmount(1,'spetka')` → „špetka“; recept `vlastni` dostane třídu `era--vlastni`.
- [ ] Commit `feat(pages): stránka receptu s tabulkou surovin, oslím uchem a poznámkou`.

### Task 8: Obsah, filtry a vyhledávání

**Files:**
- Create: `src/content/search.ts`, `src/content/search.test.ts`, `src/pages/TocPages.tsx`, `src/pages/TocPages.test.tsx`, `src/pages/SearchOverlay.tsx`, `src/pages/SearchOverlay.test.tsx`

**Interfaces:**
```ts
export interface Filter { tags: Tag[]; equipment: Equipment[]; books: Book[]; favoritesOnly: boolean; query: string }
export const EMPTY_FILTER: Filter
export function normalize(s: string): string   // lower + odstranění diakritiky (NFD + /\p{M}/gu)
export function filterRecipes(recipes, ingredients, filter, favorites: Set<string>): Recipe[]  // query hledá v title, titleOriginal, názvech + aliasech surovin receptu
export function paginateToc(items, perPage): items[][]
```
`TocPages`: obsah rozdělený na stránky (`tocPageCount` = `Math.max(1, ceil(řádků / 28))` – kapitola = nadpis, recept = řádek „název …… číslo stránky“ s malým srdíčkem u oblíbených; na první stránce obsahu panel filtrů: štítky (toggle pilulky), vybavení, zdroj (4 knihy), „jen oblíbené“; stav filtru drží `App` a předává; výsledek filtrování nahradí plný seznam; prázdný výsledek → text „Nic nenalezeno.“ nebo u oblíbených „Zatím žádné oblíbené recepty – ohni roh stránky.“. Klik na řádek → `onNavigate({kind:'recipe', id})`.
`SearchOverlay`: tlačítko lupy v rohu knihy (mimo stránky, vždy viditelné), otevře `role="dialog"` s inputem (autofocus), výsledky (max 20, název + kapitola + kniha), Enter/klik → navigace a zavření, Escape zavře. Počet stránek obsahu se počítá z nefiltrovaného seznamu (layout se nemění filtrem).

- [ ] Testy: `normalize('Čočková polévka')` → `cockova polevka`; `filterRecipes` s query „cocka“ vrátí `cockova-polevka`; query „treska“ najde `pecena-ryba` přes surovinu; `favoritesOnly` s prázdnými oblíbenými → []; tag `bez-masa` + kniha `navy-1944` průnik; `paginateToc` rozdělí 60 položek po 28 na 3 stránky. Komponenty: prázdný stav text; klik na řádek volá `onNavigate`; overlay Escape zavře.
- [ ] Commit `feat(pages): obsah s filtry a vyhledávání`.

### Task 9: Úvodní stránky kapitol

**Files:**
- Create: `src/pages/ChapterPage.tsx`, `src/pages/ChapterPage.test.tsx`, `src/pages/illustrations.tsx` (9 jednoduchých inline SVG siluet: hrnec s párou, kotlík, ryba, luštěniny/mísa, mrkev, vařečka s nudlemi, hrnek s rohlíkem, koláč, džbán; monochromatické, `currentColor`, `aria-hidden`)

`ChapterPage`: název kapitoly velkým písmem, ornament, citát kurzívou + zdroj citátu strojopisem, `intro`, ilustrace, seznam receptů kapitoly (název + strana) jako mini-obsah. Testy: render polévek obsahuje citát a názvy všech receptů kapitoly; každá kapitola má ilustraci (snapshot počtu `<svg>`).

- [ ] Commit `feat(pages): úvodní stránky kapitol s citáty a ilustracemi`.

### Task 10: Sestavení knihy v App + odložené drobnosti z fáze 1

**Files:**
- Modify: `src/App.tsx` (Provider, `loadContent`, `buildLayout`, `useHashRoute`, stav filtru, `pages = entries.map(e => ({ id, tone, render }))` s komponentami z Tasků 6–9; `aria-live` region „Strana N z M – <název>“; `SearchOverlay`; placeholdery pro `list` a `settings`), `src/App.test.tsx`, `src/book/Book.tsx`, `src/styles/book.css`, `src/styles/paper.css`
- Delete: `src/demo/demoPages.tsx`

Odložené z fáze 1 (každé jeden commit nebo dohromady, ale s testy kde to jde): memoizace `render()` výsledků stránek během flipu (`useMemo` na pole `pages` + `React.memo(Page)`); `user-select: none` jen na `.page-edge` a flipperu (ne na obsahu stránky, aby šel text kopírovat); hover gradient úchytu jen `@media (hover: hover)`; `dvh` fallback (`height: 92vh` před `92dvh`); `clampIndex` při změně režimu volá `onIndexChange`; číslo stránky na otáčeném listu (předat `pageNumber`); úchop překrývá 20 px obsahu → `padding-inline` obsahu ≥ `--edge-zone`.

- [ ] Testy: `App` vyrenderuje obal; `location.hash = '#/recept/hovezi-gulas'` → stránka s názvem „Hovězí guláš“ viditelná; `aria-live` obsahuje „Strana“. Commit `feat(app): kniha nad skutečným obsahem, routing, aria-live`.

### Task 11: Ruční kontrola v prohlížeči a opravy

**Files:** podle nálezů; zápis do `docs/superpowers/plans/2026-10-14-phase4-book-pages.md` pod „Nálezy z ruční kontroly“.

Implementátor použije skill `agent-browser` (vlastní dev server `npm run dev -- --port <volný> --strictPort`, po skončení zastavit). Scénáře: desktop 1390×800 – obal, otočení na úvod, obsah: filtr `bez-masa` + hledání „cocka“, klik na recept → hash se změní, oslí ucho → srdíčko v obsahu, poznámka v okraji přežije otočení a reload; zpět/vpřed prohlížeče; mobil 390 px a 320 px – `scrollWidth === innerWidth`, recept s 15 surovinami scrolluje uvnitř stránky, tužka otevře poznámku, lupa funguje. Screenshoty do scratchpadu. Každý nález opravit a otestovat; nic „odložit“ bez zápisu.

- [ ] Commit `fix(ui): nálezy z ruční kontroly fáze 4`.

## Nálezy z ruční kontroly

Ověřeno v prohlížeči (agent-browser, reálný pointer, desktop 1390×800, mobil 390 a 320 px). Screenshoty: scratchpad `t11/`. Otáčení se v prohlížeči na pozadí neanimuje (rAF stojí), proto se klik/klávesa/drag ověřily s `prefers-reduced-motion`; průběh tažení z rohu ověřen screenshotem uprostřed tahu.

Bez nálezu: obal → úvodní dvoustrana (drag z rohu, klik na ›, šipka); šipky v poli hledání nelistují (ošetřeno v `Book.tsx`, test „šipka uvnitř inputu nelistuje“ už existuje); filtr `bez-masa`; hledání „cocka“; klik na recept změní hash i hlášení `aria-live`; oslí ucho → srdíčko v obsahu; poznámka přežije otočení i reload; `scrollWidth === innerWidth` na všech routách při 390 i 320 px; recept s 20 surovinami (`zeleninove-kari-s-ryzi`) scrolluje uvnitř stránky; tužka a lupa na mobilu.

1. **Číslo stránky překrývalo scrollující obsah** (obsah, recepty; `src/styles/paper.css`). Opraveno: `.page-content:has(+ .page-number)` je o pruh pro číslo kratší. Bez jednotkového testu (čisté CSS, jsdom nepočítá layout) – ověřeno screenshotem.
2. **Srdíčko v obsahu posouvalo číslo stránky** doleva oproti ostatním řádkům. Opraveno: srdíčko je `position: absolute` vně řádku (`.toc-heart`).
3. **Klik na recept z obsahu/hledání/„Přejít na obsah“ přepsal historii** – „zpět“ nevedlo na obsah. Opraveno: `useHashRoute` má `jumpTo` (pushState), listování dál používá `replaceState`; `App.navigate` používá `jumpTo`. Testy v `useHashRoute.test.tsx` (2).
4. **Hledání řadilo podle pořadí knihy** – „guláš“ + Enter šel na Kroupovou polévku (shoda přes surovinu) a shoda v názvu mohla vypadnout z limitu 20. Opraveno: stabilní řazení, shoda v názvu receptu první (`SearchOverlay.tsx`). Test „shoda v názvu receptu je před shodou v surovinách“.
5. **Mobil 320 px: stránka jen 250 px široká** (tlačítka listování po stranách), tabulka surovin klipovaná. Opraveno: v `book--single` jsou tlačítka pod stránkou (`book.css`), stránka zabírá celou šířku. Bez testu (CSS), ověřeno 390/320 px.
6. **Oslí ucho překrývalo název receptu** (zejména 320 px). Opraveno: `.recipe-page h2 { padding-right: 2.6rem }`.
7. **Obálka při 320 px přetékala rám a hint „Přejeď prstem“ se překrýval se zdroji.** Opraveno: container query jednotky (`cqw`) pro velikost písma a mezery obálky; desktop beze změny.

Odloženo (s důvodem):
- Reload na úvodní dvoustraně (index 1/2) vrátí na obal: hash routy z globálních omezení pro „O této knize“ žádnou routu nemají (`#/` = obal). Změna by vyžadovala novou routu mimo spec fáze 4.
- Na obalu jsou dva `h1` („Kuchařka“ skrytý v `App` a název na obálce): kosmetika a11y, beze změny chování; sloučit při práci na fázi 7.
- Textarea poznámky na mobilu může být při editaci částečně pod spodním okrajem stránky (scroll uvnitř stránky ji ukáže); drobnost, bez opravy.
