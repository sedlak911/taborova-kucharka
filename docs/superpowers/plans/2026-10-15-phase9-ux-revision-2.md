# Fáze 9: UX revize 2 (domů → obsah, tisk a košík mimo knihu, tlačítka receptu vpravo, bez „uvařeno“, obsah podle naměřené výšky, mobil: recept na jedné stránce + funkční swipe) – implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zapracovat všechny body **[R2]** ze specu (§2 a §8 bod 9): domů skáče na obsah, tisk a skok na košík jsou mimo knihu vedle lupy, srdíčko a košík receptu jsou na pravé straně (na mobilu v samostatném řádku jediné stránky), „uvařeno“ zmizí z UI i ze stavu, obsah se stránkuje podle naměřené výšky stránky a řádků, „pokračuje ↓“ září jen kolem nápisu, obálka má zlatý rám u rohů a okrajů a na mobilu je recept jedna scrollovatelná stránka a švih prstem listuje.

**Architecture:** Režim knihy (`single`/`spread`) přebírá `App` (`useViewMode`) a staví podle něj layout: v režimu `single` je recept jedna položka layoutu (`half: 'full'`) a prázdné stránky odpadají, takže čísla stran v obsahu jsou vždy čísla aktuálního režimu. Stránkování obsahu počítá s naměřenými výškami: `Book` má neviditelný měřicí slot o rozměru jedné stránky, `TocProbe` do něj vykreslí hlavičku a všechny řádky obsahu, `measureToc` je změří a `paginateTocRows` z nich skládá stránky (bez měření, např. v jsdom, platí dosavadní odhad v jednotkách). `useFlipDrag` rozpozná u dotyku švih kdekoli na stránce (vodorovně vs. svislý scroll). Tisk a košík jsou nová tlačítka v `BookControls`, tisk volá tutéž úlohu jako Ctrl+P (`printJobForRoute`). „Uvařeno“ se odstraní ze schématu `UserState` (z.object neznámé pole při načtení zahodí, jako dříve `notes`).

**Tech Stack:** Vite 8, React 19, TypeScript 6, zod 4, Vitest 4 + Testing Library + user-event 14 (jsdom, `css: false`, `globals: true`), oxlint. Bez UI knihovny, bez nové npm závislosti. Ruční kontrola skillem `agent-browser` (reálný pointer, dotyk přes CDP `Input.dispatchTouchEvent`, PDF přes CDP `Page.printToPDF`).

**Spec:** `docs/superpowers/specs/2026-10-14-cookbook-design.md` – všechny body **[R2]** v §2 (otáčení a swipe, ovládací prvky, obal, obsah, recept, „pokračuje ↓“, oblíbené/uvařeno) a §8 bod 9; §5.2 (`cooked` z `UserState` pryč). [R2] má přednost před dřívějším textem specu. Navazuje na HEAD `7621e8b` (fáze 1–8 sloučené v `main`). Nejbližší tvarem je plán fáze 4b `docs/superpowers/plans/2026-10-15-phase4b-ux-revision.md`, konvence podle plánu fáze 8 `docs/superpowers/plans/2026-10-15-phase8-custom-recipes.md`.

## Global Constraints

- Čeština s diakritikou v UI, identifikátory anglicky. Bez UI knihovny. **Žádná nová npm závislost.**
- **Implementátoři necommitují.** Každý task končí krokem „Předat controlleru“ se seznamem změněných souborů. Commit dělá controller (zpráva česky s diakritikou, explicitní `git add <soubory>`, nikdy `-A`, smazané soubory přes `git rm`).
- Testy Vitest + Testing Library pro každou čistou funkci a komponentu. `localStorage.setItem` v jsdom pod tímto Node nefunguje spolehlivě: uložený stav pro `App` se připravuje **jen** přes `seedUserState` ze `src/test/seedState.ts` (vrací mapu se zapsanými hodnotami, uklidí `vi.unstubAllGlobals()`).
- Po každém tasku musí projít čistě `npm test`, `npm run lint`, `npm run build` a `npm run validate`.
- Soubory v `src/domain/` a `src/state/userState.ts` importují jen relativně (beze změny). Podle oxlint `react/only-export-components` patří ne-komponentové exporty do `.ts` souborů (v `.tsx` jen komponenty).
- Hash routy (`src/app/route.ts`) se nemění. `useHashRoute` po změně obsahu layoutu (režim, počet stránek obsahu, vlastní recept) najde stránku znovu podle hashe (ruling R8 fáze 8) – tohle chování se nemění, jen se layout teď mění i se změnou režimu a s naměřenou výškou stránky.
- Pořadí stránek (spec §2): obal (0) → „O této knize“ (1–2) → obsah (od indexu 3) → kapitoly v pořadí `CHAPTERS` → košík → nákupní seznam → tiráž. **Desktop (`spread`):** pravidla parity beze změny (úvod kapitoly a seznam vpravo, recept = dvoustrana levá lichá + pravá sudá, prázdná stránka jen před kapitolou nebo košíkem). **Mobil (`single`):** bez prázdných stránek, recept = jedna stránka.
- Koncept receptu zůstává (spec §2): vlevo informace + nákup (název, původní název, kniha, čas, obtížnost, vybavení, alergeny, suroviny, nutrice), vpravo postup (postup, poznámka, patička zdroje). Na mobilu jsou obě části pod sebou na jedné stránce v tomto pořadí. Bez štítků na stránce receptu.
- Tlačítka receptu: srdíčko (oblíbené) a košík jsou na **pravé** straně dvoustrany v samostatném řádku `.recipe-actions` (ne v nadpisu), na mobilu v témže řádku nahoře na jediné stránce. Na stránce receptu **není** tlačítko tisku ani nápověda k tisku. „Upravit“/„Smazat“ vlastního receptu zůstávají u údajů (levá strana, na mobilu pod názvem).
- Ovládání knihy `.book-controls` (pevně vpravo nahoře, mimo stránky) v pořadí: Domů (→ obsah) · Tisk (podle stránky, jako Ctrl+P) · Košík (skok na stránku košíku) · Celá obrazovka (jen s Fullscreen API) · Hledat. Všechna tlačítka mají `aria-label`. Záložka (`Bookmark`) zůstává beze změny.
- „Uvařeno“ (`cooked`) neexistuje v UI ani v `UserState`. Starší uložený stav, záloha nebo soubor serveru s `cooked` se načte (ostatní pole zůstanou) a `cooked` se tiše zahodí; nové uložení ho neobsahuje. `version` zůstává `1`, klíč `kucharka.userState.v1` beze změny.
- Mobil: žádný vodorovný scroll (`document.documentElement.scrollWidth === innerWidth` při 390 i 320 px). Obsah stránky scrolluje svisle uvnitř stránky (`touch-action: pan-y`).
- `prefers-reduced-motion` respektovat (beze změny), neaktivní stránky `inert` (beze změny), měřicí slot je `aria-hidden` a `inert`.
- Poslední task je ruční kontrola skillem `agent-browser`: reálný pointer, dotyk (švih) přes CDP na 390 a 320 px, desktop 1390×800, tisk do PDF přes CDP `Page.printToPDF` s `preferCSSPageSize: true`.

## Review Focus

1. **Stránkování obsahu podle měření v nečekaných podmínkách** – písma se načtou až po prvním měření, okno se zmenší, telefon se otočí na šířku (hlavička s filtry je vyšší než celá stránka), nebo je kniha skrytá (tisk, nulové výšky). Očekávání: žádná stránka obsahu nepřeteče ani nezůstane zbytečně poloprázdná, první stránka smí zůstat jen s filtry, nulové měření se ignoruje (platí poslední dobré nebo odhad) a měření ↔ layout se nezacyklí. Testy: Task 8 („žádná stránka nepřeteče a každá je zaplněná“, „hlavička vyšší než stránka“, „nepoužitelné měření → odhad“), Task 9 (`sameMetrics`, „bez rozložení nic nehlásí“, App „naměřená kapacita: celý obsah na jedné stránce“ – projde bez smyčky).
2. **Uložený stav s `cooked`** (localStorage z fází 4b–8, záloha JSON, `userdata/user-state.json`) – musí se načíst bez ztráty oblíbených a košíku a `cooked` se při dalším uložení nesmí vrátit. Testy: Task 1 (`loadUserState`, `parseUserState`, App se `seedUserState`).
3. **Švih prstem vs. ostatní dotyky** – svislý scroll dlouhého receptu, klepnutí na řádek obsahu nebo tlačítko, švih začínající na tlačítku, tah ve formulářovém poli nebo ve vodorovně scrollující tabulce, švih na první/poslední stránce. Očekávání: svislý tah scrolluje, klepnutí funguje, vodorovný švih listuje a klik na konci švihu se neprovede, pole a široké tabulky si tah nechají. Testy: Task 7 (`classifySwipe`, `isSwipeStartAllowed`, hook: vertikální/klepnutí/zakázaný směr/spolknutý klik, `Book`: švih na obsahu listuje).
4. **Přepnutí režimu (otočení telefonu, zúžení okna) a tisk** – na pravé polovině receptu, v obsahu, při otevřeném tisku. Očekávání: zůstane stejný recept (hash), čísla stran v obsahu odpovídají novému režimu, tisk režim ani layout nemění. Testy: Task 6 (`buildLayout` single, App „mobil: čísla stran v obsahu…“, App „přepnutí single→spread→single zachová hash“, Book „tisk režim nemění“).
5. **Úzký displej 320 px** – pět tlačítek ovládání vedle záložky, řádek tlačítek receptu vedle názvu. Očekávání: nic se nepřekrývá, každé tlačítko má `elementFromPoint` = samo sebe, název receptu se nesráží s ikonami. Testy: Task 4 (CSS pravidlo `@media (max-width: 380px)`), Task 5 (tlačítka v samostatném řádku mimo nadpis), Task 10 (měření obdélníků na 320 px).

## Rozhodnutí fáze 9 (rulings)

- **R1 – Domů = obsah:** tlačítko si nechává přístupné jméno „Domů“ (spec mu tak říká), `title` je „Domů – na obsah“ a volá `navigate({ kind: 'toc' })` (skok přes `jumpTo`, tedy záznam do historie). Na obálku se dostaneš listováním zpět.
- **R2 – Tisk mimo knihu = Ctrl+P:** tlačítko volá `print(printJobForRoute(indexToRoute(index, layout)))`, tedy přesně úlohu, kterou by vytiskl Ctrl+P: recept → A4 recept, košík a nákupní seznam → nákupní seznam, jinde obsah. Přístupné jméno říká, co se vytiskne (`PRINT_JOB_LABEL`: „Tisk: recept (A4)“, „Tisk: nákupní seznam (A4)“, „Tisk: obsah (A4)“), nápověda `PRINT_HINT` je popis (`aria-describedby`) a součást `title`. Volba brožurka/jen seznam zůstává tlačítky na stránce košíku, tlačítko „Tisknout nákupní seznam“ na stránce seznamu také zůstává (nejsou to tlačítka receptu).
- **R3 – Košík mimo knihu:** tlačítko „Jít na košík (N receptů)“ skočí na stránku košíku (`navigate({ kind: 'cart' })`), počet ukazuje odznak (jen když N > 0). Záložka (osoby, náročnost dne, „Otevřít košík“) se nemění. Na ≤ 380 px jsou tlačítka ovládání 2,1rem s mezerou 0,25rem, aby se pět tlačítek vešlo vedle záložky.
- **R4 – Tlačítka receptu vpravo:** `RecipeActions` (srdíčko + košík) je samostatný řádek zarovnaný doprava nad živým záhlavím pravé strany. Na mobilu (`RecipeSingle`) je týž řádek nahoře nad názvem. Nikdy nejsou uvnitř `h2`/`header`, takže se s názvem nesrazí ani na 320 px. Levá strana nemá žádná funkční tlačítka kromě „Upravit“/„Smazat“ vlastního receptu.
- **R5 – „Uvařeno“ pryč beze stopy:** z `UserState` (typ, výchozí stav, zod schéma), `toggleCooked` (stav i provider), `deleteCustomRecipe`, `Filter.cookedOnly`, `UserMarks.cooked`, `RecipeMarks`, `TocPages` (pilulka, prázdná hláška, ikona v řádku), `PotIcon`, CSS `.mark--cooked`, `backupSummary` a textu importu zálohy. Bez zvýšení `version`: neznámé pole `cooked` zahodí `z.object` stejně jako `notes` (fáze 4b).
- **R6 – Režim vlastní `App`:** `useViewMode()` volá `App` a předává `mode` do `Book` (nový nepovinný prop; bez něj si ho `Book` zjistí sám). Layout se staví pro aktuální režim: `buildLayout(recipes, { tocPageCount, mode })`. V režimu `single` je recept jedna položka `{ kind: 'recipe', half: 'full', id: 'recipe-<id>' }` a `alignToRight`/`alignToLeft` nic nevkládají. Číslo strany = index v layoutu aktuálního režimu, takže obsah, mini-obsah kapitoly i tištěný obsah ukazují čísla aktuálního režimu.
- **R7 – Tisk režim nemění:** `useViewMode` už při `beforeprint` nepřepíná na `spread` a změny dotazu během tisku (`matchMedia('print').matches`) ignoruje. Dřívější důvod (tisk knihy po polovinách) odpadl: tiskne se tiskový strom `PrintRoot` a na mobilu je recept jedna stránka.
- **R8 – Změna layoutu = stránka podle hashe** (beze změny z fáze 8): po změně režimu se z pravé poloviny receptu stane celá stránka téhož receptu (a naopak levá polovina). Po změně počtu stránek obsahu (měření, otočení) se z kterékoli stránky obsahu přejde na první stránku obsahu. Vědomý kompromis.
- **R9 – Obsah podle naměřené výšky:** `Book` má prop `measure` → neviditelný slot `.book__measure` (absolutně v `.book__spread`, šířka jedné stránky, výška stránky, `visibility: hidden`, `aria-hidden`, `inert`). `TocProbe` v něm vykreslí stránku s hlavičkou (`TocHead`) a **všemi** řádky obsahu (`TocListItem`, stejná komponenta jako na skutečné stránce), s číslem strany `888` (stejná šířka nezávislá na layoutu = žádná zpětná vazba). `measureToc` vrátí `{ capacity, head, rows }`: kapacita = `clientHeight` těla `.page-content` bez svislého paddingu, výška hlavičky a každého řádku z `getBoundingClientRect` (`display: flow-root` na `.toc-head` a `.toc-chapter`, takže okraje nadpisů jsou uvnitř měřeného boxu). Měří se v `useLayoutEffect`, znovu přes `ResizeObserver` (okno, režim, načtená písma mění výšku seznamu) a po `document.fonts.ready`. Nové měření se stejnými čísly (na 0,5 px) layout nepřestaví (`sameMetrics`). Měření s nulovými výškami se ignoruje (jsdom, skrytá kniha v tisku). Bez měření platí dosavadní odhad v jednotkách (`TOC_PAGE_UNITS` 16, `TOC_FIRST_PAGE_UNITS` 6, `tocRowUnits`).
- **R10 – Skládání stránek obsahu:** stránka se plní řádky, dokud se vejdou do kapacity minus 2 px (`TOC_SAFETY_PX`). Kapitoly navazují na téže stránce (žádný zlom před kapitolou). Nadpis kapitoly nezůstane sám na konci stránky. První stránka smí zůstat jen s hlavičkou (filtry vyšší než stránka). Filtrovaný obsah se skládá stejnými výškami. Kdyby potřeboval víc stránek než nefiltrovaný, zbytek je na poslední stránce obsahu (beze změny). Prázdná další stránka obsahu při aktivním filtru ukáže „Výsledky filtru jsou na předchozích stranách obsahu.“
- **R11 – Lámání dlouhého názvu v obsahu:** název se láme jen mezi slovy (`overflow-wrap: break-word`, `text-wrap: pretty`, ne `anywhere`). Tečky a číslo strany sedí na posledním řádku názvu (`align-items: last baseline`). Výška dvouřádkového řádku se měří, takže nevzniká rezerva „pro jistotu“ (dřívější jednotka 2 pro názvy nad 18 znaků).
- **R12 – „pokračuje ↓“:** žádný pruh přes šířku stránky. Indikátor je vycentrovaný nápis s kulatou září v barvě stránky (`radial-gradient(closest-side, var(--page-bg, var(--paper)) …, transparent)`) jen pod samotným textem. Komponenta `Page` a `useOverflowHint` se nemění.
- **R13 – Zlatý rám obálky:** rám je u okrajů knihy: dvojitá linka (CSS `border` na `.cover-frame` a `::before`, inset 0,6rem), čtyři ozdobné rohy (jedno SVG zrcadlené přes `transform: scale…`) a čtyři ornamenty uprostřed hran (vodorovné a svislé SVG). Nic se nedeformuje (`preserveAspectRatio="none"` pryč). Velikost rohů `min(7rem, 24cqw)`.
- **R14 – Švih prstem:** u `pointerType` `touch` nebo `pen` se tah smí začít kdekoli na stránce (i na tlačítku nebo řádku obsahu), jen ne ve formulářovém poli (`input, textarea, select, [contenteditable]`) a ne ve vodorovně scrollujícím prvku. O gestu se rozhodne po posunu o 10 px (`SWIPE_SLOP_PX`): vodorovné, když `|dx| ≥ 1,2 × |dy|` (`SWIPE_HORIZONTAL_RATIO`), doleva = vpřed, doprava = zpět. Svislé gesto patří nativnímu scrollu (`touch-action: pan-y` beze změny). Klik do 400 ms po švihu se spolkne (`onClickCapture`), aby švih končící na řádku obsahu neotevřel recept. Myš dál otáčí jen z úchytu na okraji (`.page-edge`). Důvod: úchyt 24 px na okraji displeje telefonu koliduje se systémovým gestem zpět (iOS Safari, Android) a švih po obsahu dnes nedělal nic.

## Struktura souborů

| Soubor | Odpovědnost | Task |
|---|---|---|
| `src/state/userState.ts`, `src/state/UserStateProvider.tsx`, `src/state/backup.ts` | `UserState` bez `cooked`, bez `toggleCooked`, souhrn zálohy | 1 |
| `src/content/search.ts` | `Filter`/`UserMarks` bez uvařených; `TocMetrics`, `tocRowKey`, `usableMetrics`, stránkování podle výšek | 1, 8 |
| `src/pages/RecipeMarks.tsx`, `src/pages/icons.tsx`, `src/pages/StoragePanel.tsx` | srdíčko + košík (bez hrnce), `PotIcon` pryč, text importu | 1 |
| `src/styles/paper.css` | `.page-more`, obálka, ovládání, `.recipe-actions`, obsah (flow-root, lámání), měřicí stránka | 1, 2, 3, 4, 5, 8, 9 |
| `src/pages/ornaments.tsx`, `src/pages/CoverPage.tsx` (beze změny JSX) | zlatý rám u rohů a okrajů | 3 |
| `src/app/BookControls.tsx`, `src/print/printJob.ts` | domů → obsah, tisk a košík mimo knihu, `PRINT_JOB_LABEL` | 4 |
| `src/pages/RecipePage.tsx` | `RecipeLeft` (údaje), `RecipeRight` (tlačítka + postup), `RecipeSingle` (mobil) | 5 |
| `src/styles/print.css` | tiskové skrývání bez `.mark--print`/`.print-hint`, s `.recipe-actions` a `.book__measure` | 5, 9 |
| `src/book/useViewMode.ts`, `src/book/Book.tsx`, `src/content/buildPages.ts` | režim z `App`, tisk režim nemění, layout pro `single` | 6 |
| `src/book/useFlipDrag.ts` | švih prstem, spolknutí kliku | 7 |
| `src/pages/TocPages.tsx` | `TocHead`, `TocListItem`, `metrics`, hláška prázdné stránky filtru | 1, 8 |
| `src/pages/tocMeasure.ts` (nový), `src/pages/TocProbe.tsx` (nový), `src/book/Book.tsx`, `src/styles/book.css` | měřicí slot a měření obsahu | 9 |
| `src/App.tsx` | zapojení všeho výše | 1, 4, 5, 6, 9 |

---

### Task 1: Zrušit „uvařeno“ (stav, filtr, ikony, záloha)

