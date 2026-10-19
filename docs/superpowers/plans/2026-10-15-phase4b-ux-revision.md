# Fáze 4b: Revize UX (recept jako dvoustrana, srdíčko + hrnec, filtry, obsah bez ořezu, ovládání) – implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zapracovat všechny body **[R1]** fáze 4b ze specu: recept jako dvoustrana bez štítků, zrušené poznámky, srdíčko (oblíbené) + hrnec (uvařeno), filtry v obsahu s odvozenými štítky `rychle`/`historicke`, obsah bez ořezu, pevné ovládání domů/celá obrazovka vedle lupy, listování vodorovným scrollem, stín knihy a zjevný scroll stránky (včetně tisku celého obsahu).

**Architecture:** `buildLayout()` dává každému receptu dvě položky (`kind: 'recipe'`, `half: 'left' | 'right'`), levá vždy na lichém indexu; `RecipePage.tsx` se dělí na `RecipeLeft`/`RecipeRight`. Odvozené štítky jsou čistá funkce v `src/content/derivedTags.ts`, kterou používá filtr obsahu i validátor. Stránkování obsahu počítá „jednotky řádků“ s kapacitou odvozenou z naměřené výšky stránky. Generický `Page` dostane indikátor přetečení (`useOverflowHint`), `Book` listování kolečkem (`src/book/wheel.ts`), nová komponenta `BookControls` drží lupu, domů a celou obrazovku. Tisk řeší `src/styles/print.css`.

**Tech Stack:** Vite 8, React 19, TypeScript 6, zod 4, Vitest 4 + Testing Library (jsdom, `css: false`), oxlint. Bez UI knihovny. Ruční kontrola skillem `agent-browser` (reálný pointer, `mouse wheel`, `pdf`).

**Spec:** `docs/superpowers/specs/2026-10-14-cookbook-design.md` – body **[R1]** v §2 (kniha, pořadí stránek, recept = dvoustrana, oblíbené, poznámky, hash routing), §5.1 (štítky, validátor), §5.2 (uživatelský stav), §8 bod 4b. Košík, brožurka, tisk tlačítkem a nutrice jsou fáze 5–6 – sem nepatří.

## Global Constraints

- Čeština s diakritikou v UI, identifikátory anglicky. Bez UI knihovny. Žádný server. Žádná nová npm závislost.
- Pořadí stránek (spec §2): obal (index 0, vpravo) → „O této knize“ (dvoustrana, indexy 1–2) → obsah (`tocPageCount(recipes)` stránek od indexu 3) → kapitoly v pořadí `CHAPTERS` ze `src/domain/schema.ts` → nákupní seznam (zástupná stránka „Nákupní seznam – fáze 5“) → tiráž/nastavení (zástupná stránka „Nastavení – fáze 7“, poslední).
- Desktop dvoustrana: obal sám vpravo (index 0), pak lichý index vlevo, sudý vpravo. Úvod kapitoly i nákupní seznam jsou vždy na pravé straně (sudý index); prázdná stránka (`blank`) se vkládá jen bezprostředně před kapitolu nebo seznam.
- **[R1] Recept = dvoustrana:** každý recept má dvě položky layoutu `{ kind: 'recipe', recipeId, chapter, half: 'left' }` (id `recipe-<id>`, lichý index) a `{ …, half: 'right' }` (id `recipe-<id>:postup`, sudý index hned za ní). Mezi recepty nejsou prázdné stránky. `recipeIndex` ukazuje na levou polovinu. Mobil = dvě po sobě jdoucí stránky.
- Levá strana receptu: název (`h2`), původní název, kniha viditelně, čas, obtížnost, vybavení, alergeny, srdíčko + hrnec (`<button aria-pressed>`), tabulka surovin (4 porce + šedě na osobu). Pravá: postup, `modernNote`, patička zdroje strojopisem. **Žádné štítky na stránce receptu.**
- Hash routy: `#/recept/<id>`, `#/kapitola/<id>`, `#/seznam`, `#/nastaveni`, `#/obsah`, **[R1]** `#/kosik` (rezervovaná: parser ji zná, do fáze 5 nemá stránku → obal a hash se vyčistí), prázdný hash a `#/` = obal. Listování mění hash přes `history.replaceState`, skok odkazem (obsah, hledání, domů) přes `history.pushState`.
- Styl stránky podle `source.book`: `era--italian-1919`, `era--feldkochbuch-1940`, `era--navy-1944`, `era--afrs-2003`, `era--vlastni` (tone `note`). Platí pro obě poloviny receptu.
- Typografie beze změny: tělo EB Garamond, tabulky IBM Plex Sans, patička zdroje Special Elite, ručně psané Caveat; vše self-hosted přes `@fontsource`.
- Uživatelský stav `UserState` (spec §5.2): `version: 1`, `people`, `dayFactor`, `cart`, `favorites: string[]`, **`cooked: string[]`**, `customRecipes`, `settings`. **Pole `notes` neexistuje**; starší uložený stav s `notes` se načte (ostatní pole zůstanou) a `notes` se tiše zahodí. Klíč `localStorage` `kucharka.userState.v1` beze změny.
- Štítky filtru v obsahu přesně v tomto pořadí: `levne`, `rychle`, `historicke`, `tabor`, `kotlik`, `pripravit-predem`. `rychle` = `timeMinutes ≤ 45` (odvozené, ruční tag se ignoruje), `historicke` = `BOOK_META[book].year < 1950` (odvozené). `bez-masa` a `sladke` se v UI nepoužívají (data zůstávají beze změny). Další filtry: vybavení, kniha (4 historické zdroje), jen oblíbené, jen uvařené.
- Validátor (`npm run validate`) hlásí **varování** (ne chybu) u ručního tagu `rychle` s `timeMinutes > 45`.
- Obsah bez ořezu – naměřeno v Chrome (agent-browser, HEAD 3eb052d): desktop 1390×800 stránka 736 px, výška obsahu bez paddingu 657 px; mobil 390×844 stránka 540 px, obsah 469 px; mobil 320×568 stránka 443 px, obsah 376 px. Řádek receptu v obsahu 23 px, nadpis kapitoly 35 px, panel filtrů + nadpis „Obsah“ ≈ 190 px. Kapacita: `TOC_PAGE_UNITS = 16`, `TOC_FIRST_PAGE_UNITS = 7` (první stránka nese filtry), řádek receptu = 1 jednotka (název delší než `TOC_LONG_TITLE_CHARS = 28` znaků = 2), nadpis kapitoly = 2 jednotky. Při 1390×800 a 390×844 musí platit `scrollHeight <= clientHeight` pro `.page-content` každé stránky obsahu.
- Ovládání knihy (`.book-controls`, pevně vpravo nahoře, mimo stránky, viditelné z každé strany): „Domů“ (route `cover`), „Celá obrazovka“ (jen když `document.fullscreenEnabled === true`; na iOS skryté), „Hledat“ (lupa). Všechna tlačítka mají `aria-label`; „Celá obrazovka“ má `aria-pressed`.
- Listování kolečkem: `wheel` s `|deltaX| > |deltaY|`, práh 40 px akumulovaně, gesto končí po 400 ms bez událostí, jedno otočení na gesto; ne při `ctrlKey` (pinch zoom), ne při otevřeném dialogu, ne uvnitř prvku s vodorovným přetečením (`overflow-x: auto|scroll` a `scrollWidth > clientWidth`).
- Přetékající stránka: přechod do ztracena u spodního okraje + „pokračuje ↓“ (zmizí po doscrollování). Tisk (`@media print`): `overflow: visible`, `height: auto` – tiskne se celý obsah viditelných stránek.
- Přístupnost: neaktivní stránky `inert` (beze změny); `aria-live="polite"` hlášení stránky; hledání `role="dialog"`, Escape zavře; ikony jsou `aria-hidden`, přístupné jméno nese tlačítko.
- Mobil: žádný vodorovný scroll (`document.documentElement.scrollWidth === window.innerWidth` při 390 i 320 px); obsah stránky scrolluje svisle uvnitř stránky.
- Testy Vitest + Testing Library pro každou komponentu a čistou funkci; po každém tasku `npm test`, `npm run build`, `npm run lint` čisté. Commit po každém tasku, zpráva česky s diakritikou, explicitní `git add <soubory>` (nikdy `-A`), smazané soubory přes `git rm`.

## Review Focus

1. **Filtrovaný obsah potřebuje víc stránek, než kolik jich má nefiltrovaný layout** (počet stránek obsahu je pevný) – žádný recept nesmí zmizet: zbytek se vykreslí na poslední stránce obsahu. Test v Task 6 (`tocRowsForPage` + vlastnost „každý jednotlivý filtr se vejde“).
2. **Uložený stav z fáze 4 s polem `notes`** se musí načíst bez ztráty oblíbených a `notes` se při dalším uložení nesmí vrátit. Test v Task 2.
3. **Vodorovné kolečko nad širokou tabulkou surovin (320 px) nebo pinch zoom (`ctrlKey`)** nesmí otočit stránku. Testy v Task 8.
4. **Reload na pravé polovině receptu** (hash je stejný jako u levé) musí otevřít recept od levé strany a pravá polovina musí mít routu receptu, ne předchozí kapitoly. Test v Task 3.
5. **Prohlížeč bez Fullscreen API (iPhone Safari) nebo odmítnutý `requestFullscreen`** – tlačítko se nezobrazí, resp. zamítnutí nevyhodí nezachycenou výjimku. Testy v Task 7.

## Struktura souborů

| Soubor | Odpovědnost | Task |
|---|---|---|
| `src/content/derivedTags.ts` (nový) | odvozené štítky `rychle`/`historicke`, sada štítků filtru a jejich popisky | 1 |
| `scripts/validate.ts` | varování u ručního `rychle` | 1 |
| `src/content/books.ts` | jen relativní import typu (kvůli `tsconfig.scripts.json` bez aliasu `@`) | 1 |
| `src/state/userState.ts`, `src/state/UserStateProvider.tsx` | `cooked` + `toggleCooked`, bez `notes`/`setNote` | 2 |
| `src/pages/NoteMargin.tsx` (+test) | smazat | 2 |
| `src/content/buildPages.ts` | recept = dvě položky layoutu (`half`) | 3 |
| `src/pages/RecipePage.tsx` | `RecipeLeft` + `RecipeRight` místo `RecipePage` | 3, 4 |
| `src/pages/icons.tsx` (nový) | SVG srdíčko a hrnec | 4 |
| `src/pages/RecipeMarks.tsx` (nový) | dvojice tlačítek srdíčko + hrnec (recept i řádek obsahu) | 4 |
| `src/pages/DogEar.tsx` | smazat | 4 |
| `src/content/search.ts` | `Filter` s `FilterTag` a `cookedOnly`; stránkování po jednotkách | 5, 6 |
| `src/pages/TocPages.tsx` | nové filtry, ikony u řádků, stránkování bez ořezu | 5, 6 |
| `src/app/route.ts` | rezervovaná routa `cart` (`#/kosik`) | 7 |
| `src/app/useFullscreen.ts`, `src/app/BookControls.tsx` (nové) | Fullscreen API s guardem, pevné ovládání | 7 |
| `src/book/wheel.ts` (nový), `src/book/Book.tsx` | listování vodorovným scrollem | 8 |
| `src/book/useOverflowHint.ts` (nový), `src/book/Page.tsx` | indikátor „pokračuje ↓“ | 9 |
| `src/styles/print.css` (nový), `src/styles/book.css`, `src/styles/global.css`, `src/styles/paper.css` | tisk celého obsahu, stín knihy, stůl, styly nových prvků | 2–9 |
| `src/App.tsx` | zapojení všeho výše | 2–7 |

---

### Task 1: Odvozené štítky a varování validátoru

**Files:**
- Create: `src/content/derivedTags.ts`, `src/content/derivedTags.test.ts`
- Modify: `src/content/books.ts:1` (import typu relativně), `scripts/validate.ts` (import + kontrola v cyklu receptů), `scripts/validate.test.ts` (2 testy)

**Interfaces:**
- Consumes: `BOOK_META` (`src/content/books.ts`), typy `Recipe`, `Tag` (`src/domain/types.ts`).
- Produces:
```ts
export const QUICK_MAX_MINUTES = 45
export const HISTORIC_BEFORE_YEAR = 1950
export const FILTER_TAGS: readonly ['levne', 'rychle', 'historicke', 'tabor', 'kotlik', 'pripravit-predem']
export type FilterTag = (typeof FILTER_TAGS)[number]
export const FILTER_TAG_LABEL: Record<FilterTag, string>
export function isQuick(recipe: Pick<Recipe, 'timeMinutes'>): boolean
export function isHistoric(recipe: Pick<Recipe, 'source'>): boolean
export function hasFilterTag(recipe: Recipe, tag: FilterTag): boolean
export function recipeFilterTags(recipe: Recipe): FilterTag[]
```

- [ ] **Step 1: Napsat failing testy odvozených štítků**

```ts
// src/content/derivedTags.test.ts
import { loadContent } from './loadContent'
import {
  FILTER_TAGS, FILTER_TAG_LABEL, HISTORIC_BEFORE_YEAR, QUICK_MAX_MINUTES,
  hasFilterTag, isHistoric, isQuick, recipeFilterTags,
} from './derivedTags'
import { EQUIPMENT_LABEL } from '@/pages/labels'
import type { Recipe } from '@/domain/types'

const { recipes } = loadContent()
const base = recipes.find((r) => r.id === 'chilli-con-carne')!
const withTime = (timeMinutes: number, tags: Recipe['tags'] = []): Recipe => ({ ...base, timeMinutes, tags })
const fromBook = (book: Recipe['source']['book']): Recipe => ({ ...base, source: { ...base.source, book } })

test('rychlé = nejvýš 45 minut', () => {
  expect(QUICK_MAX_MINUTES).toBe(45)
  expect(isQuick(withTime(45))).toBe(true)
  expect(isQuick(withTime(46))).toBe(false)
})

test('ruční tag rychle bez odpovídajícího času se ve filtru neprojeví', () => {
  expect(hasFilterTag(withTime(90, ['rychle']), 'rychle')).toBe(false)
  expect(hasFilterTag(withTime(20), 'rychle')).toBe(true)
})

test('historické = kniha vydaná před rokem 1950', () => {
  expect(HISTORIC_BEFORE_YEAR).toBe(1950)
  expect(isHistoric(fromBook('italian-1919'))).toBe(true)
  expect(isHistoric(fromBook('feldkochbuch-1940'))).toBe(true)
  expect(isHistoric(fromBook('navy-1944'))).toBe(true)
  expect(isHistoric(fromBook('afrs-2003'))).toBe(false)
  expect(isHistoric(fromBook('vlastni'))).toBe(false)
})

test('sada štítků filtru: bez bez-masa a sladké, s popisky', () => {
  expect(FILTER_TAGS).toEqual(['levne', 'rychle', 'historicke', 'tabor', 'kotlik', 'pripravit-predem'])
  for (const t of FILTER_TAGS) expect(FILTER_TAG_LABEL[t]).toBeTruthy()
  // pilulka štítku se nesmí jmenovat stejně jako pilulka vybavení „kotlík“
  expect(FILTER_TAG_LABEL.kotlik).not.toBe(EQUIPMENT_LABEL.kotlik)
})

test('ruční štítky se čtou z dat', () => {
  expect(hasFilterTag({ ...base, tags: ['levne'] }, 'levne')).toBe(true)
  expect(hasFilterTag({ ...base, tags: [] }, 'levne')).toBe(false)
})

test('recipeFilterTags vrací ruční i odvozené štítky v pořadí FILTER_TAGS', () => {
  const r: Recipe = { ...base, timeMinutes: 30, tags: ['levne', 'bez-masa', 'sladke'], source: { ...base.source, book: 'navy-1944' } }
  expect(recipeFilterTags(r)).toEqual(['levne', 'rychle', 'historicke'])
})
```

- [ ] **Step 2: Spustit – musí selhat (modul neexistuje)**

Run: `npx vitest run src/content/derivedTags.test.ts`
Expected: FAIL `Failed to resolve import "./derivedTags"`

- [ ] **Step 3: Implementace**

```ts
// src/content/derivedTags.ts
// Relativní importy: soubor používá i scripts/validate.ts (tsconfig.scripts.json nemá alias @).
import type { Recipe } from '../domain/types'
import { BOOK_META } from './books'

/** Recept je „rychlý“, když trvá nejvýš tolik minut (spec §5.1 [R1]). */
export const QUICK_MAX_MINUTES = 45
/** Recept je „historický“, když jeho kniha vyšla před tímto rokem (všechny kromě AFRS 2003 a vlastních). */
export const HISTORIC_BEFORE_YEAR = 1950

/** Štítky filtru v obsahu (pořadí = pořadí pilulek). `bez-masa` a `sladke` chybí záměrně – duplikují kapitoly. */
export const FILTER_TAGS = ['levne', 'rychle', 'historicke', 'tabor', 'kotlik', 'pripravit-predem'] as const
export type FilterTag = (typeof FILTER_TAGS)[number]

export const FILTER_TAG_LABEL: Record<FilterTag, string> = {
  levne: 'levné',
  rychle: 'rychlé',
  historicke: 'historické',
  tabor: 'táborové',
  kotlik: 'do kotlíku', // odlišné od vybavení „kotlík“
  'pripravit-predem': 'připravit předem',
}

export function isQuick(recipe: Pick<Recipe, 'timeMinutes'>): boolean {
  return recipe.timeMinutes <= QUICK_MAX_MINUTES
}

export function isHistoric(recipe: Pick<Recipe, 'source'>): boolean {
  return BOOK_META[recipe.source.book].year < HISTORIC_BEFORE_YEAR
}

/** Má recept štítek filtru? `rychle` a `historicke` se odvozují, ostatní se čtou z `recipe.tags`. */
export function hasFilterTag(recipe: Recipe, tag: FilterTag): boolean {
  if (tag === 'rychle') return isQuick(recipe)
  if (tag === 'historicke') return isHistoric(recipe)
  return recipe.tags.includes(tag)
}

export function recipeFilterTags(recipe: Recipe): FilterTag[] {
  return FILTER_TAGS.filter((t) => hasFilterTag(recipe, t))
}
```

