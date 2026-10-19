# Recepty na vejlety, tábory a nebo když je do vejplaty daleko

Webová „kniha“ s listováním, ve které je přes 670 receptů digitalizovaných ze čtyř historických kuchařek. Recepty jsou přepočtené na **4 porce** v gramech a mililitrech, česky, s výživovými údaji a odkazem na zdrojovou stranu.

| Zdroj | Rok |
|---|---|
| Armed Forces Recipe Service (AFRS, MCO P10110.42B) | 2003 |
| The Cook Book of the United States Navy | 1944 |
| The Italian Cook Book (Maria Gentile) | 1919 |
| Feldkochbuch | 1940 |

## Co aplikace umí

- listování knihou (dvoustrana na počítači, jedna strana na mobilu na výšku), obsah, kapitoly, hledání
- přepočet množství podle počtu osob se škálovacími třídami surovin (sůl a koření se neškáluje lineárně)
- košík receptů a nákupní seznam
- časovač a stopky u kroků receptu
- vlastní recepty (formulář s výběrem surovin z katalogu)
- tisk: jednotlivý recept, celá kniha i sešitek A5 na A4 na šířku (booklet imposition)
- uživatelský stav (oblíbené, košík, vlastní recepty, nastavení) s exportem a importem zálohy

## Požadavky

