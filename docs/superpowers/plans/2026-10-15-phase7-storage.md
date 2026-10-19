# Fáze 7: Ukládání – StorageAdapter, domácí Node server, export a import – implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uživatelský stav se ukládá přes `StorageAdapter` – výchozí `LocalStorageAdapter`, a když běží `npm run serve` (Node server na domácí síti), i do souboru `userdata/user-state.json` přes `GET/PUT /api/state`; tiráž ukazuje režim ukládání, umí „Zkusit server znovu“ a export/import zálohy JSON.

**Architecture:** `parseUserState` v `src/state/userState.ts` (jen relativní importy) je jediná validace stavu – používá ji `localStorage`, server i import. `src/state/storage.ts` definuje `StorageAdapter`, `StorageMode` a `LocalStorageAdapter` (synchronní `read/write` pro první vykreslení), `src/state/serverStorage.ts` `FileServerAdapter` (fetch s časovým limitem) a `detectServer()` (`GET /api/health`). `UserStateProvider` čte stav synchronně z lokální cache, asynchronně se připojí přes prop `connect` (App předá `detectServer`), server je zdroj pravdy a každá uložená změna jde do lokální cache i na server (jeden PUT naráz). `scripts/serve.ts` je server na `node:http` bez závislostí: `dist/` + SPA fallback, `/api/health`, `/api/state` s atomickým zápisem. Tiráž dostane panel `StoragePanel` (režim, obnovení serveru, export přes Blob + `<a download>`, import přes `<input type=file>` s potvrzením přepsání).

**Tech Stack:** Vite 8, React 19, TypeScript 6 (`erasableSyntaxOnly` – žádné parameter properties), zod 4, Vitest 4 + Testing Library + user-event (jsdom, `globals: true`, `css: false`), Node 25 (`node:http`, `node:fs/promises`, globální `fetch`), `tsx` (už v devDependencies), oxlint. Bez UI knihovny, **bez nové npm závislosti**. Ruční kontrola skillem `agent-browser` (`download`, `upload`).

**Spec:** `docs/superpowers/specs/2026-10-14-cookbook-design.md` – §5.2 Uživatelský stav (StorageAdapter `load()/save(state)`, `LocalStorageAdapter` výchozí, `FileServerAdapter`: `npm run serve`, `GET/PUT /api/state`, soubor `userdata/user-state.json`, `userdata/` mimo git, auto-detekce přes `GET /api/health`; export/import JSON vždy), §6 (Node server zpřístupní web i na domácí síti pro telefon; build přenositelný), §2 bod 6 (tiráž = nastavení: export/import, režim ukládání), §1 (bez účtů, bez povinného serveru). Navazuje na plán fáze 6 `docs/superpowers/plans/2026-10-15-phase6-print.md` (Global Constraints níže jsou jeho aktualizace).

## Global Constraints

- Čeština s diakritikou v UI, identifikátory anglicky. Bez UI knihovny. **Žádná nová npm závislost** (ani pro server: `node:http`, `node:fs/promises`, `node:os`; spouští se přes `tsx`, který už je v devDependencies).
- **Server je volitelný (spec §1):** aplikace bez serveru (statický build, `npm run dev`, `npm run preview`) funguje dál jen s `localStorage`; detekce serveru nikdy neblokuje první vykreslení a nevyhazuje chybu.
- **Tvar `UserState` beze změny** (`version: 1`, `people`, `dayFactor`, `cart`, `favorites`, `cooked`, `customRecipes`, `settings`), klíč `localStorage` `kucharka.userState.v1` beze změny. Žádné nové pole stavu ve fázi 7.
- **Jediná validace stavu:** `parseUserState(raw: unknown): UserState | null` v `src/state/userState.ts` – `null`, když to není objekt s `version: 1`; jinak tolerantně opravené (po polích, meze, deduplikace košíku). Používá ji `loadUserState`, `FileServerAdapter.load`, server (`PUT`, čtení souboru) i import zálohy.
- `src/state/userState.ts` a `src/domain/**` importují **jen relativně** (bez aliasu `@`) a bez DOM typů – načítá je `tsx` v serveru a kontroluje `tsconfig.scripts.json`.
- **API serveru:** `GET /api/health` → `200 {"ok":true}`; `GET /api/state` → `200` s JSON stavu, nebo `200 null` (soubor chybí/prázdný/poškozený); `PUT /api/state` → `204` (uloží opravený stav z `parseUserState`), `400` neplatný JSON, `413` víc než 1 000 000 bajtů, `422` není stav kuchařky; jiné metody `405` s hlavičkou `Allow`; neznámé `/api/*` `404`. Odpovědi API mají `Cache-Control: no-store`.
- **Soubor dat:** `userdata/user-state.json` (pretty JSON + `\n`), zápis atomicky (dočasný soubor ve stejné složce + `rename`), `userdata/` je v `.gitignore` (už je). Poškozený soubor se před přepsáním zkopíruje na `user-state.json.poskozeny-<ms>`.
- **Server:** `npm run serve` = `tsx scripts/serve.ts`; `PORT` (výchozí **8787**), `HOST` (výchozí **0.0.0.0**); servíruje `dist/` (nebuildí), SPA fallback na `index.html` jen pro cesty bez přípony, správné MIME, žádný přístup mimo `dist/` (path traversal → 400/404), vypíše `http://localhost:PORT` a LAN adresy pro telefon.
- **Časové limity klienta:** detekce `GET /api/health` 1 500 ms (`DETECT_TIMEOUT_MS`), `GET/PUT /api/state` 5 000 ms (`SERVER_TIMEOUT_MS`). Detekce vyžaduje JSON `{"ok":true}` (vite dev vrací na `/api/health` `index.html`).
- **Ukládání:** debounce 300 ms jako dosud, flush na `beforeunload`, `pagehide` a při odmontování; uložená změna jde vždy do lokální cache a v režimu server/nedostupný i na server (`PUT` s `keepalive: true`, nejvýš jeden PUT naráz, čekající se nahradí nejnovějším).
- **Režimy ukládání (`StorageMode`):** `'local'` (jen prohlížeč – bez serveru, i během detekce), `'server'`, `'server-unavailable'` (server byl nalezen, ale načtení/uložení selhalo; ukládá se lokálně). Texty `STORAGE_MODE_LABEL`, `STORAGE_MODE_HINT`, `STORAGE_OFFLINE_BADGE` v `src/pages/labels.ts`.
- **Export/import:** soubor `kucharka-data-YYYY-MM-DD.json` (místní datum) = přesně `UserState` (stejný formát jako soubor serveru); import nejvýš 1 MB, validace `parseUserState`, **přepsání** (ne sloučení) až po potvrzení tlačítkem „Přepsat data“ (bez `window.confirm`, bez modálu).
- Tisk z fáze 6 beze změny; nové prvky (odznak offline) se netisknou. Pořadí stránek, hash routy (`#/nastaveni` = tiráž), záložka a meze stavu beze změny.
- Styl kódu: `src/state/*` se středníky (jako dosud), `src/pages/*`, `src/App.tsx` a `scripts/*` bez středníků. oxlint `react/only-export-components` → funkce mimo komponenty patří do `.ts` souborů (`src/state/backup.ts`, `src/state/storage.ts`, …); konstanty v `.tsx` smějí zůstat. `erasableSyntaxOnly`: žádné `constructor(private x)`, `enum`, `namespace`.
- Přístupnost: tlačítka s viditelným textem, soubor přes `<label>` s viditelným textem, chyby `role="alert"`, potvrzení `role="status"`, panel `<section aria-labelledby>` s `useId()`.
- Mobil: v tiráži žádný vodorovný scroll (`scrollWidth === innerWidth` při 390 i 320 px), tlačítka se zalamují.
- Testy Vitest + Testing Library pro každou čistou funkci, komponentu a server (reálný `createAppServer` na portu 0 v `// @vitest-environment node`, bez buildu – `distDir` je dočasná složka). Po každém tasku `npm test`, `npm run build`, `npm run lint` čisté (Task 10 i `npm run validate`). Commit po každém tasku, zpráva česky s diakritikou, explicitní `git add <soubory>` (nikdy `-A`).

## Review Focus

1. **Server přestane odpovídat uprostřed práce** (telefon ztratí Wi-Fi, počítač se serverem se uspí, `Ctrl+C`) – změny se nesmí ztratit ani po „Zkusit server znovu“: zůstanou v lokální cache, režim se přepne na „server nedostupný“ s odznakem a po obnovení se neodeslané změny nahrají na server, ne přepíšou starším serverovým stavem. Testy: Task 4 („když ukládání na server selže …“), Task 9 (odznak v App).
2. **Ručně upravený, prázdný nebo poškozený `userdata/user-state.json` a cizí JSON při importu** – server nespadne, vrátí `null`, poškozený soubor zazálohuje dřív, než ho klient přepíše; import souboru, který není záloha kuchařky (`{"foo":1}`, pole, jiná verze, ne-JSON, > 1 MB), data nezmění a ukáže srozumitelnou chybu. Testy: Task 1 (`parseUserState` → `null`), Task 6 (poškozený/prázdný soubor, 400/413/422), Task 7 (`parseBackup`), Task 8 (chybové hlášky importu).
3. **Podivné URL na serveru přístupném z celé domácí sítě** – `/../secret`, `/..%2fsecret`, `%2e%2e`, `%00`, neplatné `%E0%A4%A`, chybějící asset `/assets/x.js` (nesmí dostat `index.html` s MIME HTML), `HEAD`, `POST` na statický soubor. Testy: Task 5 (surové požadavky přes `node:http`).
4. **Prostředí bez serveru, které na `/api/health` odpoví něčím jiným nebo vůbec** – `npm run dev` (SPA fallback vrací HTML se stavem 200), statický hosting (404), zavěšené spojení. Detekce musí do 1,5 s skončit lokálním režimem a aplikace se mezitím normálně používá. Testy: Task 3 (HTML, 404, `{ok:false}`, zamrzlý fetch + časový limit), Task 9 (App bez serveru = „jen v tomto prohlížeči“).
5. **Změna těsně před zavřením stránky nebo během připojování k serveru** – `pagehide` do 300 ms po změně musí odeslat i `PUT` (keepalive); kliknutí v prvních ms před načtením serverového stavu nesmí být přepsáno serverem. Testy: Task 3 (`keepalive: true`), Task 4 („pagehide pošle neuloženou změnu i na server“, „změna během připojování vyhrává“).

## Rozhodnutí fáze 7 (rulings)

- **R1 – sdílená validace bez aliasu `@`:** `tsconfig.scripts.json` nemá `paths` a `tsx` alias `@` nezná, proto `src/state/userState.ts` přejde na relativní importy (`../domain/portions`, `../domain/scaling`), místo DOM typu `Storage` používá vlastní `KeyValueReader`/`KeyValueWriter` a přidá se do `include` v `tsconfig.scripts.json`. Server importuje `../src/state/userState` stejně jako `scripts/validate.ts` importuje `../src/domain/schema`.
- **R2 – konflikty: server je zdroj pravdy, lokální kopie je vždy cache.** Každá uložená změna se zapíše do `localStorage` i na server. Při připojení (start, „Zkusit server znovu“, server se objeví po režimu `local`) se použije **serverový stav, pokud existuje, jinak se nahraje lokální**. Dvě upřesnění, aby se neztrácela práce: (a) **neodeslané lokální změny** (uložení na server selhalo v této relaci) mají přednost a nahrají se; (b) **změna během připojování** (uživatel klikl dřív, než přišel serverový stav) má přednost a nahraje se. Mezi zařízeními platí „poslední zápis vyhrává“, bez slučování. Příznak neodeslaných změn je jen v paměti (relace) – změny z offline relace, která skončila zavřením stránky, se při příštím startu se serverem přepíšou serverovým stavem (realisticky nenastává: stránka se při režimu server načítá ze serveru; záloha = export).
- **R3 – první vykreslení synchronně z lokální cache:** `LocalStorageAdapter.read()` je synchronní, takže kniha se nevykreslí s výchozím stavem a neblikne; stávající testy provideru zůstanou beze změny. Rozhraní `StorageAdapter.load/save` je asynchronní (spec `load()/save(state)`), `LocalStorageAdapter` ho implementuje také (pro úplnost a testy).
- **R4 – provider přijímá „připojovač“, ne hotový adaptér:** `UserStateProvider` má prop `connect?: () => Promise<StorageAdapter | null>`; `App` předá `detectServer`. Bez `connect` (testy, případné vložení jinam) běží jen lokálně. „Zkusit server znovu“ znovu použije známý adaptér, nebo znovu zavolá `connect`.
- **R5 – žádné periodické dotazování serveru:** nedostupnost se zjistí při chybě `load`/`save`; obnovení nastane tlačítkem „Zkusit server znovu“ nebo při další úspěšné změně (každá změna v režimu nedostupný zkusí `PUT`).
- **R6 – server ukládá opravený stav, ne surový vstup:** `PUT` projde `parseUserState`, do souboru jde výsledek (neznámá pole zahozena, meze upnuté). `GET` bez souboru vrací `200 null` (ne 404 – klient pak nahraje lokální stav, viz R2). Server **nemá autentizaci** (domácí síť, spec „bez účtů“); limit těla 1 MB.
- **R7 – statické soubory:** SPA fallback jen pro cesty bez přípony (aplikace používá hash routy, fallback je pojistka); chybějící soubor s příponou = 404, aby prohlížeč nedostal HTML místo JS/CSS. `/assets/*` s `Cache-Control: public, max-age=31536000, immutable` (Vite hashuje názvy), ostatní `no-cache`. Server nebuildí: bez `dist/index.html` skončí hláškou „nejdřív spusťte npm run build“.
- **R8 – formát zálohy = `UserState`:** export je tentýž JSON jako `userdata/user-state.json` (pretty), takže jde zálohovat i kopií souboru ze serveru a importovat ho. Import přepíše celý stav (`replaceState`) a uloží se jako každá změna (tedy i na server).
- **R9 – potvrzení importu inline**, ne `window.confirm`: po výběru platného souboru panel ukáže souhrn zálohy a tlačítka „Přepsat data“ / „Zrušit“ (funguje na mobilu, testovatelné, bez modálu).
- **R10 – indikace režimu:** v tiráži vždy (text režimu + nápověda); mimo tiráž jen při `server-unavailable` drobný odznak vlevo dole (`role="status"`, `pointer-events: none`, netiskne se). Během detekce se ukazuje „jen v tomto prohlížeči“ (zvláštní stav „připojuji“ by na 1,5 s jen blikal).
- **R11 – `SettingsPage` dostane panel jako `children`** (na místě dočasného textu „přibudou ve fázi 7“), aby se nemusel měnit podpis a test nastavení.
- **R12 – ruční kontrola se zálohou dat:** Task 10 pracuje se skutečným `userdata/user-state.json`; existující soubor se před kontrolou zkopíruje do scratchpadu a na konci vrátí (nebo smaže, pokud předtím neexistoval).

