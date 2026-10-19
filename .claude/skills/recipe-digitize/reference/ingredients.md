# Suroviny: mapování, nové položky, modernizace

Katalog: `data/ingredients.json` (generovaný z `data/ingredients/*.json`, needituj ručně). Každé `ingredientId` v receptu (i v `original`) musí v katalogu existovat.

## Hledání

```bash
grep -i '"slanin' data/ingredients.json                 # hledá v name i aliases (slanina → spek)
grep -i '"id": "hovezi' data/ingredients.json           # všechna id s prefixem
grep -i 'broth\|stock' data/ingredients.json            # anglické aliasy
```

Shodu hledej v tomto pořadí: id → název → alias → synonymum (tučnost, nakrájení, značka nejsou důvod pro nové id). Upřesnění („dlouhozrnná“, „nakrájená na kostky“, „scezená“) patří do `note`.

## Mapování častých názvů ze zdrojů

| Zdroj | id | Poznámka |
|---|---|---|
| AFRS `OIL,SALAD` | `repkovy-olej` | |
| `FLOUR,WHEAT,GENERAL PURPOSE`, Navy `Flour` | `hladka-mouka` | |
| `MILK,WHOLE` / `MILK,LOWFAT`, Navy `Milk, liquid` | `mleko-polotucne` | |
| `PAPRIKA,GROUND` | `sladka-paprika` | |
| `SUGAR,GRANULATED` | `cukr-krystal` | v pečení `"scaling": "linear"` |
| `PEPPER,BLACK,GROUND` | `cerny-pepr-mlety` | `PEPPER,WHITE,GROUND` → `pepr-bily` |
| `PEPPER,RED,GROUND`, cayenne | `palive-paprika` | |
| `CHILI POWDER` | `chilli-prasek` | směs; ostatní koření z karty přidej zvlášť, jak je uvedeno |
| `PEPPERS,GREEN,FRESH` | `paprika-zelena` | |
| `BEEF STOCK` / `BEEF BROTH` / „Beef Stock (page 218)“ | `hovezi-vyvar` | `containsMeat`, kupovaný bujón; Navy odkaz na jinou stranu = samostatná surovina s objemem z tohoto receptu |
| `CHICKEN BROTH` | `kureci-vyvar` | `containsMeat` |
| `HAM STOCK` | `vyvar-sunkovy` | `containsMeat` |
| Navy `Fat`, `Butter or other fat` | `sadlo` do `original`, moderně `maslo` nebo `repkovy-olej` podle účelu; „Butter or other fat“ = `maslo` bez `original` | |
| Navy `Mustard, dry` | `horcice-susena` | prášek, ne plnotučná |
| `BACON`, Navy `Bacon` | `spek` | |
| `MILK, NONFAT, DRY` + `WATER` | `mleko-polotucne` (součet objemů), `mleko-susene` do `original` | viz scaling-rules |
| `EGGS,WHOLE,FROZEN` | `vejce` v ks, `vejce-mrazena` do `original` | |
| `MARGARINE`, `SHORTENING` | `maslo` (pečení, restování) nebo `repkovy-olej` (smažení); originál `margarin` do `original` | |
| `CORN,CANNED,CREAM STYLE` | `kukurice-konzervovana` + `note: "smetanová (cream style)"` | nezakládej novou; mražená/čerstvá v katalogu není |
| `TOMATOES,CANNED,DICED` | `rajcata-konzervovana` | nálev z konzervy není surovina: vynech, nebo voda s poznámkou |
| `COOKING SPRAY` | vynech, nebo 1 lžička `repkovy-olej` se `"scaling": "vessel"` | |
| `No. 10 can` | 3 000 g (≈ 2,9 l); `No. 2½ can` 820 g; `No. 2 can` 570 g | jen kontrola, primárně ber Weight |
| Maso na kostky k dušení, guláš | `hovezi-predni` | |
| Pečeně, steaky, plátky | `hovezi-zadni` | |
| Mleté (`GROUND BEEF,BULK` 80/20) | `hovezi-mlete`; `90% LEAN` → `hovezi-mlete-90` | |
| Vařené/zbytkové maso („cooked beef“, „leftover chicken“) | `hovezi-vareno`, `kureci-maso-vareno` | makra vařeného, ne syrového |
| Uvařená rýže ve zdroji | `ryze-bila` suchá ≈ 1/3 hmotnosti uvařené | |
| Celé kuře | `cele-kure` (g = nákupní hmotnost s kostí; `ediblePortion` řeší aplikace) | |