**Files:**
- Modify: `src/state/userState.ts`, `src/state/UserStateProvider.tsx`, `src/state/backup.ts`
- Modify: `src/content/search.ts`, `src/pages/TocPages.tsx`, `src/pages/RecipeMarks.tsx`, `src/pages/RecipePage.tsx`, `src/pages/icons.tsx`, `src/pages/StoragePanel.tsx`, `src/App.tsx`, `src/styles/paper.css`
- Test: `src/state/userState.test.ts`, `src/state/UserStateProvider.test.tsx`, `src/state/backup.test.ts`, `src/pages/StoragePanel.test.tsx`, `src/content/search.test.ts`, `src/pages/TocPages.test.tsx`, `src/pages/RecipeMarks.test.tsx`, `src/pages/RecipePage.test.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: nic nového.
- Produces:
```ts
// src/state/userState.ts – UserState bez `cooked`; `toggleCooked` neexistuje
export interface UserState { version: 1; people; dayFactor; cart; favorites: string[]; customRecipes: Recipe[]; settings }
// src/content/search.ts
export interface Filter { tags: FilterTag[]; equipment: Equipment[]; books: Book[]; favoritesOnly: boolean; query: string }
export interface UserMarks { favorites: ReadonlySet<string> }
// src/pages/RecipeMarks.tsx
props: { favorite: boolean; onToggleFavorite: () => void; label?: string; compact?: boolean; inCart?: boolean; onToggleCart?: () => void }
// src/pages/TocPages.tsx – props bez `cooked` a `onToggleCooked`
// src/pages/RecipePage.tsx – RecipeLeft props bez `cooked` a `onToggleCooked`
```

- [ ] **Step 1: Napsat failing testy stavu**

V `src/state/userState.test.ts`:
- z importu odebrat `toggleCooked`;
- smazat celý `describe('toggleCooked', …)`;
- v `it('chybějící pole doplní z defaultu', …)` smazat řádek `expect(s.cooked).toEqual([]);`;
- v `it('starší stav s poznámkami …', …)` smazat řádek `expect(s.cooked).toEqual([]);`;
- v `it('neplatné typy polí …', …)` smazat řádek `expect(() => toggleCooked(s, 'r1')).not.toThrow();` (vstup s `"cooked":{}` nechat – musí dál dát výchozí stav);
- `it('zachová platná pole vedle neplatných', …)` nahradit:

```ts
  it('zachová platná pole vedle neplatných', () => {
    const s = loadUserState(storageWith('{"version":1,"favorites":["a",1],"dayFactor":1.2,"cooked":["b"]}'));
    expect(s.favorites).toEqual([]);
    expect(s.dayFactor).toBe(1.2);
    expect('cooked' in s).toBe(false);
  });
```

- v `it('vrácený default nesdílí referenci …', …)` smazat řádek s `cooked`;
- v `it('round-trip přes saveUserState', …)` nahradit `const s = toggleCooked(toggleFavorite(DEFAULT_USER_STATE, 'r9'), 'r8');` za `const s = toggleFavorite(toggleFavorite(DEFAULT_USER_STATE, 'r9'), 'r8');`;
- za `it('starší stav s poznámkami …')` přidat:

```ts
  it('uložený stav s „uvařeno“ (fáze 4b–8) se načte bez něj, ostatní pole zůstanou a nové uložení ho neobsahuje', () => {
    const s = loadUserState(
      storageWith('{"version":1,"favorites":["a"],"cooked":["a","b"],"cart":[{"recipeId":"a","multiplier":2}]}'),
    );
    expect(s.favorites).toEqual(['a']);
    expect(s.cart).toEqual([{ recipeId: 'a', multiplier: 2 }]);
    expect('cooked' in s).toBe(false);
    let stored = '';
    saveUserState({ setItem: (_k, v) => (stored = v) }, s);
    expect(stored).not.toContain('cooked');
  });

  it('záloha nebo soubor serveru s „uvařeno“ projde parseUserState bez něj', () => {
    const s = parseUserState({ version: 1, favorites: ['x'], cooked: ['x'] });
    expect(s?.favorites).toEqual(['x']);
    expect(s && 'cooked' in s).toBe(false);
  });
```

- `it('deleteCustomRecipe odebere recept i z košíku, oblíbených a uvařených', …)` nahradit:

```ts
  it('deleteCustomRecipe odebere recept i z košíku a oblíbených', () => {
    const s = toggleFavorite(toggleCart(upsertCustomRecipe(DEFAULT_USER_STATE, customRecipe()), OWN_ID), OWN_ID);
    const d = deleteCustomRecipe(toggleFavorite(s, 'brownies'), OWN_ID);
    expect(d.customRecipes).toEqual([]);
    expect(d.cart).toEqual([]);
    expect(d.favorites).toEqual(['brownies']);
  });
```

V `src/state/UserStateProvider.test.tsx` nahradit `Probe`:

```tsx
function Probe() {
  const { state, toggleFavorite } = useUserState();
  return (
    <div>
      <span data-testid="favs">{state.favorites.join(',')}</span>
      <button onClick={() => toggleFavorite('r1')}>fav</button>
      <button onClick={() => toggleFavorite('r2')}>fav2</button>
    </div>
  );
}
```

a v testu `it('více změn v rychlém sledu uloží jen jednou (debounce)', …)` nahradit `screen.getByText('cooked').click()` za `screen.getByText('fav2').click()` a poslední očekávání za:

```ts
    expect((storage.setItem.mock.calls[0] as unknown as string[])[1]).toContain('"favorites":["r1","r2"]');
```

(Pokud jiný test v souboru používá `getByTestId('cooked')`, nahradit ho `getByTestId('favs')` se stejným smyslem.)

V `src/state/backup.test.ts` očekávaný souhrn:

```ts
    expect(backupSummary(s)).toBe('oblíbené: 2 · v košíku: 1 · dospělí: 2 · děti: 0 · vlastní recepty: 0');
```

V `src/pages/StoragePanel.test.tsx`: `expect(confirm).toHaveTextContent('oblíbené: 2 · v košíku: 1')` a přidat `expect(confirm).not.toHaveTextContent('uvařen')`.

- [ ] **Step 2: Napsat failing testy UI**

`src/pages/RecipeMarks.test.tsx` celý nahradit:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecipeMarks } from './RecipeMarks'

function setup(over: Partial<React.ComponentProps<typeof RecipeMarks>> = {}) {
  const props = { favorite: false, onToggleFavorite: vi.fn(), ...over }
  return { ...render(<RecipeMarks {...props} />), props }
}

test('srdíčko odráží stav přes aria-pressed a hrnec „uvařeno“ už není', () => {
  setup({ favorite: true })
  expect(screen.getByRole('button', { name: 'Oblíbené' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.queryByRole('button', { name: /Uvařeno/ })).toBeNull()
})

test('klik na srdíčko volá callback', async () => {
  const { props } = setup()
  await userEvent.click(screen.getByRole('button', { name: 'Oblíbené' }))
  expect(props.onToggleFavorite).toHaveBeenCalledTimes(1)
})

test('label se připojí k přístupnému jménu, ikony jsou skryté', () => {
  const { container } = setup({ label: 'Čočková polévka', compact: true, onToggleCart: vi.fn() })
  expect(screen.getByRole('button', { name: 'Oblíbené: Čočková polévka' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Do košíku: Čočková polévka' })).toBeInTheDocument()
  expect(container.querySelector('.recipe-marks--compact')).not.toBeNull()
  container.querySelectorAll('svg').forEach((svg) => expect(svg).toHaveAttribute('aria-hidden', 'true'))
})

test('vyplněná ikona odpovídá stavu', () => {
  const { container } = setup({ favorite: true })
  expect(container.querySelector('.mark--favorite svg')).toHaveAttribute('fill', 'currentColor')
  expect(container.querySelector('.mark--cooked')).toBeNull()
})

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

V `src/content/search.test.ts`:

```ts
const ids = (f: Partial<Filter>, marks: { fav?: string[] } = {}) =>
  filterRecipes(recipes, ingredients, { ...EMPTY_FILTER, ...f }, { favorites: new Set(marks.fav) }).map((r) => r.id)
```

smazat `test('cookedOnly filtruje uvařené', …)` a přidat:

```ts
test('filtr nemá „jen uvařené“', () => expect(Object.keys(EMPTY_FILTER).sort()).toEqual(['books', 'equipment', 'favoritesOnly', 'query', 'tags']))
```

V `src/pages/TocPages.test.tsx`:
- v `setup` odebrat `cooked: new Set<string>(),` a `onToggleCooked: vi.fn(),`;
- smazat `test('prázdné uvařené ukážou nápovědu s hrncem', …)`;
- `test('pilulky „Jen oblíbené“ a „Jen uvařené“', …)` nahradit:

```tsx
test('pilulka „Jen oblíbené“; filtr „Jen uvařené“ je zrušený', () => {
  const { props } = setup()
  fireEvent.click(screen.getByRole('button', { name: 'Jen oblíbené' }))
  expect(props.onFilterChange).toHaveBeenLastCalledWith({ ...EMPTY_FILTER, favoritesOnly: true })
  expect(screen.queryByRole('button', { name: 'Jen uvařené' })).toBeNull()
})
```

- `test('řádek nese srdíčko a hrnec uvnitř řádku, před odkazem', …)` nahradit:

```tsx
test('řádek nese srdíčko uvnitř řádku, před odkazem; hrnec „uvařeno“ není', () => {
  const r = recipes[0]
  const { props } = setup({ favorites: new Set([r.id]) })
  const heart = screen.getByRole('button', { name: `Oblíbené: ${r.title}` })
  expect(heart).toHaveAttribute('aria-pressed', 'true')
  expect(screen.queryByRole('button', { name: `Uvařeno: ${r.title}` })).toBeNull()
  const li = heart.closest('li.toc-recipe')!
  const row = li.querySelector('.toc-row')!
  expect(heart.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  fireEvent.click(heart)
  expect(props.onToggleFavorite).toHaveBeenCalledWith(r.id)
})
```

V `src/pages/RecipePage.test.tsx`:
- v `setupLeft` z `props` odebrat `cooked: false,` a `onToggleCooked: vi.fn(),`;
- `it('srdíčko a hrnec jsou viditelná tlačítka v hlavičce a volají callbacky', …)` nahradit:

```tsx
  it('srdíčko je viditelné tlačítko a hrnec „uvařeno“ není', async () => {
    const { props, container } = setupLeft({ favorite: true })
    const heart = screen.getByRole('button', { name: 'Oblíbené' })
    expect(heart).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: 'Uvařeno' })).toBeNull()
    expect(container.querySelector('.dog-ear')).toBeNull()
    await userEvent.click(heart)
    expect(props.onToggleFavorite).toHaveBeenCalledTimes(1)
  })
```

V `src/App.test.tsx` přidat import `import { STORAGE_KEY, type UserState } from '@/state/userState'` (k existujícímu importu `DEFAULT_USER_STATE`) a test:

```tsx
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
```

- [ ] **Step 2b: Spustit testy – musí selhat**

Run: `npx vitest run src/state src/content/search.test.ts src/pages/TocPages.test.tsx src/pages/RecipeMarks.test.tsx src/pages/RecipePage.test.tsx src/pages/StoragePanel.test.tsx src/App.test.tsx`
Expected: FAIL (`cooked` se načítá, souhrn obsahuje „uvařené“, hrnec a pilulka existují; typové chyby v testech nevadí, vitest je nehlídá).

- [ ] **Step 3: Stav bez `cooked`**

`src/state/userState.ts`:
- z `interface UserState` smazat komentář a řádek `cooked: string[];`;
- z `DEFAULT_USER_STATE` smazat `cooked: [],`;
- ze schématu smazat `cooked: z.array(z.string()).catch([]),` a komentář schématu změnit na:

```ts
/**
 * Tolerantní schéma: každé neplatné nebo chybějící pole se nahradí výchozí hodnotou.
 * Neznámá pole z.object zahodí: `notes` (fáze 4) i `cooked` („uvařeno“ fází 4b–8, zrušeno v R2).
 */
```

- smazat celou funkci `toggleCooked`;
- `deleteCustomRecipe` nahradit:

```ts
/** Smaže vlastní recept a všechny odkazy na něj (košík, oblíbené) – ruling R10 fáze 8. */
export function deleteCustomRecipe(s: UserState, id: string): UserState {
  return {
    ...s,
    customRecipes: s.customRecipes.filter((r) => r.id !== id),
    cart: s.cart.filter((e) => e.recipeId !== id),
    favorites: s.favorites.filter((x) => x !== id),
  };
}
```

`src/state/UserStateProvider.tsx`: smazat import `toggleCooked as toggleCookedFn,`, z `interface UserStateApi` řádek `toggleCooked(id: string): void;`, komentář u `deleteCustomRecipe` změnit na `/** Smaže vlastní recept včetně záznamů v košíku a oblíbených. */`, smazat `const toggleCooked = useCallback(…)` a `value` nahradit:

```ts
  const value = useMemo(
    () => ({ state, toggleFavorite, toggleCart, setCartMultiplier, removeFromCart, setPeople, setDayFactor, updateSettings, update, replaceState, saveCustomRecipe, deleteCustomRecipe, importCustomRecipes, storageMode, retryServer }),
    [state, toggleFavorite, toggleCart, setCartMultiplier, removeFromCart, setPeople, setDayFactor, updateSettings, update, replaceState, saveCustomRecipe, deleteCustomRecipe, importCustomRecipes, storageMode, retryServer],
  );
```

`src/state/backup.ts`:

```ts
export function backupSummary(s: UserState): string {
  return `oblíbené: ${s.favorites.length} · v košíku: ${s.cart.length} · dospělí: ${s.people.adults} · děti: ${s.people.children} · vlastní recepty: ${s.customRecipes.length}`;
}
```

`src/pages/StoragePanel.tsx` (text potvrzení importu): `Import přepíše všechna data kuchařky (oblíbené, košík, vlastní recepty, osoby a nastavení) obsahem souboru „{pending.fileName}“: {backupSummary(pending.state)}.`

- [ ] **Step 4: Filtr, značky a ikony bez „uvařeno“**

`src/content/search.ts` – začátek souboru nahradit (zbytek beze změny):

```ts
export interface Filter {
  /** Štítky filtru (ruční + odvozené `rychle`/`historicke`), všechny musí platit. */
  tags: FilterTag[]
  equipment: Equipment[]
  books: Book[]
  favoritesOnly: boolean
  query: string
}

export const EMPTY_FILTER: Filter = { tags: [], equipment: [], books: [], favoritesOnly: false, query: '' }

/** Značky uživatele u receptů (srdíčko). */
export interface UserMarks {
  favorites: ReadonlySet<string>
}

export const NO_MARKS: UserMarks = { favorites: new Set() }
```

a ve `filterRecipes` smazat řádek `if (filter.cookedOnly && !marks.cooked.has(r.id)) return false`.

`src/pages/RecipeMarks.tsx` celý:

```tsx
import { CartIcon, HeartIcon } from './icons'

interface Props {
  favorite: boolean
  onToggleFavorite: () => void
  /** Název receptu do přístupného jména (v obsahu je takových tlačítek mnoho). */
  label?: string
  compact?: boolean
  /** Košík: tlačítko se vykreslí jen s `onToggleCart` (stránka receptu, řádek obsahu). */
  inCart?: boolean
  onToggleCart?: () => void
}