## Struktura souborů

| Soubor | Odpovědnost | Task |
|---|---|---|
| `src/state/userState.ts`, `tsconfig.scripts.json` | `parseUserState`, `KeyValueReader`/`KeyValueWriter`, relativní importy | 1 |
| `src/state/storage.ts` (nový) | `StorageMode`, `StorageAdapter`, `StorageLike`, `defaultStorage`, `LocalStorageAdapter` | 2 |
| `src/state/serverStorage.ts` (nový) | `fetchWithTimeout`, `FileServerAdapter`, `detectServer`, konstanty API a limitů | 3 |
| `src/state/UserStateProvider.tsx` | adaptéry, synchronizace (R2), `storageMode`, `retryServer`, `replaceState` | 2, 4 |
| `scripts/serve.ts` (nový), `package.json` | server: statické soubory, `/api/health`, `/api/state`, atomický zápis, `npm run serve` | 5, 6 |
| `src/state/backup.ts` (nový) | název souboru, serializace, `parseBackup`, souhrn, čtení souboru, stažení | 7 |
| `src/pages/StoragePanel.tsx` (nový), `src/pages/SettingsPage.tsx`, `src/pages/labels.ts`, `src/styles/paper.css` | panel tiráže: režim, obnovení, export, import | 8 |
| `src/App.tsx`, `src/styles/paper.css` | `connect={detectServer}`, panel v tiráži, odznak offline | 9 |

---

### Task 1: Sdílená validace stavu `parseUserState` (bez aliasu `@`)

**Files:**
- Modify: `src/state/userState.ts:1-3` (importy), `:62-91` (`loadUserState`, `saveUserState`)
- Modify: `tsconfig.scripts.json` (`include`)
- Test: `src/state/userState.test.ts`

**Interfaces:**
- Consumes: nic nového (stávající `userStateSchema`, `sanitize`, `freshDefault` v témže souboru).
- Produces:
  - `export interface KeyValueReader { getItem(key: string): string | null }`
  - `export interface KeyValueWriter { setItem(key: string, value: string): void }`
  - `export function parseUserState(raw: unknown): UserState | null`
  - `loadUserState(storage: KeyValueReader): UserState`, `saveUserState(storage: KeyValueWriter, s: UserState): void` (podpisy kompatibilní s `Storage`)

- [ ] **Step 1: Napsat padající test**

Do `src/state/userState.test.ts` přidat `parseUserState` do importu z `./userState` a na konec souboru:

```ts
describe('parseUserState', () => {
  it('platný objekt doplní chybějící pole, upne meze a zahodí neznámá pole', () => {
    const s = parseUserState({ version: 1, favorites: ['a'], cart: [{ recipeId: 'x', multiplier: 99 }], extra: 1 });
    expect(s).not.toBeNull();
    expect(s!.favorites).toEqual(['a']);
    expect(s!.cart).toEqual([{ recipeId: 'x', multiplier: MULTIPLIER_MAX }]);
    expect(s!.people).toEqual(DEFAULT_USER_STATE.people);
    expect('extra' in s!).toBe(false);
  });

  it('vrátí null pro data, která nejsou stav kuchařky', () => {
    for (const raw of [null, undefined, 'x', 42, [], {}, { favorites: ['a'] }, { version: 2 }, { version: '1' }]) {
      expect(parseUserState(raw)).toBeNull();
    }
  });

  it('výsledek nesdílí reference s DEFAULT_USER_STATE', () => {
    const s = parseUserState({ version: 1 })!;
    expect(s).toEqual(DEFAULT_USER_STATE);
    expect(s.cart).not.toBe(DEFAULT_USER_STATE.cart);
    expect(s.settings).not.toBe(DEFAULT_USER_STATE.settings);
  });
});
```

- [ ] **Step 2: Ověřit, že test padá a že `tsx` modul nenačte**

Run: `npx vitest run src/state/userState.test.ts`
Expected: FAIL – `parseUserState is not a function` (resp. chyba importu).

Run: `npx tsx --eval "import('./src/state/userState.ts').then((m) => console.log(m.DEFAULT_USER_STATE.version))"`
Expected: chyba `Cannot find package '@/domain'` (důkaz, proč R1).

- [ ] **Step 3: Implementace**

V `src/state/userState.ts` nahradit první dva importy:

```ts
import { DAY_FACTOR_MAX, DAY_FACTOR_MIN, DAY_FACTOR_STEP, type People } from '../domain/portions';
import { DEFAULT_CHILD_COEF } from '../domain/scaling';
```

a funkce `loadUserState` + `saveUserState` (od `/** Načte stav; …` po konec `saveUserState`) nahradit:

```ts
/** Čtení a zápis klíče (localStorage nebo náhrada v paměti) – bez DOM typů, modul načítá i Node server. */
export interface KeyValueReader {
  getItem(key: string): string | null;
}
export interface KeyValueWriter {
  setItem(key: string, value: string): void;
}

/**
 * Jediná validace stavu z neznámého zdroje (localStorage, soubor serveru, importovaná záloha).
 * null = nejde o stav kuchařky (ne objekt, chybí `version: 1`); jinak se pole tolerantně opraví.
 */
export function parseUserState(raw: unknown): UserState | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  if ((raw as { version?: unknown }).version !== 1) return null;
  // Chybějící klíče doplníme výchozími, aby je `.catch` zachytilo jednotně.
  const result = userStateSchema.safeParse({ ...freshDefault(), ...(raw as Record<string, unknown>) });
  return result.success ? sanitize(result.data) : null;
}

/** Načte stav; chybějící, neplatný nebo poškozený obsah nahradí výchozími hodnotami (po polích). */
export function loadUserState(storage: KeyValueReader): UserState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw == null) return freshDefault();
    return parseUserState(JSON.parse(raw)) ?? freshDefault();
  } catch {
    return freshDefault();
  }
}

/** Uloží stav; chyby úložiště (soukromý režim, plná kvóta) tiše ignoruje. */
export function saveUserState(storage: KeyValueWriter, s: UserState): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // úložiště nedostupné – stav zůstane jen v paměti
  }
}
```

V `tsconfig.scripts.json`:

```json
  "include": ["scripts/**/*.ts", "src/domain/**/*.ts", "src/state/userState.ts"]
```

- [ ] **Step 4: Ověřit, že testy procházejí a modul jde načíst v Node**

Run: `npx vitest run src/state/userState.test.ts`
Expected: PASS (včetně stávajících testů `loadUserState` – chování beze změny).

Run: `npx tsx --eval "import('./src/state/userState.ts').then((m) => console.log(m.parseUserState({ version: 1 })?.version))"`
Expected: `1`

Run: `npx tsc -p tsconfig.scripts.json && npm test && npm run build && npm run lint`
Expected: bez chyb.

- [ ] **Step 5: Commit**

```bash
git add src/state/userState.ts src/state/userState.test.ts tsconfig.scripts.json
git commit -m "feat(stav): sdílená validace parseUserState použitelná i v Node serveru"
```

---

### Task 2: `StorageAdapter` a `LocalStorageAdapter`

**Files:**
- Create: `src/state/storage.ts`
- Modify: `src/state/UserStateProvider.tsx:20` (typ `StorageLike`), `:37-48` (`defaultStorage` přesunout)
- Modify: `src/state/UserStateProvider.test.tsx:3` (import `defaultStorage`)
- Test: `src/state/storage.test.ts`

**Interfaces:**
- Consumes: `loadUserState`, `saveUserState`, `STORAGE_KEY`, `KeyValueReader`, `KeyValueWriter`, `UserState` (Task 1).
- Produces:
  - `export type StorageMode = 'local' | 'server' | 'server-unavailable'`
  - `export interface StorageAdapter { load(): Promise<UserState | null>; save(state: UserState): Promise<void> }`
  - `export type StorageLike = KeyValueReader & KeyValueWriter`
  - `export function defaultStorage(): StorageLike` (přesunuto z provideru, chování beze změny)
  - `export class LocalStorageAdapter implements StorageAdapter { constructor(storage?: StorageLike); read(): UserState; write(state: UserState): void; load(); save() }`

- [ ] **Step 1: Napsat padající test**

`src/state/storage.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { defaultStorage, LocalStorageAdapter } from './storage';
import { DEFAULT_USER_STATE, STORAGE_KEY, toggleFavorite } from './userState';

function memory(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(STORAGE_KEY, initial);
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe('LocalStorageAdapter', () => {
  it('prázdné úložiště: load vrátí null, read výchozí stav', async () => {
    const adapter = new LocalStorageAdapter(memory());
    await expect(adapter.load()).resolves.toBeNull();
    expect(adapter.read()).toEqual(DEFAULT_USER_STATE);
  });

  it('save a load se vrátí pod klíčem STORAGE_KEY', async () => {
    const mem = memory();
    const adapter = new LocalStorageAdapter(mem);
    const s = toggleFavorite(DEFAULT_USER_STATE, 'r1');
    await adapter.save(s);
    expect(mem.data.get(STORAGE_KEY)).toContain('"favorites":["r1"]');
    await expect(adapter.load()).resolves.toEqual(s);
  });

  it('read je synchronní a poškozený obsah nahradí výchozím stavem', () => {
    expect(new LocalStorageAdapter(memory('{nejson')).read()).toEqual(DEFAULT_USER_STATE);
  });

  it('chyba zápisu (plná kvóta) ani čtení nespadne', async () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    const adapter = new LocalStorageAdapter(broken);
    await expect(adapter.save(DEFAULT_USER_STATE)).resolves.toBeUndefined();
    await expect(adapter.load()).resolves.toBeNull();
    expect(adapter.read()).toEqual(DEFAULT_USER_STATE);
  });
});

describe('defaultStorage', () => {
  it('při zablokovaném localStorage vrátí úložiště v paměti', () => {
    const spy = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    try {
      const st = defaultStorage();
      st.setItem('k', 'v');
      expect(st.getItem('k')).toBe('v');
      expect(st.getItem('jiny')).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });
});
```

- [ ] **Step 2: Ověřit, že test padá**

Run: `npx vitest run src/state/storage.test.ts`
Expected: FAIL – `Failed to resolve import "./storage"`.

- [ ] **Step 3: Implementace**

`src/state/storage.ts`:

```ts
import { loadUserState, saveUserState, STORAGE_KEY } from './userState';
import type { KeyValueReader, KeyValueWriter, UserState } from './userState';

/** Kam se stav právě ukládá (ukazuje tiráž): jen prohlížeč, server, nebo server nedostupný (ukládá se lokálně). */
export type StorageMode = 'local' | 'server' | 'server-unavailable';

/** Úložiště uživatelského stavu (spec §5.2). `load` vrací null, když úložiště ještě nic neobsahuje. */
export interface StorageAdapter {
  load(): Promise<UserState | null>;
  save(state: UserState): Promise<void>;
}

export type StorageLike = KeyValueReader & KeyValueWriter;

/** localStorage může při zablokovaných datech webu vyhodit SecurityError; pak se použije paměť. */
export function defaultStorage(): StorageLike {
  try {
    return window.localStorage;
  } catch {
    const mem = new Map<string, string>();
    return {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => void mem.set(k, v),
    };
  }
}

/** Výchozí úložiště v prohlížeči; zároveň lokální cache při práci se serverem (ruling R2). */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly storage: StorageLike;

  constructor(storage: StorageLike = defaultStorage()) {
    this.storage = storage;
  }

  /** Synchronní čtení pro první vykreslení (bez bliknutí výchozího stavu). */
  read(): UserState {
    return loadUserState(this.storage);
  }

  write(state: UserState): void {
    saveUserState(this.storage, state);
  }

  async load(): Promise<UserState | null> {
    try {
      if (this.storage.getItem(STORAGE_KEY) == null) return null;
    } catch {
      return null;
    }
    return this.read();
  }

  async save(state: UserState): Promise<void> {
    this.write(state);
  }
}
```

V `src/state/UserStateProvider.tsx` smazat řádek `type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;` a celou funkci `defaultStorage` (včetně komentáře a `eslint-disable` nad ní) a přidat import:

```ts
import { defaultStorage, type StorageLike } from './storage';
```

V `src/state/UserStateProvider.test.tsx` řádek 3 nahradit:

```ts
import { UserStateProvider, useUserState } from './UserStateProvider';
import { defaultStorage } from './storage';
```

- [ ] **Step 4: Ověřit**

Run: `npx vitest run src/state`
Expected: PASS (nové i všechny stávající testy provideru).

Run: `npm test && npm run build && npm run lint`
Expected: bez chyb.

- [ ] **Step 5: Commit**

```bash
git add src/state/storage.ts src/state/storage.test.ts src/state/UserStateProvider.tsx src/state/UserStateProvider.test.tsx
git commit -m "feat(stav): rozhraní StorageAdapter a LocalStorageAdapter"
```

---

### Task 3: `FileServerAdapter` a detekce serveru

