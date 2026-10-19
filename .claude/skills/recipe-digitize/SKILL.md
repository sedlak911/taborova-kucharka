---
name: recipe-digitize
description: Use when adding a recipe from a scanned historical cookbook (AFRS, Navy 1944, Gentile 1919, Feldkochbuch 1940 or a new book) to data/recipes/*.json, when fixing a digitized recipe after review, when adding a new source book, or when orchestrating a batch of digitizer agents
---

# recipe-digitize

Jeden recept ze skenu → `data/recipes/<id>.json` pro **4 porce**, g/ml, česky, se zdrojem. Autorita: `src/domain/schema.ts` (pole, povolené hodnoty) a `scripts/validate.ts`. Když se tento návod a schéma rozcházejí, platí schéma.

**Čísla počítá nástroj, ne hlava.** Každý řádek přepočti přes `npm run convert`, každý hotový recept zkontroluj přes `npm run check:recipe`. Ruční aritmetika a „držení zdroje“ při nesmyslné bilanci byly nejčastější chyby minulých dávek.

## Reference (načti, co potřebuješ)

| Soubor | Kdy |
|---|---|
| `reference/books.md` | vždy: zvláštnosti knihy, číslování stran, OCR; přidání nové knihy |
| `reference/scaling-rules.md` | vždy: jedna tabulka situace → třída `scaling` (voda, tuk, kypřidla, vejce…) |
| `reference/ingredients.md` | mapování surovin, tabulka AFRS/Navy názvů → id, nová surovina, maso, vývary, koření |
| `reference/units.md` | převody, zlomky, No. 10 can, °F → °C, zaokrouhlení |
| `reference/afrs-card.md` | AFRS: jak číst kartu, vzorový přepočet, odkazy na jiné karty |
| `reference/batch.md` | orchestrace dávky agentů, výběr receptů, review, konsolidace |
| Vzory | `reference/example-recipe.json` (jednoduchý), `data/recipes/spagety-s-masovou-omackou.json` (skupiny, slévaná voda, bobkový list, koření pod 1 g), `data/recipes/bramborova-frittata.json` (`original` + modernizace) |

## Postup (checklist)

- [ ] **1. Najdi zdroj.** `grep -n "<TITLE>" extracted/<kniha>.txt`; stránka = `=== PAGE N ===` (číslo stránky PDF, ne tištěné). Mimo AFRS vyrenderuj obrázek a čísla ber z něj:
  ```bash
  pdftoppm -f N -l N -r 150 -png "docs/<soubor>.pdf" <scratchpad>/<id>/page   # vznikne page-NNN.png, přečti nástrojem Read
  ```
- [ ] **2. Vypiš suroviny zdroje** s množstvím a výtěžkem (`originalYield`: AFRS a Navy 100, Feldkochbuch „je Kopf“ 1, Gentile obvykle bez). AFRS: sloupec **Weight**; Measure jen když Weight chybí; Issue ignoruj.
- [ ] **3. Urči třídu každého řádku** podle `reference/scaling-rules.md`. Zvlášť: voda, která se slévá (těstoviny, brambory) = domácí hodnota s `vessel`, ne hodnota ze zdroje; voda, která zůstává v jídle = `linear`.
- [ ] **4. Přepočti nástrojem:**
  ```bash
  npm run convert -- --yield 100 "8-1/2 lbs:linear" "23 lbs:linear" "1-7/8 oz:seasoning" "10 lbs:linear:ks=50" "1 tsp:seasoning:tsp=2.3"
  ```
  Vypíše g/ml, faktor, přesnou i zaokrouhlenou hodnotu pro 4 porce; `ks=<g na kus>` dá kusy (vejce 50, bobkový list 0,2), `tsp=|tbsp=|cup=<g>` převede objem koření přes `units` suroviny. Hodnotu **pod 1 g ulož přesně** (2 desetinná místa), ne jako špetku.
- [ ] **5. Namapuj suroviny** na id z katalogu (`reference/ingredients.md`): hledej i v aliasech:
  ```bash
  grep -i '"slanin' data/ingredients.json        # hledá v name i aliases
  ```
  Chybí-li, založ ji v `data/ingredients/new-<id-receptu>.json` (makra `npm run usda -- "<anglicky>"`), pak `npm run build:ingredients`. Nikdy needituj `cz.json`, `a.json`, `b.json` ani generovaný `data/ingredients.json`.
- [ ] **6. Modernizuj** jen co dnes nedává smysl nebo nejde koupit (tabulka v `reference/ingredients.md` §Modernizace). Původní surovinu dej do `original: {ingredientId, amount, unit}` – také pro 4 porce, zaokrouhlená stejnými pravidly, v g/ml (mražená vejce `vejce-mrazena` 180 g, sušené mléko 30 g, margarín 13 g); vysvětlení do `modernNote`.
- [ ] **7. Přelož kroky a dej jim čas**: krátké imperativní věty, jeden krok = jedna činnost, °C, bez CCP/HACCP a pokynů pro výdej. Odkaz na jinou kartu (`See Recipe No. E 004 00`) nahraď nejjednodušším domácím postupem (viz `reference/afrs-card.md` §Odkazy); nepřebírej z ní vybavení ani suroviny kromě soli do slévané vody. „Set aside for Step 3“, který krok 3 nepoužije → přidej surovinu do uvedeného kroku (zdroj ví, kam patří) a napiš to do `modernNote`. Každý krok zapiš jako objekt `{ "text": "…", "minutes": 10 }` (souběžný navíc `"parallel": true`); návrh minut z textu kroků vypíše `npm run step-times -- <id>` (s `--write` přepíše kroky zadané řetězcem v souboru, ručně doplněné objekty nechá).

  PRAVIDLA ČASOVÁNÍ KROKŮ
  - Krok je objekt { "text", "minutes"?, "parallel"? }; text kroku se kvůli času nemění.
  - minutes = doba kroku od jeho začátku do začátku dalšího kroku, aktivní práce + čekání, celé minuty ≥ 1 („duš 30 minut“ = 30; „přiveď k varu a vař 10 minut“ = čas do varu + 10).
  - Dobu ze zdroje nezkracuj ani tam, kde dnes stačí méně; moderní tip patří do `modernNote`.
  - Rozsah ve zdroji → horní mez („20–25 minut“ → 25, „5 až 10 minut“ → 10); „asi 1 hodinu“ → 60; „1,5 hodiny“ → 90.
  - Krok bez času v textu odhadni z praxe pro 4 porce: krájení nebo loupání zeleniny 5–10 (podle množství), opečení masa dozlatova 8–10, osmahnutí cibule 5–8, přivedení k varu 1 l ≈ 8, 2 l ≈ 10, 4 l ≈ 15, smíchání nebo vmíchání 2–3, rozehřátí pánve s tukem 2–3, scezení 2, vyválení nebo tvarování těsta 10–15.
  - Bez minutes: krátký pokyn bez práce (Osol, Dochuť, Vyndej bobkový list, Sundej z ohně, Podávej), předehřátí trouby (běží během přípravy), namáčení přes noc a jiné čekání, které timeMinutes nezahrnuje (marinování, chlazení ≥ 4 h, tag pripravit-predem).
  - "parallel": true jen u kroku, který věcně probíhá během čekání některého dřívějšího, ještě běžícího kroku (ne nutně bezprostředně předchozího): text začíná „Mezitím“ nebo „Zatímco“, nebo jde zjevně o souběžnou přípravu (těstoviny se vaří, zatímco se omáčka dusí). Souběžný krok smí mít minutes (pro informaci), do součtu se nepočítá. První krok nikdy parallel. Pořadí kroků neměň.
  - Hotovo = součet minutes nesouběžných kroků; musí ležet mezi polovinou a celým timeMinutes (validátor jinak varuje). Když neleží: nejdřív oprav kroky (chybí souběžnost, přehnaný odhad), teprve pak timeMinutes. timeMinutes nikdy nezmenšuj; zvětši ho jen když časy ze zdroje nebo text kroků prokazatelně dávají víc, zaokrouhli na 5 a zapiš do reportu staré → nové s důvodem. Když nové timeMinutes přesáhne 45 a recept má tag rychle, tag odeber.
  - Kontrola: npm run check:recipe -- <id> vypíše časovou osu (krok | začátek | min | text, hotovo); npm run validate nesmí u receptu hlásit „minut“ ani „parallel“.
- [ ] **8. Metadata** podle tabulky níže.
- [ ] **9. Ulož** `data/recipes/<id>.json` (2 mezery, UTF-8, pořadí klíčů jako ve vzoru) a **zkontroluj**:
  ```bash
  npm run validate                                   # 0 CHYBA; varování posuď
  npm run check:recipe -- <id> --portion "1-1/4 cup" --kcal 330   # Portion a Calories z hlavičky karty („1 Cup“, „8 oz“, „3/4 cup“ – formát jako ve zdroji)
  ```
  Každý `NÁLEZ:` buď oprav, nebo zdůvodni v `modernNote` – nález „mimo rozsah“ (maso, sůl, polévka), který sedí s kartou (Weight × faktor), není chyba: ponech hodnotu a napiš odchylku jako doporučení („jako hlavní jídlo počítej 120–150 g masa“). Nález **bilance** (hmotnost porce vs. porce zdroje) a **2× voda** jsou skoro vždy chyba interpretace, ne vlastnost receptu. Výpis `check:recipe` končí časovou osou kroků a řádkem `hotovo: …`; varování validátoru o minutách kroků oprav podle kroku 7.
- [ ] **10. Report** (při dávce): tabulka surovin zdroj → g → třída → 4 porce → id, výstup `check:recipe`, nové suroviny, odchylky, nejistoty.

## Metadata – rychlý přehled

| Pole | Pravidlo |
|---|---|
| `id` | kebab-case bez diakritiky z českého názvu = název souboru. Před uložením `ls data/recipes/<id>.json` a `grep '"id": "<id>"' data/ingredients.json`: kolize s receptem nebo surovinou → přípona knihy (`majoneza-navy`, `zeleninova-polevka-navy`); existující recept nikdy nepřepisuj; když je to týž recept z téže knihy (stejná `source.page`), je hotový – nic nedělej a napiš to do reportu |
| `title` | přirozený český název („Hovězí guláš“, ne „Maďarský guláš po americku“) |
| `titleOriginal` | původní název normálním písmem („Chili Macaroni“) |
| `source` | `{book, page (PDF strana), code (jen AFRS, bez „No.“), titleOriginal (jak je v knize, velkými u AFRS)}`; Navy/Gentile/Feldkochbuch bez `code` |
| `quote` | volitelně jedna zajímavá věta z originálu v původním jazyce |
| `chapter` | `polevky` · `z-jednoho-hrnce` (guláše, eintopfy, rizota jako hlavní jídlo) · `maso-a-ryby` · `bezmasa` (hlavní jídlo bez masa) · `prilohy-a-zelenina` · `testoviny-a-ryze` · `snidane-a-pecivo` · `sladke` · `napoje`. Kapitolu určuje jídlo; `bezmasa` s masovým vývarem → vývar modernizuj na `zeleninovy-vyvar` (masový do `original`), jinak kapitola zůstane a tag `bez-masa` nesmí být |
| `tags` | `levne` (hlavní suroviny brambory, luštěniny, rýže, mouka, těstoviny, zelí, levné maso) · `tabor` (bez trouby a speciálního vybavení, nejvýš dva hrnce) · `kotlik` (vaření/dušení, které zvládne kotlík nad ohněm) · `rychle` (`timeMinutes` ≤ 45) · `bez-masa` (žádná surovina z kategorií maso/ryby/uzeniny ani s `containsMeat`; validátor hlídá) · `sladke` · `pripravit-predem` (namáčení, marinování, chlazení ≥ 4 h) |
| `equipment` | jen z pevné sady `plotna` · `trouba` · `gril` · `lednice`. `trouba` jen když se **jídlo samo** peče; vedlejší technika z odkazované karty (slanina v troubě) se dělá na pánvi = `plotna`. `gril` jen když je gril/rošt hlavní technika (ne „na pánvi nebo grilu“). `lednice` jen když recept bez ní nejde: tuhne (želatina, krokety), mrazí se, syrové maso leží hodiny v chladu, majonéza; „podávej vychlazené“ nestačí. `lednice` a tag `tabor` se vylučují (validátor varuje). Kotlík je jen tag (AFRS „steam-jacketed kettle“ je parní kotel = `plotna`) |
| `allergens` | sjednocení pole `allergens` všech použitých surovin včetně `original` (`grep -A12 '"id": "testoviny"' data/ingredients.json`; validátor: chybějící = chyba, navíc = varování) |
| `timeMinutes` | nejdelší souběžná cesta pro 4 porce (ne součet paralelních činností), bez namáčení přes noc; karta bez časů → odhad z kroků, zaokrouhli na 5. Hotovo (součet `minutes` nesouběžných kroků) leží mezi polovinou a celým `timeMinutes` |
| `difficulty` | 1 jeden hrnec (+ pánev na opečení) a pár kroků · 2 dvě části s vlastním postupem (omáčka + těstoviny, hrnec + trouba) · 3 těsto, přesné časování, více nádobí |
| `baseServings` | vždy 4; `originalYield` = porce z hlavičky (Navy/AFRS 100). Jen když výtěžek ÷ velikost porce z hlavičky dá počet porcí lišící se o víc než 10 %, zapiš do `originalYield` ten vypočtený počet a důvod do `modernNote` |
| `verified` | `true` jen když všechna čísla jsou z AFRS (digitální text) nebo ověřená proti obrázku stránky. Domácí hodnoty (slévaná voda a sůl do ní), olej místo cooking spray, mléko ze sušeného mléka + vody, melasa → cukr 1:1 `verified` nesnižují. Doplněný odhad množství ⇒ `false` + poznámka |

## Červené praporky – zastav se a oprav

- „Zdroj to tak má, nechám to“ u nálezu bilance nebo 2× vody bez `vessel` → voda u těstovin/brambor v kartě je voda na vaření.
- Počítáš faktor nebo zaokrouhlení z hlavy → použij `npm run convert`.
- `verified: true` u Navy/Feldkochbuch/Gentile bez otevřeného obrázku stránky.
- Nová surovina, i když katalog má alias (slanina = `spek`, beef broth = `hovezi-vyvar`).
- Krok nebo surovina, které ve zdroji nejsou (kromě označených domácích hodnot a modernizací).
- Množství opakované v textu kroků (aplikace přepočítává jen suroviny).
- Krok s dobou ve zdroji („simmer 20 minutes“) bez `minutes`, krok jako prostý řetězec, nebo Hotovo mimo ½–1× `timeMinutes`.

## Časté chyby z minulých dávek

| Chyba | Správně |
|---|---|
| Vývar ze zdroje nahrazen vodou | vývar zůstává (`hovezi-vyvar`, `kureci-vyvar`); je `containsMeat` |
| Kypřidlo v těstě třídy `leavening` | v pečení `"scaling": "linear"` na řádku |
| Vejce v g, bobkový list v g | obojí v `ks` přesně na 0,05 (`convert … :ks=50`, `:ks=0.2`); mražená vejce do `original` |
| Vařené maso ve zdroji mapované na syrové | `hovezi-vareno`, `kureci-maso-vareno`; vařená rýže → suchá ≈ 1/3 |
| Uvařená rýže/těstoviny v náplni přepočtené jako suché 1:1 | suché ≈ 1/3 hmotnosti uvařené |
| `kotlik` v `equipment` (není ve schématu) | tag `kotlik`, `equipment: ["plotna"]` |
| `original` nezaokrouhlený nebo pro 100 porcí | `original` je pro 4 porce, zaokrouhlený stejně jako řádek |
| Sušené mléko + voda jako dva řádky | jeden řádek `mleko-polotucne` = součet objemů, sušené do `original` |
| Upřesnění jako nová surovina („rýže dlouhozrnná“) | existující id + `note` |
| Kroky jako prosté řetězce, čas jen v textu | objekty `{ "text", "minutes"?, "parallel"? }` podle kroku 7; `npm run step-times -- <id>` navrhne minuty |