/** Srdíčko (oblíbené) a košík – na stránce receptu i u řádku obsahu. */
export function RecipeMarks({ favorite, onToggleFavorite, label, compact = false, inCart = false, onToggleCart }: Props) {
  const suffix = label ? `: ${label}` : ''
  return (
    <span className={`recipe-marks${compact ? ' recipe-marks--compact' : ''}`}>
      <button
        type="button"
        className="mark mark--favorite"
        aria-pressed={favorite}
        aria-label={`Oblíbené${suffix}`}
        title={favorite ? 'V oblíbených' : 'Přidat do oblíbených'}
        onClick={onToggleFavorite}
      >
        <HeartIcon filled={favorite} />
      </button>
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
    </span>
  )
}
```

`src/pages/icons.tsx`: smazat celou funkci `PotIcon`.

`src/pages/TocPages.tsx`:
- import ikon: `import { HeartIcon, PenIcon } from './icons'`;
- z `TocPagesProps` smazat `cooked: Set<string>` a `onToggleCooked: (id: string) => void`;
- ve `FilterPanel` smazat řádek `<Pill icon={<PotIcon …/>} label="Jen uvařené" … />`;
- `emptyText` nahradit:

```tsx
function emptyText(filter: Filter, favorites: Set<string>): string {
  if (filter.favoritesOnly && favorites.size === 0) return 'Zatím žádné oblíbené recepty – označ srdíčko u receptu.'
  return 'Nic nenalezeno.'
}
```

- v `TocPages` z destrukturování odebrat `cooked` a `onToggleCooked`, `filterRecipes(recipes, ingredients, filter, { favorites })`, `emptyText(filter, favorites)`, a v `<RecipeMarks …>` řádku obsahu smazat `cooked={…}` a `onToggleCooked={…}`.

`src/pages/RecipePage.tsx`: z `LeftProps` smazat `cooked: boolean` a `onToggleCooked: () => void`, z destrukturování `RecipeLeft` je odebrat a `<RecipeMarks favorite={favorite} onToggleFavorite={onToggleFavorite} inCart={inCart} onToggleCart={onToggleCart} />`.

`src/App.tsx`:
- z destrukturování `useUserState()` odebrat `toggleCooked`;
- smazat `const cooked = useMemo(() => new Set(state.cooked), [state.cooked])`;
- v `<TocPages …>` smazat `cooked={cooked}` a `onToggleCooked={toggleCooked}`;
- v `<RecipeLeft …>` smazat `cooked={cooked.has(recipe.id)}` a `onToggleCooked={() => toggleCooked(recipe.id)}`;
- z pole závislostí `pages` odebrat `cooked` a `toggleCooked`.

`src/styles/paper.css`: smazat řádek `.mark--cooked[aria-pressed="true"] { color: var(--ink); }` a komentář `/* srdíčko a hrnec */` změnit na `/* srdíčko a košík */`.

- [ ] **Step 5: Ověřit, že v kódu nic nezůstalo**

Run: `grep -rn "cooked\|Cooked\|PotIcon\|uvařen\|Uvařen" src scripts`
Expected: jen testy, které ověřují nepřítomnost (`queryByRole(… /Uvařeno/ …)`, `'cooked' in s`, `"cooked":…` ve vstupech testů, `not.toHaveProperty('cooked')`, `.mark--cooked` v `toBeNull`, `not.toHaveTextContent('uvařen')`).

- [ ] **Step 6: Spustit všechny kontroly**

Run: `npm test && npm run lint && npm run build && npm run validate`
Expected: vše PASS, bez chyb typů.

- [ ] **Step 7: Předat controlleru (necommitovat)**

Změněné soubory: všechny ze sekce Files. Návrh zprávy: `refactor(stav): zrušené „uvařeno“ – UI, filtr, stav a záloha (R2)`.

---

### Task 2: „pokračuje ↓“ – záře jen kolem nápisu

**Files:**
- Modify: `src/styles/paper.css` (blok `.page-more`)
- Test: `src/styles/paper.test.ts`

**Interfaces:**
- Consumes: `--page-bg` (nastavuje `.page--cover`, `.page--note`), `--paper`.
- Produces: CSS `.page-more` (vycentrovaný nápis bez pozadí), `.page-more span` (kulatá záře). `Page.tsx` beze změny (`<div className="page-more" aria-hidden="true"><span>pokračuje ↓</span></div>`).

- [ ] **Step 1: Napsat failing test**

V `src/styles/paper.test.ts` první test nahradit:

```ts
test('„pokračuje ↓“: záře jen kolem nápisu v barvě stránky, ne pruh přes celou šířku (R2)', () => {
  const more = body('.page-more')
  expect(more).not.toMatch(/background/)
  expect(more).not.toMatch(/right:\s*0/)
  expect(more).toMatch(/left:\s*50%/)
  expect(more).toMatch(/translateX\(-50%\)/)
  expect(body('.page-more span')).toMatch(/radial-gradient\([^;]*var\(--page-bg, var\(--paper\)\)[^;]*transparent/)
  expect(body('.page--note')).toMatch(/--page-bg:\s*var\(--note-paper\)/)
  expect(body('.page--cover')).toMatch(/--page-bg:\s*var\(--cover\)/)
})
```

- [ ] **Step 2: Spustit test – musí selhat**

Run: `npx vitest run src/styles/paper.test.ts`
Expected: FAIL (`.page-more` má `background: linear-gradient` a `right: 0`).

- [ ] **Step 3: Implementace**

V `src/styles/paper.css` nahradit blok od komentáře `/* zjevný scroll: obsah pod spodním okrajem se ztrácí do papíru */` po řádek `.page-more span { … }` včetně:

```css
/* zjevný scroll: „pokračuje ↓“ se září jen kolem samotného nápisu (spec §2 [R2]), ne pruh přes celou šířku */
.page-more {
  position: absolute; left: 50%; bottom: 0.3rem; z-index: 1;
  transform: translateX(-50%);
  pointer-events: none;  /* scroll i klik projdou na obsah */
}
.page--numbered > .page-more { bottom: 2.5rem; }
.page-more span {
  display: block; padding: 0.4em 1.3em; white-space: nowrap;
  font-family: var(--font-typewriter); font-size: 0.75rem; color: var(--ink-soft);
  background: radial-gradient(closest-side, var(--page-bg, var(--paper)) 60%, transparent);
}
```

- [ ] **Step 4: Spustit test – musí projít**

Run: `npx vitest run src/styles/paper.test.ts src/book/Page.test.tsx src/styles/print.test.ts`
Expected: PASS.

- [ ] **Step 5: Všechny kontroly**

Run: `npm test && npm run lint && npm run build && npm run validate`
Expected: PASS.

- [ ] **Step 6: Předat controlleru (necommitovat)**

Soubory: `src/styles/paper.css`, `src/styles/paper.test.ts`. Návrh zprávy: `style(stránka): „pokračuje ↓“ se září jen kolem nápisu (R2)`.

---

### Task 3: Zlatý rám obálky u rohů a okrajů

**Files:**
- Modify: `src/pages/ornaments.tsx` (`CoverFrame`), `src/styles/paper.css` (blok obálky)
- Test: `src/pages/CoverPage.test.tsx`, `src/styles/paper.test.ts`

**Interfaces:**
- Consumes: `CoverPage` už vykresluje `<CoverFrame />` (beze změny).
- Produces: `CoverFrame()` → `<div className="cover-frame" aria-hidden="true">` se čtyřmi `.cover-frame__corner--{tl,tr,bl,br}` a čtyřmi `.cover-frame__edge--{top,bottom,left,right}`.

- [ ] **Step 1: Napsat failing testy**

Do `src/pages/CoverPage.test.tsx` přidat:

```tsx
test('zlatý rám je u okrajů: čtyři rohy a čtyři ornamenty hran, skrytý před čtečkami, nic se nedeformuje', () => {
  const { container } = render(<CoverPage />)
  const frame = container.querySelector('.cover-frame')!
  expect(frame).toHaveAttribute('aria-hidden', 'true')
  for (const c of ['tl', 'tr', 'bl', 'br']) expect(frame.querySelector(`.cover-frame__corner--${c}`)).not.toBeNull()
  for (const e of ['top', 'bottom', 'left', 'right']) expect(frame.querySelector(`.cover-frame__edge--${e}`)).not.toBeNull()
  expect(frame.querySelector('[preserveAspectRatio="none"]')).toBeNull()
})
```

Do `src/styles/paper.test.ts` přidat:

```ts
test('obálka: rám u okrajů knihy, roh zrcadlený do všech čtyř rohů, ornamenty uprostřed hran', () => {
  expect(body('.cover-frame')).toMatch(/inset:\s*0\.6rem/)
  expect(body('.cover-frame')).toMatch(/border:\s*1\.5px solid currentColor/)
  expect(body('.cover-frame::before')).toMatch(/border:\s*1px solid currentColor/)
  expect(body('.cover-frame__corner--tr')).toMatch(/scaleX\(-1\)/)
  expect(body('.cover-frame__corner--bl')).toMatch(/scaleY\(-1\)/)
  expect(body('.cover-frame__corner--br')).toMatch(/scale\(-1, -1\)/)
  expect(body('.cover-frame__edge--left')).toMatch(/left:\s*0\.55rem/)
  expect(body('.cover-frame__edge--right')).toMatch(/right:\s*0\.55rem/)
})
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/pages/CoverPage.test.tsx src/styles/paper.test.ts`
Expected: FAIL (rám je jedno SVG s `preserveAspectRatio="none"`, chybí rohy a hrany).

- [ ] **Step 3: Implementace komponenty**

V `src/pages/ornaments.tsx` nahradit `CoverFrame` (zbytek souboru beze změny):

```tsx
type Corner = 'tl' | 'tr' | 'bl' | 'br'
type Edge = 'top' | 'bottom' | 'left' | 'right'
const CORNERS: Corner[] = ['tl', 'tr', 'bl', 'br']
const EDGES: Edge[] = ['top', 'bottom', 'left', 'right']

/** Ozdobný roh (kreslený pro levý horní roh; ostatní zrcadlí CSS). */
function CoverCorner({ corner }: { corner: Corner }) {
  return (
    <svg className={`cover-frame__corner cover-frame__corner--${corner}`} viewBox="0 0 80 80" strokeWidth="1.4" {...common}>
      <path d="M3 64V14A11 11 0 0 1 14 3h50" />
      <path d="M11 52V20a9 9 0 0 1 9-9h32" strokeWidth="0.8" />
      <path d="M20 20c12 0 20 7 20 15s-8 12-13 7.5 0-10 5.5-7.5" />
      <path d="M20 20c0 12 7 20 15 20" />
      <path d="M46 11q7-6 14 0q-7 6-14 0zM11 46q-6 7 0 14q6-7 0-14z" fill="currentColor" />
      <circle cx="20" cy="20" r="2.4" fill="currentColor" />
      <path d="M64 3q9 0 13 7M3 64q0 9 7 13" />
    </svg>
  )
}

/** Ornament uprostřed hrany: vodorovný (nahoře, dole) nebo svislý (vlevo, vpravo). */
function CoverEdge({ edge }: { edge: Edge }) {
  const className = `cover-frame__edge cover-frame__edge--${edge}`
  if (edge === 'left' || edge === 'right') {
    return (
      <svg className={className} viewBox="0 0 20 120" strokeWidth="1.2" {...common}>
        <path d="M10 4v38M10 78v38" />
        <path d="M10 42q-9 9 0 18q9 9 0 18" />
        <path d="M10 42q9 9 0 18q-9 9 0 18" strokeWidth="0.8" />
        <path d="M10 53l5 7-5 7-5-7z" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 120 20" strokeWidth="1.2" {...common}>
      <path d="M4 10h38M78 10h38" />
      <path d="M42 10q9-9 18 0q9 9 18 0" />
      <path d="M42 10q9 9 18 0q9-9 18 0" strokeWidth="0.8" />
      <path d="M53 10l7-5 7 5-7 5z" fill="currentColor" />
    </svg>
  )
}

/** Zlatý rám obálky u okrajů knihy (spec §2 [R2]): dvojitá linka, ozdobné rohy a ornamenty uprostřed hran. */
export function CoverFrame() {
  return (
    <div className="cover-frame" aria-hidden="true">
      {CORNERS.map((c) => (
        <CoverCorner key={c} corner={c} />
      ))}
      {EDGES.map((e) => (
        <CoverEdge key={e} edge={e} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Implementace CSS**

V `src/styles/paper.css` nahradit řádek `.cover-frame { position: absolute; inset: 1rem; … }`:

```css
/* zlatý rám u okrajů knihy (R2): dvojitá linka, rohy a ornamenty hran; nic se nenatahuje */
.cover-frame { position: absolute; inset: 0.6rem; color: #d4af37; border: 1.5px solid currentColor; pointer-events: none; }
.cover-frame::before { content: ''; position: absolute; inset: 0.3rem; border: 1px solid currentColor; opacity: 0.8; }
.cover-frame__corner { position: absolute; width: min(7rem, 24cqw); height: min(7rem, 24cqw); }
.cover-frame__corner--tl { top: -1px; left: -1px; }
.cover-frame__corner--tr { top: -1px; right: -1px; transform: scaleX(-1); }
.cover-frame__corner--bl { bottom: -1px; left: -1px; transform: scaleY(-1); }
.cover-frame__corner--br { bottom: -1px; right: -1px; transform: scale(-1, -1); }
.cover-frame__edge { position: absolute; }
.cover-frame__edge--top, .cover-frame__edge--bottom { left: 50%; width: min(9rem, 36%); aspect-ratio: 6 / 1; transform: translateX(-50%); }
.cover-frame__edge--top { top: 0.55rem; }
.cover-frame__edge--bottom { bottom: 0.55rem; }
.cover-frame__edge--left, .cover-frame__edge--right { top: 50%; height: min(9rem, 26%); aspect-ratio: 1 / 6; transform: translateY(-50%); }
.cover-frame__edge--left { left: 0.55rem; }
.cover-frame__edge--right { right: 0.55rem; }
```

a v `.cover-page__turn` změnit `bottom: 2.6rem` na `bottom: 3.3rem` (výzva „Otoč stránku“ nad spodním ornamentem).

- [ ] **Step 5: Spustit testy – musí projít**

Run: `npx vitest run src/pages/CoverPage.test.tsx src/styles/paper.test.ts`
Expected: PASS.

- [ ] **Step 6: Všechny kontroly**

Run: `npm test && npm run lint && npm run build && npm run validate`
Expected: PASS. Vizuální kontrola (rohy nezakrývají titul na 320 px) je v Tasku 10.

- [ ] **Step 7: Předat controlleru (necommitovat)**

Soubory: `src/pages/ornaments.tsx`, `src/styles/paper.css`, `src/pages/CoverPage.test.tsx`, `src/styles/paper.test.ts`. Návrh zprávy: `style(obálka): zlatý rám u rohů a okrajů knihy (R2)`.

---

### Task 4: Ovládání knihy – Domů na obsah, Tisk a Košík mimo knihu

**Files:**
- Modify: `src/app/BookControls.tsx`, `src/print/printJob.ts`, `src/App.tsx`, `src/styles/paper.css`
- Test: `src/app/BookControls.test.tsx`, `src/print/printJob.test.ts`, `src/App.test.tsx`, `src/styles/paper.test.ts`

**Interfaces:**
- Consumes: `printJobForRoute(route): PrintJob`, `PrintKind` (`src/print/printJob.ts`); `print(job)` z `usePrintJob`; `navigate(route)` a `cartCount` v `App`; `PrinterIcon`, `CartIcon` (`src/pages/icons.tsx`); `PRINT_HINT`, `plural` (`src/pages/labels.ts`).
- Produces:
```ts
// src/print/printJob.ts
export const PRINT_JOB_LABEL: Record<PrintKind, string>
// src/app/BookControls.tsx
props: { onHome: () => void; onPrint: () => void; printLabel: string; onOpenCart: () => void; cartCount: number; children?: ReactNode }
```

- [ ] **Step 1: Napsat failing testy**

Do `src/print/printJob.test.ts` přidat (import `PRINT_JOB_LABEL` k existujícímu importu z `./printJob`):

```ts
test('přístupné jméno tlačítka tisku říká, co se vytiskne', () => {
  expect(PRINT_JOB_LABEL).toEqual({
    recipe: 'Tisk: recept (A4)',
    list: 'Tisk: nákupní seznam (A4)',
    toc: 'Tisk: obsah (A4)',
    booklet: 'Tisk: brožurka (A5)',
  })
})
```

`src/app/BookControls.test.tsx` – nad testy přidat pomocníka a všechna `render(<BookControls onHome={…} …>)` převést na `render(<BookControls {...props()} …>)` (u prvního testu `{...props({ onHome })}`):

```tsx
import { PRINT_HINT } from '@/pages/labels'

const props = (over: Partial<React.ComponentProps<typeof BookControls>> = {}) => ({
  onHome: vi.fn(),
  onPrint: vi.fn(),
  printLabel: 'Tisk: recept (A4)',
  onOpenCart: vi.fn(),
  cartCount: 0,
  ...over,
})
```

a přidat testy:

```tsx
test('Domů vede na obsah (title) a volá onHome', () => {
  const onHome = vi.fn()
  render(<BookControls {...props({ onHome })} />)
  const home = screen.getByRole('button', { name: 'Domů' })
  expect(home).toHaveAttribute('title', 'Domů – na obsah')
  fireEvent.click(home)
  expect(onHome).toHaveBeenCalledTimes(1)
})

test('tisk mimo knihu: jméno podle úlohy, nápověda k záhlaví a zápatí jako popis', () => {
  const onPrint = vi.fn()
  render(<BookControls {...props({ onPrint, printLabel: 'Tisk: obsah (A4)' })} />)
  const btn = screen.getByRole('button', { name: 'Tisk: obsah (A4)' })
  expect(btn).toHaveAccessibleDescription(PRINT_HINT)
  expect(btn).toHaveAttribute('title', `Tisk: obsah (A4) – ${PRINT_HINT}`)
  fireEvent.click(btn)
  expect(onPrint).toHaveBeenCalledTimes(1)
})

test('košík mimo knihu: skok na stránku košíku, odznak jen s recepty', () => {
  const onOpenCart = vi.fn()
  const { container, rerender } = render(<BookControls {...props({ onOpenCart })} />)
  expect(screen.getByRole('button', { name: 'Jít na košík (0 receptů)' })).toBeInTheDocument()
  expect(container.querySelector('.book-control__badge')).toBeNull()
  rerender(<BookControls {...props({ onOpenCart, cartCount: 2 })} />)
  const btn = screen.getByRole('button', { name: 'Jít na košík (2 recepty)' })
  expect(btn.querySelector('.book-control__badge')).toHaveTextContent('2')
  expect(btn.querySelector('.book-control__badge')).toHaveAttribute('aria-hidden', 'true')
  fireEvent.click(btn)
  expect(onOpenCart).toHaveBeenCalledTimes(1)
})

test('pořadí: Domů, Tisk, Košík, pak předané děti (lupa)', () => {
  render(<BookControls {...props()}><button aria-label="Hledat" /></BookControls>)
  const names = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))
  expect(names).toEqual(['Domů', 'Tisk: recept (A4)', 'Jít na košík (0 receptů)', 'Hledat'])
})
```

(Původní test „Domů volá onHome a vykreslí i předané děti (lupu)“ zůstane, jen s `{...props({ onHome })}`.)

V `src/App.test.tsx` nahradit `test('tlačítko Domů vrátí na obálku a zapíše krok do historie', …)`:

```tsx
test('tlačítko Domů vrátí na obsah a zapíše krok do historie', () => {
  history.replaceState(null, '', '#/recept/hovezi-gulas')
  render(<App />)
  const push = vi.spyOn(history, 'pushState')
  fireEvent.click(screen.getByRole('button', { name: 'Domů' }))
  expect(push).toHaveBeenCalledWith(null, '', '#/obsah')
  expect(screen.getByRole('heading', { level: 2, name: 'Obsah' })).toBeInTheDocument()
  push.mockRestore()
})
```

a přidat:

```tsx
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
```

Do `src/styles/paper.test.ts` přidat:

```ts
test('na úzkém displeji (≤ 380 px) jsou tlačítka ovládání menší, aby se pět tlačítek vešlo vedle záložky', () => {
  expect(css).toMatch(/@media \(max-width: 380px\)\s*\{[^@]*\.book-control\s*\{[^}]*width:\s*2\.1rem/)
  expect(body('.book-control__badge')).toMatch(/position:\s*absolute/)
})
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/app/BookControls.test.tsx src/print/printJob.test.ts src/App.test.tsx src/styles/paper.test.ts`
Expected: FAIL (chybí `PRINT_JOB_LABEL`, tlačítka tisku a košíku, Domů vede na obálku).

- [ ] **Step 3: Popisky úloh tisku**

Na konec `src/print/printJob.ts`:

```ts
/** Přístupné jméno tlačítka tisku mimo knihu: co se vytiskne (spec §2 [R2]). Brožurka se tiskne jen z košíku. */
export const PRINT_JOB_LABEL: Record<PrintKind, string> = {
  recipe: 'Tisk: recept (A4)',
  list: 'Tisk: nákupní seznam (A4)',
  toc: 'Tisk: obsah (A4)',
  booklet: 'Tisk: brožurka (A5)',
}
```

- [ ] **Step 4: BookControls**

`src/app/BookControls.tsx` celý:

```tsx
import { useId, type ReactNode } from 'react'
import { CartIcon, PrinterIcon } from '@/pages/icons'
import { PRINT_HINT, plural } from '@/pages/labels'
import { useFullscreen } from './useFullscreen'

interface Props {
  /** Domů = obsah (spec §2 [R2]). */
  onHome: () => void
  /** Tisk podle aktuální stránky – stejná úloha jako Ctrl+P (recept → recept, košík a seznam → seznam, jinde obsah). */
  onPrint: () => void
  /** Přístupné jméno tisku: co se vytiskne (`PRINT_JOB_LABEL`). */
  printLabel: string
  /** Skok na stránku košíku. */
  onOpenCart: () => void
  /** Počet receptů v košíku (odznak na tlačítku). */
  cartCount: number
  /** Další ovládací prvky (lupa hledání), vykreslí se za tlačítky. */
  children?: ReactNode
}

/** Pevné ovládání v rohu knihy, mimo stránky (viditelné z každé strany): domů, tisk, košík, celá obrazovka, hledání. */
export function BookControls({ onHome, onPrint, printLabel, onOpenCart, cartCount, children }: Props) {
  const fullscreen = useFullscreen()
  const hintId = useId()
  const recipesText = `${cartCount} ${plural(cartCount, 'recept', 'recepty', 'receptů')}`
  return (
    <nav className="book-controls" aria-label="Ovládání knihy">
      <button type="button" className="book-control" aria-label="Domů" title="Domů – na obsah" onClick={onHome}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10v10h5v-6h3v6h5V10" />
        </svg>
      </button>
      <button type="button" className="book-control" aria-label={printLabel} aria-describedby={hintId} title={`${printLabel} – ${PRINT_HINT}`} onClick={onPrint}>
        <PrinterIcon />
      </button>
      <span id={hintId} className="visually-hidden">{PRINT_HINT}</span>
      <button type="button" className="book-control" aria-label={`Jít na košík (${recipesText})`} title="Košík" onClick={onOpenCart}>
        <CartIcon filled={cartCount > 0} />
        {cartCount > 0 && (
          <span className="book-control__badge" aria-hidden="true">
            {cartCount}
          </span>
        )}
      </button>
      {fullscreen.supported && (
        <button
          type="button"
          className="book-control"
          aria-label="Celá obrazovka"
          aria-pressed={fullscreen.active}
          title={fullscreen.active ? 'Ukončit celou obrazovku' : 'Celá obrazovka'}
          onClick={fullscreen.toggle}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
          </svg>
        </button>
      )}
      {children}
    </nav>
  )
}
```

- [ ] **Step 5: Zapojení v App**

`src/App.tsx`:
- import: `import { PRINT_JOB_LABEL, printJobForRoute } from '@/print/printJob'`;
- hned za `const { job: printJob, print } = usePrintJob(currentPrintJob, index)` přidat:

```tsx
  // tlačítko tisku mimo knihu tiskne totéž co Ctrl+P a jménem říká co (spec §2 [R2])
  const printLabel = PRINT_JOB_LABEL[currentPrintJob().kind]
```

- `<BookControls onHome={() => navigate({ kind: 'cover' })}>` nahradit:

```tsx
        <BookControls
          onHome={() => navigate({ kind: 'toc' })}
          onPrint={() => print(currentPrintJob())}
          printLabel={printLabel}
          onOpenCart={() => navigate({ kind: 'cart' })}
          cartCount={cartCount}
        >
```

- [ ] **Step 6: CSS**

V `src/styles/paper.css` v pravidle `.book-control { … }` přidat na začátek `position: relative;` a za pravidlo `.book-control[aria-pressed="true"] { … }` přidat:

```css
.book-control svg { width: 20px; height: 20px; }
.book-control__badge {
  position: absolute; top: -0.35rem; right: -0.35rem; min-width: 1.15rem; height: 1.15rem; padding: 0 0.25rem;
  box-sizing: border-box; border-radius: 999px; text-align: center; pointer-events: none;
  font: 600 0.7rem/1.15rem var(--font-table); color: var(--paper); background: #8c2a22;
}
/* 320 px: pět tlačítek ovládání se vejde vedle záložky (R2) */
@media (max-width: 380px) {
  .book-controls { right: 0.4rem; gap: 0.25rem; }
  .book-control { width: 2.1rem; height: 2.1rem; }
}
```

- [ ] **Step 7: Spustit testy – musí projít**

Run: `npx vitest run src/app/BookControls.test.tsx src/print/printJob.test.ts src/App.test.tsx src/styles/paper.test.ts`
Expected: PASS. (Tlačítko „Tisknout recept“ na stránce receptu zatím zůstává, odstraní ho Task 5. Jeho jméno nekoliduje s „Tisk: recept (A4)“.)

- [ ] **Step 8: Všechny kontroly**

Run: `npm test && npm run lint && npm run build && npm run validate`
Expected: PASS.

- [ ] **Step 9: Předat controlleru (necommitovat)**

Soubory: `src/app/BookControls.tsx`, `src/app/BookControls.test.tsx`, `src/print/printJob.ts`, `src/print/printJob.test.ts`, `src/App.tsx`, `src/App.test.tsx`, `src/styles/paper.css`, `src/styles/paper.test.ts`. Návrh zprávy: `feat(ovládání): domů na obsah, tisk a košík mimo knihu (R2)`.

---

### Task 5: Stránka receptu – tlačítka vpravo, bez tisku, verze pro jednu stránku

**Files:**
- Modify: `src/pages/RecipePage.tsx` (celý), `src/App.tsx` (render receptu), `src/styles/paper.css`, `src/styles/print.css`
- Test: `src/pages/RecipePage.test.tsx` (celý), `src/App.test.tsx`, `src/styles/print.test.ts`

**Interfaces:**
- Consumes: `RecipeMarks` (Task 1: `favorite`, `onToggleFavorite`, `inCart`, `onToggleCart`); `Divider` (`src/pages/ornaments.tsx`).
- Produces:
```tsx
// src/pages/RecipePage.tsx
export function RecipeLeft(props: { recipe: Recipe; ingredients: Map<string, Ingredient>; portions: Portions; historical: boolean; onEdit?: () => void; onDelete?: () => void })
export function RecipeRight(props: { recipe: Recipe; favorite: boolean; inCart: boolean; onToggleFavorite: () => void; onToggleCart: () => void })
export function RecipeSingle(props: /* RecipeLeft props */ & { favorite: boolean; inCart: boolean; onToggleFavorite: () => void; onToggleCart: () => void })
// CSS: .recipe-actions (řádek tlačítek), .recipe-page--single
```

- [ ] **Step 1: Napsat failing testy**

`src/pages/RecipePage.test.tsx` celý nahradit:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { loadContent } from '@/content/loadContent'
import { recipeMacrosPerServing } from '@/domain/nutrition'
import { customRecipe } from '@/test/customRecipe'
import { RecipeLeft, RecipeRight, RecipeSingle } from './RecipePage'
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
```

V `src/App.test.tsx`:
- smazat `test('tlačítko „Tisknout recept“ vykreslí recept do tiskového stromu dřív, než se otevře dialog', …)` (tisk receptu pokrývá test z Tasku 4);
- do `test('recept je dvoustrana: vlevo suroviny, vpravo postup', …)` přidat na konec:

```tsx
  // tlačítka receptu jsou vpravo (R2), levá strana je nemá
  expect(container.querySelector('.book__slot--right .recipe-actions .mark--favorite')).not.toBeNull()
  expect(container.querySelector('.book__slot--left .mark')).toBeNull()
```

V `src/styles/print.test.ts` v testu „v tisku se skryjí ovládací prvky…“ v seznamu nahradit `'.mark--print', '.print-hint'` za `'.recipe-actions'`.

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/pages/RecipePage.test.tsx src/App.test.tsx src/styles/print.test.ts`
Expected: FAIL (`RecipeSingle` neexistuje, tlačítka jsou vlevo, `.recipe-actions` chybí v print.css).

- [ ] **Step 3: Implementace stránky receptu**

`src/pages/RecipePage.tsx` celý:

```tsx
import { BOOK_META } from '@/content/books'
import { recipeMacrosPerServing } from '@/domain/nutrition'
import type { Portions } from '@/domain/portions'
import type { Ingredient, Recipe } from '@/domain/types'
import { IngredientTable } from './IngredientTable'
import { ALLERGEN_LABEL, DIFFICULTY_LABEL, EQUIPMENT_LABEL, difficultyDots } from './labels'
import { NutritionFacts } from './NutritionFacts'
import { Divider } from './ornaments'
import { RecipeMarks } from './RecipeMarks'
import { bookLabel, originalTitle, sourceLine } from './recipeText'

const eraClass = (recipe: Recipe) => `era--${BOOK_META[recipe.source.book].era}`

interface InfoProps {
  recipe: Recipe
  ingredients: Map<string, Ingredient>
  portions: Portions
  historical: boolean
  /** Vlastní recept: otevře formulář úpravy. */
  onEdit?: () => void
  /** Vlastní recept: smaže ho po potvrzení. */
  onDelete?: () => void
}

interface ActionsProps {
  favorite: boolean
  inCart: boolean
  onToggleFavorite: () => void
  onToggleCart: () => void
}

/** Údaje a nákup („vlevo informace + nákup“): název, původní název, Upravit/Smazat, údaje, suroviny, nutrice. */
function RecipeInfo({ recipe, ingredients, portions, historical, onEdit, onDelete }: InfoProps) {
  const original = originalTitle(recipe)
  const book = bookLabel(recipe)
  return (
    <>
      <header className="recipe-head">
        <h2>{recipe.title}</h2>
      </header>
      {original && <small className="recipe-original-title">{original}</small>}
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
      <dl className="recipe-meta">
        <div><dt>Kniha</dt><dd className="recipe-book">{book}</dd></div>
        <div><dt>Čas</dt><dd>{recipe.timeMinutes} min</dd></div>
        <div>
          <dt>Obtížnost</dt>
          <dd><span aria-hidden="true">{difficultyDots(recipe.difficulty)}</span> {DIFFICULTY_LABEL[recipe.difficulty]}</dd>
        </div>
        <div><dt>Vybavení</dt><dd>{recipe.equipment.length ? recipe.equipment.map((e) => EQUIPMENT_LABEL[e]).join(', ') : '—'}</dd></div>
        <div><dt>Alergeny</dt><dd>{recipe.allergens.length ? recipe.allergens.map((a) => ALLERGEN_LABEL[a]).join(', ') : 'bez alergenů'}</dd></div>
      </dl>
      <IngredientTable recipe={recipe} ingredients={ingredients} portions={portions} historical={historical} perPerson />
      <NutritionFacts macros={recipeMacrosPerServing(recipe, ingredients, historical)} />
    </>
  )
}

/** Postup („vpravo postup“): volitelné živé záhlaví, postup, poznámka, patička zdroje. */
function RecipeMethod({ recipe, runningHead }: { recipe: Recipe; runningHead: boolean }) {
  return (
    <>
      {runningHead && <h2 className="recipe-running-head">{recipe.title}</h2>}
      <h3>Postup</h3>
      <ol className="recipe-steps">
        {recipe.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      {recipe.modernNote && (
        <aside className="modern-note">
          <strong>{recipe.source.book === 'vlastni' ? 'Poznámka' : 'Poznámka k modernizaci'}</strong>
          <p>{recipe.modernNote}</p>
        </aside>
      )}
      <footer className="source">{sourceLine(recipe)}</footer>
    </>
  )
}

/** Funkční tlačítka receptu (srdíčko, košík) v samostatném řádku bez nadpisu – nezasahují do názvu (spec §2 [R2]). */
function RecipeActions({ favorite, inCart, onToggleFavorite, onToggleCart }: ActionsProps) {
  return (
    <div className="recipe-actions">
      <RecipeMarks favorite={favorite} onToggleFavorite={onToggleFavorite} inCart={inCart} onToggleCart={onToggleCart} />
    </div>
  )
}

/** Levá strana dvoustrany: údaje a suroviny, bez funkčních tlačítek (kromě Upravit/Smazat vlastního receptu). */
export function RecipeLeft(props: InfoProps) {
  return (
    <article className={`recipe-page recipe-page--left ${eraClass(props.recipe)}`}>
      <RecipeInfo {...props} />
    </article>
  )
}

/** Pravá strana dvoustrany: srdíčko a košík nahoře (tady není nadpis), pak postup. */
export function RecipeRight({ recipe, ...actions }: { recipe: Recipe } & ActionsProps) {
  return (
    <article className={`recipe-page recipe-page--right ${eraClass(recipe)}`}>
      <RecipeActions {...actions} />
      <RecipeMethod recipe={recipe} runningHead />
    </article>
  )
}

/** Mobil: celý recept na jedné scrollovatelné stránce – tlačítka, údaje a suroviny, ornament, postup. */
export function RecipeSingle({ favorite, inCart, onToggleFavorite, onToggleCart, ...info }: InfoProps & ActionsProps) {
  return (
    <article className={`recipe-page recipe-page--single ${eraClass(info.recipe)}`}>
      <RecipeActions favorite={favorite} inCart={inCart} onToggleFavorite={onToggleFavorite} onToggleCart={onToggleCart} />
      <RecipeInfo {...info} />
      <Divider />
      <RecipeMethod recipe={info.recipe} runningHead={false} />
    </article>
  )
}
```

- [ ] **Step 4: Zapojení v App**

V `src/App.tsx` v `case 'recipe':` nahradit celé `render: () => entry.half === 'right' ? (…) : (…),`:

```tsx
            render: () => {
              const actions = {
                favorite: favorites.has(recipe.id),
                onToggleFavorite: () => toggleFavorite(recipe.id),
                inCart: inCart.has(recipe.id),
                onToggleCart: () => toggleCart(recipe.id),
              }
              const info = {
                recipe,
                ingredients,
                portions,
                historical,
                onEdit: own ? () => openEditor({ kind: 'edit-recipe', id: recipe.id }) : undefined,
                onDelete: own ? () => removeCustomRecipe(recipe) : undefined,
              }
              return entry.half === 'right' ? <RecipeRight recipe={recipe} {...actions} /> : <RecipeLeft {...info} />
            },
```

- [ ] **Step 5: CSS**

V `src/styles/paper.css`:
- řádky `.recipe-head { display: flex; align-items: flex-start; gap: 0.5rem; }` a `.recipe-head h2 { flex: 1; min-width: 0; margin-bottom: 0.1em; }` nahradit:

```css
.recipe-head h2 { margin-bottom: 0.1em; overflow-wrap: break-word; }
/* srdíčko a košík: samostatný řádek bez nadpisu (pravá strana, na mobilu nad názvem) – R2 */
.recipe-actions { display: flex; justify-content: flex-end; margin: 0 0 0.3em; }
.recipe-page--single .divider { display: block; max-width: 100%; margin: 1.2em auto 0.8em; color: var(--ink-soft); }
```

- smazat blok od komentáře `/* tisk: ikona vedle značek a nápověda k záhlaví a zápatí (spec §4 [R1]) */` po řádek `.print-hint { … }` včetně (tedy `.mark--print { flex: none; }`, komentář o 320 px a `@media (max-width: 340px) { .recipe-head … }` a `.print-hint …`); řádky `.print-action { … }` a `.print-action__hint { … }` **zůstávají** (nákupní seznam) a nad ně dát komentář `/* tisk na stránce nákupního seznamu: tlačítko a nápověda k záhlaví a zápatí (spec §4 [R1]) */`.

V `src/styles/print.css` v seznamu skrytých prvků (`@media print`, „záloha bez data-print“) nahradit `.mark--print, .print-hint` za `.recipe-actions`.

- [ ] **Step 6: Spustit testy – musí projít**

Run: `npx vitest run src/pages/RecipePage.test.tsx src/App.test.tsx src/styles/print.test.ts src/styles/paper.test.ts`
Expected: PASS.

- [ ] **Step 7: Všechny kontroly**

Run: `npm test && npm run lint && npm run build && npm run validate`
Expected: PASS. (`RecipeSingle` zatím nikdo nevykresluje – zapojí ho Task 6; oxlint nehlásí nepoužitý export.)

- [ ] **Step 8: Předat controlleru (necommitovat)**

Soubory: `src/pages/RecipePage.tsx`, `src/pages/RecipePage.test.tsx`, `src/App.tsx`, `src/App.test.tsx`, `src/styles/paper.css`, `src/styles/print.css`, `src/styles/print.test.ts`. Návrh zprávy: `feat(recept): srdíčko a košík na pravé straně, bez tisku v listu, verze na jednu stránku (R2)`.

---

### Task 6: Mobil – recept na jedné stránce, čísla stran podle režimu

**Files:**
- Modify: `src/book/useViewMode.ts` (celý), `src/book/Book.tsx`, `src/content/buildPages.ts`, `src/App.tsx`
- Test: `src/content/buildPages.test.ts`, `src/book/Book.test.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `RecipeSingle` (Task 5); `ViewMode` (`src/book/model.ts`).
- Produces:
```ts
// src/content/buildPages.ts
export type RecipeHalf = 'left' | 'right' | 'full'
export function buildLayout(recipes: Recipe[], opts: { tocPageCount: number; mode?: ViewMode }): BookLayout  // výchozí 'spread'
// src/book/useViewMode.ts
export const VIEW_MODE_QUERY: string   // beze změny
export function useViewMode(): ViewMode // bez přepnutí při tisku; během tisku změny ignoruje
// src/book/Book.tsx
BookProps.mode?: ViewMode               // režim z rodiče má přednost
```

- [ ] **Step 1: Napsat failing testy layoutu**

Na konec `src/content/buildPages.test.ts` přidat:

```ts
describe('buildLayout v režimu single (mobil)', () => {
  const layout = buildLayout(recipes, { tocPageCount: 3, mode: 'single' })

  test('recept je jedna stránka (half full) a prázdné stránky nejsou', () => {
    expect(layout.entries.filter((e) => e.kind === 'blank')).toEqual([])
    expect(layout.entries.filter((e) => e.kind === 'recipe')).toHaveLength(recipes.length)
    for (const [id, idx] of layout.recipeIndex) {
      expect(layout.entries[idx]).toMatchObject({ id: `recipe-${id}`, kind: 'recipe', recipeId: id, half: 'full' })
    }
  })

  test('pořadí: obal, úvod, obsah, kapitola a hned její recepty, na konci košík, seznam, tiráž', () => {
    expect(layout.entries.slice(0, 6).map((e) => e.kind)).toEqual(['cover', 'about', 'about', 'toc', 'toc', 'toc'])
    expect(layout.tocIndex).toBe(3)
    const [chapter, idx] = [...layout.chapterIndex][0]
    expect(idx).toBe(6)
    expect(layout.entries[idx + 1]).toMatchObject({ kind: 'recipe', chapter, half: 'full' })
    expect(layout.entries.slice(-3).map((e) => e.kind)).toEqual(['cart', 'list', 'settings'])
    expect([layout.cartIndex, layout.listIndex, layout.settingsIndex]).toEqual([layout.entries.length - 3, layout.entries.length - 2, layout.entries.length - 1])
  })

  test('routa stránky receptu vede zpět na ni', () => {
    for (const [id, idx] of layout.recipeIndex) {
      expect(indexToRoute(idx, layout)).toEqual({ kind: 'recipe', id })
      expect(routeToIndex({ kind: 'recipe', id }, layout)).toBe(idx)
    }
  })

  test('id stránek jsou unikátní', () => {
    const ids = layout.entries.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('bez režimu je layout dvoustranný (spread)', () => {
    const spread = buildLayout(recipes, { tocPageCount: 3 })
    expect(spread.entries.filter((e) => e.half === 'left')).toHaveLength(recipes.length)
    expect(spread.entries.filter((e) => e.half === 'full')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Napsat failing testy knihy a aplikace**

V `src/book/Book.test.tsx`:
- `test('před tiskem se i v režimu single vykreslí celá dvoustrana, po tisku se vrátí single', …)` nahradit:

```tsx
test('tisk režim nemění: single zůstane single (layout a čísla stran se během tisku nepřestaví)', () => {
  let listener: () => void = () => {}
  let printing = false
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    // v tisku dotaz `screen and …` neplatí, `print` ano
    get matches() { return q === 'print' ? printing : !printing },
    addEventListener(_: string, l: () => void) { listener = l },
    removeEventListener() {},
  })) as never
  render(<Book pages={pages} initialIndex={3} />)
  expect(screen.queryByText('Strana 4')).toBeNull()
  printing = true
  act(() => {
    window.dispatchEvent(new Event('beforeprint'))
    listener()
  })
  expect(screen.getByText('Strana 3')).toBeInTheDocument()
  expect(screen.queryByText('Strana 4')).toBeNull()
})

test('režim z rodiče (prop mode) má přednost před vlastním dotazem', () => {
  render(<Book pages={pages} initialIndex={3} mode="single" />)
  expect(screen.getByText('Strana 3')).toBeInTheDocument()
  expect(screen.queryByText('Strana 4')).toBeNull()
})
```

- v `test('změna režimu zarovnává jen zobrazení; …', …)` upravit mock `matches` na:

```tsx
    get matches() { return q.includes('reduced-motion') ? true : q === 'print' ? false : single },
```

V `src/App.test.tsx`:
- v `test('přepnutí single→spread→single zachová hash receptu', …)` upravit mock `matches` stejně: `get matches() { return q.includes('reduced-motion') ? true : q === 'print' ? false : single },`;
- přidat pomocníka a testy:

```tsx
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
```

- [ ] **Step 3: Spustit testy – musí selhat**

Run: `npx vitest run src/content/buildPages.test.ts src/book/Book.test.tsx src/App.test.tsx`
Expected: FAIL (`mode` se ignoruje, `half: 'full'` neexistuje, tisk přepíná na spread).

- [ ] **Step 4: Layout podle režimu**

`src/content/buildPages.ts`:
- import: `import type { ViewMode } from '@/book/model'`;
- `export type RecipeHalf = 'left' | 'right' | 'full'` a komentář u `half`: `/** Část receptu: levá = údaje a suroviny, pravá = postup, full = celý recept na jedné stránce (mobil). */`;
- komentář `recipeIndex`: `/** Index stránky receptu: levé poloviny (spread, lichý) nebo celé stránky (single). */`;
- `buildLayout` celý:

```ts
/**
 * Čistá funkce: z receptů sestaví pořadí stránek knihy pro režim `mode` (výchozí `spread`).
 * Spread (desktop): index 0 je obal (vpravo), sudé indexy jsou pravé strany, liché levé; úvod kapitoly a seznam
 * začínají vždy vpravo, recept je dvoustrana (levá lichá + pravá sudá), košík vlevo a seznam vedle něj vpravo.
 * Single (mobil, spec §2 [R2]): recept je jedna stránka a prázdné stránky se nevkládají (parita nemá smysl).
 * Číslo strany = index, takže obsah ukazuje čísla aktuálního režimu. Tiráž je poslední.
 */
export function buildLayout(recipes: Recipe[], opts: { tocPageCount: number; mode?: ViewMode }): BookLayout {
  const single = opts.mode === 'single'
  const entries: PageEntry[] = []
  const recipeIndex = new Map<string, number>()
  const chapterIndex = new Map<Chapter, number>()
  let blankCount = 0

  const push = (entry: PageEntry): number => entries.push(entry) - 1
  const alignToRight = () => {
    if (!single && entries.length % 2 !== 0) push({ id: `blank-${blankCount++}`, kind: 'blank' })
  }
  const alignToLeft = () => {
    if (!single && entries.length % 2 === 0) push({ id: `blank-${blankCount++}`, kind: 'blank' })
  }

  push({ id: 'cover', kind: 'cover' })
  push({ id: 'about-left', kind: 'about' })
  push({ id: 'about-right', kind: 'about' })

  const tocIndex = entries.length
  const tocPageCount = Math.max(1, opts.tocPageCount)
  for (let i = 0; i < tocPageCount; i++) push({ id: `toc-${i}`, kind: 'toc', tocPage: i })

  for (const chapter of CHAPTERS) {
    const inChapter = recipes.filter((r) => r.chapter === chapter)
    if (inChapter.length === 0) continue
    alignToRight()
    chapterIndex.set(chapter, push({ id: `chapter-${chapter}`, kind: 'chapter', chapter }))
    for (const r of inChapter) {
      if (single) {
        recipeIndex.set(r.id, push({ id: `recipe-${r.id}`, kind: 'recipe', recipeId: r.id, chapter, half: 'full' }))
        continue
      }
      // kapitola je na sudém indexu → levá polovina receptu na lichém; dvojice drží paritu
      recipeIndex.set(r.id, push({ id: `recipe-${r.id}`, kind: 'recipe', recipeId: r.id, chapter, half: 'left' }))
      // dvojtečka není v kebab-case id, takže id pravé poloviny nekoliduje s jiným receptem
      push({ id: `recipe-${r.id}:postup`, kind: 'recipe', recipeId: r.id, chapter, half: 'right' })
    }
  }

  alignToLeft()
  const cartIndex = push({ id: 'cart', kind: 'cart' })
  const listIndex = push({ id: 'list', kind: 'list' })
  const settingsIndex = push({ id: 'settings', kind: 'settings' })

  return { entries, recipeIndex, chapterIndex, tocIndex, cartIndex, listIndex, settingsIndex }
}
```

- [ ] **Step 5: Režim bez přepínání při tisku**

`src/book/useViewMode.ts` celý:

```ts
import { useEffect, useState } from 'react'
import type { ViewMode } from './model'

// jen na obrazovce; v tisku dotaz neplatí a změny se ignorují (viz useViewMode)
export const VIEW_MODE_QUERY = 'screen and (max-width: 767px), screen and (orientation: portrait)'

function current(): ViewMode {
  return window.matchMedia?.(VIEW_MODE_QUERY).matches ? 'single' : 'spread'
}

/**
 * Režim knihy na obrazovce: `single` (mobil, na výšku) nebo `spread` (dvoustrana).
 * Podle režimu staví App layout (recept na jedné stránce vs. dvoustrana) a s ním čísla stran v obsahu,
 * proto se během tisku nemění: v tisku dotaz `screen and …` neplatí a změna by přestavěla knihu i tištěný obsah (R7).
 */
export function useViewMode(): ViewMode {
  const [mode, setMode] = useState<ViewMode>(current)
  useEffect(() => {
    const mq = window.matchMedia?.(VIEW_MODE_QUERY)
    if (!mq) return
    const onChange = () => {
      if (window.matchMedia?.('print').matches) return
      setMode(current())
    }
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])
  return mode
}
```

V `src/book/Book.tsx`:
- import typu: `import { canGoNext, canGoPrev, clampIndex, nextIndex, prevIndex, visiblePages, type ViewMode } from './model'`;
- do `BookProps` přidat:

```ts
  /** Režim z rodiče (App staví layout podle režimu); bez něj si ho kniha zjistí sama. */
  mode?: ViewMode
```

- signatura `export function Book({ pages, initialIndex = 0, index: controlledIndex, onIndexChange, mode: modeProp }: BookProps)` a první řádky:

```tsx
  const ownMode = useViewMode()
  const mode = modeProp ?? ownMode
```

- [ ] **Step 6: Zapojení v App**

`src/App.tsx`:
- importy: `import { useViewMode } from '@/book/useViewMode'` a `import { RecipeLeft, RecipeRight, RecipeSingle } from '@/pages/RecipePage'`;
- nahradit řádek s `const layout = useMemo(…)`:

```tsx
  // režim vlastní App: layout (recept na jedné stránce na mobilu) a s ním čísla stran v obsahu odpovídají režimu (R6)
  const mode = useViewMode()
  const layout = useMemo(() => buildLayout(recipes, { tocPageCount: tocPageCount(recipes), mode }), [recipes, mode])
```

- v `case 'recipe':` poslední řádek renderu (`return entry.half === 'right' ? … : …`) nahradit:

```tsx
              if (entry.half === 'full') return <RecipeSingle {...info} {...actions} />
              return entry.half === 'right' ? <RecipeRight recipe={recipe} {...actions} /> : <RecipeLeft {...info} />
```

- `<Book index={index} onIndexChange={setIndex} pages={pages} />` → `<Book index={index} onIndexChange={setIndex} pages={pages} mode={mode} />`.

(`describePage` se nemění: celá stránka hlásí jen název receptu.)

- [ ] **Step 7: Spustit testy – musí projít**

Run: `npx vitest run src/content/buildPages.test.ts src/book/Book.test.tsx src/App.test.tsx src/print src/pages/TocPages.test.tsx`
Expected: PASS.

- [ ] **Step 8: Všechny kontroly**

Run: `npm test && npm run lint && npm run build && npm run validate`
Expected: PASS.

- [ ] **Step 9: Předat controlleru (necommitovat)**

Soubory: `src/book/useViewMode.ts`, `src/book/Book.tsx`, `src/book/Book.test.tsx`, `src/content/buildPages.ts`, `src/content/buildPages.test.ts`, `src/App.tsx`, `src/App.test.tsx`. Návrh zprávy: `feat(mobil): recept na jedné stránce, čísla stran podle režimu, tisk režim nemění (R2)`.

---

### Task 7: Švih prstem listuje

**Files:**
- Modify: `src/book/useFlipDrag.ts`
- Test: `src/book/useFlipDrag.test.tsx`, `src/book/Book.test.tsx`

**Interfaces:**
- Consumes: `inHorizontalScroller(target, boundary)` (`src/book/wheel.ts`), `progressFromPointer`, `finishFlip` (`src/book/flip.ts`).
- Produces:
```ts
export const SWIPE_SLOP_PX = 10
export const SWIPE_HORIZONTAL_RATIO = 1.2
export const SWIPE_CLICK_GUARD_MS = 400
export type SwipeIntent = FlipDirection | 'vertical' | null
export function classifySwipe(dx: number, dy: number): SwipeIntent
export function isSwipeStartAllowed(target: EventTarget | null, boundary: Element): boolean
// useFlipDrag(...).handlers nově: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture }
```
`Book` rozbaluje `{...handlers}` na `.book__spread`, takže `onClickCapture` se zapojí sám.

- [ ] **Step 1: Napsat failing testy**

V `src/book/useFlipDrag.test.tsx` rozšířit import: `import { SWIPE_SLOP_PX, classifySwipe, isDragStartAllowed, isSwipeStartAllowed, useFlipDrag } from './useFlipDrag'` a na konec souboru přidat:

```tsx
describe('classifySwipe', () => {
  test('pod prahem 10 px nerozhodnuto', () => {
    expect(SWIPE_SLOP_PX).toBe(10)
    expect(classifySwipe(-6, 6)).toBeNull()
  })
  test('doleva = vpřed, doprava = zpět', () => {
    expect(classifySwipe(-12, 3)).toBe('next')
    expect(classifySwipe(12, -3)).toBe('prev')
  })
  test('převážně svislý pohyb patří scrollu', () => {
    expect(classifySwipe(5, 20)).toBe('vertical')
    expect(classifySwipe(-11, 10)).toBe('vertical') // 11 < 1,2 × 10
  })
})

describe('isSwipeStartAllowed', () => {
  const page = document.createElement('section')
  page.className = 'page'
  const p = document.createElement('p')
  const btn = document.createElement('button')
  const input = document.createElement('input')
  page.append(p, btn, input)
  document.body.append(page)
  test('kdekoli na stránce, i na tlačítku', () => {
    expect(isSwipeStartAllowed(p, document.body)).toBe(true)
    expect(isSwipeStartAllowed(btn, document.body)).toBe(true)
  })
  test('ne ve formulářovém poli, mimo stránku ani bez elementu', () => {
    expect(isSwipeStartAllowed(input, document.body)).toBe(false)
    expect(isSwipeStartAllowed(document.body, document.body)).toBe(false)
    expect(isSwipeStartAllowed(null, document.body)).toBe(false)
  })
  test('ne ve vodorovně scrollujícím prvku (široká tabulka)', () => {
    const scroller = document.createElement('div')
    scroller.style.overflowX = 'auto'
    Object.defineProperty(scroller, 'scrollWidth', { value: 600 })
    Object.defineProperty(scroller, 'clientWidth', { value: 300 })
    const cell = document.createElement('span')
    scroller.append(cell)
    page.append(scroller)
    expect(isSwipeStartAllowed(cell, document.body)).toBe(false)
  })
})

describe('švih prstem (touch)', () => {
  const page = document.createElement('section')
  page.className = 'page'
  const text = document.createElement('p')
  const input = document.createElement('input')
  page.append(text, input)
  document.body.append(page)
  const touch = (x: number, y = 500, extra: Record<string, unknown> = {}) =>
    ({ clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', target: text, currentTarget: document.body, ...extra }) as unknown as React.PointerEvent

  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never // reduced motion → bez rAF
    Element.prototype.setPointerCapture = vi.fn()
    Element.prototype.releasePointerCapture = vi.fn()
  })
  const setup = (over: { canNext?: boolean; canPrev?: boolean } = {}) => {
    const onComplete = vi.fn()
    return { onComplete, ...renderHook(() => useFlipDrag({ pageWidth: 800, canNext: true, canPrev: true, onComplete, ...over })) }
  }

  test('švih doleva po obsahu stránky přes polovinu otočí vpřed; rozhoduje až pohyb', () => {
    const { result, onComplete } = setup()
    act(() => result.current.handlers.onPointerDown(touch(700)))
    expect(result.current.flip).toBeNull()
    act(() => result.current.handlers.onPointerMove(touch(690, 498)))
    expect(result.current.flip).toMatchObject({ direction: 'next', dragging: true })
    act(() => result.current.handlers.onPointerMove(touch(200)))
    act(() => result.current.handlers.onPointerUp(touch(200)))
    expect(onComplete).toHaveBeenCalledWith('next')
  })

  test('švih doprava otočí zpět', () => {
    const { result, onComplete } = setup()
    act(() => result.current.handlers.onPointerDown(touch(100)))
    act(() => result.current.handlers.onPointerMove(touch(112)))
    act(() => result.current.handlers.onPointerMove(touch(700)))
    act(() => result.current.handlers.onPointerUp(touch(700)))
    expect(onComplete).toHaveBeenCalledWith('prev')
  })

  test('svislý tah neotáčí (patří scrollu stránky)', () => {
    const { result, onComplete } = setup()
    act(() => result.current.handlers.onPointerDown(touch(400, 500)))
    act(() => result.current.handlers.onPointerMove(touch(402, 530)))
    act(() => result.current.handlers.onPointerMove(touch(100, 540)))
    act(() => result.current.handlers.onPointerUp(touch(100, 540)))
    expect(result.current.flip).toBeNull()
    expect(onComplete).not.toHaveBeenCalled()
  })

  test('klepnutí bez pohybu nic neotočí a klik projde', () => {
    const { result, onComplete } = setup()
    act(() => result.current.handlers.onPointerDown(touch(400)))
    act(() => result.current.handlers.onPointerUp(touch(400)))
    expect(result.current.flip).toBeNull()
    expect(onComplete).not.toHaveBeenCalled()
    const click = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent
    act(() => result.current.handlers.onClickCapture(click))
    expect(click.preventDefault).not.toHaveBeenCalled()
  })

  test('švih ve zakázaném směru nic neudělá', () => {
    const { result } = setup({ canNext: false })
    act(() => result.current.handlers.onPointerDown(touch(700)))
    act(() => result.current.handlers.onPointerMove(touch(600)))
    expect(result.current.flip).toBeNull()
  })

  test('švih nezačne ve formulářovém poli', () => {
    const { result } = setup()
    act(() => result.current.handlers.onPointerDown(touch(700, 500, { target: input })))
    act(() => result.current.handlers.onPointerMove(touch(500, 500, { target: input })))
    expect(result.current.flip).toBeNull()
  })

  test('klik na konci švihu se spolkne (neotevře řádek obsahu), další klik už projde', () => {
    const { result } = setup()
    act(() => result.current.handlers.onPointerDown(touch(700)))
    act(() => result.current.handlers.onPointerMove(touch(680)))
    act(() => result.current.handlers.onPointerMove(touch(200)))
    act(() => result.current.handlers.onPointerUp(touch(200)))
    const first = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent
    act(() => result.current.handlers.onClickCapture(first))
    expect(first.preventDefault).toHaveBeenCalled()
    expect(first.stopPropagation).toHaveBeenCalled()
    const second = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent
    act(() => result.current.handlers.onClickCapture(second))
    expect(second.preventDefault).not.toHaveBeenCalled()
  })

  test('myš na obsahu stránky dál neotáčí (jen úchyt na okraji)', () => {
    const { result } = setup()
    act(() => result.current.handlers.onPointerDown(touch(700, 500, { pointerType: 'mouse' })))
    act(() => result.current.handlers.onPointerMove(touch(200, 500, { pointerType: 'mouse' })))
    expect(result.current.flip).toBeNull()
  })
})
```

Do `src/book/Book.test.tsx` přidat:

```tsx
test('švih prstem po obsahu stránky listuje (single, bez úchytu na okraji)', () => {
  window.matchMedia = vi.fn().mockImplementation(() => ({ matches: true, addEventListener() {}, removeEventListener() {} })) as never
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  const onIndexChange = vi.fn()
  const { container } = render(<Book pages={pages} initialIndex={2} onIndexChange={onIndexChange} />)
  const spread = container.querySelector('.book__spread')!
  fireEvent.pointerDown(screen.getByText('Strana 2'), { pointerId: 3, pointerType: 'touch', clientX: 350, clientY: 300 })
  // otáčení přeskládá sloty – další události jdou na .book__spread (tam jsou handlery)
  fireEvent.pointerMove(spread, { pointerId: 3, pointerType: 'touch', clientX: 330, clientY: 302 })
  fireEvent.pointerMove(spread, { pointerId: 3, pointerType: 'touch', clientX: -100, clientY: 305 })
  fireEvent.pointerUp(spread, { pointerId: 3, pointerType: 'touch', clientX: -100, clientY: 305 })
  expect(onIndexChange).toHaveBeenLastCalledWith(3)
})
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/book/useFlipDrag.test.tsx src/book/Book.test.tsx`
Expected: FAIL (`classifySwipe` a `isSwipeStartAllowed` neexistují, dotyk na obsahu nic nespustí, `onClickCapture` chybí).

- [ ] **Step 3: Implementace**

`src/book/useFlipDrag.ts` celý:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import type React from 'react'
import { finishFlip, progressFromPointer, type FlipDirection, type FlipState } from './flip'
import { inHorizontalScroller } from './wheel'

const INTERACTIVE = 'input, textarea, select, button, a, label, [contenteditable]'
const FORM_FIELD = 'input, textarea, select, [contenteditable]'

/**
 * Myš: otáčení smí začít jen z úchytu `.page-edge` na vnějším okraji stránky,
 * nikdy z interaktivního prvku. Směr určuje třída úchytu.
 */
export function isDragStartAllowed(target: EventTarget | null): FlipDirection | null {
  if (!(target instanceof Element)) return null
  if (target.closest(INTERACTIVE)) return null
  const edge = target.closest('.page-edge')
  if (!edge) return null
  if (edge.classList.contains('page-edge--right')) return 'next'
  if (edge.classList.contains('page-edge--left')) return 'prev'
  return null
}

/** Prst se musí posunout aspoň o tolik px, než se rozhodne, zda jde o švih (listování), nebo o scroll. */
export const SWIPE_SLOP_PX = 10
/** Švih je vodorovný, když |dx| ≥ 1,2 × |dy|; jinak patří svislému scrollu stránky. */
export const SWIPE_HORIZONTAL_RATIO = 1.2
/** Jak dlouho po švihu se spolkne klik (prst skončil na tlačítku nebo řádku obsahu). */
export const SWIPE_CLICK_GUARD_MS = 400

export type SwipeIntent = FlipDirection | 'vertical' | null

/** Rozpozná gesto prstu podle posunu od začátku: null = ještě nerozhodnuto, `next` = švih doleva, `prev` = doprava. */
export function classifySwipe(dx: number, dy: number): SwipeIntent {
  if (Math.hypot(dx, dy) < SWIPE_SLOP_PX) return null
  if (Math.abs(dx) < Math.abs(dy) * SWIPE_HORIZONTAL_RATIO) return 'vertical'
  return dx < 0 ? 'next' : 'prev'
}

/**
 * Švih prstem smí začít kdekoli na stránce – i na tlačítku nebo řádku obsahu (klepnutí dál funguje, rozhoduje až pohyb),
 * jen ne ve formulářovém poli a ve vodorovně scrollujícím prvku (široká tabulka), kde vodorovný tah patří jim.
 */
export function isSwipeStartAllowed(target: EventTarget | null, boundary: Element): boolean {
  if (!(target instanceof Element)) return false
  if (!target.closest('.page')) return false
  if (target.closest(FORM_FIELD)) return false
  return !inHorizontalScroller(target, boundary)
}

const isTouch = (e: React.PointerEvent) => e.pointerType === 'touch' || e.pointerType === 'pen'

const DURATION_MS = 350
const MIN_SAMPLE_MS = 8
const STALE_VELOCITY_MS = 100
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

interface Options {
  pageWidth: number
  canNext: boolean
  canPrev: boolean
  onComplete: (dir: FlipDirection) => void
}

export function useFlipDrag({ pageWidth, canNext, canPrev, onComplete }: Options) {
  const [flip, setFlip] = useState<FlipState | null>(null)
  const drag = useRef<{ pointerId: number; startX: number; lastX: number; lastT: number; velocity: number; direction: FlipDirection } | null>(null)
  // dotyk, u kterého se ještě nerozhodlo, zda je to švih, nebo scroll
  const pending = useRef<{ pointerId: number; startX: number; startY: number } | null>(null)
  // do kdy se spolkne klik po švihu (Infinity = švih právě běží)
  const clickGuardUntil = useRef(0)
  const raf = useRef<number | null>(null)

  const cancelAnimation = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current)
    raf.current = null
  }, [])

  // při odmontování zrušíme běžící animaci
  useEffect(() => cancelAnimation, [cancelAnimation])

  const animateTo = useCallback(
    (from: number, to: number, direction: FlipDirection, done: () => void) => {
      if (reducedMotion()) { done(); return }
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION_MS)
        const p = from + (to - from) * easeOut(t)
        setFlip({ direction, progress: p, dragging: false })
        if (t < 1) {
          raf.current = requestAnimationFrame(tick)
        } else {
          raf.current = null
          done()
        }
      }
      raf.current = requestAnimationFrame(tick)
    },
    [],
  )

  /** Začne tažení listu; nový drag ruší dobíhající animaci (její onComplete se nezavolá). */
  const beginDrag = useCallback(
    (e: React.PointerEvent, startX: number, direction: FlipDirection) => {
      cancelAnimation()
      drag.current = { pointerId: e.pointerId, startX, lastX: e.clientX, lastT: performance.now(), velocity: 0, direction }
      ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
      setFlip({ direction, progress: progressFromPointer(startX, e.clientX, pageWidth, direction), dragging: true })
    },
    [cancelAnimation, pageWidth],
  )

  const onPointerDown = useCallback<React.PointerEventHandler>(
    (e) => {
      if (drag.current || pending.current) return
      if (isTouch(e)) {
        // dotyk: úchyt na okraji displeje koliduje se systémovým gestem zpět – švih kdekoli na stránce, směr určí pohyb (R14)
        if (isSwipeStartAllowed(e.target, e.currentTarget as Element)) {
          pending.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY }
        }
        return
      }
      const direction = isDragStartAllowed(e.target)
      if (!direction) return
      if (direction === 'next' && !canNext) return
      if (direction === 'prev' && !canPrev) return
      beginDrag(e, e.clientX, direction)
    },
    [canNext, canPrev, beginDrag],
  )

  const onPointerMove = useCallback<React.PointerEventHandler>(
    (e) => {
      const p = pending.current
      if (p && e.pointerId === p.pointerId) {
        const intent = classifySwipe(e.clientX - p.startX, e.clientY - p.startY)
        if (intent === null) return
        pending.current = null
        if (intent === 'vertical') return // svislý tah patří scrollu stránky (touch-action: pan-y)
        if ((intent === 'next' && !canNext) || (intent === 'prev' && !canPrev)) return
        clickGuardUntil.current = Number.POSITIVE_INFINITY
        beginDrag(e, p.startX, intent)
        return
      }
      const d = drag.current
      if (!d || e.pointerId !== d.pointerId) return
      const now = performance.now()
      const dt = now - d.lastT
      // příliš krátké intervaly dávají nespolehlivou rychlost – vzorek přeskočíme a necháme dx narůst
      if (dt >= MIN_SAMPLE_MS) {
        const dx = e.clientX - d.lastX
        // rychlost kladná ve směru dokončení otáčení
        d.velocity = (d.direction === 'next' ? -dx : dx) / dt
        d.lastX = e.clientX
        d.lastT = now
      }
      setFlip({ direction: d.direction, progress: progressFromPointer(d.startX, e.clientX, pageWidth, d.direction), dragging: true })
    },
    [pageWidth, canNext, canPrev, beginDrag],
  )

  const release = useCallback(
    (e: React.PointerEvent, cancelled: boolean) => {
      // klepnutí nebo nerozhodnutý dotyk: nic se neotáčí, klik projde
      if (pending.current && pending.current.pointerId === e.pointerId) {
        pending.current = null
        return
      }
      const d = drag.current
      if (!d || e.pointerId !== d.pointerId) return
      drag.current = null
      if (clickGuardUntil.current === Number.POSITIVE_INFINITY) clickGuardUntil.current = performance.now() + SWIPE_CLICK_GUARD_MS
      ;(e.currentTarget as Element).releasePointerCapture?.(e.pointerId)
      // při pointercancel je clientX nespolehlivý – použijeme poslední známou polohu
      const x = cancelled ? d.lastX : e.clientX
      const progress = progressFromPointer(d.startX, x, pageWidth, d.direction)
      // zastaralá rychlost (ukazatel dlouho stál) se ignoruje
      const velocity = performance.now() - d.lastT > STALE_VELOCITY_MS ? 0 : d.velocity
      const result = cancelled ? 'cancelled' : finishFlip(progress, velocity)
      const target = result === 'complete' ? 1 : 0
      animateTo(progress, target, d.direction, () => {
        setFlip(null)
        if (result === 'complete') onComplete(d.direction)
      })
    },
    [pageWidth, animateTo, onComplete],
  )

  /** Animované otočení bez tažení (tlačítka, klávesy). Během tažení či animace nic nedělá. */
  const start = useCallback(
    (direction: FlipDirection) => {
      if (drag.current || raf.current !== null) return
      if (direction === 'next' && !canNext) return
      if (direction === 'prev' && !canPrev) return
      setFlip({ direction, progress: 0, dragging: false })
      animateTo(0, 1, direction, () => {
        setFlip(null)
        onComplete(direction)
      })
    },
    [canNext, canPrev, animateTo, onComplete],
  )

  const onPointerUp = useCallback<React.PointerEventHandler>((e) => release(e, false), [release])
  const onPointerCancel = useCallback<React.PointerEventHandler>((e) => release(e, true), [release])

  /** Klik na konci švihu (prst skončil na řádku obsahu nebo tlačítku) se spolkne – švih nemá nic otevřít. */
  const onClickCapture = useCallback<React.MouseEventHandler>((e) => {
    if (performance.now() > clickGuardUntil.current) return
    clickGuardUntil.current = 0
    e.preventDefault()
    e.stopPropagation()
  }, [])

  return {
    flip,
    start,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture },
  }
}
```

- [ ] **Step 4: Spustit testy – musí projít**

Run: `npx vitest run src/book`
Expected: PASS (včetně dosavadních testů myši a úchytu).

- [ ] **Step 5: Všechny kontroly**

Run: `npm test && npm run lint && npm run build && npm run validate`
Expected: PASS. Reálný dotyk se ověřuje v Tasku 10.

- [ ] **Step 6: Předat controlleru (necommitovat)**

Soubory: `src/book/useFlipDrag.ts`, `src/book/useFlipDrag.test.tsx`, `src/book/Book.test.tsx`. Návrh zprávy: `fix(mobil): švih prstem po stránce listuje, svislý tah scrolluje (R2)`.

---

### Task 8: Stránkování obsahu podle výšek, kapitoly navazují, lámání názvů

**Files:**
- Modify: `src/content/search.ts` (stránkování), `src/pages/TocPages.tsx` (celý), `src/styles/paper.css` (blok obsahu)
- Test: `src/content/search.test.ts`, `src/pages/TocPages.test.tsx`, `src/styles/paper.test.ts`

**Interfaces:**
- Consumes: `buildTocRows`, `tocRowUnits`, `TOC_PAGE_UNITS`, `TOC_FIRST_PAGE_UNITS` (beze změny, teď jen záložní odhad).
- Produces:
```ts
// src/content/search.ts
export interface TocMetrics { capacity: number; head: number; rows: ReadonlyMap<string, number> }
export const TOC_SAFETY_PX = 2
export function tocRowKey(row: TocRow): string                       // 'c:<kapitola>' | 'r:<id receptu>'
export function usableMetrics(m: TocMetrics | null | undefined): m is TocMetrics
export function paginateTocRows(rows: TocRow[], metrics?: TocMetrics | null): TocRow[][]
export function tocPageCount(recipes: Recipe[], metrics?: TocMetrics | null): number
// src/pages/TocPages.tsx
export function TocHead(props: { recipes: Recipe[]; filter: Filter; onFilterChange: (f: Filter) => void; onNewRecipe?: () => void })
export function TocListItem(props: { row: TocRow; pageNumber: number | undefined; favorite: boolean; inCart: boolean; onNavigate: (r: Route) => void; onToggleFavorite: (id: string) => void; onToggleCart: (id: string) => void })
TocPagesProps.metrics?: TocMetrics | null
```

- [ ] **Step 1: Napsat failing testy stránkování**

V `src/content/search.test.ts` rozšířit import ze `./search` o `TOC_SAFETY_PX, tocRowKey, usableMetrics, type TocMetrics` a přidat:

```ts
const allRows = buildTocRows(recipes)
// výšky jako v prohlížeči: kapitola 40 px, recept 24 px, dvouřádkový název 46 px
const sizes = new Map(allRows.map((row) => [tocRowKey(row), row.kind === 'chapter' ? 40 : row.recipe.title.length > 30 ? 46 : 24]))
const desktop: TocMetrics = { capacity: 640, head: 230, rows: sizes }
const height = (rows: TocRow[]) => rows.reduce((s, r) => s + sizes.get(tocRowKey(r))!, 0)

test('tocRowKey je jednoznačný pro kapitoly i recepty', () => {
  const keys = allRows.map(tocRowKey)
  expect(new Set(keys).size).toBe(keys.length)
  expect(tocRowKey({ kind: 'chapter', chapter: 'polevky' })).toBe('c:polevky')
  expect(tocRowKey({ kind: 'recipe', recipe: recipes[0] })).toBe(`r:${recipes[0].id}`)
})

test('naměřené výšky: žádná stránka nepřeteče a každá je zaplněná (další řádek by se nevešel)', () => {
  const pages = paginateTocRows(allRows, desktop)
  pages.forEach((page, i) => {
    const cap = (i === 0 ? desktop.capacity - desktop.head : desktop.capacity) - TOC_SAFETY_PX
    expect(height(page)).toBeLessThanOrEqual(cap)
    const next = pages[i + 1]
    if (!next) return
    const need = sizes.get(tocRowKey(next[0]))! + (next[0].kind === 'chapter' ? sizes.get(tocRowKey(next[1]))! : 0)
    expect(height(page) + need).toBeGreaterThan(cap)
  })
  expect(pages.flat()).toHaveLength(allRows.length)
})

test('kapitoly navazují na téže stránce a nadpis kapitoly nezůstane sám na konci', () => {
  const pages = paginateTocRows(allRows, desktop)
  expect(pages.some((p) => p.filter((r) => r.kind === 'chapter').length >= 2)).toBe(true)
  for (const p of pages) if (p.length) expect(p.at(-1)?.kind).toBe('recipe')
})

test('naměřená kapacita dává méně stránek než odhad v jednotkách (stránky se skutečně využijí)', () => {
  expect(paginateTocRows(allRows, desktop).length).toBeLessThan(paginateTocRows(allRows).length)
  expect(tocPageCount(recipes, desktop)).toBe(paginateTocRows(allRows, desktop).length)
})

test('hlavička vyšší než stránka: první stránka zůstane jen s filtry, řádky začnou na druhé', () => {
  const pages = paginateTocRows(allRows, { capacity: 300, head: 400, rows: sizes })
  expect(pages[0]).toEqual([])
  expect(pages[1][0].kind).toBe('chapter')
  expect(pages.flat()).toHaveLength(allRows.length)
})

test('nepoužitelné měření (nuly z jsdom nebo skryté knihy) → odhad v jednotkách', () => {
  const zero = new Map([...sizes.keys()].map((k) => [k, 0]))
  expect(usableMetrics({ capacity: 0, head: 0, rows: sizes })).toBe(false)
  expect(usableMetrics({ capacity: 640, head: 0, rows: zero })).toBe(false)
  expect(usableMetrics({ capacity: 640, head: 0, rows: new Map() })).toBe(false)
  expect(usableMetrics(null)).toBe(false)
  expect(usableMetrics(desktop)).toBe(true)
  expect(paginateTocRows(allRows, { capacity: 640, head: 0, rows: zero })).toEqual(paginateTocRows(allRows))
})
```

- [ ] **Step 2: Napsat failing testy komponenty a CSS**

V `src/pages/TocPages.test.tsx` rozšířit import ze `@/content/search` o `buildTocRows, tocRowKey` a přidat:

```tsx
test('hlavička první stránky je jeden měřitelný celek, řádky nesou klíč pro měření', () => {
  const { container } = setup()
  const head = container.querySelector('.toc-head')!
  expect(head.querySelector('h2')).toHaveTextContent('Obsah')
  expect(head.querySelector('.toc-filters')).not.toBeNull()
  const keys = [...container.querySelectorAll<HTMLElement>('.toc-list > li')].map((li) => li.dataset.tocKey ?? '')
  expect(keys.length).toBeGreaterThan(0)
  expect(keys.every((k) => /^(c|r):/.test(k))).toBe(true)
})

test('další stránka obsahu hlavičku nemá', () => {
  const { container } = setup({ page: 1 })
  expect(container.querySelector('.toc-head')).toBeNull()
})

test('s naměřenou kapacitou se celý obsah vejde na první stránku', () => {
  const rows = new Map(buildTocRows(recipes).map((r) => [tocRowKey(r), 20]))
  const { container } = setup({ metrics: { capacity: 100_000, head: 200, rows } })
  expect(container.querySelectorAll('.toc-recipe')).toHaveLength(recipes.length)
  expect(screen.getByText('Strana obsahu 1 z 1')).toBeInTheDocument()
})

test('filtr: prázdná další stránka obsahu odkáže na předchozí strany', () => {
  setup({ page: 1, filter: { ...EMPTY_FILTER, query: 'gulas' } })
  expect(screen.getByText('Výsledky filtru jsou na předchozích stranách obsahu.')).toBeInTheDocument()
})
```

Do `src/styles/paper.test.ts` přidat:

```ts
test('obsah: hlavička a nadpis kapitoly drží okraje uvnitř (měřitelná výška), název se láme po slovech', () => {
  expect(body('.toc-head')).toMatch(/display:\s*flow-root/)
  expect(body('.toc-chapter')).toMatch(/display:\s*flow-root/)
  expect(body('.toc-row-title')).toMatch(/overflow-wrap:\s*break-word/)
  expect(body('.toc-row-title')).not.toMatch(/anywhere/)
  expect(body('.toc-row')).toMatch(/align-items:\s*last baseline/)
  expect(body('.toc-row-page')).toMatch(/flex:\s*none/)
})
```

- [ ] **Step 3: Spustit testy – musí selhat**

Run: `npx vitest run src/content/search.test.ts src/pages/TocPages.test.tsx src/styles/paper.test.ts`
Expected: FAIL (`tocRowKey`, `TocMetrics`, `.toc-head`, `data-toc-key` neexistují).

- [ ] **Step 4: Implementace stránkování**

V `src/content/search.ts` nahradit vše od komentáře nad `TOC_PAGE_UNITS` až do konce souboru:

```ts
/**
 * Záložní odhad kapacity stránky obsahu v „jednotkách“ (1 jednotka = řádek receptu 23 px) – platí, dokud
 * prohlížeč stránku nezměří (jsdom, první vykreslení). Naměřené výšky viz `TocMetrics` (R9).
 */
export const TOC_PAGE_UNITS = 16
/** První stránka nese nadpis „Obsah“, panel filtrů a tlačítko „Nový recept“ (≈ 230 px; na 320 px se řádek „Moje“ zalomí). */
export const TOC_FIRST_PAGE_UNITS = 6
/** Delší název se na mobilu zalomí na dva řádky (odhad; při měření se použije skutečná výška). */
export const TOC_LONG_TITLE_CHARS = 18

/** Ikona „vlastní“ za názvem zabere asi dva znaky. */
const OWN_MARK_CHARS = 2

export function tocRowUnits(row: TocRow): number {
  if (row.kind === 'chapter') return 2 // nadpis s okrajem a linkou (35 px)
  const chars = row.recipe.title.length + (row.recipe.source.book === 'vlastni' ? OWN_MARK_CHARS : 0)
  return chars > TOC_LONG_TITLE_CHARS ? 2 : 1
}

/** Naměřené rozměry obsahu v px (TocProbe): kapacita těla stránky, hlavička první stránky, výška každého řádku podle `tocRowKey`. */
export interface TocMetrics {
  capacity: number
  head: number
  rows: ReadonlyMap<string, number>
}

/** Rezerva proti subpixelovému zaokrouhlení: stránka se plní nejvýš do kapacity minus 2 px. */
export const TOC_SAFETY_PX = 2

/** Klíč řádku obsahu pro měření (`data-toc-key`) i pro React. */
export function tocRowKey(row: TocRow): string {
  return row.kind === 'chapter' ? `c:${row.chapter}` : `r:${row.recipe.id}`
}

/** Měření je použitelné, jen když prohlížeč stránku opravdu rozložil (jsdom a skrytá kniha dávají nuly). */
export function usableMetrics(m: TocMetrics | null | undefined): m is TocMetrics {
  if (!m || !(m.capacity > 0) || !Number.isFinite(m.capacity) || !(m.head >= 0) || !Number.isFinite(m.head) || m.rows.size === 0) return false
  for (const h of m.rows.values()) if (!(h > 0) || !Number.isFinite(h)) return false
  return true
}

interface Sizing {
  first: number
  rest: number
  size: (row: TocRow) => number
}

function sizing(metrics: TocMetrics | null | undefined): Sizing {
  if (!usableMetrics(metrics)) return { first: TOC_FIRST_PAGE_UNITS, rest: TOC_PAGE_UNITS, size: tocRowUnits }
  // řádek, který se neměřil (nemělo by nastat), dostane výšku nejvyššího změřeného – raději víc místa než přetečení
  const fallback = Math.max(...metrics.rows.values())
  return {
    first: metrics.capacity - metrics.head - TOC_SAFETY_PX,
    rest: metrics.capacity - TOC_SAFETY_PX,
    size: (row) => metrics.rows.get(tocRowKey(row)) ?? fallback,
  }
}

/**
 * Rozdělí řádky obsahu na stránky: podle naměřených výšek, jinak podle odhadu v jednotkách (R9, R10).
 * Kapitoly navazují na téže stránce; nadpis kapitoly drží pohromadě s prvním receptem.
 * První stránka smí zůstat jen s hlavičkou (filtry vyšší než stránka); na další stránce se řádek umístí vždy.
 */
export function paginateTocRows(rows: TocRow[], metrics?: TocMetrics | null): TocRow[][] {
  const { first, rest, size } = sizing(metrics)
  const pages: TocRow[][] = [[]]
  let used = 0
  rows.forEach((row, i) => {
    const current = pages[pages.length - 1]
    const cap = pages.length === 1 ? first : rest
    const own = size(row)
    const next = rows[i + 1]
    const need = row.kind === 'chapter' && next?.kind === 'recipe' ? own + size(next) : own
    const emptyFirst = pages.length === 1 && current.length === 0
    if (used + need > cap && (current.length > 0 || emptyFirst)) {
      pages.push([row])
      used = own
    } else {
      current.push(row)
      used += own
    }
  })
  return pages
}

/**
 * Řádky pro stránku obsahu `page` z `total` (počet stránek je pevný podle nefiltrovaného obsahu).
 * Kdyby filtrovaný obsah potřeboval víc stránek, zbytek se vykreslí na poslední stránce (nic se neztratí).
 */
export function tocRowsForPage(pages: TocRow[][], page: number, total: number): TocRow[] {
  if (page === total - 1) return pages.slice(page).flat()
  return pages[page] ?? []
}

/** Počet stránek obsahu; počítá se z nefiltrovaného seznamu, aby se layout filtrem neměnil. */
export function tocPageCount(recipes: Recipe[], metrics?: TocMetrics | null): number {
  return paginateTocRows(buildTocRows(recipes), metrics).length
}
```

(Pozor: `emptyFirst` s `used + need > cap` u záložního odhadu nikdy nenastane – `need` je nejvýš 4 jednotky a první stránka jich má 6 –, takže dosavadní testy stránkování platí beze změny.)

- [ ] **Step 5: Implementace stránky obsahu**

`src/pages/TocPages.tsx` celý:

```tsx
import type { ReactNode } from 'react'
import { CHAPTER_META } from '@/content/chapters'
import { BOOK_META } from '@/content/books'
import { FILTER_TAGS, FILTER_TAG_LABEL } from '@/content/derivedTags'
import {
  buildTocRows, filterRecipes, paginateTocRows, tocPageCount, tocRowKey, tocRowsForPage,
  type Filter, type TocMetrics, type TocRow,
} from '@/content/search'
import { EQUIPMENT } from '@/domain/schema'
import type { Book, Ingredient, Recipe } from '@/domain/types'
import type { Route } from '@/app/route'
import { isCustomRecipe } from '@/content/customRecipes'
import { HeartIcon, PenIcon } from './icons'
import { EQUIPMENT_LABEL } from './labels'
import { RecipeMarks } from './RecipeMarks'

const FILTER_BOOKS: Book[] = ['italian-1919', 'feldkochbuch-1940', 'navy-1944', 'afrs-2003']

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

interface TocPagesProps {
  /** Všechny recepty (nefiltrované). */
  recipes: Recipe[]
  ingredients: Map<string, Ingredient>
  filter: Filter
  onFilterChange: (filter: Filter) => void
  favorites: Set<string>
  /** Číslo stránky knihy pro každý recept (id → index stránky receptu v aktuálním režimu). */
  pageNumbers: Map<string, number>
  /** Index stránky obsahu (0 = první, s panelem filtrů). */
  page: number
  onNavigate: (route: Route) => void
  onToggleFavorite: (id: string) => void
  inCart: Set<string>
  onToggleCart: (id: string) => void
  /** Otevře formulář nového vlastního receptu (pilulka v řádku „Moje“ na první stránce). */
  onNewRecipe?: () => void
  /** Naměřené výšky (TocProbe); bez nich platí odhad v jednotkách. */
  metrics?: TocMetrics | null
}

function Pill({ label, pressed, onClick, icon }: { label: string; pressed: boolean; onClick: () => void; icon?: ReactNode }) {
  return (
    <button type="button" className={`toc-pill${pressed ? ' toc-pill--on' : ''}`} aria-pressed={pressed} onClick={onClick}>
      {icon}
      {label}
    </button>
  )
}

interface HeadProps {
  recipes: Recipe[]
  filter: Filter
  onFilterChange: (filter: Filter) => void
  onNewRecipe?: () => void
}

function FilterPanel({ recipes, filter, onFilterChange, onNewRecipe }: HeadProps) {
  // jen vybavení, které některý recept opravdu uvádí (pilulka bez receptů by vždy vrátila „Nic nenalezeno“)
  const equipment = EQUIPMENT.filter((e) => recipes.some((r) => r.equipment.includes(e)))
  // „Vlastní“ jen když nějaký vlastní recept existuje (pilulka bez receptů by vždy vrátila „Nic nenalezeno“)
  const books: Book[] = recipes.some(isCustomRecipe) ? [...FILTER_BOOKS, 'vlastni'] : FILTER_BOOKS
  return (
    <div className="toc-filters">
      <fieldset>
        <legend>Štítky</legend>
        {FILTER_TAGS.map((t) => (
          <Pill key={t} label={FILTER_TAG_LABEL[t]} pressed={filter.tags.includes(t)} onClick={() => onFilterChange({ ...filter, tags: toggle(filter.tags, t) })} />
        ))}
      </fieldset>
      <fieldset>
        <legend>Vybavení</legend>
        {equipment.map((e) => (
          <Pill key={e} label={EQUIPMENT_LABEL[e]} pressed={filter.equipment.includes(e)} onClick={() => onFilterChange({ ...filter, equipment: toggle(filter.equipment, e) })} />
        ))}
      </fieldset>
      <fieldset>
        <legend>Zdroj</legend>
        {books.map((b) => (
          <Pill key={b} label={BOOK_META[b].shortTitle} pressed={filter.books.includes(b)} onClick={() => onFilterChange({ ...filter, books: toggle(filter.books, b) })} />
        ))}
      </fieldset>
      <fieldset>
        <legend>Moje</legend>
        <Pill icon={<HeartIcon filled={filter.favoritesOnly} />} label="Jen oblíbené" pressed={filter.favoritesOnly} onClick={() => onFilterChange({ ...filter, favoritesOnly: !filter.favoritesOnly })} />
        {onNewRecipe && (
          <button type="button" className="toc-pill toc-pill--new" onClick={onNewRecipe}>
            <span aria-hidden="true">+ </span>Nový recept
          </button>
        )}
      </fieldset>
    </div>
  )
}

/** Hlavička první stránky obsahu: nadpis a filtry; měří se jako celek (`display: flow-root`). */
export function TocHead(props: HeadProps) {
  return (
    <div className="toc-head">
      <h2 className="toc-title">Obsah</h2>
      <FilterPanel {...props} />
    </div>
  )
}

interface ListItemProps {
  row: TocRow
  pageNumber: number | undefined
  favorite: boolean
  inCart: boolean
  onNavigate: (route: Route) => void
  onToggleFavorite: (id: string) => void
  onToggleCart: (id: string) => void
}

/** Jeden řádek obsahu (nadpis kapitoly nebo recept); `data-toc-key` slouží k měření výšky (TocProbe). */
export function TocListItem({ row, pageNumber, favorite, inCart, onNavigate, onToggleFavorite, onToggleCart }: ListItemProps) {
  if (row.kind === 'chapter') {
    return (
      <li className="toc-chapter" data-toc-key={tocRowKey(row)}>
        <h3>{CHAPTER_META[row.chapter].title}</h3>
      </li>
    )
  }
  const { recipe } = row
  return (
    <li className="toc-recipe" data-toc-key={tocRowKey(row)}>
      {/* značky uvnitř obsahové plochy: mimo úchyt pro otáčení na vnějším okraji stránky */}
      <RecipeMarks
        compact
        label={recipe.title}
        favorite={favorite}
        onToggleFavorite={() => onToggleFavorite(recipe.id)}
        inCart={inCart}
        onToggleCart={() => onToggleCart(recipe.id)}
      />
      <button type="button" className="toc-row" onClick={() => onNavigate({ kind: 'recipe', id: recipe.id })}>
        <span className="toc-row-title">{recipe.title}</span>
        {isCustomRecipe(recipe) && (
          <>
            {/* mezera mezi názvem a skrytým textem pro přístupné jméno tlačítka */}
            {' '}
            <span className="toc-row-own" title="Vlastní recept">
              <PenIcon />
              <span className="visually-hidden">(vlastní)</span>
            </span>
          </>
        )}
        <span className="toc-row-dots" aria-hidden="true" />
        <span className="toc-row-page">{pageNumber}</span>
      </button>
    </li>
  )
}

function emptyText(filter: Filter, favorites: Set<string>): string {
  if (filter.favoritesOnly && favorites.size === 0) return 'Zatím žádné oblíbené recepty – označ srdíčko u receptu.'
  return 'Nic nenalezeno.'
}

/** Obsah rozdělený na stránky; komponenta vykreslí jednu stránku (`page`). Stav filtru drží rodič. */
export function TocPages({ recipes, ingredients, filter, onFilterChange, favorites, pageNumbers, page, onNavigate, onToggleFavorite, inCart, onToggleCart, onNewRecipe, metrics }: TocPagesProps) {
  const total = tocPageCount(recipes, metrics)
  const filtered = filterRecipes(recipes, ingredients, filter, { favorites })
  const rows = tocRowsForPage(paginateTocRows(buildTocRows(filtered), metrics), page, total)

  return (
    <div className="toc-page">
      {page === 0 && <TocHead recipes={recipes} filter={filter} onFilterChange={onFilterChange} onNewRecipe={onNewRecipe} />}
      {filtered.length === 0 && page === 0 && <p className="toc-empty">{emptyText(filter, favorites)}</p>}
      {filtered.length > 0 && rows.length === 0 && page > 0 && <p className="toc-empty">Výsledky filtru jsou na předchozích stranách obsahu.</p>}
      <ul className="toc-list">
        {rows.map((row) => (
          <TocListItem
            key={tocRowKey(row)}
            row={row}
            pageNumber={row.kind === 'recipe' ? pageNumbers.get(row.recipe.id) : undefined}
            favorite={row.kind === 'recipe' && favorites.has(row.recipe.id)}
            inCart={row.kind === 'recipe' && inCart.has(row.recipe.id)}
            onNavigate={onNavigate}
            onToggleFavorite={onToggleFavorite}
            onToggleCart={onToggleCart}
          />
        ))}
      </ul>
      <span className="visually-hidden">Strana obsahu {page + 1} z {total}</span>
    </div>
  )
}
```

- [ ] **Step 6: CSS obsahu**

V `src/styles/paper.css` v bloku `/* ===== obsah ===== */`:
- za řádek `.toc-page { font-size: 0.95rem; }` přidat:

```css
/* hlavička a nadpis kapitoly drží okraje uvnitř svého boxu: měřená výška = skutečně zabrané místo (R9) */
.toc-head { display: flow-root; }
.toc-chapter { display: flow-root; }
```

- řádky `.toc-recipe { … }`, `.toc-row { … }`, `.toc-row-title { … }`, `.toc-row-dots { … }`, `.toc-row-page { … }` nahradit:

```css
.toc-recipe { display: flex; align-items: last baseline; gap: 0.35em; }
/* dlouhý název se láme po slovech; tečky a číslo strany sedí na jeho posledním řádku (R11) */
.toc-row { flex: 1; min-width: 0; display: flex; align-items: last baseline; gap: 0.3em; font: inherit; color: inherit; text-align: left; background: none; border: 0; padding: 0.1em 0; cursor: pointer; }
.toc-row-title { flex: 0 1 auto; min-width: 0; overflow-wrap: break-word; text-wrap: pretty; }
.toc-row-dots { flex: 1 0 1.5em; border-bottom: 1px dotted var(--ink-soft); transform: translateY(-0.25em); }
.toc-row-page { flex: none; white-space: nowrap; font-variant-numeric: tabular-nums; }
```

(Pravidlo `.toc-row:hover .toc-row-title { text-decoration: underline; }` zůstává.)

- [ ] **Step 7: Spustit testy – musí projít**

Run: `npx vitest run src/content/search.test.ts src/pages/TocPages.test.tsx src/styles/paper.test.ts src/App.test.tsx`
Expected: PASS (App beze změny – bez `metrics` platí odhad).

- [ ] **Step 8: Všechny kontroly**

Run: `npm test && npm run lint && npm run build && npm run validate`
Expected: PASS.

- [ ] **Step 9: Předat controlleru (necommitovat)**

Soubory: `src/content/search.ts`, `src/content/search.test.ts`, `src/pages/TocPages.tsx`, `src/pages/TocPages.test.tsx`, `src/styles/paper.css`, `src/styles/paper.test.ts`. Návrh zprávy: `feat(obsah): stránkování podle výšek řádků, kapitoly navazují, název se láme po slovech (R2)`.

---

### Task 9: Měření obsahu v knize (měřicí slot, TocProbe, zapojení)

**Files:**
- Create: `src/pages/tocMeasure.ts`, `src/pages/TocProbe.tsx`
- Modify: `src/book/Book.tsx`, `src/App.tsx`, `src/styles/book.css`, `src/styles/paper.css`, `src/styles/print.css`
- Test: `src/pages/tocMeasure.test.ts` (nový), `src/pages/TocProbe.test.tsx` (nový), `src/book/Book.test.tsx`, `src/App.test.tsx`, `src/styles/book.test.ts`, `src/styles/print.test.ts`

**Interfaces:**
- Consumes: `TocMetrics`, `usableMetrics`, `tocRowKey`, `buildTocRows`, `EMPTY_FILTER`, `tocPageCount(recipes, metrics)` (Task 8); `TocHead`, `TocListItem` (Task 8); `Page` (`src/book/Page.tsx`); `mode` v `App` (Task 6).
- Produces:
```ts
// src/pages/tocMeasure.ts
export function measureToc(root: HTMLElement): TocMetrics | null
export function sameMetrics(a: TocMetrics | null, b: TocMetrics | null): boolean
// src/pages/TocProbe.tsx
export function TocProbe(props: { recipes: Recipe[]; onMeasure: (metrics: TocMetrics) => void })
// src/book/Book.tsx
BookProps.measure?: ReactNode   // vykreslí se do .book__measure (aria-hidden, inert)
```

- [ ] **Step 1: Napsat failing testy měření**

`src/pages/tocMeasure.test.ts`:

```ts
import { measureToc, sameMetrics } from './tocMeasure'

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
```

`src/pages/TocProbe.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { loadContent } from '@/content/loadContent'
import { buildTocRows, tocRowKey } from '@/content/search'
import { TocProbe } from './TocProbe'

const { recipes } = loadContent()

test('vykreslí hlavičku a všechny řádky obsahu s klíči pro měření a jednotným číslem strany', () => {
  const { container } = render(<TocProbe recipes={recipes} onMeasure={vi.fn()} />)
  expect(container.querySelector('.toc-head .toc-filters')).not.toBeNull()
  expect(container.querySelector('.toc-pill--new')).not.toBeNull() // jako na skutečné první stránce
  const keys = [...container.querySelectorAll<HTMLElement>('[data-toc-key]')].map((el) => el.dataset.tocKey)
  expect(keys).toEqual(buildTocRows(recipes).map(tocRowKey))
  const numbers = new Set([...container.querySelectorAll('.toc-row-page')].map((el) => el.textContent))
  expect([...numbers]).toEqual(['888'])
})

test('bez rozložení (jsdom) nic nehlásí – zůstane odhad v jednotkách', () => {
  const onMeasure = vi.fn()
  render(<TocProbe recipes={recipes} onMeasure={onMeasure} />)
  expect(onMeasure).not.toHaveBeenCalled()
})

describe('s rozložením', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get(this: HTMLElement) { return this.classList.contains('page-content') ? 640 : 0 },
    })
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const h = this.classList.contains('toc-head') ? 230 : this.classList.contains('toc-chapter') ? 40 : this.classList.contains('toc-recipe') ? 24 : 0
      return { height: h, width: 0, top: 0, left: 0, right: 0, bottom: h, x: 0, y: 0, toJSON() {} } as DOMRect
    })
  })
  afterEach(() => {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight
    vi.restoreAllMocks()
  })

  test('po vykreslení nahlásí kapacitu, hlavičku a výšky všech řádků', () => {
    const onMeasure = vi.fn()
    render(<TocProbe recipes={recipes} onMeasure={onMeasure} />)
    expect(onMeasure).toHaveBeenCalled()
    const m = onMeasure.mock.lastCall![0]
    expect(m.capacity).toBe(640)
    expect(m.head).toBe(230)
    expect(m.rows.size).toBe(buildTocRows(recipes).length)
    expect(m.rows.get('c:polevky')).toBe(40)
  })
})
```

Do `src/book/Book.test.tsx` přidat:

```tsx
test('měřicí slot (measure) je ve dvoustraně, mimo sloty stránek, skrytý před čtečkami i ovládáním', () => {
  const { container } = render(<Book pages={pages} measure={<p>měření</p>} />)
  const slot = container.querySelector('.book__measure')!
  expect(slot).toHaveAttribute('aria-hidden', 'true')
  expect(slot).toHaveAttribute('inert')
  expect(slot.parentElement).toHaveClass('book__spread')
  expect(slot.closest('.book__slot')).toBeNull()
  expect(slot).toHaveTextContent('měření')
})