**Files:**
- Create: `src/state/serverStorage.ts`
- Test: `src/state/serverStorage.test.ts`

**Interfaces:**
- Consumes: `StorageAdapter` (Task 2), `parseUserState`, `UserState` (Task 1).
- Produces:
  - `export const API_HEALTH = '/api/health'`, `export const API_STATE = '/api/state'`
  - `export const DETECT_TIMEOUT_MS = 1500`, `export const SERVER_TIMEOUT_MS = 5000`
  - `export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>`
  - `export function fetchWithTimeout(fetchFn: FetchFn, url: string, init: RequestInit, ms: number): Promise<Response>` – po `ms` odmítne `Error('Časový limit … ms')` a zruší požadavek
  - `export interface ServerOptions { baseUrl?: string; timeoutMs?: number; fetchFn?: FetchFn }`
  - `export class FileServerAdapter implements StorageAdapter { constructor(options?: ServerOptions); load(): Promise<UserState | null>; save(state: UserState): Promise<void> }`
  - `export function detectServer(options?: ServerOptions): Promise<FileServerAdapter | null>` – nikdy neodmítne

- [ ] **Step 1: Napsat padající test**

`src/state/serverStorage.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_HEALTH, API_STATE, DETECT_TIMEOUT_MS, FileServerAdapter, SERVER_TIMEOUT_MS, detectServer, fetchWithTimeout } from './serverStorage';
import type { FetchFn } from './serverStorage';
import { DEFAULT_USER_STATE, MULTIPLIER_MAX, toggleFavorite } from './userState';

const reply = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;
/** Vite dev a statický hosting vracejí na neznámou cestu index.html se stavem 200. */
const htmlReply = () =>
  ({ ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token <'); } }) as unknown as Response;
/** Spojení, které nikdy neodpoví (reaguje jen na zrušení). */
const hanging: FetchFn = (_url, init) =>
  new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))));

afterEach(() => vi.useRealTimers());

describe('fetchWithTimeout', () => {
  it('po limitu odmítne a zruší požadavek', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const fetchFn: FetchFn = (url, init) => {
      signal = init?.signal ?? undefined;
      return hanging(url, init);
    };
    const assertion = expect(fetchWithTimeout(fetchFn, '/x', {}, 1000)).rejects.toThrow('Časový limit 1000 ms');
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(signal?.aborted).toBe(true);
  });

  it('po odpovědi zruší časovač', async () => {
    vi.useFakeTimers();
    await fetchWithTimeout(async () => reply({}), '/x', {}, 1000);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('FileServerAdapter', () => {
  it('load načte stav z GET /api/state a opraví ho přes parseUserState', async () => {
    const fetchFn = vi.fn<FetchFn>(async () => reply({ version: 1, favorites: ['a'], cart: [{ recipeId: 'x', multiplier: 50 }] }));
    const s = await new FileServerAdapter({ fetchFn }).load();
    expect(fetchFn).toHaveBeenCalledWith(API_STATE, expect.objectContaining({ cache: 'no-store' }));
    expect(s?.favorites).toEqual(['a']);
    expect(s?.cart).toEqual([{ recipeId: 'x', multiplier: MULTIPLIER_MAX }]);
  });

  it('load vrátí null, když server stav nemá nebo není platný', async () => {
    await expect(new FileServerAdapter({ fetchFn: async () => reply(null) }).load()).resolves.toBeNull();
    await expect(new FileServerAdapter({ fetchFn: async () => reply({ version: 2 }) }).load()).resolves.toBeNull();
  });

  it('load při chybě serveru nebo sítě odmítne', async () => {
    await expect(new FileServerAdapter({ fetchFn: async () => reply({ error: 'x' }, 500) }).load()).rejects.toThrow('500');
    await expect(new FileServerAdapter({ fetchFn: async () => { throw new TypeError('Failed to fetch'); } }).load()).rejects.toThrow();
  });

  it('save pošle PUT s JSON a keepalive (přežije zavření stránky)', async () => {
    const fetchFn = vi.fn<FetchFn>(async () => reply(null, 204));
    const s = toggleFavorite(DEFAULT_USER_STATE, 'r1');
    await new FileServerAdapter({ baseUrl: 'http://pc:8787', fetchFn }).save(s);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('http://pc:8787' + API_STATE);
    expect(init).toMatchObject({ method: 'PUT', keepalive: true, headers: { 'Content-Type': 'application/json' } });
    expect(JSON.parse(String(init?.body))).toEqual(s);
  });

  it('save odmítne, když server data nepřijme', async () => {
    await expect(new FileServerAdapter({ fetchFn: async () => reply({ error: 'x' }, 413) }).save(DEFAULT_USER_STATE)).rejects.toThrow('413');
  });

  it('zamrzlý server: load odmítne po SERVER_TIMEOUT_MS', async () => {
    vi.useFakeTimers();
    const assertion = expect(new FileServerAdapter({ fetchFn: hanging }).load()).rejects.toThrow('Časový limit');
    await vi.advanceTimersByTimeAsync(SERVER_TIMEOUT_MS);
    await assertion;
  });
});

describe('detectServer', () => {
  it('odpověď {"ok":true} vrátí FileServerAdapter se stejným fetch a adresou', async () => {
    const fetchFn = vi.fn<FetchFn>(async () => reply({ ok: true }));
    const adapter = await detectServer({ fetchFn, baseUrl: 'http://pc:8787' });
    expect(adapter).toBeInstanceOf(FileServerAdapter);
    expect(fetchFn).toHaveBeenCalledWith('http://pc:8787' + API_HEALTH, expect.objectContaining({ cache: 'no-store' }));
    fetchFn.mockResolvedValueOnce(reply(null));
    await adapter!.load();
    expect(fetchFn).toHaveBeenLastCalledWith('http://pc:8787' + API_STATE, expect.anything());
  });

  it('HTML (vite dev), 404, {"ok":false} a chyba sítě = bez serveru', async () => {
    await expect(detectServer({ fetchFn: async () => htmlReply() })).resolves.toBeNull();
    await expect(detectServer({ fetchFn: async () => reply(null, 404) })).resolves.toBeNull();
    await expect(detectServer({ fetchFn: async () => reply({ ok: false }) })).resolves.toBeNull();
    await expect(detectServer({ fetchFn: async () => { throw new TypeError('Failed to fetch'); } })).resolves.toBeNull();
  });

  it('zamrzlé spojení skončí po DETECT_TIMEOUT_MS bez serveru', async () => {
    vi.useFakeTimers();
    const result = detectServer({ fetchFn: hanging });
    await vi.advanceTimersByTimeAsync(DETECT_TIMEOUT_MS);
    await expect(result).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Ověřit, že test padá**

Run: `npx vitest run src/state/serverStorage.test.ts`
Expected: FAIL – `Failed to resolve import "./serverStorage"`.

- [ ] **Step 3: Implementace**

`src/state/serverStorage.ts`:

```ts
import type { StorageAdapter } from './storage';
import { parseUserState } from './userState';
import type { UserState } from './userState';

export const API_HEALTH = '/api/health';
export const API_STATE = '/api/state';
/** Detekce nesmí zdržet: bez serveru (dev, statický build) se do 1,5 s pracuje lokálně. */
export const DETECT_TIMEOUT_MS = 1500;
export const SERVER_TIMEOUT_MS = 5000;

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export interface ServerOptions {
  /** Prázdné = stejný původ jako stránka (server servíruje i web). */
  baseUrl?: string;
  timeoutMs?: number;
  fetchFn?: FetchFn;
}

/** Pozdní vazba na globální fetch (testy ho mohou podstrčit přes vi.stubGlobal). */
const globalFetch: FetchFn = (input, init) => fetch(input, init);

