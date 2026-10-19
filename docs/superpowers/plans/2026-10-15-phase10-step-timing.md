# Fáze 10: Časování kroků (stopky) – implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zapracovat všechny body **[R3]** ze specu (§2 recept, §5.1 data, §8 bod 10): každý krok postupu nese dobu (`minutes`) a příznak souběžnosti (`parallel`), u každého kroku je v knize i v tisku značka stopek (čas začátku kroku ve formátu `0:00` / `35:00` / `1:10:00`, u souběžného „mezitím“), pod postupem „Hotovo: 50:00“, nad postupem malé stopky v aplikaci se zvýrazněním běžícího kroku; formulář vlastního receptu přijme prefix `15 min:` / `mezitím:`; validátor a `check:recipe` hlídají časy; všech 78 receptů dostane časy (skript + dávka agentů) a skill `recipe-digitize` od teď zapisuje kroky s časem.

**Architecture:** Schéma `steps` přijme řetězec i objekt `{ text, minutes?, parallel? }` a vždy vrací objekty (`transform`), takže starší vlastní recepty, import i data před migrací fungují beze změny formátu úložiště. Čistá funkce `stepTimeline` v `src/domain/steps.ts` (jen relativní importy, používají ji i skripty) spočítá začátky kroků a „Hotovo“; `currentStepIndex` z ní odvodí krok, který podle stopek běží. Značky vykresluje jedna komponenta `StepTime` (kniha i tisk; brožurka ji dostane přes `RecipePrintStep`). Stopky jsou hook `useStopwatch` (stav jen v `useState`, čas z `Date.now()`, tik `setInterval` 1 s) volaný v `RecipeMethod`, takže je má pravá strana dvoustrany i jediná stránka na mobilu, levá strana a tisk ne. Skript `scripts/step-times.ts` navrhne minuty z textu a umí přepsat jen pole `steps` v souboru; zbytek doplní dávka Haiku agentů.

**Tech Stack:** Vite 8, React 19, TypeScript 6, zod 4, Vitest 4 + Testing Library + user-event 14 (jsdom, `css: false`, `globals: true`), oxlint, tsx (skripty). Bez UI knihovny, bez nové npm závislosti. Ruční kontrola skillem `agent-browser` (reálný pointer, dotyk přes CDP, PDF přes CDP `Page.printToPDF`).

**Spec:** `docs/superpowers/specs/2026-10-14-cookbook-design.md` – body **[R3]** v §2 (recept: „Časování kroků (stopky)“), §5.1 („Kroky s časem“), §7 (časování kroků vyřazené z backlogu) a §8 bod 10. [R3] má přednost před starším textem specu (např. §5.1 `steps: string[]`). Navazuje na HEAD `0b29217` (fáze 1–9 sloučené, spec [R3]). Tvarem a konvencemi navazuje na plán fáze 9 `docs/superpowers/plans/2026-10-15-phase9-ux-revision-2.md`; dávkování agentů podle `.claude/skills/recipe-digitize/reference/batch.md`.

## Global Constraints

- Čeština s diakritikou v UI, v datech, v hláškách skriptů i v commitech; identifikátory anglicky. Bez UI knihovny. **Žádná nová npm závislost.**
- **Implementátoři necommitují.** Každý task končí krokem „Předat controlleru“ se seznamem změněných souborů. Commit dělá controller (zpráva česky s diakritikou, explicitní `git add <soubory>`, nikdy `-A`, smazané soubory přes `git rm`).
- Po každém tasku musí projít čistě `npm test`, `npm run lint`, `npm run build` a `npm run validate` (0 × `CHYBA`; nová varování o časech kroků jsou do Tasku 8 očekávaná).
- Soubory v `src/domain/` a `src/state/userState.ts` importují jen relativně (skripty je kompilují přes `tsconfig.scripts.json` bez aliasu `@`). Skripty v `scripts/` importují z `src/` jen relativně a jen z `src/domain/` (+ dosavadní `src/content/derivedTags`, `src/content/books`).
- Podle oxlint `react/only-export-components` patří ne-komponentové exporty (hooky, konstanty, funkce) do `.ts` souborů; `.tsx` exportuje jen komponenty.
- Testy Vitest + Testing Library pro každou čistou funkci a komponentu. Testy UI časování používají **syntetické kroky** (`{ ...recept, steps: [...] }`), ne data receptů – data se mění až v Tasku 8. Testy, které čtou skutečná data (`RecipePrint.test.tsx`), počítají očekávání přes `stepTimeline`, aby prošly před migrací i po ní.
- Formát dat (spec §5.1 [R3]): krok je `{ "text": string, "minutes"?: celé číslo ≥ 1, "parallel"?: true }`; soubory v `data/recipes/` mají po Tasku 8 kroky **vždy** jako objekty; schéma přijme i prostý řetězec a normalizuje ho na `{ text }`. Klíče kroku v souboru v pořadí `text`, `minutes`, `parallel`, jeden krok na řádek, 4 mezery odsazení (jako řádky surovin).
- Formát stopek: `0:00`, `5:00`, `35:00`, od hodiny `1:10:00` (minuty i sekundy dvoumístně za dvojtečkou); uplynulý čas stopek `m:ss`, od hodiny `h:mm:ss`.
- Hash routy (`src/app/route.ts`), layout knihy (`buildLayout`), režim `single`/`spread` (`useViewMode`) a pořadí stránek se **nemění**.
- Stopky: jen v knize nad postupem (pravá strana dvoustrany, na mobilu jediná stránka receptu), ne na levé straně, ne v tiskovém stromu, v `@media print` skryté. Stav jen v paměti komponenty (po odchodu ze stránky nebo přepnutí režimu se ztratí). Žádné zvuky, notifikace, více časovačů, žádný zápis do `localStorage` ani `UserState`.
- Mobil: žádný vodorovný scroll (`document.documentElement.scrollWidth === innerWidth` při 390 i 320 px); značky stopek se nezalamují uvnitř (`white-space: nowrap`).
- Dispatch prompty implementátorů a reviewerů UI tasků (2, 3, 4, 5) obsahují pokyn ověřit výsledek v prohlížeči skillem `agent-browser` reálným pointerem (syntetické události neodhalí chyby hit-testingu; mobil přes viewport 390/320; tab v popředí, jinak časovače a rAF stojí). Reviewer modelem Sonnet (Opus subagenti padali na safeguards).
- Poslední task je ruční kontrola skillem `agent-browser`: desktop 1390×800, mobil 390×844 a 320×568, tisk do PDF přes CDP `Page.printToPDF` s `preferCSSPageSize: true`, stopky reálně běží a zvýrazňují krok.

## Review Focus

1. **Starší uložené kroky jako řetězce** – vlastní recept v `localStorage` z fáze 8, záloha JSON, `userdata/user-state.json`, export „vlastní recepty“ z dřívějška a datové soubory před migrací. Očekávání: vše se načte, kroky se zobrazí, nic se neztratí ani nezahodí jako neplatné; nové uložení zapíše objekty. Testy: Task 1 (`RecipeSchema` normalizace, `validCustomRecipes` se `steps: string[]`, `parseCustomRecipesFile` se staršími kroky).
2. **Stopky v tabu na pozadí, uspaný telefon, zamčená obrazovka** – prohlížeč tiká `setInterval` řidčeji nebo vůbec. Očekávání: po návratu stopky ukazují skutečně uplynulý čas a zvýrazní správný krok (čas se počítá z `Date.now()`, ne z počtu tiků); po odchodu ze stránky žádný interval neběží. Testy: Task 4 („čas se počítá z hodin, ne z počtu tiků“, „po odchodu ze stránky se interval uklidí“).
3. **Nepravidelné časy kroků** – krok bez `minutes` uprostřed postupu (pokyn „Osol.“), `parallel` u prvního kroku, souběžný krok s `minutes`, recept bez jakéhokoli času (vlastní recept, data před migrací), recept delší než hodina. Očekávání: kroky bez času mají začátek následujícího kroku a nikdy se nezvýrazní; první krok je vždy běžný; souběžný krok má „mezitím“ a do „Hotovo“ se nepočítá; recept bez časů nemá značky, „Hotovo“ ani stopky (žádné „0:00“ u všech kroků); `1:10:00`. Testy: Task 1 (`stepTimeline`), Task 2 (značky, bez časů, přes hodinu), Task 4 (`currentStepIndex`).
4. **Text kroku ve formuláři, který jen vypadá jako prefix** – „Mezitím uvař rýži.“ (bez dvojtečky), „Mezitím 2 vejce rozšlehej.“, „1,5 l vody přiveď k varu.“, „15 min“ bez textu, „15 min:“ bez textu, „0 min:“, „601 min:“, velká písmena a mezery („MEZITÍM 10 MIN :“). Očekávání: obyčejný text zůstane textem beze ztráty slov, chybný prefix dá srozumitelnou hlášku u pole Postup, úprava receptu vrátí do pole přesně tytéž prefixy. Testy: Task 5 (`parseStepLine` tabulka, zpáteční cesta, chyby kroků).
5. **Úzký displej 320 px a dlouhé značky** – `1:10:00` u dlouhého kroku, řádek stopek (čas + dvě tlačítka) vedle zvýrazněného kroku, éra Feldkochbuch (verzálky v nadpisech). Očekávání: značka se nezalomí uvnitř, řádek stopek se zalomí celými prvky, nic nepřetéká vodorovně, tlačítka stopek mají ≥ 24 px výšky a `elementFromPoint` = samo tlačítko. Testy: Task 2 (CSS `white-space: nowrap`), Task 4 (CSS `flex-wrap: wrap`, `min-height`), Task 10 (měření na 320 px).

## Rozhodnutí fáze 10 (rulings)

- **R1 – Schéma kroků:** `StepSchema = z.object({ text: z.string().min(1), minutes: z.number().int().min(1).optional(), parallel: z.literal(true).optional() }).strict()`; `steps: z.array(z.union([z.string().min(1), StepSchema])).min(1).transform(řetězec → { text })` (exportované jako `StepsSchema`). Typ `Step = z.infer<typeof StepSchema>` exportuje `src/domain/types.ts`. `Recipe['steps']` je tedy vždy `Step[]`. Všechna místa, která četla `steps` jako řetězce (`RecipeMethod`, `RecipePrintStep`, `draftFromRecipe`), čtou `step.text`. Schéma nemá horní mez `minutes` (data smí mít i dlouhé pečení); mez 600 platí jen ve formuláři (R7). `version` stavu ani klíč úložiště se nemění – normalizace řeší starší data.
- **R2 – Časová osa:** `stepTimeline(steps): { steps: { startMinutes: number | null }[]; total: number }` v `src/domain/steps.ts`. Začátek kroku = součet `minutes` všech předchozích nesouběžných kroků; souběžný krok má `startMinutes: null`, do součtu se nepočítá ani se svými `minutes`; krok bez `minutes` čas nepřidává (má stejný začátek jako další krok). **`parallel` u prvního kroku se ignoruje** (nemá s čím běžet souběžně; validátor varuje, R10). `total` = „Hotovo“.
- **R3 – Formát stopek:** `formatClock(sekundy)` (`m:ss`, od hodiny `h:mm:ss`, záporné a desetinné ořízne) a `formatStopwatch(minuty) = formatClock(minuty × 60)` jsou definované v `src/domain/steps.ts` (potřebuje je i `scripts/recipe-check.ts`, který nesmí importovat `src/pages/labels.ts` s aliasy `@/`) a **`src/pages/labels.ts` je re-exportuje**; UI je importuje z `labels.ts`.
- **R4 – Značky jen u receptu s časy:** značky, „Hotovo“ i stopky se vykreslí jen tehdy, když `total > 0`. Recept bez jediného času (vlastní recept bez prefixů, data před migrací) vypadá jako dosud – žádné „0:00“ u každého kroku.
- **R5 – Značka u kroku:** `<span class="step-time" role="img" aria-label="začátek 5:00">5:00</span>` jako první potomek `<li>` před textem (mezera je CSS `margin-right`, ne textový uzel); souběžný krok `<span class="step-time step-time--parallel" role="img" aria-label="mezitím, souběžně s předchozím krokem">mezitím</span>`. `role="img"` je tu proto, že `aria-label` na prostém `span` (role generic) čtečky ignorují; značka se tak čte jako celek „začátek 5:00“. Styl: strojopis (`--font-typewriter`), 0,72em, tenký rámeček jako úřední razítko (u „mezitím“ čárkovaný), `white-space: nowrap`, barva `--ink-soft`. Pod `<ol>` řádek `<p class="recipe-steps-total">Hotovo: <span class="step-time step-time--total">50:00</span></p>` zarovnaný doprava.
- **R6 – Tisk a brožurka:** `RecipePrintStep` dává stejnou značku (`StepTime`) do `<li>` a u **posledního** kroku přidá `<p class="print-recipe__total">Hotovo: …</p>` – v brožurce je tak „Hotovo“ v témže nedělitelném bloku jako poslední krok (`bookletBlocks` se nemění). Stopky v tiskovém stromu nejsou; v záložním tisku knihy (bez `data-print`) je `.step-stopwatch` skrytá a zvýraznění kroku zrušené.
- **R7 – Stopky v aplikaci:** hook `useStopwatch()` v `src/pages/useStopwatch.ts` → `{ elapsedSeconds, running, start, pause, reset }`; stav `{ accumulatedMs, startedAt }` ~~v `useState`~~ (od fix vlny FF1 v modulovém store s klíčem `recipeId`, čtený přes `useSyncExternalStore`), uplynulý čas = `accumulatedMs + (Date.now() − startedAt)`, tik `window.setInterval(…, 1000)` jen když běží, úklid v cleanupu `useEffect`. Komponenta `StepStopwatch` (`src/pages/StepStopwatch.tsx`) je čistě prezentační: `role="group"` „Stopky“, čas `role="timer"`, přepínací tlačítko **Spustit / Pauza** a **Vynulovat** (zastaví a vynuluje; zakázané, když stojí na 0:00). Volá ji `RecipeMethod` mezi `<h3>Postup</h3>` a `<ol>`, takže je na pravé straně dvoustrany a na jediné stránce mobilu, nikdy na levé straně ani v tisku. Zvýraznění: `currentStepIndex(steps, elapsedSeconds)` → `<li class="is-current" aria-current="step">`, jen když stopky běží nebo mají čas > 0. Zvýrazní se poslední nesouběžný krok s `minutes > 0`, který už začal; kroky bez minut a souběžné kroky nikdy; po dosažení „Hotovo“ žádný. Stopky po dosažení „Hotovo“ běží dál (uživatel je zastaví). ~~Přepnutí režimu (otočení telefonu) nebo odchod ze stránky stopky vynuluje – vědomý kompromis.~~ [Final fix, ruling FF1] Stav stopek je jeden pro aplikaci, mimo stránku (modulový store v `useStopwatch.ts`, klíč `recipeId`); přežije nedokončený tah, přepnutí režimu i odlistování; vynuluje se tlačítkem, spuštěním u jiného receptu nebo obnovením stránky.
- **R8 – Formulář:** textarea zůstává. `parseStepLine(řádek)` rozpozná na začátku řádku (po odstranění ručního číslování) nepovinné `mezitím` / `mezitim` a nepovinné `N min` (také `minut`, `minuty`, `minutu`, `min.`), velikost písmen a mezery tolerantně, ukončené dvojtečkou nebo mezerou: `15 min: Duš.`, `15 min Duš.`, `mezitím: Uvař rýži.`, `mezitím 10 min: Uvař rýži.`. Samotné „Mezitím“ bez dvojtečky a bez následující doby **zůstává textem** („Mezitím uvař rýži.“ je běžná věta, nesmí přijít o slovo). `formatStepLine(krok)` je opak (`mezitím 10 min: Uvař rýži.`) a používá ho `draftFromRecipe`. Validace: `minutes` 1–600 (`STEP_MINUTES_MAX`) celé (regex bere jen číslice), text za prefixem nesmí být prázdný; hláška u pole Postup „Krok N: doba musí být 1–600 minut“ / „Krok N: za časem chybí text kroku“. Nápověda pod polem jednou větou (`STEPS_HINT`), `aria-describedby` = chyba (je-li) + nápověda; placeholder s ukázkou.
- **R9 – Validátor:** `stepTimingWarnings(recept)` v `scripts/validate.ts`: varování (ne chyba), když knižní recept (ne `vlastni`) nemá žádný krok s `minutes`; když součet (`stepTimeline(...).total`) > `timeMinutes`; když součet < `timeMinutes / 2`; když má první krok `parallel`. `check:recipe` vypíše pod řádkem „na porci“ tabulku `krok | začátek | min | text` a řádek `hotovo: 50:00 (50 min; timeMinutes 60)`.
- **R10 – Skript `step-times`:** `npm run step-times -- [<id>…] [--write]` (bez id = všechny recepty). Pro každý krok **zadaný řetězcem** navrhne `minutes` z textu: rozsah → horní mez („20–25 minut“ → 25, „5 až 10 minut“ → 10, „45 minut až 1 hodinu“ → 60), „asi 10 minut“ → 10, „1 hodinu“ → 60, „1,5 hodiny“ → 90, „půl hodiny“ → 30, „hodinu“ → 60, „1 hodinu 40 minut“ → 100, sekundy nahoru na celé minuty, více dob v kroku se sčítá, text v závorce se ignoruje; „přes noc“, namáčení (`namoč`, `namáč`, ne „namočené“) a návrh nad 600 min → bez `minutes` (návrh 0). `parallel: true`, když text začíná „Mezitím“. Krok, který už je objekt, zůstává beze změny (skript nepřepíše ruční úpravy). Bez `--write` vypíše tabulku `krok | návrh | text`; s `--write` přepíše v souboru **jen pole `steps`** (ostatní řádky bajtově beze změny) a výsledek ověří přes `JSON.parse` (jiné pole se nesmí změnit, jinak chyba).
- **R11 – Migrace dat:** controller spustí `npm run step-times -- --write` na všech 78 receptů, pak 8 Haiku agentů paralelně (po ~10 receptech) doplní minuty u kroků bez čísla, označí souběžné kroky a sladí součet s `timeMinutes` podle pravidel časování (Task 8, blok „Pravidla časování“ – tentýž text pak Task 9 vloží do skillu). Test `src/content/stepTimes.test.ts` vyžaduje u každého knižního receptu „Hotovo“ v intervalu `[timeMinutes / 2, timeMinutes]`. Text kroků se nemění (kontrolní skript proti HEAD). Reviewer (Sonnet) namátkově ověří 10 receptů proti zdroji v `extracted/`.
- **R12 – Pořadí tasků a skill:** pořadí je závazné (schéma → kniha → tisk → stopky → formulář → validátor → skript → migrace → skill → ruční kontrola). Protože migrace (Task 8) běží před úpravou skillu (Task 9), brief agentů obsahuje pravidla časování **celá** (ne odkaz na skill); Task 9 je přenese do `SKILL.md` kroku 7 doslova, aby skill a provedená migrace mluvily stejně.
- **R13 – Beze změny:** hash routy, layout knihy, režim single/spread, `UserState` (verze i klíč), `bookletBlocks`, `reference/units.md`.