test('bez measure se měřicí slot nevykreslí', () => {
  const { container } = render(<Book pages={pages} />)
  expect(container.querySelector('.book__measure')).toBeNull()
})
```

Do `src/styles/book.test.ts` přidat:

```ts
test('měřicí slot má rozměr jedné stránky, je neviditelný a mimo hit-testing', () => {
  expect(body('.book__measure')).toMatch(/position:\s*absolute/)
  expect(body('.book__measure')).toMatch(/width:\s*50%/)
  expect(body('.book__measure')).toMatch(/height:\s*100%/)
  expect(body('.book__measure')).toMatch(/visibility:\s*hidden/)
  expect(body('.book__measure')).toMatch(/pointer-events:\s*none/)
  expect(body('.book--single .book__measure')).toMatch(/width:\s*100%/)
})
```

V `src/styles/print.test.ts` do seznamu v testu „v tisku se skryjí ovládací prvky…“ přidat `'.book__measure'`.

V `src/App.test.tsx` přidat (import `loadContent` z `@/content/loadContent`):

```tsx
test('naměřená kapacita stránky: celý obsah se vejde na jednu stránku a layout se přestaví bez smyčky', () => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get(this: HTMLElement) { return this.classList.contains('page-content') ? 100_000 : 0 },
  })
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const h = this.matches('[data-toc-key], .toc-head') ? 20 : 0
    return { height: h, width: 0, top: 0, left: 0, right: 0, bottom: h, x: 0, y: 0, toJSON() {} } as DOMRect
  })
  try {
    history.replaceState(null, '', '#/obsah')
    const { container } = render(<App />)
    expect(container.querySelectorAll('.book__slot--left .toc-recipe')).toHaveLength(loadContent().recipes.length)
    expect(container.querySelector('.book__slot--right .toc-page')).toBeNull() // jediná stránka obsahu
    expect(location.hash).toBe('#/obsah')
  } finally {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight
  }
})
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/pages/tocMeasure.test.ts src/pages/TocProbe.test.tsx src/book/Book.test.tsx src/styles/book.test.ts src/styles/print.test.ts src/App.test.tsx`
Expected: FAIL (moduly neexistují, `measure` prop a `.book__measure` chybí).

- [ ] **Step 3: Měření**

`src/pages/tocMeasure.ts`:

```ts
import { usableMetrics, type TocMetrics } from '@/content/search'