/** Fetch s časovým limitem; odmítne i tehdy, když fetchFn signál ignoruje. */
export function fetchWithTimeout(fetchFn: FetchFn, url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  return new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Časový limit ${ms} ms`));
    }, ms);
    try {
      // časovač rušit přímo v obsluze (ne ve .finally – to by doběhlo až po pokračování volajícího)
      fetchFn(url, { ...init, signal: controller.signal }).then(
        (res) => {
          clearTimeout(timer);
          resolve(res);
        },
        (err: unknown) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    } catch (e) {
      clearTimeout(timer);
      reject(e);
    }
  });
}

/** Stav v souboru userdata/user-state.json přes `npm run serve` (spec §5.2). */
export class FileServerAdapter implements StorageAdapter {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: FetchFn;

  constructor(options: ServerOptions = {}) {
    this.baseUrl = options.baseUrl ?? '';
    this.timeoutMs = options.timeoutMs ?? SERVER_TIMEOUT_MS;
    this.fetchFn = options.fetchFn ?? globalFetch;
  }

  async load(): Promise<UserState | null> {
    const res = await fetchWithTimeout(this.fetchFn, this.baseUrl + API_STATE, { cache: 'no-store' }, this.timeoutMs);
    if (!res.ok) throw new Error(`Server vrátil ${res.status}`);
    const body: unknown = await res.json();
    return body === null ? null : parseUserState(body);
  }

  async save(state: UserState): Promise<void> {
    const res = await fetchWithTimeout(
      this.fetchFn,
      this.baseUrl + API_STATE,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
        // dokončí se i po zavření stránky (flush na pagehide)
        keepalive: true,
      },
      this.timeoutMs,
    );
    if (!res.ok) throw new Error(`Server odmítl uložení (${res.status})`);
  }
}

/** Najde server kuchařky přes GET /api/health; bez serveru (nebo s jinou odpovědí) vrátí null, nikdy neodmítne. */
export async function detectServer(options: ServerOptions = {}): Promise<FileServerAdapter | null> {
  const fetchFn = options.fetchFn ?? globalFetch;
  const baseUrl = options.baseUrl ?? '';
  try {
    const res = await fetchWithTimeout(fetchFn, baseUrl + API_HEALTH, { cache: 'no-store' }, options.timeoutMs ?? DETECT_TIMEOUT_MS);
    if (!res.ok) return null;
    const body: unknown = await res.json();
    const healthy = typeof body === 'object' && body !== null && (body as { ok?: unknown }).ok === true;
    return healthy ? new FileServerAdapter({ baseUrl, fetchFn }) : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Ověřit**

Run: `npx vitest run src/state/serverStorage.test.ts`
Expected: PASS.

Run: `npm test && npm run build && npm run lint`
Expected: bez chyb.

- [ ] **Step 5: Commit**

```bash
git add src/state/serverStorage.ts src/state/serverStorage.test.ts
git commit -m "feat(stav): FileServerAdapter a detekce serveru přes /api/health"
```

---

### Task 4: Provider s adaptéry, synchronizací a režimem ukládání

**Files:**
- Modify: `src/state/UserStateProvider.tsx` (celý soubor, viz níže)
- Test: `src/state/UserStateProvider.test.tsx` (nový `describe` na konci)

**Interfaces:**
- Consumes: `LocalStorageAdapter`, `defaultStorage`, `StorageAdapter`, `StorageLike`, `StorageMode` (Task 2); funkce stavu z `./userState`.
- Produces:
  - `UserStateProvider` props: `{ children: ReactNode; storage?: StorageLike; connect?: () => Promise<StorageAdapter | null> }`
  - `useUserState()` vrací navíc: `storageMode: StorageMode`, `retryServer(): Promise<void>`, `replaceState(next: UserState): void`

- [ ] **Step 1: Napsat padající test**

Na konec `src/state/UserStateProvider.test.tsx` (importy doplnit nahoře: `import type { StorageAdapter } from './storage';` a z `./userState` navíc `DEFAULT_USER_STATE` a `type UserState`):

```tsx
const withFavs = (...favorites: string[]): UserState => ({ ...structuredClone(DEFAULT_USER_STATE), favorites });

function fakeServer(initial: UserState | null) {
  const srv = { stored: initial, fail: false };
  const adapter = {
    load: vi.fn(async () => {
      if (srv.fail) throw new Error('server nedostupný');
      return srv.stored;
    }),
    save: vi.fn(async (next: UserState) => {
      if (srv.fail) throw new Error('server nedostupný');
      srv.stored = next;
    }),
  };
  return { srv, adapter };
}

function StorageProbe() {
  const { state, storageMode, toggleFavorite, retryServer, replaceState } = useUserState();
  return (
    <div>
      <span data-testid="favs">{state.favorites.join(',')}</span>
      <span data-testid="mode">{storageMode}</span>
      <button onClick={() => toggleFavorite('r1')}>fav</button>
      <button onClick={() => void retryServer()}>retry</button>
      <button onClick={() => replaceState(withFavs('imp'))}>import</button>
    </div>
  );
}

/** Proběhnou čekající sliby (připojení, načtení, PUT). */
const settle = () =>
  act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
const afterDebounce = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
const mode = () => screen.getByTestId('mode').textContent;
const favs = () => screen.getByTestId('favs').textContent;
const lastJson = (storage: ReturnType<typeof makeStorage>) => (storage.setItem.mock.calls.at(-1) as unknown as string[])[1];

async function renderWith(connect: () => Promise<StorageAdapter | null>, storage = makeStorage()) {
  render(
    <UserStateProvider storage={storage} connect={connect}>
      <StorageProbe />
    </UserStateProvider>,
  );
  await settle();
  return storage;
}

describe('UserStateProvider se serverem', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('bez connect je režim local', () => {
    render(
      <UserStateProvider storage={makeStorage()}>
        <StorageProbe />
      </UserStateProvider>,
    );
    expect(mode()).toBe('local');
  });

  it('server se stavem je zdroj pravdy: převezme se a uloží do lokální cache, nic se neposílá zpět', async () => {
    const { adapter } = fakeServer(withFavs('srv'));
    const storage = await renderWith(async () => adapter, makeStorage('{"version":1,"favorites":["loc"]}'));
    expect(favs()).toBe('srv');
    expect(mode()).toBe('server');
    expect(lastJson(storage)).toContain('"favorites":["srv"]');
    await afterDebounce();
    expect(adapter.save).not.toHaveBeenCalled();
  });

  it('server bez stavu: nahraje se lokální stav', async () => {
    const { srv, adapter } = fakeServer(null);
    await renderWith(async () => adapter, makeStorage('{"version":1,"favorites":["loc"]}'));
    expect(favs()).toBe('loc');
    expect(srv.stored?.favorites).toEqual(['loc']);
    expect(mode()).toBe('server');
  });

  it('změna se uloží do lokální cache i na server', async () => {
    const { srv, adapter } = fakeServer(withFavs('srv'));
    const storage = await renderWith(async () => adapter);
    act(() => screen.getByText('fav').click());
    await afterDebounce();
    await settle();
    expect(adapter.save).toHaveBeenCalledTimes(1);
    expect(srv.stored?.favorites).toEqual(['srv', 'r1']);
    expect(lastJson(storage)).toContain('"favorites":["srv","r1"]');
  });

  it('když ukládání na server selže, režim je server-unavailable a změna zůstane lokálně; po obnovení se neodeslaná změna nahraje', async () => {
    const { srv, adapter } = fakeServer(withFavs('srv'));
    const storage = await renderWith(async () => adapter);
    srv.fail = true;
    act(() => screen.getByText('fav').click());
    await afterDebounce();
    await settle();
    expect(mode()).toBe('server-unavailable');
    expect(lastJson(storage)).toContain('"favorites":["srv","r1"]');
    srv.stored = withFavs('jine-zarizeni');
    srv.fail = false;
    act(() => screen.getByText('retry').click());
    await settle();
    expect(mode()).toBe('server');
    expect(favs()).toBe('srv,r1');
    expect(srv.stored?.favorites).toEqual(['srv', 'r1']);
  });

  it('načtení ze serveru selže: lokální stav, server-unavailable; obnovení bez lokálních změn převezme serverový stav', async () => {
    const { srv, adapter } = fakeServer(withFavs('srv'));
    srv.fail = true;
    await renderWith(async () => adapter, makeStorage('{"version":1,"favorites":["loc"]}'));
    expect(mode()).toBe('server-unavailable');
    expect(favs()).toBe('loc');
    srv.fail = false;
    act(() => screen.getByText('retry').click());
    await settle();
    expect(mode()).toBe('server');
    expect(favs()).toBe('srv');
  });

  it('server se objeví později: retry znovu zavolá connect a převezme serverový stav', async () => {
    const { adapter } = fakeServer(withFavs('srv'));
    const connect = vi.fn<() => Promise<StorageAdapter | null>>().mockResolvedValueOnce(null).mockResolvedValueOnce(adapter);
    await renderWith(connect, makeStorage('{"version":1,"favorites":["loc"]}'));
    expect(mode()).toBe('local');
    act(() => screen.getByText('retry').click());
    await settle();
    expect(connect).toHaveBeenCalledTimes(2);
    expect(mode()).toBe('server');
    expect(favs()).toBe('srv');
  });

  it('změna během připojování vyhrává nad serverovým stavem a nahraje se', async () => {
    const { srv, adapter } = fakeServer(withFavs('srv'));
    let finishConnect!: (a: StorageAdapter) => void;
    const connect = () => new Promise<StorageAdapter | null>((resolve) => (finishConnect = resolve));
    await renderWith(connect);
    act(() => screen.getByText('fav').click());
    await act(async () => finishConnect(adapter));
    await settle();
    expect(favs()).toBe('r1');
    expect(srv.stored?.favorites).toEqual(['r1']);
  });

  it('pagehide pošle neuloženou změnu i na server', async () => {
    const { srv, adapter } = fakeServer(withFavs('srv'));
    await renderWith(async () => adapter);
    act(() => screen.getByText('fav').click());
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    await settle();
    expect(adapter.save).toHaveBeenCalledTimes(1);
    expect(srv.stored?.favorites).toEqual(['srv', 'r1']);
  });

  it('replaceState (import) přepíše stav a uloží ho lokálně i na server', async () => {
    const { srv, adapter } = fakeServer(withFavs('srv'));
    const storage = await renderWith(async () => adapter);
    act(() => screen.getByText('import').click());
    expect(favs()).toBe('imp');
    await afterDebounce();
    await settle();
    expect(lastJson(storage)).toContain('"favorites":["imp"]');
    expect(srv.stored?.favorites).toEqual(['imp']);
  });
});
```

- [ ] **Step 2: Ověřit, že test padá**

Run: `npx vitest run src/state/UserStateProvider.test.tsx`
Expected: FAIL – `storageMode` je `undefined` (`mode()` vrátí `''`), nové testy padají; staré procházejí.

- [ ] **Step 3: Implementace**

`src/state/UserStateProvider.tsx` celý:

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { People } from '@/domain/portions';
import { defaultStorage, LocalStorageAdapter } from './storage';
import type { StorageAdapter, StorageLike, StorageMode } from './storage';
import {
  removeFromCart as removeFromCartFn,
  setCartMultiplier as setCartMultiplierFn,
  setDayFactor as setDayFactorFn,
  setPeople as setPeopleFn,
  toggleCart as toggleCartFn,
  toggleCooked as toggleCookedFn,
  toggleFavorite as toggleFavoriteFn,
  updateSettings as updateSettingsFn,
} from './userState';
import type { UserState } from './userState';

const SAVE_DEBOUNCE_MS = 300;

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
  /** Nahradí celý stav (import zálohy); uloží se jako každá jiná změna. */
  replaceState(next: UserState): void;
  /** Kam se právě ukládá (ukazuje tiráž). */
  storageMode: StorageMode;
  /** Znovu se připojí k serveru (známý adaptér, jinak znovu `connect`); splní se, až je výsledek znám. */
  retryServer(): Promise<void>;
}

const UserStateContext = createContext<UserStateApi | null>(null);

export function UserStateProvider({
  children,
  storage: storageProp,
  connect,
}: {
  children: ReactNode;
  storage?: StorageLike;
  /** Najde serverové úložiště (App předává detectServer); bez něj se ukládá jen lokálně. */
  connect?: () => Promise<StorageAdapter | null>;
}) {
  const [local] = useState(() => new LocalStorageAdapter(storageProp ?? defaultStorage()));
  // první vykreslení synchronně z lokální cache – bez bliknutí výchozího stavu (ruling R3)
  const [state, setState] = useState<UserState>(() => local.read());
  const [storageMode, setStorageMode] = useState<StorageMode>('local');
  const lastSaved = useRef(state);
  const latest = useRef(state);
  const remote = useRef<StorageAdapter | null>(null);
  const pendingRemote = useRef<UserState | null>(null);
  const sending = useRef(false);
  /** Lokální změna, kterou server ještě nepotvrdil – při obnovení serveru má přednost (ruling R2a). */
  const unsynced = useRef(false);
  const mounted = useRef(false);
  const connectRef = useRef(connect);
  useEffect(() => {
    latest.current = state;
    connectRef.current = connect;
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const setMode = useCallback((mode: StorageMode) => {
    if (mounted.current) setStorageMode(mode);
  }, []);

  // Na server jde nejvýš jeden PUT naráz; mezitím čeká jen nejnovější stav.
  const sendRemote = useCallback(async () => {
    if (sending.current) return;
    sending.current = true;
    try {
      while (pendingRemote.current && remote.current) {
        const next = pendingRemote.current;
        pendingRemote.current = null;
        try {
          await remote.current.save(next);
          if (pendingRemote.current === null) unsynced.current = false;
          setMode('server');
        } catch {
          setMode('server-unavailable');
          return;
        }
      }
    } finally {
      sending.current = false;
    }
  }, [setMode]);

  const pushRemote = useCallback(
    (next: UserState) => {
      if (!remote.current) return;
      pendingRemote.current = next;
      unsynced.current = true;
      void sendRemote();
    },
    [sendRemote],
  );

  // Okamžitě uloží neuloženou změnu (debounce, beforeunload, pagehide, unmount): lokálně i na server.
  const flush = useCallback(() => {
    if (latest.current === lastSaved.current) return;
    local.write(latest.current);
    lastSaved.current = latest.current;
    pushRemote(latest.current);
  }, [local, pushRemote]);

  // Serverový stav: do lokální cache a do UI, bez zpětného odeslání.
  const adopt = useCallback(
    (next: UserState) => {
      local.write(next);
      lastSaved.current = next;
      latest.current = next;
      setState(next);
    },
    [local],
  );

  // Připojení k serveru (ruling R2): serverový stav, pokud existuje, jinak nahrát lokální;
  // neodeslané lokální změny a změna během připojování mají přednost.
  const attach = useCallback(
    async (adapter: StorageAdapter) => {
      const before = latest.current;
      remote.current = adapter;
      let fromServer: UserState | null;
      try {
        fromServer = await adapter.load();
      } catch {
        setMode('server-unavailable');
        return;
      }
      if (!mounted.current) return;
      const localChanged = latest.current !== before || latest.current !== lastSaved.current;
      if (fromServer && !unsynced.current && !localChanged) {
        adopt(fromServer);
        setMode('server');
      } else {
        pushRemote(latest.current);
      }
    },
    [adopt, pushRemote, setMode],
  );

  useEffect(() => {
    const find = connectRef.current;
    if (!find) return;
    let cancelled = false;
    find().then(
      (adapter) => {
        if (!cancelled && adapter) return attach(adapter);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [attach]);

  const retryServer = useCallback(async () => {
    let adapter = remote.current;
    if (!adapter) {
      try {
        adapter = (await connectRef.current?.()) ?? null;
      } catch {
        adapter = null;
      }
    }
    if (!adapter) {
      setMode('local');
      return;
    }
    await attach(adapter);
  }, [attach, setMode]);

  // Debounce: uloží se až po 300 ms bez další změny; nezměněný stav se neukládá.
  useEffect(() => {
    if (state === lastSaved.current) return;
    const timer = setTimeout(flush, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state, flush]);

  // Neztratit změnu < 300 ms před zavřením stránky nebo odmontováním.
  useEffect(() => {
    // iOS Safari `beforeunload` nespouští, proto i `pagehide`
    window.addEventListener('beforeunload', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);

  const toggleFavorite = useCallback((id: string) => setState((s) => toggleFavoriteFn(s, id)), []);
  const toggleCooked = useCallback((id: string) => setState((s) => toggleCookedFn(s, id)), []);
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
  const update = useCallback(
    (patch: Partial<Omit<UserState, 'version'>>) => setState((s) => ({ ...s, ...patch })),
    [],
  );
  const replaceState = useCallback((next: UserState) => setState(next), []);

  const value = useMemo(
    () => ({ state, toggleFavorite, toggleCooked, toggleCart, setCartMultiplier, removeFromCart, setPeople, setDayFactor, updateSettings, update, replaceState, storageMode, retryServer }),
    [state, toggleFavorite, toggleCooked, toggleCart, setCartMultiplier, removeFromCart, setPeople, setDayFactor, updateSettings, update, replaceState, storageMode, retryServer],
  );
  return <UserStateContext.Provider value={value}>{children}</UserStateContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUserState(): UserStateApi {
  const ctx = useContext(UserStateContext);
  if (!ctx) throw new Error('useUserState musí být použit uvnitř UserStateProvider');
  return ctx;
}
```

- [ ] **Step 4: Ověřit**

Run: `npx vitest run src/state/UserStateProvider.test.tsx`
Expected: PASS – nové testy i všech 8 původních (bez `connect` se chování nemění).

Run: `npm test && npm run build && npm run lint`
Expected: bez chyb.

- [ ] **Step 5: Commit**

```bash
git add src/state/UserStateProvider.tsx src/state/UserStateProvider.test.tsx
git commit -m "feat(stav): provider se serverovým úložištěm, synchronizací a režimem ukládání"
```

---

### Task 5: Server – statické soubory a `/api/health`

**Files:**
- Create: `scripts/serve.ts`
- Test: `scripts/serve.test.ts`

**Interfaces:**
- Consumes: nic z aplikace (stav až v Tasku 6).
- Produces:
  - `export const DEFAULT_PORT = 8787`, `export const MAX_BODY_BYTES = 1_000_000`
  - `export interface ServeOptions { distDir: string; dataFile: string; maxBodyBytes?: number; log?: (message: string) => void }`
  - `export function mimeType(file: string): string`
  - `export function resolveStaticPath(distDir: string, urlPath: string): string | null`
  - `export function createAppServer(options: ServeOptions): Server` (z `node:http`, ještě neposlouchá)
  - interní `handle(req, res, opts)`, `sendJson(res, status, body, headers?)`, `HttpError(status, message)` – Task 6 je rozšíří

- [ ] **Step 1: Napsat padající test**

`scripts/serve.test.ts` (první řádek je povinný – server a `fetch` běží v Node, ne v jsdom):

```ts
// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { request, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createAppServer, mimeType, resolveStaticPath } from './serve'

let dir: string
let dataFile: string
let server: Server
let port: number
let base: string
const logs: string[] = []

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'kucharka-serve-'))
  await mkdir(path.join(dir, 'dist', 'assets'), { recursive: true })
  await writeFile(path.join(dir, 'dist', 'index.html'), '<!doctype html><title>Kuchařka</title>')
  await writeFile(path.join(dir, 'dist', 'assets', 'app-abc.js'), 'console.log(1)')
  await writeFile(path.join(dir, 'dist', 'assets', 'app-abc.css'), 'body{}')
  await writeFile(path.join(dir, 'secret.txt'), 'TAJNE')
  dataFile = path.join(dir, 'userdata', 'user-state.json')
  logs.length = 0
  server = createAppServer({ distDir: path.join(dir, 'dist'), dataFile, maxBodyBytes: 2000, log: (m) => logs.push(m) })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  port = (server.address() as AddressInfo).port
  base = `http://127.0.0.1:${port}`
})

afterEach(async () => {
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
  await rm(dir, { recursive: true, force: true })
})