V `src/content/books.ts` řádek 1 změnit na relativní import (jinak `tsc -b` pro `tsconfig.scripts.json` nenajde `@/domain/types`):

```ts
import type { Book } from '../domain/types'
```

- [ ] **Step 4: Testy zelené**

Run: `npx vitest run src/content/derivedTags.test.ts`
Expected: PASS (6 testů)

- [ ] **Step 5: Failing testy validátoru**

Do `scripts/validate.test.ts` na konec bloku `describe('validateContent', …)` přidat:

```ts
  it('ruční tag rychle u receptu nad 45 min je varování (ne chyba)', () => {
    const r = validateContent(ings, rec({ ...valid, timeMinutes: 60, tags: ['bez-masa', 'sladke', 'rychle'] }))
    expect(r.errors).toEqual([])
    expect(r.warnings.some((w) => w.includes('palacinky') && w.includes('rychle') && w.includes('60 min'))).toBe(true)
  })

  it('ruční tag rychle u receptu do 45 min varování nedává', () => {
    const r = validateContent(ings, rec({ ...valid, timeMinutes: 45, tags: ['bez-masa', 'sladke', 'rychle'] }))
    expect(r.warnings.some((w) => w.includes('rychle'))).toBe(false)
  })
```

Run: `npx vitest run scripts/validate.test.ts`
Expected: FAIL v testu „ruční tag rychle u receptu nad 45 min…“ (varování chybí)

- [ ] **Step 6: Implementace ve validátoru**

V `scripts/validate.ts` přidat import pod import `toGrams`:

```ts
import { QUICK_MAX_MINUTES, isQuick } from '../src/content/derivedTags'
```

a v cyklu receptů hned za `if (!r.verified) unverified++` vložit:

```ts
    if (r.tags.includes('rychle') && !isQuick(r)) {
      warnings.push(`recept ${r.id}: ruční tag rychle neodpovídá času ${r.timeMinutes} min (rychle = nejvýš ${QUICK_MAX_MINUTES} min a odvozuje se z timeMinutes)`)
    }
```

- [ ] **Step 7: Ověřit**

Run: `npx vitest run scripts/validate.test.ts src/content && npm run validate && npm run build && npm run lint`
Expected: testy PASS; `npm run validate` vypíše `OK: … 78 receptů …` bez varování obsahujícího „rychle“ (data jsou konzistentní); build a lint čisté.

- [ ] **Step 8: Commit**

```bash
git add src/content/derivedTags.ts src/content/derivedTags.test.ts src/content/books.ts scripts/validate.ts scripts/validate.test.ts
git commit -m "feat(content): odvozené štítky rychlé a historické, varování validátoru"
```

### Task 2: Uživatelský stav `cooked`, odstranění poznámek

**Files:**
- Modify: `src/state/userState.ts` (celý soubor níže), `src/state/userState.test.ts` (celý soubor níže), `src/state/UserStateProvider.tsx`, `src/state/UserStateProvider.test.tsx`, `src/pages/RecipePage.tsx`, `src/pages/RecipePage.test.tsx`, `src/App.tsx`, `src/styles/paper.css`
- Delete: `src/pages/NoteMargin.tsx`, `src/pages/NoteMargin.test.tsx`

**Interfaces:**
- Produces:
```ts
export interface UserState { version: 1; people: { adults: number; children: number }; dayFactor: number; cart: { recipeId: string; multiplier: number }[]; favorites: string[]; cooked: string[]; customRecipes: unknown[]; settings: { childCoef: number; kcalTarget?: number; historicalIngredients: boolean } }
export function toggleFavorite(s: UserState, recipeId: string): UserState
export function toggleCooked(s: UserState, recipeId: string): UserState
// useUserState():
{ state: UserState; toggleFavorite(id: string): void; toggleCooked(id: string): void; update(patch: Partial<Omit<UserState, 'version'>>): void }
```
- `RecipePage` props po tomto tasku: `{ recipe, ingredients, favorite, onToggleFavorite }` (bez `note`, `onNoteChange`, `mode`).

- [ ] **Step 1: Přepsat testy stavu (failing)**

```ts
// src/state/userState.test.ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_USER_STATE,
  loadUserState,
  saveUserState,
  toggleCooked,
  toggleFavorite,
} from './userState';

describe('toggleFavorite', () => {
  it('přidá oblíbený recept a nemění původní objekt', () => {
    const next = toggleFavorite(DEFAULT_USER_STATE, 'r1');
    expect(next.favorites).toEqual(['r1']);
    expect(DEFAULT_USER_STATE.favorites).toEqual([]);
    expect(next).not.toBe(DEFAULT_USER_STATE);
  });

  it('dvojí přepnutí vrátí původní obsah', () => {
    const twice = toggleFavorite(toggleFavorite(DEFAULT_USER_STATE, 'r1'), 'r1');
    expect(twice).toEqual(DEFAULT_USER_STATE);
  });
});

describe('toggleCooked', () => {
  it('označí recept jako uvařený immutabilně a nezasáhne oblíbené', () => {
    const next = toggleCooked(DEFAULT_USER_STATE, 'r1');
    expect(next.cooked).toEqual(['r1']);
    expect(next.favorites).toEqual([]);
    expect(DEFAULT_USER_STATE.cooked).toEqual([]);
  });

  it('dvojí přepnutí vrátí původní obsah', () => {
    expect(toggleCooked(toggleCooked(DEFAULT_USER_STATE, 'r1'), 'r1')).toEqual(DEFAULT_USER_STATE);
  });
});

describe('loadUserState', () => {
  const storageWith = (value: string | null) => ({ getItem: () => value });

  it('prázdné úložiště vrátí default', () => {
    expect(loadUserState(storageWith(null))).toEqual(DEFAULT_USER_STATE);
  });

  it('poškozený JSON vrátí default', () => {
    expect(loadUserState(storageWith('{nejson'))).toEqual(DEFAULT_USER_STATE);
  });

  it('JSON jiného tvaru nebo verze vrátí default', () => {
    expect(loadUserState(storageWith('[1,2]'))).toEqual(DEFAULT_USER_STATE);
    expect(loadUserState(storageWith('{"version":2}'))).toEqual(DEFAULT_USER_STATE);
  });

  it('chybějící pole doplní z defaultu', () => {
    const s = loadUserState(storageWith('{"version":1,"favorites":["a"]}'));
    expect(s.favorites).toEqual(['a']);
    expect(s.cooked).toEqual([]);
    expect(s.people).toEqual(DEFAULT_USER_STATE.people);
  });

  it('starší stav s poznámkami se načte bez nich a oblíbené zůstanou', () => {
    const s = loadUserState(storageWith('{"version":1,"favorites":["a"],"notes":{"a":"méně soli"}}'));
    expect(s.favorites).toEqual(['a']);
    expect(s.cooked).toEqual([]);
    expect('notes' in s).toBe(false);
    let stored = '';
    saveUserState({ setItem: (_k, v) => (stored = v) }, s);
    expect(stored).not.toContain('notes');
  });

  it('neplatné typy polí nahradí výchozími hodnotami', () => {
    const s = loadUserState(
      storageWith('{"version":1,"favorites":null,"cooked":{},"people":"x","cart":"y","settings":{"childCoef":"a"}}'),
    );
    expect(s).toEqual(DEFAULT_USER_STATE);
    expect(() => toggleFavorite(s, 'r1')).not.toThrow();
    expect(() => toggleCooked(s, 'r1')).not.toThrow();
  });

  it('zachová platná pole vedle neplatných', () => {
    const s = loadUserState(storageWith('{"version":1,"favorites":["a",1],"dayFactor":2,"cooked":["b"]}'));
    expect(s.favorites).toEqual([]);
    expect(s.dayFactor).toBe(2);
    expect(s.cooked).toEqual(['b']);
  });

  it('vrácený default nesdílí referenci s DEFAULT_USER_STATE', () => {
    const s = loadUserState(storageWith(null));
    expect(s.favorites).not.toBe(DEFAULT_USER_STATE.favorites);
    expect(s.cooked).not.toBe(DEFAULT_USER_STATE.cooked);
  });

  it('výjimka při čtení vrátí default', () => {
    const throwing = {
      getItem: () => {
        throw new Error('zakázáno');
      },
    };
    expect(loadUserState(throwing)).toEqual(DEFAULT_USER_STATE);
  });

  it('round-trip přes saveUserState', () => {
    let stored: string | null = null;
    const s = toggleCooked(toggleFavorite(DEFAULT_USER_STATE, 'r9'), 'r8');
    saveUserState({ setItem: (_k, v) => (stored = v) }, s);
    expect(loadUserState(storageWith(stored))).toEqual(s);
  });
});

describe('saveUserState', () => {
  it('spolkne výjimku úložiště', () => {
    const throwing = {
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(() => saveUserState(throwing, DEFAULT_USER_STATE)).not.toThrow();
  });
});
```

V `src/state/UserStateProvider.test.tsx` nahradit `Probe` a test debounce:

```tsx
function Probe() {
  const { state, toggleFavorite, toggleCooked } = useUserState();
  return (
    <div>
      <span data-testid="favs">{state.favorites.join(',')}</span>
      <span data-testid="cooked">{state.cooked.join(',')}</span>
      <button onClick={() => toggleFavorite('r1')}>fav</button>
      <button onClick={() => toggleCooked('r2')}>cooked</button>
    </div>
  );
}
```

a v testu „více změn v rychlém sledu uloží jen jednou (debounce)“ nahradit `screen.getByText('note').click()` za `screen.getByText('cooked').click()` a poslední očekávání za:

```tsx
    expect((storage.setItem.mock.calls[0] as unknown as string[])[1]).toContain('"cooked":["r2"]');
```

Run: `npx vitest run src/state`
Expected: FAIL (`toggleCooked` není exportováno, `state.cooked` je undefined)

- [ ] **Step 2: Implementace stavu**

```ts
// src/state/userState.ts
import { z } from 'zod';
import { DEFAULT_CHILD_COEF } from '@/domain/scaling';

/** Klíč v localStorage; verze v klíči umožní pozdější migraci. */
export const STORAGE_KEY = 'kucharka.userState.v1';

export interface UserState {
  version: 1;
  people: { adults: number; children: number };
  dayFactor: number;
  cart: { recipeId: string; multiplier: number }[];
  favorites: string[];
  /** Recepty označené hrncem „uvařeno“ (mám odzkoušeno). */
  cooked: string[];
  customRecipes: unknown[];
  settings: { childCoef: number; kcalTarget?: number; historicalIngredients: boolean };
}

export const DEFAULT_USER_STATE: UserState = {
  version: 1,
  people: { adults: 2, children: 0 },
  dayFactor: 1,
  cart: [],
  favorites: [],
  cooked: [],
  customRecipes: [],
  settings: { childCoef: DEFAULT_CHILD_COEF, historicalIngredients: false },
};

const num = z.number().finite();

/**
 * Tolerantní schéma: každé neplatné nebo chybějící pole se nahradí výchozí hodnotou.
 * Neznámá pole (např. `notes` z fáze 4) z.object zahodí.
 */
const userStateSchema = z.object({
  version: z.literal(1),
  people: z
    .object({
      adults: num.catch(DEFAULT_USER_STATE.people.adults),
      children: num.catch(DEFAULT_USER_STATE.people.children),
    })
    .catch({ ...DEFAULT_USER_STATE.people }),
  dayFactor: num.catch(DEFAULT_USER_STATE.dayFactor),
  cart: z
    .array(z.object({ recipeId: z.string(), multiplier: num }))
    .catch([]),
  favorites: z.array(z.string()).catch([]),
  cooked: z.array(z.string()).catch([]),
  customRecipes: z.array(z.unknown()).catch([]),
  settings: z
    .object({
      childCoef: num.catch(DEFAULT_USER_STATE.settings.childCoef),
      kcalTarget: num.optional().catch(undefined),
      historicalIngredients: z.boolean().catch(DEFAULT_USER_STATE.settings.historicalIngredients),
    })
    .catch({ ...DEFAULT_USER_STATE.settings }),
});

function freshDefault(): UserState {
  return structuredClone(DEFAULT_USER_STATE);
}

/** Načte stav; chybějící, neplatný nebo poškozený obsah nahradí výchozími hodnotami (po polích). */
export function loadUserState(storage: Pick<Storage, 'getItem'>): UserState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw == null) return freshDefault();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return freshDefault();
    }
    // Chybějící klíče doplníme výchozími, aby je `.catch` zachytilo jednotně.
    const result = userStateSchema.safeParse({ ...freshDefault(), ...parsed });
    if (!result.success) return freshDefault(); // např. jiná verze
    const { kcalTarget, ...settings } = result.data.settings;
    return {
      ...result.data,
      settings: kcalTarget === undefined ? settings : { ...settings, kcalTarget },
    };
  } catch {
    return freshDefault();
  }
}

/** Uloží stav; chyby úložiště (soukromý režim, plná kvóta) tiše ignoruje. */
export function saveUserState(storage: Pick<Storage, 'setItem'>, s: UserState): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // úložiště nedostupné – stav zůstane jen v paměti
  }
}

function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function toggleFavorite(s: UserState, recipeId: string): UserState {
  return { ...s, favorites: toggleId(s.favorites, recipeId) };
}

export function toggleCooked(s: UserState, recipeId: string): UserState {
  return { ...s, cooked: toggleId(s.cooked, recipeId) };
}
```

V `src/state/UserStateProvider.tsx`:
- import `setNote as setNoteFn` nahradit `toggleCooked as toggleCookedFn`;
- v `interface UserStateApi` řádek `setNote(id: string, text: string): void;` nahradit `toggleCooked(id: string): void;`;
- blok `const setNote = useCallback(…)` nahradit:

```tsx
  const toggleCooked = useCallback(
    (id: string) => setState((s) => toggleCookedFn(s, id)),
    [],
  );
```

- `value` a jeho závislosti: `() => ({ state, toggleFavorite, toggleCooked, update })`, `[state, toggleFavorite, toggleCooked, update]`.

- [ ] **Step 3: Testy stavu zelené**

Run: `npx vitest run src/state`
Expected: PASS

- [ ] **Step 4: Odstranit poznámky z UI**

`git rm src/pages/NoteMargin.tsx src/pages/NoteMargin.test.tsx`

`src/pages/RecipePage.tsx`: smazat import `NoteMargin`, z `Props` smazat `note`, `onNoteChange`, `mode`; podpis funkce `export function RecipePage({ recipe, ingredients, favorite, onToggleFavorite }: Props)`; kořen `<article className={`recipe-page era--${meta.era}`}>`; smazat řádek `<NoteMargin note={note} onChange={onNoteChange} mode={mode} />`.

`src/pages/RecipePage.test.tsx`: v `setup` props jen `recipe: chilli, ingredients, favorite: false, onToggleFavorite: vi.fn(), ...over`; smazat celý test `it('poznámka se ukládá', …)`.

`src/App.tsx`:
- smazat import `useViewMode` a řádek `const mode = useViewMode()`;
- `const { state, toggleFavorite } = useUserState()`;
- v `case 'recipe'` předávat jen `recipe`, `ingredients`, `favorite={favorites.has(recipe.id)}`, `onToggleFavorite={() => toggleFavorite(recipe.id)}`;
- závislosti `useMemo` pro `pages`: `[layout, recipes, ingredients, recipeById, filter, favorites, navigate, toggleFavorite]`.

`src/styles/paper.css`: smazat řádek `.page--with-margin { padding-right: 2.6rem; }` a celý blok pravidel `.note-margin`, `.note-margin--spread`, `.note-margin--spread.note-margin--editing, .note-margin--editing`, `.note-margin__hint`, `.note-margin__input`, `.note-margin--single`, `.note-margin--single.note-margin--editing`, `.note-margin__pencil`.

- [ ] **Step 5: Ověřit, že nic neodkazuje na poznámky**

Run: `grep -rn "NoteMargin\|setNote\|notes\|note-margin\|with-margin" src; npm test && npm run build && npm run lint`
Expected: grep nic nenajde; testy, build i lint čisté.

- [ ] **Step 6: Commit**

```bash
git add src/state src/pages/RecipePage.tsx src/pages/RecipePage.test.tsx src/App.tsx src/styles/paper.css
git commit -m "feat(state): uvařené recepty místo poznámek, odstranění poznámek z UI"
```