## Struktura souborů

| Soubor | Odpovědnost | Task |
|---|---|---|
| `src/domain/schema.ts`, `src/domain/types.ts` | `StepSchema`, `StepsSchema`, typ `Step` | 1 |
| `src/domain/steps.ts` (nový) | `stepTimeline`, `isParallelStep`, `formatClock`, `formatStopwatch`, `currentStepIndex` | 1, 4 |
| `src/pages/labels.ts` | re-export `formatClock`, `formatStopwatch` | 1 |
| `src/test/customRecipe.ts`, `src/domain/nutrition.test.ts`, `src/domain/shopping.test.ts` | fixtury s kroky jako objekty | 1 |
| `src/pages/StepTime.tsx` (nový) | `StepTime` (značka), `StepsTotal` („Hotovo“) | 2 |
| `src/pages/RecipePage.tsx` | `RecipeMethod`: `step.text`, značky, „Hotovo“, stopky, zvýraznění | 1, 2, 4 |
| `src/styles/paper.css` | `.step-time`, `.recipe-steps-total`, `.step-stopwatch`, `.is-current` | 2, 4 |
| `src/print/RecipePrint.tsx`, `src/styles/print.css` | značky a „Hotovo“ v tisku, skrytí stopek v záložním tisku | 1, 3, 4 |
| `src/pages/useStopwatch.ts`, `src/pages/StepStopwatch.tsx` (nové) | stav a vzhled stopek | 4 |
| `src/custom/draft.ts`, `src/custom/RecipeForm.tsx`, `src/styles/custom.css` | prefixy `N min:` / `mezitím:`, nápověda | 1, 5 |
| `scripts/validate.ts`, `scripts/recipe-check.ts`, `data/recipes/README.md` | varování časů, časová osa v `check:recipe` | 6 |
| `scripts/step-times.ts` (nový), `package.json` | návrh minut z textu, zápis kroků | 7 |
| `data/recipes/*.json` (78), `src/content/stepTimes.test.ts` (nový) | časy kroků ve všech receptech | 8 |
| `.claude/skills/recipe-digitize/SKILL.md`, `reference/example-recipe.json`, `reference/batch.md` | skill zapisuje kroky s časem | 9 |

---

### Task 1: Schéma kroků, časová osa a formát stopek

**Files:**
- Modify: `src/domain/schema.ts`, `src/domain/types.ts`, `src/pages/labels.ts`
- Create: `src/domain/steps.ts`, `src/domain/steps.test.ts`
- Modify (čtení `step.text`): `src/pages/RecipePage.tsx`, `src/print/RecipePrint.tsx`, `src/custom/draft.ts`
- Modify (fixtury): `src/test/customRecipe.ts`, `src/domain/nutrition.test.ts`, `src/domain/shopping.test.ts`
- Test: `src/domain/schema.test.ts`, `src/pages/labels.test.ts`, `src/state/userState.test.ts`, `src/custom/recipesFile.test.ts`, `src/custom/draft.test.ts`, `src/custom/RecipeForm.test.tsx`, `src/print/RecipePrint.test.tsx`

**Interfaces:**
- Consumes: nic nového.
- Produces:
```ts
// src/domain/schema.ts
export const StepSchema: z.ZodObject<…>            // { text: string; minutes?: number; parallel?: true }, strict
export const StepsSchema                            // (string | Step)[] min 1 → Step[]
// RecipeSchema.steps = StepsSchema
// src/domain/types.ts
export type Step = z.infer<typeof StepSchema>      // { text: string; minutes?: number; parallel?: true }
// src/domain/steps.ts
export interface TimedStep { startMinutes: number | null }
export interface StepTimeline { steps: TimedStep[]; total: number }
export function isParallelStep(step: Step, index: number): boolean
export function stepTimeline(steps: readonly Step[]): StepTimeline
export function formatClock(totalSeconds: number): string     // 65 → '1:05', 3605 → '1:00:05'
export function formatStopwatch(minutes: number): string      // 0 → '0:00', 70 → '1:10:00'
// src/pages/labels.ts
export { formatClock, formatStopwatch } from '@/domain/steps'
```

- [ ] **Step 1: Napsat failing testy schématu**

Na konec `src/domain/schema.test.ts` přidat:

```ts
test('kroky: řetězec se normalizuje na { text }, objekt s minutes a parallel projde beze změny (R3)', () => {
  const r = RecipeSchema.parse({
    ...recipe,
    steps: ['Rozšlehej vejce.', { text: 'Opékej na másle.', minutes: 5 }, { text: 'Mezitím opeč chléb.', minutes: 3, parallel: true }],
  })
  expect(r.steps).toEqual([
    { text: 'Rozšlehej vejce.' },
    { text: 'Opékej na másle.', minutes: 5 },
    { text: 'Mezitím opeč chléb.', minutes: 3, parallel: true },
  ])
})

test.each([
  ['minutes 0', { text: 'x', minutes: 0 }],
  ['minutes 2.5', { text: 'x', minutes: 2.5 }],
  ['parallel false', { text: 'x', parallel: false }],
  ['prázdný text', { text: '' }],
  ['neznámý klíč', { text: 'x', seconds: 30 }],
  ['prázdný řetězec', ''],
])('krok s %s neprojde', (_, step) => expect(RecipeSchema.safeParse({ ...recipe, steps: [step] }).success).toBe(false))
```

- [ ] **Step 2: Napsat failing testy časové osy a formátu**

Vytvořit `src/domain/steps.test.ts`:

```ts
// src/domain/steps.test.ts
import { formatClock, formatStopwatch, isParallelStep, stepTimeline } from './steps'
import type { Step } from './types'

const steps: Step[] = [
  { text: 'Nakrájej cibuli.', minutes: 5 },
  { text: 'Osmaž cibuli.', minutes: 10 },
  { text: 'Osol.' },
  { text: 'Duš pod pokličkou.', minutes: 35 },
  { text: 'Mezitím uvař rýži.', minutes: 20, parallel: true },
]

describe('stepTimeline (spec §5.1 [R3])', () => {
  it('začátek = součet minut předchozích nesouběžných kroků; krok bez minut nic nepřidá; souběžný má null', () => {
    expect(stepTimeline(steps)).toEqual({
      steps: [{ startMinutes: 0 }, { startMinutes: 5 }, { startMinutes: 15 }, { startMinutes: 15 }, { startMinutes: null }],
      total: 50,
    })
  })

  it('souběžný krok uprostřed nesmaže čas dalších kroků', () => {
    const r = stepTimeline([{ text: 'a', minutes: 10 }, { text: 'b', minutes: 99, parallel: true }, { text: 'c', minutes: 5 }])
    expect(r.steps.map((s) => s.startMinutes)).toEqual([0, null, 10])
    expect(r.total).toBe(15)
  })

  it('parallel u prvního kroku se ignoruje (nemá předchozí krok)', () => {
    const r = stepTimeline([{ text: 'a', minutes: 5, parallel: true }, { text: 'b', minutes: 5 }])
    expect(r.steps.map((s) => s.startMinutes)).toEqual([0, 5])
    expect(r.total).toBe(10)
    expect(isParallelStep({ text: 'a', parallel: true }, 0)).toBe(false)
    expect(isParallelStep({ text: 'a', parallel: true }, 1)).toBe(true)
  })

  it('recept bez časů: všechny kroky začínají v 0, total 0', () => {
    expect(stepTimeline([{ text: 'a' }, { text: 'b' }])).toEqual({ steps: [{ startMinutes: 0 }, { startMinutes: 0 }], total: 0 })
  })
})

describe('formát stopek', () => {
  it.each([
    [0, '0:00'],
    [5, '5:00'],
    [35, '35:00'],
    [59, '59:00'],
    [60, '1:00:00'],
    [70, '1:10:00'],
    [600, '10:00:00'],
  ])('formatStopwatch(%d) = %s', (minutes, text) => expect(formatStopwatch(minutes)).toBe(text))

  it.each([
    [0, '0:00'],
    [1, '0:01'],
    [65, '1:05'],
    [59.9, '0:59'],
    [3605, '1:00:05'],
    [-3, '0:00'],
  ])('formatClock(%d) = %s', (seconds, text) => expect(formatClock(seconds)).toBe(text))
})
```

V `src/pages/labels.test.ts` rozšířit import o `formatStopwatch` a na konec souboru přidat:

```ts
test('labels re-exportuje formát stopek z domény (R3)', () => expect(formatStopwatch(70)).toBe('1:10:00'))
```

- [ ] **Step 3: Napsat failing testy starších kroků v úložišti a importu**

V `src/state/userState.test.ts` přidat `validCustomRecipes` do importu z `./userState` (abecedně za `upsertCustomRecipe`) a do `describe('vlastní recepty', …)` přidat:

```ts
  it('vlastní recept s kroky jako řetězce (stav z fáze 8) se načte, kroky jsou objekty', () => {
    const legacy = { ...customRecipe(), steps: ['Smíchej mouku s vejcem a solí.', 'Peč na pánvi dozlatova.'] };
    expect(validCustomRecipes([legacy])).toEqual([customRecipe()]);
  });
```

Do `src/custom/recipesFile.test.ts` přidat:

```ts
test('import: kroky jako řetězce (starší export) se převedou na objekty', () => {
  const legacy = { ...customRecipe(), steps: customRecipe().steps.map((s) => s.text) }
  expect(parseCustomRecipesFile(JSON.stringify([legacy]), ctx)).toEqual({ recipes: [customRecipe()], skipped: [] })
})
```

- [ ] **Step 4: Spustit testy – musí selhat**

Run: `npx vitest run src/domain/schema.test.ts src/domain/steps.test.ts src/pages/labels.test.ts src/state/userState.test.ts src/custom/recipesFile.test.ts`
Expected: FAIL (`steps.ts` neexistuje, `formatStopwatch` není exportováno, schéma odmítne objektový krok).

- [ ] **Step 5: Schéma a typ**

V `src/domain/schema.ts` vložit před `/** Nejvyšší počet porcí … */`:

```ts
/**
 * Krok postupu (spec §5.1 [R3]): `minutes` = doba od začátku kroku do začátku dalšího (aktivní + pasivní),
 * `parallel` = krok běží souběžně s předchozím a čas nepřidává. Krok bez `minutes` čas nepřidává (pokyn).
 */
export const StepSchema = z
  .object({
    text: z.string().min(1),
    minutes: z.number().int().min(1).optional(),
    parallel: z.literal(true).optional(),
  })
  .strict()

/** Data mají kroky jako objekty; prostý řetězec (starší vlastní recepty, import, export) se normalizuje na `{ text }`. */
export const StepsSchema = z
  .array(z.union([z.string().min(1), StepSchema]))
  .min(1)
  .transform((steps) => steps.map((s): z.infer<typeof StepSchema> => (typeof s === 'string' ? { text: s } : s)))
```

a v `RecipeSchema` nahradit řádek `steps: z.array(z.string().min(1)).min(1),` za `steps: StepsSchema,`.

V `src/domain/types.ts` přidat `StepSchema` do typového importu z `./schema` a na konec:

```ts
export type Step = z.infer<typeof StepSchema>
```

- [ ] **Step 6: Časová osa a formát**

Vytvořit `src/domain/steps.ts`:

```ts
// src/domain/steps.ts – časová osa kroků a formát stopek (spec §2, §5.1 [R3]).
// Jen relativní importy: soubor používají i skripty (validate, recipe-check, step-times).
import type { Step } from './types'

export interface TimedStep {
  /** Začátek kroku v minutách od začátku vaření; null = souběžný krok („mezitím“). */
  startMinutes: number | null
}

export interface StepTimeline {
  steps: TimedStep[]
  /** „Hotovo“: součet minut všech nesouběžných kroků. */
  total: number
}

/** Souběžný je krok s `parallel` – kromě prvního, který nemá s čím běžet souběžně (počítá se jako běžný). */
export function isParallelStep(step: Step, index: number): boolean {
  return index > 0 && step.parallel === true
}

/** Začátek každého kroku a „Hotovo“ (ruling R2). */
export function stepTimeline(steps: readonly Step[]): StepTimeline {
  let clock = 0
  const timed = steps.map((step, i): TimedStep => {
    if (isParallelStep(step, i)) return { startMinutes: null }
    const startMinutes = clock
    clock += step.minutes ?? 0
    return { startMinutes }
  })
  return { steps: timed, total: clock }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Uplynulý čas stopek: „0:05“, „12:34“, od hodiny „1:02:03“. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

/** Značka stopek z minut: „0:00“, „5:00“, „35:00“, od hodiny „1:10:00“. */
export function formatStopwatch(minutes: number): string {
  return formatClock(minutes * 60)
}
```

Na konec `src/pages/labels.ts` přidat:

```ts
/** Formát stopek (spec §2 [R3]) – definovaný v doméně, protože ho potřebují i skripty (ruling R3). */
export { formatClock, formatStopwatch } from '@/domain/steps'
```

- [ ] **Step 7: Čtení `step.text` v aplikaci a fixtury**

- `src/pages/RecipePage.tsx`, `RecipeMethod`: `<li key={i}>{s}</li>` → `<li key={i}>{s.text}</li>`.
- `src/print/RecipePrint.tsx`, `RecipePrintStep`: `<li>{recipe.steps[index]}</li>` → `<li>{recipe.steps[index].text}</li>`.
- `src/custom/draft.ts`, `draftFromRecipe`: `steps: recipe.steps.join('\n'),` → `steps: recipe.steps.map((s) => s.text).join('\n'),` (prefixy času doplní Task 5).
- `src/test/customRecipe.ts`: `steps: [{ text: 'Smíchej mouku s vejcem a solí.' }, { text: 'Peč na pánvi dozlatova.' }],`
- `src/domain/nutrition.test.ts` a `src/domain/shopping.test.ts` (funkce `recipe`): `steps: ['x']` → `steps: [{ text: 'x' }]`.
- `src/custom/draft.test.ts`: v testu „platný draft → recept …“ `steps: [{ text: 'Rozšlehej vejce.' }, { text: 'Osmaž na pánvi.' }],`; v testu „úprava: draftFromRecipe → …“ `expect(draft.steps).toBe(own.steps.map((s) => s.text).join('\n'))`.
- `src/custom/RecipeForm.test.tsx` (očekávaný `onSave`): `steps: [{ text: 'Rozšlehej vejce.' }, { text: 'Osmaž na pánvi.' }],`.
- `src/print/RecipePrint.test.tsx` (test „celý postup číslovaný od 1 …“): `expect(lists.map((ol) => ol.textContent)).toEqual(gulas.steps.map((s) => s.text))` (Task 3 ho rozšíří o značky).

- [ ] **Step 8: Spustit testy – musí projít**

Run: `npx vitest run src/domain src/pages/labels.test.ts src/state src/custom src/print src/pages/RecipePage.test.tsx`
Expected: PASS.

- [ ] **Step 9: Všechny kontroly**

Run: `npm test && npm run lint && npm run build && npm run validate`
Expected: PASS; `validate` beze změny počtu varování (data mají zatím kroky jako řetězce a projdou normalizací).

- [ ] **Step 10: Předat controlleru (necommitovat)**

Soubory: `src/domain/schema.ts`, `src/domain/types.ts`, `src/domain/steps.ts`, `src/domain/steps.test.ts`, `src/domain/schema.test.ts`, `src/domain/nutrition.test.ts`, `src/domain/shopping.test.ts`, `src/pages/labels.ts`, `src/pages/labels.test.ts`, `src/pages/RecipePage.tsx`, `src/print/RecipePrint.tsx`, `src/print/RecipePrint.test.tsx`, `src/custom/draft.ts`, `src/custom/draft.test.ts`, `src/custom/RecipeForm.test.tsx`, `src/custom/recipesFile.test.ts`, `src/state/userState.test.ts`, `src/test/customRecipe.ts`. Návrh zprávy: `feat(R3): kroky s minutes/parallel ve schématu, časová osa a formát stopek`.

---

### Task 2: Značky stopek a „Hotovo“ v knize

**Files:**
- Create: `src/pages/StepTime.tsx`
- Modify: `src/pages/RecipePage.tsx` (`RecipeMethod`), `src/styles/paper.css` (za `.recipe-steps`)
- Test: `src/pages/RecipePage.test.tsx`, `src/styles/paper.test.ts`

**Interfaces:**
- Consumes: `stepTimeline`, `StepTimeline` (Task 1), `formatStopwatch` z `./labels` (Task 1), `Step`.
- Produces:
```tsx
// src/pages/StepTime.tsx
export function StepTime(props: { start: number | null }): JSX.Element     // .step-time, role img, aria-label „začátek 5:00“ / „mezitím, souběžně s předchozím krokem“
export function StepsTotal(props: { total: number; className: string }): JSX.Element  // „Hotovo: <span.step-time.step-time--total>50:00</span>“
```
CSS třídy `.step-time`, `.step-time--parallel`, `.step-time--total`, `.recipe-steps-total` (používá Task 3 a 4).

- [ ] **Step 1: Napsat failing testy**

V `src/pages/RecipePage.test.tsx` za konstantu `following` přidat sdílené syntetické kroky:

```tsx
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
```

a na konec souboru:

```tsx
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
```

Na konec `src/styles/paper.test.ts`:

