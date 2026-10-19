# Dávková digitalizace (orchestrace agentů)

Postup ověřený ve fázi 3 (75 receptů v 8 dávkách). Kontrolor (hlavní session) dávky řídí, nic nepřepisuje sám; digitizéři necommitují.

## 1. Výběr receptů → shortlist

- Zdroj kandidátů: `analysis/*.md` (sloupce levné?, tábor/kotlík?). Cíl projektu: levná jídla pro tábory, výlety a šetření; dětská klasika; historický šmrnc. Vynech recepty závislé na polotovarech (konzervovaný guláš, mixy), na speciálním vybavení (parní kotel, fritéza) a duplikáty napříč knihami (jeden recept na jídlo, varianty jen když se liší surovinově).
- Shortlist do `data/recipes/SHORTLIST.md` (tabulka: #, id, český název (originál), kniha, kód, PDF strana, kapitola, tagy, poznámka k modernizaci). Dávky po 9–10 receptech, v každé mix knih a kapitol.
- Před dispatchem ověř grepem v `extracted/`, že kód/strana existují a jde o správnou variantu karty.

## 2. Role a modely

| Role | Model | Vstup | Výstup |
|---|---|---|---|
| Digitizér AFRS (1 recept) | Haiku | řádek shortlistu, SKILL.md, text | `data/recipes/<id>.json`, případně `data/ingredients/new-<id>.json`, report |
| Digitizér Navy / Gentile / Feldkochbuch | Sonnet | totéž + obrázek stránky | totéž; `verified` podle skutečně provedené kontroly obrázku |
| Ověřovatel čísel ne-AFRS (1 na dávku) | Opus (při pádu na safeguards Sonnet) | hotové JSON + obrázky | report, opravy čísel, `verified: true` |
| Reviewer dávky | Sonnet | review package dávky, shortlist, reporty | verdikt + nálezy |
| Fix dávky | tentýž digitizér (round ≤ 3) nebo Sonnet pro průřezové opravy | nálezy | opravené soubory |

Digitizéři jedné dávky běží **paralelně** (každý zapisuje jen svůj `<id>.json` a `new-<id>.json`); dávky sériově. Souběžný `npm run build:ingredients` je idempotentní, kontrolor ho po doběhnutí spustí znovu.

## 3. Dispatch brief digitizéra (šablona)

```
Projekt: online kuchařka (React/TS), přepis receptů z historických kuchařek do JSON.
Tvůj úkol: JEDEN recept. Řádek ze shortlistu: <celý řádek tabulky>.
1. Přečti `.claude/skills/recipe-digitize/SKILL.md` celý; z `reference/` načti books.md, scaling-rules.md, ingredients.md a (AFRS) afrs-card.md. Řiď se checklistem.
2. Najdi recept: `grep -n "<TITLE ORIGINAL>" extracted/<kniha>.txt`; stránka `=== PAGE <N> ===`.
   <ne-AFRS:> `pdftoppm -f N -l N -r 150 -png "docs/<pdf>" <scratchpad>/<id>/page`; čísla ber z obrázku (Read), ne z OCR.
3. Každý řádek přepočti `npm run convert -- --yield <výtěžek> "<množství>:<třída>" …`; výstup vlož do reportu.
4. Každé `ingredientId` ověř v `data/ingredients.json` (i aliasy). Chybí-li, zapiš do `data/ingredients/new-<id>.json` (makra `npm run usda -- "<anglicky>"`), pak `npm run build:ingredients`.
5. Ulož `data/recipes/<id>.json` (kroky s časem podle SKILL.md kroku 7); `npm run validate` (0 CHYBA, žádné varování o minutách kroků); `npm run check:recipe -- <id> --portion "<Portion z karty>" --kcal <kcal z karty>` – každý NÁLEZ oprav, nebo zdůvodni.
6. NEcommituj. NEedituj cz.json/a.json/b.json/ingredients.json. Nespouštěj subagenty. Pracovní soubory jen do <scratchpad>/<id>/.
7. Report do <ws>/<id>-report.md: status DONE / DONE_WITH_CONCERNS / BLOCKED, zdrojová stránka, výtěžek, tabulka surovin (zdroj → g/ml → třída → 4 porce → id), výstup check:recipe (včetně časové osy kroků), nové suroviny, odchylky od shortlistu (kapitola/tagy), nejistoty, „co mi v návodu chybělo“.
Vrať jen: status, cestu k JSON, kcal/porci vs. karta, 1 řádek concerns.
```

## 4. Postup dávky

1. BASE = `git rev-parse HEAD` do ledgeru; složka `<ws>/batchN/`.
2. Dispatch všech digitizérů dávky v jedné zprávě.
3. Po doběhnutí: `npm run build:ingredients && npm run validate`; pro každý recept `npm run check:recipe` s porcí a kcal ze zdroje. CHYBA a nezdůvodněné NÁLEZY vrať digitizérovi (SendMessage, round 1–3).
4. Ne-AFRS recepty → ověřovatel čísel (jeden agent na dávku, dostane seznam id + PDF strany; porovná každé číslo s obrázkem, opraví, nastaví `verified`).
5. Commit dávky: explicitní `git add data/recipes/<id1>.json … data/ingredients/new-*.json data/ingredients.json`, nikdy `-A`. Zpráva `data(recipes): dávka N – <stručně>`.
6. Review dávky (review package BASE..HEAD). Reviewer kontroluje: kód/strana proti shortlistu a grepu; realističnost porcí a výstup check:recipe; kcal vs. karta (±25 %); alergeny; tagy/kapitola podle definic; každý `new-*.json` proti katalogu (duplicitní id, alias = existující název); čeština kroků; časy kroků (čas ze zdroje převzatý, rozsah → horní mez, odhady realistické, souběžné kroky, Hotovo vs. timeMinutes); `verified`; sekce „co mi chybělo“ v reportech → podněty do skillu.
7. Nálezy → fix round → commit `fix(recipes): dávka N – …` → scoped re-review. Zbytky adjudikovat, zapsat do ledgeru.

## 5. Uzavření fáze

- Konsolidace: obsah všech `data/ingredients/new-*.json` připojit do `data/ingredients/cz.json` (abecedně podle id), `new-*.json` smazat, `npm run build:ingredients`, `npm run validate`.
- `data/recipes/README.md` (počty podle knih, seznam `verified: false` s důvody), `SHORTLIST.md` (stav hotovo / vynecháno s důvodem).
- Podněty z reportů „co mi chybělo“ zapracovat do tohoto skillu (každé pravidlo jednou větou s konkrétním rozhodnutím, ne diskusí).
- Final review celé fáze (Opus, při pádu Sonnet), jedna fix vlna, re-review, merge.
- Hromadná úprava už hotových receptů (vzor: doplnění časů kroků ve fázi 10, `docs/superpowers/plans/2026-10-15-phase10-step-timing.md` Task 8): skript navrhne, co jde z textu, agenti (Haiku) po ~10 receptech doplní zbytek podle pravidel ve skillu, kontrolní skript proti HEAD hlídá, že se nezměnilo nic jiného, reviewer namátkově ověří 10 receptů proti zdroji.

## Známé problémy

- Opus subagenti občas končí „safeguards flagged“ u review promptů → fallback Sonnet.
- Rate limit nebo uspání počítače přeruší agenty → resume přes SendMessage.
- Implementátoři neověřují obrázek, když ho dispatch výslovně nevyžaduje → v briefu vždy explicitně.