### Task 3: Recept jako dvoustrana

**Files:**
- Modify: `src/content/buildPages.ts` (celý soubor níže), `src/content/buildPages.test.ts`, `src/pages/RecipePage.tsx` (celý soubor níže), `src/pages/RecipePage.test.tsx` (celý soubor níže), `src/App.tsx`, `src/App.test.tsx`, `src/styles/paper.css`

**Interfaces:**
- Consumes: `indexToRoute`, `routeToIndex` (`src/app/route.ts`, beze změny), `BOOK_META`, `IngredientTable`, `DogEar` (do Task 4).
- Produces:
```ts
export type RecipeHalf = 'left' | 'right'
export interface PageEntry { id: string; kind: PageKind; recipeId?: string; chapter?: Chapter; tocPage?: number; half?: RecipeHalf }
// buildLayout: recept → { id: `recipe-${id}`, half: 'left' } na lichém indexu, { id: `recipe-${id}:postup`, half: 'right' } hned za ní
export function RecipeLeft(props: { recipe: Recipe; ingredients: Map<string, Ingredient>; favorite: boolean; onToggleFavorite: () => void }): JSX.Element
export function RecipeRight(props: { recipe: Recipe }): JSX.Element
```
Třídy: `.recipe-page.recipe-page--left` / `.recipe-page.recipe-page--right` + `era--<era>` na `article`; levá má `.recipe-meta` (`dl`) a `.recipe-book`, pravá `.recipe-running-head`, `.recipe-steps`, `.modern-note`, `footer.source`.

- [ ] **Step 1: Failing testy layoutu**

V `src/content/buildPages.test.ts`:
- doplnit import `import { indexToRoute, routeToIndex } from '@/app/route'`;
- test `'každý recept má právě jednu stránku a index'` nahradit:

```ts
  test('každý recept je dvoustrana: levá na lichém indexu, pravá hned za ní', () => {
    const layout = buildLayout(data, { tocPageCount: 2 })
    expect(layout.recipeIndex.size).toBe(data.length)
    expect(layout.entries.filter((e) => e.kind === 'recipe').length).toBe(2 * data.length)
    for (const [id, idx] of layout.recipeIndex) {
      expect(idx % 2).toBe(1)
      expect(layout.entries[idx]).toMatchObject({ kind: 'recipe', recipeId: id, half: 'left' })
      expect(layout.entries[idx + 1]).toMatchObject({ kind: 'recipe', recipeId: id, half: 'right' })
    }
  })

  test('pravá polovina má routu svého receptu a routa vede na levou (reload na pravé straně)', () => {
    const layout = buildLayout(data, { tocPageCount: 2 })
    for (const [id, left] of layout.recipeIndex) {
      expect(indexToRoute(left + 1, layout)).toEqual({ kind: 'recipe', id })
      expect(routeToIndex({ kind: 'recipe', id }, layout)).toBe(left)
    }
  })
```

- test `'syntetický layout: přesné pořadí'` nahradit:

```ts
test('syntetický layout: přesné pořadí', () => {
  const layout = buildLayout(synthetic, { tocPageCount: 1 })
  expect(layout.entries.map((e) => e.id)).toEqual([
    'cover', 'about-left', 'about-right', 'toc-0',
    'chapter-polevky', 'recipe-a', 'recipe-a:postup', 'recipe-b', 'recipe-b:postup',
    'blank-0', 'chapter-sladke', 'recipe-c', 'recipe-c:postup',
    'blank-1', 'list', 'settings',
  ])
})
```

Run: `npx vitest run src/content/buildPages.test.ts`
Expected: FAIL (recept má jen jednu položku, `half` chybí)

- [ ] **Step 2: Implementace layoutu**

```ts
// src/content/buildPages.ts
import { CHAPTERS } from '@/domain/schema'
import type { Chapter, Recipe } from '@/domain/types'

export type PageKind = 'cover' | 'about' | 'toc' | 'chapter' | 'recipe' | 'blank' | 'list' | 'settings'
export type RecipeHalf = 'left' | 'right'

export interface PageEntry {
  id: string
  kind: PageKind
  recipeId?: string
  chapter?: Chapter
  tocPage?: number
  /** Polovina dvoustrany receptu: levá = hlavička a suroviny, pravá = postup. */
  half?: RecipeHalf
}

export interface BookLayout {
  entries: PageEntry[]
  /** Index levé poloviny receptu (lichý). */
  recipeIndex: Map<string, number>
  chapterIndex: Map<Chapter, number>
  tocIndex: number
  listIndex: number
  settingsIndex: number
}

/**
 * Čistá funkce: z receptů sestaví pořadí stránek knihy.
 * Index 0 je obal (vpravo), sudé indexy jsou pravé strany, liché levé.
 * Úvod kapitoly a seznam surovin začínají vždy na pravé (sudé) straně,
 * recept je dvoustrana (levá lichá + pravá sudá), takže mezi recepty nejsou prázdné stránky.
 */
export function buildLayout(recipes: Recipe[], opts: { tocPageCount: number }): BookLayout {
  const entries: PageEntry[] = []
  const recipeIndex = new Map<string, number>()
  const chapterIndex = new Map<Chapter, number>()
  let blankCount = 0

  const push = (entry: PageEntry): number => entries.push(entry) - 1
  const alignToRight = () => {
    if (entries.length % 2 !== 0) push({ id: `blank-${blankCount++}`, kind: 'blank' })
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
      // kapitola je na sudém indexu → levá polovina receptu na lichém; dvojice drží paritu
      recipeIndex.set(r.id, push({ id: `recipe-${r.id}`, kind: 'recipe', recipeId: r.id, chapter, half: 'left' }))
      // dvojtečka není v kebab-case id, takže id pravé poloviny nekoliduje s jiným receptem
      push({ id: `recipe-${r.id}:postup`, kind: 'recipe', recipeId: r.id, chapter, half: 'right' })
    }
  }

  alignToRight()
  const listIndex = push({ id: 'list', kind: 'list' })
  const settingsIndex = push({ id: 'settings', kind: 'settings' })

  return { entries, recipeIndex, chapterIndex, tocIndex, listIndex, settingsIndex }
}
```

Run: `npx vitest run src/content/buildPages.test.ts src/app`
Expected: PASS

- [ ] **Step 3: Failing testy stránek receptu**

```tsx
// src/pages/RecipePage.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { loadContent } from '@/content/loadContent'
import { RecipeLeft, RecipeRight } from './RecipePage'
import { TAG_LABEL } from './labels'

const { recipes, ingredients } = loadContent()
const chilli = recipes.find((r) => r.id === 'chilli-con-carne')!

function setupLeft(over: Partial<React.ComponentProps<typeof RecipeLeft>> = {}) {
  const props = { recipe: chilli, ingredients, favorite: false, onToggleFavorite: vi.fn(), ...over }
  return { ...render(<RecipeLeft {...props} />), props }
}

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

  it('oslí ucho odráží favorite a volá callback (do Task 4)', async () => {
    const { props } = setupLeft({ favorite: true })
    const btn = screen.getByRole('button', { name: /oblíbených/ })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(btn)
    expect(props.onToggleFavorite).toHaveBeenCalled()
  })

  it('vlastní recept: era--vlastni a kniha bez roku', () => {
    const { container } = setupLeft({ recipe: { ...chilli, source: { book: 'vlastni' } } })
    expect(container.querySelector('.era--vlastni')).not.toBeNull()
    expect(container.querySelector('.recipe-book')).toHaveTextContent(/^Vlastní recepty$/)
  })
})

describe('RecipeRight', () => {
  it('nese postup, poznámku k modernizaci a patičku zdroje', () => {
    const { container } = render(<RecipeRight recipe={chilli} />)
    expect(container.querySelectorAll('.recipe-steps li')).toHaveLength(chilli.steps.length)
    expect(container.querySelector('.modern-note')).toHaveTextContent(chilli.modernNote!)
    const footer = container.querySelector('footer.source')!
    expect(footer.textContent).toContain('Zdroj: Armed Forces Recipe Service, 2003')
    expect(footer.textContent).toContain('(PDF)')
    expect(container.querySelector('.recipe-running-head')).toHaveTextContent(chilli.title)
  })

  it('nemá tabulku surovin ani štítky', () => {
    const { container } = render(<RecipeRight recipe={chilli} />)
    expect(container.querySelector('table, .pill')).toBeNull()
  })
})
```

Run: `npx vitest run src/pages/RecipePage.test.tsx`
Expected: FAIL (`RecipeLeft` není exportováno)

- [ ] **Step 4: Implementace `RecipeLeft` / `RecipeRight`**

```tsx
// src/pages/RecipePage.tsx
import { BOOK_META } from '@/content/books'
import type { Ingredient, Recipe } from '@/domain/types'
import { DogEar } from './DogEar'
import { IngredientTable } from './IngredientTable'
import { ALLERGEN_LABEL, DIFFICULTY_LABEL, EQUIPMENT_LABEL, difficultyDots } from './labels'

const eraClass = (recipe: Recipe) => `era--${BOOK_META[recipe.source.book].era}`
const originalTitle = (recipe: Recipe) => recipe.titleOriginal ?? recipe.source.titleOriginal

interface LeftProps {
  recipe: Recipe
  ingredients: Map<string, Ingredient>
  favorite: boolean
  onToggleFavorite: () => void
}

/** Levá strana dvoustrany receptu: hlavička, údaje a suroviny (bez štítků). */
export function RecipeLeft({ recipe, ingredients, favorite, onToggleFavorite }: LeftProps) {
  const meta = BOOK_META[recipe.source.book]
  const original = originalTitle(recipe)
  const book = recipe.source.book === 'vlastni' ? meta.title : `${meta.title}, ${meta.year}`
  return (
    <article className={`recipe-page recipe-page--left ${eraClass(recipe)}`}>
      <DogEar active={favorite} onToggle={onToggleFavorite} />
      <header className="recipe-head">
        <h2>{recipe.title}</h2>
      </header>
      {original && <small className="recipe-original-title">{original}</small>}
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
      <IngredientTable recipe={recipe} ingredients={ingredients} servings={4} perPerson />
    </article>
  )
}

/** Pravá strana dvoustrany receptu: postup, poznámka k modernizaci, patička zdroje. */
export function RecipeRight({ recipe }: { recipe: Recipe }) {
  const meta = BOOK_META[recipe.source.book]
  const source = [
    `Zdroj: ${meta.title}, ${meta.year}${recipe.source.page ? `, s. ${recipe.source.page} (PDF)` : ''}`,
    originalTitle(recipe),
  ].filter(Boolean).join(' · ') + (recipe.verified ? '' : ' · čísla odhadnuta')
  return (
    <article className={`recipe-page recipe-page--right ${eraClass(recipe)}`}>
      <p className="recipe-running-head">{recipe.title}</p>
      <h3>Postup</h3>
      <ol className="recipe-steps">
        {recipe.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      {recipe.modernNote && (
        <aside className="modern-note">
          <strong>Poznámka k modernizaci</strong>
          <p>{recipe.modernNote}</p>
        </aside>
      )}
      <footer className="source">{source}</footer>
    </article>
  )
}
```

Run: `npx vitest run src/pages/RecipePage.test.tsx`
Expected: PASS

- [ ] **Step 5: Failing test v App**

Do `src/App.test.tsx` přidat:

```tsx
test('recept je dvoustrana: vlevo suroviny, vpravo postup', () => {
  history.replaceState(null, '', '#/recept/hovezi-gulas')
  const { container } = render(<App />)
  expect(container.querySelector('.book__slot--left .recipe-page--left .ingredient-table')).not.toBeNull()
  expect(container.querySelector('.book__slot--right .recipe-page--right .recipe-steps')).not.toBeNull()
  expect(container.querySelector('.book__slot--right .page')).toHaveClass(
    [...container.querySelector('.recipe-page--right')!.classList].find((c) => c.startsWith('era--'))!,
  )
})
```

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL (App stále importuje `RecipePage` → chyba importu)

- [ ] **Step 6: Zapojení v App**

`src/App.tsx`: import `import { RecipeLeft, RecipeRight } from '@/pages/RecipePage'` místo `RecipePage`; `case 'recipe'` nahradit:

```tsx
        case 'recipe': {
          const recipe = recipeById.get(entry.recipeId!)!
          const own = recipe.source.book === 'vlastni'
          return {
            id: entry.id,
            tone: own ? 'note' : 'aged',
            // epocha na samotné stránce: `--paper` musí platit tam, kde se papír kreslí (obě poloviny)
            className: own ? undefined : `era--${BOOK_META[recipe.source.book].era}`,
            render: () =>
              entry.half === 'right' ? (
                <RecipeRight recipe={recipe} />
              ) : (
                <RecipeLeft
                  recipe={recipe}
                  ingredients={ingredients}
                  favorite={favorites.has(recipe.id)}
                  onToggleFavorite={() => toggleFavorite(recipe.id)}
                />
              ),
          }
        }
```

a v `describePage` větev receptu:

```tsx
    case 'recipe': name = (recipes.get(entry.recipeId!)?.title ?? 'Recept') + (entry.half === 'right' ? ' – postup' : ''); break
```

`src/styles/paper.css` v sekci „stránka receptu“: smazat pravidla `.recipe-labels`, `.recipe-labels .pill`, `.recipe-equipment`, `.recipe-allergens`; přidat:

```css
.recipe-head { display: flex; align-items: flex-start; gap: 0.5rem; }
.recipe-head h2 { flex: 1; min-width: 0; margin-bottom: 0.1em; }
.recipe-meta { display: grid; grid-template-columns: auto 1fr; gap: 0.1em 0.8em; margin: 0.6em 0 0.9em; font-size: 0.85em; }
.recipe-meta > div { display: contents; }
.recipe-meta dt { color: var(--ink-soft); font-style: italic; }
.recipe-meta dd { margin: 0; }
.recipe-running-head { margin: 0 0 0.6em; text-align: center; font-size: 0.8em; font-style: italic; letter-spacing: 0.04em; color: var(--ink-soft); }
.recipe-page--right h3 { margin-top: 0; }
```

- [ ] **Step 7: Vše zelené**

