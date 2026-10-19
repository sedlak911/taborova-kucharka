# Recepty

Jeden recept = jeden soubor `data/recipes/<id>.json`, kde `<id>` je kebab-case bez diakritiky (`dusena-ryze.json`). Recepty jsou vždy na **4 porce** (`baseServings: 4`); aplikace je přepočítává podle počtu osob a škálovací třídy suroviny.

## Stav

Hotovo 78 receptů ze 4 knih: AFRS 2003 (57), Navy 1944 (11), Gentile 1919 (7), Feldkochbuch 1940 (3).

Nové suroviny z digitalizace jdou do `data/ingredients/new-<id-receptu>.json` a po review se konsolidují do `data/ingredients/cz.json` (soubory `new-*` se pak smažou).

Recepty s `verified: false` (17; `grep -l '"verified": false' data/recipes/*.json`):
- Gentile 1919 (bez množství ve zdroji, odhad z běžné praxe): `baccala-susena-treska`, `citronovy-sirup`, `chlebova-polevka-panata`, `kure-na-lovecky-zpusob`, `merunkovy-dzem`, `polenta-s-klobasami`, `spagety-s-maslem-a-syrem`.
- Navy 1944 (odhady vody/masa, tabulky z OCR): `pecene-fazole-boston`, `jatra-dusena`, `kureci-dusene-s-zeleninou`.
- Feldkochbuch 1940 (odhady vody/masa, fraktura): `brambory-s-kysanym-zelim`, `nudle-s-kysanym-zelim`, `kroupova-polevka-s-masem`.
- AFRS 2003 (doplněná množství nebo náhrada suroviny): `pecene-kure-v-troube`, `hrachova-polevka-se-sunkou`, `chuck-wagon-gulas-s-fazolemi`, `smazene-fazole-se-syrem`.

## Jak přidat recept

1. Postupuj podle skillu `.claude/skills/recipe-digitize/SKILL.md` (checklist; reference pro knihy, škálování, suroviny, dávky). Vzor tvaru je `.claude/skills/recipe-digitize/reference/example-recipe.json`. Množství přepočítávej nástrojem `npm run convert -- --yield 100 "8-1/2 lbs:linear"` a hotový recept zkontroluj `npm run check:recipe -- <id> --portion "1 cup" --kcal 148`.
2. Každé `ingredientId` (i v `original`) musí existovat v `data/ingredients.json`. **Id ve vzoru (`ryze-bila`, `voda`, `sul`, `repkovy-olej`) v katalogu existují; u nového receptu každé id vždy ověř:**
   ```bash
   grep '"id": "' data/ingredients.json | grep -i ryz
   ```
   Chybějící surovinu přidej do nového souboru `data/ingredients/new-<id-receptu>.json` (pole objektů jako ostatní dávky; `cz.json`, `a.json` a `b.json` needituj) a spusť `npm run build:ingredients` (`data/ingredients.json` je generovaný, ručně ho neupravuj). Makra dohledáš přes `npm run usda -- "<anglický popis>"` v `data/sources/usda-index.jsonl`.
3. Zvaliduj:
   ```bash
   npm run validate
   ```
   Validátor (`scripts/validate.ts`) kontroluje schéma (`src/domain/schema.ts`, neznámé klíče jsou chyba), shodu `id` s názvem souboru, existenci surovin (i v `original`), definované jednotky `ks`/`lzice`/`lzicka`/`hrnek` u surovin (i v `original`), že `allergens` obsahuje všechny alergeny surovin a že recept s tagem `bez-masa` neobsahuje maso (kategorie maso/ryby/uzeniny nebo `containsMeat`). Varuje při alergenu navíc, ml u suroviny bez `densityGPerMl` (kromě vody), kcal na porci mimo 50–1500, chybějícím tagu `bez-masa`, knižním receptu bez minut u kroků, součtu minut kroků nad `timeMinutes` nebo pod jeho polovinou, `parallel` u prvního kroku a počtu receptů s `verified: false`. Časovou osu kroků vypíše `npm run check:recipe -- <id>`. Všechny `CHYBA` musí být opravené.

## Pole v kostce

- `source.page` = číslo stránky PDF v `docs/` (shodné s `=== PAGE N ===` v `extracted/`), ne tištěné číslo.
- `verified: true` jen když čísla pocházejí z AFRS nebo byla ověřena proti obrázku stránky PDF.
- `tags`, `equipment`, `chapter`, `allergens` jen z pevných sad ve `src/domain/schema.ts`.