const px = (v: string) => Number.parseFloat(v) || 0

/**
 * Změří měřicí stránku obsahu (TocProbe): kapacitu těla `.page-content` bez svislého paddingu,
 * výšku hlavičky `.toc-head` a každého řádku `[data-toc-key]`. Bez rozložení (nuly) vrací null.
 */
export function measureToc(root: HTMLElement): TocMetrics | null {
  const content = root.querySelector<HTMLElement>('.page-content')
  if (!content) return null
  const style = getComputedStyle(content)
  const capacity = content.clientHeight - px(style.paddingTop) - px(style.paddingBottom)
  const head = root.querySelector<HTMLElement>('.toc-head')?.getBoundingClientRect().height ?? 0
  const rows = new Map<string, number>()
  root.querySelectorAll<HTMLElement>('[data-toc-key]').forEach((el) => {
    rows.set(el.dataset.tocKey ?? '', el.getBoundingClientRect().height)
  })
  const metrics: TocMetrics = { capacity, head, rows }
  return usableMetrics(metrics) ? metrics : null
}

/** Stejné měření (na půl pixelu): nové měření se stejnými čísly nepřestaví layout (žádná smyčka měření ↔ layout). */
export function sameMetrics(a: TocMetrics | null, b: TocMetrics | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  const near = (x: number, y: number) => Math.abs(x - y) < 0.5
  if (!near(a.capacity, b.capacity) || !near(a.head, b.head) || a.rows.size !== b.rows.size) return false
  for (const [key, h] of a.rows) {
    const other = b.rows.get(key)
    if (other === undefined || !near(h, other)) return false
  }
  return true
}
```

`src/pages/TocProbe.tsx`:

```tsx
import { useEffect, useLayoutEffect, useRef } from 'react'
import { Page } from '@/book/Page'
import { EMPTY_FILTER, buildTocRows, tocRowKey, type TocMetrics } from '@/content/search'
import type { Recipe } from '@/domain/types'
import { measureToc } from './tocMeasure'
import { TocHead, TocListItem } from './TocPages'