Run: `npm test && npm run build && npm run lint`
Expected: PASS (i stávající testy App: „hash #/recept/hovezi-gulas …“, „třída epochy“, „single→spread→single“)

- [ ] **Step 8: Commit**

```bash
git add src/content/buildPages.ts src/content/buildPages.test.ts src/pages/RecipePage.tsx src/pages/RecipePage.test.tsx src/App.tsx src/App.test.tsx src/styles/paper.css
git commit -m "feat(pages): recept jako dvoustrana – vlevo suroviny, vpravo postup, bez štítků"
```

### Task 4: Srdíčko a hrnec na stránce receptu

**Files:**
- Create: `src/pages/icons.tsx`, `src/pages/RecipeMarks.tsx`, `src/pages/RecipeMarks.test.tsx`
- Modify: `src/pages/RecipePage.tsx` (`RecipeLeft`), `src/pages/RecipePage.test.tsx`, `src/App.tsx`, `src/styles/paper.css`
- Delete: `src/pages/DogEar.tsx`

**Interfaces:**
- Consumes: `toggleCooked`, `state.cooked` z `useUserState()` (Task 2).
- Produces:
```ts
export function HeartIcon(props: { filled?: boolean }): JSX.Element
export function PotIcon(props: { filled?: boolean }): JSX.Element
export function RecipeMarks(props: {
  favorite: boolean; cooked: boolean
  onToggleFavorite: () => void; onToggleCooked: () => void
  /** Název receptu do přístupného jména: „Oblíbené: <label>“, „Uvařeno: <label>“. */
  label?: string
  compact?: boolean
}): JSX.Element
// RecipeLeft props: { recipe; ingredients; favorite: boolean; cooked: boolean; onToggleFavorite(): void; onToggleCooked(): void }
```
Přístupná jména tlačítek: bez `label` přesně „Oblíbené“ a „Uvařeno“; stav nese `aria-pressed`.

- [ ] **Step 1: Failing testy `RecipeMarks`**

```tsx
// src/pages/RecipeMarks.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecipeMarks } from './RecipeMarks'

function setup(over: Partial<React.ComponentProps<typeof RecipeMarks>> = {}) {
  const props = { favorite: false, cooked: false, onToggleFavorite: vi.fn(), onToggleCooked: vi.fn(), ...over }
  return { ...render(<RecipeMarks {...props} />), props }
}

test('tlačítka odrážejí stav přes aria-pressed', () => {
  setup({ favorite: true, cooked: false })
  expect(screen.getByRole('button', { name: 'Oblíbené' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Uvařeno' })).toHaveAttribute('aria-pressed', 'false')
})

test('klik volá odpovídající callback', async () => {
  const { props } = setup()
  await userEvent.click(screen.getByRole('button', { name: 'Oblíbené' }))
  await userEvent.click(screen.getByRole('button', { name: 'Uvařeno' }))
  expect(props.onToggleFavorite).toHaveBeenCalledTimes(1)
  expect(props.onToggleCooked).toHaveBeenCalledTimes(1)
})

test('label se připojí k přístupnému jménu, ikony jsou skryté', () => {
  const { container } = setup({ label: 'Čočková polévka', compact: true })
  expect(screen.getByRole('button', { name: 'Oblíbené: Čočková polévka' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Uvařeno: Čočková polévka' })).toBeInTheDocument()
  expect(container.querySelector('.recipe-marks--compact')).not.toBeNull()
  container.querySelectorAll('svg').forEach((svg) => expect(svg).toHaveAttribute('aria-hidden', 'true'))
})

test('vyplněná ikona odpovídá stavu', () => {
  const { container } = setup({ favorite: true, cooked: true })
  expect(container.querySelector('.mark--favorite svg')).toHaveAttribute('fill', 'currentColor')
  expect(container.querySelector('.mark--cooked svg path')).toHaveAttribute('fill', 'currentColor')
})
```

Run: `npx vitest run src/pages/RecipeMarks.test.tsx`
Expected: FAIL (modul neexistuje)

- [ ] **Step 2: Implementace ikon a `RecipeMarks`**

```tsx
// src/pages/icons.tsx
interface IconProps {
  filled?: boolean
}

export function HeartIcon({ filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 20.5s-7.6-4.7-9.4-9.4C1.3 7.7 3.5 4.5 6.9 4.5c2 0 3.6 1.1 5.1 3 1.5-1.9 3.1-3 5.1-3 3.4 0 5.6 3.2 4.3 6.6-1.8 4.7-9.4 9.4-9.4 9.4z" />
    </svg>
  )
}

export function PotIcon({ filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10.5h16v5.5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill={filled ? 'currentColor' : 'none'} />
      <path d="M2 12h2M20 12h2M3 10.5h18" />
      <path d="M9 3.5c-.8 1 .8 2 0 3.2M14 3.5c-.8 1 .8 2 0 3.2" />
    </svg>
  )
}
```

```tsx
// src/pages/RecipeMarks.tsx
import { HeartIcon, PotIcon } from './icons'

interface Props {
  favorite: boolean
  cooked: boolean
  onToggleFavorite: () => void
  onToggleCooked: () => void
  /** Název receptu do přístupného jména (v obsahu je takových tlačítek mnoho). */
  label?: string
  compact?: boolean
}

/** Srdíčko (oblíbené) a hrnec (uvařeno = mám odzkoušeno) – na stránce receptu i u řádku obsahu. */
export function RecipeMarks({ favorite, cooked, onToggleFavorite, onToggleCooked, label, compact = false }: Props) {
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
      <button
        type="button"
        className="mark mark--cooked"
        aria-pressed={cooked}
        aria-label={`Uvařeno${suffix}`}
        title={cooked ? 'Uvařeno – mám odzkoušeno' : 'Označit jako uvařené'}
        onClick={onToggleCooked}
      >
        <PotIcon filled={cooked} />
      </button>
    </span>
  )
}
```

Run: `npx vitest run src/pages/RecipeMarks.test.tsx`
Expected: PASS

- [ ] **Step 3: Failing test v `RecipeLeft`**

V `src/pages/RecipePage.test.tsx`: `setupLeft` props doplnit o `cooked: false, onToggleCooked: vi.fn()`; test „oslí ucho …“ nahradit:

```tsx
  it('srdíčko a hrnec jsou viditelná tlačítka v hlavičce a volají callbacky', async () => {
    const { props, container } = setupLeft({ favorite: true, cooked: false })
    const heart = screen.getByRole('button', { name: 'Oblíbené' })
    const pot = screen.getByRole('button', { name: 'Uvařeno' })
    expect(heart).toHaveAttribute('aria-pressed', 'true')
    expect(pot).toHaveAttribute('aria-pressed', 'false')
    expect(heart.closest('.recipe-head')).not.toBeNull()
    expect(container.querySelector('.dog-ear')).toBeNull()
    await userEvent.click(heart)
    await userEvent.click(pot)
    expect(props.onToggleFavorite).toHaveBeenCalledTimes(1)
    expect(props.onToggleCooked).toHaveBeenCalledTimes(1)
  })
```

Run: `npx vitest run src/pages/RecipePage.test.tsx`
Expected: FAIL (tlačítko „Oblíbené“ neexistuje, je tam oslí ucho)

- [ ] **Step 4: Implementace v `RecipeLeft` a App**

`git rm src/pages/DogEar.tsx`

`src/pages/RecipePage.tsx`: import `DogEar` nahradit `import { RecipeMarks } from './RecipeMarks'`; `LeftProps` doplnit `cooked: boolean` a `onToggleCooked: () => void`; podpis `RecipeLeft({ recipe, ingredients, favorite, cooked, onToggleFavorite, onToggleCooked }: LeftProps)`; smazat `<DogEar … />`; hlavička:

```tsx
      <header className="recipe-head">
        <h2>{recipe.title}</h2>
        <RecipeMarks favorite={favorite} cooked={cooked} onToggleFavorite={onToggleFavorite} onToggleCooked={onToggleCooked} />
      </header>
```

`src/App.tsx`:
- `const { state, toggleFavorite, toggleCooked } = useUserState()`;
- pod `favorites` přidat `const cooked = useMemo(() => new Set(state.cooked), [state.cooked])`;
- v `<RecipeLeft …>` doplnit `cooked={cooked.has(recipe.id)}` a `onToggleCooked={() => toggleCooked(recipe.id)}`;
- závislosti `pages`: `[layout, recipes, ingredients, recipeById, filter, favorites, cooked, navigate, toggleFavorite, toggleCooked]`.

`src/styles/paper.css`: smazat `.recipe-page h2 { padding-right: 2.6rem; }` a pravidla `.dog-ear`, `.dog-ear--active`, `.dog-ear:focus-visible`; přidat:

```css
/* srdíčko a hrnec */
.recipe-marks { flex: none; display: inline-flex; gap: 0.25rem; }
.mark { display: inline-grid; place-items: center; width: 2.1rem; height: 2.1rem; padding: 0; border: 1px solid transparent; border-radius: 50%; background: none; color: var(--ink-soft); cursor: pointer; }
.mark svg { width: 1.35rem; height: 1.35rem; }
.mark--favorite[aria-pressed="true"] { color: #b5483a; }
.mark--cooked[aria-pressed="true"] { color: var(--ink); }
.mark:focus-visible { outline: 2px solid var(--ink); }
@media (hover: hover) { .mark:hover { border-color: var(--paper-edge); } }
.recipe-marks--compact { gap: 0.1rem; align-self: center; }
.recipe-marks--compact .mark { width: 1.2em; height: 1.2em; border: 0; }
.recipe-marks--compact .mark svg { width: 0.95em; height: 0.95em; }
.recipe-marks--compact .mark[aria-pressed="false"] { opacity: 0.35; }
```

- [ ] **Step 5: Vše zelené**

Run: `grep -rn "DogEar\|dog-ear" src; npm test && npm run build && npm run lint`
Expected: grep nic; PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/icons.tsx src/pages/RecipeMarks.tsx src/pages/RecipeMarks.test.tsx src/pages/RecipePage.tsx src/pages/RecipePage.test.tsx src/App.tsx src/styles/paper.css
git commit -m "feat(pages): srdíčko a hrnec „uvařeno“ na stránce receptu místo oslího ucha"
```

### Task 5: Filtry v obsahu (odvozené štítky, oblíbené, uvařené) a ikony u řádků

**Files:**
- Modify: `src/content/search.ts` (horní část souboru níže), `src/content/search.test.ts`, `src/pages/TocPages.tsx` (celý soubor níže), `src/pages/TocPages.test.tsx` (celý soubor níže), `src/pages/SearchOverlay.tsx:25`, `src/App.tsx`, `src/styles/paper.css`

**Interfaces:**
- Consumes: `FILTER_TAGS`, `FILTER_TAG_LABEL`, `hasFilterTag`, `FilterTag` (Task 1); `RecipeMarks`, `HeartIcon`, `PotIcon` (Task 4); `cooked`, `toggleCooked` (Task 2).
- Produces:
```ts
export interface Filter { tags: FilterTag[]; equipment: Equipment[]; books: Book[]; favoritesOnly: boolean; cookedOnly: boolean; query: string }
export const EMPTY_FILTER: Filter   // všechno prázdné / false
export interface UserMarks { favorites: ReadonlySet<string>; cooked: ReadonlySet<string> }
export const NO_MARKS: UserMarks
export function filterRecipes(recipes: Recipe[], ingredients: Map<string, Ingredient>, filter: Filter, marks?: UserMarks): Recipe[]
// TocPages props: + cooked: Set<string>, onToggleCooked: (id: string) => void
```
Řádek obsahu: `li.toc-recipe` > `RecipeMarks compact label=<název>` (vlevo, uvnitř obsahové plochy – mimo úchyt `.page-edge`) + `button.toc-row` (název, tečky, číslo strany).

- [ ] **Step 1: Failing testy filtru**

V `src/content/search.test.ts` nahradit hlavičku a testy filtrů (test `paginateToc` zatím ponechat):

```ts
import { loadContent } from './loadContent'
import { EMPTY_FILTER, filterRecipes, normalize, paginateToc, type Filter } from './search'

const { recipes, ingredients } = loadContent()
const ids = (f: Partial<Filter>, marks: { fav?: string[]; cooked?: string[] } = {}) =>
  filterRecipes(recipes, ingredients, { ...EMPTY_FILTER, ...f }, { favorites: new Set(marks.fav), cooked: new Set(marks.cooked) }).map((r) => r.id)

test('normalize odstraní diakritiku a velká písmena', () => {
  expect(normalize('Čočková polévka')).toBe('cockova polevka')
})

test('prázdný filtr vrací vše; bez značek (výchozí NO_MARKS) taky', () => {
  expect(ids({})).toHaveLength(recipes.length)
  expect(filterRecipes(recipes, ingredients, EMPTY_FILTER)).toHaveLength(recipes.length)
})

test('query bez diakritiky najde recept podle názvu', () => {
  expect(ids({ query: 'cocka' })).toContain('cockova-polevka')
})

test('query najde recept přes název suroviny', () => {
  expect(ids({ query: 'treska' })).toContain('pecena-ryba')
})

test('favoritesOnly s prázdnými oblíbenými vrací []', () => {
  expect(ids({ favoritesOnly: true })).toEqual([])
  expect(ids({ favoritesOnly: true }, { fav: ['cockova-polevka'] })).toEqual(['cockova-polevka'])
})

test('cookedOnly filtruje uvařené', () => {
  expect(ids({ cookedOnly: true })).toEqual([])
  expect(ids({ cookedOnly: true }, { cooked: ['cockova-polevka'], fav: ['pecena-ryba'] })).toEqual(['cockova-polevka'])
})

test('štítek a kniha tvoří průnik', () => {
  const both = ids({ tags: ['levne'], books: ['navy-1944'] })
  expect(both.length).toBeGreaterThan(0)
  for (const id of both) {
    const r = recipes.find((x) => x.id === id)!
    expect(r.tags).toContain('levne')
    expect(r.source.book).toBe('navy-1944')
  }
})

test('rychlé je odvozené z času, ne z ručního tagu', () => {
  const quick = ids({ tags: ['rychle'] })
  expect(quick).toHaveLength(recipes.filter((r) => r.timeMinutes <= 45).length)
  expect(quick.length).toBeGreaterThan(recipes.filter((r) => r.tags.includes('rychle')).length)
})

test('historické = všechny knihy kromě AFRS 2003', () => {
  const hist = ids({ tags: ['historicke'] })
  expect(hist.length).toBeGreaterThan(0)
  expect(hist).toHaveLength(recipes.filter((r) => r.source.book !== 'afrs-2003' && r.source.book !== 'vlastni').length)
})
```

Run: `npx vitest run src/content/search.test.ts`
Expected: FAIL (TS/runtime: `cookedOnly` neexistuje, `'rychle'` filtruje podle ručního tagu → počet nesedí)

- [ ] **Step 2: Implementace filtru**

V `src/content/search.ts` nahradit vše od začátku souboru po konec funkce `filterRecipes` (včetně) tímto (zbytek souboru – `paginateToc`, `TOC_ROWS_PER_PAGE`, `TocRow`, `buildTocRows`, `tocPageCount` – zůstává):

```ts
import { CHAPTERS } from '@/domain/schema'
import type { Book, Chapter, Equipment, Ingredient, Recipe } from '@/domain/types'
import { hasFilterTag, type FilterTag } from './derivedTags'

export interface Filter {
  /** Štítky filtru (ruční + odvozené `rychle`/`historicke`), všechny musí platit. */
  tags: FilterTag[]
  equipment: Equipment[]
  books: Book[]
  favoritesOnly: boolean
  cookedOnly: boolean
  query: string
}

export const EMPTY_FILTER: Filter = { tags: [], equipment: [], books: [], favoritesOnly: false, cookedOnly: false, query: '' }

/** Značky uživatele u receptů (srdíčko, hrnec). */
export interface UserMarks {
  favorites: ReadonlySet<string>
  cooked: ReadonlySet<string>
}

export const NO_MARKS: UserMarks = { favorites: new Set(), cooked: new Set() }

/** Malá písmena bez diakritiky (pro hledání bez ohledu na háčky a čárky). */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/** Normalizovaný text, ve kterém se hledá: názvy receptu a názvy + aliasy jeho surovin. */
export function searchHaystack(recipe: Recipe, ingredients: Map<string, Ingredient>): string {
  const parts = [recipe.title, recipe.titleOriginal ?? '', recipe.source.titleOriginal ?? '']
  for (const line of recipe.ingredients) {
    const ing = ingredients.get(line.ingredientId)
    if (ing) parts.push(ing.name, ...ing.aliases)
  }
  return normalize(parts.join('\n'))
}

export function filterRecipes(
  recipes: Recipe[],
  ingredients: Map<string, Ingredient>,
  filter: Filter,
  marks: UserMarks = NO_MARKS,
): Recipe[] {
  const query = normalize(filter.query.trim())
  return recipes.filter((r) => {
    if (filter.favoritesOnly && !marks.favorites.has(r.id)) return false
    if (filter.cookedOnly && !marks.cooked.has(r.id)) return false
    if (!filter.tags.every((t) => hasFilterTag(r, t))) return false
    if (!filter.equipment.every((e) => r.equipment.includes(e))) return false
    if (filter.books.length > 0 && !filter.books.includes(r.source.book)) return false
    return query === '' || searchHaystack(r, ingredients).includes(query)
  })
}
```

`src/pages/SearchOverlay.tsx:25`: `const hits = filterRecipes(recipes, ingredients, { ...EMPTY_FILTER, query })` (bez čtvrtého argumentu).

Run: `npx vitest run src/content/search.test.ts`
Expected: PASS

- [ ] **Step 3: Failing testy obsahu**

```tsx
// src/pages/TocPages.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { loadContent } from '@/content/loadContent'
import { FILTER_TAGS, FILTER_TAG_LABEL } from '@/content/derivedTags'
import { EMPTY_FILTER, tocPageCount } from '@/content/search'
import { TocPages } from './TocPages'

const { recipes, ingredients } = loadContent()
const pageNumbers = new Map(recipes.map((r, i) => [r.id, i + 10]))

function setup(over: Partial<React.ComponentProps<typeof TocPages>> = {}) {
  const props = {
    recipes,
    ingredients,
    filter: EMPTY_FILTER,
    onFilterChange: vi.fn(),
    favorites: new Set<string>(),
    cooked: new Set<string>(),
    pageNumbers,
    page: 0,
    onNavigate: vi.fn(),
    onToggleFavorite: vi.fn(),
    onToggleCooked: vi.fn(),
    ...over,
  }
  return { ...render(<TocPages {...props} />), props }
}

test('tocPageCount je alespoň 1 a počítá z nefiltrovaného seznamu', () => {
  expect(tocPageCount([])).toBe(1)
  expect(tocPageCount(recipes)).toBeGreaterThanOrEqual(1)
})

test('klik na řádek volá onNavigate s routou receptu', () => {
  const { props } = setup()
  const first = recipes[0]
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${first.title.replace(/[()]/g, '\\$&')}`) }))
  expect(props.onNavigate).toHaveBeenCalledWith({ kind: 'recipe', id: first.id })
})

test('prázdný výsledek ukáže „Nic nenalezeno.“', () => {
  setup({ filter: { ...EMPTY_FILTER, query: 'zzzzqqq' } })
  expect(screen.getByText('Nic nenalezeno.')).toBeInTheDocument()
})

test('prázdné oblíbené ukážou nápovědu se srdíčkem', () => {
  setup({ filter: { ...EMPTY_FILTER, favoritesOnly: true } })
  expect(screen.getByText('Zatím žádné oblíbené recepty – označ srdíčko u receptu.')).toBeInTheDocument()
})

test('prázdné uvařené ukážou nápovědu s hrncem', () => {
  setup({ filter: { ...EMPTY_FILTER, cookedOnly: true } })
  expect(screen.getByText('Zatím nic uvařeno – označ hrnec u receptu.')).toBeInTheDocument()
})

test('pilulky štítků: jen sada filtru, bez „bez masa“ a „sladké“', () => {
  setup()
  for (const t of FILTER_TAGS) expect(screen.getByRole('button', { name: FILTER_TAG_LABEL[t] })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'bez masa' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'sladké' })).toBeNull()
})

test('pilulka štítku přepne filtr', () => {
  const { props } = setup()
  fireEvent.click(screen.getByRole('button', { name: 'levné' }))
  expect(props.onFilterChange).toHaveBeenCalledWith({ ...EMPTY_FILTER, tags: ['levne'] })
})

test('pilulky „Jen oblíbené“ a „Jen uvařené“', () => {
  const { props } = setup()
  fireEvent.click(screen.getByRole('button', { name: 'Jen oblíbené' }))
  expect(props.onFilterChange).toHaveBeenLastCalledWith({ ...EMPTY_FILTER, favoritesOnly: true })
  fireEvent.click(screen.getByRole('button', { name: 'Jen uvařené' }))
  expect(props.onFilterChange).toHaveBeenLastCalledWith({ ...EMPTY_FILTER, cookedOnly: true })
})

test('řádek nese srdíčko a hrnec uvnitř řádku, před odkazem', () => {
  const r = recipes[0]
  const { props } = setup({ favorites: new Set([r.id]) })
  const heart = screen.getByRole('button', { name: `Oblíbené: ${r.title}` })
  const pot = screen.getByRole('button', { name: `Uvařeno: ${r.title}` })
  expect(heart).toHaveAttribute('aria-pressed', 'true')
  expect(pot).toHaveAttribute('aria-pressed', 'false')
  const li = heart.closest('li.toc-recipe')!
  const row = li.querySelector('.toc-row')!
  expect(heart.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  fireEvent.click(heart)
  fireEvent.click(pot)
  expect(props.onToggleFavorite).toHaveBeenCalledWith(r.id)
  expect(props.onToggleCooked).toHaveBeenCalledWith(r.id)
})
```

Run: `npx vitest run src/pages/TocPages.test.tsx`
Expected: FAIL (pilulky „rychlé“, „historické“, „Jen uvařené“ a tlačítka u řádku chybí)

- [ ] **Step 4: Implementace obsahu**

```tsx
// src/pages/TocPages.tsx
import type { ReactNode } from 'react'
import { CHAPTER_META } from '@/content/chapters'
import { BOOK_META } from '@/content/books'
import { FILTER_TAGS, FILTER_TAG_LABEL } from '@/content/derivedTags'
import { buildTocRows, filterRecipes, paginateToc, tocPageCount, TOC_ROWS_PER_PAGE, type Filter } from '@/content/search'
import { EQUIPMENT } from '@/domain/schema'
import type { Book, Ingredient, Recipe } from '@/domain/types'
import type { Route } from '@/app/route'
import { HeartIcon, PotIcon } from './icons'
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
  cooked: Set<string>
  /** Číslo stránky knihy pro každý recept (id → číslo levé strany). */
  pageNumbers: Map<string, number>
  /** Index stránky obsahu (0 = první, s panelem filtrů). */
  page: number
  onNavigate: (route: Route) => void
  onToggleFavorite: (id: string) => void
  onToggleCooked: (id: string) => void
}

function Pill({ label, pressed, onClick, icon }: { label: string; pressed: boolean; onClick: () => void; icon?: ReactNode }) {
  return (
    <button type="button" className={`toc-pill${pressed ? ' toc-pill--on' : ''}`} aria-pressed={pressed} onClick={onClick}>
      {icon}
      {label}
    </button>
  )
}

function FilterPanel({ filter, onFilterChange }: Pick<TocPagesProps, 'filter' | 'onFilterChange'>) {
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
        {EQUIPMENT.map((e) => (
          <Pill key={e} label={EQUIPMENT_LABEL[e]} pressed={filter.equipment.includes(e)} onClick={() => onFilterChange({ ...filter, equipment: toggle(filter.equipment, e) })} />
        ))}
      </fieldset>
      <fieldset>
        <legend>Zdroj</legend>
        {FILTER_BOOKS.map((b) => (
          <Pill key={b} label={BOOK_META[b].shortTitle} pressed={filter.books.includes(b)} onClick={() => onFilterChange({ ...filter, books: toggle(filter.books, b) })} />
        ))}
      </fieldset>
      <fieldset>
        <legend>Moje</legend>
        <Pill icon={<HeartIcon filled={filter.favoritesOnly} />} label="Jen oblíbené" pressed={filter.favoritesOnly} onClick={() => onFilterChange({ ...filter, favoritesOnly: !filter.favoritesOnly })} />
        <Pill icon={<PotIcon filled={filter.cookedOnly} />} label="Jen uvařené" pressed={filter.cookedOnly} onClick={() => onFilterChange({ ...filter, cookedOnly: !filter.cookedOnly })} />
      </fieldset>
    </div>
  )
}

function emptyText(filter: Filter, favorites: Set<string>, cooked: Set<string>): string {
  if (filter.favoritesOnly && favorites.size === 0) return 'Zatím žádné oblíbené recepty – označ srdíčko u receptu.'
  if (filter.cookedOnly && cooked.size === 0) return 'Zatím nic uvařeno – označ hrnec u receptu.'
  return 'Nic nenalezeno.'
}

/** Obsah rozdělený na stránky; komponenta vykreslí jednu stránku (`page`). Stav filtru drží rodič. */
export function TocPages({ recipes, ingredients, filter, onFilterChange, favorites, cooked, pageNumbers, page, onNavigate, onToggleFavorite, onToggleCooked }: TocPagesProps) {
  const total = tocPageCount(recipes)
  const filtered = filterRecipes(recipes, ingredients, filter, { favorites, cooked })
  const rows = paginateToc(buildTocRows(filtered), TOC_ROWS_PER_PAGE)[page] ?? []

  return (
    <div className="toc-page">
      {page === 0 && (
        <>
          <h2 className="toc-title">Obsah</h2>
          <FilterPanel filter={filter} onFilterChange={onFilterChange} />
        </>
      )}
      {filtered.length === 0 && page === 0 && <p className="toc-empty">{emptyText(filter, favorites, cooked)}</p>}
      <ul className="toc-list">
        {rows.map((row) =>
          row.kind === 'chapter' ? (
            <li key={`c-${row.chapter}`} className="toc-chapter">
              <h3>{CHAPTER_META[row.chapter].title}</h3>
            </li>
          ) : (
            <li key={row.recipe.id} className="toc-recipe">
              {/* značky uvnitř obsahové plochy: mimo úchyt pro otáčení na vnějším okraji stránky */}
              <RecipeMarks
                compact
                label={row.recipe.title}
                favorite={favorites.has(row.recipe.id)}
                cooked={cooked.has(row.recipe.id)}
                onToggleFavorite={() => onToggleFavorite(row.recipe.id)}
                onToggleCooked={() => onToggleCooked(row.recipe.id)}
              />
              <button type="button" className="toc-row" onClick={() => onNavigate({ kind: 'recipe', id: row.recipe.id })}>
                <span className="toc-row-title">{row.recipe.title}</span>
                <span className="toc-row-dots" aria-hidden="true" />
                <span className="toc-row-page">{pageNumbers.get(row.recipe.id)}</span>
              </button>
            </li>
          ),
        )}
      </ul>
      <span className="visually-hidden">Strana obsahu {page + 1} z {total}</span>
    </div>
  )
}
```

`src/App.tsx` – `<TocPages …>` doplnit `cooked={cooked}` a `onToggleCooked={toggleCooked}` (závislosti `pages` už `cooked` a `toggleCooked` obsahují z Task 4).

`src/styles/paper.css` v sekci „obsah“:
- pravidlo `.toc-pill:focus-visible, .toc-row:focus-visible, .toc-heart:focus-visible` změnit na `.toc-pill:focus-visible, .toc-row:focus-visible { outline: 2px solid var(--ink); }`;
- `.toc-recipe` změnit na `.toc-recipe { display: flex; align-items: baseline; gap: 0.35em; }`;
- smazat celé pravidlo `.toc-heart { … }`;
- přidat `.toc-pill svg { width: 1em; height: 1em; vertical-align: -0.15em; margin-right: 0.25em; }`.

- [ ] **Step 5: Vše zelené**

Run: `grep -rn "toc-heart\|ohni roh" src; npm test && npm run build && npm run lint`
Expected: grep nic; PASS

- [ ] **Step 6: Commit**

```bash
git add src/content/search.ts src/content/search.test.ts src/pages/TocPages.tsx src/pages/TocPages.test.tsx src/pages/SearchOverlay.tsx src/App.tsx src/styles/paper.css
git commit -m "feat(pages): filtry obsahu s odvozenými štítky, oblíbené a uvařené u řádků"
```

### Task 6: Obsah bez ořezu (stránkování podle výšky stránky) a proklik z každé stránky

**Files:**
- Modify: `src/content/search.ts` (spodní část souboru níže), `src/content/search.test.ts`, `src/pages/TocPages.tsx`, `src/pages/TocPages.test.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `buildLayout`, `routeToIndex` (Task 3), `TocRow`, `buildTocRows`.
- Produces (nahrazují `paginateToc` a `TOC_ROWS_PER_PAGE`, které se mažou):
```ts
export const TOC_PAGE_UNITS = 16
export const TOC_FIRST_PAGE_UNITS = 7
export const TOC_LONG_TITLE_CHARS = 28
export function tocRowUnits(row: TocRow): number
export function paginateTocRows(rows: TocRow[], caps?: { first: number; rest: number }): TocRow[][]
export function tocRowsForPage(pages: TocRow[][], page: number, total: number): TocRow[]
export function tocPageCount(recipes: Recipe[]): number   // = paginateTocRows(buildTocRows(recipes)).length
```
Konstanty vycházejí z měření v Global Constraints (390×844: 469 px / 23 px ≈ 20 řádků → 16 s rezervou; 320×568: 376 px ≈ 16 řádků; první stránka mínus ≈ 210 px filtrů → 7).

- [ ] **Step 1: Failing testy stránkování**

V `src/content/search.test.ts` změnit import na:

```ts
import { loadContent } from './loadContent'
import { FILTER_TAGS } from './derivedTags'
import {
  EMPTY_FILTER, TOC_FIRST_PAGE_UNITS, TOC_LONG_TITLE_CHARS, TOC_PAGE_UNITS,
  buildTocRows, filterRecipes, normalize, paginateTocRows, tocPageCount, tocRowUnits, tocRowsForPage,
  type Filter, type TocRow,
} from './search'
import { BOOKS, EQUIPMENT } from '@/domain/schema'
```

smazat test `'paginateToc rozdělí 60 položek po 28 na 3 stránky'` a přidat:

```ts
const units = (rows: TocRow[]) => rows.reduce((s, r) => s + tocRowUnits(r), 0)

test('jednotky řádků: kapitola 2, dlouhý název 2, jinak 1', () => {
  const short = recipes.find((r) => r.title.length <= TOC_LONG_TITLE_CHARS)!
  const long = recipes.find((r) => r.title.length > TOC_LONG_TITLE_CHARS)!
  expect(tocRowUnits({ kind: 'chapter', chapter: 'polevky' })).toBe(2)
  expect(tocRowUnits({ kind: 'recipe', recipe: short })).toBe(1)
  expect(tocRowUnits({ kind: 'recipe', recipe: long })).toBe(2)
})

test('žádná stránka obsahu nepřekročí kapacitu a každý recept je tam právě jednou', () => {
  const pages = paginateTocRows(buildTocRows(recipes))
  pages.forEach((p, i) => expect(units(p)).toBeLessThanOrEqual(i === 0 ? TOC_FIRST_PAGE_UNITS : TOC_PAGE_UNITS))
  const ids = pages.flat().flatMap((r) => (r.kind === 'recipe' ? [r.recipe.id] : []))
  expect([...ids].sort()).toEqual(recipes.map((r) => r.id).sort())
  expect(tocPageCount(recipes)).toBe(pages.length)
})

test('nadpis kapitoly nezůstane sám na konci stránky', () => {
  for (const p of paginateTocRows(buildTocRows(recipes))) expect(p.at(-1)?.kind).toBe('recipe')
})

test('prázdný seznam má jednu (prázdnou) stránku', () => {
  expect(paginateTocRows([])).toEqual([[]])
  expect(tocPageCount([])).toBe(1)
})

test('každý jednotlivý filtr se vejde do počtu stránek nefiltrovaného obsahu', () => {
  const total = tocPageCount(recipes)
  const filters: Partial<Filter>[] = [
    ...FILTER_TAGS.map((t) => ({ tags: [t] })),
    ...EQUIPMENT.map((e) => ({ equipment: [e] })),
    ...BOOKS.map((b) => ({ books: [b] })),
  ]
  for (const f of filters) {
    const filtered = filterRecipes(recipes, ingredients, { ...EMPTY_FILTER, ...f })
    expect(paginateTocRows(buildTocRows(filtered)).length).toBeLessThanOrEqual(total)
  }
})

test('tocRowsForPage: přebytek filtrovaných stránek dostane poslední stránka obsahu', () => {
  const r = (n: number): TocRow => ({ kind: 'recipe', recipe: recipes[n] })
  const pages = [[r(0)], [r(1)], [r(2)], [r(3)]]
  expect(tocRowsForPage(pages, 0, 2)).toEqual([r(0)])
  expect(tocRowsForPage(pages, 1, 2)).toEqual([r(1), r(2), r(3)])
  expect(tocRowsForPage([[r(0)]], 1, 3)).toEqual([])
})
```

Run: `npx vitest run src/content/search.test.ts`
Expected: FAIL (`paginateTocRows`, `tocRowUnits`, `tocRowsForPage` neexistují)

- [ ] **Step 2: Implementace stránkování**

V `src/content/search.ts` nahradit vše od `export function paginateToc` do konce souboru:

```ts
export type TocRow = { kind: 'chapter'; chapter: Chapter } | { kind: 'recipe'; recipe: Recipe }

export function buildTocRows(recipes: Recipe[]): TocRow[] {
  const rows: TocRow[] = []
  for (const chapter of CHAPTERS) {
    const inChapter = recipes.filter((r) => r.chapter === chapter)
    if (inChapter.length === 0) continue
    rows.push({ kind: 'chapter', chapter })
    for (const recipe of inChapter) rows.push({ kind: 'recipe', recipe })
  }
  return rows
}

/**
 * Kapacita stránky obsahu v „jednotkách“ (1 jednotka = řádek receptu 23 px).
 * Naměřeno: obsah stránky 469 px při 390×844, 376 px při 320×568, 657 px při 1390×800.
 * Raději méně řádků a více stránek – obsah se nesmí ořezávat.
 */
export const TOC_PAGE_UNITS = 16
/** První stránka nese nadpis „Obsah“ a panel filtrů (≈ 210 px). */
export const TOC_FIRST_PAGE_UNITS = 7
/** Delší název se na mobilu zalomí na dva řádky. */
export const TOC_LONG_TITLE_CHARS = 28

export function tocRowUnits(row: TocRow): number {
  if (row.kind === 'chapter') return 2 // nadpis s okrajem a linkou (35 px)
  return row.recipe.title.length > TOC_LONG_TITLE_CHARS ? 2 : 1
}

/** Rozdělí řádky obsahu na stránky podle kapacity; nadpis kapitoly drží pohromadě s prvním receptem. */
export function paginateTocRows(
  rows: TocRow[],
  caps: { first: number; rest: number } = { first: TOC_FIRST_PAGE_UNITS, rest: TOC_PAGE_UNITS },
): TocRow[][] {
  const pages: TocRow[][] = [[]]
  let used = 0
  rows.forEach((row, i) => {
    const current = pages[pages.length - 1]
    const cap = pages.length === 1 ? caps.first : caps.rest
    const own = tocRowUnits(row)
    const next = rows[i + 1]
    const need = row.kind === 'chapter' && next?.kind === 'recipe' ? own + tocRowUnits(next) : own
    if (current.length > 0 && used + need > cap) {
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
export function tocPageCount(recipes: Recipe[]): number {
  return paginateTocRows(buildTocRows(recipes)).length
}
```

`src/pages/TocPages.tsx`: import z `@/content/search` změnit na `import { buildTocRows, filterRecipes, paginateTocRows, tocPageCount, tocRowsForPage, type Filter } from '@/content/search'` a řádek s `paginateToc(…)` nahradit:

```tsx
  const rows = tocRowsForPage(paginateTocRows(buildTocRows(filtered)), page, total)
```

Run: `npx vitest run src/content/search.test.ts`
Expected: PASS

- [ ] **Step 3: Failing test prokliku z každé stránky obsahu**

Do `src/pages/TocPages.test.tsx` přidat importy `import { buildLayout } from '@/content/buildPages'`, `import { routeToIndex, type Route } from '@/app/route'` a test:

```tsx
test('každý recept je dosažitelný z některé stránky obsahu a vede na levou stranu dvoustrany', () => {
  const total = tocPageCount(recipes)
  const layout = buildLayout(recipes, { tocPageCount: total })
  const seen = new Set<string>()
  for (let page = 0; page < total; page++) {
    const onNavigate = vi.fn()
    const { container, unmount } = setup({ page, onNavigate, pageNumbers: layout.recipeIndex })
    container.querySelectorAll<HTMLButtonElement>('.toc-row').forEach((btn) => {
      fireEvent.click(btn)
      const route = onNavigate.mock.lastCall![0] as Extract<Route, { kind: 'recipe' }>
      const idx = routeToIndex(route, layout)!
      expect(idx % 2).toBe(1)
      expect(layout.entries[idx]).toMatchObject({ kind: 'recipe', half: 'left', recipeId: route.id })
      expect(btn.querySelector('.toc-row-page')).toHaveTextContent(new RegExp(`^${idx}$`))
      seen.add(route.id)
    })
    unmount()
  }
  expect(seen.size).toBe(recipes.length)
})
```

Do `src/App.test.tsx` přidat `fireEvent` do importu z `@testing-library/react` a test:

```tsx
test('proklik z pravé stránky obsahu otevře recept od levé strany', () => {
  history.replaceState(null, '', '#/obsah')
  const { container } = render(<App />)
  const row = container.querySelector<HTMLButtonElement>('.book__slot--right .toc-row')!
  const title = row.querySelector('.toc-row-title')!.textContent!
  fireEvent.click(row)
  expect(location.hash).toMatch(/^#\/recept\//)
  expect(container.querySelector('.book__slot--left .recipe-page--left h2')).toHaveTextContent(title)
})
```

Run: `npx vitest run src/pages/TocPages.test.tsx src/App.test.tsx`
Expected: PASS hned (chování vzniklo v krocích 1–2 a Task 3). Pokud test selže, je to skutečná chyba prokliku – opravit v `TocPages`/`App` před commitem, test neměnit.

- [ ] **Step 4: Vše zelené**

Run: `grep -rn "paginateToc\b\|TOC_ROWS_PER_PAGE" src; npm test && npm run build && npm run lint`
Expected: grep nic; PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/search.ts src/content/search.test.ts src/pages/TocPages.tsx src/pages/TocPages.test.tsx src/App.test.tsx
git commit -m "fix(pages): obsah se neořezává – stránkování podle výšky stránky, proklik z každé stránky"
```

### Task 7: Pevné ovládání – domů a celá obrazovka vedle lupy, rezervovaná routa `#/kosik`

**Files:**
- Create: `src/app/useFullscreen.ts`, `src/app/BookControls.tsx`, `src/app/BookControls.test.tsx`
- Modify: `src/app/route.ts`, `src/app/route.test.ts`, `src/app/useHashRoute.test.tsx`, `src/pages/SearchOverlay.tsx` (třída lupy), `src/App.tsx`, `src/App.test.tsx`, `src/styles/paper.css` (sekce „vyhledávání“)

**Interfaces:**
- Consumes: `navigate(route: Route)` v `App` (skok přes `jumpTo` = `pushState`).
- Produces:
```ts
// route.ts
export type Route = … | { kind: 'cart' }
export interface LayoutLike { …; cartIndex?: number }   // fáze 5 doplní stránku košíku
// parseRoute('#/kosik') → { kind: 'cart' }; routeToHash({ kind: 'cart' }) → '#/kosik'; routeToIndex(cart) → layout.cartIndex ?? null
// useFullscreen.ts
export function fullscreenSupported(): boolean
export function useFullscreen(): { supported: boolean; active: boolean; toggle: () => void }
// BookControls.tsx
export function BookControls(props: { onHome: () => void; children?: ReactNode }): JSX.Element
```
Přístupná jména: „Domů“, „Celá obrazovka“ (`aria-pressed`), „Hledat“ (beze změny). Kontejner `nav.book-controls[aria-label="Ovládání knihy"]`, tlačítka `.book-control`.

- [ ] **Step 1: Failing testy routy**

Do `src/app/route.test.ts` přidat:

```ts
test('rezervovaná routa košíku #/kosik', () => {
  expect(parseRoute('#/kosik')).toEqual({ kind: 'cart' })
  expect(routeToHash({ kind: 'cart' })).toBe('#/kosik')
  // do fáze 5 layout stránku košíku nemá
  expect(routeToIndex({ kind: 'cart' }, layout)).toBeNull()
  expect(routeToIndex({ kind: 'cart' }, { ...layout, cartIndex: 8 })).toBe(8)
})
```

Do `src/app/useHashRoute.test.tsx` přidat:

```tsx
test('#/kosik bez stránky košíku → obal a hash vyčištěn', () => {
  history.replaceState(null, '', '#/kosik')
  const { result } = renderHook(() => useHashRoute(layout))
  expect(result.current.index).toBe(0)
  expect(location.hash).toBe('')
})
```

Run: `npx vitest run src/app`
Expected: FAIL (`parseRoute('#/kosik')` vrací `null`)

- [ ] **Step 2: Implementace routy**

`src/app/route.ts`:
- do `Route` přidat větev `| { kind: 'cart' }`;
- do `LayoutLike` přidat `/** Stránka košíku – přibude ve fázi 5. */ cartIndex?: number`;
- v `parseRoute` za `if (head === 'nastaveni') …` přidat `if (head === 'kosik') return { kind: 'cart' }`;
- v `routeToHash` přidat `case 'cart': return '#/kosik'`;
- v `routeToIndex` přidat `case 'cart': return layout.cartIndex ?? null`.

Run: `npx vitest run src/app`
Expected: PASS

- [ ] **Step 3: Failing testy ovládání**

```tsx
// src/app/BookControls.test.tsx
import { act, fireEvent, render, screen } from '@testing-library/react'
import { BookControls } from './BookControls'

let fsElement: Element | null = null

function enableFullscreen(request: () => Promise<void> = vi.fn(() => Promise.resolve())) {
  const exit = vi.fn(() => Promise.resolve())
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fsElement })
  Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exit })
  Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: request })
  return { request, exit }
}

afterEach(() => {
  fsElement = null
  for (const k of ['fullscreenEnabled', 'fullscreenElement', 'exitFullscreen']) delete (document as unknown as Record<string, unknown>)[k]
  delete (document.documentElement as unknown as Record<string, unknown>).requestFullscreen
})

test('Domů volá onHome a vykreslí i předané děti (lupu)', () => {
  const onHome = vi.fn()
  render(<BookControls onHome={onHome}><button aria-label="Hledat" /></BookControls>)
  fireEvent.click(screen.getByRole('button', { name: 'Domů' }))
  expect(onHome).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('navigation', { name: 'Ovládání knihy' })).toContainElement(screen.getByRole('button', { name: 'Hledat' }))
})

test('bez Fullscreen API (iPhone Safari) se tlačítko nezobrazí', () => {
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: undefined })
  render(<BookControls onHome={vi.fn()} />)
  expect(screen.queryByRole('button', { name: 'Celá obrazovka' })).toBeNull()
})

test('celá obrazovka: zapnutí, aria-pressed podle fullscreenchange, vypnutí', () => {
  const { request, exit } = enableFullscreen()
  render(<BookControls onHome={vi.fn()} />)
  const btn = screen.getByRole('button', { name: 'Celá obrazovka' })
  expect(btn).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(btn)
  expect(request).toHaveBeenCalledTimes(1)
  fsElement = document.documentElement
  act(() => { document.dispatchEvent(new Event('fullscreenchange')) })
  expect(btn).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(btn)
  expect(exit).toHaveBeenCalledTimes(1)
})

test('odmítnutý requestFullscreen nevyhodí nezachycenou chybu', async () => {
  enableFullscreen(vi.fn(() => Promise.reject(new Error('denied'))))
  render(<BookControls onHome={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Celá obrazovka' }))
  await new Promise((r) => setTimeout(r, 0))
  expect(screen.getByRole('button', { name: 'Celá obrazovka' })).toHaveAttribute('aria-pressed', 'false')
})
```

Run: `npx vitest run src/app/BookControls.test.tsx`
Expected: FAIL (modul neexistuje)

- [ ] **Step 4: Implementace**

```ts
// src/app/useFullscreen.ts
import { useCallback, useEffect, useState } from 'react'

/** Fullscreen API je k dispozici (iPhone Safari ho nemá → tlačítko se skryje). */
export function fullscreenSupported(): boolean {
  return (
    typeof document !== 'undefined' &&
    document.fullscreenEnabled === true &&
    typeof document.documentElement.requestFullscreen === 'function'
  )
}

export function useFullscreen(): { supported: boolean; active: boolean; toggle: () => void } {
  const [supported] = useState(fullscreenSupported)
  const [active, setActive] = useState(() => typeof document !== 'undefined' && document.fullscreenElement != null)

  useEffect(() => {
    const onChange = () => setActive(document.fullscreenElement != null)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggle = useCallback(() => {
    // volá se synchronně z kliknutí (uživatelské gesto); odmítnutí se tiše ignoruje, stav srovná fullscreenchange
    const result = document.fullscreenElement != null ? document.exitFullscreen?.() : document.documentElement.requestFullscreen()
    result?.catch(() => {})
  }, [])

  return { supported, active, toggle }
}
```

```tsx
// src/app/BookControls.tsx
import type { ReactNode } from 'react'
import { useFullscreen } from './useFullscreen'

interface Props {
  onHome: () => void
  /** Další ovládací prvky (lupa hledání), vykreslí se za tlačítky. */
  children?: ReactNode
}

/** Pevné ovládání v rohu knihy, mimo stránky (viditelné z každé strany): domů, celá obrazovka, hledání. */
export function BookControls({ onHome, children }: Props) {
  const fullscreen = useFullscreen()
  return (
    <nav className="book-controls" aria-label="Ovládání knihy">
      <button type="button" className="book-control" aria-label="Domů" title="Domů – na obálku" onClick={onHome}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10v10h5v-6h3v6h5V10" />
        </svg>
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

`src/pages/SearchOverlay.tsx`: tlačítku lupy změnit `className="search-opener"` na `className="book-control search-opener"`.

`src/App.tsx`: import `import { BookControls } from '@/app/BookControls'` a řádek `<SearchOverlay … />` nahradit:

```tsx
      <BookControls onHome={() => navigate({ kind: 'cover' })}>
        <SearchOverlay recipes={recipes} ingredients={ingredients} onNavigate={navigate} />
      </BookControls>
```

`src/styles/paper.css` v sekci „vyhledávání“ nahradit pravidla `.search-opener { … }` a `.search-opener:focus-visible { … }`:

```css
/* pevné ovládání knihy (domů, celá obrazovka, lupa) – mimo stránky, vždy viditelné */
.book-controls { position: fixed; top: 0.6rem; right: 0.6rem; z-index: 20; display: flex; gap: 0.4rem; }
.book-control {
  width: 2.4rem; height: 2.4rem; display: grid; place-items: center; padding: 0; cursor: pointer;
  color: var(--paper); background: var(--cover-dark); border: 1px solid var(--paper-edge); border-radius: 50%;
}
.book-control:focus-visible { outline: 2px solid var(--paper); outline-offset: 2px; }
.book-control[aria-pressed="true"] { background: var(--cover); }
```

(`.search-overlay` je `position: fixed` se `z-index: 30` uvnitř `.book-controls` – překryje knihu, protože `.book-controls` má `z-index: 20` nad knihou.)

- [ ] **Step 5: Test „Domů“ v App**

Do `src/App.test.tsx` přidat:

```tsx
test('tlačítko Domů vrátí na obálku a zapíše krok do historie', () => {
  history.replaceState(null, '', '#/recept/hovezi-gulas')
  render(<App />)
  const push = vi.spyOn(history, 'pushState')
  fireEvent.click(screen.getByRole('button', { name: 'Domů' }))
  expect(push).toHaveBeenCalledWith(null, '', '#/')
  expect(screen.getByRole('heading', { name: /Kuchařka pro tábory/ })).toBeInTheDocument()
  push.mockRestore()
})
```

Run: `npm test && npm run build && npm run lint`
Expected: PASS (i `SearchOverlay.test.tsx` – lupa má dál jméno „Hledat“)

- [ ] **Step 6: Commit**

```bash
git add src/app/route.ts src/app/route.test.ts src/app/useHashRoute.test.tsx src/app/useFullscreen.ts src/app/BookControls.tsx src/app/BookControls.test.tsx src/pages/SearchOverlay.tsx src/App.tsx src/App.test.tsx src/styles/paper.css
git commit -m "feat(app): tlačítka Domů a Celá obrazovka vedle lupy, rezervovaná routa #/kosik"
```

### Task 8: Listování vodorovným scrollem (trackpad, kolečko)

**Files:**
- Create: `src/book/wheel.ts`, `src/book/wheel.test.ts`
- Modify: `src/book/Book.tsx`, `src/book/Book.test.tsx`, `src/styles/global.css`

**Interfaces:**
- Consumes: `goNext`/`goPrev` v `Book` (animované otočení; během otáčení nedělají nic).
- Produces:
```ts
export const WHEEL_THRESHOLD_PX = 40
export const WHEEL_GESTURE_GAP_MS = 400
export interface WheelGesture { lastT: number; accX: number; fired: boolean }
export interface WheelSample { deltaX: number; deltaY: number; deltaMode: number; t: number }
export function stepWheel(gesture: WheelGesture | null, sample: WheelSample): { gesture: WheelGesture; fire: FlipDirection | null; horizontal: boolean }
export function inHorizontalScroller(target: EventTarget | null, boundary: Element): boolean
```
Posluchač `wheel` je nativní (`{ passive: false }`) na kořeni `.book`; vodorovné gesto volá `preventDefault()` (jinak Chrome na macOS spustí gesto zpět/vpřed).

- [ ] **Step 1: Failing testy čisté logiky**

```ts
// src/book/wheel.test.ts
import { WHEEL_GESTURE_GAP_MS, WHEEL_THRESHOLD_PX, inHorizontalScroller, stepWheel, type WheelGesture } from './wheel'

/** Přehraje vzorky [deltaX, deltaY, t, deltaMode?] a vrátí směry otočení. */
function run(samples: [number, number, number, number?][]): string[] {
  let g: WheelGesture | null = null
  const fired: string[] = []
  for (const [deltaX, deltaY, t, deltaMode = 0] of samples) {
    const r = stepWheel(g, { deltaX, deltaY, deltaMode, t })
    g = r.gesture
    if (r.fire) fired.push(r.fire)
  }
  return fired
}

test('konstanty', () => {
  expect(WHEEL_THRESHOLD_PX).toBe(40)
  expect(WHEEL_GESTURE_GAP_MS).toBe(400)
})

test('malé delty se sčítají do prahu a jedno gesto otočí jen jednou', () => {
  expect(run([[15, 0, 0], [15, 0, 16], [15, 0, 32], [30, 0, 48], [30, 0, 64]])).toEqual(['next'])
})

test('záporné deltaX = předchozí strana', () => {
  expect(run([[-50, 0, 0]])).toEqual(['prev'])
})

test('pod prahem se neotáčí', () => {
  expect(run([[10, 0, 0], [10, 0, 16]])).toEqual([])
})

test('pauza delší než 400 ms začne nové gesto', () => {
  expect(run([[50, 0, 0], [50, 0, 300], [50, 0, 701]])).toEqual(['next', 'next'])
})

test('převážně svislý scroll se nepočítá', () => {
  expect(run([[30, 60, 0], [30, 60, 16]])).toEqual([])
  expect(stepWheel(null, { deltaX: 5, deltaY: 1, deltaMode: 0, t: 0 }).horizontal).toBe(true)
  expect(stepWheel(null, { deltaX: 1, deltaY: 5, deltaMode: 0, t: 0 }).horizontal).toBe(false)
})

test('deltaMode 1 (řádky, Firefox) se převádí na px', () => {
  expect(run([[3, 0, 0, 1]])).toEqual(['next'])
})

test('inHorizontalScroller: jen prvek s overflow-x auto/scroll a skutečným přetečením', () => {
  const boundary = document.createElement('div')
  const scroller = document.createElement('div')
  const inner = document.createElement('span')
  scroller.style.overflowX = 'auto'
  scroller.append(inner)
  boundary.append(scroller)
  document.body.append(boundary)
  Object.defineProperty(scroller, 'clientWidth', { configurable: true, value: 300 })
  Object.defineProperty(scroller, 'scrollWidth', { configurable: true, value: 300 })
  expect(inHorizontalScroller(inner, boundary)).toBe(false)
  Object.defineProperty(scroller, 'scrollWidth', { configurable: true, value: 600 })
  expect(inHorizontalScroller(inner, boundary)).toBe(true)
  scroller.style.overflowX = 'hidden'
  expect(inHorizontalScroller(inner, boundary)).toBe(false)
  expect(inHorizontalScroller(null, boundary)).toBe(false)
  boundary.remove()
})
```

Run: `npx vitest run src/book/wheel.test.ts`
Expected: FAIL (modul neexistuje)

- [ ] **Step 2: Implementace logiky**

```ts
// src/book/wheel.ts
import type { FlipDirection } from './flip'

/** Akumulovaný vodorovný posun, od kterého gesto otočí stránku. */
export const WHEEL_THRESHOLD_PX = 40
/** Pauza bez událostí, po které začíná nové gesto (debounce). */
export const WHEEL_GESTURE_GAP_MS = 400

const LINE_PX = 16
const PAGE_PX = 800

export interface WheelGesture {
  lastT: number
  accX: number
  fired: boolean
}

export interface WheelSample {
  deltaX: number
  deltaY: number
  /** WheelEvent.deltaMode: 0 = px, 1 = řádky, 2 = stránky. */
  deltaMode: number
  t: number
}

/**
 * Jeden krok gesta vodorovného scrollu: sčítá deltaX, po překročení prahu otočí právě jednou;
 * dobíhající setrvačnost (momentum) stejného gesta už neotáčí. Převážně svislé události gesto jen prodlouží.
 */
export function stepWheel(
  gesture: WheelGesture | null,
  s: WheelSample,
): { gesture: WheelGesture; fire: FlipDirection | null; horizontal: boolean } {
  const scale = s.deltaMode === 1 ? LINE_PX : s.deltaMode === 2 ? PAGE_PX : 1
  const dx = s.deltaX * scale
  const dy = s.deltaY * scale
  const fresh = gesture === null || s.t - gesture.lastT > WHEEL_GESTURE_GAP_MS
  const base: WheelGesture = fresh ? { lastT: s.t, accX: 0, fired: false } : { ...gesture, lastT: s.t }
  const horizontal = Math.abs(dx) > Math.abs(dy)
  if (!horizontal) return { gesture: base, fire: null, horizontal }
  const accX = base.accX + dx
  if (!base.fired && Math.abs(accX) >= WHEEL_THRESHOLD_PX) {
    return { gesture: { ...base, accX, fired: true }, fire: accX > 0 ? 'next' : 'prev', horizontal }
  }
  return { gesture: { ...base, accX }, fire: null, horizontal }
}

/** Je cíl uvnitř prvku, který sám vodorovně scrolluje (např. široká tabulka)? Pak gesto patří jemu. */
export function inHorizontalScroller(target: EventTarget | null, boundary: Element): boolean {
  let el = target instanceof Element ? target : null
  while (el && el !== boundary) {
    if (el instanceof HTMLElement) {
      const overflowX = getComputedStyle(el).overflowX
      if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1) return true
    }
    el = el.parentElement
  }
  return false
}
```

Run: `npx vitest run src/book/wheel.test.ts`
Expected: PASS

- [ ] **Step 3: Failing testy v `Book`**

Do `src/book/Book.test.tsx` přidat:

```tsx
describe('listování vodorovným scrollem', () => {
  let now = 0
  beforeEach(() => {
    now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
  })
  afterEach(() => vi.restoreAllMocks())
  const wheel = (el: Element, deltaX: number, deltaY = 0, at = now, init: WheelEventInit = {}) => {
    now = at
    fireEvent.wheel(el, { deltaX, deltaY, ...init })
  }

  test('vodorovné gesto otočí právě o jednu dvoustranu', () => {
    const onIndexChange = vi.fn()
    const { container } = render(<Book pages={pages} onIndexChange={onIndexChange} />)
    const spread = container.querySelector('.book__spread')!
    for (let i = 0; i < 6; i++) wheel(spread, 20, 0, i * 16)
    expect(onIndexChange).toHaveBeenCalledTimes(1)
    expect(onIndexChange).toHaveBeenCalledWith(1)
  })

  test('nové gesto po pauze otočí znovu, záporné deltaX vrací', () => {
    const onIndexChange = vi.fn()
    const { container } = render(<Book pages={pages} onIndexChange={onIndexChange} />)
    const spread = container.querySelector('.book__spread')!
    wheel(spread, 60, 0, 0)
    wheel(spread, 60, 0, 100)
    wheel(spread, 60, 0, 600)
    wheel(spread, -60, 0, 1200)
    expect(onIndexChange.mock.calls.map((c) => c[0])).toEqual([1, 3, 1])
  })

  test('svislý scroll ani pinch zoom (ctrlKey) neotáčí', () => {
    const onIndexChange = vi.fn()
    const { container } = render(<Book pages={pages} onIndexChange={onIndexChange} />)
    const spread = container.querySelector('.book__spread')!
    wheel(spread, 10, 80, 0)
    wheel(spread, 80, 0, 1000, { ctrlKey: true })
    expect(onIndexChange).not.toHaveBeenCalled()
  })

  test('uvnitř vodorovně scrollujícího obsahu (široká tabulka) neotáčí', () => {
    const onIndexChange = vi.fn()
    const wide: BookPageDef[] = [{ id: 'w', render: () => <div data-testid="wide" style={{ overflowX: 'auto' }}>tabulka</div> }, ...pages.slice(1)]
    render(<Book pages={wide} onIndexChange={onIndexChange} />)
    const el = screen.getByTestId('wide')
    Object.defineProperty(el, 'scrollWidth', { configurable: true, value: 600 })
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: 300 })
    wheel(el, 80, 0, 0)
    expect(onIndexChange).not.toHaveBeenCalled()
  })

  test('při otevřeném dialogu (hledání) neotáčí', () => {
    const onIndexChange = vi.fn()
    const { container } = render(<><div role="dialog" aria-label="Hledání" /><Book pages={pages} onIndexChange={onIndexChange} /></>)
    wheel(container.querySelector('.book__spread')!, 80, 0, 0)
    expect(onIndexChange).not.toHaveBeenCalled()
  })

  test('vodorovné gesto zruší výchozí akci (gesto zpět v prohlížeči), svislé ne', () => {
    const { container } = render(<Book pages={pages} />)
    const spread = container.querySelector('.book__spread')!
    const horizontal = new WheelEvent('wheel', { deltaX: 80, bubbles: true, cancelable: true })
    spread.dispatchEvent(horizontal)
    expect(horizontal.defaultPrevented).toBe(true)
    now = 2000
    const vertical = new WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true })
    spread.dispatchEvent(vertical)
    expect(vertical.defaultPrevented).toBe(false)
  })
})
```

Run: `npx vitest run src/book/Book.test.tsx`
Expected: FAIL (wheel nic nedělá)

- [ ] **Step 4: Implementace v `Book`**

`src/book/Book.tsx`:
- import `import { inHorizontalScroller, stepWheel, type WheelGesture } from './wheel'`;
- pod `const containerRef = …` přidat `const rootRef = useRef<HTMLDivElement>(null)` a `const wheelGesture = useRef<WheelGesture | null>(null)`;
- za efekt s `keydown` přidat:

```tsx
  // vodorovný scroll trackpadu/kolečka listuje: jedno otočení na gesto (práh + debounce v wheel.ts)
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return // pinch zoom
      if (document.querySelector('[role="dialog"]')) return
      if (inHorizontalScroller(e.target, root)) return
      const { gesture, fire, horizontal } = stepWheel(wheelGesture.current, {
        deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode, t: performance.now(),
      })
      wheelGesture.current = gesture
      if (horizontal) e.preventDefault() // jinak Chrome na macOS přejde zpět/vpřed v historii
      if (fire === 'next') goNext()
      if (fire === 'prev') goPrev()
    }
    root.addEventListener('wheel', onWheel, { passive: false })
    return () => root.removeEventListener('wheel', onWheel)
  }, [goNext, goPrev])