## Nová surovina

Zakládej **jen když opravdu chybí** (po kontrole aliasů a synonym).

1. Soubor `data/ingredients/new-<id-receptu>.json` – pole objektů podle `IngredientSchema` (`src/domain/schema.ts`), stejný tvar jako položky v `cz.json`. `cz.json`, `a.json`, `b.json` needituj (souběžní agenti by si je přepisovali).
2. Makra: `npm run usda -- "corn, sweet, cream style"` vypíše až 20 záznamů z `data/sources/usda-index.jsonl` (fdcId, popis, kcal/P/C/F/vláknina na 100 g, odpad, první 3 porce). Do `sources.nutrition` piš `USDA SR Legacy fdc:<fdcId> (<popis>)`; `ediblePortion = 1 − odpad/100`. Chybí-li přesná položka, vezmi nejbližší a napiš `náhrada: …`.
3. `units`: `hrnek` je **metrický hrnek 250 ml** – porci USDA „cup“ (237 ml) přepočti × 250/237 a zaokrouhli na celé g. `ks`, `lzice`, `lzicka` jen když dávají smysl (vejce 50 g, lžička pepře 2,3 g).
4. `category` z pevné sady; vývar nebo jiná surovina s masem mimo kategorie maso/ryby/uzeniny dostane `"containsMeat": true`. Masové suroviny v kategorii maso/ryby/uzeniny `containsMeat` nemají.
5. `aliases`: české synonymum + anglický název ze zdroje; alias nesmí odpovídat názvu ani aliasu jiné suroviny (merge hlásí kolizi).
6. `npm run build:ingredients` – sloučí dávky do `data/ingredients.json` a ohlídá duplicity. Po review dávky se `new-*.json` konsolidují do `cz.json` (viz batch.md).

## Modernizace

Modernizuj jen to, co dnes nedává smysl nebo nejde koupit. Původní surovina (přepočtená na 4 porce, zaokrouhlená stejně) jde do `original: {ingredientId, amount, unit}`, moderní do řádku, souhrn do `modernNote`. Aplikace má přepínač „historické suroviny“, takže obě varianty musí být úplné.

| Zůstává | Nahrazuj |
|---|---|
| sádlo, slanina, kroupy, luštěniny, konzervovaná rajčata a kukuřice, vývary, melasa (volitelně cukr 1:1), sušené ovoce | sušené mléko + voda → `mleko-polotucne`; sušená/mražená vejce → `vejce`; margarín/shortening → máslo nebo olej; cooking spray → nic/olej; konzervovaná zelenina, u které katalog **má** čerstvou nebo mraženou variantu → čerstvá/mražená; nedostupné kusy masa → nejbližší dostupný s poznámkou |

Standardní modernizace (nesnižují `verified`): olej místo cooking spray, mléko ze sušeného mléka + vody, melasa → cukr 1:1, domácí slévaná voda a sůl do ní. Každý **doplněný odhad množství** (Gentile „a piece of butter“) ⇒ `verified: false` + vysvětlení v `note`/`modernNote`.

Recept s porcí „2 sušenky“ zůstává ve věrném k = 0,04 (vejce 0,3 ks s `note` „rozšlehej 1 vejce a použij asi třetinu“), `modernNote` doporučí ztrojnásobení.

## Maso, kapitola `bezmasa` a tag `bez-masa`

Maso = kategorie `maso`, `ryby`, `uzeniny` nebo `containsMeat: true` (vývary `hovezi-vyvar`, `kureci-vyvar`, `vyvar-sunkovy`, `bujon-kostka`). Validátor hlídá jen řádek (ne `original`): tag `bez-masa` u receptu s masem = chyba; chybějící tag u receptu bez masa = varování. Vývar ze zdroje nikdy nenahrazuj vodou.

| Zdroj | `chapter` | řádek | `original` | tag `bez-masa` |
|---|---|---|---|---|
| hlavní jídlo s masem | podle jídla (`maso-a-ryby`, `z-jednoho-hrnce`…) | maso | – | ne |
| hlavní jídlo bez masa, bez vývaru | `bezmasa` | – | – | ano |
| hlavní jídlo bez masa, ale s masovým vývarem (BEEF BROTH) | `bezmasa` | `zeleninovy-vyvar` | `hovezi-vyvar` | ano (řádek je bez masa) |
| příloha/polévka s masovým vývarem | podle jídla | `hovezi-vyvar` (zůstává) | – | ne |
| slanina jen na dochucení (chowder) | podle jídla | `spek` | – | ne |