/** Číslo strany při měření: tři široké číslice, aby šířka řádku nezávisela na skutečném layoutu (žádná zpětná vazba). */
const PROBE_PAGE_NUMBER = 888
const noop = () => {}

interface Props {
  /** Všechny recepty (nefiltrované) – stejné řádky jako obsah. */
  recipes: Recipe[]
  /** Naměřené rozměry; volá se jen s použitelným měřením (ne v jsdom ani se skrytou knihou). */
  onMeasure: (metrics: TocMetrics) => void
}

/**
 * Neviditelná měřicí stránka obsahu (v `measure` slotu knihy má přesně rozměr stránky, R9):
 * hlavička první stránky a všechny řádky obsahu stejnými komponentami jako skutečná stránka.
 * Měří se po vykreslení, při změně velikosti (okno, režim single/spread, načtená písma mění výšku seznamu)
 * a po `document.fonts.ready`.
 */
export function TocProbe({ recipes, onMeasure }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const onMeasureRef = useRef(onMeasure)
  useEffect(() => {
    onMeasureRef.current = onMeasure
  })

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    let alive = true
    const run = () => {
      if (!alive) return
      const metrics = measureToc(root)
      if (metrics) onMeasureRef.current(metrics)
    }
    run()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(run)
    ro?.observe(root)
    const list = root.querySelector('.toc-list')
    if (list) ro?.observe(list)
    void document.fonts?.ready.then(run)
    return () => {
      alive = false
      ro?.disconnect()
    }
  }, [recipes])

  return (
    <div className="toc-probe" ref={rootRef}>
      <Page side="single" pageNumber={PROBE_PAGE_NUMBER}>
        <div className="toc-page">
          <TocHead recipes={recipes} filter={EMPTY_FILTER} onFilterChange={noop} onNewRecipe={noop} />
          <ul className="toc-list">
            {buildTocRows(recipes).map((row) => (
              <TocListItem
                key={tocRowKey(row)}
                row={row}
                pageNumber={PROBE_PAGE_NUMBER}
                favorite={false}
                inCart={false}
                onNavigate={noop}
                onToggleFavorite={noop}
                onToggleCart={noop}
              />
            ))}
          </ul>
        </div>
      </Page>
    </div>
  )
}
```

- [ ] **Step 4: Měřicí slot v knize**

`src/book/Book.tsx`:
- do `BookProps` přidat:

```ts
  /** Neviditelný obsah o rozměru jedné stránky pro měření (obsah knihy, R9); aria-hidden a inert. */
  measure?: ReactNode