```

- kořen: `<div className={`book book--${mode}`} ref={rootRef}>`.

`src/styles/global.css` – za řádek `html, body, #root { … }` přidat:

```css
html, body { overscroll-behavior-x: none; }  /* vodorovný scroll listuje knihou, ne historií prohlížeče */
```

- [ ] **Step 5: Vše zelené**

Run: `npm test && npm run build && npm run lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/book/wheel.ts src/book/wheel.test.ts src/book/Book.tsx src/book/Book.test.tsx src/styles/global.css
git commit -m "feat(book): listování vodorovným scrollem trackpadu a kolečka"
```

### Task 9: Zjevný scroll stránky, tisk celého obsahu, stín knihy na stole

**Files:**
- Create: `src/book/useOverflowHint.ts`, `src/book/useOverflowHint.test.ts`, `src/styles/print.css`, `src/styles/print.test.ts`, `src/styles/book.test.ts`
- Modify: `src/book/Page.tsx` (celý soubor níže), `src/book/Page.test.tsx`, `src/main.tsx` (import `print.css` jako poslední), `src/styles/paper.css`, `src/styles/book.css`, `src/styles/global.css`

**Interfaces:**
- Produces:
```ts
export const OVERFLOW_EPSILON_PX = 4
export function hasMoreBelow(el: Pick<HTMLElement, 'scrollHeight' | 'scrollTop' | 'clientHeight'>): boolean
export function useOverflowHint(ref: RefObject<HTMLElement | null>): boolean
```
`Page` přidá třídu `page--numbered`, když má číslo stránky, a při přetečení vykreslí `<div class="page-more" aria-hidden="true"><span>pokračuje ↓</span></div>`. Selektor `.page-content:has(+ .page-number)` se nahrazuje `.page--numbered > .page-content` (indikátor leží mezi obsahem a číslem a sourozenecký selektor by se rozbil).