/** Požadavek s cestou přesně tak, jak je napsaná (fetch by ji normalizoval). */
function raw(rawPath: string, method = 'GET'): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path: rawPath, method }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (c: string) => (body += c))
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }))
    })
    req.on('error', reject)
    req.end()
  })
}

describe('statické soubory', () => {
  it('/ vrátí index.html jako HTML bez dlouhé cache', async () => {
    const res = await fetch(`${base}/`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(res.headers.get('cache-control')).toBe('no-cache')
    expect(await res.text()).toContain('Kuchařka')
  })

  it('assety se správným MIME a neměnnou cache', async () => {
    const js = await fetch(`${base}/assets/app-abc.js`)
    expect(js.headers.get('content-type')).toBe('text/javascript; charset=utf-8')
    expect(js.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    expect(await js.text()).toBe('console.log(1)')
    const css = await fetch(`${base}/assets/app-abc.css`)
    expect(css.headers.get('content-type')).toBe('text/css; charset=utf-8')
  })

  it('chybějící asset je 404, ne index.html', async () => {
    const res = await fetch(`${base}/assets/chybi.js`)
    expect(res.status).toBe(404)
    expect(await res.text()).not.toContain('<!doctype html>')
  })

  it('cesta bez přípony spadne na index.html (SPA fallback)', async () => {
    const res = await fetch(`${base}/nejaka/stranka`)
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('Kuchařka')
  })

  it('HEAD bez těla, POST na statický soubor 405 s Allow', async () => {
    const head = await fetch(`${base}/`, { method: 'HEAD' })
    expect(head.status).toBe(200)
    expect(await head.text()).toBe('')
    const post = await fetch(`${base}/`, { method: 'POST' })
    expect(post.status).toBe(405)
    expect(post.headers.get('allow')).toBe('GET, HEAD')
  })

  it.each(['/../secret.txt', '/..%2fsecret.txt', '/%2e%2e/secret.txt', '/assets/..%2f..%2fsecret.txt', '/%2e%2e%5csecret.txt'])(
    'path traversal %s nevydá soubor mimo dist',
    async (p) => {
      const res = await raw(p)
      expect([400, 404]).toContain(res.status)
      expect(res.body).not.toContain('TAJNE')
    },
  )

  it('nulový bajt a neplatné kódování jsou 400', async () => {
    expect((await raw('/index.html%00.js')).status).toBe(400)
    expect((await raw('/%E0%A4%A')).status).toBe(400)
  })
})

describe('/api/health', () => {
  it('GET vrátí {"ok":true} jako JSON bez cache', async () => {
    const res = await fetch(`${base}/api/health`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.json()).toEqual({ ok: true })
  })

  it('jiná metoda 405, neznámé API 404 JSON', async () => {
    expect((await fetch(`${base}/api/health`, { method: 'POST' })).status).toBe(405)
    const res = await fetch(`${base}/api/nic`)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Neznámé API' })
  })
})

describe('pomocné funkce', () => {
  it('resolveStaticPath nikdy neopustí kořen', () => {
    const root = path.resolve('/srv/dist')
    expect(resolveStaticPath(root, '/assets/a.js')).toBe(path.join(root, 'assets', 'a.js'))
    for (const p of ['/../etc/passwd', '/a/../../etc/passwd', '/..%2f..%2fetc']) {
      const r = resolveStaticPath(root, p)
      expect(r === root || r!.startsWith(root + path.sep)).toBe(true)
    }
    expect(resolveStaticPath(root, '/%E0%A4%A')).toBeNull()
    expect(resolveStaticPath(root, '/a%00b')).toBeNull()
    expect(resolveStaticPath(root, '/..%5c..%5cetc')).toBeNull()
  })

  it('mimeType', () => {
    expect(mimeType('a.woff2')).toBe('font/woff2')
    expect(mimeType('A.SVG')).toBe('image/svg+xml')
    expect(mimeType('a.neznamo')).toBe('application/octet-stream')
  })
})
```

- [ ] **Step 2: Ověřit, že test padá**

Run: `npx vitest run scripts/serve.test.ts`
Expected: FAIL – `Failed to resolve import "./serve"`.

- [ ] **Step 3: Implementace**

`scripts/serve.ts`:

```ts
// Volitelný domácí server kuchařky: servíruje dist/ a ukládá uživatelský stav do userdata/. Spuštění: npm run serve
import { readFile, stat } from 'node:fs/promises'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import path from 'node:path'

export const DEFAULT_PORT = 8787
/** Stejný limit jako import zálohy v aplikaci (MAX_BACKUP_BYTES v src/state/backup.ts). */
export const MAX_BODY_BYTES = 1_000_000

export interface ServeOptions {
  distDir: string
  dataFile: string
  maxBodyBytes?: number
  log?: (message: string) => void
}

type ResolvedOptions = ServeOptions & { maxBodyBytes: number; log: (message: string) => void }

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
}

export function mimeType(file: string): string {
  return MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
}

/** Cesta souboru uvnitř distDir, nebo null (neplatné kódování, nulový bajt, zpětné lomítko). Nikdy mimo kořen. */
export function resolveStaticPath(distDir: string, urlPath: string): string | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(urlPath)
  } catch {
    return null
  }
  if (decoded.includes('\0') || decoded.includes('\\')) return null
  const root = path.resolve(distDir)
  // posix.normalize s úvodním „/“ ořízne „..“ nad kořenem; kontrola prefixu je druhá pojistka
  const target = path.resolve(root, '.' + path.posix.normalize('/' + decoded))
  return target === root || target.startsWith(root + path.sep) ? target : null
}

export class HttpError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    'Cache-Control': 'no-store',
    ...headers,
  })
  res.end(text)
}

async function isFile(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile()
  } catch {
    return false
  }
}

async function serveStatic(req: IncomingMessage, res: ServerResponse, distDir: string): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJson(res, 405, { error: 'Metoda není povolena' }, { Allow: 'GET, HEAD' })
  }
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')
  const file = resolveStaticPath(distDir, pathname)
  if (!file) return sendJson(res, 400, { error: 'Neplatná cesta' })
  let target = file
  if (!(await isFile(target))) {
    // SPA fallback jen pro „stránky“ bez přípony; chybějící asset = 404, ne HTML místo JS (ruling R7)
    if (path.extname(pathname) !== '') return sendJson(res, 404, { error: 'Nenalezeno' })
    target = path.join(distDir, 'index.html')
    if (!(await isFile(target))) return sendJson(res, 404, { error: 'Chybí dist/index.html – spusťte npm run build' })
  }
  const body = await readFile(target)
  const immutable = target === file && pathname.startsWith('/assets/')
  res.writeHead(200, {
    'Content-Type': mimeType(target),
    'Content-Length': body.length,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  })
  res.end(req.method === 'HEAD' ? undefined : body)
}

async function handle(req: IncomingMessage, res: ServerResponse, opts: ResolvedOptions): Promise<void> {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')
  if (pathname === '/api/health') {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'Metoda není povolena' }, { Allow: 'GET' })
    return sendJson(res, 200, { ok: true })
  }
  if (pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'Neznámé API' })
  return serveStatic(req, res, opts.distDir)
}

export function createAppServer(options: ServeOptions): Server {
  const opts: ResolvedOptions = {
    ...options,
    maxBodyBytes: options.maxBodyBytes ?? MAX_BODY_BYTES,
    log: options.log ?? ((m: string) => console.log(m)),
  }
  return createServer((req, res) => {
    handle(req, res, opts).catch((e: unknown) => {
      if (e instanceof HttpError) {
        if (!res.headersSent) sendJson(res, e.status, { error: e.message }, e.status === 413 ? { Connection: 'close' } : {})
        return
      }
      opts.log(`CHYBA: ${(e as Error).message}`)
      if (!res.headersSent) sendJson(res, 500, { error: 'Chyba serveru' })
      else res.end()
    })
  })
}
```

- [ ] **Step 4: Ověřit**

Run: `npx vitest run scripts/serve.test.ts`
Expected: PASS.

Run: `npm test && npm run build && npm run lint`
Expected: bez chyb (`tsc -b` kontroluje `scripts/serve.ts` přes `tsconfig.scripts.json`).

- [ ] **Step 5: Commit**

```bash
git add scripts/serve.ts scripts/serve.test.ts
git commit -m "feat(server): statické soubory z dist a /api/health na node:http"
```

---

### Task 6: Server – `/api/state`, atomický zápis a `npm run serve`

**Files:**
- Modify: `scripts/serve.ts` (importy, nové funkce, větev `/api/state` v `handle`, `main`)
- Modify: `package.json` (`scripts.serve`)
- Test: `scripts/serve.test.ts` (nové `describe` na konci)

**Interfaces:**
- Consumes: `parseUserState`, `UserState` z `../src/state/userState` (Task 1); `FileServerAdapter`, `detectServer` z `../src/state/serverStorage` (Task 3, jen v testu); `HttpError`, `sendJson`, `handle` (Task 5).
- Produces:
  - `export async function writeStateAtomic(dataFile: string, state: UserState): Promise<void>`
  - `export function parsePort(value: string | undefined): number`
  - `export function lanAddresses(interfaces?: Record<string, { address: string; family: string | number; internal: boolean }[] | undefined>): string[]`
  - `npm run serve` = `tsx scripts/serve.ts`

- [ ] **Step 1: Napsat padající test**

Do importů `scripts/serve.test.ts` přidat `readFile`, `readdir` z `node:fs/promises`, z `./serve` navíc `lanAddresses`, `parsePort`, `writeStateAtomic` a:

```ts
import { detectServer, FileServerAdapter } from '../src/state/serverStorage'
import { DEFAULT_USER_STATE, MULTIPLIER_MAX, toggleFavorite } from '../src/state/userState'
```

Na konec souboru:

```ts
const putState = (body: string) => fetch(`${base}/api/state`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body })
const userdataFiles = async () => readdir(path.dirname(dataFile)).catch(() => [] as string[])

describe('/api/state', () => {
  it('bez souboru vrátí 200 null', async () => {
    const res = await fetch(`${base}/api/state`)
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.json()).toBeNull()
  })

  it('PUT uloží opravený stav (meze, bez neznámých polí) a GET ho vrátí', async () => {
    const res = await putState(JSON.stringify({ version: 1, favorites: ['a'], cart: [{ recipeId: 'x', multiplier: 99 }], extra: true }))
    expect(res.status).toBe(204)
    const saved = JSON.parse(await readFile(dataFile, 'utf8'))
    expect(saved.cart).toEqual([{ recipeId: 'x', multiplier: MULTIPLIER_MAX }])
    expect(saved.extra).toBeUndefined()
    expect(await readFile(dataFile, 'utf8')).toMatch(/^\{\n {2}"version": 1,[\s\S]*\}\n$/)
    expect(await (await fetch(`${base}/api/state`)).json()).toEqual(saved)
  })

  it('neplatný JSON 400, cizí JSON 422, příliš velké tělo 413 – soubor nevznikne', async () => {
    expect((await putState('{nejson')).status).toBe(400)
    const foreign = await putState('{"foo":1}')
    expect(foreign.status).toBe(422)
    expect((await foreign.json()).error).toContain('version')
    expect((await putState(JSON.stringify({ version: 1, favorites: ['x'.repeat(3000)] }))).status).toBe(413)
    expect(await userdataFiles()).toEqual([])
  })

  it('souběžné zápisy nechají platný soubor bez dočasných souborů', async () => {
    const states = [1, 2, 3, 4, 5].map((n) => ({ ...DEFAULT_USER_STATE, favorites: [`r${n}`] }))
    const results = await Promise.all(states.map((s) => putState(JSON.stringify(s))))
    expect(results.map((r) => r.status)).toEqual([204, 204, 204, 204, 204])
    expect(await userdataFiles()).toEqual(['user-state.json'])
    const saved = JSON.parse(await readFile(dataFile, 'utf8'))
    expect(states.map((s) => s.favorites[0])).toContain(saved.favorites[0])
  })

  it('poškozený soubor: GET vrátí null, soubor se zazálohuje a zaloguje', async () => {
    await mkdir(path.dirname(dataFile), { recursive: true })
    await writeFile(dataFile, '{"version":1,"favorites":[')
    expect(await (await fetch(`${base}/api/state`)).json()).toBeNull()
    const backups = (await userdataFiles()).filter((f) => f.startsWith('user-state.json.poskozeny-'))
    expect(backups).toHaveLength(1)
    expect(await readFile(path.join(path.dirname(dataFile), backups[0]), 'utf8')).toBe('{"version":1,"favorites":[')
    expect(logs.join('\n')).toContain('VAROVÁNÍ')
  })

  it('prázdný soubor je null bez zálohy', async () => {
    await mkdir(path.dirname(dataFile), { recursive: true })
    await writeFile(dataFile, '  \n')
    expect(await (await fetch(`${base}/api/state`)).json()).toBeNull()
    expect(await userdataFiles()).toEqual(['user-state.json'])
  })

  it('DELETE 405 s Allow', async () => {
    const res = await fetch(`${base}/api/state`, { method: 'DELETE' })
    expect(res.status).toBe(405)
    expect(res.headers.get('allow')).toBe('GET, PUT')
  })

  it('klientské adaptéry fungují proti skutečnému serveru', async () => {
    const adapter = await detectServer({ baseUrl: base })
    expect(adapter).toBeInstanceOf(FileServerAdapter)
    await expect(adapter!.load()).resolves.toBeNull()
    const s = toggleFavorite(DEFAULT_USER_STATE, 'r1')
    await adapter!.save(s)
    await expect(adapter!.load()).resolves.toEqual(s)
  })
})