```

- přidat `measure` do destrukturování propsů;
- v JSX uvnitř `<div className="book__spread" …>` za `{flipper}` přidat:

```tsx
        {measure && (
          <div className="book__measure" aria-hidden="true" inert>
            {measure}
          </div>
        )}
```

`src/styles/book.css` – za pravidla `.book__slot…` přidat:

```css
/* měřicí slot (R9): rozměr jedné stránky, neviditelný, mimo hit-testing; obsah se podle něj stránkuje */
.book__measure { position: absolute; top: 0; left: 0; width: 50%; height: 100%; overflow: hidden; visibility: hidden; pointer-events: none; z-index: -1; }
.book--single .book__measure { width: 100%; }
```

`src/styles/paper.css` – na konec bloku obsahu přidat:

```css
/* měřicí stránka obsahu: bez posuvníku (skutečná stránka obsahu nepřetéká, šířka řádků musí sedět) */
.toc-probe { height: 100%; }
.toc-probe .page-content { overflow: hidden; }
```

`src/styles/print.css` – v `@media print` do seznamu skrytých prvků („záloha bez data-print“) přidat `.book__measure`.

- [ ] **Step 5: Zapojení v App**

`src/App.tsx`:
- importy: `import { EMPTY_FILTER, tocPageCount, type Filter, type TocMetrics } from '@/content/search'`, `import { TocProbe } from '@/pages/TocProbe'`, `import { sameMetrics } from '@/pages/tocMeasure'`;
- řádky s `mode` a `layout` (z Tasku 6) nahradit:

```tsx
  // režim vlastní App: layout (recept na jedné stránce na mobilu) a s ním čísla stran v obsahu odpovídají režimu (R6)
  const mode = useViewMode()
  // obsah se stránkuje podle naměřené výšky stránky a řádků (R9); do prvního měření platí odhad v jednotkách
  const [tocMetrics, setTocMetrics] = useState<TocMetrics | null>(null)
  // nové měření se stejnými čísly layout nepřestaví (žádná smyčka měření ↔ layout)
  const onTocMeasure = useCallback((m: TocMetrics) => setTocMetrics((prev) => (sameMetrics(prev, m) ? prev : m)), [])
  const tocPages = useMemo(() => tocPageCount(recipes, tocMetrics), [recipes, tocMetrics])
  const layout = useMemo(() => buildLayout(recipes, { tocPageCount: tocPages, mode }), [recipes, tocPages, mode])
  const tocProbe = useMemo(() => <TocProbe recipes={recipes} onMeasure={onTocMeasure} />, [recipes, onTocMeasure])
```

- v `<TocPages …>` přidat `metrics={tocMetrics}` a do pole závislostí `pages` přidat `tocMetrics`;
- `<Book index={index} onIndexChange={setIndex} pages={pages} mode={mode} />` → `<Book index={index} onIndexChange={setIndex} pages={pages} mode={mode} measure={tocProbe} />`.

Pozn.: měřicí stránka je `aria-hidden`, takže dotazy `getByRole` v testech ji ignorují. Kdyby některý existující test v `App.test.tsx` selhal na duplicitním textu z měřicí stránky (`getByText`, nezúžený `querySelector('.toc-…')`), zúžit dotaz na `.book__slot` (neoslabovat očekávání).

- [ ] **Step 6: Spustit testy – musí projít**

Run: `npx vitest run src/pages src/book src/styles src/App.test.tsx`
Expected: PASS.

- [ ] **Step 7: Všechny kontroly**

Run: `npm test && npm run lint && npm run build && npm run validate`
Expected: PASS.

- [ ] **Step 8: Předat controlleru (necommitovat)**

Soubory: `src/pages/tocMeasure.ts`, `src/pages/tocMeasure.test.ts`, `src/pages/TocProbe.tsx`, `src/pages/TocProbe.test.tsx`, `src/book/Book.tsx`, `src/book/Book.test.tsx`, `src/App.tsx`, `src/App.test.tsx`, `src/styles/book.css`, `src/styles/book.test.ts`, `src/styles/paper.css`, `src/styles/print.css`, `src/styles/print.test.ts`. Návrh zprávy: `feat(obsah): měření výšky stránky a řádků v knize, přepočet při změně velikosti a režimu (R2)`.

---

### Task 10: Ruční kontrola v prohlížeči (agent-browser) a opravy nálezů

**Files:** podle nálezů. Zápis do tohoto plánu pod „Nálezy z ruční kontroly“ (na konec souboru). Pomocné soubory jen ve scratchpadu (`…/scratchpad/t10/`), ne v repu.

Implementátor použije skill `agent-browser` (nejdřív `agent-browser skills get core`). Spustí vlastní dev server `npm run dev -- --port <volný port> --strictPort` na pozadí a po skončení ho zastaví (`agent-browser close`, ukončit vite). Interakce vždy **reálným vstupem** (`agent-browser click`, `mouse move/down/up`, `mouse wheel`, `press`, dotyk přes CDP skript níže). `eval` slouží jen ke čtení DOM, měření, čtení `localStorage` a k přípravě stavu (`localStorage.setItem` před `reload`). Před kliknutím na prvek u okraje stránky ověřit, že `document.elementFromPoint(střed)` je cílový prvek. Zapnout `agent-browser set media light reduced-motion` (rAF v tabu na pozadí stojí; švih s reduced motion otočí bez animace). Viewporty: desktop `set viewport 1390 800`, mobil `390 844` a `320 568`, po změně viewportu `reload`. Na začátku `eval "localStorage.clear()"` + `reload`.

**Pomocný CDP skript** `…/scratchpad/t10/cdp.mjs` (Node 25 má globální `WebSocket`; WebSocket URL dá `agent-browser cdp-url`; druhý argument je kus URL stránky, např. `localhost:5199`, nebo `-`, když `cdp-url` vrací přímo WebSocket stránky):

```js
// node cdp.mjs <ws-url> <url-fragment|-> swipe x1 y1 x2 y2 [kroky] | tap x y | pdf <soubor.pdf>
import { writeFileSync } from 'node:fs'
const [wsUrl, urlPart, cmd, ...args] = process.argv.slice(2)
const ws = new WebSocket(wsUrl)
let seq = 0
const waiting = new Map()
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  const w = waiting.get(msg.id)
  if (!w) return
  waiting.delete(msg.id)
  if (msg.error) w.reject(new Error(msg.error.message))
  else w.resolve(msg.result)
}
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = ++seq
    waiting.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
  })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