```ts
test('značka stopek u kroku: strojopis, malá, nezalomí se; souběžná čárkovaně; „Hotovo“ vpravo (R3)', () => {
  const mark = body('.step-time')
  expect(mark).toMatch(/font-family:\s*var\(--font-typewriter\)/)
  expect(mark).toMatch(/font-size:\s*0\.72em/)
  expect(mark).toMatch(/white-space:\s*nowrap/)
  expect(mark).toMatch(/border:\s*1px solid currentColor/)
  expect(body('.step-time--parallel')).toMatch(/border-style:\s*dashed/)
  expect(body('.recipe-steps-total')).toMatch(/text-align:\s*right/)
})
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/pages/RecipePage.test.tsx src/styles/paper.test.ts`
Expected: FAIL (žádná `.step-time`, žádné `.recipe-steps-total`).

- [ ] **Step 3: Komponenta značky**

Vytvořit `src/pages/StepTime.tsx`:

```tsx
// src/pages/StepTime.tsx – značka stopek u kroku a řádek „Hotovo“ (spec §2 [R3]); kniha i tisk
import { formatStopwatch } from './labels'

/**
 * Čas od začátku vaření, kdy krok začíná („5:00“), nebo „mezitím“ u souběžného kroku.
 * role="img": aria-label na prostém span (role generic) čtečky ignorují; značka se čte jako celek (ruling R5).
 */
export function StepTime({ start }: { start: number | null }) {
  if (start === null) {
    return (
      <span className="step-time step-time--parallel" role="img" aria-label="mezitím, souběžně s předchozím krokem">
        mezitím
      </span>
    )
  }
  const time = formatStopwatch(start)
  return (
    <span className="step-time" role="img" aria-label={`začátek ${time}`}>
      {time}
    </span>
  )
}

/** Řádek pod postupem: „Hotovo: 50:00“ – součet minut nesouběžných kroků. */
export function StepsTotal({ total, className }: { total: number; className: string }) {
  return (
    <p className={className}>
      Hotovo: <span className="step-time step-time--total">{formatStopwatch(total)}</span>
    </p>
  )
}
```

- [ ] **Step 4: Značky v `RecipeMethod`**

V `src/pages/RecipePage.tsx` přidat importy:

```tsx
import { stepTimeline } from '@/domain/steps'
import { StepTime, StepsTotal } from './StepTime'
```

a celou funkci `RecipeMethod` nahradit:

```tsx
/** Postup („vpravo postup“): volitelné živé záhlaví, postup se značkami stopek, „Hotovo“, poznámka, patička zdroje. */
function RecipeMethod({ recipe, runningHead }: { recipe: Recipe; runningHead: boolean }) {
  const timeline = stepTimeline(recipe.steps)
  // recept bez jediného času vypadá jako dřív – žádné „0:00“ u všech kroků (ruling R4)
  const timed = timeline.total > 0
  return (
    <>
      {runningHead && <h2 className="recipe-running-head">{recipe.title}</h2>}
      <h3>Postup</h3>
      <ol className="recipe-steps">
        {recipe.steps.map((s, i) => (
          <li key={i}>
            {timed && <StepTime start={timeline.steps[i].startMinutes} />}
            {s.text}
          </li>
        ))}
      </ol>
      {timed && <StepsTotal total={timeline.total} className="recipe-steps-total" />}
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
```

- [ ] **Step 5: Styl značky**

V `src/styles/paper.css` za řádek `.recipe-steps { padding-left: 1.4em; }` vložit:

```css
/* značka stopek u kroku (spec §2 [R3]): malé úřední razítko strojopisem, nezalomí se */
.step-time {
  display: inline-block; margin-right: 0.5em; padding: 0 0.35em;
  border: 1px solid currentColor; border-radius: 2px;
  font-family: var(--font-typewriter); font-size: 0.72em; font-style: normal; font-weight: normal;
  line-height: 1.5; letter-spacing: 0.02em; font-variant-numeric: tabular-nums;
  white-space: nowrap; vertical-align: 0.1em; color: var(--ink-soft);
}
.step-time--parallel { border-style: dashed; }
.step-time--total { margin: 0 0 0 0.3em; }
.recipe-steps-total { margin: 0.3em 0 0; text-align: right; font-family: var(--font-typewriter); font-size: 0.85em; color: var(--ink-soft); }
```

- [ ] **Step 6: Spustit testy – musí projít**

Run: `npx vitest run src/pages/RecipePage.test.tsx src/styles/paper.test.ts src/App.test.tsx`
Expected: PASS.

- [ ] **Step 7: Všechny kontroly**

Run: `npm test && npm run lint && npm run build && npm run validate`
Expected: PASS.

- [ ] **Step 8: Předat controlleru (necommitovat)**

Soubory: `src/pages/StepTime.tsx`, `src/pages/RecipePage.tsx`, `src/pages/RecipePage.test.tsx`, `src/styles/paper.css`, `src/styles/paper.test.ts`. Návrh zprávy: `feat(R3): značky stopek u kroků a „Hotovo“ v knize`.

---

### Task 3: Značky stopek v tisku a brožurce

**Files:**
- Modify: `src/print/RecipePrint.tsx` (`RecipePrintStep`), `src/styles/print.css`
- Test: `src/print/RecipePrint.test.tsx`, `src/styles/print.test.ts`

**Interfaces:**
- Consumes: `StepTime`, `StepsTotal` (Task 2), `stepTimeline` (Task 1), `formatStopwatch` (Task 1).
- Produces: `RecipePrintStep({ recipe, index })` – `<li>` se značkou; u posledního kroku navíc `<p class="print-recipe__total">Hotovo: …</p>`. `BookletPrint` a `bookletBlocks` beze změny (blok `recipe-step` posledního kroku nese i „Hotovo“).

- [ ] **Step 1: Napsat failing testy**

V `src/print/RecipePrint.test.tsx` rozšířit importy:

```tsx
import { formatStopwatch } from '@/pages/labels'
import { stepTimeline } from '@/domain/steps'
import { PrintRecipe, RecipePrintHead, RecipePrintNote, RecipePrintStep } from './RecipePrint'
```

V testu „celý postup číslovaný od 1, …“ nahradit řádek s `ol.textContent` (z Tasku 1):

```tsx
  // data dostanou časy v Tasku 8 – očekávání z časové osy platí před migrací i po ní
  const { steps: starts, total } = stepTimeline(gulas.steps)
  const mark = (i: number) => (total === 0 ? '' : starts[i].startMinutes === null ? 'mezitím' : formatStopwatch(starts[i].startMinutes!))
  expect(lists.map((ol) => ol.textContent)).toEqual(gulas.steps.map((s, i) => mark(i) + s.text))
```

Na konec souboru přidat:

```tsx
const timedSteps = [
  { text: 'Nakrájej cibuli.', minutes: 5 },
  { text: 'Osmaž cibuli.', minutes: 10 },
  { text: 'Osol.' },
  { text: 'Duš pod pokličkou.', minutes: 35 },
  { text: 'Mezitím uvař rýži.', minutes: 20, parallel: true as const },
]
const timedGulas = { ...gulas, steps: timedSteps }

test('A4: značka stopek u každého kroku a „Hotovo“ za posledním krokem (R3)', () => {
  const { container } = render(<PrintRecipe recipe={timedGulas} ingredients={ingredients} portions={portions} historical={false} />)
  expect([...container.querySelectorAll('.print-recipe__steps .step-time')].map((m) => m.textContent)).toEqual(['0:00', '5:00', '15:00', '15:00', 'mezitím'])
  const total = container.querySelector('.print-recipe__total')!
  expect(total.textContent).toBe('Hotovo: 50:00')
  const lists = container.querySelectorAll('.print-recipe__steps')
  expect(lists[lists.length - 1].compareDocumentPosition(total) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(container.querySelectorAll('.print-recipe__total')).toHaveLength(1)
})

test('brožurka: „Hotovo“ je v bloku posledního kroku, ne u ostatních', () => {
  const last = render(<RecipePrintStep recipe={timedGulas} index={4} />)
  expect(last.container.querySelector('.print-recipe__total')).toHaveTextContent('Hotovo: 50:00')
  last.unmount()
  const middle = render(<RecipePrintStep recipe={timedGulas} index={1} />)
  expect(middle.container.querySelector('.print-recipe__total')).toBeNull()
  expect(middle.container.querySelector('.step-time')).toHaveTextContent('5:00')
})

test('tisk receptu bez časů: bez značek a bez „Hotovo“', () => {
  const untimed = { ...gulas, steps: gulas.steps.map((s) => ({ text: s.text })) }
  const { container } = render(<PrintRecipe recipe={untimed} ingredients={ingredients} portions={portions} historical={false} />)
  expect(container.querySelector('.step-time, .print-recipe__total')).toBeNull()
})
```

Na konec `src/styles/print.test.ts`:

```ts
test('značka stopek v tisku: menší písmo v pt, „Hotovo“ vpravo (R3)', () => {
  expect(rule(screenCss, '.print-root .step-time')).toMatch(/font-size:\s*8pt/)
  expect(rule(screenCss, '.print-recipe__total')).toMatch(/text-align:\s*right/)
})
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run src/print/RecipePrint.test.tsx src/styles/print.test.ts`
Expected: FAIL (v tisku nejsou značky ani „Hotovo“).

- [ ] **Step 3: Implementace**

V `src/print/RecipePrint.tsx` přidat importy:

```tsx
import { stepTimeline } from '@/domain/steps'
import { StepTime, StepsTotal } from '@/pages/StepTime'
```

a `RecipePrintStep` nahradit:

```tsx
/**
 * Jeden krok postupu ve vlastním <ol start> (v brožurce jde postup rozdělit mezi strany); první krok nese nadpis.
 * Značka stopek jako v knize; poslední krok nese „Hotovo“, aby v brožurce zůstalo ve stejném bloku (ruling R6).
 */
export function RecipePrintStep({ recipe, index }: { recipe: Recipe; index: number }) {
  const timeline = stepTimeline(recipe.steps)
  const timed = timeline.total > 0
  return (
    <>
      {index === 0 && <h3 className="print-recipe__steps-title">Postup</h3>}
      <ol className="print-recipe__steps" start={index + 1}>
        <li>
          {timed && <StepTime start={timeline.steps[index].startMinutes} />}
          {recipe.steps[index].text}
        </li>
      </ol>
      {timed && index === recipe.steps.length - 1 && <StepsTotal total={timeline.total} className="print-recipe__total" />}
    </>
  )
}
```

V `src/styles/print.css` za řádek `.print-recipe__steps { … }` vložit:

```css
.print-root .step-time { font-size: 8pt; line-height: 1.3; padding: 0 0.3em; margin-right: 0.45em; border-width: 0.5pt; color: #000; }
.print-recipe__total { margin: 0.1em 0 0.4em; text-align: right; font-family: var(--font-typewriter); font-size: 9pt; break-before: avoid; }
```

- [ ] **Step 4: Spustit testy – musí projít**

Run: `npx vitest run src/print src/styles/print.test.ts`
Expected: PASS (včetně `BookletPrint.test.tsx` a `PrintRoot.test.tsx` beze změny).

- [ ] **Step 5: Všechny kontroly**

Run: `npm test && npm run lint && npm run build && npm run validate`
Expected: PASS.

- [ ] **Step 6: Předat controlleru (necommitovat)**

Soubory: `src/print/RecipePrint.tsx`, `src/print/RecipePrint.test.tsx`, `src/styles/print.css`, `src/styles/print.test.ts`. Návrh zprávy: `feat(R3): značky stopek a „Hotovo“ v tisku receptu a brožurce`.

---

### Task 4: Stopky nad postupem a zvýraznění běžícího kroku

**Files:**
- Modify: `src/domain/steps.ts` (`currentStepIndex`), `src/pages/RecipePage.tsx` (`RecipeMethod`), `src/styles/paper.css`, `src/styles/print.css`
- Create: `src/pages/useStopwatch.ts`, `src/pages/StepStopwatch.tsx`
- Test: `src/domain/steps.test.ts`, `src/pages/RecipePage.test.tsx`, `src/styles/paper.test.ts`, `src/styles/print.test.ts`

**Interfaces:**
- Consumes: `stepTimeline` (Task 1), `formatClock` z `./labels` (Task 1), `StepTime`/`StepsTotal` a `timedSteps`/`timed`/`untimed` v `RecipePage.test.tsx` (Task 2).
- Produces:
```ts
// src/domain/steps.ts
export function currentStepIndex(steps: readonly Step[], elapsedSeconds: number): number | null
// src/pages/useStopwatch.ts
export const STOPWATCH_TICK_MS = 1000
export interface Stopwatch { elapsedSeconds: number; running: boolean; start: () => void; pause: () => void; reset: () => void }
export function useStopwatch(): Stopwatch
// src/pages/StepStopwatch.tsx
export function StepStopwatch(props: { elapsedSeconds: number; running: boolean; onStart: () => void; onPause: () => void; onReset: () => void }): JSX.Element
```
CSS `.step-stopwatch`, `.step-stopwatch__time`, `.step-stopwatch__button`, `.recipe-steps li.is-current`.

- [ ] **Step 1: Napsat failing testy `currentStepIndex`**

V `src/domain/steps.test.ts` rozšířit import o `currentStepIndex` a přidat:

```ts
describe('currentStepIndex (zvýraznění podle stopek)', () => {
  // začátky: 0, 5, 15 (Osol. bez minut), 15, mezitím; Hotovo 50
  it.each([
    [0, 0],
    [299, 0],
    [300, 1],
    [899, 1],
    [900, 3], // „Osol.“ nemá minuty – nezvýrazní se, běží „Duš“
    [2999, 3],
    [3000, null], // Hotovo
    [99999, null],
  ])('po %d s → krok %s', (seconds, index) => expect(currentStepIndex(steps, seconds)).toBe(index))

  it('souběžný krok se nezvýrazní nikdy; recept bez časů nic', () => {
    for (let s = 0; s < 3000; s += 60) expect(currentStepIndex(steps, s)).not.toBe(4)
    expect(currentStepIndex([{ text: 'a' }, { text: 'b' }], 10)).toBeNull()
  })
})
```

- [ ] **Step 2: Napsat failing testy stopek v komponentě**

V `src/pages/RecipePage.test.tsx` změnit importy:

```tsx
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
```

a na konec souboru přidat:

```tsx
describe('Stopky nad postupem (R3)', () => {
  beforeEach(() => {
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

  it('po odchodu ze stránky se interval uklidí', () => {
    const { unmount } = setupRight({ recipe: timed })
    const before = vi.getTimerCount()
    fireEvent.click(screen.getByRole('button', { name: 'Spustit' }))
    expect(vi.getTimerCount()).toBe(before + 1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
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
```

Na konec `src/styles/paper.test.ts`:

```ts
test('stopky: řádek se zalamuje celými prvky, tlačítka aspoň 24 px; běžící krok zvýrazněný (R3)', () => {
  expect(body('.step-stopwatch')).toMatch(/flex-wrap:\s*wrap/)
  expect(body('.step-stopwatch__button')).toMatch(/min-height:\s*1\.8rem/)
  expect(body('.recipe-steps li.is-current')).toMatch(/background:/)
})
```

V `src/styles/print.test.ts` v testu „v tisku se skryjí ovládací prvky a indikátor pokračování“ přidat do pole selektorů `'.step-stopwatch'`.

- [ ] **Step 3: Spustit testy – musí selhat**

Run: `npx vitest run src/domain/steps.test.ts src/pages/RecipePage.test.tsx src/styles`
Expected: FAIL (`currentStepIndex` neexistuje, skupina „Stopky“ chybí).

- [ ] **Step 4: `currentStepIndex`**

Na konec `src/domain/steps.ts`:

```ts
/**
 * Krok, který podle stopek právě běží (spec §2 [R3], ruling R7): poslední nesouběžný krok s minutami, který už začal.
 * Kroky bez minut (pokyny) a souběžné kroky se nezvýrazňují; po „Hotovo“ a u receptu bez časů žádný (null).
 */
export function currentStepIndex(steps: readonly Step[], elapsedSeconds: number): number | null {
  const { steps: timed, total } = stepTimeline(steps)
  if (total === 0 || elapsedSeconds >= total * 60) return null
  let current: number | null = null
  for (let i = 0; i < steps.length; i++) {
    const start = timed[i].startMinutes
    if (start !== null && (steps[i].minutes ?? 0) > 0 && start * 60 <= elapsedSeconds) current = i
  }
  return current
}
```

- [ ] **Step 5: Hook a komponenta stopek**

Vytvořit `src/pages/useStopwatch.ts`:

```ts
// src/pages/useStopwatch.ts – stav stopek nad postupem (spec §2 [R3], ruling R7): jen v paměti komponenty
import { useEffect, useState } from 'react'

export const STOPWATCH_TICK_MS = 1000

export interface Stopwatch {
  elapsedSeconds: number
  running: boolean
  start: () => void
  pause: () => void
  /** Zastaví a vynuluje. */
  reset: () => void
}

interface State {
  /** Čas naměřený před poslední pauzou. */
  accumulatedMs: number
  /** `Date.now()` při spuštění; null = stojí. */
  startedAt: number | null
}

const IDLE: State = { accumulatedMs: 0, startedAt: null }

/**
 * Uplynulý čas se počítá z hodin (`Date.now()`), tik jen překresluje: v tabu na pozadí nebo po uspání telefonu
 * prohlížeč tiká řidčeji, ale stopky po návratu ukážou skutečný čas.
 */
export function useStopwatch(): Stopwatch {
  const [state, setState] = useState<State>(IDLE)
  const [now, setNow] = useState(0)

  useEffect(() => {
    if (state.startedAt === null) return
    const id = window.setInterval(() => setNow(Date.now()), STOPWATCH_TICK_MS)
    return () => window.clearInterval(id)
  }, [state.startedAt])

  const runningMs = state.startedAt === null ? 0 : Math.max(0, now - state.startedAt)
  return {
    elapsedSeconds: Math.floor((state.accumulatedMs + runningMs) / 1000),
    running: state.startedAt !== null,
    start: () => {
      const t = Date.now()
      setNow(t)
      setState((s) => (s.startedAt === null ? { ...s, startedAt: t } : s))
    },
    pause: () => {
      const t = Date.now()
      setState((s) => (s.startedAt === null ? s : { accumulatedMs: s.accumulatedMs + Math.max(0, t - s.startedAt), startedAt: null }))
    },
    reset: () => setState(IDLE),
  }
}
```