describe('writeStateAtomic, parsePort, lanAddresses', () => {
  it('writeStateAtomic vytvoří složku a přepíše soubor', async () => {
    const file = path.join(dir, 'nova', 'stav.json')
    await writeStateAtomic(file, DEFAULT_USER_STATE)
    await writeStateAtomic(file, toggleFavorite(DEFAULT_USER_STATE, 'a'))
    expect(JSON.parse(await readFile(file, 'utf8')).favorites).toEqual(['a'])
    expect(await readdir(path.dirname(file))).toEqual(['stav.json'])
  })

  it('parsePort: výchozí 8787, číslo z env, jinak chyba', () => {
    expect(parsePort(undefined)).toBe(8787)
    expect(parsePort('')).toBe(8787)
    expect(parsePort('9000')).toBe(9000)
    for (const bad of ['abc', '0', '70000', '80.5']) expect(() => parsePort(bad)).toThrow('Neplatný PORT')
  })

  it('lanAddresses vrátí jen vnější IPv4', () => {
    expect(
      lanAddresses({
        lo0: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
        en0: [
          { address: 'fe80::1', family: 'IPv6', internal: false },
          { address: '192.168.1.20', family: 'IPv4', internal: false },
        ],
        en1: [{ address: '10.0.0.5', family: 4, internal: false }],
        prazdne: undefined,
      }),
    ).toEqual(['192.168.1.20', '10.0.0.5'])
  })
})
```

- [ ] **Step 2: Ověřit, že test padá**

Run: `npx vitest run scripts/serve.test.ts`
Expected: FAIL – `/api/state` vrací 404 „Neznámé API“, `writeStateAtomic`/`parsePort`/`lanAddresses` nejsou exportované.

- [ ] **Step 3: Implementace**

V `scripts/serve.ts` nahradit importy:

```ts
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { networkInterfaces } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseUserState, type UserState } from '../src/state/userState'
```

Před funkci `handle` vložit:

```ts
/** Stav ze souboru; chybějící nebo prázdný = null, poškozený = null + záloha (ruling R6). */
async function readState(dataFile: string, log: (m: string) => void): Promise<UserState | null> {
  let text: string
  try {
    text = await readFile(dataFile, 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw e
  }
  if (text.trim() === '') return null
  let state: UserState | null
  try {
    state = parseUserState(JSON.parse(text))
  } catch {
    state = null
  }
  if (state === null) {
    const backup = `${dataFile}.poskozeny-${Date.now()}`
    await copyFile(dataFile, backup)
    log(`VAROVÁNÍ: ${dataFile} není platný stav kuchařky, záloha: ${backup}`)
  }
  return state
}

/** Zápis přes dočasný soubor ve stejné složce + rename: soubor je vždy celý starý, nebo celý nový. */
export async function writeStateAtomic(dataFile: string, state: UserState): Promise<void> {
  await mkdir(path.dirname(dataFile), { recursive: true })
  const tmp = `${dataFile}.${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`
  try {
    await writeFile(tmp, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
    await rename(tmp, dataFile)
  } catch (e) {
    await rm(tmp, { force: true })
    throw e
  }
}

function readBody(req: IncomingMessage, limit: number): Promise<string> {
  const declared = Number(req.headers['content-length'])
  if (Number.isFinite(declared) && declared > limit) {
    req.resume() // tělo zahodit, odpověď 413 jde hned
    return Promise.reject(new HttpError(413, 'Data jsou příliš velká (nejvýš 1 MB)'))
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    let tooLarge = false
    req.on('data', (chunk: Buffer) => {
      if (tooLarge) return
      size += chunk.length
      if (size > limit) {
        tooLarge = true
        reject(new HttpError(413, 'Data jsou příliš velká (nejvýš 1 MB)'))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (!tooLarge) resolve(Buffer.concat(chunks).toString('utf8'))
    })
    req.on('error', reject)
  })
}

async function handleState(req: IncomingMessage, res: ServerResponse, opts: ResolvedOptions): Promise<void> {
  if (req.method === 'GET') return sendJson(res, 200, await readState(opts.dataFile, opts.log))
  if (req.method !== 'PUT') return sendJson(res, 405, { error: 'Metoda není povolena' }, { Allow: 'GET, PUT' })
  const text = await readBody(req, opts.maxBodyBytes)
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new HttpError(400, 'Neplatný JSON')
  }
  const state = parseUserState(raw)
  if (!state) throw new HttpError(422, 'Data nejsou stav kuchařky (chybí "version": 1)')
  await writeStateAtomic(opts.dataFile, state)
  res.writeHead(204, { 'Cache-Control': 'no-store' })
  res.end()
}
```

V `handle` před řádek `if (pathname.startsWith('/api/'))` vložit:

```ts
  if (pathname === '/api/state') return handleState(req, res, opts)
```

Na konec souboru:

```ts
export function parsePort(value: string | undefined): number {
  if (value === undefined || value.trim() === '') return DEFAULT_PORT
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Neplatný PORT „${value}“ (čekám celé číslo 1–65535)`)
  return port
}

type Interfaces = Record<string, { address: string; family: string | number; internal: boolean }[] | undefined>

/** IPv4 adresy počítače v místní síti – na ně se připojí telefon na stejné Wi-Fi. */
export function lanAddresses(interfaces: Interfaces = networkInterfaces()): string[] {
  return Object.values(interfaces)
    .flatMap((list) => list ?? [])
    .filter((a) => (a.family === 'IPv4' || a.family === 4) && !a.internal)
    .map((a) => a.address)
}

function main(): void {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const distDir = path.join(root, 'dist')
  const dataFile = path.join(root, 'userdata', 'user-state.json')
  const port = parsePort(process.env.PORT)
  const host = process.env.HOST ?? '0.0.0.0'
  if (!existsSync(path.join(distDir, 'index.html'))) throw new Error('chybí dist/index.html – nejdřív spusťte npm run build')
  const server = createAppServer({ distDir, dataFile })
  server.on('error', (e: NodeJS.ErrnoException) => {
    console.error(e.code === 'EADDRINUSE' ? `CHYBA: port ${port} je obsazený – zkuste PORT=${port + 1} npm run serve` : `CHYBA: ${e.message}`)
    process.exit(1)
  })
  server.listen(port, host, () => {
    console.log(`Kuchařka běží: http://localhost:${port}`)
    for (const ip of lanAddresses()) console.log(`  telefon na stejné Wi-Fi: http://${ip}:${port}`)
    console.log(`  data: ${path.relative(root, dataFile)} · ukončení Ctrl+C`)
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main()
  } catch (e) {
    console.error(`CHYBA: ${(e as Error).message}`)
    process.exit(1)
  }
}
```

V `package.json` do `scripts` za `"usda"`:

```json
    "usda": "tsx scripts/usda-lookup.ts",
    "serve": "tsx scripts/serve.ts"
```

- [ ] **Step 4: Ověřit testy a skutečné spuštění**

Run: `npx vitest run scripts/serve.test.ts`
Expected: PASS.

Run: `git check-ignore userdata/user-state.json`
Expected: vypíše `userdata/user-state.json` (složka je mimo git).

Run: `mv dist dist.bak 2>/dev/null; PORT=8799 npm run serve; mv dist.bak dist 2>/dev/null`
Expected: `CHYBA: chybí dist/index.html – nejdřív spusťte npm run build`, návratový kód 1.

Run: `npm run build && (PORT=8799 npm run serve &) && sleep 2 && curl -s localhost:8799/api/health && curl -s -o /dev/null -w '%{http_code} %{content_type}\n' localhost:8799/ ; pkill -f "tsx scripts/serve.ts"`
Expected: výpis `Kuchařka běží: http://localhost:8799` + řádky `telefon na stejné Wi-Fi: http://192.168.…:8799`, pak `{"ok":true}` a `200 text/html; charset=utf-8`. (Žádný PUT – `userdata/` se nemění.)

Run: `npm test && npm run build && npm run lint`
Expected: bez chyb.

- [ ] **Step 5: Commit**

```bash
git add scripts/serve.ts scripts/serve.test.ts package.json
git commit -m "feat(server): /api/state s atomickým zápisem do userdata a npm run serve"
```

---

### Task 7: Záloha – název souboru, serializace, kontrola importu, stažení

**Files:**
- Create: `src/state/backup.ts`
- Test: `src/state/backup.test.ts`

**Interfaces:**
- Consumes: `parseUserState`, `UserState` (Task 1).
- Produces:
  - `export const MAX_BACKUP_BYTES = 1_000_000`
  - `export function backupFileName(date: Date): string` → `kucharka-data-YYYY-MM-DD.json` (místní datum)
  - `export function serializeBackup(state: UserState): string` (pretty JSON + `\n`)
  - `export type BackupResult = { ok: true; state: UserState } | { ok: false; error: string }`
  - `export function parseBackup(text: string): BackupResult`
  - `export function backupSummary(state: UserState): string`
  - `export function readFileText(file: Blob): Promise<string>` (FileReader – funguje v prohlížeči i jsdom)
  - `export function downloadText(fileName: string, text: string): void` (Blob + dočasné `<a download>`)

- [ ] **Step 1: Napsat padající test**

`src/state/backup.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { backupFileName, backupSummary, downloadText, parseBackup, readFileText, serializeBackup } from './backup';
import { DEFAULT_USER_STATE, toggleCart, toggleFavorite } from './userState';

describe('backupFileName', () => {
  it('místní datum s nulami', () => {
    expect(backupFileName(new Date(2026, 9, 15, 23, 59))).toBe('kucharka-data-2026-10-15.json');
    expect(backupFileName(new Date(2027, 0, 5))).toBe('kucharka-data-2027-01-05.json');
  });
});

describe('serializeBackup + parseBackup', () => {
  it('round-trip vrátí stejný stav', () => {
    const s = toggleCart(toggleFavorite(DEFAULT_USER_STATE, 'a'), 'b');
    const text = serializeBackup(s);
    expect(text.endsWith('}\n')).toBe(true);
    expect(text).toContain('\n  "version": 1');
    expect(parseBackup(text)).toEqual({ ok: true, state: s });
  });

  it('ne-JSON a cizí JSON odmítne s českou hláškou', () => {
    expect(parseBackup('{nejson')).toEqual({ ok: false, error: 'Soubor není platný JSON.' });
    for (const text of ['{"foo":1}', '[1,2]', '{"version":2}', 'null']) {
      expect(parseBackup(text)).toEqual({ ok: false, error: 'Soubor není záloha kuchařky (chybí „version“: 1).' });
    }
  });
});

describe('backupSummary', () => {
  it('shrne obsah zálohy', () => {
    const s = toggleCart(toggleFavorite(toggleFavorite(DEFAULT_USER_STATE, 'a'), 'b'), 'c');
    expect(backupSummary(s)).toBe('oblíbené: 2 · uvařené: 0 · v košíku: 1 · dospělí: 2 · děti: 0');
  });
});

describe('readFileText', () => {
  it('přečte soubor jako UTF-8', async () => {
    await expect(readFileText(new File(['{"a":"č"}'], 'x.json', { type: 'application/json' }))).resolves.toBe('{"a":"č"}');
  });
});

describe('downloadText', () => {
  afterEach(() => vi.restoreAllMocks());

  it('stáhne Blob přes dočasný odkaz s atributem download a odkaz uklidí', async () => {
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => {
      blob = b;
      return 'blob:test';
    });
    URL.revokeObjectURL = vi.fn();
    let clicked: { href: string; download: string; inDom: boolean } | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked = { href: this.href, download: this.download, inDom: document.body.contains(this) };
    });
    downloadText('kucharka-data-2026-10-15.json', '{"version":1}');
    expect(clicked).toEqual({ href: 'blob:test', download: 'kucharka-data-2026-10-15.json', inDom: true });
    expect(document.querySelector('a[download]')).toBeNull();
    expect(blob?.type).toBe('application/json');
    await expect(readFileText(blob!)).resolves.toBe('{"version":1}');
  });
});
```

- [ ] **Step 2: Ověřit, že test padá**

Run: `npx vitest run src/state/backup.test.ts`
Expected: FAIL – `Failed to resolve import "./backup"`.

- [ ] **Step 3: Implementace**

`src/state/backup.ts`:

```ts
import { parseUserState } from './userState';
import type { UserState } from './userState';

/** Stejný limit jako tělo PUT na serveru (MAX_BODY_BYTES ve scripts/serve.ts). */
export const MAX_BACKUP_BYTES = 1_000_000;

const pad = (n: number) => String(n).padStart(2, '0');

export function backupFileName(date: Date): string {
  return `kucharka-data-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

/** Záloha = přesně UserState, stejný formát jako userdata/user-state.json (ruling R8). */
export function serializeBackup(state: UserState): string {
  return `${JSON.stringify(state, null, 2)}\n`;
}

export type BackupResult = { ok: true; state: UserState } | { ok: false; error: string };

export function parseBackup(text: string): BackupResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Soubor není platný JSON.' };
  }
  const state = parseUserState(raw);
  return state ? { ok: true, state } : { ok: false, error: 'Soubor není záloha kuchařky (chybí „version“: 1).' };
}

export function backupSummary(s: UserState): string {
  return `oblíbené: ${s.favorites.length} · uvařené: ${s.cooked.length} · v košíku: ${s.cart.length} · dospělí: ${s.people.adults} · děti: ${s.people.children}`;
}

export function readFileText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Soubor nejde přečíst.'));
    reader.readAsText(file, 'utf-8');
  });
}