let sessionId
if (urlPart !== '-') {
  const { targetInfos } = await send('Target.getTargets')
  const target = targetInfos.find((t) => t.type === 'page' && t.url.includes(urlPart))
  if (!target) throw new Error(`stránka s „${urlPart}“ nenalezena`)
  ;({ sessionId } = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true }))
}
const s = (method, params) => send(method, params, sessionId)
if (cmd === 'swipe' || cmd === 'tap') {
  await s('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  const [x1, y1, x2 = x1, y2 = y1, steps = 12] = args.map(Number)
  await s('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y: y1 }] })
  if (cmd === 'swipe') {
    for (let i = 1; i <= steps; i++) {
      await sleep(16)
      await s('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1 + ((x2 - x1) * i) / steps, y: y1 + ((y2 - y1) * i) / steps }] })
    }
  }
  await sleep(16)
  await s('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
} else if (cmd === 'pdf') {
  const { data } = await s('Page.printToPDF', { preferCSSPageSize: true, printBackground: true })
  writeFileSync(args[0], Buffer.from(data, 'base64'))
} else {
  throw new Error(`neznámý příkaz ${cmd}`)
}
ws.close()
```

- [ ] **Step 1: Desktop 1390×800 – ovládání a obálka**
  - Obálka: screenshot. Zlatý rám u okrajů, čtyři rohy a ornamenty hran, titul i výzva „Otoč stránku →“ nepřekryté (`elementFromPoint` středu titulu = `h1`).
  - Otevřít `#/recept/hovezi-gulas`, reálný klik na „Domů“: hash `#/obsah`, viditelná první stránka obsahu, Zpět v prohlížeči (`agent-browser back`) vrátí recept.
  - Pořadí a jména tlačítek: `eval "[...document.querySelectorAll('.book-controls button')].map(b => b.getAttribute('aria-label'))"` → Domů, Tisk: recept (A4), Jít na košík (…), [Celá obrazovka], Hledat. Přidat recept do košíku → odznak „1“, reálný klik na „Jít na košík (1 recept)“ → `#/kosik`.

- [ ] **Step 2: Desktop – stránka receptu**
  - Dvoustrana receptu: levá strana bez tlačítek (`eval "document.querySelectorAll('.book__slot--left .mark, .book__slot--left .mark--print').length"` → 0), pravá strana má `.recipe-actions` se srdíčkem a košíkem nad živým záhlavím. Obdélníky tlačítek se neprotínají s `h2` ani `.recipe-running-head`. Screenshot.
  - Reálný klik na srdíčko vpravo → `aria-pressed="true"`. V obsahu má recept plné srdíčko.
  - Otočení tahem myší za pravý okraj (`mouse move/down/move/up` na `.page-edge--right`) funguje dál. Vodorovné kolečko (`mouse wheel 0 120`) otočí jednou.

- [ ] **Step 3: Desktop – tisk do PDF podle stránky**
  Pro každou stránku (recept `#/recept/hovezi-gulas`, obsah `#/obsah`, košík `#/kosik` s jedním receptem): `eval "window.print = () => {}"`, reálný klik na tlačítko tisku v `.book-controls`, `eval "document.documentElement.dataset.print"` → `recipe` / `toc` / `list`, pak `node cdp.mjs <ws> <port> pdf …/t10/<stránka>.pdf`, přečíst PDF (nástroj Read na PDF, případně `pdfinfo`): A4, recept na 1 straně bez knižních efektů a bez tlačítek, obsah se čísly stran shodnými s knihou, nákupní seznam podle kategorií. Nakonec `eval "dispatchEvent(new Event('afterprint'))"`. Ctrl+P (`eval "dispatchEvent(new Event('beforeprint'))"`) na receptu dá stejné `data-print` jako tlačítko.

- [ ] **Step 4: Desktop – obsah**
  - Počet stránek obsahu: `eval "document.querySelectorAll('.book__slot .toc-page').length"` na každé dvoustraně obsahu a z hlášení `Strana obsahu N z M` (`eval "[...document.querySelectorAll('.toc-page .visually-hidden')].map(e => e.textContent)"`). Zapsat M.
  - Pro každou stránku obsahu: `scrollHeight - clientHeight ≤ 0` u `.page-content`, a **zaplnění**: volné místo pod posledním řádkem (`content.getBoundingClientRect().bottom - padding - lastLi.getBoundingClientRect().bottom`) je menší než výška prvního řádku další stránky (+ následujícího receptu, když je to nadpis kapitoly). Žádná celá prázdná stránka obsahu.
  - Na některé stránce obsahu jsou ≥ 2 nadpisy kapitol (kapitoly navazují).
  - Najít dvouřádkový název (`li.toc-recipe` vyšší než 1,5 × výška běžného řádku): screenshot, zalomení po slovech, tečky a číslo strany na posledním řádku.
  - Pilulka „Jen uvařené“ neexistuje, ikona hrnce v řádcích není (`eval "document.querySelectorAll('.mark--cooked').length"` → 0).
  - Číslo strany u receptu v obsahu = `Strana N` v hlášení po prokliku.
  - Zúžit okno na `set viewport 1000 800` + `reload`: obsah se přepočítá (jiné M) a stránky dál nepřetékají.

- [ ] **Step 5: Mobil 390×844 – recept na jedné stránce a obsah**
  - `#/recept/hovezi-gulas`: jedna stránka `.recipe-page--single`, nahoře řádek srdíčko + košík, pod ním název (obdélníky se neprotínají), údaje, suroviny, ornament, postup, patička. Scroll uvnitř stránky reálným tahem (dotykem svisle, viz Step 6) nebo `mouse wheel 400 0` nad stránkou až dolů: patička zdroje je vidět. Screenshot nahoře a dole.
  - „pokračuje ↓“ na dlouhém receptu: `eval "(() => { const m = document.querySelector('.page-more'); const p = m.closest('.page'); return [m.getBoundingClientRect().width, p.getBoundingClientRect().width] })()"` → šířka indikátoru < 50 % šířky stránky, screenshot (záře jen kolem nápisu). Po doscrollování zmizí.
  - Obsah: čísla stran odpovídají jednostránkovému layoutu (proklik → `Strana N` = číslo v obsahu), měření stránek obsahu jako ve Step 4 (bez přetečení, zaplněnost).
  - `eval "document.documentElement.scrollWidth === innerWidth"` → `true` na receptu i v obsahu.

- [ ] **Step 6: Mobil 390×844 – švih prstem (CDP dotyk)**
  - Na stránce receptu: `node cdp.mjs <ws> <port> swipe 330 420 60 430` → další stránka (hlášení `Strana N+1`). `swipe 60 420 330 430` → zpět.
  - Svislý tah na dlouhém receptu: `swipe 200 600 205 250` → stránka se nezmění, `.page-content` `scrollTop` vzrostl.
  - V obsahu: švih začínající na řádku receptu (`swipe` z jeho středu doleva) otočí stránku a **neotevře** recept (hash zůstane `#/obsah…` resp. routa další stránky, ne `#/recept/…`). Klepnutí na řádek (`tap x y`) recept otevře.
  - Švih na obálce doleva otočí na „O této knize“, švih doprava na obálce nic.
  - Švih v poli formuláře (tiráž, pole „Koeficient dítěte“) stránku neotočí.

- [ ] **Step 7: Mobil 320×568**
  - Ovládání a záložka: obdélníky `.bookmark__tab` a `.book-controls` se neprotínají, každé tlačítko ovládání má `elementFromPoint(střed)` = samo sebe. Screenshot horního pruhu.
  - Recept: řádek tlačítek a název se neprotínají, `scrollWidth === innerWidth`.
  - Obálka: rohy nepřekrývají titul ani seznam zdrojů (`elementFromPoint` středů textů = text), screenshot.
  - Švih vpřed/zpět na receptu i v obsahu jako ve Step 6.
  - Obsah: první stránka nepřetéká (filtry se zalomí, řádky případně začnou až na další stránce).

- [ ] **Step 8: Přepnutí režimu a „uvařeno“ ve starém stavu**
  - Na `#/recept/hovezi-gulas` při 1390 přejít na pravou polovinu (listovat), pak `set viewport 390 844` + `reload`: otevře se jedna stránka téhož receptu. Zpět na 1390: levá polovina téhož receptu.
  - `eval "localStorage.setItem('kucharka.userState.v1', JSON.stringify({version:1,favorites:['hovezi-gulas'],cooked:['hovezi-gulas'],cart:[],people:{adults:2,children:0},dayFactor:1,customRecipes:[],settings:{childCoef:0.8,historicalIngredients:false}}))"` + `reload` (nebo klíč úložiště podle fáze 7): srdíčko u guláše plné, po přidání do košíku `eval "JSON.parse(localStorage.getItem('kucharka.userState.v1'))"` neobsahuje `cooked`.

- [ ] **Step 9: Opravy a zápis**
  Každý nález opravit s testem tam, kde to jde (CSS-only opravy ověřit screenshotem nebo měřením). Zapsat pod „Nálezy z ruční kontroly“ ve formátu z plánu fáze 8 (číslo, nález, soubor, oprava, ověření) + sekce „Odloženo (s důvodem)“ a „Naměřeno“ (počet stránek obsahu při 1390, 1000, 390 a 320 px, zaplněnost a přetečení stránek obsahu, šířka „pokračuje ↓“, výsledky švihů, obdélníky ovládání na 320 px, PDF: počet stran a obsah pro recept/obsah/seznam). Nakonec `npm test && npm run lint && npm run build && npm run validate`.

- [ ] **Step 10: Předat controlleru (necommitovat)**
  Změněné soubory + `docs/superpowers/plans/2026-10-15-phase9-ux-revision-2.md`. Návrh zprávy: `fix(R2): nálezy z ruční kontroly fáze 9`.

---

## Pokrytí specu (self-review)

| Požadavek [R2] | Task |
|---|---|
| §2 Domů → obsah, ne obal | 4 |
| §2 Tisk a košík mimo knihu vedle ovládání; tisk = Ctrl+P podle stránky; košík = skok na stránku košíku | 4 |
| §2 Na stránce receptu nezůstává tlačítko tisku ani košíku-skoku | 5 |
| §2 Obal: zlatý ornament u rohů a okrajů (rámování) | 3 |
| §2 Obsah skutečně využívá stránku, stránkování z naměřené výšky, kapitoly navazují, dlouhý název bez prázdné plochy | 8, 9 |
| §2 Filtr „Jen uvařené“ zrušen | 1 |
| §2 „pokračuje ↓“ – záře jen kolem nápisu | 2 |
| §2 Mobil: recept = jedna scrollovatelná stránka (údaje + suroviny, pak postup), dvoustrana jen na širokém displeji | 5, 6 |
| §2 Čísla stran v obsahu odpovídají aktuálnímu režimu | 6 (+ 9: obsah přepočítaný po změně režimu) |
| §2 Swipe na telefonu skutečně listuje, rozpoznání vodorovného vs. svislého gesta, ověřeno reálným dotykem | 7, 10 |
| §2 Funkční tlačítka receptu (srdíčko, košík) na pravé straně, mimo nadpis; na mobilu nekolidují s názvem | 5 |
| §2 Koncept „vlevo informace + nákup, vpravo postup“ zůstává | 5 (`RecipeInfo` / `RecipeMethod`) |
| §2 + §5.2 „Uvařeno“ pryč z UI i stavu, `cooked` se při načtení ignoruje, záloha bez něj | 1 |
| §8 bod 9 – vše výše + ruční kontrola | 1–10 |

**Placeholder scan:** žádné „TBD/TODO/doplnit později“. Každý krok s kódem má celý kód nebo přesnou náhradu konkrétního bloku. Task 10 je ruční kontrola a jeho „opravy podle nálezů“ jsou z povahy věci otevřené (jako Task 11 fáze 8).

**Konzistence typů a jmen:** `TocMetrics { capacity, head, rows }`, `tocRowKey`, `usableMetrics`, `paginateTocRows(rows, metrics?)`, `tocPageCount(recipes, metrics?)` (Task 8) používají Task 9 (`measureToc`, `TocProbe`, `App`). `TocHead`/`TocListItem` (Task 8) používá `TocProbe` (Task 9). `RecipeLeft`/`RecipeRight`/`RecipeSingle` a props `favorite`, `inCart`, `onToggleFavorite`, `onToggleCart` (Task 5) používá `App` v Tasku 5 a 6. `RecipeHalf = 'left' | 'right' | 'full'` a `buildLayout(…, { mode })` (Task 6). `PRINT_JOB_LABEL` (Task 4) je `Record<PrintKind, string>`. `BookProps.mode` (Task 6) a `BookProps.measure` (Task 9). `handlers.onClickCapture` (Task 7) se rozbaluje do `.book__spread`. `RecipeMarks` bez `cooked`/`onToggleCooked` od Tasku 1 všude.

**Review Focus:** pět položek výše má testy ve vlastnících tascích (1, 6, 7, 8, 9) a měření v Tasku 10. Vědomě bez automatického testu: skutečná geometrie (rohy obálky vs. text, překryv ovládání na 320 px) – ověřuje Task 10 měřením obdélníků.

## Nálezy z ruční kontroly

Ruční kontrola skillem `agent-browser` (reálný pointer, dotyk přes CDP `Input.dispatchTouchEvent` s emulací mobilu, tisk přes `Page.printToPDF` s `preferCSSPageSize`), viewporty 1390×800, 1000×800, 390×844 a 320×568.

| # | Nález | Soubor | Oprava | Ověření |
|---|---|---|---|---|
| 1 | Boční ornamenty hran obálky (diamant) zasahovaly do podtitulu a zdrojů při 1000, 390 i 320 px (na 1390 ne). | `src/styles/paper.css` | `@container (max-width: 32rem)` skryje `.cover-frame__edge--left/--right`; rohy a horní/dolní hrana zůstávají. | Test v `paper.test.ts` (RED při změně prahu, GREEN). Měření průniku textů s ornamenty: 390/320/1000/1200/1390 px bez průniku; spodní ornament nepřekrývá „Otoč stránku“ / „Přejeď prstem“. |
| 2 | Měřicí stránka obsahu měla pevné číslo strany „888“; řádky, které se na mobilu s dvouciferným číslem vejdou, se v měření zalomily (43 px místo 23 px) a stránky obsahu zůstávaly poloprázdné (390 px: 72 px volného místa, tj. celé 3 řádky). | `src/pages/tocMeasure.ts`, `src/pages/TocProbe.tsx`, `src/App.tsx` (+ testy) | Nová `probeNumberFor(počet stran)`: samé osmičky se stejným počtem číslic jako největší číslo strany v knize; `TocProbe` dostává `pageNumber`. Bez kmitání: víc číslic jen prodlouží obsah. | `tocMeasure.test.ts`, `TocProbe.test.tsx`. Mobil 390 px: volné místo pod posledním řádkem 2–9 px na všech stranách (dříve až 72 px). |

### Odloženo (s důvodem)

- Při 1000 px (a obecně tam, kde mají čísla stran tři číslice) zůstává na 1. stránce obsahu 42 px volného místa: řádek „Bramborová polévka (z čerstvých brambor)“ má v měření číslo „888“ a zalomí se, živě má „9“ a vejde se na jeden řádek. Je to záměrně konzervativní měření (raději volné místo než přetečení); přesnější by bylo měřit řádek s jeho skutečným číslem, což je zpětná vazba měření ↔ layout.
- Na mobilu (390×844) je stránka knihy vysoká jen asi 540 px a nad i pod ní zůstává prázdné pozadí (poměr stran knihy). Mimo rozsah revize 2, návrh pro další fázi.
- „pokračuje ↓“ na dvoustraně 1390 px překrývá poslední viditelný řádek tabulky (záměr – indikátor leží nad obsahem, záře jen kolem nápisu).

### Naměřeno

- Stránek obsahu: 1390 px = 4, 1000 px = 5, 390 px = 6, 320 px = 9 (hlášení „Strana obsahu N z M“, shodně s `.toc-page` v slotech). Přepnutí oknem bez reloadu 1390 → 1000 → 390 → 1390: 4 → 5 → 6 → 4, kniha zůstala použitelná (flip funguje).
- Přetečení `.page-content` (scrollHeight − clientHeight) u všech stránek obsahu při všech šířkách: 0. Zaplněnost (volné místo pod posledním řádkem), po opravě č. 2: 1390 px 10/14 px (str. 1–2) a 52 px (str. 3, další je nadpis kapitoly + recept = 61 px); 390 px 2–9 px; 320 px 18–58 px (další řádek je dvouřádkový, 43 px). Žádná prázdná stránka obsahu. Na stránkách obsahu 1390 px jsou 2–3 nadpisy kapitol (kapitoly navazují).
- Dvouřádkové názvy: zalomení po slovech, tečky a číslo strany na posledním řádku (390 px „Bramborová polévka (z čerstvých brambor)“; 320 px mnoho řádků). `.mark--cooked` = 0, „Jen uvařené“ v obsahu není.
- „pokračuje ↓“ na 390 px: šířka 103 px z 382 px stránky (27 %), po doscrollování (scrollTop 898/899) zmizí.
- `scrollWidth === innerWidth`: true na receptu, v obsahu i na obálce při 390 a 320 px.
- Švih (CDP dotyk) 390 i 320 px: vpřed/zpět na receptu OK (`#/recept/hovezi-gulas` ↔ `chilli-con-carne`); svislý tah 200,600 → 205,250 nezmění stránku a `scrollTop` 0 → 486 (320 px: 420); v obsahu švih začínající na řádku receptu i na tlačítku košíku stránku otočí a recept neotevře ani nepřepne košík, klepnutí na řádek recept otevře (390: Hrachová polévka, 320: Chlebová polévka, číslo strany v obsahu = číslo stránky receptu); obálka: švih doleva otočí na „O této knize“, doprava nic; švih začínající v poli „Koeficient dítěte“ stránku neotočí.
- Ovládání 320 px: záložka 14–105 px, tlačítka 130–163, 167–201, 205–238, 242–276, 280–314 px; žádné obdélníky se neprotínají, `elementFromPoint(střed)` = samo tlačítko u všech pěti. Řádek srdíčko+košík neprotíná název ani při 390 a 320 px.
- Desktop 1390: pořadí ovládání Domů, Tisk: recept (A4), Jít na košík (N), Celá obrazovka, Hledat; Domů → `#/obsah`, Zpět vrátí recept; levá strana receptu bez značek, `.recipe-actions` jen vpravo, neprotíná `h2` ani záhlaví; srdíčko → `aria-pressed=true`, v obsahu plné; tah myší za pravý okraj otočí, `mouse wheel 0 120` otočí jednou za prodlevu.
- Tisk (A4, 1 strana každý): recept (`data-print=recipe`, bez knižních efektů a tlačítek), obsah (`toc`, čísla jako v knize: Hovězí guláš 35, Brownies 151, Ovocný punč 179), nákupní seznam (`list`, podle kategorií). Ctrl+P (`beforeprint`) dá totéž `data-print` jako tlačítko. Mobilní tisk 390 px: obsah 1 strana, čísla (guláš 23, Brownies 81, Punč 95) shodná s knihou na 390 px i při `beforeprint`; 320 px: 26 / 84 / 98 (shodně s knihou na 320 px). Čísla se během tisku nemění.
- Režim a starý stav: přepnutí 1390 → 390 → 1390 drží týž recept (chilli: jedna stránka 24 ↔ dvoustrana 37/38). Seed `cooked: ['hovezi-gulas']` + `favorites`: srdíčko guláše plné, po přidání do košíku jsou klíče stavu `version, people, dayFactor, cart, favorites, customRecipes, settings` (bez `cooked`).