- [ ] **Step 1: Failing testy indikátoru**

```ts
// src/book/useOverflowHint.test.ts
import { OVERFLOW_EPSILON_PX, hasMoreBelow } from './useOverflowHint'

test('hasMoreBelow: zbývá obsah pod spodním okrajem', () => {
  expect(hasMoreBelow({ scrollHeight: 1000, clientHeight: 400, scrollTop: 0 })).toBe(true)
  expect(hasMoreBelow({ scrollHeight: 1000, clientHeight: 400, scrollTop: 600 })).toBe(false)
  // zaokrouhlení subpixelů nesmí nechat indikátor svítit na konci
  expect(hasMoreBelow({ scrollHeight: 1000, clientHeight: 400, scrollTop: 600 - OVERFLOW_EPSILON_PX })).toBe(false)
  expect(hasMoreBelow({ scrollHeight: 400, clientHeight: 400, scrollTop: 0 })).toBe(false)
})
```

Do `src/book/Page.test.tsx` přidat (import `fireEvent` z `@testing-library/react`):

```tsx
test('stránka s číslem má třídu page--numbered', () => {
  const { container, rerender } = render(<Page side="left" pageNumber={3}>x</Page>)
  expect(container.querySelector('.page')).toHaveClass('page--numbered')
  rerender(<Page side="left">x</Page>)
  expect(container.querySelector('.page')).not.toHaveClass('page--numbered')
})

describe('indikátor „pokračuje ↓“', () => {
  const keys = ['scrollHeight', 'clientHeight', 'scrollTop'] as const
  let metrics: Record<(typeof keys)[number], number> = { scrollHeight: 0, clientHeight: 0, scrollTop: 0 }
  beforeEach(() => {
    for (const key of keys) {
      Object.defineProperty(HTMLElement.prototype, key, {
        configurable: true,
        get: () => metrics[key],
        set: (v: number) => { metrics[key] = v },
      })
    }
  })
  afterEach(() => {
    for (const key of keys) delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key]
  })

  test('přetékající obsah ukáže indikátor, po doscrollování zmizí', () => {
    metrics = { scrollHeight: 1000, clientHeight: 400, scrollTop: 0 }
    const { container } = render(<Page side="left" pageNumber={5}>dlouhý obsah</Page>)
    expect(screen.getByText('pokračuje ↓').closest('.page-more')).toHaveAttribute('aria-hidden', 'true')
    metrics.scrollTop = 600
    fireEvent.scroll(container.querySelector('.page-content')!)
    expect(screen.queryByText('pokračuje ↓')).toBeNull()
  })

  test('obsah, který se vejde, indikátor nemá', () => {
    metrics = { scrollHeight: 400, clientHeight: 400, scrollTop: 0 }
    render(<Page side="left">krátký</Page>)
    expect(screen.queryByText('pokračuje ↓')).toBeNull()
  })
})
```