- Node.js 24+ (vyvíjeno na 25) a npm
- jen pro extrakci textu z PDF: Python 3, PyMuPDF a `tesseract` (viz [Extrakce textu](#extrakce-textu-z-pdf))

## Instalace

```bash
npm install
```

## Spuštění

### Vývoj

```bash
npm run dev
```

Vite dev server s HMR (výchozí `http://localhost:5173`). V režimu vývoje se stránka sama obnoví, když přibude recept v `data/recipes/` (kontrola každých 30 s, funguje i na telefonu po zamknutí obrazovky). Uživatelský stav je v tomto režimu jen v `localStorage` prohlížeče.

### Produkční build a náhled

```bash
npm run build      # tsc -b && vite build → dist/
npm run preview    # náhled buildu přes Vite
```

### Domácí server (doporučeno pro každodenní používání)

```bash
npm run build
npm run serve
```

Servíruje `dist/` a ukládá uživatelský stav do `userdata/user-state.json`, takže je sdílený mezi zařízeními (počítač, telefon na stejné Wi-Fi). Po startu vypíše adresu pro počítač i pro telefon.

| Proměnná | Výchozí | Význam |
|---|---|---|
| `PORT` | `8787` | port serveru |
| `HOST` | `0.0.0.0` | adresa, na které server poslouchá (`127.0.0.1` = jen lokálně) |

```bash
PORT=9000 HOST=127.0.0.1 npm run serve
```

Server nemá autentizaci; nevystavujte ho do veřejné sítě. Rozhraní: `GET /api/health`, `GET`/`PUT /api/state`. Nevalidní soubor se stavem se před přepsáním zazálohuje. Bez serveru (např. dev režim nebo statický hosting) aplikace ukládá do `localStorage` a v tiráži (nastavení) jde stav exportovat a importovat jako zálohu.

### Web na GitHub Pages

Veřejná verze běží na <https://sedlak911.github.io/taborova-kucharka/>. Každý push do `main` na GitHubu spustí workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml), které udělá `npm ci` a `npm run build` a nasadí `dist/` na Pages.

Build pro Pages nastavuje dvě proměnné:

| Proměnná | Hodnota | Význam |
|---|---|---|
| `VITE_BASE` | `/taborova-kucharka/` | cesta, ze které se web servíruje (lokálně `/`) |
| `VITE_STATIC` | `1` | aplikace nehledá domácí server; stav je jen v `localStorage` |

Uživatelský stav (oblíbené, košík, vlastní recepty, nastavení) je v `localStorage` pod klíčem `kucharka.userState.v1`, tedy jen v daném prohlížeči a zařízení. Mezi zařízeními se přenáší exportem a importem zálohy.

#### Větve a historie

Na GitHubu je historie projektu zkrácená: celý vývoj do zveřejnění je squashnutý do jednoho úvodního commitu. Lokálně se proto používají dvě větve s nesouvisejícími historiemi:

| Větev | Remote | Účel |
|---|---|---|
| `github-main` | `github/main` | veřejná větev; sem patří veškerá další práce, `git push` ji nasadí |
| `digitize-all` | – | archiv původní plné historie (260 commitů), na GitHub se nepushuje |

```bash
git remote add github https://github.com/sedlak911/taborova-kucharka.git   # jen při novém klonu
git checkout github-main
# … změny, commit …
git push                       # → github/main → automatické nasazení na Pages
```

Commit vzniklý omylem na `digitize-all` se přenese přes `git cherry-pick <sha>` na `github-main`. Větve nejde mergovat ani pushovat přímo, protože nemají společného předka.

## Testy a kontroly

```bash
npm test             # vitest (jsdom), jednorázově
npm run test:watch   # vitest ve sledovacím režimu
npm run lint         # oxlint
npm run validate     # validace receptů a surovin (viz níže)
npx tsc -b           # typová kontrola
```

## Struktura repozitáře

```
src/                 React 19 + TypeScript aplikace
  app/ book/         routing přes hash, listování, režimy zobrazení
  content/           načtení receptů, stavba stránek, hledání
  domain/            schéma (zod) a typy – autorita pro tvar dat
  pages/ custom/     stránky knihy, vlastní recepty
  print/             tisk, sešitek
  state/             uživatelský stav, ukládání (localStorage / server), záloha
data/
  recipes/*.json     jeden recept = jeden soubor (viz data/recipes/README.md)
  ingredients/       kurátorské dávky surovin
  ingredients.json   GENEROVANÝ katalog surovin (neupravovat ručně)
  sources/           USDA index a seed surovin (generované z vendor/)
scripts/             CLI nástroje (validace, převody, server, …)
userdata/            stav uživatele ze serveru (v .gitignore)
docs/                zdrojová PDF a plány/specifikace (v .gitignore)
extracted/           text vytažený z PDF (v .gitignore)
analysis/            analýzy zdrojových knih
vendor/              vstupní data USDA a Tandoor (v .gitignore)
.claude/skills/      skill recipe-digitize pro digitalizaci receptů
BACKLOG.md           stav digitalizace a další kroky
```

## Práce s daty

Recepty jsou JSON soubory validované schématem v `src/domain/schema.ts`. Podrobnosti a postup přidání receptu jsou v [`data/recipes/README.md`](data/recipes/README.md), návod pro digitalizaci ze skenů v `.claude/skills/recipe-digitize/SKILL.md`.

| Příkaz | K čemu |
|---|---|
| `npm run validate` | schéma, existence surovin, jednotky, alergeny, tag `bez-masa`, časování kroků; každá `CHYBA` musí být opravená |
| `npm run convert -- --yield 100 "8-1/2 lbs:linear"` | převod množství ze zdroje na g/ml a přepočet na 4 porce |
| `npm run check:recipe -- <id> --portion "1 cup" --kcal 148` | kontrola receptu: gramy a kcal na porci, maso, sůl, tekutina |
| `npm run step-times -- [<id>…] [--write]` | návrh časů kroků z textu |
| `npm run usda -- "peppers, sweet, green"` | hledání v indexu USDA (makra, odpad, porce) |
| `npm run build:ingredients` | sloučí `data/ingredients/*.json` do `data/ingredients.json` |
| `npm run build:usda` | znovu postaví USDA index z `vendor/` |

### Katalog surovin a vendor data

`data/ingredients.json` se generuje příkazem `npm run build:ingredients`. Nové suroviny patří do `data/ingredients/new-<id-receptu>.json`. Index USDA se staví z dat v `vendor/`, která nejsou v gitu; co stáhnout a kam rozbalit, popisuje [`vendor/README.md`](vendor/README.md).

### Extrakce textu z PDF

Zdrojová PDF patří do `docs/` (není v gitu). Text se z nich extrahuje do `extracted/`:

```bash
python3 -m venv .venv && .venv/bin/pip install pymupdf pillow
brew install tesseract          # + traineddata (eng, frak2021) do .venv/tessdata
.venv/bin/python scripts/extract_text.py [název_knihy …] [--jobs N]
```

Podrobnosti jsou v hlavičce `scripts/extract_text.py`.

## Stav digitalizace

Aktuální stav a plán zbývajících dávek (zbytek Navy 1944, AFRS 2003) je v [`BACKLOG.md`](BACKLOG.md).

## Licence dat

USDA FoodData Central / SR Legacy: CC0. open-tandoor-data: ODbL / DbCL. Zdrojové kuchařky jsou historické publikace.
