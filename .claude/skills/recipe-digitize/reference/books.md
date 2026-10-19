# Zdrojové knihy

Texty: `extracted/<kniha>.txt` (stránky oddělené `=== PAGE N ===`, N = číslo stránky **PDF**), po stránkách `extracted/<kniha>/page_NNNN.txt`. Přehledy receptů po knihách: `analysis/*.md` (tabulky: strana, název, výtěžek, hlavní suroviny, levné?, tábor/kotlík?). Podrobnosti o OCR: `extracted/README.md`.

| `source.book` | PDF v `docs/` | Text | Výtěžek | Tištěná → PDF strana | Čísla | Jazyk |
|---|---|---|---|---|---|---|
| `afrs-2003` | `MCO P10110.42B.pdf` (1 691 str.) | `afrs-mco-p10110-42b.txt` | 100 | nepotřeba, hledej kód karty | přesná (digitální) → `verified: true` bez obrázku | en |
| `navy-1944` | `TheCookBookOfTheUnitedStatesNavy1944.pdf` (443) | `us-navy-cookbook-1944.txt` | 100 | PDF = tištěná + 8 | tabulky z OCR 80–90 %, zlomky špatně → **vždy obrázek** | en |
| `italian-1919` | `italiancookbooka00gentiala.pdf` (168) | `italian-cookbook-gentile.txt` | obvykle žádný → `originalYield` vynech | PDF = tištěná + 4 | text dobrý, množství chybí nebo neurčitá | en |
| `feldkochbuch-1940` | `Feldkochbuch-1940.pdf` (27 dvoustran) | `feldkochbuch-1940.txt` | „je Kopf“ = 1 | PDF strana = dvoustrana (levá + `--- [right half of spread] ---` + pravá) | fraktura, tabulky 75–85 %, sloupce prohozené → **vždy obrázek** | de |

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

## Přidání nové knihy

1. PDF do `docs/`, text: `.venv/bin/python scripts/extract_text.py <kniha>` (PyMuPDF + pdftotext/tesseract; vznikne `extracted/<kniha>.txt` a `extracted/<kniha>/page_NNNN.txt`). Pro frakturu použij traineddata `frak2021` (v `.venv/tessdata/`).
2. Analýza: nechej agenta projít text po částech a sepsat `analysis/<kniha>.md` ve stejném tvaru jako existující (tabulka receptů: strana, název, výtěžek/porce, hlavní suroviny, levné?, tábor/kotlík?, poznámka; sekce „doporučené recepty“).
3. Přidej hodnotu do `BOOKS` v `src/domain/schema.ts`, štítek, citát a epochu knihy do `src/content/books.ts`, styl `era--<book>` do `src/styles/themes.css` (plus testy vedle nich), řádek do tabulky výše a do `data/recipes/README.md`.
4. Zapiš offset tištěná → PDF strana a spolehlivost čísel (ověř ručně 3 stránky proti obrázku).