/** Stažení textu jako souboru (bez serveru): Blob + dočasný odkaz s atributem download. */
export function downloadText(fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Safari potřebuje URL ještě chvíli po kliknutí
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

- [ ] **Step 4: Ověřit**

Run: `npx vitest run src/state/backup.test.ts`
Expected: PASS.

Run: `npm test && npm run build && npm run lint`
Expected: bez chyb.

- [ ] **Step 5: Commit**

```bash
git add src/state/backup.ts src/state/backup.test.ts
git commit -m "feat(stav): export a kontrola zálohy JSON"
```

---

### Task 8: Panel „Data a ukládání“ v tiráži

**Files:**
- Create: `src/pages/StoragePanel.tsx`
- Modify: `src/pages/SettingsPage.tsx` (prop `children`, odstranit `settings-later`)
- Modify: `src/pages/labels.ts` (konce souboru: `STORAGE_MODE_LABEL`, `STORAGE_MODE_HINT`)
- Modify: `src/styles/paper.css:287` (smazat `.settings-later`, přidat styly panelu)
- Test: `src/pages/StoragePanel.test.tsx`, `src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `StorageMode` (Task 2), `backupFileName`, `backupSummary`, `downloadText`, `MAX_BACKUP_BYTES`, `parseBackup`, `readFileText`, `serializeBackup` (Task 7).
- Produces:
  - `export function StoragePanel(props: { state: UserState; mode: StorageMode; onRetry: () => Promise<void>; onImport: (state: UserState) => void; now?: () => Date })`
  - `SettingsPage` props: `{ settings; onChange; children?: ReactNode }` (panel se vkládá jako `children`, ruling R11)
  - `export const STORAGE_MODE_LABEL: Record<StorageMode, string>`, `export const STORAGE_MODE_HINT: Record<StorageMode, string>` v `labels.ts`

- [ ] **Step 1: Napsat padající testy**

`src/pages/StoragePanel.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { MAX_BACKUP_BYTES, readFileText } from '@/state/backup'
import type { StorageMode } from '@/state/storage'
import { DEFAULT_USER_STATE, toggleFavorite, type UserState } from '@/state/userState'
import { StoragePanel } from './StoragePanel'

afterEach(() => vi.restoreAllMocks())

function setup(mode: StorageMode = 'local', onRetry: () => Promise<void> = async () => {}) {
  const onImport = vi.fn<(s: UserState) => void>()
  const state = toggleFavorite(DEFAULT_USER_STATE, 'r1')
  const utils = render(<StoragePanel state={state} mode={mode} onRetry={onRetry} onImport={onImport} now={() => new Date(2026, 9, 15)} />)
  return { ...utils, onImport, state, user: userEvent.setup() }
}

const jsonFile = (text: string, name = 'zaloha.json') => new File([text], name, { type: 'application/json' })

test('režim ukládání: text, nápověda a tlačítko obnovení jen mimo režim server', () => {
  const { rerender, onImport } = setup('local')
  expect(screen.getByRole('heading', { level: 3, name: 'Data a ukládání' })).toBeInTheDocument()
  expect(screen.getByText('jen v tomto prohlížeči')).toBeInTheDocument()
  expect(screen.getByText(/npm run serve/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Zkusit server znovu' })).toBeInTheDocument()
  rerender(<StoragePanel state={DEFAULT_USER_STATE} mode="server" onRetry={async () => {}} onImport={onImport} />)
  expect(screen.getByText('server (soubor userdata/user-state.json)')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Zkusit server znovu' })).toBeNull()
  rerender(<StoragePanel state={DEFAULT_USER_STATE} mode="server-unavailable" onRetry={async () => {}} onImport={onImport} />)
  expect(screen.getByText('server nedostupný – ukládá se jen v tomto prohlížeči')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Zkusit server znovu' })).toBeInTheDocument()
})

test('Zkusit server znovu: během pokusu zakázané tlačítko', async () => {
  let finish!: () => void
  const onRetry = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)))
  const { user } = setup('server-unavailable', onRetry)
  await user.click(screen.getByRole('button', { name: 'Zkusit server znovu' }))
  expect(onRetry).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: 'Zkouším server…' })).toBeDisabled()
  await act(async () => finish())
  expect(screen.getByRole('button', { name: 'Zkusit server znovu' })).toBeEnabled()
})

test('Exportovat data stáhne kucharka-data-YYYY-MM-DD.json s aktuálním stavem', async () => {
  let blob: Blob | undefined
  URL.createObjectURL = vi.fn((b: Blob) => {
    blob = b
    return 'blob:test'
  })
  URL.revokeObjectURL = vi.fn()
  let download = ''
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    download = this.download
  })
  const { user, state } = setup()
  await user.click(screen.getByRole('button', { name: 'Exportovat data' }))
  expect(download).toBe('kucharka-data-2026-10-15.json')
  expect(JSON.parse(await readFileText(blob!))).toEqual(state)
  expect(screen.getByRole('status')).toHaveTextContent('Staženo: kucharka-data-2026-10-15.json')
})

test('Import platné zálohy: souhrn a přepsání až po potvrzení', async () => {
  const { user, onImport } = setup()
  const backup = { ...DEFAULT_USER_STATE, favorites: ['x', 'y'], cart: [{ recipeId: 'z', multiplier: 2 }] }
  await user.upload(screen.getByLabelText('Importovat data…'), jsonFile(JSON.stringify(backup)))
  const confirm = await screen.findByRole('group', { name: 'Potvrzení importu' })
  expect(confirm).toHaveTextContent('„zaloha.json“')
  expect(confirm).toHaveTextContent('oblíbené: 2 · uvařené: 0 · v košíku: 1')
  expect(onImport).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Přepsat data' }))
  expect(onImport).toHaveBeenCalledWith(backup)
  expect(screen.queryByRole('group', { name: 'Potvrzení importu' })).toBeNull()
  expect(screen.getByRole('status')).toHaveTextContent('Data byla importována.')
})

test('Import lze zrušit', async () => {
  const { user, onImport } = setup()
  await user.upload(screen.getByLabelText('Importovat data…'), jsonFile('{"version":1}'))
  await user.click(await screen.findByRole('button', { name: 'Zrušit' }))
  expect(screen.queryByRole('group', { name: 'Potvrzení importu' })).toBeNull()
  expect(onImport).not.toHaveBeenCalled()
})

test('Import neplatného, cizího nebo příliš velkého souboru ukáže chybu a nic nepřepíše', async () => {
  const { user, onImport } = setup()
  const input = screen.getByLabelText('Importovat data…')
  await user.upload(input, jsonFile('{nejson'))
  expect(await screen.findByRole('alert')).toHaveTextContent('Soubor není platný JSON.')
  await user.upload(input, jsonFile('{"foo":1}'))
  expect(await screen.findByRole('alert')).toHaveTextContent('Soubor není záloha kuchařky')
  await user.upload(input, jsonFile('x'.repeat(MAX_BACKUP_BYTES + 1)))
  expect(await screen.findByRole('alert')).toHaveTextContent('Soubor je příliš velký (nejvýš 1 MB).')
  expect(screen.queryByRole('group', { name: 'Potvrzení importu' })).toBeNull()
  expect(onImport).not.toHaveBeenCalled()
})
```

V `src/pages/SettingsPage.test.tsx` nahradit třetí test:

```tsx
test('přepínač historických surovin a panel ukládání jako obsah tiráže', () => {
  const onChange = vi.fn()
  render(
    <SettingsPage settings={{ childCoef: 0.8, historicalIngredients: false }} onChange={onChange}>
      <p>panel ukládání</p>
    </SettingsPage>,
  )
  const box = screen.getByRole('checkbox', { name: /Historické suroviny/ })
  expect(box).not.toBeChecked()
  fireEvent.click(box)
  expect(onChange).toHaveBeenCalledWith({ historicalIngredients: true })
  expect(screen.getByText('panel ukládání')).toBeInTheDocument()
  expect(screen.queryByText(/fázi 7/)).toBeNull()
})
```

- [ ] **Step 2: Ověřit, že testy padají**

Run: `npx vitest run src/pages/StoragePanel.test.tsx src/pages/SettingsPage.test.tsx`
Expected: FAIL – `./StoragePanel` neexistuje; v `SettingsPage` se `children` nevykreslí a text o fázi 7 tam je.

- [ ] **Step 3: Implementace**

Na konec `src/pages/labels.ts` (a nahoru `import type { StorageMode } from '@/state/storage'`):

```ts
/** Režim ukládání v tiráži (spec §5.2). */
export const STORAGE_MODE_LABEL: Record<StorageMode, string> = {
  local: 'jen v tomto prohlížeči',
  server: 'server (soubor userdata/user-state.json)',
  'server-unavailable': 'server nedostupný – ukládá se jen v tomto prohlížeči',
}

export const STORAGE_MODE_HINT: Record<StorageMode, string> = {
  local: 'Na jiném zařízení data neuvidíte. Pro sdílení s telefonem spusťte na počítači „npm run serve“ a otevřete adresu, kterou vypíše.',
  server: 'Změny se ukládají na počítač se serverem a zároveň do tohoto prohlížeče.',
  'server-unavailable': 'Změny zůstávají v tomto prohlížeči a na server se odešlou, až bude zase dostupný.',
}
```

`src/pages/StoragePanel.tsx`:

```tsx
import { useId, useState } from 'react'
import type { ChangeEvent } from 'react'
import { backupFileName, backupSummary, downloadText, MAX_BACKUP_BYTES, parseBackup, readFileText, serializeBackup } from '@/state/backup'
import type { StorageMode } from '@/state/storage'
import type { UserState } from '@/state/userState'
import { STORAGE_MODE_HINT, STORAGE_MODE_LABEL } from './labels'

interface Props {
  state: UserState
  mode: StorageMode
  onRetry: () => Promise<void>
  onImport: (state: UserState) => void
  now?: () => Date
}

interface Message {
  kind: 'ok' | 'error'
  text: string
}

