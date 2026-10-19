# Zdrojové knihy

Texty: `extracted/<kniha>.txt` (stránky oddělené `=== PAGE N ===`, N = číslo stránky **PDF**), po stránkách `extracted/<kniha>/page_NNNN.txt`. Přehledy receptů po knihách: `analysis/*.md` (tabulky: strana, název, výtěžek, hlavní suroviny, levné?, tábor/kotlík?). Podrobnosti o OCR: `extracted/README.md`.

| `source.book` | PDF v `docs/` | Text | Výtěžek | Tištěná → PDF strana | Čísla | Jazyk |
|---|---|---|---|---|---|---|
| `afrs-2003` | `MCO P10110.42B.pdf` (1 691 str.) | `afrs-mco-p10110-42b.txt` | 100 | nepotřeba, hledej kód karty | přesná (digitální) → `verified: true` bez obrázku | en |
| `navy-1944` | `TheCookBookOfTheUnitedStatesNavy1944.pdf` (443) | `us-navy-cookbook-1944.txt` | 100 | PDF = tištěná + 8 | tabulky z OCR 80–90 %, zlomky špatně → **vždy obrázek** | en |
| `italian-1919` | `italiancookbooka00gentiala.pdf` (168) | `italian-cookbook-gentile.txt` | obvykle žádný → `originalYield` vynech | PDF = tištěná + 4 | text dobrý, množství chybí nebo neurčitá | en |
| `feldkochbuch-1940` | `Feldkochbuch-1940.pdf` (27 dvoustran) | `feldkochbuch-1940.txt` | „je Kopf“ = 1 | PDF strana = dvoustrana (levá + `--- [right half of spread] ---` + pravá) | fraktura, tabulky 75–85 %, sloupce prohozené → **vždy obrázek** | de |
| `rettigova-1868` | `domaci_kucharka 1820.pdf` (485; e-kniha MKP podle vydání 1868) | `rettigova-domaci-kucharka.txt` | téměř nikdy → `originalYield` vynech | PDF = tištěná (číslo strany v patičce) | text bezchybný (digitální), množství staré jednotky / slovně → `verified: false` | cs (1868) |
| `glasse-1747` | `The_Art_of_Cookery_text.pdf` (358; IA/Google sken, nedatované vydání Wangford) | `glasse-art-of-cookery.txt` | žádný → `originalYield` vynech | PDF ≠ tištěná (tištěná v záhlaví) | OCR špatný i po opravě dlouhého ſ (`fait` = salt, `fend` = send) → **vždy obrázek** | en (18. st.) |
| `hauptmann-1877` | `bread-and-cake-baking/pg78839-images.html` (z `bread and cake baking.zip`, Gutenberg #78839) | `hauptmann-bread-cake-baking-1877.txt` | pekárenská dávka → vynech | HTML: N = tištěná strana | přepis korektorů (bezchybný), US míry | en |
| `wells-1890` | `The Bread and Biscuit Baker's.html` (Project Gutenberg #53627) | `wells-bread-biscuit-baker-1890.txt` | pekárenská dávka, porce chybí → `originalYield` vynech | HTML bez PDF: N = **tištěná strana** z Gutenbergu | přepis korektorů (bezchybný), množství lb/oz/qt → `verified: true` jen u úplných receptů | en |
| `army-baker-1945` | `army baker 1945.pdf` (68; TM 10-410) | `army-baker-1945.txt` | stovky bochníků, procenta mouky | PDF ≠ tištěná (tištěná v hlavičce strany) | ABBYY OCR dobrý, tabulky receptur → **obrázek** | en |
| `receptury-1983` | `Receptury teplých pokrmů.pdf` (648) | `receptury-teplych-pokrmu-1983.txt` | 10 porcí | viz sekce níže | OCR čitelné, sloupce tabulky se prokládají s postupem → **vždy obrázek** | cs |

Obrázek stránky (mimo AFRS povinný, u AFRS jen při pochybnosti):

```bash
pdftoppm -f N -l N -r 150 -png "docs/<soubor>.pdf" <scratchpad>/<id>/page   # page-NNN.png → Read
```

Nic se nestahuje z webu; skill `agent-browser` se tu nepoužívá.

## AFRS 2003 (Armed Forces Recipe Service)

Jedna karta = jedna až dvě stránky PDF, pevný tvar (viz `afrs-card.md`). Kód karty (`L 028 02`) = `source.code`; varianty mají stejný základ a jiné poslední dvojčíslí – zkontroluj, že přepisuješ tu, kterou chce zadání. `Portion` (1 cup, 1-1/4 cups, 8 oz) a `Calories` z hlavičky jsou vstupy pro `npm run check:recipe -- <id> --portion "1-1/4 cup" --kcal 330`.

## Navy 1944

- Hlavička „Portion: Approx. 8 ounces; 1 slice bacon.“ a „100 PORTIONS“. Sloupce **Pounds | Ounces | Amounts (approx.)**: „8 | 8“ = 8 lb 8 oz; prázdné Pounds a „4“ v Ounces = 4 oz. Amounts (gal, qt, cup, tbsp, „4 No. 10 cans“) jsou jen kontrola.
- OCR tabulky je nepoužitelný („114 gallons“ = 1¼ gal, „Vy“ = ½, „2Vy“ = 2½): **čísla ber z obrázku**, text použij jen k nalezení stránky a k postupu.
- Postup je ve dvou sloupcích; v OCR se řádky sloupců prokládají – čti po sloupcích z obrázku.
- `Mustard, dry` = sušená hořčice; `Fat` = sádlo (`original`), moderně olej/máslo; `American cheddar` = `cedar`.
- Bez `source.code`; `source.titleOriginal` = nadpis z knihy.

## Gentile 1919 (The Italian Cook Book)

- Suroviny ve větách („a piece of butter the size of an egg“, „one medium sized onion“), porce téměř nikdy. Množství dopočítej z běžné praxe pro 4 porce, `originalYield` vynech, `verified: false`, odhad vysvětli v `modernNote`.
- OCR: „24 lb“ bývá „½ lb“; slova dělená na konci řádku („articho-/kes“); číslo receptu a tištěná strana jsou v textu.
- `source.code` vynech; do `source.titleOriginal` nadpis včetně italského názvu v závorce, je-li.

## Feldkochbuch 1940

- Metrické jednotky (g, kg, l, Pfund = 500 g), množství „je Kopf“ (na hlavu) → `originalYield: 1`, k = 4. Někdy je uvedeno „für 10 Mann“ → `originalYield: 10`.
- Tabulky množství | postup jsou v OCR prokládané, čísla a zlomky (½, ¼) z obrázku. Typické chyby: `l`↔`k`, `R`↔`K`, dlouhé s.
- Překládej z němčiny; `titleOriginal` německy („Graupen mit Fleisch“).

## Rettigová 1868 (Domácí kuchařka)

- Recepty číslované v rámci oddílu („13. Vepřové jitrničky s pivem.“); `source.titleOriginal` = nadpis bez čísla a tečky, `source.code` vynech.
- Staré míry (dolnorakouské): **libra = 560 g**, **lot = 17,5 g** (1/32 libry), **žejdlík ≈ 0,35 l**, **máz = 1,4 l** (4 žejdlíky), **čtvrtce = ¼ libry = 140 g**; „vrchovatá lžíce“ mouky ≈ 15 g. Porce chybí – množství přepočti na 4 porce z celkové hmotnosti (libra masa ≈ 2–3 porce), `originalYield` vynech, `verified: false`, odhad do `modernNote`.
- Pravopis 19. století v citacích ponech (polívka, zemčata, žemlička); v `title` a krocích moderní čeština (polévka, brambory, rohlík/houska).
- Hovězí polívka = `hovezi-vyvar`; „nové koření“ = nové koření (pimento, ověř v katalogu); „kaprle“ = kapary; „sardele“ = ančovičky.

## Glasse 1747 (The Art of Cookery)

- Recepty bez čísel, nadpis „To stew a Rump of Beef“; `source.titleOriginal` v moderním pravopise (s místo ſ). Množství volná („a piece of butter“, „a quart of strong broth“), porce chybí → odhad pro 4 porce, `verified: false`.
- Míry: anglické pre-imperiální (pint ≈ 0,47–0,57 l), lb 454 g. OCR: dlouhé ſ čte jako f (skript část opravuje), `ii`/`H` za `st` („Hewed“ = stewed, „Huff“ = stuff) – text kroků vždy podle obrázku.

## Hauptmann 1877 (Bread and Cake Baking)

- Pekařské dávky v lb/oz, US míry (pint 473 ml, quart 946 ml); kypřidla „soda“ = jedlá soda, „cream of tartar“, „carbonate of ammonia“ (amonium → kypřicí prášek do `original`). `source.page` = tištěná strana.

## Wells 1890 (Bread and Biscuit Baker's Assistant)

- Recepty číslované průběžně („62.—Abernethys as made in London.“); `source.titleOriginal` bez čísla, `source.code` vynech, `source.page` = tištěná strana (`=== PAGE N ===`).
- Britské míry: lb 454 g, oz 28,35 g, **pint = 568 ml, quart = 1,136 l, gallon = 4,546 l** (imperiální, ne US). Dávka bývá na 7–8 lb mouky → přepočti na domácí množství (500 g mouky) a `originalYield` vynech.
- „Volatile salts“ = amonium (cukrářské kypřidlo) → kypřicí prášek do `original`; „barm“ = pivní kvasnice → droždí.

## Army Baker 1945 (TM 10-410)

- Většina knihy jsou postupy; recepty jsou jen „Standard Formulas for Army Bread“ (kap. 3, odst. 82–94) v procentech a librách na celou dávku. Přepočti na 1 bochník / 500 g mouky (pekařská procenta), `originalYield` vynech.

## Receptury teplých pokrmů 1983

- Receptura = číslo (`10107`, varianta `13001/B`) → `source.code`; `source.titleOriginal` = název velkými jako v knize („POLÉVKA ZELENINOVÁ“). Výtěžek **10 porcí** (`originalYield: 10`, k = 0,4), u polévky „1 porce: 0,33 l“ = vstup `--portion` pro `check:recipe`.
- Tabulka **Hmotnost v g: hrubá | odpad | čistá** – přepočítávej sloupec **hrubá** (nákupní množství); u zeleniny (brambory, cibule, česnek, kořenová) zapiš do řádku jedlou hmotnost = hrubá × 0,4 × `ediblePortion` suroviny (`ingredients.md` §A.P., aplikace odpad u zeleniny neodečítá), `note` „z <X> g hrubé × <ediblePortion>“. „Ztráty celkem“ a „Množství hotové polévky“ jsou kontrola bilance.
- Odkaz „Vývar B, receptura č. 10101“ = `hovezi-vyvar` (C = `kureci-vyvar`); „Polévkové koření“ (tekuté, typ Maggi) zatím v katalogu chybí – založ jednou společnou surovinou, „Květ mletý“ = muškátový květ (`muskatovy-orisek` + `note`); margarín → máslo/olej do `original`.
- Čísla jsou přesná (gramy) → `verified: true` po ověření proti obrázku.

## Přidání nové knihy

1. PDF do `docs/`, text: `.venv/bin/python scripts/extract_text.py <kniha>` (PyMuPDF + pdftotext/tesseract; vznikne `extracted/<kniha>.txt` a `extracted/<kniha>/page_NNNN.txt`). Pro frakturu použij traineddata `frak2021` (v `.venv/tessdata/`).
2. Analýza: nechej agenta projít text po částech a sepsat `analysis/<kniha>.md` ve stejném tvaru jako existující (tabulka receptů: strana, název, výtěžek/porce, hlavní suroviny, levné?, tábor/kotlík?, poznámka; sekce „doporučené recepty“).
3. Přidej hodnotu do `BOOKS` v `src/domain/schema.ts`, štítek, citát a epochu knihy do `src/content/books.ts`, styl `era--<book>` do `src/styles/themes.css` (plus testy vedle nich), řádek do tabulky výše a do `data/recipes/README.md`.
4. Zapiš offset tištěná → PDF strana a spolehlivost čísel (ověř ručně 3 stránky proti obrázku).