Vytvořit `src/pages/StepStopwatch.tsx`:

```tsx
// src/pages/StepStopwatch.tsx – malé stopky nad postupem (spec §2 [R3]); stav drží volající (useStopwatch)
import { formatClock } from './labels'

interface Props {
  elapsedSeconds: number
  running: boolean
  onStart: () => void
  onPause: () => void
  onReset: () => void
}

/** Uplynulý čas, Spustit/Pauza a Vynulovat. Bez zvuků a notifikací; v tisku skryté. */
export function StepStopwatch({ elapsedSeconds, running, onStart, onPause, onReset }: Props) {
  return (
    <div className="step-stopwatch" role="group" aria-label="Stopky">
      <span className="step-stopwatch__time" role="timer">
        {formatClock(elapsedSeconds)}
      </span>
      <button type="button" className="step-stopwatch__button" onClick={running ? onPause : onStart}>
        {running ? 'Pauza' : 'Spustit'}
      </button>
      <button type="button" className="step-stopwatch__button" onClick={onReset} disabled={!running && elapsedSeconds === 0}>
        Vynulovat
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Zapojení do `RecipeMethod`**

V `src/pages/RecipePage.tsx` změnit import z `@/domain/steps` na `import { currentStepIndex, stepTimeline } from '@/domain/steps'`, přidat:

```tsx
import { StepStopwatch } from './StepStopwatch'
import { useStopwatch } from './useStopwatch'
```

a v `RecipeMethod` (z Tasku 2) nahradit začátek těla až po konec `</ol>`:

```tsx
function RecipeMethod({ recipe, runningHead }: { recipe: Recipe; runningHead: boolean }) {
  const timeline = stepTimeline(recipe.steps)
  // recept bez jediného času vypadá jako dřív – žádné „0:00“ u všech kroků ani stopky (ruling R4)
  const timed = timeline.total > 0
  const stopwatch = useStopwatch()
  const started = stopwatch.running || stopwatch.elapsedSeconds > 0
  const current = timed && started ? currentStepIndex(recipe.steps, stopwatch.elapsedSeconds) : null
  return (
    <>
      {runningHead && <h2 className="recipe-running-head">{recipe.title}</h2>}
      <h3>Postup</h3>
      {timed && (
        <StepStopwatch
          elapsedSeconds={stopwatch.elapsedSeconds}
          running={stopwatch.running}
          onStart={stopwatch.start}
          onPause={stopwatch.pause}
          onReset={stopwatch.reset}
        />
      )}
      <ol className="recipe-steps">
        {recipe.steps.map((s, i) => (
          <li key={i} className={i === current ? 'is-current' : undefined} aria-current={i === current ? 'step' : undefined}>
            {timed && <StepTime start={timeline.steps[i].startMinutes} />}
            {s.text}
          </li>
        ))}
      </ol>
```

(zbytek funkce – `StepsTotal`, poznámka, patička – beze změny).

- [ ] **Step 7: Styly**

V `src/styles/paper.css` za blok `.recipe-steps-total { … }` (Task 2) vložit:

```css
/* stopky nad postupem (spec §2 [R3]); řádek se na úzkém displeji zalomí celými prvky, v tisku skryté */
.step-stopwatch { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.5rem; margin: 0 0 0.6em; font-family: var(--font-typewriter); font-size: 0.85em; }
.step-stopwatch__time { min-width: 4.6ch; font-size: 1.2em; font-variant-numeric: tabular-nums; }
.step-stopwatch__button {
  min-height: 1.8rem; padding: 0 0.8em; font: inherit; cursor: pointer;
  color: var(--ink); background: none; border: 1px solid var(--ink-soft); border-radius: 999px;
}
.step-stopwatch__button:disabled { opacity: 0.45; cursor: default; }
.step-stopwatch__button:focus-visible { outline: 2px solid var(--ink); }
/* právě běžící krok podle stopek */
.recipe-steps li.is-current { border-radius: 3px; background: rgba(212, 175, 55, 0.22); box-shadow: -0.3em 0 0 rgba(212, 175, 55, 0.22), inset 3px 0 0 #b8902a; }
.recipe-steps li.is-current .step-time { color: var(--ink); }
```

V `src/styles/print.css` v `@media print` přidat `.step-stopwatch` do seznamu skrytých prvků (řádek `.book-controls, .bookmark, … .cart-actions { display: none !important; }` → `… .cart-actions, .step-stopwatch { display: none !important; }`) a za něj:

```css
  .recipe-steps li.is-current { background: none; box-shadow: none; }
```

- [ ] **Step 8: Spustit testy – musí projít**

Run: `npx vitest run src/domain/steps.test.ts src/pages src/styles src/App.test.tsx`
Expected: PASS.

- [ ] **Step 9: Všechny kontroly**

Run: `npm test && npm run lint && npm run build && npm run validate`
Expected: PASS.

- [ ] **Step 10: Předat controlleru (necommitovat)**

Soubory: `src/domain/steps.ts`, `src/domain/steps.test.ts`, `src/pages/useStopwatch.ts`, `src/pages/StepStopwatch.tsx`, `src/pages/RecipePage.tsx`, `src/pages/RecipePage.test.tsx`, `src/styles/paper.css`, `src/styles/paper.test.ts`, `src/styles/print.css`, `src/styles/print.test.ts`. Návrh zprávy: `feat(R3): stopky nad postupem se zvýrazněním běžícího kroku`.

---

### Task 5: Formulář vlastního receptu – prefix času a „mezitím“

**Files:**
- Modify: `src/custom/draft.ts`, `src/custom/RecipeForm.tsx` (pole Postup), `src/styles/custom.css`
- Test: `src/custom/draft.test.ts`, `src/custom/RecipeForm.test.tsx`, `src/styles/custom.test.ts`

**Interfaces:**
- Consumes: `Step` (Task 1).
- Produces:
```ts
// src/custom/draft.ts
export const STEP_MINUTES_MAX = 600
export const STEPS_HINT: string          // nápověda pod polem Postup (jedna věta)
export const STEPS_PLACEHOLDER: string
export function parseStepLine(line: string): Step
export function parseSteps(text: string): Step[]      // dříve string[]
export function formatStepLine(step: Step): string     // opak parseStepLine
```

- [ ] **Step 1: Napsat failing testy parseru**

V `src/custom/draft.test.ts` rozšířit import z `./draft` o `formatStepLine`, `parseStepLine`, `STEP_MINUTES_MAX` a stávající test `parseSteps: řádek = krok, …` nahradit:

```ts
test('parseSteps: řádek = krok, bez prázdných řádků a ručního číslování', () => {
  expect(parseSteps('1. Rozšlehej vejce.\n\n2) Osmaž.\r\n  Podávej  \n')).toEqual([{ text: 'Rozšlehej vejce.' }, { text: 'Osmaž.' }, { text: 'Podávej' }])
  expect(parseSteps('1.5 l vody přiveď k varu.')).toEqual([{ text: '1.5 l vody přiveď k varu.' }])
})

test('parseSteps: číslování pryč, pak prefix času a souběžnosti', () => {
  expect(parseSteps('1. 5 min: Nakrájej.\n2) mezitím 10 min: Uvař.\n  Podávej  ')).toEqual([
    { text: 'Nakrájej.', minutes: 5 },
    { text: 'Uvař.', minutes: 10, parallel: true },
    { text: 'Podávej' },
  ])
})

describe('parseStepLine (R3, ruling R8)', () => {
  test.each([
    ['15 min: Duš pod pokličkou.', { text: 'Duš pod pokličkou.', minutes: 15 }],
    ['15 min Duš pod pokličkou.', { text: 'Duš pod pokličkou.', minutes: 15 }],
    ['15min:Duš.', { text: 'Duš.', minutes: 15 }],
    ['15 MIN : Duš.', { text: 'Duš.', minutes: 15 }],
    ['20 minut: Peč.', { text: 'Peč.', minutes: 20 }],
    ['5 min. Osol.', { text: 'Osol.', minutes: 5 }],
    ['mezitím: Uvař rýži.', { text: 'Uvař rýži.', parallel: true }],
    ['Mezitím 10 min: Uvař rýži.', { text: 'Uvař rýži.', minutes: 10, parallel: true }],
    ['MEZITÍM 10 min Uvař rýži.', { text: 'Uvař rýži.', minutes: 10, parallel: true }],
    ['mezitim : Uvař rýži.', { text: 'Uvař rýži.', parallel: true }],
    ['Mezitím uvař rýži.', { text: 'Mezitím uvař rýži.' }],
    ['Mezitím 2 vejce rozšlehej.', { text: 'Mezitím 2 vejce rozšlehej.' }],
    ['1,5 l vody přiveď k varu.', { text: '1,5 l vody přiveď k varu.' }],
    ['15 min', { text: '15 min' }],
    ['15 min:', { text: '', minutes: 15 }],
  ])('%j', (line, step) => expect(parseStepLine(line)).toEqual(step))
})

test('formatStepLine ↔ parseStepLine: zpáteční cesta', () => {
  const steps = [
    { text: 'Nakrájej cibuli.' },
    { text: 'Osmaž cibuli.', minutes: 10 },
    { text: 'Uvař rýži.', parallel: true as const },
    { text: 'Uvař těstoviny.', minutes: 12, parallel: true as const },
    { text: 'Mezitím uvař rýži.' },
  ]
  expect(steps.map(formatStepLine)).toEqual(['Nakrájej cibuli.', '10 min: Osmaž cibuli.', 'mezitím: Uvař rýži.', 'mezitím 12 min: Uvař těstoviny.', 'Mezitím uvař rýži.'])
  for (const s of steps) expect(parseStepLine(formatStepLine(s))).toEqual(s)
})

test.each([
  ['0 min: Duš.', `Krok 1: doba musí být 1–${STEP_MINUTES_MAX} minut`],
  ['Osol.\n601 min: Duš.', `Krok 2: doba musí být 1–${STEP_MINUTES_MAX} minut`],
  ['15 min:', 'Krok 1: za časem chybí text kroku'],
])('chybný krok %j → hláška u pole Postup', (steps, message) => {
  expect(draftToRecipe(filled({ steps }), ctx)).toEqual({ ok: false, errors: { steps: message } })
})

test('600 min projde; draft s časy → kroky jako objekty a úprava je vrátí do textu', () => {
  expect(draftToRecipe(filled({ steps: '600 min: Peč.' }), ctx).ok).toBe(true)
  const text = '5 min: Rozšlehej vejce.\nmezitím 3 min: Rozehřej pánev.\n10 min: Osmaž.'
  const r = draftToRecipe(filled({ steps: text }), ctx)
  if (!r.ok) throw new Error('mělo projít')
  expect(r.recipe.steps).toEqual([
    { text: 'Rozšlehej vejce.', minutes: 5 },
    { text: 'Rozehřej pánev.', minutes: 3, parallel: true },
    { text: 'Osmaž.', minutes: 10 },
  ])
  expect(draftFromRecipe(r.recipe, ingredients).steps).toBe(text)
})
```

V testu „úprava: draftFromRecipe → draftToRecipe vrátí tentýž recept“ nahradit řádek `expect(draft.steps)…` (z Tasku 1) za `expect(draft.steps).toBe(own.steps.map(formatStepLine).join('\n'))` a za test přidat:

```ts
test('úprava receptu s časy: draftFromRecipe → draftToRecipe vrátí tentýž recept', () => {
  const own = customRecipe({ steps: [{ text: 'Smíchej těsto.', minutes: 5 }, { text: 'Rozehřej pánev.', minutes: 2, parallel: true }, { text: 'Peč.', minutes: 20 }] })
  expect(draftToRecipe(draftFromRecipe(own, ingredients), { id: own.id, ingredients })).toEqual({ ok: true, recipe: own })
})
```

- [ ] **Step 2: Napsat failing testy formuláře**

V `src/custom/RecipeForm.test.tsx` přidat import `import { STEPS_HINT } from './draft'`. V testu „vyplnění a uložení vytvoří vlastní recept“ změnit psaní postupu na

```tsx
  await user.type(screen.getByRole('textbox', { name: 'Postup (každý krok na nový řádek)' }), 'Rozšlehej vejce.{Enter}5 min: Osmaž na pánvi.')
```

a v očekávaném `onSave` `steps: [{ text: 'Rozšlehej vejce.' }, { text: 'Osmaž na pánvi.', minutes: 5 }],`. V testu „neplatný formulář: …“ poslední řádek nahradit:

```tsx
  expect(screen.getByRole('textbox', { name: 'Postup (každý krok na nový řádek)' })).toHaveAccessibleDescription(/^Napiš aspoň jeden krok postupu/)
```

a na konec souboru přidat:

```tsx
test('pole Postup má nápovědu k prefixu času a „mezitím“ (R3)', () => {
  setup()
  const steps = screen.getByRole('textbox', { name: 'Postup (každý krok na nový řádek)' })
  expect(steps).toHaveAccessibleDescription(STEPS_HINT)
  expect(STEPS_HINT).toMatch(/15 min:/)
  expect(STEPS_HINT).toMatch(/mezitím/)
})

test('chybná doba kroku: hláška u pole Postup', async () => {
  const { props, user } = setup()
  await user.type(screen.getByRole('textbox', { name: 'Postup (každý krok na nový řádek)' }), '0 min: Duš.')
  await user.click(screen.getByRole('button', { name: 'Uložit recept' }))
  expect(props.onSave).not.toHaveBeenCalled()
  expect(screen.getByRole('textbox', { name: 'Postup (každý krok na nový řádek)' })).toHaveAccessibleDescription(/^Krok 1: doba musí být 1–600 minut/)
})
```

Na konec `src/styles/custom.test.ts`:

```ts
test('nápověda pod polem Postup je drobná tiskacím písmem (R3)', () => {
  const hint = body('.recipe-form__hint')
  expect(hint).toMatch(/font-family:\s*var\(--font-table\)/)
  expect(hint).toMatch(/font-size:\s*0\.8rem/)
})
```

- [ ] **Step 3: Spustit testy – musí selhat**

Run: `npx vitest run src/custom src/styles/custom.test.ts`
Expected: FAIL (`parseStepLine`, `formatStepLine`, `STEPS_HINT` neexistují).

- [ ] **Step 4: Parser a validace v `draft.ts`**

V `src/custom/draft.ts` přidat `Step` do typového importu z `@/domain/types` a za konstantu `TIME_MAX_MINUTES` vložit:

```ts
/** Nejdelší doba jednoho kroku ve formuláři (10 hodin); v datech schéma horní mez nemá (ruling R1). */
export const STEP_MINUTES_MAX = 600
export const STEPS_HINT = 'Řádek může začínat dobou kroku a slovem „mezitím“ pro souběžný krok, např. „15 min: Duš pod pokličkou.“ nebo „mezitím 10 min: Uvař rýži.“'
export const STEPS_PLACEHOLDER = '5 min: Nakrájej cibuli.\n10 min: Osmaž cibuli dozlatova.\nmezitím 20 min: Uvař brambory.'
```

Funkci `parseSteps` (i s jejím komentářem) nahradit:

```ts
/** „mezitím:“ nebo „mezitím “ následované číslem (doba); samotné „Mezitím uvař…“ je obyčejná věta. */
const PARALLEL_PREFIX = /^mezit[ií]m(?:\s*:\s*|\s+(?=\d))/iu
/** „15 min:“, „15 min “, „15min:“, „20 minut:“, „5 min. “ */
const MINUTES_PREFIX = /^(\d+)\s*min(?:ut[auy]?)?\.?(?:\s*:\s*|\s+)/iu

/**
 * Jeden řádek postupu → krok (spec §5.1 [R3], ruling R8): nepovinné „mezitím“ (souběžný krok) a/nebo „N min“
 * (doba), ukončené dvojtečkou nebo mezerou. Číslo za „mezitím“, které není doba („Mezitím 2 vejce…“), nechá řádek celý.
 */
export function parseStepLine(line: string): Step {
  let rest = line
  const parallel = PARALLEL_PREFIX.exec(rest)
  if (parallel) rest = rest.slice(parallel[0].length)
  const minutes = MINUTES_PREFIX.exec(rest)
  if (parallel && !minutes && !parallel[0].includes(':')) return { text: line }
  if (minutes) rest = rest.slice(minutes[0].length)
  return {
    text: rest.trim(),
    ...(minutes ? { minutes: Number(minutes[1]) } : {}),
    ...(parallel ? { parallel: true as const } : {}),
  }
}

/** Krok → řádek textového pole (opak `parseStepLine`): „mezitím 10 min: Uvař rýži.“ */
export function formatStepLine(step: Step): string {
  const prefix = [step.parallel ? 'mezitím' : '', step.minutes ? `${step.minutes} min` : ''].filter(Boolean).join(' ')
  return prefix ? `${prefix}: ${step.text}` : step.text
}

/** Postup z textového pole: řádek = krok; prázdné řádky a ruční číslování („1. “, „2) “) pryč, pak prefix času. */
export function parseSteps(text: string): Step[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim().replace(/^\d+[.)]\s+/, '').trim())
    .filter((s) => s !== '')
    .map(parseStepLine)
}
```

V `draftFromRecipe` nahradit `steps: recipe.steps.map((s) => s.text).join('\n'),` za `steps: recipe.steps.map(formatStepLine).join('\n'),`.

V `draftSchema` nahradit řádek `steps: z.array(z.string()).min(1, 'Napiš aspoň jeden krok postupu'),`:

```ts
    steps: z
      .array(z.object({ text: z.string(), minutes: z.number().optional(), parallel: z.literal(true).optional() }))
      .min(1, 'Napiš aspoň jeden krok postupu')
      .superRefine((steps, ctx) => {
        steps.forEach((s, i) => {
          if (s.text === '') ctx.addIssue({ code: 'custom', path: [i, 'text'], message: `Krok ${i + 1}: za časem chybí text kroku` })
          if (s.minutes !== undefined && (s.minutes < 1 || s.minutes > STEP_MINUTES_MAX)) {
            ctx.addIssue({ code: 'custom', path: [i, 'minutes'], message: `Krok ${i + 1}: doba musí být 1–${STEP_MINUTES_MAX} minut` })
          }
        })
      }),
```

(`draftToRecipe` předává `steps: parseSteps(draft.steps)` a `steps: v.steps` beze změny; chyba s cestou `['steps', i, …]` padne pod klíč `steps`.)

- [ ] **Step 5: Nápověda v `RecipeForm.tsx`**

Přidat `STEPS_HINT, STEPS_PLACEHOLDER` do importu z `./draft` a blok pole Postup nahradit:

```tsx
        <div className="recipe-form__field">
          <label htmlFor={fid('postup')}>Postup (každý krok na nový řádek)</label>
          <textarea
            id={fid('postup')}
            rows={6}
            value={draft.steps}
            placeholder={STEPS_PLACEHOLDER}
            aria-invalid={invalid('steps')}
            aria-describedby={[errorRef('steps'), fid('postup-napoveda')].filter(Boolean).join(' ')}
            onChange={(e) => set({ steps: e.currentTarget.value })}
          />
          <p id={fid('postup-napoveda')} className="recipe-form__hint">
            {STEPS_HINT}
          </p>
          {errorText('steps')}
        </div>
```

V `src/styles/custom.css` za řádek `.recipe-form__field { … }` vložit:

```css
.recipe-form__hint { margin: 0.1rem 0 0; font-family: var(--font-table); font-size: 0.8rem; line-height: 1.4; color: var(--ink-soft); }
```

- [ ] **Step 6: Spustit testy – musí projít**

Run: `npx vitest run src/custom src/styles/custom.test.ts src/App.test.tsx`
Expected: PASS.

- [ ] **Step 7: Všechny kontroly**

Run: `npm test && npm run lint && npm run build && npm run validate`
Expected: PASS.

- [ ] **Step 8: Předat controlleru (necommitovat)**

Soubory: `src/custom/draft.ts`, `src/custom/draft.test.ts`, `src/custom/RecipeForm.tsx`, `src/custom/RecipeForm.test.tsx`, `src/styles/custom.css`, `src/styles/custom.test.ts`. Návrh zprávy: `feat(R3): formulář vlastního receptu – prefix „15 min:“ a „mezitím:“ u kroků`.

---

### Task 6: Validátor a `check:recipe` – časy kroků

**Files:**
- Modify: `scripts/validate.ts`, `scripts/recipe-check.ts`, `data/recipes/README.md`
- Test: `scripts/validate.test.ts`, `scripts/recipe-check.test.ts`

**Interfaces:**
- Consumes: `stepTimeline`, `formatStopwatch` z `../src/domain/steps` (Task 1), `Recipe`.
- Produces:
```ts
// scripts/validate.ts
export function stepTimingWarnings(r: Recipe): string[]   // texty bez prefixu „recept <id>: “
// scripts/recipe-check.ts
export function formatStepTimeline(recipe: Recipe): string[]  // ['krok | začátek | min | text', '1 | 0:00 | 5 | …', …, 'hotovo: 25:00 (25 min; timeMinutes 30)']
```

- [ ] **Step 1: Napsat failing testy validátoru**

Do `scripts/validate.test.ts` (uvnitř `describe('validateContent', …)`, na konec) přidat:

```ts
  const book = (steps: unknown[], extra: object = {}) => ({ ...valid, source: { book: 'afrs-2003' }, steps, ...extra })
  const timingWarnings = (data: { id: string }) => validateContent(ings, rec(data)).warnings.filter((w) => /minut|minutes|parallel/.test(w))

  it('knižní recept bez minut u kroků je varování, vlastní recept ne (R3)', () => {
    expect(timingWarnings(book(['Smíchat těsto.', 'Péct na pánvi.']))).toEqual([
      'recept palacinky: žádný krok nemá minutes (časování kroků; návrh: npm run step-times -- palacinky)',
    ])
    expect(timingWarnings(valid)).toEqual([])
  })

  it('součet minut kroků nad timeMinutes je varování', () => {
    expect(timingWarnings(book([{ text: 'Smíchat těsto.', minutes: 20 }, { text: 'Péct.', minutes: 15 }]))).toEqual([
      'recept palacinky: součet minut kroků 35 je větší než timeMinutes 30',
    ])
  })

  it('součet minut kroků pod polovinou timeMinutes je varování', () => {
    expect(timingWarnings(book([{ text: 'Smíchat těsto.', minutes: 10 }, { text: 'Péct.', minutes: 4 }]))).toEqual([
      'recept palacinky: součet minut kroků 14 je menší než polovina timeMinutes 30',
    ])
  })

  it('součet v rozsahu ½–1× timeMinutes je bez varování; souběžný krok se nepočítá', () => {
    expect(timingWarnings(book([{ text: 'a', minutes: 20 }, { text: 'b', minutes: 10 }, { text: 'c', minutes: 25, parallel: true }]))).toEqual([])
    expect(timingWarnings(book([{ text: 'a', minutes: 15 }]))).toEqual([])
  })

  it('souběžný první krok je varování', () => {
    expect(timingWarnings(book([{ text: 'a', minutes: 20, parallel: true }, { text: 'b', minutes: 5 }]))).toEqual([
      'recept palacinky: první krok má parallel, ale nemá předchozí krok (počítá se jako běžný)',
    ])
  })
```

- [ ] **Step 2: Napsat failing testy `check:recipe`**

V `scripts/recipe-check.test.ts`:
- import rozšířit: `import { checkRecipe, formatCheck, formatStepTimeline, parseCheckArgs } from './recipe-check'` a přidat `import { RecipeSchema } from '../src/domain/schema'`;
- `const base: Recipe = fx('recipe-valid.json')` nahradit `const base: Recipe = RecipeSchema.parse(fx('recipe-valid.json'))` (kroky jako objekty);
- do testu „výpis obsahuje tabulku, řádek na porci a nálezy“ přidat `expect(text).toContain('hotovo: 0:00 (0 min; timeMinutes 30)')`;
- na konec souboru:

```ts
describe('formatStepTimeline (R3)', () => {
  it('začátek každého kroku, mezitím, minuty, hotovo a timeMinutes', () => {
    const r = recipe(base.ingredients, {
      steps: [
        { text: 'Smíchej těsto.', minutes: 5 },
        { text: 'Mezitím rozehřej pánev.', minutes: 3, parallel: true },
        { text: 'Peč palačinky po jedné.', minutes: 20 },
        { text: 'Podávej.' },
      ],
    })
    expect(formatStepTimeline(r)).toEqual([
      'krok | začátek | min | text',
      '1 | 0:00 | 5 | Smíchej těsto.',
      '2 | mezitím | 3 | Mezitím rozehřej pánev.',
      '3 | 5:00 | 20 | Peč palačinky po jedné.',
      '4 | 25:00 | – | Podávej.',
      'hotovo: 25:00 (25 min; timeMinutes 30)',
    ])
  })

  it('dlouhý text kroku se zkrátí na 60 znaků', () => {
    const long = 'x'.repeat(80)
    expect(formatStepTimeline(recipe(base.ingredients, { steps: [{ text: long, minutes: 70 }] }))[1]).toBe(`1 | 0:00 | 70 | ${'x'.repeat(59)}…`)
  })
})
```

- [ ] **Step 3: Spustit testy – musí selhat**

Run: `npx vitest run scripts/validate.test.ts scripts/recipe-check.test.ts`
Expected: FAIL (varování o časech chybí, `formatStepTimeline` neexistuje).

- [ ] **Step 4: Validátor**

V `scripts/validate.ts` přidat importy:

```ts
import { stepTimeline } from '../src/domain/steps'
```

a `Recipe` do typového importu (`import type { Ingredient, Recipe } from '../src/domain/types'`). Za funkci `isMeat` vložit:

```ts
/** Časování kroků (spec §5.1 [R3], ruling R9): kroky s minutami, součet proti timeMinutes, souběžný první krok. */
export function stepTimingWarnings(r: Recipe): string[] {
  const out: string[] = []
  if (!r.steps.some((s) => s.minutes !== undefined)) {
    if (r.source.book !== 'vlastni') out.push(`žádný krok nemá minutes (časování kroků; návrh: npm run step-times -- ${r.id})`)
    return out
  }
  const { total } = stepTimeline(r.steps)
  if (total > r.timeMinutes) out.push(`součet minut kroků ${total} je větší než timeMinutes ${r.timeMinutes}`)
  else if (total < r.timeMinutes / 2) out.push(`součet minut kroků ${total} je menší než polovina timeMinutes ${r.timeMinutes}`)
  if (r.steps[0].parallel) out.push('první krok má parallel, ale nemá předchozí krok (počítá se jako běžný)')
  return out
}
```

a ve `validateContent` za blok s varováním o tagu `rychle` přidat:

```ts
    for (const w of stepTimingWarnings(r)) warnings.push(`recept ${r.id}: ${w}`)
```

- [ ] **Step 5: `check:recipe`**

V `scripts/recipe-check.ts` přidat `import { formatStopwatch, stepTimeline } from '../src/domain/steps'`, za funkci `f1` vložit:

```ts
/** Časová osa kroků (spec §5.1 [R3]): začátek | min | text, na konci „hotovo“ proti timeMinutes. */
export function formatStepTimeline(recipe: Recipe): string[] {
  const { steps, total } = stepTimeline(recipe.steps)
  const out = ['krok | začátek | min | text']
  recipe.steps.forEach((s, i) => {
    const start = steps[i].startMinutes
    const text = s.text.length > 60 ? `${s.text.slice(0, 59)}…` : s.text
    out.push(`${i + 1} | ${start === null ? 'mezitím' : formatStopwatch(start)} | ${s.minutes ?? '–'} | ${text}`)
  })
  out.push(`hotovo: ${formatStopwatch(total)} (${total} min; timeMinutes ${recipe.timeMinutes})`)
  return out
}
```

a ve `formatCheck` za řádek `out.push(\`na porci: …\`)` přidat `out.push(...formatStepTimeline(recipe))`.

- [ ] **Step 6: README dat**

V `data/recipes/README.md` v odstavci „Validátor (`scripts/validate.ts`) …“ nahradit větu „Varuje při alergenu navíc, …, chybějícím tagu `bez-masa` a počtu receptů s `verified: false`.“ za:

„Varuje při alergenu navíc, ml u suroviny bez `densityGPerMl` (kromě vody), kcal na porci mimo 50–1500, chybějícím tagu `bez-masa`, knižním receptu bez minut u kroků, součtu minut kroků nad `timeMinutes` nebo pod jeho polovinou, `parallel` u prvního kroku a počtu receptů s `verified: false`. Časovou osu kroků vypíše `npm run check:recipe -- <id>`.“

- [ ] **Step 7: Spustit testy – musí projít**

Run: `npx vitest run scripts`
Expected: PASS.

- [ ] **Step 8: Všechny kontroly**

Run: `npm test && npm run lint && npm run build && npm run validate && npm run check:recipe -- spagety-s-masovou-omackou`
Expected: PASS; `validate` vypíše 78 nových varování „žádný krok nemá minutes“ (odstraní je Task 8), `check:recipe` vypíše tabulku kroků a `hotovo: 0:00 (0 min; timeMinutes 90)`.

- [ ] **Step 9: Předat controlleru (necommitovat)**

Soubory: `scripts/validate.ts`, `scripts/validate.test.ts`, `scripts/recipe-check.ts`, `scripts/recipe-check.test.ts`, `data/recipes/README.md`. Návrh zprávy: `feat(R3): validátor hlídá časy kroků, check:recipe vypíše časovou osu`.

---

### Task 7: Skript `step-times` – návrh minut z textu kroků

**Files:**
- Create: `scripts/step-times.ts`, `scripts/step-times.test.ts`
- Modify: `package.json` (skript `step-times`)

**Interfaces:**
- Consumes: `Step` (Task 1).
- Produces:
```ts
// scripts/step-times.ts
export const PROPOSAL_MAX_MINUTES = 600
export function proposeMinutes(text: string): number                  // 0 = bez minutes
export function proposeStep(step: string | Step): Step                 // objekt vrací beze změny (stejná reference)
export function formatStepsBlock(steps: readonly Step[]): string       // '"steps": [\n    { "text": …, "minutes": 5 },\n …\n  ]'
export function replaceStepsBlock(fileText: string, steps: readonly Step[]): string
export function formatProposalTable(id: string, steps: readonly Step[]): string
export function parseStepTimesArgs(argv: string[]): { ids: string[]; write: boolean }
```
CLI: `npm run step-times -- [<id>…] [--write]`.

- [ ] **Step 1: Napsat failing testy**

Vytvořit `scripts/step-times.test.ts`:

```ts
import { readFileSync, readdirSync } from 'node:fs'
import { formatProposalTable, formatStepsBlock, parseStepTimesArgs, proposeMinutes, proposeStep, replaceStepsBlock } from './step-times'
import type { Step } from '../src/domain/types'

describe('proposeMinutes (ruling R10)', () => {
  it.each([
    ['Hrnec pevně přikryj a na mírném ohni duš 20–25 minut. Nemíchej.', 25],
    ['Vař 5 až 10 minut, dokud omáčka nezhoustne.', 10],
    ['Vař asi 10 minut.', 10],
    ['Přiveď k varu, přikryj a vař asi 1 hodinu za častého míchání.', 60],
    ['Duš 1,5 hodiny.', 90],
    ['Vař asi půl hodiny.', 30],
    ['Peč asi hodinu.', 60],
    ['Sniž plamen, přikryj a duš 1 hodinu 40 minut, dokud maso nezměkne.', 100],
    ['Přidej maso a vař asi 45 minut až 1 hodinu.', 60],
    ['Opékej 1,5–2 minuty.', 2],
    ['Míchej 45 sekund.', 1],
    ['Opeč 5 minut, pak duš 30 minut.', 35],
    ['Peč 75 min.', 75],
    ['Peč v pomalé troubě při 150 °C 3 až 4 hodiny.', 240],
    ['Vař do měkka asi 3 hodiny (vepřové maso jen asi 2 hodiny).', 180],
    ['Fazole namoč přes noc do studené vody.', 0],
    ['Nech 6–8 hodin namočit, pak slij.', 0],
    ['Zalij je studenou vodou a nech asi 6 hodin namáčet.', 0],
    ['Namočené fazole slij, zalij čistou vodou a vař 2 hodiny.', 120],
    ['Vyndej bobkové listy.', 0],
    ['Za pár minut zamíchej.', 0],
    ['Nech kynout 12 hodin.', 0],
  ])('%j → %d', (text, minutes) => expect(proposeMinutes(text)).toBe(minutes))
})

describe('proposeStep', () => {
  it('řetězec → návrh minut; „Mezitím“ na začátku → parallel; bez času → jen text', () => {
    expect(proposeStep('Vař 10 minut.')).toEqual({ text: 'Vař 10 minut.', minutes: 10 })
    expect(proposeStep('Mezitím uvař těstoviny 10 až 12 minut.')).toEqual({ text: 'Mezitím uvař těstoviny 10 až 12 minut.', minutes: 12, parallel: true })
    expect(proposeStep('Vyndej bobkové listy.')).toEqual({ text: 'Vyndej bobkové listy.' })
  })

  it('krok, který už je objekt, zůstane beze změny (ruční úpravy se nepřepíšou)', () => {
    const edited: Step = { text: 'Vař 10 minut.', minutes: 15 }
    const noTime: Step = { text: 'Vař 10 minut.' }
    expect(proposeStep(edited)).toBe(edited)
    expect(proposeStep(noTime)).toBe(noTime)
  })
})

const file = [
  '{',
  '  "id": "x",',
  '  "ingredients": [',
  '    { "ingredientId": "voda", "amount": 1, "unit": "g" }',
  '  ],',
  '  "steps": [',
  '    "Vař 10 minut.",',
  '    "Podávej [teplé]."',
  '  ],',
  '  "source": { "book": "afrs-2003" }',
  '}',
  '',
].join('\n')

describe('replaceStepsBlock', () => {
  it('přepíše jen pole steps (jeden krok na řádek, pořadí klíčů text, minutes, parallel), ostatní řádky beze změny', () => {
    const steps: Step[] = [{ text: 'Vař 10 minut.', minutes: 10 }, { text: 'Podávej [teplé].', parallel: true }]
    expect(replaceStepsBlock(file, steps)).toBe(
      [
        '{',
        '  "id": "x",',
        '  "ingredients": [',
        '    { "ingredientId": "voda", "amount": 1, "unit": "g" }',
        '  ],',
        '  "steps": [',
        '    { "text": "Vař 10 minut.", "minutes": 10 },',
        '    { "text": "Podávej [teplé].", "parallel": true }',
        '  ],',
        '  "source": { "book": "afrs-2003" }',
        '}',
        '',
      ].join('\n'),
    )
  })

  it('kroky na jednom řádku, uvozovky a závorky v textu', () => {
    const one = '{\n  "id": "x",\n  "steps": ["Řekni \\"hotovo\\".", "Peč ]"],\n  "verified": true\n}\n'
    const steps: Step[] = [{ text: 'Řekni "hotovo".' }, { text: 'Peč ]', minutes: 5 }]
    const out = replaceStepsBlock(one, steps)
    expect(JSON.parse(out)).toEqual({ id: 'x', steps, verified: true })
    expect(out).toContain('    { "text": "Peč ]", "minutes": 5 }\n  ],\n  "verified": true')
  })

  it('bez pole steps na úrovni 2 mezer je chyba', () => {
    expect(() => replaceStepsBlock('{\n  "id": "x"\n}\n', [])).toThrow('nenalezeno')
  })

  it('formatStepsBlock: prázdné minuty a parallel se nevypisují', () => {
    expect(formatStepsBlock([{ text: 'a' }])).toBe('"steps": [\n    { "text": "a" }\n  ]')
  })

  it('všechny recepty v data/recipes: návrh jde zapsat a nezmění jiné pole', () => {
    const dir = 'data/recipes'
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
      const text = readFileSync(`${dir}/${f}`, 'utf8')
      const data = JSON.parse(text) as { steps: (string | Step)[] }
      expect(() => replaceStepsBlock(text, data.steps.map(proposeStep)), f).not.toThrow()
    }
  })
})

describe('výpis a argumenty', () => {
  it('tabulka krok | návrh | text', () => {
    expect(formatProposalTable('x', [{ text: 'Vař 10 minut.', minutes: 10 }, { text: 'Mezitím uvař rýži.', parallel: true }, { text: 'Osol.' }])).toBe(
      ['x', 'krok | návrh | text', '1 | 10 min | Vař 10 minut.', '2 | mezitím | Mezitím uvař rýži.', '3 | — | Osol.'].join('\n'),
    )
  })

  it('id z cesty i s příponou, --write; neznámý přepínač je chyba', () => {
    expect(parseStepTimesArgs(['data/recipes/a.json', 'b', '--write'])).toEqual({ ids: ['a', 'b'], write: true })
    expect(parseStepTimesArgs([])).toEqual({ ids: [], write: false })
    expect(() => parseStepTimesArgs(['--wirte'])).toThrow('neznámý přepínač --wirte')
  })
})
```

- [ ] **Step 2: Spustit testy – musí selhat**

Run: `npx vitest run scripts/step-times.test.ts`
Expected: FAIL (modul `./step-times` neexistuje).

- [ ] **Step 3: Implementace**

Vytvořit `scripts/step-times.ts`:

```ts
// Návrh časů kroků z textu (spec §5.1 [R3], fáze 10 ruling R10).
// Spuštění: npm run step-times -- [<id>…] [--write]   (bez id = všechny recepty v data/recipes)
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import type { Step } from '../src/domain/types'

/** Delší návrh (kynutí, namáčení) se nezapisuje – rozhodne člověk nebo agent. */
export const PROPOSAL_MAX_MINUTES = 600

const NUM = String.raw`\d+(?:,\d+)?`
/**
 * Doba v textu: [dolní mez – | až] číslo | půl | čtvrt (nebo nic: „hodinu“) + jednotka.
 * Skupiny: 1 dolní mez (ignoruje se, platí horní), 2 množství, 3 jednotka.
 */
const DURATION = new RegExp(
  String.raw`(?:(${NUM})\s*(?:–|-|až)\s*)?(${NUM}|půl|čtvrt)?\s*(?<!\p{L})(hodin[a-z]*|minut[a-z]*|min\.?(?![a-zá-ž])|sekund[a-z]*)`,
  'giu',
)
/** Namáčení a „přes noc“ se do času vaření nepočítají („Namočené fazole…“ ano – to už se vaří). */
const SOAK = /přes noc|namáč|namoč(?!en)/iu
const RANGE_GAP = /^\s*(?:–|-|až)\s*$/u
const PARALLEL_START = /^\s*mezitím\b/iu

interface Duration {
  start: number
  end: number
  minutes: number
}

function durations(text: string): Duration[] {
  const out: Duration[] = []
  for (const m of text.matchAll(DURATION)) {
    const amount = m[2]?.toLowerCase()
    const unit = m[3].toLowerCase()
    const factor = unit.startsWith('hodin') ? 60 : unit.startsWith('sekund') ? 1 / 60 : 1
    const value =
      amount === undefined ? (factor === 60 ? 1 : 0) : amount === 'půl' ? 0.5 : amount === 'čtvrt' ? 0.25 : Number(amount.replace(',', '.'))
    out.push({ start: m.index, end: m.index + m[0].length, minutes: value * factor })
  }
  return out
}

/**
 * Navržená doba kroku z textu (ruling R10): rozsah → horní mez, více dob se sčítá, „45 minut až 1 hodinu“ → 60,
 * text v závorce se ignoruje, sekundy nahoru na minuty. 0 = bez `minutes` (žádná doba, namáčení, přes noc, nad 600 min).
 */
export function proposeMinutes(text: string): number {
  const plain = text.replace(/\([^)]*\)/g, ' ')
  if (SOAK.test(plain)) return 0
  let total = 0
  let last: Duration | null = null
  for (const d of durations(plain)) {
    if (last && RANGE_GAP.test(plain.slice(last.end, d.start))) {
      // rozsah přes dvě jednotky: počítá se jen horní mez
      total += Math.max(0, d.minutes - last.minutes)
      last = { ...d, minutes: Math.max(d.minutes, last.minutes) }
    } else {
      total += d.minutes
      last = d
    }
  }
  const minutes = Math.ceil(total - 1e-9)
  return minutes > PROPOSAL_MAX_MINUTES ? 0 : minutes
}

/** Krok z dat → krok s návrhem. Krok, který už je objekt, se vrací beze změny (ruční úpravy se nepřepisují). */
export function proposeStep(step: string | Step): Step {
  if (typeof step !== 'string') return step
  const minutes = proposeMinutes(step)
  return { text: step, ...(minutes > 0 ? { minutes } : {}), ...(PARALLEL_START.test(step) ? { parallel: true as const } : {}) }
}

const stepJson = (s: Step) =>
  `{ "text": ${JSON.stringify(s.text)}${s.minutes !== undefined ? `, "minutes": ${s.minutes}` : ''}${s.parallel ? ', "parallel": true' : ''} }`

/** Pole kroků ve stylu data/recipes: jeden krok na řádek, 4 mezery, klíče text, minutes, parallel. */
export function formatStepsBlock(steps: readonly Step[]): string {
  return `"steps": [\n${steps.map((s) => `    ${stepJson(s)}`).join(',\n')}\n  ]`
}

/** Nahradí v textu souboru jen pole "steps" (ostatní řádky bajtově beze změny); výsledek ověří přes JSON.parse. */
export function replaceStepsBlock(fileText: string, steps: readonly Step[]): string {
  const key = fileText.indexOf('\n  "steps": [')
  if (key === -1) throw new Error('pole "steps" nenalezeno na úrovni 2 mezer')
  const open = fileText.indexOf('[', key)
  let depth = 0
  let inString = false
  let close = -1
  for (let i = open; i < fileText.length && close === -1; i++) {
    const ch = fileText[i]
    if (inString) {
      if (ch === '\\') i++
      else if (ch === '"') inString = false
    } else if (ch === '"') inString = true
    else if (ch === '[' || ch === '{') depth++
    else if (ch === ']' || ch === '}') {
      depth--
      if (depth === 0) close = i
    }
  }
  if (close === -1) throw new Error('pole "steps" není uzavřené')
  const out = `${fileText.slice(0, key + 3)}${formatStepsBlock(steps)}${fileText.slice(close + 1)}`
  const expected = { ...(JSON.parse(fileText) as Record<string, unknown>), steps }
  if (!isDeepStrictEqual(JSON.parse(out), expected)) throw new Error('po nahrazení kroků se změnilo jiné pole')
  return out
}

export function formatProposalTable(id: string, steps: readonly Step[]): string {
  const out = [id, 'krok | návrh | text']
  steps.forEach((s, i) => {
    const proposal = [s.parallel ? 'mezitím' : '', s.minutes !== undefined ? `${s.minutes} min` : ''].filter(Boolean).join(' ') || '—'
    out.push(`${i + 1} | ${proposal} | ${s.text}`)
  })
  return out.join('\n')
}

export function parseStepTimesArgs(argv: string[]): { ids: string[]; write: boolean } {
  for (const a of argv) if (a.startsWith('--') && a !== '--write') throw new Error(`neznámý přepínač ${a} (použití: npm run step-times -- [<id>…] [--write])`)
  return {
    ids: argv.filter((a) => a !== '--write').map((a) => a.replace(/\.json$/, '').replace(/^.*\//, '')),
    write: argv.includes('--write'),
  }
}

async function main() {
  const { ids, write } = parseStepTimesArgs(process.argv.slice(2))
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const dir = path.join(root, 'data', 'recipes')
  const files = ids.length > 0 ? ids.map((id) => `${id}.json`) : (await readdir(dir)).filter((f) => f.endsWith('.json')).sort()
  for (const file of files) {
    const text = await readFile(path.join(dir, file), 'utf8')
    const data = JSON.parse(text) as { id: string; steps: (string | Step)[] }
    const steps = data.steps.map(proposeStep)
    console.log(`${formatProposalTable(data.id, steps)}\n`)
    if (write) await writeFile(path.join(dir, file), replaceStepsBlock(text, steps))
  }
  if (write) console.log(`Zapsáno ${files.length} souborů. Zkontroluj: npm run validate`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`CHYBA: ${(e as Error).message}`); process.exit(1) })
}
```

V `package.json` do `scripts` za `"check:recipe": …` přidat `"step-times": "tsx scripts/step-times.ts"` (čárka za předchozím řádkem).

- [ ] **Step 4: Spustit testy – musí projít**

Run: `npx vitest run scripts/step-times.test.ts`
Expected: PASS. Pokud některý případ v tabulce `proposeMinutes` selže, oprav regex, ne očekávání (tabulka je ruling R10).

- [ ] **Step 5: Zkouška nad daty bez zápisu**

Run: `npm run step-times -- spagety-s-masovou-omackou dusena-ryze zapekane-brambory`
Expected: tři tabulky; u špaget krok 3 „60 min“, krok 4 „—“, krok 5 „12 min“; u zapékaných brambor (kroky na jednom řádku) bez chyby. `git status data/` beze změny.

- [ ] **Step 6: Všechny kontroly**

Run: `npm test && npm run lint && npm run build && npm run validate`
Expected: PASS.

- [ ] **Step 7: Předat controlleru (necommitovat)**

Soubory: `scripts/step-times.ts`, `scripts/step-times.test.ts`, `package.json`. Návrh zprávy: `feat(R3): skript step-times navrhne minuty kroků z textu`.

---

### Task 8: Migrace 78 receptů – časy kroků (skript + dávka Haiku agentů)

Tento task řídí **controller** (hlavní session), ne jeden implementátor: spustí skript, rozdělí recepty do dávek, dispatchne agenty, ověří a nechá zrevidovat.

**Files:**
- Modify: `data/recipes/*.json` (všech 78; jen pole `steps`, případně `timeMinutes` a tag `rychle`)
- Create: `src/content/stepTimes.test.ts`
- Pracovní soubory jen ve scratchpadu (`…/scratchpad/f10-migrace/`): návrhy, kontrolní skript, reporty agentů.

**Interfaces:**
- Consumes: `npm run step-times` (Task 7), `npm run validate` + `stepTimingWarnings` (Task 6), `npm run check:recipe` s časovou osou (Task 6), `stepTimeline` (Task 1), `loadContent`.
- Produces: data, kde každý krok je objekt a každý knižní recept má „Hotovo“ v intervalu `[timeMinutes / 2, timeMinutes]`.

**Pravidla časování** (tentýž text vloží Task 9 do `SKILL.md` krok 7; brief agentů ho obsahuje celý – ruling R12):

```
PRAVIDLA ČASOVÁNÍ KROKŮ
- Krok je objekt { "text", "minutes"?, "parallel"? }; text kroku se kvůli času nemění.
- minutes = doba kroku od jeho začátku do začátku dalšího kroku, aktivní práce + čekání, celé minuty ≥ 1 („duš 30 minut“ = 30; „přiveď k varu a vař 10 minut“ = čas do varu + 10).
- Rozsah ve zdroji → horní mez („20–25 minut“ → 25, „5 až 10 minut“ → 10); „asi 1 hodinu“ → 60; „1,5 hodiny“ → 90.
- Krok bez času v textu odhadni z praxe pro 4 porce: krájení nebo loupání zeleniny 5–10 (podle množství), opečení masa dozlatova 8–10, osmahnutí cibule 5–8, přivedení k varu 1 l ≈ 8, 2 l ≈ 10, 4 l ≈ 15, smíchání nebo vmíchání 2–3, rozehřátí pánve s tukem 2–3, scezení 2, vyválení nebo tvarování těsta 10–15.
- Bez minutes: krátký pokyn bez práce (Osol, Dochuť, Vyndej bobkový list, Sundej z ohně, Podávej), předehřátí trouby (běží během přípravy), namáčení přes noc a jiné čekání, které timeMinutes nezahrnuje (marinování, chlazení ≥ 4 h, tag pripravit-predem).
- "parallel": true jen u kroku, který běží během čekání předchozího kroku: text začíná „Mezitím“ nebo „Zatímco“, nebo jde zjevně o souběžnou přípravu (těstoviny se vaří, zatímco se omáčka dusí). Souběžný krok smí mít minutes (pro informaci), do součtu se nepočítá. První krok nikdy parallel. Pořadí kroků neměň.
- Hotovo = součet minutes nesouběžných kroků; musí ležet mezi polovinou a celým timeMinutes (validátor jinak varuje). Když neleží: nejdřív oprav kroky (chybí souběžnost, přehnaný odhad), teprve pak timeMinutes. timeMinutes uprav, jen když je zjevně špatně (časy ze zdroje dávají víc nebo méně), zaokrouhli na 5 a zapiš do reportu staré → nové s důvodem. Když nové timeMinutes přesáhne 45 a recept má tag rychle, tag odeber.
- Kontrola: npm run check:recipe -- <id> vypíše časovou osu (krok | začátek | min | text, hotovo); npm run validate nesmí u receptu hlásit „minut“ ani „parallel“.
```

- [ ] **Step 1: Test dat (RED)**

Vytvořit `src/content/stepTimes.test.ts`:

```ts
// src/content/stepTimes.test.ts – časování kroků v datech (spec §5.1 [R3], fáze 10 Task 8)
import { stepTimeline } from '@/domain/steps'
import { loadContent } from './loadContent'

const books = loadContent().recipes.filter((r) => r.source.book !== 'vlastni')

test('každý knižní recept má časy kroků a „Hotovo“ mezi polovinou a celým timeMinutes', () => {
  const problems = books.flatMap((r) => {
    const { total } = stepTimeline(r.steps)
    return total === 0 || total > r.timeMinutes || total < r.timeMinutes / 2 ? [`${r.id}: Hotovo ${total}, timeMinutes ${r.timeMinutes}`] : []
  })
  expect(problems).toEqual([])
})

test('první krok žádného receptu není souběžný', () => {
  expect(books.filter((r) => r.steps[0].parallel).map((r) => r.id)).toEqual([])
})
```

Run: `npx vitest run src/content/stepTimes.test.ts`
Expected: FAIL (78 receptů s `Hotovo 0`).

- [ ] **Step 2: Návrh skriptem a zápis**

```bash
W=<scratchpad>/f10-migrace; mkdir -p "$W"
npm run step-times > "$W/navrh.txt"
npm run step-times -- --write > /dev/null
git diff --stat -- data/recipes | tail -1          # 78 files changed
npm run validate 2>&1 | grep -c 'žádný krok nemá minutes'   # počet receptů, kde skript nenašel žádnou dobu
npx vitest run scripts src/print src/pages
```

Expected: 78 změněných souborů, `validate` bez `CHYBA`, testy zelené (kromě `stepTimes.test.ts`).

- [ ] **Step 3: Kontrolní skript proti HEAD**

Vytvořit `<scratchpad>/f10-migrace/check-migration.mjs` (spouští se z kořene repa):

```js
// node <scratchpad>/f10-migrace/check-migration.mjs – data/recipes proti HEAD: texty kroků a ostatní pole beze změny
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'

const dir = 'data/recipes'
const texts = (r) => r.steps.map((s) => (typeof s === 'string' ? s : s.text))
const rest = (r) => {
  const { steps, timeMinutes, tags, ...other } = r
  return other
}
let bad = 0
for (const f of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
  const before = JSON.parse(execFileSync('git', ['show', `HEAD:${dir}/${f}`], { encoding: 'utf8' }))
  const after = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'))
  const problems = []
  if (!isDeepStrictEqual(texts(before), texts(after))) problems.push('změněný text nebo počet kroků')
  if (after.steps.some((s) => typeof s === 'string')) problems.push('krok zůstal řetězcem')
  if (!isDeepStrictEqual(rest(before), rest(after))) problems.push('změněné jiné pole než steps/timeMinutes/tags')
  const removed = before.tags.filter((t) => !after.tags.includes(t))
  if (after.tags.some((t) => !before.tags.includes(t)) || removed.some((t) => t !== 'rychle')) problems.push('tagy: smí zmizet jen rychle')
  if (before.timeMinutes !== after.timeMinutes) console.log(`${f}: timeMinutes ${before.timeMinutes} → ${after.timeMinutes}`)
  if (problems.length > 0) {
    bad++
    console.log(`${f}: ${problems.join(', ')}`)
  }
}
console.log(bad > 0 ? `CHYBA: ${bad} souborů` : 'OK: texty kroků a ostatní pole beze změny')
process.exit(bad > 0 ? 1 : 0)
```

Run: `node <scratchpad>/f10-migrace/check-migration.mjs`
Expected: `OK: …` (po skriptu se mění jen tvar kroků).

- [ ] **Step 4: Dávky a dispatch 8 Haiku agentů**

```bash
ls data/recipes/*.json | xargs -n1 basename | sed 's/\.json$//' | split -l 10 - "$W/davka-"
ls "$W"/davka-*      # 8 souborů: 7 × 10 + 1 × 8
```

Dispatch **všech 8 agentů v jedné zprávě** (model `haiku`, `subagent_type: general-purpose`), každý dostane brief níže s vyplněným `<seznam id>` (obsah jednoho souboru `davka-*`) a `<ws>` = `$W`. Agenti zapisují jen do svých souborů, proto mohou běžet paralelně.

```
Projekt: online kuchařka (React/TS) v /Users/dominik/git/personal-projects/cookbook. Recepty jsou v data/recipes/<id>.json.
Fáze 10 přidává ke krokům postupu časy (stopky v knize). Kroky už jsou objekty { "text", "minutes"?, "parallel"? };
skript doplnil minuty jen tam, kde je doba v textu kroku. Tvůj úkol: dotáhnout časování u těchto receptů:
<seznam id>

1. Přečti PRAVIDLA ČASOVÁNÍ KROKŮ níže a řiď se jimi doslova.
2. Pro každý recept: `npm run check:recipe -- <id>` (dole je tabulka krok | začátek | min | text a „hotovo“). Otevři data/recipes/<id>.json.
   Při pochybnosti o čase najdi recept ve zdroji: `grep -n "<source.titleOriginal>" extracted/<soubor>` (afrs-2003 → afrs-mco-p10110-42b.txt,
   navy-1944 → us-navy-cookbook-1944.txt, italian-1919 → italian-cookbook-gentile.txt, feldkochbuch-1940 → feldkochbuch-1940.txt;
   strana `=== PAGE <source.page> ===`). Čas ze zdroje má přednost před odhadem.
3. Uprav jen: "minutes" a "parallel" u kroků, případně "timeMinutes" a odebrání tagu "rychle" podle pravidel. Text kroků, pořadí kroků
   a všechna ostatní pole nech bajtově beze změny. Formát kroku: jeden krok na řádek, 4 mezery, `{ "text": "…", "minutes": 10, "parallel": true }`
   (klíče v tomto pořadí, chybějící vynech).
4. Po úpravách: `npm run validate` – u tvých receptů žádné varování obsahující „minut“ nebo „parallel“, 0 × CHYBA.
   `npx vitest run src/content/stepTimes.test.ts` – tvoje id se nesmí objevit v seznamu problémů (cizí id ignoruj, řeší je jiní agenti).
5. NEcommituj. Nespouštěj `npm run step-times -- --write`. Needituj jiné soubory než data/recipes/<tvoje id>.json. Nespouštěj subagenty.
6. Report do <ws>/report-<první id>.md: tabulka id | Hotovo | timeMinutes (staré → nové) | odhadnuté kroky (číslo kroku: minuty, z čeho) |
   souběžné kroky | poznámka; seznam nejistot. Vrať jen: status DONE / DONE_WITH_CONCERNS / BLOCKED, počet receptů, změny timeMinutes (id: staré → nové), 1 řádek concerns.

PRAVIDLA ČASOVÁNÍ KROKŮ
<celý blok „Pravidla časování“ z tohoto tasku>
```

- [ ] **Step 5: Ověření controllerem**

Po doběhnutí všech agentů:

```bash
node "$W/check-migration.mjs"                                   # OK, vypíše změny timeMinutes
npm run validate 2>&1 | grep -E 'minut|parallel' || echo 'bez varování o časech'
npx vitest run src/content/stepTimes.test.ts                     # PASS
npm test && npm run lint && npm run build && npm run validate
```

Každá změna `timeMinutes` musí mít důvod v některém reportu; chybějící důvod, změněný text, varování o časech nebo červený test → vrátit danému agentovi (`SendMessage`, max. 3 kola), pak Sonnet fix.

- [ ] **Step 6: Review migrace (Sonnet)**

Vybrat 10 receptů náhodně a zároveň aspoň jeden z každé knihy:

```bash
node -e 'const fs=require("fs");const d="data/recipes";const all=fs.readdirSync(d).filter(f=>f.endsWith(".json")).map(f=>JSON.parse(fs.readFileSync(d+"/"+f)));const pick=new Map();for(const b of ["afrs-2003","navy-1944","italian-1919","feldkochbuch-1940"]){const c=all.filter(r=>r.source.book===b);pick.set(c[Math.floor(Math.random()*c.length)].id,1)}while(pick.size<10){pick.set(all[Math.floor(Math.random()*all.length)].id,1)}console.log([...pick.keys()].join(" "))'
```

Dispatch reviewera (model `sonnet`) s briefem:

```
Review migrace časů kroků (fáze 10, spec docs/superpowers/specs/2026-10-14-cookbook-design.md §5.1 [R3]).
Recepty: <10 id>. Pravidla: blok PRAVIDLA ČASOVÁNÍ KROKŮ v docs/superpowers/plans/2026-10-15-phase10-step-timing.md (Task 8).
Pro každý recept: `npm run check:recipe -- <id>`, `git diff HEAD -- data/recipes/<id>.json`, zdroj v extracted/ (grep podle source.titleOriginal, strana source.page).
Ověř: časy ze zdroje jsou převzaté (rozsah → horní mez); odhady jsou realistické pro 4 porce v domácí kuchyni; parallel jen u skutečně souběžných kroků
a nikdy u prvního; Hotovo dává smysl proti timeMinutes; změna timeMinutes je zdůvodněná v reportu (<ws>/report-*.md); text kroků je beze změny.
Navíc projdi `node <ws>/check-migration.mjs` a výstup `npm run validate`.
Nic neopravuj. Vrať verdikt APPROVED / CHANGES_REQUESTED a nálezy: id | krok | problém | návrh (minuty/parallel/timeMinutes).
```

Nálezy opraví controller nebo Sonnet fix agent (jen pole z kroku 3 briefu), pak scoped re-review dotčených receptů.

- [ ] **Step 7: Předat k commitu**

Soubory: `data/recipes/*.json` (78, `git add data/recipes/*.json` – explicitní glob jen na recepty, ne `-A`), `src/content/stepTimes.test.ts`. Návrh zprávy: `data(R3): časy kroků ve všech 78 receptech (step-times + dávka agentů)`. Do těla commitu seznam změn `timeMinutes` (id: staré → nové).

---

### Task 9: Skill `recipe-digitize` zapisuje kroky s časem

**Files:**
- Modify: `.claude/skills/recipe-digitize/SKILL.md` (krok 7, krok 9, tabulka metadat, červené praporky, časté chyby), `.claude/skills/recipe-digitize/reference/example-recipe.json`, `.claude/skills/recipe-digitize/reference/batch.md`
- Create: `scripts/skill-example.test.ts`
- Beze změny: `reference/units.md`, `reference/afrs-card.md`, `reference/books.md`, `reference/scaling-rules.md`, `reference/ingredients.md`. Odkazované vzory `data/recipes/spagety-s-masovou-omackou.json` a `data/recipes/bramborova-frittata.json` mají kroky s časem už z Tasku 8.

**Interfaces:**
- Consumes: blok „Pravidla časování“ (Task 8), `npm run step-times` (Task 7), `check:recipe` s časovou osou (Task 6), `RecipeSchema`, `stepTimeline`.
- Produces: skill, podle kterého další digitalizace zapisuje kroky jako objekty s `minutes`/`parallel`.

- [ ] **Step 1: Napsat failing test**

Vytvořit `scripts/skill-example.test.ts`:

```ts
// scripts/skill-example.test.ts – vzor a pravidla skillu recipe-digitize odpovídají schématu fáze 10 (R3)
import { readFileSync } from 'node:fs'
import { RecipeSchema } from '../src/domain/schema'
import { stepTimeline } from '../src/domain/steps'

const skillDir = '.claude/skills/recipe-digitize'

test('vzor skillu: kroky jako objekty s časy, Hotovo mezi polovinou a celým timeMinutes', () => {
  const raw = JSON.parse(readFileSync(`${skillDir}/reference/example-recipe.json`, 'utf8')) as { steps: unknown[] }
  expect(raw.steps.every((s) => typeof s === 'object' && s !== null)).toBe(true)
  const r = RecipeSchema.parse(raw)
  const { total } = stepTimeline(r.steps)
  expect(total).toBeGreaterThanOrEqual(r.timeMinutes / 2)
  expect(total).toBeLessThanOrEqual(r.timeMinutes)
})

test('SKILL.md krok 7 nese pravidla časování a nástroj step-times; batch.md je vyžaduje v briefu i v review', () => {
  const skill = readFileSync(`${skillDir}/SKILL.md`, 'utf8')
  expect(skill).toContain('PRAVIDLA ČASOVÁNÍ KROKŮ')
  expect(skill).toContain('npm run step-times -- <id>')
  expect(skill).toMatch(/Hotovo.*timeMinutes/)
  const batch = readFileSync(`${skillDir}/reference/batch.md`, 'utf8')
  expect(batch).toContain('kroky s časem podle SKILL.md kroku 7')
  expect(batch).toContain('časy kroků')
})
```

Run: `npx vitest run scripts/skill-example.test.ts`
Expected: FAIL.

- [ ] **Step 2: Vzor `example-recipe.json`**

V `.claude/skills/recipe-digitize/reference/example-recipe.json` nahradit pole `steps`:

```json
  "steps": [
    { "text": "Rýži, studenou vodu, sůl a olej dej do hrnce a přiveď k varu. Občas zamíchej.", "minutes": 5 },
    { "text": "Hrnec pevně přikryj a na mírném ohni duš 20–25 minut. Nemíchej.", "minutes": 25 },
    { "text": "Sundej z ohně." }
  ],
```

(Hotovo 30 = `timeMinutes` 30; 420 ml vody přijde k varu asi za 5 minut, dušení podle horní meze zdroje, pokyn bez času.)

- [ ] **Step 3: `SKILL.md`**

1. Řádek začínající `- [ ] **7. Přelož kroky**:` nahradit celý (včetně stávajícího textu, který zůstává jako první věta) za:

```markdown
- [ ] **7. Přelož kroky a dej jim čas**: krátké imperativní věty, jeden krok = jedna činnost, °C, bez CCP/HACCP a pokynů pro výdej. Odkaz na jinou kartu (`See Recipe No. E 004 00`) nahraď nejjednodušším domácím postupem (viz `reference/afrs-card.md` §Odkazy); nepřebírej z ní vybavení ani suroviny kromě soli do slévané vody. „Set aside for Step 3“, který krok 3 nepoužije → přidej surovinu do uvedeného kroku (zdroj ví, kam patří) a napiš to do `modernNote`. Každý krok zapiš jako objekt `{ "text": "…", "minutes": 10 }` (souběžný navíc `"parallel": true`); návrh minut z textu kroků vypíše `npm run step-times -- <id>` (s `--write` přepíše kroky zadané řetězcem v souboru, ručně doplněné objekty nechá).

  PRAVIDLA ČASOVÁNÍ KROKŮ
  - Krok je objekt { "text", "minutes"?, "parallel"? }; text kroku se kvůli času nemění.
  - minutes = doba kroku od jeho začátku do začátku dalšího kroku, aktivní práce + čekání, celé minuty ≥ 1 („duš 30 minut“ = 30; „přiveď k varu a vař 10 minut“ = čas do varu + 10).
  - Rozsah ve zdroji → horní mez („20–25 minut“ → 25, „5 až 10 minut“ → 10); „asi 1 hodinu“ → 60; „1,5 hodiny“ → 90.
  - Krok bez času v textu odhadni z praxe pro 4 porce: krájení nebo loupání zeleniny 5–10 (podle množství), opečení masa dozlatova 8–10, osmahnutí cibule 5–8, přivedení k varu 1 l ≈ 8, 2 l ≈ 10, 4 l ≈ 15, smíchání nebo vmíchání 2–3, rozehřátí pánve s tukem 2–3, scezení 2, vyválení nebo tvarování těsta 10–15.
  - Bez minutes: krátký pokyn bez práce (Osol, Dochuť, Vyndej bobkový list, Sundej z ohně, Podávej), předehřátí trouby (běží během přípravy), namáčení přes noc a jiné čekání, které timeMinutes nezahrnuje (marinování, chlazení ≥ 4 h, tag pripravit-predem).
  - "parallel": true jen u kroku, který běží během čekání předchozího kroku: text začíná „Mezitím“ nebo „Zatímco“, nebo jde zjevně o souběžnou přípravu (těstoviny se vaří, zatímco se omáčka dusí). Souběžný krok smí mít minutes (pro informaci), do součtu se nepočítá. První krok nikdy parallel. Pořadí kroků neměň.
  - Hotovo = součet minutes nesouběžných kroků; musí ležet mezi polovinou a celým timeMinutes (validátor jinak varuje). Když neleží: nejdřív oprav kroky (chybí souběžnost, přehnaný odhad), teprve pak timeMinutes. timeMinutes uprav, jen když je zjevně špatně (časy ze zdroje dávají víc nebo méně), zaokrouhli na 5 a zapiš do reportu staré → nové s důvodem. Když nové timeMinutes přesáhne 45 a recept má tag rychle, tag odeber.
  - Kontrola: npm run check:recipe -- <id> vypíše časovou osu (krok | začátek | min | text, hotovo); npm run validate nesmí u receptu hlásit „minut“ ani „parallel“.
```

2. V kroku 9 za větu `Každý \`NÁLEZ:\` buď oprav, nebo zdůvodni v \`modernNote\` – …` (konec odstavce) připojit větu: `Výpis \`check:recipe\` končí časovou osou kroků a řádkem \`hotovo: …\`; varování validátoru o minutách kroků oprav podle kroku 7.`

3. V tabulce „Metadata – rychlý přehled“ řádek `timeMinutes` nahradit:

```markdown
| `timeMinutes` | nejdelší souběžná cesta pro 4 porce (ne součet paralelních činností), bez namáčení přes noc; karta bez časů → odhad z kroků, zaokrouhli na 5. Hotovo (součet `minutes` nesouběžných kroků) leží mezi polovinou a celým `timeMinutes` |
```

4. Do „Červené praporky – zastav se a oprav“ přidat odrážku:

```markdown
- Krok s dobou ve zdroji („simmer 20 minutes“) bez `minutes`, krok jako prostý řetězec, nebo Hotovo mimo ½–1× `timeMinutes`.
```

5. Do tabulky „Časté chyby z minulých dávek“ přidat řádek:

```markdown
| Kroky jako prosté řetězce, čas jen v textu | objekty `{ "text", "minutes"?, "parallel"? }` podle kroku 7; `npm run step-times -- <id>` navrhne minuty |
```

- [ ] **Step 4: `reference/batch.md`**

1. V šabloně briefu (sekce 3) nahradit bod 5:

```
5. Ulož `data/recipes/<id>.json` (kroky s časem podle SKILL.md kroku 7); `npm run validate` (0 CHYBA, žádné varování o minutách kroků); `npm run check:recipe -- <id> --portion "<Portion z karty>" --kcal <kcal z karty>` – každý NÁLEZ oprav, nebo zdůvodni.
```

2. V bodě 7 téže šablony za `výstup check:recipe` doplnit `(včetně časové osy kroků)`.

3. V sekci 4, bod 6 (co kontroluje reviewer) za `čeština kroků;` vložit `časy kroků (čas ze zdroje převzatý, rozsah → horní mez, odhady realistické, souběžné kroky, Hotovo vs. timeMinutes);`.

4. Na konec sekce 5 „Uzavření fáze“ přidat odrážku:

```markdown
- Hromadná úprava už hotových receptů (vzor: doplnění časů kroků ve fázi 10, `docs/superpowers/plans/2026-10-15-phase10-step-timing.md` Task 8): skript navrhne, co jde z textu, agenti (Haiku) po ~10 receptech doplní zbytek podle pravidel ve skillu, kontrolní skript proti HEAD hlídá, že se nezměnilo nic jiného, reviewer namátkově ověří 10 receptů proti zdroji.
```

- [ ] **Step 5: Spustit testy – musí projít**

Run: `npx vitest run scripts/skill-example.test.ts`
Expected: PASS.

- [ ] **Step 6: Všechny kontroly**

Run: `npm test && npm run lint && npm run build && npm run validate`
Expected: PASS, `validate` bez varování o časech kroků.

- [ ] **Step 7: Předat controlleru (necommitovat)**

Soubory: `.claude/skills/recipe-digitize/SKILL.md`, `.claude/skills/recipe-digitize/reference/example-recipe.json`, `.claude/skills/recipe-digitize/reference/batch.md`, `scripts/skill-example.test.ts`. Návrh zprávy: `docs(skill): recipe-digitize zapisuje kroky s časem (pravidla časování, step-times)`.

---

### Task 10: Ruční kontrola v prohlížeči (agent-browser) a opravy nálezů

**Files:** podle nálezů. Zápis do tohoto plánu pod „Nálezy z ruční kontroly“ (na konec souboru). Pomocné soubory jen ve scratchpadu (`…/scratchpad/t10/`), ne v repu.

Implementátor použije skill `agent-browser` (nejdřív `agent-browser skills get core`). Spustí vlastní dev server `npm run dev -- --port <volný port> --strictPort` na pozadí a po skončení ho zastaví (`agent-browser close`, ukončit vite). Interakce vždy **reálným vstupem** (`agent-browser click`, `fill`/`type`, `mouse move/down/up`, `mouse wheel`, `press`, dotyk přes CDP skript níže). `eval` slouží jen ke čtení DOM, měření, čtení `localStorage` a k přípravě stavu (posun hodin `Date.now`, `localStorage.setItem` před `reload`, `window.print = () => {}`). Před kliknutím ověřit `document.elementFromPoint(střed)` = cílový prvek. Zapnout `agent-browser set media light reduced-motion`; tab stopek musí být v popředí (rAF a časovače v tabu na pozadí stojí – viz paměť projektu). Viewporty: desktop `set viewport 1390 800`, mobil `390 844` a `320 568`, po změně viewportu `reload`. Na začátku `eval "localStorage.clear()"` + `reload`. Hlavní recept kontroly: `#/recept/spagety-s-masovou-omackou` (souběžné vaření špaget, recept přes hodinu); druhý: `#/recept/dusena-ryze` nebo jiný krátký.

**Pomocný CDP skript** `…/scratchpad/t10/cdp.mjs` (Node 25 má globální `WebSocket`; WebSocket URL dá `agent-browser cdp-url`; druhý argument je kus URL stránky, např. `localhost:5199`, nebo `-`, když `cdp-url` vrací přímo WebSocket stránky):

```js
// node cdp.mjs <ws-url> <url-fragment|-> tap x y | swipe x1 y1 x2 y2 [kroky] | pdf <soubor.pdf> | printstyle <selektor>
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
} else if (cmd === 'printstyle') {
  // emulace média print trvá jen po dobu připojené session, proto měření ve stejném skriptu
  await s('Emulation.setEmulatedMedia', { media: 'print' })
  const expr = `(() => { const el = document.querySelector(${JSON.stringify(args[0])}); return el ? getComputedStyle(el).display : 'nenalezeno' })()`
  const { result } = await s('Runtime.evaluate', { expression: expr, returnByValue: true })
  console.log(result.value)
  await s('Emulation.setEmulatedMedia', { media: '' })
} else {
  throw new Error(`neznámý příkaz ${cmd}`)
}
ws.close()
```

**Měřicí výraz pro stopky** (`agent-browser eval`, vrací stav, nic nemění):

```js
(() => {
  const page = [...document.querySelectorAll('.book__slot')].find((s) => s.querySelector('.step-stopwatch')) ?? document
  const time = page.querySelector('.step-stopwatch [role="timer"]')?.textContent
  const items = [...page.querySelectorAll('.recipe-steps li')]
  return {
    time,
    marks: items.map((li) => li.querySelector('.step-time')?.textContent ?? null),
    current: items.findIndex((li) => li.getAttribute('aria-current') === 'step'),
    total: page.querySelector('.recipe-steps-total')?.textContent,
  }
})()
```

- [ ] **Step 1: Desktop 1390×800 – značky a „Hotovo“ v knize**
  - `#/recept/spagety-s-masovou-omackou`: pravá strana má nad postupem řádek stopek (čas `0:00`, Spustit, Vynulovat zakázané), u každého kroku značku (první `0:00`, souběžný krok „mezitím“, kroky přes hodinu `1:…:00`), pod postupem „Hotovo: …“. Levá strana: `eval "document.querySelectorAll('.book__slot--left .step-time, .book__slot--left .step-stopwatch').length"` → 0. Screenshot pravé strany.
  - Značky se nezalamují: `eval "[...document.querySelectorAll('.step-time')].every(m => m.getClientRects().length === 1 && getComputedStyle(m).whiteSpace === 'nowrap')"` → `true`. Značka nepřekrývá text kroku (obdélník značky a obdélník `Range` prvního slova textu se neprotínají).
  - Měřicím výrazem: značky = časová osa z `npm run check:recipe -- spagety-s-masovou-omackou` (sloupec začátek), „Hotovo“ = řádek `hotovo`.

- [ ] **Step 2: Desktop – stopky běží a zvýrazňují krok**
  - Reálný klik na „Spustit“ (`elementFromPoint` = tlačítko). `agent-browser wait 3500`, měřicí výraz: čas `0:03` nebo `0:04`, `current` = 0, tlačítko se jmenuje „Pauza“. Screenshot se zvýrazněným krokem.
  - Posun hodin (příprava stavu): `eval "(() => { const real = Date.now.bind(Date); const shift = (window.__shift ?? 0) + <ms>; window.__shift = shift; Date.now = () => real() + shift })()"` s `<ms>` tak, aby uplynulý čas padl do druhého časovaného kroku (ze sloupce začátek); po `wait 1500` měřicí výraz: `current` = index posledního nesouběžného kroku s minutami, který už začal; souběžný krok („mezitím“) se nezvýrazní nikdy, krok bez minut také ne. Totéž pro čas za „Hotovo“: `current` = −1, čas dál běží.
  - Reálný klik „Pauza“, `wait 2500`: čas se nezmění. „Spustit“ pokračuje. „Vynulovat“: `0:00`, žádné `aria-current`, „Vynulovat“ zakázané.
  - Listování pryč a zpět (tah myší za `.page-edge--right`, pak zpět) → stopky `0:00` (stav jen v paměti stránky, ruling R7). [Final fix FF1: od fix vlny stopky po návratu běží dál.] Konzole bez chyb (`agent-browser console` / `errors`).
  - Recept bez časů (vytvořit vlastní recept bez prefixů, Step 6) nemá stopky ani značky.

- [ ] **Step 3: Desktop – tisk do PDF (A4 a brožurka)**
  - Na receptu: `eval "window.print = () => {}"`, reálný klik na „Tisk: recept (A4)“ v `.book-controls`, `eval "document.documentElement.dataset.print"` → `recipe`, `node cdp.mjs <ws> <port> pdf …/t10/recept.pdf`. Přečíst PDF (nástroj Read, případně `pdftotext`): u každého kroku značka (`0:00`, …, „mezitím“), za posledním krokem „Hotovo: …“, **žádné** stopky ani tlačítka. `eval "dispatchEvent(new Event('afterprint'))"`.
  - Brožurka: přidat recept do košíku, `#/kosik`, `window.print = () => {}`, reálný klik „Tisknout brožurku“, `data-print` → `booklet`, PDF `…/t10/brozurka.pdf`: značky u kroků, „Hotovo“ na téže stránce jako poslední krok.
  - Záložní tisk knihy (bez `data-print`): `node cdp.mjs <ws> <port> printstyle .step-stopwatch` → `none`.

- [ ] **Step 4: Mobil 390×844 – jedna stránka, stopky dotykem**
  - `#/recept/spagety-s-masovou-omackou`: jedna stránka `.recipe-page--single`, stopky mezi nadpisem „Postup“ a kroky, značky u kroků, „Hotovo“. `eval "document.documentElement.scrollWidth === innerWidth"` → `true`.
  - Doscrollovat k postupu reálným tahem (`node cdp.mjs <ws> <port> swipe 200 650 205 250`) nebo `mouse wheel 400 0`; klepnutí na „Spustit“ dotykem (`tap` na střed tlačítka, `elementFromPoint` = tlačítko) → stopky běží (`wait 2500`, čas ≥ `0:02`), stránka se neotočila (hlášení `Strana N` beze změny). Posun hodin jako ve Step 2 → zvýrazněný krok viditelný, screenshot.
  - Švih vodorovně přes řádek stopek otočí stránku a stopky nespustí ani nevynulují cizí recept (po návratu `0:00`).
  - Tlačítka stopek: výška ≥ 24 px (`getBoundingClientRect().height`), obdélníky stopek se neprotínají s `.recipe-actions` ani s nadpisem.

- [ ] **Step 5: Mobil 320×568**
  - Řádek stopek se zalomí celými prvky (čas a tlačítka uvnitř šířky stránky: každý obdélník `right ≤` pravý okraj `.page-content`), `scrollWidth === innerWidth` → `true`, `elementFromPoint(střed)` každého tlačítka stopek = tlačítko. Screenshot postupu s nejdelší značkou (`1:xx:00`).
  - Stopky běží po klepnutí (`tap`) jako ve Step 4.

- [ ] **Step 6: Formulář vlastního receptu**
  - Desktop: obsah → „Nový recept“ (reálný klik). Vyplnit název, čas 40, surovinu (výběr z nabídky), postup reálným psaním: `5 min: Nakrájej cibuli.`, `10 min: Osmaž cibuli.`, `mezitím 15 min: Uvař brambory.`, `Osol.`, `20 min: Duš.`. Nápověda pod polem je vidět (screenshot). Uložit → v knize značky `0:00`, `5:00`, `mezitím`, `15:00`, `15:00`, „Hotovo: 35:00“, stopky nad postupem.
  - „Upravit“ → textarea obsahuje přesně tytéž řádky s prefixy. Změnit první řádek na `0 min: Nakrájej cibuli.` → Uložit → hláška u pole Postup „Krok 1: doba musí být 1–600 minut“, fokus na poli; vrátit `5 min:` a uložit.
  - Druhý vlastní recept bez prefixů → v knize bez značek, bez „Hotovo“, bez stopek.

- [ ] **Step 7: Opravy a zápis**
  Každý nález opravit s testem tam, kde to jde (CSS-only opravy ověřit screenshotem nebo měřením). Zapsat pod „Nálezy z ruční kontroly“ ve formátu z plánu fáze 9 (číslo, nález, soubor, oprava, ověření) + sekce „Odloženo (s důvodem)“ a „Naměřeno“ (značky a Hotovo vs. `check:recipe`, běh stopek a zvýraznění při 1390/390/320, obdélníky a výšky tlačítek stopek na 320 px, PDF: počet stran, značky a Hotovo pro A4 i brožurku, `printstyle`). Nakonec `npm test && npm run lint && npm run build && npm run validate`.

- [ ] **Step 8: Předat controlleru (necommitovat)**
  Změněné soubory + `docs/superpowers/plans/2026-10-15-phase10-step-timing.md`. Návrh zprávy: `fix(R3): nálezy z ruční kontroly fáze 10`.

---

## Pokrytí specu (self-review)

| Požadavek [R3] | Task |
|---|---|
| §5.1 krok = `{ text, minutes?, parallel? }`, `minutes` celé ≥ 1, schéma přijme řetězec a normalizuje na `{ text }` | 1 |
| §5.1 začátek kroku = součet `minutes` předchozích nesouběžných; souběžný ani krok bez `minutes` čas nepřidává; „Hotovo“ = součet | 1 (`stepTimeline`) |
| §2 značka stopek u každého kroku v knize, formát `0:00` / `35:00` / `1:10:00`, souběžný „mezitím“, pod postupem „Hotovo“ | 1 (formát), 2 |
| §2 totéž v tisku (A4 i brožurka) | 3 |
| §2 malé stopky nad postupem: Spustit · Pauza · Vynulovat, uplynulý čas, zvýraznění běžícího kroku, stav jen v paměti, v tisku skryté, nic dalšího | 4 |
| §5.1 formulář: řádek kroku smí začínat `15 min:` a/nebo `mezitím:` | 5 |
| §5.1 validátor varuje, když součet > `timeMinutes` nebo < polovina; `timeMinutes` zůstává | 6 (+ varování bez minut, `check:recipe`) |
| §5.1 všech 78 receptů dávkově: skript navrhne minuty z textu, agenti doplní a ověří proti zdroji | 7, 8 |
| §5.1 skill `recipe-digitize` od fáze 10 zapisuje kroky s časem | 9 |
| §8 bod 10 – vše výše + ruční kontrola (desktop, mobil, tisk, stopky) | 1–10 |
| Starší data (vlastní recepty v úložišti, import, export) fungují dál | 1 |

**Placeholder scan:** žádné „TBD/TODO/doplnit později“. Každý krok s kódem má celý kód nebo přesnou náhradu konkrétního bloku. Task 8 a 10 jsou z povahy věci řízené práce a ruční kontrola; jejich proměnné části (`<seznam id>`, `<ms>` posunu hodin, nálezy) se vyplňují za běhu podle návodu v tasku.

**Konzistence typů a jmen:** `Step` (Task 1) používají `steps.ts`, `draft.ts` (Task 5), `step-times.ts` (Task 7). `stepTimeline(steps) → { steps: { startMinutes }[], total }` (Task 1) používají `RecipeMethod` (Task 2, 4), `RecipePrintStep` (Task 3), `currentStepIndex` (Task 4), `stepTimingWarnings` a `formatStepTimeline` (Task 6), `stepTimes.test.ts` (Task 8), `skill-example.test.ts` (Task 9). `formatStopwatch`/`formatClock` jsou v `src/domain/steps.ts`, UI je bere z `labels.ts` (re-export), skripty z domény. `StepTime({ start })` a `StepsTotal({ total, className })` (Task 2) používá Task 3 s `className="print-recipe__total"`. `useStopwatch()` → `{ elapsedSeconds, running, start, pause, reset }` odpovídá props `StepStopwatch` (`onStart`, `onPause`, `onReset`). `parseStepLine`/`formatStepLine`/`parseSteps(): Step[]` (Task 5). `proposeStep(string | Step): Step`, `replaceStepsBlock(text, steps)` (Task 7) používá Task 8 přes CLI. Ruling R2 říká, že `parallel` u prvního kroku se ignoruje – stejně v `stepTimeline`, `currentStepIndex` (přes `startMinutes`), validátoru (varování) i pravidlech časování.

**Review Focus:** pět položek výše má testy ve vlastnících tascích (1, 2, 4, 5) a měření v Tasku 10. Vědomě bez automatického testu: skutečná geometrie stopek a značek na 320 px a obsah PDF – ověřuje Task 10 měřením a čtením PDF.

## Nálezy z ruční kontroly

Ruční kontrola skillem `agent-browser` (reálný pointer, dotyk přes CDP `Input.dispatchTouchEvent`, tisk přes `Page.printToPDF` s `preferCSSPageSize`), viewporty 1390×800, 390×844 a 320×568, vlastní dev server na portu 5301.

| # | Nález | Soubor | Oprava | Ověření |
|---|---|---|---|---|
| 1 | Značka „Hotovo“ (`.step-time--total`) měla na řádku `.recipe-steps-total` (0,85em) jen 9,79 px místo 11,52 px u značek kroků (0,72em × 0,85em); odložený Minor z Tasku 2. Na 320 px je 9,8 px strojopisu těžko čitelných a značka je menší než „Hotovo:“ vedle ní. | `src/styles/paper.css`, `src/styles/paper.test.ts` | `.step-time--total { font-size: 0.85em }` (vyruší zmenšení rodiče, značka = 11,56 px). Tisk to neovlivní (`.print-root .step-time` má vyšší specificitu, 8pt). | Test v `paper.test.ts` (RED před úpravou, GREEN po). Měření `getComputedStyle`: 9,792 px → 11,56 px na 1390 i 320 px; „Hotovo“ se vejde (obdélník uvnitř `.page-content`). |

### Odloženo (s důvodem)

- Měřicí výraz posunu hodin z briefu (`real = Date.now.bind(Date)` při každém volání) se při opakovaném použití skládá (posun se připočítá k už posunutému `Date.now`); při měření jsem ukládal původní `Date.now` jednou do `window.__real`. Nejde o chybu aplikace, jen o poznámku pro příští ruční kontroly.
- Při švihu 110 px z tlačítka „Spustit“ (390 px) se stránka neotočí (švih má dosáhnout poloviny šířky stránky, jinak se vrátí); stopky se přitom nespustí. Chování fáze 9, ne stopek. Práh otočení: `finishFlip` v `src/book/flip.ts` dokončí otočení od `progress >= 0.5` (polovina šířky stránky) nebo švihem od rychlosti `FLICK = 0.8` px/ms; rozhodnutí o švihu vs. scrollu určují `SWIPE_SLOP_PX = 10` a `SWIPE_HORIZONTAL_RATIO = 1.2` v `src/book/useFlipDrag.ts`.
- V datech má `spagety-s-masovou-omackou` souběžný krok („mezitím“, špagety) až na konci postupu za „Vyndej bobkové listy“ (zdrojové pořadí kroků); značky odpovídají `check:recipe`, takže bez opravy.

### Naměřeno

- Artefakty ruční kontroly (screenshoty, PDF): `/private/tmp/claude-501/-Users-dominik-git-personal-projects-cookbook/0a1747ea-dac3-4f9d-a942-157461c01e14/scratchpad/t10/`.
- Značky vs. `check:recipe` (`spagety-s-masovou-omackou`): `0:00, 8:00, 11:00, 1:19:00, mezitím`, „Hotovo: 1:19:00“ (79 min, `timeMinutes` 90) – shoda 1:1. Levá strana: 0 značek i stopek. `.step-time` všechny jednořádkové, `white-space: nowrap`; obdélník značky se neprotíná s prvním slovem kroku (všech 5). Druhé recepty: `dusena-ryze` 0:00, 5:00, 30:00 / Hotovo 30:00; `kroupova-polevka-s-masem` 0:00, 10:00, 10:00, 3:10:00 / Hotovo 3:10:00 (1390 i 320 px, vše uvnitř stránky, bez vodorovného scrollu).
- Stopky 1390: Spustit (reálný klik, `elementFromPoint` = tlačítko, výška 28,8 px) → po 3,5 s `0:03`, `current` 0, tlačítko „Pauza“. Posun hodin: 9:10 → `current` 1; 1:18:12 → 2 (poslední časovaný krok); 2:37 a 4:01 (za „Hotovo“) → −1, čas dál běží; souběžný ani bezčasý krok se nezvýraznil nikdy. Pauza: 4:01:23 → po 2,5 s beze změny; Spustit pokračuje; Vynulovat → `0:00`, 0 × `aria-current`, Vynulovat zakázané. Listování pryč (tah myší za pravý okraj → `spanelska-ryze`) a zpět → `0:00`; konzole bez chyb.
- Stopky 390 (jedna stránka `.recipe-page--single`): `scrollWidth === innerWidth` true; stopky (y 1167–1195) mezi nadpisem „Postup“ (bottom 1157) a kroky, neprotínají `.recipe-actions` (178–212) ani nadpis; tlačítka 28,8 px. Tap (CDP dotyk) na „Spustit“ → `0:02` po 2,5 s, hlášení „Strana 67 z 99“ beze změny; posun hodin o 9 min → zvýrazněn krok 2 (screenshot). Vodorovný švih přes řádek stopek (z tlačítka i z volné plochy) stopky nespustil, cizí recept (`spagety-s-maslem-a-syrem`, `spanelska-ryze`) měl `0:00`, po návratu `0:00`.
- Stopky 320: řádek v jedné řadě (čas 32–69, Spustit 77–154, Vynulovat 162–257 px, `.page-content` končí na 312,75), `scrollWidth === innerWidth` true, `elementFromPoint(střed)` = tlačítko u obou, výška 28,8 px, neprotíná nadpis ani `.recipe-actions`; nejdelší značka `1:19:00` 54 px široká (54–108), „Hotovo“ 234–288; stopky `1:10:04` s hodinami se vejdou (32–91), zvýrazněn krok 3. Dotyk spouští stejně jako na 390.
- Tisk A4 (`data-print=recipe`): 1 strana A4, značky `0:00, 8:00, 11:00, 1:19:00, mezitím`, „Hotovo: 1:19:00“ za posledním krokem, v textu PDF 0 × „Spustit/Vynulovat/stopky“; `afterprint` smaže `data-print`. Brožurka (`data-print=booklet`): 2 strany A4 na šířku, značky u všech kroků, „Hotovo: 1:19:00“ na téže straně jako krok 5. `printstyle .step-stopwatch` v záložním tisku knihy (bez `data-print`) → `none`.
- Formulář (1390): nápověda pod polem Postup viditelná; uložení `5 min:`, `10 min:`, `mezitím 15 min:`, `Osol.`, `20 min:` → značky `0:00, 5:00, mezitím, 15:00, 15:00`, „Hotovo: 35:00“, stopky nad postupem, levá strana bez značek. „Upravit“ → textarea obsahuje tytéž řádky s prefixy. `0 min:` → u pole hláška „Krok 1: doba musí být 1–600 minut“, fokus na textarea, `aria-invalid=true`, `aria-describedby` = chyba + nápověda; po vrácení `5 min:` uloženo. Druhý vlastní recept („Nakrájej cibuli.“, „Mezitím osol.“) → bez značek, „Hotovo“ i stopek (0 prvků), „Mezitím“ zůstalo textem.