/** Tiráž: režim ukládání, obnovení serveru, export a import zálohy (spec §2 bod 6, §5.2). */
export function StoragePanel({ state, mode, onRetry, onImport, now = () => new Date() }: Props) {
  const headingId = useId()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const [pending, setPending] = useState<{ state: UserState; fileName: string } | null>(null)

  const retry = async () => {
    setBusy(true)
    try {
      await onRetry()
    } finally {
      setBusy(false)
    }
  }

  const exportData = () => {
    const name = backupFileName(now())
    downloadText(name, serializeBackup(state))
    setMessage({ kind: 'ok', text: `Staženo: ${name}` })
  }

  const chooseFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const file = input.files?.[0]
    input.value = '' // stejný soubor půjde vybrat znovu
    if (!file) return
    setPending(null)
    if (file.size > MAX_BACKUP_BYTES) {
      setMessage({ kind: 'error', text: 'Soubor je příliš velký (nejvýš 1 MB).' })
      return
    }
    const result = parseBackup(await readFileText(file))
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error })
      return
    }
    setMessage(null)
    setPending({ state: result.state, fileName: file.name })
  }

  const confirmImport = () => {
    if (!pending) return
    onImport(pending.state)
    setPending(null)
    setMessage({ kind: 'ok', text: 'Data byla importována.' })
  }

  return (
    <section className="storage-panel" aria-labelledby={headingId}>
      <h3 id={headingId}>Data a ukládání</h3>
      <p className="storage-mode" data-mode={mode}>
        Režim ukládání: <strong>{STORAGE_MODE_LABEL[mode]}</strong>
      </p>
      <p className="settings-hint">{STORAGE_MODE_HINT[mode]}</p>
      {mode !== 'server' && (
        <button type="button" className="cart-button" onClick={() => void retry()} disabled={busy}>
          {busy ? 'Zkouším server…' : 'Zkusit server znovu'}
        </button>
      )}
      <div className="storage-actions">
        <button type="button" className="cart-button" onClick={exportData}>
          Exportovat data
        </button>
        <label className="cart-button storage-import">
          Importovat data…
          <input type="file" accept="application/json,.json" className="visually-hidden" onChange={(e) => void chooseFile(e)} />
        </label>
      </div>
      {pending && (
        <div className="storage-confirm" role="group" aria-label="Potvrzení importu">
          <p>
            Import přepíše všechna data kuchařky (oblíbené, uvařené, košík, osoby a nastavení) obsahem souboru „{pending.fileName}“: {backupSummary(pending.state)}.
          </p>
          <div className="storage-actions">
            <button type="button" className="cart-button" onClick={confirmImport}>
              Přepsat data
            </button>
            <button type="button" className="settings-reset" onClick={() => setPending(null)}>
              Zrušit
            </button>
          </div>
        </div>
      )}
      {message && (
        <p className={`storage-message storage-message--${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}
    </section>
  )
}
```

V `src/pages/SettingsPage.tsx`: import `import type { ReactNode } from 'react'`, do `Props` přidat `children?: ReactNode`, podpis `export function SettingsPage({ settings, onChange, children }: Props)` a řádek

```tsx
      <p className="settings-later">Export a import dat a režim ukládání přibudou ve fázi 7.</p>
```

nahradit

```tsx
      {children}
```

Komentář funkce změnit na `/** Tiráž = nastavení (spec §2 bod 6): koeficient dítěte, cílové kalorie, historické suroviny; panel ukládání přes children. */`.

V `src/styles/paper.css` smazat řádek `.settings-later { … }` a za `.settings-check` vložit:

```css
.storage-panel { margin-top: 1.2em; max-width: 26rem; font-family: var(--font-table); font-size: 0.85em; }
.storage-panel h3 { margin: 0 0 0.3em; font-family: var(--font-body); font-size: 1.2em; }
.storage-mode { margin: 0.2em 0; }
.storage-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin: 0.5em 0; }
.storage-import { position: relative; display: inline-block; }
.storage-import:focus-within { outline: 2px solid var(--ink); outline-offset: 2px; }
.storage-confirm { margin: 0.5em 0; padding: 0.5em 0.7em; border: 1px dashed var(--ink-soft); overflow-wrap: anywhere; }
.storage-confirm p { margin: 0; }
.storage-message { margin: 0.3em 0; overflow-wrap: anywhere; }
.storage-message--error { color: #8c2a22; }
```

- [ ] **Step 4: Ověřit**

Run: `npx vitest run src/pages/StoragePanel.test.tsx src/pages/SettingsPage.test.tsx`
Expected: PASS.

Run: `npm test && npm run build && npm run lint`
Expected: bez chyb.

- [ ] **Step 5: Commit**

```bash
git add src/pages/StoragePanel.tsx src/pages/StoragePanel.test.tsx src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx src/pages/labels.ts src/styles/paper.css
git commit -m "feat(tiráž): režim ukládání, obnovení serveru, export a import dat"
```

---

### Task 9: Zapojení do aplikace a odznak „server nedostupný“

**Files:**
- Modify: `src/App.tsx` (importy, destrukturace `useUserState`, případ `'settings'`, závislosti `useMemo` stránek, odznak v `<main>`, `App()`)
- Modify: `src/pages/labels.ts` (`STORAGE_OFFLINE_BADGE`)
- Modify: `src/styles/paper.css` (`.storage-badge`)
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `detectServer` (Task 3), `storageMode`, `retryServer`, `replaceState` z `useUserState` + prop `connect` (Task 4), `StoragePanel`, `SettingsPage` s `children` (Task 8).
- Produces: `export const STORAGE_OFFLINE_BADGE = 'Server nedostupný – ukládá se jen sem'`; v `<main>` při `storageMode === 'server-unavailable'` `<p className="storage-badge" role="status">`.

- [ ] **Step 1: Napsat padající test**

V `src/App.test.tsx` doplnit import `waitFor` z `@testing-library/react`; do `beforeEach` přidat (žádný test nesmí sahat na síť):

```tsx
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
```

za `beforeEach`:

```tsx
afterEach(() => vi.unstubAllGlobals())
```

a na konec souboru:

```tsx
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
  history.replaceState(null, '', '#/nastaveni')
  render(<App />)
  expect(await screen.findByText('Server nedostupný – ukládá se jen sem')).toBeInTheDocument()
  expect(puts).toHaveLength(1)
  expect(screen.getByText('server nedostupný – ukládá se jen v tomto prohlížeči')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('checkbox', { name: /Historické suroviny/ }))
  await waitFor(() => expect(window.localStorage.getItem('kucharka.userState.v1')).toContain('"historicalIngredients":true'))
})
```

- [ ] **Step 2: Ověřit, že test padá**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL – nové testy nenajdou texty režimu (App nepředává `connect` a tiráž nemá panel); stávající testy procházejí.

- [ ] **Step 3: Implementace**

Na konec `src/pages/labels.ts`:

```ts
/** Odznak mimo tiráž, když server přestal odpovídat (ruling R10). */
export const STORAGE_OFFLINE_BADGE = 'Server nedostupný – ukládá se jen sem'
```

V `src/App.tsx`:

1. Importy přidat:

```tsx
import { STORAGE_OFFLINE_BADGE } from '@/pages/labels'
import { StoragePanel } from '@/pages/StoragePanel'
import { detectServer } from '@/state/serverStorage'
```

2. Destrukturaci nahradit:

```tsx
  const { state, toggleFavorite, toggleCooked, toggleCart, setCartMultiplier, removeFromCart, setPeople, setDayFactor, updateSettings, storageMode, retryServer, replaceState } = useUserState()
```

3. Případ `'settings'` nahradit:

```tsx
        case 'settings':
          return {
            id: entry.id,
            render: () => (
              <SettingsPage settings={state.settings} onChange={updateSettings}>
                <StoragePanel state={state} mode={storageMode} onRetry={retryServer} onImport={replaceState} />
              </SettingsPage>
            ),
          }
```

4. Pole závislostí `useMemo` stránek: `state.settings` nahradit `state` a na konec přidat `storageMode, retryServer, replaceState` (export potřebuje celý stav):

```tsx
  }, [layout, recipes, ingredients, recipeById, filter, favorites, cooked, inCart, portions, historical, navigate, toggleFavorite, toggleCooked, toggleCart, state, updateSettings, setPeople, setCartMultiplier, removeFromCart, shoppingList, print, storageMode, retryServer, replaceState])
```

5. V `<main>` hned za `<BookControls>…</BookControls>`:

```tsx
        {storageMode === 'server-unavailable' && (
          <p className="storage-badge" role="status">
            {STORAGE_OFFLINE_BADGE}
          </p>
        )}
```

6. `App()`:

```tsx
export function App() {
  return (
    <UserStateProvider connect={detectServer}>
      <Library />
    </UserStateProvider>
  )
}
```

V `src/styles/paper.css` za styly `.book-controls` vložit:

```css
/* odznak „server nedostupný“ (ruling R10): drobný, neklikatelný, mimo ovládání knihy */
.storage-badge {
  position: fixed; left: 0.6rem; bottom: 0.6rem; z-index: 20; max-width: calc(100vw - 1.2rem); margin: 0;
  padding: 0.25em 0.6em; font-family: var(--font-table); font-size: 0.75rem; color: var(--paper);
  background: #8c2a22; border-radius: 3px; pointer-events: none;
}
@media print { .storage-badge { display: none; } }
```

- [ ] **Step 4: Ověřit**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS – nové i všechny stávající testy (fetch je zastavený, detekce skončí lokálně).

Run: `npm test && npm run build && npm run lint`
Expected: bez chyb.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/pages/labels.ts src/styles/paper.css
git commit -m "feat(aplikace): detekce serveru, panel ukládání v tiráži a odznak offline"
```

---

### Task 10: Ruční kontrola se skutečným serverem (agent-browser) a opravy nálezů

**Files:** podle nálezů; zápis do tohoto plánu pod „Nálezy z ruční kontroly“ (na konec souboru). Pomocné soubory jen ve scratchpadu (`…/scratchpad/t10/`), ne v repu.

Implementátor použije skill `agent-browser` (nejdřív `agent-browser skills get core`). Interakce vždy **reálným vstupem** (`agent-browser click`, `fill`, `press`, `upload`, `download`); `eval` jen na čtení DOM, měření a `localStorage.clear()`. Před kliknutím na prvek u okraje ověřit `document.elementFromPoint(střed)` === cílový prvek. `agent-browser set media light reduced-motion`. Desktop `set viewport 1390 800`, mobil `390 844` a `320 568`, po změně viewportu `reload`.

- [ ] **Step 1: Záloha dat a spuštění (ruling R12)**

```bash
T=<scratchpad>/t10; mkdir -p "$T"
[ -f userdata/user-state.json ] && cp userdata/user-state.json "$T/user-state.original.json" || echo "neexistoval" > "$T/original-neexistoval"
npm run build
PORT=$(node -e "const s=require('net').createServer().listen(0,()=>{console.log(s.address().port);s.close()})")
PORT=$PORT npm run serve   # na pozadí; výpis zapsat do „Naměřeno“ (localhost + LAN adresy)
```

- [ ] **Step 2: Režim server a zápis do souboru** – `agent-browser open http://localhost:$PORT/`, `eval "localStorage.clear()"`, `reload`. `#/nastaveni`: „Režim ukládání: server (soubor userdata/user-state.json)“, bez tlačítka „Zkusit server znovu“. `#/recept/michana-vejce` → reálný klik na ikonu košíku; po 1 s `cat userdata/user-state.json` obsahuje `"recipeId": "michana-vejce"`. `eval "localStorage.clear()"` + `reload` → záložka stále „Košík: 1 recept …“ (stav přišel ze souboru, ne z prohlížeče).

- [ ] **Step 3: Server je zdroj pravdy** – při běžícím serveru upravit soubor zvenku: `node -e` přidá do `favorites` `"hovezi-gulas"` (zapsat přes dočasný soubor + `mv`); `reload` → `#/recept/hovezi-gulas` má plné srdíčko.

- [ ] **Step 4: Výpadek serveru** – zastavit server (`pkill -f "tsx scripts/serve.ts"`). V aplikaci reálně přidat do košíku `#/recept/hovezi-gulas`; do 1 s se vlevo dole objeví „Server nedostupný – ukládá se jen sem“ (screenshot; `elementFromPoint` ve středu odznaku není odznak – `pointer-events: none`), kniha jde dál listovat (`press ArrowRight`), tiráž ukazuje „server nedostupný – ukládá se jen v tomto prohlížeči“ a tlačítko „Zkusit server znovu“. `eval "localStorage.getItem('kucharka.userState.v1')"` obsahuje `hovezi-gulas` v košíku.

- [ ] **Step 5: Obnovení** – znovu `PORT=$PORT npm run serve`; v tiráži reálný klik „Zkusit server znovu“ → režim „server …“, odznak zmizí, `userdata/user-state.json` obsahuje oba recepty v košíku (neodeslaná změna vyhrála, ruling R2a).

- [ ] **Step 6: Export** – `agent-browser download "text=Exportovat data" "$T/export.json"` (pokud `download` neumí selektor textem, použít ref ze `snapshot -i`). Ověřit: název stažení `kucharka-data-<dnešní datum>.json` (hláška „Staženo: …“ v panelu), `node -e` porovná `export.json` s `userdata/user-state.json` → shodné (stejný formát, ruling R8).

- [ ] **Step 7: Import** – reálně odebrat oba recepty z košíku (stránka košíku), pak `agent-browser upload "input[type=file]" "$T/export.json"` → zobrazí se „Potvrzení importu“ se souhrnem „v košíku: 2“; klik „Zrušit“ → nic se nezmění; znovu upload → klik „Přepsat data“ → „Data byla importována.“, záložka „Košík: 2 recepty …“, po 1 s soubor na serveru obsahuje oba recepty. Upload souboru `{"foo":1}` (vytvořit v `$T`) → `role=alert` „Soubor není záloha kuchařky …“, data beze změny.

- [ ] **Step 8: Telefon v síti** – `curl -s http://<LAN IP z výpisu>:$PORT/api/health` → `{"ok":true}` (server naslouchá na 0.0.0.0). Zapsat do „Naměřeno“.

- [ ] **Step 9: Mobil 390×844 a 320×568** – `#/nastaveni`: `eval "[document.documentElement.scrollWidth, innerWidth]"` → shodné; tlačítka „Exportovat data“, „Importovat data…“, „Zkusit server znovu“ (při zastaveném serveru) se zalamují a nepřekrývají; potvrzení importu s dlouhým názvem souboru (`$T/kucharka-data-velmi-dlouhy-nazev-souboru-pro-test-zalamovani.json`) se zalomí; odznak offline při 320 px nepřekrývá text stránky tak, že by nešel číst (screenshot).

- [ ] **Step 10: Úklid, opravy a zápis** – `agent-browser close`, zastavit server, vrátit `userdata/user-state.json` ze zálohy (nebo smazat, pokud předtím neexistoval) a smazat případné `user-state.json.poskozeny-*` vzniklé při kontrole. Každý nález opravit s testem tam, kde to jde, a zapsat pod „Nálezy z ruční kontroly“ (číslo, nález, soubor, oprava, ověření) + „Odloženo (s důvodem)“ a „Naměřeno“. Nakonec `npm test && npm run build && npm run lint && npm run validate`.

- [ ] **Step 11: Commit**

```bash
git add <změněné soubory> docs/superpowers/plans/2026-10-15-phase7-storage.md
git commit -m "fix(ukládání): nálezy z ruční kontroly fáze 7"
```

## Pokrytí specu (self-review)

| Požadavek | Task |
|---|---|
| §5.2 `StorageAdapter` `load()/save(state)` | 2 |
| §5.2 `LocalStorageAdapter` výchozí (dnešní chování: zod, flush na beforeunload/pagehide, paměť při zablokovaném úložišti) | 1, 2, 4 |
| §5.2 `FileServerAdapter`: `GET/PUT /api/state` | 3, 6 |
| §5.2 `npm run serve`, soubor `userdata/user-state.json`, `userdata/` mimo git | 6 |
| §5.2 auto-detekce přes `GET /api/health` | 3, 5, 9 |
| §5.2 export/import JSON vždy (i bez serveru) | 7, 8, 9 |
| §6 Node server zpřístupní web i na domácí síti pro telefon (0.0.0.0, LAN adresy) | 5, 6, 10 |
| §6 build přenositelný (server jen servíruje `dist/`, nic neměnit ve Vite) | 5 |
| §2 bod 6 tiráž: export/import, režim ukládání | 8, 9 |
| §1 bez účtů, bez povinného serveru (lokální režim bez serveru) | 3, 4, 9 |
| Konflikty (zadání bod 4): server zdroj pravdy, lokální cache, přechod local→server | 4 (R2) |
| Ruční kontrola: build + serve, košík → soubor, reload, výpadek, export, import, mobil 390 | 10 |

Kontrola konzistence typů: `StorageMode`, `StorageAdapter`, `StorageLike` (Task 2) se používají v Tasku 3, 4, 8; `FetchFn`, `FileServerAdapter`, `detectServer` (Task 3) v Tasku 6 (test) a 9; `parseUserState` (Task 1) v Tasku 3, 6, 7; `MAX_BACKUP_BYTES` (Task 7) = `MAX_BODY_BYTES` (Task 5) = 1 000 000; texty `STORAGE_MODE_LABEL` (Task 8) a `STORAGE_OFFLINE_BADGE` (Task 9) odpovídají řetězcům v testech App.

Mimo fázi 7: autentizace serveru (domácí síť, R6); slučování stavů z více zařízení (poslední zápis vyhrává, R2); trvalý příznak neodeslaných změn mezi relacemi (R2); periodické dotazování serveru (R5); proxy `/api` ve `vite dev` (dev běží lokálně); vlastní recepty (fáze 8).

## Nálezy z ruční kontroly

Ruční kontrola agent-browserem (HEAD 961d27a), server na PORT=49195, LAN 192.168.0.202.

**Nálezy:** žádné nové, nic neopraveno. Kroky 2–9 prošly (režim server, zápis košíku do souboru, server jako zdroj pravdy, výpadek + odznak s pointer-events none, obnova s neodeslanou změnou, export shodný se souborem, import vč. Zrušit a chybného souboru, mobil 390 a 320 bez horizontálního přetečení).

**Odloženo:** nic.

**Naměřeno:** `curl http://192.168.0.202:49195/api/health` vrací `{"ok":true}`; odznak při 320 px má bottom 558 z 568, vlevo od šipky stránky, nečitelnost nenastala; scrollWidth == innerWidth při 1390, 390 i 320; testy 620/620, lint, validate, build bez chyb.