Run: `npx vitest run src/book/useOverflowHint.test.ts src/book/Page.test.tsx`
Expected: FAIL (modul neexistuje, třída `page--numbered` chybí)

- [ ] **Step 2: Implementace indikátoru**

```ts
// src/book/useOverflowHint.ts
import { useCallback, useEffect, useState, type RefObject } from 'react'

/** Tolerance subpixelového zaokrouhlení na konci scrollu. */
export const OVERFLOW_EPSILON_PX = 4

export function hasMoreBelow(el: Pick<HTMLElement, 'scrollHeight' | 'scrollTop' | 'clientHeight'>): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight > OVERFLOW_EPSILON_PX
}

/** Sleduje, zda scrollující prvek skrývá obsah pod spodním okrajem (scroll, změna velikosti, nový obsah). */
export function useOverflowHint(ref: RefObject<HTMLElement | null>): boolean {
  const [more, setMore] = useState(false)
  const update = useCallback(() => {
    const el = ref.current
    if (el) setMore(hasMoreBelow(el))
  }, [ref])

  // po každém renderu: obsah stránky se mohl změnit (filtr obsahu, jiný recept)
  useEffect(update)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.addEventListener('scroll', update, { passive: true })
    // načtení fontů nebo změna okna mění výšku bez renderu
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    ro?.observe(el)
    if (el.firstElementChild) ro?.observe(el.firstElementChild)
    return () => {
      el.removeEventListener('scroll', update)
      ro?.disconnect()
    }
  }, [ref, update])

  return more
}
```

```tsx
// src/book/Page.tsx
import { useRef, type ReactNode } from 'react'
import { useOverflowHint } from './useOverflowHint'

export type PageSide = 'left' | 'right' | 'single'
export type PageTone = 'aged' | 'cover' | 'note'

interface PageProps {
  side: PageSide
  tone?: PageTone
  pageNumber?: number
  className?: string
  children?: ReactNode
}

export function Page({ side, tone = 'aged', pageNumber, className, children }: PageProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const more = useOverflowHint(contentRef)
  const numbered = pageNumber !== undefined
  return (
    <section className={`page page--${side} page--${tone}${numbered ? ' page--numbered' : ''}${className ? ` ${className}` : ''}`}>
      <div className="page-content" ref={contentRef}>{children}</div>
      {/* zjevný scroll: přechod do ztracena + „pokračuje ↓“, dokud zbývá obsah pod okrajem */}
      {more && (
        <div className="page-more" aria-hidden="true">
          <span>pokračuje ↓</span>
        </div>
      )}
      {numbered && <span className="page-number">{pageNumber}</span>}
      {/* úchyt pro otáčení na vnějším okraji stránky (obsah stránky zůstává nativní) */}
      {side !== 'right' && <div className="page-edge page-edge--left" />}
      {side !== 'left' && <div className="page-edge page-edge--right" />}
    </section>
  )
}
```

`src/styles/paper.css`: selektor `.page-content:has(+ .page-number)` přejmenovat na `.page--numbered > .page-content` (tělo pravidla beze změny) a za pravidlo `.page-number { … }` přidat:

```css
/* zjevný scroll: obsah pod spodním okrajem se ztrácí do papíru */
.page-more {
  position: absolute; left: 0; right: 0; bottom: 0; height: 3.2rem; z-index: 1;
  display: flex; align-items: flex-end; justify-content: center; padding-bottom: 0.3rem;
  pointer-events: none;  /* scroll i klik projdou na obsah */
  background: linear-gradient(to bottom, transparent, var(--paper) 80%);
}
.page--numbered > .page-more { bottom: 2.4rem; }
.page-more span { font-family: var(--font-typewriter); font-size: 0.75rem; color: var(--ink-soft); }
```

Run: `npx vitest run src/book`
Expected: PASS

- [ ] **Step 3: Failing testy tisku a stínu**

```ts
// src/styles/print.test.ts
/// <reference types="node" />
import { readFileSync } from 'node:fs'

// vitest má css: false → CSS čteme jako text
const css = readFileSync('src/styles/print.css', 'utf8')
const main = readFileSync('src/main.tsx', 'utf8')
const print = css.slice(css.indexOf('@media print'))

test('print.css je importovaný jako poslední styl', () => {
  const imports = [...main.matchAll(/import '\.\/styles\/([\w-]+)\.css'/g)].map((m) => m[1])
  expect(imports.at(-1)).toBe('print')
})

test('v tisku se obsah stránky neořezává (celý recept)', () => {
  expect(print).toMatch(/\.page-content[^{]*\{[^}]*overflow:\s*visible/)
  expect(print).toMatch(/\.page-content[^{]*\{[^}]*height:\s*auto/)
  expect(print).toMatch(/\.book__slot[^{]*\{[^}]*overflow:\s*visible/)
  expect(print).toMatch(/\.page\s*\{[^}]*overflow:\s*visible/)
})

test('v tisku se skryjí ovládací prvky a indikátor pokračování', () => {
  for (const sel of ['.book-controls', '.book__nav', '.page-more', '.page-edge']) expect(print).toContain(sel)
})
```

```ts
// src/styles/book.test.ts
/// <reference types="node" />
import { readFileSync } from 'node:fs'

const css = readFileSync('src/styles/book.css', 'utf8')
const body = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}
const layers = (decl: string) => (decl.match(/box-shadow:([^;]*);/)?.[1] ?? '').split(/,(?![^(]*\))/).length

test('kniha leží na stole: vrstvený stín pod knihou (desky + kontakt + měkký stín)', () => {
  expect(layers(body('.book__spread'))).toBeGreaterThanOrEqual(4)
})

test('na mobilu je stín menší (vlastní pravidlo)', () => {
  expect(layers(body('.book--single .book__spread'))).toBeGreaterThanOrEqual(3)
})
```

Run: `npx vitest run src/styles`
Expected: FAIL (`print.css` neexistuje; stín má 2 vrstvy, mobil žádný)

- [ ] **Step 4: Implementace tisku a stínu**

```css
/* src/styles/print.css – Ctrl+P: celý obsah viditelných stránek, bez knižních efektů.
   Čistý A4 recept s přepočtem a tlačítko tisku jsou fáze 6. */
@page { margin: 15mm; }

@media print {
  html, body, #root, main { height: auto !important; background: #fff !important; }
  .book-controls, .book__nav, .page-edge, .page-more, .page-number, .search-overlay { display: none !important; }
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

`src/main.tsx`: za `import './styles/themes.css'` přidat `import './styles/print.css'` (musí být poslední import stylu).

`src/styles/book.css`: v pravidle `.book__spread` nahradit řádek `box-shadow: …` za:

```css
  /* kniha leží na stole: desky, kontaktní stín u stolu, měkký stín pod knihou */
  box-shadow:
    0 0 0 6px var(--cover-dark),
    0 3px 4px 6px rgba(0, 0, 0, 0.35),
    0 22px 30px -6px rgba(0, 0, 0, 0.45),
    0 48px 80px -24px rgba(0, 0, 0, 0.55);
```

a do pravidla `.book--single .book__spread { … }` přidat:

```css
  box-shadow:
    0 0 0 4px var(--cover-dark),
    0 2px 3px 4px rgba(0, 0, 0, 0.35),
    0 14px 20px -6px rgba(0, 0, 0, 0.45);
```

`src/styles/global.css`: `body { background: #2b2420; … }` změnit na `body { background: radial-gradient(ellipse at 50% 40%, #4a3b30 0%, #2b2420 75%) #2b2420; font-family: var(--font-body); color: #2a2118; }` (světlejší „stůl“ pod lampou, aby byl stín knihy vidět).

- [ ] **Step 5: Vše zelené**

Run: `grep -rn "has(+ .page-number)" src; npm test && npm run build && npm run lint`
Expected: grep nic; PASS

- [ ] **Step 6: Commit**

```bash
git add src/book/useOverflowHint.ts src/book/useOverflowHint.test.ts src/book/Page.tsx src/book/Page.test.tsx src/styles/print.css src/styles/print.test.ts src/styles/book.test.ts src/styles/book.css src/styles/paper.css src/styles/global.css src/main.tsx
git commit -m "feat(book): zjevný scroll stránky, tisk celého obsahu, stín knihy na stole"
```

### Task 10: Ruční kontrola v prohlížeči (agent-browser) a opravy nálezů

**Files:** podle nálezů; zápis do tohoto plánu pod „Nálezy z ruční kontroly“ (na konci souboru).

Implementátor použije skill `agent-browser` (nejdřív `agent-browser skills get core`). Vlastní dev server `npm run dev -- --port <volný port> --strictPort` na pozadí, po skončení zastavit (`agent-browser close`, ukončit vite). Interakce vždy reálným vstupem (`agent-browser click`, `mouse move/down/up/wheel`, `press`), ne syntetickými událostmi přes `eval` – syntetické události obcházejí hit-testing. Tab na pozadí má pozastavený `requestAnimationFrame`: pro klik/klávesy/kolečko zapnout `agent-browser set media light reduced-motion` (otočení proběhne hned), průběh animace ověřit screenshotem. Screenshoty a PDF do scratchpadu (`…/scratchpad/t10/`). Viewporty: desktop `set viewport 1390 800`, mobil `set viewport 390 844` a `set viewport 320 568`.

- [ ] **Step 1: Recept jako dvoustrana (bod 1)** – desktop `#/recept/chilli-con-carne`: vlevo název, původní název, „Kniha … 2003“, čas, obtížnost, vybavení, alergeny, srdíčko + hrnec, tabulka surovin; vpravo „Postup“, kroky, poznámka k modernizaci, patička strojopisem; žádné pilulky štítků (`eval "document.querySelectorAll('.pill, .recipe-labels').length"` → 0). Mobil 390: `#/recept/chilli-con-carne` ukáže levou stranu, `press ArrowRight` pravou (postup), hash zůstává `#/recept/chilli-con-carne`; reload na pravé straně otevře levou.

- [ ] **Step 2: Zjevný scroll a tisk (bod 1)** – mobil 390 `#/recept/zeleninove-kari-s-ryzi` (20 surovin): na levé straně je vidět přechod do ztracena a „pokračuje ↓“; po `eval "document.querySelector('.book__slot .page-content').scrollTo(0, 1e6)"` + `wait 200` indikátor zmizí (a `mouse wheel 400` nad stránkou obsah skutečně scrolluje). Pravá strana `#/recept/kolace` (nejdelší postup) totéž. Tisk: desktop `#/recept/kolace` → `agent-browser pdf …/t10/kolace.pdf`, `pdftotext …/t10/kolace.pdf - | grep -c .` a ověřit, že PDF obsahuje první surovinu i **poslední krok** receptu (text z `data/recipes/kolace.json` `steps.at(-1)`), že v PDF nejsou tlačítka (Domů, Hledat, ‹ ›) ani „pokračuje ↓“. Totéž pro `#/recept/zeleninove-kari-s-ryzi` (poslední krok „Podávej kari přes rýži.“).

- [ ] **Step 3: Poznámky pryč, starý stav (bod 2)** – na receptu není žádné `textarea` ani tužka. `eval "localStorage.setItem('kucharka.userState.v1', JSON.stringify({version:1,favorites:['chilli-con-carne'],notes:{'chilli-con-carne':'x'}}))"`, `reload`: srdíčko u chilli je stisknuté; po přepnutí hrnce a 400 ms `eval "localStorage.getItem('kucharka.userState.v1')"` neobsahuje `notes` a obsahuje `"cooked":["chilli-con-carne"]`.

- [ ] **Step 4: Srdíčko a hrnec (bod 3)** – klik na srdíčko a hrnec na receptu (`click` na `[aria-label="Oblíbené"]`, `[aria-label="Uvařeno"]`) → v obsahu (`#/obsah`) jsou u řádku obě ikony vyplněné. Hit-testing u řádků na **pravé** stránce obsahu (u vnějšího okraje je úchyt `.page-edge`): pro tlačítka `.book__slot--right .mark` ověřit `eval` s `document.elementFromPoint(stred.x, stred.y).closest('.mark') === tlačítko`, pak skutečný `click` přepne `aria-pressed` a neotočí stránku. Na mobilu 390 tapnutí na srdíčko v řádku obsahu nesmí otevřít recept.

- [ ] **Step 5: Filtry (bod 4)** – pilulky: levné, rychlé, historické, táborové, do kotlíku, připravit předem; žádné „bez masa“ ani „sladké“. „rychlé“ → všechny zobrazené recepty mají čas ≤ 45 min (proklik na 2–3 recepty); „historické“ → žádný recept z AFRS 2003; vybavení „kotlík“; zdroj „Italian 1919“; „Jen oblíbené“ a „Jen uvařené“ (prázdný stav s nápovědou, pak s označeným receptem); kombinace filtrů je průnik.

- [ ] **Step 6: Obsah bez ořezu a proklik (bod 5)** – pro 1390×800 a 390×844 projít všechny stránky obsahu (od `#/obsah` šipkou vpravo) a na každé změřit `eval "[...document.querySelectorAll('.book__slot .toc-page')].map(t => { const c = t.closest('.page-content'); return c.scrollHeight - c.clientHeight })"` → všechny hodnoty ≤ 0. Při 320×568 hodnoty zapsat (přetečení je přípustné jen s viditelným „pokračuje ↓“). Pokud na 1390×800 nebo 390×844 něco přeteče, snížit `TOC_PAGE_UNITS`/`TOC_FIRST_PAGE_UNITS`/`TOC_LONG_TITLE_CHARS` v `src/content/search.ts`, upravit komentář s měřením a zopakovat. Z **každé** stránky obsahu (desktop i 390) kliknout na první a poslední řádek → hash `#/recept/<id>`, vlevo (mobil: aktuální stránka) je `h2` s názvem receptu; `back` vrátí na obsah.

- [ ] **Step 7: Ovládání (bod 6)** – tlačítka Domů, Celá obrazovka, Hledat jsou vedle sebe vpravo nahoře na každé stránce (obal, obsah, recept, seznam) a nepřekrývají knihu při 1390×800, 390×844 ani 320×568 (`get box` tlačítek vs. `.book__spread`). Domů z receptu → obal, `back` → recept. Celá obrazovka: klik → `eval "!!document.fullscreenElement"` true a `aria-pressed="true"`, druhý klik / Escape → false (pokud headless prohlížeč fullscreen odmítne, zapsat jako omezení prostředí; tlačítko nesmí spadnout ani nechat chybu v konzoli). Přístupná jména ověřit ve `snapshot`.

- [ ] **Step 8: Listování kolečkem (bod 7)** – desktop, `mouse move` doprostřed knihy, `mouse wheel 0 120` (dy 0, dx 120) → otočí právě o jednu dvoustranu; `mouse wheel 0 -120` po pauze → zpět. Svislé `mouse wheel 300 0` nad dlouhým receptem scrolluje obsah stránky a neotáčí. Nad hledáním (otevřený dialog) kolečko neotáčí. Mobil 320 `#/recept/zeleninove-kari-s-ryzi`: pokud tabulka surovin vodorovně přetéká, `mouse wheel 0 120` nad ní neotočí stránku.

- [ ] **Step 9: Stín a šířka (bod 8)** – screenshot 1390×800 a 390×844: kniha má jemný stín „na stole“, na mobilu menší a neořízne se. Pro každou routu (`#/`, `#/obsah`, `#/kapitola/polevky`, `#/recept/chilli-con-carne`, `#/seznam`, `#/nastaveni`) při 390 a 320: `eval "document.documentElement.scrollWidth === window.innerWidth"` → `true`.

- [ ] **Step 10: Opravy a zápis** – každý nález opravit s testem tam, kde to jde (CSS-only opravy ověřit screenshotem), a zapsat pod „Nálezy z ruční kontroly“ ve formátu z plánu fáze 4 (číslo, popis, soubor, oprava, test/ověření). Nic neodkládat bez zápisu důvodu. Nakonec `npm test && npm run build && npm run lint && npm run validate`.

- [ ] **Step 11: Commit**

```bash
git add <změněné soubory> docs/superpowers/plans/2026-10-15-phase4b-ux-revision.md
git commit -m "fix(ui): nálezy z ruční kontroly fáze 4b"
```

## Pokrytí specu (self-review)

| Bod [R1] fáze 4b | Task |
|---|---|
| Recept = dvoustrana, levá/pravá náplň, bez štítků, mobil dvě stránky | 3 (+ srdíčko/hrnec 4) |
| Scroll uvnitř stránky zjevný (fade + „pokračuje ↓“), Ctrl+P tiskne celý recept | 9, ověření 10 |
| Poznámky zrušeny, `notes` pryč ze stavu, starý stav se tiše načte | 2 |
| `cooked` v `UserState` + `toggleCooked` | 2 |
| Srdíčko (viditelné tlačítko, ne oslí ucho) + hrnec na receptu; obojí v obsahu + filtry | 4, 5 |
| Filtry jen v obsahu: `levne`, `rychle`, `historicke`, `tabor`, `kotlik`, `pripravit-predem`, vybavení, kniha, oblíbené, uvařené; bez `bez-masa`/`sladke` | 1, 5 |
| `rychle` = `timeMinutes ≤ 45`, `historicke` = rok < 1950, validátor hlásí nesedící ruční `rychle` | 1 |
| Obsah bez ořezu při 1390×800 a 390 px, více stránek obsahu | 6, měření 10 |
| Lupa + domů + celá obrazovka (Fullscreen API, na iOS skryté) | 7 |
| Hash `#/kosik` | 7 (rezervovaná, stránka ve fázi 5) |
| Listování vodorovným scrollem (debounce, jedno otočení na gesto) | 8 |
| Stín knihy na stole | 9 |
| Ruční kontrola agent-browserem | 10 |

Mimo 4b (fáze 5–6): košík a záložka, přidání do košíku z obsahu/receptu, nutrice, tlačítko tisku na stránce, nápověda k záhlaví prohlížeče, čistý A4 recept s přepočtem, brožurka.

## Nálezy z ruční kontroly

Ruční kontrola agent-browserem (Chrome headless, vlastní dev server, reálný vstup: mouse move/down/up, press; kolečko přes CDP `Input.dispatchMouseEvent` – `agent-browser mouse wheel` posílá událost na souřadnice 0,0 a cíl je `.book`, ne prvek pod kurzorem). Viewporty 1390×800, 390×844, 320×568.

| # | Nález | Soubor | Oprava | Ověření |
|---|---|---|---|---|
| 1 | **Ctrl+P / PDF tiskl jen jednu polovinu receptu** (v tisku je stránka `orientation: portrait`, takže `useViewMode` přepnul na `single` a vykreslil jen levou stranu). Při úzkém okně se navíc obsah ořízl na jednu tištěnou stránku. | `src/book/useViewMode.ts` | Dotaz na režim `single` platí jen pro obrazovku (`screen and …, screen and …`); `beforeprint` synchronně (`flushSync`) vynutí `spread`, `afterprint` / změna média vrátí režim. | Test `Book.test.tsx` (dotaz začíná `screen and`, `beforeprint`/`afterprint`). `agent-browser pdf` `#/recept/kolace` a `…/zeleninove-kari-s-ryzi` při 1390×800, 1390×400, 800×900 i 390×844: 2 stránky, PDF obsahuje první surovinu i poslední krok („Nech vychladnout a podle chuti posyp…“, „Podávej kari přes rýži.“), žádné ovládací prvky ani „pokračuje ↓“. |
| 2 | V tisku zůstávala srdíčko + hrnec (`.recipe-marks`) – interaktivní tlačítka na papíře. | `src/styles/print.css` | `.recipe-marks` přidáno mezi skryté prvky. | `print.test.ts`; screenshot tisku (emulace print media), PDF bez ikon. |
| 3 | Při 320×568 `.book-controls` (spodek 48 px) zasahovaly 6 px do knihy (stránka začínala na 42 px, rámeček na 38 px). | `src/styles/book.css` | `.book--single` má nahoře `padding-top: 3.5rem`; šířka stránky `min(100%, (100dvh − 8.5rem)/1.414)`. Na 390×844 beze změny (stránka začíná 156 px); na 320×568 stránka 306 px široká, začíná 73 px. | `book.test.ts`; `get box`: 320×568 ovládání 10–48 px, kniha od 73 px; 390×844 kniha od 156 px; 320×480 od 74 px; screenshoty `t10/s7-320-after-568.png`. Kapacita obsahu po změně znovu změřena (viz níže). |
| 4 | Pilulka vybavení „kotlík“ vždy vrátí „Nic nenalezeno.“ – žádný z 78 receptů nemá `equipment: kotlik` (tag `kotlik` „do kotlíku“ má 36). | `src/pages/TocPages.tsx` | Panel nabízí jen vybavení, které uvádí aspoň jeden recept (zůstávají trouba, plotna, gril). | 2 testy v `TocPages.test.tsx`. Data (doplnit `equipment: kotlik` k táborovým receptům) jsou rozhodnutí fáze dat – viz odloženo. |

**Odloženo (s důvodem)**

- **D1 – prázdné stránky obsahu při aktivním filtru:** počet stránek obsahu se drží z nefiltrovaného seznamu (`tocPageCount(recipes)`), takže po zúžení filtru následují prázdné stránky obsahu. Je to záměr Tasku 6 (stabilní číslování stránek knihy, hash `#/obsah` nezávislý na filtru); změna by posouvala čísla stran receptů. Neřešeno ve 4b.
- **D2 – návrat „zpět“ z receptu na obsah vrací na první stránku obsahu** (hash `#/obsah` nenese index stránky obsahu, listování používá `replaceState`). Splňuje zadání („back vrátí na obsah“); pamatování stránky obsahu by vyžadovalo `history.state` – kandidát na fázi 5/6.
- **D3 – doplnění `equipment: kotlik` u táborových receptů** (viz nález 4): obsahová změna dat mimo UX revizi.
- **Omezení prostředí:** `agent-browser mouse wheel` neposílá událost na polohu kurzoru (cíl vždy `.book`) – kolečko ověřeno vlastním CDP voláním `Input.dispatchMouseEvent` s explicitními souřadnicemi; gesto „zpět“ v Chromu nelze v headless ověřit reálným swipem, ověřeno `overscroll-behavior-x: none` na `html` i `body` a `defaultPrevented === true` u vodorovných událostí kolečka.

**Naměřeno (obsah bez ořezu, `scrollHeight − clientHeight` na každé stránce obsahu; volné místo pod posledním řádkem v px)**

- 1390×800 (4 dvoustrany): přetečení 0 na všech; volno 381/320, 366/328, 366/366, 343/504.
- 390×844 (8 stránek): přetečení 0 na všech; volno 152, 132, 178, 121, 158, 178, 155, 317.
- 320×568 po nálezu 3 (8 stránek): přetečení 0 na všech; volno 48, 8, 15, 17, 35, 35, 52, 213 (před opravou 59, 19, 26, 28, 46, 46, 62, 224). Řádek s ikonami odhad nepřekračuje.
- 320×480 (extrémně nízké okno, mimo zadání): přetéká (až 275 px) – přípustné jen s viditelným „pokračuje ↓“, který se zobrazuje.
